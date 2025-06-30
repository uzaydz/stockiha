-- إصلاح سياسة organization_settings
-- المشكلة: السياسة الحالية معقدة جداً وقد لا تعمل مع Supabase REST API

-- 1. حذف السياسة الحالية
DROP POLICY IF EXISTS "organization_settings_access" ON organization_settings;

-- 2. إنشاء سياسة مبسطة وواضحة
CREATE POLICY "organization_settings_simple_access" ON organization_settings
FOR ALL 
TO authenticated
USING (
  -- المستخدم عضو في المؤسسة
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.organization_id = organization_settings.organization_id
  )
  OR
  -- المستخدم مالك المؤسسة
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE organizations.id = organization_settings.organization_id 
    AND organizations.owner_id = auth.uid()
  )
  OR
  -- المستخدم سوبر أدمن
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_super_admin = true
  )
)
WITH CHECK (
  -- نفس الشروط للإدراج والتحديث
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.organization_id = organization_settings.organization_id
  )
  OR
  EXISTS (
    SELECT 1 FROM organizations 
    WHERE organizations.id = organization_settings.organization_id 
    AND organizations.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_super_admin = true
  )
);

-- 3. اختبار السياسة الجديدة
SELECT 
  id,
  organization_id,
  site_name,
  theme_primary_color,
  default_language
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 4. عرض السياسات الجديدة
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'organization_settings'; 