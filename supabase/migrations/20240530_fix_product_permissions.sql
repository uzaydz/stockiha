-- إصلاح مشكلة صلاحيات المنتجات
-- تاريخ: 2024-05-30
-- الوصف: إصلاح مشكلة السماح للموظفين بتعديل وحذف وإضافة المنتجات رغم عدم امتلاكهم للصلاحيات المطلوبة

-- إزالة القاعدة القديمة التي تتجاهل صلاحيات المنتجات
DROP RULE IF EXISTS products_update_rule ON public.products;

-- حذف الدالة القديمة التي تتجاهل صلاحيات المنتجات
DROP FUNCTION IF EXISTS process_product_update;

-- حذف السياسات القديمة التي تتجاهل الصلاحيات
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Allow insert for all authenticated users" ON public.products;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_insert" ON public.products;

-- حذف السياسات الجديدة إذا كانت موجودة (لتجنب خطأ التكرار)
DROP POLICY IF EXISTS "product_update_policy_fixed" ON public.products;
DROP POLICY IF EXISTS "product_delete_policy_fixed" ON public.products;
DROP POLICY IF EXISTS "product_insert_policy_fixed" ON public.products;

-- إعادة إنشاء جميع سياسات التحكم في صلاحيات المنتجات
-- سياسة الإضافة (INSERT) مع التحقق من الصلاحيات
CREATE POLICY "product_insert_policy_fixed" ON public.products
FOR INSERT
WITH CHECK (
  -- يُسمح بالإضافة إذا كان المستخدم:
  -- 1. مدير منظمة (is_org_admin = true) أو
  -- 2. لديه صلاحية محددة لإضافة المنتجات (addProducts) أو
  -- 3. لديه صلاحية عامة لإدارة المنتجات (manageProducts)
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.organization_id = products.organization_id
      AND users.is_active = true
      AND (
        users.is_org_admin = true
        OR ((users.permissions->>'addProducts')::boolean = true)
        OR ((users.permissions->>'manageProducts')::boolean = true)
      )
  )
);

-- سياسة التحديث (UPDATE) مع التحقق من الصلاحيات
CREATE POLICY "product_update_policy_fixed" ON public.products
FOR UPDATE
USING (
  organization_id = ( 
    SELECT users.organization_id
    FROM users
    WHERE users.id = auth.uid()
  )
)
WITH CHECK (
  -- يُسمح بالتحديث إذا كان المستخدم:
  -- 1. مدير منظمة (is_org_admin = true) أو
  -- 2. لديه صلاحية محددة لتحرير المنتجات (editProducts) أو
  -- 3. لديه صلاحية عامة لإدارة المنتجات (manageProducts)
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.organization_id = products.organization_id
      AND users.is_active = true
      AND (
        users.is_org_admin = true
        OR ((users.permissions->>'editProducts')::boolean = true)
        OR ((users.permissions->>'manageProducts')::boolean = true)
      )
  )
);

-- سياسة الحذف (DELETE) مع التحقق من الصلاحيات
CREATE POLICY "product_delete_policy_fixed" ON public.products
FOR DELETE
USING (
  -- يُسمح بالحذف إذا كان المستخدم:
  -- 1. مدير منظمة (is_org_admin = true) أو
  -- 2. لديه صلاحية محددة لحذف المنتجات (deleteProducts) أو
  -- 3. لديه صلاحية عامة لإدارة المنتجات (manageProducts)
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.organization_id = products.organization_id
      AND users.is_active = true
      AND (
        users.is_org_admin = true
        OR ((users.permissions->>'deleteProducts')::boolean = true)
        OR ((users.permissions->>'manageProducts')::boolean = true)
      )
  )
);

-- تحديث دالة RPC للتحقق من صلاحيات تعديل المنتج
CREATE OR REPLACE FUNCTION can_edit_product(product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN products p ON p.organization_id = u.organization_id
    WHERE u.id = auth.uid()
      AND p.id = product_id
      AND u.is_active = true
      AND (
        u.is_org_admin = true
        OR ((u.permissions->>'editProducts')::boolean = true)
        OR ((u.permissions->>'manageProducts')::boolean = true)
        OR u.is_super_admin = true
      )
  ) INTO user_has_permission;
  
  RETURN user_has_permission;
END;
$$;

-- تحديث دالة RPC للتحقق من صلاحيات حذف المنتج
CREATE OR REPLACE FUNCTION can_delete_product(product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN products p ON p.organization_id = u.organization_id
    WHERE u.id = auth.uid()
      AND p.id = product_id
      AND u.is_active = true
      AND (
        u.is_org_admin = true
        OR ((u.permissions->>'deleteProducts')::boolean = true)
        OR ((u.permissions->>'manageProducts')::boolean = true)
        OR u.is_super_admin = true
      )
  ) INTO user_has_permission;
  
  RETURN user_has_permission;
END;
$$;

-- إنشاء دالة RPC للتحقق من صلاحيات إضافة المنتجات
CREATE OR REPLACE FUNCTION can_add_product()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (
        u.is_org_admin = true
        OR ((u.permissions->>'addProducts')::boolean = true)
        OR ((u.permissions->>'manageProducts')::boolean = true)
        OR u.is_super_admin = true
      )
  ) INTO user_has_permission;
  
  RETURN user_has_permission;
END;
$$;

COMMENT ON POLICY "product_insert_policy_fixed" ON public.products IS 'فقط المستخدمون الذين لديهم صلاحية إضافة المنتجات يمكنهم الإضافة';
COMMENT ON POLICY "product_update_policy_fixed" ON public.products IS 'فقط المستخدمون الذين لديهم صلاحية تعديل المنتجات يمكنهم التعديل';
COMMENT ON POLICY "product_delete_policy_fixed" ON public.products IS 'فقط المستخدمون الذين لديهم صلاحية حذف المنتجات يمكنهم الحذف'; 