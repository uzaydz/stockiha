-- إصلاح مشكلة رفع الصور: خطأ 403 "new row violates row-level security policy"
-- تاريخ الإنشاء: 2025-01-27
-- الهدف: حل مشكلة سياسات Row Level Security لرفع الصور في bucket organization-assets

-- 1. التحقق من حالة RLS على جدول storage.objects
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 2. عرض السياسات الحالية
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive, 
    roles, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 3. حذف السياسات الموجودة للتنظيف (إذا لزم الأمر)
-- DROP POLICY IF EXISTS "secure_authenticated_upload" ON storage.objects;
-- DROP POLICY IF EXISTS "secure_authenticated_update" ON storage.objects;
-- DROP POLICY IF EXISTS "secure_authenticated_delete" ON storage.objects;
-- DROP POLICY IF EXISTS "secure_public_read" ON storage.objects;

-- 4. إنشاء سياسات محسنة وأكثر مرونة

-- سياسة القراءة العامة (تبقى كما هي)
DROP POLICY IF EXISTS "public_read_storage_objects" ON storage.objects;
CREATE POLICY "public_read_storage_objects" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text]));

-- سياسة الرفع للمستخدمين المصادق عليهم - محسنة
DROP POLICY IF EXISTS "authenticated_upload_storage_objects" ON storage.objects;
CREATE POLICY "authenticated_upload_storage_objects" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text])
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
);

-- سياسة التحديث للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "authenticated_update_storage_objects" ON storage.objects;
CREATE POLICY "authenticated_update_storage_objects" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text])
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text])
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
);

-- سياسة الحذف للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "authenticated_delete_storage_objects" ON storage.objects;
CREATE POLICY "authenticated_delete_storage_objects" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = ANY (ARRAY['organization-assets'::text, 'store-assets'::text, 'user-avatars'::text, 'bazaar-public'::text])
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
);

-- 5. التأكد من إعدادات bucket organization-assets
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/avif'
  ]
WHERE id = 'organization-assets';

-- 6. إنشاء دالة مساعدة للتحقق من صحة المصادقة
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL AND auth.role() = 'authenticated';
END;
$$;

-- 7. سياسة بديلة أكثر بساطة (استخدم هذه إذا لم تعمل السياسات أعلاه)
-- يمكن تفعيلها بإزالة التعليق إذا استمرت المشكلة

/*
-- حذف السياسات المعقدة
DROP POLICY IF EXISTS "authenticated_upload_storage_objects" ON storage.objects;

-- إنشاء سياسة بسيطة للرفع
CREATE POLICY "simple_authenticated_upload" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets'
  AND public.is_authenticated_user()
);
*/

-- 8. فحص نهائي للتأكد من تطبيق السياسات
SELECT 
    policyname, 
    cmd, 
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%authenticated%'
ORDER BY cmd, policyname;

-- 9. اختبار المصادقة (يجب تشغيلها بعد تسجيل الدخول)
-- SELECT auth.uid() as user_id, auth.role() as user_role;

-- 10. ملاحظات مهمة:
-- - تأكد من أن المستخدم مسجل دخول في التطبيق قبل محاولة رفع الصور
-- - تحقق من أن access_token صالح وغير منتهي الصلاحية
-- - استخدم console.log في التطبيق لمراقبة حالة المصادقة
-- - إذا استمرت المشكلة، تحقق من إعدادات JWT في Supabase Dashboard

-- 11. حل طارئ (استخدم بحذر في بيئة التطوير فقط):
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- ثم أعد تفعيلها بعد الاختبار:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
