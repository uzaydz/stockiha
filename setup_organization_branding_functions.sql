-- Funciones RPC para facilitar operaciones con la configuración de la plataforma de juegos

-- 1. Función para obtener toda la configuración de una organización
CREATE OR REPLACE FUNCTION get_organization_branding(org_id UUID)
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  org_data json;
  settings_data json;
  result json;
BEGIN
  -- Verificar si el usuario tiene permiso para ver esta organización
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ver esta organización';
  END IF;
  
  -- Obtener datos de la organización
  SELECT 
    json_build_object(
      'id', o.id,
      'name', o.name,
      'description', o.description,
      'logo_url', o.logo_url,
      'domain', o.domain,
      'subdomain', o.subdomain
    ) INTO org_data
  FROM 
    public.organizations o
  WHERE 
    o.id = org_id;
    
  -- Obtener configuraciones
  SELECT 
    json_build_object(
      'id', os.id,
      'theme_primary_color', os.theme_primary_color,
      'theme_mode', os.theme_mode,
      'site_name', os.site_name,
      'custom_css', os.custom_css,
      'logo_url', os.logo_url,
      'favicon_url', os.favicon_url,
      'default_language', os.default_language,
      'custom_js', os.custom_js,
      'custom_header', os.custom_header,
      'custom_footer', os.custom_footer,
      'enable_registration', os.enable_registration,
      'enable_public_site', os.enable_public_site,
      'updated_at', os.updated_at
    ) INTO settings_data
  FROM 
    public.organization_settings os
  WHERE 
    os.organization_id = org_id;
    
  -- Combinar los datos
  SELECT json_build_object(
    'organization', org_data,
    'settings', settings_data
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 2. Función para actualizar la configuración de una organización 
CREATE OR REPLACE FUNCTION update_organization_branding(
  org_id UUID,
  site_name TEXT DEFAULT NULL,
  theme_primary_color TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  custom_css TEXT DEFAULT NULL,
  custom_js TEXT DEFAULT NULL,
  custom_header TEXT DEFAULT NULL,
  custom_footer TEXT DEFAULT NULL,
  enable_registration BOOLEAN DEFAULT NULL,
  enable_public_site BOOLEAN DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Verificar si el usuario tiene permiso para actualizar esta organización
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND organization_id = org_id
    AND is_org_admin = true
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para actualizar esta organización';
  END IF;
  
  -- Actualizar los campos que no son nulos
  UPDATE public.organization_settings
  SET
    site_name = COALESCE(update_organization_branding.site_name, organization_settings.site_name),
    theme_primary_color = COALESCE(update_organization_branding.theme_primary_color, organization_settings.theme_primary_color),
    logo_url = COALESCE(update_organization_branding.logo_url, organization_settings.logo_url),
    favicon_url = COALESCE(update_organization_branding.favicon_url, organization_settings.favicon_url),
    custom_css = COALESCE(update_organization_branding.custom_css, organization_settings.custom_css),
    custom_js = COALESCE(update_organization_branding.custom_js, organization_settings.custom_js),
    custom_header = COALESCE(update_organization_branding.custom_header, organization_settings.custom_header),
    custom_footer = COALESCE(update_organization_branding.custom_footer, organization_settings.custom_footer),
    enable_registration = COALESCE(update_organization_branding.enable_registration, organization_settings.enable_registration),
    enable_public_site = COALESCE(update_organization_branding.enable_public_site, organization_settings.enable_public_site),
    updated_at = NOW()
  WHERE
    organization_id = org_id;
    
  -- Si la organización no tenía configuración, crearla
  IF NOT FOUND THEN
    INSERT INTO public.organization_settings (
      organization_id, site_name, theme_primary_color, logo_url, favicon_url, 
      custom_css, custom_js, custom_header, custom_footer,
      enable_registration, enable_public_site, created_at, updated_at
    ) VALUES (
      org_id, 
      update_organization_branding.site_name,
      update_organization_branding.theme_primary_color,
      update_organization_branding.logo_url,
      update_organization_branding.favicon_url,
      update_organization_branding.custom_css,
      update_organization_branding.custom_js,
      update_organization_branding.custom_header,
      update_organization_branding.custom_footer,
      COALESCE(update_organization_branding.enable_registration, true),
      COALESCE(update_organization_branding.enable_public_site, true),
      NOW(), NOW()
    );
  END IF;
  
  -- Si se actualiza el siteName, actualizar también el nombre en la tabla de organizaciones
  IF update_organization_branding.site_name IS NOT NULL THEN
    UPDATE public.organizations
    SET
      name = update_organization_branding.site_name,
      updated_at = NOW()
    WHERE
      id = org_id;
  END IF;
  
  -- Devolver la configuración actualizada
  SELECT json_build_object(
    'success', true,
    'message', 'Configuración actualizada correctamente',
    'data', (SELECT get_organization_branding(org_id))
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 3. Función para generar una URL firmada para subir imágenes
CREATE OR REPLACE FUNCTION generate_upload_url(
  org_id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size INT
)
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  path_prefix TEXT;
  file_ext TEXT;
  unique_filename TEXT;
  result json;
BEGIN
  -- Verificar si el usuario tiene permiso para esta organización
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND organization_id = org_id
    AND is_org_admin = true
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para subir archivos a esta organización';
  END IF;
  
  -- Extraer extensión
  file_ext := substring(file_name FROM '\.([^\.]+)$');
  IF file_ext IS NULL THEN
    file_ext := '';
  ELSE
    file_ext := '.' || file_ext;
  END IF;
  
  -- Determinar el prefijo del camino según el tipo de archivo
  IF file_type LIKE 'image/%' THEN
    IF file_name LIKE '%favicon%' OR file_size < 100000 THEN
      path_prefix := 'favicons';
    ELSE
      path_prefix := 'logos';
    END IF;
  ELSE
    path_prefix := 'other';
  END IF;
  
  -- Crear un nombre de archivo único
  unique_filename := path_prefix || '/' || org_id::text || '/' || floor(extract(epoch from now()))::text || '_' || md5(random()::text) || file_ext;
  
  -- En este punto normalmente generaríamos una URL firmada,
  -- pero como estamos usando Supabase esto se hace desde el cliente
  -- usando el SDK o las APIs de Supabase Storage.
  
  -- Devolver la información necesaria para que el cliente suba el archivo
  SELECT json_build_object(
    'success', true,
    'path', unique_filename,
    'bucket', 'organization-assets',
    'content_type', file_type
  ) INTO result;
  
  RETURN result;
END;
$$; 