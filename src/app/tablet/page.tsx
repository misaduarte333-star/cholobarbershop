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

    // Notification State
    const [newApptAlert, setNewApptAlert] = useState<{ show: boolean, clientName: string }>({ show: false, clientName: '' })
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const supabase = createClient()

    // Initialize Audio
    useEffect(() => {
        try {
            audioRef.current = new Audio('/notification.mp3')
            audioRef.current.volume = 0.5
            // Pre-load check
            audioRef.current.onerror = () => {
                console.warn('⚠️ Archivo /notification.mp3 no encontrado. Sube un archivo a public/notification.mp3 para habilitar sonidos.')
                audioRef.current = null
            }
        } catch (e) {
            console.error('Error initializing audio:', e)
        }
    }, [])

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

    const cargarCitas = useCallback(async () => {
        if (!barbero?.id) return
        console.log('🔄 Fetching appointments from Supabase...')

        const hoyLocal = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

        try {
            const { data, error } = await supabase
                .from('vista_citas_agente')
                .select('*')
                .eq('barbero_id', barbero.id)
                .eq('fecha_cita_local', hoyLocal)
                .neq('estado', 'cancelada')
                .order('timestamp_inicio', { ascending: true })

            if (error) {
                console.error('Error loading appointments:', error)
                setCitas([])
            } else {
                setCitas(data || [])
            }
        } catch (err) {
            console.error('Supabase error:', err)
            setCitas([])
        } finally {
            setLoading(false)
        }
    }, [supabase, barbero])

    useEffect(() => {
        if (!barbero) return
        cargarCitas()
        const channel = supabase
            .channel(`citas-barbero-${barbero.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${barbero.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newCita = payload.new as any

                    // Trigger sound & banner
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e))
                    }

                    setNewApptAlert({ show: true, clientName: newCita.cliente_nombre || 'Nuevo Cliente' })

                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        setNewApptAlert(prev => ({ ...prev, show: false }))
                    }, 5000)
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
        <div className="h-screen flex flex-col bg-[#050608] text-white overflow-hidden relative selection:bg-primary selection:text-black">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-shop-premium opacity-10 scale-110"></div>
            <div className="absolute inset-0 z-0 vignette-overlay opacity-50"></div>

            {/* Header */}

            {/* New Appointment Notification Banner */}
            <AnimatePresence>
                {newApptAlert.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 32, scale: 1 }}
                        exit={{ opacity: 0, y: -100, scale: 0.9 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none"
                    >
                        <div className="bg-[#16181D] border-2 border-primary/50 text-white px-8 py-4 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(234,179,8,0.2)] flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 animate-pulse-glow">
                                <span className="material-icons-round text-primary text-2xl">notifications_active</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">¡Nueva Cita Agendada!</span>
                                <span className="text-xl font-black font-display tracking-tight text-white uppercase">{newApptAlert.clientName}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="bg-black/60 backdrop-blur-3xl border-b border-white/5 px-8 py-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] shrink-0 z-50 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-gold opacity-30" />

                <div className="flex items-center justify-between max-w-[1920px] mx-auto">
                    <div className="flex items-center gap-6 group">
                        <div className="relative scale-90">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg group-hover:bg-primary/10 transition-all duration-700" />
                            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden group-hover:border-white/20 transition-colors duration-500">
                                <span className="text-2xl font-black text-primary font-display relative z-10 transition-transform group-hover:scale-105">CB</span>
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-700" />
                            </div>
                        </div>
                        <div className="animate-slide-in">
                            <div className="flex flex-col items-start leading-none">
                                <h1 className="text-2xl font-black text-white tracking-tight uppercase font-display">
                                    {barbero?.nombre || 'Barbero'}
                                </h1>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{citasPendientes.length} Pendientes</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{citas.filter(c => c.estado === 'finalizada').length} Finalizadas</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-12">
                        {/* Stats Summary */}
                        <div className="hidden xl:flex items-center gap-8 px-8 py-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
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
                        <div className="text-right hidden sm:block">
                            <p className="text-2xl font-black text-white tabular-nums tracking-tighter font-display leading-none">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                            </p>
                            <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.4em] mt-2">Estación #{barbero?.estacion_id || '0'}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Link href="/tablet/galeria" className="w-12 h-12 rounded-xl bg-white/5 text-white/30 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all flex items-center justify-center border border-white/5 group active:scale-95">
                                <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">photo_library</span>
                            </Link>
                            <button
                                onClick={() => { localStorage.removeItem('barbero_session'); router.push('/tablet/login'); }}
                                className="w-12 h-12 rounded-xl bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-500/5 hover:border-red-400/20 transition-all flex items-center justify-center border border-white/5 group active:scale-95"
                            >
                                <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-6 md:p-8 relative z-10 flex flex-col gap-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-[1920px] mx-auto w-full">
                    {/* Appointments - Left Column */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 relative">
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-10 pb-10">
                            {/* Current Appointment - High Presence */}
                            {citaEnProceso && (
                                <div className="animate-slide-in relative group">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="h-1 w-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] font-display">Atendiendo Ahora</h2>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-emerald-500/5 rounded-[3rem] blur-2xl opacity-40 pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
                                        <CitaCard cita={citaEnProceso} onUpdate={cargarCitas} isHighlighted currentTime={currentTime} allCitas={citas} />
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Appointments List */}
                            <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 w-8 bg-white/10 rounded-full" />
                                        <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-display">Siguientes en Agenda ({citasSiguientes.length})</h2>
                                    </div>
                                    {citasSiguientes.length > 0 && (
                                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                                            <span className="material-icons-round text-xs text-primary">schedule</span>
                                            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Flujo de Trabajo</span>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="bg-white/5 p-20 flex flex-col items-center justify-center border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-sm">
                                        <div className="spinner w-10 h-10 mb-4" />
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] animate-pulse">Cargando Agenda...</p>
                                    </div>
                                ) : citasSiguientes.length === 0 ? (
                                    <div className="bg-white/2 p-20 text-center border border-white/5 shadow-2xl rounded-[2.5rem] group hover:border-white/10 transition-all duration-700">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5 text-white/10 group-hover:text-primary transition-all duration-700 shadow-inner group-hover:scale-110">
                                            <span className="material-icons-round text-4xl">done_all</span>
                                        </div>
                                        <p className="text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">Sin más citas para hoy</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6 pb-20">
                                        {citasSiguientes.map((cita, index) => (
                                            <div key={cita.id} className="animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                                                <CitaCard cita={cita} onUpdate={cargarCitas} currentTime={currentTime} allCitas={citas} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline - Right Column - Premium Container */}
                    <div className="lg:col-span-4 h-full flex flex-col min-h-0 relative pb-4 lg:pb-0">
                        <div className="flex items-center gap-4 mb-6 shrink-0 px-2">
                            <div className="h-1 w-8 bg-primary/20 rounded-full" />
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-display">Cronograma General</h2>
                        </div>
                        <div className="flex-1 bg-black/40 border border-white/5 shadow-[0_30px_90px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden relative backdrop-blur-3xl group transition-all duration-700 hover:border-white/10">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-gold opacity-10" />
                            <AgendaTimeline citas={citas} currentTime={currentTime} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
