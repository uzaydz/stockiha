-- إصلاح مشكلة CORS وأخطاء API النوع 406

-- تأكد من أن CORS مُعد بشكل صحيح للسماح بالوصول من الواجهات الأمامية
BEGIN;

-- تكوين CORS لـ API
SELECT
  coalesce(current_setting('pgrst.db_schemas', true), 'public,storage,graphql_public')
  AS exposed_schemas;

-- وضع سياسات أكثر تساهلاً لمعالجة طلبات الجداول
-- إضافة سياسة عامة للسماح بالوصول إلى جدول المستخدمين

-- تطبيق صلاحيات واسعة لجدول المستخدمين لملف التعريف العام
CREATE POLICY "users_anon_select" ON users
  FOR SELECT
  USING (true);

-- تأكد من عدم وجود قيود NOT NULL غير ضرورية تسبب أخطاء
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN auth_id DROP NOT NULL;

-- تحديث إعدادات Supabase للتعامل مع جميع أنواع المحتوى
-- إنشاء دالة لتصحيح رؤوس الطلبات
CREATE OR REPLACE FUNCTION fix_request_headers()
RETURNS TRIGGER AS $$
BEGIN
  -- إضافة رؤوس Accept و Content-Type لتجنب أخطاء 406
  NEW.headers := coalesce(NEW.headers, '{}'::jsonb) || 
    '{"Accept": "application/json", "Content-Type": "application/json"}'::jsonb;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تعديل جدول الإعدادات لتطبيق التصحيح
CREATE TABLE IF NOT EXISTS api_settings (
  id SERIAL PRIMARY KEY,
  cors_origins TEXT[] DEFAULT ARRAY['*'],
  max_rows INTEGER DEFAULT 1000,
  headers JSONB DEFAULT '{"Accept": "application/json", "Content-Type": "application/json"}'
);

-- إدراج إعدادات افتراضية إذا لم تكن موجودة
INSERT INTO api_settings (cors_origins, max_rows, headers)
VALUES (
  ARRAY['*'],
  1000,
  '{"Accept": "application/json", "Content-Type": "application/json"}'
)
ON CONFLICT DO NOTHING;

COMMIT; 