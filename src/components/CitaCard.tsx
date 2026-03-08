'use client'

import { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { CheckOutModal } from './CheckOutModal'

interface CitaCardProps {
    cita: CitaDesdeVista
    onUpdate?: () => void
    onClose?: () => void
    isHighlighted?: boolean
    style?: React.CSSProperties
    currentTime: Date
    allCitas: CitaDesdeVista[]
    autoOpen?: 'move' | 'cancel' | 'details' | null
}

export const CitaCard = memo(function CitaCard({ cita, onUpdate, onClose, isHighlighted, style, currentTime, allCitas, autoOpen }: CitaCardProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
        if (autoOpen === 'details') setShowDetails(true)
        if (autoOpen === 'move') setShowMove(true)
        if (autoOpen === 'cancel') setShowCancel(true)
    }, [autoOpen, cita.id]) // Depend on cita.id too in case the same ghost card is reused for different appointments

    // States
    const [loading, setLoading] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [showMove, setShowMove] = useState(false)
    const [showCancel, setShowCancel] = useState(false)
    const [showCheckout, setShowCheckout] = useState(false)
    const [showLateWarning, setShowLateWarning] = useState(false)
    const [newHour, setNewHour] = useState('')
    const [agreedCancel, setAgreedCancel] = useState(false)
    const [showEarlyWarning, setShowEarlyWarning] = useState(false)

    // Checkout states
    const [montoFinal, setMontoFinal] = useState<number>(cita.servicio_precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')

    const supabase = createClient()

    const actualizarEstado = async (nuevoEstado: EstadoCita) => {
        if (loading) return

        console.log(`🚀 INICIO ACTUALIZACION: ${nuevoEstado} para ${cita.cliente_nombre}`)
        setLoading(true)

        // Close all modals immediately for UI responsiveness
        setShowLateWarning(false)
        setShowCancel(false)
        setShowCheckout(false)
        setShowMove(false)

        try {
            console.log('🛰️ Enviando a Supabase...', { id: cita.id, estado: nuevoEstado })

            const payload: any = { estado: nuevoEstado }

            // Set timestamp_inicio_servicio when Atender is clicked
            if (nuevoEstado === 'en_proceso') {
                payload.timestamp_inicio_servicio = new Date().toISOString()
            }

            // Set timestamp_fin_servicio and duration when Finalizar Corte is clicked
            if (nuevoEstado === 'por_cobrar') {
                const now = new Date()
                payload.timestamp_fin_servicio = now.toISOString()

                if (cita.timestamp_inicio_servicio) {
                    const start = new Date(cita.timestamp_inicio_servicio)
                    const diffMs = now.getTime() - start.getTime()
                    payload.duracion_real_minutos = Math.round(diffMs / 60000)
                } else {
                    const scheduledStart = new Date(cita.timestamp_inicio)
                    const diffMs = now.getTime() - scheduledStart.getTime()
                    payload.duracion_real_minutos = Math.max(0, Math.round(diffMs / 60000))
                }
            }

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            console.log('📡 Response API:', res.status)

            if (!res.ok) {
                const body = await res.json()
                console.error('❌ Error API:', body)
                alert(`Error en Base de Datos: ${body.message}`)
                setLoading(false)
                return
            }

            console.log('✅ ACTUALIZACION EXITOSA:', nuevoEstado)

            if (onUpdate) {
                onUpdate()
            } else {
                window.location.reload()
            }
        } catch (err: any) {
            console.error('💥 CRASH TECNICO:', err)
            alert(`Error de Conexión: ${err.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    const liquidarCita = async () => {
        // Redundant, handled by CheckOutModal
    }

    const moverCita = async () => {
        if (!newHour || loading) return

        setLoading(true)
        try {
            const [hours, minutes] = newHour.split(':').map(Number)
            const oldInicio = new Date(cita.timestamp_inicio)
            const oldFin = new Date(cita.timestamp_fin)
            const duration = oldFin.getTime() - oldInicio.getTime()

            // Asignar manualmente la hora sobre el día actual de la cita (oldInicio)
            const newInicio = new Date(oldInicio)
            newInicio.setHours(hours, minutes, 0, 0)
            const newFin = new Date(newInicio.getTime() + duration)

            // Función auxiliar para forzar la construcción del string ISO en zona Hermosillo con offset
            const TZ_OFFSET = '-07:00'
            const formatToHermosilloISO = (d: Date) => {
                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'America/Hermosillo',
                    year: 'numeric', month: '2-digit', day: '2-digit'
                })
                const dateStr = formatter.format(d) // YYYY-MM-DD

                const timeFormatter = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'America/Hermosillo',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                })
                const parts = timeFormatter.formatToParts(d)
                const p = parts.reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as any)
                return `${dateStr}T${p.hour}:${p.minute}:00${TZ_OFFSET}`
            }

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp_inicio: formatToHermosilloISO(newInicio),
                    timestamp_fin: formatToHermosilloISO(newFin),
                }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }

            onUpdate?.()
            setShowMove(false)
        } catch (err: any) {
            console.error('Error moving appointment:', err)
            alert('Error al mover la cita')
        } finally {
            setLoading(false)
        }
    }

    const config = {
        confirmada: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-primary', badge: 'bg-primary/20 text-primary border border-primary/30', label: 'Confirmada' },
        en_espera: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-primary', badge: 'bg-primary/20 text-primary border border-primary/30', label: 'En Sucursal' },
        en_proceso: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'En Proceso' },
        por_cobrar: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-blue-500', badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'Por Cobrar' },
        finalizada: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-slate-500', badge: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', label: 'Finalizada' },
        cancelada: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400 border border-red-500/30', label: 'Cancelada' },
        no_show: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400 border border-red-500/30', label: 'No Show' }
    }[cita.estado] || { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-slate-500', badge: 'bg-slate-500/20 text-slate-400', label: cita.estado }

    const citaStartTime = new Date(cita.timestamp_inicio)
    const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
    const minHastaCita = -minutosDiferencia
    const esNoShow = minutosDiferencia > 15
    const isEarly = minHastaCita >= 30

    const isEnSucursal = cita.estado === 'en_espera'
    const isTiempoCorto = cita.estado === 'confirmada' && minHastaCita >= 0 && minHastaCita <= 15
    const hasUpdatedAt = cita.updated_at && cita.created_at && new Date(cita.updated_at).getTime() > new Date(cita.created_at).getTime() + 60000
    const isReprogramada = hasUpdatedAt && cita.estado === 'confirmada'

    const hasNextSoon = allCitas.some(c => {
        if (c.id === cita.id || c.estado === 'cancelada' || c.estado === 'finalizada') return false
        const start = new Date(c.timestamp_inicio)
        return start > citaStartTime && (start.getTime() - currentTime.getTime()) < 30 * 60 * 1000
    })

    const horaInicio = citaStartTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })
    const horaFin = new Date(cita.timestamp_fin).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })

    const generateTimeSlots = () => {
        const slots = []
        const currentH = currentTime.getHours()
        const currentM = currentTime.getMinutes()

        for (let h = 8; h <= 20; h++) {
            const hourValue = `${h.toString().padStart(2, '0')}:00`
            const hour12 = h % 12 || 12
            const ampm = h >= 12 ? 'PM' : 'AM'
            const label = `${hour12}:00 ${ampm}`
            const isPast = false // Removido para permitir reasignar en retroactivo
            const overlapping = allCitas.filter(c => {
                if (c.id === cita.id || c.estado === 'cancelada') return false
                const start = new Date(c.timestamp_inicio)
                const end = new Date(c.timestamp_fin)
                const slotStart = new Date(currentTime)
                slotStart.setHours(h, 0, 0, 0)
                const slotEnd = new Date(slotStart.getTime() + (new Date(cita.timestamp_fin).getTime() - new Date(cita.timestamp_inicio).getTime()))
                return slotStart < end && slotEnd > start
            })
            const isOccupied = overlapping.length >= 4
            slots.push({ value: hourValue, label, isPast, isOccupied })
        }
        return slots
    }

    const isAnyModalOpen = showDetails || showMove || showCancel || showCheckout || showLateWarning || showEarlyWarning
    const isInProcess = cita.estado === 'en_proceso' || cita.estado === 'por_cobrar'

    // Timer logic for the active service
    const [elapsedMinutes, setElapsedMinutes] = useState(0)

    useEffect(() => {
        if (cita.estado === 'en_proceso' && cita.timestamp_inicio_servicio) {
            const calculateElapsed = () => {
                const start = new Date(cita.timestamp_inicio_servicio!).getTime()
                const now = new Date().getTime()
                setElapsedMinutes(Math.max(0, Math.floor((now - start) / 60000)))
            }

            calculateElapsed() // Run once immediately
            const interval = setInterval(calculateElapsed, 60000) // Update every minute

            return () => clearInterval(interval)
        } else if (cita.estado === 'por_cobrar' && cita.duracion_real_minutos !== undefined && cita.duracion_real_minutos !== null) {
            setElapsedMinutes(cita.duracion_real_minutos)
        }
    }, [cita.estado, cita.timestamp_inicio_servicio, cita.duracion_real_minutos])

    return (
        <div
            className={`relative rounded-2xl md:rounded-[1.5rem] p-2.5 md:p-4 border-l-[3px] md:border-l-[4px] glass-card ${config.bg} ${config.border} ${config.accent} ${isHighlighted || isInProcess ? 'shadow-[0_10px_30px_rgba(234,179,8,0.1)] border-primary/20' : 'border-white/5'} ${isAnyModalOpen ? 'z-[9999]' : (isHighlighted ? 'z-10' : 'z-0')} transition-all duration-700 hover:bg-black/60 group animate-fade-in relative`}
            style={style}
        >
            {/* Interior Glow Overlay for active items */}
            {(isHighlighted || isInProcess) && (
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            )}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-8 text-white relative z-10">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 md:gap-4 mb-1.5 md:mb-3">
                        <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 shadow-xl group-hover:border-primary/40 transition-colors duration-500">
                            <span className="text-sm md:text-xl font-black text-primary font-display group-hover:scale-105 transition-transform">{cita.cliente_nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs md:text-lg font-black text-white truncate tracking-tight font-display uppercase leading-none">
                                {cita.cliente_nombre}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:mt-1">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-black tracking-[0.1em] border ${config.badge}`}>
                                    {config.label}
                                </span>
                                {isEnSucursal && (
                                    <span className="px-2 py-0.5 rounded-lg text-[9px] uppercase font-black tracking-[0.1em] bg-emerald-500 text-black animate-pulse flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                        <span className="material-icons-round text-[10px]">how_to_reg</span>
                                        En sucursal
                                    </span>
                                )}
                                {isTiempoCorto && (
                                    <span className="px-2 py-0.5 rounded-lg text-[9px] uppercase font-black tracking-[0.1em] border border-amber-500/50 text-amber-500 animate-pulse flex items-center gap-1 bg-amber-500/10">
                                        <span className="material-icons-round text-[10px]">timer</span>
                                        En {minHastaCita} min
                                    </span>
                                )}
                                <div className="h-0.5 w-0.5 rounded-full bg-white/20" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em]">
                                    {cita.servicio_nombre}
                                </span>
                            </div>
                            {(cita.estado === 'en_proceso' || cita.estado === 'por_cobrar') && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${cita.estado === 'en_proceso' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'} border`}>
                                        <span className={`material-icons-round text-[10px] ${cita.estado === 'en_proceso' ? 'animate-pulse' : ''}`}>timer</span>
                                        <span className="text-[10px] font-black tracking-widest leading-none mt-0.5">
                                            {elapsedMinutes} MIN
                                        </span>
                                    </div>
                                    {cita.estado === 'por_cobrar' && (
                                        <span className="text-[8px] uppercase tracking-widest text-blue-400/60 font-bold">Tiempo Final</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white/40 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[7px] md:text-[8px]">
                        <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 bg-black/40 rounded-lg md:rounded-xl border border-white/5 shadow-inner group-hover:border-primary/20 transition-colors">
                            <span className="material-icons-round text-primary text-[8px] md:text-xs">schedule</span>
                            <span className="text-white tracking-[0.05em] md:tracking-[0.1em]">{horaInicio} — {horaFin}</span>
                        </div>
                        {cita.notas && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 rounded-2xl border border-blue-500/20 max-w-[300px]">
                                <span className="material-icons-round text-blue-400 text-sm">notes</span>
                                <span className="text-blue-400 truncate tracking-normal italic opacity-80">{cita.notas}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
                    {cita.estado === 'confirmada' && (
                        <>
                            <div className="flex flex-col gap-1 md:gap-2">
                                <button
                                    onClick={() => {
                                        if (loading) return
                                        if (esNoShow) {
                                            setShowLateWarning(true)
                                        } else if (isEarly) {
                                            setShowEarlyWarning(true)
                                        } else {
                                            actualizarEstado('en_proceso')
                                        }
                                    }}
                                    disabled={loading}
                                    className={`px-3 py-2 md:px-5 md:py-3 rounded-lg md:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-[0.1em] shadow-xl transition-all flex items-center gap-1.5 border active:scale-95 ${esNoShow ? 'bg-amber-500 text-white hover:bg-amber-400 border-amber-300 shadow-[0_5px_15px_rgba(245,158,11,0.2)] animate-pulse' :
                                        'bg-gradient-gold text-black hover:scale-[1.02] border-primary shadow-[0_5px_15px_rgba(234,179,8,0.15)]'
                                        }`}
                                >
                                    <span className="material-icons-round text-xs md:text-sm">play_arrow</span>
                                    <span className="font-display">{esNoShow ? 'Tardío' : 'Atender'}</span>
                                </button>
                            </div>
                            <button onClick={() => setShowMove(true)} className="px-2 md:px-3 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-[0.1em] text-white/60 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-1.5 backdrop-blur-sm active:scale-95">
                                <span className="material-icons-round text-xs md:text-sm">event_repeat</span>
                                Mover
                            </button>
                            <button onClick={() => setShowCancel(true)} disabled={loading} className="p-2 md:px-3 md:py-3 rounded-lg md:rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-[0.1em] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-1.5 backdrop-blur-sm active:scale-95">
                                <span className="material-icons-round text-xs md:text-sm">close</span>
                            </button>
                        </>
                    )}

                    {cita.estado === 'en_espera' && (
                        <button
                            onClick={() => actualizarEstado('en_proceso')}
                            disabled={loading}
                            className="px-8 py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] border-2 border-primary/50 bg-primary/10 text-primary hover:bg-primary hover:text-black shadow-[0_10px_40px_rgba(234,179,8,0.2)] transition-all flex items-center gap-4 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">start</span>
                            Confirmar Inicio
                        </button>
                    )}

                    {cita.estado === 'en_proceso' && (
                        <button
                            onClick={() => actualizarEstado('por_cobrar')}
                            disabled={loading}
                            className="px-10 py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] bg-blue-500 text-white hover:bg-blue-400 shadow-[0_15px_40px_rgba(59,130,246,0.3)] transition-all flex items-center gap-4 border-2 border-blue-400 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">content_cut</span>
                            Finalizar Corte
                        </button>
                    )}

                    {cita.estado === 'por_cobrar' && (
                        <button
                            onClick={() => setShowCheckout(true)}
                            disabled={loading}
                            className="px-10 py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all flex items-center gap-4 border-2 border-emerald-300 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">point_of_sale</span>
                            Cobrar
                        </button>
                    )}

                    {!isInProcess && (
                        <button onClick={() => setShowDetails(true)} className="p-2.5 md:px-4 md:py-3.5 rounded-lg md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-[0.1em] text-white/30 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-95">
                            <span className="material-icons-round text-sm md:text-base">info</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODALS - Fixed position and high z-index to prevent clipping */}
            {mounted && typeof document !== 'undefined' ? createPortal(
                <AnimatePresence>
                    {showEarlyWarning && (
                        <div key="early-warning-modal" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-[#0A0C10] rounded-[2.5rem] w-full max-w-sm shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden relative border border-white/10 text-center"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                                <div className="p-8 text-white">
                                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                                        <span className="material-icons-round text-3xl text-primary animate-pulse">schedule</span>
                                    </div>
                                    <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">Atención Adelantada</h3>
                                    <p className="text-white/60 mb-8 text-sm leading-relaxed">
                                        Faltan <strong>{minHastaCita} minutos</strong> para esta cita. ¿Deseas comenzar el servicio ahora mismo y registrarlo fuera de su horario?
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => { setShowEarlyWarning(false); actualizarEstado('en_proceso') }} className="w-full btn-primary py-4 text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.2)] font-black uppercase">
                                            Sí, Atender Ahora
                                        </button>
                                        <button onClick={() => setShowEarlyWarning(false)} className="w-full py-4 text-sm font-black uppercase text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                            No, Esperar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                    {showDetails && (
                        <div key="details-modal" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-[#0A0C10] rounded-[2.5rem] w-full max-w-md shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden relative"
                            >
                                <div className="p-10 text-white">
                                    <div className="flex items-center justify-end mb-4">
                                        <button onClick={() => { setShowDetails(false); onClose?.(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white absolute top-6 right-6">
                                            <span className="material-icons-round">close</span>
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-[#16181D] rounded-[2rem]">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Cliente</p>
                                            <p className="text-2xl font-black text-white font-display uppercase tracking-tight">{cita.cliente_nombre}</p>
                                            <p className="text-sm font-bold text-primary mt-1 tracking-widest">{cita.cliente_telefono}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-[#16181D] rounded-[2rem]">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Servicio</p>
                                                <p className="font-black text-white text-sm uppercase">{cita.servicio_nombre}</p>
                                                <p className="text-lg font-black text-primary mt-1 tracking-tight">${cita.servicio_precio}</p>
                                            </div>
                                            <div className="p-6 bg-[#16181D] rounded-[2rem]">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Horario</p>
                                                <p className="font-black text-white text-sm uppercase">{horaInicio}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showMove && (
                        <div key="move-modal" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="border border-white/10 bg-[#0A0C10] rounded-[3rem] w-full max-w-2xl shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                                <div className="p-10 text-white">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter font-display">Reprogramar</h3>
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2">Selecciona un nuevo horario disponible</p>
                                        </div>
                                        <button onClick={() => { setShowMove(false); onClose?.(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                            <span className="material-icons-round">close</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {generateTimeSlots().map((slot) => {
                                            const isSelected = newHour === slot.value
                                            let btnClass = slot.isPast ? "opacity-20 cursor-not-allowed grayscale" :
                                                slot.isOccupied ? "bg-red-500/10 text-red-500/40 border-red-500/10 cursor-not-allowed" :
                                                    isSelected ? "bg-primary text-black border-primary shadow-[0_0_30px_rgba(234,179,8,0.3)] scale-105" :
                                                        "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border-white/5"
                                            return (
                                                <button key={slot.value} disabled={slot.isPast || slot.isOccupied} onClick={() => setNewHour(slot.value)} className={`py-6 rounded-2xl text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 border ${btnClass}`}>
                                                    <span className="text-sm tracking-tighter">{slot.label}</span>
                                                    <span className="opacity-40 uppercase tracking-widest text-[7px]">{slot.isOccupied ? "Ocupado" : "Libre"}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex gap-4 mt-10">
                                        <button onClick={() => { setShowMove(false); onClose?.(); }} className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all">Regresar</button>
                                        <button onClick={moverCita} disabled={!newHour || loading} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl transition-all active:scale-95 ${!newHour ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-gradient-gold text-black hover:scale-[1.02]'}`}>
                                            {loading ? 'Procesando...' : 'Confirmar Cambio'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    <CheckOutModal
                        key="checkout-modal"
                        cita={cita}
                        isOpen={showCheckout}
                        onClose={() => setShowCheckout(false)}
                        onUpdate={onUpdate}
                    />

                    {showCancel && (
                        <div key="cancel-modal" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in text-white">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-[#050608] border border-red-500/20 rounded-[3rem] w-full max-w-md shadow-[0_30px_90px_rgba(239,68,68,0.1)] overflow-hidden"
                            >
                                <div className="p-10 text-center">
                                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-inner">
                                        <span className="material-icons-round text-4xl">warning_amber</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter font-display">¿Confirmar Cancelación?</h3>
                                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-4 leading-relaxed">Esta acción liberará el espacio de <span className="text-white font-black">{cita.cliente_nombre}</span> permanentemente.</p>
                                </div>
                                <div className="px-10 pb-10 space-y-4">
                                    <label className="flex items-center gap-4 p-6 bg-white/5 rounded-[1.5rem] border border-white/5 cursor-pointer group hover:bg-red-500/5 hover:border-red-500/10 transition-all">
                                        <input type="checkbox" checked={agreedCancel} onChange={(e) => setAgreedCancel(e.target.checked)} className="w-6 h-6 rounded-lg text-red-500 focus:ring-red-500 border-white/10 bg-black" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-red-400">Entiendo las consecuencias</span>
                                    </label>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setShowCancel(false); onClose?.(); }} className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all">Regresar</button>
                                        <button onClick={() => actualizarEstado('cancelada')} disabled={loading || !agreedCancel} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 ${!agreedCancel ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500 shadow-xl'}`}>
                                            {loading ? '...' : 'Cancelar Cita'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showLateWarning && (
                        <div key="late-warning-modal" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-[#050608] rounded-[3rem] w-full max-w-md shadow-[0_30px_90px_rgba(245,158,11,0.2)] overflow-hidden border border-amber-500/20"
                            >
                                <div className="p-10 text-center bg-amber-500/5 border-b border-amber-500/10">
                                    <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-500/20">
                                        <span className="material-icons-round text-4xl">timer</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-amber-500 font-display">Retraso Excesivo</h3>
                                    <div className="mt-6 p-6 bg-black/60 rounded-[2rem] border border-amber-500/20 inline-flex flex-col items-center">
                                        <span className="text-5xl font-black text-white font-display tracking-tighter">{minutosDiferencia}</span>
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">MIN TARDE</span>
                                    </div>
                                </div>
                                <div className="p-10 space-y-8">
                                    <p className="text-sm font-bold text-white/40 leading-relaxed text-center">
                                        El cliente ha superado el tiempo límite de tolerancia. <span className="text-white">¿Deseas atenderlo o reorganizar tu agenda?</span>
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => { setShowLateWarning(false); onClose?.(); }}
                                            className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all border border-white/5"
                                        >
                                            Reagendar
                                        </button>
                                        <button
                                            onClick={() => actualizarEstado('en_proceso')}
                                            className="flex-[1.5] py-5 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-amber-500 shadow-2xl transition-all active:scale-95"
                                        >
                                            {loading ? '...' : 'Atender Tardío'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            ) : null}
        </div>
    )
})
