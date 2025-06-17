-- =================================================================
-- 🚀 إصلاح فوري لمشاكل أداء قاعدة البيانات - محسن
-- =================================================================

-- 1. إزالة الفهارس المكررة من store_settings
DROP INDEX IF EXISTS idx_store_settings_org_id;
DROP INDEX IF EXISTS idx_store_settings_organization_id;

-- الاحتفاظ بالفهارس المحسنة فقط:
-- idx_store_settings_org_component (مركب محسن)
-- idx_store_settings_active_ordered (مشروط للمكونات النشطة)
-- store_settings_org_component_unique (فريد)

-- 2. إنشاء فهرس محسن للاستعلامات الثقيلة
CREATE INDEX IF NOT EXISTS idx_store_settings_optimized 
ON store_settings (organization_id, is_active, order_index, component_type) 
WHERE is_active = true;

-- 3. فهرس محسن لجدول organization_settings
CREATE INDEX IF NOT EXISTS idx_org_settings_optimized 
ON organization_settings (organization_id) 
INCLUDE (site_name, theme_primary_color, theme_secondary_color, theme_mode);

-- 4. إضافة عمود hash للبيانات الكبيرة (تحسين متقدم)
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS settings_hash VARCHAR(32);

-- فهرس على الـ hash للمقارنة السريعة
CREATE INDEX IF NOT EXISTS idx_store_settings_hash 
ON store_settings (settings_hash) WHERE settings_hash IS NOT NULL;

-- =================================================================
-- 🎯 دوال محسنة للأداء العالي
-- =================================================================

-- دالة محسنة لجلب إعدادات المتجر (بدون البيانات الثقيلة)
CREATE OR REPLACE FUNCTION get_store_settings_lightweight(
  p_organization_id UUID,
  p_public_access BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  settings_summary JSONB, -- ملخص خفيف للإعدادات
  is_active BOOLEAN,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    -- استخراج البيانات الأساسية فقط
    CASE 
      WHEN octet_length(ss.settings::text) > 50000 THEN
        jsonb_build_object(
          'title', COALESCE(ss.settings->>'title', ''),
          'type', ss.component_type,
          'hasLargeData', true,
          'dataSize', octet_length(ss.settings::text)
        )
      ELSE ss.settings
    END as settings_summary,
    ss.is_active,
    ss.order_index
  FROM store_settings ss
  WHERE ss.organization_id = p_organization_id
    AND (p_public_access = false OR ss.is_active = true)
  ORDER BY ss.order_index ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- دالة لجلب إعدادات مكون واحد فقط
CREATE OR REPLACE FUNCTION get_single_component_settings(
  p_organization_id UUID,
  p_component_id UUID
)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  settings JSONB,
  is_active BOOLEAN,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    ss.settings,
    ss.is_active,
    ss.order_index
  FROM store_settings ss
  WHERE ss.organization_id = p_organization_id
    AND ss.id = p_component_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- دالة batch update محسنة بشكل متقدم (استخدام UPDATE FROM بدلاً من LOOP)
CREATE OR REPLACE FUNCTION batch_update_store_components(
  p_organization_id UUID,
  p_components JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.organization_id = p_organization_id OR u.is_super_admin = true)
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى هذه البيانات';
  END IF;

  -- تحديث المكونات بشكل جماعي محسن (بدلاً من LOOP)
  WITH component_data AS (
    SELECT 
      (c->>'id')::uuid as component_id,
      (c->>'settings')::jsonb as new_settings,
      (c->>'is_active')::boolean as new_is_active,
      (c->>'order_index')::integer as new_order_index,
      md5((c->>'settings')::text) as new_settings_hash
    FROM jsonb_array_elements(p_components) c
  )
  UPDATE store_settings ss
  SET 
    settings = cd.new_settings,
    is_active = cd.new_is_active,
    order_index = cd.new_order_index,
    settings_hash = cd.new_settings_hash,
    updated_at = NOW()
  FROM component_data cd
  WHERE ss.organization_id = p_organization_id 
    AND ss.id = cd.component_id
    -- تحسين: تحديث فقط إذا تغيرت البيانات فعلاً
    AND (
      ss.settings_hash IS NULL OR 
      ss.settings_hash != cd.new_settings_hash OR
      ss.is_active != cd.new_is_active OR
      ss.order_index != cd.new_order_index
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- إرجاع تقرير مفصل
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'skipped_count', jsonb_array_length(p_components) - v_updated_count,
    'total_processed', jsonb_array_length(p_components),
    'timestamp', extract(epoch from now())
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'updated_count', 0,
      'timestamp', extract(epoch from now())
    );
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث hash البيانات الموجودة (تشغل مرة واحدة فقط)
CREATE OR REPLACE FUNCTION update_existing_settings_hash()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE store_settings 
  SET settings_hash = md5(settings::text)
  WHERE settings_hash IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- دالة محسنة لتنظيف البيانات المكررة
CREATE OR REPLACE FUNCTION cleanup_duplicate_settings()
RETURNS TABLE (
  organization_id UUID,
  component_type TEXT,
  duplicates_removed INTEGER
) AS $$
BEGIN
  -- حذف المكونات المكررة (الاحتفاظ بالأحدث فقط)
  WITH duplicates AS (
    SELECT 
      ss.organization_id,
      ss.component_type,
      ss.id,
      ROW_NUMBER() OVER (
        PARTITION BY ss.organization_id, ss.component_type 
        ORDER BY ss.updated_at DESC, ss.created_at DESC
      ) as rn
    FROM store_settings ss
  )
  DELETE FROM store_settings ss
  WHERE ss.id IN (
    SELECT d.id FROM duplicates d WHERE d.rn > 1
  );

  -- إرجاع تقرير التنظيف
  RETURN QUERY
  SELECT 
    ss.organization_id,
    ss.component_type,
    COUNT(*)::INTEGER as duplicates_removed
  FROM store_settings ss
  GROUP BY ss.organization_id, ss.component_type
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 🔧 تحسين الإحصائيات (بدون pg_stat_reset)
-- =================================================================

-- تحديث إحصائيات الجداول فقط (بدون reset)
ANALYZE store_settings;
ANALYZE organization_settings;
ANALYZE organizations;

-- تشغيل تحديث hash للبيانات الموجودة (مرة واحدة)
SELECT update_existing_settings_hash();

-- تنظيف البيانات المكررة
SELECT * FROM cleanup_duplicate_settings();

-- =================================================================
-- 📊 دوال المراقبة والتحليل
-- =================================================================

-- دالة لمراقبة أداء قاعدة البيانات
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE (
  table_name TEXT,
  total_size TEXT,
  index_size TEXT,
  avg_row_size NUMERIC,
  estimated_rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    CASE 
      WHEN n_tup > 0 THEN pg_relation_size(schemaname||'.'||tablename)::numeric / n_tup
      ELSE 0
    END as avg_row_size,
    n_tup as estimated_rows
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' 
    AND tablename IN ('store_settings', 'organization_settings', 'organizations')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 📝 التعليقات والتوثيق
-- =================================================================

COMMENT ON FUNCTION get_store_settings_lightweight IS 'دالة محسنة لجلب ملخص إعدادات المتجر بدون البيانات الثقيلة';
COMMENT ON FUNCTION get_single_component_settings IS 'دالة لجلب إعدادات مكون واحد فقط';
COMMENT ON FUNCTION batch_update_store_components IS 'دالة محسنة لتحديث مكونات متعددة في عملية واحدة باستخدام UPDATE FROM';
COMMENT ON FUNCTION update_existing_settings_hash IS 'دالة لتحديث hash البيانات الموجودة (تشغل مرة واحدة)';
COMMENT ON FUNCTION cleanup_duplicate_settings IS 'دالة لتنظيف البيانات المكررة';
COMMENT ON FUNCTION get_performance_stats IS 'دالة لمراقبة أداء قاعدة البيانات';

-- رسالة إتمام
DO $$
BEGIN
  RAISE NOTICE '🚀 تم تطبيق تحسينات الأداء بنجاح!';
  RAISE NOTICE '📊 استخدم SELECT * FROM get_performance_stats(); لمراقبة الأداء';
  RAISE NOTICE '⚡ تم تحسين batch operations باستخدام UPDATE FROM';
  RAISE NOTICE '🔍 تم إضافة نظام hash للبيانات الكبيرة';
END $$; 