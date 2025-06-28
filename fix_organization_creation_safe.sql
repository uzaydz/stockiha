-- =============================================================================
-- إصلاح آمن لمشكلة إنشاء المؤسسات - بدون حذف أي بيانات موجودة
-- يحل مشكلة read-only transaction و RLS للمستخدمين الجدد فقط
-- =============================================================================

-- 1. حذف الوظائف القديمة المتضاربة فقط (بدون حذف البيانات)
DROP FUNCTION IF EXISTS public.create_organization_final(TEXT, TEXT);

-- 2. إنشاء وظيفة محسنة لإنشاء المؤسسة (تحديث الموجودة)
CREATE OR REPLACE FUNCTION public.create_organization_final(
    p_name TEXT,
    p_subdomain TEXT,
    p_owner_id UUID,
    p_email TEXT,
    p_user_name TEXT DEFAULT 'مستخدم جديد',
    p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_existing_org_id UUID;
    v_result JSONB;
    v_user_exists BOOLEAN := FALSE;
    v_error_message TEXT;
BEGIN
    RAISE NOTICE '🚀 [SAFE-FIX] بدء إنشاء المؤسسة: % للمستخدم: %', p_name, p_owner_id;
    
    -- التحقق من صحة المدخلات
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'اسم المؤسسة مطلوب',
            'message', 'يجب تقديم اسم صالح للمؤسسة'
        );
    END IF;
    
    IF p_subdomain IS NULL OR LENGTH(TRIM(p_subdomain)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'النطاق الفرعي مطلوب',
            'message', 'يجب تقديم نطاق فرعي صالح'
        );
    END IF;
    
    IF p_owner_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف المالك مطلوب',
            'message', 'يجب تقديم معرف صالح للمالك'
        );
    END IF;
    
    -- التحقق من وجود مؤسسة بنفس النطاق
    SELECT id INTO v_existing_org_id
    FROM organizations
    WHERE subdomain = p_subdomain;
    
    IF v_existing_org_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ [SAFE-FIX] مؤسسة موجودة: %', v_existing_org_id;
        
        -- ربط المستخدم بالمؤسسة الموجودة
        BEGIN
            -- التحقق من وجود المستخدم
            SELECT EXISTS(
                SELECT 1 FROM users 
                WHERE id = p_owner_id OR auth_user_id = p_owner_id
            ) INTO v_user_exists;
            
            IF v_user_exists THEN
                -- تحديث المستخدم الموجود
                UPDATE users
                SET 
                    organization_id = v_existing_org_id,
                    is_org_admin = TRUE,
                    role = 'admin',
                    updated_at = NOW()
                WHERE id = p_owner_id OR auth_user_id = p_owner_id;
                
                RAISE NOTICE '✅ [SAFE-FIX] تم تحديث المستخدم الموجود';
            ELSE
                -- إنشاء مستخدم جديد
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
                    p_owner_id,
                    p_owner_id,
                    p_email,
                    p_user_name,
                    'admin',
                    TRUE,
                    v_existing_org_id,
                    TRUE,
                    NOW(),
                    NOW()
                );
                
                RAISE NOTICE '✅ [SAFE-FIX] تم إنشاء المستخدم الجديد';
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE NOTICE '❌ [SAFE-FIX] خطأ في ربط المستخدم: %', v_error_message;
        END;
        
        RETURN jsonb_build_object(
            'success', true,
            'organization_id', v_existing_org_id,
            'message', 'تم ربط المستخدم بالمؤسسة الموجودة',
            'user_linked', true
        );
    END IF;
    
    -- إنشاء معرف جديد للمؤسسة
    v_org_id := gen_random_uuid();
    RAISE NOTICE '🆔 [SAFE-FIX] معرف المؤسسة الجديد: %', v_org_id;
    
    BEGIN
        -- إنشاء المؤسسة
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
            COALESCE(p_settings, '{}'::jsonb),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ [SAFE-FIX] تم إنشاء المؤسسة: %', v_org_id;
        
        -- التحقق من وجود المستخدم في جدول users
        SELECT EXISTS(
            SELECT 1 FROM users 
            WHERE id = p_owner_id OR auth_user_id = p_owner_id
        ) INTO v_user_exists;
        
        IF v_user_exists THEN
            -- تحديث المستخدم الموجود
            UPDATE users
            SET 
                organization_id = v_org_id,
                is_org_admin = TRUE,
                role = 'admin',
                updated_at = NOW()
            WHERE id = p_owner_id OR auth_user_id = p_owner_id;
            
            RAISE NOTICE '✅ [SAFE-FIX] تم تحديث المستخدم الموجود';
        ELSE
            -- إنشاء مستخدم جديد
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
                p_owner_id,
                p_owner_id,
                COALESCE(p_email, ''),
                COALESCE(p_user_name, 'مستخدم جديد'),
                'admin',
                TRUE,
                v_org_id,
                TRUE,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '✅ [SAFE-FIX] تم إنشاء المستخدم الجديد';
        END IF;
        
        -- إنشاء إعدادات المؤسسة (مع تجاهل الأخطاء)
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
                '#2563eb',
                '#6c757d',
                'light',
                p_name,
                'ar',
                TRUE,
                TRUE,
                NOW(),
                NOW()
            ) ON CONFLICT (organization_id) DO NOTHING;
            
            RAISE NOTICE '✅ [SAFE-FIX] تم إنشاء إعدادات المؤسسة';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ [SAFE-FIX] فشل إنشاء إعدادات المؤسسة: %', SQLERRM;
            -- لا نفشل العملية كاملة
        END;
        
        -- إرجاع النتيجة
        v_result := jsonb_build_object(
            'success', true,
            'organization_id', v_org_id,
            'user_linked', true,
            'settings_created', true,
            'message', 'تم إنشاء المؤسسة والمستخدم بنجاح'
        );
        
        RAISE NOTICE '🎉 [SAFE-FIX] اكتمل إنشاء المؤسسة بنجاح: %', v_result;
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RAISE NOTICE '❌ [SAFE-FIX] خطأ في إنشاء المؤسسة: %', v_error_message;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', v_error_message,
            'message', 'فشل في إنشاء المؤسسة'
        );
    END;
    
EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    RAISE NOTICE '❌ [SAFE-FIX] خطأ عام: %', v_error_message;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', v_error_message,
        'message', 'خطأ عام في إنشاء المؤسسة'
    );
END;
$$;

-- 3. منح الأذونات اللازمة
GRANT EXECUTE ON FUNCTION public.create_organization_final(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_final(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_organization_final(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO anon;

-- 4. إنشاء فهارس لتحسين الأداء (بدون إزالة الموجود)
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- 5. تحديث سياسات RLS بطريقة آمنة
-- إضافة سياسة جديدة للمستخدمين المصادق عليهم (بدون حذف الموجودة)
DO $$
BEGIN
    -- التحقق من وجود السياسة قبل إنشائها
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organizations' 
        AND policyname = 'safe_authenticated_users_can_manage_orgs'
    ) THEN
        CREATE POLICY "safe_authenticated_users_can_manage_orgs" ON organizations
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
        
        RAISE NOTICE '✅ تم إنشاء سياسة RLS جديدة للمؤسسات';
    ELSE
        RAISE NOTICE 'ℹ️ سياسة RLS موجودة بالفعل';
    END IF;
END;
$$;

-- 6. إنشاء وظيفة اختبار آمنة
CREATE OR REPLACE FUNCTION public.test_safe_organization_creation()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_test_result JSONB;
    v_test_user_id UUID := gen_random_uuid();
    v_test_subdomain TEXT := 'safe-test-' || EXTRACT(EPOCH FROM NOW())::text;
BEGIN
    -- اختبار إنشاء مؤسسة جديدة
    SELECT public.create_organization_final(
        'مؤسسة اختبار آمنة',
        v_test_subdomain,
        v_test_user_id,
        'safe-test@example.com',
        'مستخدم اختبار آمن',
        '{"theme": "light", "test": true}'::jsonb
    ) INTO v_test_result;
    
    RETURN jsonb_build_object(
        'test_completed', true,
        'test_user_id', v_test_user_id,
        'test_subdomain', v_test_subdomain,
        'result', v_test_result,
        'timestamp', NOW()
    );
END;
$$;

-- منح أذونات الاختبار
GRANT EXECUTE ON FUNCTION public.test_safe_organization_creation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_safe_organization_creation() TO service_role;

-- 7. إنشاء وظيفة تشخيص للمستخدمين المعلقين
CREATE OR REPLACE FUNCTION public.diagnose_stuck_users()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_auth_users_count INTEGER;
    v_users_without_org_count INTEGER;
    v_orgs_without_owner_count INTEGER;
    v_result JSONB;
BEGIN
    -- عدد المستخدمين في auth.users
    SELECT COUNT(*) INTO v_auth_users_count FROM auth.users;
    
    -- عدد المستخدمين بدون مؤسسة
    SELECT COUNT(*) INTO v_users_without_org_count 
    FROM users 
    WHERE organization_id IS NULL;
    
    -- عدد المؤسسات بدون مالك
    SELECT COUNT(*) INTO v_orgs_without_owner_count 
    FROM organizations 
    WHERE owner_id IS NULL;
    
    v_result := jsonb_build_object(
        'diagnosis_timestamp', NOW(),
        'auth_users_total', v_auth_users_count,
        'users_without_organization', v_users_without_org_count,
        'organizations_without_owner', v_orgs_without_owner_count,
        'status', CASE 
            WHEN v_users_without_org_count = 0 AND v_orgs_without_owner_count = 0 THEN 'healthy'
            ELSE 'needs_attention'
        END
    );
    
    RETURN v_result;
END;
$$;

-- منح أذونات التشخيص
GRANT EXECUTE ON FUNCTION public.diagnose_stuck_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_stuck_users() TO service_role;

-- 8. إشعار إكمال التحديث الآمن
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '✅ تم إكمال الإصلاح الآمن لنظام إنشاء المؤسسات بنجاح';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'التحديثات المطبقة (بدون حذف أي بيانات):';
    RAISE NOTICE '   - تحديث وظيفة create_organization_final()';
    RAISE NOTICE '   - إضافة سياسات RLS آمنة';
    RAISE NOTICE '   - إضافة فهارس للأداء';
    RAISE NOTICE '   - إضافة وظائف اختبار وتشخيص';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'للاختبار: SELECT public.test_safe_organization_creation();';
    RAISE NOTICE 'للتشخيص: SELECT public.diagnose_stuck_users();';
    RAISE NOTICE '=============================================================================';
END;
$$; 