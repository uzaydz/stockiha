-- SQL Optimization for Landing Page Form Component
-- This file contains optimizations to the landing_page_components table structure for form components

-- 1. Create an index on form_id and product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_landing_page_components_form_product 
ON landing_page_components (
  ((settings->>'formId')::uuid),
  ((settings->>'productId')::uuid)
);

-- 2. Create an index for searching by component type
CREATE INDEX IF NOT EXISTS idx_landing_page_components_type 
ON landing_page_components (type);

-- 3. Create a materialized view for form components with frequently accessed data
-- This will speed up read operations by storing form settings in a denormalized structure
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_landing_page_forms AS
SELECT 
  lpc.id as component_id,
  lpc.landing_page_id,
  lpc.position,
  lpc.is_active,
  (lpc.settings->>'formId')::uuid as form_id,
  (lpc.settings->>'productId')::uuid as product_id,
  lpc.settings->>'title' as form_title,
  lpc.settings->>'buttonText' as button_text,
  lpc.settings->>'backgroundColor' as background_color,
  lp.slug as landing_page_slug,
  lp.organization_id,
  fs.name as form_name,
  fs.fields as form_fields,
  p.name as product_name
FROM landing_page_components lpc
JOIN landing_pages lp ON lpc.landing_page_id = lp.id
LEFT JOIN form_settings fs ON (lpc.settings->>'formId')::uuid = fs.id
LEFT JOIN products p ON (lpc.settings->>'productId')::uuid = p.id
WHERE lpc.type = 'form'
  AND lpc.is_active = true
  AND lp.is_published = true
  AND lp.is_deleted = false;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_landing_page_forms_landing_page_id 
ON mv_landing_page_forms (landing_page_id);

CREATE INDEX IF NOT EXISTS idx_mv_landing_page_forms_form_id 
ON mv_landing_page_forms (form_id);

CREATE INDEX IF NOT EXISTS idx_mv_landing_page_forms_slug 
ON mv_landing_page_forms (landing_page_slug);

-- Create a unique index on component_id to allow concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_landing_page_forms_component_id 
ON mv_landing_page_forms (component_id);

-- 4. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_landing_page_forms_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_landing_page_forms;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers to refresh the materialized view when data changes
DROP TRIGGER IF EXISTS trig_refresh_landing_page_forms ON landing_page_components;
CREATE TRIGGER trig_refresh_landing_page_forms
AFTER INSERT OR UPDATE OR DELETE
ON landing_page_components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_landing_page_forms_view();

DROP TRIGGER IF EXISTS trig_refresh_landing_page_forms_from_pages ON landing_pages;
CREATE TRIGGER trig_refresh_landing_page_forms_from_pages
AFTER UPDATE OF is_published, is_deleted
ON landing_pages
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_landing_page_forms_view();

-- 7. بدلاً من إنشاء عرض عادي مع RLS، سنستخدم وظائف SECURITY DEFINER لتأمين الوصول
-- Create a secure function to access form data by slug (for public access)
CREATE OR REPLACE FUNCTION get_landing_page_form_by_slug(slug_param TEXT)
RETURNS TABLE (
  component_id UUID,
  landing_page_id UUID,
  form_id UUID,
  product_id UUID,
  form_title TEXT,
  button_text TEXT,
  background_color TEXT,
  organization_id UUID,
  form_name TEXT,
  form_fields JSONB,
  product_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.component_id,
    f.landing_page_id,
    f.form_id,
    f.product_id,
    f.form_title,
    f.button_text,
    f.background_color,
    f.organization_id,
    f.form_name,
    f.form_fields,
    f.product_name
  FROM mv_landing_page_forms f
  WHERE f.landing_page_slug = slug_param
  AND (
    -- السماح للمستخدمين المسجلين برؤية نماذج المؤسسة الخاصة بهم
    (auth.uid() IS NOT NULL AND f.organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ))
    OR
    -- السماح للمستخدمين العامين برؤية نماذج صفحات الهبوط المنشورة
    (f.landing_page_slug IN (
      SELECT slug FROM landing_pages 
      WHERE is_published = true 
      AND is_deleted = false
    ))
  )
  ORDER BY f.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح أذونات التنفيذ للمستخدمين العامين والمصدقين
GRANT EXECUTE ON FUNCTION get_landing_page_form_by_slug(TEXT) TO anon, authenticated;

-- Create a secure function to access form data by organization (for authenticated users)
CREATE OR REPLACE FUNCTION get_org_landing_page_forms(org_id UUID)
RETURNS TABLE (
  component_id UUID,
  landing_page_id UUID,
  landing_page_slug TEXT,
  form_id UUID,
  product_id UUID,
  form_title TEXT,
  button_text TEXT,
  background_color TEXT,
  organization_id UUID,
  form_name TEXT,
  form_fields JSONB,
  product_name TEXT
) AS $$
BEGIN
  -- Check if user belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT 
    f.component_id,
    f.landing_page_id,
    f.landing_page_slug,
    f.form_id,
    f.product_id,
    f.form_title,
    f.button_text,
    f.background_color,
    f.organization_id,
    f.form_name,
    f.form_fields,
    f.product_name
  FROM mv_landing_page_forms f
  WHERE f.organization_id = org_id
  ORDER BY f.landing_page_slug, f.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح أذونات التنفيذ للمستخدمين المصدقين فقط
GRANT EXECUTE ON FUNCTION get_org_landing_page_forms(UUID) TO authenticated;

-- 11. Create a secure function to update landing pages
CREATE OR REPLACE FUNCTION update_landing_page(
  page_id UUID,
  page_name TEXT DEFAULT NULL,
  page_title TEXT DEFAULT NULL,
  page_description TEXT DEFAULT NULL,
  page_keywords TEXT DEFAULT NULL,
  page_is_published BOOLEAN DEFAULT NULL,
  page_settings JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_record landing_pages;
  update_values JSONB = '{}'::JSONB;
BEGIN
  -- Check if user has permission to update this landing page
  SELECT * INTO current_record 
  FROM landing_pages 
  WHERE id = page_id AND is_deleted = false;
  
  IF current_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Landing page not found');
  END IF;
  
  -- Check if user belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND organization_id = current_record.organization_id
    AND is_org_admin = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permission denied');
  END IF;
  
  -- Build update values object
  IF page_name IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('name', page_name);
  END IF;
  
  IF page_title IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('title', page_title);
  END IF;
  
  IF page_description IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('description', page_description);
  END IF;
  
  IF page_keywords IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('keywords', page_keywords);
  END IF;
  
  IF page_is_published IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('is_published', page_is_published);
  END IF;
  
  IF page_settings IS NOT NULL THEN
    update_values = update_values || jsonb_build_object('settings', page_settings);
  END IF;
  
  -- Always update the updated_at field
  update_values = update_values || jsonb_build_object('updated_at', now());
  
  -- Update the landing page
  UPDATE landing_pages 
  SET 
    name = COALESCE(page_name, name),
    title = COALESCE(page_title, title),
    description = COALESCE(page_description, description),
    keywords = COALESCE(page_keywords, keywords),
    is_published = COALESCE(page_is_published, is_published),
    settings = COALESCE(page_settings, settings),
    updated_at = now()
  WHERE id = page_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'title', title,
    'is_published', is_published,
    'updated_at', updated_at
  ) INTO result;
  
  -- Refresh the view manually here
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_landing_page_forms;
  
  RETURN jsonb_build_object('success', true, 'data', result);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_landing_page(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;

-- 12. إنشاء وظيفة آمنة لتحديث مكونات صفحة الهبوط
CREATE OR REPLACE FUNCTION update_landing_page_component(
  component_id UUID,
  new_settings JSONB DEFAULT NULL,
  is_active BOOLEAN DEFAULT NULL,
  new_position INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  landing_page_id UUID;
  organization_id UUID;
BEGIN
  -- الحصول على معرف صفحة الهبوط ومعرف المؤسسة للمكون
  SELECT 
    lpc.landing_page_id, 
    lp.organization_id INTO landing_page_id, organization_id
  FROM landing_page_components lpc
  JOIN landing_pages lp ON lpc.landing_page_id = lp.id
  WHERE lpc.id = component_id;
  
  IF landing_page_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'مكون صفحة الهبوط غير موجود');
  END IF;
  
  -- التحقق مما إذا كان المستخدم ينتمي إلى المؤسسة
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND organization_id = organization_id
    AND is_org_admin = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'تم رفض الإذن');
  END IF;
  
  -- تحديث المكون
  UPDATE landing_page_components 
  SET 
    settings = COALESCE(new_settings, settings),
    is_active = COALESCE(is_active, is_active),
    position = COALESCE(new_position, position),
    updated_at = now()
  WHERE id = component_id
  RETURNING jsonb_build_object(
    'id', id,
    'type', type,
    'is_active', is_active,
    'position', position,
    'updated_at', updated_at
  ) INTO result;
  
  -- تحديث العرض المادي يدويًا هنا
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_landing_page_forms;
  
  RETURN jsonb_build_object('success', true, 'data', result);
END;
$$;

-- منح أذونات التنفيذ للمستخدمين المصدقين
GRANT EXECUTE ON FUNCTION update_landing_page_component(UUID, JSONB, BOOLEAN, INTEGER) TO authenticated;

/*
IMPORTANTE: Este archivo SQL realiza las siguientes mejoras:

1. Optimiza consultas relacionadas con formularios en landing pages
2. Crea una vista materializada para cargar datos más rápidamente
3. Configura triggers para mantener la vista actualizada automáticamente
4. IMPORTANTE: La función refresh_landing_page_forms_view() se ejecuta con SECURITY DEFINER
   para resolver el error "must be owner of materialized view mv_landing_page_forms"
5. Implementa seguridad a través de funciones con SECURITY DEFINER en lugar de RLS en vistas,
   ya que PostgreSQL no permite aplicar RLS directamente a vistas
   
NOTA: Se eliminó el enfoque anterior que intentaba aplicar RLS a una vista, ya que PostgreSQL
no admite esta funcionalidad. En su lugar, se implementaron controles de seguridad
directamente en las funciones de acceso a datos.

Para aplicar estos cambios de manera segura, ejecute este script como un usuario con permisos 
de propietario sobre la base de datos, preferiblemente usando el rol de postgres o servicio.
*/ 