'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { 
    TrendingUp, 
    Plus, 
    DollarSign, 
    Calendar as CalendarIcon,
    AlertTriangle,
    Target,
    CheckCircle2,
    Trash2,
    Clock,
    ArrowUpRight,
    Calculator,
    Edit2,
    Check,
    CalendarDays
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth as endOfMonthDate } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Barbero, Gasto } from '@/lib/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface FinanzasBarberoProps {
    barbero: Barbero
}

export function FinanzasBarbero({ barbero }: FinanzasBarberoProps) {
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [income, setIncome] = useState(0)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    
    // Form state
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [fechaPago, setFechaPago] = useState<Date>(new Date())
    const [esRecurrente, setEsRecurrente] = useState(false)
    const [pagado, setPagado] = useState(false)
    const [frecuencia, setFrecuencia] = useState<'mensual' | 'semanal' | 'diario' | 'anual'>('mensual')
    const [metaCortes, setMetaCortes] = useState<string>(barbero.meta_cortes_mensual?.toString() || '100')

    const supabase = createClient()

    const fetchGastos = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .eq('barbero_id', barbero.id)
                .order('fecha_pago', { ascending: true })
            
            if (error) throw error
            setGastos(data || [])
        } catch (error) {
            console.error('Error fetching habits:', error)
            toast.error('Error al cargar gastos personales')
        } finally {
            setLoading(false)
        }
    }

    const fetchIncome = async () => {
        try {
            // Use same date format as Tablet Dashboard for consistency
            const startStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
            const endStr = format(endOfMonthDate(new Date()), 'yyyy-MM-dd')

            console.log(`📡 Fetching barber income for range: ${startStr} to ${endStr}`)

            const { data, error } = await supabase
                .from('vista_citas_app')
                .select('*')
                .eq('barbero_id', barbero.id)
                .eq('estado', 'finalizada')
                .gte('fecha_cita_local', startStr)
                .lte('fecha_cita_local', endStr)

            if (error) {
                console.error('❌ Supabase error fetching income:', JSON.stringify(error, null, 2))
                throw error
            }
            
            // If the view doesn't have comision_barbero, use the percentage from barbero profile
            const totalCommission = data?.reduce((sum, cita: any) => {
                const precio = cita.monto_pagado || cita.servicio_precio || 0
                const comision = cita.comision_barbero || (precio * (barbero.comision_porcentaje || 50) / 100)
                return sum + comision
            }, 0) || 0

            console.log(`💰 Calculated monthly income: ${totalCommission}`)
            setIncome(totalCommission)
        } catch (error: any) {
            console.error('❌ Detailed error fetching income:', error?.message || error)
        }
    }

    useEffect(() => {
        fetchGastos()
        fetchIncome()
    }, [barbero.id])

    const resetForm = () => {
        setDescripcion('')
        setMonto('')
        setFechaPago(new Date())
        setEsRecurrente(false)
        setFrecuencia('mensual')
        setPagado(false)
        setEditingGasto(null)
    }

    const handleEditClick = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setDescripcion(gasto.descripcion)
        setMonto(gasto.monto.toString())
        setFechaPago(new Date(gasto.fecha_pago))
        setEsRecurrente(gasto.es_recurrente)
        setFrecuencia((gasto.frecuencia as any) || 'mensual')
        setPagado(gasto.pagado)
        setIsDialogOpen(true)
    }

    const handleSaveGasto = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descripcion || !monto) return

        const gastoData = {
            barbero_id: barbero.id,
            sucursal_id: barbero.sucursal_id,
            descripcion,
            monto: parseFloat(monto),
            fecha_pago: fechaPago.toISOString(),
            es_recurrente: esRecurrente,
            frecuencia: esRecurrente ? frecuencia : null,
            pagado: pagado
        }

        try {
            if (editingGasto) {
                const { error } = await (supabase.from('gastos') as any)
                    .update(gastoData)
                    .eq('id', editingGasto.id)
                if (error) throw error
                toast.success('Gasto actualizado')
            } else {
                const { error } = await (supabase.from('gastos') as any)
                    .insert([gastoData])
                if (error) throw error
                toast.success('Gasto registrado')
            }
            setIsDialogOpen(false)
            resetForm()
            fetchGastos()
        } catch (error) {
            console.error('Error saving gasto:', error)
            toast.error('Error al guardar el gasto')
        }
    }

    const handlePayGasto = async (id: string) => {
        try {
            const { error } = await (supabase.from('gastos') as any)
                .update({ pagado: true })
                .eq('id', id)
            
            if (error) throw error
            toast.success('Gasto marcado como PAGADO')
            fetchGastos()
        } catch (error) {
            console.error('Error paying gasto:', error)
            toast.error('Error al procesar el pago')
        }
    }

    const handleDeleteGasto = async (id: string) => {
        if (!confirm('¿Eliminar este gasto?')) return
        try {
            const { error } = await supabase.from('gastos').delete().eq('id', id)
            if (error) throw error
            toast.success('Gasto eliminado')
            fetchGastos()
        } catch (error) {
            console.error('Error deleting gasto:', error)
            toast.error('Error al eliminar')
        }
    }

    const handleUpdateMeta = async () => {
        try {
            const val = parseInt(metaCortes)
            const { error } = await (supabase.from('barberos') as any)
                .update({ meta_cortes_mensual: val })
                .eq('id', barbero.id)
            if (error) throw error
            toast.success('Meta actualizada')
        } catch (error) {
            console.error('Error updating meta:', error)
        }
    }

    // Calculations
    const metrics = useMemo(() => {
        const totalExpenses = gastos.reduce((sum, g) => sum + g.monto, 0)
        const totalPaid = gastos.filter(g => g.pagado).reduce((sum, g) => sum + g.monto, 0)
        const allPaid = gastos.length > 0 && gastos.every(g => g.pagado)
        
        const remaining = Math.max(0, totalExpenses - income)
        const profit = Math.max(0, income - totalExpenses)
        const progress = totalExpenses > 0 ? Math.min(100, (income / totalExpenses) * 100) : 100
        
        const comisionBarbero = barbero?.comision_porcentaje || 50
        const incomePerCut = 200 * (comisionBarbero / 100)
        const cutsNeeded = incomePerCut > 0 ? Math.ceil(remaining / incomePerCut) : 0

        return { totalExpenses, totalPaid, allPaid, remaining, profit, progress, cutsNeeded, incomePerCut }
    }, [gastos, income, barbero])

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Break-Even Header */}
            <header className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Calculator className="text-primary w-6 h-6" />
                        Punto de <span className="text-primary">Equilibrio</span>
                    </h2>
                    <p className="text-white/40 text-xs font-medium uppercase tracking-widest mt-1">
                        Control de gastos personales y metas
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <Label className="text-[10px] text-white/30 uppercase font-black mb-1">Meta de Cortes</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                value={metaCortes} 
                                onChange={(e) => setMetaCortes(e.target.value)}
                                className="w-20 h-8 bg-white/5 border-white/10 text-xs text-center font-black"
                            />
                            <Button size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/10" onClick={handleUpdateMeta}>
                                <Target className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger
                            render={
                                <Button className="bg-primary text-black font-black uppercase tracking-tighter shadow-lg shadow-primary/20 h-11 px-6 rounded-xl">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Nuevo Gasto
                                </Button>
                            }
                        />
                        <DialogContent className="bg-black/95 border-white/10 text-white">
                            <form onSubmit={handleSaveGasto} className="space-y-6 p-2">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase text-primary">
                                        {editingGasto ? 'Editar Gasto' : 'Registrar Gasto Personal'}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/40 uppercase text-[10px] font-bold">
                                        Detalla tus salidas de dinero para calcular tu punto de equilibrio
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-white/30">Descripción</Label>
                                        <Input 
                                            value={descripcion} 
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            placeholder="Ej: Renta, Comida, Insumos"
                                            className="bg-white/5 border-white/10"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-white/30">Monto (MXN)</Label>
                                            <Input 
                                                type="number"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                                placeholder="0.00"
                                                className="bg-white/5 border-white/10"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-white/30">Fecha de Pago</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="date"
                                                    value={format(fechaPago, 'yyyy-MM-dd')}
                                                    onChange={(e) => setFechaPago(new Date(e.target.value + 'T12:00:00'))}
                                                    className="bg-white/5 border-white/10 text-xs"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-white/30">Es Recurrente?</Label>
                                            <div className="flex items-center gap-2 h-10">
                                                <Switch checked={esRecurrente} onCheckedChange={setEsRecurrente} />
                                                <span className="text-[10px] text-white/40 font-bold uppercase">{esRecurrente ? 'SÍ' : 'NO'}</span>
                                            </div>
                                        </div>
                                        {esRecurrente && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-white/30">Frecuencia</Label>
                                                <Select value={frecuencia} onValueChange={(val: any) => setFrecuencia(val)}>
                                                    <SelectTrigger className="bg-white/5 border-white/10 text-xs h-10">
                                                        <SelectValue placeholder="Frecuencia" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black border-white/10 text-white">
                                                        <SelectItem value="diario">Diario</SelectItem>
                                                        <SelectItem value="semanal">Semanal</SelectItem>
                                                        <SelectItem value="mensual">Mensual</SelectItem>
                                                        <SelectItem value="anual">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] font-black uppercase text-white">¿Ya está pagado?</Label>
                                                <p className="text-[9px] text-white/30 uppercase">Marca si ya realizaste el desembolso</p>
                                            </div>
                                            <Switch checked={pagado} onCheckedChange={setPagado} />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2">
                                    <Button type="button" variant="ghost" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-primary text-black font-black uppercase shadow-lg shadow-primary/20">
                                        {editingGasto ? 'Actualizar' : 'Guardar Gasto'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20 overflow-hidden relative group shadow-lg shadow-emerald-500/5">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/50">Ingresos (Comisión)</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">${income.toLocaleString()}</span>
                            <span className="text-[10px] text-white/20 uppercase font-black">Este Mes</span>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <DollarSign className="w-16 h-16 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400/50">Gastos Registrados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white">${metrics.totalExpenses.toLocaleString()}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400 uppercase font-bold">
                                    {gastos.length} Items ({gastos.filter(g => g.pagado).length} Pagados)
                                </Badge>
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                                    Liquidado: ${metrics.totalPaid.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`relative overflow-hidden shadow-lg ${metrics.remaining === 0 && metrics.allPaid ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10' : 'bg-primary/10 border-primary/30 shadow-primary/5'}`}>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg border ${metrics.remaining === 0 && metrics.allPaid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
                                {metrics.remaining === 0 && metrics.allPaid ? <TrendingUp className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${metrics.remaining === 0 && metrics.allPaid ? 'text-emerald-400/70' : 'text-primary/70'}`}>
                                {metrics.remaining === 0 && metrics.allPaid ? 'Ganancia Libre (Profit)' : 'Meta p/ Punto Equilibrio'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white">
                                ${metrics.remaining === 0 && metrics.allPaid ? metrics.profit.toLocaleString() : metrics.remaining.toLocaleString()}
                            </span>
                            
                            {gastos.length === 0 ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <CheckCircle2 className="w-4 h-4" /> Sin gastos registrados
                                    </p>
                                    <div className="bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                                        <p className="text-[10px] font-medium text-emerald-400/80 leading-relaxed uppercase tracking-tight">
                                            Aún no has registrado compromisos este mes.
                                            <br />
                                            <span className="text-white font-bold">Todo tu ingreso es ganancia: ${metrics.profit.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : metrics.remaining > 0 ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-black text-primary flex items-center gap-1.5 uppercase tracking-wide">
                                        <Clock className="w-4 h-4" /> Faltan ~{metrics.cutsNeeded} cortes por realizar
                                    </p>
                                    <div className="bg-black/20 p-2 rounded-md border border-white/5">
                                        <p className="text-[10px] font-medium text-white/50 leading-relaxed uppercase tracking-tight">
                                            Basado en servicio <span className="text-white font-bold">Corte $200</span>
                                            <br />
                                            Ingreso real por corte ({barbero.comision_porcentaje}%): <span className="text-primary font-bold">${metrics.incomePerCut}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : !metrics.allPaid ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <AlertTriangle className="w-4 h-4" /> ¡Ingresos suficientes! Falta pagar gastos
                                    </p>
                                    <div className="bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                                        <p className="text-[10px] font-medium text-amber-400/80 leading-relaxed uppercase tracking-tight">
                                            Has generado lo necesario para cubrir tus gastos, pero aún tienes facturas pendientes de pago en tu lista.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 mt-2">
                                    <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <CheckCircle2 className="w-4 h-4" /> ¡Punto de equilibrio superado!
                                    </p>
                                    <div className="bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                                        <p className="text-[10px] font-medium text-emerald-400/80 leading-relaxed uppercase tracking-tight">
                                            Todos tus gastos mensuales han sido cubiertos y liquidados.
                                            <br />
                                            <span className="text-white font-bold">Dinero libre para ti: ${metrics.profit.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                <span className={metrics.remaining === 0 && metrics.allPaid ? "text-emerald-400" : "text-white/40"}>Progreso Financiero</span>
                                <span className={metrics.remaining === 0 && metrics.allPaid ? "text-emerald-400" : "text-white"}>
                                    {metrics.remaining === 0 && metrics.allPaid ? 'OBJETIVO CUMPLIDO' : `${Math.round(metrics.progress)}%`}
                                </span>
                            </div>
                            <Progress value={metrics.progress} className={`h-2 bg-white/5 ${metrics.remaining === 0 && metrics.allPaid ? '[&>div]:bg-emerald-500' : ''}`} />
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        {metrics.remaining === 0 && metrics.allPaid ? <TrendingUp className="w-16 h-16 text-emerald-400" /> : <ArrowUpRight className="w-16 h-16 text-primary" />}
                    </div>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="bg-black/40 border-white/5 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5 py-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        Lista de Gastos Personales
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Concepto</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Frecuencia</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Estado</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Monto</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {gastos.map((gasto) => (
                                    <tr key={gasto.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase tracking-tight">{gasto.descripcion}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <CalendarDays className="w-3 h-3 text-white/20" />
                                                    <span className="text-[10px] text-white/20 font-medium uppercase tracking-tighter">
                                                        {format(new Date(gasto.fecha_pago), 'PPP', { locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {gasto.es_recurrente ? (
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                                    {gasto.frecuencia}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Puntual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {gasto.pagado ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">PAGADO</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] font-black uppercase tracking-widest">PENDIENTE</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-white">${gasto.monto.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!gasto.pagado && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 px-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1 text-[10px] font-black uppercase"
                                                        onClick={() => handlePayGasto(gasto.id)}
                                                    >
                                                        <Check className="w-3 h-3" /> PAGAR
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 border-white/10 bg-white/5 text-white/40 hover:text-primary hover:border-primary/40 hover:bg-primary/10"
                                                    onClick={() => handleEditClick(gasto)}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 border-red-500/20 bg-red-500/5 text-red-400 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteGasto(gasto.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {gastos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-white/20 uppercase font-black tracking-widest text-[10px]">
                                            Sin gastos registrados este mes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
