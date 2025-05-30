-- إصلاح مشكلة المصادقة الثنائية 
-- المشكلة: في جدول users حقل two_factor_enabled=false، بينما في جدول user_security_settings الحقل two_factor_enabled=true

-- تعديل دالة check_user_requires_2fa للتأكد من مراعاة إعدادات المصادقة الثنائية بشكل صحيح
CREATE OR REPLACE FUNCTION check_user_requires_2fa(
    p_user_email TEXT,
    p_organization_id UUID DEFAULT NULL,
    p_domain TEXT DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_record RECORD;
    v_organization_record RECORD;
    v_domain_org_id UUID;
    v_result JSONB;
    v_is_public_domain BOOLEAN;
    v_requires_2fa BOOLEAN;
    v_security_settings RECORD;
BEGIN
    -- البحث عن المستخدم بالإيميل
    SELECT 
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.organization_id,
        u.two_factor_enabled
    INTO v_user_record
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_user_email)
    LIMIT 1;
    
    -- إذا لم يتم العثور على المستخدم
    IF v_user_record IS NULL THEN
        RETURN jsonb_build_object(
            'user_exists', false,
            'user_id', NULL,
            'user_name', NULL,
            'requires_2fa', false,
            'organization_id', NULL,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- الحصول على إعدادات الأمان للمستخدم
    SELECT 
        two_factor_enabled,
        totp_secret IS NOT NULL AND totp_secret != '' AS has_totp_setup
    INTO v_security_settings
    FROM user_security_settings
    WHERE user_id = v_user_record.id;
    
    -- تحديد ما إذا كانت المصادقة الثنائية مطلوبة فعلياً
    -- المصادقة الثنائية تكون مطلوبة إذا:
    -- 1. كانت مفعلة في جدول user_security_settings
    -- 2. وتم إعداد TOTP secret
    v_requires_2fa := 
        (v_security_settings.two_factor_enabled IS TRUE) AND
        (v_security_settings.has_totp_setup IS TRUE);
    
    -- تحديث إعدادات المصادقة الثنائية في جدول المستخدمين إذا كان هناك تناقض
    IF v_user_record.two_factor_enabled != v_requires_2fa THEN
        UPDATE users
        SET two_factor_enabled = v_requires_2fa
        WHERE id = v_user_record.id;
    END IF;
    
    -- التحقق مما إذا كان النطاق الحالي هو نطاق عام
    IF p_domain IS NOT NULL THEN
        v_is_public_domain := is_public_domain(p_domain);
    ELSE
        v_is_public_domain := FALSE;
    END IF;

    -- الحصول على معرف المؤسسة من النطاق إذا لم يتم تمريره
    IF p_organization_id IS NULL AND (p_domain IS NOT NULL OR p_subdomain IS NOT NULL) THEN
        v_domain_org_id := get_organization_by_domain(p_domain, p_subdomain);
        
        -- إذا لم نجد مؤسسة للنطاق المحدد
        IF v_domain_org_id IS NULL THEN
            -- إذا كان النطاق العام، نسمح بالدخول (لجميع المستخدمين)
            IF v_is_public_domain THEN
                -- لا نفعل شيئًا ونستمر في عملية تسجيل الدخول
                NULL;
            ELSE
                RETURN jsonb_build_object(
                    'user_exists', false,
                    'user_id', NULL,
                    'user_name', NULL,
                    'requires_2fa', false,
                    'organization_id', NULL,
                    'error', 'النطاق غير مسجل في النظام'
                );
            END IF;
        ELSE
            p_organization_id := v_domain_org_id;
        END IF;
    END IF;
    
    -- القاعدة الجديدة: 
    -- 1. إذا كان النطاق عاماً، نسمح لجميع المستخدمين بالدخول.
    -- 2. إذا كان النطاق خاصاً (تابع لمؤسسة)، نتحقق من أن المستخدم ينتمي لنفس المؤسسة.
    IF p_organization_id IS NOT NULL AND v_user_record.organization_id != p_organization_id THEN
        -- نتحقق إذا كان النطاق هو نطاق عام، فنسمح بالدخول
        IF v_is_public_domain THEN
            -- نسمح بالدخول من النطاق العام
            NULL;
        ELSE
            -- تسجيل محاولة وصول غير مصرح بها من نطاق خاص
            PERFORM log_security_activity(
                v_user_record.id,
                'unauthorized_domain_access',
                'محاولة دخول من نطاق مؤسسة غير تابع لها',
                'blocked',
                'high',
                NULL,
                NULL,
                jsonb_build_object(
                    'email', p_user_email,
                    'attempted_domain', p_domain,
                    'attempted_subdomain', p_subdomain,
                    'user_organization_id', v_user_record.organization_id,
                    'domain_organization_id', p_organization_id
                )
            );
            
            RETURN jsonb_build_object(
                'user_exists', false,
                'user_id', NULL,
                'user_name', NULL,
                'requires_2fa', false,
                'organization_id', NULL,
                'error', 'غير مصرح لك بالدخول من هذا النطاق، فهو تابع لمؤسسة أخرى'
            );
        END IF;
    END IF;
    
    -- السماح بالدخول من النطاق العام دائماً (بغض النظر عن المؤسسة)
    -- لكن المستخدمين الذين ينتمون لمؤسسة عند الدخول من نطاق خاص يجب أن يكون النطاق هو نطاق مؤسستهم
    IF p_organization_id IS NULL AND p_domain IS NULL AND p_subdomain IS NULL THEN
        -- هذا هو الدخول من النطاق العام (عندما لا يكون هناك domain أو subdomain محدد)
        -- نسمح لجميع المستخدمين بالدخول دائماً
        NULL; -- لا تفعل شيئاً هنا، والمتابعة للسماح بالدخول
    END IF;
    
    -- تحديد ما إذا كانت المصادقة الثنائية مطلوبة
    v_result := jsonb_build_object(
        'user_exists', true,
        'user_id', v_user_record.id,
        'user_name', COALESCE(
            v_user_record.name,
            CONCAT(v_user_record.first_name, ' ', v_user_record.last_name),
            v_user_record.email
        ),
        'requires_2fa', v_requires_2fa, -- استخدام القيمة المحسوبة
        'organization_id', v_user_record.organization_id,
        'error', NULL
    );
    
    -- تسجيل محاولة التحقق الناجحة
    PERFORM log_security_activity(
        v_user_record.id,
        '2fa_check',
        'تم التحقق من متطلبات المصادقة الثنائية',
        'success',
        'low',
        NULL,
        NULL,
        jsonb_build_object(
            'email', p_user_email,
            'domain', p_domain,
            'subdomain', p_subdomain,
            'requires_2fa', v_requires_2fa -- استخدام القيمة المحسوبة
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'user_exists', false,
            'user_id', NULL,
            'user_name', NULL,
            'requires_2fa', false,
            'organization_id', NULL,
            'error', 'حدث خطأ في التحقق من المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION check_user_requires_2fa(TEXT, UUID, TEXT, TEXT) TO authenticated, anon;

-- تحديث حالة المصادقة الثنائية لجميع المستخدمين للتأكد من التوافق بين الجدولين
DO $$
DECLARE
    v_user_id UUID;
    v_user_has_2fa BOOLEAN;
    v_security_has_2fa BOOLEAN;
    v_security_has_totp BOOLEAN;
    v_should_have_2fa BOOLEAN;
BEGIN
    -- تحديث المستخدمين الذين لديهم تناقض في إعدادات المصادقة الثنائية
    FOR v_user_id, v_user_has_2fa IN 
        SELECT u.id, u.two_factor_enabled
        FROM users u
        JOIN user_security_settings uss ON u.id = uss.user_id
    LOOP
        -- الحصول على قيم المصادقة الثنائية من جدول إعدادات الأمان
        SELECT 
            two_factor_enabled,
            totp_secret IS NOT NULL AND totp_secret != '' AS has_totp
        INTO v_security_has_2fa, v_security_has_totp
        FROM user_security_settings
        WHERE user_id = v_user_id;
        
        -- تحديد ما إذا كان يجب تفعيل المصادقة الثنائية
        v_should_have_2fa := v_security_has_2fa AND v_security_has_totp;
        
        -- تحديث جدول المستخدمين إذا كان هناك تناقض
        IF v_user_has_2fa != v_should_have_2fa THEN
            UPDATE users
            SET two_factor_enabled = v_should_have_2fa
            WHERE id = v_user_id;
            
            -- توثيق التغيير
            PERFORM log_security_activity(
                v_user_id,
                '2fa_status_update',
                'تم تحديث حالة المصادقة الثنائية للتوافق بين الجداول',
                'info',
                'medium',
                NULL,
                NULL,
                jsonb_build_object(
                    'previous_status', v_user_has_2fa,
                    'new_status', v_should_have_2fa,
                    'security_settings_status', v_security_has_2fa,
                    'has_totp_setup', v_security_has_totp
                )
            );
        END IF;
    END LOOP;
END $$; 