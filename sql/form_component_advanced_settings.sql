-- إضافة دعم الإعدادات المتقدمة لمكون النموذج في صفحات الهبوط
-- هذا الملف يضيف التحديثات اللازمة لدعم خصائص مظهر النموذج المتقدمة

-- 1. لا نحتاج لتغيير هيكل قاعدة البيانات لأن settings هو من نوع JSONB
-- ويمكن تخزين الإعدادات المتقدمة مباشرة في حقل advancedSettings داخل الـ JSONB

-- 2. تحديث منظر النموذج المخزن للتضمين الإعدادات المتقدمة في الاستعلامات
-- أولاً نحذف الوظيفة الموجودة مسبقًا
DROP FUNCTION IF EXISTS get_landing_page_form_by_slug(TEXT);
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
  product_name TEXT,
  advanced_settings JSONB
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
    f.product_name,
    (lpc.settings->'advancedSettings')::JSONB as advanced_settings
  FROM mv_landing_page_forms f
  JOIN landing_page_components lpc ON f.component_id = lpc.id
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

-- 3. تحديث منظر النموذج المخزن للمؤسسة
-- أولاً نحذف الوظيفة الموجودة مسبقًا
DROP FUNCTION IF EXISTS get_org_landing_page_forms(UUID);
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
  product_name TEXT,
  advanced_settings JSONB
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
    f.product_name,
    (lpc.settings->'advancedSettings')::JSONB as advanced_settings
  FROM mv_landing_page_forms f
  JOIN landing_page_components lpc ON f.component_id = lpc.id
  WHERE f.organization_id = org_id
  ORDER BY f.landing_page_slug, f.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. تحديث المنظر المادي لتضمين الإعدادات المتقدمة
DROP MATERIALIZED VIEW IF EXISTS mv_landing_page_forms;
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

-- إنشاء فهرس فريد على component_id للسماح بتحديث المنظر بالتزامن
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_landing_page_forms_component_id 
ON mv_landing_page_forms (component_id);

-- منح أذونات التنفيذ للمستخدمين
GRANT EXECUTE ON FUNCTION get_landing_page_form_by_slug(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_org_landing_page_forms(UUID) TO authenticated; 