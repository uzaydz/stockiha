-- إصلاح قواعد الدخول من النطاقات
-- 1. السماح للجميع بالدخول من النطاق العام (ktobi.online, stockiha.com, bazaar.com, bazaar.dev)
-- 2. تقييد الدخول من النطاقات الخاصة بحيث تكون متاحة فقط للمستخدمين التابعين للمؤسسة المالكة للنطاق

-- قائمة النطاقات العامة
CREATE OR REPLACE FUNCTION get_public_domains()
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY[
        'ktobi.online', 
        'stockiha.com', 
        'bazaar.com', 
        'bazaar.dev',
        'localhost', 
        '127.0.0.1',
        'localhost:8080',
        '127.0.0.1:8080'
    ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- دالة للتحقق ما إذا كان النطاق عاماً
CREATE OR REPLACE FUNCTION is_public_domain(p_domain TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_public_domains TEXT[];
    v_domain TEXT;
    v_with_www TEXT[];
BEGIN
    SELECT get_public_domains() INTO v_public_domains;
    
    -- إنشاء مصفوفة بالنطاقات مع إضافة www
    v_with_www := ARRAY[]::TEXT[];
    FOREACH v_domain IN ARRAY v_public_domains
    LOOP
        v_with_www := v_with_www || ('www.' || v_domain);
    END LOOP;
    
    -- التحقق من النطاقات المحلية بشكل خاص
    IF p_domain LIKE 'localhost%' OR p_domain LIKE '127.0.0.1%' THEN
        RETURN TRUE;
    END IF;
    
    -- التحقق مما إذا كان النطاق موجوداً في قائمة النطاقات العامة
    RETURN p_domain = ANY(v_public_domains) OR 
           ('www.' || p_domain) = ANY(v_public_domains) OR
           p_domain = ANY(v_with_www);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- تحديث دالة check_user_requires_2fa لدعم القواعد الجديدة
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
    v_is_public_domain BOOLEAN;
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

-- تحديث دالة verify_domain_access للتوافق مع القواعد الجديدة
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
    v_is_public_domain BOOLEAN;
BEGIN
    -- جلب معرف مؤسسة المستخدم
    SELECT organization_id, email INTO v_user_org_id, v_user_email
    FROM users
    WHERE id = p_user_id;
    
    -- التحقق مما إذا كان النطاق الحالي هو نطاق عام
    IF p_domain IS NOT NULL THEN
        v_is_public_domain := is_public_domain(p_domain);
    ELSE
        v_is_public_domain := p_domain IS NULL AND p_subdomain IS NULL;
    END IF;
    
    -- إذا لم يتم تحديد نطاق، فهذا دخول من النطاق العام
    IF p_domain IS NULL AND p_subdomain IS NULL THEN
        -- السماح لجميع المستخدمين بالدخول من النطاق العام
        RETURN jsonb_build_object('allowed', true, 'error', NULL);
    END IF;
    
    -- جلب معرف المؤسسة من النطاق
    v_domain_org_id := get_organization_by_domain(p_domain, p_subdomain);
    
    -- التحقق من التطابق
    IF v_domain_org_id IS NULL THEN
        -- إذا كان النطاق عاماً، نسمح بالدخول
        IF v_is_public_domain THEN
            RETURN jsonb_build_object('allowed', true, 'error', NULL);
        ELSE
            RETURN jsonb_build_object(
                'allowed', false,
                'error', 'النطاق غير مسجل في النظام'
            );
        END IF;
    END IF;
    
    -- القاعدة الجديدة: إذا كان النطاق تابع لمؤسسة، فيجب أن يكون المستخدم تابعاً لنفس المؤسسة
    IF v_user_org_id != v_domain_org_id THEN
        -- إذا كان النطاق عاماً، نسمح بالدخول لجميع المستخدمين
        IF v_is_public_domain THEN
            RETURN jsonb_build_object('allowed', true, 'error', NULL);
        ELSE
            -- تسجيل محاولة وصول غير مصرح بها
            PERFORM log_security_activity(
                p_user_id,
                'unauthorized_domain_access',
                'محاولة دخول من نطاق مؤسسة غير تابع لها',
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
                'error', 'غير مصرح لك بالدخول من هذا النطاق، فهو تابع لمؤسسة أخرى'
            );
        END IF;
    END IF;
    
    -- المستخدم ينتمي للمؤسسة المالكة للنطاق، أو أن النطاق عام
    RETURN jsonb_build_object('allowed', true, 'error', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION get_public_domains() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_public_domain(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_user_requires_2fa(TEXT, UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_domain_access(UUID, TEXT, TEXT) TO authenticated, anon; 