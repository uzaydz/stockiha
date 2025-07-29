-- إضافة سياسة الحذف المفقودة لجدول الإشعارات

-- ✅ السماح للمستخدمين بحذف إشعارات منظمتهم
CREATE POLICY "Allow users to delete their organization notifications" 
ON notifications FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
); 