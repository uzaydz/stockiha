-- Script SQL para corregir el error 'record "new" has no field "organization_id"'
-- Este error ocurre en la función log_settings_change cuando se activa desde user_settings

-- 1. Eliminar los triggers existentes para poder modificar la función
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

-- 2. Crear una versión corregida de la función log_settings_change
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
BEGIN
    -- Código mejorado para manejar diferentes tablas
    IF TG_TABLE_NAME = 'organization_settings' THEN
        -- Para organization_settings, usar el campo organization_id directamente
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'user_settings' THEN
        -- Para user_settings, intentar obtener el organization_id del usuario
        BEGIN
            SELECT u.organization_id INTO user_org_id 
            FROM users u 
            WHERE u.id = NEW.user_id;
            
            IF FOUND THEN
                org_id := user_org_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Si hay un error, mantener org_id como NULL
            org_id := NULL;
        END;
    END IF;

    -- Insertar el registro de auditoría
    INSERT INTO public.settings_audit_log (
        user_id, 
        organization_id, 
        setting_type, 
        setting_key, 
        old_value, 
        new_value, 
        created_at
    )
    VALUES (
        COALESCE(NEW.user_id, auth.uid()),  -- Usar NEW.user_id si está disponible, de lo contrario auth.uid()
        org_id,
        CASE 
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            ELSE 'organization'
        END,
        TG_ARGV[0],
        CASE WHEN TG_OP = 'UPDATE' THEN 
            (SELECT row_to_json(OLD)::text) 
            ELSE NULL 
        END,
        (SELECT row_to_json(NEW)::text),
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Si hay cualquier error, registrar pero no interrumpir la operación principal
    RAISE WARNING 'Error en log_settings_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Volver a crear los triggers con la función mejorada
CREATE TRIGGER user_settings_audit_trigger
AFTER INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('user_settings');

CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings');

-- 4. Asegurarse de que existan las políticas de seguridad necesarias
-- Primero eliminar cualquier política existente para evitar errores
DROP POLICY IF EXISTS "المستخدمون يمكنهم تسجيل التغييرات" ON public.settings_audit_log;
DROP POLICY IF EXISTS "مسؤولو المؤسسة يمكنهم تسجيل التغييرات للمؤسسة" ON public.settings_audit_log;

-- Crear las políticas
CREATE POLICY "المستخدمون يمكنهم تسجيل التغييرات" 
ON public.settings_audit_log FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "مسؤولو المؤسسة يمكنهم تسجيل التغييرات للمؤسسة" 
ON public.settings_audit_log FOR INSERT 
TO authenticated
WITH CHECK (
    (organization_id IS NOT NULL) AND 
    EXISTS (
        SELECT 1 FROM users
        WHERE users.organization_id = settings_audit_log.organization_id
        AND users.id = auth.uid()
        AND users.is_org_admin = true
    )
);

-- 5. Asegurar los permisos correctos
GRANT SELECT, INSERT ON public.settings_audit_log TO authenticated; 