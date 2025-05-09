-- SQL Optimization for BeforeAfter Component
-- تحسينات SQL لمكون "قبل وبعد"

-- 1. إنشاء فهرس للبحث السريع عن مكونات قبل/بعد
CREATE INDEX IF NOT EXISTS idx_landing_page_components_beforeafter 
ON landing_page_components (type)
WHERE type = 'beforeAfter';

-- 2. إنشاء طريقة عرض مادية للمكونات المستخدمة بشكل متكرر
-- ستسرع هذه من عمليات القراءة وتقلل الضغط على قاعدة البيانات
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_before_after_components AS
SELECT 
  lpc.id as component_id,
  lpc.landing_page_id,
  lpc.position,
  lpc.is_active,
  lpc.settings->>'title' as title,
  lpc.settings->>'description' as description,
  lpc.settings->>'layout' as layout,
  jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(lpc.settings->'items') = 'array' 
      THEN lpc.settings->'items' 
      ELSE '[]'::jsonb 
    END
  ) as items,
  lp.slug as landing_page_slug,
  lp.organization_id
FROM landing_page_components lpc
JOIN landing_pages lp ON lpc.landing_page_id = lp.id
WHERE lpc.type = 'beforeAfter'
  AND lpc.is_active = true
  AND lp.is_published = true
  AND lp.is_deleted = false;

-- 3. إنشاء فهارس على طريقة العرض المادية
CREATE INDEX IF NOT EXISTS idx_mv_before_after_components_landing_page_id 
ON mv_before_after_components (landing_page_id);

CREATE INDEX IF NOT EXISTS idx_mv_before_after_components_slug 
ON mv_before_after_components (landing_page_slug);

-- 4. إنشاء وظيفة لتحديث طريقة العرض المادية تلقائياً
CREATE OR REPLACE FUNCTION refresh_before_after_components_mv()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_before_after_components;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء محفزات لتحديث طريقة العرض المادية عند تغيير البيانات
DROP TRIGGER IF EXISTS refresh_before_after_components_trigger ON landing_page_components;
CREATE TRIGGER refresh_before_after_components_trigger
AFTER INSERT OR UPDATE OR DELETE ON landing_page_components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_before_after_components_mv();

DROP TRIGGER IF EXISTS refresh_before_after_components_landing_page_trigger ON landing_pages;
CREATE TRIGGER refresh_before_after_components_landing_page_trigger
AFTER UPDATE OF is_published, is_deleted ON landing_pages
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_before_after_components_mv();

-- 6. تحسين تخزين الصور وأداء الوصول إليها
-- إذا كانت الصور تُخزن كروابط URL في إعدادات المكون، إضافة فهرس GIN للبحث في تلك الروابط
CREATE INDEX IF NOT EXISTS idx_beforeafter_image_urls
ON landing_page_components 
USING GIN ((settings->'items') jsonb_path_ops)
WHERE type = 'beforeAfter';

-- 7. إضافة وظيفة للحصول على مكونات قبل/بعد بطريقة أكثر كفاءة
-- تقلل من كمية البيانات المرسلة وتحسن الأداء
CREATE OR REPLACE FUNCTION get_before_after_components(
  p_landing_page_id UUID
)
RETURNS TABLE (
  component_id UUID,
  title TEXT,
  description TEXT, 
  layout TEXT,
  items JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lpc.id::UUID as component_id,
    lpc.settings->>'title' as title,
    lpc.settings->>'description' as description,
    lpc.settings->>'layout' as layout,
    lpc.settings->'items' as items
  FROM landing_page_components lpc
  WHERE lpc.landing_page_id = p_landing_page_id
    AND lpc.type = 'beforeAfter'
    AND lpc.is_active = true
  ORDER BY lpc.position;
END;
$$;

-- 8. سياسات أمان الوصول للصور (إذا كانت الصور تُخزن في جداول البيانات)
-- تأكد من أن المستخدمين يمكنهم الوصول للصور العامة المستخدمة في مكونات صفحات الهبوط
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users can view published landing page assets" ON public.assets;
CREATE POLICY "Public users can view published landing page assets"
  ON public.assets
  FOR SELECT
  USING (
    asset_type = 'landing_page_image'
    AND is_public = true
  );

-- 9. تعليقات توضيحية على الوظائف والقيود
COMMENT ON MATERIALIZED VIEW mv_before_after_components IS 'عرض مادي لمكونات قبل/بعد لتحسين الأداء';
COMMENT ON FUNCTION get_before_after_components IS 'وظيفة للحصول على مكونات قبل/بعد بطريقة أكثر كفاءة';
COMMENT ON INDEX idx_landing_page_components_beforeafter IS 'فهرس للبحث السريع عن مكونات قبل/بعد';
COMMENT ON INDEX idx_beforeafter_image_urls IS 'فهرس للبحث في روابط الصور داخل إعدادات مكونات قبل/بعد'; 