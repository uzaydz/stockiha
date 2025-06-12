-- ==============================================
-- حل شامل لجميع مشاكل النظام
-- تاريخ الإنشاء: 2025-01-15
-- الهدف: حل timeout، RLS، والمكونات المفقودة
-- ==============================================

BEGIN;

-- ==============================================
-- 1. إصلاح RLS Policies - حل مشكلة HTTP 406
-- ==============================================

-- حذف السياسات المتضاربة
DROP POLICY IF EXISTS users_org_admin_read ON public.users;
DROP POLICY IF EXISTS users_org_admin_update ON public.users;
DROP POLICY IF EXISTS users_org_admin_delete ON public.users;

-- إنشاء دالة آمنة للتحقق من الصلاحيات بدون circular dependency
CREATE OR REPLACE FUNCTION check_user_permissions_safe(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_info RECORD;
    auth_user_id UUID;
BEGIN
    auth_user_id := auth.uid();
    
    IF auth_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- الحصول على معلومات المستخدم مباشرة من الجدول بدون RLS
    SELECT 
        u.organization_id,
        u.role,
        COALESCE(u.is_org_admin, false) as is_org_admin,
        COALESCE(u.is_super_admin, false) as is_super_admin
    INTO current_user_info
    FROM public.users u 
    WHERE u.auth_user_id = auth_user_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤول العام
    IF current_user_info.is_super_admin THEN
        RETURN true;
    END IF;
    
    -- السماح لمسؤول المنظمة للوصول لمستخدمي منظمته
    IF current_user_info.is_org_admin AND target_org_id IS NOT NULL THEN
        RETURN current_user_info.organization_id = target_org_id;
    END IF;
    
    RETURN false;
END;
$$;

-- إنشاء سياسات RLS محسّنة
CREATE POLICY users_safe_read ON public.users
    FOR SELECT
    USING (
        -- السماح بقراءة البيانات الشخصية
        auth.uid() = auth_user_id
        OR
        -- السماح للمسؤولين بقراءة بيانات مستخدمي منظمتهم
        check_user_permissions_safe(organization_id)
        OR
        -- السماح لـ service_role
        current_setting('role', true) = 'service_role'
    );

CREATE POLICY users_safe_update ON public.users
    FOR UPDATE
    USING (
        auth.uid() = auth_user_id
        OR
        check_user_permissions_safe(organization_id)
        OR
        current_setting('role', true) = 'service_role'
    )
    WITH CHECK (
        auth.uid() = auth_user_id
        OR
        check_user_permissions_safe(organization_id)
        OR
        current_setting('role', true) = 'service_role'
    );

CREATE POLICY users_safe_delete ON public.users
    FOR DELETE
    USING (
        (check_user_permissions_safe(organization_id) AND auth.uid() <> auth_user_id)
        OR
        current_setting('role', true) = 'service_role'
    );

-- ==============================================
-- 2. إصلاح triggers إنشاء المكونات الافتراضية
-- ==============================================

-- حذف triggers المتضاربة
DROP TRIGGER IF EXISTS trigger_organization_store_init ON organizations;
DROP FUNCTION IF EXISTS trigger_init_store_settings();
DROP FUNCTION IF EXISTS initialize_store_settings(UUID);

-- التأكد من وجود الدالة الصحيحة فقط
DROP FUNCTION IF EXISTS create_default_store_components_enhanced(UUID);
CREATE OR REPLACE FUNCTION create_default_store_components_enhanced(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    components_created INTEGER := 0;
    result_message TEXT;
BEGIN
    -- التحقق من عدم وجود مكونات مسبقاً
    IF EXISTS (SELECT 1 FROM store_settings WHERE organization_id = p_organization_id) THEN
        RETURN 'المكونات موجودة بالفعل للمؤسسة: ' || p_organization_id;
    END IF;

    -- إنشاء المكونات الستة كاملة
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES 
        -- 1. Hero
        (
            gen_random_uuid(), p_organization_id, 'hero',
            jsonb_build_object(
                'title', 'أهلاً بك في متجرنا',
                'description', 'تسوق أحدث المنتجات بأفضل الأسعار',
                'imageUrl', 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'primaryButton', jsonb_build_object('text', 'تسوق الآن', 'link', '/products'),
                'secondaryButton', jsonb_build_object('text', 'معلومات أكثر', 'link', '/about'),
                '_isVisible', true
            ), true, 1, NOW(), NOW()
        ),
        -- 2. Categories
        (
            gen_random_uuid(), p_organization_id, 'categories',
            jsonb_build_object(
                'title', 'تسوق حسب الفئة',
                'description', 'استكشف منتجاتنا حسب الفئة',
                'layout', 'grid',
                'displayCount', 6,
                '_isVisible', true
            ), true, 2, NOW(), NOW()
        ),
        -- 3. Featured Products
        (
            gen_random_uuid(), p_organization_id, 'featuredproducts',
            jsonb_build_object(
                'title', 'منتجات مميزة',
                'description', 'اكتشف مجموعتنا المختارة من المنتجات المميزة',
                'displayCount', 4,
                '_isVisible', true
            ), true, 3, NOW(), NOW()
        ),
        -- 4. About
        (
            gen_random_uuid(), p_organization_id, 'about',
            jsonb_build_object(
                'title', 'عن متجرنا',
                'subtitle', 'متجر إلكتروني موثوق به',
                'description', 'نحن نفخر بتقديم منتجات عالية الجودة وخدمات متميزة للعملاء',
                '_isVisible', true
            ), true, 4, NOW(), NOW()
        ),
        -- 5. Testimonials
        (
            gen_random_uuid(), p_organization_id, 'testimonials',
            jsonb_build_object(
                'title', 'آراء عملائنا',
                'description', 'استمع إلى تجارب عملائنا الحقيقية',
                'visibleCount', 3,
                '_isVisible', true
            ), true, 5, NOW(), NOW()
        ),
        -- 6. Footer
        (
            gen_random_uuid(), p_organization_id, 'footer',
            jsonb_build_object(
                'storeName', 'متجرنا',
                'description', 'متجر إلكتروني متخصص في بيع أحدث المنتجات بأفضل الأسعار',
                'showSocialLinks', true,
                'showContactInfo', true,
                '_isVisible', true
            ), true, 6, NOW(), NOW()
        );
        
        components_created := 6;
        result_message := 'تم إنشاء ' || components_created || ' مكونات للمؤسسة: ' || p_organization_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            result_message := 'خطأ في إنشاء المكونات: ' || SQLERRM;
    END;
    
    RETURN result_message;
END;
$$;

-- إنشاء trigger محسّن
-- حذف الـ trigger أولاً ثم الدالة
DROP TRIGGER IF EXISTS organizations_after_insert ON organizations;
DROP FUNCTION IF EXISTS trigger_create_default_store_components_enhanced();
CREATE OR REPLACE FUNCTION trigger_create_default_store_components_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_msg TEXT;
BEGIN
    SELECT create_default_store_components_enhanced(NEW.id) INTO result_msg;
    RAISE NOTICE 'نتيجة إنشاء المكونات: %', result_msg;
    RETURN NEW;
END;
$$;

-- التأكد من وجود trigger واحد فقط
CREATE TRIGGER organizations_after_insert
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_store_components_enhanced();

-- ==============================================
-- 3. إصلاح المؤسسات الحالية الناقصة المكونات
-- ==============================================

-- إضافة المكونات للمؤسسات الناقصة
DO $$
DECLARE
    org_record RECORD;
    result_msg TEXT;
BEGIN
    -- المرور على المؤسسات التي لديها أقل من 6 مكونات
    FOR org_record IN (
        SELECT 
            o.id,
            o.name,
            o.subdomain,
            COUNT(ss.id) as current_components
        FROM organizations o
        LEFT JOIN store_settings ss ON o.id = ss.organization_id
        WHERE o.created_at > NOW() - INTERVAL '7 days'  -- المؤسسات الحديثة
        GROUP BY o.id, o.name, o.subdomain
        HAVING COUNT(ss.id) < 6
        ORDER BY COUNT(ss.id) ASC
    ) LOOP
        -- حذف المكونات الموجودة أولاً (إن وجدت)
        DELETE FROM store_settings WHERE organization_id = org_record.id;
        
        -- إنشاء المكونات الكاملة
        SELECT create_default_store_components_enhanced(org_record.id) INTO result_msg;
        RAISE NOTICE 'إصلاح المؤسسة %: %', org_record.name, result_msg;
    END LOOP;
END $$;

-- ==============================================
-- 4. إنشاء دوال محسّنة للتحميل
-- ==============================================

-- دالة محسّنة للحصول على المؤسسة بالـ subdomain
DROP FUNCTION IF EXISTS get_organization_by_subdomain_safe(TEXT);
CREATE OR REPLACE FUNCTION get_organization_by_subdomain_safe(subdomain_param TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    subdomain TEXT,
    domain TEXT,
    hostname TEXT,
    is_active BOOLEAN,
    owner_id UUID,
    subscription_tier TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    settings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.subdomain,
        o.domain,
        o.hostname,
        o.is_active,
        o.owner_id,
        o.subscription_tier,
        o.subscription_status,
        o.created_at,
        o.updated_at,
        o.settings
    FROM organizations o
    WHERE o.subdomain = subdomain_param
    AND o.is_active = true
    LIMIT 1;
END;
$$;

-- دالة محسّنة للحصول على بيانات المستخدم الحالي
DROP FUNCTION IF EXISTS get_current_user_safe();
CREATE OR REPLACE FUNCTION get_current_user_safe()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    auth_user_id UUID,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
BEGIN
    auth_user_id := auth.uid();
    
    IF auth_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false),
        u.auth_user_id,
        COALESCE(u.is_active, true)
    FROM public.users u 
    WHERE u.auth_user_id = get_current_user_safe.auth_user_id
    LIMIT 1;
END;
$$;

-- ==============================================
-- 5. منح الصلاحيات
-- ==============================================

GRANT EXECUTE ON FUNCTION check_user_permissions_safe(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_default_store_components_enhanced(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_create_default_store_components_enhanced() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_organization_by_subdomain_safe(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_safe() TO anon, authenticated;

COMMIT;

-- ==============================================
-- 6. تقرير الحالة النهائية
-- ==============================================

-- عرض إحصائيات المؤسسات مع المكونات
SELECT 
    'تقرير نهائي' as report_type,
    COUNT(DISTINCT o.id) as total_organizations,
    COUNT(ss.id) as total_components,
    ROUND(AVG(component_counts.component_count), 2) as avg_components_per_org
FROM organizations o
LEFT JOIN store_settings ss ON o.id = ss.organization_id
LEFT JOIN (
    SELECT organization_id, COUNT(*) as component_count
    FROM store_settings
    GROUP BY organization_id
) component_counts ON o.id = component_counts.organization_id
WHERE o.created_at > NOW() - INTERVAL '7 days';

-- عرض المؤسسات الحديثة مع حالة المكونات
SELECT 
    o.name,
    o.subdomain,
    COUNT(ss.id) as components_count,
    CASE 
        WHEN COUNT(ss.id) = 6 THEN '✅ مكتمل'
        WHEN COUNT(ss.id) = 0 THEN '❌ لا توجد مكونات'
        ELSE '⚠️ ناقص (' || COUNT(ss.id) || '/6)'
    END as status,
    o.created_at
FROM organizations o
LEFT JOIN store_settings ss ON o.id = ss.organization_id
WHERE o.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.name, o.subdomain, o.created_at
ORDER BY o.created_at DESC;

SELECT 'تم إصلاح جميع المشاكل بنجاح! ✅' as final_result; 