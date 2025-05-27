-- إنشاء جداول الأمان والخصوصية مع دعم النطاقات المتعددة
-- Security and Privacy Tables with Multi-Domain Support

-- جدول إعدادات الأمان للمستخدمين
CREATE TABLE IF NOT EXISTS user_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- إعدادات المصادقة الثنائية
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_method TEXT CHECK (two_factor_method IN ('totp', 'sms', 'email')) DEFAULT 'email',
    totp_secret TEXT,
    backup_codes TEXT[],
    backup_codes_generated_at TIMESTAMPTZ,
    backup_codes_used TEXT[] DEFAULT '{}',
    
    -- إعدادات الجلسات
    max_active_sessions INTEGER DEFAULT 5 CHECK (max_active_sessions > 0),
    session_timeout_minutes INTEGER DEFAULT 480 CHECK (session_timeout_minutes > 0), -- 8 hours
    require_reauth_for_sensitive BOOLEAN DEFAULT true,
    
    -- إعدادات كلمة المرور
    password_expiry_days INTEGER DEFAULT 90 CHECK (password_expiry_days > 0),
    require_strong_password BOOLEAN DEFAULT true,
    prevent_password_reuse INTEGER DEFAULT 5 CHECK (prevent_password_reuse >= 0),
    last_password_change TIMESTAMPTZ DEFAULT now(),
    
    -- إعدادات التنبيهات
    login_notification_enabled BOOLEAN DEFAULT true,
    suspicious_activity_alerts BOOLEAN DEFAULT true,
    device_tracking_enabled BOOLEAN DEFAULT true,
    
    -- إعدادات OAuth
    google_account_linked BOOLEAN DEFAULT false,
    google_user_id TEXT,
    oauth_providers TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول إعدادات الخصوصية
CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- إعدادات الرؤية
    profile_visibility TEXT CHECK (profile_visibility IN ('public', 'organization', 'private')) DEFAULT 'organization',
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    show_last_activity BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    
    -- إعدادات جمع البيانات
    allow_data_collection BOOLEAN DEFAULT true,
    allow_analytics BOOLEAN DEFAULT true,
    allow_marketing_emails BOOLEAN DEFAULT false,
    allow_product_updates BOOLEAN DEFAULT true,
    
    -- إعدادات التفاعل
    allow_contact_from_others BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    allow_organization_invites BOOLEAN DEFAULT true,
    
    -- إعدادات المشاركة
    allow_profile_indexing BOOLEAN DEFAULT false,
    allow_data_export BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الجلسات النشطة
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    
    -- معلومات الجهاز والموقع
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB,
    
    -- حالة الجلسة
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    login_method TEXT DEFAULT 'email',
    is_trusted_device BOOLEAN DEFAULT false,
    
    -- معلومات النطاق
    domain TEXT,
    subdomain TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول سجل الأنشطة الأمنية
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- تفاصيل النشاط
    activity_type TEXT NOT NULL,
    activity_description TEXT,
    
    -- معلومات الطلب
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    
    -- حالة النشاط
    status TEXT CHECK (status IN ('success', 'failed', 'blocked')) DEFAULT 'success',
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    
    -- بيانات إضافية
    metadata JSONB,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    
    -- معلومات النطاق
    domain TEXT,
    subdomain TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الأجهزة الموثوقة
CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- معرف الجهاز
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser_info JSONB,
    
    -- حالة الثقة
    is_trusted BOOLEAN DEFAULT false,
    trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 100),
    
    -- معلومات الاستخدام
    last_used_at TIMESTAMPTZ DEFAULT now(),
    first_seen_ip INET,
    last_seen_ip INET,
    usage_count INTEGER DEFAULT 1,
    
    -- انتهاء الصلاحية
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول رموز التحقق
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- تفاصيل الرمز
    code TEXT NOT NULL,
    code_type TEXT CHECK (code_type IN ('login', 'password_reset', 'email_verification', '2fa_setup', 'device_trust')) NOT NULL,
    
    -- انتهاء الصلاحية والاستخدام
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    
    -- معلومات الأمان
    ip_address INET,
    attempts_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول النطاقات المدعومة
CREATE TABLE IF NOT EXISTS supported_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- إعدادات النطاق
    ssl_enabled BOOLEAN DEFAULT true,
    wildcard_enabled BOOLEAN DEFAULT true,
    oauth_enabled BOOLEAN DEFAULT true,
    
    -- معلومات المالك
    owner_organization_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول النطاقات الفرعية للعملاء
CREATE TABLE IF NOT EXISTS client_subdomains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain TEXT NOT NULL,
    domain_id UUID NOT NULL REFERENCES supported_domains(id) ON DELETE CASCADE,
    organization_id UUID,
    
    -- حالة النطاق الفرعي
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- إعدادات مخصصة
    custom_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(subdomain, domain_id)
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_security_settings_user_id_unique ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_settings_user_id_unique ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_risk_level ON security_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_client_subdomains_subdomain ON client_subdomains(subdomain);
CREATE INDEX IF NOT EXISTS idx_client_subdomains_organization ON client_subdomains(organization_id);

-- إنشاء سياسات RLS (Row Level Security)
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subdomains ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can view their own security settings" ON user_security_settings;
DROP POLICY IF EXISTS "Users can update their own security settings" ON user_security_settings;
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own security logs" ON security_logs;
DROP POLICY IF EXISTS "Users can view their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can update their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Admins can view all security logs" ON security_logs;

-- إنشاء السياسات الجديدة
CREATE POLICY "Users can view their own security settings" ON user_security_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON user_security_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own privacy settings" ON privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own security logs" ON security_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trusted devices" ON trusted_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted devices" ON trusted_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own verification codes" ON verification_codes
    FOR SELECT USING (auth.uid() = user_id);

-- سياسات للمديرين
CREATE POLICY "Admins can view all security logs" ON security_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- إدراج النطاقات المدعومة الافتراضية
INSERT INTO supported_domains (domain, is_primary, is_active) VALUES
    ('stockiha.com', true, true),
    ('ktobi.online', false, true),
    ('bazaar.com', false, true),
    ('bazaar.dev', false, true)
ON CONFLICT (domain) DO NOTHING;

-- دالة لتسجيل الأنشطة الأمنية
CREATE OR REPLACE FUNCTION log_security_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_description TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'success',
    p_risk_level TEXT DEFAULT 'low',
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    client_ip INET;
    client_user_agent TEXT;
    client_domain TEXT;
    client_subdomain TEXT;
BEGIN
    -- الحصول على معلومات الطلب
    client_ip := inet_client_addr();
    client_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    
    -- استخراج النطاق والنطاق الفرعي من الرأس
    SELECT 
        CASE 
            WHEN current_setting('request.headers', true)::json->>'host' ~ '^([^.]+)\.(.+)$' 
            THEN regexp_replace(current_setting('request.headers', true)::json->>'host', '^([^.]+)\.(.+)$', '\2')
            ELSE current_setting('request.headers', true)::json->>'host'
        END,
        CASE 
            WHEN current_setting('request.headers', true)::json->>'host' ~ '^([^.]+)\.(.+)$' 
            THEN regexp_replace(current_setting('request.headers', true)::json->>'host', '^([^.]+)\.(.+)$', '\1')
            ELSE NULL
        END
    INTO client_domain, client_subdomain;
    
    -- إدراج السجل
    INSERT INTO security_logs (
        user_id,
        activity_type,
        activity_description,
        ip_address,
        user_agent,
        status,
        risk_level,
        metadata,
        domain,
        subdomain
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_activity_description,
        client_ip,
        client_user_agent,
        p_status,
        p_risk_level,
        p_metadata,
        client_domain,
        client_subdomain
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء إعدادات افتراضية للمستخدم الجديد
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إعدادات الأمان الافتراضية
    INSERT INTO user_security_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- إنشاء إعدادات الخصوصية الافتراضية
    INSERT INTO privacy_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- تسجيل نشاط إنشاء الحساب
    PERFORM log_security_activity(
        NEW.id,
        'account_created',
        'تم إنشاء حساب جديد',
        'success',
        'low'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لإنشاء الإعدادات الافتراضية
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();

-- دالة لتنظيف الجلسات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = false 
    WHERE is_active = true 
    AND (
        expires_at < now() 
        OR last_activity_at < (now() - INTERVAL '24 hours')
    );
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتنظيف رموز التحقق المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM verification_codes 
    WHERE expires_at < now() OR is_used = true;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من قوة كلمة المرور
CREATE OR REPLACE FUNCTION check_password_strength(password TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    score INTEGER := 0;
    feedback TEXT[] := '{}';
BEGIN
    -- التحقق من الطول
    IF length(password) >= 8 THEN
        score := score + 1;
    ELSE
        feedback := array_append(feedback, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    END IF;
    
    -- التحقق من الأحرف الكبيرة
    IF password ~ '[A-Z]' THEN
        score := score + 1;
    ELSE
        feedback := array_append(feedback, 'يجب أن تحتوي على حرف كبير واحد على الأقل');
    END IF;
    
    -- التحقق من الأحرف الصغيرة
    IF password ~ '[a-z]' THEN
        score := score + 1;
    ELSE
        feedback := array_append(feedback, 'يجب أن تحتوي على حرف صغير واحد على الأقل');
    END IF;
    
    -- التحقق من الأرقام
    IF password ~ '[0-9]' THEN
        score := score + 1;
    ELSE
        feedback := array_append(feedback, 'يجب أن تحتوي على رقم واحد على الأقل');
    END IF;
    
    -- التحقق من الرموز الخاصة
    IF password ~ '[^A-Za-z0-9]' THEN
        score := score + 1;
    ELSE
        feedback := array_append(feedback, 'يجب أن تحتوي على رمز خاص واحد على الأقل');
    END IF;
    
    -- تحديد مستوى القوة
    result := jsonb_build_object(
        'score', score,
        'max_score', 5,
        'strength', CASE 
            WHEN score >= 5 THEN 'قوية جداً'
            WHEN score >= 4 THEN 'قوية'
            WHEN score >= 3 THEN 'متوسطة'
            WHEN score >= 2 THEN 'ضعيفة'
            ELSE 'ضعيفة جداً'
        END,
        'is_valid', score >= 4,
        'feedback', to_jsonb(feedback)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من النطاق الفرعي
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain TEXT, domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- التحقق من صحة النطاق الفرعي
    IF subdomain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
        RETURN false;
    END IF;
    
    -- التحقق من أن النطاق مدعوم
    IF NOT EXISTS (
        SELECT 1 FROM supported_domains 
        WHERE supported_domains.domain = validate_subdomain.domain 
        AND is_active = true
    ) THEN
        RETURN false;
    END IF;
    
    -- التحقق من عدم وجود النطاق الفرعي مسبقاً
    IF EXISTS (
        SELECT 1 FROM client_subdomains cs
        JOIN supported_domains sd ON cs.domain_id = sd.id
        WHERE cs.subdomain = validate_subdomain.subdomain 
        AND sd.domain = validate_subdomain.domain
        AND cs.is_active = true
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث timestamps تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers للتحديث التلقائي
DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON user_security_settings;
DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON privacy_settings;
DROP TRIGGER IF EXISTS update_supported_domains_updated_at ON supported_domains;
DROP TRIGGER IF EXISTS update_client_subdomains_updated_at ON client_subdomains;

CREATE TRIGGER update_user_security_settings_updated_at
    BEFORE UPDATE ON user_security_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supported_domains_updated_at
    BEFORE UPDATE ON supported_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_subdomains_updated_at
    BEFORE UPDATE ON client_subdomains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 