-- Configuración para la plataforma de juegos
-- Este script configura las tablas, buckets de almacenamiento y políticas de seguridad necesarias

-- 1. Modificar la tabla organization_settings para hacer los campos obligatorios opcionales
ALTER TABLE public.organization_settings 
  ALTER COLUMN theme_primary_color DROP NOT NULL,
  ALTER COLUMN theme_secondary_color DROP NOT NULL,
  ALTER COLUMN default_language DROP NOT NULL;

-- Asegurarse de que la tabla tiene los valores por defecto correctos
ALTER TABLE public.organization_settings 
  ALTER COLUMN theme_primary_color SET DEFAULT '#0099ff',
  ALTER COLUMN theme_mode SET DEFAULT 'light',
  ALTER COLUMN enable_registration SET DEFAULT true,
  ALTER COLUMN enable_public_site SET DEFAULT true;

-- 2. Crear bucket de almacenamiento para activos de la organización
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('organization-assets', 'organization-assets', true, 10485760, '{"image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/x-icon"}')
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar políticas de seguridad para el bucket de almacenamiento
CREATE POLICY "Acceso público a activos de organizaciones" ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');

CREATE POLICY "Los administradores pueden cargar activos" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
        AND (storage.foldername(name))[1] = users.organization_id::text
      )
    )
  );

CREATE POLICY "Los administradores pueden actualizar activos" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
        AND (storage.foldername(name))[1] = users.organization_id::text
      )
    )
  );

CREATE POLICY "Los administradores pueden eliminar activos" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
        AND (storage.foldername(name))[1] = users.organization_id::text
      )
    )
  );

-- 4. Función para crear configuraciones por defecto para una organización
CREATE OR REPLACE FUNCTION public.create_default_organization_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_settings (
    organization_id, theme_primary_color, theme_secondary_color, theme_mode, site_name, default_language,
    enable_registration, enable_public_site, created_at, updated_at
  ) VALUES (
    NEW.id, '#0099ff', '#6366f1', 'light', NEW.name, 'ar',
    true, true, NOW(), NOW()
  )
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear trigger para crear automáticamente configuraciones al crear una organización
DROP TRIGGER IF EXISTS create_organization_settings ON public.organizations;
CREATE TRIGGER create_organization_settings
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_default_organization_settings();

-- 6. Actualizar configuraciones existentes para organizaciones sin configuración
INSERT INTO public.organization_settings (
  organization_id, theme_primary_color, theme_secondary_color, theme_mode, site_name, default_language,
  enable_registration, enable_public_site, created_at, updated_at
)
SELECT 
  id, '#0099ff', '#6366f1', 'light', name, 'ar',
  true, true, NOW(), NOW()
FROM 
  public.organizations o
WHERE 
  NOT EXISTS (
    SELECT 1 FROM public.organization_settings os 
    WHERE os.organization_id = o.id
  );

-- 7. Crear una función para actualizar updated_at en organization_settings al modificarla
CREATE OR REPLACE FUNCTION update_organization_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_organization_settings_timestamp ON public.organization_settings;
CREATE TRIGGER update_organization_settings_timestamp
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION update_organization_settings_timestamp();

-- 9. Función para aplicar configuraciones de la organización al usuario cuando inicia sesión
-- (actualiza favicon y otras configuraciones al inicio de sesión)
CREATE OR REPLACE FUNCTION public.apply_organization_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Se podrían implementar acciones adicionales aquí si fuera necesario
  -- Por ahora, no necesitamos hacer nada específico en SQL
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Limpiar datos obsoletos de theme_secondary_color ya que no se usa más
UPDATE public.organization_settings 
SET theme_secondary_color = NULL; 