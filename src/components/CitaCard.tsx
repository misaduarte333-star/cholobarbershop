'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaConRelaciones, EstadoCita } from '@/lib/types'

interface CitaCardProps {
    cita: CitaConRelaciones
    onUpdate?: () => void
    isHighlighted?: boolean
    style?: React.CSSProperties
    currentTime: Date
    allCitas: CitaConRelaciones[]
}

export function CitaCard({ cita, onUpdate, isHighlighted, style, currentTime, allCitas }: CitaCardProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    // States
    const [loading, setLoading] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [showMove, setShowMove] = useState(false)
    const [showCancel, setShowCancel] = useState(false)
    const [showCheckout, setShowCheckout] = useState(false)
    const [showLateWarning, setShowLateWarning] = useState(false)
    const [newHour, setNewHour] = useState('')
    const [agreedCancel, setAgreedCancel] = useState(false)

    // Checkout states
    const [montoFinal, setMontoFinal] = useState<number>(cita.servicio?.precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')

    const supabase = createClient()

    const actualizarEstado = async (nuevoEstado: EstadoCita) => {
        console.log(`🚀 INICIO ACTUALIZACION: ${nuevoEstado} para ${cita.cliente_nombre}`)

        if (loading) return
        setLoading(true)

        // Close all modals immediately for UI responsiveness
        setShowLateWarning(false)
        setShowCancel(false)
        setShowCheckout(false)
        setShowMove(false)

        try {
            console.log('🛰️ Enviando a Supabase...', { id: cita.id, estado: nuevoEstado })
            const { error, data } = await (supabase
                .from('citas') as any)
                .update({
                    estado: nuevoEstado,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cita.id)
                .select()

            if (error) {
                console.error('❌ ERROR DB:', error)
                alert(`Error en Base de Datos: ${error.message}`)
            } else {
                console.log('✅ ACTUALIZACION EXITOSA:', data)
                if (nuevoEstado === 'en_proceso') {
                    console.log('Moved to In Process')
                }

                if (onUpdate) {
                    onUpdate()
                } else {
                    window.location.reload()
                }
            }
        } catch (err: any) {
            console.error('💥 CRASH TECNICO:', err)
            alert(`Error de Conexión: ${err.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    const liquidarCita = async () => {
        setLoading(true)
        try {
            const { error } = await (supabase
                .from('citas') as any)
                .update({
                    estado: 'finalizada' as EstadoCita,
                    monto_pagado: montoFinal,
                    metodo_pago: metodoPago,
                    notas_crm: notasCrm,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cita.id)

            if (error) throw error
            onUpdate?.()
            setShowCheckout(false)
        } catch (err: any) {
            console.error('Error in checkout:', err)
            alert('Error al procesar el cobro')
        } finally {
            setLoading(false)
        }
    }

    const moverCita = async () => {
        if (!newHour) return
        setLoading(true)
        try {
            const [hours, minutes] = newHour.split(':').map(Number)
            const oldInicio = new Date(cita.timestamp_inicio)
            const oldFin = new Date(cita.timestamp_fin)
            const duration = oldFin.getTime() - oldInicio.getTime()

            const newInicio = new Date(oldInicio)
            newInicio.setHours(hours, minutes, 0, 0)
            const newFin = new Date(newInicio.getTime() + duration)

            const { error } = await (supabase
                .from('citas') as any)
                .update({
                    timestamp_inicio: newInicio.toISOString(),
                    timestamp_fin: newFin.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', cita.id)

            if (error) throw error
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
        finalizada: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-slate-500', badge: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', label: 'Finalizada' },
        cancelada: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400 border border-red-500/30', label: 'Cancelada' },
        no_show: { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400 border border-red-500/30', label: 'No Show' }
    }[cita.estado] || { bg: 'bg-slate-800/40', border: 'border-slate-700/50', accent: 'border-l-slate-500', badge: 'bg-slate-500/20 text-slate-400', label: cita.estado }

    const citaStartTime = new Date(cita.timestamp_inicio)
    const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
    const esNoShow = minutosDiferencia > 15
    const canConfirm = currentTime.getTime() >= (citaStartTime.getTime() - 5 * 60 * 1000)

    const isEnSucursal = cita.estado === 'en_espera'
    const minHastaCita = Math.floor((citaStartTime.getTime() - currentTime.getTime()) / 60000)
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
            const isPast = h < currentH || (h === currentH && 0 < currentM)
            const isOccupied = allCitas.some(c => {
                if (c.id === cita.id || c.estado === 'cancelada') return false
                const start = new Date(c.timestamp_inicio)
                const end = new Date(c.timestamp_fin)
                const slotStart = new Date(currentTime)
                slotStart.setHours(h, 0, 0, 0)
                const slotEnd = new Date(slotStart.getTime() + (new Date(cita.timestamp_fin).getTime() - new Date(cita.timestamp_inicio).getTime()))
                return slotStart < end && slotEnd > start
            })
            slots.push({ value: hourValue, label, isPast, isOccupied })
        }
        return slots
    }

    const isAnyModalOpen = showDetails || showMove || showCancel || showCheckout || showLateWarning
    const isInProcess = cita.estado === 'en_proceso'

    return (
        <div
            className={`relative rounded-[2.5rem] p-8 border-l-[8px] glass-card ${config.bg} ${config.border} ${config.accent} ${isHighlighted || isInProcess ? 'shadow-[0_20px_60px_rgba(234,179,8,0.2)] border-primary/30' : 'border-white/5'} ${isAnyModalOpen ? 'z-[9999]' : (isHighlighted ? 'z-10' : 'z-0')} transition-all duration-700 hover:scale-[1.02] hover:bg-black/60 group animate-fade-in relative overflow-hidden`}
            style={style}
        >
            {/* Interior Glow Overlay for active items */}
            {(isHighlighted || isInProcess) && (
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            )}

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 text-white relative z-10">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-black/60 border-2 border-white/10 flex items-center justify-center shrink-0 shadow-2xl group-hover:border-primary/40 transition-colors duration-500">
                            <span className="text-3xl font-black text-primary font-display group-hover:scale-110 transition-transform">{cita.cliente_nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-black text-white truncate tracking-tight font-display uppercase drop-shadow-md">
                                {cita.cliente_nombre}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className={`px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] border ${config.badge}`}>
                                    {config.label}
                                </span>
                                {isEnSucursal && (
                                    <span className="px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] bg-emerald-500 text-black animate-pulse flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                        <span className="material-icons-round text-[12px]">how_to_reg</span>
                                        En sucursal
                                    </span>
                                )}
                                {isTiempoCorto && (
                                    <span className="px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] border border-amber-500/50 text-amber-500 animate-pulse flex items-center gap-1 bg-amber-500/10">
                                        <span className="material-icons-round text-[12px]">timer</span>
                                        En {minHastaCita} min
                                    </span>
                                )}
                                {isReprogramada && !isTiempoCorto && !isEnSucursal && (
                                    <span className="px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] border border-blue-500/30 text-blue-400 flex items-center gap-1 bg-blue-500/10">
                                        <span className="material-icons-round text-[12px]">update</span>
                                        Reprogramada
                                    </span>
                                )}
                                <div className="h-1 w-1 rounded-full bg-white/20" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                    {cita.servicio?.nombre}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-white/40 font-black uppercase tracking-[0.4em] text-[10px]">
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-black/40 rounded-2xl border border-white/5 shadow-inner group-hover:border-primary/20 transition-colors">
                            <span className="material-icons-round text-primary text-sm">schedule</span>
                            <span className="text-white tracking-[0.2em]">{horaInicio}</span>
                            <span className="text-white/20 px-1">—</span>
                            <span className="text-white/40">{horaFin}</span>
                        </div>
                        {cita.notas && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 rounded-2xl border border-blue-500/20 max-w-[300px]">
                                <span className="material-icons-round text-blue-400 text-sm">notes</span>
                                <span className="text-blue-400 truncate tracking-normal italic opacity-80">{cita.notas}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 shrink-0">
                    {cita.estado === 'confirmada' && (
                        <>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        if (loading) return
                                        if (esNoShow) {
                                            setShowLateWarning(true)
                                        } else {
                                            actualizarEstado('en_proceso')
                                        }
                                    }}
                                    disabled={loading || !canConfirm}
                                    className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center gap-3 border active:scale-95 ${!canConfirm ? 'bg-white/5 text-white/20 cursor-not-allowed border-white/5' :
                                        esNoShow ? 'bg-amber-500 text-white hover:bg-amber-400 border-amber-300 shadow-[0_10px_30px_rgba(245,158,11,0.3)] animate-pulse' :
                                            'bg-gradient-gold text-black hover:scale-105 border-primary shadow-[0_10px_30px_rgba(234,179,8,0.3)]'
                                        }`}
                                >
                                    <span className="material-icons-round text-lg">{!canConfirm ? 'timer' : 'play_arrow'}</span>
                                    <span className="font-display">{!canConfirm ? `Faltan ${Math.abs(minutosDiferencia)} MIN` : esNoShow ? 'Atender Tardío' : 'Iniciar Servicio'}</span>
                                </button>
                                {esNoShow && (
                                    <span className="text-[9px] font-black text-primary animate-pulse text-center uppercase tracking-[0.3em]">
                                        ⚠️ RETRASO CRÍTICO
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setShowMove(true)} className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-sm active:scale-95">
                                <span className="material-icons-round text-lg">event_repeat</span>
                                Mover
                            </button>
                            <button onClick={() => setShowCancel(true)} disabled={loading} className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-3 backdrop-blur-sm active:scale-95">
                                <span className="material-icons-round text-lg">close</span>
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
                            onClick={() => setShowCheckout(true)}
                            disabled={loading}
                            className="px-10 py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all flex items-center gap-4 border-2 border-emerald-300 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">receipt_long</span>
                            Cobrar y Finalizar
                        </button>
                    )}

                    {!isInProcess && (
                        <button onClick={() => setShowDetails(true)} className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white/30 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3 border border-white/5 active:scale-95">
                            <span className="material-icons-round text-lg">info</span>
                        </button>
                    )}
                </div>
            </div>

            {/* MODALS - Fixed position and high z-index to prevent clipping */}
            {mounted && typeof document !== 'undefined' ? createPortal(
                <AnimatePresence>
                    {showDetails && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-[#0A0C10] rounded-[2.5rem] w-full max-w-md shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden relative"
                            >
                                <div className="p-10 text-white">
                                    <div className="flex items-center justify-end mb-4">
                                        <button onClick={() => setShowDetails(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white absolute top-6 right-6">
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
                                                <p className="font-black text-white text-sm uppercase">{cita.servicio?.nombre}</p>
                                                <p className="text-lg font-black text-primary mt-1 tracking-tight">${cita.servicio?.precio}</p>
                                            </div>
                                            <div className="p-6 bg-[#16181D] rounded-[2rem]">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Horario</p>
                                                <p className="font-black text-white text-sm uppercase">{horaInicio}</p>
                                                <p className="text-xs font-bold text-white/40 mt-1 uppercase tracking-widest">{cita.servicio?.duracion_minutos} MIN</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showMove && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
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
                                        <button onClick={() => setShowMove(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
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
                                        <button onClick={() => setShowMove(false)} className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all">Regresar</button>
                                        <button onClick={moverCita} disabled={!newHour || loading} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl transition-all active:scale-95 ${!newHour ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-gradient-gold text-black hover:scale-[1.02]'}`}>
                                            {loading ? 'Procesando...' : 'Confirmar Cambio'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showCheckout && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl text-white">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-[#050608] border border-white/10 rounded-[3rem] w-full max-w-2xl shadow-[0_0_100px_rgba(234,179,8,0.1)] overflow-hidden flex flex-col max-h-[90vh] relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center gap-6"
                                    >
                                        <div className="spinner w-16 h-16 border-white/10 border-t-emerald-500" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 animate-pulse">Finalizando Transacción...</p>
                                    </motion.div>
                                )}

                                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white font-display">Check-out</h3>
                                        <p className="text-xs font-black text-white/30 uppercase tracking-[0.4em] mt-2">Cliente: <span className="text-white">{cita.cliente_nombre}</span></p>
                                    </div>
                                    <button onClick={() => setShowCheckout(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                        <span className="material-icons-round">close</span>
                                    </button>
                                </div>

                                <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-8">
                                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center justify-center">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-6">Monto Total</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl font-black text-primary">$</span>
                                                    <input
                                                        type="number"
                                                        value={montoFinal}
                                                        onChange={(e) => setMontoFinal(Number(e.target.value))}
                                                        className="w-32 bg-transparent text-6xl font-black text-white outline-none font-display tracking-tighter"
                                                    />
                                                </div>
                                                <p className="mt-6 text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/5">Precio Base: ${cita.servicio?.precio}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 block">Notas de Seguimiento</label>
                                                <textarea
                                                    placeholder="Ej: Prefiere corte con máquina #2..."
                                                    value={notasCrm}
                                                    onChange={(e) => setNotasCrm(e.target.value)}
                                                    className="w-full h-32 p-6 bg-white/5 border border-white/5 rounded-[1.5rem] text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 outline-none resize-none transition-all placeholder:text-white/10 text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block">Método de Pago</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                {(['efectivo', 'tarjeta', 'transferencia'] as const).map(metodo => (
                                                    <button
                                                        key={metodo}
                                                        onClick={() => setMetodoPago(metodo)}
                                                        className={`p-6 rounded-2xl border-2 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-between group ${metodoPago === metodo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-xl' : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="material-icons-round text-xl opacity-50">
                                                                {metodo === 'efectivo' ? 'payments' : metodo === 'tarjeta' ? 'credit_card' : 'account_balance'}
                                                            </span>
                                                            {metodo}
                                                        </div>
                                                        <div className={`w-3 h-3 rounded-full border-2 ${metodoPago === metodo ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/10'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-10 py-8 border-t border-white/5 bg-black/40 flex gap-4">
                                    <button onClick={() => setShowCheckout(false)} className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all border border-white/5">Cancelar</button>
                                    <button onClick={liquidarCita} disabled={loading} className="flex-[2] py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-emerald-400 shadow-[0_15px_40px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3">
                                        <span className="material-icons-round">check_circle</span>
                                        Finalizar y Cobrar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showCancel && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in text-white">
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
                                        <button onClick={() => setShowCancel(false)} className="flex-1 py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-all">Regresar</button>
                                        <button onClick={() => actualizarEstado('cancelada')} disabled={loading || !agreedCancel} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 ${!agreedCancel ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500 shadow-xl'}`}>
                                            {loading ? '...' : 'Cancelar Cita'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {showLateWarning && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
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
                                            onClick={() => setShowLateWarning(false)}
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
}
