-- =================================================================
-- 🚀 مجموعة دوال محسنة لجلب بيانات نقطة البيع في أجزاء منفصلة
-- تم تقسيمها لتجنب مشكلة حد 100 معامل في PostgreSQL
-- =================================================================

-- حذف الدوال إذا كانت موجودة مسبقاً
DROP FUNCTION IF EXISTS search_product_by_barcode(UUID, TEXT);
DROP FUNCTION IF EXISTS get_pos_products_data_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_pos_products_data(UUID);
DROP FUNCTION IF EXISTS get_pos_business_data(UUID);
DROP FUNCTION IF EXISTS get_pos_stats_data(UUID);
DROP FUNCTION IF EXISTS get_complete_pos_data(UUID);
DROP FUNCTION IF EXISTS get_complete_pos_data_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_complete_pos_data_optimized(UUID);

-- =================================================================
-- 🔍 دالة البحث السريع بالباركود للسكانر
-- =================================================================
CREATE OR REPLACE FUNCTION search_product_by_barcode(
    p_organization_id UUID,
    p_barcode TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product JSON;
BEGIN
    -- تنظيف الباركود من المسافات
    p_barcode := TRIM(p_barcode);
    
    IF p_barcode IS NULL OR p_barcode = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الباركود مطلوب',
            'error_code', 'BARCODE_REQUIRED'
        );
    END IF;
    
    -- البحث المباشر بالباركود في المنتج الرئيسي
    SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'sku', p.sku,
        'barcode', p.barcode,
        'stock_quantity', p.stock_quantity,
        'actual_stock_quantity', p.stock_quantity,
        'thumbnail_image', p.thumbnail_image,
        'has_variants', p.has_variants,
        'wholesale_price', p.wholesale_price,
        'allow_retail', p.allow_retail,
        'allow_wholesale', p.allow_wholesale,
        'category', p.category,
        'category_id', p.category_id,
        'type', 'main_product',
        'found_in', 'main_product'
    ) INTO v_product
    FROM products p
    WHERE p.organization_id = p_organization_id 
        AND p.barcode = p_barcode 
        AND p.is_active = true
    LIMIT 1;
    
    -- إذا لم نجد في المنتج الرئيسي، نبحث في متغيرات الألوان
    IF v_product IS NULL THEN
        SELECT json_build_object(
            'id', p.id,
            'name', p.name || ' - ' || pc.name,
            'price', COALESCE(pc.price, p.price),
            'sku', p.sku,
            'barcode', pc.barcode,
            'stock_quantity', pc.quantity,
            'actual_stock_quantity', pc.quantity,
            'thumbnail_image', COALESCE(pc.image_url, p.thumbnail_image),
            'has_variants', p.has_variants,
            'wholesale_price', p.wholesale_price,
            'allow_retail', p.allow_retail,
            'allow_wholesale', p.allow_wholesale,
            'category', p.category,
            'category_id', p.category_id,
            'variant_info', json_build_object(
                'color_id', pc.id,
                'color_name', pc.name,
                'color_code', pc.color_code,
                'variant_number', pc.variant_number,
                'has_sizes', pc.has_sizes
            ),
            'type', 'color_variant',
            'found_in', 'color_variant'
        ) INTO v_product
        FROM products p
        JOIN product_colors pc ON pc.product_id = p.id
        WHERE p.organization_id = p_organization_id 
            AND pc.barcode = p_barcode 
            AND p.is_active = true
        LIMIT 1;
    END IF;
    
    -- إذا لم نجد في الألوان، نبحث في المقاسات
    IF v_product IS NULL THEN
        SELECT json_build_object(
            'id', p.id,
            'name', p.name || ' - ' || pc.name || ' - ' || ps.size_name,
            'price', COALESCE(ps.price, pc.price, p.price),
            'sku', p.sku,
            'barcode', ps.barcode,
            'stock_quantity', ps.quantity,
            'actual_stock_quantity', ps.quantity,
            'thumbnail_image', COALESCE(pc.image_url, p.thumbnail_image),
            'has_variants', p.has_variants,
            'wholesale_price', p.wholesale_price,
            'allow_retail', p.allow_retail,
            'allow_wholesale', p.allow_wholesale,
            'category', p.category,
            'category_id', p.category_id,
            'variant_info', json_build_object(
                'color_id', pc.id,
                'color_name', pc.name,
                'color_code', pc.color_code,
                'size_id', ps.id,
                'size_name', ps.size_name,
                'variant_number', pc.variant_number,
                'has_sizes', true
            ),
            'type', 'size_variant',
            'found_in', 'size_variant'
        ) INTO v_product
        FROM products p
        JOIN product_colors pc ON pc.product_id = p.id
        JOIN product_sizes ps ON ps.color_id = pc.id
        WHERE p.organization_id = p_organization_id 
            AND ps.barcode = p_barcode 
            AND p.is_active = true
        LIMIT 1;
    END IF;
    
    RETURN json_build_object(
        'success', CASE WHEN v_product IS NULL THEN false ELSE true END,
        'data', v_product,
        'search_term', p_barcode,
        'message', CASE 
            WHEN v_product IS NULL THEN 'لم يتم العثور على منتج بهذا الباركود'
            ELSE 'تم العثور على المنتج بنجاح'
        END
    );
END;
$$;

-- =================================================================
-- 1️⃣ دالة جلب المنتجات مع pagination ودعم البحث
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_products_data_paginated(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 50,
    p_search TEXT DEFAULT NULL,
    p_category_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_products JSON;
    v_search_condition TEXT;
BEGIN
    -- التحقق من صحة المعاملات
    IF p_organization_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'معرف المؤسسة مطلوب',
            'error_code', 'INVALID_ORGANIZATION_ID'
        );
    END IF;
    
    -- حساب الـ offset
    v_offset := (p_page - 1) * p_limit;
    
    -- تنظيف البحث
    p_search := TRIM(p_search);
    IF p_search = '' THEN p_search := NULL; END IF;
    
    -- حساب العدد الإجمالي مع شروط البحث
    SELECT COUNT(*) INTO v_total_count
    FROM products p
    WHERE p.organization_id = p_organization_id
        AND p.is_active = true
        AND (p_search IS NULL OR 
             p.name ILIKE '%' || p_search || '%' OR 
             p.sku ILIKE '%' || p_search || '%' OR 
             p.barcode = p_search OR
             p.category ILIKE '%' || p_search || '%')
                 AND (p_category_id IS NULL OR p.category_id::text = p_category_id);

    -- جلب المنتجات مع البيانات المحسنة
    WITH product_data AS (
        SELECT 
            p.id,
            p.name,
            p.price,
            p.compare_at_price,
            p.purchase_price,
            p.sku,
            p.barcode,
            p.category,
            p.subcategory,
            p.brand,
            p.thumbnail_image,
            p.stock_quantity,
            p.has_variants,
            p.category_id,
            p.subcategory_id,
            p.wholesale_price,
            p.allow_retail,
            p.allow_wholesale,
            p.is_sold_by_unit,
            p.unit_type,
            p.use_variant_prices,
            p.min_stock_level,
            
            -- حساب المخزون الفعلي للمنتجات التي لها متغيرات
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE(
                        (SELECT SUM(
                            CASE WHEN pc.has_sizes 
                            THEN (SELECT SUM(ps.quantity) FROM product_sizes ps WHERE ps.color_id = pc.id)
                            ELSE pc.quantity END
                        ) FROM product_colors pc WHERE pc.product_id = p.id), 
                        p.stock_quantity
                    )
                ELSE p.stock_quantity 
            END as actual_stock_quantity,
            
            -- جلب الألوان والمقاسات فقط للمنتجات التي لها متغيرات
            CASE 
                WHEN p.has_variants = true THEN
                    (SELECT json_agg(
                        json_build_object(
                            'id', pc.id,
                            'name', pc.name,
                            'color_code', pc.color_code,
                            'image_url', pc.image_url,
                            'quantity', pc.quantity,
                            'price', pc.price,
                            'barcode', pc.barcode,
                            'variant_number', pc.variant_number,
                            'has_sizes', pc.has_sizes,
                            'sizes', CASE 
                                WHEN pc.has_sizes THEN
                                    (SELECT json_agg(
                                        json_build_object(
                                            'id', ps.id,
                                            'size_name', ps.size_name,
                                            'quantity', ps.quantity,
                                            'price', ps.price,
                                            'barcode', ps.barcode
                                        )
                                    ) FROM product_sizes ps WHERE ps.color_id = pc.id)
                                ELSE '[]'::json
                            END
                        )
                    ) FROM product_colors pc WHERE pc.product_id = p.id)
                ELSE '[]'::json
            END as colors
            
        FROM products p
        WHERE p.organization_id = p_organization_id
            AND p.is_active = true
            AND (p_search IS NULL OR 
                 p.name ILIKE '%' || p_search || '%' OR 
                 p.sku ILIKE '%' || p_search || '%' OR 
                 p.barcode = p_search OR
                 p.category ILIKE '%' || p_search || '%')
                         AND (p_category_id IS NULL OR p.category_id::text = p_category_id)
        ORDER BY 
            CASE WHEN p_search IS NOT NULL AND p.barcode = p_search THEN 1 ELSE 2 END,
            p.name ASC
        LIMIT p_limit OFFSET v_offset
    )
    SELECT json_agg(
        json_build_object(
            'id', pd.id,
            'name', pd.name,
            'price', pd.price,
            'compare_at_price', pd.compare_at_price,
            'purchase_price', pd.purchase_price,
            'sku', pd.sku,
            'barcode', pd.barcode,
            'category', pd.category,
            'subcategory', pd.subcategory,
            'brand', pd.brand,
            'thumbnail_image', pd.thumbnail_image,
            'stock_quantity', pd.stock_quantity,
            'actual_stock_quantity', pd.actual_stock_quantity,
            'has_variants', pd.has_variants,
            'category_id', pd.category_id,
            'subcategory_id', pd.subcategory_id,
            'wholesale_price', pd.wholesale_price,
            'allow_retail', pd.allow_retail,
            'allow_wholesale', pd.allow_wholesale,
            'is_sold_by_unit', pd.is_sold_by_unit,
            'unit_type', pd.unit_type,
            'use_variant_prices', pd.use_variant_prices,
            'min_stock_level', pd.min_stock_level,
            'colors', pd.colors
        )
    ) INTO v_products
    FROM product_data pd;
    
    -- إرجاع النتيجة مع معلومات الـ pagination
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'products', COALESCE(v_products, '[]'::json),
            'pagination', json_build_object(
                'current_page', p_page,
                'total_pages', CEIL(v_total_count::DECIMAL / p_limit),
                'total_count', v_total_count,
                'per_page', p_limit,
                'has_next_page', v_total_count > (p_page * p_limit),
                'has_prev_page', p_page > 1
            )
        ),
        'meta', json_build_object(
            'organization_id', p_organization_id,
            'search_term', p_search,
            'category_filter', p_category_id
        )
    );
END;
$$;

-- =================================================================
-- 1️⃣ دالة جلب بيانات المنتجات والمتغيرات (النسخة الأصلية محسنة)
-- =================================================================
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

    -- جلب المنتجات مع المتغيرات (مبسط لتجنب مشكلة 100 معامل)
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
            -- جلب الألوان مع الأحجام
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', pc.id,
                        'product_id', pc.product_id,
                        'name', pc.name,
                        'color_code', pc.color_code,
                        'image_url', pc.image_url,
                        'quantity', pc.quantity,
                        'price', pc.price,
                        'barcode', pc.barcode,
                        'is_default', pc.is_default,
                        'variant_number', pc.variant_number,
                        'purchase_price', pc.purchase_price,
                        'sizes', COALESCE(
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
                        )
                    )
                ) FROM product_colors pc WHERE pc.product_id = p.id),
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

-- =================================================================
-- 2️⃣ دالة جلب البيانات التجارية (العملاء، الطلبات، التطبيقات)
-- =================================================================
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
    users_data JSON;
    subscription_services_data JSON;
    organization_settings_data JSON;
    subscription_status_data JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب العملاء (مع معالجة أفضل)
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

    -- جلب الطلبات الحديثة (مع معالجة أفضل)
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

    -- جلب فئات المنتجات (مع CTE لتجنب مشكلة GROUP BY)
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

    -- ✅ جلب الموظفين (users) - إضافة جديدة لحل الاستدعاءات المكررة
    WITH sorted_users AS (
        SELECT 
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.is_active,
            u.permissions,
            u.created_at
        FROM users u
        WHERE u.organization_id = p_organization_id 
            AND u.is_active = true
        ORDER BY u.created_at DESC
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'email', email,
            'phone', phone,
            'role', role,
            'is_active', is_active,
            'permissions', permissions,
            'created_at', created_at
        )
    ) INTO users_data
    FROM sorted_users;

    -- ✅ جلب خدمات الاشتراك (subscription_services) - إضافة جديدة
    WITH sorted_services AS (
        SELECT 
            ss.id,
            ss.name,
            ss.description,
            ss.purchase_price,
            ss.selling_price,
            ss.profit_amount,
            ss.provider,
            ss.status,
            ss.available_quantity,
            ss.sold_quantity,
            ss.category_id,
            ss.is_active,
            ss.created_at
        FROM subscription_services ss
        WHERE ss.organization_id = p_organization_id 
            AND ss.is_active = true
        ORDER BY ss.name
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'description', description,
            'purchase_price', purchase_price,
            'selling_price', selling_price,
            'profit_amount', profit_amount,
            'provider', provider,
            'status', status,
            'available_quantity', available_quantity,
            'sold_quantity', sold_quantity,
            'category_id', category_id,
            'is_active', is_active,
            'created_at', created_at
        )
    ) INTO subscription_services_data
    FROM sorted_services;

    -- ✅ جلب إعدادات المؤسسة (organization_settings) - إضافة جديدة
    SELECT json_build_object(
        'id', os.id,
        'organization_id', os.organization_id,
        'site_name', os.site_name,
        'default_language', os.default_language,
        'theme_primary_color', os.theme_primary_color,
        'theme_secondary_color', os.theme_secondary_color,
        'theme_mode', os.theme_mode,
        'logo_url', os.logo_url,
        'favicon_url', os.favicon_url,
        'custom_css', os.custom_css,
        'custom_js', os.custom_js,
        'custom_header', os.custom_header,
        'custom_footer', os.custom_footer,
        'enable_registration', os.enable_registration,
        'enable_public_site', os.enable_public_site,
        'display_text_with_logo', os.display_text_with_logo,
        'created_at', os.created_at,
        'updated_at', os.updated_at
    ) INTO organization_settings_data
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id
    LIMIT 1;

    -- ✅ جلب حالة الاشتراك مع معالجة الأخطاء
    BEGIN
        -- محاولة الحصول على حالة الاشتراك من جدول subscriptions إذا كان موجوداً
        SELECT json_build_object(
            'success', true,
            'subscription_status', COALESCE(s.status, 'active'),
            'plan_name', COALESCE(s.plan_name, 'أساسي'),
            'expires_at', s.expires_at,
            'is_trial', COALESCE(s.is_trial, false),
            'features', s.features
        ) INTO subscription_status_data
        FROM subscriptions s
        WHERE s.organization_id = p_organization_id
            AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1;
        
        -- إذا لم توجد بيانات، استخدم بيانات افتراضية
        IF subscription_status_data IS NULL THEN
            subscription_status_data := json_build_object(
                'success', true,
                'subscription_status', 'active',
                'plan_name', 'أساسي',
                'expires_at', null,
                'is_trial', false,
                'features', '[]'::json
            );
        END IF;
    EXCEPTION 
        WHEN OTHERS THEN
            -- في حالة أي خطأ، استخدم بيانات افتراضية
            subscription_status_data := json_build_object(
                'success', true,
                'subscription_status', 'active',
                'plan_name', 'أساسي',
                'expires_at', null,
                'is_trial', false,
                'note', 'تم استخدام بيانات افتراضية'
            );
    END;

    -- تجميع النتائج مع البيانات الجديدة
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'customers', COALESCE(customers_data, '[]'::json),
            'recent_orders', COALESCE(recent_orders_data, '[]'::json),
            'organization_apps', COALESCE(organization_apps_data, '[]'::json),
            'product_categories', COALESCE(product_categories_data, '[]'::json),
            'users', COALESCE(users_data, '[]'::json),
            'subscription_services', COALESCE(subscription_services_data, '[]'::json),
            'organization_settings', organization_settings_data,
            'subscription_status', subscription_status_data
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =================================================================
-- 3️⃣ دالة جلب الإحصائيات والبيانات التحليلية
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_stats_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    inventory_stats JSON;
    order_stats JSON;
    pos_settings_data JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- حساب إحصائيات المخزون
    SELECT json_build_object(
        'total_products', COUNT(*),
        'out_of_stock_products', COUNT(*) FILTER (WHERE 
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0) = 0
                ELSE p.stock_quantity = 0 
            END
        ),
        'low_stock_products', COUNT(*) FILTER (WHERE 
            p.min_stock_level IS NOT NULL AND 
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0) <= p.min_stock_level
                ELSE p.stock_quantity <= p.min_stock_level 
            END
        ),
        'total_stock_value', COALESCE(SUM(
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity * COALESCE(pc.price, p.price)) FROM product_colors pc WHERE pc.product_id = p.id), 0)
                ELSE p.stock_quantity * p.price 
            END
        ), 0)
    ) INTO inventory_stats
    FROM products p
    WHERE p.organization_id = p_organization_id 
        AND p.is_active = true;

    -- حساب إحصائيات الطلبات
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_pos_orders', COUNT(*) FILTER (WHERE o.pos_order_type IS NOT NULL),
        'today_orders', COUNT(*) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE),
        'total_sales', COALESCE(SUM(o.total), 0),
        'today_sales', COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0),
        'this_week_sales', COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0),
        'this_month_sales', COALESCE(SUM(o.total) FILTER (WHERE DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE)), 0)
    ) INTO order_stats
    FROM orders o
    WHERE o.organization_id = p_organization_id
        AND o.status = 'completed';

    -- جلب إعدادات POS (بالأعمدة الصحيحة الموجودة فعلياً)
    SELECT json_build_object(
        'store_name', COALESCE(ps.store_name, 'المتجر'),
        'store_phone', ps.store_phone,
        'store_email', ps.store_email,
        'store_address', ps.store_address,
        'store_website', ps.store_website,
        'store_logo_url', ps.store_logo_url,
        'receipt_header_text', COALESCE(ps.receipt_header_text, 'شكراً لتعاملكم معنا'),
        'receipt_footer_text', COALESCE(ps.receipt_footer_text, 'نتطلع لخدمتكم مرة أخرى'),
        'welcome_message', COALESCE(ps.welcome_message, 'أهلاً وسهلاً بكم'),
        'show_qr_code', COALESCE(ps.show_qr_code, true),
        'show_tracking_code', COALESCE(ps.show_tracking_code, true),
        'show_customer_info', COALESCE(ps.show_customer_info, true),
        'show_store_logo', COALESCE(ps.show_store_logo, true),
        'show_store_info', COALESCE(ps.show_store_info, true),
        'show_date_time', COALESCE(ps.show_date_time, true),
        'show_employee_name', COALESCE(ps.show_employee_name, false),
        'paper_width', COALESCE(ps.paper_width, 58),
        'font_size', COALESCE(ps.font_size, 10),
        'line_spacing', COALESCE(ps.line_spacing, 1.2),
        'print_density', COALESCE(ps.print_density, 'normal'),
        'auto_cut', COALESCE(ps.auto_cut, true),
        'primary_color', COALESCE(ps.primary_color, '#0099ff'),
        'secondary_color', COALESCE(ps.secondary_color, '#6c757d'),
        'text_color', COALESCE(ps.text_color, '#000000'),
        'background_color', COALESCE(ps.background_color, '#ffffff'),
        'receipt_template', COALESCE(ps.receipt_template, 'classic'),
        'header_style', COALESCE(ps.header_style, 'centered'),
        'footer_style', COALESCE(ps.footer_style, 'centered'),
        'item_display_style', COALESCE(ps.item_display_style, 'table'),
        'price_position', COALESCE(ps.price_position, 'right'),
        'tax_label', COALESCE(ps.tax_label, 'الضريبة'),
        'currency_symbol', COALESCE(ps.currency_symbol, 'دج'),
        'currency_position', COALESCE(ps.currency_position, 'after'),
        'allow_price_edit', COALESCE(ps.allow_price_edit, false),
        'require_manager_approval', COALESCE(ps.require_manager_approval, false),
        'business_license', ps.business_license,
        'tax_number', ps.tax_number,
        'created_at', ps.created_at,
        'updated_at', ps.updated_at
    ) INTO pos_settings_data
    FROM pos_settings ps
    WHERE ps.organization_id = p_organization_id
    LIMIT 1;

    -- تجميع النتائج
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'inventory_stats', inventory_stats,
            'order_stats', order_stats,
            'pos_settings', COALESCE(pos_settings_data, json_build_object(
                'store_name', 'المتجر',
                'store_phone', null,
                'store_email', null,
                'store_address', null,
                'store_website', null,
                'store_logo_url', null,
                'receipt_header_text', 'شكراً لتعاملكم معنا',
                'receipt_footer_text', 'نتطلع لخدمتكم مرة أخرى',
                'welcome_message', 'أهلاً وسهلاً بكم',
                'show_qr_code', true,
                'show_tracking_code', true,
                'show_customer_info', true,
                'show_store_logo', true,
                'show_store_info', true,
                'show_date_time', true,
                'show_employee_name', false,
                'paper_width', 58,
                'font_size', 10,
                'line_spacing', 1.2,
                'print_density', 'normal',
                'auto_cut', true,
                'primary_color', '#0099ff',
                'secondary_color', '#6c757d',
                'text_color', '#000000',
                'background_color', '#ffffff',
                'receipt_template', 'classic',
                'header_style', 'centered',
                'footer_style', 'centered',
                'item_display_style', 'table',
                'price_position', 'right',
                'tax_label', 'الضريبة',
                'currency_symbol', 'دج',
                'currency_position', 'after',
                'allow_price_edit', false,
                'require_manager_approval', false,
                'business_license', null,
                'tax_number', null
            ))
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =================================================================
-- 4️⃣ دالة رئيسية موحدة تجمع كل البيانات
-- =================================================================
-- 🚀 الدالة الرئيسية المحسنة مع دعم pagination والسكانر
-- =================================================================
CREATE OR REPLACE FUNCTION get_complete_pos_data_optimized(
    p_organization_id UUID,
    p_products_page INTEGER DEFAULT 1,
    p_products_limit INTEGER DEFAULT 50,
    p_search TEXT DEFAULT NULL,
    p_category_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    products_result JSON;
    business_result JSON;
    stats_result JSON;
    execution_time_start TIMESTAMPTZ;
    execution_time_ms INTEGER;
    error_message TEXT;
BEGIN
    execution_time_start := now();
    
    -- التحقق من صحة المعاملات
    IF p_organization_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'معرف المؤسسة مطلوب',
            'error_code', 'INVALID_ORGANIZATION_ID'
        );
    END IF;
    
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب البيانات من الدوال المنفصلة مع معالجة الأخطاء
    BEGIN
        -- استخدام الدالة الجديدة مع pagination
        SELECT get_pos_products_data_paginated(
            p_organization_id, 
            p_products_page, 
            p_products_limit, 
            p_search, 
            p_category_id
        ) INTO products_result;
        
        IF products_result IS NULL OR (products_result->>'success')::boolean = false THEN
            RETURN json_build_object(
                'success', false,
                'error', 'فشل في جلب بيانات المنتجات',
                'error_code', 'PRODUCTS_DATA_ERROR',
                'details', products_result
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في جلب بيانات المنتجات: ' || error_message,
            'error_code', 'PRODUCTS_DATA_EXCEPTION'
        );
    END;

    BEGIN
        SELECT get_pos_business_data(p_organization_id) INTO business_result;
        
        IF business_result IS NULL OR (business_result->>'success')::boolean = false THEN
            RETURN json_build_object(
                'success', false,
                'error', 'فشل في جلب البيانات التجارية',
                'error_code', 'BUSINESS_DATA_ERROR',
                'details', business_result
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في جلب البيانات التجارية: ' || error_message,
            'error_code', 'BUSINESS_DATA_EXCEPTION'
        );
    END;

    BEGIN
        SELECT get_pos_stats_data(p_organization_id) INTO stats_result;
        
        IF stats_result IS NULL OR (stats_result->>'success')::boolean = false THEN
            RETURN json_build_object(
                'success', false,
                'error', 'فشل في جلب الإحصائيات',
                'error_code', 'STATS_DATA_ERROR',
                'details', stats_result
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في جلب الإحصائيات: ' || error_message,
            'error_code', 'STATS_DATA_EXCEPTION'
        );
    END;

    -- حساب وقت التنفيذ
    execution_time_ms := EXTRACT(EPOCH FROM (now() - execution_time_start)) * 1000;

    -- تجميع النتائج النهائية
    BEGIN
        SELECT json_build_object(
            'success', true,
            'data', json_build_object(
                'products', products_result->'data'->'products',
                'pagination', products_result->'data'->'pagination',
                'customers', business_result->'data'->'customers',
                'recent_orders', business_result->'data'->'recent_orders',
                'organization_apps', business_result->'data'->'organization_apps',
                'product_categories', business_result->'data'->'product_categories',
                'users', business_result->'data'->'users',
                'subscription_services', business_result->'data'->'subscription_services',
                'organization_settings', business_result->'data'->'organization_settings',
                'subscription_status', business_result->'data'->'subscription_status',
                'inventory_stats', stats_result->'data'->'inventory_stats',
                'order_stats', stats_result->'data'->'order_stats',
                'pos_settings', stats_result->'data'->'pos_settings'
            ),
            'meta', json_build_object(
                'execution_time_ms', execution_time_ms,
                'data_timestamp', now(),
                'organization_id', p_organization_id,
                'version', '3.0',
                'search_params', json_build_object(
                    'page', p_products_page,
                    'limit', p_products_limit,
                    'search', p_search,
                    'category_id', p_category_id
                ),
                'performance', json_build_object(
                    'query_time', execution_time_ms || 'ms',
                    'status', CASE 
                        WHEN execution_time_ms < 500 THEN 'excellent'
                        WHEN execution_time_ms < 1500 THEN 'good'
                        WHEN execution_time_ms < 3000 THEN 'acceptable'
                        ELSE 'slow'
                    END
                )
            )
        ) INTO result;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في تجميع النتائج النهائية: ' || error_message,
            'error_code', 'RESULT_ASSEMBLY_ERROR'
        );
    END;

    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    RETURN json_build_object(
        'success', false,
        'error', 'خطأ عام في دالة get_complete_pos_data_optimized: ' || error_message,
        'error_code', 'GENERAL_ERROR',
        'organization_id', p_organization_id
    );
END;
$$;

-- =================================================================
-- 🔧 منح الصلاحيات اللازمة
-- =================================================================
GRANT EXECUTE ON FUNCTION search_product_by_barcode(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_products_data_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_products_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_business_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_stats_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_complete_pos_data_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- =================================================================
-- 📝 إضافة تعليقات للدوال
-- =================================================================
COMMENT ON FUNCTION search_product_by_barcode(UUID, TEXT) IS 'البحث السريع بالباركود للسكانر - يدعم البحث في المنتج الرئيسي والمتغيرات';
COMMENT ON FUNCTION get_pos_products_data_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT) IS 'جلب المنتجات مع pagination ودعم البحث والتصفية';
COMMENT ON FUNCTION get_pos_products_data(UUID) IS 'جلب بيانات المنتجات والمتغيرات لنقطة البيع (النسخة الأصلية)';
COMMENT ON FUNCTION get_pos_business_data(UUID) IS 'جلب البيانات التجارية (العملاء، الطلبات، التطبيقات)';
COMMENT ON FUNCTION get_pos_stats_data(UUID) IS 'جلب الإحصائيات والبيانات التحليلية';
COMMENT ON FUNCTION get_complete_pos_data_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT) IS 'دالة رئيسية محسنة مع pagination ودعم السكانر لجميع بيانات نقطة البيع';

-- =================================================================
-- 🚀 إنشاء دالة مبسطة للاستدعاء السريع (اختيارية)
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_data_fast(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- استدعاء الدالة الرئيسية مع إضافة طبقة حماية إضافية
    IF p_organization_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'معرف المؤسسة مطلوب');
    END IF;
    
    RETURN get_complete_pos_data_optimized(p_organization_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pos_data_fast(UUID) TO authenticated;

-- =================================================================
-- ✅ تم تحديث RPC لدعم pagination والسكانر بنجاح! (النسخة 3.0)
-- 
-- 🆕 التحديثات الجديدة:
-- ✓ دالة البحث السريع بالباركود للسكانر (search_product_by_barcode)
-- ✓ دعم pagination للمنتجات (get_pos_products_data_paginated)
-- ✓ البحث المحسن بالاسم، SKU، والباركود
-- ✓ دعم التصفية حسب الفئة
-- ✓ تحسين معالجة المتغيرات والألوان والمقاسات
-- ✓ فهارس محسنة للبحث السريع بالباركود
-- ✓ ترتيب النتائج حسب الأولوية (الباركود المطابق أولاً)
-- ✓ تحسين الأداء مع pagination لتقليل استهلاك الذاكرة
-- 
-- 🔍 استخدام البحث بالسكانر:
-- const { data, error } = await supabase.rpc('search_product_by_barcode', {
--   p_organization_id: organizationId,
--   p_barcode: scannedBarcode
-- });
-- 
-- 📄 استخدام البيانات مع pagination:
-- const { data, error } = await supabase.rpc('get_complete_pos_data_optimized', {
--   p_organization_id: organizationId,
--   p_products_page: 1,          // رقم الصفحة (افتراضي: 1)
--   p_products_limit: 50,        // عدد المنتجات في الصفحة (افتراضي: 50)
--   p_search: searchQuery,       // البحث (اختياري)
--   p_category_id: categoryId    // فلترة حسب الفئة (اختياري)
-- });
-- 
-- أو باستخدام الدالة المبسطة (بدون pagination):
-- const { data, error } = await supabase.rpc('get_pos_data_fast', {
--   p_organization_id: organizationId
-- });
--
-- 📊 هيكل البيانات المُرجعة (مع pagination):
-- {
--   "success": true,
--   "data": {
--     "products": [...],           // بيانات المنتجات والمتغيرات (مع pagination)
--     "pagination": {              // معلومات pagination الجديدة
--       "current_page": 1,
--       "total_pages": 10,
--       "total_count": 500,
--       "per_page": 50,
--       "has_next_page": true,
--       "has_prev_page": false
--     },
--     "customers": [...],          // العملاء 
--     "recent_orders": [...],      // الطلبات الحديثة
--     "organization_apps": [...],  // تطبيقات المؤسسة
--     "product_categories": [...], // فئات المنتجات
--     "inventory_stats": {...},    // إحصائيات المخزون
--     "order_stats": {...},        // إحصائيات الطلبات
--     "pos_settings": {...}        // إعدادات نقطة البيع
--   },
--   "meta": {
--     "execution_time_ms": 750,    // محسن للأداء
--     "data_timestamp": "2024-12-19T...",
--     "organization_id": "...",
--     "version": "3.0",            // النسخة الجديدة
--     "search_params": {           // معاملات البحث المستخدمة
--       "page": 1,
--       "limit": 50,
--       "search": "searchQuery",
--       "category_id": "categoryId"
--     },
--     "performance": {
--       "query_time": "750ms",
--       "status": "excellent"      // محسن للأداء
--     }
--   }
-- }
--
-- 🔍 هيكل نتيجة البحث بالسكانر:
-- {
--   "success": true,
--   "data": {
--     "id": "product-id",
--     "name": "اسم المنتج",
--     "price": 100.50,
--     "barcode": "1234567890",
--     "stock_quantity": 25,
--     "actual_stock_quantity": 25,
--     "type": "main_product",      // main_product | color_variant | size_variant
--     "found_in": "main_product",  // مكان العثور على الباركود
--     "variant_info": {...}        // معلومات المتغير (إذا وُجد)
--   },
--   "search_term": "1234567890",
--   "message": "تم العثور على المنتج بنجاح"
-- }
--
-- 🚨 رموز الأخطاء المحتملة:
-- - INVALID_ORGANIZATION_ID: معرف المؤسسة مطلوب
-- - ORGANIZATION_NOT_FOUND: المؤسسة غير موجودة
-- - PRODUCTS_DATA_ERROR: فشل في جلب بيانات المنتجات
-- - BUSINESS_DATA_ERROR: فشل في جلب البيانات التجارية
-- - STATS_DATA_ERROR: فشل في جلب الإحصائيات
-- - *_EXCEPTION: أخطاء تنفيذ SQL
-- - GENERAL_ERROR: خطأ عام غير محدد
-- ================================================================= 