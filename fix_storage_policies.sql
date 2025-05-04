-- حل مشكلة سياسات الأمان لرفع الصور وملفات الشعار والأيقونات
-- Fix storage policies for organization assets bucket

-- 1. حذف السياسات الموجودة التي تحتوي على أخطاء
DROP POLICY IF EXISTS "Los administradores pueden cargar activos" ON storage.objects;
DROP POLICY IF EXISTS "Los administradores pueden actualizar activos" ON storage.objects;
DROP POLICY IF EXISTS "Los administradores pueden eliminar activos" ON storage.objects;

-- 2. التأكد من إعدادات البكت (مهم للتأكد من أن البكت موجود وإعداداته صحيحة)
DELETE FROM storage.buckets WHERE id = 'organization-assets';
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner)
VALUES (
  'organization-assets', 
  'organization-assets', 
  true, 
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/webp']::text[],
  NULL
);

-- 3. إنشاء سياسة للسماح بالوصول العام للملفات (للقراءة فقط)
DROP POLICY IF EXISTS "Acceso público a activos de organizaciones" ON storage.objects;
CREATE POLICY "Acceso público a activos de organizaciones" ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');

-- 4. إنشاء سياسة للسماح للمسؤولين برفع الملفات (الإضافة)
-- هنا استخدمنا name بدلاً من users.name، وname هو اسم الملف في جدول storage.objects
CREATE POLICY "Los administradores pueden cargar activos" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
      )
    )
  );

-- 5. إنشاء سياسة للسماح للمسؤولين بتحديث الملفات
CREATE POLICY "Los administradores pueden actualizar activos" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
      )
    )
  );

-- 6. إنشاء سياسة للسماح للمسؤولين بحذف الملفات
CREATE POLICY "Los administradores pueden eliminar activos" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-assets' 
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() 
        AND users.is_org_admin = true
      )
    )
  );

-- 7. التحقق من وجود المجلدات اللازمة (يمكن إنشاؤها تلقائيًا)
DO $$
BEGIN
  -- نحن لا نحتاج لإنشاء مجلدات فعليًا في Supabase Storage، فهي ستُنشأ تلقائيًا عند رفع الملفات
  -- لكن يمكننا إضافة سجلات توثيقية
  RAISE NOTICE 'تم إعداد سياسات الأمان لبكت organization-assets لدعم رفع الشعارات والأيقونات';
END $$;

-- 8. ملاحظة توثيقية للمطورين
COMMENT ON POLICY "Los administradores pueden cargar activos" ON storage.objects IS 
  'يسمح للمستخدمين المصرح لهم كمسؤولين للمؤسسة برفع الملفات إلى المجلد organization-assets';

-- تعليمات إضافية لتحديث الكود frontend:
/*
ملاحظة مهمة: إذا استمرت المشكلة، قد تحتاج لتعديل الكود في OrganizationBrandSettings.tsx:
1. تأكد من التحقق أن المستخدم هو فعلاً مسؤول مؤسسة قبل محاولة رفع الملف
2. يمكنك إضافة رمز UUID فريد إلى اسم الملف لتجنب تعارض الأسماء
3. تأكد من استخدام مسار صحيح للمجلد مثل 'logos/organization-uuid/filename.png'
*/ 