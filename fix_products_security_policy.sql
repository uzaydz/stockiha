-- حل مشكلة انتهاك سياسة الأمان في جدول المنتجات
-- Fix for "row-level security policy violation" error when creating products

-- 1. التحقق من وجود الدالة المساعدة وإنشاؤها إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION public.get_current_user_org_info()
RETURNS TABLE(org_id UUID, is_admin BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    organization_id as org_id, 
    COALESCE(is_org_admin, false) as is_admin
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 2. إنشاء دالة للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION public.user_can_manage_products()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (
        u.is_org_admin = true
        OR u.is_super_admin = true
        OR ((u.permissions->>'manageProducts')::boolean = true)
        OR ((u.permissions->>'addProducts')::boolean = true)
      )
  );
$$;

-- 3. حذف السياسات المتضاربة القديمة
DROP POLICY IF EXISTS "product_insert_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "product_update_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "product_delete_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_insert" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_update" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_delete" ON public.products;

-- 4. إنشاء سياسات جديدة مبسطة وواضحة

-- سياسة الإضافة (INSERT) - مبسطة ومرنة
CREATE POLICY "products_insert_policy" ON public.products
FOR INSERT
WITH CHECK (
  -- التحقق من أن المستخدم مسجل دخول
  auth.uid() IS NOT NULL
  AND
  -- التحقق من أن organization_id يطابق مؤسسة المستخدم أو أن المستخدم مدير عام
  (
    organization_id = (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  )
  AND
  -- التحقق من أن المستخدم لديه صلاحيات إضافة المنتجات
  (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_active = true
        AND (
          u.is_org_admin = true
          OR u.is_super_admin = true
          OR ((u.permissions->>'manageProducts')::boolean = true)
          OR ((u.permissions->>'addProducts')::boolean = true)
        )
    )
  )
);

-- سياسة التحديث (UPDATE)
CREATE POLICY "products_update_policy" ON public.products
FOR UPDATE
USING (
  -- التحقق من أن المستخدم في نفس المؤسسة أو مدير عام
  organization_id = (
    SELECT organization_id 
    FROM public.users 
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
)
WITH CHECK (
  -- التحقق من أن organization_id لا يتم تغييره إلى مؤسسة أخرى
  organization_id = (
    SELECT organization_id 
    FROM public.users 
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
);

-- سياسة الحذف (DELETE)
CREATE POLICY "products_delete_policy" ON public.products
FOR DELETE
USING (
  -- التحقق من أن المستخدم في نفس المؤسسة أو مدير عام
  (
    organization_id = (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  )
  AND
  -- التحقق من صلاحيات الحذف
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (
        u.is_org_admin = true
        OR u.is_super_admin = true
        OR ((u.permissions->>'manageProducts')::boolean = true)
        OR ((u.permissions->>'deleteProducts')::boolean = true)
      )
  )
);

-- 5. إنشاء دالة RPC لإنشاء منتج بأمان
CREATE OR REPLACE FUNCTION public.create_product_safely(
  product_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_product_id UUID;
  user_org_id UUID;
  user_has_permission BOOLEAN;
BEGIN
  -- التحقق من أن المستخدم مسجل دخول
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لإنشاء منتج';
  END IF;
  
  -- الحصول على معرف مؤسسة المستخدم
  SELECT organization_id INTO user_org_id
  FROM public.users
  WHERE id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن تحديد مؤسستك. يرجى التحقق من حسابك';
  END IF;
  
  -- التحقق من صلاحيات المستخدم
  SELECT public.user_can_manage_products() INTO user_has_permission;
  
  IF NOT user_has_permission THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإنشاء منتجات';
  END IF;
  
  -- إنشاء معرف جديد للمنتج
  new_product_id := gen_random_uuid();
  
  -- إدراج المنتج مع ضمان استخدام معرف المؤسسة الصحيح
  INSERT INTO public.products (
    id,
    name,
    description,
    price,
    purchase_price,
    compare_at_price,
    sku,
    barcode,
    category_id,
    subcategory_id,
    brand,
    stock_quantity,
    thumbnail_image,
    images,
    is_digital,
    is_featured,
    is_new,
    has_variants,
    show_price_on_landing,
    wholesale_price,
    partial_wholesale_price,
    min_wholesale_quantity,
    min_partial_wholesale_quantity,
    allow_retail,
    allow_wholesale,
    allow_partial_wholesale,
    features,
    specifications,
    organization_id,
    slug,
    is_active,
    created_by_user_id,
    updated_by_user_id
  ) VALUES (
    new_product_id,
    COALESCE(product_data->>'name', 'منتج جديد'),
    COALESCE(product_data->>'description', ''),
    COALESCE((product_data->>'price')::numeric, 0),
    COALESCE((product_data->>'purchase_price')::numeric, 0),
    (product_data->>'compare_at_price')::numeric,
    COALESCE(product_data->>'sku', ''),
    product_data->>'barcode',
    (product_data->>'category_id')::uuid,
    (product_data->>'subcategory_id')::uuid,
    product_data->>'brand',
    COALESCE((product_data->>'stock_quantity')::integer, 0),
    COALESCE(product_data->>'thumbnail_image', ''),
    CASE 
      WHEN product_data->'images' IS NOT NULL 
      THEN array(SELECT jsonb_array_elements_text(product_data->'images'))
      ELSE '{}'::text[]
    END,
    COALESCE((product_data->>'is_digital')::boolean, false),
    COALESCE((product_data->>'is_featured')::boolean, false),
    COALESCE((product_data->>'is_new')::boolean, true),
    COALESCE((product_data->>'has_variants')::boolean, false),
    COALESCE((product_data->>'show_price_on_landing')::boolean, true),
    (product_data->>'wholesale_price')::numeric,
    (product_data->>'partial_wholesale_price')::numeric,
    (product_data->>'min_wholesale_quantity')::integer,
    (product_data->>'min_partial_wholesale_quantity')::integer,
    COALESCE((product_data->>'allow_retail')::boolean, true),
    COALESCE((product_data->>'allow_wholesale')::boolean, false),
    COALESCE((product_data->>'allow_partial_wholesale')::boolean, false),
    COALESCE(
      CASE 
        WHEN product_data->'features' IS NOT NULL 
        THEN array(SELECT jsonb_array_elements_text(product_data->'features'))
        ELSE '{}'::text[]
      END,
      '{}'::text[]
    ),
    COALESCE(product_data->'specifications', '{}'::jsonb),
    user_org_id, -- استخدام معرف مؤسسة المستخدم
    COALESCE(
      product_data->>'slug', 
      lower(replace(COALESCE(product_data->>'name', 'product'), ' ', '-')) || '-' || extract(epoch from now())::text
    ),
    COALESCE((product_data->>'is_active')::boolean, true),
    auth.uid(),
    auth.uid()
  );
  
  RETURN new_product_id;
END;
$$;

-- 6. إنشاء دالة للتحقق من حالة سياسات الأمان
CREATE OR REPLACE FUNCTION public.check_products_security_status()
RETURNS TABLE(
  policy_name TEXT,
  policy_type TEXT,
  is_enabled BOOLEAN,
  description TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    policyname as policy_name,
    cmd as policy_type,
    true as is_enabled,
    CASE 
      WHEN cmd = 'INSERT' THEN 'سياسة إضافة المنتجات'
      WHEN cmd = 'UPDATE' THEN 'سياسة تحديث المنتجات'
      WHEN cmd = 'DELETE' THEN 'سياسة حذف المنتجات'
      WHEN cmd = 'SELECT' THEN 'سياسة عرض المنتجات'
      ELSE 'سياسة عامة'
    END as description
  FROM pg_policies 
  WHERE tablename = 'products'
  ORDER BY cmd, policyname;
$$;

-- 7. إضافة تعليقات توضيحية
COMMENT ON FUNCTION public.create_product_safely(JSONB) IS 'دالة آمنة لإنشاء المنتجات مع التحقق من الصلاحيات';
COMMENT ON FUNCTION public.user_can_manage_products() IS 'التحقق من صلاحيات المستخدم لإدارة المنتجات';
COMMENT ON FUNCTION public.get_current_user_org_info() IS 'الحصول على معلومات مؤسسة المستخدم الحالي';

-- 8. إنشاء مؤشرات للتحسين
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON public.users(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_permissions ON public.users(organization_id, is_org_admin, is_active);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON public.products(organization_id, is_active);

-- 9. تحديث إعدادات RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 10. إنشاء دالة لاختبار إنشاء منتج
CREATE OR REPLACE FUNCTION public.test_product_creation()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_result TEXT;
  user_info RECORD;
BEGIN
  -- التحقق من حالة المستخدم
  SELECT 
    id,
    organization_id,
    is_org_admin,
    is_active,
    permissions
  INTO user_info
  FROM public.users
  WHERE id = auth.uid();
  
  IF user_info.id IS NULL THEN
    RETURN 'خطأ: لا يوجد مستخدم مسجل دخول';
  END IF;
  
  IF user_info.organization_id IS NULL THEN
    RETURN 'خطأ: المستخدم غير مرتبط بأي مؤسسة';
  END IF;
  
  IF NOT user_info.is_active THEN
    RETURN 'خطأ: حساب المستخدم غير نشط';
  END IF;
  
  IF NOT public.user_can_manage_products() THEN
    RETURN 'خطأ: المستخدم لا يملك صلاحيات إدارة المنتجات';
  END IF;
  
  RETURN 'نجح: المستخدم يمكنه إنشاء المنتجات';
END;
$$; 