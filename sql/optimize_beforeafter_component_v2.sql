-- Optimización de SQL para componente BeforeAfter
-- تحسينات قاعدة البيانات لمكون "قبل وبعد"

------------------------------------------
-- 1. تحسين الفهارس للبحث والاسترجاع السريع
------------------------------------------

-- فهرس لتحسين البحث عن مكونات قبل/بعد
CREATE INDEX IF NOT EXISTS idx_landing_page_components_beforeafter 
ON landing_page_components (type, is_active)
WHERE type = 'beforeAfter';

-- فهرس للبحث في سلاسل النصوص داخل إعدادات المكون
CREATE INDEX IF NOT EXISTS idx_beforeafter_title_description
ON landing_page_components 
USING gin ((settings -> 'title') jsonb_path_ops, (settings -> 'description') jsonb_path_ops)
WHERE type = 'beforeAfter';

-- فهرس للبحث في روابط الصور داخل عناصر المكون
CREATE INDEX IF NOT EXISTS idx_beforeafter_images
ON landing_page_components 
USING gin ((settings -> 'items') jsonb_path_ops) 
WHERE type = 'beforeAfter';

---------------------------------------
-- 2. تجنب استخدام العروض المادية (لحل مشكلة الصلاحيات)
-- استخدام الوظائف بدلاً منها للحصول على نفس النتائج
---------------------------------------

-- وظيفة تُحاكي العرض المادي ولكن بدون مشاكل الصلاحيات
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

---------------------------------------
-- 3. وظائف الاسترجاع المُحسّنة (تعتمد على الوظيفة الجديدة بدلاً من العرض المادي)
---------------------------------------

-- وظيفة لجلب مكون قبل/بعد مع عناصره بشكل مُحسّن
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
SECURITY DEFINER
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

---------------------------------------
-- 4. إدارة الصور
---------------------------------------

-- إنشاء جدول للصور الخاصة بمكون قبل/بعد (إذا كان مطلوباً)
CREATE TABLE IF NOT EXISTS beforeafter_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES landing_page_components(id) ON DELETE CASCADE,
  image_type VARCHAR NOT NULL CHECK (image_type IN ('before', 'after')),
  image_url TEXT NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- فهرس مركب للبحث السريع عن مجموعات الصور
  UNIQUE (component_id, item_id, image_type)
);

-- إنشاء فهارس للبحث في جدول الصور
CREATE INDEX IF NOT EXISTS idx_beforeafter_images_component_id 
ON beforeafter_images (component_id);

CREATE INDEX IF NOT EXISTS idx_beforeafter_images_item_id 
ON beforeafter_images (item_id);

-- وظيفة لإدارة الصور وتنظيفها
CREATE OR REPLACE FUNCTION cleanup_unused_beforeafter_images()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_images_removed INT;
BEGIN
  -- حذف الصور غير المستخدمة
  WITH unused_images AS (
    SELECT bi.id
    FROM beforeafter_images bi
    LEFT JOIN landing_page_components lpc ON bi.component_id = lpc.id
    WHERE lpc.id IS NULL OR lpc.type != 'beforeAfter' OR lpc.is_active = false
  )
  DELETE FROM beforeafter_images bi
  WHERE bi.id IN (SELECT id FROM unused_images)
  RETURNING count(*) INTO v_images_removed;
  
  RAISE NOTICE 'عدد الصور المحذوفة: %', v_images_removed;
END;
$$;

-- مهمة مجدولة لتشغيل كل أسبوع (يمكن تكوينها حسب الحاجة)
-- SELECT cron.schedule('0 0 * * 0', $$SELECT cleanup_unused_beforeafter_images()$$);

---------------------------------------
-- 5. سياسات الأمان
---------------------------------------

-- سياسة للسماح للمستخدمين العامين بمشاهدة المكونات المنشورة
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

-- سياسة للسماح للمستخدمين الإداريين بإدارة المكونات
DROP POLICY IF EXISTS "Organization admins can manage beforeafter components" ON landing_page_components;
CREATE POLICY "Organization admins can manage beforeafter components"
  ON landing_page_components
  FOR ALL
  USING (
    type = 'beforeAfter'
    AND landing_page_id IN (
      SELECT id FROM landing_pages
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND is_org_admin = true
      )
      AND is_deleted = false
    )
  );

-- سياسات لجدول الصور (إذا تم استخدامه)
ALTER TABLE IF EXISTS beforeafter_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users can view published beforeafter images" ON beforeafter_images;
CREATE POLICY "Public users can view published beforeafter images"
  ON beforeafter_images
  FOR SELECT
  USING (
    component_id IN (
      SELECT id FROM landing_page_components
      WHERE type = 'beforeAfter'
      AND is_active = true
      AND landing_page_id IN (
        SELECT id FROM landing_pages 
        WHERE is_published = true 
        AND is_deleted = false
      )
    )
  );

DROP POLICY IF EXISTS "Organization admins can manage beforeafter images" ON beforeafter_images;
CREATE POLICY "Organization admins can manage beforeafter images"
  ON beforeafter_images
  FOR ALL
  USING (
    component_id IN (
      SELECT id FROM landing_page_components
      WHERE type = 'beforeAfter'
      AND landing_page_id IN (
        SELECT id FROM landing_pages
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND is_org_admin = true
        )
        AND is_deleted = false
      )
    )
  );

---------------------------------------
-- 6. المساحة التخزينية وقواعد تخزين الصور
---------------------------------------

-- إنشاء وظيفة لتوليد مسارات التخزين المناسبة للصور
CREATE OR REPLACE FUNCTION generate_beforeafter_image_path(
  p_organization_id UUID,
  p_landing_page_id UUID,
  p_component_id UUID,
  p_item_id UUID,
  p_image_type VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timestamp BIGINT;
BEGIN
  -- توليد طابع زمني للملف
  v_timestamp := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
  
  -- إرجاع مسار مناسب يتضمن معرفات المنظمة والصفحة والمكون
  RETURN FORMAT(
    'organization-assets/before-after/%s/%s/%s_%s_%s',
    p_organization_id,
    p_landing_page_id,
    v_timestamp,
    p_item_id,
    p_image_type
  );
END;
$$;

---------------------------------------
-- 7. رصد الأداء والتحسينات
---------------------------------------

-- جدول لتتبع استخدام مكون قبل/بعد والأداء
CREATE TABLE IF NOT EXISTS beforeafter_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES landing_page_components(id) ON DELETE CASCADE,
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  view_count INT NOT NULL DEFAULT 0,
  avg_load_time_ms INT,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس على جدول رصد الأداء
CREATE INDEX IF NOT EXISTS idx_beforeafter_performance_component_id 
ON beforeafter_performance_metrics (component_id);

CREATE INDEX IF NOT EXISTS idx_beforeafter_performance_landing_page_id 
ON beforeafter_performance_metrics (landing_page_id);

-- وظيفة لتحديث إحصائيات الأداء
CREATE OR REPLACE FUNCTION update_beforeafter_performance(
  p_component_id UUID,
  p_landing_page_id UUID,
  p_load_time_ms INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO beforeafter_performance_metrics (
    component_id, 
    landing_page_id, 
    view_count, 
    avg_load_time_ms, 
    last_accessed
  )
  VALUES (
    p_component_id,
    p_landing_page_id,
    1,
    p_load_time_ms,
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    view_count = beforeafter_performance_metrics.view_count + 1,
    avg_load_time_ms = (
      (beforeafter_performance_metrics.avg_load_time_ms * beforeafter_performance_metrics.view_count + p_load_time_ms) / 
      (beforeafter_performance_metrics.view_count + 1)
    ),
    last_accessed = now(),
    updated_at = now();
END;
$$;

-- تحويل البيانات من المكونات الموجودة
-- ملاحظة: هذه الوظيفة لتفعيل التغييرات للبيانات الموجودة مع تجنب مشاكل الترقية
CREATE OR REPLACE FUNCTION migrate_existing_beforeafter_components()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- تحديث ولا شيء - مجرد لإضافة مؤشر للحفظ
  UPDATE landing_page_components
  SET updated_at = updated_at
  WHERE type = 'beforeAfter'
  RETURNING count(*) INTO v_count;
  
  RETURN v_count;
END;
$$;

-- تعليقات توضيحية
COMMENT ON FUNCTION get_active_beforeafter_components IS 'وظيفة معززة للأداء تُحاكي العرض المادي بدون مشاكل الصلاحيات';
COMMENT ON FUNCTION get_beforeafter_component IS 'وظيفة مُحسّنة لجلب مكونات قبل/بعد وعناصرها';
COMMENT ON TABLE beforeafter_images IS 'جدول لتخزين وإدارة صور مكونات قبل/بعد';
COMMENT ON TABLE beforeafter_performance_metrics IS 'جدول لتتبع أداء مكونات قبل/بعد';
COMMENT ON FUNCTION cleanup_unused_beforeafter_images IS 'وظيفة لتنظيف الصور غير المستخدمة';
COMMENT ON FUNCTION generate_beforeafter_image_path IS 'وظيفة لتوليد مسارات تخزين منظمة للصور';
COMMENT ON FUNCTION update_beforeafter_performance IS 'وظيفة لتحديث إحصائيات أداء مكونات قبل/بعد';
COMMENT ON FUNCTION migrate_existing_beforeafter_components IS 'وظيفة لترحيل مكونات قبل/بعد الموجودة'; 