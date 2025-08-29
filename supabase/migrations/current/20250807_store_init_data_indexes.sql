-- 🚀 فهارس محسنة لدعم دالة get_store_init_data المحسنة
-- Performance indexes for optimized get_store_init_data function

-- =====================================================
-- 📋 فهارس أساسية محسنة
-- =====================================================

-- 1. فهرس مركب للمنظمات مع subdomain (مهم جداً)
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_ultra_store 
ON organizations (subdomain, subscription_status) 
WHERE subscription_status = 'active';

-- 2. فهرس تغطية للمنتجات المميزة مع جميع البيانات المطلوبة
CREATE INDEX IF NOT EXISTS idx_products_featured_ultra_covering_store 
ON products (organization_id, is_featured, is_active, created_at DESC) 
INCLUDE (
    id, name, slug, description, price, compare_at_price, sku, 
    stock_quantity, thumbnail_image, category_id, subcategory_id
);

-- 3. فهرس مركب للفئات مع عدد المنتجات (بدون COUNT بطيء)
CREATE INDEX IF NOT EXISTS idx_product_categories_org_active_ultra_store 
ON product_categories (organization_id, is_active, name) 
WHERE is_active = true;

-- 4. فهرس مركب للفئات الفرعية مع JOIN محسن
CREATE INDEX IF NOT EXISTS idx_product_subcategories_cat_active_ultra_store 
ON product_subcategories (category_id, is_active, name) 
WHERE is_active = true;

-- 5. فهرس محسن لإعدادات المنظمة مع JOIN
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_ultra_store 
ON organization_settings (organization_id, enable_public_site) 
INCLUDE (
    site_name, logo_url, favicon_url, theme_primary_color, 
    theme_secondary_color, theme_mode, custom_css, custom_header, custom_footer
);

-- 6. فهرس محسن لإعدادات المتجر مع الترتيب
CREATE INDEX IF NOT EXISTS idx_store_settings_org_component_ultra_store 
ON store_settings (organization_id, is_active, component_type, order_index) 
WHERE is_active = true;

-- 7. فهرس محسن للشحن مع JOIN
CREATE INDEX IF NOT EXISTS idx_shipping_provider_settings_org_enabled_ultra_store 
ON shipping_provider_settings (organization_id, is_enabled, provider_id) 
WHERE is_enabled = true;

-- 8. فهرس محسن للشهادات مع الترتيب
CREATE INDEX IF NOT EXISTS idx_customer_testimonials_org_active_ultra_store 
ON customer_testimonials (organization_id, is_active, created_at DESC) 
WHERE is_active = true;

-- =====================================================
-- 📋 فهارس متخصصة إضافية
-- =====================================================

-- 9. فهرس محسن للفئات مع JOIN للمنتجات
CREATE INDEX IF NOT EXISTS idx_product_categories_products_join_store 
ON product_categories (organization_id, is_active) 
INCLUDE (id, name, description, slug, icon, image_url, type, created_at, updated_at);

-- 10. فهرس محسن للفئات الفرعية مع JOIN للفئات
CREATE INDEX IF NOT EXISTS idx_product_subcategories_categories_join_store 
ON product_subcategories (category_id, is_active) 
INCLUDE (id, name, description, slug, created_at, updated_at);

-- 11. فهرس محسن للمنتجات مع JOIN للفئات والفئات الفرعية
CREATE INDEX IF NOT EXISTS idx_products_categories_subcategories_join_store 
ON products (organization_id, is_featured, is_active, created_at DESC) 
INCLUDE (
    id, name, slug, description, price, compare_at_price, sku, 
    stock_quantity, thumbnail_image, category_id, subcategory_id
);

-- 12. فهرس محسن لإعدادات المتجر مع JOIN
CREATE INDEX IF NOT EXISTS idx_store_settings_components_ultra_store 
ON store_settings (organization_id, is_active, component_type) 
INCLUDE (id, settings, order_index)
WHERE is_active = true;

-- 13. فهرس محسن للشحن مع JOIN للمزودين
CREATE INDEX IF NOT EXISTS idx_shipping_provider_settings_providers_join_store 
ON shipping_provider_settings (organization_id, is_enabled) 
INCLUDE (provider_id)
WHERE is_enabled = true;

-- 14. فهرس محسن للشهادات مع JOIN للمنتجات
CREATE INDEX IF NOT EXISTS idx_customer_testimonials_products_join_store 
ON customer_testimonials (organization_id, is_active, created_at DESC) 
INCLUDE (id, customer_name, customer_avatar, rating, comment, product_name, product_image)
WHERE is_active = true;

-- =====================================================
-- 📋 فهارس تغطية متقدمة
-- =====================================================

-- 15. فهرس تغطية شامل للمنظمات
CREATE INDEX IF NOT EXISTS idx_organizations_covering_ultra_store 
ON organizations (id, subdomain, subscription_status) 
INCLUDE (
    name, logo_url, description, created_at, updated_at, domain,
    settings
) WHERE subscription_status = 'active';

-- 16. فهرس تغطية شامل للمنتجات المميزة
CREATE INDEX IF NOT EXISTS idx_products_featured_covering_ultra_store 
ON products (id, organization_id, is_featured, is_active, created_at DESC) 
INCLUDE (
    name, slug, description, price, compare_at_price, sku, 
    stock_quantity, thumbnail_image, category_id, subcategory_id
) WHERE is_featured = true AND is_active = true;

-- 17. فهرس تغطية شامل للفئات
CREATE INDEX IF NOT EXISTS idx_product_categories_covering_ultra_store 
ON product_categories (id, organization_id, is_active) 
INCLUDE (
    name, description, slug, icon, image_url, type, created_at, updated_at
) WHERE is_active = true;

-- 18. فهرس تغطية شامل للفئات الفرعية
CREATE INDEX IF NOT EXISTS idx_product_subcategories_covering_ultra_store 
ON product_subcategories (id, category_id, is_active) 
INCLUDE (
    name, description, slug, created_at, updated_at
) WHERE is_active = true;

-- =====================================================
-- 📋 فهارس البحث النصي السريع
-- =====================================================

-- 19. فهرس بحث نصي محسن للمنتجات
CREATE INDEX IF NOT EXISTS idx_products_search_ultra_fast_store 
ON products USING gin (
    to_tsvector('arabic', 
        name || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(sku, '')
    )
) WHERE is_active = true;

-- 20. فهرس بحث نصي محسن للفئات
CREATE INDEX IF NOT EXISTS idx_product_categories_search_ultra_fast_store 
ON product_categories USING gin (
    to_tsvector('arabic', name || ' ' || COALESCE(description, ''))
) WHERE is_active = true;

-- =====================================================
-- 📋 فهارس مركبة متقدمة
-- =====================================================

-- 21. فهرس مركب للمنتجات مع الفئات والفئات الفرعية
CREATE INDEX IF NOT EXISTS idx_products_categories_subcategories_ultra_store 
ON products (organization_id, category_id, subcategory_id, is_featured, is_active) 
INCLUDE (id, name, slug, price, thumbnail_image, created_at)
WHERE is_active = true;

-- 22. فهرس مركب للفئات مع عدد المنتجات (بدون COUNT)
CREATE INDEX IF NOT EXISTS idx_product_categories_product_count_ultra_store 
ON product_categories (organization_id, is_active, name) 
INCLUDE (id, description, slug, icon, image_url, type)
WHERE is_active = true;

-- 23. فهرس مركب للفئات الفرعية مع JOIN
CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_join_ultra_store 
ON product_subcategories (category_id, is_active, name) 
INCLUDE (id, description, slug)
WHERE is_active = true;

-- 24. فهرس مركب لإعدادات المتجر مع المكونات
CREATE INDEX IF NOT EXISTS idx_store_settings_components_ultra_store_v2 
ON store_settings (organization_id, is_active, component_type, order_index) 
INCLUDE (id, settings)
WHERE is_active = true;

-- =====================================================
-- 📋 فهارس متخصصة للشحن
-- =====================================================

-- 25. فهرس محسن لإعدادات الشحن مع JOIN
CREATE INDEX IF NOT EXISTS idx_shipping_provider_settings_ultra_store_v2 
ON shipping_provider_settings (organization_id, is_enabled) 
INCLUDE (provider_id, api_key, settings)
WHERE is_enabled = true;

-- 26. فهرس محسن لمزودي الشحن
CREATE INDEX IF NOT EXISTS idx_shipping_providers_active_ultra_store 
ON shipping_providers (id, is_active) 
INCLUDE (name, code, base_url)
WHERE is_active = true;

-- =====================================================
-- 📋 فهارس متخصصة للشهادات
-- =====================================================

-- 27. فهرس محسن للشهادات مع الترتيب
CREATE INDEX IF NOT EXISTS idx_customer_testimonials_ultra_store_v2 
ON customer_testimonials (organization_id, is_active, created_at DESC) 
INCLUDE (
    id, customer_name, customer_avatar, rating, comment, 
    product_name, product_image
)
WHERE is_active = true;

-- =====================================================
-- 📋 تحديث إحصائيات الفهارس
-- =====================================================

-- تحديث إحصائيات الفهارس
ANALYZE organizations;
ANALYZE organization_settings;
ANALYZE product_categories;
ANALYZE product_subcategories;
ANALYZE products;
ANALYZE store_settings;
ANALYZE shipping_provider_settings;
ANALYZE shipping_providers;
ANALYZE customer_testimonials;

-- عرض معلومات الفهارس المحسنة
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE indexname LIKE '%store%'
AND schemaname = 'public'
ORDER BY tablename, indexname;
