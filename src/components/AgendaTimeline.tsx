'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { CitaCard } from './CitaCard'

interface AgendaTimelineProps {
    citas: CitaDesdeVista[]
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

export function AgendaTimeline({ citas, currentTime, onUpdate }: AgendaTimelineProps) {
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
        slotTimeStart.setHours(hour24, 0, 0, 0)
        const slotTimeEnd = new Date()
        slotTimeEnd.setHours(hour24 + 1, 0, 0, 0)

        return citas.find(cita => {
            if (['cancelada', 'no_show'].includes(cita.estado)) return false
            const citaInicio = new Date(cita.timestamp_inicio)
            const citaFin = new Date(cita.timestamp_fin)
            return (citaInicio < slotTimeEnd && citaFin > slotTimeStart)
        })
    }

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return 'bg-primary'
            case 'en_espera': return 'bg-primary'
            case 'en_proceso': return 'bg-emerald-500'
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
                        const cita = getCitaEnSlot(slot)
                        return (
                            <div
                                key={slot}
                                style={{ height: `${SLOT_HEIGHT}px` }}
                                className={`relative flex items-center gap-3 border-b border-slate-700/20 transition-colors duration-200 ${cita ? 'bg-transparent' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0 opacity-60">
                                    {slot}
                                </div>
                                <div className="relative flex-1 py-0.5">
                                    {cita ? (
                                        <div className="w-full flex items-center justify-between gap-2 animate-fade-in bg-[#16181D]/90 backdrop-blur-sm p-2 rounded-xl border border-white/5 shadow-lg hover:border-white/10 transition-all group/card overflow-hidden">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className={`w-0.5 h-6 rounded-full ${getStatusColor(cita.estado)} shadow-[0_0_8px_rgba(0,0,0,0.3)] shrink-0`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black text-white truncate leading-tight font-display uppercase tracking-tight">
                                                        {cita.cliente_nombre}
                                                    </p>
                                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mt-0.5 truncate">
                                                        {cita.servicio_nombre}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quick Actions - Always visible */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {cita.estado === 'confirmada' && (
                                                    <>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); actualizarEstadoDirecto(cita.id, 'en_proceso'); }}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20"
                                                            title="Iniciar"
                                                        >
                                                            <span className="material-icons-round text-sm">play_arrow</span>
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedCita(cita); setActiveModal('move'); }}
                                                            className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-black transition-all border border-blue-500/20"
                                                            title="Mover"
                                                        >
                                                            <span className="material-icons-round text-base">event_repeat</span>
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedCita(cita); setActiveModal('cancel'); }}
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
                                                    onClick={(e) => { e.stopPropagation(); setSelectedCita(cita); setActiveModal('details'); }}
                                                    className="w-7 h-7 rounded-lg bg-white/10 text-white/50 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all"
                                                    title="Detalles"
                                                >
                                                    <span className="material-icons-round text-base">info</span>
                                                </motion.button>
                                            </div>
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
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>Confirmada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary opacity-50" />
                        <span>Espera</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Proceso</span>
                    </div>
                    <div className="flex items-center gap-2">
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
}
