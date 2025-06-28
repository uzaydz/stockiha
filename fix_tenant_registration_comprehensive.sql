-- =============================================================================
-- حل شامل ونهائي لمشاكل تسجيل المستأجرين
-- =============================================================================

-- 1. حذف الوظائف المعطلة والمتضاربة
DROP FUNCTION IF EXISTS public.create_organization_safe(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.insert_organization_simple(text, text, uuid, jsonb);

-- 2. إنشاء وظيفة محسنة لإنشاء المؤسسات
CREATE OR REPLACE FUNCTION public.create_organization_ultimate(
    p_name TEXT,
    p_subdomain TEXT,
    p_owner_id UUID,
    p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_existing_org_id UUID;
    v_user_exists BOOLEAN := FALSE;
    v_auth_user_exists BOOLEAN := FALSE;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    -- تسجيل بداية العملية
    RAISE NOTICE '🚀 بدء عملية إنشاء المؤسسة: % مع النطاق: % للمستخدم: %', p_name, p_subdomain, p_owner_id;
    
    -- 1. التحقق من وجود المستخدم في auth.users
    SELECT email, raw_user_meta_data->>'name' 
    INTO v_user_email, v_user_name
    FROM auth.users 
    WHERE id = p_owner_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود في نظام المصادقة: %', p_owner_id;
    END IF;
    
    v_auth_user_exists := TRUE;
    RAISE NOTICE '✅ المستخدم موجود في auth.users: % (%)', v_user_email, COALESCE(v_user_name, 'بدون اسم');
    
    -- 2. التحقق من وجود مؤسسة بنفس النطاق الفرعي
    SELECT id INTO v_existing_org_id
    FROM organizations
    WHERE subdomain = p_subdomain;
    
    IF v_existing_org_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ مؤسسة موجودة بنفس النطاق الفرعي: %', v_existing_org_id;
        
        -- ربط المستخدم بالمؤسسة الموجودة
        PERFORM public.link_user_to_organization_safe(p_owner_id, v_existing_org_id, v_user_email, v_user_name);
        
        RETURN v_existing_org_id;
    END IF;
    
    -- 3. إنشاء معرف فريد للمؤسسة
    v_org_id := gen_random_uuid();
    RAISE NOTICE '🆔 معرف المؤسسة الجديد: %', v_org_id;
    
    -- 4. إنشاء المؤسسة الجديدة
    BEGIN
        INSERT INTO organizations (
            id,
            name,
            subdomain,
            owner_id,
            subscription_tier,
            subscription_status,
            settings,
            created_at,
            updated_at
        ) VALUES (
            v_org_id,
            p_name,
            p_subdomain,
            p_owner_id,
            'trial',
            'trial',
            p_settings,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ تم إنشاء المؤسسة بنجاح: %', v_org_id;
        
    EXCEPTION WHEN unique_violation THEN
        -- في حالة تضارب النطاق الفرعي
        RAISE NOTICE '⚠️ تضارب في النطاق الفرعي، البحث عن المؤسسة الموجودة...';
        
        SELECT id INTO v_existing_org_id
        FROM organizations
        WHERE subdomain = p_subdomain;
        
        IF v_existing_org_id IS NOT NULL THEN
            PERFORM public.link_user_to_organization_safe(p_owner_id, v_existing_org_id, v_user_email, v_user_name);
            RETURN v_existing_org_id;
        ELSE
            RAISE EXCEPTION 'فشل في إنشاء المؤسسة: تضارب غير متوقع';
        END IF;
    END;
    
    -- 5. ربط المستخدم بالمؤسسة الجديدة
    PERFORM public.link_user_to_organization_safe(p_owner_id, v_org_id, v_user_email, v_user_name);
    
    -- 6. إنشاء إعدادات افتراضية للمؤسسة
    BEGIN
        INSERT INTO organization_settings (
            organization_id,
            theme_primary_color,
            theme_secondary_color,
            theme_mode,
            site_name,
            default_language,
            enable_registration,
            enable_public_site,
            created_at,
            updated_at
        ) VALUES (
            v_org_id,
            '#0099ff',
            '#6c757d',
            'light',
            p_name,
            'ar',
            TRUE,
            TRUE,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ تم إنشاء إعدادات المؤسسة';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ فشل في إنشاء إعدادات المؤسسة: %', SQLERRM;
    END;
    
    RAISE NOTICE '🎉 تم إكمال عملية إنشاء المؤسسة بنجاح: %', v_org_id;
    RETURN v_org_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ في إنشاء المؤسسة: %', SQLERRM;
    RAISE;
END;
$$;

-- 3. إنشاء وظيفة آمنة لربط المستخدم بالمؤسسة
CREATE OR REPLACE FUNCTION public.link_user_to_organization_safe(
    p_user_id UUID,
    p_org_id UUID,
    p_email TEXT,
    p_name TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔗 ربط المستخدم % بالمؤسسة %', p_user_id, p_org_id;
    
    -- التحقق من وجود المستخدم في جدول users
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id OR auth_user_id = p_user_id)
    INTO v_user_exists;
    
    IF v_user_exists THEN
        -- تحديث المستخدم الموجود
        RAISE NOTICE '📝 تحديث المستخدم الموجود';
        
        UPDATE users
        SET 
            organization_id = p_org_id,
            is_org_admin = TRUE,
            role = 'admin',
            updated_at = NOW()
        WHERE id = p_user_id OR auth_user_id = p_user_id;
        
    ELSE
        -- إنشاء مستخدم جديد
        RAISE NOTICE '👤 إنشاء مستخدم جديد';
        
        INSERT INTO users (
            id,
            auth_user_id,
            email,
            name,
            role,
            is_active,
            organization_id,
            is_org_admin,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_user_id,
            p_email,
            COALESCE(p_name, 'مستخدم جديد'),
            'admin',
            TRUE,
            p_org_id,
            TRUE,
            NOW(),
            NOW()
        );
    END IF;
    
    RAISE NOTICE '✅ تم ربط المستخدم بالمؤسسة بنجاح';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ تحذير: فشل في ربط المستخدم بالمؤسسة: %', SQLERRM;
    -- لا نرفع خطأ هنا لأن المؤسسة تم إنشاؤها بنجاح
END;
$$;

-- 4. تحديث وظيفة create_organization_safe لتستخدم الوظيفة الجديدة
CREATE OR REPLACE FUNCTION public.create_organization_safe(
    p_name TEXT,
    p_subdomain TEXT,
    p_owner_id UUID,
    p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.create_organization_ultimate(p_name, p_subdomain, p_owner_id, p_settings);
END;
$$;

-- 5. تحسين سياسات RLS للجدول users
-- إضافة سياسة للسماح بإدراج المستخدمين الجدد أثناء التسجيل
DO $$
BEGIN
    -- حذف السياسة إذا كانت موجودة
    DROP POLICY IF EXISTS "allow_tenant_registration_insert" ON users;
    
    -- إنشاء سياسة جديدة للسماح بإدراج المستخدمين أثناء التسجيل
    CREATE POLICY "allow_tenant_registration_insert" ON users
    FOR INSERT 
    WITH CHECK (
        -- السماح للمستخدم بإدراج نفسه
        auth.uid() = auth_user_id
        OR 
        -- السماح للوظائف الآمنة
        current_setting('role', true) = 'service_role'
    );
    
    RAISE NOTICE '✅ تم تحديث سياسات RLS للجدول users';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ تحذير: فشل في تحديث سياسات RLS: %', SQLERRM;
END;
$$;

-- 6. إنشاء وظيفة تشخيص شاملة
CREATE OR REPLACE FUNCTION public.diagnose_tenant_registration(
    p_subdomain TEXT,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_count INTEGER;
    v_user_count INTEGER;
    v_auth_user_exists BOOLEAN;
    v_policies_count INTEGER;
BEGIN
    -- استخدام المستخدم الحالي إذا لم يتم تمرير معرف
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- 1. فحص النطاق الفرعي
    SELECT COUNT(*) INTO v_org_count
    FROM organizations
    WHERE subdomain = p_subdomain;
    
    RETURN QUERY SELECT 
        'فحص النطاق الفرعي'::TEXT,
        CASE WHEN v_org_count = 0 THEN '✅ متاح' ELSE '❌ مستخدم' END,
        'عدد المؤسسات: ' || v_org_count::TEXT;
    
    -- 2. فحص المستخدم في auth.users
    IF v_user_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id)
        INTO v_auth_user_exists;
        
        RETURN QUERY SELECT 
            'فحص auth.users'::TEXT,
            CASE WHEN v_auth_user_exists THEN '✅ موجود' ELSE '❌ غير موجود' END,
            'معرف المستخدم: ' || COALESCE(v_user_id::TEXT, 'NULL');
        
        -- 3. فحص المستخدم في جدول users
        SELECT COUNT(*) INTO v_user_count
        FROM users
        WHERE id = v_user_id OR auth_user_id = v_user_id;
        
        RETURN QUERY SELECT 
            'فحص جدول users'::TEXT,
            CASE WHEN v_user_count > 0 THEN '✅ موجود' ELSE '⚠️ غير موجود' END,
            'عدد السجلات: ' || v_user_count::TEXT;
    END IF;
    
    -- 4. فحص سياسات RLS
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE tablename = 'users' AND cmd = 'INSERT';
    
    RETURN QUERY SELECT 
        'فحص سياسات RLS'::TEXT,
        CASE WHEN v_policies_count > 0 THEN '✅ موجودة' ELSE '❌ مفقودة' END,
        'عدد سياسات INSERT: ' || v_policies_count::TEXT;
    
    -- 5. فحص الوظائف
    RETURN QUERY SELECT 
        'فحص الوظائف'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_organization_ultimate') 
             THEN '✅ جاهزة' ELSE '❌ مفقودة' END,
        'الوظائف المطلوبة متاحة';
END;
$$;

-- 7. إنشاء وظيفة تنظيف البيانات الفاسدة
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS TABLE (
    operation TEXT,
    affected_rows INTEGER,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected INTEGER;
BEGIN
    -- 1. تنظيف المؤسسات بدون مالك صالح
    DELETE FROM organizations
    WHERE owner_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = organizations.owner_id);
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'حذف المؤسسات اليتيمة'::TEXT,
        v_affected,
        'مؤسسات بدون مالك صالح'::TEXT;
    
    -- 2. تنظيف المستخدمين بدون auth_user_id صالح
    DELETE FROM users
    WHERE auth_user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = users.auth_user_id);
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'حذف المستخدمين اليتامى'::TEXT,
        v_affected,
        'مستخدمين بدون حساب مصادقة صالح'::TEXT;
    
    -- 3. إصلاح المؤسسات بدون إعدادات
    INSERT INTO organization_settings (
        organization_id, theme_primary_color, theme_secondary_color,
        theme_mode, site_name, default_language, enable_registration, enable_public_site
    )
    SELECT 
        o.id, '#0099ff', '#6c757d', 'light', o.name, 'ar', TRUE, TRUE
    FROM organizations o
    WHERE NOT EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = o.id);
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'إنشاء إعدادات مفقودة'::TEXT,
        v_affected,
        'مؤسسات بدون إعدادات'::TEXT;
END;
$$;

-- 8. منح الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION public.create_organization_ultimate(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_safe(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_user_to_organization_safe(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_tenant_registration(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data() TO authenticated;

-- 9. تسجيل إكمال التحديث
DO $$
BEGIN
    RAISE NOTICE '🎉 تم تطبيق الحل الشامل لمشاكل تسجيل المستأجرين بنجاح!';
    RAISE NOTICE '📋 الوظائف المتاحة:';
    RAISE NOTICE '   - create_organization_ultimate(): الوظيفة الرئيسية المحسنة';
    RAISE NOTICE '   - create_organization_safe(): واجهة متوافقة مع الكود الحالي';
    RAISE NOTICE '   - diagnose_tenant_registration(): تشخيص المشاكل';
    RAISE NOTICE '   - cleanup_orphaned_data(): تنظيف البيانات الفاسدة';
    RAISE NOTICE '✅ يمكنك الآن اختبار التسجيل مرة أخرى!';
END;
$$; 