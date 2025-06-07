-- تصحيح شامل لمشاكل قاعدة البيانات في نظام الشحن
-- تم إعداده بناءً على التحليل المفصل للبنية الحقيقية

-- =========================================
-- الجزء الأول: تنظيف المزودين المكررين
-- =========================================

DO $$
BEGIN
    -- حذف مايستو المكرر (الاحتفاظ بالجديد فقط)
    IF EXISTS (SELECT 1 FROM shipping_providers WHERE code = 'mayesto') THEN
        -- التحقق من وجود بيانات مرتبطة
        IF EXISTS (SELECT 1 FROM shipping_orders WHERE provider_id = (SELECT id FROM shipping_providers WHERE code = 'mayesto')) THEN
            RAISE NOTICE 'تحذير: يوجد طلبيات مرتبطة بمايستو، يتم التحديث بدلاً من الحذف';
            UPDATE shipping_providers 
            SET 
                code = 'maystro_delivery',
                name = 'مايسترو ديليفري',
                base_url = 'https://backend.maystro-delivery.com/api/',
                updated_at = NOW()
            WHERE code = 'mayesto';
        ELSE
            DELETE FROM shipping_providers WHERE code = 'mayesto';
            RAISE NOTICE 'تم حذف مايستو المكرر';
        END IF;
    END IF;
    
    -- إضافة مايسترو ديليفري إذا لم يكن موجوداً
    INSERT INTO shipping_providers (
        code,
        name,
        is_active,
        base_url,
        created_at,
        updated_at
    ) VALUES (
        'maystro_delivery',
        'مايسترو ديليفري',
        true,
        'https://backend.maystro-delivery.com/api/',
        NOW(),
        NOW()
    ) ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        base_url = EXCLUDED.base_url,
        updated_at = NOW();
        
    RAISE NOTICE 'تم إضافة/تحديث مايسترو ديليفري بنجاح';
END $$;

-- =========================================
-- الجزء الثاني: تحديث shipping_data_view
-- =========================================

-- تحديث shipping_data_view - استخدام script منفصل لتجنب تضارب الأعمدة
-- تشغيل: \i update_shipping_data_view.sql
-- 
-- أو تشغيل الأوامر التالية إذا لم يتم تشغيل الـ script المنفصل:

DO $$
BEGIN
    -- حذف View بأمان مع التعامل مع Dependencies
    DROP VIEW IF EXISTS shipping_data_view CASCADE;
    
    -- إنشاء View محدث
    EXECUTE '
    CREATE VIEW shipping_data_view AS
    SELECT 
        sps.id,
        sps.organization_id,
        sps.provider_id,
        sps.is_enabled,
        sps.api_token,
        sps.api_key,
        sps.auto_shipping,
        sps.track_updates,
        sps.settings,
        sps.created_at,
        sps.updated_at,
        CASE
            WHEN sps.provider_id IS NULL THEN ''custom''::character varying
            ELSE sp.code
        END AS provider_code,
        CASE
            WHEN sps.provider_id IS NULL THEN 
                COALESCE(
                    (sps.settings->>''service_name'')::text, 
                    ''طريقة شحن مخصصة''
                )
            ELSE sp.name
        END AS provider_name,
        o.name AS organization_name
    FROM shipping_provider_settings sps
    LEFT JOIN shipping_providers sp ON sps.provider_id = sp.id
    LEFT JOIN organizations o ON sps.organization_id = o.id';
    
    RAISE NOTICE 'تم تحديث shipping_data_view بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'تحذير: فشل في تحديث shipping_data_view - %', SQLERRM;
END $$;

-- إضافة تعليق على View
COMMENT ON VIEW shipping_data_view IS 'عرض موحد لجميع إعدادات شركات التوصيل مع معلومات المزودين والمنظمات';

-- =========================================
-- الجزء الثالث: تحسين الفهارس
-- =========================================

-- فهارس shipping_orders للبحث السريع
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking_number 
ON shipping_orders (tracking_number) 
WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_orders_provider_tracking 
ON shipping_orders (provider_id, tracking_number) 
WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_orders_order_id 
ON shipping_orders (order_id) 
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_orders_org_provider 
ON shipping_orders (organization_id, provider_id);

-- فهارس shipping_provider_settings
CREATE INDEX IF NOT EXISTS idx_shipping_provider_settings_org_provider 
ON shipping_provider_settings (organization_id, provider_id) 
WHERE is_enabled = true;

-- =========================================
-- الجزء الرابع: التحقق من النتائج
-- =========================================

-- عرض نتائج التحديث
SELECT 
    '🔧 نتائج التصحيح:' as status,
    '' as details
UNION ALL
SELECT 
    '📊 إجمالي الشركات',
    COUNT(*)::text || ' شركة'
FROM shipping_providers
UNION ALL
SELECT 
    '✅ الشركات النشطة',
    COUNT(*)::text || ' شركة'
FROM shipping_providers 
WHERE is_active = true
UNION ALL
SELECT 
    '🎯 مايسترو ديليفري',
    CASE 
        WHEN EXISTS (SELECT 1 FROM shipping_providers WHERE code = 'maystro_delivery') 
        THEN '✓ موجود' 
        ELSE '❌ غير موجود' 
    END
UNION ALL
SELECT 
    '📋 shipping_data_view',
    CASE 
        WHEN EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shipping_data_view' 
              AND column_name = 'provider_code'
        ) 
        THEN '✓ يحتوي على provider_code' 
        ELSE '❌ لا يحتوي على provider_code' 
    END;

-- عرض الشركات الرئيسية
SELECT 
    id, 
    code, 
    name, 
    is_active,
    base_url,
    created_at
FROM shipping_providers 
WHERE code IN ('yalidine', 'zrexpress', 'maystro_delivery', 'ecotrack')
ORDER BY 
    CASE code
        WHEN 'yalidine' THEN 1
        WHEN 'zrexpress' THEN 2  
        WHEN 'maystro_delivery' THEN 3
        WHEN 'ecotrack' THEN 4
        ELSE 5
    END; 