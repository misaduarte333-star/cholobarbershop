import { useMemo, useEffect, useRef, useState, memo } from 'react'
import { motion, useDragControls } from 'framer-motion'
import {
    Play,
    X,
    Info,
    RefreshCcw,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    History,
    Clock,
    User,
    Scissors
} from 'lucide-react'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { CitaCard } from './CitaCard'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AgendaTimelineProps {
    citas: CitaDesdeVista[]
    bloqueos?: any[]
    almuerzoBarbero?: any
    horarioSucursal?: any
    fechaBase?: string
    currentTime: Date
    onUpdate?: () => void
}


const SLOT_HEIGHT = 60 // More compact height

function generarSlots(inicio: number, fin: number): string[] {
    const slots: string[] = []
    for (let hora = inicio; hora < fin; hora++) {
        const ampm = hora >= 12 ? 'PM' : 'AM'
        const hour12 = hora % 12 || 12
        slots.push(`${hour12}:00 ${ampm}`)
        slots.push(`${hour12}:30 ${ampm}`)
    }
    return slots
}

export const AgendaTimeline = memo(function AgendaTimeline({ citas, bloqueos = [], almuerzoBarbero = null, horarioSucursal, fechaBase, currentTime, onUpdate }: AgendaTimelineProps) {
    // Determinar día de la semana para el horario de sucursal
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const todayLocalStr = new Date().toLocaleDateString('en-CA')
    const viewDate = fechaBase || todayLocalStr
    const targetDate = new Date(`${viewDate}T12:00:00-07:00`)
    const nombreDia = dias[targetDate.getDay()]

    const { horaInicio, horaFin } = useMemo(() => {
        let inicio = 8
        let fin = 21

        if (horarioSucursal && horarioSucursal[nombreDia]) {
            const hA = horarioSucursal[nombreDia].apertura
            const hC = horarioSucursal[nombreDia].cierre
            if (hA) {
                const parts = hA.split(':')
                inicio = parseInt(parts[0], 10) - 1
                if (inicio < 0) inicio = 0
            }
            if (hC) {
                const parts = hC.split(':')
                fin = parseInt(parts[0], 10) + 1
                if (parseInt(parts[1], 10) > 0) fin += 1
                if (fin > 24) fin = 24
            }
        }
        return { horaInicio: inicio, horaFin: fin }
    }, [horarioSucursal, nombreDia])

    const slots = useMemo(() => generarSlots(horaInicio, horaFin), [horaInicio, horaFin])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [selectedCita, setSelectedCita] = useState<CitaDesdeVista | null>(null)
    const [isManualScroll, setIsManualScroll] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const supabase = createClient()

    const [activeModal, setActiveModal] = useState<'move' | 'cancel' | 'details' | null>(null)
    const [showEarlyWarning, setShowEarlyWarning] = useState(false)
    const [pendingCitaAction, setPendingCitaAction] = useState<CitaDesdeVista | null>(null)

    // Refs for drag state tracking
    const isDraggingRef = useRef(false)
    const [longPressActive, setLongPressActive] = useState<string | null>(null)
    const [cardResetKey, setCardResetKey] = useState(0)
    const [proposedMove, setProposedMove] = useState<{ cita: CitaDesdeVista, newStartTime: string } | null>(null)
    // advanced-use-latest: keep last proposedMove so CSS exit animation can still render content
    const lastMoveRef = useRef<{ cita: CitaDesdeVista, newStartTime: string } | null>(null)
    if (proposedMove) lastMoveRef.current = proposedMove
    const displayMove = proposedMove || lastMoveRef.current

    const dragControls = useDragControls()
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const touchStartPos = useRef<{ x: number, y: number } | null>(null)
    const activePointerId = useRef<number | null>(null)
    const dragPointerY = useRef<number>(0) // Tracks pointer Y for edge auto-scroll


    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Position in pixels: (Hour offset * height) + (Minutes proportional to height)
    // Now SLOT_HEIGHT is for 30 mins, so double the hour offset and (mins/30)
    const currentTimePosition = ((currentHour - horaInicio) * 2 * SLOT_HEIGHT) + (currentMinute / 30 * SLOT_HEIGHT)

    const targetScrollPosition = Math.max(0, ((currentHour - 1 - horaInicio) * 2 * SLOT_HEIGHT))

    // Auto-center: only scroll to current time when viewing TODAY
    const todayLocal = new Date().toLocaleDateString('en-CA')
    const isViewingToday = !fechaBase || fechaBase === todayLocal

    useEffect(() => {
        if (!isManualScroll && isViewingToday && scrollContainerRef.current) {
            const timer = setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [targetScrollPosition, isManualScroll, isViewingToday])

    // Unified mobile drag handler — attached directly to the card (guaranteed touch target)
    // Merges: (1) preventDefault to block page scroll, (2) edge-scroll via applyScroll
    // Document-level listeners are unreliable after setPointerCapture on mobile browsers
    useEffect(() => {
        if (!longPressActive) return
        const card = document.querySelector(`[data-drag-id="${longPressActive}"]`) as HTMLElement
        const scroll = scrollContainerRef.current
        if (!card || !scroll) return

        const MAX_SPEED = 150
        const VH = () => window.visualViewport?.height ?? window.innerHeight
        const ZONE = 220 // px from each edge of the visual viewport

        const applyScroll = (py: number) => {
            if (!isDraggingRef.current || py <= 0) return
            dragPointerY.current = py
            const vh = VH()
            if (py < ZONE) {
                scroll.scrollTop -= Math.ceil(MAX_SPEED * Math.max(0, 1 - py / ZONE))
            } else if (py > vh - ZONE) {
                scroll.scrollTop += Math.ceil(MAX_SPEED * Math.max(0, (py - (vh - ZONE)) / ZONE))
            }
        }

        // Card touchmove: {passive: false} so we can call preventDefault AND scroll
        const onCardTouch = (e: TouchEvent) => {
            if (isDraggingRef.current) e.preventDefault()
            if (e.touches[0]) applyScroll(e.touches[0].clientY)
        }
        // Card pointermove: for desktop pointer events (also fires on mobile for captured pointer)
        const onCardPointer = (e: PointerEvent) => applyScroll(e.clientY)

        card.addEventListener('touchmove', onCardTouch, { passive: false })
        card.addEventListener('pointermove', onCardPointer)
        // Keep document pointermove as desktop fallback (mouse drag)
        document.addEventListener('pointermove', onCardPointer)

        // RAF: scrolls when finger is held still at edge (no move events fire)
        let rafId: number
        const loop = () => {
            if (dragPointerY.current > 0) applyScroll(dragPointerY.current)
            rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(rafId)
            card.removeEventListener('touchmove', onCardTouch)
            card.removeEventListener('pointermove', onCardPointer)
            document.removeEventListener('pointermove', onCardPointer)
        }
    }, [longPressActive])

    const handleUserInteraction = () => {
        setIsManualScroll(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            setIsManualScroll(false)
        }, 15000)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Performance Index: Map each slot string to its content for O(1) lookup
    const slotMap = useMemo(() => {
        const map = new Map<string, { tipo: 'cita' | 'bloqueo' | 'almuerzo', data: any }>()

        // Hoist base date parsing
        const baseDate = fechaBase ? new Date(`${fechaBase}T00:00:00`) : new Date()
        const year = baseDate.getFullYear()
        const month = baseDate.getMonth()
        const day = baseDate.getDate()

        // 0. Pre-calculate slot timestamps to avoid repeated arithmetic/parsing
        const slotData = slots.map(slot => {
            const [timePart, ampm] = slot.split(' ')
            const [h, m] = timePart.split(':').map(Number)
            let h24 = h
            if (ampm === 'PM' && h24 !== 12) h24 += 12
            if (ampm === 'AM' && h24 === 12) h24 = 0

            const minutesOfDay = h24 * 60 + m
            const timestamp = new Date(year, month, day, h24, m).getTime()
            const timestampEnd = timestamp + 30 * 60 * 1000

            return { slot, minutesOfDay, timestamp, timestampEnd }
        })

        // 1. Process Lunch (lower priority than appointments)
        if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) {
            const [startH, startM] = almuerzoBarbero.inicio.split(':').map(Number)
            const [endH, endM] = almuerzoBarbero.fin.split(':').map(Number)
            const lunchStartMinutes = startH * 60 + startM
            const lunchEndMinutes = endH * 60 + endM

            slotData.forEach(sd => {
                const slotEndMinutes = sd.minutesOfDay + 30
                if (lunchStartMinutes < slotEndMinutes && lunchEndMinutes > sd.minutesOfDay) {
                    map.set(sd.slot, { tipo: 'almuerzo', data: almuerzoBarbero })
                }
            })
        }

        // 2. Process Bloqueos (uses fecha_inicio/fecha_fin per actual DB schema)
        bloqueos.forEach(b => {
            const bStart = new Date(b.fecha_inicio).getTime()
            const bEnd = new Date(b.fecha_fin).getTime()

            slotData.forEach(sd => {
                if (bStart < sd.timestampEnd && bEnd > sd.timestamp) {
                    map.set(sd.slot, { tipo: 'bloqueo', data: b })
                }
            })
        })

        // 3. Process Citas (Highest priority)
        citas.forEach(cita => {
            if (['cancelada', 'no_show'].includes(cita.estado)) return

            const st = new Date(cita.timestamp_inicio)
            const ampm = st.getHours() >= 12 ? 'PM' : 'AM'
            const h12 = st.getHours() % 12 || 12
            const m = st.getMinutes() < 30 ? '00' : '30'
            const slotKey = `${h12}:${m} ${ampm}`
            map.set(slotKey, { tipo: 'cita', data: cita })
        })

        return map
    }, [citas, bloqueos, almuerzoBarbero, slots, fechaBase])

    const getCitaEnSlot = (slotString: string) => slotMap.get(slotString) || null

    const getStatusColor = (estado: string, tipoItem?: string) => {
        if (tipoItem === 'bloqueo') return 'bg-red-500'
        if (tipoItem === 'almuerzo') return 'bg-amber-500'

        switch (estado) {
            case 'confirmada': return 'bg-primary'
            case 'en_espera': return 'bg-primary'
            case 'en_proceso': return 'bg-emerald-500'
            case 'por_cobrar': return 'bg-purple-500'
            case 'finalizada': return 'bg-slate-300'
            default: return 'bg-slate-500'
        }
    }

    const actualizarEstadoDirecto = async (citaId: string, nuevoEstado: EstadoCita) => {
        try {
            const payload: any = { estado: nuevoEstado, updated_at: new Date().toISOString() }
            if (nuevoEstado === 'en_proceso') {
                payload.timestamp_inicio_servicio = new Date().toISOString()
            }
            const { error } = await (supabase.from('citas') as any).update(payload).eq('id', citaId)
            if (error) throw error
            onUpdate?.()
        } catch (err) {
            console.error('Error updating state:', err)
            alert('Error al actualizar')
        }
    }

    const handleAtenderClick = (e: React.MouseEvent, cita: CitaDesdeVista) => {
        e.stopPropagation()
        const citaStartTime = new Date(cita.timestamp_inicio)
        const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
        const minHastaCita = -minutosDiferencia

        if (minHastaCita >= 30) {
            setPendingCitaAction(cita)
            setShowEarlyWarning(true)
        } else {
            actualizarEstadoDirecto(cita.id, 'en_proceso')
        }
    }

    const confirmarAtencionTemprana = () => {
        if (pendingCitaAction) {
            actualizarEstadoDirecto(pendingCitaAction.id, 'en_proceso')
            setShowEarlyWarning(false)
            setPendingCitaAction(null)
        }
    }

    const handleDragStart = (citaId: string) => {
        isDraggingRef.current = true
        setLongPressActive(citaId)
        // Lock body to prevent Chrome pull-to-refresh (but NOT scroll container — needed for edge scroll)
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
        document.body.style.overscrollBehavior = 'none'
    }

    const handlePointerDown = (e: React.PointerEvent, cita: CitaDesdeVista) => {
        if (cita.estado !== 'confirmada') return

        touchStartPos.current = { x: e.clientX, y: e.clientY }
        activePointerId.current = e.pointerId

        timerRef.current = setTimeout(() => {
            // Set isDraggingRef immediately so edge-scroll activates without waiting for onDragStart
            isDraggingRef.current = true
            const target = e.target as HTMLElement
            if (target?.setPointerCapture && activePointerId.current !== null) {
                try { target.setPointerCapture(activePointerId.current) } catch (_) { }
            }
            setLongPressActive(cita.id)
            dragControls.start(e)
            if (window.navigator?.vibrate) window.navigator.vibrate(50)
        }, 2000)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        // Track pointer Y for edge auto-scroll (always, not just pre-drag)
        dragPointerY.current = e.clientY

        if (!touchStartPos.current || !timerRef.current) return

        const deltaX = Math.abs(e.clientX - touchStartPos.current.x)
        const deltaY = Math.abs(e.clientY - touchStartPos.current.y)

        // If finger moves >10px before 2s, it's a scroll — cancel long press
        if (deltaX > 10 || deltaY > 10) {
            clearTimeout(timerRef.current)
            timerRef.current = null
            touchStartPos.current = null
        }
    }

    const handlePointerUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        touchStartPos.current = null
        activePointerId.current = null
        dragPointerY.current = 0 // Reset edge-scroll tracker
        if (!isDraggingRef.current) {
            setLongPressActive(null)
        }
    }

    const handleDragEnd = (event: any, info: any, cita: CitaDesdeVista) => {
        isDraggingRef.current = false
        dragPointerY.current = 0
        setLongPressActive(null)
        // Restore body styles (scroll container was NOT locked to allow edge-scroll)
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
        document.body.style.overscrollBehavior = ''

        const deltaY = info.offset.y
        const slotsMoved = Math.round(deltaY / SLOT_HEIGHT)

        if (slotsMoved === 0) {
            setCardResetKey(k => k + 1)
            return
        }

        // Snap to half-hour grid
        const originalStart = new Date(cita.timestamp_inicio)
        const newStart = new Date(originalStart)
        newStart.setMinutes(originalStart.getMinutes() + (slotsMoved * 30))
        setProposedMove({ cita, newStartTime: newStart.toISOString() })
    }

    const confirmarMoverCita = async () => {
        if (!proposedMove) return
        const { cita, newStartTime } = proposedMove

        try {
            // Preserve original duration
            const originalStart = new Date(cita.timestamp_inicio)
            const originalEnd = new Date(cita.timestamp_fin)
            const durationMs = originalEnd.getTime() - originalStart.getTime()

            const newStart = new Date(newStartTime)
            const newEnd = new Date(newStart.getTime() + durationMs)

            const { error } = await (supabase.from('citas') as any).update({
                timestamp_inicio: newStart.toISOString(),
                timestamp_fin: newEnd.toISOString(),
                updated_at: new Date().toISOString()
            })
                .eq('id', cita.id)

            if (error) throw error
            onUpdate?.()
        } catch (err) {
            console.error('Error moving appointment:', err)
            alert('Error al mover la cita')
        } finally {
            setProposedMove(null)
        }
    }

    const dentroHorario = currentHour >= horaInicio && currentHour < horaFin

    return (
        <div className="absolute inset-0 flex flex-col">
            <div
                ref={scrollContainerRef}
                onWheel={handleUserInteraction}
                onTouchMove={handleUserInteraction}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 relative scroll-smooth"
                style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
                {dentroHorario && (
                    <div
                        className="absolute left-0 right-0 z-[10] border-t-[2px] border-primary pointer-events-none transition-all duration-1000 flex items-center"
                        style={{ top: `${currentTimePosition + (typeof window !== 'undefined' && window.innerWidth >= 768 ? 16 : 12)}px` }}
                    >
                        <div className="absolute left-0 -translate-y-1/2 flex items-center pr-2 bg-[#050608]">
                            <span className="bg-primary text-black text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase whitespace-nowrap z-[10] font-display ml-2">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}
                            </span>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-700/10">
                    {Array.from({ length: horaFin - horaInicio }).map((_, i) => {
                        const hour24 = horaInicio + i
                        const ampm = hour24 >= 12 ? 'PM' : 'AM'
                        const hour12 = hour24 % 12 || 12

                        const slot00 = `${hour12}:00 ${ampm}`
                        const slot30 = `${hour12}:30 ${ampm}`

                        return (
                            <div key={hour24} className="flex border-b border-slate-700/20 last:border-0 min-h-[120px]"> {/* 60 * 2 */}
                                {/* Hour Label Column */}
                                <div className="w-10 flex flex-col items-center justify-start pt-2 border-r border-slate-700/10 bg-slate-800/10 shrink-0">
                                    <span className="text-[9px] font-black text-white leading-none">{hour12}</span>
                                    <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">{ampm}</span>
                                </div>

                                {/* Slots Column */}
                                <div className="flex-1 flex flex-col">
                                    {[slot00, slot30].map((slot, index) => {
                                        const item = getCitaEnSlot(slot)
                                        let activeTimer = null
                                        let isEnProceso = false
                                        let isPorCobrar = false

                                        if (item && item.tipo === 'cita') {
                                            isEnProceso = item.data.estado === 'en_proceso'
                                            isPorCobrar = item.data.estado === 'por_cobrar'

                                            if (isEnProceso && item.data.timestamp_inicio_servicio) {
                                                const minTrasncurridos = Math.floor((new Date().getTime() - new Date(item.data.timestamp_inicio_servicio).getTime()) / 60000)
                                                const horasLabel = Math.floor(minTrasncurridos / 60)
                                                const minsLabel = minTrasncurridos % 60
                                                activeTimer = horasLabel > 0 ? `${horasLabel}H ${minsLabel}M` : `${minsLabel} MIN`
                                            } else if (isPorCobrar && item.data.duracion_real_minutos) {
                                                const horasLabel = Math.floor(item.data.duracion_real_minutos / 60)
                                                const minsLabel = item.data.duracion_real_minutos % 60
                                                activeTimer = horasLabel > 0 ? `${horasLabel}H ${minsLabel}M` : `${minsLabel} MIN`
                                            }
                                        }

                                        const cardBorder = item?.tipo === 'bloqueo' ? 'border-red-500/30 bg-[#16181D]/90' :
                                            item?.tipo === 'almuerzo' ? 'border-amber-500/30 bg-[#16181D]/90' :
                                                isEnProceso ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5' :
                                                    isPorCobrar ? 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/5' :
                                                        'border-white/5 hover:border-white/10 bg-[#16181D]/90'

                                        return (
                                            <div
                                                key={slot}
                                                className={`relative flex-1 flex items-center gap-2 transition-colors duration-200 ${item ? 'bg-transparent' : 'hover:bg-white/5'} ${index === 0 ? 'border-b border-slate-700/5' : ''}`}
                                                style={{ height: SLOT_HEIGHT }}
                                            >
                                                <div className="w-5 flex items-center justify-center shrink-0 opacity-20">
                                                    <span className="text-[5px] font-black text-slate-500">{index === 0 ? '00' : '30'}</span>
                                                </div>
                                                <div className="relative flex-1 h-full py-1 pr-1.5">
                                                    {item ? (
                                                        <motion.div
                                                            key={`${item.data.id}-${cardResetKey}`}
                                                            data-drag-id={item.tipo === 'cita' ? item.data.id : undefined}
                                                            drag={item.tipo === 'cita' && item.data.estado === 'confirmada' ? "y" : false}
                                                            dragControls={dragControls}
                                                            dragListener={false}
                                                            dragElastic={0}
                                                            dragMomentum={false}
                                                            onDragStart={() => handleDragStart(item.data.id)}
                                                            onDragEnd={(e, info) => handleDragEnd(e, info, item.data)}
                                                            onPointerDown={(e) => item.tipo === 'cita' && handlePointerDown(e, item.data)}
                                                            onPointerMove={handlePointerMove}
                                                            onPointerUp={handlePointerUp}
                                                            onPointerCancel={handlePointerUp}
                                                            animate={{
                                                                y: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? undefined : 0,
                                                                scale: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 1.03 : 1,
                                                                boxShadow: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? '0 10px 20px rgba(0,0,0,0.4), 0 0 15px rgba(234,179,8,0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                                                                zIndex: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 100 : 20
                                                            }}
                                                            transition={{ type: 'spring', damping: 20, stiffness: 400, mass: 0.3 }}
                                                            className={`absolute inset-x-0 h-[calc(100%-4px)] flex items-center justify-between gap-1 animate-fade-in backdrop-blur-sm px-2.5 py-1 rounded-xl border ${cardBorder} transition-colors group/card overflow-hidden cursor-pointer select-none`}
                                                            style={{
                                                                backgroundColor: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 'rgba(30,34,45,0.98)' : undefined,
                                                                WebkitTouchCallout: 'none',
                                                                touchAction: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 'none' : 'pan-y',
                                                                // GPU acceleration for smoother drag (Vercel: rendering-hoist-jsx principle)
                                                                willChange: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 'transform' : 'auto',
                                                                transform: longPressActive === (item.tipo === 'cita' ? item.data.id : null) ? 'translateZ(0)' : undefined,
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1 h-full">
                                                                <div className={`w-0.5 h-full rounded-full ${getStatusColor(item.tipo === 'cita' ? item.data.estado : '', item.tipo)} shrink-0`} />
                                                                <div className="min-w-0 flex-1 flex flex-col justify-center h-full">
                                                                    <div className="flex justify-between items-center gap-1">
                                                                        <p className={`text-[9px] font-black ${item.tipo === 'bloqueo' ? 'text-red-400' : item.tipo === 'almuerzo' ? 'text-amber-400' : 'text-white'} truncate leading-none uppercase tracking-tight`}>
                                                                            {item.tipo === 'cita' ? item.data.cliente_nombre : item.tipo === 'almuerzo' ? 'ALMUERZO' : 'BLOQUEO'}
                                                                        </p>
                                                                        {activeTimer && (
                                                                            <div className="px-1 py-0.5 rounded bg-white/5 text-[6px] font-black text-primary border border-primary/20 shrink-0">
                                                                                {activeTimer}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className={`text-[6px] font-black ${item.tipo === 'cita' ? 'text-slate-500' : item.tipo === 'bloqueo' ? 'text-red-500/50' : 'text-amber-500/50'} uppercase tracking-widest leading-none mt-0.5 truncate`}>
                                                                        {item.tipo === 'cita' ? item.data.servicio_nombre : item.tipo === 'almuerzo' ? 'DESCANSO' : (item.data.motivo || 'OCUPADO')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Quick Actions - Only for Citas */}
                                                            {item.tipo === 'cita' && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {item.data.estado === 'confirmada' && (
                                                                        <>
                                                                            <button
                                                                                onClick={(e) => handleAtenderClick(e, item.data)}
                                                                                className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/10 group"
                                                                                title="Atender"
                                                                            >
                                                                                <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('move'); }}
                                                                                className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all border border-white/5"
                                                                                title="Mover"
                                                                            >
                                                                                <RefreshCcw className="w-3 h-3 md:w-4 md:h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('cancel'); }}
                                                                                className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                                                                                title="Cancelar"
                                                                            >
                                                                                <X className="w-3 h-3 md:w-4 md:h-4" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedCita(item.data); setActiveModal('details'); }}
                                                                        className="w-6 h-6 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all border border-white/5"
                                                                    >
                                                                        <Info className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ) : (
                                                        <div className="h-px w-4 bg-white/5 ml-1" />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="shrink-0 bg-black/40 backdrop-blur-xl border-t border-white/5 p-3">
                <div className="flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,66,0.3)]" />
                        <span>Confirmada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                        <span>En Proceso</span>
                    </div>
                    <div className="flex items-center gap-2 hidden sm:flex">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]" />
                        <span>Por Cobrar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.1)]" />
                        <span>Finalizada</span>
                    </div>
                </div>
            </div>

            {/* Hidden Ghost Card to reuse Modals logic */}
            {selectedCita && (
                <div className="hidden">
                    <CitaCard
                        cita={selectedCita}
                        currentTime={currentTime}
                        allCitas={citas}
                        onUpdate={() => { setSelectedCita(null); setActiveModal(null); onUpdate?.(); }}
                        onClose={() => { setSelectedCita(null); setActiveModal(null); }}
                        autoOpen={activeModal}
                    />
                </div>
            )}

            {/* Aviso Anticipado Modal */}
            <Dialog open={showEarlyWarning} onOpenChange={(open) => { if (!open) { setShowEarlyWarning(false); setPendingCitaAction(null); } }}>
                <DialogContent className="bg-[#1A1D24] border-white/10 rounded-3xl max-w-sm p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                    <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/30 text-amber-500">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-lg font-black text-white uppercase tracking-wide">Cliente Anticipado</DialogTitle>
                        <DialogDescription className="text-sm font-light text-slate-300 leading-relaxed pt-2">
                            Este cliente llegó con <strong className="font-bold text-amber-500">más de 30 minutos</strong> de anticipación.
                            ¿Iniciar su corte de todas formas?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row gap-2 w-full mt-2">
                        <Button
                            variant="ghost"
                            onClick={() => { setShowEarlyWarning(false); setPendingCitaAction(null); }}
                            className="flex-1 h-12 bg-white/5 text-white/40 rounded-xl font-black uppercase tracking-widest text-[9px] border border-white/5 hover:bg-white/10"
                        >
                            Esperar
                        </Button>
                        <Button
                            onClick={confirmarAtencionTemprana}
                            className="flex-[2] h-12 bg-amber-500 text-black rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Play className="w-3 h-3 fill-current" />
                            Sí, atender ahora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Move Modal */}
            <Dialog open={!!proposedMove} onOpenChange={(open) => { if (!open) { setProposedMove(null); setCardResetKey(k => k + 1); } }}>
                <DialogContent className="bg-[#111216] border-primary/20 rounded-t-[2rem] sm:rounded-[2rem] p-0 overflow-hidden shadow-2xl max-w-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-600" />

                    <div className="p-6">
                        <DialogHeader className="flex flex-row items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shrink-0">
                                <RefreshCcw className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-base font-black text-white uppercase tracking-tight">¿Confirmar Movimiento?</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-white/40">
                                    {proposedMove?.cita.cliente_nombre}
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        {displayMove && (
                            <div className="bg-white/5 rounded-2xl border border-white/5 p-5 mb-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">De</p>
                                        <p className="text-lg font-black text-white/40 line-through">
                                            {new Date(displayMove.cita.timestamp_inicio).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <ArrowRight className="text-primary w-5 h-5" />
                                    </div>
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">A</p>
                                        <p className="text-lg font-black text-primary">
                                            {new Date(displayMove.newStartTime).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-[11px] font-medium text-slate-400 mb-6 leading-relaxed text-center">
                            El servicio mantendrá su duración original.
                        </p>

                        <DialogFooter className="flex flex-row gap-3 w-full">
                            <Button
                                variant="ghost"
                                onClick={() => { setProposedMove(null); setCardResetKey(k => k + 1) }}
                                className="flex-1 h-14 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/5 hover:bg-white/10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmarMoverCita}
                                className="flex-[2] h-14 bg-gradient-to-r from-primary to-amber-600 text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_10px_30px_rgba(245,200,66,0.2)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Confirmar y Mover
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
})
