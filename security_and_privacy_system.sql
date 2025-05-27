-- نظام الأمان والخصوصية مع المصادقة الثنائية
-- Security and Privacy System with Two-Factor Authentication

-- 1. تحديث جدول users لإضافة حقول الأمان
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_account_linked boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_user_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_notifications_enabled boolean DEFAULT true;

-- 2. جدول إعدادات الأمان للمستخدمين
CREATE TABLE IF NOT EXISTS user_security_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- إعدادات المصادقة الثنائية
    two_factor_method text DEFAULT 'totp', -- 'totp', 'sms', 'email'
    backup_codes_generated_at timestamp with time zone,
    backup_codes_used jsonb DEFAULT '[]',
    
    -- إعدادات الجلسات
    max_active_sessions integer DEFAULT 5,
    session_timeout_minutes integer DEFAULT 480, -- 8 ساعات
    require_reauth_for_sensitive boolean DEFAULT true,
    
    -- إعدادات كلمة المرور
    password_expiry_days integer DEFAULT 90,
    require_strong_password boolean DEFAULT true,
    prevent_password_reuse integer DEFAULT 5,
    
    -- إعدادات الأمان المتقدمة
    login_notification_enabled boolean DEFAULT true,
    suspicious_activity_alerts boolean DEFAULT true,
    device_tracking_enabled boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- 3. جدول الجلسات النشطة
CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token text NOT NULL,
    
    -- معلومات الجلسة
    device_info jsonb,
    ip_address inet,
    user_agent text,
    location_info jsonb,
    
    -- حالة الجلسة
    is_active boolean DEFAULT true,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    
    -- معلومات إضافية
    login_method text, -- 'password', 'google', 'two_factor'
    is_trusted_device boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_token)
);

-- 4. جدول سجل الأنشطة الأمنية
CREATE TABLE IF NOT EXISTS security_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    
    -- نوع النشاط
    activity_type text NOT NULL, -- 'login', 'logout', 'password_change', '2fa_setup', etc.
    activity_description text,
    
    -- تفاصيل النشاط
    ip_address inet,
    user_agent text,
    device_info jsonb,
    location_info jsonb,
    
    -- حالة النشاط
    status text NOT NULL, -- 'success', 'failed', 'blocked'
    risk_level text DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    
    -- معلومات إضافية
    metadata jsonb,
    session_id uuid REFERENCES user_sessions(id) ON DELETE SET NULL,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 5. جدول الأجهزة الموثوقة
CREATE TABLE IF NOT EXISTS trusted_devices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- معلومات الجهاز
    device_fingerprint text NOT NULL,
    device_name text,
    device_type text, -- 'desktop', 'mobile', 'tablet'
    browser_info jsonb,
    
    -- حالة الثقة
    is_trusted boolean DEFAULT true,
    trust_level integer DEFAULT 1, -- 1-5 scale
    last_used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    -- معلومات إضافية
    first_seen_ip inet,
    last_seen_ip inet,
    usage_count integer DEFAULT 1,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
    
    UNIQUE(user_id, device_fingerprint)
);

-- 6. جدول رموز التحقق المؤقتة
CREATE TABLE IF NOT EXISTS verification_codes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- معلومات الرمز
    code text NOT NULL,
    code_type text NOT NULL, -- 'login', 'password_reset', 'email_verification', '2fa_setup'
    
    -- صلاحية الرمز
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false,
    used_at timestamp with time zone,
    
    -- معلومات إضافية
    ip_address inet,
    attempts_count integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 7. جدول إعدادات الخصوصية
CREATE TABLE IF NOT EXISTS privacy_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- إعدادات الظهور
    profile_visibility text DEFAULT 'organization', -- 'public', 'organization', 'private'
    show_email boolean DEFAULT false,
    show_phone boolean DEFAULT false,
    show_last_activity boolean DEFAULT true,
    
    -- إعدادات البيانات
    allow_data_collection boolean DEFAULT true,
    allow_analytics boolean DEFAULT true,
    allow_marketing_emails boolean DEFAULT false,
    
    -- إعدادات الاتصال
    allow_contact_from_others boolean DEFAULT true,
    allow_friend_requests boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- 8. إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_activity_type ON security_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_risk_level ON security_logs(risk_level);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON trusted_devices(expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- 9. دوال مساعدة للأمان

-- دالة لتسجيل النشاط الأمني
CREATE OR REPLACE FUNCTION log_security_activity(
    p_user_id uuid,
    p_activity_type text,
    p_activity_description text DEFAULT NULL,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_status text DEFAULT 'success',
    p_risk_level text DEFAULT 'low',
    p_metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO security_logs (
        user_id, activity_type, activity_description,
        ip_address, user_agent, status, risk_level, metadata
    ) VALUES (
        p_user_id, p_activity_type, p_activity_description,
        p_ip_address, p_user_agent, p_status, p_risk_level, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- دالة للتحقق من محاولات تسجيل الدخول الفاشلة
CREATE OR REPLACE FUNCTION check_failed_login_attempts(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    failed_attempts integer;
    lock_until timestamp with time zone;
BEGIN
    SELECT failed_login_attempts, account_locked_until
    INTO failed_attempts, lock_until
    FROM users
    WHERE id = p_user_id;
    
    -- التحقق من قفل الحساب
    IF lock_until IS NOT NULL AND lock_until > CURRENT_TIMESTAMP THEN
        RETURN false; -- الحساب مقفل
    END IF;
    
    -- إذا انتهت فترة القفل، إعادة تعيين المحاولات
    IF lock_until IS NOT NULL AND lock_until <= CURRENT_TIMESTAMP THEN
        UPDATE users 
        SET failed_login_attempts = 0, account_locked_until = NULL
        WHERE id = p_user_id;
        RETURN true;
    END IF;
    
    -- التحقق من عدد المحاولات الفاشلة
    IF failed_attempts >= 5 THEN
        -- قفل الحساب لمدة 30 دقيقة
        UPDATE users 
        SET account_locked_until = CURRENT_TIMESTAMP + INTERVAL '30 minutes'
        WHERE id = p_user_id;
        
        -- تسجيل النشاط
        PERFORM log_security_activity(
            p_user_id, 
            'account_locked', 
            'Account locked due to too many failed login attempts',
            NULL, NULL, 'blocked', 'high'
        );
        
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- دالة لتسجيل محاولة دخول فاشلة
CREATE OR REPLACE FUNCTION record_failed_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = p_user_id;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id, 
        'login_failed', 
        'Failed login attempt',
        NULL, NULL, 'failed', 'medium'
    );
END;
$$;

-- دالة لإعادة تعيين محاولات الدخول الفاشلة
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = 0, account_locked_until = NULL
    WHERE id = p_user_id;
END;
$$;

-- دالة لتنظيف الجلسات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR 
          (last_activity_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- دالة لتنظيف رموز التحقق المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM verification_codes 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- دالة لتنظيف الأجهزة الموثوقة المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM trusted_devices 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 10. إنشاء إعدادات افتراضية للمستخدمين الموجودين
INSERT INTO user_security_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings);

INSERT INTO privacy_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM privacy_settings);

-- 11. إنشاء triggers للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق trigger على الجداول المناسبة
DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON user_security_settings;
CREATE TRIGGER update_user_security_settings_updated_at
    BEFORE UPDATE ON user_security_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON privacy_settings;
CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. إنشاء سياسات RLS للأمان
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- سياسات للمستخدمين العاديين
CREATE POLICY "Users can view their own security settings" ON user_security_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON user_security_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own security logs" ON security_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trusted devices" ON trusted_devices
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own privacy settings" ON privacy_settings
    FOR ALL USING (auth.uid() = user_id);

-- سياسات للمديرين
CREATE POLICY "Admins can view all security data" ON user_security_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (is_super_admin = true OR is_org_admin = true)
        )
    );

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (is_super_admin = true OR is_org_admin = true)
        )
    );

CREATE POLICY "Admins can view all security logs" ON security_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (is_super_admin = true OR is_org_admin = true)
        )
    );

-- 13. منح الصلاحيات
GRANT EXECUTE ON FUNCTION log_security_activity TO authenticated;
GRANT EXECUTE ON FUNCTION check_failed_login_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login TO authenticated;
GRANT EXECUTE ON FUNCTION reset_failed_login_attempts TO authenticated;

-- رسالة نجاح
SELECT 'تم إنشاء نظام الأمان والخصوصية بنجاح!' as message; 