-- ملف مهام الصيانة الدورية لنظام Bazaar
-- يجب تشغيل هذه المهام دورياً للحفاظ على الأداء الأمثل

-- =======================
-- 1. تنظيف cache المنتهي الصلاحية (يومياً)
-- =======================

-- مهمة تنظيف cache المنتهي الصلاحية
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    SELECT cleanup_expired_organization_cache() INTO deleted_count;
    RAISE NOTICE 'تم حذف % سجل منتهي الصلاحية من organization_cache', deleted_count;
END $$;

-- =======================
-- 2. إعادة بناء الفهارس (أسبوعياً)
-- =======================

-- إعادة بناء الفهارس المهمة
-- ملاحظة: REINDEX CONCURRENTLY لا يمكن تشغيله داخل transaction
-- يجب تشغيل هذه الأوامر بشكل منفصل خارج أي transaction block

-- REINDEX INDEX CONCURRENTLY idx_organizations_subdomain_optimized;
-- REINDEX INDEX CONCURRENTLY idx_organizations_domain_optimized;
-- REINDEX INDEX CONCURRENTLY idx_organizations_active_subdomains;

-- بديل آمن داخل transaction:
REINDEX INDEX idx_organizations_subdomain_optimized;
REINDEX INDEX idx_organizations_domain_optimized;
REINDEX INDEX idx_organizations_active_subdomains;

-- =======================
-- 2.1 مهام الصيانة المتزامنة (أسبوعياً)
-- =======================

-- ملاحظة: هذه المهام تتطلب CONCURRENTLY ويجب تشغيلها في ملف منفصل
-- استخدم: \i sql/bazaar_concurrent_maintenance.sql
-- أو قم بتشغيلها في Supabase SQL Editor بدون transaction block

-- =======================
-- 3. تحديث الإحصائيات (يومياً)
-- =======================

-- تحديث إحصائيات الجداول المهمة
ANALYZE organizations;
ANALYZE organization_cache;
ANALYZE organization_settings;
ANALYZE products;
ANALYZE orders;

-- =======================
-- 4. فحص صحة cache (أسبوعياً)
-- =======================

-- فحص البيانات المتضاربة في cache
DO $$
DECLARE
    inconsistent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO inconsistent_count
    FROM organization_cache oc
    LEFT JOIN organizations o ON oc.organization_id = o.id
    WHERE o.id IS NULL OR o.subdomain != oc.subdomain;
    
    IF inconsistent_count > 0 THEN
        -- حذف البيانات المتضاربة
        DELETE FROM organization_cache oc
        WHERE NOT EXISTS (
            SELECT 1 FROM organizations o 
            WHERE o.id = oc.organization_id 
            AND o.subdomain = oc.subdomain
        );
        
        RAISE NOTICE 'تم حذف % سجل متضارب من cache', inconsistent_count;
    ELSE
        RAISE NOTICE 'cache صحي - لا توجد بيانات متضاربة';
    END IF;
END $$;

-- =======================
-- 5. تحسين جدول organizations (شهرياً)
-- =======================

-- إعادة ترتيب الجدول لتحسين الأداء
-- VACUUM FULL organizations; -- تشغيل في وقت الصيانة فقط

-- تحسين خفيف
VACUUM ANALYZE organizations;
VACUUM ANALYZE organization_cache;

-- =======================
-- 6. مراقبة الأداء
-- =======================

-- تقرير أداء cache
DO $$
DECLARE
    total_orgs INTEGER;
    cached_orgs INTEGER;
    cache_hit_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_orgs FROM organizations WHERE subscription_status = 'active';
    SELECT COUNT(*) INTO cached_orgs FROM organization_cache WHERE expires_at > NOW();
    
    cache_hit_rate := (cached_orgs::NUMERIC / NULLIF(total_orgs, 0)) * 100;
    
    RAISE NOTICE '📊 تقرير أداء Cache:';
    RAISE NOTICE '   - إجمالي المؤسسات النشطة: %', total_orgs;
    RAISE NOTICE '   - المؤسسات في Cache: %', cached_orgs;
    RAISE NOTICE '   - معدل Cache Hit: %٪', ROUND(cache_hit_rate, 2);
    
    IF cache_hit_rate < 80 THEN
        RAISE WARNING 'معدل Cache Hit منخفض (< 80٪) - قد تحتاج لإعادة ملء Cache';
    END IF;
END $$;

-- =======================
-- 7. إعادة ملء cache للمؤسسات النشطة (عند الحاجة)
-- =======================

-- إعادة ملء cache للمؤسسات النشطة
INSERT INTO organization_cache (subdomain, organization_id, data, last_updated, expires_at)
SELECT 
    subdomain,
    id,
    jsonb_build_object(
        'id', id,
        'name', name,
        'subdomain', subdomain,
        'domain', domain,
        'logo_url', logo_url,
        'description', description,
        'subscription_status', subscription_status,
        'subscription_tier', subscription_tier,
        'theme_primary_color', settings->>'theme_primary_color',
        'theme_secondary_color', settings->>'theme_secondary_color',
        'website_url', settings->>'website_url',
        'contact_email', settings->>'contact_email',
        'language', settings->>'language',
        'currency', settings->>'currency',
        'timezone', settings->>'timezone',
        'created_at', created_at,
        'updated_at', updated_at
    ),
    NOW(),
    NOW() + INTERVAL '30 minutes'
FROM organizations 
WHERE subscription_status = 'active' 
AND subdomain IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_cache oc 
    WHERE oc.subdomain = organizations.subdomain 
    AND oc.expires_at > NOW()
);

-- =======================
-- 8. تقرير الصيانة النهائي
-- =======================

DO $$
BEGIN
    RAISE NOTICE '✅ تمت مهام الصيانة بنجاح!';
    RAISE NOTICE '📅 تاريخ آخر صيانة: %', NOW();
    RAISE NOTICE '🔧 المهام المنجزة:';
    RAISE NOTICE '   - تنظيف cache المنتهي الصلاحية';
    RAISE NOTICE '   - تحديث الإحصائيات';
    RAISE NOTICE '   - فحص صحة cache';
    RAISE NOTICE '   - تحسين الجداول';
    RAISE NOTICE '   - إعادة ملء cache';
    RAISE NOTICE '📋 الجدولة الموصى بها:';
    RAISE NOTICE '   - تنظيف cache: يومياً';
    RAISE NOTICE '   - تحديث الإحصائيات: يومياً';
    RAISE NOTICE '   - فحص صحة cache: أسبوعياً';
    RAISE NOTICE '   - إعادة بناء الفهارس: أسبوعياً';
    RAISE NOTICE '   - تحسين الجداول: شهرياً';
END $$;
