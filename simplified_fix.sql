-- SQL para solucionar el problema de políticas de seguridad 403 (Forbidden)
-- Esta es una versión simplificada que solo implementa la política crítica

-- 1. Crear política para permitir INSERT en settings_audit_log
CREATE POLICY "المستخدمون يمكنهم تسجيل التغييرات" 
ON public.settings_audit_log FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

-- 2. Crear política para permitir a los administradores registrar cambios
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