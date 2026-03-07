'use client'

import { useMemo, useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { CitaCard } from './CitaCard'

interface AgendaTimelineProps {
    citas: CitaDesdeVista[]
    bloqueos?: any[]
    almuerzoBarbero?: any
    fechaBase?: string
    currentTime: Date
    onUpdate?: () => void
}

const HORA_INICIO = 8
const HORA_FIN = 21 // Till 9 PM
const INTERVALO_MINUTOS = 60
const SLOT_HEIGHT = 80 // Reduced from 96px to see more hours

function generarSlots(): string[] {
    const slots: string[] = []
    for (let hora = HORA_INICIO; hora < HORA_FIN; hora++) {
        const ampm = hora >= 12 ? 'PM' : 'AM'
        const hour12 = hora % 12 || 12
        slots.push(`${hour12} ${ampm}`)
    }
    return slots
}

export const AgendaTimeline = memo(function AgendaTimeline({ citas, bloqueos = [], almuerzoBarbero = null, fechaBase, currentTime, onUpdate }: AgendaTimelineProps) {
    const slots = useMemo(() => generarSlots(), [])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [selectedCita, setSelectedCita] = useState<CitaDesdeVista | null>(null)
    const [isManualScroll, setIsManualScroll] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const supabase = createClient()

    const [activeModal, setActiveModal] = useState<'move' | 'cancel' | 'details' | null>(null)

    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Position in pixels: (Hour offset * height) + (Minutes proportional to height)
    const currentTimePosition = ((currentHour - HORA_INICIO) * SLOT_HEIGHT) + (currentMinute / 60 * SLOT_HEIGHT)

    const targetScrollPosition = Math.max(0, ((currentHour - 1 - HORA_INICIO) * SLOT_HEIGHT))

    useEffect(() => {
        if (!isManualScroll && scrollContainerRef.current) {
            // Add a small delay to ensure heights are calculated
            const timer = setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [targetScrollPosition, isManualScroll])

    const handleUserInteraction = () => {
        setIsManualScroll(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            setIsManualScroll(false)
        }, 15000)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    const getCitaEnSlot = (hourString: string) => {
        const [h, ampm] = hourString.split(' ')
        let hour24 = parseInt(h)
        if (ampm === 'PM' && hour24 !== 12) hour24 += 12
        if (ampm === 'AM' && hour24 === 12) hour24 = 0

        const slotTimeStart = new Date()

        // Use fechaBase if provided, otherwise today
        if (fechaBase) {
            const [y, m, d] = fechaBase.split('-').map(Number)
            slotTimeStart.setFullYear(y, m - 1, d)
        }

        slotTimeStart.setHours(hour24, 0, 0, 0)
        const slotTimeEnd = new Date(slotTimeStart)
        slotTimeEnd.setHours(hour24 + 1, 0, 0, 0)

        const citaEncontrada = citas.find((cita: CitaDesdeVista) => {
            if (['cancelada', 'no_show'].includes(cita.estado)) return false
            const citaInicio = new Date(cita.timestamp_inicio)
            const citaFin = new Date(cita.timestamp_fin)
            return (citaInicio < slotTimeEnd && citaFin > slotTimeStart)
        })

        if (citaEncontrada) return { tipo: 'cita', data: citaEncontrada }

        // Check bloqueos
        const bloqueoEncontrado = bloqueos.find(b => {
            const bStart = new Date(b.timestamp_inicio)
            const bEnd = new Date(b.timestamp_fin)
            return (bStart < slotTimeEnd && bEnd > slotTimeStart)
        })

        if (bloqueoEncontrado) return { tipo: 'bloqueo', data: bloqueoEncontrado }

        // Check almuerzo
        if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) {
            const dStr = fechaBase || new Date().toLocaleDateString('en-CA')
            const aStart = new Date(`${dStr}T${almuerzoBarbero.inicio}:00-07:00`)
            const aEnd = new Date(`${dStr}T${almuerzoBarbero.fin}:00-07:00`)
            if (aStart < slotTimeEnd && aEnd > slotTimeStart) {
                return { tipo: 'almuerzo', data: null }
            }
        }

        return null
    }

    const getStatusColor = (estado: string, tipoItem?: string) => {
        if (tipoItem === 'bloqueo') return 'bg-red-500'
        if (tipoItem === 'almuerzo') return 'bg-amber-500'

        switch (estado) {
            case 'confirmada': return 'bg-primary'
            case 'en_espera': return 'bg-primary'
            case 'en_proceso': return 'bg-emerald-500'
            case 'por_cobrar': return 'bg-purple-500'
            case 'finalizada': return 'bg-slate-300'
            default: return 'bg-slate-500'
        }
    }

    const actualizarEstadoDirecto = async (citaId: string, nuevoEstado: EstadoCita) => {
        try {
            const { error } = await (supabase.from('citas') as any).update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', citaId)
            if (error) throw error
            onUpdate?.()
        } catch (err) {
            console.error('Error updating state:', err)
            alert('Error al actualizar')
        }
    }

    const dentroHorario = currentHour >= HORA_INICIO && currentHour < HORA_FIN

    return (
        <div className="absolute inset-0 flex flex-col">
            <div
                ref={scrollContainerRef}
                onWheel={handleUserInteraction}
                onTouchMove={handleUserInteraction}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 relative scroll-smooth"
            >
                {dentroHorario && (
                    <div
                        className="absolute left-0 right-0 z-[10] border-t-[2px] border-primary pointer-events-none transition-all duration-1000 flex items-center"
                        style={{ top: `${currentTimePosition + (typeof window !== 'undefined' && window.innerWidth >= 768 ? 16 : 12)}px` }}
                    >
                        <div className="absolute left-0 -translate-y-1/2 flex items-center pr-2 bg-[#050608]">
                            <span className="bg-primary text-black text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase whitespace-nowrap z-[10] font-display ml-2">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}
                            </span>
                        </div>
                    </div>
                )}

                <div className="space-y-0">
                    {slots.map((slot) => {
                        const item = getCitaEnSlot(slot)
                        let activeTimer = null
                        let isEnProceso = false
                        let isPorCobrar = false

                        if (item && item.tipo === 'cita') {
                            isEnProceso = item.data.estado === 'en_proceso'
                            isPorCobrar = item.data.estado === 'por_cobrar'

                            if (isEnProceso && item.data.timestamp_inicio_servicio) {
                                const minTrasncurridos = Math.floor((new Date().getTime() - new Date(item.data.timestamp_inicio_servicio).getTime()) / 60000)
                                const horas = Math.floor(minTrasncurridos / 60)
                                const mins = minTrasncurridos % 60
                                activeTimer = horas > 0 ? `${horas}H ${mins}M` : `${mins} MIN`
                            } else if (isPorCobrar && item.data.duracion_real_minutos) {
                                const horas = Math.floor(item.data.duracion_real_minutos / 60)
                                const mins = item.data.duracion_real_minutos % 60
                                activeTimer = horas > 0 ? `${horas}H ${mins}M` : `${mins} MIN`
                            }
                        }

                        const cardBorder = item?.tipo === 'bloqueo' ? 'border-red-500/30 bg-[#16181D]/90' :
                            item?.tipo === 'almuerzo' ? 'border-amber-500/30 bg-[#16181D]/90' :
                                isEnProceso ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5' :
                                    isPorCobrar ? 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/5' :
                                        'border-white/5 hover:border-white/10 bg-[#16181D]/90'

                        return (
                            <div
                                key={slot}
                                style={{ height: `${SLOT_HEIGHT}px` }}
                                className={`relative flex items-center gap-3 border-b border-slate-700/20 transition-colors duration-200 ${item ? 'bg-transparent' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0 opacity-60">
                                    {slot}
                                </div>
                                <div className="relative flex-1 py-0.5">
                                    {item ? (
                                        <div className={`w-full flex items-center justify-between gap-2 animate-fade-in backdrop-blur-sm p-2 rounded-xl border ${cardBorder} shadow-lg transition-all group/card overflow-hidden`}>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className={`w-0.5 h-6 rounded-full ${getStatusColor(item.tipo === 'cita' ? item.data.estado : '', item.tipo)} shadow-[0_0_8px_rgba(0,0,0,0.3)] shrink-0`} />
                                                <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <p className={`text-[10px] font-black ${item.tipo === 'bloqueo' ? 'text-red-400' : item.tipo === 'almuerzo' ? 'text-amber-400' : 'text-white'} truncate leading-tight font-display uppercase tracking-tight`}>
                                                            {item.tipo === 'cita' ? item.data.cliente_nombre : item.tipo === 'almuerzo' ? 'Descanso / Almuerzo' : 'Turno Bloqueado'}
                                                        </p>
                                                        {(isEnProceso || isPorCobrar) && activeTimer && (
                                                            <div className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black flex-shrink-0 flex items-center gap-1 border ${isEnProceso ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                                    'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                                                }`}>
                                                                <span className={`material-icons-round text-[10px] sm:text-[11px] ${isEnProceso ? 'animate-spin-slow' : ''}`}>
                                                                    {isEnProceso ? 'hourglass_top' : 'done_all'}
                                                                </span>
                                                                <span className={isEnProceso ? 'animate-pulse' : ''}>{activeTimer}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={`text-[7px] font-black ${item.tipo === 'cita' ? 'text-slate-500' : item.tipo === 'bloqueo' ? 'text-red-500/50' : 'text-amber-500/50'} uppercase tracking-widest leading-none mt-0.5 truncate`}>
                                                        {item.tipo === 'cita' ? item.data.servicio_nombre : item.tipo === 'almuerzo' ? 'Horario NO disponible' : (item.data.motivo || 'Razón no especificada')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quick Actions - Only for Citas */}
                                            {item.tipo === 'cita' && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {item.data.estado === 'confirmada' && (
                                                        <>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); actualizarEstadoDirecto(item.data.id, 'en_proceso'); }}
                                                                className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20"
                                                                title="Iniciar"
                                                            >
                                                                <span className="material-icons-round text-sm">play_arrow</span>
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('move'); }}
                                                                className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-black transition-all border border-blue-500/20"
                                                                title="Mover"
                                                            >
                                                                <span className="material-icons-round text-base">event_repeat</span>
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('cancel'); }}
                                                                className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all border border-red-500/20"
                                                                title="Cancelar"
                                                            >
                                                                <span className="material-icons-round text-base">close</span>
                                                            </motion.button>
                                                        </>
                                                    )}
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('details'); }}
                                                        className="w-7 h-7 rounded-lg bg-white/10 text-white/50 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all"
                                                        title="Detalles"
                                                    >
                                                        <span className="material-icons-round text-base">info</span>
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-px w-8 bg-slate-100 ml-1 opacity-50" />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="shrink-0 bg-slate-900/50 backdrop-blur-md border-t border-slate-800 px-6 py-4">
                <div className="flex items-center justify-around text-[9px] font-black uppercase tracking-widest text-slate-400 font-display">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>Confirmada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Proceso</span>
                    </div>
                    <div className="flex items-center gap-1.5 hidden md:flex">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Por Cobrar</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>Hecho</span>
                    </div>
                </div>
            </div>

            {/* Hidden Ghost Card to reuse Modals logic */}
            {selectedCita && (
                <div className="hidden">
                    <CitaCard
                        cita={selectedCita}
                        currentTime={currentTime}
                        allCitas={citas}
                        onUpdate={() => { setSelectedCita(null); setActiveModal(null); onUpdate?.(); }}
                        onClose={() => { setSelectedCita(null); setActiveModal(null); }}
                        autoOpen={activeModal}
                    />
                </div>
            )}
        </div>
    )
})
