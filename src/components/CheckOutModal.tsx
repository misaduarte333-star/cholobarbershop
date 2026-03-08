'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'

interface CheckOutModalProps {
    cita: CitaDesdeVista
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function CheckOutModal({ cita, isOpen, onClose, onUpdate }: CheckOutModalProps) {
    const [loading, setLoading] = useState(false)
    const [montoFinal, setMontoFinal] = useState(cita.servicio_precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')

    // Reset price when modal opens
    useEffect(() => {
        if (isOpen) {
            setMontoFinal(cita.servicio_precio || 0)
            setNotasCrm('')
            setMetodoPago('efectivo')
        }
    }, [isOpen, cita.servicio_precio])

    const liquidarCita = async () => {
        if (loading) return
        setLoading(true)

        try {
            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'finalizada' as EstadoCita,
                    monto_pagado: montoFinal,
                    metodo_pago: metodoPago,
                    notas_crm: notasCrm,
                }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }

            onUpdate?.()
            onClose()
        } catch (err: any) {
            console.error('Error in checkout:', err)
            alert('Error al procesar el cobro')
        } finally {
            setLoading(false)
        }
    }

    // Memoize suggested amounts to avoid re-renders
    const suggestedAmounts = useMemo(() => [
        cita.servicio_precio || 0,
        (cita.servicio_precio || 0) + 50,
        (cita.servicio_precio || 0) + 100
    ], [cita.servicio_precio])

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 md:p-8 bg-black/60 backdrop-blur-[2px] text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="bg-[#0A0C10] border border-white/10 rounded-[1.5rem] md:rounded-[2rem] w-full max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh] relative"
                    >
                        {/* Status bar */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 z-20" />

                        {/* Header */}
                        <div className="px-6 py-5 md:px-10 md:py-8 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0 relative z-10">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <span className="material-icons-round text-emerald-400 text-xl md:text-2xl">shopping_cart_checkout</span>
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white font-display">Confirmar Pago</h3>
                                    <p className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-0.5 md:mt-1">
                                        Cliente: <span className="text-emerald-400">{cita.cliente_nombre}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl transition-all group active:scale-90">
                                <span className="material-icons-round text-white/40 group-hover:text-white transition-colors">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-transparent to-black/30">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">

                                {/* Left Side: Amount & Notes */}
                                <div className="lg:col-span-7 space-y-5 md:space-y-6">

                                    {/* Amount Section */}
                                    <div className="bg-white/5 p-5 md:p-8 rounded-[1.25rem] md:rounded-[1.5rem] border border-white/5 shadow-inner relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <label className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-3 md:mb-4 block">Monto Total</label>
                                        <div className="flex items-baseline gap-2 md:gap-3">
                                            <span className="text-3xl md:text-4xl font-black text-emerald-400 font-display">$</span>
                                            <input
                                                type="number"
                                                value={montoFinal}
                                                onChange={(e) => setMontoFinal(Number(e.target.value))}
                                                className="w-full bg-transparent text-5xl md:text-7xl font-black text-white outline-none font-display tracking-tighter focus:text-emerald-400 transition-colors"
                                            />
                                        </div>
                                        <div className="mt-5 md:mt-6 flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex gap-2">
                                                {suggestedAmounts.map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setMontoFinal(val)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                                    >
                                                        ${val}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                Base: ${cita.servicio_precio}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CRM Notes */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2 md:mb-3 px-1 md:px-2">
                                            <label className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.4em] block">Notas del Cliente</label>
                                            <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Información de la Cita</span>
                                        </div>
                                        <textarea
                                            placeholder="Detalles del corte, preferencias..."
                                            value={notasCrm}
                                            onChange={(e) => setNotasCrm(e.target.value)}
                                            className="w-full h-24 md:h-28 p-4 md:p-5 bg-white/5 border border-white/5 rounded-[1.25rem] text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 focus:border-emerald-500/20 outline-none resize-none transition-all placeholder:text-white/10 text-white shadow-inner"
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Payment Method */}
                                <div className="lg:col-span-5 space-y-5 md:space-y-6">
                                    <label className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.4em] block px-1 md:px-2">Forma de Pago</label>
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-2 md:gap-3">
                                        {(['efectivo', 'tarjeta', 'transferencia'] as const).map(metodo => (
                                            <button
                                                key={metodo}
                                                onClick={() => setMetodoPago(metodo)}
                                                className={`p-3.5 md:p-5 rounded-[1.1rem] md:rounded-[1.25rem] border font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-between group relative overflow-hidden ${metodoPago === metodo
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 md:gap-4 relative z-10">
                                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-colors ${metodoPago === metodo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'
                                                        }`}>
                                                        <span className="material-icons-round text-lg md:text-xl">
                                                            {metodo === 'efectivo' ? 'payments' : metodo === 'tarjeta' ? 'credit_card' : 'account_balance'}
                                                        </span>
                                                    </div>
                                                    <span className="tracking-widest capitalize">{metodo}</span>
                                                </div>
                                                <div className={`w-3.5 h-3.5 rounded-full border-2 relative z-10 transition-all ${metodoPago === metodo ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/10'
                                                    }`} />

                                                {/* Active background glow */}
                                                {metodoPago === metodo && (
                                                    <motion.div
                                                        layoutId="activeGlow"
                                                        className="absolute inset-0 bg-emerald-500/5"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Summary small box */}
                                    <div className="p-4 md:p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                            <span className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Resumen</span>
                                            <span className="material-icons-round text-emerald-500/40 text-sm">receipt_long</span>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase">Total a recibir:</span>
                                            <span className="text-xl md:text-2xl font-black text-emerald-400 font-display">${montoFinal}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="px-6 py-5 md:px-10 md:py-8 border-t border-white/5 bg-black/40 flex flex-col md:flex-row gap-3 shrink-0 relative z-10">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 md:py-4 bg-white/5 text-white/40 rounded-[1.1rem] md:rounded-[1.25rem] font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={liquidarCita}
                                disabled={loading}
                                className={`flex-[2] py-3.5 md:py-4 rounded-[1.1rem] md:rounded-[1.25rem] font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2.5 md:gap-3 relative overflow-hidden ${loading ? 'bg-emerald-500/50 text-black/50 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.01] shadow-[0_15px_40px_rgba(16,185,129,0.3)]'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-round text-lg">check_circle</span>
                                        <span>Confirmar y Cobrar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
