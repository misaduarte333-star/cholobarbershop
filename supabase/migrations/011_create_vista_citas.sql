-- Migration: Create vista_citas_app and ensure missing columns
-- Description: Creates the view used by the tablet dashboard and API, and adds missing performance/tracking columns to citas.

-- 1. Ensure missing tracking columns in citas table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citas' AND column_name='timestamp_inicio_servicio') THEN
        ALTER TABLE citas ADD COLUMN timestamp_inicio_servicio TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citas' AND column_name='timestamp_fin_servicio') THEN
        ALTER TABLE citas ADD COLUMN timestamp_fin_servicio TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citas' AND column_name='duracion_real_minutos') THEN
        ALTER TABLE citas ADD COLUMN duracion_real_minutos INTEGER;
    END IF;
END $$;

-- 2. Create or Replace the View
CREATE OR REPLACE VIEW vista_citas_app AS
SELECT 
    c.id,
    c.sucursal_id,
    c.barbero_id,
    c.servicio_id,
    c.cliente_nombre,
    c.cliente_telefono,
    
    -- Campos de tiempo en hora local de Hermosillo (-07:00)
    -- Usamos un offset fijo de -07 para asegurar consistencia en Sonora (no DST)
    to_char(c.timestamp_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+7', 'HH24:MI') as hora_cita_local,
    to_char(c.timestamp_fin AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+7', 'HH24:MI') as hora_fin_local,
    to_char(c.timestamp_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+7', 'YYYY-MM-DD') as fecha_cita_local,
    (c.timestamp_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+7')::text as timestamp_inicio_local,
    (c.timestamp_fin AT TIME ZONE 'UTC' AT TIME ZONE 'GMT+7')::text as timestamp_fin_local,

    b.nombre as barbero_nombre,
    s.nombre as servicio_nombre,
    s.duracion_minutos as servicio_duracion,
    s.precio as servicio_precio,
    
    c.estado,
    c.origen,
    c.monto_pagado,
    c.metodo_pago,
    c.notas,
    c.notas_crm,
    c.recordatorio_24h_enviado,
    c.recordatorio_1h_enviado,
    c.timestamp_inicio_servicio,
    c.timestamp_fin_servicio,
    c.duracion_real_minutos,
    c.created_at,
    c.updated_at
FROM citas c
LEFT JOIN barberos b ON c.barbero_id = b.id
LEFT JOIN servicios s ON c.servicio_id = s.id;

-- 3. Grant access to the view
GRANT SELECT ON vista_citas_app TO anon;
GRANT SELECT ON vista_citas_app TO authenticated;
GRANT SELECT ON vista_citas_app TO service_role;
