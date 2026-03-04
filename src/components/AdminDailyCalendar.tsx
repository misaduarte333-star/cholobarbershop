'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { CitaDesdeVista, Barbero } from '@/lib/types'

interface AdminDailyCalendarProps {
    citas: CitaDesdeVista[]
    barberos: Barbero[]
    currentTime: Date
}

const HORA_INICIO = 8
const HORA_FIN = 21 // Till 9 PM
const MINUTE_HEIGHT = 1.5 // 1.5px per minute = 90px per hour

function generarSlots(): number[] {
    const slots: number[] = []
    for (let hora = HORA_INICIO; hora < HORA_FIN; hora++) {
        slots.push(hora)
    }
    return slots
}

export function AdminDailyCalendar({ citas, barberos, currentTime }: AdminDailyCalendarProps) {
    const slots = useMemo(() => generarSlots(), [])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const contentContainerRef = useRef<HTMLDivElement>(null)
    const [isUserScrolling, setIsUserScrolling] = useState(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentAbsoluteMinutes = (currentHour * 60) + currentMinute
    const dayStartMinutes = HORA_INICIO * 60

    const currentTimePosition = (currentAbsoluteMinutes - dayStartMinutes) * MINUTE_HEIGHT

    // Auto-scroll to current time on mount or after idle time
    useEffect(() => {
        if (!isUserScrolling && contentContainerRef.current && currentHour >= HORA_INICIO && currentHour < HORA_FIN) {
            // Target position: center the current time in the view
            const containerHeight = contentContainerRef.current.clientHeight
            const targetPosition = Math.max(0, currentTimePosition - (containerHeight / 2) + 40) // +40 for header

            contentContainerRef.current.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            })
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                })
            }
        }
    }, [currentHour, currentMinute, isUserScrolling, currentTimePosition])

    // Handle User Scroll to pause auto-scrolling
    const handleUserScroll = () => {
        setIsUserScrolling(true)
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

        // Resume auto-scroll after 5 seconds of idle
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false)
        }, 5000)
    }

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'en_espera': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'en_proceso': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'finalizada': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            case 'cancelada': case 'no_show': return 'bg-red-500/20 text-red-400 border-red-500/30'
            default: return 'bg-slate-700/50 text-slate-300 border-slate-600'
        }
    }

    const renderCitaBlock = (cita: CitaDesdeVista) => {
        const start = new Date(cita.timestamp_inicio)
        const end = new Date(cita.timestamp_fin)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

        const startMinutes = (start.getHours() * 60) + start.getMinutes()
        const endMinutes = (end.getHours() * 60) + end.getMinutes()

        const top = Math.max(0, (startMinutes - dayStartMinutes) * MINUTE_HEIGHT)
        const height = Math.max(24, (endMinutes - startMinutes) * MINUTE_HEIGHT)

        if (top < 0 && top + height < 0) return null // Before start

        // Ensure "En Proceso" gets the priority animated glow
        const isEnProceso = cita.estado === 'en_proceso'

        return (
            <div
                key={cita.id}
                className={`absolute left-1 right-1 rounded-xl border p-2 overflow-hidden shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.02] hover:z-20 ${getStatusColor(cita.estado)} ${isEnProceso ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-glow border-emerald-500/50' : ''}`}
                style={{ top: `${top}px`, height: `${height}px` }}
                title={`${cita.cliente_nombre} - ${cita.servicio_nombre}`}
            >
                <p className="text-[10px] font-black uppercase tracking-tight leading-tight truncate">{cita.cliente_nombre}</p>
                {height >= 40 && (
                    <p className="text-[9px] opacity-70 uppercase truncate mt-0.5">{cita.servicio_nombre}</p>
                )}
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            </div>
        )
    }

    const renderAlmuerzo = (barbero: Barbero) => {
        if (!barbero.bloqueo_almuerzo) return null

        const startHours = parseInt(barbero.bloqueo_almuerzo.inicio.substring(0, 2))
        const startMins = parseInt(barbero.bloqueo_almuerzo.inicio.substring(3, 5))
        const startMinutes = (startHours * 60) + startMins
        const endMinutes = startMinutes + 60 // Assumed 1hr lunch

        const top = (startMinutes - dayStartMinutes) * MINUTE_HEIGHT
        const height = (endMinutes - startMinutes) * MINUTE_HEIGHT

        return (
            <div
                key={`almuerzo-${barbero.id}`}
                className="absolute left-1 right-1 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-2 flex items-center justify-center overflow-hidden z-10 striped-bg-amber"
                style={{ top: `${top}px`, height: `${height}px` }}
            >
                <div className="rotate-[-10deg] opacity-40 flex items-center gap-1">
                    <span className="material-icons-round text-amber-500 text-sm">restaurant</span>
                    <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest hidden sm:inline">Descanso</span>
                </div>
            </div>
        )
    }

    const dentroHorario = currentHour >= HORA_INICIO && currentHour < HORA_FIN

    return (
        <div className="glass-card p-5 md:p-6 rounded-[2rem] border-white/5 shadow-2xl w-full relative h-[500px] flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <span className="material-icons-round text-2xl">calendar_view_week</span>
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-display">Agenda General</h2>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">Línea de tiempo diaria</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex border border-white/5 rounded-2xl bg-black/40 relative">
                {/* Timeline Axis */}
                <div className="w-16 flex-shrink-0 border-r border-white/5 bg-black/60 z-30 flex flex-col relative overflow-hidden" ref={scrollContainerRef}>
                    <div className="h-10 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-40" /> {/* Spacer for header */}
                    <div className="relative" style={{ height: `${(HORA_FIN - HORA_INICIO) * 60 * MINUTE_HEIGHT}px` }}>
                        {slots.map(hora => (
                            <div
                                key={hora}
                                className="absolute w-full flex items-start justify-center pt-1"
                                style={{ top: `${(hora - HORA_INICIO) * 60 * MINUTE_HEIGHT}px`, height: `${60 * MINUTE_HEIGHT}px` }}
                            >
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {hora > 12 ? `${hora - 12} PM` : hora === 12 ? '12 PM' : `${hora} AM`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Barber Columns */}
                <div
                    className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative flex"
                    ref={contentContainerRef}
                    onScroll={(e) => {
                        handleUserScroll()
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTop = e.currentTarget.scrollTop;
                        }
                    }}
                >
                    <div className="flex min-w-full relative">
                        {/* Time Indicator Line */}
                        {dentroHorario && (
                            <div
                                className="absolute left-0 right-0 h-px bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                                style={{ top: `${currentTimePosition + 40}px` }} // + 40px for header height
                            >
                                <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse" />
                            </div>
                        )}

                        {barberos.map((barbero, idx) => {
                            const citasDelBarbero = citas.filter(c => c.barbero_id === barbero.id)
                            return (
                                <div key={barbero.id} className={`flex-1 min-w-[140px] relative ${idx !== barberos.length - 1 ? 'border-r border-white/5' : ''}`}>
                                    {/* Barber Header */}
                                    <div className="h-10 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-2 shadow-md">
                                        <p className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest truncate">
                                            {barbero.nombre.split(' ')[0]}
                                        </p>
                                    </div>

                                    {/* Barber Column Timeline */}
                                    <div className="relative" style={{ height: `${(HORA_FIN - HORA_INICIO) * 60 * MINUTE_HEIGHT}px` }}>
                                        {/* Grid lines */}
                                        {slots.map(hora => (
                                            <div
                                                key={`grid-${hora}`}
                                                className="absolute w-full border-t border-white/[0.03]"
                                                style={{ top: `${(hora - HORA_INICIO) * 60 * MINUTE_HEIGHT}px`, height: `${60 * MINUTE_HEIGHT}px` }}
                                            />
                                        ))}

                                        {/* Lunch block */}
                                        {renderAlmuerzo(barbero)}

                                        {/* Appointments */}
                                        {citasDelBarbero.map(renderCitaBlock)}
                                    </div>
                                </div>
                            )
                        })}

                        {barberos.length === 0 && (
                            <div className="flex-1 flex items-center justify-center font-black text-white/20 uppercase tracking-widest text-xs p-10 text-center">
                                Sin barberos activos
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Confirmada</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />En Proceso</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" />Finalizada</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Descanso</div>
            </div>
        </div>
    )
}
