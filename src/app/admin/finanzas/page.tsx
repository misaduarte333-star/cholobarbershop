'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
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
import type { Gasto } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function FinanzasPage() {
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    
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

            setGastos((data as Gasto[]) || [])
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

    useEffect(() => {
        fetchGastos()
        fetchSucursal()
    }, [])

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
                const { data } = await supabase.from('sucursales').select('id').limit(1).maybeSingle()
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

    const handleConfirmPayment = async () => {
        if (!gastoToPay || !metodoPago) {
            toast.error('Por favor selecciona un método de pago')
            return
        }

        try {
            const { error } = await (supabase.from('gastos') as any)
                .update({
                    pagado: true,
                    metodo_pago: metodoPago,
                    detalles_pago: detallesPago,
                    updated_at: new Date().toISOString()
                })
                .eq('id', gastoToPay.id)

            if (error) throw error
            
            toast.success('¡Gasto pagado con éxito!')
            setIsPayDialogOpen(false)
            setGastoToPay(null)
            setMetodoPago('')
            setDetallesPago('')
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
        <div className="space-y-8 animate-fade-in p-4 sm:p-6 md:p-0">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
                <div className="space-y-1">
                    <h1 className="text-4xl sm:text-3xl font-black text-white uppercase tracking-tighter font-display leading-none">
                        Gestión <span className="text-gradient-gold">Financiera</span>
                    </h1>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Control de Gastos y Ahorro</p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) clearForm()
                }}>
                    <DialogTrigger render={(props) => (
                        <Button 
                            {...props} 
                            onClick={(e) => {
                                clearForm()
                                props.onClick?.(e as any)
                            }}
                            className="bg-gradient-gold text-black font-black uppercase tracking-widest text-[10px] h-12 sm:h-11 px-8 sm:px-6 rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.3)] w-full sm:w-auto"
                        >
                            <span className="material-icons-round mr-2 text-lg">add_circle</span>
                            Registrar Gasto
                        </Button>
                    )} />
                    <DialogContent className="glass-card border-white/10 bg-black/95 text-white backdrop-blur-3xl w-[88vw] sm:max-w-xl p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-white/10">
                        <div className="max-h-[82vh] overflow-y-auto custom-scrollbar p-5 sm:p-10">
                            
                            <DialogHeader className="mb-4 sm:mb-8">
                                <DialogTitle className="font-display font-black text-2xl sm:text-2xl uppercase tracking-tighter text-gradient-gold leading-tight">
                                    {editingGasto ? 'Editar Gasto' : 'Registrar Gasto'}
                                </DialogTitle>
                                <DialogDescription className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em] mt-0.5">
                                    {editingGasto ? 'Modifica los detalles' : 'Añade un nuevo registro'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveGasto} className="space-y-4 sm:space-y-8">
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="desc" className="text-[9px] font-black uppercase tracking-widest text-white/50 px-1">Descripción</Label>
                                    <Input 
                                        id="desc" 
                                        placeholder="Ej: Renta, Luz, Insumos..." 
                                        className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-amber-500/20"
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="monto" className="text-[9px] font-black uppercase tracking-widest text-white/50 px-1">Monto ($)</Label>
                                    <Input 
                                        id="monto" 
                                        type="number" 
                                        placeholder="0.00" 
                                        className="bg-white/5 border-white/10 text-white h-11 rounded-xl focus:ring-amber-500/20 text-sm"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-white/50 px-1 block">Fecha de Pago</Label>
                                <div className="p-1 glass-card border-white/5 rounded-2xl bg-black/40 flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={fechaPago}
                                        onSelect={setFechaPago}
                                        className="rounded-xl border-none scale-[0.85] origin-top sm:scale-100"
                                        locale={es}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Recurring Toggle & Frequency */}
                                <div className={cn(
                                    "p-4 rounded-xl transition-all border space-y-4",
                                    esRecurrente ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-white/50">Recurrente</Label>
                                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-wider line-clamp-1">Gasto automático</p>
                                        </div>
                                        <Switch 
                                            checked={esRecurrente}
                                            onCheckedChange={setEsRecurrente}
                                        />
                                    </div>

                                    {esRecurrente && (
                                        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-amber-500/20 animate-in fade-in slide-in-from-top-1">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-amber-500/50">Frecuencia</Label>
                                                <Select value={frecuencia} onValueChange={(v: any) => setFrecuencia(v)}>
                                                    <SelectTrigger className="h-9 bg-black/40 border-amber-500/20 text-white rounded-xl text-xs">
                                                        <SelectValue placeholder="Cada mes" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                        <SelectItem value="mensual">Cada mes</SelectItem>
                                                        <SelectItem value="semanal">Cada semana</SelectItem>
                                                        <SelectItem value="diario">Cada día</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {frecuencia === 'semanal' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-amber-500/50">Día de la semana</Label>
                                                    <Select value={diaSemana} onValueChange={(v) => v && setDiaSemana(v)}>
                                                        <SelectTrigger className="h-9 bg-black/40 border-amber-500/20 text-white rounded-xl text-xs">
                                                            <SelectValue placeholder="Sábado" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                            <SelectItem value="lunes">Lunes</SelectItem>
                                                            <SelectItem value="martes">Martes</SelectItem>
                                                            <SelectItem value="miercoles">Miércoles</SelectItem>
                                                            <SelectItem value="jueves">Jueves</SelectItem>
                                                            <SelectItem value="viernes">Viernes</SelectItem>
                                                            <SelectItem value="sabado">Sábado</SelectItem>
                                                            <SelectItem value="domingo">Domingo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {frecuencia === 'mensual' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-amber-500/50">Día del mes</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        max="31" 
                                                        value={diaMes}
                                                        onChange={(e) => setDiaMes(parseInt(e.target.value))}
                                                        className="h-9 bg-black/40 border-amber-500/20 text-white rounded-xl text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Paid Status Toggle */}
                                <div className={cn(
                                    "flex items-center justify-between p-4 rounded-xl transition-all border",
                                    pagado ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"
                                )}>
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/50">Estado</Label>
                                        <p className="text-[8px] text-white/30 font-bold uppercase tracking-wider line-clamp-1">
                                            {pagado ? 'Completado' : 'Pendiente de pago'}
                                        </p>
                                    </div>
                                    <Switch 
                                        checked={pagado}
                                        onCheckedChange={setPagado}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="submit" className="w-full bg-gradient-gold text-black font-black uppercase tracking-widest h-12 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(234,179,8,0.2)]">
                                    {editingGasto ? 'Actualizar Gasto' : 'Guardar Gasto'}
                                </Button>
                            </DialogFooter>
                        </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Savings Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Card className={cn(
                    "glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem] relative group hover:scale-[1.02] transition-all duration-300",
                    savingsMetrics.vencidos > 0 && "border-red-500/30 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                )}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border text-2xl transition-all",
                                savingsMetrics.vencidos > 0 
                                    ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/10" 
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-50 shadow-emerald-500/5"
                            )}>
                                <span className={cn("material-icons-round", savingsMetrics.vencidos > 0 && "animate-pulse")}>
                                    {savingsMetrics.vencidos > 0 ? 'warning' : 'verified'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Pagos Vencidos</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-black tracking-tighter",
                                    savingsMetrics.vencidos > 0 ? "text-red-400" : "text-white"
                                )}>{savingsMetrics.vencidos}</span>
                            </div>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed mt-2">
                                {savingsMetrics.vencidos > 0 ? 'Facturas atrasadas' : 'Todo al día'}
                            </p>
                        </div>
                        {savingsMetrics.vencidos > 0 && (
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-20 bg-red-500" />
                        )}
                    </CardContent>
                </Card>

                {/* Pagos Mañana (New Alert) */}
                <Card className={cn(
                    "glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem] relative group hover:scale-[1.02] transition-all duration-300",
                    savingsMetrics.manana > 0 && "border-amber-500/30 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                )}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border text-2xl transition-all",
                                savingsMetrics.manana > 0 
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10" 
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-50 shadow-emerald-500/5"
                            )}>
                                <span className={cn("material-icons-round", savingsMetrics.manana > 0 && "animate-bounce")}>
                                    {savingsMetrics.manana > 0 ? 'notification_important' : 'verified'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Pagos Mañana</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-black tracking-tighter",
                                    savingsMetrics.manana > 0 ? "text-amber-400" : "text-white"
                                )}>{savingsMetrics.manana}</span>
                            </div>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed mt-2">
                                {savingsMetrics.manana > 0 ? 'Vencen pronto' : 'Sin pendientes mañana'}
                            </p>
                        </div>
                        {savingsMetrics.manana > 0 && (
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-20 bg-amber-500" />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Calendar View */}
                <Card className="lg:col-span-8 glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem]">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                <span className="material-icons-round text-lg">calendar_today</span>
                            </div>
                            Calendario de Pagos
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Visualiza tus próximos compromisos</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="p-2 glass-card border-white/5 rounded-[1.5rem] bg-black/20 self-center lg:self-start w-full max-w-[280px]">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-xl border-none w-full scale-[0.9] origin-top"
                                    locale={es}
                                    modifiers={{
                                        hasGasto: gastos.map(g => new Date(g.fecha_pago))
                                    }}
                                    modifiersStyles={{
                                        hasGasto: { fontWeight: 'bold', color: '#fbbf24', textDecoration: 'underline' }
                                    }}
                                />
                            </div>
                            <div className="flex-1 space-y-4 w-full min-w-0">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">Gastos Programados</h3>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {gastos.length === 0 ? (
                                        <div className="text-center py-10 text-white/20 uppercase font-black text-[10px] tracking-widest">Sin gastos registrados</div>
                                    ) : (
                                        gastos.map(gasto => {
                                            const status = getGastoStatus(gasto)
                                            return (
                                                <div key={gasto.id} className={cn(
                                                    "p-4 rounded-2xl glass-card border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/5 transition-all",
                                                    status === 'overdue' && "border-red-500/20 bg-red-500/5"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[8px] font-black uppercase leading-none transition-colors",
                                                            status === 'overdue' ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/40 group-hover:bg-primary/20 group-hover:text-primary"
                                                        )}>
                                                            <span className={status === 'overdue' ? "animate-pulse" : ""}>{format(new Date(gasto.fecha_pago), 'dd')}</span>
                                                            <span>{format(new Date(gasto.fecha_pago), 'MMM', { locale: es })}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase text-white tracking-tight flex items-center gap-2">
                                                                {gasto.descripcion}
                                                                {gasto.es_recurrente && (
                                                                    <span className="material-icons-round text-[10px] text-amber-400">repeat</span>
                                                                )}
                                                                {status === 'overdue' && (
                                                                    <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-500 h-4 px-1 font-black">VENCIDO</Badge>
                                                                )}
                                                                {status === 'due_tomorrow' && (
                                                                    <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-500 h-4 px-1 font-black">MAÑANA</Badge>
                                                                )}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">${gasto.monto.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!gasto.pagado && (
                                                            <Button 
                                                                size="sm"
                                                                className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-black text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                                                onClick={() => {
                                                                    setGastoToPay(gasto)
                                                                    setIsPayDialogOpen(true)
                                                                }}
                                                            >
                                                                Pagar
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon-sm" 
                                                            className="text-white/20 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                                            onClick={() => openEditModal(gasto)}
                                                        >
                                                            <span className="material-icons-round text-sm">edit</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Transactions List */}
                <Card className="lg:col-span-4 glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem]">
                    <CardHeader className="p-6">
                        <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <span className="material-icons-round text-lg">list_alt</span>
                            </div>
                            Desglose Detallado
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Listado completo de registros</CardDescription>
                    </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-white/5 border-b border-white/5">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-4 sm:px-6 py-4">Concepto</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right px-4 sm:px-6 py-4">Monto</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right px-4 sm:px-6 py-4">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gastos.map((gasto) => (
                                    <TableRow key={gasto.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="px-4 sm:px-6 py-4">
                                            <p className="text-[11px] sm:text-[10px] font-black text-white uppercase tracking-tight">{gasto.descripcion}</p>
                                            <p className="text-[9px] sm:text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">
                                                {format(new Date(gasto.fecha_pago), 'dd/MM/yyyy')}
                                                {gasto.es_recurrente && <span className="ml-2 text-amber-500/50">Recurrente</span>}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right px-4 sm:px-6 py-4">
                                            <span className="text-[12px] sm:text-[11px] font-black text-gradient-gold">${gasto.monto.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell className="text-right px-4 sm:px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {!gasto.pagado && (
                                                    <Button 
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg lg:opacity-0 lg:group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-black"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setGastoToPay(gasto)
                                                            setIsPayDialogOpen(true)
                                                        }}
                                                    >
                                                        Pagar
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-white/20 hover:text-amber-400 hover:bg-amber-400/10 transition-colors rounded-lg lg:opacity-0 lg:group-hover:opacity-100"
                                                    onClick={() => openEditModal(gasto)}
                                                >
                                                    <span className="material-icons-round text-lg sm:text-xs">edit</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {gastos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-32 text-center text-white/10 uppercase font-black text-[10px] tracking-[0.3em]">Sin registros que mostrar</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                </Card>
            </div>
            {/* Payment Confirmation Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="sm:max-w-md bg-[#0a0a0b]/95 border-white/5 text-white backdrop-blur-xl p-0 overflow-hidden rounded-[2rem]">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                    
                    <DialogHeader className="p-8 pb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                            <span className="text-2xl">💳</span>
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-white mb-1">Confirmar Pago</DialogTitle>
                        <DialogDescription className="text-zinc-400 font-medium text-sm leading-relaxed">
                            {gastoToPay && (
                                <>¿Deseas marcar <span className="text-white font-bold">"{gastoToPay.descripcion}"</span> (${gastoToPay.monto}) como pagado?</>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pt-2 space-y-6 relative z-10">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 px-1">Método de Pago</Label>
                                <Select value={metodoPago} onValueChange={(v: any) => setMetodoPago(v)}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-emerald-500/20">
                                        <SelectValue placeholder="Seleccionar método" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="efectivo">Efectivo 💵</SelectItem>
                                        <SelectItem value="tarjeta">Tarjeta 💳</SelectItem>
                                        <SelectItem value="transferencia">Transferencia 🏦</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 px-1">Detalles o Notas</Label>
                                <Input 
                                    placeholder="Ticket #, Banco, etc..." 
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-emerald-500/20"
                                    value={detallesPago}
                                    onChange={(e) => setDetallesPago(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-3 pt-4 pb-8 px-8">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsPayDialogOpen(false)}
                                className="flex-1 h-12 rounded-xl text-white/50 hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleConfirmPayment}
                                className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 group"
                            >
                                Confirmar Pago
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function SavingsCard({ label, value, icon, desc, color }: { label: string, value: number, icon: string, desc: string, color: 'blue' | 'amber' | 'indigo' }) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/5'
    }

    return (
        <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2rem] relative group hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border text-2xl", colorClasses[color])}>
                        <span className="material-icons-round">{icon}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white tracking-tighter">${Math.round(value).toLocaleString()}</span>
                    </div>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-relaxed mt-2">{desc}</p>
                </div>
                
                {/* Background Decoration */}
                <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20", 
                    color === 'blue' ? 'bg-blue-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500')} />
            </CardContent>
        </Card>
    )
}
