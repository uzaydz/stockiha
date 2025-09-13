-- حل بسيط لمشكلة رفع الصور - RLS Policy Fix
-- يجب تشغيل هذا في Supabase SQL Editor

-- 1. إزالة السياسات القديمة المتضاربة
DROP POLICY IF EXISTS "public_read_storage_objects" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_storage_objects" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_storage_objects" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_storage_objects" ON storage.objects;

-- 2. إنشاء سياسة بسيطة للقراءة العامة
CREATE POLICY "allow_public_read" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'organization-assets');

-- 3. إنشاء سياسة بسيطة للرفع للمستخدمين المصادق عليهم
CREATE POLICY "allow_authenticated_upload" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets' 
  AND auth.uid() IS NOT NULL
);

-- 4. إنشاء سياسة بسيطة للتحديث
CREATE POLICY "allow_authenticated_update" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'organization-assets' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'organization-assets' AND auth.uid() IS NOT NULL);

-- 5. إنشاء سياسة بسيطة للحذف
CREATE POLICY "allow_authenticated_delete" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'organization-assets' AND auth.uid() IS NOT NULL);

-- 6. التأكد من أن RLS مفعل على الجدول
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. عرض السياسات المطبقة للتأكد
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
