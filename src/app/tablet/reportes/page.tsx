'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista } from '@/lib/types'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
    PieChart,
    Pie
} from 'recharts'
import {
    ChevronLeft,
    BarChart3,
    TrendingUp,
    Timer,
    CheckCircle2,
    Target,
    AlertCircle,
    DollarSign,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Clock,
    Scissors
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from '@/lib/utils'

export default function TabletReportesPage() {
    const router = useRouter()
    const [barbero, setBarbero] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<'hoy' | 'semana' | 'mes'>('semana')
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeRange, setActiveRange] = useState({ start: '', end: '' })

    // Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const sessionStr = localStorage.getItem('barbero_session')
            if (!sessionStr) {
                router.push('/tablet/login')
                return
            }
            try {
                const session = JSON.parse(sessionStr)
                setBarbero(session)
                setLoading(false)
            } catch (e) {
                console.error('❌ Session parse error:', e)
                router.push('/tablet/login')
            }
        }
        checkAuth()
    }, [router])

    const fetchReportData = useCallback(async () => {
        if (!barbero) return
        setIsRefreshing(true)
        const supabase = createClient()

        let startDate = ''
        let endDate = ''

        const hoy = new Date()
        const hoyStr = hoy.toLocaleDateString('en-CA') // YYYY-MM-DD local

        if (dateRange === 'hoy') {
            startDate = hoyStr
            endDate = hoyStr
        } else if (dateRange === 'semana') {
            const d = new Date()
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            const monday = new Date(d.setDate(diff))
            startDate = monday.toLocaleDateString('en-CA')
            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            endDate = sunday.toLocaleDateString('en-CA')
        } else if (dateRange === 'mes') {
            const firstDay = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            startDate = firstDay.toLocaleDateString('en-CA')
            const lastDay = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            endDate = lastDay.toLocaleDateString('en-CA')
        }

        setActiveRange({ start: startDate, end: endDate })

        const { data, error } = await supabase
            .from('vista_general_citas')
            .select('*')
            .eq('barbero_id', barbero.id)
            .eq('estado', 'finalizada')
            .gte('fecha_cita_local', startDate)
            .lte('fecha_cita_local', endDate)
            .order('timestamp_inicio', { ascending: true })

        if (data) setCitas(data as CitaDesdeVista[])
        setIsRefreshing(false)
    }, [barbero, dateRange])

    useEffect(() => {
        if (!loading && barbero) {
            fetchReportData()
        }
    }, [loading, barbero, fetchReportData])

    // Advanced Calculations
    const metrics = useMemo(() => {
        const finalizadas = citas.filter(c => c.estado === 'finalizada')

        // Finances
        const cash = finalizadas.filter(c => c.metodo_pago === 'efectivo').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const transfer = finalizadas.filter(c => c.metodo_pago === 'transferencia').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const card = finalizadas.filter(c => c.metodo_pago === 'tarjeta').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const total = cash + transfer + card

        // Performance Time
        const withTime = finalizadas.filter(c => c.duracion_real_minutos !== null && c.duracion_real_minutos !== undefined)
        const globalAvgReal = withTime.length > 0
            ? Math.round(withTime.reduce((acc, c) => acc + (c.duracion_real_minutos || 0), 0) / withTime.length)
            : 0

        const globalAvgEst = withTime.length > 0
            ? Math.round(withTime.reduce((acc, c) => acc + (c.servicio_duracion || 0), 0) / withTime.length)
            : 0

        // Service Breakdown
        const serviceMap: Record<string, { totalReal: number, totalEst: number, countWithTime: number, totalCount: number, totalMoney: number }> = {}
        finalizadas.forEach(c => {
            const name = c.servicio_nombre || 'General'
            if (!serviceMap[name]) serviceMap[name] = { totalReal: 0, totalEst: 0, countWithTime: 0, totalCount: 0, totalMoney: 0 }

            serviceMap[name].totalMoney += (c.monto_pagado || c.servicio_precio || 0)
            serviceMap[name].totalCount += 1

            if (c.duracion_real_minutos) {
                serviceMap[name].totalReal += c.duracion_real_minutos
                serviceMap[name].totalEst += c.servicio_duracion || 0
                serviceMap[name].countWithTime += 1
            }
        })

        const serviceStats = Object.entries(serviceMap).map(([name, data]) => ({
            name,
            avgReal: data.countWithTime > 0 ? Math.round(data.totalReal / data.countWithTime) : 0,
            avgEst: data.countWithTime > 0 ? Math.round(data.totalEst / data.countWithTime) : 0,
            count: data.totalCount, // Now shows total services
            countWithTime: data.countWithTime, // Added this field
            income: data.totalMoney,
            efficiency: data.countWithTime > 0 ? Math.round((data.totalEst / data.totalReal) * 100) : 100
        })).sort((a, b) => b.income - a.income)

        // Trends (by day)
        const dayMap: Record<string, { name: string, total: number, count: number }> = {}
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

        if (dateRange === 'semana' && activeRange.start) {
            // Initialize week days
            const start = new Date(activeRange.start + 'T12:00:00')
            for (let i = 0; i < 7; i++) {
                const cur = new Date(start)
                cur.setDate(start.getDate() + i)
                const dKey = cur.toLocaleDateString('en-CA')
                dayMap[dKey] = { name: days[cur.getDay()], total: 0, count: 0 }
            }
        }

        finalizadas.forEach(c => {
            const dKey = c.fecha_cita_local
            if (!dayMap[dKey]) {
                const d = new Date(dKey + 'T12:00:00')
                dayMap[dKey] = { name: d.getDate().toString(), total: 0, count: 0 }
            }
            dayMap[dKey].total += (c.monto_pagado || c.servicio_precio || 0)
            dayMap[dKey].count += 1
        })

        const chartData = Object.entries(dayMap).map(([date, data]) => ({
            date,
            label: data.name,
            total: data.total,
            count: data.count
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Payment Distribution
        const paymentData = [
            { name: 'Efectivo', value: cash, color: '#3b82f6' },
            { name: 'Transferencia', value: transfer + card, color: '#a855f7' }
        ].filter(p => p.value > 0)

        return {
            total, cash, transfer, card,
            globalAvgReal, globalAvgEst,
            serviceStats,
            chartData,
            count: finalizadas.length,
            paymentData
        }
    }, [citas, dateRange, activeRange.start])

    if (loading) return null

    return (
        <div className="min-h-screen bg-[#06070a] text-white flex flex-col font-sans selection:bg-blue-500/30">
            {/* Background elements */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none" />
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 active:scale-95 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <h1 className="text-xl md:text-2xl font-black font-display tracking-tight uppercase">Dashboard Pro</h1>
                        </div>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-0.5">Métricas de {barbero?.nombre}</p>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
                    {(['hoy', 'semana', 'mes'] as const).map((r) => (
                        <Button
                            key={r}
                            variant="ghost"
                            onClick={() => setDateRange(r)}
                            className={cn(
                                "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                dateRange === r
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {r}
                        </Button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-12 relative z-10">
                <AnimatePresence mode="wait">
                    {isRefreshing ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-40"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin" />
                                <BarChart3 className="absolute inset-0 m-auto w-6 h-6 text-blue-500/50" />
                            </div>
                            <p className="mt-6 text-[10px] text-white/20 font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando analítica</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-[1600px] mx-auto space-y-8 pb-20"
                        >
                            {/* Top row KPIs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <KPICard
                                    title="Ingresos Totales"
                                    value={`$${metrics.total.toLocaleString()}`}
                                    subtitle="Periodo acumulado"
                                    icon={<DollarSign className="w-5 h-5" />}
                                    color="blue"
                                    trend={metrics.total > 0 ? "+12.5%" : undefined}
                                />
                                <KPICard
                                    title="Servicios"
                                    value={metrics.count.toString()}
                                    subtitle="Finalizados con éxito"
                                    icon={<CheckCircle2 className="w-5 h-5" />}
                                    color="emerald"
                                />
                                <KPICard
                                    title="Promedio Real"
                                    value={`${metrics.globalAvgReal}m`}
                                    subtitle={`vs ${metrics.globalAvgEst}m estimado`}
                                    icon={<Timer className="w-5 h-5" />}
                                    color="amber"
                                    status={metrics.globalAvgReal > metrics.globalAvgEst ? "warning" : "success"}
                                />
                                <KPICard
                                    title="Eficiencia"
                                    value={`${metrics.globalAvgEst > 0 ? Math.round((metrics.globalAvgEst / metrics.globalAvgReal) * 100) : 100}%`}
                                    subtitle="Aprovechamiento de tiempo"
                                    icon={<TrendingUp className="w-5 h-5" />}
                                    color="purple"
                                />
                            </div>

                            {/* Main Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl group">
                                    <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-black uppercase tracking-widest text-white/90">Flujo de Ingresos</CardTitle>
                                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-white/20">Ingresos brutos por fecha</CardDescription>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                                <TrendingUp className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={metrics.chartData}>
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 900 }}
                                                    dy={10}
                                                    minTickGap={20}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 900 }}
                                                    tickFormatter={(val) => `$${val}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="total"
                                                    stroke="#3b82f6"
                                                    strokeWidth={4}
                                                    fillOpacity={1}
                                                    fill="url(#colorTotal)"
                                                    animationDuration={2000}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                                    <CardHeader className="p-8 border-b border-white/5">
                                        <CardTitle className="text-lg font-black uppercase tracking-widest text-white/90 text-center text-ellipsis">Métodos de Pago</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 flex flex-col items-center justify-center h-[350px]">
                                        <div className="h-full w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={metrics.paymentData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={100}
                                                        paddingAngle={10}
                                                        dataKey="value"
                                                        animationDuration={1500}
                                                    >
                                                        {metrics.paymentData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</span>
                                                <span className="text-3xl font-black font-display text-white">${metrics.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 mt-4">
                                            {metrics.paymentData.map((p, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                    <span className="text-[10px] font-black uppercase text-white/60">{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Service Analytics */}
                            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-1 w-8 bg-blue-500 rounded-full" />
                                        <h2 className="text-sm font-black text-white/50 uppercase tracking-[0.4em] font-display">Análisis Detallado por Servicio</h2>
                                        <div className="flex-1 h-[1px] bg-white/5" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {metrics.serviceStats.length === 0 ? (
                                            <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01]">
                                                <Zap className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                                <p className="text-white/20 font-black uppercase tracking-[0.2em] text-xs">Aún no hay datos detallados registrados</p>
                                            </div>
                                        ) : metrics.serviceStats.map((s, idx) => {
                                            const isOver = s.avgReal > s.avgEst
                                            const diff = Math.abs(s.avgReal - s.avgEst)

                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.05] transition-all group overflow-hidden relative"
                                                >
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <Scissors className="w-20 h-20" />
                                                    </div>

                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="text-base font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{s.name}</h3>
                                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                                                {s.count} total • {s.countWithTime} con tiempo
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                                            <span className="text-xs font-black text-white">${s.income.toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="flex justify-between items-end">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Target vs Real</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl font-black font-display text-white/80">{s.avgEst}m</span>
                                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                    <span className={cn(
                                                                        "text-xl font-black font-display",
                                                                        isOver ? "text-orange-400" : "text-emerald-400"
                                                                    )}>{s.avgReal}m</span>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "h-6 px-3 border-none",
                                                                isOver ? "bg-orange-400/10 text-orange-400" : "bg-emerald-400/10 text-emerald-400"
                                                            )}>
                                                                {isOver ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                                <span className="text-[9px] font-black uppercase">{isOver ? `+${diff}m` : 'Optimizado'}</span>
                                                            </Badge>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                                <span className="text-white/20">Eficiencia de tiempo</span>
                                                                <span className={isOver ? "text-orange-400" : "text-emerald-400"}>{s.efficiency}%</span>
                                                            </div>
                                                            <Progress
                                                                value={Math.min(100, s.efficiency)}
                                                                className="h-1.5 bg-white/5"
                                                                indicatorClassName={isOver ? "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed CRM Log */}
                            <div className="mt-12 space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-1 w-8 bg-purple-500 rounded-full" />
                                    <h2 className="text-sm font-black text-white/50 uppercase tracking-[0.4em] font-display">Log Detallado y Notas CRM</h2>
                                    <div className="flex-1 h-[1px] bg-white/5" />
                                </div>

                                <Card className="bg-white/[0.01] border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-white/[0.02]">
                                                    <TableRow className="hover:bg-transparent border-white/5">
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-14 px-6">Cliente / Fecha</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-14">Servicio</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-14 text-right">Monto</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-14">Tiempo Real</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-14 px-6">Observaciones CRM</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {citas.map((cita) => (
                                                        <TableRow key={cita.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                                                            <TableCell className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-white/90 uppercase tracking-tight">{cita.cliente_nombre}</span>
                                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                                                        {new Date(cita.fecha_cita_local + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="bg-blue-500/5 border-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest h-5">
                                                                    {cita.servicio_nombre}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-emerald-400 text-xs px-4">
                                                                ${(cita.monto_pagado || cita.servicio_precio || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "text-xs font-black font-display",
                                                                        cita.duracion_real_minutos ? "text-white/80" : "text-white/10"
                                                                    )}>
                                                                        {cita.duracion_real_minutos ? `${cita.duracion_real_minutos} min` : '--'}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-white/20 uppercase">Est: {cita.servicio_duracion}m</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4">
                                                                <div className="flex flex-col gap-2 max-w-md">
                                                                    {cita.notas_crm && (
                                                                        <div className="group relative">
                                                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-25 group-hover:opacity-40 transition" />
                                                                            <div className="relative bg-[#0a0a0b] border border-blue-500/20 rounded-lg p-3">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400">Nota CRM</span>
                                                                                </div>
                                                                                <p className="text-[11px] text-blue-100/70 font-medium leading-relaxed">{cita.notas_crm}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {cita.notas && (
                                                                        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Nota Interna</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-white/40 italic leading-relaxed">"{cita.notas}"</p>
                                                                        </div>
                                                                    )}
                                                                    {!cita.notas_crm && !cita.notas && (
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/10 italic">Sin observaciones</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {citas.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="h-40 text-center">
                                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                                    <Zap className="w-8 h-8" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Sin registros disponibles</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Footer fix */}
            <div className="md:hidden h-20 w-full" />
        </div>
    )
}

interface KPICardProps {
    title: string
    value: string
    subtitle: string
    icon: React.ReactNode
    color: 'blue' | 'emerald' | 'amber' | 'purple'
    status?: 'success' | 'warning'
    trend?: string
}

function KPICard({ title, value, subtitle, icon, color, status, trend }: KPICardProps) {
    const variants = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]",
    }
    const colorStyles = variants[color] || ""

    return (
        <Card className="bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl group hover:bg-white/[0.04] transition-all duration-500">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", colorStyles)}>
                        {icon}
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg text-emerald-500 text-[10px] font-black">
                            <ArrowUpRight className="w-3 h-3" />
                            {trend}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[.2em]">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black font-display text-white tracking-tight">{value}</span>
                        {status === 'warning' && <AlertCircle className="w-4 h-4 text-orange-400" />}
                    </div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{subtitle}</p>
                </div>
            </CardContent>
        </Card>
    )
}
