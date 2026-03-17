'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    BarChart3,
    Settings,
    Image as ImageIcon,
    LogOut,
    Bell,
    BellRing,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    UserPlus,
    CheckCircle2,
    X,
    Volume2,
    VolumeX,
    LayoutDashboard,
    Scissors,
    History,
    AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import type { CitaDesdeVista } from '@/lib/types'
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// Heavy components loaded dynamically for better mobile performance
const AgendaSemanalMensual = dynamic(() => import('@/components/AgendaSemanalMensual').then(mod => mod.AgendaSemanalMensual), {
    loading: () => <div className="p-8 flex justify-center"><div className="spinner w-8 h-8 border-slate-700 border-t-primary" /></div>
})

const TabletNuevaCitaModal = dynamic(() => import('@/components/TabletNuevaCitaModal').then(mod => mod.TabletNuevaCitaModal), {
    ssr: false
})


export default function TabletDashboard() {
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const [barbero, setBarbero] = useState<any>(null)
    const [citas, setCitas] = useState<any[]>([])
    const citasRef = useRef<any[]>([]) // Stable ref to avoid stale closure in cargarAgenda
    const [loading, setLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState<Date | null>(null)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)

    const [newApptAlert, setNewApptAlert] = useState<{ show: boolean, clientName: string }>({ show: false, clientName: '' })
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isAudioInitialized, setIsAudioInitialized] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    // Agenda states
    const [vistaAgenda, setVistaAgenda] = useState<'hoy' | 'semana' | 'mes' | 'dia'>('hoy')
    const [fechaAgenda, setFechaAgenda] = useState<string>("") // Hydrated in useEffect
    const [citasAgenda, setCitasAgenda] = useState<CitaDesdeVista[]>([])
    const [bloqueosAgenda, setBloqueosAgenda] = useState<any[]>([])
    const [almuerzoBarbero, setAlmuerzoBarbero] = useState<any>(null)
    const [sucursal, setSucursal] = useState<any>(null)
    const [loadingAgenda, setLoadingAgenda] = useState(false)
    const lastTapAgenda = useRef<number>(0)
    const datePickerRef = useRef<HTMLInputElement>(null)
    const [citasPasadasPendientes, setCitasPasadasPendientes] = useState<number>(0)

    // Keep citasRef in sync for stale-closure-safe comparisons (Vercel: advanced-event-handler-refs)
    useEffect(() => { citasRef.current = citas }, [citas])

    const shiftFechaAgenda = (days: number) => {
        const d = new Date(`${fechaAgenda}T12:00:00-07:00`)
        d.setDate(d.getDate() + days)
        setFechaAgenda(d.toLocaleDateString('en-CA'))
        setVistaAgenda('dia')
    }

    const getRelativeDateLabel = (dateStr: string) => {
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())
        if (dateStr === hoy) return 'Hoy'

        const target = new Date(`${dateStr}T12:00:00-07:00`)
        const hoyObj = new Date(`${hoy}T12:00:00-07:00`)
        const diffTime = target.getTime() - hoyObj.getTime()
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

        if (diffDays === 1) return 'Mañana'
        if (diffDays === -1) return 'Ayer'

        // Formato: "Jueves 12 mar"
        return target.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '').replace(',', '')
    }

    const handleDoubleTapAgenda = () => {
        const now = Date.now()
        if (now - lastTapAgenda.current < 300) {
            setFechaAgenda(new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date()))
            setVistaAgenda('hoy')
        }
        lastTapAgenda.current = now
    }

    // Auto-Reset to Today logic (10s idle)
    useEffect(() => {
        if (fechaAgenda === new Date().toLocaleDateString('en-CA')) return

        const timer = setTimeout(() => {
            setFechaAgenda(new Date().toLocaleDateString('en-CA'))
            setVistaAgenda('hoy')
        }, 10000)

        const resetTimer = () => {
            clearTimeout(timer)
            // Re-start logic would happen on next render if date still != today
        }

        window.addEventListener('mousedown', resetTimer)
        window.addEventListener('touchstart', resetTimer)
        window.addEventListener('keydown', resetTimer)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('mousedown', resetTimer)
            window.removeEventListener('touchstart', resetTimer)
            window.removeEventListener('keydown', resetTimer)
        }
    }, [fechaAgenda])

    const supabase = createClient()

    // Initialize Audio automatically on mount (no user tap required)
    const initializeAudio = useCallback(() => {
        if (isAudioInitialized || !audioRef) return
        try {
            const audio = new Audio('/notification/notification.mp3')
            audio.volume = 0.5
            audioRef.current = audio
            audio.play().then(() => {
                audio.pause()
                audio.currentTime = 0
                setIsAudioInitialized(true)
            }).catch(() => setIsAudioInitialized(true)) // mark initialized even if blocked
        } catch { setIsAudioInitialized(true) }
    }, [isAudioInitialized])

    // Persist sound preference to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sound_enabled')
        if (saved !== null) setSoundEnabled(saved === 'true')
        // Try to init audio silently on mount
        initializeAudio()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleSound = useCallback((val: boolean) => {
        setSoundEnabled(val)
        localStorage.setItem('sound_enabled', String(val))
    }, [])

    // Unified Hydration & Auth/SWR Sync
    useEffect(() => {
        const syncSessionAndData = async () => {
            console.log('🔄 Initializing session sync...')

            // 1. Initial hydration (browser only)
            const sessionStr = localStorage.getItem('barbero_session')
            let currentBarbero = barbero

            if (sessionStr && !currentBarbero) {
                try {
                    currentBarbero = JSON.parse(sessionStr)
                    console.log('📦 Hydrated session from localStorage:', currentBarbero?.nombre)
                    setBarbero(currentBarbero)
                } catch (e) {
                    console.error('❌ Failed to parse session:', e)
                    localStorage.removeItem('barbero_session')
                }
            }

            // Also hydrate citas and dates
            const cachedCitas = localStorage.getItem('cached_dashboard_citas')
            if (cachedCitas) setCitas(JSON.parse(cachedCitas))

            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            setFechaAgenda(hoy)
            setCurrentTime(new Date())
            setIsMounted(true)

            // 2. Auth Check: If NO session in state OR localStorage -> REDIRECT
            if (!currentBarbero?.id) {
                console.warn('⚠️ No barbero ID found after hydration. Expelling...')
                router.replace('/tablet/login')
                return
            }

            // 3. SWR: Validate against Supabase
            try {
                console.log('📡 Validating session with Supabase...', currentBarbero.id)
                const { data, error } = await supabase
                    .from('barberos')
                    .select('id, activo, nombre, estacion_id')
                    .eq('id', currentBarbero.id)
                    .single() as { data: any, error: any }

                if (error || !data) {
                    console.error('❌ Session validation failed (Network or Not Found):', error)
                    // If it's a "Not Found" error (406 or similar), expel. 
                    // If it's a network error, maybe allow temporary offline access?
                    // For now, if we can't find the barbero, we expel for security.
                    if (error?.code !== 'PGRST116') { // PGRST116 is single() not found
                        localStorage.removeItem('barbero_session')
                        router.replace('/tablet/login')
                        return
                    }
                }

                if (data && !data.activo) {
                    console.warn('🚫 Barbero account is inactive. Expelling...')
                    localStorage.removeItem('barbero_session')
                    router.replace('/tablet/login')
                    return
                }

                // Update cache if changed
                if (data) {
                    const hasChanged = data.nombre !== currentBarbero.nombre ||
                        data.estacion_id !== currentBarbero.estacion_id ||
                        data.activo !== currentBarbero.activo

                    if (hasChanged) {
                        const mergedBarbero = { ...currentBarbero, ...data }
                        setBarbero(mergedBarbero)
                        localStorage.setItem('barbero_session', JSON.stringify(mergedBarbero))
                        console.log('✨ Session cache updated with fresh DB data')
                    }
                }

                // SUCCESS: Only now we allow the dashboard to show
                console.log('✅ Session verified. Welcome!')

                // Fetch sucursal data if available
                if (currentBarbero.sucursal_id) {
                    const { data: sucursalData } = await supabase
                        .from('sucursales')
                        .select('*')
                        .eq('id', currentBarbero.sucursal_id)
                        .single()
                    if (sucursalData) {
                        setSucursal(sucursalData)
                    }
                }

                setIsCheckingAuth(false)

            } catch (err) {
                console.error('🔥 Critical auth sync error:', err)
                // In case of unknown error, we stay in loading or expel depending on severity.
                // For mobile robustness, if we already have a session, we'll try to let them in.
                setIsCheckingAuth(false)
            }
        }

        syncSessionAndData()
    }, [router, supabase])

    const checkPastPending = useCallback(async (barberoId: string) => {
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())
        
        const { count, error } = await supabase
            .from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('barbero_id', barberoId)
            .lt('fecha_cita_local', hoy)
            .not('estado', 'in', '("finalizada","cancelada","no_show")')
            
        if (!error && count !== null) {
            setCitasPasadasPendientes(count)
        }
    }, [supabase])

    useEffect(() => {
        if (barbero?.id) {
            checkPastPending(barbero.id)
        }
    }, [barbero?.id, checkPastPending])

    const cargarAgenda = useCallback(async (isInitialLoad = false) => {
        if (!barbero?.id) return

        if (isInitialLoad) setLoading(true)
        // Vercel client-swr-dedup: only show skeleton on initial load,
        // background refreshes (from onUpdate) should be transparent to the user
        if (isInitialLoad) setLoadingAgenda(true)

        const syncTimelineDate = fechaAgenda
        const syncVista = vistaAgenda

        // Calculate date range
        let startStr = syncTimelineDate
        let endStr = syncTimelineDate

        const d = new Date(`${syncTimelineDate}T12:00:00-07:00`)
        if (syncVista === 'semana') {
            const dayNum = d.getDay()
            const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1)
            const startD = new Date(d.setDate(diff))
            startStr = startD.toLocaleDateString('en-CA')
            const endD = new Date(startD)
            endD.setDate(endD.getDate() + 6)
            endStr = endD.toLocaleDateString('en-CA')
        } else if (syncVista === 'mes') {
            const starD = new Date(d.getFullYear(), d.getMonth(), 1)
            startStr = starD.toLocaleDateString('en-CA')
            const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
            endStr = endD.toLocaleDateString('en-CA')
        }

        try {
            console.log(`📡 Fetching data for [${syncVista}] range: ${startStr} to ${endStr}`)
            const [citasRes, bloqueosRes, barberoRes] = await Promise.all([
                supabase
                    .from('vista_citas_app')
                    .select('*')
                    .eq('barbero_id', barbero.id)
                    .gte('fecha_cita_local', startStr)
                    .lte('fecha_cita_local', endStr)
                    .neq('estado', 'cancelada')
                    .order('timestamp_inicio_local', { ascending: true }),
                supabase
                    .from('bloqueos')
                    .select('*')
                    .eq('barbero_id', barbero.id)
                    .gte('fecha_inicio', `${startStr}T00:00:00-07:00`)
                    .lte('fecha_inicio', `${endStr}T23:59:59-07:00`),
                supabase
                    .from('barberos')
                    .select('bloqueo_almuerzo')
                    .eq('id', barbero.id)
                    .single()
            ])

            if (citasRes.error) throw citasRes.error
            if (bloqueosRes.error) throw bloqueosRes.error

            const citasData = (citasRes.data as CitaDesdeVista[]) || []
            setCitasAgenda(citasData)
            setBloqueosAgenda(bloqueosRes.data || [])
            setAlmuerzoBarbero((barberoRes.data as any)?.bloqueo_almuerzo || null)

            // UNIFICATION: Update the summary "citas" (Today) if relevant
            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            if (startStr <= hoy && endStr >= hoy) {
                const totalHoy = (syncVista === 'hoy' || syncVista === 'dia') && syncTimelineDate === hoy
                    ? citasData
                    : citasData.filter(c => c.fecha_cita_local === hoy)

                // Only update if actually different to prevent unnecessary re-renders (SWR)
                if (JSON.stringify(totalHoy) !== JSON.stringify(citasRef.current)) {
                    setCitas(totalHoy)
                    localStorage.setItem('cached_dashboard_citas', JSON.stringify(totalHoy))
                }
            }
        } catch (err: any) {
            // Supabase errors are non-serializable objects, extract message directly
            const errMsg = err?.message ?? err?.error_description ?? JSON.stringify(err) ?? 'Unknown error'
            const errCode = err?.code ?? err?.status ?? 'N/A'
            const errHint = err?.hint ?? ''
            console.error(`❌ Error loading dashboard data: [${errCode}] ${errMsg} ${errHint ? '- Hint: ' + errHint : ''}`)
        } finally {
            setLoadingAgenda(false)
            setLoading(false)
        }
    }, [supabase, barbero, vistaAgenda, fechaAgenda]) // citas intentionally excluded to avoid infinite loop

    // Specific refresh for today only (useful for inserts/SWR)
    const cargarCitas = useCallback(async () => {
        await cargarAgenda(false)
    }, [cargarAgenda])

    useEffect(() => {
        if (barbero) cargarAgenda(true)
    }, [cargarAgenda]) // cargarAgenda already captures barbero/vistaAgenda/fechaAgenda

    useEffect(() => {
        if (!barbero) return

        const channel = supabase
            .channel(`citas-barbero-${barbero.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${barbero.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newCita = payload.new as any
                    if (audioRef.current && soundEnabled) audioRef.current.play().catch(e => console.log('Audio playback failed:', e))
                    setNewApptAlert({ show: true, clientName: newCita.cliente_nombre || 'Nuevo Cliente' })
                    setTimeout(() => setNewApptAlert(prev => ({ ...prev, show: false })), 5000)
                }
                cargarAgenda()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [cargarAgenda, supabase, barbero])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const totalDinero = useMemo(() => citas
        .filter(c => c.estado === 'finalizada')
        .reduce((acc, current) => acc + (current.monto_pagado ?? current.servicio_precio ?? 0), 0), [citas])

    const citasPendientes = useMemo(() => citas.filter(c => ['confirmada', 'en_espera', 'en_proceso', 'por_cobrar'].includes(c.estado)), [citas])
    const citaEnProceso = useMemo(() => citas.find(c => c.estado === 'en_proceso' || c.estado === 'por_cobrar'), [citas])
    const totalServicios = useMemo(() => citas.filter(c => c.estado === 'finalizada').length, [citas])
    const citasSiguientes = useMemo(() => citasPendientes.filter((c: CitaDesdeVista) => c.estado !== 'en_proceso' && c.estado !== 'por_cobrar'), [citasPendientes])
    const [showMobileAppointments, setShowMobileAppointments] = useState(false)
    const [isNewCitaModalOpen, setIsNewCitaModalOpen] = useState(false)

    // If we have NO barbero and we are checking auth, we will redirect soon.
    // Don't show the heavy skeleton to avoid "flash" if not logged in.
    if (isCheckingAuth && !barbero) {
        return <div className="min-h-screen bg-[#0A0C12]" />
    }

    if (!isMounted || isCheckingAuth) {
        return (
            <div className="min-h-screen bg-[#0A0C12] flex flex-col items-center justify-center p-6 text-center space-y-12 overflow-hidden relative">
                <div className="absolute inset-0 z-0 bg-radial-at-t from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative z-10 animate-scale-in flex flex-col items-center">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-black border border-white/10 flex items-center justify-center mb-10 mx-auto shadow-[0_0_60px_rgba(245,200,66,0.05)] relative group">
                        <div className="absolute inset-0 rounded-[2.5rem] border border-primary animate-ping opacity-20" />
                        <span className="text-4xl md:text-5xl font-black text-primary font-display relative z-10">CB</span>
                    </div>
                    <div className="space-y-6 max-w-xs transition-all duration-1000">
                        <div className="space-y-2">
                            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.2em] font-display">Cholo Barbershop</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Panel del Barbero</p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-48 md:w-56 h-1 bg-white/5 rounded-full overflow-hidden p-0 relative">
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em]">Sincronizando sistema</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!barbero) return null

    return (
        <div className="h-[100dvh] bg-[#0A0C12] text-white flex flex-col overflow-hidden font-sans relative selection:bg-primary selection:text-black">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 bg-radial-at-tl from-primary/5 via-transparent to-transparent opacity-60"></div>
            <div className="absolute inset-0 z-0 bg-radial-at-br from-blue-500/5 via-transparent to-transparent opacity-40"></div>
            <div className="absolute inset-0 z-0 vignette-overlay opacity-50"></div>

            {newApptAlert.show && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-24 right-6 z-[99999] pointer-events-none"
                >
                    <div className="bg-black/80 backdrop-blur-2xl border border-primary/50 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,200,66,0.1)] flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 relative">
                            <BellRing className="w-6 h-6 text-primary animate-bounce" />
                            <div className="absolute inset-0 rounded-2xl border border-primary animate-ping opacity-20" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Nueva Cita</span>
                            <span className="text-lg font-black tracking-tight text-white uppercase leading-tight">{newApptAlert.clientName}</span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Sincronizado ahora</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            {/* Audio Init Banner REMOVED — auto-initializes on mount */}

            <header className="bg-black/60 backdrop-blur-3xl border-b border-white/5 px-4 md:px-8 py-3 md:py-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] shrink-0 z-50 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/30 to-amber-600/30 opacity-30" />

                <div className="flex items-start justify-between max-w-[1920px] mx-auto gap-3">

                    {/* LEFT: Logo + Name/Icons + Badges */}
                    <div className="flex items-start gap-2 md:gap-4 group">
                        <div className="relative scale-75 md:scale-90 mt-1 hidden sm:block">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg group-hover:bg-primary/10 transition-all duration-700" />
                            <div className="relative inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden group-hover:border-white/20 transition-colors duration-500">
                                <span className="text-xl md:text-2xl font-black text-primary font-display relative z-10 transition-transform group-hover:scale-105">CB</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 md:gap-3 animate-slide-in">
                            {/* Row 1: Name */}
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg md:text-2xl font-black text-white tracking-tight uppercase font-display truncate max-w-[150px] md:max-w-none leading-none">
                                    {barbero?.nombre.split(' ')[0] || 'Barbero'}
                                </h1>
                                <div className="h-1 w-8 bg-primary/20 rounded-full hidden md:block" />
                            </div>

                            {/* Row 2: Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-2 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,66,0.6)]" />
                                    <span className="text-[12px] md:text-xs font-black uppercase tracking-widest">{citasPendientes.length} P</span>
                                </Badge>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 px-2 py-1 gap-2 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    <span className="text-[12px] md:text-xs font-black uppercase tracking-widest">{citas.filter(c => c.estado === 'finalizada').length} C</span>
                                </Badge>
                                <Badge variant="outline" className="bg-white/5 text-white/70 border-white/15 px-3 py-1 rounded-lg">
                                    <span className="text-[14px] md:text-xs font-black uppercase tracking-widest">${totalDinero}</span>
                                </Badge>
                                {citasPasadasPendientes > 0 && (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 px-3 py-1 gap-2 rounded-lg animate-pulse">
                                        <History className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{citasPasadasPendientes} pendientes ayer</span>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Desktop summary + clock */}
                    <div className="flex items-center gap-3 md:gap-6 shrink-0 mt-2">
                        {/* Summary */}
                        <div className="hidden lg:flex items-center gap-8 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
                            <div className="flex gap-4 md:gap-8 mr-auto">
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Servicios</p>
                                    <div className="flex items-center gap-1 justify-center">
                                        <span className="text-sm font-black text-white leading-none font-display">{totalServicios}</span>
                                        <span className="text-[7px] text-white/20 font-bold">/ {citas.length}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Caja Hoy</p>
                                    <p className="text-sm font-black text-primary leading-none font-display tracking-tight">${totalDinero}</p>
                                </div>
                            </div>
                        </div>

                        {/* Clock */}
                        <div className="text-right hidden sm:block">
                            <p className="text-sm md:text-base font-black text-white tabular-nums tracking-tighter font-display leading-none">
                                {currentTime ? currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '--:--'}
                            </p>
                            <p className="text-[6px] md:text-[7px] text-white/20 font-black uppercase tracking-[0.3em] mt-1">Estación #{barbero?.estacion_id || '0'}</p>
                        </div>

                        {/* Action Icons — FAR RIGHT */}
                        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-white/10">
                            <Button
                                size="icon"
                                onClick={() => setIsNewCitaModalOpen(true)}
                                className="w-8 h-8 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-none"
                                title="Nueva Cita"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Link
                                href="/tablet/reportes"
                                title="Métricas"
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "w-8 h-8 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 shadow-none p-0 flex items-center justify-center"
                                )}
                            >
                                <BarChart3 className="w-4 h-4" />
                            </Link>
                            <Button
                                size="icon"
                                onClick={() => setShowSettings(true)}
                                className="w-8 h-8 bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white shadow-none"
                                title="Configuración"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                            <Link
                                href="/tablet/galeria"
                                title="Galería"
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "w-8 h-8 bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 shadow-none p-0 flex items-center justify-center"
                                )}
                            >
                                <ImageIcon className="w-4 h-4" />
                            </Link>
                            <Button
                                size="icon"
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-8 h-8 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-none"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-0 lg:p-3 xl:p-4 relative z-10 flex flex-col">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-3 xl:gap-4 max-w-[2000px] mx-auto w-full">

                    {/* Column 1: Timeline (Left on Desktop, Main on Mobile) */}
                    <div className={`lg:col-span-8 h-full flex flex-col min-h-0 relative ${showMobileAppointments ? 'hidden lg:flex' : 'flex'}`}>
                        {/* Desktop Header for Timeline and Mobile View Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0 px-2 lg:px-0">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-6 bg-primary/20 rounded-full" />
                                <h2 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] font-display">Cronograma General</h2>
                            </div>

                            {/* View Switcher Controls - Optimized for no-scroll */}
                            <div className="flex items-center gap-1 w-full sm:w-auto">
                                <div
                                    onClick={handleDoubleTapAgenda}
                                    className={cn(
                                        "flex items-center bg-white/5 rounded-xl border transition-all h-[34px] overflow-hidden group/nav shrink-0",
                                        vistaAgenda === 'hoy' || vistaAgenda === 'dia' ? 'border-primary/30 bg-primary/5' : 'border-white/5'
                                    )}
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); shiftFechaAgenda(-1); }}
                                        className="w-7 h-full text-white/20 hover:text-primary hover:bg-white/5 transition-colors shrink-0 rounded-none shadow-none"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </Button>

                                    <div className="px-2 flex flex-col items-center justify-center min-w-[55px] sm:min-w-[70px] select-none shrink-0 cursor-pointer">
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest leading-none",
                                            (vistaAgenda === 'hoy' || vistaAgenda === 'dia') ? 'text-primary' : 'text-white/40'
                                        )}>
                                            {getRelativeDateLabel(fechaAgenda)}
                                        </span>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); shiftFechaAgenda(1); }}
                                        className="w-7 h-full text-white/20 hover:text-primary hover:bg-white/5 transition-colors shrink-0 rounded-none shadow-none"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </Button>
                                </div>

                                <Button
                                    onClick={() => setVistaAgenda('semana')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors h-[34px] flex items-center shrink-0 shadow-none border",
                                        vistaAgenda === 'semana' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                    )}
                                >
                                    Semana
                                </Button>
                                <Button
                                    onClick={() => setVistaAgenda('mes')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors h-[34px] flex items-center shrink-0 shadow-none border",
                                        vistaAgenda === 'mes' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                    )}
                                >
                                    Mes
                                </Button>

                                <div
                                    onClick={() => datePickerRef.current?.showPicker()}
                                    className="relative flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors rounded-lg border border-white/5 w-[34px] h-[34px] cursor-pointer group/cal shrink-0"
                                >
                                    <CalendarIcon className="w-3 h-3 text-white/30 group-hover/cal:text-primary transition-colors" />
                                    <input
                                        ref={datePickerRef}
                                        type="date"
                                        value={fechaAgenda}
                                        onChange={(e) => { setFechaAgenda(e.target.value); setVistaAgenda('dia') }}
                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* The Calendar View */}
                        <div className="flex-1 bg-black/40 lg:border border-white/5 lg:shadow-[0_20px_60px_rgba(0,0,0,0.5)] lg:rounded-[1.5rem] overflow-hidden relative backdrop-blur-3xl group transition-all duration-700 hover:border-white/10">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-gold opacity-10" />
                            {loadingAgenda ? (
                                <div className="flex flex-col w-full h-full p-6 space-y-4 animate-pulse">
                                    <div className="h-8 w-1/3 bg-white/5 rounded-xl ml-auto" />
                                    <div className="flex-1 border border-white/5 rounded-2xl bg-white/[0.02]" />
                                    <div className="h-10 w-full bg-white/5 rounded-xl" />
                                </div>
                            ) : (
                                <div className="w-full h-full animate-fade-in relative z-10 flex flex-col">
                                    {(vistaAgenda === 'hoy' || vistaAgenda === 'dia') ? (
                                        <AgendaTimeline
                                            citas={citasAgenda}
                                            bloqueos={bloqueosAgenda}
                                            almuerzoBarbero={almuerzoBarbero}
                                            horarioSucursal={sucursal?.horario_apertura}
                                            currentTime={currentTime!}
                                            fechaBase={fechaAgenda}
                                            barbero={barbero}
                                            onUpdate={() => cargarAgenda()}
                                        />
                                    ) : (
                                        <div className="p-4 pt-6 h-full overflow-y-auto custom-scrollbar">
                                            <AgendaSemanalMensual citas={citasAgenda} bloqueos={bloqueosAgenda} almuerzoBarbero={almuerzoBarbero} fecha={fechaAgenda} vista={vistaAgenda} onUpdate={() => cargarAgenda()} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mobile Floating Action Buttons (FAB) */}
                        <div className="lg:hidden fixed bottom-24 right-5 z-[100] flex flex-col gap-4">
                            {/* Añadir cita Walk-in */}
                            <Button
                                size="icon"
                                onClick={() => setIsNewCitaModalOpen(true)}
                                className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-xl border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-primary hover:bg-black/80 hover:border-primary/40"
                            >
                                <UserPlus className="w-6 h-6" />
                            </Button>
                            {/* Ver agenda listado */}
                            <div className="relative">
                                <Button
                                    size="icon"
                                    onClick={() => setShowMobileAppointments(true)}
                                    className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-primary hover:bg-black/60 hover:border-primary/30"
                                >
                                    <List className="w-6 h-6" />
                                </Button>
                                {citasSiguientes.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black rounded-full flex items-center justify-center text-[9px] font-black border-2 border-black pointer-events-none">
                                        {citasSiguientes.length}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Dashboard/Sidebar (Right on Desktop, Secondary on Mobile) */}
                    <div className={`lg:col-span-4 flex flex-col h-full min-h-0 relative transition-all duration-500 ${showMobileAppointments ? 'translate-y-0 opacity-100 z-50' : 'hidden lg:flex'}`}>
                        {/* Mobile Overlay Header */}
                        <div className="lg:hidden flex items-center justify-between p-6 bg-black/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[60]">
                            <div className="flex items-center gap-4">
                                <div className="h-1 w-6 bg-primary rounded-full" />
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] font-display">Agenda del Día</h2>
                            </div>
                            <button onClick={() => setShowMobileAppointments(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 lg:p-0 custom-scrollbar space-y-4 lg:space-y-6 pb-24 lg:pb-4 bg-black/40 lg:bg-transparent min-h-0 relative overflow-x-hidden">
                            {/* Current Appointment - Condensed for Sidebar */}
                            {citaEnProceso && (
                                <div className="animate-slide-in relative group">
                                    <div className="flex items-center gap-4 mb-4 lg:mb-5">
                                        <div className="h-1 w-6 lg:w-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <h2 className="text-[9px] lg:text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] font-display">Atendiendo Ahora</h2>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-emerald-500/5 rounded-[2.5rem] lg:rounded-[3rem] blur-2xl opacity-40 pointer-events-none" />
                                        <CitaCard
                                            cita={citaEnProceso}
                                            onUpdate={cargarCitas}
                                            isHighlighted
                                            currentTime={currentTime!}
                                            allCitas={citasAgenda}
                                            bloqueos={bloqueosAgenda}
                                            almuerzoBarbero={almuerzoBarbero}
                                            horarioSucursal={sucursal}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Appointments List */}
                            <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-4 lg:mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 w-6 lg:w-8 bg-white/10 rounded-full" />
                                        <h2 className="text-[9px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-display">Próximas Citas ({citasSiguientes.length})</h2>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="bg-white/5 p-8 flex flex-col items-center justify-center border border-white/5 rounded-[2rem] shadow-2xl backdrop-blur-sm">
                                        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] animate-pulse">Actualizando...</p>
                                    </div>
                                ) : citasSiguientes.length === 0 ? (
                                    <div className="bg-white/2 p-10 text-center border border-white/5 shadow-2xl rounded-[2rem] group transition-all duration-700">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5 text-white/10 shadow-inner">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <p className="text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">Sin más citas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 lg:gap-4">
                                        {citasSiguientes.map((cita: CitaDesdeVista, index: number) => (
                                            <div key={`cita-next-${cita.id || index}`} className="animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                                                <CitaCard
                                                    cita={cita}
                                                    onUpdate={cargarCitas}
                                                    currentTime={currentTime!}
                                                    allCitas={citasAgenda}
                                                    bloqueos={bloqueosAgenda}
                                                    almuerzoBarbero={almuerzoBarbero}
                                                    horarioSucursal={sucursal}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Nueva Cita */}
            <TabletNuevaCitaModal
                isOpen={isNewCitaModalOpen}
                onClose={() => setIsNewCitaModalOpen(false)}
                barberoId={barbero.id}
                sucursalId={barbero.sucursal_id || ''}
                horarioSucursalProps={sucursal?.horario_apertura}
                citasDelDia={citas}
                onCitaCreada={() => cargarAgenda()}
            />

            {/* Settings Dialog */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="bg-[#111216] border-white/10 p-0 overflow-hidden shadow-2xl max-w-sm rounded-t-[2rem] sm:rounded-[2rem]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-600" />

                    <div className="p-6">
                        <DialogHeader className="flex flex-row items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-base font-black text-white uppercase tracking-tight">Configuración</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-white/30">Preferencias del sistema</DialogDescription>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Notificaciones</p>
                                <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                                                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white leading-tight">Sonido de alerta</p>
                                                <p className="text-[10px] text-white/40">Al agendar una nueva cita</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={soundEnabled}
                                            onCheckedChange={toggleSound}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8">
                            <Button
                                onClick={() => setShowSettings(false)}
                                className="w-full h-14 bg-white/5 text-white/60 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/5 hover:bg-white/10"
                            >
                                Listo
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Logout Confirm Dialog */}
            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="bg-[#111216] border-red-500/20 p-0 overflow-hidden shadow-2xl max-w-sm rounded-[2rem]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />

                    <div className="p-8">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 mx-auto mb-6">
                            <LogOut className="w-8 h-8" />
                        </div>

                        <DialogHeader className="text-center mb-6">
                            <DialogTitle className="text-lg font-black text-white uppercase tracking-tight text-center">¿Cerrar Sesión?</DialogTitle>
                            <DialogDescription className="text-xs text-white/40 text-center leading-relaxed mt-2">
                                Se eliminará la sesión local. Necesitarás ingresar tu acceso nuevamente.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 h-12 bg-white/5 text-white/40 rounded-xl font-black uppercase tracking-widest text-[9px] border border-white/5 hover:bg-white/10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => { localStorage.removeItem('barbero_session'); router.replace('/tablet/login'); }}
                                className="flex-[2] h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-[0_4px_12px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Sí, salir
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
