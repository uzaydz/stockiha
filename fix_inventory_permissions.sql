-- إصلاح صلاحيات المخزون والتحقق منها
-- تاريخ: 2023-05-22

-- تحديث صلاحيات المستخدم الحالي للتأكد من أن له صلاحيات عرض المخزون
UPDATE users
SET 
  permissions = jsonb_set(permissions, '{viewInventory}', 'true'::jsonb),
  role = 'employee',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{permissions}',
    COALESCE(permissions, '{}'::jsonb)
  ),
  raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{permissions}',
      COALESCE(permissions, '{}'::jsonb)
    ),
    '{role}',
    '"employee"'::jsonb
  )
WHERE 
  email = 'uzaydzx0x@gmail.com';

-- إضافة وظيفة RPC جديدة للتحقق من صلاحية عرض المخزون
CREATE OR REPLACE FUNCTION rpc.can_view_inventory()
RETURNS boolean
SECURITY INVOKER
AS $$
DECLARE
  current_user_id uuid;
  user_record record;
  user_permissions jsonb;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  current_user_id := auth.uid();
  
  -- جلب بيانات المستخدم
  SELECT * INTO user_record FROM public.users WHERE id = current_user_id;
  
  IF user_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- التحقق من مدير النظام
  IF user_record.is_super_admin = true THEN
    RETURN true;
  END IF;
  
  -- التحقق من مدير المنظمة
  IF user_record.is_org_admin = true THEN
    RETURN true;
  END IF;
  
  -- التحقق من الدور
  IF user_record.role IN ('admin', 'owner') THEN
    RETURN true;
  END IF;
  
  -- جلب صلاحيات المستخدم
  user_permissions := user_record.permissions;
  
  -- التحقق من وجود صلاحيات للمخزون
  IF user_permissions ? 'viewInventory' AND (user_permissions->>'viewInventory')::boolean = true THEN
    RETURN true;
  END IF;
  
  IF user_permissions ? 'manageInventory' AND (user_permissions->>'manageInventory')::boolean = true THEN
    RETURN true;
  END IF;
  
  IF user_permissions ? 'manageProducts' AND (user_permissions->>'manageProducts')::boolean = true THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- إنشاء موظف جديد مع صلاحية عرض المخزون
INSERT INTO users (
  id, 
  email, 
  name, 
  role, 
  is_active, 
  created_at, 
  updated_at, 
  organization_id,
  permissions
)
VALUES (
  gen_random_uuid(), 
  'inventory_viewer@example.com', 
  'موظف المخزون', 
  'employee', 
  true, 
  NOW(), 
  NOW(), 
  (SELECT organization_id FROM users WHERE email = 'uzaydzx0x@gmail.com' LIMIT 1),
  jsonb_build_object(
    'viewInventory', true,
    'manageInventory', false,
    'viewProducts', true,
    'accessPOS', true,
    'viewOrders', true
  )
)
ON CONFLICT (email) DO UPDATE
SET 
  permissions = jsonb_build_object(
    'viewInventory', true,
    'manageInventory', false,
    'viewProducts', true,
    'accessPOS', true,
    'viewOrders', true
  ),
  updated_at = NOW();

-- حل مشكلة عدم تناسق البيانات الوصفية مع الصلاحيات
-- هذا الإجراء سينسخ الصلاحيات من حقل permissions إلى metadata لجميع المستخدمين
UPDATE users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{permissions}',
    COALESCE(permissions, '{}'::jsonb)
  ),
  raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{permissions}',
      COALESCE(permissions, '{}'::jsonb)
    ),
    '{role}',
    to_jsonb(role)
  )
WHERE 
  permissions IS NOT NULL;