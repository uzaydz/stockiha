-- تعديل سياسات أمان الصفوف للجداول

-- إلغاء تفعيل RLS مؤقتًا للجداول الرئيسية لتسهيل عملية التسجيل
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- أو بديلاً يمكننا إنشاء سياسات أكثر أمانًا تسمح بعمليات معينة

-- سياسة للسماح بإدراج سجلات في جدول المؤسسات للمستخدمين المصادق عليهم
CREATE POLICY "allow_insert_organizations" 
ON organizations FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- سياسة للسماح بقراءة سجلات المؤسسات
CREATE POLICY "allow_read_organizations" 
ON organizations FOR SELECT 
USING (true);

-- سياسة للسماح بإدراج سجلات المستخدمين
CREATE POLICY "allow_insert_users" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- سياسة للسماح للمستخدمين بقراءة سجلاتهم الخاصة
CREATE POLICY "allow_users_read_own" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- سياسة للسماح للمستخدمين بتحديث سجلاتهم الخاصة
CREATE POLICY "allow_users_update_own" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- إضافة عمود owner_id إلى جدول المؤسسات إذا كان مطلوباً
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- إنشاء وظيفة مساعدة للتحقق من صلاحيات المالك
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل RLS مجدداً (بعد تطبيق التغييرات اللازمة في الكود)
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; 