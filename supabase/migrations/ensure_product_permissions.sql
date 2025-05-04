-- حذف السياسات المتداخلة القديمة التي قد تسبب تضاربًا
DROP POLICY IF EXISTS "Allow delete for admin users" ON public.products;
DROP POLICY IF EXISTS "Allow update for admin users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_delete" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_update" ON public.products;

-- تحديث سياسة التحديث (UPDATE)
CREATE POLICY "product_update_policy" ON public.products
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

-- تحديث سياسة الحذف (DELETE)
CREATE POLICY "product_delete_policy" ON public.products
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

-- سياسة خاصة للمدير العام (Super Admin)
CREATE POLICY "super_admin_products_policy" ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- إنشاء وظيفة RPC للتحقق من صلاحيات تعديل المنتج
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

-- إنشاء وظيفة RPC للتحقق من صلاحيات حذف المنتج
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