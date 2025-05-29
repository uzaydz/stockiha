-- ==============================================================
-- حل طارئ: تعطيل RLS مؤقتاً لاختبار إنشاء المنتجات
-- ==============================================================

-- تعطيل RLS مؤقتاً لجدول المنتجات
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- رسالة تأكيد
SELECT 
    '⚠️ تم تعطيل Row Level Security مؤقتاً' as status,
    'جرب إنشاء منتج الآن للتأكد من أن المشكلة في RLS' as instruction,
    'إذا نجح الإنشاء، فالمشكلة في السياسات' as diagnosis,
    NOW() as timestamp;

-- لإعادة تفعيل RLS لاحقاً:
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY; 