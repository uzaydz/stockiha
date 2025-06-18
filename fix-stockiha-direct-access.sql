-- إصلاح شامل لجعل النظام يعمل مع stockiha.com/dashboard مباشرة
-- التاريخ: 2025-06-18
-- الهدف: تبسيط RLS policies وإصلاح مشاكل المصادقة

-- =======================
-- 1. تبسيط سياسات organization_apps
-- =======================

-- حذف السياسات المعقدة الحالية
DROP POLICY IF EXISTS "organization_apps_unified_select" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_unified_write" ON organization_apps;

-- إنشاء سياسة مبسطة للقراءة - تسمح لجميع المستخدمين المصادقين
CREATE POLICY "simple_select_organization_apps" 
ON organization_apps FOR SELECT 
USING (
  -- يمكن للمستخدمين المصادقين رؤية التطبيقات لمؤسستهم
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.organization_id = organization_apps.organization_id
    AND u.is_active = true
  )
);

-- إنشاء سياسة مبسطة للكتابة - تسمح للمديرين فقط
CREATE POLICY "simple_write_organization_apps" 
ON organization_apps FOR ALL 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.organization_id = organization_apps.organization_id
    AND u.role IN ('admin', 'owner')
    AND u.is_active = true
  )
);

-- =======================
-- 2. إنشاء تطبيقات افتراضية لمؤسسة asray collection
-- =======================

-- إدراج التطبيقات الأساسية إذا لم تكن موجودة
INSERT INTO organization_apps (organization_id, app_id, is_enabled, created_at, updated_at)
SELECT 
  '560e2c06-d13c-4853-abcf-d41f017469cf',
  app_id,
  false, -- مُعطل افتراضياً
  NOW(),
  NOW()
FROM (
  VALUES 
    ('pos-system'),
    ('subscription-services'),
    ('call-center'),
    ('flexi-crypto'),
    ('repair-services')
) AS apps(app_id)
WHERE NOT EXISTS (
  SELECT 1 FROM organization_apps oa
  WHERE oa.organization_id = '560e2c06-d13c-4853-abcf-d41f017469cf'
  AND oa.app_id = apps.app_id
);

-- =======================
-- 3. إصلاح RPC function لدعم النظام المبسط
-- =======================

-- حذف الfunction القديمة إن وجدت لتجنب تضارب return type
DROP FUNCTION IF EXISTS get_organization_apps_simple(UUID);
DROP FUNCTION IF EXISTS get_organization_apps_debug(UUID);

-- إنشاء function مبسطة لجلب تطبيقات المؤسسة
CREATE OR REPLACE FUNCTION get_organization_apps_simple(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id TEXT,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  configuration JSONB
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
  
  -- إرجاع التطبيقات
  RETURN QUERY
  SELECT 
    oa.id,
    oa.organization_id,
    oa.app_id,
    oa.is_enabled,
    oa.created_at,
    oa.updated_at,
    oa.configuration
  FROM organization_apps oa
  WHERE oa.organization_id = org_id
  ORDER BY oa.created_at DESC;
END;
$$;

-- =======================
-- 4. function لتفعيل التطبيقات بأمان
-- =======================

-- حذف function التفعيل القديمة إن وجدت
DROP FUNCTION IF EXISTS enable_organization_app_simple(UUID, TEXT);
DROP FUNCTION IF EXISTS enable_organization_app(UUID, TEXT);

CREATE OR REPLACE FUNCTION enable_organization_app_simple(org_id UUID, app_id_param TEXT)
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
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, created_at, updated_at)
  VALUES (org_id, app_id_param, true, NOW(), NOW())
  ON CONFLICT (organization_id, app_id) 
  DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();
    
  RETURN true;
END;
$$;

-- =======================
-- 5. إصلاح سياسات users table للتأكد من عمل RLS
-- =======================

-- حذف السياسة القديمة إن وجدت وإنشاء جديدة
DROP POLICY IF EXISTS "users_can_access_own_data" ON users;

-- إنشاء سياسة للمستخدمين للوصول لبياناتهم
CREATE POLICY "users_can_access_own_data" 
ON users FOR SELECT 
USING (auth_user_id = auth.uid());

-- =======================
-- 6. تسجيل النجاح
-- =======================

-- إنشاء سجل للتأكد من تطبيق التحديثات
DO $$
BEGIN
  RAISE NOTICE 'تم تطبيق إصلاحات stockiha.com/dashboard بنجاح';
  RAISE NOTICE 'عدد التطبيقات المُدرجة: %', (
    SELECT count(*) FROM organization_apps 
    WHERE organization_id = '560e2c06-d13c-4853-abcf-d41f017469cf'
  );
END $$; 