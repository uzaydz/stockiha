-- حل سريع للمشكلة في بيئة التطوير فقط
-- تنبيه: لا تستخدم هذا الملف في بيئة الإنتاج!

-- تعطيل سياسة أمان مستوى الصفوف
ALTER TABLE landing_page_submissions DISABLE ROW LEVEL SECURITY;

-- التأكد من منح الصلاحيات للجميع
GRANT ALL ON landing_page_submissions TO anon, authenticated, service_role;

-- تعطيل التحقق من landing_page_id للاختبارات فقط (إذا استمرت المشكلة)
ALTER TABLE landing_page_submissions DROP CONSTRAINT IF EXISTS fk_landing_page CASCADE;

-- إعادة فحص سياسة الأمان
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'landing_page_submissions';

-- ملاحظة: بعد نجاح الاختبار، يجب إعادة تفعيل RLS واستخدام الحل المناسب في rls-fix.sql 