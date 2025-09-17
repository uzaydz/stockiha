-- Rollback لإزالة دعم النطاقات المخصصة
-- هذا السكربت يعكس التغييرات الموجودة في 20250808_add_custom_domain_support.sql

-- 1. إزالة النطاق المخصص من المنظمة
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- البحث عن المنظمة التي تحتوي على النطاق المخصص
    SELECT id INTO org_id
    FROM organizations
    WHERE domain = 'asrayclothing.com'
    LIMIT 1;

    -- إذا تم العثور على المنظمة، أزل النطاق المخصص
    IF org_id IS NOT NULL THEN
        -- إزالة النطاق المخصص وإعادة updated_at
        UPDATE organizations
        SET domain = NULL,
            updated_at = NOW()
        WHERE id = org_id;

        RAISE NOTICE 'تم إزالة النطاق المخصص asrayclothing.com من المنظمة %', org_id;
    ELSE
        RAISE NOTICE 'لم يتم العثور على منظمة مع النطاق المخصص asrayclothing.com';
    END IF;
END $$;

-- 2. حذف الفهرس المضاف
DROP INDEX IF EXISTS idx_organizations_domain;

-- 3. حذف إعدادات المنظمة المضافة (اختياري - يمكن الاحتفاظ بها أو حذفها)
-- ملاحظة: هذا سيحذف إعدادات المنظمة بالكامل، إذا كنت تريد الاحتفاظ بها، علّق هذا الجزء
/*
DELETE FROM organization_settings
WHERE organization_id IN (
    SELECT id FROM organizations
    WHERE subdomain = 'asraycollection'
    AND domain IS NULL
);
*/

-- بدلاً من الحذف، يمكننا إعادة إعدادات المنظمة إلى القيم الافتراضية
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- البحث عن المنظمة
    SELECT id INTO org_id
    FROM organizations
    WHERE subdomain = 'asraycollection'
    LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- إعادة إعدادات المنظمة إلى القيم الافتراضية
        UPDATE organization_settings
        SET site_name = NULL,
            enable_public_site = TRUE,
            theme_primary_color = NULL,
            theme_secondary_color = NULL,
            updated_at = NOW()
        WHERE organization_id = org_id;

        RAISE NOTICE 'تم إعادة إعدادات المنظمة % إلى القيم الافتراضية', org_id;
    END IF;
END $$;

-- 4. التحقق من النتيجة بعد التراجع
SELECT
    id,
    name,
    subdomain,
    domain,
    subscription_status,
    updated_at
FROM organizations
WHERE subdomain = 'asraycollection';

-- التحقق من إعدادات المنظمة بعد التراجع
SELECT
    os.organization_id,
    os.site_name,
    os.enable_public_site,
    os.theme_primary_color,
    os.theme_secondary_color,
    os.updated_at,
    o.name,
    o.subdomain,
    o.domain
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.subdomain = 'asraycollection';
