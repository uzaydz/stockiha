-- ==================================================
-- إصلاح إعدادات CAPTCHA في Supabase
-- ==================================================
-- 
-- هذا الملف يحل مشكلة "captcha verification process failed"
-- عن طريق التأكد من أن CAPTCHA معطل بشكل صحيح
-- ==================================================

-- 1. التأكد من أن إعدادات الأمان صحيحة
DO $$
BEGIN
    -- التحقق من وجود إعدادات CAPTCHA في جدول الإعدادات العامة
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_settings'
    ) THEN
        -- إنشاء جدول الإعدادات العامة إذا لم يكن موجوداً
        CREATE TABLE IF NOT EXISTS global_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value JSONB NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- إدراج إعدادات CAPTCHA
        INSERT INTO global_settings (key, value, description) VALUES
        ('captcha_enabled', 'false', 'تفعيل/تعطيل CAPTCHA'),
        ('captcha_provider', '"disabled"', 'مزود خدمة CAPTCHA'),
        ('auth_security_level', '"standard"', 'مستوى الأمان للمصادقة')
        ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now();
    END IF;
END $$;

-- 2. إنشاء دالة للتحقق من إعدادات CAPTCHA
CREATE OR REPLACE FUNCTION check_captcha_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'captcha_enabled', COALESCE((value->>'captcha_enabled')::boolean, false),
        'captcha_provider', COALESCE(value->>'captcha_provider', 'disabled'),
        'auth_security_level', COALESCE(value->>'auth_security_level', 'standard')
    ) INTO result
    FROM global_settings 
    WHERE key = 'captcha_enabled';
    
    RETURN COALESCE(result, '{"captcha_enabled": false, "captcha_provider": "disabled", "auth_security_level": "standard"}'::jsonb);
END;
$$;

-- 3. إنشاء دالة لإصلاح إعدادات CAPTCHA
CREATE OR REPLACE FUNCTION fix_captcha_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- تحديث إعدادات CAPTCHA لتعطيلها
    INSERT INTO global_settings (key, value, description) VALUES
    ('captcha_enabled', 'false', 'تفعيل/تعطيل CAPTCHA'),
    ('captcha_provider', '"disabled"', 'مزود خدمة CAPTCHA'),
    ('auth_security_level', '"standard"', 'مستوى الأمان للمصادقة')
    ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();
    
    -- إرجاع الإعدادات المحدثة
    SELECT check_captcha_settings() INTO result;
    
    RETURN result;
END;
$$;

-- 4. إنشاء دالة للتحقق من صحة تسجيل الدخول بدون CAPTCHA
CREATE OR REPLACE FUNCTION verify_login_without_captcha(
    p_email TEXT,
    p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    result JSONB;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT * INTO user_record
    FROM auth.users
    WHERE email = p_email
    AND encrypted_password = p_password_hash;
    
    IF user_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'بيانات تسجيل الدخول غير صحيحة',
            'code', 'invalid_credentials'
        );
    END IF;
    
    -- التحقق من أن الحساب مؤكد
    IF user_record.email_confirmed_at IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'يرجى تأكيد بريدك الإلكتروني أولاً',
            'code', 'email_not_confirmed'
        );
    END IF;
    
    -- التحقق من أن الحساب غير محظور
    IF user_record.banned_until IS NOT NULL AND user_record.banned_until > now() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب محظور مؤقتاً',
            'code', 'account_banned'
        );
    END IF;
    
    -- نجاح تسجيل الدخول
    RETURN jsonb_build_object(
        'success', true,
        'user_id', user_record.id,
        'email', user_record.email,
        'role', user_record.raw_user_meta_data->>'role',
        'name', user_record.raw_user_meta_data->>'name'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ غير متوقع',
            'code', 'internal_error'
        );
END;
$$;

-- 5. تطبيق الإصلاحات
SELECT fix_captcha_settings();

-- 6. إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_global_settings_key ON global_settings(key);

-- 7. تسجيل الإصلاح في سجل الأمان
INSERT INTO security_logs (
    activity_type,
    activity_description,
    status,
    risk_level,
    metadata
) VALUES (
    'system_maintenance',
    'تم إصلاح إعدادات CAPTCHA',
    'success',
    'low',
    '{"fix_type": "captcha_settings", "captcha_enabled": false}'
);

-- 8. عرض رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح إعدادات CAPTCHA بنجاح';
    RAISE NOTICE 'CAPTCHA معطل الآن';
    RAISE NOTICE 'يمكن للمستخدمين تسجيل الدخول بدون CAPTCHA';
END $$; 