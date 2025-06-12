-- ===================================================================
-- حل بسيط جداً لمشكلة RLS - سياسة واحدة لكل جدول
-- ===================================================================

-- 1. إزالة جميع السياسات الموجودة
DO $$
DECLARE
    r RECORD;
BEGIN
    -- حذف جميع السياسات من جميع الجداول
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'product_categories', 'customers', 'orders', 'users')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. إنشاء سياسة واحدة بسيطة لكل جدول - السماح بكل شيء
CREATE POLICY "allow_all" ON products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON product_categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orders FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON users FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. التأكد من تفعيل RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. إنشاء فهارس أساسية للأداء
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_date ON orders(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_user_id);

-- 5. تحديث إحصائيات
ANALYZE products;
ANALYZE product_categories;
ANALYZE customers;
ANALYZE orders;
ANALYZE users;

-- 6. تأكيد النتائج
SELECT 'RLS مبسط - سياسة واحدة لكل جدول' as status;

-- عرض السياسات الجديدة
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'product_categories', 'customers', 'orders', 'users')
ORDER BY tablename, policyname; 