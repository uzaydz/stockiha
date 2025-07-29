-- إصلاح مشكلة Row Level Security لجدول activation_code_batches
-- التاريخ: 2024-12-19
-- المشكلة: الجدول يحتوي على سياسات RLS ولكن RLS غير مُفعل

-- ===== تحليل الحالة الحالية =====
-- الجدول: public.activation_code_batches
-- RLS مُفعل: لا
-- عدد السياسات: 1
-- السياسة الموجودة: "Allow authenticated users to view activation code batches" (للقراءة فقط)

BEGIN;

-- ===== تفعيل Row Level Security =====
ALTER TABLE public.activation_code_batches ENABLE ROW LEVEL SECURITY;

-- ===== حذف السياسات الموجودة لإعادة إنشائها بشكل صحيح =====
DROP POLICY IF EXISTS "Allow authenticated users to view activation code batches" ON public.activation_code_batches;

-- ===== إنشاء سياسات RLS شاملة وآمنة =====

-- 1. سياسة القراءة (SELECT)
-- السوبر أدمن يمكنه رؤية جميع البيانات
-- المستخدمون العاديون لا يمكنهم الوصول (هذا جدول إداري)
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
    -- المسؤولون في المؤسسة يمكنهم الرؤية
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_org_admin = true
    )
);

-- 2. سياسة الإدراج (INSERT)
-- فقط السوبر أدمن يمكنه إنشاء دفعات أكواد تفعيل جديدة
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

-- 3. سياسة التحديث (UPDATE)
-- فقط السوبر أدمن يمكنه تحديث دفعات أكواد التفعيل
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

-- 4. سياسة الحذف (DELETE)
-- فقط السوبر أدمن يمكنه حذف دفعات أكواد التفعيل
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

-- ===== التحقق من النتائج =====
-- عرض حالة RLS والسياسات الجديدة
DO $$
BEGIN
    RAISE NOTICE 'تم تفعيل Row Level Security على جدول activation_code_batches بنجاح';
    RAISE NOTICE 'تم إنشاء 4 سياسات جديدة: SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE 'جميع العمليات مقصورة على السوبر أدمن باستثناء القراءة التي تشمل مسؤولي المؤسسات';
END $$;

COMMIT;

-- ===== التحقق من التطبيق الصحيح =====
-- يمكن تشغيل هذا الاستعلام للتحقق من حالة RLS والسياسات
/*
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    STRING_AGG(p.policyname, ', ') as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.tablename = 'activation_code_batches'
    AND t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity;
*/ 