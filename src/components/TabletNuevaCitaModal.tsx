import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

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
    citasDelDia: any[] // Array of CitaDesdeVista
    onCitaCreada: () => void
}

export function TabletNuevaCitaModal({ isOpen, onClose, barberoId, sucursalId, citasDelDia, onCitaCreada }: TabletNuevaCitaModalProps) {
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [error, setError] = useState('')
    const [showPastConfirm, setShowPastConfirm] = useState(false)

    // Form state
    const [nombre, setNombre] = useState('')
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
    const [horarioSucursal, setHorarioSucursal] = useState<any>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        const fetchDatosDia = async () => {
            setIsRefreshing(true)
            const supabase = createClient()

            // Citas: Always fetch from API to ensure real-time data when modal opens
            const { data: citasData } = await supabase.from('vista_citas_agente').select('*').eq('fecha_cita_local', fecha)
            if (citasData) {
                const filtered = barberoId ? citasData.filter((c: any) => String(c.barbero_id) === String(barberoId)) : citasData
                setCitasParaFecha(filtered)
            } else {
                setCitasParaFecha([])
            }

            // Bloqueos, Almuerzo y Sucursal
            const [bloqueosRes, barberoRes, sucursalRes] = await Promise.all([
                supabase.from('bloqueos').select('*').gte('timestamp_inicio', `${fecha}T00:00:00-07:00`).lte('timestamp_fin', `${fecha}T23:59:59-07:00`),
                barberoId ? supabase.from('barberos').select('bloqueo_almuerzo').eq('id', barberoId).single() : Promise.resolve({ data: null } as any),
                sucursalId ? supabase.from('sucursales').select('horario_apertura').eq('id', sucursalId).single() : Promise.resolve({ data: null } as any)
            ])

            if (bloqueosRes.data) {
                setBloqueosParaFecha(bloqueosRes.data.filter((b: any) => !b.barbero_id || String(b.barbero_id) === String(barberoId)))
            } else {
                setBloqueosParaFecha([])
            }

            if (barberoRes.data) {
                setAlmuerzoBarbero(barberoRes.data.bloqueo_almuerzo)
            }

            if (sucursalRes.data) {
                setHorarioSucursal(sucursalRes.data.horario_apertura)
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
            // Construir el timestamp combinando el día (local) con la hora seleccionada
            // Forzamos el uso de la zona local de Hermosillo Sonora México agregando el offset.
            const fechaStr = fecha // YYYY-MM-DD
            const TZ_OFFSET = '-07:00'
            const timestampCompleto = `${fechaStr}T${horaInicio}:00${TZ_OFFSET}`

            // Encontrar duración del servicio seleccionado
            const svc = servicios.find(s => String(s.id) === String(servicioId))
            const duracion = svc ? svc.duracion_minutos : 30 // Fallback genérico

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
                cliente_nombre: nombre,
                cliente_telefono: telefono,
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
            if (hA) horaApertura = parseInt(hA.split(':')[0], 10)
            if (hC) {
                const parts = hC.split(':')
                horaCierre = parseInt(parts[0], 10)
                if (parseInt(parts[1], 10) === 0) horaCierre -= 1
            }
        } else if (horarioSucursal) {
            return []
        }

        // La partición de horas es fija de 30 minutos (el usuario prefiere ignorar la duración del servicio para mostrar disponibilidad)
        const duracionSlotMin = 30

        const getSlotStatus = (start: Date, end: Date) => {
            const ahora = new Date()
            if (start < ahora && fecha === getHoyStr()) return 'past'

            const citasOverlap = citasParaFecha.filter(c => {
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false
                const cStart = new Date(c.timestamp_inicio)
                const cEnd = new Date(c.timestamp_fin)
                return start < cEnd && end > cStart
            })
            if (citasOverlap.length > 0) return 'ocupado'

            const bloqueado = bloqueosParaFecha.some(b => {
                const bStart = new Date(b.timestamp_inicio)
                const bEnd = new Date(b.timestamp_fin)
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
                const [cieseH, cierreM] = hC.split(':').map(Number)
                if (h > cieseH || (h === cieseH && cierreM < 30)) isWithinClosing = false
            }

            if (isWithinClosing) {
                const halfStatus = getSlotStatus(halfSlotStart, halfSlotEnd)
                slots.push({ value: halfHourValue, label: halfLabel, status: halfStatus })
            }
        }
        return slots
    }, [fecha, citasParaFecha, bloqueosParaFecha, almuerzoBarbero, horarioSucursal, servicioId, servicios])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4 md:p-6"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-[480px] max-h-[88vh] flex flex-col bg-[#0A0C10] border border-white/10 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,1)] z-[101] overflow-hidden"
                    >
                        {/* Custom CSS overrides for native date picker icon avoiding white backgrounds */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            input[type="date"]::-webkit-calendar-picker-indicator {
                                filter: invert(1) sepia(100%) saturate(500%) hue-rotate(350deg) brightness(80%) contrast(150%);
                                opacity: 0.8;
                                cursor: pointer;
                                transition: 0.2s;
                            }
                            input[type="date"]::-webkit-calendar-picker-indicator:hover {
                                opacity: 1;
                                filter: invert(1) sepia(100%) saturate(1000%) hue-rotate(350deg) brightness(120%) contrast(150%);
                            }
                        `}} />

                        {/* Decorative background light */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

                        <div className="p-3 md:p-4 shrink-0 border-b border-white/5 relative z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight font-display">Añadir Cita</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1 w-6 bg-primary rounded-full" />
                                        <p className="text-[9px] text-primary/60 font-black uppercase tracking-[0.2em]">Registro Manual</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors border border-white/5 active:scale-95"
                                >
                                    <span className="material-icons-round text-lg">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-3 md:p-4 flex-1 relative z-10 overflow-y-auto custom-scrollbar-thin scroll-smooth">

                            {/* Errores */}
                            {error && (
                                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 animate-shake">
                                    <span className="material-icons-round text-red-400 text-xs">error</span>
                                    <span className="font-bold uppercase tracking-widest text-[8px] text-red-400">{error}</span>
                                </div>
                            )}

                            {/* Formulario */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {/* Selector de Origen */}
                                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setOrigen('walkin')}
                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${origen === 'walkin' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        <span className="material-icons-round text-[12px]">storefront</span>
                                        Local
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrigen('whatsapp')}
                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${origen === 'whatsapp' ? 'bg-[#25D366]/20 text-[#25D366]' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        <span className="material-icons-round text-[12px]">chat</span>
                                        WP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrigen('telefono')}
                                        className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${origen === 'telefono' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        <span className="material-icons-round text-[12px]">call</span>
                                        Llamada
                                    </button>
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Cliente</label>
                                    <div className="group flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl focus-within:border-primary/50 focus-within:bg-black transition-all">
                                        <span className="material-icons-round text-white/20 text-[16px] group-focus-within:text-primary">person</span>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-xs"
                                            placeholder="Nombre del Cliente"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Teléfono <span className="text-white/20">(Opcional)</span></label>
                                    <div className="group flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl focus-within:border-primary/50 focus-within:bg-black transition-all">
                                        <span className="material-icons-round text-white/20 text-[16px] group-focus-within:text-primary">phone</span>
                                        <input
                                            type="tel"
                                            value={telefono}
                                            onChange={(e) => setTelefono(e.target.value)}
                                            className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-xs"
                                            placeholder="Teléfono del Cliente"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Servicio Solicitado</label>
                                    <div className="relative" ref={dropdownRef}>
                                        <div
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className={`group flex items-center justify-between px-3 py-2 bg-white/5 border rounded-xl cursor-pointer transition-all ${isDropdownOpen ? 'border-primary/50 bg-black' : 'border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`material-icons-round text-[16px] transition-colors ${isDropdownOpen ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`}>cut</span>
                                                <span className={`font-bold text-xs ${servicioId ? 'text-white' : 'text-white/50'}`}>
                                                    {servicioId
                                                        ? `${servicios.find(s => String(s.id) === String(servicioId))?.nombre || 'Desconocido'} ($${servicios.find(s => String(s.id) === String(servicioId))?.precio || '0'})`
                                                        : 'Selecciona el servicio'
                                                    }
                                                </span>
                                            </div>
                                            <span className={`material-icons-round text-white/20 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
                                        </div>

                                        {/* Custom Dropdown List */}
                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-[110%] left-0 w-full bg-[#0a0a0a] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[110] overflow-hidden p-1 flex flex-col gap-0.5 backdrop-blur-2xl"
                                                >
                                                    {servicios.map(s => (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => {
                                                                setServicioId(s.id.toString())
                                                                setIsDropdownOpen(false)
                                                            }}
                                                            className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${String(servicioId) === String(s.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                                                        >
                                                            <span className={`font-bold text-xs ${String(servicioId) === String(s.id) ? 'text-primary' : 'text-white'}`}>{s.nombre}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{s.duracion_minutos} min</span>
                                                                <span className={`font-black text-xs ${String(servicioId) === String(s.id) ? 'text-primary' : 'text-emerald-400'}`}>${s.precio}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 relative">
                                        <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Fecha de la Cita</label>
                                        <div
                                            onClick={() => dateInputRef.current?.showPicker()}
                                            className="relative group flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl hover:border-primary/50 hover:bg-black/40 transition-all cursor-pointer overflow-hidden"
                                        >
                                            <span className="material-icons-round text-white/20 text-[14px] group-hover:text-primary z-10 pointer-events-none">event</span>
                                            {/* Texto simulado con formato en español */}
                                            <span className="absolute left-9 font-black text-xs text-white pointer-events-none uppercase z-10 truncate translate-y-[1px]">
                                                {new Date(`${fecha}T12:00:00-07:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' }).replace(',', '')}
                                            </span>
                                            {/* Input real superpuesto pero oculto */}
                                            <input
                                                ref={dateInputRef}
                                                type="date"
                                                value={fecha}
                                                onChange={(e) => setFecha(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                                                style={{ colorScheme: 'dark' }}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1 relative flex flex-col justify-end">
                                        <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1 text-center">Día</label>
                                        <div
                                            onClick={handleDoubleTap}
                                            onDoubleClick={() => setFecha(getHoyStr())}
                                            className="flex items-center justify-between bg-white/5 p-1 rounded-xl border border-primary/20 bg-primary/5 h-[36px] cursor-pointer hover:bg-primary/10 transition-colors select-none"
                                            title="Doble clic para volver a Hoy"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => shiftFecha(-1)}
                                                className="w-7 h-full flex items-center justify-center text-primary/60 hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <span className="material-icons-round text-[16px]">chevron_left</span>
                                            </button>
                                            <span className="text-white text-[10px] font-black uppercase tracking-tight flex-1 text-center px-1 truncate">
                                                {getRelativeLabel(fecha)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => shiftFecha(1)}
                                                className="w-7 h-full flex items-center justify-center text-primary/60 hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <span className="material-icons-round text-[16px]">chevron_right</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Hora: <span className="text-primary">{formato12h(horaInicio)}</span></label>
                                            {isRefreshing && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 border border-primary/40 border-t-primary rounded-full animate-spin" />
                                                    <span className="text-[6px] text-primary/40 font-black uppercase tracking-widest">Sincronizando...</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{slotsParaCita.filter(s => s.status === 'libre').length} LIBRES</span>
                                    </div>

                                    {/* Botones rápidos de horario */}
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 pt-0.5">
                                        {slotsParaCita.length > 0 ? (
                                            slotsParaCita.map(slot => {
                                                const isPast = slot.status === 'past'
                                                const isOccupied = slot.status === 'ocupado'
                                                const isBlocked = slot.status === 'bloqueado'
                                                const isSelected = horaInicio === slot.value

                                                const btnClass = isPast ? "opacity-30 grayscale border-white/5 active:scale-95" :
                                                    isOccupied ? "bg-red-500/10 text-red-500/40 border-red-500/10 cursor-not-allowed" :
                                                        isBlocked ? "bg-white/5 text-white/20 border-white/10 cursor-not-allowed" :
                                                            isSelected ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(245,200,66,0.1)]" :
                                                                "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white/60 hover:border-white/10"

                                                const labelText = isOccupied ? 'OCUPADO' :
                                                    isBlocked ? 'NO DISPONIBLE' :
                                                        isPast ? 'PASADO' : 'LIBRE'

                                                return (
                                                    <button
                                                        key={slot.value}
                                                        type="button"
                                                        disabled={isOccupied || isBlocked}
                                                        onClick={() => setHoraInicio(slot.value)}
                                                        className={`px-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border flex flex-col items-center justify-center min-w-[55px] active:scale-95 ${btnClass}`}
                                                        style={{ height: '38px' }}
                                                    >
                                                        <span className="leading-none text-[10px]">{slot.label.split(' ')[0]}</span>
                                                        <span className="text-[6px] opacity-60 leading-none mt-1 truncate max-w-full px-0.5">{labelText}</span>
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-full py-4 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                                                <span className="material-icons-round text-white/20 text-xl">event_busy</span>
                                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Cerrado o Sin Disponibilidad</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="flex-1 py-2.5 font-black text-white/50 uppercase tracking-[0.2em] text-[9px] rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2.5 flex items-center justify-center gap-2 font-black text-black uppercase tracking-[0.2em] text-[9px] rounded-lg transition-transform active:scale-95 disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg,#f5c842 0%,#d4941a 100%)', boxShadow: '0 5px 20px -5px rgba(245,200,66,0.5)' }}
                                    >
                                        {loading ? (
                                            <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span className="material-icons-round text-[12px]">event_available</span>
                                                Registrar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Modal de Confirmación Retroactiva */}
                        <AnimatePresence>
                            {showPastConfirm && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[110] flex items-center justify-center p-6"
                                >
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPastConfirm(false)} />
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="relative bg-[#1A1D23] border border-white/10 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl overflow-hidden"
                                    >
                                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <span className="material-icons-round text-amber-500 text-2xl">history</span>
                                        </div>
                                        <h3 className="text-white text-base font-black text-center mb-2 uppercase tracking-tight leading-none">Cita en el Pasado</h3>
                                        <p className="text-white/60 text-[10px] text-center mb-6 leading-relaxed">
                                            Estás agendando una cita para una hora que ya pasó. ¿Deseas registrarla de todas formas?
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowPastConfirm(false)
                                                    handleSubmit(undefined, true)
                                                }}
                                                className="w-full py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all"
                                            >
                                                Sí, Registrar Cita
                                            </button>
                                            <button
                                                onClick={() => setShowPastConfirm(false)}
                                                className="w-full py-3 bg-white/5 text-white/60 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
