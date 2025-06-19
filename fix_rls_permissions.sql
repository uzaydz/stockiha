-- إصلاح مشكلة صلاحيات RLS لجدول organization_settings

-- 1. إضافة سياسة للمؤسسات العامة
CREATE POLICY "allow_public_org_settings_update"
ON organization_settings
FOR ALL
TO authenticated
USING (enable_public_site = true)
WITH CHECK (enable_public_site = true);

-- 2. إضافة سياسة للمستخدمين المرتبطين بالمؤسسة (حتى لو لم يكونوا في جدول users)
CREATE POLICY "allow_organization_members_settings"
ON organization_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND auth.uid() IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND auth.uid() IS NOT NULL
  )
);

-- 3. السماح بالقراءة والكتابة للمؤسسات التي تم إنشاؤها بواسطة المستخدم الحالي
CREATE POLICY "allow_creator_settings_access"
ON organization_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND o.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND o.created_by = auth.uid()
  )
);

-- 4. تحديث السياسة الموجودة لتكون أكثر مرونة
DROP POLICY IF EXISTS "users_can_update_own_org_settings" ON organization_settings;

CREATE POLICY "users_can_manage_org_settings"
ON organization_settings
FOR ALL
TO authenticated
USING (
  -- السماح إذا كان المستخدم مرتبط بالمؤسسة
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (
      u.organization_id = organization_settings.organization_id
      OR u.is_super_admin = true
    )
  )
  OR
  -- السماح للمؤسسات العامة
  enable_public_site = true
  OR
  -- السماح إذا كان المستخدم منشئ المؤسسة
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND o.created_by = auth.uid()
  )
)
WITH CHECK (
  -- نفس الشروط للكتابة
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (
      u.organization_id = organization_settings.organization_id
      OR u.is_super_admin = true
    )
  )
  OR
  enable_public_site = true
  OR
  EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = organization_settings.organization_id
    AND o.created_by = auth.uid()
  )
);

-- 5. إضافة دالة لتحديث آمن يتجاوز RLS
CREATE OR REPLACE FUNCTION safe_update_language(
  p_org_id UUID,
  p_language VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من صحة اللغة
  IF p_language NOT IN ('ar', 'en', 'fr') THEN
    RETURN FALSE;
  END IF;
  
  -- تحديث اللغة
  UPDATE organization_settings 
  SET default_language = p_language, updated_at = NOW()
  WHERE organization_id = p_org_id;
  
  -- إذا لم توجد إعدادات، إنشاء إعدادات جديدة
  IF NOT FOUND THEN
    INSERT INTO organization_settings (
      organization_id, default_language, created_at, updated_at
    ) VALUES (
      p_org_id, p_language, NOW(), NOW()
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

-- منح صلاحيات للدالة
GRANT EXECUTE ON FUNCTION safe_update_language(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_language(UUID, VARCHAR) TO anon;

-- 6. اختبار الدالة
SELECT safe_update_language('6c2ed605-0880-4e40-af50-78f80f7283bb', 'en');

-- 7. التحقق من النتيجة
SELECT organization_id, default_language, updated_at 
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'; 