-- SQL para solucionar el problema de políticas de seguridad 403 (Forbidden)
-- Este archivo SQL resuelve el problema de violación de política de seguridad en la tabla settings_audit_log
-- Error: new row violates row-level security policy for table "settings_audit_log"

-- INSTRUCCIONES DE APLICACIÓN:
-- 1. Ejecutar este SQL como un usuario admin en la base de datos Supabase
-- 2. Se puede ejecutar a través de la interfaz de SQL de Supabase o utilizando psql
-- 3. Después de aplicar, reiniciar la aplicación para verificar que el problema se haya resuelto

-- PARTE 1: Correcciones para settings_audit_log
-- 1. Crear política para permitir INSERT en settings_audit_log
CREATE POLICY "المستخدمون يمكنهم تسجيل التغييرات" 
ON public.settings_audit_log FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

-- 2. Asegurarse de que la tabla settings_audit_log tiene generación automática de UUID
ALTER TABLE public.settings_audit_log 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Configurar correctamente los permisos de la tabla
GRANT SELECT, INSERT ON public.settings_audit_log TO authenticated;

-- 4. Verificar si existe la secuencia y otorgar permisos si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'settings_audit_log_id_seq') THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE settings_audit_log_id_seq TO authenticated';
    END IF;
END
$$;

-- PARTE 2: Política para permitir a los administradores de organización modificar settings_audit_log
-- Esta política permite a los administradores registrar cambios de configuración de la organización
CREATE POLICY "مسؤولو المؤسسة يمكنهم تسجيل التغييرات للمؤسسة" 
ON public.settings_audit_log FOR INSERT 
TO public
WITH CHECK (
    (organization_id IS NOT NULL) AND 
    EXISTS (
        SELECT 1 FROM users
        WHERE users.organization_id = settings_audit_log.organization_id
        AND users.id = auth.uid()
        AND users.is_org_admin = true
    )
);

-- PARTE 3: En caso necesario, verificar y actualizar los índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_user_id 
ON public.settings_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_settings_audit_log_organization_id 
ON public.settings_audit_log(organization_id);

-- PARTE 4: Función opcional para registrar cambios automáticamente
-- Primero eliminamos los triggers existentes que dependen de la función
DROP TRIGGER IF EXISTS log_user_settings_changes ON user_settings;
DROP TRIGGER IF EXISTS log_organization_settings_changes ON organization_settings;
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

-- Ahora podemos eliminar la función con seguridad
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_settings_change') THEN
    DROP FUNCTION IF EXISTS public.log_settings_change();
  END IF;
END
$$;

-- Ahora creamos la función
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
BEGIN
    -- Primero determinamos el organization_id según la tabla
    IF TG_TABLE_NAME = 'organization_settings' THEN
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'user_settings' THEN
        -- Intentar obtener el organization_id del usuario
        SELECT organization_id INTO user_org_id 
        FROM users 
        WHERE id = auth.uid();
        
        -- Si el usuario tiene una organización, usarla para el registro
        IF user_org_id IS NOT NULL THEN
            org_id := user_org_id;
        END IF;
    END IF;

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
        auth.uid(),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 5: Verificar que la solución funcione
-- Si después de aplicar este SQL sigue teniendo problemas, considere:
-- 1. Comprobar que su JWT de autenticación es válido
-- 2. Verificar que el usuario tiene los permisos correctos
-- 3. Asegurarse de que auth.uid() devuelve el valor correcto
-- 4. Verificar los logs de la base de datos para identificar otros problemas

-- PARTE 5: Creación de triggers para las tablas de configuración
-- Eliminar triggers existentes para evitar duplicados
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

-- Crear trigger para user_settings
CREATE TRIGGER user_settings_audit_trigger
AFTER INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('user_settings');

-- Crear trigger para organization_settings
CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings'); 