'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Barbero, BarberoConSucursal, Sucursal } from '@/lib/types'
import { HorarioGanttModal } from '@/components/HorarioGanttModal'
import { 
    Users, 
    Plus, 
    Search, 
    LayoutGrid, 
    Clock, 
    Edit, 
    Trash2, 
    Calendar,
    Scissors,
    ChevronRight,
    Loader2,
    Shield,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

export default function BarberosPage() {
    const [barberos, setBarberos] = useState<BarberoConSucursal[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showScheduleModal, setShowScheduleModal] = useState(false)
    const [showGanttModal, setShowGanttModal] = useState(false)
    const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sucursalData, setSucursalData] = useState<Sucursal | null>(null)

    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const cargarBarberos = useCallback(async () => {
        try {
            const { data, error } = await (supabase
                .from('barberos') as any)
                .select('*, sucursal:sucursales(*)')
                .order('estacion_id', { ascending: true })

            if (error) {
                console.error('Error loading barbers:', error)
                setBarberos(getDemoBarbers())
            } else {
                setBarberos(data || [])
                if (data && data.length > 0 && data[0].sucursal) {
                    setSucursalData(data[0].sucursal)
                }
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setBarberos(getDemoBarbers())
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        cargarBarberos()
    }, [cargarBarberos])

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este barbero?')) return

        try {
            const { error } = await supabase
                .from('barberos')
                .delete()
                .eq('id', id)

            if (error) {
                toast.error('Error al eliminar barbero')
            } else {
                toast.success('Barbero eliminado correctamente')
                cargarBarberos()
            }
        } catch {
            setBarberos(barberos.filter(b => b.id !== id))
            toast.success('Barbero eliminado (modo demo)')
        }
    }

    const handleEdit = (barbero: Barbero) => {
        setEditingBarbero(barbero)
        setShowModal(true)
    }

    const handleNew = () => {
        setEditingBarbero(null)
        setShowModal(true)
    }

    const filteredBarberos = barberos.filter(b =>
        b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.usuario_tablet.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="relative min-h-full bg-[#0A0A0A] selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-20 border-b border-white/5 mb-4 font-display">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            <Scissors className="w-7 h-7 text-black" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
                                Staff <span className="text-gradient-gold italic">Barberos</span>
                            </h1>
                            <p className="text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest opacity-70">
                                Gestión de equipo y disponibilidad
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Clock & Date */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-white font-black text-xl tracking-tighter leading-none uppercase">
                                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                            <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em]">
                                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                        </div>

                        <Button 
                            onClick={handleNew}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-bold uppercase tracking-tighter shadow-lg shadow-gold/20 h-11 px-6 rounded-xl"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nuevo Barbero
                        </Button>
                    </div>
                </header>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowGanttModal(true)}
                        className="flex-1 sm:flex-none bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-widest h-9"
                    >
                        <LayoutGrid className="w-3 h-3 mr-2 text-blue-400" />
                        Diagrama
                    </Button>
                    <Button 
                        onClick={handleNew}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-[#D4AF37] to-[#B8962E] hover:from-[#B8962E] hover:to-[#A68527] text-black font-black uppercase tracking-widest text-[10px] h-9 shadow-lg shadow-[#D4AF37]/20"
                    >
                        <Plus className="w-3 h-3 mr-2" />
                        Nuevo Barbero
                    </Button>
                </div>

            <HorarioGanttModal
                isOpen={showGanttModal}
                onClose={() => setShowGanttModal(false)}
                barberos={barberos}
                sucursal={sucursalData}
            />

            {/* Search & Filters */}
            <Card className="bg-white/5 border-white/10 mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-full flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Buscar por nombre o usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#D4AF37]/50"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span className="text-slate-400 text-xs font-bold">{filteredBarberos.length} BARBEROS</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-[#0A0A0A] border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                        <p className="text-slate-400 text-sm animate-pulse">Cargando equipo...</p>
                    </div>
                ) : filteredBarberos.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Users className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-medium">No se encontraron barberos</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12">Estación</TableHead>
                                    <TableHead className="text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12">Barbero</TableHead>
                                    <TableHead className="text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12 hidden sm:table-cell">Identificación</TableHead>
                                    <TableHead className="text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12">Horario Laboral</TableHead>
                                    <TableHead className="text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12">Estado</TableHead>
                                    <TableHead className="text-right text-slate-400 text-[10px] uppercase tracking-wider font-bold h-12">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBarberos.map((barbero) => (
                                    <TableRow key={barbero.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <TableCell>
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/30 flex items-center justify-center font-black text-[#D4AF37] text-sm">
                                                {barbero.estacion_id}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                                                    {barbero.nombre.charAt(0)}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="font-bold text-white text-sm tracking-tight">{barbero.nombre}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <LayoutGrid className="w-3 h-3 text-slate-500" />
                                                        <span className="text-[10px] text-slate-500 font-medium uppercase">Estación {barbero.estacion_id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5 text-blue-400/50" />
                                                <code className="text-xs text-slate-400 font-mono">
                                                    {barbero.usuario_tablet}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-300">
                                                    <Clock className="w-3.5 h-3.5 text-[#D4AF37]/70" />
                                                    <span className="text-xs font-medium">
                                                        {getHorarioResumen(barbero.horario_laboral)}
                                                    </span>
                                                </div>
                                                {barbero.bloqueo_almuerzo && (
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <span className="text-[10px]">🍽️</span>
                                                        <span className="text-[10px] font-medium tracking-tight">
                                                            ALMUERZO: {barbero.bloqueo_almuerzo.inicio} - {barbero.bloqueo_almuerzo.fin}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border-none",
                                                    barbero.activo 
                                                        ? "bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                                                        : "bg-red-500/10 text-red-400"
                                                )}
                                            >
                                                {barbero.activo ? (
                                                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactivo</span>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 px-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(barbero)}
                                                    className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingBarbero(barbero)
                                                        setShowScheduleModal(true)
                                                    }}
                                                    className="h-8 w-8 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                                                    title="Configurar Horario"
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(barbero.id)}
                                                    className="h-8 w-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
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

            {/* Modals */}
            {showModal && (
                <BarberoModal
                    barbero={editingBarbero}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        cargarBarberos()
                    }}
                />
            )}

            {showScheduleModal && editingBarbero && (
                <HorarioModal
                    barbero={editingBarbero}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={() => {
                        setShowScheduleModal(false)
                        cargarBarberos()
                    }}
                />
            )}
            </div>
        </div>
    )
}

// Helper to summarize schedule
function getHorarioResumen(horario: Record<string, { inicio: string; fin: string }>) {
    if (!horario) return 'No configurado'
    const dias = Object.keys(horario).length
    const ejemplo = Object.values(horario)[0]
    if (!ejemplo) return 'No configurado'
    return `${dias} días • ${ejemplo.inicio} - ${ejemplo.fin}`
}

// Demo data
function getDemoBarbers(): BarberoConSucursal[] {
    return [
        {
            id: '1',
            sucursal_id: '1',
            nombre: 'Carlos Hernández',
            estacion_id: 1,
            usuario_tablet: 'carlos01',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' },
                sabado: { inicio: '09:00', fin: '15:00' }
            },
            bloqueo_almuerzo: { inicio: '14:00', fin: '15:00' },
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            sucursal_id: '1',
            nombre: 'Miguel Ángel López',
            estacion_id: 2,
            usuario_tablet: 'miguel02',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '10:00', fin: '19:00' },
                martes: { inicio: '10:00', fin: '19:00' },
                miercoles: { inicio: '10:00', fin: '19:00' },
                jueves: { inicio: '10:00', fin: '19:00' },
                viernes: { inicio: '10:00', fin: '19:00' },
                sabado: { inicio: '10:00', fin: '16:00' }
            },
            bloqueo_almuerzo: { inicio: '14:30', fin: '15:30' },
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            sucursal_id: '1',
            nombre: 'Roberto Sánchez',
            estacion_id: 3,
            usuario_tablet: 'roberto03',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' }
            },
            bloqueo_almuerzo: null,
            activo: false,
            hora_entrada: null,
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            created_at: new Date().toISOString()
        }
    ]
}

function BarberoModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero | null
    onClose: () => void
    onSave: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: barbero?.nombre || '',
        estacion_id: barbero?.estacion_id?.toString() || '',
        usuario_tablet: barbero?.usuario_tablet || '',
        password: '',
        comision_porcentaje: barbero?.comision_porcentaje?.toString() || '50',
        activo: barbero?.activo ?? true
    })

    const supabase = createClient()
    const [sucursalId, setSucursalId] = useState<string | null>(null)

    useEffect(() => {
        const fetchSucursal = async () => {
            const { data } = await (supabase
                .from('sucursales') as any)
                .select('id')
                .limit(1)
                .single()

            if (data) setSucursalId(data.id)
        }
        fetchSucursal()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!sucursalId && !barbero) throw new Error('No se encontró una sucursal activa')

            const data = {
                nombre: formData.nombre,
                estacion_id: parseInt(formData.estacion_id),
                usuario_tablet: formData.usuario_tablet,
                activo: formData.activo,
                comision_porcentaje: parseInt(formData.comision_porcentaje) || 50,
                horario_laboral: barbero?.horario_laboral || {
                    lunes: { inicio: '09:00', fin: '18:00' },
                    martes: { inicio: '09:00', fin: '18:00' },
                    miercoles: { inicio: '09:00', fin: '18:00' },
                    jueves: { inicio: '09:00', fin: '18:00' },
                    viernes: { inicio: '09:00', fin: '18:00' },
                    sabado: { inicio: '09:00', fin: '15:00' }
                },
                password_hash: formData.password ? `hashed_${formData.password}` : barbero?.password_hash || 'default_hash'
            }

            if (barbero) {
                const { error } = await (supabase.from('barberos') as any).update(data).eq('id', barbero.id)
                if (error) throw error
                toast.success('Barbero actualizado correctamente')
            } else {
                const { error } = await (supabase.from('barberos') as any).insert([{ ...data, sucursal_id: sucursalId }])
                if (error) throw error
                toast.success('Barbero creado correctamente')
            }

            onSave()
        } catch (err: any) {
            console.error('Error saving:', err)
            toast.error(err.message || 'Error al guardar barbero')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-white/10 text-white p-0 overflow-hidden">
                <div className="bg-gradient-to-b from-[#D4AF37]/10 to-transparent p-6 border-b border-white/5">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
                            <Users className="w-6 h-6 text-[#D4AF37]" />
                            {barbero ? 'EDITAR BARBERO' : 'NUEVO BARBERO'}
                        </DialogTitle>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
                            {barbero ? 'Modifica los perfiles del equipo' : 'Añade un nuevo experto al equipo'}
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre Completo</Label>
                            <Input
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50"
                                placeholder="Ej. Carlos Hernández"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Número de Estación</Label>
                            <Input
                                type="number"
                                value={formData.estacion_id}
                                onChange={(e) => setFormData({ ...formData, estacion_id: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50"
                                placeholder="1-20"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario Tablet</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <Input
                                    value={formData.usuario_tablet}
                                    onChange={(e) => setFormData({ ...formData, usuario_tablet: e.target.value })}
                                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50"
                                    placeholder="carlos01"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contraseña Access</Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50"
                                placeholder="••••••••"
                                required={!barbero}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Configuración de Ventas</Label>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="activo"
                                    checked={formData.activo}
                                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                                    className="data-[state=checked]:bg-[#D4AF37]"
                                />
                                <Label htmlFor="activo" className="text-[10px] font-bold uppercase text-slate-300">Activo</Label>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Input
                                    type="number"
                                    value={formData.comision_porcentaje}
                                    onChange={(e) => setFormData({ ...formData, comision_porcentaje: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white pr-8 focus:border-[#D4AF37]/50"
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                Porcentaje de comisión asignado por cada servicio realizado.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]"
                        >
                            CANCELAR
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-black uppercase tracking-widest text-[10px] px-8 hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : barbero ? (
                                'GUARDAR CAMBIOS'
                            ) : (
                                'CREAR BARBERO'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function HorarioModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero
    onClose: () => void
    onSave: () => void
}) {
    const defaultSchedule = { inicio: '09:00', fin: '18:00' }
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

    const [loading, setLoading] = useState(false)
    const [horario, setHorario] = useState<Record<string, { inicio: string, fin: string } | null>>(() => {
        const initial: any = {}
        diasSemana.forEach(dia => {
            // @ts-ignore
            initial[dia] = barbero.horario_laboral?.[dia] || null
        })
        return initial
    })

    const [almuerzo, setAlmuerzo] = useState({
        inicio: barbero.bloqueo_almuerzo?.inicio || '14:00',
        fin: barbero.bloqueo_almuerzo?.fin || '15:00',
        activo: !!barbero.bloqueo_almuerzo
    })

    const supabase = createClient()

    const handleDayToggle = (dia: string, active: boolean) => {
        setHorario(prev => ({
            ...prev,
            [dia]: active ? defaultSchedule : null
        }))
    }

    const handleTimeChange = (dia: string, field: 'inicio' | 'fin', value: string) => {
        setHorario(prev => ({
            ...prev,
            [dia]: prev[dia] ? { ...prev[dia]!, [field]: value } : null
        }))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const cleanHorario: any = {}
            Object.entries(horario).forEach(([dia, data]) => {
                if (data) cleanHorario[dia] = data
            })

            const { error } = await (supabase
                .from('barberos') as any)
                .update({
                    horario_laboral: cleanHorario,
                    bloqueo_almuerzo: almuerzo.activo ? {
                        inicio: almuerzo.inicio,
                        fin: almuerzo.fin
                    } : null
                })
                .eq('id', barbero.id)

            if (error) throw error
            toast.success('Horario actualizado correctamente')
            onSave()
        } catch (err: any) {
            toast.error('Error al guardar horario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/10 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-b from-[#D4AF37]/10 to-transparent p-6 border-b border-white/5 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
                            <Clock className="w-6 h-6 text-[#D4AF37]" />
                            HORARIO LABORAL
                        </DialogTitle>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                            CONFIGURACIÓN PARA: <span className="text-white">{barbero.nombre.toUpperCase()}</span>
                        </p>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Lunch Break Section */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xl">
                                    🍽️
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bloqueo de Almuerzo</h3>
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">Intervalo diario de descanso</p>
                                </div>
                            </div>
                            <Switch
                                checked={almuerzo.activo}
                                onCheckedChange={(checked) => setAlmuerzo(prev => ({ ...prev, activo: checked }))}
                                className="data-[state=checked]:bg-[#D4AF37]"
                            />
                        </div>

                        {almuerzo.activo && (
                            <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Inicio</Label>
                                    <Input
                                        type="time"
                                        value={almuerzo.inicio}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, inicio: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Fin</Label>
                                    <Input
                                        type="time"
                                        value={almuerzo.fin}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, fin: e.target.value }))}
                                        className="bg-black/40 border-white/10 text-white h-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Días Laborales</h3>
                        <div className="space-y-2">
                            {diasSemana.map(dia => {
                                const isActive = !!horario[dia]
                                return (
                                    <div key={dia} className={cn(
                                        "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 border",
                                        isActive ? "bg-white/5 border-white/10" : "bg-transparent border-transparent opacity-40"
                                    )}>
                                        <div className="w-24 flex items-center gap-3">
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleDayToggle(dia, checked)}
                                                className="scale-90 data-[state=checked]:bg-[#D4AF37]"
                                            />
                                            <span className="capitalize text-xs font-bold text-slate-200">{dia}</span>
                                        </div>

                                        {isActive ? (
                                            <div className="flex items-center gap-2 flex-1 animate-in fade-in duration-300">
                                                <Input
                                                    type="time"
                                                    value={horario[dia]?.inicio}
                                                    onChange={(e) => handleTimeChange(dia, 'inicio', e.target.value)}
                                                    className="bg-black/40 border-white/5 text-white h-8 text-xs py-0"
                                                />
                                                <span className="text-slate-600 font-bold">-</span>
                                                <Input
                                                    type="time"
                                                    value={horario[dia]?.fin}
                                                    onChange={(e) => handleTimeChange(dia, 'fin', e.target.value)}
                                                    className="bg-black/40 border-white/5 text-white h-8 text-xs py-0"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-right pr-4">
                                                No Laboral
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-white/5 shrink-0 bg-black/20">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]"
                    >
                        CANCELAR
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-black uppercase tracking-widest text-[10px] px-8 hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'GUARDAR HORARIO'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
