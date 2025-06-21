-- إضافة indexes لتحسين أداء الاستعلامات المتكررة في صفحة المنتج

-- Index على جدول organizations للبحث السريع بال domain
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);

-- Index على جدول product_categories للترتيب والفلترة
CREATE INDEX IF NOT EXISTS idx_product_categories_org_active ON product_categories(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- Index على جدول products للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_products_shipping_provider ON products(shipping_provider_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Index على جدول shipping_provider_clones
CREATE INDEX IF NOT EXISTS idx_shipping_clones_org_active ON shipping_provider_clones(organization_id, is_active);

-- Index على جدول shipping_provider_settings
CREATE INDEX IF NOT EXISTS idx_shipping_settings_org_enabled ON shipping_provider_settings(organization_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_shipping_settings_api_key ON shipping_provider_settings(api_key);

-- Index على جدول yalidine_provinces_global
CREATE INDEX IF NOT EXISTS idx_yalidine_provinces_deliverable ON yalidine_provinces_global(is_deliverable);

-- Index على جدول yalidine_municipalities_global  
CREATE INDEX IF NOT EXISTS idx_yalidine_municipalities_province ON yalidine_municipalities_global(province_id);

-- Index على جدول orders للاستعلامات السريعة
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);

-- Index على جدول store_settings
CREATE INDEX IF NOT EXISTS idx_store_settings_org_component ON store_settings(organization_id, component_type, is_active);

-- تحليل الجداول بعد إضافة indexes
ANALYZE organizations;
ANALYZE product_categories;
ANALYZE products;
ANALYZE shipping_provider_clones;
ANALYZE shipping_provider_settings;
ANALYZE yalidine_provinces_global;
ANALYZE yalidine_municipalities_global;
ANALYZE orders;
ANALYZE store_settings; 