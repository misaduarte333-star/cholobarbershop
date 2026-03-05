'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import type { CitaDesdeVista } from '@/lib/types'

export default function TabletDashboard() {
    const router = useRouter()
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [barbero, setBarbero] = useState<{ id: string, nombre: string, estacion_id: number | null } | null>(null)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)

    const [newApptAlert, setNewApptAlert] = useState<{ show: boolean, clientName: string }>({ show: false, clientName: '' })
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isAudioInitialized, setIsAudioInitialized] = useState(false)

    const supabase = createClient()

    // Initialize Audio logic
    const initializeAudio = useCallback(() => {
        if (isAudioInitialized) return
        try {
            const audio = new Audio('/notification/notification.mp3')
            audio.volume = 0.5
            audioRef.current = audio
            // Dummy play to "unlock" audio in browser
            audio.play().then(() => {
                audio.pause()
                audio.currentTime = 0
                setIsAudioInitialized(true)
                console.log('🔊 Audio system initialized by user.')
            }).catch(e => console.log('Audio init failed:', e))
        } catch (e) {
            console.error('Error initializing audio:', e)
        }
    }, [isAudioInitialized])

    // Auth Check
    useEffect(() => {
        const sessionStr = localStorage.getItem('barbero_session')
        if (!sessionStr) {
            router.push('/tablet/login')
        } else {
            try {
                const session = JSON.parse(sessionStr)
                setBarbero(session)
            } catch {
                router.push('/tablet/login')
            }
        }
        setIsCheckingAuth(false)
    }, [router])

    const cargarCitas = useCallback(async (isInitialLoad = false) => {
        if (!barbero?.id) return
        if (isInitialLoad) setLoading(true)

        const hoyLocal = new Date().toLocaleDateString('en-CA')

        try {
            const { data, error } = await supabase
                .from('vista_citas_agente')
                .select('*')
                .eq('barbero_id', barbero.id)
                .eq('fecha_cita_local', hoyLocal)
                .neq('estado', 'cancelada')
                .order('timestamp_inicio', { ascending: true })

            if (error) throw error
            setCitas(data || [])
        } catch (err) {
            console.error('Error loading appointments:', err)
        } finally {
            if (isInitialLoad) setLoading(false)
        }
    }, [supabase, barbero])

    useEffect(() => {
        if (!barbero) return
        cargarCitas(true)
        const channel = supabase
            .channel(`citas-barbero-${barbero.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${barbero.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newCita = payload.new as any

                    // Trigger sound & banner
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log('Audio playback failed:', e))
                    }

                    setNewApptAlert({ show: true, clientName: newCita.cliente_nombre || 'Nuevo Cliente' })
                    setTimeout(() => setNewApptAlert(prev => ({ ...prev, show: false })), 5000)
                }
                cargarCitas()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [cargarCitas, supabase, barbero])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const totalDinero = citas
        .filter(c => c.estado === 'finalizada')
        .reduce((acc, current) => acc + (current.monto_pagado ?? current.servicio_precio ?? 0), 0)

    const citasPendientes = citas.filter(c => ['confirmada', 'en_espera', 'en_proceso'].includes(c.estado))
    const citaEnProceso = citas.find(c => c.estado === 'en_proceso')
    const citasSiguientes = citasPendientes.filter(c => c.estado !== 'en_proceso')

    const [showMobileAppointments, setShowMobileAppointments] = useState(false)

    if (isCheckingAuth) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner w-12 h-12 border-slate-700 border-t-primary" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse font-display">Iniciando Estación...</p>
                </div>
            </div>
        )
    }

    if (!barbero) return null

    return (
        <div
            onClick={initializeAudio}
            className="h-[100dvh] flex flex-col bg-[#050608] text-white overflow-hidden relative selection:bg-primary selection:text-black"
        >
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-shop-premium opacity-10 scale-110"></div>
            <div className="absolute inset-0 z-0 vignette-overlay opacity-50"></div>

            {newApptAlert.show && (
                <motion.div
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.9 }}
                    className="fixed top-24 right-6 z-[99999] pointer-events-none"
                >
                    <div className="bg-black/80 backdrop-blur-2xl border-2 border-primary/50 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(234,179,8,0.2)] flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 shadow-[0_0_15px_rgba(234,179,8,0.3)] relative">
                            <span className="material-icons-round text-primary text-2xl animate-bounce">notifications_active</span>
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Nueva Cita Agendada</span>
                            <span className="text-lg font-black font-display tracking-tight text-white uppercase leading-tight">{newApptAlert.clientName}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest">Ver en lista</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Audio Init Indicator */}
            {!isAudioInitialized && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                >
                    <div className="bg-primary/10 backdrop-blur-md border border-primary/20 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl">
                        <span className="material-icons-round text-primary text-sm">volume_up</span>
                        <span className="text-[9px] font-black text-primary/80 uppercase tracking-widest">Toca cualquier parte para activar sonidos</span>
                    </div>
                </motion.div>
            )}

            <header className="bg-black/60 backdrop-blur-3xl border-b border-white/5 px-4 md:px-8 py-3 md:py-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] shrink-0 z-50 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-gold opacity-30" />

                <div className="flex items-center justify-between max-w-[1920px] mx-auto">
                    <div className="flex items-center gap-2 md:gap-6 group">
                        <div className="relative scale-75 md:scale-90 hidden sm:block">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg group-hover:bg-primary/10 transition-all duration-700" />
                            <div className="relative inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden group-hover:border-white/20 transition-colors duration-500">
                                <span className="text-xl md:text-2xl font-black text-primary font-display relative z-10 transition-transform group-hover:scale-105">CB</span>
                            </div>
                        </div>
                        <div className="animate-slide-in">
                            <div className="flex flex-col items-start leading-none">
                                <h1 className="text-lg md:text-2xl font-black text-white tracking-tight uppercase font-display truncate max-w-[100px] md:max-w-none">
                                    {barbero?.nombre.split(' ')[0] || 'Barbero'}
                                </h1>
                                <div className="mt-1 md:mt-3 flex flex-wrap items-center gap-1.5 md:gap-2">
                                    <div className="flex items-center gap-1 md:gap-2 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-primary/5 rounded-lg border border-primary/10">
                                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                        <span className="text-[7px] md:text-[9px] font-black text-primary uppercase tracking-widest">{citasPendientes.length} <span className="hidden xs:inline">Pendientes</span><span className="xs:hidden">P.</span></span>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        <span className="text-[7px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest">{citas.filter(c => c.estado === 'finalizada').length} <span className="hidden xs:inline">Hechas</span><span className="xs:hidden">H.</span></span>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-white/5 rounded-lg border border-white/10">
                                        <span className="text-[7px] md:text-[9px] font-black text-white/50 uppercase tracking-widest">${totalDinero}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-12">
                        {/* Summary for Desktop */}
                        <div className="hidden lg:flex items-center gap-8 px-8 py-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Citas Hoy</p>
                                <p className="text-xl font-black text-white leading-none font-display">{citas.length}</p>
                            </div>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Caja Hoy</p>
                                <p className="text-xl font-black text-primary leading-none font-display tracking-tight">${totalDinero}</p>
                            </div>
                        </div>

                        {/* Clock & Status */}
                        <div className="text-right hidden md:block">
                            <p className="text-xl md:text-2xl font-black text-white tabular-nums tracking-tighter font-display leading-none">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                            </p>
                            <p className="text-[7px] md:text-[8px] text-white/20 font-black uppercase tracking-[0.4em] mt-2">Estación #{barbero?.estacion_id || '0'}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <Link href="/tablet/galeria" className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-white/5 text-white/30 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all flex items-center justify-center border border-white/5 group active:scale-95">
                                <span className="material-icons-round text-base md:text-xl group-hover:scale-110 transition-transform">photo_library</span>
                            </Link>
                            <button
                                onClick={() => { localStorage.removeItem('barbero_session'); router.push('/tablet/login'); }}
                                className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-500/5 hover:border-red-400/20 transition-all flex items-center justify-center border border-white/5 group active:scale-95"
                            >
                                <span className="material-icons-round text-base md:text-xl group-hover:scale-110 transition-transform">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-0 lg:p-4 xl:p-6 relative z-10 flex flex-col">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4 xl:gap-8 max-w-[1920px] mx-auto w-full">

                    {/* Column 1: Mobile Full Content / Desktop List */}
                    <div className={`lg:col-span-8 flex flex-col h-full min-h-0 relative transition-all duration-500 ${showMobileAppointments ? 'translate-y-0 opacity-100 z-50' : 'hidden lg:flex'}`}>
                        {/* Mobile Overlay Header */}
                        <div className="lg:hidden flex items-center justify-between p-6 bg-black/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[60]">
                            <div className="flex items-center gap-4">
                                <div className="h-1 w-6 bg-primary rounded-full" />
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] font-display">Agenda del Día</h2>
                            </div>
                            <button onClick={() => setShowMobileAppointments(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:pr-2 custom-scrollbar space-y-6 lg:space-y-8 pb-24 lg:pb-6 bg-black/40 lg:bg-transparent min-h-0 relative">
                            {/* Current Appointment - High Presence */}
                            {citaEnProceso && (
                                <div className="animate-slide-in relative group">
                                    <div className="flex items-center gap-4 mb-4 lg:mb-5">
                                        <div className="h-1 w-6 lg:w-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <h2 className="text-[9px] lg:text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] font-display">Atendiendo Ahora</h2>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-emerald-500/5 rounded-[2.5rem] lg:rounded-[3rem] blur-2xl opacity-40 pointer-events-none" />
                                        <CitaCard cita={citaEnProceso} onUpdate={cargarCitas} isHighlighted currentTime={currentTime} allCitas={citas} />
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Appointments List */}
                            <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-6 lg:mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 w-6 lg:w-8 bg-white/10 rounded-full" />
                                        <h2 className="text-[9px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-display">Próximas Citas ({citasSiguientes.length})</h2>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="bg-white/5 p-12 lg:p-20 flex flex-col items-center justify-center border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
                                        <div className="spinner w-8 h-8 lg:w-10 lg:h-10 mb-4" />
                                        <p className="text-[8px] lg:text-[9px] font-black text-white/20 uppercase tracking-[0.3em] animate-pulse">Actualizando...</p>
                                    </div>
                                ) : citasSiguientes.length === 0 ? (
                                    <div className="bg-white/2 p-12 lg:p-20 text-center border border-white/5 shadow-2xl rounded-[2rem] lg:rounded-[2.5rem] group transition-all duration-700">
                                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/5 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5 text-white/10 shadow-inner">
                                            <span className="material-icons-round text-3xl lg:text-4xl">done_all</span>
                                        </div>
                                        <p className="text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">Sin más citas para hoy</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 lg:gap-4">
                                        {citasSiguientes.map((cita, index) => (
                                            <div key={cita.id} className="animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                                                <CitaCard cita={cita} onUpdate={cargarCitas} currentTime={currentTime} allCitas={citas} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Full Screen Calendar on Mobile / Sidebar on Desktop */}
                    <div className={`lg:col-span-4 h-full flex flex-col min-h-0 relative ${showMobileAppointments ? 'hidden lg:flex' : 'flex'}`}>
                        {/* Desktop Header for Timeline */}
                        <div className="hidden lg:flex items-center gap-3 mb-4 shrink-0 px-2">
                            <div className="h-1 w-6 bg-primary/20 rounded-full" />
                            <h2 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] font-display">Cronograma General</h2>
                        </div>

                        {/* The Calendar View */}
                        <div className="flex-1 bg-black/40 lg:border border-white/5 lg:shadow-[0_30px_90px_rgba(0,0,0,0.5)] lg:rounded-[2.5rem] overflow-hidden relative backdrop-blur-3xl group transition-all duration-700 hover:border-white/10">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-gold opacity-10" />
                            <AgendaTimeline citas={citas} currentTime={currentTime} onUpdate={cargarCitas} />
                        </div>

                        {/* Mobile Floating Action Button (FAB) */}
                        <div className="lg:hidden fixed bottom-24 right-5 z-[100]">
                            <button
                                onClick={() => setShowMobileAppointments(true)}
                                className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center text-primary active:scale-95 transition-all hover:bg-black/60 hover:border-primary/30"
                            >
                                <span className="material-icons-round text-2xl">list_alt</span>
                                {citasSiguientes.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black rounded-full flex items-center justify-center text-[9px] font-black border-2 border-black">
                                        {citasSiguientes.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
