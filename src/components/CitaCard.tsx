import { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { CheckOutModal } from './CheckOutModal'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Play,
    RotateCcw,
    X,
    PlayCircle,
    Scissors,
    CreditCard,
    Info,
    Clock,
    StickyNote,
    UserCheck,
    Timer,
    AlertTriangle,
    CalendarClock
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
        confirmada: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-primary', badgeVariant: 'outline' as const, label: 'Confirmada', badgeClass: 'bg-primary/10 text-primary border-primary/20' },
        en_espera: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-primary', badgeVariant: 'outline' as const, label: 'En Sucursal', badgeClass: 'bg-primary/10 text-primary border-primary/20' },
        en_proceso: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-emerald-500', badgeVariant: 'outline' as const, label: 'En Proceso', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        por_cobrar: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-blue-500', badgeVariant: 'outline' as const, label: 'Por Cobrar', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        finalizada: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-slate-500', badgeVariant: 'outline' as const, label: 'Finalizada', badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
        cancelada: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-red-500', badgeVariant: 'outline' as const, label: 'Cancelada', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' },
        no_show: { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-red-500', badgeVariant: 'outline' as const, label: 'No Show', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' }
    }[cita.estado] || { bg: 'bg-slate-900/40', border: 'border-slate-800/50', accent: 'border-l-slate-500', badgeVariant: 'outline' as const, label: cita.estado, badgeClass: 'bg-slate-500/10 text-slate-400' }

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
        <Card
            className={cn(
                "relative md:rounded-[1.5rem] border-l-[4px] glass-card overflow-hidden transition-all duration-700 hover:bg-black/60 group animate-fade-in",
                config.bg,
                config.border,
                config.accent,
                (isHighlighted || isInProcess) ? 'shadow-[0_10px_30px_rgba(234,179,8,0.1)] border-primary/20' : 'border-white/5',
                isHighlighted ? 'z-10' : 'z-0'
            )}
            style={style}
        >
            {/* Interior Glow Overlay for active items */}
            {(isHighlighted || isInProcess) && (
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            )}

            <CardContent className="p-3 md:p-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-8 text-white relative z-10">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 mb-1.5 md:mb-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 shadow-xl group-hover:border-primary/40 transition-colors duration-500">
                                <span className="text-sm md:text-xl font-black text-primary font-display group-hover:scale-105 transition-transform">{cita.cliente_nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs md:text-lg font-black text-white truncate tracking-tight font-display uppercase leading-none">
                                    {cita.cliente_nombre}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:mt-1">
                                    <Badge variant={config.badgeVariant} className={cn("text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em]", config.badgeClass)}>
                                        {config.label}
                                    </Badge>

                                    {isEnSucursal && (
                                        <Badge className="bg-emerald-500 text-black animate-pulse flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-[8px] md:text-[9px] uppercase font-black">
                                            <UserCheck className="w-2.5 h-2.5" />
                                            En sucursal
                                        </Badge>
                                    )}

                                    {isTiempoCorto && (
                                        <Badge variant="outline" className="border-amber-500/50 text-amber-500 animate-pulse flex items-center gap-1 bg-amber-500/10 text-[8px] md:text-[9px] uppercase font-black">
                                            <Timer className="w-2.5 h-2.5" />
                                            En {minHastaCita} min
                                        </Badge>
                                    )}
                                    <div className="h-0.5 w-0.5 rounded-full bg-white/20" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em]">
                                        {cita.servicio_nombre}
                                    </span>
                                </div>

                                {(cita.estado === 'en_proceso' || cita.estado === 'por_cobrar') && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-md border",
                                            cita.estado === 'en_proceso' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        )}>
                                            <Timer className={cn("w-3 h-3", cita.estado === 'en_proceso' && "animate-pulse")} />
                                            <span className="text-[10px] font-black tracking-widest leading-none">
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
                                <Clock className="w-3 h-3 text-primary" />
                                <span className="text-white tracking-[0.05em] md:tracking-[0.1em]">{horaInicio} — {horaFin}</span>
                            </div>
                            {cita.notas && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/5 rounded-xl border border-blue-500/20 max-w-[200px] md:max-w-[300px]">
                                    <StickyNote className="w-3 h-3 text-blue-400" />
                                    <span className="text-blue-400 truncate tracking-normal italic opacity-80 text-[8px] md:text-[9px]">{cita.notas}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
                        {cita.estado === 'confirmada' && (
                            <>
                                <Button
                                    size="sm"
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
                                    className={cn(
                                        "h-auto py-2.5 px-4 font-black text-[9px] uppercase tracking-[0.1em] shadow-xl transition-all flex items-center gap-2 active:scale-95",
                                        esNoShow
                                            ? "bg-amber-500 text-white hover:bg-amber-400 border-amber-300 shadow-[0_5px_15px_rgba(245,158,11,0.2)] animate-pulse"
                                            : "bg-gradient-gold text-black hover:scale-[1.02] border border-primary/20 shadow-[0_5px_15px_rgba(234,179,8,0.15)]"
                                    )}
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    {esNoShow ? 'Tardío' : 'Atender'}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMove(true)}
                                    className="h-auto py-2.5 px-3 bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.1em]"
                                >
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    Mover
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCancel(true)}
                                    disabled={loading}
                                    className="h-9 w-9 bg-red-500/5 border-red-500/20 text-red-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </>
                        )}

                        {isEnSucursal && (
                            <Button
                                size="lg"
                                onClick={() => actualizarEstado('en_proceso')}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-primary/10 border-2 border-primary/50 text-primary hover:bg-primary hover:text-black shadow-[0_10px_40px_rgba(234,179,8,0.2)] transition-all flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Confirmar Inicio
                            </Button>
                        )}

                        {cita.estado === 'en_proceso' && (
                            <Button
                                size="lg"
                                onClick={() => actualizarEstado('por_cobrar')}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 shadow-[0_15px_40px_rgba(59,130,246,0.3)] border-2 border-blue-400/50 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <Scissors className="w-5 h-5" />
                                Finalizar
                            </Button>
                        )}

                        {cita.estado === 'por_cobrar' && (
                            <Button
                                size="lg"
                                onClick={() => setShowCheckout(true)}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.3)] border-2 border-emerald-300 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <CreditCard className="w-5 h-5" />
                                Cobrar
                            </Button>
                        )}

                        {!isInProcess && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowDetails(true)}
                                className="h-9 w-9 bg-white/5 border-white/5 text-white/30 hover:text-white"
                            >
                                <Info className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* MODALS using shadcn/ui Dialog */}

            {/* Early Warning Dialog */}
            <Dialog open={showEarlyWarning} onOpenChange={setShowEarlyWarning}>
                <DialogContent className="bg-[#0A0C10] border-white/10 text-white rounded-[2rem] sm:max-w-sm w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                    <DialogHeader className="flex flex-col items-center pt-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Atención Adelantada</DialogTitle>
                        <DialogDescription className="text-white/60 text-center text-sm">
                            Faltan <strong>{minHastaCita} minutos</strong> para esta cita. ¿Deseas comenzar el servicio ahora mismo?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button onClick={() => { setShowEarlyWarning(false); actualizarEstado('en_proceso') }} className="w-full bg-gradient-gold text-black font-black uppercase tracking-widest py-6">
                            Sí, Atender Ahora
                        </Button>
                        <Button variant="ghost" onClick={() => setShowEarlyWarning(false)} className="w-full text-white/40 hover:text-white hover:bg-white/5 font-black uppercase">
                            No, Esperar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={(open) => { setShowDetails(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-[#0A0C10] border-white/10 text-white rounded-[2rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter font-display">Detalles de la Cita</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Cliente</p>
                            <p className="text-2xl font-black text-white font-display uppercase tracking-tight">{cita.cliente_nombre}</p>
                            {cita.cliente_telefono && <p className="text-sm font-bold text-primary mt-1 tracking-widest">{cita.cliente_telefono}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Servicio</p>
                                <p className="font-black text-white text-sm uppercase">{cita.servicio_nombre}</p>
                                <p className="text-lg font-black text-primary mt-1 tracking-tight">${cita.servicio_precio}</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Horario</p>
                                <p className="font-black text-white text-sm uppercase">{horaInicio}</p>
                                <p className="text-[10px] text-white/40 mt-1 uppercase font-bold">{horaFin}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Move/Reschedule Dialog */}
            <Dialog open={showMove} onOpenChange={(open) => { setShowMove(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-[#0A0C10] border-white/10 text-white rounded-[2.5rem] sm:max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter font-display">Reprogramar</DialogTitle>
                        <DialogDescription className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2">
                            Selecciona un nuevo horario disponible
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {generateTimeSlots().map((slot) => {
                            const isSelected = newHour === slot.value
                            return (
                                <Button
                                    key={slot.value}
                                    variant="outline"
                                    disabled={slot.isPast || slot.isOccupied}
                                    onClick={() => setNewHour(slot.value)}
                                    className={cn(
                                        "h-auto py-6 rounded-2xl text-[10px] font-black flex flex-col items-center justify-center gap-1 border transition-all",
                                        slot.isPast && "opacity-20 grayscale",
                                        slot.isOccupied && "bg-red-500/10 text-red-500/40 border-red-500/10",
                                        isSelected ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-105" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                                    )}
                                >
                                    <span className="text-sm tracking-tighter">{slot.label}</span>
                                    <span className="opacity-40 uppercase tracking-widest text-[7px]">{slot.isOccupied ? "Ocupado" : "Libre"}</span>
                                </Button>
                            )
                        })}
                    </div>

                    <DialogFooter className="flex gap-4 mt-4">
                        <Button variant="ghost" onClick={() => { setShowMove(false); onClose?.(); }} className="flex-1 py-6 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">
                            Cancelar
                        </Button>
                        <Button onClick={moverCita} disabled={!newHour || loading} className={cn("flex-1 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl", !newHour ? "bg-white/5 text-white/10" : "bg-gradient-gold text-black")}>
                            {loading ? 'Procesando...' : 'Confirmar Cambio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Checkout Modal Triggered Here */}
            <CheckOutModal
                key="checkout-modal"
                cita={cita}
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                onUpdate={onUpdate}
            />

            {/* Cancel Dialog */}
            <Dialog open={showCancel} onOpenChange={(open) => { setShowCancel(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-[#050608] border-red-500/20 text-white rounded-[2.5rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <DialogHeader className="flex flex-col items-center pt-6">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Confirmar Cancelación?</DialogTitle>
                        <DialogDescription className="text-sm font-bold text-white/30 uppercase tracking-widest text-center mt-2">
                            Esta acción liberará el espacio de <span className="text-white font-black">{cita.cliente_nombre}</span> permanentemente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div
                            onClick={() => setAgreedCancel(!agreedCancel)}
                            className={cn(
                                "flex items-center gap-4 p-5 rounded-[1.5rem] border cursor-pointer transition-all",
                                agreedCancel ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/5"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                agreedCancel ? "bg-red-500 border-red-500" : "border-white/20"
                            )}>
                                {agreedCancel && <X className="w-4 h-4 text-white" />}
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-all", agreedCancel ? "text-red-400" : "text-white/40")}>
                                Entiendo las consecuencias
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => setShowCancel(false)} className="flex-1 py-6 bg-white/5 text-white/40 rounded-2xl font-black">REGRESAR</Button>
                            <Button
                                onClick={() => actualizarEstado('cancelada')}
                                disabled={loading || !agreedCancel}
                                className={cn("flex-1 py-6 rounded-2xl font-black", agreedCancel ? "bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/20" : "bg-white/5 text-white/10")}
                            >
                                {loading ? '...' : 'CANCELAR CITA'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Late Warning Dialog */}
            <Dialog open={showLateWarning} onOpenChange={(open) => { setShowLateWarning(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-[#050608] border-amber-500/20 text-white rounded-[2.5rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="p-10 text-center bg-amber-500/5 border-b border-amber-500/10">
                        <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-500/20">
                            <Timer className="w-10 h-10" />
                        </div>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-amber-500">Retraso Excesivo</DialogTitle>
                        <div className="mt-6 p-6 bg-black/60 rounded-[2rem] border border-amber-500/20 inline-flex flex-col items-center">
                            <span className="text-5xl font-black text-white font-display tracking-tighter">{minutosDiferencia}</span>
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">MIN TARDE</span>
                        </div>
                    </div>
                    <div className="p-10 space-y-8">
                        <p className="text-sm font-bold text-white/40 leading-relaxed text-center">
                            El cliente ha superado el tiempo límite. <span className="text-white">¿Deseas atenderlo o reorganizar tu agenda?</span>
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => { setShowLateWarning(false); setShowMove(true); }} className="flex-1 py-7 bg-white/5 border-white/5 text-white/40 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">
                                Mover
                            </Button>
                            <Button onClick={() => actualizarEstado('en_proceso')} className="flex-[1.5] py-7 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-amber-500 shadow-2xl shadow-amber-900/20">
                                {loading ? '...' : 'Atender'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
})
