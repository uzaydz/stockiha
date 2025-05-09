-- ملف SQL لإصلاح مشكلة سياسة RLS في جدول landing_page_submissions

-- 1. التأكد من تفعيل RLS على الجدول
ALTER TABLE landing_page_submissions ENABLE ROW LEVEL SECURITY;

-- 2. حذف جميع السياسات الحالية المتعلقة بالإدراج
DROP POLICY IF EXISTS "Any user can insert landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Allow public form submissions" ON landing_page_submissions;

-- 3. إنشاء سياسة جديدة تسمح بالإدراج للمستخدمين المجهولين
-- السياسة الجديدة تهتم فقط بأن landing_page_id موجود في جدول landing_pages وأن الصفحة منشورة
CREATE POLICY "Anyone can submit forms to published landing pages" 
ON landing_page_submissions
FOR INSERT
TO public
WITH CHECK (
  landing_page_id IN (
    SELECT id FROM landing_pages 
    WHERE is_published = true AND is_deleted = false
  )
);

-- 4. التأكد من أن الوصول مفتوح للقراءة
DROP POLICY IF EXISTS "Organization members can view landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Anyone can view their submissions" ON landing_page_submissions;

CREATE POLICY "Public can view submissions" 
ON landing_page_submissions
FOR SELECT 
TO public
USING (true);

-- 5. التأكد من أن service role لديه كامل الصلاحيات
DROP POLICY IF EXISTS "Service role has full access" ON landing_page_submissions;
CREATE POLICY "Service role has full access" 
ON landing_page_submissions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ملاحظات مهمة للتنفيذ:
-- 1. يجب استخدام مفتاح anon key وليس service key عند الإرسال من الواجهة الأمامية
-- 2. تأكد من أن landing_page_id المرسل موجود في الجدول landing_pages وأن الصفحة منشورة
-- 3. إذا استمرت المشكلة، جرب تعطيل RLS مؤقتًا للتأكد من أن المشكلة هي بالفعل في RLS:
-- ALTER TABLE landing_page_submissions DISABLE ROW LEVEL SECURITY;
-- (تنبيه: لا تفعل ذلك في بيئة الإنتاج دون اتخاذ احتياطات أمنية أخرى) 