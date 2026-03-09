'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista } from '@/lib/types'

export default function TabletReportesPage() {
    const router = useRouter()
    const [barbero, setBarbero] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('hoy')
    const [customDates, setCustomDates] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })
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
                console.log('📦 Session loaded in reports:', session?.nombre)
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
        const hoyStr = hoy.toISOString().split('T')[0]

        if (dateRange === 'hoy') {
            startDate = hoyStr
            endDate = hoyStr
        } else if (dateRange === 'semana') {
            const day = hoy.getDay() // 0 (Dom) a 6 (Sab)
            const diffToMonday = (day === 0 ? -6 : 1) - day
            const monday = new Date(hoy)
            monday.setDate(hoy.getDate() + diffToMonday)
            startDate = monday.toISOString().split('T')[0]

            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            endDate = sunday.toISOString().split('T')[0]
        } else if (dateRange === 'mes') {
            const firstDay = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            startDate = firstDay.toISOString().split('T')[0]

            const lastDay = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            endDate = lastDay.toISOString().split('T')[0]
        } else {
            startDate = customDates.start
            endDate = customDates.end
        }

        setActiveRange({ start: startDate, end: endDate })

        const { data, error } = await supabase
            .from('vista_citas_agente')
            .select('*')
            .eq('barbero_id', barbero.id)
            .eq('estado', 'finalizada')
            .gte('fecha_cita_local', startDate)
            .lte('fecha_cita_local', endDate)
            .order('timestamp_inicio', { ascending: true })

        if (data) setCitas(data as CitaDesdeVista[])
        setIsRefreshing(false)
    }, [barbero, dateRange, customDates])

    useEffect(() => {
        if (!loading && barbero) {
            fetchReportData()
        }
    }, [loading, barbero, fetchReportData])

    // Calculations
    const stats = useMemo(() => {
        const cash = citas.filter(c => c.metodo_pago === 'efectivo').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const transfer = citas.filter(c => c.metodo_pago === 'transferencia').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const total = cash + transfer

        // Performance
        const appointmentsWithTime = citas.filter(c => c.duracion_real_minutos !== null)
        const avgReal = appointmentsWithTime.length > 0
            ? Math.round(appointmentsWithTime.reduce((acc, c) => acc + (c.duracion_real_minutos || 0), 0) / appointmentsWithTime.length)
            : 0

        // Breakdown by Service
        const serviceMap: Record<string, { totalReal: number, totalEst: number, count: number }> = {}
        citas.forEach(c => {
            const name = c.servicio_nombre || 'General'
            if (!serviceMap[name]) serviceMap[name] = { totalReal: 0, totalEst: 0, count: 0 }
            if (c.duracion_real_minutos) {
                serviceMap[name].totalReal += c.duracion_real_minutos
                serviceMap[name].count += 1
            }
            // If they don't have real time, we don't count it for average comparison
        })

        const serviceStats = Object.entries(serviceMap).map(([name, data]) => ({
            name,
            avgReal: data.count > 0 ? Math.round(data.totalReal / data.count) : 0,
            count: data.count
        })).sort((a, b) => b.count - a.count)

        // Date display string
        let rangeText = 'Sin datos'
        if (activeRange.start && activeRange.end) {
            const first = new Date(activeRange.start + 'T12:00:00')
            const last = new Date(activeRange.end + 'T12:00:00')
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

            if (activeRange.start === activeRange.end) {
                rangeText = first.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
            } else {
                rangeText = `Del ${first.toLocaleDateString('es-MX', options)} al ${last.toLocaleDateString('es-MX', options)}`
            }
        }

        return { cash, transfer, total, avgReal, count: citas.length, serviceStats, displayDateRangeText: rangeText }
    }, [citas, activeRange])

    if (loading) return null

    return (
        <div className="min-h-screen bg-[#06070a] text-white p-4 pb-20 md:p-8 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all active:scale-95"
                    >
                        <span className="material-icons-round text-2xl text-white/70">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black font-display tracking-tight">Estadísticas</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">{barbero?.nombre}</p>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest">
                                {stats.displayDateRangeText}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                    {(['hoy', 'semana', 'mes'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setDateRange(r)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${dateRange === r
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {isRefreshing ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-white/40 font-bold tracking-widest uppercase text-xs">Cargando datos...</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* Finance Card */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FinanceKPI
                                    label="Total Generado"
                                    value={stats.total}
                                    icon="payments"
                                    color="text-emerald-400"
                                    bg="bg-emerald-400/10"
                                />
                                <FinanceKPI
                                    label="Efectivo"
                                    value={stats.cash}
                                    icon="account_balance_wallet"
                                    color="text-blue-400"
                                    bg="bg-blue-400/10"
                                />
                                <FinanceKPI
                                    label="Transferencia"
                                    value={stats.transfer}
                                    icon="sync_alt"
                                    color="text-purple-400"
                                    bg="bg-purple-400/10"
                                />
                            </div>

                            {/* Detailed Finance Chart/Card */}
                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <span className="material-icons-round text-8xl">trending_up</span>
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest text-white/70 mb-8">Resumen de Ingresos</h2>

                                <div className="flex flex-col gap-8">
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                        <div className="text-5xl md:text-7xl font-black font-display tracking-tighter leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                                            ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="text-white/40 font-bold mb-1 uppercase tracking-widest text-[10px] shrink-0">MXN Totales acumulados</div>
                                    </div>

                                    <div className="h-8 w-full bg-white/5 rounded-2xl overflow-hidden flex border border-white/5 p-1 relative shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: stats.total > 0 ? `${(stats.cash / stats.total) * 100}%` : '0%' }}
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-1000"
                                        />
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: stats.total > 0 ? `${(stats.transfer / stats.total) * 100}%` : '0%' }}
                                            className={`h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-1000 ${stats.cash > 0 ? 'ml-1' : ''}`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Efectivo</span>
                                            </div>
                                            <div className="text-2xl font-black font-display text-blue-400 tabular-nums">
                                                ${stats.cash.toLocaleString('es-MX')}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Transferencia</span>
                                            </div>
                                            <div className="text-2xl font-black font-display text-purple-400 tabular-nums">
                                                ${stats.transfer.toLocaleString('es-MX')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Column */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 backdrop-blur-xl h-full">
                                <h2 className="text-lg font-black uppercase tracking-widest text-white/70 mb-8 flex items-center gap-3">
                                    <span className="material-icons-round text-blue-400">timer</span>
                                    Rendimiento
                                </h2>

                                <div className="space-y-10">
                                    <div>
                                        <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Tiempo Promedio Real</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black font-display text-emerald-400">{stats.avgReal}</span>
                                            <span className="text-emerald-400/40 font-bold uppercase tracking-widest text-xs">Minutos</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Por Servicio</h3>
                                        {stats.serviceStats.length === 0 ? (
                                            <p className="text-white/20 text-sm font-medium italic">No hay datos de tiempo grabados.</p>
                                        ) : (
                                            stats.serviceStats.map((s, idx) => (
                                                <div key={idx} className="group">
                                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                                                        <span className="text-white/60 group-hover:text-white transition-colors">{s.name}</span>
                                                        <span className="text-emerald-400">{s.avgReal}m</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, (s.avgReal / 60) * 100)}%` }}
                                                            className="h-full bg-emerald-500/50 group-hover:bg-emerald-500 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center mt-auto">
                                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1">Total Servicios</p>
                                        <div className="text-3xl font-black font-display text-white">{stats.count}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function FinanceKPI({ label, value, icon, color, bg }: any) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-lg flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center ${color}`}>
                <span className="material-icons-round">{icon}</span>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{label}</p>
                <div className={`text-2xl font-black font-display ${color}`}>
                    ${value.toLocaleString()}
                </div>
            </div>
        </div>
    )
}
