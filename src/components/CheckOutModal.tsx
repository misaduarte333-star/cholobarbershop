'use client'

import { useState, useEffect, useMemo } from 'react'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    ShoppingCart,
    CheckCircle2,
    X,
    Banknote,
    Landmark,
    FileText,
    User,
    Check
} from 'lucide-react'

interface CheckOutModalProps {
    cita: CitaDesdeVista
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function CheckOutModal({ cita, isOpen, onClose, onUpdate }: CheckOutModalProps) {
    const [loading, setLoading] = useState(false)
    const [montoFinal, setMontoFinal] = useState(cita.servicio_precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')

    // Reset fields when modal opens
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

    const suggestedAmounts = useMemo(() => [
        cita.servicio_precio || 0,
        (cita.servicio_precio || 0) + 50,
        (cita.servicio_precio || 0) + 100
    ], [cita.servicio_precio])

    const paymentMethods = [
        { id: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
        { id: 'transferencia' as const, label: 'Transferencia', icon: Landmark },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[#0A0C10] border-white/10 text-white rounded-[2rem] w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[95vh] overflow-hidden p-0 shadow-2xl outline-none border flex flex-col">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 z-50 shrink-0" />

                {/* Header */}
                <DialogHeader className="px-6 py-5 border-b border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <ShoppingCart className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white font-display">
                                Confirmar Pago
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="w-3 h-3 text-white/30 shrink-0" />
                                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium text-xs truncate">
                                    {cita.cliente_nombre}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none sm:scrollbar-thin">
                    <div className="p-6 space-y-6">
                        {/* Amount Section */}
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                            <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-4 block px-1">
                                Monto Total
                            </Label>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-emerald-400">$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={montoFinal}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '')
                                        setMontoFinal(val ? Number(val) : 0)
                                    }}
                                    className="h-auto bg-transparent border-none p-0 text-5xl sm:text-6xl font-black text-white outline-none tracking-tighter focus:text-emerald-400 transition-colors placeholder:text-white/20 w-full"
                                />
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-2">
                                {suggestedAmounts.map(val => (
                                    <Button
                                        key={val}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMontoFinal(val)}
                                        className={cn(
                                            "h-10 px-4 rounded-xl text-xs font-bold transition-all",
                                            montoFinal === val
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                                : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20"
                                        )}
                                    >
                                        ${val}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-4 text-[10px] text-white/20 uppercase tracking-widest font-medium">
                                Precio base del servicio: ${cita.servicio_precio}
                            </div>
                        </div>

                        {/* Payment Method Section */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2 block">
                                Método de Pago
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                {paymentMethods.map(({ id, label, icon: Icon }) => {
                                    const isSelected = metodoPago === id
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setMetodoPago(id)}
                                            className={cn(
                                                "relative p-5 rounded-2xl border transition-all flex flex-col items-center gap-3 group active:scale-[0.97]",
                                                isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                                                    <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />
                                                </div>
                                            )}
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-white/5 text-white/20 group-hover:text-white/40'
                                            )}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black uppercase tracking-widest transition-colors",
                                                isSelected ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/60'
                                            )}>
                                                {label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">
                                    Notas CRM
                                </Label>
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">Opcional</span>
                            </div>
                            <Textarea
                                placeholder="Escribe detalles relevantes para el seguimiento del cliente..."
                                value={notasCrm}
                                onChange={(e) => setNotasCrm(e.target.value)}
                                className="min-h-[120px] p-5 bg-white/5 border-white/10 rounded-2xl text-sm focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-white/10 text-white resize-none border"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="p-4 sm:p-6 bg-black/60 border-t border-white/5 shrink-0">
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 sm:h-14 sm:flex-1 bg-white/5 text-white/60 rounded-xl sm:rounded-2xl font-semibold text-sm hover:text-white hover:bg-white/10 transition-all border border-white/10"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            onClick={liquidarCita}
                            disabled={loading}
                            className={cn(
                                "h-12 sm:h-14 sm:flex-[2] rounded-xl sm:rounded-2xl font-semibold text-sm transition-all",
                                loading
                                    ? 'bg-emerald-500/50 text-emerald-900'
                                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98]'
                            )}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    <span>Procesando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Confirmar Pago</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
