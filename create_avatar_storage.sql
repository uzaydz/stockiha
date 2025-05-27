-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- إعداد سياسات الأمان للصور الشخصية
-- السماح للمستخدمين المصادق عليهم برفع صورهم الشخصية
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- السماح للمستخدمين المصادق عليهم بتحديث صورهم الشخصية
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- السماح للمستخدمين المصادق عليهم بحذف صورهم الشخصية
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- السماح للجميع بعرض الصور الشخصية (لأن البucket عام)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

-- تفعيل RLS على جدول storage.objects إذا لم يكن مفعلاً
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 