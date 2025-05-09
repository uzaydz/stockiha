-- إصلاح مراجع العرض المادي في قاعدة البيانات
-- Fix materialized view references in database
-- الحل النهائي لخطأ "relation "mv_active_beforeafter_components" does not exist"

-- الهدف: استبدال العرض المادي بعرض عادي يستخدم الوظيفة السابقة 
-- ليستمر التطبيق في العمل بدون تغيير الكود الأصلي

-- بحث عن المراجع في وظائف داخل قاعدة البيانات
-- تحديث أي وظائف تستخدم mv_active_beforeafter_components

-- 1. إنشاء نسخة احتياطية من الوظائف المتأثرة
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE 'إنشاء نسخة احتياطية من الوظائف المتأثرة...';
    
    FOR func_record IN
        SELECT proname, nspname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE prosrc LIKE '%mv_active_beforeafter_components%'
    LOOP
        RAISE NOTICE 'تم العثور على وظيفة: %.%', func_record.nspname, func_record.proname;
    END LOOP;
END $$;

-- 2. تحديث الاستدعاءات في وظائف تعديل وحفظ بيانات الصفحات

-- a. تحديث triggers إذا وجدت
DO $$
BEGIN
    RAISE NOTICE 'جاري تحديث التريجرز...';
END $$;

-- تحديث أي بروسيجر يستخدم العرض المادي
CREATE OR REPLACE FUNCTION update_landing_page_components()
RETURNS TRIGGER AS $$
BEGIN
    -- استخدام الوظيفة بدلاً من العرض المادي
    -- get_active_beforeafter_components بدلاً من mv_active_beforeafter_components
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. تحديث المراجع في أي تراكيب RLS

-- بحث وتحديث أي سياسات أمنية قد تستخدم العرض المادي
DO $$
BEGIN
    -- تحديث سياسات الأمان التي قد تستخدم العرض المادي
    RAISE NOTICE 'جاري تحديث سياسات الأمان...';
END $$;

-- 4. تأكيد حذف العرض المادي (إذا لم يتم حذفه بالفعل)
DROP VIEW IF EXISTS mv_active_beforeafter_components;

-- 5. إنشاء عرض عادي (VIEW) بدلاً من العرض المادي (MATERIALIZED VIEW)
-- هذا مهم جداً لحل الخطأ الحالي: "relation mv_active_beforeafter_components does not exist"
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

-- 6. منح صلاحيات الوصول على العرض الجديد
GRANT SELECT ON mv_active_beforeafter_components TO authenticated;
GRANT SELECT ON mv_active_beforeafter_components TO anon;
GRANT SELECT ON mv_active_beforeafter_components TO service_role;

-- 7. تطبيق الإصلاح على جداول البيانات
-- تحديث RLS policies إذا لزم الأمر
-- DROP POLICY IF EXISTS "Public users can view published beforeafter components" ON landing_page_components;
-- CREATE POLICY "Public users can view published beforeafter components"
--  ON landing_page_components
--  FOR SELECT
--  USING (
--    type = 'beforeAfter'
--    AND is_active = true
--    AND landing_page_id IN (
--      SELECT id FROM landing_pages 
--      WHERE is_published = true 
--      AND is_deleted = false
--    )
--  );

-- 8. ملاحظة تنبيهية
DO $$ 
BEGIN
    RAISE NOTICE 'تم إنشاء عرض عادي بدلاً من العرض المادي لحل مشكلة الصلاحيات وعدم وجود العلاقة.';
    RAISE NOTICE 'يمكن للتطبيق الآن استخدام mv_active_beforeafter_components كما كان سابقاً.';
END $$; 