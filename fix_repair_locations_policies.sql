-- إصلاح سياسات الأمان لجدول repair_locations

-- حذف السياسات القديمة المعطلة
DROP POLICY IF EXISTS "Admins can insert repair locations" ON repair_locations;
DROP POLICY IF EXISTS "Admins can update repair locations" ON repair_locations;
DROP POLICY IF EXISTS "Admins can delete non-default repair locations" ON repair_locations;

-- إنشاء السياسات المصححة

-- سياسة الإدراج: يمكن للمدراء إضافة أماكن تصليح جديدة
CREATE POLICY "Admins can insert repair locations" ON repair_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = repair_locations.organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  );

-- سياسة التحديث: يمكن للمدراء تحديث أماكن التصليح
CREATE POLICY "Admins can update repair locations" ON repair_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = repair_locations.organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  );

-- سياسة الحذف: يمكن للمدراء حذف أماكن التصليح (ما عدا الافتراضي)
CREATE POLICY "Admins can delete non-default repair locations" ON repair_locations
  FOR DELETE USING (
    is_default = false AND
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = repair_locations.organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  ); 