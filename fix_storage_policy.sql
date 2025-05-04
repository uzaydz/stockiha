-- تمكين RLS على جدول storage.objects إذا لم يكن ممكناً بالفعل (إجراء احترازي)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- حذف السياسة القديمة إذا كانت موجودة (لتجنب التعارض إذا تم إنشاؤها سابقًا باسم مشابه)
DROP POLICY IF EXISTS "Allow authenticated uploads to organization-assets" ON storage.objects;

-- إنشاء سياسة INSERT جديدة للسماح لأي مستخدم مصادق عليه بالرفع إلى حاوية organization-assets
CREATE POLICY "Allow authenticated uploads to organization-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-assets');

-- (اختياري ولكن موصى به) إنشاء سياسة SELECT للسماح للمالك بقراءة ملفاته
DROP POLICY IF EXISTS "Allow authenticated owner read from organization-assets" ON storage.objects;
CREATE POLICY "Allow authenticated owner read from organization-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-assets' AND auth.uid() = owner);

-- (اختياري ولكن موصى به) إنشاء سياسة UPDATE للسماح للمالك بتحديث ملفاته
DROP POLICY IF EXISTS "Allow authenticated owner update from organization-assets" ON storage.objects;
CREATE POLICY "Allow authenticated owner update from organization-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-assets' AND auth.uid() = owner);

-- (اختياري ولكن موصى به) إنشاء سياسة DELETE للسماح للمالك بحذف ملفاته
DROP POLICY IF EXISTS "Allow authenticated owner delete from organization-assets" ON storage.objects;
CREATE POLICY "Allow authenticated owner delete from organization-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-assets' AND auth.uid() = owner);

-- ملاحظة: قد تحتاج إلى سياسات أكثر تحديدًا للسماح بالقراءة/التعديل/الحذف بناءً على أدوار المستخدمين أو الانتماء للمنظمات.
-- السياسات أعلاه تسمح فقط للمالك بالوصول بعد الإنشاء. 