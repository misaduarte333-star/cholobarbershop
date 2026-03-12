'use client'

import { useMemo, useState } from 'react'
import type { CitaDesdeVista } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, Utensils } from 'lucide-react'

interface AgendaSemanalMensualProps {
    citas: CitaDesdeVista[]
    bloqueos: any[]
    almuerzoBarbero: any
    fecha: string
    vista: 'semana' | 'mes'
    onUpdate: () => void
}

const getStatusColor = (estado: string) => {
    switch (estado) {
        case 'confirmada': return 'bg-primary/20 border-primary text-primary'
        case 'en_espera': return 'bg-primary/10 border-primary/50 text-white'
        case 'en_proceso': return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
        case 'finalizada': return 'bg-slate-500/20 border-slate-500 text-slate-300'
        default: return 'bg-slate-700/50 border-slate-600 text-white'
    }
}

// ---------------------------------------------------------------------------
// VISTA SEMANAL
// ---------------------------------------------------------------------------
const HOUR_HEIGHT = 60 // px per hour
const START_HOUR = 8
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR

function VistaSemanal({ citas, bloqueos, almuerzoBarbero, days }: { citas: CitaDesdeVista[], bloqueos: any[], almuerzoBarbero: any, days: { dateStr: string, label: string }[] }) {
    const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

    const parseTimeStr = (dateStr: string, timeStr: string) => {
        // timeStr format: "14:30"
        return new Date(`${dateStr}T${timeStr}:00-07:00`)
    }

    const calculateStyles = (start: Date, end: Date) => {
        const startH = start.getHours() + start.getMinutes() / 60
        const endH = end.getHours() + end.getMinutes() / 60

        let topH = startH - START_HOUR
        if (topH < 0) topH = 0

        let durH = endH - startH
        if (startH < START_HOUR) durH -= (START_HOUR - startH)
        if (topH + durH > TOTAL_HOURS) durH = TOTAL_HOURS - topH

        return {
            top: `${topH * HOUR_HEIGHT}px`,
            height: `${durH * HOUR_HEIGHT}px`,
            display: durH <= 0 ? 'none' : 'flex'
        }
    }

    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl shadow-lg backdrop-blur-md h-[70vh] min-h-[500px] flex flex-col overflow-hidden relative">

            {/* Horizontal & Vertical Scroll Container */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">

                {/* Fixed width container ensuring perfect grid alignment */}
                <div className="min-w-[800px] lg:min-w-full flex flex-col relative w-full h-full">

                    {/* Header: Days (Sticky to top) */}
                    <div className="flex border-b border-white/5 bg-[#16181d]/95 sticky top-0 z-30 backdrop-blur-xl">
                        {/* Time label corner (Sticky to left & top) */}
                        <div className="w-14 shrink-0 border-r border-white/5 bg-[#16181d] sticky left-0 z-40" />

                        {/* Day Headers */}
                        <div className="flex-1 grid grid-cols-7">
                            {days.map(d => (
                                <div key={d.dateStr} className="text-center py-2 border-r border-white/5 last:border-r-0">
                                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary/80 truncate px-1">{d.label.split(' ')[0]}</p>
                                    <p className="text-sm md:text-lg font-black text-white">{new Date(`${d.dateStr}T12:00:00-07:00`).getDate()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Time Grid Area */}
                    <div className="flex flex-1 relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

                        {/* Time labels column (Sticky to left) */}
                        <div className="w-14 shrink-0 border-r border-white/5 bg-[#16181d] sticky left-0 z-20 flex flex-col">
                            {hours.map(h => (
                                <div key={h} className="relative text-right pr-2 border-b border-white/5 last:border-b-0 flex items-start justify-end" style={{ height: `${HOUR_HEIGHT}px` }}>
                                    <span className="text-[9px] font-black text-white/30 uppercase mt-1 leading-none">{h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Schedule Columns Wrapper */}
                        <div className="flex-1 grid grid-cols-7 relative z-10 bg-black/20">
                            {/* Horizontal lines for entire grid */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                                {hours.map(h => (
                                    <div key={h} className="border-t border-white/5 w-full" style={{ height: `${HOUR_HEIGHT}px` }} />
                                ))}
                            </div>

                            {/* Days content */}
                            {days.map(day => {
                                const citasDelDia = citas.filter(c => c.fecha_cita_local === day.dateStr)
                                const bloqueosDelDia = bloqueos.filter(b => {
                                    const bStart = new Date(b.timestamp_inicio_local)
                                    const bEnd = new Date(b.timestamp_fin_local)
                                    const dayD = new Date(`${day.dateStr}T12:00:00-07:00`)
                                    return dayD >= new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate(), 0, 0, 0) &&
                                        dayD <= new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate(), 23, 59, 59)
                                })
                                let hasAlmuerzo = false;
                                if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) hasAlmuerzo = true;

                                return (
                                    <div key={day.dateStr} className="relative border-r border-white/5 last:border-r-0 p-0.5">
                                        {/* Citas */}
                                        {citasDelDia.map(cita => {
                                            const start = new Date(cita.timestamp_inicio_local)
                                            const end = new Date(cita.timestamp_fin_local)
                                            const style = calculateStyles(start, end)
                                            return (
                                                <div key={cita.id} className={`absolute left-0.5 right-0.5 rounded-lg border p-1 px-1.5 overflow-hidden backdrop-blur-md flex flex-col ${getStatusColor(cita.estado)} hover:brightness-110 transition-all z-10 shadow-md`} style={style} title={`${cita.cliente_nombre} - ${cita.servicio_nombre}`}>
                                                    <p className="text-[9px] md:text-[10px] font-black uppercase truncate leading-tight tracking-tight">{cita.cliente_nombre}</p>
                                                    <p className="text-[7px] md:text-[8px] font-black opacity-70 uppercase tracking-widest truncate mt-0.5">{cita.servicio_nombre}</p>
                                                </div>
                                            )
                                        })}

                                        {/* Bloqueos */}
                                        {bloqueosDelDia.map(bloqueo => {
                                            const start = new Date(bloqueo.timestamp_inicio_local)
                                            const end = new Date(bloqueo.timestamp_fin_local)
                                            const style = calculateStyles(start, end)
                                            return (
                                                <div key={bloqueo.id} className="absolute left-0.5 right-0.5 rounded-lg border border-red-500/50 bg-red-500/10 p-1 overflow-hidden flex flex-col justify-center items-center text-center z-[5] backdrop-blur-md" style={style}>
                                                    <Ban className="w-3 h-3 md:w-4 md:h-4 text-red-500/80 mb-0.5 mt-0.5" />
                                                    <p className="text-[7px] md:text-[8px] font-black text-red-400/80 uppercase tracking-widest truncate w-full">Bloqueado</p>
                                                </div>
                                            )
                                        })}

                                        {/* Almuerzo */}
                                        {hasAlmuerzo && (
                                            <div className="absolute left-0.5 right-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-1 overflow-hidden flex flex-col justify-center items-center text-center z-[5] backdrop-blur-md striped-bg-amber" style={calculateStyles(parseTimeStr(day.dateStr, almuerzoBarbero.inicio), parseTimeStr(day.dateStr, almuerzoBarbero.fin))}>
                                                <Utensils className="w-3 h-3 md:w-4 md:h-4 text-amber-500/80 mb-0.5 mt-0.5" />
                                                <p className="text-[7px] md:text-[8px] font-black text-amber-400/80 uppercase tracking-widest truncate w-full">Almuerzo</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// VISTA MENSUAL
// ---------------------------------------------------------------------------

function VistaMensual({ citas, bloqueos, days, fecha }: { citas: CitaDesdeVista[], bloqueos: any[], days: { dateStr: string, label: string }[], fecha: string }) {
    // We need a full grid for the month, including empty days padding at start/end to form proper weeks
    const gridDays = useMemo(() => {
        const base = new Date(`${fecha}T12:00:00-07:00`)
        const year = base.getFullYear()
        const month = base.getMonth()

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Start on Monday
        const endPadding = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay()

        const result: { dateStr: string, dayNum: number, isCurrentMonth: boolean }[] = []

        // Add previous month padding
        const prevMonth = new Date(year, month, 0)
        for (let i = startPadding - 1; i >= 0; i--) {
            const dStr = new Date(year, month - 1, prevMonth.getDate() - i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: prevMonth.getDate() - i, isCurrentMonth: false })
        }

        // Add current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dStr = new Date(year, month, i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: i, isCurrentMonth: true })
        }

        // Add next month padding
        for (let i = 1; i <= endPadding; i++) {
            const dStr = new Date(year, month + 1, i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: i, isCurrentMonth: false })
        }

        return result
    }, [fecha])

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl shadow-lg backdrop-blur-md flex flex-col h-[70vh] min-h-[500px] overflow-hidden relative">
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[700px] lg:min-w-full flex flex-col h-full min-h-[500px]">

                    {/* Header: Weekdays */}
                    <div className="grid grid-cols-7 border-b border-white/5 bg-[#16181d]/95 sticky top-0 z-20 backdrop-blur-xl">
                        {weekDays.map(wd => (
                            <div key={wd} className="text-center py-2 border-r border-white/5 last:border-r-0">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/80">{wd.substring(0, 3)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Days */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                        {gridDays.map((d, i) => {
                            const citasDelDia = citas.filter(c => c.fecha_cita_local === d.dateStr)
                            const isToday = d.dateStr === new Date().toLocaleDateString('en-CA')

                            const bloqueosDelDia = bloqueos.filter(b => {
                                const bStart = new Date(b.timestamp_inicio_local)
                                const bEnd = new Date(b.timestamp_fin_local)
                                const dayD = new Date(`${d.dateStr}T12:00:00-07:00`)
                                return dayD >= new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate(), 0, 0, 0) &&
                                    dayD <= new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate(), 23, 59, 59)
                            })

                            return (
                                <div key={`${d.dateStr}-${i}`} className={`border-r border-b border-white/5 p-1 flex flex-col transition-colors hover:bg-white/[0.02] ${!d.isCurrentMonth ? 'opacity-30 bg-black/40' : 'bg-black/20'}`}>
                                    <div className="flex items-center justify-end mb-1 px-1">
                                        <span className={`text-[10px] md:text-sm font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-primary text-black' : 'text-white/60'}`}>{d.dayNum}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-0.5">
                                        {citasDelDia.map(cita => (
                                            <div key={cita.id} className={`text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate px-1.5 py-0.5 rounded border ${getStatusColor(cita.estado)}`} title={`${cita.cliente_nombre}`}>
                                                {new Date(cita.timestamp_inicio_local).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')} {cita.cliente_nombre.split(' ')[0]}
                                            </div>
                                        ))}
                                        {bloqueosDelDia.map(bloqueo => (
                                            <div key={bloqueo.id} className="text-[8px] font-black uppercase tracking-tight truncate px-1.5 py-0.5 rounded border border-red-500/50 bg-red-500/10 text-red-400">
                                                BLQ • {new Date(bloqueo.timestamp_inicio_local).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// MAIN WRAPPER
// ---------------------------------------------------------------------------

export function AgendaSemanalMensual({ citas, bloqueos, almuerzoBarbero, fecha, vista, onUpdate }: AgendaSemanalMensualProps) {
    const days = useMemo(() => {
        const result: { dateStr: string, label: string }[] = []
        const base = new Date(`${fecha}T12:00:00-07:00`)
        if (vista === 'semana') {
            const dayNum = base.getDay() // 0 is Sunday
            const diff = base.getDate() - dayNum + (dayNum === 0 ? -6 : 1)
            const startD = new Date(base.setDate(diff))
            for (let i = 0; i < 7; i++) {
                const d = new Date(startD)
                d.setDate(d.getDate() + i)
                result.push({
                    dateStr: d.toLocaleDateString('en-CA'),
                    label: d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
                })
            }
        }
        return result
    }, [fecha, vista])

    return (
        <div className="w-full pb-10 animate-fade-in relative">
            {vista === 'semana' ? (
                <VistaSemanal citas={citas} bloqueos={bloqueos} almuerzoBarbero={almuerzoBarbero} days={days} />
            ) : (
                <VistaMensual citas={citas} bloqueos={bloqueos} days={days} fecha={fecha} />
            )}
        </div>
    )
}
