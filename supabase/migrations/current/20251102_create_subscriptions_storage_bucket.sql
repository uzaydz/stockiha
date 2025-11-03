-- Migration: Create subscriptions storage bucket
-- التاريخ: 2025-11-02
-- الوصف: إنشاء Storage Bucket لتخزين ملفات إثبات الدفع للاشتراكات

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 1: إنشاء الـ Storage Bucket
-- ═══════════════════════════════════════════════════════════════════

-- إنشاء bucket للاشتراكات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subscriptions',
  'subscriptions',
  true,  -- ملفات عامة يمكن الوصول إليها
  10485760,  -- 10MB حد أقصى لحجم الملف
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 2: إنشاء Storage Policies
-- ═══════════════════════════════════════════════════════════════════

-- السماح للمستخدمين المصادقين برفع الملفات
CREATE POLICY "Allow authenticated users to upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

-- السماح للمستخدمين برؤية ملفاتهم الخاصة
CREATE POLICY "Allow users to view their own payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

-- السماح للسوبر أدمين برؤية جميع الملفات
CREATE POLICY "Allow super admin to view all payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND is_super_admin = true
  )
);

-- السماح للمستخدمين بحذف ملفاتهم
CREATE POLICY "Allow users to delete their own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

-- ═══════════════════════════════════════════════════════════════════
-- اكتمل الإعداد بنجاح ✅
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ تم إنشاء Storage Bucket للاشتراكات بنجاح!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'اسم الـ Bucket: subscriptions';
  RAISE NOTICE 'الحد الأقصى لحجم الملف: 10MB';
  RAISE NOTICE 'أنواع الملفات المسموحة: صور و PDF';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
