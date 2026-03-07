-- 1. Primero borramos las vistas existentes para evitar errores de columnas de PostgreSQL
DROP VIEW IF EXISTS vista_citas_agente CASCADE;
DROP VIEW IF EXISTS vista_agenda_citas CASCADE;

-- 2. Creamos la vista principal (vista_citas_agente)
CREATE VIEW vista_citas_agente AS
SELECT 
    c.id,
    c.cliente_nombre,
    c.cliente_telefono,
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_cita_local,
    to_char(c.timestamp_fin AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_fin_local,
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'YYYY-MM-DD') as fecha_cita_local,
    b.nombre as barbero_nombre,
    s.nombre as servicio_nombre,
    c.estado,
    c.barbero_id,
    c.sucursal_id,
    c.servicio_id,
    c.timestamp_inicio,
    c.timestamp_fin,
    c.origen,
    c.notas,
    c.monto_pagado,
    c.metodo_pago,
    c.notas_crm,
    c.recordatorio_24h_enviado,
    c.recordatorio_1h_enviado,
    c.created_at,
    c.updated_at,
    s.precio as servicio_precio,
    c.timestamp_inicio_servicio,
    c.timestamp_fin_servicio,
    c.duracion_real_minutos
FROM citas c
LEFT JOIN barberos b ON c.barbero_id = b.id
LEFT JOIN servicios s ON c.servicio_id = s.id;


-- 3. Creamos la vista administrativa (vista_agenda_citas)
CREATE VIEW vista_agenda_citas AS
SELECT 
    c.id,
    c.cliente_nombre,
    c.cliente_telefono,
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_cita_local,
    to_char(c.timestamp_fin AT TIME ZONE 'America/Hermosillo', 'HH12:MI AM') as hora_fin_local,
    to_char(c.timestamp_inicio AT TIME ZONE 'America/Hermosillo', 'YYYY-MM-DD') as fecha_cita_local,
    b.nombre as barbero_nombre,
    s.nombre as servicio_nombre,
    c.estado,
    c.barbero_id,
    c.sucursal_id,
    c.servicio_id,
    c.timestamp_inicio,
    c.timestamp_fin,
    c.origen,
    c.notas,
    c.monto_pagado,
    c.metodo_pago,
    c.notas_crm,
    c.recordatorio_24h_enviado,
    c.recordatorio_1h_enviado,
    c.created_at,
    c.updated_at,
    s.precio as servicio_precio,
    c.timestamp_inicio_servicio,
    c.timestamp_fin_servicio,
    c.duracion_real_minutos
FROM citas c
LEFT JOIN barberos b ON c.barbero_id = b.id
LEFT JOIN servicios s ON c.servicio_id = s.id;


-- 4. Reasignamos los permisos de Supabase por defecto a las vistas nuevas
GRANT SELECT ON vista_citas_agente TO anon, authenticated, service_role;
GRANT SELECT ON vista_agenda_citas TO anon, authenticated, service_role;

