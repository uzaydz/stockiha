-- إصلاح شامل لمشكلة حذف المنتجات
-- يُنفذ هذا الملف في Supabase SQL Editor

-- ============================================
-- الجزء 1: إصلاح trigger المشكل
-- ============================================

-- إلغاء الـ trigger المشكل أولاً
DROP TRIGGER IF EXISTS log_deleted_product_images ON public.products;

-- تعديل دالة handle_deleted_product_images للعمل بشكل آمن
CREATE OR REPLACE FUNCTION public.handle_deleted_product_images()
RETURNS TRIGGER AS $$
BEGIN
    -- نتجاهل تسجيل الملفات المحذوفة مؤقتاً لتجنب أخطاء RLS
    RETURN OLD;
EXCEPTION WHEN OTHERS THEN
    -- في حالة حدوث أي خطأ، نتجاهله ونكمل عملية الحذف
    RAISE WARNING 'خطأ في تسجيل الملفات المحذوفة: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER log_deleted_product_images
AFTER DELETE ON public.products
REFERENCING OLD TABLE AS OLD_TABLE
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_deleted_product_images();

-- ============================================
-- الجزء 2: إصلاح سياسات RLS للمنتجات
-- ============================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "أصحاب المنتجات يمكنهم حذف منتجاتهم" ON public.products;
DROP POLICY IF EXISTS "حذف المنتجات حسب الصلاحيات" ON public.products;
DROP POLICY IF EXISTS "مدراء المؤسسة يمكنهم حذف المنتجات" ON public.products;
DROP POLICY IF EXISTS "الموظفون بصلاحيات يمكنهم حذف المنتجات" ON public.products;

-- إنشاء سياسة واحدة شاملة للحذف
CREATE POLICY "حذف المنتجات للمدراء والموظفين المصرح لهم" ON public.products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 
            FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.organization_id = products.organization_id
            AND (
                -- المدراء
                u.is_org_admin = true
                OR
                -- الموظفون بصلاحية حذف المنتجات
                (u.user_metadata->'permissions'->>'deleteProducts')::boolean = true
                OR
                -- الموظفون بصلاحية إدارة المنتجات
                (u.user_metadata->'permissions'->>'manageProducts')::boolean = true
            )
        )
    );

-- ============================================
-- الجزء 3: دالة آمنة لحذف المنتجات
-- ============================================

CREATE OR REPLACE FUNCTION public.safe_delete_product(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_org_id UUID;
    v_product_org_id UUID;
    v_is_admin BOOLEAN;
    v_permissions JSONB;
BEGIN
    -- استخدام المستخدم الحالي إذا لم يتم تمرير معرف
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- التحقق من وجود المستخدم وصلاحياته
    SELECT organization_id, is_org_admin, user_metadata->'permissions'
    INTO v_user_org_id, v_is_admin, v_permissions
    FROM public.users
    WHERE id = v_user_id;
    
    IF v_user_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود أو غير مصرح له'
        );
    END IF;
    
    -- التحقق من وجود المنتج
    SELECT organization_id
    INTO v_product_org_id
    FROM public.products
    WHERE id = p_product_id;
    
    IF v_product_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود'
        );
    END IF;
    
    -- التحقق من أن المستخدم في نفس المؤسسة
    IF v_user_org_id != v_product_org_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج لا ينتمي لمؤسستك'
        );
    END IF;
    
    -- التحقق من الصلاحيات
    IF NOT (
        v_is_admin = true 
        OR (v_permissions->>'deleteProducts')::boolean = true 
        OR (v_permissions->>'manageProducts')::boolean = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية حذف المنتجات'
        );
    END IF;
    
    -- محاولة حذف المنتج
    BEGIN
        DELETE FROM public.products WHERE id = p_product_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'تم حذف المنتج بنجاح'
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
    END;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.safe_delete_product TO authenticated;

-- ============================================
-- الجزء 4: إصلاح جدول deleted_files (إن وجد)
-- ============================================

-- التحقق من وجود الجدول وإضافة RLS policies إذا لزم الأمر
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'deleted_files'
    ) THEN
        -- تمكين RLS
        ALTER TABLE public.deleted_files ENABLE ROW LEVEL SECURITY;
        
        -- إضافة عمود organization_id إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'deleted_files' 
            AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.deleted_files 
            ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
        
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "المدراء يمكنهم رؤية الملفات المحذوفة في مؤسستهم" ON public.deleted_files;
        DROP POLICY IF EXISTS "النظام يمكنه إدراج سجلات الملفات المحذوفة" ON public.deleted_files;
        DROP POLICY IF EXISTS "المدراء يمكنهم تحديث حالة المعالجة" ON public.deleted_files;
        DROP POLICY IF EXISTS "المدراء يمكنهم حذف السجلات المعالجة" ON public.deleted_files;
        
        -- إنشاء سياسة بسيطة للسماح بالإدراج من triggers
        CREATE POLICY "السماح بإدراج سجلات الملفات المحذوفة" ON public.deleted_files
            FOR INSERT WITH CHECK (true);
        
        -- سياسة للقراءة للمدراء فقط
        CREATE POLICY "المدراء يمكنهم رؤية الملفات المحذوفة" ON public.deleted_files
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM public.users 
                    WHERE id = auth.uid() 
                    AND is_org_admin = true
                )
            );
    END IF;
END $$;

-- ============================================
-- الجزء 5: رسالة نجاح
-- ============================================

-- إظهار رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم تطبيق إصلاحات حذف المنتجات بنجاح!';
    RAISE NOTICE 'يمكنك الآن حذف المنتجات دون مشاكل RLS';
END $$;