-- ملف تشغيل إصلاحات RLS للسماح للزوار بتقديم طلبات
-- يجب تشغيل هذا الملف في Supabase SQL Editor أو psql

-- بدء المعاملة
BEGIN;

SELECT '🚀 بدء إصلاح سياسات RLS للزوار...' as status;

-- ===== إصلاح جدول online_orders =====
SELECT '📦 إصلاح جدول online_orders...' as status;

-- حذف السياسة القديمة المقيدة
DROP POLICY IF EXISTS "Enable ALL for organization members on online_orders" ON public.online_orders;

-- إنشاء سياسة للسماح للزوار بإنشاء طلبات
CREATE POLICY "online_orders_public_insert" ON public.online_orders
    FOR INSERT
    WITH CHECK (true);

-- إنشاء سياسة للمنظمة لإدارة طلباتها
CREATE POLICY "online_orders_org_manage" ON public.online_orders
    FOR ALL
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

-- ===== إصلاح جدول online_order_items =====
SELECT '📋 إصلاح جدول online_order_items...' as status;

DROP POLICY IF EXISTS "online_order_items_public_insert" ON public.online_order_items;
DROP POLICY IF EXISTS "online_order_items_org_manage" ON public.online_order_items;

CREATE POLICY "online_order_items_public_insert" ON public.online_order_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "online_order_items_org_manage" ON public.online_order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM online_orders oo
            WHERE oo.id = online_order_items.order_id
            AND (
                oo.organization_id IN (
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
    );

-- ===== إصلاح جدول customers =====
SELECT '👥 إصلاح جدول customers...' as status;

DROP POLICY IF EXISTS "customers_public_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_org_manage" ON public.customers;

CREATE POLICY "customers_public_insert" ON public.customers
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "customers_org_manage" ON public.customers
    FOR ALL
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

-- ===== إصلاح جدول addresses =====
SELECT '📍 إصلاح جدول addresses...' as status;

DROP POLICY IF EXISTS "addresses_public_insert" ON public.addresses;
DROP POLICY IF EXISTS "addresses_org_manage" ON public.addresses;

CREATE POLICY "addresses_public_insert" ON public.addresses
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "addresses_org_manage" ON public.addresses
    FOR ALL
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

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- عرض السياسات النهائية للتأكيد
SELECT '📊 السياسات النهائية:' as status;
SELECT 
    tablename,
    policyname,
    cmd,
    CASE WHEN length(qual) > 40 THEN left(qual, 40) || '...' ELSE qual END as condition
FROM pg_policies 
WHERE tablename IN ('online_orders', 'online_order_items', 'customers', 'addresses')
ORDER BY tablename, policyname;

COMMIT;

SELECT '✅ تم إصلاح سياسات RLS بنجاح! الآن يمكن للزوار تقديم طلبات.' as result; 