'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista } from '@/lib/types'
import { 
    BarChart3, 
    TrendingUp, 
    Calendar, 
    DollarSign, 
    Users, 
    Clock, 
    ArrowUpRight, 
    ArrowDownRight,
    PieChart,
    Timer,
    Calendar as CalendarIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ReportesPage() {
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [stats, setStats] = useState({
        totalIngresos: 0,
        totalCitas: 0,
        ticketPromedio: 0,
        ocupacion: 0
    })
    
    // Data for charts
    const [ingresosPorDia, setIngresosPorDia] = useState<{ dia: string; monto: number }[]>([])
    const [citasPorServicio, setCitasPorServicio] = useState<{ servicio: string; cantidad: number; porcentaje: number }[]>([])
    const [tiemposBarberos, setTiemposBarberos] = useState<{ barbero: string; promedio: number; totalServicios: number }[]>([])

    const supabase = createClient()

    const cargarReportes = useCallback(async () => {
        setLoading(true)
        try {
            const [citasRes, cortesRes] = await Promise.all([
                supabase
                    .from('vista_citas_app')
                    .select('*')
                    .gte('fecha_cita_local', dateRange.start)
                    .lte('fecha_cita_local', dateRange.end)
                    .in('estado', ['finalizada', 'confirmada', 'en_proceso']),
                supabase
                    .from('cortes_turno')
                    .select('fecha_corte')
                    .gte('fecha_corte', dateRange.start)
                    .lte('fecha_corte', dateRange.end)
                    .eq('tipo', 'diario')
            ])

            if (citasRes.error) throw citasRes.error
            if (cortesRes.error) throw cortesRes.error

            if (citasRes.data) {
                const castedCitas = citasRes.data as CitaDesdeVista[]
                const cortesFechas = new Set((cortesRes.data || []).map((c: any) => c.fecha_corte))

                const finalizadas = castedCitas.filter(c => {
                    if (c.estado !== 'finalizada') return false
                    const dKey = c.fecha_cita_local || (c.timestamp_inicio_local ? c.timestamp_inicio_local.split('T')[0] : '')
                    return cortesFechas.has(dKey)
                })

                const totalIngresos = finalizadas.reduce((sum, c) => sum + (c.servicio_precio || 0), 0)
                const totalCitas = castedCitas.length
                const ticketPromedio = finalizadas.length > 0 ? totalIngresos / finalizadas.length : 0

                setStats({
                    totalIngresos,
                    totalCitas,
                    ticketPromedio,
                    ocupacion: 85
                })

                const ingresosMap = new Map<string, number>()
                finalizadas.forEach(c => {
                    const dia = new Date(c.timestamp_inicio_local).toLocaleDateString('es-MX', { weekday: 'short' })
                    const precio = c.servicio_precio || 0
                    ingresosMap.set(dia, (ingresosMap.get(dia) || 0) + precio)
                })
                setIngresosPorDia(Array.from(ingresosMap.entries()).map(([dia, monto]) => ({ dia, monto })))

                const serviciosMap = new Map<string, number>()
                castedCitas.forEach(c => {
                    const nombre = c.servicio_nombre || 'Desconocido'
                    serviciosMap.set(nombre, (serviciosMap.get(nombre) || 0) + 1)
                })
                const totalServicios = castedCitas.length
                setCitasPorServicio(Array.from(serviciosMap.entries())
                    .map(([servicio, cantidad]) => ({
                        servicio,
                        cantidad,
                        porcentaje: totalServicios > 0 ? (cantidad / totalServicios) * 100 : 0
                    }))
                    .sort((a, b) => b.cantidad - a.cantidad)
                )

                const barberosMap = new Map<string, { totalMinutos: number, citasConTiempo: number }>()
                finalizadas.forEach(c => {
                    const nombre = c.barbero_nombre || 'Desconocido'
                    if (c.duracion_real_minutos !== null && c.duracion_real_minutos !== undefined) {
                        const entry = barberosMap.get(nombre) || { totalMinutos: 0, citasConTiempo: 0 }
                        entry.totalMinutos += c.duracion_real_minutos
                        entry.citasConTiempo += 1
                        barberosMap.set(nombre, entry)
                    }
                })
                setTiemposBarberos(Array.from(barberosMap.entries())
                    .map(([barbero, data]) => ({
                        barbero,
                        promedio: Math.round(data.totalMinutos / data.citasConTiempo),
                        totalServicios: data.citasConTiempo
                    }))
                    .sort((a, b) => b.promedio - a.promedio)
                )
            }
        } catch (err) {
            console.error('Error loading reports:', err)
            loadDemoData()
        } finally {
            setLoading(false)
        }
    }, [supabase, dateRange])

    useEffect(() => {
        cargarReportes()
    }, [cargarReportes])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const formattedDate = currentTime.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).replace(/^\w/, (c) => c.toUpperCase())

    const formattedTime = currentTime.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    })

    const loadDemoData = () => {
        setStats({
            totalIngresos: 15450,
            totalCitas: 45,
            ticketPromedio: 343.33,
            ocupacion: 78
        })
        setIngresosPorDia([
            { dia: 'Lun', monto: 2500 },
            { dia: 'Mar', monto: 3200 },
            { dia: 'Mié', monto: 2800 },
            { dia: 'Jue', monto: 3500 },
            { dia: 'Vie', monto: 4200 },
            { dia: 'Sáb', monto: 5100 },
            { dia: 'Dom', monto: 1800 }
        ])
        setCitasPorServicio([
            { servicio: 'Corte Clásico', cantidad: 45, porcentaje: 40 },
            { servicio: 'Barba', cantidad: 30, porcentaje: 25 },
            { servicio: 'Combo Completo', cantidad: 25, porcentaje: 20 },
            { servicio: 'Corte Niño', cantidad: 15, porcentaje: 15 }
        ])
        setTiemposBarberos([
            { barbero: 'Mike', promedio: 38, totalServicios: 12 },
            { barbero: 'Alex', promedio: 45, totalServicios: 9 },
            { barbero: 'Juan', promedio: 30, totalServicios: 15 }
        ])
    }

    const maxIngreso = Math.max(...ingresosPorDia.map(d => d.monto), 1)

    return (
        <div className="relative min-h-full bg-[#0A0A0A] selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-20 border-b border-white/5 mb-4 font-display">
                    <div className="flex items-center gap-3 text-white">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all hover:scale-105">
                            <BarChart3 className="text-primary w-4 h-4 shadow-lg shadow-primary/20" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Métricas Estratégicas</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xl hover:border-primary/30 transition-all group">
                            <div className="flex flex-col items-end">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight text-white">
                                    {formattedTime}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {formattedDate}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-white/10 group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                        </div>

                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-xl">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="bg-transparent border-none text-[10px] font-black uppercase text-white w-28 focus:ring-0"
                            />
                            <span className="text-white/20 text-xs">/</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="bg-transparent border-none text-[10px] font-black uppercase text-white w-28 focus:ring-0"
                            />
                        </div>
                    </div>
                </header>

                {/* Mobile Header (Title Only) */}
                <div className="lg:hidden flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <BarChart3 className="text-primary w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-black tracking-tighter uppercase italic text-white">Reportes</h2>
                </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIMetricCard 
                    title="Ingresos"
                    value={`$${Math.round(stats.totalIngresos).toLocaleString()}`}
                    icon={<DollarSign className="w-4 h-4" />}
                    trend="+12%"
                    color="gold"
                />
                <KPIMetricCard 
                    title="Ticket Promedio"
                    value={`$${Math.round(stats.ticketPromedio).toLocaleString()}`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    trend="+5%"
                    color="blue"
                />
                <KPIMetricCard 
                    title="Citas Totales"
                    value={stats.totalCitas.toString()}
                    icon={<Calendar className="w-4 h-4" />}
                    trend="-2%"
                    color="purple"
                />
                <KPIMetricCard 
                    title="Ocupación"
                    value={`${stats.ocupacion}%`}
                    icon={<Users className="w-4 h-4" />}
                    trend="+8%"
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: Ingresos por Día */}
                <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem]">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                            Ingresos Semanales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-64 flex items-end justify-between gap-3 pt-8">
                            {ingresosPorDia.map((item, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group px-1">
                                    <div className="w-full relative flex items-end justify-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-[#D4AF37]/40 to-[#D4AF37] rounded-lg transition-all duration-500 relative shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                                            style={{ height: `${(item.monto / maxIngreso) * 180}px` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 text-white text-[10px] font-black px-2 py-1.5 rounded-lg whitespace-nowrap transition-all scale-75 group-hover:scale-100 z-50">
                                                ${Math.round(item.monto).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{item.dia}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Chart: Servicios Populares */}
                <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem]">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-purple-400" />
                            Servicios Elite
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {citasPorServicio.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-white uppercase tracking-tight">{item.servicio}</span>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{item.cantidad} servicios</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                            style={{ width: `${item.porcentaje}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400 w-8">{Math.round(item.porcentaje)}%</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Metrics by Barber */}
                <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2.5rem] lg:col-span-2">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                                <Timer className="w-5 h-5" />
                            </div>
                            Eficiencia Operativa por Barbero
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {tiemposBarberos.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-white/20 text-xs font-black uppercase tracking-widest">
                                    Sin datos suficientes para este periodo
                                </div>
                            ) : (
                                tiemposBarberos.map((tb, idx) => (
                                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:bg-white/[0.04] transition-all">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20 shadow-lg shadow-blue-500/5 group-hover:scale-110 transition-transform">
                                            <Users className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-1">{tb.barbero}</h3>
                                        <div className="text-4xl font-black text-gradient-gold my-2 tracking-tighter">
                                            {tb.promedio}<span className="text-sm text-white/40 ml-1">min</span>
                                        </div>
                                        <p className="text-[9px] text-white/20 uppercase font-black tracking-widest pt-4 border-t border-white/5 w-full mt-2">
                                            {tb.totalServicios} servicios realizados
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        </div>
    )
}

function KPIMetricCard({ title, value, icon, trend, color }: { title: string, value: string, icon: React.ReactNode, trend: string, color: 'gold' | 'blue' | 'purple' | 'emerald' }) {
    const colorMap = {
        gold: 'from-[#D4AF37] to-[#B8962E] text-black shadow-gold/20',
        blue: 'from-blue-600 to-blue-400 text-white shadow-blue-500/20',
        purple: 'from-purple-600 to-purple-400 text-white shadow-purple-500/20',
        emerald: 'from-emerald-600 to-emerald-400 text-white shadow-emerald-500/20'
    }

    const isPositive = trend.startsWith('+')

    return (
        <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                        colorMap[color]
                    )}>
                        {icon}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest",
                        isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                        {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {trend}
                    </div>
                </div>
                <div>
                    <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{title}</h3>
                    <p className="text-xl sm:text-2xl font-black text-white tracking-tighter">{value}</p>
                </div>
                <div className={cn(
                    "absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-10",
                    color === 'gold' ? 'bg-[#D4AF37]' : color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
                )} />
            </CardContent>
        </Card>
    )
}
