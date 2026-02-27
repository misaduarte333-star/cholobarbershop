// ============================================================================
// BarberCloud AI - Type Definitions
// ============================================================================

// Schedule Types (used in JSONB columns)
export interface HorarioDia {
    apertura: string  // "09:00"
    cierre: string    // "19:00"
}

export interface HorarioLaboral {
    inicio: string  // "09:00"
    fin: string     // "18:00"
}

export interface BloqueAlmuerzo {
    inicio: string  // "14:00"
    fin: string     // "15:00"
}

export type DiasSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export type HorarioApertura = Partial<Record<DiasSemana, HorarioDia>>
export type HorarioLaboralSemana = Partial<Record<DiasSemana, HorarioLaboral>>

// Enums
export type OrigenCita = 'whatsapp' | 'walkin'
export type EstadoCita = 'confirmada' | 'en_espera' | 'en_proceso' | 'finalizada' | 'cancelada' | 'no_show'
export type TipoBloqueo = 'almuerzo' | 'vacaciones' | 'dia_festivo' | 'emergencia'
export type RolAdmin = 'admin' | 'secretaria'

// ============================================================================
// Database Row Types (Sincronizado con Esquema SQL)
// ============================================================================

export interface Sucursal {
    id: string
    nombre: string
    direccion: string
    telefono_whatsapp: string | null
    activa: boolean
    horario_apertura?: HorarioApertura | null
    created_at: string
}

export interface Barbero {
    id: string
    sucursal_id: string | null
    nombre: string
    usuario_tablet: string
    password_hash: string | null
    horario_laboral: JSON | any // JSONB: { "lunes": { "entrada": "09:00", ... } }
    bloqueo_almuerzo: BloqueAlmuerzo | null
    hora_entrada: string | null
    activo: boolean
    estacion_id: number | null
    created_at: string
}

export interface Servicio {
    id: string
    sucursal_id?: string | null
    nombre: string
    precio: number
    duracion_minutos: number
    activo: boolean
    created_at: string
}

export interface Cita {
    id: string
    sucursal_id: string
    barbero_id: string
    servicio_id: string
    cliente_nombre: string
    cliente_telefono: string | null
    timestamp_inicio: string
    timestamp_fin: string
    origen: 'manual' | 'walkin' | 'whatsapp'
    estado: 'confirmada' | 'en_espera' | 'en_proceso' | 'finalizada' | 'cancelada' | 'no_show'
    notas?: string | null
    monto_pagado?: number | null
    metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | null
    notas_crm?: string | null
    recordatorio_24h_enviado?: boolean | null
    recordatorio_1h_enviado?: boolean | null
    updated_at?: string
    created_at: string
}

export interface Bloqueo {
    id: string
    barbero_id: string
    timestamp_inicio: string
    timestamp_fin: string
    motivo: string | null
    created_at: string
}

export interface UsuarioAdmin {
    id: string
    sucursal_id: string | null
    nombre: string
    email: string
    password_hash: string | null
    rol: string // 'admin', etc.
    created_at: string
}

// ============================================================================
// Joined/Extended Types (for queries with relations)
// ============================================================================

export interface CitaConRelaciones extends Cita {
    servicio?: Servicio
    barbero?: Barbero
    sucursal?: Sucursal
}

export interface BarberoConSucursal extends Barbero {
    sucursal?: Sucursal
}

// ============================================================================
// API/Form Types
// ============================================================================

export interface CrearCitaInput {
    sucursal_id: string
    barbero_id: string
    servicio_id: string
    cliente_nombre: string
    cliente_telefono: string
    timestamp_inicio: string
    origen: OrigenCita
    notas?: string
}

export interface ValidacionResultado {
    valido: boolean
    mensaje?: string
    alternativas?: string[]  // ISO timestamps
}

// ============================================================================
// UI State Types
// ============================================================================

export interface KPIs {
    citasHoy: number
    completadas: number
    ingresos: number
    noShows: number
}

export interface FiltrosCitas {
    fecha?: string      // YYYY-MM-DD
    barbero_id?: string
    estado?: EstadoCita
}

// ============================================================================
// Supabase Database Type (for client type safety)
// ============================================================================

export interface Database {
    public: {
        Tables: {
            sucursales: {
                Row: Sucursal
                Insert: Omit<Sucursal, 'id' | 'created_at'>
                Update: Partial<Omit<Sucursal, 'id' | 'created_at'>>
                Relationships: []
            }
            barberos: {
                Row: Barbero
                Insert: Omit<Barbero, 'id' | 'created_at'>
                Update: Partial<Omit<Barbero, 'id' | 'created_at'>>
                Relationships: []
            }
            servicios: {
                Row: Servicio
                Insert: Omit<Servicio, 'id' | 'created_at'>
                Update: Partial<Omit<Servicio, 'id' | 'created_at'>>
                Relationships: []
            }
            citas: {
                Row: Cita
                Insert: Omit<Cita, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Cita, 'id' | 'created_at'>>
                Relationships: []
            }
            bloqueos: {
                Row: Bloqueo
                Insert: Omit<Bloqueo, 'id' | 'created_at'>
                Update: Partial<Omit<Bloqueo, 'id' | 'created_at'>>
                Relationships: []
            }
            usuarios_admin: {
                Row: UsuarioAdmin
                Insert: Omit<UsuarioAdmin, 'id' | 'created_at'>
                Update: Partial<Omit<UsuarioAdmin, 'id' | 'created_at'>>
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}
