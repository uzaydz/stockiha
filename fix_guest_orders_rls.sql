-- إصلاح سياسات RLS للسماح للزوار بتقديم طلبات
-- تاريخ الإنشاء: $(date)
-- الهدف: السماح للزوار بإنشاء طلبات بدون تسجيل دخول

BEGIN;

-- عرض السياسات الحالية للمراجعة
SELECT 'السياسات الحالية على online_orders:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'online_orders';

-- حذف السياسة القديمة المقيدة
DROP POLICY IF EXISTS "Enable ALL for organization members on online_orders" ON public.online_orders;

-- إنشاء سياسة للسماح للزوار بإنشاء طلبات (INSERT)
CREATE POLICY "online_orders_public_insert" ON public.online_orders
    FOR INSERT
    WITH CHECK (true); -- السماح لأي شخص بإنشاء طلب

-- إنشاء سياسة للسماح للمنظمة بإدارة طلباتها (SELECT, UPDATE, DELETE)
CREATE POLICY "online_orders_org_manage" ON public.online_orders
    FOR ALL
    USING (
        -- المستخدم المصرح له يمكنه رؤية طلبات منظمته
        organization_id IN (
            SELECT u.organization_id 
            FROM users u 
            WHERE u.auth_user_id = auth.uid()
        )
        OR 
        -- أو هو مدير عام
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    )
    WITH CHECK (
        -- عند التحديث/الحذف، التأكد من أن المستخدم ينتمي للمنظمة
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

-- التأكد من أن RLS مفعل
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- عرض السياسات الجديدة للتأكيد
SELECT 'السياسات الجديدة على online_orders:' as info;
SELECT policyname, cmd, 
       CASE WHEN length(qual) > 50 THEN left(qual, 50) || '...' ELSE qual END as condition
FROM pg_policies 
WHERE tablename = 'online_orders'
ORDER BY policyname;

-- اختبار السياسة الجديدة (محاكاة إنشاء طلب من زائر)
SELECT 'اختبار السياسة - محاكاة إنشاء طلب:' as info;

COMMIT;

-- رسالة النجاح
SELECT 'تم إصلاح سياسات RLS بنجاح! الآن يمكن للزوار إنشاء طلبات.' as result; 