'use client'

import { useMemo } from 'react'
import type { CitaConRelaciones } from '@/lib/types'

interface AgendaTimelineProps {
    citas: CitaConRelaciones[]
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

    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Position in pixels: (Hour offset * height) + (Minutes proportional to height)
    const currentTimePosition = ((currentHour - HORA_INICIO) * SLOT_HEIGHT) + (currentMinute / 60 * SLOT_HEIGHT)

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
            case 'confirmada': return 'bg-blue-500'
            case 'en_espera': return 'bg-amber-500'
            case 'en_proceso': return 'bg-emerald-500'
            case 'finalizada': return 'bg-slate-300'
            default: return 'bg-slate-500'
        }
    }

    const dentroHorario = currentHour >= HORA_INICIO && currentHour < HORA_FIN

    return (
        <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-6 relative">
                {dentroHorario && (
                    <div
                        className="absolute left-0 right-0 z-[1] border-t-2 border-red-500 pointer-events-none transition-all duration-1000"
                        style={{ top: `${currentTimePosition + 24}px` }} // +24 for top padding of p-6
                    >
                        <div className="absolute -left-1 -top-3 flex items-center">
                            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase whitespace-nowrap z-[1]">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping absolute -right-1" />
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
                                className={`relative flex items-center gap-4 border-b border-slate-50 transition-colors duration-200 ${cita ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
                            >
                                <div className="w-12 text-[9px] font-black text-slate-300 uppercase tracking-tighter shrink-0">
                                    {slot}
                                </div>
                                <div className="relative flex-1 py-1">
                                    {cita ? (
                                        <div className="flex items-center gap-3 animate-fade-in bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className={`w-1.5 h-6 rounded-full ${getStatusColor(cita.estado)} shadow-sm shrink-0`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-900 truncate leading-tight">
                                                    {cita.cliente_nombre}
                                                </p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-0.5">
                                                    {cita.servicio?.nombre}
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

            <div className="shrink-0 bg-slate-50/50 backdrop-blur-md border-t border-slate-100 px-6 py-4">
                <div className="flex items-center justify-around text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Confirmada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
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
