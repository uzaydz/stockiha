-- إصلاح مشكلة RLS في جدول organization_settings
-- السبب: RLS غير مُفعل رغم وجود السياسات

-- 1. تفعيل RLS على الجدول
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- 2. التحقق من تفعيل RLS
SELECT 
  t.schemaname,
  t.tablename,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename = 'organization_settings';

-- 3. اختبار الوصول للبيانات بعد تفعيل RLS
SELECT 
  id,
  organization_id,
  site_name,
  theme_primary_color,
  default_language
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 4. عرض السياسات الحالية للتأكد
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'organization_settings'; 