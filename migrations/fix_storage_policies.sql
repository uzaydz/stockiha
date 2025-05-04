-- حل مشكلة سياسات الأمان للتخزين
-- Fix storage policies error

-- المشكلة: ERROR 42P01: relation "storage.policies" does not exist
-- الحل: استخدام pg_policies بدلاً من storage.policies وإنشاء سياسات جديدة

DO $$
BEGIN
  -- 1. نستخدم pg_policies للتحقق من وجود السياسات، بدلاً من storage.policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname = 'Los administradores pueden cargar activos'
  ) THEN
    DROP POLICY IF EXISTS "Los administradores pueden cargar activos" ON storage.objects;
    RAISE NOTICE 'تم حذف السياسة القديمة: Los administradores pueden cargar activos';
  END IF;
  
  -- 2. التأكد من وجود مخطط storage
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = 'storage'
  ) THEN
    RAISE NOTICE 'مخطط storage موجود، جاري إنشاء السياسات';
  ELSE
    -- إذا لم يكن موجودًا، قم بإنشائه
    CREATE SCHEMA IF NOT EXISTS storage;
    RAISE NOTICE 'تم إنشاء مخطط storage';
  END IF;
  
  -- 3. التأكد من وجود جدول objects
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage'
    AND table_name = 'objects'
  ) THEN
    RAISE NOTICE 'جدول storage.objects موجود، جاري إنشاء السياسات';
  ELSE
    -- لا نحاول إنشاء الجدول لأنه معقد ويحتاج إلى كامل هيكل Supabase Storage
    RAISE WARNING 'جدول storage.objects غير موجود، قد تحتاج لتثبيت Supabase Storage كامل';
  END IF;
  
  -- 4. إضافة سياسة جديدة للسماح برفع الصور
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND cmd = 'INSERT'
  ) THEN
    -- سياسة جديدة للسماح للمستخدمين المصادق عليهم برفع الصور
    CREATE POLICY "Allow authenticated users to upload assets" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'organization-assets');
    
    RAISE NOTICE 'تم إنشاء سياسة جديدة للسماح برفع الصور';
  END IF;
  
  -- 5. إنشاء مخطط migrations_log إذا لم يكن موجودًا
  CREATE TABLE IF NOT EXISTS migrations_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL,
    details TEXT
  );
  
  -- 6. تسجيل تنفيذ هذه الهجرة
  INSERT INTO migrations_log (migration_name, status, details)
  VALUES (
    'fix_storage_policies', 
    'COMPLETED', 
    'تم إصلاح مشكلة storage.policies واستخدام pg_policies بدلاً منها وإضافة سياسة للسماح برفع الصور'
  );
  
  RAISE NOTICE 'تم تنفيذ الهجرة بنجاح وتسجيلها في migrations_log';
END $$; 