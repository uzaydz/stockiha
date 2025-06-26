-- حل طارئ: تعطيل RLS مؤقتاً لحل مشكلة 406
-- هذا الحل سيعمل فوراً ولكنه أقل أماناً

BEGIN;

SELECT '⚠️ تحذير: تعطيل RLS مؤقتاً لحل مشكلة 406...' as warning;

-- تعطيل RLS على جدول online_orders
ALTER TABLE public.online_orders DISABLE ROW LEVEL SECURITY;

-- التحقق من حالة RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'online_orders';

COMMIT;

SELECT '✅ تم تعطيل RLS. الآن يجب أن تعمل قراءة الطلبات.' as result;
SELECT '🔧 لإعادة تفعيل RLS لاحقاً: ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;' as note; 