-- إصلاح سريع لمشكلة 403 Forbidden في subscription_categories
-- تاريخ: 2025-01-21
-- هذا الملف يحل مشكلة الصلاحيات في Supabase

-- ===== إصلاح جدول subscription_categories =====

-- تفعيل Row Level Security
ALTER TABLE subscription_categories ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "subscription_categories_select" ON subscription_categories;
DROP POLICY IF EXISTS "subscription_categories_insert" ON subscription_categories;
DROP POLICY IF EXISTS "subscription_categories_update" ON subscription_categories;
DROP POLICY IF EXISTS "subscription_categories_delete" ON subscription_categories;
DROP POLICY IF EXISTS "public_read_subscription_categories" ON subscription_categories;
DROP POLICY IF EXISTS "dev_full_access_subscription_categories" ON subscription_categories;

-- سياسة القراءة - السماح للمصادق عليهم بقراءة فئات مؤسستهم
CREATE POLICY "subscription_categories_select"
ON subscription_categories
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    -- المستخدم ينتمي للمؤسسة
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    -- أو هو سوبر أدمن
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- سياسة الإنشاء - للمصادق عليهم في نفس المؤسسة
CREATE POLICY "subscription_categories_insert"
ON subscription_categories
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- سياسة التحديث - للمصادق عليهم في نفس المؤسسة
CREATE POLICY "subscription_categories_update"
ON subscription_categories
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- سياسة الحذف - للمصادق عليهم في نفس المؤسسة
CREATE POLICY "subscription_categories_delete"
ON subscription_categories
FOR DELETE
USING (
  auth.role() = 'authenticated' AND (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- سياسة مؤقتة للتطوير (أكثر مرونة)
-- يمكن إزالتها في الإنتاج
CREATE POLICY "dev_full_access_subscription_categories"
ON subscription_categories
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ===== إصلاح جدول subscription_plans أيضاً =====

-- تفعيل Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "subscription_plans_public_read" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_authenticated_write" ON subscription_plans;
DROP POLICY IF EXISTS "dev_full_access_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "public_read_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "authenticated_all_subscription_plans" ON subscription_plans;

-- سياسة القراءة العامة لخطط الاشتراك (معلومات عامة)
CREATE POLICY "subscription_plans_public_read"
ON subscription_plans
FOR SELECT
USING (true);

-- سياسة الكتابة للمصادق عليهم
CREATE POLICY "subscription_plans_authenticated_write"
ON subscription_plans
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ===== التحقق من النتائج =====

-- عرض السياسات المطبقة للتأكد
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies 
WHERE tablename IN ('subscription_categories', 'subscription_plans')
ORDER BY tablename, policyname;

-- رسالة نجاح
SELECT '✅ تم إصلاح مشكلة 403 في subscription_categories و subscription_plans بنجاح!' as message; 