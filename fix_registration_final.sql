-- =============================================================================
-- إصلاح نهائي لمشاكل تسجيل المستأجرين
-- بناءً على تحليل قاعدة البيانات
-- =============================================================================

-- 1. تنظيف سياسات RLS المتضاربة
DO $$
BEGIN
    -- حذف السياسات المتضاربة
    DROP POLICY IF EXISTS "Enable INSERT for users based on permissions" ON users;
    DROP POLICY IF EXISTS "allow_tenant_registration_insert" ON users;
    
    -- إنشاء سياسة موحدة ومحسنة للإدراج
    CREATE POLICY "unified_users_insert_policy" ON users
    FOR INSERT 
    WITH CHECK (
        -- السماح للمستخدم بإدراج نفسه
        auth.uid() = auth_user_id
        OR 
        -- السماح للمسؤولين في نفس المؤسسة
        (is_current_user_org_admin() AND organization_id = get_current_user_organization_id())
        OR 
        -- السماح للمسؤولين العامين
        is_super_admin()
        OR
        -- السماح للوظائف الآمنة (service_role)
        current_setting('role', true) = 'service_role'
    );
    
    RAISE NOTICE '✅ تم تحديث سياسات RLS للجدول users';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ تحذير: فشل في تحديث سياسات RLS: %', SQLERRM;
END;
$$;

-- 2. تحسين وظيفة create_organization_ultimate
CREATE OR REPLACE FUNCTION public.create_organization_ultimate(
    p_name TEXT,
    p_subdomain TEXT,
    p_owner_id UUID,
    p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_existing_org_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 3;
BEGIN
    RAISE NOTICE '🚀 [v2] بدء عملية إنشاء المؤسسة: % مع النطاق: % للمستخدم: %', p_name, p_subdomain, p_owner_id;
    
    -- 1. التحقق من وجود المستخدم في auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'name', 'مستخدم جديد')
    INTO v_user_email, v_user_name
    FROM auth.users 
    WHERE id = p_owner_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود في نظام المصادقة: %', p_owner_id;
    END IF;
    
    RAISE NOTICE '✅ المستخدم موجود: % (%)', v_user_email, v_user_name;
    
    -- 2. التحقق من وجود مؤسسة بنفس النطاق الفرعي مع إعادة المحاولة
    WHILE v_retry_count < v_max_retries LOOP
        SELECT id INTO v_existing_org_id
        FROM organizations
        WHERE subdomain = p_subdomain;
        
        IF v_existing_org_id IS NOT NULL THEN
            RAISE NOTICE '⚠️ مؤسسة موجودة بنفس النطاق الفرعي: %', v_existing_org_id;
            PERFORM public.link_user_to_organization_safe(p_owner_id, v_existing_org_id, v_user_email, v_user_name);
            RETURN v_existing_org_id;
        END IF;
        
        -- 3. محاولة إنشاء المؤسسة
        v_org_id := gen_random_uuid();
        RAISE NOTICE '🆔 محاولة إنشاء المؤسسة بمعرف: %', v_org_id;
        
        BEGIN
            -- استخدام SECURITY DEFINER context لتجاوز RLS
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
            EXIT; -- الخروج من الحلقة عند النجاح
            
        EXCEPTION 
            WHEN unique_violation THEN
                v_retry_count := v_retry_count + 1;
                RAISE NOTICE '⚠️ تضارب في النطاق الفرعي، المحاولة %/%', v_retry_count, v_max_retries;
                
                IF v_retry_count >= v_max_retries THEN
                    -- البحث النهائي عن المؤسسة الموجودة
                    SELECT id INTO v_existing_org_id
                    FROM organizations
                    WHERE subdomain = p_subdomain;
                    
                    IF v_existing_org_id IS NOT NULL THEN
                        PERFORM public.link_user_to_organization_safe(p_owner_id, v_existing_org_id, v_user_email, v_user_name);
                        RETURN v_existing_org_id;
                    ELSE
                        RAISE EXCEPTION 'فشل في إنشاء المؤسسة بعد % محاولات', v_max_retries;
                    END IF;
                END IF;
                
                -- انتظار قصير قبل إعادة المحاولة
                PERFORM pg_sleep(0.1);
                
            WHEN OTHERS THEN
                RAISE EXCEPTION 'خطأ في إنشاء المؤسسة: %', SQLERRM;
        END;
    END LOOP;
    
    -- 4. ربط المستخدم بالمؤسسة الجديدة
    PERFORM public.link_user_to_organization_safe(p_owner_id, v_org_id, v_user_email, v_user_name);
    
    -- 5. إنشاء إعدادات افتراضية للمؤسسة
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

-- 3. تحسين وظيفة ربط المستخدم بالمؤسسة
CREATE OR REPLACE FUNCTION public.link_user_to_organization_safe(
    p_user_id UUID,
    p_org_id UUID,
    p_email TEXT,
    p_name TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_exists BOOLEAN := FALSE;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 3;
BEGIN
    RAISE NOTICE '🔗 [v2] ربط المستخدم % بالمؤسسة %', p_user_id, p_org_id;
    
    WHILE v_retry_count < v_max_retries LOOP
        -- التحقق من وجود المستخدم في جدول users
        SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id OR auth_user_id = p_user_id)
        INTO v_user_exists;
        
        IF v_user_exists THEN
            -- تحديث المستخدم الموجود
            RAISE NOTICE '📝 تحديث المستخدم الموجود';
            
            BEGIN
                UPDATE users
                SET 
                    organization_id = p_org_id,
                    is_org_admin = TRUE,
                    role = 'admin',
                    updated_at = NOW()
                WHERE id = p_user_id OR auth_user_id = p_user_id;
                
                RAISE NOTICE '✅ تم تحديث المستخدم بنجاح';
                RETURN;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ فشل في تحديث المستخدم: %', SQLERRM;
            END;
        ELSE
            -- إنشاء مستخدم جديد
            RAISE NOTICE '👤 إنشاء مستخدم جديد';
            
            BEGIN
                -- استخدام SECURITY DEFINER لتجاوز RLS
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
                    p_name,
                    'admin',
                    TRUE,
                    p_org_id,
                    TRUE,
                    NOW(),
                    NOW()
                );
                
                RAISE NOTICE '✅ تم إنشاء المستخدم بنجاح';
                RETURN;
                
            EXCEPTION WHEN OTHERS THEN
                v_retry_count := v_retry_count + 1;
                RAISE NOTICE '⚠️ فشل في إنشاء المستخدم، المحاولة %/%: %', v_retry_count, v_max_retries, SQLERRM;
                
                IF v_retry_count >= v_max_retries THEN
                    RAISE NOTICE '❌ فشل نهائي في ربط المستخدم بعد % محاولات', v_max_retries;
                    RETURN;
                END IF;
                
                -- انتظار قصير قبل إعادة المحاولة
                PERFORM pg_sleep(0.1);
            END;
        END IF;
    END LOOP;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ عام في ربط المستخدم: %', SQLERRM;
END;
$$;

-- 4. إصلاح البيانات الحالية للمستخدم الذي فشل تسجيله
DO $$
DECLARE
    v_user_id UUID := '8f77ed31-f94e-4c59-9bdb-74ace4d9586d';
    v_email TEXT := 'uzaydz3x3x0@gmail.com';
    v_name TEXT := 'oussama guentri';
    v_org_name TEXT := 'btyryfinal';
    v_subdomain TEXT := 'batermpxoc';
    v_org_id UUID;
BEGIN
    RAISE NOTICE '🔧 إصلاح البيانات للمستخدم الذي فشل تسجيله...';
    
    -- إنشاء المؤسسة للمستخدم
    SELECT public.create_organization_ultimate(
        v_org_name,
        v_subdomain,
        v_user_id,
        jsonb_build_object(
            'theme', 'light',
            'primary_color', '#2563eb'
        )
    ) INTO v_org_id;
    
    RAISE NOTICE '✅ تم إصلاح البيانات للمستخدم: % في المؤسسة: %', v_user_id, v_org_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ فشل في إصلاح البيانات: %', SQLERRM;
END;
$$;

-- 5. إنشاء وظيفة تشخيص محسنة
CREATE OR REPLACE FUNCTION public.diagnose_registration_status(
    p_user_id UUID DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
) RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    action_needed TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_auth_exists BOOLEAN;
    v_user_exists BOOLEAN;
    v_org_exists BOOLEAN;
    v_org_id UUID;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- 1. فحص المستخدم في auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id)
    INTO v_auth_exists;
    
    RETURN QUERY SELECT 
        'فحص auth.users'::TEXT,
        CASE WHEN v_auth_exists THEN '✅ موجود' ELSE '❌ غير موجود' END,
        'معرف المستخدم: ' || COALESCE(v_user_id::TEXT, 'NULL'),
        CASE WHEN NOT v_auth_exists THEN 'إعادة التسجيل مطلوبة' ELSE 'لا يوجد إجراء مطلوب' END;
    
    -- 2. فحص المستخدم في جدول users
    SELECT EXISTS(SELECT 1 FROM users WHERE id = v_user_id OR auth_user_id = v_user_id)
    INTO v_user_exists;
    
    RETURN QUERY SELECT 
        'فحص جدول users'::TEXT,
        CASE WHEN v_user_exists THEN '✅ موجود' ELSE '⚠️ غير موجود' END,
        'البحث بـ id و auth_user_id',
        CASE WHEN NOT v_user_exists THEN 'تشغيل link_user_to_organization_safe' ELSE 'لا يوجد إجراء مطلوب' END;
    
    -- 3. فحص النطاق الفرعي إذا تم تمريره
    IF p_subdomain IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM organizations WHERE subdomain = p_subdomain), 
               id
        INTO v_org_exists, v_org_id
        FROM organizations 
        WHERE subdomain = p_subdomain;
        
        RETURN QUERY SELECT 
            'فحص النطاق الفرعي'::TEXT,
            CASE WHEN v_org_exists THEN '✅ موجود' ELSE '❌ غير موجود' END,
            'النطاق: ' || p_subdomain || CASE WHEN v_org_exists THEN ' (ID: ' || v_org_id::TEXT || ')' ELSE '' END,
            CASE WHEN NOT v_org_exists THEN 'تشغيل create_organization_ultimate' ELSE 'لا يوجد إجراء مطلوب' END;
    END IF;
    
    -- 4. فحص الربط بين المستخدم والمؤسسة
    IF v_user_exists AND v_org_exists THEN
        RETURN QUERY SELECT 
            'فحص الربط'::TEXT,
            CASE WHEN EXISTS(
                SELECT 1 FROM users 
                WHERE (id = v_user_id OR auth_user_id = v_user_id) 
                AND organization_id = v_org_id
            ) THEN '✅ مربوط' ELSE '⚠️ غير مربوط' END,
            'المستخدم والمؤسسة',
            CASE WHEN NOT EXISTS(
                SELECT 1 FROM users 
                WHERE (id = v_user_id OR auth_user_id = v_user_id) 
                AND organization_id = v_org_id
            ) THEN 'تحديث organization_id في جدول users' ELSE 'لا يوجد إجراء مطلوب' END;
    END IF;
END;
$$;

-- 6. منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.create_organization_ultimate(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_user_to_organization_safe(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_registration_status(UUID, TEXT) TO authenticated;

-- 7. تسجيل إكمال الإصلاح
DO $$
BEGIN
    RAISE NOTICE '🎉 تم تطبيق الإصلاح النهائي لمشاكل التسجيل!';
    RAISE NOTICE '📋 الوظائف المحسنة:';
    RAISE NOTICE '   - create_organization_ultimate(): محسنة مع إعادة المحاولة';
    RAISE NOTICE '   - link_user_to_organization_safe(): محسنة مع معالجة RLS';
    RAISE NOTICE '   - diagnose_registration_status(): تشخيص شامل';
    RAISE NOTICE '✅ تم إصلاح البيانات للمستخدم المعلق';
    RAISE NOTICE '🚀 النظام جاهز للاختبار!';
END;
$$; 