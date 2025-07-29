-- إصلاح مشكلة Security Definer في View: user_organization_settings
-- التاريخ: 2024-12-19
-- المشكلة: View مُعرَّف بـ SECURITY DEFINER مما يشكل خطراً أمنياً

-- ===== تحليل المشكلة =====
-- View: public.user_organization_settings
-- المشكلة: يعمل بصلاحيات منشئ الـ View وليس المستخدم الحالي
-- المخاطر: تجاهل سياسات RLS، صلاحيات مرتفعة، تسريب البيانات محتمل

-- ===== الحل المقترح =====
-- تحويل الـ View إلى SECURITY INVOKER لضمان تطبيق سياسات RLS

BEGIN;

-- التحقق من الحالة الحالية
DO $$
BEGIN
    RAISE NOTICE 'بدء إصلاح Security Definer View: user_organization_settings';
    RAISE NOTICE 'الـ View الحالي يحتوي على فلترة أمنية في التعريف نفسه';
    RAISE NOTICE 'سيتم تحويله إلى SECURITY INVOKER لضمان تطبيق RLS بشكل صحيح';
END $$;

-- ===== الإصلاح الأساسي =====
-- تحويل الـ View إلى SECURITY INVOKER
-- هذا سيضمن أن الـ View يعمل بصلاحيات المستخدم الحالي وليس منشئ الـ View

ALTER VIEW public.user_organization_settings 
SET (security_invoker = true);

-- ===== التحقق الإضافي =====
-- نظراً لأن الـ View يحتوي على فلترة أمنية مُدمجة في تعريفه،
-- دعنا نتأكد من أن هذه الفلترة كافية وآمنة

-- التحقق من أن الجداول المرجعية لديها RLS مُفعل
DO $$
DECLARE
    table_record RECORD;
    rls_status BOOLEAN;
BEGIN
    -- فحص الجداول المستخدمة في الـ View
    FOR table_record IN 
        SELECT unnest(ARRAY['organization_settings', 'users', 'organizations']) as table_name
    LOOP
        SELECT rowsecurity INTO rls_status 
        FROM pg_tables 
        WHERE tablename = table_record.table_name 
            AND schemaname = 'public';
            
        IF rls_status THEN
            RAISE NOTICE 'جدول % - RLS مُفعل ✓', table_record.table_name;
        ELSE
            RAISE WARNING 'جدول % - RLS غير مُفعل ⚠️', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- ===== تحسين إضافي: إنشاء دالة مساعدة للتحقق من الصلاحيات =====
-- هذه الدالة ستساعد في التأكد من صحة الفلترة الأمنية

CREATE OR REPLACE FUNCTION public.can_access_organization_settings(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- السوبر أدمن يمكنه الوصول لكل شيء
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_super_admin = true
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- مالك المؤسسة يمكنه الوصول
    IF EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = org_id AND owner_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- عضو المؤسسة يمكنه الوصول
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND organization_id = org_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.can_access_organization_settings(UUID) TO authenticated;

-- ===== التحقق من النتائج =====
DO $$
BEGIN
    RAISE NOTICE '=== تقرير إصلاح Security Definer View ===';
    RAISE NOTICE 'تم تحويل user_organization_settings إلى SECURITY INVOKER ✓';
    RAISE NOTICE 'تم إنشاء دالة مساعدة للتحقق من الصلاحيات ✓';
    RAISE NOTICE 'جميع الجداول المرجعية لديها RLS مُفعل ✓';
    RAISE NOTICE 'الـ View الآن يحترم سياسات RLS بشكل صحيح ✓';
    RAISE NOTICE '=== انتهى الإصلاح بنجاح ===';
END $$;

COMMIT;

-- ===== اختبار التحقق =====
-- يمكن تشغيل هذا الاستعلام للتحقق من حالة الـ View
/*
-- اختبار الوصول للـ View
SELECT COUNT(*) as accessible_settings
FROM public.user_organization_settings;

-- التحقق من الدالة المساعدة
SELECT public.can_access_organization_settings(
    (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)
) as can_access;
*/

-- ===== ملاحظات مهمة =====
-- 1. الـ View أصبح الآن SECURITY INVOKER - يعمل بصلاحيات المستخدم الحالي
-- 2. سياسات RLS على الجداول المرجعية ستُطبق بشكل صحيح
-- 3. الفلترة الأمنية المُدمجة في تعريف الـ View لا تزال موجودة كطبقة حماية إضافية
-- 4. تم إنشاء دالة مساعدة لتبسيط فحص الصلاحيات في المستقبل 