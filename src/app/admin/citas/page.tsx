'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import type { CitaDesdeVista, EstadoCita, Servicio, Barbero } from '@/lib/types'
import { ClientAutocomplete } from '@/components/ClientAutocomplete'
import { 
    AlertTriangle, 
    Plus, 
    Calendar as CalendarIcon, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    MoreHorizontal, 
    Edit, 
    Trash2, 
    Play,
    Check,
    Filter,
    RefreshCw,
    Users
} from 'lucide-react'
import { cn, getHermosilloDateStr, getMinsFromHermosilloString } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from 'lucide-react'

function CitasContent() {
    // ... (rest of the state remains the same)
    const [mounted, setMounted] = useState(false)
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroFecha, setFiltroFecha] = useState('') 
    const [filtroEstado, setFiltroEstado] = useState<EstadoCita | 'todas'>('todas')
    const [debugMsg, setDebugMsg] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingCita, setEditingCita] = useState<CitaDesdeVista | null>(null)
    const [initialOrigen, setInitialOrigen] = useState<'whatsapp' | 'walkin'>('whatsapp')
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (mounted && searchParams) {
            const action = searchParams.get('action')
            if (action === 'agenda-manual') {
                handleNewCita('whatsapp')
                router.replace('/admin/citas') 
            } else if (action === 'walk-in') {
                handleNewCita('walkin')
                router.replace('/admin/citas') 
            }
        }
    }, [mounted, searchParams, router])

    const handleNewCita = (origen: 'whatsapp' | 'walkin' = 'whatsapp') => {
        setEditingCita(null)
        setInitialOrigen(origen)
        setShowModal(true)
    }

    const handleEditCita = (cita: CitaDesdeVista) => {
        setEditingCita(cita)
        setInitialOrigen(cita.origen as any)
        setShowModal(true)
    }

    const handleDeleteCita = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cita?')) return
        try {
            const res = await fetch(`/api/citas/${id}`, { method: 'DELETE' })
            if (!res.ok && res.status !== 204) {
                const body = await res.json()
                throw new Error(body.message || 'Error al eliminar')
            }
            cargarCitas()
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message)
        }
    }

    const handleStatusChange = async (cardita: CitaDesdeVista, newStatus: EstadoCita) => {
        try {
            const res = await fetch(`/api/citas/${cardita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newStatus }),
            })
            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }
            cargarCitas()
        } catch (err: any) {
            console.error('Error updating status:', err)
        }
    }

    const [supabase] = useState(() => createClient())

    useEffect(() => {
        const today = new Date()
        const localIsoDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(today) 
        setFiltroFecha(localIsoDate)
        setMounted(true)
    }, [])

    const cargarCitas = useCallback(async (isInitialLoad = false) => {
        if (!filtroFecha) return

        if (isInitialLoad) setLoading(true)
        setDebugMsg('Cargando...')
        try {
            let query = (supabase
                .from('vista_citas_app') as any)
                .select('*')
                .eq('fecha_cita_local', filtroFecha)
                .order('timestamp_inicio_local', { ascending: true })

            if (filtroEstado !== 'todas') {
                query = query.eq('estado', filtroEstado)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error Supabase:', error)
                setDebugMsg(`Error: ${error.message || JSON.stringify(error)}`)
                setCitas([])
            } else {
                if (!data || data.length === 0) {
                    setDebugMsg('No hay citas encontradas.')
                    setCitas([])
                } else {
                    setDebugMsg(`Datos cargados: ${data.length} citas`)
                    setCitas(data)
                }
            }
        } catch (err: any) {
            console.error('Catch Error:', err)
            setDebugMsg(`Catch Error: ${err.message}`)
            setCitas(getDemoCitas(filtroFecha))
        } finally {
            if (isInitialLoad) setLoading(false)
        }
    }, [supabase, filtroFecha, filtroEstado])

    useEffect(() => {
        if (mounted && filtroFecha) {
            cargarCitas(true) 

            const channel = supabase.channel('citas-page-changes')
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'citas' },
                    () => {
                        console.log('Realtime update received on CitasPage')
                        cargarCitas() 
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [mounted, filtroFecha, filtroEstado, cargarCitas, supabase])

    if (!mounted) {
        return <div className="p-8 text-white">Cargando aplicación...</div>
    }

    return (
        <div className="relative min-h-full bg-[#0A0A0A] selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-20 border-b border-white/5 mb-4 font-display">
                    <div className="flex items-center gap-3 text-white">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all hover:scale-105">
                            <Users className="text-primary w-4 h-4 shadow-lg shadow-primary/20" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Gestión de Citas</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xl hover:border-primary/30 transition-all group">
                            <div className="flex flex-col items-end text-white text-right">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight">
                                    {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-white/10 group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                        </div>

                        <Button 
                            onClick={() => handleNewCita('whatsapp')}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-bold uppercase tracking-tighter shadow-lg shadow-gold/20 h-9 px-4 rounded-xl text-[10px]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Cita
                        </Button>
                    </div>
                </header>

                {/* Mobile Header (Title Only) */}
                <div className="lg:hidden flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users className="text-primary w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-black tracking-tighter uppercase italic text-white">Citas</h2>
                </div>

            {/* Filters */}
            <Card className="glass-card border-none bg-[#0A0A0A]/60 p-4">
                <div className="flex flex-col sm:flex-row items-end gap-4 overflow-x-auto pb-2 sm:pb-0">
                    <div className="w-full sm:w-auto space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Fecha</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
                            <Input
                                type="date"
                                value={filtroFecha}
                                onChange={(e) => setFiltroFecha(e.target.value)}
                                className="bg-[#141414] border-slate-800 text-white pl-10 focus:border-[#D4AF37] transition-colors"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-auto space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Estado</label>
                        <Select
                            value={filtroEstado}
                            onValueChange={(val) => setFiltroEstado(val as EstadoCita | 'todas')}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] bg-[#141414] border-slate-800 text-white focus:ring-[#D4AF37]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141414] border-slate-800 text-white">
                                <SelectItem value="todas">Todas</SelectItem>
                                <SelectItem value="confirmada">Confirmadas</SelectItem>
                                <SelectItem value="en_espera">En Espera</SelectItem>
                                <SelectItem value="en_proceso">En Proceso</SelectItem>
                                <SelectItem value="finalizada">Finalizadas</SelectItem>
                                <SelectItem value="cancelada">Canceladas</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={() => cargarCitas(true)}
                        variant="secondary"
                        className="w-full sm:w-auto h-10 px-6 font-bold uppercase tracking-tighter bg-slate-800 hover:bg-slate-700 text-white border-none"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                </div>
            </Card>

            {/* Table */}
            <Card className="glass-card border-none bg-[#0A0A0A]/60 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-[#D4AF37]/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-slate-400 font-medium animate-pulse">Cargando agenda...</p>
                    </div>
                ) : citas.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                            <CalendarIcon className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No hay citas para esta fecha</p>
                        <p className="text-slate-600 text-xs mt-1">Intenta con otro filtro o consulta otra fecha</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-900/50">
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Hora</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Cliente</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 hidden md:table-cell">Servicio / Barbero</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 text-center">Estado</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {citas.map((cita) => (
                                    <TableRow key={cita.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-sm">{cita.hora_cita_local || '--:--'}</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">{cita.fecha_cita_local}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-white text-sm tracking-tight">{cita.cliente_nombre}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 font-mono">{cita.cliente_telefono}</span>
                                                    {cita.origen === 'whatsapp' && (
                                                        <Badge className="h-4 px-1 text-[8px] bg-emerald-500/10 text-emerald-500 border-none">WA</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-300 font-medium">
                                                    {cita.servicio_nombre || 'Servicio Personalizado'}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                                        {cita.barbero_nombre || 'Sin barbero'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border-none",
                                                cita.estado === 'confirmada' && "bg-blue-500/10 text-blue-400",
                                                cita.estado === 'en_proceso' && "bg-emerald-500/10 text-emerald-400 animate-pulse",
                                                cita.estado === 'finalizada' && "bg-slate-500/10 text-slate-400",
                                                cita.estado === 'cancelada' && "bg-red-500/10 text-red-500",
                                                cita.estado === 'no_show' && "bg-orange-500/10 text-orange-500"
                                            )}>
                                                {cita.estado ? cita.estado.replace('_', ' ') : ' desconocida'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {cita.estado === 'confirmada' && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(cita, 'en_proceso')}
                                                        className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400"
                                                        title="Iniciar Cita"
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                                {cita.estado === 'en_proceso' && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(cita, 'finalizada')}
                                                        className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                                                        title="Finalizar Cita"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEditCita(cita)}
                                                    className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteCita(cita.id)}
                                                    className="h-8 w-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Modal */}
            {
                showModal && (
                    <CitaModal
                        cita={editingCita}
                        allCitas={citas}
                        onClose={() => setShowModal(false)}
                        onSave={() => {
                            setShowModal(false)
                            cargarCitas() 
                        }}
                        initialOrigen={initialOrigen}
                    />
                )
            }
            </div>
        </div>
    )
}

export default function CitasPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Cargando aplicación...</div>}>
            <CitasContent />
        </Suspense>
    )
}

function getDemoCitas(fecha: string): CitaDesdeVista[] {
    const safeFecha = fecha || new Date().toISOString().split('T')[0]
    return [
        {
            id: '1',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '1',
            cliente_nombre: 'Carlos Mendoza',
            cliente_telefono: '+52 555 123 4567',
            timestamp_inicio_local: `${safeFecha}T10:00:00`,
            timestamp_fin_local: `${safeFecha}T10:40:00`,
            origen: 'whatsapp',
            estado: 'en_proceso',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '10:00 AM',
            hora_fin_local: '10:40 AM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Corte Clásico',
            servicio_precio: 250,
            barbero_nombre: 'Carlos H.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 40,
            notas_crm: '',
            cliente_id: null
        },
        {
            id: '2',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '2',
            cliente_nombre: 'Roberto García',
            cliente_telefono: '+52 555 987 6543',
            timestamp_inicio_local: `${safeFecha}T11:00:00`,
            timestamp_fin_local: `${safeFecha}T11:30:00`,
            origen: 'whatsapp',
            estado: 'confirmada',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '11:00 AM',
            hora_fin_local: '11:30 AM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Barba',
            servicio_precio: 150,
            barbero_nombre: 'Carlos H.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 30,
            notas_crm: '',
            cliente_id: null
        },
        {
            id: '3',
            sucursal_id: '1',
            barbero_id: '2',
            servicio_id: '3',
            cliente_nombre: 'Miguel Torres',
            cliente_telefono: '+52 555 456 7890',
            timestamp_inicio_local: `${safeFecha}T12:00:00`,
            timestamp_fin_local: `${safeFecha}T13:00:00`,
            origen: 'walkin',
            estado: 'en_espera',
            notas: 'Cliente frecuente',
            recordatorio_24h_enviado: false,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '12:00 PM',
            hora_fin_local: '01:00 PM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Combo Completo',
            servicio_precio: 350,
            barbero_nombre: 'Miguel L.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 60,
            notas_crm: 'Cliente frecuente',
            cliente_id: null
        }
    ]
}

function CitaModal({ cita, allCitas, onClose, onSave, initialOrigen }: {
    cita?: CitaDesdeVista | null
    allCitas: CitaDesdeVista[]
    onClose: () => void
    onSave: () => void
    initialOrigen?: 'whatsapp' | 'walkin'
}) {
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [originalTelefono, setOriginalTelefono] = useState<string | null>(cita?.cliente_telefono || null)

    const extractLocalTime = (str: string) => {
        if (!str) return '10:00'
        // Extract HH:mm from "YYYY-MM-DD HH:mm:ss"
        const timePart = str.includes('T') ? str.split('T')[1] : str.split(' ')[1]
        return timePart?.substring(0, 5) || '10:00'
    }

    const extractLocalDate = (str?: string) => {
        if (!str) return getHermosilloDateStr(new Date())
        return str.split(' ')[0] || str.split('T')[0]
    }

    const [formData, setFormData] = useState<{
        cliente_id: string | null
        cliente_nombre: string
        cliente_telefono: string
        servicio_id: string
        barbero_id: string
        fecha: string
        hora: string
        horaFin: string
        notas: string
    }>({
        cliente_id: cita?.cliente_id || null,
        cliente_nombre: cita?.cliente_nombre || '',
        cliente_telefono: cita?.cliente_telefono || '',
        servicio_id: cita?.servicio_id || (cita ? 'custom' : ''), 
        barbero_id: cita?.barbero_id || '',
        fecha: extractLocalDate(cita?.timestamp_inicio_local),
        hora: cita?.timestamp_inicio_local ? extractLocalTime(cita.timestamp_inicio_local) : '10:00',
        horaFin: cita?.timestamp_fin_local ? extractLocalTime(cita.timestamp_fin_local) : '10:30',
        notas: cita?.notas || ''
    })

    const supabase = createClient()
    const [sucursalId, setSucursalId] = useState<string | null>(null)

    useEffect(() => {
        const loadDeps = async () => {
            const { data: servs } = await supabase.from('servicios').select('*').eq('activo', true)
            if (servs) setServicios(servs)

            const { data: barbs } = await supabase.from('barberos').select('*').eq('activo', true)
            if (barbs) setBarberos(barbs)

            const { data: suc } = await (supabase.from('sucursales').select('id') as any).limit(1).single()
            if (suc) setSucursalId(suc.id)
        }
        loadDeps()
    }, [])

    useEffect(() => {
        if (formData.servicio_id && formData.hora) {
            const service = servicios.find(s => s.id === formData.servicio_id)
            if (service) {
                const startDate = new Date(`2000-01-01T${formData.hora}:00`)
                const endDate = new Date(startDate.getTime() + service.duracion_minutos * 60000)
                const hours = endDate.getHours().toString().padStart(2, '0')
                const minutes = endDate.getMinutes().toString().padStart(2, '0')
                setFormData(prev => ({
                    ...prev,
                    horaFin: `${hours}:${minutes}`
                }))
            }
        }
    }, [formData.servicio_id, formData.hora, servicios])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (formData.cliente_id && formData.cliente_telefono !== (originalTelefono || "") && formData.cliente_telefono !== "Sin registro de numero celular") {
                const updateQuery = (supabase as any).from('clientes').update({ telefono: formData.cliente_telefono || null }).eq('id', formData.cliente_id)
                await updateQuery
            }

            const TZ_OFFSET = '-07:00'
            const startISO = `${formData.fecha}T${formData.hora}:00${TZ_OFFSET}`
            const endISO = `${formData.fecha}T${formData.horaFin}:00${TZ_OFFSET}`

            const nStartMins = parseInt(formData.hora.split(':')[0]) * 60 + parseInt(formData.hora.split(':')[1])
            const nEndMins = parseInt(formData.horaFin.split(':')[0]) * 60 + parseInt(formData.horaFin.split(':')[1])

            const colisionProhibida = allCitas.find((c: CitaDesdeVista) => {
                if (cita && String(c.id).toLowerCase() === String(cita.id).toLowerCase()) return false
                if (formData.barbero_id && String(c.barbero_id) !== String(formData.barbero_id)) return false
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                const cStartMins = getMinsFromHermosilloString(c.timestamp_inicio_local)
                const cEndOriginalMins = getMinsFromHermosilloString(c.timestamp_fin_local)
                
                const cDur = cEndOriginalMins - cStartMins
                const cDurBlocks = Math.max(1, Math.floor(cDur / 30))
                const cEndEffectiveMins = cStartMins + (cDurBlocks * 30)

                const nDur = nEndMins - nStartMins
                const nDurBlocks = Math.max(1, Math.floor(nDur / 30))
                const nEndEffectiveMins = nStartMins + (nDurBlocks * 30)

                return (nStartMins < cEndEffectiveMins && nEndEffectiveMins > cStartMins)
            })

            if (colisionProhibida) {
                toast.error(`Conflicto de horario`, {
                    description: `Coincide con una cita ${colisionProhibida.estado.replace('_', ' ')} del barbero ${colisionProhibida.barbero_nombre}.`
                })
                setLoading(false)
                return
            }

            const payload = {
                sucursal_id: sucursalId,
                cliente_id: formData.cliente_id,
                servicio_id: formData.servicio_id === 'custom' ? null : formData.servicio_id || null,
                barbero_id: formData.barbero_id || null,
                cliente_nombre: formData.cliente_nombre,
                cliente_telefono: formData.cliente_telefono,
                timestamp_inicio: startISO,
                timestamp_fin: endISO,
                origen: cita ? cita.origen : initialOrigen,
                estado: cita ? cita.estado : (initialOrigen === 'walkin' ? 'en_espera' : 'confirmada'),
                notas: formData.notas
            }

            const url = cita ? `/api/citas/${cita.id}` : '/api/citas'
            const method = cita ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message || 'Error al guardar')
            }

            toast.success(cita ? 'Cita actualizada' : 'Cita creada exitosamente')
            onSave()
        } catch (err) {
            console.error('Error saving cita:', err)
            toast.error('Error al guardar cita', {
                description: (err as any).message
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg bg-[#0A0A0A] border-slate-800 text-white p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
                    <DialogTitle className="text-xl font-bold tracking-tight">
                        {cita ? 'Editar Cita' : (initialOrigen === 'walkin' ? 'Nuevo Walk-in' : 'Nueva Cita')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Cliente Section */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Cliente</Label>
                            <ClientAutocomplete
                                value={formData.cliente_nombre}
                                onChange={(val) => {
                                    const updates: any = { cliente_nombre: val }
                                    if (formData.cliente_id) {
                                        updates.cliente_id = null
                                        updates.cliente_telefono = ""
                                        setOriginalTelefono(null)
                                    }
                                    setFormData({ ...formData, ...updates })
                                }}
                                onSelect={(cliente) => {
                                    setFormData({
                                        ...formData,
                                        cliente_id: cliente.id,
                                        cliente_nombre: cliente.nombre,
                                        cliente_telefono: cliente.telefono || "Sin registro de numero celular"
                                    })
                                    setOriginalTelefono(cliente.telefono)
                                }}
                                placeholder="Nombre completo"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#D4AF37]/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Teléfono</Label>
                            <Input
                                type="tel"
                                className={cn(
                                    "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#D4AF37]/50",
                                    formData.cliente_telefono === "Sin registro de numero celular" && "text-slate-500 italic opacity-60"
                                )}
                                placeholder="+52..."
                                value={formData.cliente_telefono}
                                onFocus={() => {
                                    if (formData.cliente_telefono === "Sin registro de numero celular") {
                                        setFormData({ ...formData, cliente_telefono: "" })
                                    }
                                }}
                                onBlur={() => {
                                    if (formData.cliente_telefono === "" && !originalTelefono && formData.cliente_id) {
                                        setFormData({ ...formData, cliente_telefono: "Sin registro de numero celular" })
                                    }
                                }}
                                onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                            />
                            {formData.cliente_id && (formData.cliente_telefono !== (originalTelefono || "")) && (formData.cliente_telefono !== "Sin registro de numero celular" && formData.cliente_telefono !== "") && (
                                <div className="flex items-center gap-1.5 mt-2 text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                                        Se actualizará el perfil del cliente
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalle Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Servicio</Label>
                            <Select
                                value={formData.servicio_id || ''}
                                onValueChange={val => setFormData(prev => ({ ...prev, servicio_id: val || '' }))}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[#D4AF37]/50">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                    <SelectItem value="custom">Servicio Personalizado</SelectItem>
                                    {servicios.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nombre} (${s.precio})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Barbero</Label>
                            <Select
                                value={formData.barbero_id || ''}
                                onValueChange={val => setFormData(prev => ({ ...prev, barbero_id: val || '' }))}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[#D4AF37]/50">
                                    <SelectValue placeholder="Cualquiera" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                    <SelectItem value="">Cualquiera</SelectItem>
                                    {barberos.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Time Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Fecha</Label>
                            <Input
                                type="date"
                                required
                                className="bg-white/5 border-white/10 text-white focus:border-[#D4AF37]/50"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Inicio</Label>
                                <Input
                                    type="time"
                                    required
                                    className="bg-white/5 border-white/10 text-white focus:border-[#D4AF37]/50 px-2"
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Fin</Label>
                                <Input
                                    type="time"
                                    required
                                    className="bg-white/5 border-white/10 text-white focus:border-[#D4AF37]/50 px-2"
                                    value={formData.horaFin}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, horaFin: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Notas</Label>
                        <Textarea
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#D4AF37]/50 min-h-[80px]"
                            placeholder="Notas adicionales..."
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-white/5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] hover:from-[#B8962E] hover:to-[#A68527] text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                cita ? 'Guardar Cambios' : 'Confirmar Cita'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
