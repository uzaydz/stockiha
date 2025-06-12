-- إصلاح مشكلة أنواع البيانات في المصادقة الثنائية
-- المشكلة: backup_codes_used من نوع jsonb لكن الكود يحاول استخدام text[]

-- إعادة كتابة دالة setup_two_factor_auth مع إصلاح أنواع البيانات
CREATE OR REPLACE FUNCTION setup_two_factor_auth(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_secret TEXT;
    v_backup_codes TEXT[];
    v_qr_code_url TEXT;
    v_user_email TEXT;
    v_user_name TEXT;
    i INTEGER;
BEGIN
    -- جلب بيانات المستخدم
    SELECT email, name INTO v_user_email, v_user_name 
    FROM users 
    WHERE id = p_user_id;
    
    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- توليد مفتاح سري آمن (استخدام الدالة المحسنة)
    BEGIN
        v_secret := generate_totp_secret_base32();
    EXCEPTION
        WHEN OTHERS THEN
            -- fallback إلى الطريقة البديلة إذا فشلت base32
            v_secret := generate_totp_secret();
    END;
    
    -- توليد backup codes محسن (10 رموز من 8 أرقام)
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..10 LOOP
        v_backup_codes := v_backup_codes || ARRAY[
            lpad(FLOOR(random() * 100000000)::TEXT, 8, '0')
        ];
    END LOOP;
    
    -- إنشاء URL لرمز QR محسن
    v_qr_code_url := 'otpauth://totp/Bazaar%3A' || 
                     v_user_email || 
                     '?secret=' || v_secret || 
                     '&issuer=Bazaar' ||
                     '&algorithm=SHA1' ||
                     '&digits=6' ||
                     '&period=30';
    
    -- حفظ الإعدادات في قاعدة البيانات مع تحويل صحيح للأنواع
    INSERT INTO user_security_settings (
        user_id, 
        totp_secret, 
        backup_codes, 
        backup_codes_generated_at,
        backup_codes_used,  -- jsonb type
        two_factor_enabled
    ) VALUES (
        p_user_id, 
        v_secret, 
        v_backup_codes,  -- text[] type
        NOW(),
        '[]'::jsonb,  -- empty jsonb array instead of text[]
        false  -- يتم تفعيلها لاحقاً بعد التحقق
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        totp_secret = v_secret,
        backup_codes = v_backup_codes,
        backup_codes_generated_at = NOW(),
        backup_codes_used = '[]'::jsonb,  -- reset as empty jsonb array
        updated_at = NOW();
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        '2fa_setup',
        'تم إعداد المصادقة الثنائية بنجاح',
        'success',
        'medium',
        NULL,
        NULL,
        jsonb_build_object(
            'email', v_user_email,
            'secret_length', LENGTH(v_secret),
            'backup_codes_count', array_length(v_backup_codes, 1)
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'totp_secret', v_secret,
        'qr_url', v_qr_code_url,
        'backup_codes', v_backup_codes,
        'manual_entry_key', v_secret,
        'issuer', 'Bazaar',
        'account_name', COALESCE(v_user_name, v_user_email)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ
        PERFORM log_security_activity(
            p_user_id,
            '2fa_setup_error',
            'خطأ في إعداد المصادقة الثنائية: ' || SQLERRM,
            'failed',
            'high'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ في إعداد المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة verify_2fa_for_login مع إصلاح أنواع البيانات
CREATE OR REPLACE FUNCTION verify_2fa_for_login(p_user_id UUID, p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_record RECORD;
    v_verification_result BOOLEAN := false;
    v_backup_code_used BOOLEAN := false;
    v_used_codes JSONB;
    v_used_codes_array TEXT[];
BEGIN
    -- جلب بيانات المستخدم وإعدادات الأمان
    SELECT 
        u.id,
        u.email,
        u.two_factor_enabled,
        uss.totp_secret,
        uss.backup_codes,
        uss.backup_codes_used
    INTO v_user_record
    FROM users u
    LEFT JOIN user_security_settings uss ON u.id = uss.user_id
    WHERE u.id = p_user_id;
    
    -- التحقق من وجود المستخدم
    IF v_user_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- التحقق من تفعيل المصادقة الثنائية
    IF NOT COALESCE(v_user_record.two_factor_enabled, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المصادقة الثنائية غير مفعلة لهذا المستخدم'
        );
    END IF;
    
    -- التحقق من رمز TOTP أولاً
    IF v_user_record.totp_secret IS NOT NULL THEN
        v_verification_result := verify_totp_code(v_user_record.totp_secret, p_code);
    END IF;
    
    -- إذا فشل TOTP، تحقق من backup codes
    IF NOT v_verification_result AND v_user_record.backup_codes IS NOT NULL THEN
        -- تحويل jsonb المستخدمة إلى array للمقارنة
        v_used_codes := COALESCE(v_user_record.backup_codes_used, '[]'::jsonb);
        
        -- تحويل jsonb array إلى text array للمقارنة
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_used_codes)) INTO v_used_codes_array;
        
        -- التحقق من أن الرمز موجود في backup codes وغير مستخدم
        IF p_code = ANY(v_user_record.backup_codes) AND 
           NOT (p_code = ANY(COALESCE(v_used_codes_array, ARRAY[]::TEXT[]))) THEN
            v_verification_result := true;
            v_backup_code_used := true;
            
            -- إضافة الرمز إلى قائمة الرموز المستخدمة (jsonb format)
            v_used_codes := v_used_codes || to_jsonb(p_code);
            
            UPDATE user_security_settings
            SET backup_codes_used = v_used_codes,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    -- تسجيل محاولة التحقق
    PERFORM log_security_activity(
        p_user_id,
        '2fa_verification',
        CASE 
            WHEN v_verification_result THEN 'تم التحقق من المصادقة الثنائية بنجاح'
            ELSE 'فشل في التحقق من المصادقة الثنائية'
        END,
        CASE WHEN v_verification_result THEN 'success' ELSE 'failed' END,
        CASE WHEN v_verification_result THEN 'low' ELSE 'medium' END,
        NULL,
        NULL,
        jsonb_build_object(
            'backup_code_used', v_backup_code_used,
            'verification_success', v_verification_result,
            'code_length', LENGTH(p_code)
        )
    );
    
    RETURN jsonb_build_object(
        'success', v_verification_result,
        'backup_code_used', v_backup_code_used,
        'error', CASE 
            WHEN v_verification_result THEN NULL
            ELSE 'رمز المصادقة الثنائية غير صحيح'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ في التحقق من المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة regenerate_backup_codes مع إصلاح أنواع البيانات
CREATE OR REPLACE FUNCTION regenerate_backup_codes(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_backup_codes TEXT[];
    i INTEGER;
BEGIN
    -- توليد backup codes جديدة
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..10 LOOP
        v_backup_codes := v_backup_codes || ARRAY[
            lpad(FLOOR(random() * 100000000)::TEXT, 8, '0')
        ];
    END LOOP;
    
    -- تحديث قاعدة البيانات مع إصلاح نوع البيانات
    UPDATE user_security_settings 
    SET 
        backup_codes = v_backup_codes,
        backup_codes_used = '[]'::jsonb,  -- reset as empty jsonb array
        backup_codes_generated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        'backup_codes_regenerated',
        'تم إعادة توليد backup codes',
        'success',
        'medium'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'backup_codes', v_backup_codes,
        'message', 'تم إعادة توليد backup codes بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ في إعادة توليد backup codes: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة disable_two_factor_auth مع إصلاح أنواع البيانات
CREATE OR REPLACE FUNCTION disable_two_factor_auth(
    p_user_id UUID,
    p_verification_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_verification_result JSONB;
BEGIN
    -- التحقق من الرمز أولاً
    SELECT verify_2fa_for_login(p_user_id, p_verification_code) INTO v_verification_result;
    
    -- إذا كان الرمز صحيحاً، إلغاء تفعيل المصادقة الثنائية
    IF (v_verification_result->>'success')::BOOLEAN THEN
        UPDATE users 
        SET two_factor_enabled = false 
        WHERE id = p_user_id;
        
        UPDATE user_security_settings 
        SET 
            two_factor_enabled = false,
            totp_secret = NULL,
            backup_codes = NULL,
            backup_codes_used = NULL,  -- can be NULL for jsonb
            backup_codes_generated_at = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- تسجيل النشاط
        PERFORM log_security_activity(
            p_user_id,
            '2fa_disabled',
            'تم إلغاء تفعيل المصادقة الثنائية',
            'success',
            'high'
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'تم إلغاء تفعيل المصادقة الثنائية بنجاح'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'رمز التحقق غير صحيح'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ في إلغاء تفعيل المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة reset_two_factor_auth مع إصلاح أنواع البيانات
CREATE OR REPLACE FUNCTION reset_two_factor_auth(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
    -- إعادة تعيين إعدادات المصادقة الثنائية
    UPDATE user_security_settings 
    SET 
        two_factor_enabled = false,
        totp_secret = NULL,
        backup_codes = NULL,
        backup_codes_used = NULL,  -- jsonb can be NULL
        backup_codes_generated_at = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- تحديث جدول المستخدمين أيضاً
    UPDATE users
    SET two_factor_enabled = false
    WHERE id = p_user_id;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        '2fa_reset',
        'تم إعادة تعيين المصادقة الثنائية',
        'success',
        'high'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'تم إعادة تعيين المصادقة الثنائية بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ في إعادة تعيين المصادقة الثنائية: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 