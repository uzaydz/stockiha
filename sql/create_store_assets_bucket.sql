-- إنشاء حاوية تخزين جديدة للأصول المتعلقة بالمتجر
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('store-assets', 'store-assets', true, false, 5242880, -- 5 ميجابايت
  '{image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml}'
)
ON CONFLICT (id) DO NOTHING;

-- إنشاء سياسات الوصول للملفات
-- 1. سياسة القراءة العامة (للصور المعروضة للعملاء)
CREATE POLICY "Store Assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

-- 2. سياسة إنشاء ملفات جديدة: متاحة للمستخدمين المصرح لهم
-- نستخدم ببساطة المستخدمين المسجلين لأن التحقق من الصلاحيات التفصيلية يتم على مستوى التطبيق
CREATE POLICY "Store Assets can be created by authenticated users"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'store-assets' AND
    auth.role() = 'authenticated'
  );

-- 3. سياسة التحديث: متاحة للمستخدمين المسجلين (يمكن تعديله لاحقاً بحسب هيكل الصلاحيات)
CREATE POLICY "Store Assets can be updated by authenticated users"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'store-assets' AND
    auth.role() = 'authenticated'
  );

-- 4. سياسة الحذف: متاحة للمستخدمين المسجلين فقط
CREATE POLICY "Store Assets can be deleted by authenticated users"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'store-assets' AND
    auth.role() = 'authenticated'
  );

-- إنشاء الأدلة المطلوبة في الحاوية
-- إنشاء دالة مساعدة لإنشاء الأدلة الافتراضية
CREATE OR REPLACE FUNCTION public.init_store_assets_folders()
RETURNS void AS $$
DECLARE
    _bucket_id TEXT := 'store-assets';
    _folders TEXT[] := ARRAY['seo', 'products', 'theme', 'banners', 'logos'];
    _folder TEXT;
BEGIN
    -- التحقق من وجود الحاوية
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = _bucket_id) THEN
        RAISE EXCEPTION 'الحاوية % غير موجودة', _bucket_id;
    END IF;
    
    -- محاولة إنشاء المجلدات (عبر إنشاء ملفات placeholder)
    -- ملاحظة: في Supabase، المجلدات تُنشأ ضمنياً عند إنشاء ملفات بمسارات تتضمن /
    FOREACH _folder IN ARRAY _folders LOOP
        -- تجاهل الأخطاء، نحاول فقط إنشاء المجلدات
        BEGIN
            -- استخدام قيمة NULL للمالك بدلاً من auth.uid() لتجنب أخطاء عند التنفيذ المباشر
            INSERT INTO storage.objects (bucket_id, name, owner, metadata)
            VALUES (_bucket_id, _folder || '/.placeholder', NULL, '{"placeholder": true}')
            ON CONFLICT (bucket_id, name) DO NOTHING;
            
            RAISE NOTICE 'تم إنشاء المجلد % بنجاح', _folder;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'لم يتم إنشاء المجلد %: %', _folder, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'تم محاولة تهيئة مجلدات الأصول';
END;
$$ LANGUAGE plpgsql;

-- يمكن تنفيذ الدالة بعد تسجيل الدخول من خلال التطبيق
-- بدلاً من التنفيذ المباشر، يمكن استدعاء الدالة من التطبيق
-- SELECT public.init_store_assets_folders();

-- تعليق على الدالة
COMMENT ON FUNCTION public.init_store_assets_folders IS 'دالة لإنشاء المجلدات المطلوبة في حاوية أصول المتجر'; 