-- تطبيق صلاحيات الخدمات
-- هذا الملف يقوم بتطبيق سياسات الصف RLS للتحقق من صلاحيات الخدمات للموظفين
-- التاريخ: الحالي

-- بدء المعاملة
BEGIN;

-- إنشاء دالة للتحقق من صلاحيات الخدمات
CREATE OR REPLACE FUNCTION public.check_service_permission(permission text)
RETURNS boolean AS $$
DECLARE
  permissions jsonb;
  is_org_admin boolean;
  is_super_admin boolean;
  user_role text;
BEGIN
  -- الحصول على بيانات المستخدم الحالي
  SELECT
    u.permissions,
    u.role,
    u.is_org_admin,
    u.is_super_admin
  INTO
    permissions,
    user_role,
    is_org_admin,
    is_super_admin
  FROM
    public.users u
  WHERE
    u.id = auth.uid();

  -- مدير النظام لديه جميع الصلاحيات
  IF is_super_admin = true THEN
    RETURN true;
  END IF;

  -- مدير المؤسسة لديه صلاحيات كاملة في مؤسسته
  IF is_org_admin = true OR user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- التحقق من الصلاحية المطلوبة إذا لم تكن مدير نظام أو مدير مؤسسة
  IF permissions IS NULL THEN
    RETURN false;
  END IF;

  -- التحقق من صلاحية إدارة الخدمات العامة أو الصلاحية المحددة
  RETURN (permissions->>'manageServices')::boolean = true 
       OR (permissions->>permission)::boolean = true;

EXCEPTION WHEN OTHERS THEN
  -- في حالة حدوث أي خطأ، تكون الصلاحية ممنوعة
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف أي سياسات موجودة قد تتعارض مع ما سنضيفه
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON services;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON services;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow delete for admin users" ON services;
DROP POLICY IF EXISTS "Allow insert for admin users" ON services;
DROP POLICY IF EXISTS "Allow update for admin users" ON services;
DROP POLICY IF EXISTS "Allow public read access for services" ON services;
DROP POLICY IF EXISTS "Allow select for all users" ON services;
DROP POLICY IF EXISTS "org_tenant_services_delete" ON services;
DROP POLICY IF EXISTS "org_tenant_services_insert" ON services;
DROP POLICY IF EXISTS "org_tenant_services_select" ON services;
DROP POLICY IF EXISTS "org_tenant_services_update" ON services;

-- تعيين RLS لجدول الخدمات
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- سياسات جدول الخدمات - لا يمكن للمستخدم الوصول إلا إلى خدمات المؤسسة التابع لها
-- مع وجود الصلاحيات المناسبة

-- سياسة القراءة (SELECT)
CREATE POLICY "services_view_policy" ON services
  FOR SELECT
  USING (
    check_service_permission('viewServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة الإضافة (INSERT)
CREATE POLICY "services_add_policy" ON services
  FOR INSERT
  WITH CHECK (
    check_service_permission('addServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة التحديث (UPDATE)
CREATE POLICY "services_edit_policy" ON services
  FOR UPDATE
  USING (
    check_service_permission('editServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة الحذف (DELETE)
CREATE POLICY "services_delete_policy" ON services
  FOR DELETE
  USING (
    check_service_permission('deleteServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- إعداد سياسات تتبع الخدمات (service_progress)
DROP POLICY IF EXISTS "org_tenant_service_progress_select" ON service_progress;
DROP POLICY IF EXISTS "org_tenant_service_progress_insert" ON service_progress;
DROP POLICY IF EXISTS "org_tenant_service_progress_update" ON service_progress;
DROP POLICY IF EXISTS "org_tenant_service_progress_delete" ON service_progress;

-- تعيين RLS لجدول تقدم الخدمة
ALTER TABLE service_progress ENABLE ROW LEVEL SECURITY;

-- سياسات جدول تقدم الخدمة
-- سياسة القراءة (SELECT)
CREATE POLICY "service_progress_view_policy" ON service_progress
  FOR SELECT
  USING (
    (check_service_permission('trackServices') OR check_service_permission('viewServices'))
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة الإضافة (INSERT)
CREATE POLICY "service_progress_add_policy" ON service_progress
  FOR INSERT
  WITH CHECK (
    check_service_permission('trackServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة التحديث (UPDATE)
CREATE POLICY "service_progress_edit_policy" ON service_progress
  FOR UPDATE
  USING (
    check_service_permission('trackServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- سياسة الحذف (DELETE)
CREATE POLICY "service_progress_delete_policy" ON service_progress
  FOR DELETE
  USING (
    check_service_permission('trackServices')
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- إنهاء المعاملة
COMMIT; 