-- حل سريع لمشكلات إنشاء المنظمات: تعطيل جميع المشغلات (triggers) المرتبطة بالتدقيق

-- 1. إيقاف جميع المشغلات على جداول إعدادات المنظمة
ALTER TABLE organization_settings DISABLE TRIGGER ALL;
ALTER TABLE settings_audit_log DISABLE TRIGGER ALL;

-- 2. إيقاف المشغلات المتعلقة بجدول المنظمات
-- منع مشغلات إنشاء السجلات التلقائية في organization_settings
DROP TRIGGER IF EXISTS create_organization_settings ON organizations;
DROP TRIGGER IF EXISTS initialize_organization_settings_trigger ON organizations;
DROP TRIGGER IF EXISTS trigger_organization_store_init ON organizations;

-- 3. تعديل البنية لجعل حقل user_id في جدول settings_audit_log قابلاً للقيمة NULL
ALTER TABLE settings_audit_log ALTER COLUMN user_id DROP NOT NULL;

-- 4. أضف foreign key constraint من organization_settings إلى organizations
-- هذا سيضمن حذف إعدادات المنظمة عند حذف المنظمة
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_settings_organization_id_fkey'
  ) THEN
    ALTER TABLE organization_settings 
    ADD CONSTRAINT organization_settings_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END
$$; 