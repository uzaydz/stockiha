-- إصلاح شامل لمشاكل Row Level Security في جداول أكواد التفعيل
-- التاريخ: 2024-12-19
-- المشكلة: الجداول تحتوي على سياسات RLS ولكن RLS غير مُفعل

-- ===== تحليل الحالة الحالية =====
-- 1. الجدول: public.activation_code_batches
--    - RLS مُفعل: لا
--    - عدد السياسات: 1
--    - السياسة: "Allow authenticated users to view activation code batches"

-- 2. الجدول: public.activation_codes  
--    - RLS مُفعل: لا
--    - عدد السياسات: 3
--    - السياسات: "Allow authenticated users to view activation codes", "activation_codes_insert", "activation_codes_update"

BEGIN;

-- ===== إصلاح جدول activation_code_batches =====

-- تفعيل Row Level Security
ALTER TABLE public.activation_code_batches ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "Allow authenticated users to view activation code batches" ON public.activation_code_batches;

-- إنشاء سياسات جديدة محسنة لـ activation_code_batches
CREATE POLICY "activation_code_batches_select_policy" 
ON public.activation_code_batches
FOR SELECT 
USING (
    -- السوبر أدمن يرى كل شيء
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
    OR
    -- مسؤولو المؤسسات يمكنهم الرؤية
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_org_admin = true
    )
);

CREATE POLICY "activation_code_batches_insert_policy" 
ON public.activation_code_batches
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

CREATE POLICY "activation_code_batches_update_policy" 
ON public.activation_code_batches
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

CREATE POLICY "activation_code_batches_delete_policy" 
ON public.activation_code_batches
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- ===== إصلاح جدول activation_codes =====

-- تفعيل Row Level Security
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "Allow authenticated users to view activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "activation_codes_insert" ON public.activation_codes;
DROP POLICY IF EXISTS "activation_codes_update" ON public.activation_codes;

-- إنشاء سياسات جديدة محسنة لـ activation_codes
-- 1. سياسة القراءة - للسوبر أدمن ومسؤولي المؤسسات
CREATE POLICY "activation_codes_select_policy" 
ON public.activation_codes
FOR SELECT 
USING (
    -- السوبر أدمن يرى كل شيء
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
    OR
    -- مسؤولو المؤسسات يرون أكواد مؤسستهم فقط
    (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
        AND organization_id = (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    )
    OR
    -- المستخدمون يمكنهم رؤية الأكواد المرتبطة بمؤسستهم (للاستخدام)
    (
        auth.role() = 'authenticated' 
        AND organization_id = (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    )
);

-- 2. سياسة الإدراج - للسوبر أدمن فقط
CREATE POLICY "activation_codes_insert_policy" 
ON public.activation_codes
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- 3. سياسة التحديث - للمستخدمين المصادق عليهم (لاستخدام الأكواد) والسوبر أدمن
CREATE POLICY "activation_codes_update_policy" 
ON public.activation_codes
FOR UPDATE 
USING (
    -- السوبر أدمن يمكنه تحديث أي شيء
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
    OR
    -- المستخدمون المصادق عليهم يمكنهم استخدام الأكواد (تحديث الحالة)
    (
        auth.role() = 'authenticated'
        AND status = 'active'  -- يمكن تحديث الأكواد النشطة فقط
    )
)
WITH CHECK (
    -- السوبر أدمن يمكنه تحديث أي شيء
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
    OR
    -- المستخدمون العاديون يمكنهم فقط وضع علامة الاستخدام على الكود
    (
        auth.role() = 'authenticated'
        AND status IN ('used', 'active')  -- يمكن تغيير الحالة إلى مستخدم أو إبقاؤها نشطة
    )
);

-- 4. سياسة الحذف - للسوبر أدمن فقط
CREATE POLICY "activation_codes_delete_policy" 
ON public.activation_codes
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- ===== التحقق من النتائج =====
DO $$
BEGIN
    RAISE NOTICE '=== تقرير إصلاح Row Level Security ===';
    RAISE NOTICE 'تم تفعيل RLS على جدول activation_code_batches';
    RAISE NOTICE 'تم إنشاء 4 سياسات جديدة لـ activation_code_batches';
    RAISE NOTICE 'تم تفعيل RLS على جدول activation_codes';  
    RAISE NOTICE 'تم إنشاء 4 سياسات جديدة لـ activation_codes';
    RAISE NOTICE 'جميع السياسات تدعم نموذج الأمان متعدد المستويات';
    RAISE NOTICE '=== انتهى التقرير ===';
END $$;

COMMIT;

-- ===== اختبار التحقق من الإصلاح =====
-- يمكن تشغيل هذا الاستعلام للتحقق من حالة RLS والسياسات الجديدة
/*
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    STRING_AGG(p.policyname, ', ') as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.tablename IN ('activation_code_batches', 'activation_codes')
    AND t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;
*/ 