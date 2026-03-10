-- 1. Borramos las vistas existentes para unificar
DROP VIEW IF EXISTS vista_citas_agente CASCADE;
DROP VIEW IF EXISTS vista_agenda_citas CASCADE;

-- 2. Creamos la vista UNIFICADA (vista_general_citas)
-- Esta vista servirá tanto para la agenda como para los reportes
CREATE VIEW vista_general_citas AS
SELECT 
    c.id,
    c.cliente_nombre,
    c.cliente_telefono,
    -- Horas formateadas para display (Hermosillo)
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_cita_local,
    to_char(c.timestamp_fin AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_fin_local,
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'YYYY-MM-DD') as fecha_cita_local,
    
    -- Timestamps con zona horaria para cálculos en JS si fuera necesario
    (c.timestamp_inicio AT TIME ZONE 'America/Hermosillo') as timestamp_inicio_local,
    (c.timestamp_fin AT TIME ZONE 'America/Hermosillo') as timestamp_fin_local,
    
    b.nombre as barbero_nombre,
    s.nombre as servicio_nombre,
    s.duracion_minutos as servicio_duracion, -- DURACION REAL DEL SERVICIO (TARGET)
    s.precio as servicio_precio,
    
    c.estado,
    c.barbero_id,
    c.sucursal_id,
    c.servicio_id,
    c.timestamp_inicio, -- UTC original
    c.timestamp_fin,    -- UTC original
    c.origen,
    c.notas,
    c.monto_pagado,
    c.metodo_pago,
    c.notas_crm,
    
    -- Datos de ejecución del servicio
    c.timestamp_inicio_servicio,
    c.timestamp_fin_servicio,
    c.duracion_real_minutos,
    
    c.recordatorio_24h_enviado,
    c.recordatorio_1h_enviado,
    c.created_at,
    c.updated_at
FROM citas c
LEFT JOIN barberos b ON c.barbero_id = b.id
LEFT JOIN servicios s ON c.servicio_id = s.id;

-- 3. Permisos para la nueva vista
GRANT SELECT ON vista_general_citas TO anon, authenticated, service_role;

-- 4. (Opcional) Mantener compatibilidad temporal creando alias si es necesario, 
-- pero el objetivo es migrar todo a 'vista_general_citas'.
