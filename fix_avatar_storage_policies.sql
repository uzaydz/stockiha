-- إصلاح سياسات رفع الصور الشخصية في Supabase Storage
-- هذا الملف يحل مشكلة خطأ 403 عند رفع الصور

-- 1. حذف السياسات القديمة للـ user-avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 2. إنشاء سياسات جديدة محسنة للـ user-avatars bucket

-- سياسة القراءة العامة للصور الشخصية
CREATE POLICY "Public read access for avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- سياسة رفع الصور للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.role() = 'authenticated'
);

-- سياسة تحديث الصور للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND auth.role() = 'authenticated'
);

-- سياسة حذف الصور للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' 
  AND auth.role() = 'authenticated'
);

-- 3. التأكد من إعدادات الـ bucket
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'user-avatars';

-- 4. إنشاء دالة مساعدة للتحقق من صحة رفع الصور
CREATE OR REPLACE FUNCTION validate_avatar_upload(
  file_name text,
  file_size bigint,
  mime_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من حجم الملف (5MB max)
  IF file_size > 5242880 THEN
    RETURN false;
  END IF;
  
  -- التحقق من نوع الملف
  IF mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    RETURN false;
  END IF;
  
  -- التحقق من امتداد الملف
  IF NOT (file_name ~* '\.(jpg|jpeg|png|webp|gif)$') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION validate_avatar_upload(text, bigint, text) TO authenticated;

-- 5. إنشاء دالة لتنظيف الصور القديمة
CREATE OR REPLACE FUNCTION cleanup_old_avatars(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حذف الصور القديمة للمستخدم (الاحتفاظ بآخر 3 صور فقط)
  DELETE FROM storage.objects
  WHERE bucket_id = 'user-avatars'
    AND name LIKE 'avatars/' || user_id::text || '-%'
    AND id NOT IN (
      SELECT id 
      FROM storage.objects 
      WHERE bucket_id = 'user-avatars'
        AND name LIKE 'avatars/' || user_id::text || '-%'
      ORDER BY created_at DESC 
      LIMIT 3
    );
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION cleanup_old_avatars(uuid) TO authenticated;

-- 6. إنشاء trigger لتنظيف الصور تلقائياً عند رفع صورة جديدة
CREATE OR REPLACE FUNCTION trigger_cleanup_avatars()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تنظيف الصور القديمة إذا كانت الصورة الجديدة في مجلد avatars
  IF NEW.bucket_id = 'user-avatars' AND NEW.name LIKE 'avatars/%' THEN
    -- استخراج user_id من اسم الملف
    DECLARE
      extracted_user_id text;
    BEGIN
      extracted_user_id := split_part(split_part(NEW.name, '/', 2), '-', 1);
      IF extracted_user_id IS NOT NULL AND extracted_user_id != '' THEN
        PERFORM cleanup_old_avatars(extracted_user_id::uuid);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- تجاهل الأخطاء في التنظيف
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger
DROP TRIGGER IF EXISTS cleanup_avatars_trigger ON storage.objects;
CREATE TRIGGER cleanup_avatars_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_avatars();

-- 7. إنشاء view لإحصائيات استخدام التخزين
CREATE OR REPLACE VIEW avatar_storage_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  COUNT(so.id) as avatar_count,
  COALESCE(SUM((so.metadata->>'size')::bigint), 0) as total_size_bytes,
  ROUND(COALESCE(SUM((so.metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
  MAX(so.created_at) as last_upload
FROM users u
LEFT JOIN storage.objects so ON (
  so.bucket_id = 'user-avatars' 
  AND so.name LIKE 'avatars/' || u.id::text || '-%'
)
WHERE EXISTS (
  SELECT 1 FROM users admin_user
  WHERE admin_user.id = auth.uid()
    AND (admin_user.is_super_admin = true OR admin_user.is_org_admin = true)
)
GROUP BY u.id, u.email, u.name
ORDER BY total_size_bytes DESC;

-- منح صلاحية عرض الإحصائيات للمديرين
GRANT SELECT ON avatar_storage_stats TO authenticated;

-- 8. دالة للحصول على رابط الصورة الشخصية
CREATE OR REPLACE FUNCTION get_avatar_url(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avatar_path text;
  base_url text := 'https://your-project.supabase.co/storage/v1/object/public/user-avatars/';
BEGIN
  -- البحث عن أحدث صورة للمستخدم
  SELECT name INTO avatar_path
  FROM storage.objects
  WHERE bucket_id = 'user-avatars'
    AND name LIKE 'avatars/' || user_id::text || '-%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF avatar_path IS NOT NULL THEN
    RETURN base_url || avatar_path;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION get_avatar_url(uuid) TO authenticated;

-- 9. تحديث جدول users لإضافة حقل avatar_url إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- 10. دالة لتحديث avatar_url في جدول users تلقائياً
CREATE OR REPLACE FUNCTION update_user_avatar_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  extracted_user_id text;
  new_avatar_url text;
BEGIN
  -- التحقق من أن الملف في bucket الصور الشخصية
  IF NEW.bucket_id = 'user-avatars' AND NEW.name LIKE 'avatars/%' THEN
    -- استخراج user_id من اسم الملف
    extracted_user_id := split_part(split_part(NEW.name, '/', 2), '-', 1);
    
    IF extracted_user_id IS NOT NULL AND extracted_user_id != '' THEN
      -- إنشاء رابط الصورة
      new_avatar_url := 'https://your-project.supabase.co/storage/v1/object/public/user-avatars/' || NEW.name;
      
      -- تحديث جدول users
      UPDATE users 
      SET avatar_url = new_avatar_url, updated_at = NOW()
      WHERE id = extracted_user_id::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- تجاهل الأخطاء وإرجاع NEW
  RETURN NEW;
END;
$$;

-- إنشاء trigger لتحديث avatar_url
DROP TRIGGER IF EXISTS update_avatar_url_trigger ON storage.objects;
CREATE TRIGGER update_avatar_url_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_avatar_url();

-- 11. تعليقات توضيحية
COMMENT ON FUNCTION validate_avatar_upload IS 'التحقق من صحة ملف الصورة الشخصية قبل الرفع';
COMMENT ON FUNCTION cleanup_old_avatars IS 'تنظيف الصور القديمة للمستخدم';
COMMENT ON FUNCTION get_avatar_url IS 'الحصول على رابط الصورة الشخصية للمستخدم';
COMMENT ON VIEW avatar_storage_stats IS 'إحصائيات استخدام التخزين للصور الشخصية';

-- 12. إعدادات إضافية للأمان
-- تأكد من تطبيق هذه الإعدادات في Supabase Dashboard:
/*
Storage Settings:
- File size limit: 5MB
- Allowed file types: image/jpeg, image/png, image/webp, image/gif
- Public access: enabled for read
- Authentication required: for upload/update/delete
*/

-- رسالة نجاح
SELECT 'تم إصلاح سياسات رفع الصور الشخصية بنجاح!' as message; 