-- إصلاح مشكلة صلاحيات العرض المادي (materialized view)
-- Fix permissions issue with materialized view
-- المشكلة: "must be owner of materialized view mv_active_beforeafter_components"

-- هذا الملف يحل مشكلة صلاحيات العرض المادي عن طريق:
-- 1. حذف العرض المادي الذي يسبب المشكلة
-- 2. استخدام وظائف SECURITY DEFINER بدلاً منه (تعمل بصلاحيات المالك)
-- 3. منح صلاحيات التنفيذ للمستخدمين المصادقين

-- 1. حذف العرض المادي الموجود
DROP VIEW IF EXISTS mv_active_beforeafter_components;

-- 2. التأكد من وجود الوظيفة البديلة التي تم إنشاؤها سابقاً
CREATE OR REPLACE FUNCTION get_active_beforeafter_components(
  p_landing_page_slug VARCHAR DEFAULT NULL,
  p_landing_page_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  component_id UUID,
  landing_page_id UUID,
  "position" INTEGER,
  landing_page_slug VARCHAR,
  organization_id UUID,
  title TEXT,
  description TEXT,
  background_color TEXT,
  text_color TEXT,
  layout TEXT,
  show_labels BOOLEAN,
  sliders_count INTEGER,
  items JSONB,
  is_published BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER -- مهم جداً: تنفيذ بصلاحيات المالك
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lpc.id::UUID as component_id,
    lpc.landing_page_id,
    lpc."position",
    lp.slug as landing_page_slug,
    lp.organization_id,
    lpc.settings->>'title' as title,
    lpc.settings->>'description' as description,
    lpc.settings->>'backgroundColor' as background_color,
    lpc.settings->>'textColor' as text_color,
    lpc.settings->>'layout' as layout,
    COALESCE((lpc.settings->>'showLabels')::boolean, true) as show_labels,
    COALESCE((lpc.settings->>'slidersCount')::int, 1) as sliders_count,
    lpc.settings->'items' as items,
    lp.is_published
  FROM landing_page_components lpc
  JOIN landing_pages lp ON lpc.landing_page_id = lp.id
  WHERE 
    lpc.type = 'beforeAfter'
    AND lpc.is_active = true
    AND lp.is_deleted = false
    AND (p_landing_page_slug IS NULL OR lp.slug = p_landing_page_slug)
    AND (p_landing_page_id IS NULL OR lp.id = p_landing_page_id)
    AND (p_organization_id IS NULL OR lp.organization_id = p_organization_id)
  ORDER BY lpc."position";
END;
$$;

-- 3. إعطاء صلاحيات للإجراءات - مهم جداً للوصول من التطبيق
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO anon;
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO service_role;

-- 4. التحقق من وجود وظيفة get_beforeafter_component وضمان صلاحياتها
CREATE OR REPLACE FUNCTION get_beforeafter_component(
  p_landing_page_slug VARCHAR,
  p_component_id UUID DEFAULT NULL
)
RETURNS TABLE (
  component_id UUID,
  title TEXT,
  description TEXT,
  background_color TEXT,
  text_color TEXT,
  layout TEXT,
  show_labels BOOLEAN,
  sliders_count INT,
  items JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER -- مهم جداً: تنفيذ بصلاحيات المالك
AS $$
BEGIN
  -- استخدام كلمات مفتاحية COALESCE ومعالجة القيم الفارغة
  RETURN QUERY
  SELECT 
    c.component_id,
    c.title,
    c.description,
    COALESCE(c.background_color, '#ffffff') as background_color,
    COALESCE(c.text_color, '#333333') as text_color,
    COALESCE(c.layout, 'horizontal') as layout,
    COALESCE(c.show_labels, true) as show_labels,
    COALESCE(c.sliders_count, 1) as sliders_count,
    c.items
  FROM get_active_beforeafter_components(p_landing_page_slug) c
  WHERE 
    (p_component_id IS NULL OR c.component_id = p_component_id)
    AND c.is_published = true
  ORDER BY c."position";
END;
$$;

-- 5. إعطاء صلاحيات للإجراءات
GRANT EXECUTE ON FUNCTION get_beforeafter_component TO authenticated;
GRANT EXECUTE ON FUNCTION get_beforeafter_component TO anon;
GRANT EXECUTE ON FUNCTION get_beforeafter_component TO service_role;

-- 6. تحديث أي استدعاءات للعرض المادي في جدول RLS
-- إعادة تحديث سياسات الأمان
DROP POLICY IF EXISTS "Public users can view published beforeafter components" ON landing_page_components;
CREATE POLICY "Public users can view published beforeafter components"
  ON landing_page_components
  FOR SELECT
  USING (
    type = 'beforeAfter'
    AND is_active = true
    AND landing_page_id IN (
      SELECT id FROM landing_pages 
      WHERE is_published = true 
      AND is_deleted = false
    )
  );

-- 7. إعادة فرض RLS
ALTER TABLE landing_page_components FORCE ROW LEVEL SECURITY;

-- تأكيد إتمام العملية
DO $$ 
BEGIN
  RAISE NOTICE 'تم إصلاح مشكلة العرض المادي بنجاح!';
END $$; 