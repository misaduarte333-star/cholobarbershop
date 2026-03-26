'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { KPICard } from '@/components/KPICard'
import { AdminDailyCalendar } from '@/components/AdminDailyCalendar'
import { cn, getHermosilloDateStr, getHermosilloMins, getMinsFromHermosilloString } from '@/lib/utils'
import Link from 'next/link'
import { 
    CalendarDays, 
    CheckCircle2, 
    DollarSign, 
    UserX,
    LayoutDashboard,
    Bell,
    Settings,
    Clock,
    PlusCircle,
    UserPlus,
    Ban,
    FileText,
    Activity
} from 'lucide-react'
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

    const [todaysCitas, setTodaysCitas] = useState<CitaDesdeVista[]>([])
    const [allBarberos, setAllBarberos] = useState<Barbero[]>([])
    const [sucursal, setSucursal] = useState<Sucursal | null>(null)
    const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
    const [barberStatuses, setBarberStatuses] = useState<any[]>([])

    const fetchDashboardData = useCallback(async () => {
        try {
            const today = getHermosilloDateStr(new Date())
            
            // Fetch Sucursal (Main)
            const { data: sucData } = await supabase
                .from('sucursales')
                .select('*')
                .limit(1)
                .single()
            setSucursal(sucData)

            // Fetch Barberos
            const { data: barbData } = await supabase
                .from('barberos')
                .select('*')
                .order('nombre')
            const barberos = (barbData || []) as Barbero[]
            setAllBarberos(barberos)

            // Fetch Bloqueos
            const { data: bloqData } = await supabase
                .from('bloqueos')
                .select('*')
                .gte('fecha_inicio', `${today}T00:00:00-07:00`)
                .lte('fecha_inicio', `${today}T23:59:59-07:00`)
            setBloqueos((bloqData || []) as Bloqueo[])

            // Fetch Citas Hoy
            const { data: citasData } = await supabase
                .from('vista_citas_app')
                .select('*')
                .eq('fecha_cita_local', today)
            
            const citas = (citasData || []) as CitaDesdeVista[]
            setTodaysCitas(citas)
            
            // Calculate KPIs
            const finalizadas = citas.filter(c => c.estado === 'finalizada').length
            const noShows = citas.filter(c => c.estado === 'no_show').length
            const ingresos = citas
                .filter(c => c.estado === 'finalizada')
                .reduce((acc, c) => acc + (Number(c.servicio_precio) || 0), 0)

            setKpis({
                citasHoy: citas.length,
                completadas: finalizadas,
                ingresos,
                noShows
            })

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchDashboardData()
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        
        // Real-time subscription
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [fetchDashboardData, supabase])

    // Derived State: Barber Status Monitor
    const derivedBarberStatuses = useMemo(() => {
        const nowMins = getHermosilloMins(currentTime)
        
        return allBarberos.map(b => {
            // Un barbero está "ocupado" si tiene una cita EN CURSO AHORA MISMO
            const citaActual = todaysCitas.find(c => {
                if (c.barbero_id !== b.id) return false
                // Solo consideramos estados que implican ocupación física
                if (!['confirmada', 'en_proceso', 'por_cobrar'].includes(c.estado)) return false
                
                const startMins = getMinsFromHermosilloString(c.timestamp_inicio_local)
                const endMins = getMinsFromHermosilloString(c.timestamp_fin_local)
                
                // Si está en proceso o por cobrar, está ocupado sí o sí
                if (c.estado === 'en_proceso' || c.estado === 'por_cobrar') return true
                
                // Si está confirmada, está ocupado si la hora actual está dentro del rango
                return nowMins >= startMins && nowMins <= endMins
            })

            return {
                id: b.id,
                nombre: b.nombre,
                estacion: b.estacion_id || b.id.slice(0, 2),
                estado: citaActual ? 'ocupado' : 'disponible',
                cliente: citaActual ? citaActual.cliente_nombre : null
            }
        })
    }, [allBarberos, todaysCitas, currentTime])

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-primary-foreground transition-colors duration-300">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-primary-foreground">
                {/* Header (Desktop Only) */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border mb-4 font-display">
                    <div className="flex items-center gap-3 text-foreground">
                        <div className="size-10 rounded-lg overflow-hidden border border-primary/20 transition-all hover:scale-105 bg-background">
                            <img src="/logo-cholo.jpg" alt="Logo" className="w-full h-full object-cover transform scale-110" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Panel Control</h2>
                    </div>
                    <div className="flex items-center gap-4 text-foreground">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-muted/90 backdrop-blur-xl border border-border rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xl hover:border-primary/30 transition-all group">
                            <div className="flex flex-col items-end">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight">
                                    {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Hermosillo' })}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {(() => {
                                        const day = currentTime.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Hermosillo' });
                                        const dateParts = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Hermosillo' }).formatToParts(currentTime);
                                        const dateNum = dateParts.find(p => p.type === 'day')?.value;
                                        const month = dateParts.find(p => p.type === 'month')?.value;
                                        return `${day.charAt(0).toUpperCase() + day.slice(1)} ${dateNum} de ${month}`;
                                    })()}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-border group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </header>

                {/* KPIs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                    {loading ? (
                        Array(4).fill(null).map((_, i) => (
                            <div key={i} className="bg-card h-32 animate-pulse rounded-2xl border-l-4 border-primary/20" />
                        ))
                    ) : (
                        <>
                            <KPICard
                                title="Citas Hoy"
                                value={kpis.citasHoy}
                                color="amber"
                                icon={CalendarDays}
                                trend={{ value: 15, isPositive: true }}
                            />
                            <KPICard
                                title="Completadas"
                                value={kpis.completadas}
                                color="green"
                                icon={CheckCircle2}
                                trend={{ value: 90, isPositive: true }}
                            />
                            <KPICard
                                title="Ingresos"
                                value={`$${Math.round(kpis.ingresos / 1000)}k`}
                                color="amber"
                                icon={DollarSign}
                                trend={{ value: 5, isPositive: true }}
                            />
                            <KPICard
                                title="No-Shows"
                                value={kpis.noShows}
                                color="red"
                                icon={UserX}
                                trend={{ value: 2, isPositive: false }}
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Clients Table Card */}
                    <div className="order-2 lg:order-1 lg:col-span-9 space-y-4 lg:space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-lg lg:text-xl font-black text-foreground flex items-center gap-3">
                                <CalendarDays className="text-primary w-6 h-6" />
                                <span className="uppercase tracking-tight">Agenda Global</span>
                            </h4>
                            <div className="flex bg-card rounded-xl p-1 border border-border shadow-inner">
                                <button className="px-4 py-1.5 text-[10px] font-black bg-primary text-primary-foreground rounded-lg shadow-sm transition-all">HOY</button>
                                <button className="px-4 py-1.5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase">Semana</button>
                            </div>
                        </div>
                        
                        <div className="animate-fade-in delay-200">
                            <AdminDailyCalendar
                                citas={todaysCitas}
                                barberos={allBarberos}
                                currentTime={currentTime}
                                sucursal={sucursal}
                                bloqueos={bloqueos}
                            />
                        </div>
                    </div>

                    {/* Sidebar Content Area (Right) */}
                    <div className="order-1 lg:order-2 lg:col-span-3 space-y-6 lg:space-y-8">
                        {/* Master Actions */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-4 w-1 bg-primary rounded-full" />
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Acciones Rápidas</h4>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                                <Link href="/admin/citas?action=agenda-manual" className="group flex flex-col lg:flex-row items-center justify-between p-3 lg:p-4 bg-primary rounded-xl text-primary-foreground hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 border border-border">
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] mb-2 lg:mb-0">Nueva Cita</span>
                                    <div className="size-8 lg:size-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center group-hover:rotate-12 transition-transform">
                                        <PlusCircle className="w-4 h-4 lg:w-5 lg:h-5 font-black" />
                                    </div>
                                </Link>
                                <Link href="/admin/citas?action=walk-in" className="group flex flex-col lg:flex-row items-center justify-between p-3 lg:p-4 bg-card/80 backdrop-blur-xl border border-border rounded-xl text-foreground hover:border-primary/40 transition-all hover:bg-card shadow-lg">
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground mb-2 lg:mb-0">Walk-In</span>
                                    <div className="size-8 lg:size-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                        <UserPlus className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                                    </div>
                                </Link>
                                <Link href="/admin/citas" className="group flex flex-col lg:flex-row items-center justify-between p-3 lg:p-4 bg-card/80 backdrop-blur-xl border border-border rounded-xl text-foreground hover:border-red-500/40 transition-all hover:bg-card shadow-lg">
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-red-900/60 group-hover:text-red-500 mb-2 lg:mb-0">Bloqueo</span>
                                    <div className="size-8 lg:size-9 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                                        <Ban className="w-4 h-4 lg:w-5 lg:h-5 text-red-500/50 group-hover:text-red-500" />
                                    </div>
                                </Link>
                                <Link href="/admin/reportes" className="group flex flex-col lg:flex-row items-center justify-between p-3 lg:p-4 bg-card/80 backdrop-blur-xl border border-border rounded-xl text-foreground hover:border-primary/40 transition-all hover:bg-card shadow-lg">
                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground mb-2 lg:mb-0">Reportes</span>
                                    <div className="size-8 lg:size-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                        <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                                    </div>
                                </Link>
                            </div>
                        </section>

                        {/* Barber Status Monitor */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Estaciones</h4>
                                </div>
                                <span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                                    LIVE
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                                {derivedBarberStatuses.length === 0 ? (
                                    <div className="p-10 flex flex-col items-center justify-center glass rounded-2xl border-dashed sm:col-span-2 lg:col-span-1">
                                        <Activity className="w-5 h-5 mb-3 text-primary animate-pulse" />
                                        <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest text-center">Sincronizando Estaciones...</p>
                                    </div>
                                ) : (
                                    derivedBarberStatuses.map((barbero) => (
                                        <div key={barbero.id} className="glass p-2 lg:p-2.5 rounded-xl border border-border flex items-center justify-between transition-all hover:bg-muted/50 hover:border-primary/20 group">
                                            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className={cn(
                                                        "size-8 lg:size-9 rounded-lg bg-muted flex items-center justify-center border-2 transition-all",
                                                        barbero.estado === 'ocupado' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
                                                    )}>
                                                        <span className={cn(
                                                            "font-black text-[9px] lg:text-[10px]",
                                                            barbero.estado === 'ocupado' ? 'text-primary' : 'text-muted-foreground'
                                                        )}>
                                                            {barbero.estacion}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "absolute -bottom-0.5 -right-0.5 size-2 lg:size-2.5 rounded-full border border-card shadow-sm",
                                                        barbero.estado === 'ocupado' ? 'bg-primary' : 'bg-muted-foreground/30'
                                                    )} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] lg:text-[10px] font-black text-foreground uppercase tracking-tight truncate leading-none mb-1">
                                                        {barbero.nombre.split(' ')[0]}
                                                    </p>
                                                    <p className="text-[7px] lg:text-[8px] font-bold text-muted-foreground truncate uppercase tracking-tighter">
                                                        {barbero.estado === 'ocupado' ? barbero.cliente : 'Disponible'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "shrink-0 p-1 lg:p-1.5 rounded-lg border transition-colors",
                                                barbero.estado === 'ocupado' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'
                                            )}>
                                                <Activity className="size-2.5 lg:size-3" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
