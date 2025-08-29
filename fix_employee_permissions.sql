-- إصلاح صلاحيات الموظفين وحل مشكلة الوصول
-- تاريخ: 2025-01-27

-- 1. تحديث صلاحيات المستخدم الحالي للتأكد من أن له صلاحيات عرض المخزون
UPDATE users
SET 
  permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{viewInventory}',
    'true'::jsonb
  ),
  role = 'employee',
  is_active = true,
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{permissions}',
    jsonb_set(
      COALESCE(permissions, '{}'::jsonb),
      '{viewInventory}',
      'true'::jsonb
    )
  ),
  raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{permissions}',
      jsonb_set(
        COALESCE(permissions, '{}'::jsonb),
        '{viewInventory}',
        'true'::jsonb
      )
    ),
    '{role}',
    '"employee"'::jsonb
  )
WHERE 
  email = 'uzaydz3ds8730730@gmail.com'
  OR auth_user_id = 'f2ffd6dd-dfe9-4340-8c67-d52376fa0291';

-- 2. إضافة صلاحيات إضافية للموظفين
UPDATE users
SET 
  permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{viewOrders}',
    'true'::jsonb
  )
WHERE 
  role = 'employee'
  AND (permissions->>'viewInventory' = 'true' OR permissions->>'manageInventory' = 'true');

-- 3. إضافة صلاحيات إدارة المنتجات للموظفين الذين لديهم صلاحية المخزون
UPDATE users
SET 
  permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{manageProducts}',
    'true'::jsonb
  )
WHERE 
  role = 'employee'
  AND permissions->>'viewInventory' = 'true';

-- 4. إنشاء أو تحديث وظيفة RPC للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION rpc.check_user_permission_fast(
  p_permission_name text,
  p_auth_user_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  user_record record;
  user_permissions jsonb;
  has_permission boolean := false;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  IF p_auth_user_id IS NOT NULL THEN
    current_user_id := p_auth_user_id;
  ELSE
    current_user_id := auth.uid();
  END IF;
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- البحث عن المستخدم
  SELECT * INTO user_record
  FROM users
  WHERE auth_user_id = current_user_id
     OR id = current_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- التحقق من أن المستخدم نشط
  IF NOT user_record.is_active THEN
    RETURN false;
  END IF;
  
  -- المدير العام له جميع الصلاحيات
  IF user_record.is_super_admin THEN
    RETURN true;
  END IF;
  
  -- مدير المؤسسة له جميع الصلاحيات
  IF user_record.is_org_admin THEN
    RETURN true;
  END IF;
  
  -- المدير والمالك لهما جميع الصلاحيات
  IF user_record.role IN ('admin', 'owner') THEN
    RETURN true;
  END IF;
  
  -- التحقق من الصلاحية المحددة
  user_permissions := COALESCE(user_record.permissions, '{}'::jsonb);
  
  -- التحقق من الصلاحية المطلوبة
  IF user_permissions ? p_permission_name THEN
    has_permission := (user_permissions->>p_permission_name)::boolean;
  END IF;
  
  -- التحقق من الصلاحيات المرتبطة
  IF NOT has_permission THEN
    CASE p_permission_name
      WHEN 'viewInventory' THEN
        has_permission := (user_permissions->>'manageInventory')::boolean = true;
      WHEN 'manageProducts' THEN
        has_permission := (user_permissions->>'viewInventory')::boolean = true;
      WHEN 'viewOrders' THEN
        has_permission := (user_permissions->>'viewInventory')::boolean = true;
      ELSE
        has_permission := false;
    END CASE;
  END IF;
  
  RETURN has_permission;
END;
$$;

-- 5. إنشاء وظيفة RPC للحصول على معلومات المستخدم الأساسية
CREATE OR REPLACE FUNCTION rpc.get_user_basic_info(
  p_auth_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  auth_user_id uuid,
  email text,
  name text,
  role text,
  organization_id uuid,
  is_active boolean,
  is_org_admin boolean,
  is_super_admin boolean
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  IF p_auth_user_id IS NOT NULL THEN
    current_user_id := p_auth_user_id;
  ELSE
    current_user_id := auth.uid();
  END IF;
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- إرجاع معلومات المستخدم
  RETURN QUERY
  SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.name,
    u.role,
    u.organization_id,
    u.is_active,
    u.is_org_admin,
    u.is_super_admin
  FROM users u
  WHERE u.auth_user_id = current_user_id
     OR u.id = current_user_id;
END;
$$;

-- 6. إنشاء وظيفة RPC للتحقق من صلاحية عرض المخزون
CREATE OR REPLACE FUNCTION rpc.can_view_inventory(
  p_auth_user_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN rpc.check_user_permission_fast('viewInventory', p_auth_user_id);
END;
$$;

-- 7. تحديث RLS policies للتأكد من أن الموظفين يمكنهم الوصول لبياناتهم
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (
    auth.uid() = auth_user_id 
    OR auth.uid() = id
    OR is_org_admin = true
    OR is_super_admin = true
  );

-- 8. إضافة policy للموظفين للوصول لبيانات المؤسسة
DROP POLICY IF EXISTS "Employees can view organization data" ON organizations;
CREATE POLICY "Employees can view organization data" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.organization_id = organizations.id 
        AND (users.auth_user_id = auth.uid() OR users.id = auth.uid())
        AND users.is_active = true
    )
  );

-- 9. تحديث جدول users لإضافة indexes محسنة
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_active ON users(auth_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_id_active ON users(id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_organization_id_role ON users(organization_id, role);

-- 10. إضافة comment للتوضيح
COMMENT ON FUNCTION rpc.check_user_permission_fast IS 'وظيفة سريعة للتحقق من صلاحيات المستخدم مع fallback mechanisms';
COMMENT ON FUNCTION rpc.get_user_basic_info IS 'وظيفة للحصول على المعلومات الأساسية للمستخدم';
COMMENT ON FUNCTION rpc.can_view_inventory IS 'وظيفة للتحقق من صلاحية عرض المخزون';

-- 11. تحديث إعدادات RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 12. إضافة trigger للتحديث التلقائي للصلاحيات
CREATE OR REPLACE FUNCTION update_user_permissions_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث raw_user_meta_data عند تغيير الصلاحيات
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    NEW.raw_user_meta_data = jsonb_set(
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      '{permissions}',
      NEW.permissions
    );
  END IF;
  
  -- تحديث raw_app_meta_data عند تغيير الدور
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.raw_app_meta_data = jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_permissions ON users;
CREATE TRIGGER trigger_update_user_permissions
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_permissions_trigger();

-- 13. إضافة comment للجدول
COMMENT ON TABLE users IS 'جدول المستخدمين مع نظام صلاحيات محسن';
COMMENT ON COLUMN users.permissions IS 'صلاحيات المستخدم بتنسيق JSONB مع fallback mechanisms';

-- 14. تحديث إحصائيات الجدول
ANALYZE users;
ANALYZE organizations;

-- رسالة نجاح
SELECT 'تم إصلاح صلاحيات الموظفين بنجاح!' as status;
