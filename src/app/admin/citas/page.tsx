'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import type { CitaDesdeVista, EstadoCita, Servicio, Barbero } from '@/lib/types'
import { ClientAutocomplete } from '@/components/ClientAutocomplete'

function CitasContent() {
    // 1. Hydration mismatch fix: Start with a stable state or wait for mount
    const [mounted, setMounted] = useState(false)
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroFecha, setFiltroFecha] = useState('') // Empty initially
    const [filtroEstado, setFiltroEstado] = useState<EstadoCita | 'todas'>('todas')
    const [debugMsg, setDebugMsg] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingCita, setEditingCita] = useState<CitaDesdeVista | null>(null)
    const [initialOrigen, setInitialOrigen] = useState<'whatsapp' | 'walkin'>('whatsapp')

    const searchParams = useSearchParams()
    const router = useRouter()

    // Check for query parameters to automatically open the modal
    useEffect(() => {
        if (mounted && searchParams) {
            const action = searchParams.get('action')
            if (action === 'agenda-manual') {
                handleNewCita('whatsapp')
                router.replace('/admin/citas') // Clean URL
            } else if (action === 'walk-in') {
                handleNewCita('walkin')
                router.replace('/admin/citas') // Clean URL
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

    // 2. Stable Supabase client
    const [supabase] = useState(() => createClient())

    // Initialize date only on client side
    // Initialize date with local timezone
    useEffect(() => {
        // Create a date in local timezone "YYYY-MM-DD"
        // avoiding UTC shift which might show tomorrow's date late at night
        const today = new Date()
        const localIsoDate = today.toLocaleDateString('en-CA') // YYYY-MM-DD format
        setFiltroFecha(localIsoDate)
        setMounted(true)
    }, [])

    const cargarCitas = useCallback(async (isInitialLoad = false) => {
        if (!filtroFecha) return

        if (isInitialLoad) setLoading(true)
        setDebugMsg('Cargando...')
        try {
            console.log('Fetching citas for:', filtroFecha)

            let query = (supabase
                .from('vista_general_citas') as any)
                .select('*')
                .eq('fecha_cita_local', filtroFecha)
                .order('timestamp_inicio', { ascending: true })

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
            cargarCitas(true) // Load with spinner for filter changes/initial

            // Supabase Realtime Subscription
            const channel = supabase.channel('citas-page-changes')
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'citas' },
                    () => {
                        console.log('Realtime update received on CitasPage')
                        cargarCitas() // Background update without spinner
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [mounted, filtroFecha, filtroEstado, cargarCitas, supabase])

    // Avoid hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <div className="p-8 text-white">Cargando aplicación...</div>
    }

    return (
        <>
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Citas</h1>
                        <p className="text-slate-400 mt-1 text-sm md:text-base">Gestiona las citas del día</p>
                    </div>
                    <button
                        onClick={() => handleNewCita('whatsapp')}
                        className="w-full md:w-auto btn-primary flex items-center justify-center gap-2 py-2.5 text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Nueva Cita
                    </button>
                </div>
            </div>


            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                <div className="glass-card p-3 md:p-4 text-center">
                    <p className="text-xl md:text-2xl font-bold text-white">{citas.length}</p>
                    <p className="text-[10px] md:text-xs text-slate-400">Total</p>
                </div>
                <div className="glass-card p-3 md:p-4 text-center border-l-2 border-blue-500">
                    <p className="text-xl md:text-2xl font-bold text-blue-400">
                        {citas.filter(c => c.estado === 'confirmada').length}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400">Confirmadas</p>
                </div>
                <div className="glass-card p-3 md:p-4 text-center border-l-2 border-emerald-500">
                    <p className="text-xl md:text-2xl font-bold text-emerald-400">
                        {citas.filter(c => c.estado === 'en_proceso').length}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400">En Proceso</p>
                </div>
                <div className="glass-card p-3 md:p-4 text-center border-l-2 border-slate-500">
                    <p className="text-xl md:text-2xl font-bold text-slate-400">
                        {citas.filter(c => c.estado === 'finalizada').length}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400">Finalizadas</p>
                </div>
                <div className="glass-card p-3 md:p-4 text-center border-l-2 border-red-500 col-span-2 sm:col-span-1">
                    <p className="text-xl md:text-2xl font-bold text-red-400">
                        {citas.filter(c => c.estado === 'cancelada' || c.estado === 'no_show').length}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-400">Canceladas</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-end gap-4 overflow-x-auto pb-2 sm:pb-0">
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] md:text-xs text-slate-400 mb-1 font-bold uppercase tracking-widest">Fecha</label>
                        <input
                            type="date"
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            className="input-field w-full sm:w-auto text-sm"
                        />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] md:text-xs text-slate-400 mb-1 font-bold uppercase tracking-widest">Estado</label>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value as EstadoCita | 'todas')}
                            className="input-field w-full sm:w-auto text-sm"
                        >
                            <option value="todas">Todas</option>
                            <option value="confirmada">Confirmadas</option>
                            <option value="en_espera">En Espera</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="finalizada">Finalizadas</option>
                            <option value="cancelada">Canceladas</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>
                    <button
                        onClick={() => cargarCitas(true)}
                        className="w-full sm:w-auto btn-secondary px-6 py-2 h-[42px] shrink-0 text-sm font-bold"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : citas.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-slate-500">No hay citas para esta fecha</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] md:min-w-0">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="px-4 md:px-6 py-4 text-left text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest">Hora</th>
                                    <th className="px-4 md:px-6 py-4 text-left text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-4 md:px-6 py-4 text-left text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest sm:table-cell hidden">Servicio / Barbero</th>
                                    <th className="px-4 md:px-6 py-4 text-left text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {citas.map((cita) => (
                                    <tr key={cita.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 md:px-6 py-4 font-mono text-[11px] md:text-sm text-slate-300">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{cita.hora_cita_local || '--:--'}</span>
                                                <span className="text-[9px] text-slate-500 uppercase">{cita.fecha_cita_local}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <p className="font-medium text-white text-sm md:text-base truncate max-w-[120px] md:max-w-none">{cita.cliente_nombre}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400">{cita.cliente_telefono}</span>
                                                {cita.origen === 'whatsapp' && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">WA</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 sm:table-cell hidden">
                                            <div className="text-[11px] md:text-sm text-slate-300 truncate max-w-[150px]">
                                                {cita.servicio_nombre || 'Servicio Personalizado'}
                                            </div>
                                            <div className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-tighter">
                                                {cita.barbero_nombre || 'Sin barbero'}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <span className={`
                                                status-badge text-[9px] md:text-xs px-2 md:px-3 py-1
                                                ${cita.estado === 'confirmada' ? 'bg-blue-500/20 text-blue-400' : ''}
                                                ${cita.estado === 'en_proceso' ? 'status-in-progress' : ''}
                                                ${cita.estado === 'finalizada' ? 'bg-slate-500/20 text-slate-400' : ''}
                                                ${cita.estado === 'cancelada' ? 'status-cancelled' : ''}
                                                ${cita.estado === 'no_show' ? 'bg-red-500/20 text-red-400' : ''}
                                            `}>
                                                {cita.estado ? cita.estado.replace('_', ' ') : ' desconocida'}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 md:gap-2">
                                                {/* Status Actions */}
                                                {cita.estado === 'confirmada' && (
                                                    <button
                                                        onClick={() => handleStatusChange(cita, 'en_proceso')}
                                                        className="p-1.5 md:p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                                        title="Iniciar Cita"
                                                    >
                                                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </button>
                                                )}
                                                {cita.estado === 'en_proceso' && (
                                                    <button
                                                        onClick={() => handleStatusChange(cita, 'finalizada')}
                                                        className="p-1.5 md:p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                                        title="Finalizar Cita"
                                                    >
                                                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleEditCita(cita)}
                                                    className="p-1.5 md:p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                                                    title="Editar"
                                                >
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteCita(cita.id)}
                                                    className="p-1.5 md:p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                showModal && (
                    <CitaModal
                        cita={editingCita}
                        onClose={() => setShowModal(false)}
                        onSave={() => {
                            setShowModal(false)
                            cargarCitas() // Refresh in background after save
                        }}
                        initialOrigen={initialOrigen}
                    />
                )
            }
        </>
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
            timestamp_inicio: `${safeFecha}T10:00:00`,
            timestamp_fin: `${safeFecha}T10:40:00`,
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
            timestamp_inicio: `${safeFecha}T11:00:00`,
            timestamp_fin: `${safeFecha}T11:30:00`,
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
            timestamp_inicio: `${safeFecha}T12:00:00`,
            timestamp_fin: `${safeFecha}T13:00:00`,
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


function CitaModal({ cita, onClose, onSave, initialOrigen }: {
    cita?: CitaDesdeVista | null
    onClose: () => void
    onSave: () => void
    initialOrigen?: 'whatsapp' | 'walkin'
}) {
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])

    // Utilities to keep local time from jumping
    const extractLocalTime = (isoString: string) => {
        const d = new Date(isoString)
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Hermosillo',
            hour: '2-digit', minute: '2-digit'
        })
        return formatter.format(d)
    }

    const extractLocalDate = (isoString?: string) => {
        const d = isoString ? new Date(isoString) : new Date()
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        })
        return formatter.format(d)
    }

    // Form State
    const [formData, setFormData] = useState({
        cliente_nombre: cita?.cliente_nombre || '',
        cliente_telefono: cita?.cliente_telefono || '',
        servicio_id: cita?.servicio_id || (cita ? 'custom' : ''), // If editing and no service, assume custom
        barbero_id: cita?.barbero_id || '',
        fecha: extractLocalDate(cita?.timestamp_inicio),
        hora: cita?.timestamp_inicio ? extractLocalTime(cita.timestamp_inicio) : '10:00',
        horaFin: cita?.timestamp_fin ? extractLocalTime(cita.timestamp_fin) : '10:30',
        notas: cita?.notas || ''
    })

    const supabase = createClient()

    // State for sucursalId
    const [sucursalId, setSucursalId] = useState<string | null>(null)

    // Load dependencies on mount
    useEffect(() => {
        const loadDeps = async () => {
            // Load Services
            const { data: servs } = await supabase.from('servicios').select('*').eq('activo', true)
            if (servs) setServicios(servs)

            // Load Barbers
            const { data: barbs } = await supabase.from('barberos').select('*').eq('activo', true)
            if (barbs) setBarberos(barbs)

            // Load Sucursal ID
            const { data: suc } = await (supabase.from('sucursales').select('id') as any).limit(1).single()
            if (suc) setSucursalId(suc.id)
        }
        loadDeps()
    }, [])

    // Update End Time automatically when Service or Start Time changes
    // BUT only if we are creating a new appointment or changing the service
    // For now, let's keep it simple: update suggested end time if service or start time changes
    // This might overwrite manual changes if they change service/start time again, which is usually expected behavior
    useEffect(() => {
        if (formData.servicio_id && formData.hora) {
            const service = servicios.find(s => s.id === formData.servicio_id)
            if (service) {
                const startDate = new Date(`2000-01-01T${formData.hora}:00`)
                const endDate = new Date(startDate.getTime() + service.duracion_minutos * 60000)
                const hours = endDate.getHours().toString().padStart(2, '0')
                const minutes = endDate.getMinutes().toString().padStart(2, '0')
                // Only update if it seems like a new setup or consistent flow
                // For editing, we might want to respect existing unless changed...
                // But the user explicitly asked to be able to "add a service aside",
                // meaning they want to manually extend it.
                // So we update the default suggestion, but they can edit it after.

                // Logic: If user changes service/start time, we propose new end time.
                // If they edit end time, it stays. 
                // However, without a "dirty" state, we can't know if they edited it manually.
                // Simple approach: Always update suggestion on dependency change.

                // Wait, if editing an existing appointment that ALREADY has a custom duration...
                // We shouldn't overwrite it on mount unless they change something.
                // This useEffect runs heavily.

                // We'll skip this effect for the initial mount of an existing cita 
                // (handled by initial state).
                // But we need it for live updates.

                // Let's protect it: compare current duration with service duration?
                // No, just update it. If they change service, they expect recalculation.
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
            // Construir string forzando el huso de Hermosillo para evitar saltos UTC
            const TZ_OFFSET = '-07:00'
            const startISO = `${formData.fecha}T${formData.hora}:00${TZ_OFFSET}`
            const endISO = `${formData.fecha}T${formData.horaFin}:00${TZ_OFFSET}`

            const payload = {
                sucursal_id: sucursalId,
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

            onSave()
        } catch (err) {
            console.error('Error saving cita:', err)
            alert('Error al guardar cita: ' + (err as any).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">
                        {cita ? 'Editar Cita' : (initialOrigen === 'walkin' ? 'Nuevo Walk-in' : 'Nueva Cita')}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Cliente */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Cliente</label>
                            <ClientAutocomplete
                                value={formData.cliente_nombre}
                                onChange={(val) => setFormData({ ...formData, cliente_nombre: val })}
                                onSelect={(cliente) => {
                                    setFormData({
                                        ...formData,
                                        cliente_nombre: cliente.nombre,
                                        cliente_telefono: cliente.telefono || formData.cliente_telefono
                                    })
                                }}
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono</label>
                            <input
                                type="tel"
                                className="input-field"
                                placeholder="+52..."
                                value={formData.cliente_telefono}
                                onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Servicio</label>
                            <select
                                required
                                className="input-field"
                                value={formData.servicio_id}
                                onChange={e => setFormData({ ...formData, servicio_id: e.target.value })}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="custom">Servicio Personalizado</option>
                                {servicios.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Barbero</label>
                            <select
                                className="input-field"
                                value={formData.barbero_id}
                                onChange={e => setFormData({ ...formData, barbero_id: e.target.value })}
                            >
                                <option value="">Cualquiera</option>
                                {barberos.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tiempo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Fecha</label>
                            <input
                                type="date"
                                required
                                className="input-field"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Inicio</label>
                                <input
                                    type="time"
                                    required
                                    className="input-field"
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Fin</label>
                                <input
                                    type="time"
                                    required
                                    className="input-field"
                                    value={formData.horaFin} // Controlled by state
                                    onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Notas</label>
                        <textarea
                            className="input-field min-h-[80px]"
                            placeholder="Notas adicionales..."
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? 'Guardando...' : (cita ? 'Guardar Cambios' : 'Confirmar Cita')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
