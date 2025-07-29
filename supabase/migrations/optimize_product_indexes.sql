-- 🚀 فهارس محسنة لتحسين أداء get_product_complete_data

-- 1. فهرس مركب للمنتجات مع معرف المؤسسة والحالة النشطة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_org_active_complete
ON products (organization_id, is_active, id)
WHERE is_active = TRUE;

-- 2. فهرس محسن للألوان مع تضمين البيانات المطلوبة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_complete_optimized
ON product_colors (product_id, is_default DESC, created_at)
INCLUDE (id, name, color_code, image_url, quantity, price);

-- 3. فهرس محسن للأحجام مع تضمين البيانات
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_sizes_complete_optimized  
ON product_sizes (color_id, is_default DESC, created_at)
INCLUDE (id, size_name, quantity, price);

-- 4. فهرس للصور مع ترتيب محسن
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_sort_optimized
ON product_images (product_id, sort_order)
INCLUDE (id, image_url);

-- 5. فهرس للنماذج مع GIN للمنتجات المخصصة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_settings_product_custom_optimized
ON form_settings USING GIN (product_ids)
WHERE is_active = TRUE;

-- 6. فهرس مركب للنماذج الافتراضية
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_settings_default_active_org
ON form_settings (organization_id, is_default, is_active, updated_at DESC)
WHERE is_active = TRUE AND is_default = TRUE;

-- 7. فهرس للإعدادات المتقدمة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_advanced_settings_optimized
ON product_advanced_settings (product_id)
INCLUDE (use_custom_currency, skip_cart);

-- 8. فهرس للإعدادات التسويقية مع البيانات المضمنة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_marketing_settings_complete
ON product_marketing_settings (product_id)
INCLUDE (offer_timer_enabled, enable_reviews, test_mode, enable_facebook_pixel, 
         facebook_pixel_id, enable_facebook_conversion_api, enable_google_ads_tracking, 
         google_ads_conversion_id);

-- 9. فهرس لمستويات الجملة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wholesale_tiers_product_optimized
ON wholesale_tiers (product_id, min_quantity)
INCLUDE (id, price);

-- 10. فهرس مركب للمؤسسات  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_domain_name
ON organizations (id)
INCLUDE (name, domain);

-- إحصائيات محدثة للفهارس الجديدة
ANALYZE products;
ANALYZE product_colors;
ANALYZE product_sizes;
ANALYZE product_images;
ANALYZE form_settings;
ANALYZE product_advanced_settings;
ANALYZE product_marketing_settings;
ANALYZE wholesale_tiers; 