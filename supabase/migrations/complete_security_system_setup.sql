-- إكمال إعداد نظام الأمان والخصوصية
-- Complete Security and Privacy System Setup

-- إنشاء دالة تسجيل الأنشطة الأمنية
CREATE OR REPLACE FUNCTION log_security_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT,
    p_status TEXT DEFAULT 'success',
    p_risk_level TEXT DEFAULT 'low',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO security_logs (
        user_id,
        activity_type,
        description,
        status,
        risk_level,
        ip_address,
        user_agent,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_description,
        p_status,
        p_risk_level,
        p_ip_address,
        p_user_agent,
        p_metadata,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة إنشاء الإعدادات الافتراضية للمستخدمين الجدد
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إعدادات الأمان الافتراضية
    INSERT INTO user_security_settings (user_id) 
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- إنشاء إعدادات الخصوصية الافتراضية
    INSERT INTO privacy_settings (user_id) 
    VALUES (NEW.id)
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
DROP TRIGGER IF EXISTS create_user_settings_trigger ON users;
CREATE TRIGGER create_user_settings_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- دالة للحصول على إعدادات الأمان للمستخدم
CREATE OR REPLACE FUNCTION get_user_security_settings(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    two_factor_enabled BOOLEAN,
    two_factor_method TEXT,
    max_active_sessions INTEGER,
    session_timeout_minutes INTEGER,
    require_reauth_for_sensitive BOOLEAN,
    password_expiry_days INTEGER,
    require_strong_password BOOLEAN,
    prevent_password_reuse INTEGER,
    login_notification_enabled BOOLEAN,
    suspicious_activity_alerts BOOLEAN,
    device_tracking_enabled BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uss.id,
        uss.user_id,
        COALESCE(u.two_factor_enabled, false) as two_factor_enabled,
        uss.two_factor_method,
        uss.max_active_sessions,
        uss.session_timeout_minutes,
        uss.require_reauth_for_sensitive,
        uss.password_expiry_days,
        uss.require_strong_password,
        uss.prevent_password_reuse,
        uss.login_notification_enabled,
        uss.suspicious_activity_alerts,
        uss.device_tracking_enabled,
        uss.created_at,
        uss.updated_at
    FROM user_security_settings uss
    LEFT JOIN users u ON u.id = uss.user_id
    WHERE uss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث إعدادات الأمان
CREATE OR REPLACE FUNCTION update_user_security_settings(
    p_user_id UUID,
    p_settings JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    settings_updated BOOLEAN := false;
BEGIN
    -- تحديث إعدادات الأمان
    UPDATE user_security_settings 
    SET 
        two_factor_method = COALESCE((p_settings->>'two_factor_method')::TEXT, two_factor_method),
        max_active_sessions = COALESCE((p_settings->>'max_active_sessions')::INTEGER, max_active_sessions),
        session_timeout_minutes = COALESCE((p_settings->>'session_timeout_minutes')::INTEGER, session_timeout_minutes),
        require_reauth_for_sensitive = COALESCE((p_settings->>'require_reauth_for_sensitive')::BOOLEAN, require_reauth_for_sensitive),
        password_expiry_days = COALESCE((p_settings->>'password_expiry_days')::INTEGER, password_expiry_days),
        require_strong_password = COALESCE((p_settings->>'require_strong_password')::BOOLEAN, require_strong_password),
        prevent_password_reuse = COALESCE((p_settings->>'prevent_password_reuse')::INTEGER, prevent_password_reuse),
        login_notification_enabled = COALESCE((p_settings->>'login_notification_enabled')::BOOLEAN, login_notification_enabled),
        suspicious_activity_alerts = COALESCE((p_settings->>'suspicious_activity_alerts')::BOOLEAN, suspicious_activity_alerts),
        device_tracking_enabled = COALESCE((p_settings->>'device_tracking_enabled')::BOOLEAN, device_tracking_enabled),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- تحديث المصادقة الثنائية في جدول المستخدمين إذا تم تمريرها
    IF p_settings ? 'two_factor_enabled' THEN
        UPDATE users 
        SET two_factor_enabled = (p_settings->>'two_factor_enabled')::BOOLEAN
        WHERE id = p_user_id;
    END IF;
    
    GET DIAGNOSTICS settings_updated = ROW_COUNT;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        'security_settings_updated',
        'تم تحديث إعدادات الأمان',
        'success',
        'medium'
    );
    
    RETURN settings_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على إعدادات الخصوصية
CREATE OR REPLACE FUNCTION get_user_privacy_settings(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    profile_visibility TEXT,
    show_email BOOLEAN,
    show_phone BOOLEAN,
    show_last_activity BOOLEAN,
    allow_search_by_email BOOLEAN,
    allow_search_by_phone BOOLEAN,
    data_processing_consent BOOLEAN,
    marketing_emails_consent BOOLEAN,
    analytics_consent BOOLEAN,
    third_party_sharing_consent BOOLEAN,
    data_retention_period INTEGER,
    auto_delete_inactive_data BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.user_id,
        ps.profile_visibility,
        ps.show_email,
        ps.show_phone,
        ps.show_last_activity,
        ps.allow_search_by_email,
        ps.allow_search_by_phone,
        ps.data_processing_consent,
        ps.marketing_emails_consent,
        ps.analytics_consent,
        ps.third_party_sharing_consent,
        ps.data_retention_period,
        ps.auto_delete_inactive_data,
        ps.created_at,
        ps.updated_at
    FROM privacy_settings ps
    WHERE ps.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث إعدادات الخصوصية
CREATE OR REPLACE FUNCTION update_user_privacy_settings(
    p_user_id UUID,
    p_settings JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    settings_updated BOOLEAN := false;
BEGIN
    UPDATE privacy_settings 
    SET 
        profile_visibility = COALESCE((p_settings->>'profile_visibility')::TEXT, profile_visibility),
        show_email = COALESCE((p_settings->>'show_email')::BOOLEAN, show_email),
        show_phone = COALESCE((p_settings->>'show_phone')::BOOLEAN, show_phone),
        show_last_activity = COALESCE((p_settings->>'show_last_activity')::BOOLEAN, show_last_activity),
        allow_search_by_email = COALESCE((p_settings->>'allow_search_by_email')::BOOLEAN, allow_search_by_email),
        allow_search_by_phone = COALESCE((p_settings->>'allow_search_by_phone')::BOOLEAN, allow_search_by_phone),
        data_processing_consent = COALESCE((p_settings->>'data_processing_consent')::BOOLEAN, data_processing_consent),
        marketing_emails_consent = COALESCE((p_settings->>'marketing_emails_consent')::BOOLEAN, marketing_emails_consent),
        analytics_consent = COALESCE((p_settings->>'analytics_consent')::BOOLEAN, analytics_consent),
        third_party_sharing_consent = COALESCE((p_settings->>'third_party_sharing_consent')::BOOLEAN, third_party_sharing_consent),
        data_retention_period = COALESCE((p_settings->>'data_retention_period')::INTEGER, data_retention_period),
        auto_delete_inactive_data = COALESCE((p_settings->>'auto_delete_inactive_data')::BOOLEAN, auto_delete_inactive_data),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS settings_updated = ROW_COUNT;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        'privacy_settings_updated',
        'تم تحديث إعدادات الخصوصية',
        'success',
        'low'
    );
    
    RETURN settings_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء جلسة جديدة
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    session_id UUID;
    max_sessions INTEGER;
BEGIN
    -- الحصول على الحد الأقصى للجلسات النشطة
    SELECT max_active_sessions INTO max_sessions
    FROM user_security_settings
    WHERE user_id = p_user_id;
    
    -- إذا لم توجد إعدادات، استخدم القيمة الافتراضية
    max_sessions := COALESCE(max_sessions, 5);
    
    -- حذف الجلسات الزائدة
    WITH old_sessions AS (
        SELECT id
        FROM user_sessions
        WHERE user_id = p_user_id AND is_active = true
        ORDER BY last_activity_at DESC
        OFFSET max_sessions - 1
    )
    UPDATE user_sessions
    SET is_active = false, ended_at = NOW()
    WHERE id IN (SELECT id FROM old_sessions);
    
    -- إنشاء الجلسة الجديدة
    INSERT INTO user_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        device_info,
        is_active,
        created_at,
        last_activity_at
    ) VALUES (
        p_user_id,
        p_session_token,
        p_ip_address,
        p_user_agent,
        p_device_info,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO session_id;
    
    -- تسجيل النشاط
    PERFORM log_security_activity(
        p_user_id,
        'session_created',
        'تم إنشاء جلسة جديدة',
        'success',
        'low',
        p_ip_address,
        p_user_agent
    );
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنهاء جلسة
CREATE OR REPLACE FUNCTION end_user_session(
    p_session_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    session_ended BOOLEAN := false;
    session_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم إذا لم يتم تمريره
    IF p_user_id IS NULL THEN
        SELECT user_id INTO session_user_id
        FROM user_sessions
        WHERE id = p_session_id;
    ELSE
        session_user_id := p_user_id;
    END IF;
    
    -- إنهاء الجلسة
    UPDATE user_sessions
    SET is_active = false, ended_at = NOW()
    WHERE id = p_session_id
    AND (p_user_id IS NULL OR user_id = p_user_id);
    
    GET DIAGNOSTICS session_ended = ROW_COUNT;
    
    -- تسجيل النشاط
    IF session_ended AND session_user_id IS NOT NULL THEN
        PERFORM log_security_activity(
            session_user_id,
            'session_ended',
            'تم إنهاء الجلسة',
            'success',
            'low'
        );
    END IF;
    
    RETURN session_ended > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على الجلسات النشطة للمستخدم
CREATE OR REPLACE FUNCTION get_user_active_sessions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    session_token TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.session_token,
        us.ip_address,
        us.user_agent,
        us.device_info,
        us.created_at,
        us.last_activity_at,
        us.session_token = current_setting('request.jwt.claims', true)::jsonb->>'session_token' as is_current
    FROM user_sessions us
    WHERE us.user_id = p_user_id 
    AND us.is_active = true
    ORDER BY us.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الإعدادات الافتراضية للمستخدمين الموجودين
INSERT INTO user_security_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO privacy_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- تحديث الطوابع الزمنية
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON user_security_settings;
CREATE TRIGGER update_user_security_settings_updated_at
    BEFORE UPDATE ON user_security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON privacy_settings;
CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION log_security_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_security_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_security_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_privacy_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_privacy_settings TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION end_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_sessions TO authenticated; 