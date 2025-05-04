-- misc_fixes.sql

-- ===== إصلاح خطأ الصلاحية في تهيئة إعدادات المتجر =====

CREATE OR REPLACE FUNCTION public.initialize_store_settings(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- احتفظ بـ SECURITY DEFINER للسماح بالإدراج
AS $function$
BEGIN
  -- تمت إزالة فحص الصلاحيات المسبب للمشاكل
  -- كان يعتمد على auth.uid() الذي يكون فارغًا عند استدعائه بواسطة service_role

  -- إضافة مكون الهيرو الافتراضي مع الأنماط الجديدة للأزرار
  INSERT INTO store_settings (
    organization_id,
    component_type,
    settings,
    order_index
  ) VALUES (
    p_organization_id,
    'hero',
    '{"title": "أحدث المنتجات", "description": "تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.", "primaryButton": {"text": "تصفح الكل", "link": "/products"}, "primaryButtonStyle": "primary", "secondaryButton": {"text": "العروض الخاصة", "link": "/offers"}, "secondaryButtonStyle": "primary", "imageUrl": "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop", "trustBadges": [{"id": "1", "text": "توصيل سريع", "icon": "Truck"}, {"id": "2", "text": "دفع آمن", "icon": "ShieldCheck"}, {"id": "3", "text": "جودة عالية", "icon": "Gem"}]}',
    1
  ) ON CONFLICT (organization_id, component_type) DO NOTHING; -- أضف ON CONFLICT للسلامة

  -- إضافة باقي المكونات (مع ON CONFLICT)
  INSERT INTO store_settings (
    organization_id,
    component_type,
    settings,
    order_index
  ) VALUES (
    p_organization_id,
    'categories',
    '{"title": "تصفح فئات منتجاتنا", "description": "أفضل الفئات المختارة لتلبية احتياجاتك", "displayCount": 6, "displayType": "grid"}',
    2
  ) ON CONFLICT (organization_id, component_type) DO NOTHING;

  INSERT INTO store_settings (
    organization_id,
    component_type,
    settings,
    order_index
  ) VALUES (
    p_organization_id,
    'featured_products',
    '{"title": "منتجاتنا المميزة", "description": "اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك", "displayCount": 4, "displayType": "grid", "selectionCriteria": "featured"}',
    3
  ) ON CONFLICT (organization_id, component_type) DO NOTHING;

  RETURN TRUE;
END;
$function$;


-- ===== تنظيف وإصلاح سياسات RLS لجدول products =====

-- 1. إزالة السياسات المتعارضة/المكررة/غير الآمنة
DROP POLICY IF EXISTS "Allow public read access for products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products; -- سيتم استبدالها
DROP POLICY IF EXISTS "org_tenant_products_select" ON public.products; -- سيتم استبدالها
DROP POLICY IF EXISTS "product_delete_policy" ON public.products; -- مكررة
DROP POLICY IF EXISTS "product_update_policy" ON public.products; -- مكررة
DROP POLICY IF EXISTS "Allow super admin access to all products" ON public.products; -- مكررة

-- 2. إعادة إنشاء/تحديث السياسات الأساسية باستخدام الدالة المساعدة وتصحيح الأذونات

-- سياسة SELECT الأساسية للمستخدمين في نفس المؤسسة (باستخدام الدالة المساعدة)
-- ملاحظة: تأكد من وجود الدالة get_current_user_org_info() من ملف rls_fixes.sql
DROP POLICY IF EXISTS "products_select_policy" ON public.products; -- اسم جديد لتجنب التعارض
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT
USING (
    organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
    -- يمكنك إضافة شروط إضافية هنا إذا لزم الأمر، مثل التحقق من أن المستخدم نشط
    -- AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active = true)
);

-- سياسة INSERT (مقيدة)
DROP POLICY IF EXISTS "product_insert_policy_fixed" ON public.products;
CREATE POLICY "product_insert_policy_restricted" ON public.products
FOR INSERT
WITH CHECK (
    -- يجب أن يكون المستخدم في نفس المؤسسة التي يتم إدراج المنتج لها
    organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
    -- ويجب أن يكون لديه الصلاحية المناسبة (مسؤول أو لديه صلاحية إدارة المنتجات)
    AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.organization_id = public.products.organization_id
          AND u.is_active = true
          AND (
               u.is_org_admin = true
            OR (u.permissions->>'manageProducts')::boolean = true
          )
    )
);

-- سياسة UPDATE (محدثة لاستخدام الدالة المساعدة)
DROP POLICY IF EXISTS "product_update_policy_fixed" ON public.products;
CREATE POLICY "product_update_policy_restricted" ON public.products
FOR UPDATE
USING (
    -- يجب أن يكون المستخدم في نفس المؤسسة التي يتم تحديث المنتج لها
    organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
    -- ويجب أن يكون لديه الصلاحية المناسبة (مسؤول أو لديه صلاحية إدارة المنتجات)
    AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.organization_id = public.products.organization_id
          AND u.is_active = true
          AND (
               u.is_org_admin = true
            OR (u.permissions->>'manageProducts')::boolean = true
          )
    )
)
WITH CHECK (
    -- تأكد من أن organization_id لا يتم تغييره إلى مؤسسة أخرى
    organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
);


-- سياسة DELETE (محدثة لاستخدام الدالة المساعدة)
DROP POLICY IF EXISTS "product_delete_policy_fixed" ON public.products;
CREATE POLICY "product_delete_policy_restricted" ON public.products
FOR DELETE
USING (
    -- يجب أن يكون المستخدم في نفس المؤسسة التي يتم حذف المنتج لها
    organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
    -- ويجب أن يكون لديه الصلاحية المناسبة (مسؤول أو لديه صلاحية إدارة/حذف المنتجات)
    AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.organization_id = public.products.organization_id
          AND u.is_active = true
          AND (
               u.is_org_admin = true
            OR (u.permissions->>'manageProducts')::boolean = true
            OR (u.permissions->>'deleteProducts')::boolean = true -- يمكن أن تكون صلاحية منفصلة
          )
    )
);

-- سياسة المشرف العام (ALL) - أبقيناها كما هي ولكن تأكد من عدم تكرارها
DROP POLICY IF EXISTS "super_admin_products_policy" ON public.products; -- أزلنا التعليق للتأكد من الحذف قبل الإنشاء
CREATE POLICY "super_admin_products_policy" ON public.products
FOR ALL -- لجميع الأوامر (SELECT, INSERT, UPDATE, DELETE)
USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
); 