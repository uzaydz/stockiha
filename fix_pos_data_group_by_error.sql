-- =================================================================
-- 🔧 إصلاح خطأ GROUP BY في دالة get_complete_pos_data_optimized
-- =================================================================
-- تاريخ الإنشاء: 2024-12-19
-- المشكلة: column "c.created_at" must appear in the GROUP BY clause
-- الحل: إزالة ORDER BY من json_agg أو إصلاح GROUP BY
-- =================================================================

-- 1️⃣ إصلاح دالة جلب البيانات التجارية
CREATE OR REPLACE FUNCTION get_pos_business_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    customers_data JSON;
    recent_orders_data JSON;
    organization_apps_data JSON;
    product_categories_data JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب العملاء (بدون ORDER BY في json_agg)
    WITH sorted_customers AS (
        SELECT 
            c.id,
            c.name,
            c.email,
            c.phone,
            c.created_at,
            c.updated_at
        FROM customers c
        WHERE c.organization_id = p_organization_id
        ORDER BY c.created_at DESC
        LIMIT 100
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'email', email,
            'phone', phone,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO customers_data
    FROM sorted_customers;

    -- جلب الطلبات الحديثة (بدون ORDER BY في json_agg)
    WITH sorted_orders AS (
        SELECT 
            o.id,
            o.customer_id,
            o.total,
            o.status,
            o.payment_method,
            o.payment_status,
            o.created_at,
            o.employee_id,
            o.pos_order_type
        FROM orders o
        WHERE o.organization_id = p_organization_id
            AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY o.created_at DESC
        LIMIT 50
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'customer_id', customer_id,
            'total', total,
            'status', status,
            'payment_method', payment_method,
            'payment_status', payment_status,
            'created_at', created_at,
            'employee_id', employee_id,
            'pos_order_type', pos_order_type
        )
    ) INTO recent_orders_data
    FROM sorted_orders;

    -- جلب تطبيقات المؤسسة
    SELECT json_agg(
        json_build_object(
            'id', oa.id,
            'app_id', oa.app_id,
            'is_enabled', oa.is_enabled,
            'configuration', oa.configuration,
            'installed_at', oa.installed_at
        )
    ) INTO organization_apps_data
    FROM organization_apps oa
    WHERE oa.organization_id = p_organization_id;

    -- جلب فئات المنتجات (مع الأعمدة الصحيحة)
    WITH sorted_categories AS (
        SELECT 
            pc.id,
            pc.name,
            pc.description,
            pc.slug,
            pc.icon,
            pc.image_url,
            pc.is_active,
            pc.type,
            pc.created_at,
            pc.updated_at
        FROM product_categories pc
        WHERE pc.organization_id = p_organization_id
            AND pc.is_active = true
        ORDER BY pc.name
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'description', description,
            'slug', slug,
            'icon', icon,
            'image_url', image_url,
            'is_active', is_active,
            'type', type,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO product_categories_data
    FROM sorted_categories;

    -- تجميع النتائج
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'customers', COALESCE(customers_data, '[]'::json),
            'recent_orders', COALESCE(recent_orders_data, '[]'::json),
            'organization_apps', COALESCE(organization_apps_data, '[]'::json),
            'product_categories', COALESCE(product_categories_data, '[]'::json)
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- 2️⃣ إصلاح دالة جلب بيانات المنتجات
CREATE OR REPLACE FUNCTION get_pos_products_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب المنتجات مع المتغيرات (محسن لتجنب GROUP BY errors)
    WITH product_variants AS (
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.compare_at_price,
            p.purchase_price,
            p.sku,
            p.barcode,
            p.category,
            p.subcategory,
            p.brand,
            p.images,
            p.thumbnail_image,
            p.stock_quantity,
            p.has_variants,
            p.is_active,
            p.category_id,
            p.subcategory_id,
            p.min_stock_level,
            p.wholesale_price,
            p.allow_retail,
            p.allow_wholesale,
            p.is_sold_by_unit,
            p.unit_type,
            p.use_variant_prices,
            -- حساب المخزون الفعلي
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0)
                ELSE p.stock_quantity 
            END as actual_stock_quantity,
            -- جلب الألوان مع الأحجام (محسن)
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', color_data.id,
                        'product_id', color_data.product_id,
                        'name', color_data.name,
                        'color_code', color_data.color_code,
                        'image_url', color_data.image_url,
                        'quantity', color_data.quantity,
                        'price', color_data.price,
                        'barcode', color_data.barcode,
                        'is_default', color_data.is_default,
                        'variant_number', color_data.variant_number,
                        'purchase_price', color_data.purchase_price,
                        'sizes', color_data.sizes
                    )
                ) FROM (
                    SELECT 
                        pc.id,
                        pc.product_id,
                        pc.name,
                        pc.color_code,
                        pc.image_url,
                        pc.quantity,
                        pc.price,
                        pc.barcode,
                        pc.is_default,
                        pc.variant_number,
                        pc.purchase_price,
                        COALESCE(
                            (SELECT json_agg(
                                json_build_object(
                                    'id', ps.id,
                                    'color_id', ps.color_id,
                                    'product_id', ps.product_id,
                                    'size_name', ps.size_name,
                                    'quantity', ps.quantity,
                                    'price', ps.price,
                                    'barcode', ps.barcode,
                                    'is_default', ps.is_default,
                                    'purchase_price', ps.purchase_price
                                )
                            ) FROM product_sizes ps WHERE ps.color_id = pc.id),
                            '[]'::json
                        ) as sizes
                    FROM product_colors pc 
                    WHERE pc.product_id = p.id
                ) color_data),
                '[]'::json
            ) as colors
        FROM products p
        WHERE p.organization_id = p_organization_id 
            AND p.is_active = true
    )
    SELECT json_build_object(
        'success', true,
        'data', json_agg(
            json_build_object(
                'id', pv.id,
                'name', pv.name,
                'description', pv.description,
                'price', pv.price,
                'compare_at_price', pv.compare_at_price,
                'purchase_price', pv.purchase_price,
                'sku', pv.sku,
                'barcode', pv.barcode,
                'category', pv.category,
                'subcategory', pv.subcategory,
                'brand', pv.brand,
                'images', pv.images,
                'thumbnail_image', pv.thumbnail_image,
                'stock_quantity', pv.stock_quantity,
                'actual_stock_quantity', pv.actual_stock_quantity,
                'has_variants', pv.has_variants,
                'is_active', pv.is_active,
                'category_id', pv.category_id,
                'subcategory_id', pv.subcategory_id,
                'min_stock_level', pv.min_stock_level,
                'wholesale_price', pv.wholesale_price,
                'allow_retail', pv.allow_retail,
                'allow_wholesale', pv.allow_wholesale,
                'is_sold_by_unit', pv.is_sold_by_unit,
                'unit_type', pv.unit_type,
                'use_variant_prices', pv.use_variant_prices,
                'colors', pv.colors
            )
        )
    ) INTO result
    FROM product_variants pv;

    RETURN result;
END;
$$;

-- 3️⃣ منح الصلاحيات المحدثة
GRANT EXECUTE ON FUNCTION get_pos_business_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_products_data(UUID) TO authenticated;

-- 4️⃣ إعادة تطبيق تعليقات الدوال
COMMENT ON FUNCTION get_pos_business_data(UUID) IS 'جلب البيانات التجارية (العملاء، الطلبات، التطبيقات) - محدثة لإصلاح GROUP BY';
COMMENT ON FUNCTION get_pos_products_data(UUID) IS 'جلب بيانات المنتجات والمتغيرات لنقطة البيع - محدثة لإصلاح GROUP BY';

-- ✅ تم إصلاح مشكلة GROUP BY بنجاح!
-- الآن يجب أن تعمل دالة get_complete_pos_data_optimized بدون أخطاء 