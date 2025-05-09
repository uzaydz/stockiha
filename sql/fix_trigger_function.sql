-- إصلاح مشكلة دالة التريجر التي تحاول تحديث العرض المادي
-- Fix the trigger function that tries to refresh a materialized view

-- المشكلة: "mv_active_beforeafter_components" is not a materialized view
-- لم يعد "mv_active_beforeafter_components" عرضاً مادياً (materialized view) وأصبح عرضاً عادياً (view)
-- وظيفة التريجر تحاول استخدام REFRESH MATERIALIZED VIEW على عرض عادي، مما يؤدي للخطأ

-- 1. عرض محتوى الوظيفة الحالية
SELECT prosrc FROM pg_proc 
WHERE proname = 'refresh_beforeafter_components_mv';

-- 2. تعديل الوظيفة لإزالة أمر REFRESH MATERIALIZED VIEW
CREATE OR REPLACE FUNCTION refresh_beforeafter_components_mv()
RETURNS TRIGGER AS $$
BEGIN
  -- العروض العادية تُحدث تلقائياً، فلا حاجة لتحديثها يدوياً
  -- Regular views are updated automatically, no need to manually refresh
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. التأكد من أن التريجر يستخدم الوظيفة المحدثة
-- الإبقاء على التريجر لتجنب أي أخطاء لو تمت الإشارة إليه في مكان آخر

-- 4. تأكيد إتمام العملية
DO $$ 
BEGIN
  RAISE NOTICE 'تم إصلاح وظيفة التريجر بنجاح!';
END $$; 