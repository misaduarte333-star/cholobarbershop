'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { CitaDesdeVista } from '@/lib/types'

interface AgendaTimelineProps {
    citas: CitaDesdeVista[]
    currentTime: Date
}

const HORA_INICIO = 8
const HORA_FIN = 21 // Till 9 PM
const INTERVALO_MINUTOS = 60
const SLOT_HEIGHT = 96 // Fixed height in pixels

function generarSlots(): string[] {
    const slots: string[] = []
    for (let hora = HORA_INICIO; hora < HORA_FIN; hora++) {
        const ampm = hora >= 12 ? 'PM' : 'AM'
        const hour12 = hora % 12 || 12
        slots.push(`${hour12} ${ampm}`)
    }
    return slots
}

export function AgendaTimeline({ citas, currentTime }: AgendaTimelineProps) {
    const slots = useMemo(() => generarSlots(), [])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isManualScroll, setIsManualScroll] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Position in pixels: (Hour offset * height) + (Minutes proportional to height)
    const currentTimePosition = ((currentHour - HORA_INICIO) * SLOT_HEIGHT) + (currentMinute / 60 * SLOT_HEIGHT)

    const targetScrollPosition = Math.max(0, ((currentHour - 1 - HORA_INICIO) * SLOT_HEIGHT))

    useEffect(() => {
        if (!isManualScroll && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: targetScrollPosition,
                behavior: 'smooth'
            })
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

    const dentroHorario = currentHour >= HORA_INICIO && currentHour < HORA_FIN

    return (
        <div className="absolute inset-0 flex flex-col">
            <div
                ref={scrollContainerRef}
                onWheel={handleUserInteraction}
                onTouchMove={handleUserInteraction}
                className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-6 relative scroll-smooth"
            >
                {dentroHorario && (
                    <div
                        className="absolute left-0 right-0 z-[10] border-t-[2px] border-primary pointer-events-none transition-all duration-1000 flex items-center"
                        style={{ top: `${currentTimePosition + 24}px` }}
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
                                className={`relative flex items-center gap-4 border-b border-slate-700/30 transition-colors duration-200 ${cita ? 'bg-transparent' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-12 text-[9px] font-black text-slate-300 uppercase tracking-tighter shrink-0">
                                    {slot}
                                </div>
                                <div className="relative flex-1 py-1">
                                    {cita ? (
                                        <div className="flex items-center gap-3 animate-fade-in bg-[#16181D] p-3 rounded-2xl border border-white/5 shadow-md shadow-black/20 hover:shadow-lg hover:border-white/10 transition-all">
                                            <div className={`w-1 h-8 rounded-full ${getStatusColor(cita.estado)} shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white truncate leading-tight font-display uppercase tracking-tight">
                                                    {cita.cliente_nombre}
                                                </p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-1">
                                                    {cita.servicio_nombre}
                                                </p>
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
        </div>
    )
}
