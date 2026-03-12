'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { KPICard } from '@/components/KPICard'
import { AdminDailyCalendar } from '@/components/AdminDailyCalendar'
import Link from 'next/link'
import type { KPIs, CitaDesdeVista, Barbero, Sucursal, Bloqueo } from '@/lib/types'

export default function AdminDashboard() {
    const [kpis, setKpis] = useState<KPIs>({
        citasHoy: 0,
        completadas: 0,
        ingresos: 0,
        noShows: 0
    })
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    const [barberStatuses, setBarberStatuses] = useState<{
        id: string
        nombre: string
        estacion: number
        estado: 'ocupado' | 'disponible' | 'descanso'
        cliente: string | null
    }[]>([])

    const [todaysCitas, setTodaysCitas] = useState<CitaDesdeVista[]>([])
    const [allBarberos, setAllBarberos] = useState<Barbero[]>([])
    const [sucursal, setSucursal] = useState<Sucursal | null>(null)
    const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])

    const cargarKPIs = useCallback(async (isInitialLoad = false) => {
        const hoyLocal = new Date().toLocaleDateString('en-CA')

        if (isInitialLoad) setLoading(true)
        try {
            // Execute all fetches in parallel for maximum speed
            const [
                { data: citasHoy, error: errorCitas },
                { data: barberos, error: errorBarberos },
                { data: sucursalData },
                { data: bloqueosData }
            ] = await Promise.all([
                (supabase.from('vista_citas_app') as any).select('*').eq('fecha_cita_local', hoyLocal),
                (supabase.from('barberos') as any).select('*').eq('activo', true).order('estacion_id'),
                supabase.from('sucursales').select('*').eq('activa', true).single(),
                supabase.from('bloqueos').select('*').gte('fecha_inicio', `${hoyLocal}T00:00:00`).lte('fecha_inicio', `${hoyLocal}T23:59:59`)
            ])

            if (errorCitas) throw errorCitas
            if (errorBarberos) throw errorBarberos

            const castedCitas = (citasHoy || []) as CitaDesdeVista[]
            setTodaysCitas(castedCitas)
            setAllBarberos((barberos || []) as Barbero[])
            if (sucursalData) setSucursal(sucursalData as Sucursal)
            if (bloqueosData) setBloqueos(bloqueosData as Bloqueo[])

            // 3. Process FAQs/Stats
            const completadas = castedCitas.filter((c) => c.estado === 'finalizada')
            const noShows = castedCitas.filter((c) => c.estado === 'no_show').length
            const ingresos = completadas.reduce((sum, c) => sum + (Number(c.servicio_precio) || 0), 0)

            setKpis({
                citasHoy: castedCitas.length,
                completadas: completadas.length,
                ingresos,
                noShows
            })

            // 4. Calculate Barber Status
            if (barberos) {
                const statuses = barberos.map((b: any) => {
                    const activeCita = castedCitas.find((c: any) =>
                        c.barbero_id === b.id && c.estado === 'en_proceso'
                    )

                    return {
                        id: b.id,
                        nombre: b.nombre.split(' ')[0],
                        estacion: b.estacion_id,
                        estado: activeCita ? 'ocupado' : 'disponible',
                        cliente: activeCita ? activeCita.cliente_nombre : null
                    }
                })
                setBarberStatuses(statuses as any)
            }

        } catch (err) {
            console.error('Error loading dashboard data:', err)
        } finally {
            if (isInitialLoad) setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        cargarKPIs(true) // Initial load with spinner

        // Supabase Realtime Subscription
        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'citas' },
                () => cargarKPIs() // Background update without spinner
            )
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'barberos' },
                () => cargarKPIs()
            )
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'bloqueos' },
                () => cargarKPIs()
            )
            .subscribe()

        // Fallback interval just in case realtime drops
        const interval = setInterval(cargarKPIs, 60000)

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [cargarKPIs, supabase])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative min-h-full selection:bg-primary selection:text-black">
            <header className="flex flex-row items-center justify-between gap-2 mb-4 relative z-10 px-1">
                <div className="animate-slide-in">
                    <h1 className="font-display font-black text-xl xs:text-2xl md:text-4xl tracking-tight flex flex-row items-baseline gap-2 leading-none drop-shadow-2xl">
                        <span className="text-white">PANEL</span>
                        <span className="text-gradient-gold uppercase text-lg xs:text-xl md:text-3xl">Control</span>
                    </h1>
                    <p className="text-[7px] md:text-[8px] tracking-[0.3em] text-white/30 font-black uppercase mt-1">Resumen Maestro</p>
                </div>

                <div className="animate-slide-in delay-100">
                    <div className="glass-card px-3 py-1.5 md:px-4 md:py-2 border-primary/10 shadow-lg glow-gold relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                        <div className="relative z-10 flex flex-col items-end">
                            <p className="text-sm md:text-xl font-black text-white tabular-nums tracking-tighter text-gradient-gold font-display leading-none">
                                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-primary/60 font-black uppercase text-[6px] md:text-[8px] tracking-[0.1em] mt-0.5">
                                {currentTime.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 relative z-10">
                {loading ? (
                    Array(4).fill(null).map((_, i) => (
                        <div key={i} className="glass-card h-32 animate-pulse bg-slate-800/50" />
                    ))
                ) : (
                    <>
                        <KPICard
                            titulo="Citas Hoy"
                            valor={kpis.citasHoy}
                            color="amber"
                            icon="calendar"
                            trend={+15}
                        />
                        <KPICard
                            titulo="Completadas"
                            valor={kpis.completadas}
                            color="green"
                            icon="check"
                            trend={+8}
                        />
                        <KPICard
                            titulo="Ingresos"
                            valor={`$${Math.round(kpis.ingresos).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            color="amber"
                            icon="money"
                            trend={+22}
                        />
                        <KPICard
                            titulo="No-Shows"
                            valor={kpis.noShows}
                            color="red"
                            icon="x"
                            trend={-5}
                            trendInverse
                        />
                    </>
                )}
            </div>

            {/* Admin Daily Calendar */}
            <div className="relative z-10 mb-6 animate-fade-in delay-200">
                <AdminDailyCalendar
                    citas={todaysCitas}
                    barberos={allBarberos}
                    currentTime={currentTime}
                    sucursal={sucursal}
                    bloqueos={bloqueos}
                />
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6 relative z-10 animate-fade-in delay-300">
                {/* Active Appointments Status */}
                <div className="glass-card p-4 md:p-6 rounded-[2rem] border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-brand opacity-30" />

                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <span className="material-icons-round text-lg md:text-xl">schedule</span>
                            </div>
                            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight font-display">Citas Activas</h2>
                        </div>
                        <Link href="/admin/citas" className="group/link flex items-center gap-2">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] group-hover/link:mr-2 transition-all">Ver Agenda</span>
                            <span className="material-icons-round text-primary text-xs group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="min-h-[160px] flex flex-col justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 py-10">
                                <div className="spinner w-8 h-8" />
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest animate-pulse">Sincronizando...</p>
                            </div>
                        ) : kpis.citasHoy === 0 ? (
                            <div className="p-10 rounded-[2rem] bg-black/40 border border-white/5 text-center flex flex-col items-center gap-4">
                                <span className="material-icons-round text-4xl text-white/10">calendar_today</span>
                                <p className="text-white/30 text-xs font-black uppercase tracking-[0.3em]">Sin actividad programada</p>
                            </div>
                        ) : (
                            <div className="p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-black/40 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                                    <p className="text-white/60 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-2 leading-none">Total Programado</p>
                                    <div className="flex items-baseline gap-2 md:gap-3">
                                        <span className="text-5xl md:text-7xl font-black text-gradient-gold font-display leading-none">{kpis.citasHoy}</span>
                                        <span className="text-[10px] md:text-sm font-black text-white uppercase tracking-widest opacity-60">CITAS HOY</span>
                                    </div>
                                </div>
                                <Link href="/admin/citas" className="btn-primary px-6 md:px-8 py-4 md:py-5 rounded-xl md:rounded-2xl relative z-10 shadow-[0_10px_25px_rgba(234,179,8,0.2)] active:scale-95 transition-all w-full md:w-auto text-center font-black uppercase tracking-widest text-[10px] md:text-[11px]">
                                    Ir a la Agenda
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Master Actions */}
                <div className="glass-card p-4 md:p-6 rounded-[2rem] border-white/5 shadow-2xl group">
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <span className="material-icons-round text-lg md:text-xl">bolt</span>
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight font-display">Acciones Maestras</h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
                        {[
                            { href: '/admin/citas?action=agenda-manual', icon: 'add_task', label: 'Nueva Cita', sub: 'Agendar' },
                            { href: '/admin/citas?action=walk-in', icon: 'person_add', label: 'Walk-in', sub: 'Directo' },
                            { href: '/admin/citas', icon: 'block', label: 'Bloqueo', sub: 'Logística' },
                            { href: '/admin/reportes', icon: 'analytics', label: 'Reportes', sub: 'Análisis' }
                        ].map((action, i) => (
                            <Link key={i} href={action.href} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[1.8rem] glass-card border-white/5 hover:border-primary/40 hover:bg-black/40 transition-all group/item relative overflow-hidden active:scale-95">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                <span className="material-icons-round text-2xl md:text-3xl text-white/40 group-hover/item:text-primary transition-colors mb-4 md:mb-5 block">
                                    {action.icon}
                                </span>
                                <p className="text-[10px] md:text-sm font-black text-white uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 font-display leading-none">{action.label}</p>
                                <p className="text-[8px] md:text-[10px] text-white/20 font-black uppercase tracking-widest leading-none">{action.sub}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Real Time Barber Status Section */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border-white/5 shadow-2xl relative z-10 mb-8 animate-fade-in delay-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <span className="material-icons-round text-xl">hail</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight font-display">Estado de Estaciones</h2>
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">Monitor en Tiempo Real</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-black/40 rounded-2xl border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Servidor Activo</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {barberStatuses.length === 0 ? (
                        <div className="col-span-full p-20 flex flex-col items-center justify-center glass-card rounded-[2rem] border-white/5 border-dashed">
                            <div className="spinner w-10 h-10 mb-6" />
                            <p className="text-white/20 uppercase tracking-[0.4em] text-[10px] font-black italic">Escaneando Infraestructura...</p>
                        </div>
                    ) : (
                        barberStatuses.map((barbero) => (
                            <div key={barbero.id} className="p-4 rounded-[1.8rem] glass-card border-white/5 hover:border-primary/30 transition-all hover:bg-black/60 group/card relative overflow-hidden active:scale-95 duration-500">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-2xl font-display transition-all duration-700
                                        ${barbero.estado === 'ocupado' ? 'bg-gradient-gold text-black shadow-primary/20 scale-110' : 'bg-white/5 text-white/20 border border-white/10 group-hover/card:border-primary/20'}`}>
                                        {barbero.estacion}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white text-lg leading-none font-display uppercase truncate drop-shadow-md">{barbero.nombre}</p>
                                        <p className="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] mt-1.5 block">SILLA {barbero.estacion}</p>
                                    </div>
                                </div>

                                <div className={`
                                    flex items-center justify-center gap-3 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] w-full border transition-all duration-300
                                    ${barbero.estado === 'ocupado' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_5px_15px_rgba(239,68,68,0.1)]' : ''}
                                    ${barbero.estado === 'disponible' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-[0_5px_15px_rgba(52,211,153,0.1)]' : ''}
                                    ${barbero.estado === 'descanso' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 shadow-[0_5px_15px_rgba(251,191,36,0.1)]' : ''}
                                `}>
                                    <div className={`w-2 h-2 rounded-full 
                                        ${barbero.estado === 'ocupado' ? 'bg-red-500 animate-pulse' : ''}
                                        ${barbero.estado === 'disponible' ? 'bg-emerald-400' : ''}
                                        ${barbero.estado === 'descanso' ? 'bg-amber-400' : ''}
                                    `} />
                                    {barbero.estado === 'ocupado' ? 'Atendiendo' :
                                        barbero.estado === 'disponible' ? 'Disponible' : 'Descanso'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div> {/* Close grid container for stations OR just close the last section container */}
        </div>
    )
}
