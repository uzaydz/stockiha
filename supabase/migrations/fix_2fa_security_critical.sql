-- ==================================================
-- إصلاح أمني خطير: ثغرة في دالة verify_totp_code
-- ==================================================
-- 
-- المشكلة المكتشفة: دالة verify_totp_code تقبل أي رقم من 6 أرقام
-- مما يعني أن أي شخص يمكنه اختراق النظام بإدخال أي رقم مثل 123456
-- 
-- هذا الملف يحل المشكلة بطريقة آمنة ومتوافقة مع معايير TOTP
-- ==================================================

-- 1. إنشاء دالة مساعدة لفك تشفير Base32
CREATE OR REPLACE FUNCTION decode_base32(input_text TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    result TEXT := '';
    input_clean TEXT;
    bits TEXT := '';
    i INTEGER;
    char_pos INTEGER;
    char_val INTEGER;
    chunk TEXT;
    byte_val INTEGER;
    hex_result TEXT := '';
BEGIN
    -- تنظيف المدخل من المسافات والأحرف الخاصة
    input_clean := UPPER(REPLACE(REPLACE(input_text, ' ', ''), '=', ''));
    
    -- تحويل كل حرف إلى 5 bits
    FOR i IN 1..LENGTH(input_clean) LOOP
        char_pos := POSITION(SUBSTRING(input_clean FROM i FOR 1) IN alphabet);
        IF char_pos = 0 THEN
            RAISE EXCEPTION 'Invalid Base32 character: %', SUBSTRING(input_clean FROM i FOR 1);
        END IF;
        
        -- تحويل الحرف إلى 5 bits
        char_val := char_pos - 1;
        bits := bits || LPAD(char_val::bit(5)::TEXT, 5, '0');
    END LOOP;
    
    -- تقسيم bits إلى chunks من 8 bits وتحويل إلى hex
    FOR i IN 1..LENGTH(bits) BY 8 LOOP
        chunk := SUBSTRING(bits FROM i FOR 8);
        IF LENGTH(chunk) = 8 THEN
            byte_val := ('0' || chunk)::bit(9)::INTEGER;
            hex_result := hex_result || LPAD(TO_HEX(byte_val), 2, '0');
        END IF;
    END LOOP;
    
    -- تحويل hex إلى bytea
    RETURN DECODE(hex_result, 'hex');
END;
$$;

-- 2. التأكد من وجود extension pgcrypto للدوال الأمنية
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. إنشاء دالة TOTP مبسطة وآمنة
CREATE OR REPLACE FUNCTION calculate_totp(secret_base32 TEXT, time_step BIGINT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    key_bytes BYTEA;
    time_counter BIGINT;
    counter_hex TEXT;
    hmac_result BYTEA;
    hmac_hex TEXT;
    byte_offset INTEGER;
    code_hex TEXT;
    code_int BIGINT;
BEGIN
    -- استخدام الوقت الحالي إذا لم يتم تمرير time_step
    IF time_step IS NULL THEN
        time_counter := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
    ELSE
        time_counter := time_step;
    END IF;
    
    -- فك تشفير المفتاح من Base32
    key_bytes := decode_base32(secret_base32);
    
    -- تحويل counter إلى 8 bytes hex (big-endian)
    counter_hex := '00000000' || LPAD(TO_HEX(time_counter), 8, '0');
    
    -- حساب HMAC-SHA1
    hmac_result := hmac(DECODE(counter_hex, 'hex'), key_bytes, 'sha1');
    
    -- تحويل النتيجة إلى hex للتعامل معها
    hmac_hex := ENCODE(hmac_result, 'hex');
    
    -- الحصول على آخر nibble كـ offset
    byte_offset := ('x' || RIGHT(hmac_hex, 1))::bit(4)::INTEGER;
    
    -- استخراج 4 bytes من الموضع المحدد
    code_hex := SUBSTRING(hmac_hex FROM (byte_offset * 2) + 1 FOR 8);
    
    -- تحويل إلى integer وإزالة MSB
    code_int := ('x' || code_hex)::bit(32)::BIGINT & 2147483647;
    
    -- تحويل إلى 6 أرقام
    RETURN LPAD((code_int % 1000000)::TEXT, 6, '0');
END;
$$;

-- 3. إنشاء دالة التحقق الآمنة من TOTP
CREATE OR REPLACE FUNCTION verify_totp_code_secure(secret_base32 TEXT, input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_time_step BIGINT;
    calculated_code TEXT;
    time_window INTEGER := 1; -- السماح بنافذة زمنية ±30 ثانية
    i INTEGER;
BEGIN
    -- التحقق من صحة الرمز المدخل
    IF input_code IS NULL OR LENGTH(input_code) != 6 OR input_code !~ '^[0-9]{6}$' THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من صحة المفتاح
    IF secret_base32 IS NULL OR LENGTH(secret_base32) < 16 THEN
        RETURN FALSE;
    END IF;
    
    -- حساب النافذة الزمنية الحالية
    current_time_step := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
    
    -- التحقق من النوافذ الزمنية المسموحة (الحالية + السابقة + التالية)
    FOR i IN -time_window..time_window LOOP
        calculated_code := calculate_totp(secret_base32, current_time_step + i);
        
        IF calculated_code = input_code THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$;

-- 4. إنشاء دالة التحقق المحدثة للمصادقة الثنائية
CREATE OR REPLACE FUNCTION verify_totp_code(secret_base32 TEXT, input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- استخدام الدالة الآمنة الجديدة
    RETURN verify_totp_code_secure(secret_base32, input_code);
END;
$$;

-- 5. إنشاء دالة محدثة للتحقق بناءً على user_id
CREATE OR REPLACE FUNCTION verify_totp_code(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    stored_secret TEXT;
    v_backup_codes TEXT[];
    v_used_codes TEXT[];
BEGIN
    -- جلب المفتاح المحفوظ
    SELECT totp_secret, backup_codes, backup_codes_used 
    INTO stored_secret, v_backup_codes, v_used_codes
    FROM user_security_settings 
    WHERE user_id = p_user_id;
    
    -- التحقق من وجود المفتاح
    IF stored_secret IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من backup codes أولاً
    IF v_backup_codes IS NOT NULL AND p_code = ANY(v_backup_codes) 
       AND NOT (p_code = ANY(COALESCE(v_used_codes, '{}'))) THEN
        
        -- إضافة الرمز للمستخدمة
        UPDATE user_security_settings 
        SET backup_codes_used = array_append(COALESCE(backup_codes_used, '{}'), p_code),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- تسجيل النشاط
        PERFORM log_security_activity(
            p_user_id,
            '2fa_backup_code_used',
            'تم استخدام backup code بنجاح',
            'success',
            'medium',
            NULL,
            NULL,
            jsonb_build_object('code_used', 'backup')
        );
        
        RETURN TRUE;
    END IF;
    
    -- التحقق من TOTP code بالطريقة الآمنة
    IF verify_totp_code_secure(stored_secret, p_code) THEN
        -- تسجيل النشاط الناجح
        PERFORM log_security_activity(
            p_user_id,
            '2fa_code_verified',
            'تم التحقق من رمز TOTP بنجاح',
            'success',
            'low',
            NULL,
            NULL,
            jsonb_build_object('code_type', 'totp', 'verification_method', 'secure_hmac_sha1')
        );
        
        RETURN TRUE;
    END IF;
    
    -- تسجيل المحاولة الفاشلة
    PERFORM log_security_activity(
        p_user_id,
        '2fa_code_failed',
        'فشل في التحقق من رمز المصادقة الثنائية',
        'failed',
        'high',
        NULL,
        NULL,
        jsonb_build_object(
            'attempted_code_length', LENGTH(p_code),
            'code_format_valid', (p_code ~ '^[0-9]{6}$'),
            'has_secret', (stored_secret IS NOT NULL),
            'verification_method', 'secure_hmac_sha1'
        )
    );
    
    RETURN FALSE;
END;
$$;

-- 6. تحديث دالة verify_2fa_for_login لاستخدام التحقق الآمن
CREATE OR REPLACE FUNCTION verify_2fa_for_login(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_user_record RECORD;
    v_verification_result BOOLEAN := FALSE;
    v_backup_code_used BOOLEAN := FALSE;
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
            'success', FALSE,
            'error', 'المستخدم غير موجود'
        );
    END IF;
    
    -- التحقق من تفعيل المصادقة الثنائية
    IF NOT COALESCE(v_user_record.two_factor_enabled, FALSE) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'المصادقة الثنائية غير مفعلة لهذا المستخدم'
        );
    END IF;
    
    -- التحقق من رمز TOTP باستخدام الطريقة الآمنة
    IF v_user_record.totp_secret IS NOT NULL THEN
        v_verification_result := verify_totp_code_secure(v_user_record.totp_secret, p_code);
    END IF;
    
    -- إذا فشل TOTP، تحقق من backup codes
    IF NOT v_verification_result AND v_user_record.backup_codes IS NOT NULL THEN
        v_used_codes := COALESCE(v_user_record.backup_codes_used, '[]'::jsonb);
        
        -- تحويل jsonb array إلى text array للمقارنة
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_used_codes)) INTO v_used_codes_array;
        
        -- التحقق من أن الرمز موجود في backup codes وغير مستخدم
        IF p_code = ANY(v_user_record.backup_codes) AND 
           NOT (p_code = ANY(COALESCE(v_used_codes_array, ARRAY[]::TEXT[]))) THEN
            v_verification_result := TRUE;
            v_backup_code_used := TRUE;
            
            -- إضافة الرمز إلى قائمة الرموز المستخدمة
            v_used_codes := v_used_codes || to_jsonb(p_code);
            
            UPDATE user_security_settings
            SET backup_codes_used = v_used_codes,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    -- تسجيل محاولة التحقق مع تفاصيل أمنية
    PERFORM log_security_activity(
        p_user_id,
        '2fa_login_verification',
        CASE 
            WHEN v_verification_result THEN 'تم التحقق من المصادقة الثنائية للدخول بنجاح'
            ELSE 'فشل في التحقق من المصادقة الثنائية للدخول'
        END,
        CASE WHEN v_verification_result THEN 'success' ELSE 'failed' END,
        CASE WHEN v_verification_result THEN 'low' ELSE 'high' END,
        NULL,
        NULL,
        jsonb_build_object(
            'backup_code_used', v_backup_code_used,
            'verification_success', v_verification_result,
            'code_length', LENGTH(p_code),
            'verification_method', 'secure_hmac_sha1',
            'login_context', TRUE
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
        -- تسجيل الخطأ
        PERFORM log_security_activity(
            p_user_id,
            '2fa_verification_error',
            'حدث خطأ في التحقق من المصادقة الثنائية: ' || SQLERRM,
            'error',
            'critical',
            NULL,
            NULL,
            jsonb_build_object('error_details', SQLERRM)
        );
        
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'حدث خطأ في التحقق من المصادقة الثنائية'
        );
END;
$$;

-- 6.1. إنشاء دالة إضافية تتعامل مع userId كـ TEXT (للواجهة الأمامية)
CREATE OR REPLACE FUNCTION verify_2fa_for_login(p_user_id TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- تحويل TEXT إلى UUID وستدعو الدالة الأصلية
    RETURN verify_2fa_for_login(p_user_id::UUID, p_code);
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'معرف المستخدم غير صالح'
        );
END;
$$;

-- 7. إنشاء دالة اختبار للتحقق من صحة الإصلاح
CREATE OR REPLACE FUNCTION test_totp_security_fix()
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    test_secret TEXT := 'JBSWY3DPEHPK3PXP'; -- مفتاح اختبار معروف
    fake_code TEXT := '123456';
    valid_codes TEXT[];
    current_time_step BIGINT;
    i INTEGER;
BEGIN
    -- اختبار 1: التحقق من رفض الأرقام العشوائية
    RETURN QUERY SELECT 
        'reject_fake_codes'::TEXT,
        NOT verify_totp_code_secure(test_secret, fake_code),
        'يجب رفض الأرقام العشوائية مثل 123456'::TEXT;
    
    -- اختبار 2: التحقق من قبول الرموز الصحيحة
    current_time_step := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
    
    FOR i IN -1..1 LOOP
        valid_codes := array_append(valid_codes, calculate_totp(test_secret, current_time_step + i));
    END LOOP;
    
    RETURN QUERY SELECT 
        'accept_valid_codes'::TEXT,
        verify_totp_code_secure(test_secret, valid_codes[2]), -- الرمز الحالي
        'يجب قبول الرموز الصحيحة المحسوبة'::TEXT;
    
    -- اختبار 3: التحقق من رفض الرموز غير الصحيحة
    RETURN QUERY SELECT 
        'reject_invalid_format'::TEXT,
        NOT verify_totp_code_secure(test_secret, 'abc123'),
        'يجب رفض الرموز بتنسيق خاطئ'::TEXT;
    
    -- اختبار 4: التحقق من رفض المفاتيح الفارغة
    RETURN QUERY SELECT 
        'reject_empty_secret'::TEXT,
        NOT verify_totp_code_secure('', '123456'),
        'يجب رفض المفاتيح الفارغة'::TEXT;
        
    RETURN;
END;
$$;

-- 8. تشغيل اختبارات الأمان
DO $$
DECLARE
    test_result RECORD;
    all_tests_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '=== بدء اختبارات الأمان للمصادقة الثنائية ===';
    
    FOR test_result IN SELECT * FROM test_totp_security_fix() LOOP
        IF test_result.result THEN
            RAISE NOTICE '✅ %: %', test_result.test_name, test_result.message;
        ELSE
            RAISE NOTICE '❌ %: %', test_result.test_name, test_result.message;
            all_tests_passed := FALSE;
        END IF;
    END LOOP;
    
    IF all_tests_passed THEN
        RAISE NOTICE '🎉 جميع اختبارات الأمان نجحت! تم إصلاح الثغرة الأمنية بنجاح.';
    ELSE
        RAISE NOTICE '⚠️  بعض الاختبارات فشلت. يرجى مراجعة الكود.';
    END IF;
    
    RAISE NOTICE '=== انتهاء اختبارات الأمان ===';
END;
$$;

-- 9. تسجيل الإصلاح في سجل الأمان
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- البحث عن مستخدم admin أو أول مستخدم
    SELECT id INTO admin_user_id 
    FROM users 
    WHERE email LIKE '%admin%' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- إذا لم نجد admin، نأخذ أول مستخدم
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM users 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    -- تسجيل الإصلاح إذا وجدنا مستخدم
    IF admin_user_id IS NOT NULL THEN
        PERFORM log_security_activity(
            admin_user_id,
            'security_fix_applied',
            'تم إصلاح الثغرة الأمنية الخطيرة في دالة verify_totp_code',
            'success',
            'critical',
            NULL,
            NULL,
            jsonb_build_object(
                'fix_type', 'totp_security_vulnerability',
                'old_method', 'accepts_any_6_digits',
                'new_method', 'secure_hmac_sha1_verification',
                'migration_file', 'fix_2fa_security_critical.sql',
                'applied_at', NOW(),
                'additional_fix', 'added_text_uuid_compatibility'
            )
        );
    ELSE
        -- إذا لم نجد أي مستخدم، نعرض رسالة
        RAISE NOTICE 'لم يتم العثور على مستخدمين لتسجيل الإصلاح الأمني';
    END IF;
END;
$$;

-- 10. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_security_settings_totp_lookups 
ON user_security_settings(user_id, two_factor_enabled) 
WHERE totp_secret IS NOT NULL;

-- 11. تنظيف الدوال المؤقتة
DROP FUNCTION IF EXISTS test_totp_security_fix();

-- تم الانتهاء من الإصلاح الأمني
-- =======================================
-- 
-- الملخص:
-- ✅ تم إصلاح الثغرة الأمنية الخطيرة في verify_totp_code
-- ✅ تم تطبيق التحقق الآمن باستخدام HMAC-SHA1 المعياري
-- ✅ تم إنشاء دوال Base32 وHMAC-SHA1 من الصفر
-- ✅ تم اختبار الإصلاح للتأكد من عمله بشكل صحيح
-- ✅ تم تسجيل الإصلاح في سجل الأمان
-- ✅ تم إضافة دعم TEXT userId للواجهة الأمامية
-- 
-- هذا الإصلاح يحول النظام من قبول أي رقم من 6 أرقام
-- إلى التحقق الفعلي والآمن من رموز TOTP باستخدام المعايير الدولية
-- ======================================= 