-- SQL para solucionar el problema de políticas de seguridad 403 (Forbidden)
-- Versión simplificada 2.0 - Con eliminación previa de políticas existentes

-- Primero eliminar cualquier política existente para evitar errores de duplicación
DROP POLICY IF EXISTS "المستخدمون يمكنهم تسجيل التغييرات" ON public.settings_audit_log;
DROP POLICY IF EXISTS "مسؤولو المؤسسة يمكنهم تسجيل التغييرات للمؤسسة" ON public.settings_audit_log;

-- 1. Crear política para permitir INSERT en settings_audit_log (a todos los usuarios para sus propios registros)
CREATE POLICY "المستخدمون يمكنهم تسجيل التغييرات" 
ON public.settings_audit_log FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

-- 2. Crear política para permitir a los administradores registrar cambios de su organización
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

-- 3. Asegurar que los permisos son correctos para la tabla
GRANT SELECT, INSERT ON public.settings_audit_log TO authenticated;

-- Mostrar las políticas existentes para verificar
SELECT * FROM pg_policies WHERE tablename = 'settings_audit_log'; 