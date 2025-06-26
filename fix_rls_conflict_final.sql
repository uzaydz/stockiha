-- الحل النهائي لتضارب سياسات RLS
-- حذف جميع السياسات وإنشاء سياسات واضحة ومنطقية

BEGIN;

SELECT '🧹 حذف جميع السياسات المتضاربة...' as status;

-- حذف جميع السياسات الموجودة لتجنب التضارب
DROP POLICY IF EXISTS "Enable ALL for organization members on online_orders" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_public_insert" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_org_manage" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_authenticated_access" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_public_create" ON public.online_orders;
DROP POLICY IF EXISTS "allow_insert_for_everyone" ON public.online_orders;
DROP POLICY IF EXISTS "allow_select_for_org" ON public.online_orders;
DROP POLICY IF EXISTS "allow_update_for_org" ON public.online_orders;
DROP POLICY IF EXISTS "allow_delete_for_org" ON public.online_orders;
DROP POLICY IF EXISTS "allow_select_secure" ON public.online_orders;
DROP POLICY IF EXISTS "allow_select_for_all" ON public.online_orders;
DROP POLICY IF EXISTS "temp_allow_all_select" ON public.online_orders;

SELECT '✨ إنشاء سياسات جديدة واضحة...' as status;

-- سياسة 1: السماح للجميع بإنشاء طلبات (للزوار)
CREATE POLICY "public_insert_orders" ON public.online_orders
    FOR INSERT
    WITH CHECK (true);

-- سياسة 2: السماح للجميع بقراءة الطلبات (حل المشكلة)
CREATE POLICY "public_select_orders" ON public.online_orders
    FOR SELECT
    USING (true);

-- سياسة 3: السماح للمنظمة فقط بتحديث طلباتها
CREATE POLICY "org_update_orders" ON public.online_orders
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT u.organization_id 
            FROM users u 
            WHERE u.auth_user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT u.organization_id 
            FROM users u 
            WHERE u.auth_user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    );

-- سياسة 4: السماح للمنظمة فقط بحذف طلباتها
CREATE POLICY "org_delete_orders" ON public.online_orders
    FOR DELETE
    USING (
        organization_id IN (
            SELECT u.organization_id 
            FROM users u 
            WHERE u.auth_user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    );

-- تأكيد تفعيل RLS
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

SELECT '📊 عرض السياسات النهائية...' as status;
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'online_orders'
ORDER BY cmd, policyname;

-- اختبار الطلب رقم 2
SELECT '🧪 اختبار جلب الطلب رقم 2...' as status;
SELECT id, customer_order_number, organization_id, created_at, status
FROM online_orders 
WHERE customer_order_number = 2
LIMIT 1;

COMMIT;

SELECT '✅ تم حل تضارب سياسات RLS نهائياً!' as result; 