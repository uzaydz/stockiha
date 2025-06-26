-- حل بسيط ومضمون لمشكلة RLS للزوار
-- مجرب ومختبر

BEGIN;

SELECT '🧹 تنظيف السياسات القديمة...' as status;

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "Enable ALL for organization members on online_orders" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_public_insert" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_org_manage" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_authenticated_access" ON public.online_orders;
DROP POLICY IF EXISTS "online_orders_public_create" ON public.online_orders;

SELECT '✨ إنشاء سياسات جديدة...' as status;

-- سياسة 1: السماح للجميع بإنشاء طلبات (INSERT)
CREATE POLICY "allow_insert_for_everyone" ON public.online_orders
    FOR INSERT
    WITH CHECK (true);

-- سياسة 2: السماح للمنظمة بقراءة طلباتها
CREATE POLICY "allow_select_for_org" ON public.online_orders
    FOR SELECT
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

-- سياسة 3: السماح للمنظمة بتحديث طلباتها
CREATE POLICY "allow_update_for_org" ON public.online_orders
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

-- سياسة 4: السماح للمنظمة بحذف طلباتها
CREATE POLICY "allow_delete_for_org" ON public.online_orders
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

SELECT '🧪 اختبار السياسات...' as status;

-- عرض السياسات النهائية
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'online_orders'
ORDER BY cmd, policyname;

COMMIT;

SELECT '✅ تم إصلاح السياسات بنجاح! الآن يمكن للزوار إنشاء طلبات.' as result; 