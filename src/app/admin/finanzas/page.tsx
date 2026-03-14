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

            const { data, error } = await supabase
                .from('vista_citas_app')
                .select('servicio_precio')
                .eq('barbero_id', barberoId)
                .gte('timestamp_inicio_local', start)
                .lte('timestamp_inicio_local', end)
                .in('estado', ['finalizada', 'confirmada', 'en_proceso'])

            if (error) throw error
            
            const total = (data as any[]).reduce((sum, cita) => sum + (cita.servicio_precio || 0), 0)
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
    }, [])

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

            {/* Break-Even Analysis Section */}
            <Card className="glass-card border-white/5 bg-black/40 overflow-hidden rounded-[2.5rem] relative group border-indigo-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5 opacity-50" />
                <CardHeader className="p-8 pb-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                                <span className="material-icons-round text-2xl">insights</span>
                            </div>
                            Análisis de <span className="text-gradient-gold">Punto de Equilibrio</span>
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Rentabilidad basada en ingresos de barberos</CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Barbero:</span>
                        <Select value={selectedBarberoId} onValueChange={(val) => setSelectedBarberoId(val || '')}>
                            <SelectTrigger className="h-9 w-[180px] bg-black/40 border-white/10 text-white rounded-xl text-xs font-bold">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                {barberos.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Summary Stats */}
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Ingreso Actual ({barberos.find(b => b.id === selectedBarberoId)?.nombre || '...' })</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter text-white">${barberoIncome.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Este mes</span>
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
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-all">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                        <span className="material-icons-round">trending_up</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Umbral de Ganancia</h4>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">Punto donde cada peso extra es utilidad neta</p>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                        {barberoIncome > savingsMetrics.mensual ? (
                                            `+$${(barberoIncome - savingsMetrics.mensual).toLocaleString()}`
                                        ) : (
                                            `$${savingsMetrics.mensual.toLocaleString()}`
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">
                                        {barberoIncome > savingsMetrics.mensual ? "Utilidad Generada" : "Monto de Break-Even"}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-all">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                                        ⚖️
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Ratio de Cobertura</h4>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">Porcentaje de gastos cubiertos actualmente</p>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <div className="text-2xl font-black text-white tracking-tight">
                                        {Math.round((barberoIncome / (savingsMetrics.mensual || 1)) * 100)}%
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">Eficiencia Operativa</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                                                                onClick={() => openPayModal(gasto)}
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] sm:text-[10px] font-black text-white uppercase tracking-tight">{gasto.descripcion}</p>
                                                {getGastoStatus(gasto) === 'overdue' && (
                                                    <Badge variant="outline" className="text-[7px] border-red-500/30 text-red-500 h-3.5 px-1 font-black leading-none">VENCIDO</Badge>
                                                )}
                                                {getGastoStatus(gasto) === 'due_tomorrow' && (
                                                    <Badge variant="outline" className="text-[7px] border-amber-500/30 text-amber-500 h-3.5 px-1 font-black leading-none">MAÑANA</Badge>
                                                )}
                                            </div>
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
                                                            openPayModal(gasto)
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
                <DialogContent className="sm:max-w-md bg-[#0a0a0b]/95 border-white/5 text-white backdrop-blur-2xl p-0 overflow-hidden rounded-[2.5rem] shadow-2xl shadow-emerald-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/5 opacity-50 pointer-events-none" />
                    
                    <DialogHeader className="p-8 pb-0 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                    <span className="material-icons-round text-3xl text-emerald-400">payments</span>
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-black tracking-tight text-white">Confirmar Pago</DialogTitle>
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
                            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-2 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="material-icons-round text-6xl">receipt_long</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Resumen del Gasto</p>
                                <h4 className="text-lg font-black text-white truncate mb-3">{gastoToPay.descripcion}</h4>
                                
                                <div className="relative mt-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mb-1 block">Monto a Pagar</Label>
                                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-emerald-500/50 transition-colors">
                                        <span className="text-white/40 text-xl font-black">$</span>
                                        <input 
                                            type="number"
                                            value={montoConfirmacion}
                                            onChange={(e) => setMontoConfirmacion(e.target.value)}
                                            className="bg-transparent border-none text-2xl font-black text-white focus:ring-0 w-full p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[10px] font-bold text-white/20 uppercase">MXN</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-white/20 mt-1 uppercase italic">* Puedes modificar el monto si aumentó este periodo</p>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="p-8 pt-6 space-y-8 relative z-10">
                        {showRecurrenceAlert ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto border border-amber-500/30">
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
                                        <div className="grid grid-cols-grid gap-3">
                                            {[
                                                { id: 'efectivo', label: 'Efectivo', icon: '💵' },
                                                { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
                                                { id: 'transferencia', label: 'Transf.', icon: '🏦' }
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setMetodoPago(m.id as any)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                                                        metodoPago === m.id 
                                                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10 scale-95" 
                                                            : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05] hover:border-white/10"
                                                    )}
                                                >
                                                    <span className="text-xl">{m.icon}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
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
                                                className="bg-white/[0.03] border-white/10 text-white h-14 rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/30 pl-12 transition-all"
                                                value={detallesPago}
                                                onChange={(e) => setDetallesPago(e.target.value)}
                                            />
                                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500/50 transition-colors">edit_note</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => setIsPayDialogOpen(false)}
                                        className="flex-1 h-14 rounded-2xl text-white/40 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] border border-transparent hover:border-white/5"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={() => handleConfirmPayment()}
                                        disabled={!metodoPago}
                                        className="flex-[2] h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 group relative overflow-hidden disabled:opacity-50 disabled:grayscale"
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
