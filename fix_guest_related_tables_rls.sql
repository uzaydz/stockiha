-- إصلاح سياسات RLS للجداول المرتبطة بطلبات الزوار
-- الهدف: السماح بإنشاء customer, address, order_items للزوار

BEGIN;

-- ===== إصلاح جدول customers =====
SELECT 'إصلاح جدول customers...' as info;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "customers_public_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_org_manage" ON public.customers;

-- السماح للزوار بإنشاء حسابات عملاء
CREATE POLICY "customers_public_insert" ON public.customers
    FOR INSERT
    WITH CHECK (true);

-- السماح للمنظمة بإدارة عملائها
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
SELECT 'إصلاح جدول addresses...' as info;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "addresses_public_insert" ON public.addresses;
DROP POLICY IF EXISTS "addresses_org_manage" ON public.addresses;

-- السماح للزوار بإنشاء عناوين
CREATE POLICY "addresses_public_insert" ON public.addresses
    FOR INSERT
    WITH CHECK (true);

-- السماح للمنظمة بإدارة العناوين
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

-- ===== إصلاح جدول online_order_items =====
SELECT 'إصلاح جدول online_order_items...' as info;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "online_order_items_public_insert" ON public.online_order_items;
DROP POLICY IF EXISTS "online_order_items_org_manage" ON public.online_order_items;

-- السماح للزوار بإنشاء عناصر الطلب
CREATE POLICY "online_order_items_public_insert" ON public.online_order_items
    FOR INSERT
    WITH CHECK (true);

-- السماح للمنظمة بإدارة عناصر الطلبات
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

-- ===== إصلاح جدول guest_customers =====
SELECT 'إصلاح جدول guest_customers...' as info;

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "guest_customers_public_insert" ON public.guest_customers;
DROP POLICY IF EXISTS "guest_customers_org_manage" ON public.guest_customers;

-- السماح للزوار بإنشاء بيانات ضيف
CREATE POLICY "guest_customers_public_insert" ON public.guest_customers
    FOR INSERT
    WITH CHECK (true);

-- السماح للمنظمة بقراءة بيانات الضيوف
CREATE POLICY "guest_customers_org_read" ON public.guest_customers
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

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_customers ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'تم إصلاح جميع الجداول المرتبطة بطلبات الزوار بنجاح!' as result; 