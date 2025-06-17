-- جدول إدارة التطبيقات للمنظمات
-- يحدد أي التطبيقات مفعّلة لكل منظمة

CREATE TABLE IF NOT EXISTS organization_apps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    app_id VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    configuration JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS organization_apps_organization_id_idx 
ON organization_apps(organization_id);

CREATE INDEX IF NOT EXISTS organization_apps_app_id_idx 
ON organization_apps(app_id);

CREATE INDEX IF NOT EXISTS organization_apps_is_enabled_idx 
ON organization_apps(is_enabled);

-- فهرس مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS organization_apps_org_app_enabled_idx 
ON organization_apps(organization_id, app_id, is_enabled);

-- قيد فريد لضمان عدم تكرار التطبيق لنفس المنظمة
CREATE UNIQUE INDEX IF NOT EXISTS organization_apps_org_app_unique_idx 
ON organization_apps(organization_id, app_id);

-- تفعيل RLS (Row Level Security)
ALTER TABLE organization_apps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with better error handling
DROP POLICY IF EXISTS "organization_apps_select_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_insert_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_update_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_delete_policy" ON organization_apps;

-- Select policy: Allow users to see apps for their organization
CREATE POLICY "organization_apps_select_policy" ON organization_apps
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.is_active = true
  )
);

-- Insert policy: Allow admins and owners to install apps
CREATE POLICY "organization_apps_insert_policy" ON organization_apps
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- Update policy: Allow admins and owners to modify apps (including upsert operations)
CREATE POLICY "organization_apps_update_policy" ON organization_apps
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- Delete policy: Allow admins and owners to uninstall apps
CREATE POLICY "organization_apps_delete_policy" ON organization_apps
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_organization_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS organization_apps_updated_at_trigger ON organization_apps;
CREATE TRIGGER organization_apps_updated_at_trigger
    BEFORE UPDATE ON organization_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_apps_updated_at();

-- تعليق على الجدول والأعمدة
COMMENT ON TABLE organization_apps IS 'جدول إدارة التطبيقات المفعّلة لكل منظمة';
COMMENT ON COLUMN organization_apps.id IS 'معرف فريد للسجل';
COMMENT ON COLUMN organization_apps.organization_id IS 'معرف المنظمة';
COMMENT ON COLUMN organization_apps.app_id IS 'معرف التطبيق (repair-services, subscription-services, etc.)';
COMMENT ON COLUMN organization_apps.is_enabled IS 'حالة تفعيل التطبيق';
COMMENT ON COLUMN organization_apps.installed_at IS 'تاريخ تثبيت/تفعيل التطبيق';
COMMENT ON COLUMN organization_apps.configuration IS 'إعدادات التطبيق (JSON)';
COMMENT ON COLUMN organization_apps.created_at IS 'تاريخ إنشاء السجل';
COMMENT ON COLUMN organization_apps.updated_at IS 'تاريخ آخر تحديث';

-- إدراج البيانات الافتراضية (اختياري)
-- يمكن تفعيل هذا لإعطاء المنظمات الجديدة تطبيقات افتراضية

-- INSERT INTO organization_apps (organization_id, app_id, is_enabled)
-- SELECT 
--     o.id as organization_id,
--     'repair-services' as app_id,
--     true as is_enabled
-- FROM organizations o
-- WHERE NOT EXISTS (
--     SELECT 1 FROM organization_apps oa 
--     WHERE oa.organization_id = o.id 
--     AND oa.app_id = 'repair-services'
-- );

-- INSERT INTO organization_apps (organization_id, app_id, is_enabled)
-- SELECT 
--     o.id as organization_id,
--     'subscription-services' as app_id,
--     true as is_enabled
-- FROM organizations o
-- WHERE NOT EXISTS (
--     SELECT 1 FROM organization_apps oa 
--     WHERE oa.organization_id = o.id 
--     AND oa.app_id = 'subscription-services'
-- ); 