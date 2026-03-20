'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Cliente } from '@/lib/types'
import {
    Search,
    UserPlus,
    MessageSquare,
    Calendar,
    TrendingUp,
    MoreVertical,
    Phone,
    Mail,
    Edit2,
    History,
    Trash2,
    AlertCircle,
    Users,
    Plus,
    Clock
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isNewClient, setIsNewClient] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    const cargarClientes = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('ultima_cita', { ascending: false })

            if (error) throw error
            setClientes(data || [])
        } catch (err) {
            console.error('Error cargando clientes:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        cargarClientes()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [cargarClientes])
    
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

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.telefono?.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const kpis = {
        total: clientes.length,
        activos: clientes.filter(c => c.total_citas > 3).length, // Clientes recurrentes
        nuevosHoy: clientes.filter(c => {
            const date = new Date(c.created_at)
            const today = new Date()
            return date.toDateString() === today.toDateString()
        }).length
    }

    const handleSaveCliente = async () => {
        if (!selectedCliente) return

        setIsSaving(true)
        try {
            if (isNewClient) {
                const { error } = await (supabase
                    .from('clientes') as any)
                    .insert({
                        nombre: selectedCliente.nombre,
                        telefono: selectedCliente.telefono,
                        email: selectedCliente.email,
                        notas_internas: selectedCliente.notas_internas,
                        total_citas: 0
                    })

                if (error) throw error
            } else {
                const { error } = await (supabase
                    .from('clientes') as any)
                    .update({
                        nombre: selectedCliente.nombre,
                        telefono: selectedCliente.telefono,
                        email: selectedCliente.email,
                        notas_internas: selectedCliente.notas_internas
                    })
                    .eq('id', selectedCliente.id)

                if (error) throw error
            }

            setShowEditModal(false)
            setShowConfirmEditDialog(false)
            cargarClientes()
        } catch (err) {
            console.error('Error guardando cliente:', err)
            alert('Error al guardar cambios')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteCliente = async () => {
        if (!selectedCliente) return
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', selectedCliente.id)

            if (error) throw error

            setShowDeleteDialog(false)
            setShowEditModal(false)
            cargarClientes()
        } catch (err) {
            console.error('Error eliminando cliente:', err)
            alert('No se pudo eliminar el cliente. Verifique que no tenga citas asociadas.')
        } finally {
            setIsDeleting(false)
        }
    }

    const openNewClientModal = () => {
        setIsNewClient(true)
        setSelectedCliente({
            id: '',
            nombre: '',
            telefono: '',
            email: '',
            notas_internas: '',
            total_citas: 0,
            ultima_cita: null,
            created_at: new Date().toISOString()
        } as Cliente)
        setShowEditModal(true)
    }

    const openEditClientModal = (cliente: Cliente) => {
        setIsNewClient(false)
        setSelectedCliente({ ...cliente })
        setShowEditModal(true)
    }

    return (
        <div className="relative min-h-full bg-[#0A0A0A] selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-20 border-b border-white/5 mb-4 font-display">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            <Users className="w-7 h-7 text-black" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
                                CRM <span className="text-gradient-gold italic">Clientes</span>
                            </h1>
                            <p className="text-slate-400 mt-1 text-xs font-bold uppercase tracking-widest opacity-70">
                                Gestión y fidelización de clientes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Clock & Date */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-white font-black text-xl tracking-tighter leading-none uppercase">
                                {formattedTime}
                            </span>
                            <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em]">
                                {formattedDate}
                            </span>
                        </div>

                        <Button 
                            onClick={openNewClientModal}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-bold uppercase tracking-tighter shadow-lg shadow-gold/20 h-11 px-6 rounded-xl"
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Nuevo Cliente
                        </Button>
                    </div>
                </header>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A0A0A]/60 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="relative group flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por nombre, teléfono o email..."
                        className="pl-10 w-full bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 transition-all rounded-xl h-11"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="size-3 text-emerald-500" />
                            Total Base de Datos
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-white font-display">{kpis.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="glass-card border-white/5 relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="size-3 text-blue-500" />
                            Clientes VIP (+3 visitas)
                        </CardDescription>
                        <CardTitle className="text-3xl font-black font-display text-gradient-gold">{kpis.activos}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="glass-card border-white/5 relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <UserPlus className="size-3 text-amber-500" />
                            Nuevos hoy
                        </CardDescription>
                        <CardTitle className="text-3xl font-black text-white font-display">{kpis.nuevosHoy}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Clients Table */}
            <Card className="glass-card border-white/5 rounded-2xl md:rounded-[2rem] overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-white/40 font-black uppercase text-[10px] tracking-widest py-5 px-6">Cliente</TableHead>
                            <TableHead className="text-white/40 font-black uppercase text-[10px] tracking-widest py-5">Contacto</TableHead>
                            <TableHead className="text-white/40 font-black uppercase text-[10px] tracking-widest py-5">Visitas</TableHead>
                            <TableHead className="text-white/40 font-black uppercase text-[10px] tracking-widest py-5">Última Cita</TableHead>
                            <TableHead className="text-right text-white/40 font-black uppercase text-[10px] tracking-widest py-5 px-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array(5).fill(null).map((_, i) => (
                                <TableRow key={i} className="border-white/5">
                                    <TableCell colSpan={5} className="py-8">
                                        <div className="h-4 bg-white/5 animate-pulse rounded w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : filteredClientes.length === 0 ? (
                            <TableRow className="border-white/5">
                                <TableCell colSpan={5} className="py-20 text-center">
                                    <p className="text-white/20 font-black uppercase tracking-widest text-xs italic">
                                        No se encontraron clientes
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : filteredClientes.map((cliente) => (
                            <TableRow key={cliente.id} className="border-white/5 hover:bg-white/5 transition-all group">
                                <TableCell className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-xl bg-gradient-gold p-[1px] hidden sm:block">
                                            <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                                                <span className="text-xs font-black text-gradient-gold">
                                                    {cliente.nombre.slice(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-tight font-display group-hover:text-primary transition-colors">
                                                {cliente.nombre}
                                            </p>
                                            <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase">
                                                ID: {cliente.id.slice(0, 8)}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-white/60">
                                            <Phone className="size-3 text-primary/50" />
                                            <span className="text-xs font-mono">{cliente.telefono || 'Sin tel'}</span>
                                        </div>
                                        {cliente.email && (
                                            <div className="flex items-center gap-2 text-white/60">
                                                <Mail className="size-3 text-primary/50" />
                                                <span className="text-[10px]">{cliente.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] rounded-lg">
                                        {cliente.total_citas} Citas
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white/80 font-bold">
                                            {cliente.ultima_cita ? new Date(cliente.ultima_cita).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            }).toUpperCase() : 'NUNCA'}
                                        </span>
                                        <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">
                                            {cliente.ultima_cita ? new Date(cliente.ultima_cita).toLocaleTimeString('es-MX', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : '-'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-xl hover:bg-primary/20 text-white/40 hover:text-primary active:scale-95 transition-all"
                                        onClick={() => openEditClientModal(cliente)}
                                    >
                                        <Edit2 className="size-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="glass-card border-white/10 bg-black/90 text-white max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-display text-gradient-gold tracking-tight uppercase">
                            {isNewClient ? 'Nuevo Cliente' : 'Perfil del Cliente'}
                        </DialogTitle>
                        <DialogDescription className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                            {isNewClient ? 'Registrar nuevo cliente en el CRM' : 'Ver y editar información de fidelidad'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCliente && (
                        <div className="space-y-6 pt-4">
                            {!isNewClient && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
                                        onClick={() => setShowDeleteDialog(true)}
                                    >
                                        <Trash2 className="size-3" />
                                        Eliminar Cliente
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                                    <Input
                                        className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl"
                                        value={selectedCliente.nombre}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Teléfono</label>
                                        <Input
                                            className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl font-mono"
                                            value={selectedCliente.telefono || ''}
                                            onChange={e => setSelectedCliente({ ...selectedCliente, telefono: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Email</label>
                                        <Input
                                            type="email"
                                            className="bg-white/5 border-white/10 focus:border-primary/50 text-white rounded-xl"
                                            value={selectedCliente.email || ''}
                                            onChange={e => setSelectedCliente({ ...selectedCliente, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Notas del Barbero (CRM)</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary/50 text-white rounded-xl p-3 min-h-[100px] text-sm outline-none transition-all placeholder:text-white/10"
                                        placeholder="Preferencias, estilo habitual, productos recomendados..."
                                        value={selectedCliente.notas_internas || ''}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, notas_internas: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Total Visitas</p>
                                    <p className="text-xl font-black text-primary font-display">{selectedCliente.total_citas}</p>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Registrado</p>
                                    <p className="text-[11px] font-black text-white/60">
                                        {new Date(selectedCliente.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 mt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl text-white/30 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => isNewClient ? handleSaveCliente() : setShowConfirmEditDialog(true)}
                                    className="btn-primary rounded-xl px-8 font-black uppercase tracking-widest text-[10px] shadow-[0_10px_20px_rgba(234,179,8,0.2)]"
                                >
                                    {isSaving ? 'Guardando...' : isNewClient ? 'Crear Cliente' : 'Guardar Perfil'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black text-red-500 uppercase tracking-tight flex items-center gap-3">
                            <AlertCircle className="size-5" />
                            ¿Eliminar Cliente?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60 font-medium">
                            Esta acción es irreversible. Se eliminará el historial del cliente y sus notas del sistema.
                            <br /><br />
                            <span className="text-red-400 font-bold uppercase text-[10px] tracking-widest">Atención:</span> Si el cliente tiene citas activas, la eliminación podría fallar o dejar registros huérfanos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCliente}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Permanentemente'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Confirmation Dialog */}
            <AlertDialog open={showConfirmEditDialog} onOpenChange={setShowConfirmEditDialog}>
                <AlertDialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black text-gradient-gold uppercase tracking-tight flex items-center gap-3">
                            <Edit2 className="size-5 text-primary" />
                            ¿Confirmar Cambios?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60 font-medium">
                            Estás a punto de modificar la información de este cliente. Asegúrate de que los datos sean correctos para mantener la integridad del CRM.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                            Revisar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSaveCliente}
                            disabled={isSaving}
                            className="btn-primary border-none rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
    )
}
