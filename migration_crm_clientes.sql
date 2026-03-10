-- Migration: CRM Deduplication & ID Prioritization
-- This script cleans up existing duplicates and updates triggers to favor explicit IDs.

-- 1. CLEANUP PREVIOUS ATTEMPTS
DROP TRIGGER IF EXISTS tr_link_cita_cliente ON public.citas;
DROP TRIGGER IF EXISTS tr_update_cliente_stats ON public.citas;

-- 2. CREATE TEMPORARY MERGE TABLE
CREATE TEMP TABLE clientes_to_merge AS
WITH normalized AS (
  SELECT 
    id, 
    LOWER(TRIM(nombre)) as norm_nombre,
    created_at
  FROM public.clientes
),
ranked AS (
  SELECT 
    id,
    norm_nombre,
    FIRST_VALUE(id) OVER (PARTITION BY norm_nombre ORDER BY created_at ASC) as target_id
  FROM normalized
)
SELECT id as source_id, target_id FROM ranked WHERE id != target_id;

-- 3. RE-LINK CITAS TO TARGET CLIENTS
UPDATE public.citas
SET cliente_id = m.target_id
FROM clientes_to_merge m
WHERE public.citas.cliente_id = m.source_id;

-- 4. DELETE DUPLICATE CLIENTS
DELETE FROM public.clientes
WHERE id IN (SELECT source_id FROM clientes_to_merge);

-- 5. RE-SYNC STATISTICS (Ensure everyone is up to date)
UPDATE public.clientes cl
SET 
    total_citas = sub.cnt,
    ultima_cita = sub.last_v,
    updated_at = now()
FROM (
    SELECT 
        cliente_id, 
        COUNT(*) as cnt, 
        MAX(timestamp_inicio) as last_v
    FROM public.citas
    WHERE estado NOT IN ('cancelada', 'no_show')
    AND cliente_id IS NOT NULL
    GROUP BY cliente_id
) sub
WHERE cl.id = sub.cliente_id;

-- 6. IMPROVED TRIGGER (PRIORITIZES EXPLICIT ID)
CREATE OR REPLACE FUNCTION public.fn_link_cita_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_id UUID;
BEGIN
    -- If we ALREADY have a valid cliente_id from the frontend/API, use it directly
    IF NEW.cliente_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- If no ID, but we have a name, search for existing
    IF NEW.cliente_nombre IS NOT NULL AND TRIM(NEW.cliente_nombre) != '' THEN
        SELECT id INTO v_id FROM public.clientes 
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(NEW.cliente_nombre))
        ORDER BY created_at ASC -- Oldest record first (the "master")
        LIMIT 1;

        -- Create if not found
        IF v_id IS NULL THEN
            INSERT INTO public.clientes (nombre, telefono)
            VALUES (TRIM(NEW.cliente_nombre), NEW.cliente_telefono)
            RETURNING id INTO v_id;
        END IF;

        NEW.cliente_id := v_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. RE-ACTIVATE TRIGGERS
CREATE TRIGGER tr_link_cita_cliente
    BEFORE INSERT OR UPDATE OF cliente_nombre, cliente_id
    ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_link_cita_cliente();

CREATE TRIGGER tr_update_cliente_stats
    AFTER INSERT OR UPDATE OF estado, timestamp_inicio, cliente_id
    ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_cliente_stats();
