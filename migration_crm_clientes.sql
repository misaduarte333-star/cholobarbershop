-- Migration: CRM & Clients System (NAME-BASED VERSION)
-- This version prioritizes Name/Surname for matching as requested.

-- 1. CLEANUP PREVIOUS ATTEMPTS
DROP TRIGGER IF EXISTS tr_link_cita_cliente ON public.citas;
DROP TRIGGER IF EXISTS tr_update_cliente_stats ON public.citas;
DROP FUNCTION IF EXISTS public.fn_link_cita_cliente();
DROP FUNCTION IF EXISTS public.fn_update_cliente_stats();
DROP FUNCTION IF EXISTS public.fn_normalize_phone(TEXT);

-- 2. UTILITY: Normalized Phone
CREATE OR REPLACE FUNCTION public.fn_normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_phone IS NULL THEN RETURN ''; END IF;
    RETURN REGEXP_REPLACE(p_phone, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- 3. ENSURE TABLE STRUCTURE
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    notas_internas TEXT,
    ultima_cita TIMESTAMPTZ,
    total_citas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSERT UNIQUE CLIENTS FROM CITAS (BY NAME)
-- Grouping strictly by name as requested to ensure everyone is counted
INSERT INTO public.clientes (nombre, telefono, created_at)
SELECT DISTINCT ON (LOWER(TRIM(cliente_nombre)))
    TRIM(cliente_nombre), 
    MAX(cliente_telefono) OVER (PARTITION BY LOWER(TRIM(cliente_nombre))), -- Take the most recent/best phone if multiple
    MIN(created_at) OVER (PARTITION BY LOWER(TRIM(cliente_nombre)))
FROM public.citas
WHERE cliente_nombre IS NOT NULL AND TRIM(cliente_nombre) != ''
ON CONFLICT DO NOTHING;

-- 5. LINK CITAS TO CLIENTES (BY NAME)
UPDATE public.citas c
SET cliente_id = cl.id
FROM public.clientes cl
WHERE LOWER(TRIM(c.cliente_nombre)) = LOWER(TRIM(cl.nombre));

-- 6. RECALCULATE STATISTICS (BY NAME)
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
    GROUP BY cliente_id
) sub
WHERE cl.id = sub.cliente_id;

UPDATE public.clientes SET total_citas = 0 WHERE total_citas IS NULL;


-- 7. NEW TRIGGER FUNCTIONS (NAME-BASED)
CREATE OR REPLACE FUNCTION public.fn_link_cita_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NEW.cliente_nombre IS NULL OR TRIM(NEW.cliente_nombre) = '' THEN RETURN NEW; END IF;

    -- Search strictly by name
    SELECT id INTO v_id FROM public.clientes 
    WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(NEW.cliente_nombre))
    LIMIT 1;

    -- Create if not found
    IF v_id IS NULL THEN
        INSERT INTO public.clientes (nombre, telefono)
        VALUES (TRIM(NEW.cliente_nombre), NEW.cliente_telefono)
        RETURNING id INTO v_id;
    END IF;

    -- Update reference if it was null
    NEW.cliente_id := v_id;
    
    -- Sync phone number to client record if provided
    IF NEW.cliente_telefono IS NOT NULL AND NEW.cliente_telefono != '' THEN
        UPDATE public.clientes SET telefono = NEW.cliente_telefono WHERE id = v_id AND (telefono IS NULL OR telefono = '');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_update_cliente_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cliente_id IS NOT NULL THEN
        UPDATE public.clientes 
        SET 
            total_citas = (SELECT count(*) FROM public.citas WHERE cliente_id = NEW.cliente_id AND estado NOT IN ('cancelada', 'no_show')),
            ultima_cita = (SELECT MAX(timestamp_inicio) FROM public.citas WHERE cliente_id = NEW.cliente_id AND estado NOT IN ('cancelada', 'no_show')),
            updated_at = now()
        WHERE id = NEW.cliente_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGERS
CREATE TRIGGER tr_link_cita_cliente
    BEFORE INSERT OR UPDATE OF cliente_nombre
    ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_link_cita_cliente();

CREATE TRIGGER tr_update_cliente_stats
    AFTER INSERT OR UPDATE OF estado, timestamp_inicio, cliente_id
    ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_cliente_stats();
