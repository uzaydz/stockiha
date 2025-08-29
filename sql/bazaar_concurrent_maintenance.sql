-- ملف مهام الصيانة المتزامنة لنظام Bazaar
-- يجب تشغيل هذه المهام بشكل منفصل خارج أي transaction block
-- لأنها تستخدم CONCURRENTLY

-- =======================
-- ⚠️ تحذير مهم
-- =======================
-- هذا الملف يجب تشغيله في Supabase SQL Editor
-- بدون تحديد transaction block
-- استخدم: \i sql/bazaar_concurrent_maintenance.sql

-- =======================
-- 1. إعادة بناء الفهارس باستخدام CONCURRENTLY
-- =======================

-- إعادة بناء الفهارس المهمة بدون قفل الجداول
REINDEX INDEX CONCURRENTLY idx_organizations_subdomain_optimized;
REINDEX INDEX CONCURRENTLY idx_organizations_domain_optimized;
REINDEX INDEX CONCURRENTLY idx_organizations_active_subdomains;

-- =======================
-- 2. إنشاء فهارس جديدة باستخدام CONCURRENTLY
-- =======================

-- فهرس محسن للبحث في settings JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_settings_theme
ON organizations USING GIN ((settings->'theme_primary_color'))
WHERE settings->>'theme_primary_color' IS NOT NULL;

-- فهرس محسن للبحث في language
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_language
ON organizations (settings->>'language')
WHERE settings->>'language' IS NOT NULL;

-- فهرس محسن للبحث في currency
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_currency
ON organizations (settings->>'currency')
WHERE settings->>'currency' IS NOT NULL;

-- =======================
-- 3. تحسين فهارس الجداول المرتبطة
-- =======================

-- فهرس محسن لجدول organization_settings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_settings_org_id
ON organization_settings (organization_id)
WHERE organization_id IS NOT NULL;

-- فهرس محسن لجدول products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_org_status
ON products (organization_id, status)
WHERE organization_id IS NOT NULL AND status = 'active';

-- =======================
-- 4. تقرير الإنجاز
-- =======================

DO $$
BEGIN
    RAISE NOTICE '✅ تمت مهام الصيانة المتزامنة بنجاح!';
    RAISE NOTICE '📅 تاريخ آخر صيانة متزامنة: %', NOW();
    RAISE NOTICE '🔧 المهام المنجزة:';
    RAISE NOTICE '   - إعادة بناء الفهارس باستخدام CONCURRENTLY';
    RAISE NOTICE '   - إنشاء فهارس جديدة محسنة';
    RAISE NOTICE '   - تحسين فهارس الجداول المرتبطة';
    RAISE NOTICE '📋 ملاحظات مهمة:';
    RAISE NOTICE '   - تم استخدام CONCURRENTLY لتجنب قفل الجداول';
    RAISE NOTICE '   - يمكن تشغيل هذه المهام أثناء عمل النظام';
    RAISE NOTICE '   - يجب تشغيلها أسبوعياً للحفاظ على الأداء';
END $$;
