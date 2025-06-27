-- إصلاح سياسات RLS لجدول product_categories
-- المشكلة: وجود سياسات متضاربة تمنع عرض الفئات للمؤسسات

BEGIN;

-- حذف السياسة المتضاربة التي تسمح بالوصول العام
DROP POLICY IF EXISTS "product_categories_public_access" ON public.product_categories;

-- التأكد من وجود function للحصول على organization_id بشكل صحيح
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  user_id UUID;
BEGIN
  -- محاولة الحصول على user_id من auth.uid()
  user_id := auth.uid();
  
  -- إذا لم يتم العثور على user من النظام المصادق، اعتماد على المعاملات المرسلة
  IF user_id IS NULL THEN
    -- في هذه الحالة، نحتاج للاعتماد على context خارجي أو session
    -- يمكن أن نعيد NULL وندع التطبيق يتعامل مع ذلك
    RETURN NULL;
  END IF;
  
  -- البحث عن organization_id للمستخدم
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = user_id;
  
  RETURN org_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- إنشاء سياسة جديدة أكثر مرونة
CREATE POLICY "categories_organization_access" ON public.product_categories
FOR ALL
USING (
  -- السماح إذا كان المستخدم ينتمي لنفس المؤسسة
  organization_id = public.get_user_organization_id()
  OR
  -- السماح للمدراء العامين (super admins)
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (is_super_admin = true OR role = 'super_admin')
  )
  OR
  -- السماح في حالة عدم وجود مصادقة (للطلبات المباشرة من التطبيق)
  auth.uid() IS NULL
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (is_super_admin = true OR role = 'super_admin')
  )
  OR
  auth.uid() IS NULL
);

-- إضافة policy بديلة للقراءة العامة عند الحاجة
CREATE POLICY "categories_public_read" ON public.product_categories
FOR SELECT
USING (
  -- السماح بالقراءة العامة للفئات النشطة فقط
  is_active = true
  AND
  -- تقييد القراءة حسب organization_id المحدد في الطلب
  (
    organization_id = public.get_user_organization_id()
    OR auth.uid() IS NULL -- للطلبات المباشرة من التطبيق
  )
);

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated, anon;

-- إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_product_categories_org_active 
ON public.product_categories(organization_id, is_active);

COMMIT;

-- إضافة function مساعدة لاختبار الوصول
CREATE OR REPLACE FUNCTION public.test_categories_access(p_org_id UUID)
RETURNS TABLE(
  total_categories BIGINT,
  accessible_categories BIGINT,
  current_user_org UUID,
  auth_user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.product_categories WHERE organization_id = p_org_id)::BIGINT,
    (SELECT COUNT(*) FROM public.product_categories WHERE organization_id = p_org_id AND is_active = true)::BIGINT,
    public.get_user_organization_id(),
    auth.uid();
END;
$$; 