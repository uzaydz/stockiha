-- =================================================================
-- خطة تحسين قاعدة البيانات - المرحلة الأولى
-- =================================================================

-- 1. إزالة الفهارس المكررة
DROP INDEX IF EXISTS idx_organization_settings_org_id;
-- نبقي على idx_organization_settings_organization_id فقط

-- 2. إضافة فهارس محسنة للمنتجات المميزة
CREATE INDEX IF NOT EXISTS idx_products_featured_active 
ON products (organization_id, is_featured, is_active, created_at DESC) 
WHERE is_featured = true AND is_active = true;

-- 3. فهرس محسن للفئات مع عدد المنتجات
CREATE INDEX IF NOT EXISTS idx_categories_with_product_count 
ON product_categories (organization_id, is_active) 
INCLUDE (name, description, slug, icon, image_url);

-- 4. فهرس محسن لإعدادات المتجر
CREATE INDEX IF NOT EXISTS idx_store_settings_active_ordered 
ON store_settings (organization_id, is_active, order_index) 
WHERE is_active = true;

-- =================================================================
-- دالة محسنة لجلب البيانات الأساسية فقط
-- =================================================================
CREATE OR REPLACE FUNCTION get_store_basic_data(org_subdomain TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_org_id UUID;
    v_org_data JSON;
    v_settings_data JSON;
BEGIN
    -- جلب المؤسسة والإعدادات في استعلام واحد
    SELECT json_build_object(
        'organization', json_build_object(
            'id', o.id,
            'name', o.name,
            'description', o.description,
            'logo_url', o.logo_url,
            'subdomain', o.subdomain,
            'domain', o.domain,
            'contact_email', o.settings->>'contact_email'
        ),
        'settings', json_build_object(
            'id', os.id,
            'site_name', os.site_name,
            'theme_primary_color', os.theme_primary_color,
            'theme_secondary_color', os.theme_secondary_color,
            'theme_mode', os.theme_mode,
            'custom_css', os.custom_css,
            'enable_public_site', os.enable_public_site,
            'maintenance_mode', COALESCE(os.enable_public_site, true) = false
        )
    )
    INTO v_org_data
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE o.subdomain = org_subdomain
    LIMIT 1;

    IF v_org_data IS NULL THEN
        RETURN json_build_object('error', 'Organization not found');
    END IF;

    RETURN v_org_data;
END;
$$;

-- =================================================================
-- دالة محسنة لجلب الفئات مع عدد المنتجات
-- =================================================================
CREATE OR REPLACE FUNCTION get_store_categories(org_id UUID, limit_count INTEGER DEFAULT 6)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(category_data ORDER BY category_data->>'name'), '[]'::json)
        FROM (
            SELECT json_build_object(
                'id', pc.id,
                'name', pc.name,
                'description', pc.description,
                'slug', pc.slug,
                'icon', pc.icon,
                'image_url', pc.image_url,
                'product_count', (
                    SELECT COUNT(*)::integer 
                    FROM products p 
                    WHERE p.category_id = pc.id 
                    AND p.is_active = true
                )
            ) as category_data
            FROM product_categories pc
            WHERE pc.organization_id = org_id 
            AND pc.is_active = true
            ORDER BY pc.name
            LIMIT limit_count
        ) categories
    );
END;
$$;

-- =================================================================
-- دالة محسنة لجلب المنتجات المميزة
-- =================================================================
CREATE OR REPLACE FUNCTION get_store_featured_products(org_id UUID, limit_count INTEGER DEFAULT 4)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(product_data ORDER BY product_data->>'created_at' DESC), '[]'::json)
        FROM (
            SELECT json_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'price', p.price,
                'compare_at_price', p.compare_at_price,
                'sku', p.sku,
                'slug', p.slug,
                'thumbnail_url', p.thumbnail_image,
                'stock_quantity', p.stock_quantity,
                'is_featured', p.is_featured,
                'category_name', c.name,
                'category_slug', c.slug,
                'created_at', p.created_at
            ) as product_data
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.id
            WHERE p.organization_id = org_id 
            AND p.is_featured = true 
            AND p.is_active = true
            ORDER BY p.created_at DESC
            LIMIT limit_count
        ) products
    );
END;
$$;

-- =================================================================
-- دالة محسنة رئيسية مع التحميل التدريجي
-- =================================================================
CREATE OR REPLACE FUNCTION get_store_optimized_data(org_subdomain TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_basic_data JSON;
    v_categories JSON;
    v_featured_products JSON;
    v_store_components JSON;
    v_org_id UUID;
BEGIN
    -- جلب البيانات الأساسية
    v_basic_data := get_store_basic_data(org_subdomain);
    
    -- التحقق من وجود خطأ
    IF v_basic_data->>'error' IS NOT NULL THEN
        RETURN v_basic_data;
    END IF;
    
    -- استخراج معرف المؤسسة
    v_org_id := (v_basic_data->'organization'->>'id')::UUID;
    
    -- جلب البيانات الإضافية
    v_categories := get_store_categories(v_org_id, 6);
    v_featured_products := get_store_featured_products(v_org_id, 4);
    
    -- جلب مكونات المتجر
    SELECT COALESCE(json_agg(json_build_object(
        'id', ss.id,
        'type', ss.component_type,
        'settings', ss.settings,
        'isActive', ss.is_active,
        'orderIndex', ss.order_index
    ) ORDER BY ss.order_index), '[]'::json)
    INTO v_store_components
    FROM store_settings ss
    WHERE ss.organization_id = v_org_id 
    AND ss.is_active = true;
    
    -- دمج كل البيانات
    RETURN json_build_object(
        'organization_details', v_basic_data->'organization',
        'organization_settings', v_basic_data->'settings',
        'categories', v_categories,
        'featured_products', v_featured_products,
        'store_layout_components', v_store_components,
        'shipping_info', json_build_object(
            'has_shipping_providers', false,
            'default_shipping_zone_id', null,
            'default_shipping_zone_details', null
        )
    );
END;
$$;

-- =================================================================
-- فهارس إضافية للأداء
-- =================================================================

-- فهرس للبحث السريع في النطاقات الفرعية
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_lower 
ON organizations (LOWER(subdomain)) 
WHERE subdomain IS NOT NULL;

-- فهرس للمنتجات النشطة حسب المؤسسة
CREATE INDEX IF NOT EXISTS idx_products_org_active_featured 
ON products (organization_id, is_active, is_featured) 
WHERE is_active = true;

-- إحصائيات محدثة
ANALYZE organizations;
ANALYZE organization_settings;
ANALYZE products;
ANALYZE product_categories;
ANALYZE store_settings; 