-- إصلاح شامل لصلاحيات جداول الاشتراكات
-- حل مشكلة 403 Forbidden في Supabase

-- ===== جدول subscription_plans =====

-- تفعيل Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Allow public read access to subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Allow authenticated users to insert subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Allow super admin to update subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Allow super admin to delete subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Allow all operations for authenticated users (dev)" ON subscription_plans;

-- سياسة القراءة العامة - السماح للجميع بقراءة خطط الاشتراك
CREATE POLICY "public_read_subscription_plans"
ON subscription_plans
FOR SELECT
USING (true);

-- سياسة الكتابة للمصادق عليهم - للتطوير والإدارة
CREATE POLICY "authenticated_all_subscription_plans"
ON subscription_plans
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ===== جدول organization_subscriptions =====

-- تفعيل Row Level Security إذا لم يكن مفعلاً
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "org_subscription_select" ON organization_subscriptions;
DROP POLICY IF EXISTS "org_subscription_insert" ON organization_subscriptions;
DROP POLICY IF EXISTS "org_subscription_update" ON organization_subscriptions;
DROP POLICY IF EXISTS "org_subscription_delete" ON organization_subscriptions;

-- سياسة قراءة اشتراكات المؤسسة
CREATE POLICY "org_subscription_select"
ON organization_subscriptions
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

-- سياسة إنشاء الاشتراكات
CREATE POLICY "org_subscription_insert"
ON organization_subscriptions
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND (
    -- المستخدم أدمن في المؤسسة
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- أو سوبر أدمن
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- سياسة تحديث الاشتراكات
CREATE POLICY "org_subscription_update"
ON organization_subscriptions
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
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
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- ===== جدول activation_codes =====

-- تفعيل Row Level Security إذا كان الجدول موجود
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activation_codes') THEN
    EXECUTE 'ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY';
    
    -- حذف السياسات الموجودة
    EXECUTE 'DROP POLICY IF EXISTS "activation_codes_select" ON activation_codes';
    EXECUTE 'DROP POLICY IF EXISTS "activation_codes_insert" ON activation_codes';
    EXECUTE 'DROP POLICY IF EXISTS "activation_codes_update" ON activation_codes';
    
    -- سياسة قراءة رموز التفعيل - للسوبر أدمن فقط
    EXECUTE 'CREATE POLICY "activation_codes_select"
    ON activation_codes
    FOR SELECT
    USING (
      auth.role() = ''authenticated'' AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = ''super_admin''
      )
    )';
    
    -- سياسة إنشاء رموز التفعيل - للسوبر أدمن فقط
    EXECUTE 'CREATE POLICY "activation_codes_insert"
    ON activation_codes
    FOR INSERT
    WITH CHECK (
      auth.role() = ''authenticated'' AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = ''super_admin''
      )
    )';
    
    -- سياسة تحديث رموز التفعيل - للمصادق عليهم (للاستخدام)
    EXECUTE 'CREATE POLICY "activation_codes_update"
    ON activation_codes
    FOR UPDATE
    USING (auth.role() = ''authenticated'')
    WITH CHECK (auth.role() = ''authenticated'')';
  END IF;
END
$$;

-- ===== سياسات مؤقتة للتطوير =====

-- إضافة سياسات مؤقتة أكثر مرونة للتطوير
-- يمكن إزالتها في الإنتاج

-- سياسة مؤقتة للوصول الكامل لجدول subscription_plans
CREATE POLICY "dev_full_access_subscription_plans"
ON subscription_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- ===== التحقق من النتائج =====

-- عرض جميع السياسات المطبقة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('subscription_plans', 'organization_subscriptions', 'activation_codes')
ORDER BY tablename, policyname;

-- التحقق من حالة RLS للجداول
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('subscription_plans', 'organization_subscriptions', 'activation_codes')
AND schemaname = 'public';

-- رسالة نجاح
SELECT 'تم إصلاح صلاحيات جداول الاشتراكات بنجاح!' as message; 