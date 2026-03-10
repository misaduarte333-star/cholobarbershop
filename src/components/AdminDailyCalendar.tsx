'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { CitaDesdeVista, Barbero, Sucursal, Bloqueo, DiasSemana } from '@/lib/types'

interface AdminDailyCalendarProps {
    citas: CitaDesdeVista[]
    barberos: Barbero[]
    currentTime: Date
    sucursal: Sucursal | null
    bloqueos: Bloqueo[]
}

const HORA_INICIO = 8
const HORA_FIN = 21 // Till 9 PM
const MINUTE_HEIGHT = 1.1 // 1.1px per minute = 66px per hour
const HEADER_HEIGHT = 40 // Height of the barber header and axis corner spacer

function generarSlots(): number[] {
    const slots: number[] = []
    for (let hora = HORA_INICIO; hora <= HORA_FIN; hora++) {
        slots.push(hora)
    }
    return slots
}

export function AdminDailyCalendar({ citas, barberos, currentTime, sucursal, bloqueos }: AdminDailyCalendarProps) {
    const slots = useMemo(() => generarSlots(), [])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isUserScrolling, setIsUserScrolling] = useState(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentAbsoluteMinutes = (currentHour * 60) + currentMinute
    const dayStartMinutes = HORA_INICIO * 60

    // Coordinate system: All Y values are (minutes_since_8am * MINUTE_HEIGHT) + HEADER_HEIGHT
    const getTimeY = (hours: number, minutes: number = 0) => {
        const totalMinutes = (hours * 60) + minutes
        return ((totalMinutes - dayStartMinutes) * MINUTE_HEIGHT) + HEADER_HEIGHT
    }

    const currentTimeY = getTimeY(currentHour, currentMinute)

    const dayNames: Record<number, DiasSemana> = {
        0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado'
    }
    const currentDayName = dayNames[currentTime.getDay()]
    const horarioHoy = sucursal?.horario_apertura?.[currentDayName]

    // Auto-scroll logic
    useEffect(() => {
        if (!isUserScrolling && scrollContainerRef.current && currentHour >= HORA_INICIO && currentHour < HORA_FIN) {
            const containerHeight = scrollContainerRef.current.clientHeight
            const targetPosition = Math.max(0, currentTimeY - (containerHeight / 2))

            scrollContainerRef.current.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            })
        }
    }, [currentHour, currentMinute, isUserScrolling, currentTimeY])

    const handleUserScroll = () => {
        setIsUserScrolling(true)
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false)
        }, 5000)
    }

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'en_espera': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'en_proceso': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'por_cobrar': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            case 'finalizada': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            case 'cancelada': case 'no_show': return 'bg-red-500/20 text-red-400 border-red-500/30'
            default: return 'bg-slate-700/50 text-slate-300 border-slate-600'
        }
    }

    const renderCitaBlock = (cita: CitaDesdeVista) => {
        const start = new Date(cita.timestamp_inicio)
        const end = new Date(cita.timestamp_fin)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

        const startY = getTimeY(start.getHours(), start.getMinutes())
        const endY = getTimeY(end.getHours(), end.getMinutes())
        const height = Math.max(24, endY - startY)

        const isEnProceso = cita.estado === 'en_proceso'
        const isPorCobrar = cita.estado === 'por_cobrar'

        // Calcular minutos del cronómetro solo para render local sin causar re-renders pesados
        let activeTimer = null
        if (isEnProceso && cita.timestamp_inicio_servicio) {
            const minTrasncurridos = Math.floor((new Date().getTime() - new Date(cita.timestamp_inicio_servicio).getTime()) / 60000)
            const horas = Math.floor(minTrasncurridos / 60)
            const mins = minTrasncurridos % 60
            activeTimer = horas > 0 ? `${horas}H ${mins}M` : `${mins} MIN`
        } else if (isPorCobrar && cita.duracion_real_minutos) {
            const horas = Math.floor(cita.duracion_real_minutos / 60)
            const mins = cita.duracion_real_minutos % 60
            activeTimer = horas > 0 ? `${horas}H ${mins}M` : `${mins} MIN`
        }

        const extraClasses = isEnProceso ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-glow border-emerald-500/50' :
            isPorCobrar ? 'shadow-[0_0_15px_rgba(168,85,247,0.3)] border-purple-500/50' : ''

        return (
            <div
                key={cita.id}
                className={`absolute left-1 right-1 rounded-xl border p-2 overflow-hidden shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.02] hover:z-20 ${getStatusColor(cita.estado)} ${extraClasses}`}
                style={{ top: `${startY}px`, height: `${height}px` }}
            >
                <div className="flex justify-between items-start gap-1">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight truncate">{cita.cliente_nombre}</p>
                    {(isEnProceso || isPorCobrar) && activeTimer && (
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black flex-shrink-0 flex items-center gap-1 border ${isEnProceso ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}>
                            <span className={`material-icons-round text-[9px] ${isEnProceso ? 'animate-spin-slow' : ''}`}>
                                {isEnProceso ? 'hourglass_top' : 'done_all'}
                            </span>
                            <span className={isEnProceso ? 'animate-pulse' : ''}>{activeTimer}</span>
                        </div>
                    )}
                </div>
                {height >= 40 && (
                    <p className="text-[9px] opacity-70 uppercase truncate mt-0.5">{cita.servicio_nombre}</p>
                )}
            </div>
        )
    }

    const renderBloqueoProp = (bloqueo: Bloqueo) => {
        const start = new Date(bloqueo.fecha_inicio)
        const end = new Date(bloqueo.fecha_fin)

        const startY = getTimeY(start.getHours(), start.getMinutes())
        const endY = getTimeY(end.getHours(), end.getMinutes())
        const height = Math.max(20, endY - startY)

        return (
            <div
                key={bloqueo.id}
                className="absolute left-1 right-1 rounded-xl border border-red-500/30 bg-red-500/10 p-2 flex flex-col items-center justify-center overflow-hidden z-10 striped-bg-red"
                style={{ top: `${startY}px`, height: `${height}px` }}
            >
                <span className="material-icons-round text-red-400 text-[10px] mb-0.5">block</span>
                <span className="text-[7px] font-black uppercase text-red-400 tracking-tighter truncate w-full text-center">
                    {bloqueo.motivo || 'Bloqueado'}
                </span>
            </div>
        )
    }

    const renderAlmuerzo = (barbero: Barbero) => {
        if (!barbero.bloqueo_almuerzo) return null
        const startHours = parseInt(barbero.bloqueo_almuerzo.inicio.substring(0, 2))
        const startMins = parseInt(barbero.bloqueo_almuerzo.inicio.substring(3, 5))
        const endHours = parseInt(barbero.bloqueo_almuerzo.fin.substring(0, 2))
        const endMins = parseInt(barbero.bloqueo_almuerzo.fin.substring(3, 5))

        const startY = getTimeY(startHours, startMins)
        const endY = getTimeY(endHours, endMins)
        const height = Math.max(30, endY - startY)

        return (
            <div
                key={`almuerzo-${barbero.id}`}
                className="absolute left-1 right-1 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-2 flex items-center justify-center overflow-hidden z-10 striped-bg-amber"
                style={{ top: `${startY}px`, height: `${height}px` }}
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
        <div className="glass-card p-1 md:p-6 rounded-[2rem] border-white/5 shadow-2xl w-full relative h-[550px] md:h-[700px] flex flex-col overflow-hidden">
            {/* Header info */}
            <div className="flex items-center gap-4 mb-6 p-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <span className="material-icons-round text-2xl">calendar_view_week</span>
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Agenda General</h2>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">Panorama Completo</p>
                </div>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                onScroll={handleUserScroll}
                className="flex-1 overflow-auto custom-scrollbar border border-white/5 rounded-2xl bg-black/40 relative"
            >
                {/* Total Height Wrapper */}
                <div className="relative flex min-w-full" style={{ height: `${(HORA_FIN - HORA_INICIO) * 60 * MINUTE_HEIGHT + HEADER_HEIGHT + 20}px` }}>

                    {/* Time labels axis (Sticky Left) */}
                    <div className="sticky left-0 z-50 w-8 sm:w-16 bg-black/95 backdrop-blur-md border-r border-white/10 h-full flex-shrink-0">
                        {/* Corner Spacer */}
                        <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/10 z-50 bg-black/80" />

                        <div className="relative h-full">
                            {slots.map(hora => (
                                <div
                                    key={`axis-${hora}`}
                                    className="absolute w-full flex items-center justify-center"
                                    style={{ top: `${getTimeY(hora)}px` }}
                                >
                                    <span className="absolute -top-1.5 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase">
                                        {hora >= 12 ? `${hora === 12 ? 12 : hora - 12}PM` : `${hora}AM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content (Grid + Barbers) */}
                    <div className="flex-1 relative flex h-full">
                        {/* Unified Grid Lines Layer */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                            {slots.map(hora => (
                                <div
                                    key={`grid-${hora}`}
                                    className="absolute w-full border-t border-white/[0.15]"
                                    style={{ top: `${getTimeY(hora)}px` }}
                                />
                            ))}

                            {/* Closing Hours Shadows */}
                            {horarioHoy && (
                                <>
                                    {/* Morning closing */}
                                    {parseInt(horarioHoy.apertura.substring(0, 2)) > HORA_INICIO && (
                                        <div
                                            className="absolute inset-x-0 bg-black/40 z-0"
                                            style={{
                                                top: `${getTimeY(HORA_INICIO)}px`,
                                                height: `${(parseInt(horarioHoy.apertura.substring(0, 2)) - HORA_INICIO) * 60 * MINUTE_HEIGHT}px`
                                            }}
                                        />
                                    )}
                                    {/* Evening closing */}
                                    {parseInt(horarioHoy.cierre.substring(0, 2)) < HORA_FIN && (
                                        <div
                                            className="absolute inset-x-0 bg-black/40 z-0"
                                            style={{
                                                top: `${getTimeY(parseInt(horarioHoy.cierre.substring(0, 2)))}px`,
                                                height: `${(HORA_FIN - parseInt(horarioHoy.cierre.substring(0, 2))) * 60 * MINUTE_HEIGHT}px`
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        {/* Barber Columns Wrapper */}
                        <div className="flex flex-1 relative h-full">
                            {barberos.map((barbero, idx) => (
                                <div key={`col-${barbero.id}`} className={`flex-1 min-w-[95px] sm:min-w-[140px] relative z-10 ${idx !== barberos.length - 1 ? 'border-r border-white/5' : ''}`}>
                                    {/* Sticky header for this barber */}
                                    <div className="sticky top-0 h-10 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-center z-40 p-2">
                                        <p className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest truncate">
                                            {barbero.nombre.split(' ')[0]}
                                        </p>
                                    </div>

                                    {/* Content in this column */}
                                    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none">
                                        <div className="relative h-full pointer-events-auto">
                                            {renderAlmuerzo(barbero)}
                                            {bloqueos.filter(b => b.barbero_id === barbero.id).map(renderBloqueoProp)}
                                            {citas.filter(c => c.barbero_id === barbero.id).map(renderCitaBlock)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Current Time Indicator Line */}
                            {dentroHorario && (
                                <div
                                    className="absolute left-0 right-0 h-px bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                                    style={{ top: `${currentTimeY}px` }}
                                >
                                    <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="p-3 flex flex-wrap items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Confirmada</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />En Proceso</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />Por Cobrar</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50" />Bloqueo</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/50" />Almuerzo</div>
            </div>
        </div>
    )
}
