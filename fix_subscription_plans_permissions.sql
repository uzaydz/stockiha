-- إصلاح صلاحيات جدول subscription_plans
-- حل مشكلة خطأ 403 Forbidden

-- 1. تفعيل Row Level Security للجدول
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 2. إنشاء سياسة للسماح للجميع بقراءة خطط الاشتراك (لأنها بيانات عامة)
CREATE POLICY "Allow public read access to subscription plans"
ON subscription_plans
FOR SELECT
USING (true);

-- 3. السماح للمستخدمين المصادق عليهم بإنشاء خطط اشتراك جديدة (للسوبر أدمن فقط)
CREATE POLICY "Allow authenticated users to insert subscription plans"
ON subscription_plans
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 4. السماح للسوبر أدمن بتحديث خطط الاشتراك
CREATE POLICY "Allow super admin to update subscription plans"
ON subscription_plans
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 5. السماح للسوبر أدمن بحذف خطط الاشتراك
CREATE POLICY "Allow super admin to delete subscription plans"
ON subscription_plans
FOR DELETE
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 6. إضافة سياسة بديلة للقراءة في حالة عدم وجود جدول users
-- أو إذا كانت البيانات تحتاج للوصول العام بدون مصادقة
DROP POLICY IF EXISTS "Allow public read access to subscription plans" ON subscription_plans;
CREATE POLICY "Allow public read access to subscription plans"
ON subscription_plans
FOR SELECT
USING (true); -- السماح للجميع بقراءة خطط الاشتراك

-- 7. سياسة مؤقتة للسماح بجميع العمليات للمستخدمين المصادق عليهم (للتطوير)
-- يمكن إزالتها لاحقاً عند الإنتاج
CREATE POLICY "Allow all operations for authenticated users (dev)"
ON subscription_plans
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 8. التحقق من نجاح تطبيق السياسات
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'subscription_plans'; 