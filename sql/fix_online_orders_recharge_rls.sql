-- إصلاح سياسات RLS لجداول إعادة شحن الطلبيات الإلكترونية
-- المشكلة: السياسات تستخدم current_setting('app.current_organization_id') غير المتوفر في Supabase

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow organizations to view their recharge history" ON online_orders_recharge_history;
DROP POLICY IF EXISTS "Allow admins full access to recharge history" ON online_orders_recharge_history;

-- إنشاء سياسات جديدة صحيحة
CREATE POLICY "Enable read access for authenticated users" ON online_orders_recharge_history
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Enable insert access for authenticated users" ON online_orders_recharge_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Enable update access for authenticated users" ON online_orders_recharge_history
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- إصلاح سياسات جدول organization_online_orders_limits
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON organization_online_orders_limits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON organization_online_orders_limits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON organization_online_orders_limits;

CREATE POLICY "Enable read access for authenticated users" ON organization_online_orders_limits
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Enable insert access for authenticated users" ON organization_online_orders_limits
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Enable update access for authenticated users" ON organization_online_orders_limits
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- إصلاح سياسات جدول online_orders_recharge_packages (قراءة فقط)
DROP POLICY IF EXISTS "Enable read access for all users" ON online_orders_recharge_packages;

CREATE POLICY "Enable read access for all users" ON online_orders_recharge_packages
    FOR SELECT
    TO authenticated
    USING (true);

-- التأكد من تفعيل RLS
ALTER TABLE online_orders_recharge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_online_orders_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_orders_recharge_packages ENABLE ROW LEVEL SECURITY;

-- إضافة تعليق توضيحي
COMMENT ON TABLE online_orders_recharge_history IS 'تم إصلاح سياسات RLS لاستخدام auth.uid() بدلاً من current_setting';
COMMENT ON TABLE organization_online_orders_limits IS 'تم إصلاح سياسات RLS لاستخدام auth.uid() بدلاً من current_setting';
COMMENT ON TABLE online_orders_recharge_packages IS 'تم إصلاح سياسات RLS لاستخدام auth.uid() بدلاً من current_setting';
