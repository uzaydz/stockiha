-- إصلاح صلاحيات حذف المنتجات
-- Fix product deletion permissions

-- 1. حذف جميع السياسات القديمة أولاً
DROP POLICY IF EXISTS "product_delete_policy" ON public.products;
DROP POLICY IF EXISTS "product_update_policy" ON public.products;
DROP POLICY IF EXISTS "super_admin_products_policy" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_delete" ON public.products;
DROP POLICY IF EXISTS "Enable delete for users with deleteProducts permission" ON public.products;
DROP POLICY IF EXISTS "Enable delete for organization admins" ON public.products;

-- 2. إنشاء سياسة موحدة للحذف
CREATE POLICY "products_delete_policy" ON public.products
FOR DELETE
USING (
  -- التحقق من أن المستخدم ينتمي لنفس المنظمة
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
  AND (
    -- التحقق من الصلاحيات
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.is_active = true
        AND (
          -- مدير منظمة
          users.is_org_admin = true
          -- أو لديه صلاحية حذف المنتجات
          OR (users.permissions->>'deleteProducts')::boolean = true
          -- أو لديه صلاحية إدارة المنتجات
          OR (users.permissions->>'manageProducts')::boolean = true
          -- أو مدير عام
          OR users.is_super_admin = true
        )
    )
  )
);

-- 3. إنشاء سياسة موحدة للتحديث
CREATE POLICY "products_update_policy" ON public.products
FOR UPDATE
USING (
  -- التحقق من أن المستخدم ينتمي لنفس المنظمة
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  -- التحقق من الصلاحيات
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.is_active = true
      AND (
        -- مدير منظمة
        users.is_org_admin = true
        -- أو لديه صلاحية تعديل المنتجات
        OR (users.permissions->>'editProducts')::boolean = true
        -- أو لديه صلاحية إدارة المنتجات
        OR (users.permissions->>'manageProducts')::boolean = true
        -- أو مدير عام
        OR users.is_super_admin = true
      )
  )
);

-- 4. إنشاء سياسة خاصة للمدير العام
CREATE POLICY "products_super_admin_all" ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- 5. إنشاء دالة للتحقق من صلاحية الحذف
CREATE OR REPLACE FUNCTION check_product_delete_permission(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_product_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_delete_permission BOOLEAN;
  v_has_manage_permission BOOLEAN;
  v_is_super_admin BOOLEAN;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- الحصول على معلومات المستخدم
  SELECT 
    organization_id,
    is_org_admin,
    (permissions->>'deleteProducts')::boolean,
    (permissions->>'manageProducts')::boolean,
    is_super_admin
  INTO 
    v_org_id,
    v_is_admin,
    v_has_delete_permission,
    v_has_manage_permission,
    v_is_super_admin
  FROM users
  WHERE id = v_user_id
    AND is_active = true;
  
  -- إذا لم يتم العثور على المستخدم
  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- الحصول على منظمة المنتج
  SELECT organization_id
  INTO v_product_org_id
  FROM products
  WHERE id = p_product_id;
  
  -- التحقق من أن المنتج ينتمي لنفس المنظمة
  IF v_product_org_id != v_org_id THEN
    RETURN FALSE;
  END IF;
  
  -- التحقق من الصلاحيات
  RETURN (
    v_is_super_admin = true
    OR v_is_admin = true
    OR v_has_delete_permission = true
    OR v_has_manage_permission = true
  );
END;
$$;

-- 6. منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION check_product_delete_permission(UUID) TO authenticated;

-- 7. إنشاء دالة للتحقق من الصلاحيات وإرجاع تفاصيل
CREATE OR REPLACE FUNCTION debug_product_permissions(p_product_id UUID)
RETURNS TABLE (
  user_id UUID,
  organization_id UUID,
  product_org_id UUID,
  is_org_admin BOOLEAN,
  has_delete_permission BOOLEAN,
  has_manage_permission BOOLEAN,
  is_super_admin BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.organization_id,
    p.organization_id as product_org_id,
    u.is_org_admin,
    (u.permissions->>'deleteProducts')::boolean as has_delete_permission,
    (u.permissions->>'manageProducts')::boolean as has_manage_permission,
    u.is_super_admin,
    check_product_delete_permission(p_product_id) as can_delete
  FROM users u
  CROSS JOIN products p
  WHERE u.id = auth.uid()
    AND p.id = p_product_id;
END;
$$;

-- 8. منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION debug_product_permissions(UUID) TO authenticated;

-- 9. تحديث الصلاحيات للمستخدمين الحاليين (اختياري)
-- يمكنك تشغيل هذا الأمر لمنح صلاحية الحذف لجميع المدراء
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{deleteProducts}',
  'true'
)
WHERE is_org_admin = true
  AND (permissions->>'deleteProducts') IS NULL;

-- 10. عرض معلومات التحقق
SELECT 
  'تم إنشاء السياسات بنجاح' as message,
  COUNT(*) as policies_count
FROM pg_policies
WHERE tablename = 'products';