-- إصلاح مشاكل السياسات والفهارس في جداول الأمان والخصوصية
-- Fix Security Tables Policies and Indexes

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can view their own security settings" ON user_security_settings;
DROP POLICY IF EXISTS "Users can update their own security settings" ON user_security_settings;
DROP POLICY IF EXISTS "Users can insert their own security settings" ON user_security_settings;
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON privacy_settings;
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own security logs" ON security_logs;
DROP POLICY IF EXISTS "Users can view their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can update their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can insert their own trusted devices" ON trusted_devices;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can insert their own verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Admins can view all security logs" ON security_logs;

-- تفعيل RLS على الجداول
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات الجديدة مع جميع العمليات
-- سياسات user_security_settings
CREATE POLICY "Users can view their own security settings" ON user_security_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON user_security_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings" ON user_security_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات privacy_settings
CREATE POLICY "Users can view their own privacy settings" ON privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات security_logs
CREATE POLICY "Users can view their own security logs" ON security_logs
    FOR SELECT USING (auth.uid() = user_id);

-- سياسات trusted_devices
CREATE POLICY "Users can view their own trusted devices" ON trusted_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted devices" ON trusted_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trusted devices" ON trusted_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات verification_codes
CREATE POLICY "Users can view their own verification codes" ON verification_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification codes" ON verification_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات للمديرين
CREATE POLICY "Admins can view all security logs" ON security_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- إضافة فهارس فريدة لمنع التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_security_settings_user_id_unique ON user_security_settings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_settings_user_id_unique ON privacy_settings(user_id);

-- إضافة قيود فريدة على مستوى الجدول (مع معالجة الأخطاء)
DO $$
BEGIN
    BEGIN
        ALTER TABLE user_security_settings ADD CONSTRAINT user_security_settings_user_id_unique UNIQUE (user_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- القيد موجود بالفعل، تجاهل الخطأ
            NULL;
    END;
    
    BEGIN
        ALTER TABLE privacy_settings ADD CONSTRAINT privacy_settings_user_id_unique UNIQUE (user_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- القيد موجود بالفعل، تجاهل الخطأ
            NULL;
    END;
END $$;

-- تحديث دالة إنشاء الإعدادات الافتراضية
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إعدادات الأمان الافتراضية
    INSERT INTO user_security_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- إنشاء إعدادات الخصوصية الافتراضية
    INSERT INTO privacy_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- تسجيل نشاط إنشاء الحساب (فقط إذا لم يكن موجوداً)
    IF NOT EXISTS (
        SELECT 1 FROM security_logs 
        WHERE user_id = NEW.id 
        AND activity_type = 'account_created'
    ) THEN
        PERFORM log_security_activity(
            NEW.id,
            'account_created',
            'تم إنشاء حساب جديد',
            'success',
            'low'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();

-- إنشاء إعدادات افتراضية للمستخدمين الموجودين الذين لا يملكون إعدادات
INSERT INTO user_security_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO privacy_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM privacy_settings)
ON CONFLICT (user_id) DO NOTHING; 