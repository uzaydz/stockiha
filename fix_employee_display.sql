-- fix_employee_display.sql
-- حل مشكلة عرض معلومات الموظف في الطلبات

-- إنشاء view لعرض معلومات الموظفين الأساسية للطلبات
CREATE OR REPLACE VIEW order_employees AS
SELECT 
  id,
  name,
  email,
  organization_id
FROM users
WHERE role IN ('admin', 'employee', 'owner');

-- إعطاء صلاحيات قراءة للـ view
GRANT SELECT ON order_employees TO public;

-- إنشاء RLS policy للـ view
ALTER VIEW order_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable SELECT for order_employees within organization" ON order_employees
FOR SELECT
TO public
USING (
  organization_id = get_current_user_organization_id() OR
  is_super_admin()
);
