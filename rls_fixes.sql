-- rls_fixes.sql

-- الخطوة 1: إسقاط السياسة المسببة للتكرار على جدول users
DROP POLICY IF EXISTS "Allow org admin to read users in their org" ON public.users;

-- الخطوة 2: إنشاء دالة مساعدة آمنة للحصول على معلومات المستخدم الحالي
-- هذه الدالة ستُستخدم في السياسة لتجنب التكرار
CREATE OR REPLACE FUNCTION public.get_current_user_org_info()
RETURNS TABLE(org_id UUID, is_admin BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER -- تم التغيير من INVOKER
-- تعيين معلمات البحث الآمنة لـ SECURITY DEFINER
SET search_path = public
AS $$
  -- الاستعلام لا يزال يعتمد على auth.uid() للحصول على المستخدم الصحيح
  -- لكن يتم تنفيذه الآن بصلاحيات المالك
  SELECT organization_id, is_org_admin
  FROM public.users
  WHERE id = auth.uid();
$$;

-- الخطوة 3: إعادة إنشاء سياسة قراءة المستخدمين للمسؤول باستخدام الدالة المساعدة
CREATE POLICY "Allow org admin to read users in their org"
ON public.users FOR SELECT
USING (
    -- تحقق مما إذا كان المستخدم الحالي مسؤولاً (باستخدام الدالة)
    EXISTS (SELECT 1 FROM public.get_current_user_org_info() WHERE is_admin = true)
    -- وتحقق مما إذا كانت مؤسسة الصف تطابق مؤسسة المستخدم الحالي (باستخدام الدالة)
    AND organization_id = (SELECT org_id FROM public.get_current_user_org_info() LIMIT 1)
);

-- ملاحظة: تأكد من أن لديك سياسة RLS أساسية على جدول users تسمح للمستخدم بقراءة بياناته الخاصة
-- مثل "Allow user to read own data" التي أنشأناها سابقًا، وإلا فلن تعمل الدالة get_current_user_org_info للمستخدم العادي. 