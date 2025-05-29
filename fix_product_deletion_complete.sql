-- إصلاح شامل لنظام حذف المنتجات
-- يتضمن: دوال التحقق من الصلاحيات، سجل المحاولات، وسياسات RLS

-- 1. إنشاء جدول سجل محاولات حذف المنتجات
CREATE TABLE IF NOT EXISTS public.product_deletion_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'permission_denied')),
    error_message TEXT,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_product_id ON public.product_deletion_attempts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_user_id ON public.product_deletion_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_organization_id ON public.product_deletion_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_deletion_attempts_created_at ON public.product_deletion_attempts(created_at DESC);

-- تمكين RLS
ALTER TABLE public.product_deletion_attempts ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول سجل المحاولات
CREATE POLICY "المدراء يمكنهم رؤية محاولات الحذف في مؤسستهم" ON public.product_deletion_attempts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
    );

-- السماح للمستخدمين بإدراج محاولاتهم الخاصة
CREATE POLICY "المستخدمون يمكنهم تسجيل محاولات الحذف" ON public.product_deletion_attempts
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- 2. دالة التحقق من صلاحية حذف المنتج
CREATE OR REPLACE FUNCTION public.check_product_delete_permission(
    p_product_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_org_id UUID;
    v_product_org_id UUID;
    v_is_admin BOOLEAN;
    v_has_permission BOOLEAN;
    v_employee_permissions JSONB;
    v_result JSONB;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT 
        organization_id,
        is_org_admin,
        user_metadata->'permissions'
    INTO 
        v_user_org_id,
        v_is_admin,
        v_employee_permissions
    FROM public.users 
    WHERE id = p_user_id;
    
    -- إذا لم يتم العثور على المستخدم
    IF v_user_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'can_delete', false,
            'reason', 'المستخدم غير موجود'
        );
    END IF;
    
    -- الحصول على معلومات المنتج
    SELECT organization_id 
    INTO v_product_org_id
    FROM public.products 
    WHERE id = p_product_id;
    
    -- إذا لم يتم العثور على المنتج
    IF v_product_org_id IS NULL THEN
        RETURN jsonb_build_object(
            'can_delete', false,
            'reason', 'المنتج غير موجود'
        );
    END IF;
    
    -- التحقق من أن المستخدم في نفس المؤسسة
    IF v_user_org_id != v_product_org_id THEN
        RETURN jsonb_build_object(
            'can_delete', false,
            'reason', 'المنتج لا ينتمي لمؤسستك'
        );
    END IF;
    
    -- التحقق من الصلاحيات
    v_has_permission := false;
    
    -- إذا كان المستخدم مدير المؤسسة
    IF v_is_admin = true THEN
        v_has_permission := true;
    -- إذا كان موظف بصلاحيات
    ELSIF v_employee_permissions IS NOT NULL THEN
        -- التحقق من صلاحية حذف المنتجات أو إدارة المنتجات
        IF (v_employee_permissions->>'deleteProducts')::boolean = true OR
           (v_employee_permissions->>'manageProducts')::boolean = true THEN
            v_has_permission := true;
        END IF;
    END IF;
    
    -- بناء النتيجة
    IF v_has_permission THEN
        v_result := jsonb_build_object(
            'can_delete', true,
            'user_id', p_user_id,
            'is_admin', v_is_admin,
            'permissions', v_employee_permissions
        );
    ELSE
        v_result := jsonb_build_object(
            'can_delete', false,
            'reason', 'ليس لديك صلاحية حذف المنتجات',
            'user_id', p_user_id,
            'is_admin', v_is_admin,
            'permissions', v_employee_permissions
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- 3. دالة تسجيل محاولات حذف المنتج
CREATE OR REPLACE FUNCTION public.log_product_deletion_attempt(
    p_product_id UUID,
    p_user_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_attempt_id UUID;
BEGIN
    -- الحصول على معرف المؤسسة من المنتج
    SELECT organization_id INTO v_organization_id
    FROM public.products
    WHERE id = p_product_id;
    
    -- إذا لم يتم العثور على المنتج، حاول الحصول على معرف المؤسسة من المستخدم
    IF v_organization_id IS NULL THEN
        SELECT organization_id INTO v_organization_id
        FROM public.users
        WHERE id = p_user_id;
    END IF;
    
    -- إدراج سجل المحاولة
    INSERT INTO public.product_deletion_attempts (
        product_id,
        user_id,
        organization_id,
        status,
        error_message,
        error_code
    ) VALUES (
        p_product_id,
        p_user_id,
        v_organization_id,
        p_status,
        p_error_message,
        p_error_code
    ) RETURNING id INTO v_attempt_id;
    
    RETURN v_attempt_id;
END;
$$;

-- 4. تحديث سياسة حذف المنتجات
DROP POLICY IF EXISTS "أصحاب المنتجات يمكنهم حذف منتجاتهم" ON public.products;

CREATE POLICY "حذف المنتجات حسب الصلاحيات" ON public.products
    FOR DELETE USING (
        -- السماح بالحذف إذا كان المستخدم مدير في نفس المؤسسة
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
        OR
        -- أو إذا كان موظف بصلاحية حذف المنتجات
        EXISTS (
            SELECT 1 
            FROM public.users u
            WHERE u.id = auth.uid() 
            AND u.organization_id = products.organization_id
            AND (
                (u.user_metadata->'permissions'->>'deleteProducts')::boolean = true
                OR
                (u.user_metadata->'permissions'->>'manageProducts')::boolean = true
            )
        )
    );

-- 5. دالة مساعدة لتنظيف سجلات المحاولات القديمة
CREATE OR REPLACE FUNCTION public.cleanup_old_deletion_attempts(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.product_deletion_attempts
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. إضافة تعليقات توضيحية
COMMENT ON TABLE public.product_deletion_attempts IS 'سجل محاولات حذف المنتجات لأغراض المراجعة والأمان';
COMMENT ON FUNCTION public.check_product_delete_permission IS 'التحقق من صلاحية المستخدم لحذف منتج معين';
COMMENT ON FUNCTION public.log_product_deletion_attempt IS 'تسجيل محاولة حذف منتج سواء نجحت أم فشلت';
COMMENT ON FUNCTION public.cleanup_old_deletion_attempts IS 'حذف سجلات المحاولات القديمة للحفاظ على حجم الجدول';

-- 7. منح الصلاحيات اللازمة للدوال
GRANT EXECUTE ON FUNCTION public.check_product_delete_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_product_deletion_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_deletion_attempts TO service_role;

-- 8. إنشاء job دوري لتنظيف السجلات القديمة (إذا كان متاحاً)
-- ملاحظة: هذا يتطلب تفعيل pg_cron extension
-- SELECT cron.schedule('cleanup-deletion-attempts', '0 2 * * 0', 'SELECT public.cleanup_old_deletion_attempts(90);');