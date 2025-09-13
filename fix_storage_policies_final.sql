-- إصلاح نهائي لسياسات التخزين - حذف السياسات المكررة
-- يجب تنفيذ هذا في Supabase Dashboard أو SQL Editor

-- 1. حذف السياسة المكررة للقراءة
DROP POLICY IF EXISTS "public_read_storage_objects" ON storage.objects;

-- 2. التأكد من وجود السياسات الصحيحة فقط
-- فحص السياسات الحالية
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN cmd = 'SELECT' THEN 'قراءة'
        WHEN cmd = 'INSERT' THEN 'رفع'
        WHEN cmd = 'UPDATE' THEN 'تحديث'
        WHEN cmd = 'DELETE' THEN 'حذف'
        ELSE cmd
    END as operation_ar,
    CASE 
        WHEN with_check LIKE '%auth.uid() IS NOT NULL%' THEN 'مستخدم مصادق'
        WHEN qual LIKE '%bucket_id = ANY%' THEN 'عام'
        ELSE 'أخرى'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
ORDER BY cmd, policyname;

-- 3. إضافة تعليق للسياسات الصحيحة
COMMENT ON POLICY "secure_authenticated_upload" ON storage.objects IS 'سياسة رفع الملفات للمستخدمين المصادقين';
COMMENT ON POLICY "secure_authenticated_update" ON storage.objects IS 'سياسة تحديث الملفات للمستخدمين المصادقين';
COMMENT ON POLICY "secure_authenticated_delete" ON storage.objects IS 'سياسة حذف الملفات للمستخدمين المصادقين';
COMMENT ON POLICY "secure_public_read" ON storage.objects IS 'سياسة القراءة العامة للملفات';

-- 4. تحقق نهائي من السياسات
SELECT 
    'السياسات الحالية بعد التنظيف:' as status,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as read_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as upload_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- النتيجة المتوقعة: 4 سياسات فقط (1 لكل عملية)
