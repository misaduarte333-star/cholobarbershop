'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import type { CitaConRelaciones } from '@/lib/types'

export default function TabletDashboard() {
    const router = useRouter()
    const [citas, setCitas] = useState<CitaConRelaciones[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [barbero, setBarbero] = useState<{ id: string, nombre: string, estacion_id: number | null } | null>(null)

    const supabase = createClient()

    // Auth Check
    useEffect(() => {
        const sessionStr = localStorage.getItem('barbero_session')
        if (!sessionStr) {
            router.push('/tablet/login')
            return
        }
        try {
            const session = JSON.parse(sessionStr)
            setBarbero(session)
        } catch {
            router.push('/tablet/login')
        }
    }, [router])

    const cargarCitas = useCallback(async () => {
        if (!barbero?.id) return
        console.log('🔄 Fetching appointments from Supabase...')

        const hoy = new Date()
        const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0)).toISOString()
        const finDelDia = new Date(hoy.setHours(23, 59, 59, 999)).toISOString()

        try {
            const { data, error } = await (supabase
                .from('citas') as any)
                .select(`
          *,
          servicio:servicios(*)
        `)
                .eq('barbero_id', barbero.id)
                .gte('timestamp_inicio', inicioDelDia)
                .lte('timestamp_inicio', finDelDia)
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${barbero.id}` }, () => cargarCitas())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [cargarCitas, supabase, barbero])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const totalDinero = citas
        .filter(c => c.estado === 'finalizada')
        .reduce((acc, current) => acc + (current.monto_pagado ?? current.servicio?.precio ?? 0), 0)

    const citasPendientes = citas.filter(c => ['confirmada', 'en_espera', 'en_proceso'].includes(c.estado))
    const citaEnProceso = citas.find(c => c.estado === 'en_proceso')
    const citasSiguientes = citasPendientes.filter(c => c.estado !== 'en_proceso')

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                            <span className="text-xl font-black text-white italic">CB</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 leading-none">{barbero?.nombre || 'Cargando...'}</h1>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">{citasPendientes.length} Pendientes</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">{citas.filter(c => c.estado === 'finalizada').length} Completadas</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5">
                                Estación {barbero?.estacion_id} • {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Citas Hoy</p>
                                <p className="text-xl font-black text-slate-900 leading-none">{citas.length}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Acumulado</p>
                                <p className="text-xl font-black text-emerald-600 leading-none">${totalDinero}</p>
                            </div>
                        </div>

                        <div className="text-right hidden md:block">
                            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{citasPendientes.length} pendientes</p>
                        </div>
                        <Link href="/tablet/galeria" className="p-2 rounded-lg text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Galería</span>
                        </Link>
                        <button onClick={() => { localStorage.removeItem('barbero_session'); router.push('/tablet/login'); }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    {/* Appointments - Left Column */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 relative z-20">
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-10">
                            {/* Current Appointment */}
                            {citaEnProceso && (
                                <div className="animate-fade-in shrink-0">
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Atendiendo Ahora
                                    </h2>
                                    <CitaCard cita={citaEnProceso} onUpdate={cargarCitas} isHighlighted currentTime={currentTime} allCitas={citas} />
                                </div>
                            )}

                            {/* Upcoming Appointments */}
                            <div className="flex-1">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                    Próximas Citas ({citasSiguientes.length})
                                </h2>

                                {loading ? (
                                    <div className="glass-card p-24 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-3xl">
                                        <div className="spinner w-10 h-10 mb-4" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</p>
                                    </div>
                                ) : citasSiguientes.length === 0 ? (
                                    <div className="glass-card p-24 text-center bg-white border border-slate-100 shadow-sm rounded-3xl">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin más citas programadas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                                        {citasSiguientes.map((cita, index) => (
                                            <CitaCard key={cita.id} cita={cita} onUpdate={cargarCitas} currentTime={currentTime} allCitas={citas} style={{ animationDelay: `${index * 100}ms` }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline - Right Column */}
                    <div className="lg:col-span-4 h-full flex flex-col min-h-0 relative z-10">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Cronograma
                        </h2>
                        <div className="flex-1 glass-card bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden relative">
                            <AgendaTimeline citas={citas} currentTime={currentTime} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
