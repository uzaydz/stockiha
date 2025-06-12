-- إصلاح دالة verify_2fa_for_login لحل مشكلة "معرف المستخدم غير صالح"
-- النسخة المحدثة بدون security_audit_log
-- تم إنشاؤه في: 2024-12-19

-- 1. حذف الدالة القديمة المعطلة
DROP FUNCTION IF EXISTS verify_2fa_for_login(TEXT, TEXT);

-- 2. إنشاء دالة محدثة لتسجيل الدخول بالمصادقة الثنائية
CREATE OR REPLACE FUNCTION verify_2fa_for_login(p_user_email TEXT, p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_secret TEXT;
    v_result JSON;
BEGIN
    -- البحث عن المستخدم بالبريد الإلكتروني
    SELECT u.id 
    INTO v_user_id
    FROM users u 
    WHERE u.email = p_user_email 
    AND u.two_factor_enabled = true;
    
    -- التحقق من وجود المستخدم
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير موجود أو المصادقة الثنائية غير مفعلة'
        );
    END IF;
    
    -- الحصول على مفتاح TOTP
    SELECT totp_secret 
    INTO v_secret
    FROM user_security_settings 
    WHERE user_id = v_user_id;
    
    -- التحقق من وجود المفتاح
    IF v_secret IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'مفتاح المصادقة الثنائية غير موجود'
        );
    END IF;
    
    -- استخدام دالة التحقق الآمنة
    SELECT verify_totp_code_secure(v_user_id, p_code) INTO v_result;
    
    -- إرجاع النتيجة
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في التحقق: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إنشاء دالة مساعدة لاختبار الرموز مباشرة
CREATE OR REPLACE FUNCTION test_totp_code(p_user_email TEXT, p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_secret TEXT;
    v_current_code TEXT;
    v_prev_code TEXT;
    v_next_code TEXT;
    v_time_step BIGINT;
BEGIN
    -- البحث عن المستخدم
    SELECT u.id, uss.totp_secret
    INTO v_user_id, v_secret
    FROM users u 
    LEFT JOIN user_security_settings uss ON u.id = uss.user_id
    WHERE u.email = p_user_email;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'مستخدم غير موجود');
    END IF;
    
    IF v_secret IS NULL THEN
        RETURN json_build_object('error', 'مفتاح TOTP غير موجود');
    END IF;
    
    -- حساب الوقت الحالي
    v_time_step := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
    
    -- حساب الرموز
    v_prev_code := calculate_totp(v_secret, v_time_step - 1);
    v_current_code := calculate_totp(v_secret, v_time_step);
    v_next_code := calculate_totp(v_secret, v_time_step + 1);
    
    RETURN json_build_object(
        'user_id', v_user_id,
        'provided_code', p_code,
        'previous_code', v_prev_code,
        'current_code', v_current_code,
        'next_code', v_next_code,
        'time_step', v_time_step,
        'matches_current', (p_code = v_current_code),
        'matches_previous', (p_code = v_prev_code),
        'matches_next', (p_code = v_next_code)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION verify_2fa_for_login(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_totp_code(TEXT, TEXT) TO authenticated;

-- تم إصلاح دالة تسجيل الدخول بالمصادقة الثنائية بنجاح 