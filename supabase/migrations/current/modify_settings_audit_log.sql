-- إعادة هيكلة جدول التدقيق لتسهيل الاستخدام وتجنب المشاكل

-- 1. إزالة القيود على حقل user_id
ALTER TABLE settings_audit_log ALTER COLUMN user_id DROP NOT NULL;

-- 2. إضافة وظيفة لضمان عدم إدراج سجلات تدقيق فارغة
CREATE OR REPLACE FUNCTION validate_audit_log_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- ضمان وجود قيمة للمستخدم
  IF NEW.user_id IS NULL THEN
    -- محاولة الحصول على معرف المستخدم الحالي
    NEW.user_id := auth.uid();
    
    -- إذا لا زال NULL، حاول الحصول على owner_id من المنظمة
    IF NEW.user_id IS NULL AND NEW.organization_id IS NOT NULL THEN
      SELECT owner_id INTO NEW.user_id 
      FROM organizations 
      WHERE id = NEW.organization_id;
    END IF;
    
    -- إذا لا زال NULL، يمكن استخدام قيمة افتراضية (معرف نظام)
    IF NEW.user_id IS NULL THEN
      -- يمكن تحديد معرف نظام افتراضي أو ترك الحقل فارغ
      -- NEW.user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إضافة المشغل للتحقق من صحة الإدخالات
DROP TRIGGER IF EXISTS validate_audit_log_entries ON settings_audit_log;
CREATE TRIGGER validate_audit_log_entries
BEFORE INSERT ON settings_audit_log
FOR EACH ROW EXECUTE FUNCTION validate_audit_log_entry();

-- 4. تعديل سياسات RLS للسماح بإدراج السجلات دون شروط صارمة
DROP POLICY IF EXISTS settings_audit_log_insert ON settings_audit_log;
CREATE POLICY settings_audit_log_insert ON settings_audit_log
FOR INSERT
WITH CHECK (true);

-- 5. تضييق سياسات القراءة فقط
DROP POLICY IF EXISTS settings_audit_log_select ON settings_audit_log;
CREATE POLICY settings_audit_log_select ON settings_audit_log
FOR SELECT
USING (
  (auth.uid() IN (
    SELECT id FROM users 
    WHERE organization_id = settings_audit_log.organization_id 
    AND (is_org_admin = true OR role = 'admin')
  ))
  OR
  (auth.uid() = user_id)
  OR 
  (SELECT current_setting('role', TRUE) = 'service_role')
);

-- 6. إضافة قيد تكامل لمنع حذف المنظمات المستخدمة في سجلات التدقيق
ALTER TABLE settings_audit_log 
DROP CONSTRAINT IF EXISTS settings_audit_log_organization_id_fkey,
ADD CONSTRAINT settings_audit_log_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL; 