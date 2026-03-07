'use client'

import { motion } from 'framer-motion'
import type { CitaDesdeVista } from '@/lib/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    citasDelDia: CitaDesdeVista[]
}

export function MisEstadisticasModal({ isOpen, onClose, citasDelDia }: Props) {
    if (!isOpen) return null

    // Filter only appointments that have a real duration recorded
    const citasConTiempo = citasDelDia.filter(c =>
        c.estado === 'finalizada' &&
        c.duracion_real_minutos !== null &&
        c.duracion_real_minutos !== undefined
    )

    // Calculate Global Average
    const promedioGeneral = citasConTiempo.length > 0
        ? Math.round(citasConTiempo.reduce((acc, c) => acc + (c.duracion_real_minutos || 0), 0) / citasConTiempo.length)
        : 0

    // Group by Service for detailed averages
    const statsPorServicio = citasConTiempo.reduce((acc, cita) => {
        const nombre = cita.servicio_nombre
        if (!acc[nombre]) {
            acc[nombre] = { totalMinutos: 0, cantidad: 0, duracionEstimada: cita.servicio_duracion || 0 }
        }
        acc[nombre].totalMinutos += cita.duracion_real_minutos || 0
        acc[nombre].cantidad += 1
        return acc
    }, {} as Record<string, { totalMinutos: number, cantidad: number, duracionEstimada: number }>)

    const serviciosStats = Object.entries(statsPorServicio).map(([nombre, stats]) => ({
        nombre,
        promedioReal: Math.round(stats.totalMinutos / stats.cantidad),
        duracionEstimada: stats.duracionEstimada
    })).sort((a, b) => b.promedioReal - a.promedioReal) // Descending by real time

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0f1115] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <span className="material-icons-round text-blue-400">bar_chart</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black font-display text-white tracking-wide">Rendimiento de Hoy</h2>
                            <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Métricas de Servicios Finalizados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors border border-white/5"
                    >
                        <span className="material-icons-round text-xl">close</span>
                    </button>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* General KPI */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Servicios Terminados</span>
                            <div className="text-4xl font-black font-display text-emerald-400">{citasDelDia.length}</div>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Tiempo Promedio</span>
                            <div className="text-4xl font-black font-display text-blue-400">{promedioGeneral} <span className="text-xl text-blue-400/50">min</span></div>
                        </div>
                    </div>

                    {/* Bars by Service */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-black text-white/70 uppercase tracking-widest border-b border-white/5 pb-2">Desglose por Servicio</h3>

                        {serviciosStats.length === 0 ? (
                            <div className="text-center py-8 text-white/40 text-sm font-bold">
                                Aún no hay servicios finalizados con registro de tiempo hoy.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5 mt-2">
                                {serviciosStats.map((s, idx) => {
                                    // Math to calculate bar width, max width mapped to max time + 15
                                    const maxTime = Math.max(...serviciosStats.map(ss => Math.max(ss.promedioReal, ss.duracionEstimada))) + 15
                                    const realWidth = Math.min(100, Math.max(5, (s.promedioReal / maxTime) * 100))
                                    const estWidth = Math.min(100, Math.max(5, (s.duracionEstimada / maxTime) * 100))

                                    const isOverEstimate = s.promedioReal > s.duracionEstimada

                                    return (
                                        <div key={idx} className="flex flex-col gap-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs font-bold text-white/80">{s.nombre}</span>
                                                <div className="flex md:items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                                    <span className="text-white/40">Est: {s.duracionEstimada}m</span>
                                                    <span className={isOverEstimate ? 'text-orange-400' : 'text-emerald-400'}>
                                                        Real: {s.promedioReal}m
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative h-4 w-full bg-black/60 rounded-full overflow-hidden flex items-center border border-white/5">
                                                {/* Estimation Reference Line */}
                                                <div
                                                    className="absolute h-full border-r border-dashed border-white/30 z-10"
                                                    style={{ width: `${estWidth}%` }}
                                                />
                                                {/* Actual Duration Bar */}
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${realWidth}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${isOverEstimate ? 'bg-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
