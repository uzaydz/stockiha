-- إصلاح أنواع البيانات في functions لتطابق بنية الجدول الفعلية
-- التاريخ: 2025-06-18

-- =======================
-- إصلاح function get_organization_apps_simple
-- =======================

-- حذف الfunction القديمة
DROP FUNCTION IF EXISTS get_organization_apps_simple(UUID);

-- إنشاء function مع أنواع البيانات الصحيحة
CREATE OR REPLACE FUNCTION get_organization_apps_simple(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id VARCHAR(50),  -- تغيير من TEXT إلى VARCHAR(50)
  is_enabled BOOLEAN,
  installed_at TIMESTAMPTZ,  -- تغيير من created_at إلى installed_at
  configuration JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحية المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.organization_id = org_id
    AND u.is_active = true
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول لهذه البيانات';
  END IF;
  
  -- إرجاع التطبيقات بالترتيب الصحيح لأعمدة الجدول
  RETURN QUERY
  SELECT 
    oa.id,
    oa.organization_id,
    oa.app_id,
    oa.is_enabled,
    oa.installed_at,
    oa.configuration,
    oa.created_at,
    oa.updated_at
  FROM organization_apps oa
  WHERE oa.organization_id = org_id
  ORDER BY oa.created_at DESC;
END;
$$;

-- =======================
-- إصلاح function enable_organization_app_simple
-- =======================

-- حذف الfunction القديمة
DROP FUNCTION IF EXISTS enable_organization_app_simple(UUID, TEXT);
DROP FUNCTION IF EXISTS enable_organization_app_simple(UUID, VARCHAR);

-- إنشاء function مع أنواع البيانات الصحيحة
CREATE OR REPLACE FUNCTION enable_organization_app_simple(org_id UUID, app_id_param VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.auth_user_id = auth.uid()
  AND u.organization_id = org_id
  AND u.is_active = true;
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول لهذه المؤسسة';
  END IF;
  
  IF user_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'صلاحيات غير كافية لتفعيل التطبيقات';
  END IF;
  
  -- تفعيل التطبيق أو إنشاؤه
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, installed_at, configuration, created_at, updated_at)
  VALUES (org_id, app_id_param, true, NOW(), '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id, app_id) 
  DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();
    
  RETURN true;
END;
$$;

-- =======================
-- تسجيل النجاح
-- =======================

DO $$
BEGIN
  RAISE NOTICE 'تم إصلاح أنواع البيانات في functions بنجاح';
  RAISE NOTICE 'function get_organization_apps_simple: app_id VARCHAR(50)';
  RAISE NOTICE 'function enable_organization_app_simple: app_id_param VARCHAR(50)';
END $$; 