-- تحسين أداء عرض مكونات قبل وبعد
-- Optimize Before-After Components View Performance

-- 1. تحسين وظيفة الاستعلام الرئيسية بإضافة خاصية التخزين المؤقت
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
SECURITY DEFINER
STABLE          -- إضافة STABLE لتمكين التخزين المؤقت للاستعلامات المتكررة
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

-- 2. إنشاء فهرس شامل لتسريع عمليات البحث على البيانات الأكثر استخدامًا
-- بدون الحاجة للوصول للبيانات الكاملة
CREATE INDEX IF NOT EXISTS idx_components_optimized_beforeafter ON landing_page_components 
USING btree (landing_page_id, type, is_active, "position")
WHERE type = 'beforeAfter' AND is_active = true;

-- 3. إنشاء وظيفة محسنة لتحميل الصور المصغرة فقط للعرض الأولي السريع
CREATE OR REPLACE FUNCTION get_beforeafter_thumbnails(
  p_landing_page_slug VARCHAR
)
RETURNS TABLE (
  component_id UUID,
  title TEXT,
  layout TEXT,
  thumbnail_before TEXT,
  thumbnail_after TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lpc.id::UUID as component_id,
    lpc.settings->>'title' as title,
    COALESCE(lpc.settings->>'layout', 'horizontal') as layout,
    -- استخراج رابط الصورة الأولى فقط من مصفوفة الصور
    (jsonb_path_query(lpc.settings, '$.items[0].beforeImage')->>0)::TEXT as thumbnail_before,
    (jsonb_path_query(lpc.settings, '$.items[0].afterImage')->>0)::TEXT as thumbnail_after
  FROM landing_page_components lpc
  JOIN landing_pages lp ON lpc.landing_page_id = lp.id
  WHERE 
    lpc.type = 'beforeAfter'
    AND lpc.is_active = true
    AND lp.is_deleted = false
    AND lp.is_published = true
    AND lp.slug = p_landing_page_slug
  ORDER BY lpc."position"
  LIMIT 1; -- جلب أول عنصر فقط للعرض السريع
END;
$$;

-- 4. تحديث العرض الرئيسي مع تحسينات الأداء
CREATE OR REPLACE VIEW mv_active_beforeafter_components AS
SELECT 
    component_id,
    landing_page_id,
    "position",
    landing_page_slug,
    organization_id,
    title,
    description,
    background_color,
    text_color,
    layout,
    show_labels,
    sliders_count,
    items,
    is_published
FROM 
    get_active_beforeafter_components();

-- 5. إضافة فهرس لتسريع البحث بالـ slug
CREATE INDEX IF NOT EXISTS idx_landing_pages_published_slug ON landing_pages 
USING btree (slug, is_published, is_deleted)
WHERE is_published = true AND is_deleted = false;

-- 6. منح صلاحيات الوصول
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO anon;
GRANT EXECUTE ON FUNCTION get_active_beforeafter_components TO service_role;

GRANT EXECUTE ON FUNCTION get_beforeafter_thumbnails TO authenticated;
GRANT EXECUTE ON FUNCTION get_beforeafter_thumbnails TO anon;
GRANT EXECUTE ON FUNCTION get_beforeafter_thumbnails TO service_role;

GRANT SELECT ON mv_active_beforeafter_components TO authenticated;
GRANT SELECT ON mv_active_beforeafter_components TO anon;
GRANT SELECT ON mv_active_beforeafter_components TO service_role;

-- 7. تأكيد إتمام العملية
DO $$ 
BEGIN
  RAISE NOTICE 'تم تحسين أداء عرض مكونات قبل وبعد بنجاح!';
END $$; 