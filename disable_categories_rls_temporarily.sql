-- تعطيل RLS مؤقتاً لجدول product_categories لاختبار المشكلة
-- تحذير: هذا للاختبار فقط ويجب إعادة تشغيل RLS لاحقاً

BEGIN;

-- تعطيل RLS مؤقتاً
ALTER TABLE public.product_categories DISABLE ROW LEVEL SECURITY;

-- إضافة رسالة تأكيد
SELECT 'تم تعطيل RLS لجدول product_categories مؤقتاً للاختبار' as message;

COMMIT;

-- للعودة لاحقاً، استخدم:
-- ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY; 