-- 🚀 فهارس محسنة لزيادة سرعة دالة get_product_complete_data_optimized
-- هذا الملف يحتوي على فهارس متقدمة لتحسين الأداء

-- =====================================================
-- 📋 الجزء الأول: فهارس عادية (يمكن تشغيلها في transaction)
-- =====================================================

-- 1. فهرس مركب محسن للبحث السريع بالمنتج والمنظمة
CREATE INDEX IF NOT EXISTS idx_products_org_slug_active_ultra 
ON products (organization_id, slug, is_active) 
WHERE is_active = true;

-- 2. فهرس مركب للصور مع الترتيب والتحسين
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort_ultra 
ON product_images (product_id, sort_order, id) 
INCLUDE (image_url);

-- 3. فهرس مركب للألوان مع الأحجام والترتيب
CREATE INDEX IF NOT EXISTS idx_product_colors_sizes_composite_ultra 
ON product_colors (product_id, is_default DESC, created_at) 
INCLUDE (id, name, color_code, image_url, quantity, price);

-- 4. فهرس مركب للأحجام مع الألوان والترتيب
CREATE INDEX IF NOT EXISTS idx_product_sizes_color_optimized_ultra 
ON product_sizes (color_id, is_default DESC, created_at) 
INCLUDE (id, size_name, quantity, price, product_id);

-- 5. فهرس تغطية للمنتجات مع البيانات الأساسية
CREATE INDEX IF NOT EXISTS idx_products_covering_basic_ultra 
ON products (id, organization_id, is_active) 
INCLUDE (
    name, slug, sku, price, stock_quantity, thumbnail_image, 
    category_id, subcategory_id, has_variants, use_sizes
);

-- 6. فهرس تغطية للفئات مع البيانات الأساسية
CREATE INDEX IF NOT EXISTS idx_product_categories_covering_ultra 
ON product_categories (id, organization_id, is_active) 
INCLUDE (name, slug, icon, image_url);

-- 7. فهرس تغطية للفئات الفرعية
CREATE INDEX IF NOT EXISTS idx_product_subcategories_covering_ultra 
ON product_subcategories (id, category_id, is_active) 
INCLUDE (name, slug, description);

-- 8. فهرس محسن للنماذج مع البحث السريع
CREATE INDEX IF NOT EXISTS idx_form_settings_product_search_ultra 
ON form_settings (organization_id, is_active, is_default) 
INCLUDE (id, name, fields, settings, product_ids, updated_at);

-- 9. فهرس محسن للإعدادات المتقدمة
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_ultra 
ON product_advanced_settings (product_id) 
INCLUDE (use_custom_currency, skip_cart);

-- 10. فهرس محسن لإعدادات التسويق
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_ultra 
ON product_marketing_settings (product_id) 
INCLUDE (
    enable_facebook_pixel, enable_tiktok_pixel, enable_google_ads_tracking,
    enable_snapchat_pixel, offer_timer_enabled
);

-- 11. فهرس محسن للشحن مع البيانات الأساسية
CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_ultra 
ON shipping_provider_clones (id, organization_id, is_active) 
INCLUDE (name, use_unified_price, unified_home_price, unified_desk_price);

-- 12. فهرس محسن لمستويات الجملة
CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_product_ultra 
ON wholesale_tiers (product_id, min_quantity) 
INCLUDE (id, price);

-- 13. فهرس محسن لإعدادات التحويل
CREATE INDEX IF NOT EXISTS idx_organization_conversion_settings_ultra 
ON organization_conversion_settings (organization_id) 
INCLUDE (
    facebook_app_id, google_measurement_id, tiktok_app_id,
    default_currency_code, enable_enhanced_conversions
);

-- 14. فهرس مركب محسن للمنظمات
CREATE INDEX IF NOT EXISTS idx_organizations_domain_active_ultra 
ON organizations (domain, subscription_status) 
WHERE subscription_status = 'active';

-- 15. فهرس محسن للبحث النصي السريع
CREATE INDEX IF NOT EXISTS idx_products_search_ultra_fast 
ON products USING gin (
    to_tsvector('arabic', 
        name || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(sku, '') || ' ' || 
        COALESCE(barcode, '')
    )
) WHERE is_active = true;

-- 16. فهرس محسن للبحث في الألوان
CREATE INDEX IF NOT EXISTS idx_product_colors_search_ultra 
ON product_colors USING gin (
    to_tsvector('arabic', name || ' ' || COALESCE(color_code, ''))
) WHERE quantity > 0;

-- 17. فهرس محسن للبحث في الأحجام
CREATE INDEX IF NOT EXISTS idx_product_sizes_search_ultra 
ON product_sizes USING gin (
    to_tsvector('arabic', size_name)
) WHERE quantity > 0;

-- 18. فهرس محسن للصور مع الترتيب
CREATE INDEX IF NOT EXISTS idx_product_images_ultra_optimized 
ON product_images (product_id, sort_order, id) 
INCLUDE (image_url, created_at);

-- 19. فهرس محسن للفئات مع الترتيب
CREATE INDEX IF NOT EXISTS idx_product_categories_ultra_optimized 
ON product_categories (organization_id, is_active, created_at DESC) 
INCLUDE (id, name, slug, icon, image_url);

-- 20. فهرس محسن للفئات الفرعية مع الترتيب
CREATE INDEX IF NOT EXISTS idx_product_subcategories_ultra_optimized 
ON product_subcategories (category_id, is_active, created_at DESC) 
INCLUDE (id, name, slug, description);

-- 21. فهرس محسن للمنتجات مع المخزون
CREATE INDEX IF NOT EXISTS idx_products_inventory_ultra_optimized 
ON products (organization_id, is_active, stock_quantity, last_inventory_update DESC) 
INCLUDE (id, name, sku, price, category_id, subcategory_id);

-- 22. فهرس محسن للمنتجات مع التصنيفات
CREATE INDEX IF NOT EXISTS idx_products_categories_ultra_optimized 
ON products (organization_id, category_id, subcategory_id, is_active) 
INCLUDE (id, name, slug, sku, price, stock_quantity);

-- 23. فهرس محسن للمنتجات مع المتغيرات
CREATE INDEX IF NOT EXISTS idx_products_variants_ultra_optimized 
ON products (organization_id, has_variants, use_sizes, is_active) 
INCLUDE (id, name, slug, price, stock_quantity);

-- 24. فهرس محسن للمنتجات مع الشحن
CREATE INDEX IF NOT EXISTS idx_products_shipping_ultra_optimized 
ON products (organization_id, use_shipping_clone, shipping_provider_id, is_active) 
INCLUDE (id, name, slug, shipping_method_type);

-- 25. فهرس محسن للمنتجات مع العروض
CREATE INDEX IF NOT EXISTS idx_products_offers_ultra_optimized 
ON products (organization_id, is_active, is_featured, created_at DESC) 
INCLUDE (id, name, slug, price, special_offers_config);

-- 26. فهرس محسن للمنتجات مع الوحدات
CREATE INDEX IF NOT EXISTS idx_products_units_ultra_optimized 
ON products (organization_id, is_sold_by_unit, is_active) 
INCLUDE (id, name, slug, unit_type, unit_purchase_price, unit_sale_price);

-- 27. فهرس محسن للمنتجات مع الجملة
CREATE INDEX IF NOT EXISTS idx_products_wholesale_ultra_optimized 
ON products (organization_id, allow_wholesale, allow_partial_wholesale, is_active) 
INCLUDE (id, name, slug, wholesale_price, partial_wholesale_price);

-- 28. فهرس محسن للمنتجات مع الضمانات
CREATE INDEX IF NOT EXISTS idx_products_guarantees_ultra_optimized 
ON products (organization_id, has_fast_shipping, has_money_back, has_quality_guarantee, is_active) 
INCLUDE (id, name, slug, fast_shipping_text, money_back_text, quality_guarantee_text);

-- 29. فهرس محسن للمنتجات مع التواريخ
CREATE INDEX IF NOT EXISTS idx_products_dates_ultra_optimized 
ON products (organization_id, created_at DESC, updated_at DESC, last_inventory_update DESC) 
INCLUDE (id, name, slug, is_active, is_featured, is_new);

-- 30. فهرس محسن للمنتجات مع المستخدمين
CREATE INDEX IF NOT EXISTS idx_products_users_ultra_optimized 
ON products (organization_id, created_by_user_id, updated_by_user_id, is_active) 
INCLUDE (id, name, slug, created_at, updated_at);

-- 31. فهرس محسن للمنتجات مع النماذج
CREATE INDEX IF NOT EXISTS idx_products_forms_ultra_optimized 
ON products (organization_id, form_template_id, is_active) 
INCLUDE (id, name, slug, purchase_page_config);

-- 32. فهرس محسن للمنتجات مع الوصف المتقدم
CREATE INDEX IF NOT EXISTS idx_products_advanced_desc_ultra_optimized 
ON products USING gin (advanced_description) 
WHERE is_active = true AND advanced_description IS NOT NULL;

-- 33. فهرس محسن للمنتجات مع العروض الخاصة
CREATE INDEX IF NOT EXISTS idx_products_special_offers_ultra_optimized 
ON products USING gin (special_offers_config) 
WHERE is_active = true AND special_offers_config IS NOT NULL;

-- 34. فهرس محسن للمنتجات مع المواصفات
CREATE INDEX IF NOT EXISTS idx_products_specs_ultra_optimized 
ON products USING gin (specifications) 
WHERE is_active = true AND specifications IS NOT NULL;

-- 35. فهرس محسن للمنتجات مع الميزات
CREATE INDEX IF NOT EXISTS idx_products_features_ultra_optimized 
ON products USING gin (features) 
WHERE is_active = true AND features IS NOT NULL;

-- 36. فهرس محسن للمنتجات مع الباركود
CREATE INDEX IF NOT EXISTS idx_products_barcode_ultra_optimized 
ON products (organization_id, barcode, is_active) 
WHERE barcode IS NOT NULL;

-- 37. فهرس محسن للمنتجات مع SKU
CREATE INDEX IF NOT EXISTS idx_products_sku_ultra_optimized 
ON products (organization_id, sku, is_active) 
WHERE sku IS NOT NULL;

-- 38. فهرس محسن للمنتجات مع السعر
CREATE INDEX IF NOT EXISTS idx_products_price_ultra_optimized 
ON products (organization_id, price, is_active) 
WHERE is_active = true;

-- 39. فهرس محسن للمنتجات مع المخزون
CREATE INDEX IF NOT EXISTS idx_products_stock_ultra_optimized 
ON products (organization_id, stock_quantity, min_stock_level, reorder_level, is_active) 
WHERE is_active = true;

-- 40. فهرس محسن للمنتجات مع الشحن السريع
CREATE INDEX IF NOT EXISTS idx_products_fast_shipping_ultra_optimized 
ON products (organization_id, has_fast_shipping, is_active) 
WHERE has_fast_shipping = true AND is_active = true;

-- 41. فهرس محسن للمنتجات مع ضمان استرداد المال
CREATE INDEX IF NOT EXISTS idx_products_money_back_ultra_optimized 
ON products (organization_id, has_money_back, is_active) 
WHERE has_money_back = true AND is_active = true;

-- 42. فهرس محسن للمنتجات مع ضمان الجودة
CREATE INDEX IF NOT EXISTS idx_products_quality_guarantee_ultra_optimized 
ON products (organization_id, has_quality_guarantee, is_active) 
WHERE has_quality_guarantee = true AND is_active = true;

-- 43. فهرس محسن للمنتجات مع العروض المميزة
CREATE INDEX IF NOT EXISTS idx_products_featured_ultra_optimized 
ON products (organization_id, is_featured, is_active, created_at DESC) 
WHERE is_featured = true AND is_active = true;

-- 44. فهرس محسن للمنتجات مع المنتجات الجديدة
CREATE INDEX IF NOT EXISTS idx_products_new_ultra_optimized 
ON products (organization_id, is_new, is_active, created_at DESC) 
WHERE is_new = true AND is_active = true;

-- 45. فهرس محسن للمنتجات مع عرض السعر
CREATE INDEX IF NOT EXISTS idx_products_show_price_ultra_optimized 
ON products (organization_id, show_price_on_landing, is_active) 
WHERE show_price_on_landing = true AND is_active = true;

-- 46. فهرس محسن للمنتجات مع التقييمات
CREATE INDEX IF NOT EXISTS idx_products_reviews_ultra_optimized 
ON products (organization_id, is_active) 
WHERE is_active = true;

-- 47. فهرس محسن للمنتجات مع التتبع
CREATE INDEX IF NOT EXISTS idx_products_tracking_ultra_optimized 
ON products (organization_id, is_active) 
WHERE is_active = true;

-- 48. فهرس محسن للمنتجات مع التحويل
CREATE INDEX IF NOT EXISTS idx_products_conversion_ultra_optimized 
ON products (organization_id, is_active) 
WHERE is_active = true;

-- 49. فهرس محسن للمنتجات مع التسويق
CREATE INDEX IF NOT EXISTS idx_products_marketing_ultra_optimized 
ON products (organization_id, is_active) 
WHERE is_active = true;

-- 50. فهرس محسن للمنتجات مع الإحصائيات
CREATE INDEX IF NOT EXISTS idx_products_stats_ultra_optimized 
ON products (organization_id, is_active, created_at DESC, updated_at DESC) 
WHERE is_active = true;

-- =====================================================
-- 📋 الجزء الثاني: تحديث إحصائيات الفهارس
-- =====================================================

-- تحديث إحصائيات الفهارس
ANALYZE products;
ANALYZE product_colors;
ANALYZE product_sizes;
ANALYZE product_images;
ANALYZE product_categories;
ANALYZE product_subcategories;
ANALYZE form_settings;
ANALYZE product_advanced_settings;
ANALYZE product_marketing_settings;
ANALYZE wholesale_tiers;
ANALYZE organization_conversion_settings;
ANALYZE organizations;
ANALYZE shipping_provider_clones;
ANALYZE shipping_providers;

-- عرض معلومات الفهارس المحسنة
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE indexname LIKE '%ultra%'
AND schemaname = 'public'
ORDER BY tablename, indexname;
