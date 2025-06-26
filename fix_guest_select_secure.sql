-- حل آمن لمشكلة قراءة الطلبات للزوار
-- السماح للزوار بقراءة الطلبات الحديثة فقط (آخر ساعة)

BEGIN;

SELECT '🔧 إصلاح سياسة SELECT بشكل آمن...' as status;

-- حذف سياسة SELECT القديمة
DROP POLICY IF EXISTS "allow_select_for_org" ON public.online_orders;
DROP POLICY IF EXISTS "allow_select_for_all" ON public.online_orders;

-- إنشاء سياسة SELECT آمنة
CREATE POLICY "allow_select_secure" ON public.online_orders
    FOR SELECT
    USING (
        -- السماح للمستخدمين المصرحين من نفس المنظمة
        (
            auth.uid() IS NOT NULL 
            AND (
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
        )
        OR
        -- أو السماح للزوار بقراءة الطلبات الحديثة (آخر ساعة فقط)
        (
            auth.uid() IS NULL 
            AND created_at >= NOW() - INTERVAL '1 hour'
        )
    );

SELECT '📋 عرض السياسات الحالية...' as status;
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'online_orders'
ORDER BY cmd, policyname;

COMMIT;

SELECT '✅ تم إصلاح مشكلة قراءة الطلبات بشكل آمن!' as result; 