'use client'

import { useState } from 'react'
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
            const { error, data } = await supabase
                .from('citas')
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
                // Using alert to confirm to the user that it worked on the tablet
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
            const { error } = await supabase
                .from('citas')
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

            const { error } = await supabase
                .from('citas')
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
        confirmada: { bg: 'bg-white', border: 'border-blue-100', accent: 'border-l-blue-600', badge: 'status-confirmed', label: 'Bot: Confirmada' },
        en_espera: { bg: 'bg-white', border: 'border-amber-100', accent: 'border-l-amber-600', badge: 'status-waiting', label: 'Cliente en Sucursal' },
        en_proceso: { bg: 'bg-white', border: 'border-emerald-100', accent: 'border-l-emerald-600', badge: 'status-in-progress', label: 'En Proceso' },
        finalizada: { bg: 'bg-white', border: 'border-slate-100', accent: 'border-l-slate-600', badge: 'status-completed', label: 'Pagada y Finalizada' },
        cancelada: { bg: 'bg-white', border: 'border-red-100', accent: 'border-l-red-600', badge: 'status-cancelled', label: 'Cancelada' },
        no_show: { bg: 'bg-white', border: 'border-red-100', accent: 'border-l-red-600', badge: 'status-cancelled', label: 'No Show' }
    }[cita.estado] || { bg: 'bg-white', border: 'border-slate-100', accent: 'border-l-slate-600', badge: 'status-completed', label: cita.estado }

    const citaStartTime = new Date(cita.timestamp_inicio)
    const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
    const esNoShow = minutosDiferencia > 15
    const canConfirm = currentTime.getTime() >= (citaStartTime.getTime() - 5 * 60 * 1000)

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
            className={`relative rounded-2xl p-6 border border-slate-100 border-l-[6px] ${config.bg} ${config.accent} ${isHighlighted || isInProcess ? 'shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)]' : 'shadow-sm'} ${isAnyModalOpen ? 'z-[9999]' : (isHighlighted ? 'z-10' : 'z-0')} transition-all duration-500 hover:shadow-md animate-fade-in ${isInProcess ? 'bg-emerald-50/20 border-emerald-500/10' : ''}`}
            style={style}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-slate-900">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                            <span className="text-2xl font-black text-white">{cita.cliente_nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{cita.cliente_nombre}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`status-badge text-[10px] ${config.badge}`}>{config.label}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cita.servicio?.nombre}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{horaInicio} - {horaFin}</span>
                        </div>
                        {cita.notas && <span className="text-blue-600 truncate max-w-[200px]">📝 {cita.notas}</span>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 md:flex-col lg:flex-row shrink-0">
                    {cita.estado === 'confirmada' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => {
                                        console.log('Action: ATENDER clicked', { citaId: cita.id, esNoShow, loading })
                                        if (loading) return
                                        if (esNoShow) {
                                            setShowLateWarning(true)
                                        } else {
                                            actualizarEstado('en_proceso')
                                        }
                                    }}
                                    disabled={loading || !canConfirm}
                                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 ${!canConfirm ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' :
                                        esNoShow ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100 animate-pulse' :
                                            'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 shadow-emerald-100'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    {!canConfirm ? `Faltan ${Math.abs(minutosDiferencia)} min` : esNoShow ? 'Atender Tardío' : 'Atender'}
                                </button>
                                {esNoShow && (
                                    <span className="text-[8px] font-black text-amber-600 animate-pulse text-center uppercase tracking-tighter">
                                        ⚠️ {minutosDiferencia} min de retraso
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setShowMove(true)} className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                Mover
                            </button>
                            <button onClick={() => setShowCancel(true)} disabled={loading} className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-red-600 hover:bg-red-50 border border-red-100 transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                Cancelar
                            </button>
                        </>
                    )}

                    {cita.estado === 'en_espera' && (
                        <button
                            onClick={() => actualizarEstado('en_proceso')}
                            disabled={loading}
                            className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                            Confirmar Inicio
                        </button>
                    )}

                    {cita.estado === 'en_proceso' && (
                        <button
                            onClick={() => setShowCheckout(true)}
                            disabled={loading}
                            className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Cobrar y Finalizar
                        </button>
                    )}

                    <button onClick={() => setShowDetails(true)} className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Detalles
                    </button>
                </div>
            </div>

            {/* MODALS */}
            {showDetails && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in text-slate-900">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in">
                        <div className="p-8 text-slate-900">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Detalles de la Cita</h3>
                                <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                                    <p className="text-xl font-black text-slate-900">{cita.cliente_nombre}</p>
                                    <p className="text-sm font-bold text-slate-500 mt-1">{cita.cliente_telefono}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicio</p>
                                        <p className="font-black text-slate-900">{cita.servicio?.nombre}</p>
                                        <p className="text-xs font-bold text-emerald-600 mt-1">${cita.servicio?.precio}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario</p>
                                        <p className="font-black text-slate-900">{horaInicio}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">{cita.servicio?.duracion_minutos} min</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMove && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in text-slate-900">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-in">
                        <div className="p-8 text-slate-900">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Reprogramar Cita</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Solo Horas Enteras Disponibles</p>
                                </div>
                                <button onClick={() => setShowMove(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-6 border-y border-slate-100 my-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {generateTimeSlots().map((slot) => {
                                    const isSelected = newHour === slot.value
                                    let btnClass = slot.isPast ? "bg-slate-50 text-slate-300 cursor-not-allowed opacity-50" :
                                        slot.isOccupied ? "bg-red-50 text-red-300 border border-red-100 cursor-not-allowed" :
                                            isSelected ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200" :
                                                "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-100"
                                    return (
                                        <button key={slot.value} disabled={slot.isPast || slot.isOccupied} onClick={() => setNewHour(slot.value)} className={`py-6 rounded-2xl text-sm font-black transition-all flex flex-col items-center justify-center gap-1 ${btnClass}`}>
                                            {slot.label}
                                            <span className="text-[8px] uppercase tracking-widest">{slot.isPast ? "Pasado" : slot.isOccupied ? "Ocupado" : "Libre"}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowMove(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Salir</button>
                                <button onClick={moverCita} disabled={!newHour || loading} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all ${!newHour ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                    {loading ? 'Cargando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCheckout && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm text-slate-900">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative"
                    >
                        {/* Animación de Éxito / Carga */}
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </motion.div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 animate-pulse">Sincronizando Pago...</p>
                            </motion.div>
                        )}

                        <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Finalizar y Cobrar</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{cita.cliente_nombre}</p>
                            </div>
                            <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-4">
                                <div className="grid grid-cols-5 gap-4 items-stretch">
                                    <div className="col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center relative shadow-inner">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 leading-none text-center">Monto Final</label>
                                        <div className="flex items-center justify-center gap-1.5 translate-x-[-4px]">
                                            <span className="text-2xl font-black text-slate-300">$</span>
                                            <input
                                                type="number"
                                                value={montoFinal}
                                                onChange={(e) => setMontoFinal(Number(e.target.value))}
                                                className="w-32 text-center bg-transparent text-5xl font-black text-slate-900 outline-none tabular-nums"
                                            />
                                        </div>
                                        <div className="mt-4 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5">
                                            <span className="text-[8px] font-black text-slate-300 uppercase leading-none">Base:</span>
                                            <span className="text-[10px] text-slate-500 font-black tabular-nums leading-none">${cita.servicio?.precio}</span>
                                        </div>
                                    </div>

                                    <div className="col-span-3 flex flex-col">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block leading-none">Método de Pago</label>
                                        <div className="grid grid-cols-3 gap-2 flex-1">
                                            {(['efectivo', 'tarjeta', 'transferencia'] as const).map(metodo => (
                                                <button
                                                    key={metodo}
                                                    onClick={() => setMetodoPago(metodo)}
                                                    className={`h-full rounded-xl border-2 font-black text-[9px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 ${metodoPago === metodo ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${metodoPago === metodo ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                                    {metodo}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block leading-none">Notas CRM (Seguimiento)</label>
                                    <textarea
                                        placeholder="Ej: Prefiere corte con máquina #2..."
                                        value={notasCrm}
                                        onChange={(e) => setNotasCrm(e.target.value)}
                                        className="w-full h-16 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none resize-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                            <button onClick={() => setShowCheckout(false)} className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-[10px]">Cerrar</button>
                            <button onClick={liquidarCita} disabled={loading} className="group relative flex-[2.5] py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl flex items-center justify-center gap-2 text-[10px] overflow-hidden">
                                <span className="relative z-10">{loading ? 'Sincronizando...' : 'Confirmar y Finalizar'}</span>
                                {!loading && <svg className="w-3 h-3 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showCancel && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-md animate-fade-in text-slate-900">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in">
                        <div className="p-8 text-center border-b border-slate-100">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">¿Cancelar Cita?</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Solo debe realizarse si el cliente lo solicitó presencialmente.</p>
                        </div>
                        <div className="p-6">
                            <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-white hover:border-slate-200 transition-all">
                                <input type="checkbox" checked={agreedCancel} onChange={(e) => setAgreedCancel(e.target.checked)} className="w-6 h-6 rounded-lg text-red-600 focus:ring-red-500 border-slate-300" />
                                <span className="text-xs font-bold uppercase tracking-tight">Confirmo que el cliente está de acuerdo</span>
                            </label>
                        </div>
                        <div className="flex p-6 pt-0 gap-4">
                            <button onClick={() => setShowCancel(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Volver</button>
                            <button onClick={() => actualizarEstado('cancelada')} disabled={loading || !agreedCancel} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${!agreedCancel ? 'bg-slate-100 text-slate-300' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'}`}>
                                {loading ? 'Cargando...' : 'Sí, Cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLateWarning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in text-slate-900">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in border border-amber-200">
                        <div className="p-8 text-center bg-amber-50/50 border-b border-amber-100">
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-amber-900">Atención con Retraso</h3>
                            <div className="mt-4 p-4 bg-white rounded-2xl border border-amber-100 inline-block shadow-sm">
                                <span className="text-4xl font-black text-amber-600">{minutosDiferencia}</span>
                                <span className="text-xs font-black text-amber-400 uppercase ml-2">minutos tarde</span>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                    El cliente ha superado el tiempo de tolerancia de <span className="text-slate-900 font-black">15 minutos</span>.
                                </p>
                                {hasNextSoon && (
                                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 animate-pulse">
                                        <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-xs font-black text-red-600 uppercase leading-snug">
                                            ⚠️ ADVERTENCIA: Tienes otra cita en menos de 30 min. Atender ahora podría retrasar toda tu agenda.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowLateWarning(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-[10px]"
                                >
                                    Reagendar / Salir
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        console.log('Action: Atender Tardio confirmado');
                                        actualizarEstado('en_proceso');
                                    }}
                                    className="flex-[1.5] py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-700 shadow-xl shadow-amber-200 transition-all text-[10px]"
                                >
                                    {loading ? 'Procesando...' : 'Atender de Todas Formas'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
