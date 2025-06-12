-- إصلاح شامل لسياسات RLS للموقع العام (صفحة الهبوط) - محدث
-- تاريخ الإنشاء: 2025-06-12
-- الهدف: حل أخطاء 500 Internal Server Error في صفحة الهبوط
-- محدث بناءً على البنية الحقيقية لقاعدة البيانات

-- بدء المعاملة مع معالجة الأخطاء
DO $$
DECLARE
    error_message text;
BEGIN
    -- ===== إصلاح جدول product_categories =====
    RAISE NOTICE 'بدء إصلاح جدول product_categories...';
    
    -- حذف السياسات المتضاربة
    DROP POLICY IF EXISTS "public_view_product_categories" ON public.product_categories;
    DROP POLICY IF EXISTS "tenant_categories_delete" ON public.product_categories;
    DROP POLICY IF EXISTS "tenant_categories_insert" ON public.product_categories;
    DROP POLICY IF EXISTS "tenant_categories_select" ON public.product_categories;
    DROP POLICY IF EXISTS "tenant_categories_update" ON public.product_categories;

    -- إنشاء سياسات مبسطة وواضحة
    CREATE POLICY "product_categories_public_read" ON public.product_categories
        FOR SELECT
        USING (true); -- قراءة عامة للجميع

    CREATE POLICY "product_categories_org_manage" ON public.product_categories
        FOR ALL
        USING (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        )
        WITH CHECK (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        );

    -- ===== إصلاح جدول customers =====
    RAISE NOTICE 'بدء إصلاح جدول customers...';
    
    -- حذف السياسات المتضاربة
    DROP POLICY IF EXISTS "Allow full access to customers" ON public.customers;
    DROP POLICY IF EXISTS "org_tenant_customers_delete" ON public.customers;
    DROP POLICY IF EXISTS "org_tenant_customers_insert" ON public.customers;
    DROP POLICY IF EXISTS "org_tenant_customers_select" ON public.customers;
    DROP POLICY IF EXISTS "org_tenant_customers_update" ON public.customers;

    -- إنشاء سياسات مبسطة
    CREATE POLICY "customers_public_insert" ON public.customers
        FOR INSERT
        WITH CHECK (true); -- السماح بإنشاء عملاء جدد للجميع

    CREATE POLICY "customers_org_access" ON public.customers
        FOR ALL
        USING (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
            OR auth.uid() IS NULL -- للمستخدمين غير المسجلين
        )
        WITH CHECK (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
            OR auth.uid() IS NULL
        );

    -- ===== إصلاح جدول orders =====
    RAISE NOTICE 'بدء إصلاح جدول orders...';
    
    -- حذف جميع السياسات المتضاربة
    DROP POLICY IF EXISTS "Allow admin and employee select all orders" ON public.orders;
    DROP POLICY IF EXISTS "Allow admin and employee update orders" ON public.orders;
    DROP POLICY IF EXISTS "Allow admin delete orders" ON public.orders;
    DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
    DROP POLICY IF EXISTS "Allow select own orders" ON public.orders;
    DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.orders;
    DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
    DROP POLICY IF EXISTS "orders_org_access" ON public.orders;
    DROP POLICY IF EXISTS "orders_public_read" ON public.orders;
    DROP POLICY IF EXISTS "orders_safe_all" ON public.orders;
    DROP POLICY IF EXISTS "orders_select_safe" ON public.orders;
    DROP POLICY IF EXISTS "orders_update_safe" ON public.orders;
    DROP POLICY IF EXISTS "org_tenant_orders_insert" ON public.orders;

    -- إنشاء سياسات مبسطة وواضحة
    CREATE POLICY "orders_public_insert" ON public.orders
        FOR INSERT
        WITH CHECK (true); -- السماح بإنشاء طلبات للجميع

    CREATE POLICY "orders_org_manage" ON public.orders
        FOR ALL
        USING (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
            OR auth.uid() IS NULL -- للعرض العام
        )
        WITH CHECK (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        );

    -- ===== إصلاح جدول online_orders =====
    RAISE NOTICE 'بدء إصلاح جدول online_orders...';
    
    -- فحص السياسات الموجودة على online_orders وحذفها
    DROP POLICY IF EXISTS "online_orders_public_read" ON public.online_orders;
    DROP POLICY IF EXISTS "online_orders_org_access" ON public.online_orders;
    DROP POLICY IF EXISTS "online_orders_insert" ON public.online_orders;
    DROP POLICY IF EXISTS "online_orders_select" ON public.online_orders;
    DROP POLICY IF EXISTS "online_orders_update" ON public.online_orders;
    DROP POLICY IF EXISTS "online_orders_delete" ON public.online_orders;

    -- إنشاء سياسات مبسطة لـ online_orders
    CREATE POLICY "online_orders_public_insert" ON public.online_orders
        FOR INSERT
        WITH CHECK (true); -- السماح بإنشاء طلبات أونلاين للجميع

    CREATE POLICY "online_orders_org_manage" ON public.online_orders
        FOR ALL
        USING (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
            OR auth.uid() IS NULL -- للعرض العام
        )
        WITH CHECK (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        );

    -- ===== إصلاح جدول products =====
    RAISE NOTICE 'بدء إصلاح جدول products...';
    
    -- فحص السياسات الموجودة على products وحذفها
    DROP POLICY IF EXISTS "products_public_read" ON public.products;
    DROP POLICY IF EXISTS "products_org_access" ON public.products;
    DROP POLICY IF EXISTS "products_insert" ON public.products;
    DROP POLICY IF EXISTS "products_select" ON public.products;
    DROP POLICY IF EXISTS "products_update" ON public.products;
    DROP POLICY IF EXISTS "products_delete" ON public.products;

    -- إنشاء سياسات مبسطة لـ products
    CREATE POLICY "products_public_read" ON public.products
        FOR SELECT
        USING (is_active = true); -- قراءة عامة للمنتجات النشطة فقط

    CREATE POLICY "products_org_manage" ON public.products
        FOR ALL
        USING (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        )
        WITH CHECK (
            organization_id IN (
                SELECT u.organization_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        );

    RAISE NOTICE 'تم إصلاح سياسات RLS بنجاح';

EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE 'خطأ في إصلاح السياسات: %', error_message;
        RAISE;
END $$;

-- ===== تحسين دالة get_current_user_safe =====
-- حذف الدالة الموجودة أولاً لتجنب تضارب التوقيع
DROP FUNCTION IF EXISTS get_current_user_safe();

-- إنشاء الدالة من جديد بالتوقيع الصحيح
CREATE OR REPLACE FUNCTION get_current_user_safe()
RETURNS TABLE(
    id uuid,
    email text,
    name text,
    auth_user_id uuid,
    organization_id uuid,
    role text,
    is_active boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- محاولة جلب المستخدم الحالي
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.auth_user_id,
        u.organization_id,
        u.role,
        u.is_active
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
    
    -- إذا لم نجد المستخدم، لا نرجع شيء (بدلاً من خطأ)
    RETURN;
END;
$$;

-- ===== إنشاء دالة للوصول الآمن للبيانات العامة =====
-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_public_data_safe(text, uuid);

CREATE OR REPLACE FUNCTION get_public_data_safe(
    table_name text,
    org_id uuid DEFAULT NULL
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    -- التحقق من اسم الجدول المسموح
    IF table_name NOT IN ('product_categories', 'products', 'orders', 'online_orders') THEN
        RETURN '[]'::json;
    END IF;
    
    -- جلب البيانات حسب الجدول مع استخدام الحقول الصحيحة
    CASE table_name
        WHEN 'product_categories' THEN
            SELECT json_agg(
                json_build_object(
                    'id', pc.id,
                    'name', pc.name,
                    'description', pc.description,
                    'slug', pc.slug,
                    'icon', pc.icon,
                    'is_active', pc.is_active,
                    'organization_id', pc.organization_id,
                    'type', pc.type,
                    'image_url', pc.image_url
                )
            )
            INTO result
            FROM product_categories pc
            WHERE (org_id IS NULL OR pc.organization_id = org_id)
              AND pc.is_active = true
            ORDER BY pc.name;
            
        WHEN 'products' THEN
            SELECT json_agg(
                json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'description', p.description,
                    'price', p.price,
                    'compare_at_price', p.compare_at_price,
                    'sku', p.sku,
                    'category', p.category,
                    'brand', p.brand,
                    'thumbnail_image', p.thumbnail_image,
                    'stock_quantity', p.stock_quantity,
                    'is_active', p.is_active,
                    'organization_id', p.organization_id,
                    'slug', p.slug
                )
            )
            INTO result
            FROM products p
            WHERE (org_id IS NULL OR p.organization_id = org_id)
              AND p.is_active = true
            ORDER BY p.created_at DESC;
            
        WHEN 'orders' THEN
            SELECT json_agg(
                json_build_object(
                    'id', o.id,
                    'total', o.total, -- استخدام total بدلاً من total_amount
                    'subtotal', o.subtotal,
                    'status', o.status,
                    'payment_status', o.payment_status,
                    'created_at', o.created_at,
                    'organization_id', o.organization_id
                )
            )
            INTO result
            FROM orders o
            WHERE (org_id IS NULL OR o.organization_id = org_id)
            ORDER BY o.created_at DESC
            LIMIT 100;
            
        WHEN 'online_orders' THEN
            SELECT json_agg(
                json_build_object(
                    'id', oo.id,
                    'total', oo.total, -- استخدام total بدلاً من total_amount
                    'subtotal', oo.subtotal,
                    'status', oo.status,
                    'payment_status', oo.payment_status,
                    'created_at', oo.created_at,
                    'organization_id', oo.organization_id
                )
            )
            INTO result
            FROM online_orders oo
            WHERE (org_id IS NULL OR oo.organization_id = org_id)
            ORDER BY oo.created_at DESC
            LIMIT 100;
            
        ELSE
            result := '[]'::json;
    END CASE;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ===== تحسين الفهارس للأداء =====
-- فهارس محسنة لـ product_categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_product_categories_org_active'
    ) THEN
        CREATE INDEX idx_product_categories_org_active 
        ON product_categories(organization_id, is_active) 
        WHERE is_active = true;
        RAISE NOTICE 'تم إنشاء فهرس idx_product_categories_org_active';
    END IF;
END $$;

-- فهارس محسنة لـ customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_customers_org_email'
    ) THEN
        CREATE INDEX idx_customers_org_email 
        ON customers(organization_id, email);
        RAISE NOTICE 'تم إنشاء فهرس idx_customers_org_email';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_customers_phone'
    ) THEN
        CREATE INDEX idx_customers_phone 
        ON customers(phone) 
        WHERE phone IS NOT NULL;
        RAISE NOTICE 'تم إنشاء فهرس idx_customers_phone';
    END IF;
END $$;

-- فهارس محسنة لـ orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_orders_org_status_date'
    ) THEN
        CREATE INDEX idx_orders_org_status_date 
        ON orders(organization_id, status, created_at DESC);
        RAISE NOTICE 'تم إنشاء فهرس idx_orders_org_status_date';
    END IF;
END $$;

-- فهارس محسنة لـ online_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_online_orders_org_status_date'
    ) THEN
        CREATE INDEX idx_online_orders_org_status_date 
        ON online_orders(organization_id, status, created_at DESC);
        RAISE NOTICE 'تم إنشاء فهرس idx_online_orders_org_status_date';
    END IF;
END $$;

-- فهارس محسنة لـ products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_products_org_active'
    ) THEN
        CREATE INDEX idx_products_org_active 
        ON products(organization_id, is_active) 
        WHERE is_active = true;
        RAISE NOTICE 'تم إنشاء فهرس idx_products_org_active';
    END IF;
END $$;

-- ===== تحديث إحصائيات الجداول =====
ANALYZE product_categories;
ANALYZE customers;
ANALYZE orders;
ANALYZE online_orders;
ANALYZE products;
ANALYZE users;

-- ===== إنشاء view آمن للبيانات العامة =====
DROP VIEW IF EXISTS public_store_data;

CREATE VIEW public_store_data AS
SELECT 
    'product_categories' as data_type,
    json_agg(
        json_build_object(
            'id', pc.id,
            'name', pc.name,
            'description', pc.description,
            'organization_id', pc.organization_id,
            'is_active', pc.is_active
        )
    ) as data
FROM product_categories pc
WHERE pc.is_active = true
GROUP BY data_type

UNION ALL

SELECT 
    'recent_orders' as data_type,
    json_agg(
        json_build_object(
            'id', o.id,
            'total', o.total, -- استخدام total بدلاً من total_amount
            'status', o.status,
            'created_at', o.created_at,
            'organization_id', o.organization_id
        )
    ) as data
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY data_type

UNION ALL

SELECT 
    'recent_online_orders' as data_type,
    json_agg(
        json_build_object(
            'id', oo.id,
            'total', oo.total, -- استخدام total بدلاً من total_amount
            'status', oo.status,
            'created_at', oo.created_at,
            'organization_id', oo.organization_id
        )
    ) as data
FROM online_orders oo
WHERE oo.created_at >= NOW() - INTERVAL '30 days'
GROUP BY data_type;

-- منح الصلاحيات للـ view
GRANT SELECT ON public_store_data TO public;
GRANT SELECT ON public_store_data TO anon;
GRANT SELECT ON public_store_data TO authenticated;

-- تسجيل نتيجة الإصلاح
SELECT 
    'إصلاح سياسات RLS مكتمل' as status,
    (SELECT COUNT(*) FROM product_categories) as total_categories,
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM online_orders) as total_online_orders,
    (SELECT COUNT(*) FROM products) as total_products; 