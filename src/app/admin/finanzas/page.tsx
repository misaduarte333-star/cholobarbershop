'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { 
    TrendingUp,
    Wallet,
    Calendar as CalendarIcon,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    CreditCard,
    DollarSign,
    RefreshCw,
    Trash2,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    BarChart3,
    Table as TableIcon
} from 'lucide-react'
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth as endOfMonthDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import type { Barbero, CitaDesdeVista, Gasto } from '@/lib/types'

export default function FinanzasPage() {
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Form state
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [fechaPago, setFechaPago] = useState<Date | undefined>(new Date())
    const [esRecurrente, setEsRecurrente] = useState(false)
    const [pagado, setPagado] = useState(false)
    const [sucursalId, setSucursalId] = useState<string | null>(null)
    
    // Recurrence details
    const [frecuencia, setFrecuencia] = useState<'mensual' | 'semanal' | 'diario' | 'anual'>('mensual')
    const [diaSemana, setDiaSemana] = useState<string>('')
    const [diaMes, setDiaMes] = useState<number>(new Date().getDate())
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('')
    const [detallesPago, setDetallesPago] = useState('')
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
    const [gastoToPay, setGastoToPay] = useState<Gasto | null>(null)
    const [montoConfirmacion, setMontoConfirmacion] = useState('')
    const [showRecurrenceAlert, setShowRecurrenceAlert] = useState(false)
    const [updateFutureRecurrence, setUpdateFutureRecurrence] = useState(false)

    // Break-even states
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [selectedBarberoId, setSelectedBarberoId] = useState<string>('')
    const [barberoIncome, setBarberoIncome] = useState(0)
    const [loadingIncome, setLoadingIncome] = useState(false)

    const supabase = createClient()

    const fetchGastos = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .order('fecha_pago', { ascending: true })
            
            if (error) {
                console.error('Fetch error:', error)
                throw error
            }

            setGastos((data as any[] as Gasto[]) || [])
        } catch (error: any) {
            console.error('Error fetching gastos:', error?.message || error)
            toast.error('Error al conectar con la base de datos de gastos')
            setGastos([])
        } finally {
            setLoading(false)
        }
    }

    const fetchSucursal = async () => {
        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('id')
                .limit(1)
                .maybeSingle()

            if (error) throw error
            if (data) setSucursalId((data as {id: string}).id)
        } catch (error: any) {
            console.error('Error fetching sucursal:', error?.message || error)
        }
    }

    const fetchBarberos = async () => {
        try {
            const { data, error } = await supabase.from('barberos').select('*').eq('activo', true)
            if (error) throw error
            const casted = data as Barbero[]
            setBarberos(casted)
            
            // Try to find Gabriel by default
            const gabriel = casted.find(b => b.nombre.toLowerCase().includes('gabriel'))
            if (gabriel) {
                setSelectedBarberoId(gabriel.id)
            } else if (casted.length > 0) {
                setSelectedBarberoId(casted[0].id)
            }
        } catch (error) {
            console.error('Error fetching barberos:', error)
        }
    }

    const fetchBarberoIncome = async (barberoId: string) => {
        if (!barberoId) return
        setLoadingIncome(true)
        try {
            const start = startOfMonth(new Date()).toISOString()
            const end = endOfMonthDate(new Date()).toISOString()

            const [citasRes, cortesRes] = await Promise.all([
                supabase
                    .from('vista_citas_app')
                    .select('servicio_precio, fecha_cita_local, timestamp_inicio_local, estado')
                    .eq('barbero_id', barberoId)
                    .gte('timestamp_inicio_local', start)
                    .lte('timestamp_inicio_local', end)
                    .in('estado', ['finalizada', 'confirmada', 'en_proceso']),
                supabase
                    .from('cortes_turno')
                    .select('fecha_corte')
                    .gte('fecha_corte', start)
                    .lte('fecha_corte', end)
                    .eq('tipo', 'diario')
            ])

            if (citasRes.error) throw citasRes.error
            if (cortesRes.error) throw cortesRes.error
            
            const cortesFechas = new Set((cortesRes.data || []).map((c: any) => c.fecha_corte))

            let total = 0
            if (citasRes.data) {
                citasRes.data.forEach((cita: any) => {
                    if (cita.estado !== 'finalizada') return
                    const dKey = cita.fecha_cita_local || (cita.timestamp_inicio_local ? cita.timestamp_inicio_local.split('T')[0] : '')
                    if (cortesFechas.has(dKey)) {
                        total += (cita.servicio_precio || 0)
                    }
                })
            }
            setBarberoIncome(total)
        } catch (error) {
            console.error('Error fetching barbero income:', error)
            setBarberoIncome(0)
        } finally {
            setLoadingIncome(false)
        }
    }

    useEffect(() => {
        fetchGastos()
        fetchSucursal()
        fetchBarberos()
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

    useEffect(() => {
        if (selectedBarberoId) {
            fetchBarberoIncome(selectedBarberoId)
        }
    }, [selectedBarberoId])

    const clearForm = () => {
        setDescripcion('')
        setMonto('')
        setFechaPago(new Date())
        setEsRecurrente(false)
        setFrecuencia('mensual')
        setDiaSemana('')
        setDiaMes(new Date().getDate())
        setPagado(false)
        setEditingGasto(null)
    }

    const openEditModal = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setDescripcion(gasto.descripcion)
        setMonto(gasto.monto.toString())
        setFechaPago(new Date(gasto.fecha_pago))
        setEsRecurrente(gasto.es_recurrente)
        setFrecuencia(gasto.frecuencia || 'mensual')
        setDiaSemana(gasto.dia_semana || '')
        setDiaMes(gasto.dia_mes || new Date(gasto.fecha_pago).getDate())
        setPagado(gasto.pagado)
        setIsDialogOpen(true)
    }

    const openPayModal = (gasto: Gasto) => {
        setGastoToPay(gasto)
        setMontoConfirmacion(gasto.monto.toString())
        setIsPayDialogOpen(true)
        setShowRecurrenceAlert(false)
        setUpdateFutureRecurrence(false)
    }

    const handleSaveGasto = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descripcion || !monto || !fechaPago) return

        const gastoData = {
            sucursal_id: sucursalId || editingGasto?.sucursal_id || '49e2954a-a197-422c-9a4f-56f8f553f123',
            descripcion,
            monto: parseFloat(monto),
            fecha_pago: fechaPago.toISOString(),
            pagado: pagado,
            es_recurrente: esRecurrente,
            frecuencia: esRecurrente ? frecuencia : null,
            dia_semana: esRecurrente && frecuencia === 'semanal' ? diaSemana : null,
            dia_mes: esRecurrente && frecuencia === 'mensual' ? diaMes : null,
            metodo_pago: pagado ? (editingGasto?.metodo_pago || 'efectivo') : null,
            detalles_pago: pagado ? (editingGasto?.detalles_pago || '') : null
        }

        try {
            if (!sucursalId && !editingGasto) {
                console.warn('No sucursalId found, trying to fetch before saving...')
                const { data } = await supabase.from('sucursales').select('id').limit(1).maybeSingle() as { data: { id: string } | null }
                if (data) setSucursalId(data.id)
                else throw new Error('No se encontró una sucursal para asociar el gasto. Por favor crea una sucursal primero.')
            }

            if (editingGasto) {
                const { error } = await (supabase as any)
                    .from('gastos')
                    .update(gastoData)
                    .eq('id', editingGasto.id)
                if (error) throw error
                toast.success('Gasto actualizado correctamente')
            } else {
                const { error } = await (supabase as any).from('gastos').insert([gastoData])
                if (error) throw error
                toast.success('Gasto añadido correctamente')
            }
            
            setIsDialogOpen(false)
            clearForm()
            fetchGastos()
        } catch (error: any) {
            console.error('Error saving gasto (Detailed):', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                error
            })
            
            toast.error(`Error: ${error?.message || 'Error al guardar en la base de datos'}`)
            
            // Still fallback for demo purposes but warn the console
            console.warn('Falling back to demo mode due to save error')
            if (editingGasto) {
                const updatedGasto: Gasto = {
                    ...editingGasto,
                    ...gastoData,
                    updated_at: new Date().toISOString()
                }
                setGastos(prev => prev.map(g => g.id === editingGasto.id ? updatedGasto : g))
                toast.success('Gasto actualizado (Modo Demo)')
            } else {
                const mockGasto: Gasto = {
                    id: Math.random().toString(36).substr(2, 9),
                    ...gastoData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
                setGastos(prev => [...prev, mockGasto].sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()))
                toast.success('Gasto añadido (Modo Demo)')
            }
            setIsDialogOpen(false)
            clearForm()
        }
    }

    const handleConfirmPayment = async (forceUpdateFuture?: boolean) => {
        if (!gastoToPay || !metodoPago || !montoConfirmacion) {
            toast.error('Por favor completa todos los campos')
            return
        }

        const nuevoMonto = parseFloat(montoConfirmacion)
        const montoCambiado = nuevoMonto !== gastoToPay.monto
        const shouldUpdateFuture = forceUpdateFuture !== undefined ? forceUpdateFuture : updateFutureRecurrence

        // Si el monto cambió y no se ha mostrado la alerta, mostrarla
        if (montoCambiado && !showRecurrenceAlert && gastoToPay.es_recurrente && forceUpdateFuture === undefined) {
            setShowRecurrenceAlert(true)
            return
        }

        try {
            // Update individual record
            const updateData: any = {
                pagado: true,
                metodo_pago: metodoPago,
                detalles_pago: detallesPago,
                monto: nuevoMonto,
                updated_at: new Date().toISOString()
            }

            const { error } = await (supabase.from('gastos') as any)
                .update(updateData)
                .eq('id', gastoToPay.id)

            if (error) throw error

            // Si se pidió actualizar de forma recurrente, actualizamos todos los gastos futuros con misma descripción
            if (shouldUpdateFuture && gastoToPay.es_recurrente) {
                const { error: recurError } = await (supabase.from('gastos') as any)
                    .update({ monto: nuevoMonto })
                    .eq('descripcion', gastoToPay.descripcion)
                    .eq('es_recurrente', true)
                    .eq('pagado', false)
                
                if (recurError) console.error('Error updating future recurrence:', recurError)
                else toast.success('Precios futuros actualizados')
            }
            
            toast.success('¡Gasto pagado con éxito!')
            setIsPayDialogOpen(false)
            setGastoToPay(null)
            setMetodoPago('')
            setDetallesPago('')
            setMontoConfirmacion('')
            setShowRecurrenceAlert(false)
            setUpdateFutureRecurrence(false)
            fetchGastos()
        } catch (error: any) {
            console.error('Error confirming payment:', error)
            toast.error(`Error al registrar pago: ${error.message}`)
        }
    }

    const getGastoStatus = (gasto: Gasto) => {
        if (gasto.pagado) return 'paid'
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const fechaPagoParsed = new Date(gasto.fecha_pago)
        fechaPagoParsed.setHours(0, 0, 0, 0)
        
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        
        if (fechaPagoParsed < today) return 'overdue'
        if (fechaPagoParsed.getTime() === tomorrow.getTime()) return 'due_tomorrow'
        if (fechaPagoParsed.getTime() === today.getTime()) return 'due_today'
        
        return 'pending'
    }

    // Savings Calculation logic
    const savingsMetrics = useMemo(() => {
        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        // recurrent costs (unique by description)
        const recurrentesUnicos = new Map<string, number>()
        gastos.filter(g => g.es_recurrente).forEach(g => {
            recurrentesUnicos.set(g.descripcion, g.monto)
        })
        const sumRecurrentes = Array.from(recurrentesUnicos.values()).reduce((a, b) => a + b, 0)

        // one-time costs for current month
        const monthlyGastosPuntuales = gastos.filter(g => {
            if (g.es_recurrente) return false
            const d = new Date(g.fecha_pago)
            return d >= startOfMonth && d <= endOfMonth
        })

        const totalMonthly = sumRecurrentes + monthlyGastosPuntuales.reduce((sum, g) => sum + g.monto, 0)

        const vencidos = gastos.filter(g => getGastoStatus(g) === 'overdue').length
        const manana = gastos.filter(g => getGastoStatus(g) === 'due_tomorrow').length
        
        return {
            diario: totalMonthly / 30,
            semanal: totalMonthly / 4,
            mensual: totalMonthly,
            vencidos,
            manana
        }
    }, [gastos])

    return (
        <div className="relative min-h-full bg-[#0A0A0A] selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-20 border-b border-white/5 mb-4 font-display">
                    <div className="flex items-center gap-3 text-white">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all hover:scale-105">
                            <TrendingUp className="text-primary w-4 h-4 shadow-lg shadow-primary/20" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Control Financiero</h2>
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

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) clearForm()
                    }}>
                        <DialogTrigger render={
                            <Button className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-bold uppercase tracking-tighter shadow-lg shadow-gold/20 h-11 px-6 rounded-xl">
                                <Plus className="w-5 h-5 mr-2" />
                                Registrar Gasto
                            </Button>
                        } />
                        <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-lg rounded-[2.5rem] p-0 overflow-hidden">
                            {/* Modal Content - same as before but styled */}
                            <div className="bg-gradient-to-br from-[#D4AF37]/20 to-transparent p-6 border-b border-white/5">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-display text-gradient-gold tracking-tight uppercase">
                                        {editingGasto ? 'Editar Gasto' : 'Nuevo Registro'}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                                        {editingGasto ? 'Modifica los parámetros del gasto' : 'Añade un nuevo movimiento financiero'}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            
                            <form onSubmit={handleSaveGasto} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Descripción</Label>
                                    <Input 
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl h-11"
                                        placeholder="Ej: Renta del local"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Monto (MXN)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                                            <Input 
                                                type="number"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                                className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl h-11 pl-8 font-display font-bold"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Fecha</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                                            <Input 
                                                type="date"
                                                value={fechaPago ? format(fechaPago, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => setFechaPago(new Date(e.target.value))}
                                                className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl h-11 pl-10 text-xs"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Gasto Recurrente</Label>
                                            <p className="text-[9px] text-white/30 uppercase font-bold">Generar automáticamente cada periodo</p>
                                        </div>
                                        <Switch checked={esRecurrente} onCheckedChange={setEsRecurrente} className="data-[state=checked]:bg-primary" />
                                    </div>

                                    {esRecurrente && (
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">Frecuencia</Label>
                                                <Select value={frecuencia} onValueChange={(v: any) => setFrecuencia(v)}>
                                                    <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="diario">Diario</SelectItem>
                                                        <SelectItem value="semanal">Semanal</SelectItem>
                                                        <SelectItem value="mensual">Mensual</SelectItem>
                                                        <SelectItem value="anual">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {frecuencia === 'mensual' && (
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1">Día Cobro</Label>
                                                    <Input 
                                                        type="number" min="1" max="31" 
                                                        value={diaMes} onChange={(e) => setDiaMes(parseInt(e.target.value))}
                                                        className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Estado Actual</Label>
                                        <p className="text-[9px] text-white/30 uppercase font-bold">{pagado ? 'Pago realizado' : 'Pendiente de pago'}</p>
                                    </div>
                                    <Switch checked={pagado} onCheckedChange={setPagado} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <DialogFooter className="pt-4 gap-2">
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest">Cancelar</Button>
                                    <Button type="submit" className="bg-gradient-gold text-black font-black uppercase tracking-widest text-[10px] px-8 h-11 rounded-xl shadow-lg shadow-gold/20">
                                        {editingGasto ? 'Guardar Cambios' : 'Registrar Pago'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* Savings Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <SavingsCard 
                    label="Meta Diaria" 
                    value={savingsMetrics.diario} 
                    icon="savings" 
                    desc="Lo que debes juntar hoy"
                    color="blue"
                />
                <SavingsCard 
                    label="Meta Semanal" 
                    value={savingsMetrics.semanal} 
                    icon="event_repeat" 
                    desc="Proyección de ahorro semanal"
                    color="amber"
                />
                <SavingsCard 
                    label="Meta Mensual" 
                    value={savingsMetrics.mensual} 
                    icon="account_balance" 
                    desc="Total de gastos de este mes"
                    color="indigo"
                />
                {/* Pagos Vencidos */}
                <Card className={cn(
                    "glass-card border-white/5 bg-black/40 overflow-hidden rounded-2xl relative group hover:scale-[1.02] transition-all duration-300",
                    savingsMetrics.vencidos > 0 && "border-red-500/30 bg-red-500/5"
                )}>
                    <CardContent className="p-2.5 sm:p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn(
                                "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border text-sm transition-all",
                                savingsMetrics.vencidos > 0
                                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-50"
                            )}>
                                <span className={cn("material-icons-round text-sm", savingsMetrics.vencidos > 0 && "animate-pulse")}>
                                    {savingsMetrics.vencidos > 0 ? 'warning' : 'verified'}
                                </span>
                            </div>
                            <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-[0.15em]">Vencidos</p>
                        </div>
                        <span className={cn("text-base sm:text-xl font-black tracking-tighter", savingsMetrics.vencidos > 0 ? "text-red-400" : "text-white")}>
                            {savingsMetrics.vencidos}
                        </span>
                        <p className="text-[6px] sm:text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                            {savingsMetrics.vencidos > 0 ? 'Atrasados' : 'Al día'}
                        </p>
                        {savingsMetrics.vencidos > 0 && <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full blur-2xl opacity-20 bg-red-500" />}
                    </CardContent>
                </Card>

                {/* Pagos Mañana */}
                <Card className={cn(
                    "glass-card border-white/5 bg-black/40 overflow-hidden rounded-2xl relative group hover:scale-[1.02] transition-all duration-300",
                    savingsMetrics.manana > 0 && "border-amber-500/30 bg-amber-500/5"
                )}>
                    <CardContent className="p-2.5 sm:p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn(
                                "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border text-sm transition-all",
                                savingsMetrics.manana > 0
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-50"
                            )}>
                                <span className={cn("material-icons-round text-sm", savingsMetrics.manana > 0 && "animate-bounce")}>
                                    {savingsMetrics.manana > 0 ? 'notification_important' : 'verified'}
                                </span>
                            </div>
                            <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-[0.15em]">Mañana</p>
                        </div>
                        <span className={cn("text-base sm:text-xl font-black tracking-tighter", savingsMetrics.manana > 0 ? "text-amber-400" : "text-white")}>
                            {savingsMetrics.manana}
                        </span>
                        <p className="text-[6px] sm:text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                            {savingsMetrics.manana > 0 ? 'Vencen pronto' : 'Sin pendientes'}
                        </p>
                        {savingsMetrics.manana > 0 && <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full blur-2xl opacity-20 bg-amber-500" />}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Payments Summary Table */}
            <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-2xl">
                <CardHeader className="p-3 sm:p-5 pb-0">
                    <CardTitle className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <span className="material-icons-round text-sm">receipt_long</span>
                        </div>
                        Resumen de Pagos
                        <Badge variant="outline" className="text-[8px] border-white/10 text-white/30 ml-auto font-black">{gastos.length} registros</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-2">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="text-left px-3 sm:px-5 py-2 text-[8px] font-black uppercase tracking-widest text-white/30">Concepto</th>
                                    <th className="text-center px-2 py-2 text-[8px] font-black uppercase tracking-widest text-white/30 hidden sm:table-cell">Fecha</th>
                                    <th className="text-right px-2 py-2 text-[8px] font-black uppercase tracking-widest text-white/30">Monto</th>
                                    <th className="text-center px-2 py-2 text-[8px] font-black uppercase tracking-widest text-white/30">Estado</th>
                                    <th className="text-right px-3 sm:px-5 py-2 text-[8px] font-black uppercase tracking-widest text-white/30">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map(gasto => {
                                    const status = getGastoStatus(gasto)
                                    return (
                                        <tr key={gasto.id} className={cn(
                                            "border-b border-white/5 hover:bg-white/5 transition-colors",
                                            status === 'overdue' && "bg-red-500/5",
                                            status === 'due_today' && "bg-amber-500/5"
                                        )}>
                                            <td className="px-3 sm:px-5 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {gasto.es_recurrente && <span className="material-icons-round text-[10px] text-amber-400">repeat</span>}
                                                    <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[90px] sm:max-w-[180px]">{gasto.descripcion}</p>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center hidden sm:table-cell">
                                                <span className="text-[9px] font-bold text-white/40">{format(new Date(gasto.fecha_pago), 'dd/MM/yy')}</span>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <span className="text-[10px] font-black text-amber-400">${gasto.monto.toLocaleString()}</span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {status === 'overdue' && <Badge variant="outline" className="text-[7px] border-red-500/30 text-red-400 h-4 px-1 font-black">VENC.</Badge>}
                                                {status === 'due_tomorrow' && <Badge variant="outline" className="text-[7px] border-amber-500/30 text-amber-400 h-4 px-1 font-black">MAÑANA</Badge>}
                                                {status === 'due_today' && <Badge variant="outline" className="text-[7px] border-orange-500/30 text-orange-400 h-4 px-1 font-black">HOY</Badge>}
                                                {status === 'paid' && <Badge variant="outline" className="text-[7px] border-emerald-500/30 text-emerald-400 h-4 px-1 font-black">PAGADO</Badge>}
                                                {status === 'pending' && <Badge variant="outline" className="text-[7px] border-white/15 text-white/25 h-4 px-1 font-black">PEND.</Badge>}
                                            </td>
                                            <td className="px-3 sm:px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!gasto.pagado ? (
                                                        <Button size="sm" className="h-7 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all whitespace-nowrap" onClick={() => openPayModal(gasto)}>
                                                            Pagar
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-widest">Pagado</span>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/20 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors shrink-0" onClick={() => openEditModal(gasto)}>
                                                        <span className="material-icons-round text-xs">edit</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {gastos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-white/20 text-[10px] uppercase font-black tracking-widest">Sin pagos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Break-Even Analysis Section */}
            <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2.5rem] relative group border-indigo-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5 opacity-50" />
                <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                                <span className="material-icons-round text-lg sm:text-2xl">insights</span>
                            </div>
                            Análisis de <span className="text-gradient-gold">P.E.</span><span className="hidden sm:inline"> · Punto de Equilibrio</span>
                        </CardTitle>
                        <CardDescription className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Rentabilidad basada en ingresos de barberos</CardDescription>
                    </div>
                    {barberos.find(b => b.id === selectedBarberoId) && (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                            <span className="material-icons-round text-sm text-indigo-400">person</span>
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{barberos.find(b => b.id === selectedBarberoId)?.nombre}</span>
                            {loadingIncome && <span className="material-icons-round text-xs text-white/30 animate-spin">refresh</span>}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-10">
                        {/* Summary Stats */}
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Ingreso Actual ({barberos.find(b => b.id === selectedBarberoId)?.nombre || '...' })</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl sm:text-4xl font-black tracking-tighter text-white">${barberoIncome.toLocaleString()}</span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">Este mes</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Meta de Cobertura (Gastos)</p>
                                    <p className="text-xs font-black text-amber-500 tracking-tight">${savingsMetrics.mensual.toLocaleString()}</p>
                                </div>
                                <div className="relative pt-2">
                                    <Progress 
                                        value={Math.min((barberoIncome / (savingsMetrics.mensual || 1)) * 100, 100)} 
                                        className="h-3 bg-white/5 border border-white/5"
                                    />
                                    <div className="absolute -top-1 right-0 w-2 h-5 bg-amber-500/50 blur-[2px] rounded-full" style={{ left: '100%' }} />
                                </div>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em] text-center italic">
                                    {barberoIncome >= savingsMetrics.mensual 
                                        ? "✨ ¡HAS OPERADO SUPERANDO EL PUNTO DE EQUILIBRIO!" 
                                        : `Faltan $${Math.max(0, savingsMetrics.mensual - barberoIncome).toLocaleString()} para cubrir gastos`}
                                </p>
                            </div>
                        </div>

                        {/* Threshold Analysis */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-all">
                                <div className="space-y-2 sm:space-y-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                        <span className="material-icons-round text-base sm:text-xl">trending_up</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Umbral de Ganancia</h4>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-relaxed hidden sm:block">Punto donde cada peso extra es utilidad neta</p>
                                    </div>
                                </div>
                                <div className="mt-3 sm:mt-8">
                                    <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                                        {barberoIncome > savingsMetrics.mensual ? (
                                            `+$${(barberoIncome - savingsMetrics.mensual).toLocaleString()}`
                                        ) : (
                                            `$${savingsMetrics.mensual.toLocaleString()}`
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">
                                        {barberoIncome > savingsMetrics.mensual ? "Utilidad Generada" : "Break-Even"}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-all">
                                <div className="space-y-2 sm:space-y-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-base sm:text-xl">
                                        ⚖️
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Ratio de Cobertura</h4>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-relaxed hidden sm:block">Porcentaje de gastos cubiertos actualmente</p>
                                    </div>
                                </div>
                                <div className="mt-3 sm:mt-8">
                                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        {Math.round((barberoIncome / (savingsMetrics.mensual || 1)) * 100)}%
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">Eficiencia Op.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Confirmation Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="w-[94vw] max-w-md max-h-[90dvh] bg-[#0a0a0b]/95 border-white/5 text-white backdrop-blur-2xl p-0 overflow-y-auto rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-emerald-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/5 opacity-50 pointer-events-none" />
                    
                    <DialogHeader className="p-4 sm:p-8 pb-0 relative z-10">
                        <div className="flex items-center justify-between mb-3 sm:mb-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                    <span className="material-icons-round text-lg sm:text-3xl text-emerald-400">payments</span>
                                </div>
                                <div className="space-y-0.5 sm:space-y-1">
                                    <DialogTitle className="text-base sm:text-2xl font-black tracking-tight text-white">Confirmar Pago</DialogTitle>
                                    <DialogDescription className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Transacción Segura</DialogDescription>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsPayDialogOpen(false)}
                                className="rounded-full h-10 w-10 text-white/20 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <span className="material-icons-round">close</span>
                            </Button>
                        </div>

                        {gastoToPay && (
                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 sm:p-6 mb-2 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="material-icons-round text-5xl sm:text-6xl">receipt_long</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1.5 sm:mb-2">Resumen del Gasto</p>
                                <h4 className="text-sm sm:text-lg font-black text-white truncate mb-2 sm:mb-3">{gastoToPay.descripcion}</h4>
                                
                                <div className="relative mt-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mb-1 block">Monto a Pagar</Label>
                                    <div className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 focus-within:border-emerald-500/50 transition-colors">
                                        <span className="text-white/40 text-lg sm:text-xl font-black">$</span>
                                        <input 
                                            type="number"
                                            value={montoConfirmacion}
                                            onChange={(e) => setMontoConfirmacion(e.target.value)}
                                            className="bg-transparent border-none text-xl sm:text-2xl font-black text-white focus:ring-0 w-full p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[10px] font-bold text-white/20 uppercase">MXN</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-white/20 mt-1 uppercase italic">* Puedes modificar el monto si aumentó</p>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="p-4 sm:p-8 pt-3 sm:pt-6 space-y-4 sm:space-y-8 relative z-10">
                        {showRecurrenceAlert ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center space-y-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto border border-amber-500/30">
                                        <span className="material-icons-round text-3xl text-amber-500">update</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black text-amber-400">¿Actualizar recurrencia?</h4>
                                        <p className="text-xs text-white/60 font-medium px-4">Detectamos que el monto cambió. ¿Quieres que este nuevo monto se aplique a los próximos pagos automáticos?</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button
                                            onClick={() => {
                                                handleConfirmPayment(false)
                                            }}
                                            className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Solo hoy
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                handleConfirmPayment(true)
                                            }}
                                            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                                        >
                                            Actualizar todos
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 px-1 ml-1 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">account_balance_wallet</span>
                                            Método de Pago
                                        </Label>
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                            {[
                                                { id: 'efectivo', label: 'Efectivo', icon: '💵' },
                                                { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
                                                { id: 'transferencia', label: 'Transf.', icon: '🏦' }
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setMetodoPago(m.id as any)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300",
                                                        metodoPago === m.id 
                                                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10 scale-95" 
                                                            : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05] hover:border-white/10"
                                                    )}
                                                >
                                                    <span className="text-lg sm:text-xl">{m.icon}</span>
                                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 px-1 ml-1 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">notes</span>
                                            Notas adicionales
                                        </Label>
                                        <div className="relative group">
                                            <Input 
                                                placeholder="Ticket, referencia o banco..." 
                                                className="bg-white/[0.03] border-white/10 text-white h-11 sm:h-14 rounded-xl sm:rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/30 pl-12 transition-all"
                                                value={detallesPago}
                                                onChange={(e) => setDetallesPago(e.target.value)}
                                            />
                                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500/50 transition-colors">edit_note</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 sm:gap-3 pt-1">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => setIsPayDialogOpen(false)}
                                        className="flex-1 h-11 sm:h-14 rounded-xl sm:rounded-2xl text-white/40 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] border border-transparent hover:border-white/5"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={() => handleConfirmPayment()}
                                        disabled={!metodoPago}
                                        className="flex-[2] h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 group relative overflow-hidden disabled:opacity-50 disabled:grayscale"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            Confirmar Pago
                                            <span className="material-icons-round text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </span>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="h-2 bg-emerald-500/20 relative">
                        <div className="absolute inset-0 bg-emerald-500 animate-pulse opacity-50" />
                    </div>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    )
}

function SavingsCard({ label, value, icon, desc, color }: { label: string, value: number, icon: string, desc: string, color: 'blue' | 'amber' | 'indigo' }) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    }

    return (
        <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border text-sm", colorClasses[color])}>
                        <span className="material-icons-round text-sm">{icon}</span>
                    </div>
                    <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-[0.15em] leading-tight">{label}</p>
                </div>
                <span className="text-base sm:text-xl font-black text-white tracking-tighter">${Math.round(value).toLocaleString()}</span>
                <p className="text-[6px] sm:text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5 leading-tight">{desc}</p>
                <div className={cn("absolute -right-3 -bottom-3 w-16 h-16 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20",
                    color === 'blue' ? 'bg-blue-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500')} />
            </CardContent>
        </Card>
    )
}
