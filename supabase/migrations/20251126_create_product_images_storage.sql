-- =====================================================
-- إنشاء Storage Bucket لصور المنتجات
-- 20251126_create_product_images_storage.sql
-- =====================================================

-- 1. إنشاء الـ bucket إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,  -- public للوصول المباشر للصور
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. سياسة القراءة العامة (أي شخص يمكنه رؤية الصور)
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3. سياسة الرفع للمستخدمين المصادق عليهم (مبسطة)
-- تسمح للمستخدمين المصادق عليهم برفع الصور في مجلدات المؤسسات
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- 4. سياسة التحديث للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "Users can update their organization images" ON storage.objects;
CREATE POLICY "Users can update their organization images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- 5. سياسة الحذف للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "Users can delete their organization images" ON storage.objects;
CREATE POLICY "Users can delete their organization images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- =====================================================
-- ملاحظة: السياسات أعلاه مبسطة وتسمح لأي مستخدم مصادق عليه
-- بالتعامل مع الصور. يمكن تعزيز الأمان لاحقاً بإضافة
-- فحوصات organization_id إذا كان جدول users يحتوي على هذا الحقل.
-- =====================================================
