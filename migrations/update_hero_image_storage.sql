-- إضافة دعم تخزين صور الخلفية لمكون الهيرو

-- التأكد من وجود مجلد hero-images في المحيط
DO $$
BEGIN
  -- التأكد من أن البكت organization-assets موجود
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'organization-assets'
  ) THEN
    RAISE NOTICE 'يجب إنشاء بكت organization-assets قبل استخدام مجلد hero-images';
  ELSE
    -- التأكد من وجود السياسات الأمنية اللازمة
    IF EXISTS (
      SELECT 1 FROM storage.policies 
      WHERE name = 'Los administradores pueden cargar activos'
      AND table_name = 'objects'
    ) THEN
      RAISE NOTICE 'تم التحقق من وجود السياسات الأمنية اللازمة لرفع صور الهيرو';
    ELSE
      RAISE NOTICE 'يجب تنفيذ ملف fix_storage_policies.sql أولاً لإعداد السياسات الأمنية اللازمة';
    END IF;
  END IF;
END $$;

-- لا نحتاج لإضافة سياسات خاصة بمجلد hero-images
-- لأن سياسات بكت organization-assets كاملة تسمح باستخدام أي مجلد فرعي

COMMENT ON POLICY "Los administradores pueden cargar activos" ON storage.objects IS 
  'يسمح للمستخدمين المصرح لهم كمسؤولين للمؤسسة برفع الملفات إلى المجلد organization-assets وأي مجلدات فرعية مثل hero-images';

-- تسجيل التحديث في سجل التحديثات إذا كان موجودًا
DO $$
BEGIN
  -- التحقق من وجود جدول سجل التحديثات
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations_log') THEN
    INSERT INTO migrations_log (name, executed_at, description)
    VALUES (
      'update_hero_image_storage', 
      NOW(), 
      'إضافة دعم تخزين صور الخلفية لمكون الهيرو في مجلد hero-images'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- تجاهل أي أخطاء قد تحدث عند محاولة الإدراج في سجل التحديثات
  RAISE NOTICE 'تم تجاهل خطأ عند محاولة التسجيل في سجل التحديثات: %', SQLERRM;
END $$; 