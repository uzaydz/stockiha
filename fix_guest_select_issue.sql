-- حل مشكلة قراءة الطلبات للزوار
-- السماح للزوار بقراءة الطلبات التي أنشأوها للتو

BEGIN;

SELECT '🔧 إصلاح سياسة SELECT للزوار...' as status;

-- حذف سياسة SELECT القديمة
DROP POLICY IF EXISTS "allow_select_for_org" ON public.online_orders;

-- إنشاء سياسة SELECT جديدة تسمح للزوار بقراءة الطلبات أيضاً
CREATE POLICY "allow_select_for_all" ON public.online_orders
    FOR SELECT
    USING (
        -- السماح للزوار بقراءة الطلبات (للتحقق من الطلب الذي أنشأوه)
        true
        OR
        -- أو المستخدمين المصرحين من نفس المنظمة
        organization_id IN (
            SELECT u.organization_id 
            FROM users u 
            WHERE u.auth_user_id = auth.uid()
        )
        OR 
        -- أو المدير العام
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    );

SELECT '📋 عرض السياسات الحالية...' as status;
SELECT policyname, cmd, 
       CASE WHEN length(qual) > 50 THEN left(qual, 50) || '...' ELSE qual END as condition
FROM pg_policies 
WHERE tablename = 'online_orders'
ORDER BY cmd, policyname;

COMMIT;

SELECT '✅ تم إصلاح مشكلة قراءة الطلبات للزوار!' as result; 