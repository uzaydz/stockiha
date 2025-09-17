-- إضافة دعم النطاقات المخصصة للمتاجر
-- Migration لإضافة النطاقات المخصصة للمنظمات الموجودة

-- البحث عن المنظمة التي تستخدم subdomain 'asraycollection'
-- وإضافة النطاق المخصص 'asrayclothing.com' لها
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- البحث عن المنظمة باستخدام subdomain
    SELECT id INTO org_id
    FROM organizations
    WHERE subdomain = 'asraycollection'
    AND subscription_status = 'active'
    LIMIT 1;

    -- إذا تم العثور على المنظمة، أضف النطاق المخصص
    IF org_id IS NOT NULL THEN
        -- تحديث النطاق المخصص للمنظمة
        UPDATE organizations
        SET domain = 'asrayclothing.com',
            updated_at = NOW()
        WHERE id = org_id;

        RAISE NOTICE 'تم إضافة النطاق المخصص asrayclothing.com للمنظمة %', org_id;
    ELSE
        RAISE NOTICE 'لم يتم العثور على منظمة مع subdomain asraycollection';
    END IF;
END $$;

-- التحقق من النتيجة
SELECT
    id,
    name,
    subdomain,
    domain,
    subscription_status
FROM organizations
WHERE subdomain = 'asraycollection' OR domain = 'asrayclothing.com';

-- إضافة فهرس للبحث السريع بالنطاقات المخصصة
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;

-- تحديث إعدادات المنظمة لتتضمن معلومات النطاق المخصص
INSERT INTO organization_settings (
    organization_id,
    site_name,
    enable_public_site,
    theme_primary_color,
    theme_secondary_color,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM organizations WHERE subdomain = 'asraycollection' LIMIT 1),
    'ASRAY',
    TRUE,
    '#007bff',
    '#6c757d',
    NOW(),
    NOW()
) ON CONFLICT (organization_id) DO UPDATE SET
    site_name = EXCLUDED.site_name,
    enable_public_site = EXCLUDED.enable_public_site,
    updated_at = NOW();

-- التحقق من إعدادات المنظمة
SELECT
    os.organization_id,
    os.site_name,
    os.enable_public_site,
    os.theme_primary_color,
    os.theme_secondary_color,
    o.name,
    o.subdomain,
    o.domain
FROM organization_settings os
JOIN organizations o ON os.organization_id = o.id
WHERE o.subdomain = 'asraycollection' OR o.domain = 'asrayclothing.com';
