import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ClientAutocomplete } from './ClientAutocomplete'
import {
    Store,
    MessageCircle,
    Phone,
    User,
    Scissors,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    ArrowRight,
    History,
    X,
    CheckCircle2,
    Search,
    RefreshCcw,
    AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Servicio {
    id: string | number
    nombre: string
    precio: number
    duracion_minutos: number
}

interface TabletNuevaCitaModalProps {
    isOpen: boolean
    onClose: () => void
    barberoId: string
    sucursalId?: string
    horarioSucursalProps?: any
    citasDelDia: any[] // Array of CitaDesdeVista
    onCitaCreada: () => void
}

export function TabletNuevaCitaModal({ isOpen, onClose, barberoId, sucursalId, horarioSucursalProps, citasDelDia, onCitaCreada }: TabletNuevaCitaModalProps) {
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [error, setError] = useState('')
    const [showPastConfirm, setShowPastConfirm] = useState(false)

    // Form state
    const [nombre, setNombre] = useState('')
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [originalTelefono, setOriginalTelefono] = useState<string | null>(null)
    const [telefono, setTelefono] = useState('')
    const [servicioId, setServicioId] = useState('')
    const [horaInicio, setHoraInicio] = useState('')
    const [origen, setOrigen] = useState<'walkin' | 'whatsapp' | 'telefono'>('walkin')

    const getHoyStr = () => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date())
    }

    const [fecha, setFecha] = useState(getHoyStr())
    const [citasParaFecha, setCitasParaFecha] = useState<any[]>(citasDelDia)
    const [bloqueosParaFecha, setBloqueosParaFecha] = useState<any[]>([])
    const [almuerzoBarbero, setAlmuerzoBarbero] = useState<any>(null)
    const [horarioSucursal, setHorarioSucursal] = useState<any>(horarioSucursalProps || null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const selectedService = useMemo(() =>
        servicios.find(s => String(s.id) === String(servicioId)),
        [servicios, servicioId])

    useEffect(() => {
        if (!isOpen) return

        const fetchDatosDia = async () => {
            setIsRefreshing(true)
            const supabase = createClient()

            // Citas: Always fetch from API to ensure real-time data when modal opens
            const { data: citasData } = await supabase.from('vista_general_citas').select('*').eq('fecha_cita_local', fecha)
            if (citasData) {
                const filtered = barberoId ? citasData.filter((c: any) => String(c.barbero_id) === String(barberoId)) : citasData
                console.log(`📡 [TabletNuevaCitaModal] Citas encontradas (${fecha}):`, filtered.length)
                setCitasParaFecha(filtered)
            } else {
                console.log(`📡 [TabletNuevaCitaModal] No se encontraron citas para ${fecha}`)
                setCitasParaFecha([])
            }

            // Bloqueos y Almuerzo
            const [bloqueosRes, barberoRes, sucursalRes] = await Promise.all([
                supabase.from('bloqueos').select('*').gte('fecha_inicio', `${fecha}T00:00:00`).lte('fecha_inicio', `${fecha}T23:59:59`),
                barberoId ? supabase.from('barberos').select('bloqueo_almuerzo').eq('id', barberoId).single() : Promise.resolve({ data: null } as any),
                sucursalId ? supabase.from('sucursales').select('horario_apertura').eq('id', sucursalId).single() : Promise.resolve({ data: null } as any)
            ])

            if (bloqueosRes.error) {
                console.error('❌ [TabletNuevaCitaModal] Error al obtener bloqueos:', bloqueosRes.error)
            }

            if (bloqueosRes.data) {
                const filteredBloqueos = bloqueosRes.data.filter((b: any) => !b.barbero_id || String(b.barbero_id) === String(barberoId))
                console.log(`📡 [TabletNuevaCitaModal] Bloqueos encontrados:`, filteredBloqueos.length)
                setBloqueosParaFecha(filteredBloqueos)
            } else {
                setBloqueosParaFecha([])
            }

            if (barberoRes.data) {
                setAlmuerzoBarbero(barberoRes.data.bloqueo_almuerzo)
            }

            if (sucursalRes.data) {
                setHorarioSucursal(sucursalRes.data.horario_apertura)
            } else if (horarioSucursalProps) {
                setHorarioSucursal(horarioSucursalProps)
            }
            setIsRefreshing(false)
        }

        fetchDatosDia()
    }, [fecha, isOpen, barberoId]) // Elimino citasDelDia de deps para evitar bucles si el padre cambia pero no necesitamos refrescar nosotros mismos

    const formato12h = (hora24: string) => {
        if (!hora24) return 'Ninguna'
        const [h, m] = hora24.split(':')
        const hNum = parseInt(h, 10)
        const ampm = hNum >= 12 ? 'PM' : 'AM'
        const h12 = hNum % 12 || 12
        return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`
    }

    // Nueva función para parsear el formato "HH:MI AM/PM" de la vista a minutos
    const parse12hToMins = (hora12: string) => {
        if (!hora12) return 0
        const matches = hora12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
        if (!matches) return 0

        let hours = parseInt(matches[1], 10)
        const minutes = parseInt(matches[2], 10)
        const ampm = matches[3].toUpperCase()

        if (ampm === 'PM' && hours < 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0

        return hours * 60 + minutes
    }

    // Custom Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    // Date Navigation
    const shiftFecha = (days: number) => {
        const current = new Date(`${fecha}T12:00:00-07:00`)
        current.setDate(current.getDate() + days)
        setFecha(current.toISOString().split('T')[0])
    }

    const getRelativeLabel = (fechaStr: string) => {
        if (fechaStr === getHoyStr()) return 'HOY'

        const target = new Date(`${fechaStr}T12:00:00-07:00`)
        const hoy = new Date(`${getHoyStr()}T12:00:00-07:00`)

        const diffTime = target.getTime() - hoy.getTime()
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

        if (diffDays === 1) return 'MAÑANA'
        if (diffDays === -1) return 'AYER'
        return target.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const dropdownRef = useRef<HTMLDivElement>(null)
    const dateInputRef = useRef<HTMLInputElement>(null)

    // Double Tap State for Mobile compatibility
    const lastTap = useRef<number>(0)
    const handleDoubleTap = () => {
        const now = Date.now()
        const DOUBLE_PRESS_DELAY = 300
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            setFecha(getHoyStr())
        }
        lastTap.current = now
    }

    // Click outside handler para el Dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return

        const fetchServicios = async () => {
            try {
                const res = await fetch('/api/servicios')
                if (!res.ok) throw new Error('Error al cargar servicios')
                const data = await res.json()
                if (data.ok) {
                    setServicios(data.data)
                }
            } catch (err) {
                console.error(err)
                setError('No se pudieron cargar los servicios. Usa Supabase directo en fallback.')
            }
        }

        // Si la hora inicial está vacía, prellenarla a la próxima hora media en punto
        const ahora = new Date()
        ahora.setMinutes(ahora.getMinutes() >= 30 ? 60 : 30)
        const horaStr = ahora.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // HH:MM (24h)
        setHoraInicio(horaStr)

        fetchServicios()
    }, [isOpen])

    const handleSubmit = async (e?: React.FormEvent, isConfirmedPast = false) => {
        if (e) e.preventDefault()
        setError('')

        if (!nombre || !servicioId || !horaInicio) {
            setError('Nombre, Servicio y Hora son requeridos.')
            return
        }

        // --- VALIDACIÓN DE PASADO ---
        const ahora = new Date()
        const TZ_OFFSET = '-07:00'
        const selectedDateTime = new Date(`${fecha}T${horaInicio}:00${TZ_OFFSET}`)

        // Si el tiempo seleccionado es antes que 'ahora' y no está confirmado, mostrar modal
        if (selectedDateTime < ahora && !isConfirmedPast) {
            setShowPastConfirm(true)
            return
        }

        setLoading(true)
        try {
            // --- ACTUALIZACIÓN DE PERFIL DE CLIENTE ---
            // Si el cliente existe y el teléfono ha sido modificado (y no es la leyenda de vacío)
            if (clienteId && telefono !== (originalTelefono || "") && telefono !== "Sin registro de numero celular") {
                const supabase = createClient()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updateQuery = (supabase as any).from('clientes').update({ telefono: telefono || null }).eq('id', clienteId)
                const { error: updateError } = await updateQuery

                if (updateError) {
                    console.error('⚠️ [Sync] Error al actualizar el perfil del cliente:', updateError)
                    // No bloqueamos la cita por un error en el perfil, pero lo registramos
                } else {
                    console.log('✅ [Sync] Perfil del cliente actualizado con éxito')
                }
            }

            // Construir el timestamp combinando el día (local) con la hora seleccionada
            // Forzamos el uso de la zona local de Hermosillo Sonora México agregando el offset.
            const fechaStr = fecha // YYYY-MM-DD
            const TZ_OFFSET = '-07:00'
            const timestampCompleto = `${fechaStr}T${horaInicio}:00${TZ_OFFSET}`

            // Encontrar duración del servicio seleccionado
            const duracion = selectedService ? selectedService.duracion_minutos : 30 // Fallback genérico

            // Calcular timestamp final sumando duración
            const fechaInicioObj = new Date(timestampCompleto)
            const fechaFinObj = new Date(fechaInicioObj.getTime() + duracion * 60000)

            // Formatear el timestamp_fin resultante en el mismo string con timezone de Hermosillo
            const finStrFormatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Hermosillo',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                year: 'numeric', month: '2-digit', day: '2-digit'
            })
            // EnGB arroja DD/MM/YYYY, HH:MM:SS. Lo necesitamos armar manualmente.
            // Para más facilidad, tomamos las piezas de Intl.DateTimeFormat
            const parts = finStrFormatter.formatToParts(fechaFinObj)
            const p = parts.reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as any)
            const timestampFinCompleto = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00${TZ_OFFSET}`

            // API Payload
            const payload = {
                barbero_id: barberoId,
                cliente_id: clienteId,
                cliente_nombre: nombre,
                cliente_telefono: telefono === "Sin registro de numero celular" ? null : telefono,
                servicio_id: servicioId,
                timestamp_inicio: timestampCompleto,
                timestamp_fin: timestampFinCompleto,
                duracion_estimada: duracion,
                estado: 'confirmada', // Walk-ins entran confirmados directamente
                ...(sucursalId ? { sucursal_id: sucursalId } : {}),
                origen: origen
            }

            const res = await fetch('/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const json = await res.json()

            if (!res.ok || !json.ok) {
                throw new Error(json.message || json.error || 'Error al crear la cita')
            }

            // Exito
            resetForm()
            // Delay closing to let DB views sync
            setTimeout(() => {
                onCitaCreada()
                onClose()
            }, 500)

        } catch (err: any) {
            setError(err.message || 'Error de conexión. Revisa la disponibilidad de ese horario.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setNombre('')
        setClienteId(null)
        setTelefono('')
        setServicioId('')
        setOrigen('walkin')
        setError('')
        setFecha(getHoyStr())
    }

    // Handlers
    const handleClose = () => {
        resetForm()
        onClose()
    }

    // Horarios para generar botones (ajustado al horario de la sucursal) - MEMOIZED for performance
    const slotsParaCita = useMemo(() => {
        const slots = []
        const isToday = fecha === getHoyStr()

        // Determinar día de la semana para el horario de sucursal
        const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
        const targetDate = new Date(`${fecha}T12:00:00-07:00`)
        const indiceDia = targetDate.getDay()
        const nombreDia = dias[indiceDia]

        let horaApertura = 8
        let horaCierre = 20

        if (horarioSucursal && horarioSucursal[nombreDia]) {
            const hA = horarioSucursal[nombreDia].apertura
            const hC = horarioSucursal[nombreDia].cierre
            if (hA) {
                horaApertura = parseInt(hA.split(':')[0], 10) - 1
                if (horaApertura < 0) horaApertura = 0
            }
            if (hC) {
                const parts = hC.split(':')
                horaCierre = parseInt(parts[0], 10) + 1
                if (parseInt(parts[1], 10) === 0) {
                    // Si cierra a las 19:00, la horaCierre base era 19, extendida es 20.
                    // Pero queremos permitir citas QUE EMPIECEN a las 19:30 si extendemos 1 hora?
                    // El requerimiento dice "mostrar una hora antes y despues".
                    // Si cierra a las 19:00, permitimos slots hasta las 20:00.
                }
                if (horaCierre > 23) horaCierre = 23
            }
        } else if (horarioSucursal) {
            return []
        }

        // La partición de horas es fija de 30 minutos (el usuario prefiere ignorar la duración del servicio para mostrar disponibilidad)
        const duracionSlotMin = 30

        const getSlotStatus = (start: Date, end: Date) => {
            const ahora = new Date()

            // Comparar minutos totales del día para mayor precisión
            const startMins = start.getHours() * 60 + start.getMinutes()
            const endMins = end.getHours() * 60 + end.getMinutes()

            const estadosFinalizados = ['completada', 'finalizada', 'cobrada', 'por_cobrar']

            // 1. Buscar cita en el slot PRIMERO (antes de evaluar 'past')
            //    Así detectamos correctamente las citas finalizadas en el pasado
            const citaOcupada = citasParaFecha.find(c => {
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                // Usamos las horas locales de la vista si están disponibles para máxima precisión
                let cSMins, cEMins
                if (c.hora_cita_local && c.hora_fin_local) {
                    // La vista devuelve formato "HH:MI AM" (ej: "06:00 PM")
                    cSMins = parse12hToMins(c.hora_cita_local)
                    cEMins = parse12hToMins(c.hora_fin_local)
                } else {
                    const cStart = new Date(c.timestamp_inicio)
                    const cEnd = new Date(c.timestamp_fin)
                    cSMins = cStart.getHours() * 60 + cStart.getMinutes()
                    cEMins = cEnd.getHours() * 60 + cEnd.getMinutes()
                }

                // LÓGICA DE SLOT ÚNICO (Petición del usuario):
                // Una cita solo bloquea el slot de 30 minutos donde COMIENZA.
                // Ignoramos la duración del servicio para dejar libres los "siguientes horarios".
                if (cSMins >= startMins && cSMins < endMins) {
                    return true
                }
                return false
            })

            // 2. Slot del pasado con cita ya finalizada/cobrada → verde inhabilitado 'HECHO'
            if (citaOcupada && estadosFinalizados.includes(citaOcupada.estado) && start < ahora) return 'finalizada'
            // 3. Slot ocupado por cita pendiente/en curso → rojo 'OCUPADO'
            if (citaOcupada) return 'ocupado'
            // 4. Slot del pasado sin cita → atenuado pero seleccionable (solo hoy)
            if (start < ahora && fecha === getHoyStr()) return 'past'

            const bloqueado = bloqueosParaFecha.some(b => {
                const bStart = new Date(b.fecha_inicio)
                const bEnd = new Date(b.fecha_fin)
                return start < bEnd && end > bStart
            })
            if (bloqueado) return 'bloqueado'

            if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) {
                const almuerzoStart = new Date(`${fecha}T${almuerzoBarbero.inicio}:00-07:00`)
                const almuerzoEnd = new Date(`${fecha}T${almuerzoBarbero.fin}:00-07:00`)
                if (start < almuerzoEnd && end > almuerzoStart) return 'bloqueado'
            }
            return 'libre'
        }

        for (let h = horaApertura; h <= horaCierre; h++) {
            const hourValue = `${h.toString().padStart(2, '0')}:00`
            const h12 = h % 12 || 12
            const ampm = h >= 12 ? 'PM' : 'AM'
            const label = `${h12}:00 ${ampm}`

            const slotStart = new Date(`${fecha}T${hourValue}:00-07:00`)
            const slotEnd = new Date(slotStart.getTime() + duracionSlotMin * 60000)
            const status = getSlotStatus(slotStart, slotEnd)

            slots.push({ value: hourValue, label, status })

            const halfHourValue = `${h.toString().padStart(2, '0')}:30`
            const halfLabel = `${h12}:30 ${ampm}`
            const halfSlotStart = new Date(`${fecha}T${halfHourValue}:00-07:00`)
            const halfSlotEnd = new Date(halfSlotStart.getTime() + duracionSlotMin * 60000)

            let isWithinClosing = true
            if (horarioSucursal && horarioSucursal[nombreDia]) {
                const hC = horarioSucursal[nombreDia].cierre
                const [cierreH, cierreM] = hC.split(':').map(Number)
                const extendedCierreH = cierreH + 1
                // Permitimos slot de :30 si la hora es menor al cierre extendido, 
                // o si es igual al cierre extendido y tiene al menos 30min de margen (aunque 30 es el final)
                if (h > extendedCierreH || (h === extendedCierreH && cierreM < 30 && cierreH === extendedCierreH)) isWithinClosing = false
                // Simplificado: si h es < horaCierre (que ya es cierre+1), permitimos el :30
                if (h > horaCierre) isWithinClosing = false
            }

            if (isWithinClosing) {
                const halfStatus = getSlotStatus(halfSlotStart, halfSlotEnd)
                slots.push({ value: halfHourValue, label: halfLabel, status: halfStatus })
            }
        }
        return slots
    }, [fecha, citasParaFecha, bloqueosParaFecha, almuerzoBarbero, horarioSucursal, servicioId, servicios])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent showCloseButton={false} className="bg-[#0A0C10] border-white/10 text-white rounded-[2rem] p-0 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,1)] w-[95vw] sm:max-w-lg max-h-[96vh] flex flex-col border outline-none">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-600 z-50 shrink-0" />

                {/* Decorative background light */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                <DialogHeader className="px-6 sm:px-8 py-5 sm:py-6 border-b border-white/5 bg-black/40 flex flex-row items-center justify-between space-y-0 relative z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white font-display">
                                Añadir Cita
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-1 w-6 bg-primary rounded-full shadow-[0_0_10px_rgba(245,200,66,0.5)]" />
                                <p className="text-[9px] sm:text-[10px] text-primary/60 font-black uppercase tracking-[0.2em]">Registro Manual</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </DialogHeader>

                <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {/* Errores */}
                    {error && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-shake">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <span className="font-bold uppercase tracking-widest text-[9px] text-red-400">{error}</span>
                        </div>
                    )}

                    {/* Selector de Origen */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOrigen('walkin')}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                origen === 'walkin' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            )}
                        >
                            <Store className="w-4 h-4" />
                            Local
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOrigen('whatsapp')}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                origen === 'whatsapp' ? 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            )}
                        >
                            <MessageCircle className="w-4 h-4" />
                            WP
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOrigen('telefono')}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                origen === 'telefono' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                            )}
                        >
                            <Phone className="w-4 h-4" />
                            Llamada
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Cliente Input */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-2 block">Nombre del Cliente</Label>
                            <ClientAutocomplete
                                value={nombre}
                                onChange={(val) => {
                                    setNombre(val)
                                    if (clienteId) {
                                        setClienteId(null)
                                        setTelefono("")
                                        setOriginalTelefono(null)
                                    }
                                }}
                                onSelect={(cliente) => {
                                    setNombre(cliente.nombre)
                                    setClienteId(cliente.id)
                                    setOriginalTelefono(cliente.telefono)
                                    setTelefono(cliente.telefono || "Sin registro de numero celular")
                                }}
                                placeholder="Nombre del Cliente"
                            />
                        </div>

                        {/* Teléfono Input */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1">
                                Teléfono <span className="text-white/20">(Opcional)</span>
                            </Label>
                            <div className="group relative flex items-center">
                                <Phone className="absolute left-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                                <Input
                                    type="tel"
                                    value={telefono}
                                    onFocus={() => {
                                        if (telefono === "Sin registro de numero celular") setTelefono("")
                                    }}
                                    onBlur={() => {
                                        if (telefono === "" && !originalTelefono && clienteId) {
                                            setTelefono("Sin registro de numero celular")
                                        }
                                    }}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className={cn(
                                        "pl-11 h-12 bg-white/5 border-white/10 rounded-2xl text-sm font-bold focus-visible:ring-primary/50 focus-visible:bg-black/40 transition-all",
                                        telefono === "Sin registro de numero celular" ? "text-amber-500/40 italic font-normal" : "text-white placeholder:text-white/10"
                                    )}
                                    placeholder="Teléfono del Cliente"
                                />
                                {clienteId && (telefono !== (originalTelefono || "") && (telefono !== "Sin registro de numero celular" && telefono !== "")) && (
                                    <div className="absolute -bottom-6 left-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-tight">
                                            Se actualizará este dato en el perfil del cliente
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Servicio Selector */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1">Servicio</Label>
                            <Select value={servicioId} onValueChange={(val) => val && setServicioId(val)}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl text-sm font-semibold focus:ring-primary/50 focus:bg-black/40 transition-all px-4">
                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                        <Scissors className="w-4 h-4 text-primary shrink-0" />
                                        {selectedService ? (
                                            <div className="flex items-center justify-between flex-1 truncate pr-2">
                                                <span className="truncate">{selectedService.nombre}</span>
                                                <span className="text-primary font-bold ml-2 shrink-0">${selectedService.precio}</span>
                                            </div>
                                        ) : (
                                            <SelectValue placeholder="Selecciona el servicio" className="text-white/40" />
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-[#0A0C10] border-white/10 text-white rounded-2xl w-[var(--radix-select-trigger-width)] min-w-[240px] p-1">
                                    {servicios.map(s => (
                                        <SelectItem
                                            key={s.id}
                                            value={s.id.toString()}
                                            className="focus:bg-primary/10 focus:text-primary rounded-xl py-3 px-3 transition-colors group"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs sm:text-sm font-semibold truncate group-data-[state=checked]:text-primary transition-colors">
                                                    {s.nombre}
                                                </span>
                                                <Badge variant="outline" className="text-[9px] font-bold bg-white/5 border-white/5 text-white/40 ml-2 shrink-0">
                                                    ${s.precio}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fecha y Día */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1 block truncate">Fecha</Label>
                                <Popover>
                                    <PopoverTrigger
                                        className={cn(
                                            "w-full h-12 justify-start text-left font-bold bg-white/5 border border-white/10 rounded-2xl gap-3 text-xs sm:text-sm transition-all hover:bg-white/10 hover:border-white/20 flex items-center px-4",
                                            !fecha && "text-white/20"
                                        )}
                                    >
                                        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                                        <span className="truncate">
                                            {fecha ? format(new Date(`${fecha}T12:00:00`), "eee, d 'de' MMM", { locale: es }) : "Elegir fecha"}
                                        </span>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#0A0C10] border-white/10 rounded-2xl overflow-hidden shadow-2xl" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={new Date(`${fecha}T12:00:00`)}
                                            onSelect={(date) => date && setFecha(format(date, "yyyy-MM-dd"))}
                                            initialFocus
                                            locale={es}
                                            className="bg-transparent text-white"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest text-center block truncate">Acceso Rápido</Label>
                                <div className="flex items-center justify-between bg-white/5 h-12 rounded-2xl border border-primary/10 bg-primary/5 px-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => shiftFecha(-1)}
                                        className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-white/10 rounded-xl transition-all"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex-1 text-center select-none cursor-pointer hover:text-primary transition-colors" onClick={() => setFecha(getHoyStr())}>
                                        {getRelativeLabel(fecha)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => shiftFecha(1)}
                                        className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-white/10 rounded-xl transition-all"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Horarios */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block truncate">
                                    Hora: <span className="text-primary font-bold ml-1">{formato12h(horaInicio)}</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    {isRefreshing && <RefreshCcw className="w-3 h-3 text-primary animate-spin opacity-40" />}
                                    <Badge variant="outline" className="text-[8px] font-black bg-primary/5 border-primary/20 text-primary/60 uppercase tracking-tighter rounded-full px-2 py-0.5">
                                        {slotsParaCita.filter(s => s.status === 'libre').length} LIBRES
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 overflow-visible">
                                {slotsParaCita.length > 0 ? (
                                    slotsParaCita.map(slot => {
                                        const isPast = slot.status === 'past'
                                        const isOccupied = slot.status === 'ocupado'
                                        const isBlocked = slot.status === 'bloqueado'
                                        const isFinalized = slot.status === 'finalizada'
                                        const isSelected = horaInicio === slot.value
                                        // 'past' sigue seleccionable para registro retroactivo
                                        const isDisabled = isOccupied || isBlocked || isFinalized

                                        return (
                                            <Button
                                                key={slot.value}
                                                variant="outline"
                                                disabled={isDisabled}
                                                onClick={() => setHoraInicio(slot.value)}
                                                className={cn(
                                                    "h-11 sm:h-12 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center border transition-all active:scale-[0.98] group relative px-0 overflow-hidden",
                                                    // Ocupado por cita activa (futura/en curso): rojo
                                                    isOccupied && "bg-red-500/5 text-red-500 border-red-500/20 opacity-100 shadow-none",
                                                    // Cita ya finalizada/cobrada en el pasado: verde apagado, inhabilitado
                                                    isFinalized && "bg-emerald-500/5 text-emerald-600/60 border-emerald-500/15 opacity-70 cursor-not-allowed",
                                                    // Pasado sin cita: atenuado pero seleccionable
                                                    isPast && !isFinalized && "opacity-60 bg-white/5 border-white/5 text-white/40",
                                                    // Bloqueado manual
                                                    isBlocked && "bg-white/5 text-white/20 border-white/5 opacity-50",
                                                    // Libre disponible
                                                    !isDisabled && !isPast && "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10",
                                                    // Seleccionado
                                                    isSelected && !isDisabled && "bg-primary/20 text-primary border-primary/50 shadow-[0_0_20px_rgba(245,200,66,0.1)]",
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs tracking-tighter leading-none font-black mb-0.5 z-10",
                                                    isOccupied ? "text-red-500" : isFinalized ? "text-emerald-600/70" : ""
                                                )}>
                                                    {slot.label.split(' ')[0]}
                                                </span>
                                                <span className={cn(
                                                    "text-[5px] sm:text-[6px] uppercase tracking-tighter font-black transition-colors z-10",
                                                    isOccupied ? "text-red-500/80" : isFinalized ? "text-emerald-600/60" : "opacity-20"
                                                )}>
                                                    {isOccupied ? 'OCUPADO' : isFinalized ? 'HECHO' : isBlocked ? 'BLOQUEADO' : isPast ? 'PASADO' : 'LIBRE'}
                                                </span>
                                            </Button>
                                        )
                                    })
                                ) : (
                                    <div className="col-span-full py-10 bg-white/5 rounded-[1.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                                        <Clock className="w-8 h-8 text-white/10" />
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Sin Disponibilidad</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción dentro del scroll para maximizar espacio */}
                        <div className="pt-4 border-t border-white/5 flex flex-col-reverse sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="h-12 sm:h-14 sm:flex-1 bg-white/5 text-white/60 rounded-xl sm:rounded-2xl font-semibold text-sm hover:text-white hover:bg-white/10 transition-all border border-white/10"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={(e) => handleSubmit(e)}
                                disabled={loading}
                                className={cn(
                                    "h-12 sm:h-14 sm:flex-[2] rounded-xl sm:rounded-2xl font-semibold text-sm transition-all",
                                    loading
                                        ? 'bg-primary/50 text-black/50'
                                        : 'bg-primary text-black hover:bg-amber-400 shadow-lg shadow-primary/20 active:scale-[0.98]'
                                )}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        <span>Procesando...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Confirmar Cita</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>


                {/* Confirmación Retroactiva Nested Dialog */}
                {showPastConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowPastConfirm(false)} />
                        <div className="relative bg-[#0A0C10] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-[calc(100%-2rem)] sm:max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-amber-500/20 shadow-inner">
                                <History className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white text-center mb-4 uppercase tracking-tighter">Cita Retroactiva</h3>
                            <p className="text-white/40 text-[11px] font-bold text-center mb-10 leading-relaxed uppercase tracking-widest">
                                Estás agendando una cita para una hora que ya pasó. <span className="text-white">¿Deseas registrarla de todas formas?</span>
                            </p>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <Button
                                    onClick={() => {
                                        setShowPastConfirm(false)
                                        handleSubmit(undefined, true)
                                    }}
                                    className="w-full h-12 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase tracking-widest rounded-xl sm:rounded-2xl active:scale-[0.98] shadow-xl shadow-amber-900/10"
                                >
                                    Confirmar Registro
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowPastConfirm(false)}
                                    className="w-full h-12 sm:h-14 bg-white/5 text-white/40 font-black uppercase tracking-widest rounded-xl sm:rounded-2xl"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
