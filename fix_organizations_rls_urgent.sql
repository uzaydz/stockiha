-- إصلاح عاجل لصلاحيات جدول organizations
-- حل مشكلة 406 Not Acceptable في Supabase

-- التحقق من وجود الجدول
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
    
    -- تفعيل Row Level Security
    EXECUTE 'ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY';
    
    -- حذف جميع السياسات الموجودة لضمان عدم التضارب
    EXECUTE 'DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for users based on email" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_organizations" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_all_organizations" ON public.organizations';
    
    -- سياسة القراءة العامة - السماح للجميع بقراءة بيانات المؤسسات
    -- هذا ضروري للعثور على المؤسسات بالنطاق أو الصبدومين
    EXECUTE 'CREATE POLICY "public_read_organizations_policy"
    ON public.organizations
    FOR SELECT
    USING (true)';
    
    -- سياسة الكتابة للمصادق عليهم - للإنشاء والتحديث
    EXECUTE 'CREATE POLICY "authenticated_write_organizations_policy"
    ON public.organizations
    FOR ALL
    USING (auth.role() = ''authenticated'')
    WITH CHECK (auth.role() = ''authenticated'')';
    
    RAISE NOTICE 'تم إصلاح صلاحيات جدول organizations بنجاح';
  ELSE
    RAISE NOTICE 'جدول organizations غير موجود';
  END IF;
END
$$;

-- إصلاح صلاحيات جدول organization_subscriptions أيضاً
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_subscriptions' AND table_schema = 'public') THEN
    
    -- تفعيل Row Level Security
    EXECUTE 'ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY';
    
    -- حذف السياسات الموجودة
    EXECUTE 'DROP POLICY IF EXISTS "org_subscription_select" ON public.organization_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "org_subscription_insert" ON public.organization_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "org_subscription_update" ON public.organization_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "org_subscription_delete" ON public.organization_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "public_read_org_subscriptions" ON public.organization_subscriptions';
    
    -- سياسة القراءة العامة للاشتراكات (مؤقتة للتطوير)
    EXECUTE 'CREATE POLICY "public_read_org_subscriptions_policy"
    ON public.organization_subscriptions
    FOR SELECT
    USING (true)';
    
    -- سياسة الكتابة للمصادق عليهم
    EXECUTE 'CREATE POLICY "authenticated_write_org_subscriptions_policy"
    ON public.organization_subscriptions
    FOR ALL
    USING (auth.role() = ''authenticated'')
    WITH CHECK (auth.role() = ''authenticated'')';
    
    RAISE NOTICE 'تم إصلاح صلاحيات جدول organization_subscriptions بنجاح';
  ELSE
    RAISE NOTICE 'جدول organization_subscriptions غير موجود';
  END IF;
END
$$;

-- التحقق من النتائج
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_subscriptions')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- التحقق من حالة RLS للجداول
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('organizations', 'organization_subscriptions')
AND schemaname = 'public';

-- رسالة تأكيد
SELECT 'تم إصلاح مشاكل RLS لجداول المؤسسات والاشتراكات - يجب أن تختفي أخطاء 406 الآن!' as result; 