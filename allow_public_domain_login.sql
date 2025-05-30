-- تعديل الدالة check_user_requires_2fa للسماح بالدخول من النطاق العام
-- هذا التعديل سيسمح لجميع المستخدمين بالدخول من النطاق العام حتى إذا كانوا مرتبطين بمؤسسة

DROP FUNCTION IF EXISTS check_user_requires_2fa(TEXT, UUID, TEXT, TEXT);

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
    v_allow_public_domain BOOLEAN := TRUE; -- تفعيل السماح بالدخول من النطاق العام
BEGIN
    -- البحث عن المستخدم بالإيميل
    SELECT 
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.organization_id,
        u.two_factor_enabled,
        COALESCE(uss.two_factor_enabled, false) as security_2fa_enabled
    INTO v_user_record
    FROM users u
    LEFT JOIN user_security_settings uss ON u.id = uss.user_id
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
    
    -- الحصول على معرف المؤسسة من النطاق إذا لم يتم تمريره
    IF p_organization_id IS NULL AND (p_domain IS NOT NULL OR p_subdomain IS NOT NULL) THEN
        v_domain_org_id := get_organization_by_domain(p_domain, p_subdomain);
        
        -- إذا لم نجد مؤسسة للنطاق المحدد
        IF v_domain_org_id IS NULL THEN
            -- نتجاهل الخطأ إذا كان النطاق هو النطاق العام
            IF (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
                -- لا نفعل شيئًا ونستمر
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
    
    -- التحقق من أن المستخدم ينتمي للمؤسسة المحددة (فقط إذا لم يكن النطاق العام)
    IF p_organization_id IS NOT NULL AND v_user_record.organization_id != p_organization_id THEN
        -- نتحقق إذا كان النطاق هو نطاق عام
        IF (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
            -- نسمح بالدخول من النطاق العام
            NULL;
        ELSE
            -- تسجيل محاولة وصول غير مصرح بها
            PERFORM log_security_activity(
                v_user_record.id,
                'unauthorized_domain_access',
                'محاولة دخول من نطاق غير مصرح به',
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
                'error', 'غير مصرح لك بالدخول من هذا النطاق'
            );
        END IF;
    END IF;
    
    -- إذا لم يتم تحديد مؤسسة ولا نطاق، نتحقق من المؤسسة الافتراضية
    IF p_organization_id IS NULL AND p_domain IS NULL AND p_subdomain IS NULL THEN
        -- هنا التغيير الرئيسي: السماح لجميع المستخدمين بالدخول من النطاق العام
        IF v_user_record.organization_id IS NOT NULL AND NOT v_allow_public_domain THEN
            -- هذا الجزء فقط يتم تنفيذه إذا كان v_allow_public_domain = FALSE
            -- جلب معلومات المؤسسة
            SELECT subdomain, domain INTO v_organization_record
            FROM organizations
            WHERE id = v_user_record.organization_id;
            
            RETURN jsonb_build_object(
                'user_exists', false,
                'user_id', NULL,
                'user_name', NULL,
                'requires_2fa', false,
                'organization_id', NULL,
                'error', 'يجب الدخول من نطاق مؤسستك: ' || COALESCE(v_organization_record.subdomain || '.ktobi.online', v_organization_record.domain, 'النطاق الخاص بمؤسستك')
            );
        END IF;
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
        'requires_2fa', COALESCE(v_user_record.two_factor_enabled, v_user_record.security_2fa_enabled, false),
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
            'requires_2fa', COALESCE(v_user_record.two_factor_enabled, v_user_record.security_2fa_enabled, false)
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
GRANT EXECUTE ON FUNCTION check_user_requires_2fa(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_requires_2fa(TEXT, UUID, TEXT, TEXT) TO anon;

-- تحديث دالة verify_domain_access للسماح بالدخول من النطاق العام
DROP FUNCTION IF EXISTS verify_domain_access(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION verify_domain_access(
    p_user_id UUID,
    p_domain TEXT DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_org_id UUID;
    v_domain_org_id UUID;
    v_user_email TEXT;
    v_allow_public_domain BOOLEAN := TRUE; -- تفعيل السماح بالدخول من النطاق العام
BEGIN
    -- جلب معرف مؤسسة المستخدم
    SELECT organization_id, email INTO v_user_org_id, v_user_email
    FROM users
    WHERE id = p_user_id;
    
    -- إذا لم يتم تحديد نطاق، نتحقق من نوع المستخدم
    IF p_domain IS NULL AND p_subdomain IS NULL THEN
        -- السماح لجميع المستخدمين بالدخول من النطاق العام إذا كان v_allow_public_domain = TRUE
        IF v_user_org_id IS NULL OR v_allow_public_domain THEN
            RETURN jsonb_build_object('allowed', true, 'error', NULL);
        ELSE
            RETURN jsonb_build_object(
                'allowed', false, 
                'error', 'يجب الدخول من نطاق مؤسستك'
            );
        END IF;
    END IF;
    
    -- جلب معرف المؤسسة من النطاق
    v_domain_org_id := get_organization_by_domain(p_domain, p_subdomain);
    
    -- التحقق من التطابق
    IF v_domain_org_id IS NULL THEN
        -- نتحقق إذا كان النطاق هو نطاق عام
        IF (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
            -- نسمح بالدخول من النطاق العام
            RETURN jsonb_build_object('allowed', true, 'error', NULL);
        ELSE
            RETURN jsonb_build_object(
                'allowed', false,
                'error', 'النطاق غير مسجل في النظام'
            );
        END IF;
    END IF;
    
    IF v_user_org_id != v_domain_org_id THEN
        -- نتحقق إذا كان النطاق هو نطاق عام
        IF (p_domain IS NOT NULL AND p_domain IN ('ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev')) THEN
            -- نسمح بالدخول من النطاق العام
            RETURN jsonb_build_object('allowed', true, 'error', NULL);
        ELSE
            -- تسجيل محاولة وصول غير مصرح بها
            PERFORM log_security_activity(
                p_user_id,
                'unauthorized_domain_access',
                'محاولة دخول من نطاق غير مصرح به',
                'blocked',
                'critical',
                NULL,
                NULL,
                jsonb_build_object(
                    'user_email', v_user_email,
                    'attempted_domain', p_domain,
                    'attempted_subdomain', p_subdomain,
                    'user_organization_id', v_user_org_id,
                    'domain_organization_id', v_domain_org_id
                )
            );
            
            RETURN jsonb_build_object(
                'allowed', false,
                'error', 'غير مصرح لك بالدخول من هذا النطاق'
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'error', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION verify_domain_access(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_domain_access(UUID, TEXT, TEXT) TO anon; 