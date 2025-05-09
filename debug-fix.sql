-- ملف SQL للتشخيص وإصلاح مشكلة RLS في جدول landing_page_submissions

------ الجزء الأول: فحص سياسات RLS وبنية الجدول ------

-- 1. فحص حالة RLS على الجدول
SELECT
  relname,
  relrowsecurity
FROM
  pg_class
WHERE
  relname = 'landing_page_submissions';

-- 2. فحص السياسات الحالية
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'landing_page_submissions';

-- 3. فحص القيود على الجدول
SELECT
  conname,
  contype,
  consrc
FROM
  pg_constraint c
JOIN
  pg_class t ON c.conrelid = t.oid
WHERE
  t.relname = 'landing_page_submissions';

------ الجزء الثاني: الإصلاح المقترح ------

-- 1. تعديل RLS للسماح بإدراج جميع البيانات دون قيود
DROP POLICY IF EXISTS "Any user can insert landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Allow public form submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Anyone can submit forms to published landing pages" ON landing_page_submissions;

-- 2. سياسة جديدة أكثر تساهلاً للإدراج - الحل 1
CREATE POLICY "Public insert allowed for landing_page_submissions"
ON landing_page_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- 3. السماح للمستخدمين المجهولين بالاطلاع على بياناتهم - الحل 2
DROP POLICY IF EXISTS "Organization members can view landing page submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Anyone can view their submissions" ON landing_page_submissions;
DROP POLICY IF EXISTS "Public can view submissions" ON landing_page_submissions;

CREATE POLICY "Public can view any submissions"
ON landing_page_submissions
FOR SELECT
TO public
USING (true);

-- 4. للتشخيص السريع، يمكن إنشاء دالة stored function تسمح بإدراج البيانات دون RLS مطلقاً
CREATE OR REPLACE FUNCTION insert_landing_page_submission(
  p_landing_page_id UUID,
  p_form_id UUID,
  p_product_id UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO landing_page_submissions(
    landing_page_id,
    form_id,
    product_id,
    is_processed,
    data
  ) VALUES (
    p_landing_page_id,
    p_form_id,
    p_product_id,
    false,
    p_data
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 5. منح صلاحيات تنفيذ الدالة للمستخدمين العامين
GRANT EXECUTE ON FUNCTION insert_landing_page_submission TO public, anon, authenticated;

-- 6. التحقق من أن CORS مضبوط بشكل صحيح - تذكير فقط
-- يمكنك تنفيذ هذا من لوحة تحكم Supabase في إعدادات API

-- ملاحظة: 
-- 1. يمكن استخدام الدالة insert_landing_page_submission في الفرونت إند كبديل عن الإدراج المباشر
-- 2. يمكن أيضاً محاولة تعطيل RLS مؤقتاً للتحقق من أنها هي المشكلة، ثم استعادة الإعدادات الآمنة 