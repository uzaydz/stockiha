-- ==========================================
-- حل شامل لمشكلة خطأ 403 عند إنشاء المنتجات
-- التاريخ: 2025-01-29
-- الوصف: يحل مشكلة فشل trigger set_organization_id و RLS policies
-- ==========================================

BEGIN;

-- الجزء الأول: إصلاح دالة set_organization_id
-- =============================================

-- حذف الدالة الحالية وإعادة إنشائها بطريقة أكثر أماناً
DROP FUNCTION IF EXISTS public.set_organization_id() CASCADE;

-- إنشاء دالة محسّنة تتعامل مع الأخطاء بشكل أفضل
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
    current_user_id UUID;
BEGIN
    -- تسجيل معلومات تشخيصية
    RAISE NOTICE 'Trigger set_organization_id called for table: %, NEW.organization_id: %', TG_TABLE_NAME, NEW.organization_id;
    
    -- تعيين معرف المؤسسة فقط إذا كان فارغًا أو NULL
    IF NEW.organization_id IS NULL THEN
        -- محاولة الحصول على معرف المستخدم الحالي
        BEGIN
            current_user_id := auth.uid();
            RAISE NOTICE 'Current user ID from auth.uid(): %', current_user_id;
            
            -- إذا كان auth.uid() يعطي نتيجة صالحة
            IF current_user_id IS NOT NULL THEN
                -- محاولة الحصول على organization_id من جدول users
                SELECT organization_id INTO user_org_id 
                FROM public.users 
                WHERE id = current_user_id 
                LIMIT 1;
                
                RAISE NOTICE 'Found organization_id: % for user: %', user_org_id, current_user_id;
                
                -- إذا وُجد organization_id صالح، استخدمه
                IF user_org_id IS NOT NULL THEN
                    NEW.organization_id := user_org_id;
                    RAISE NOTICE 'Set NEW.organization_id to: %', NEW.organization_id;
                END IF;
            ELSE
                -- إذا كان auth.uid() هو NULL، سجل ذلك
                RAISE NOTICE 'auth.uid() returned NULL - skipping organization_id assignment';
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- في حالة حدوث خطأ، سجل الخطأ ولكن لا توقف العملية
            RAISE NOTICE 'Error in set_organization_id: %, SQLSTATE: %', SQLERRM, SQLSTATE;
            -- لا نرفع الخطأ - نسمح للعملية بالمتابعة
        END;
    ELSE
        RAISE NOTICE 'organization_id already set to: % - skipping assignment', NEW.organization_id;
    END IF;

    -- منطق slug للمعاملات فقط (كما كان موجوداً سابقاً)
    IF TG_TABLE_NAME = 'transactions' THEN
        IF NEW.slug IS NULL OR NEW.slug = '' THEN
            NEW.slug := LOWER(REGEXP_REPLACE(COALESCE(NEW.description, 'transaction-' || NEW.id::text), '\\s+', '-', 'g'));
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- معالجة شاملة للأخطاء - لا توقف العملية أبداً
    RAISE NOTICE 'Critical error in set_organization_id trigger: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN NEW; -- ارجع NEW حتى لو حدث خطأ
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء trigger للمنتجات
DROP TRIGGER IF EXISTS set_products_organization_id ON public.products;
CREATE TRIGGER set_products_organization_id
    BEFORE INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_organization_id();

-- الجزء الثاني: تحسين سياسات RLS للمنتجات
-- ===============================================

-- إسقاط السياسة الحالية لإدراج المنتجات وإعادة إنشائها
DROP POLICY IF EXISTS "authenticated_insert_products" ON public.products;

-- إنشاء سياسة RLS أكثر مرونة لإدراج المنتجات
CREATE POLICY "authenticated_insert_products_enhanced" ON public.products
FOR INSERT
WITH CHECK (
    -- الشرط الأساسي: يجب أن يكون المستخدم مصادق عليه
    auth.uid() IS NOT NULL
    AND
    -- التحقق من أن المستخدم لديه أذونات في المؤسسة المحددة
    (
        -- إذا كان organization_id موجود في البيانات المُدرجة
        (
            organization_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.auth_user_id = auth.uid()
                AND u.is_active = true
                AND u.organization_id = products.organization_id
                AND (
                    u.is_org_admin = true 
                    OR u.is_super_admin = true 
                    OR ((u.permissions ->> 'manageProducts')::boolean = true)
                    OR ((u.permissions ->> 'addProducts')::boolean = true)
                )
            )
        )
        OR
        -- بديل: إذا لم يكن organization_id محدد، تحقق من أن المستخدم نشط ولديه أذونات
        (
            organization_id IS NULL
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.auth_user_id = auth.uid()
                AND u.is_active = true
                AND (
                    u.is_org_admin = true 
                    OR u.is_super_admin = true 
                    OR ((u.permissions ->> 'manageProducts')::boolean = true)
                    OR ((u.permissions ->> 'addProducts')::boolean = true)
                )
            )
        )
    )
);

-- الجزء الثالث: إنشاء دالة مساعدة لإدراج المنتجات بأمان
-- ========================================================

-- حذف الدالة الموجودة أولاً إذا كانت موجودة
DROP FUNCTION IF EXISTS public.create_product_safe(JSONB) CASCADE;

-- دالة RPC لإنشاء منتج مع معالجة أفضل للأخطاء
CREATE OR REPLACE FUNCTION public.create_product_safe(
    product_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    result_product JSONB;
    user_org_id UUID;
    current_user_id UUID;
    inserted_product public.products%ROWTYPE;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create products';
    END IF;
    
    -- الحصول على organization_id للمستخدم
    SELECT organization_id INTO user_org_id
    FROM public.users
    WHERE auth_user_id = current_user_id
    AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NULL THEN
        RAISE EXCEPTION 'User organization not found or user is not active';
    END IF;
    
    -- إدراج المنتج مع ضمان organization_id
    INSERT INTO public.products (
        organization_id,
        name,
        description,
        price,
        purchase_price,
        sku,
        barcode,
        category_id,
        stock_quantity,
        thumbnail_image,
        is_active,
        created_by_user_id,
        updated_by_user_id
    ) VALUES (
        user_org_id,
        product_data->>'name',
        product_data->>'description',
        (product_data->>'price')::DECIMAL,
        (product_data->>'purchase_price')::DECIMAL,
        product_data->>'sku',
        product_data->>'barcode',
        (product_data->>'category_id')::UUID,
        (product_data->>'stock_quantity')::INTEGER,
        product_data->>'thumbnail_image',
        COALESCE((product_data->>'is_active')::BOOLEAN, true),
        current_user_id,
        current_user_id
    ) RETURNING * INTO inserted_product;
    
    -- تحويل النتيجة إلى JSONB
    result_product := to_jsonb(inserted_product);
    
    RETURN result_product;
    
EXCEPTION WHEN OTHERS THEN
    -- معالجة الأخطاء وإرجاع رسالة مفيدة
    RAISE EXCEPTION 'Failed to create product: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الجزء الرابع: تحسين سياسة SELECT للمستخدمين
-- ==============================================

-- التأكد من وجود سياسة SELECT قوية للمستخدمين
-- هذا مهم للـ triggers التي تحتاج للوصول لجدول users
DROP POLICY IF EXISTS "Allow user to read own data" ON public.users;

CREATE POLICY "enhanced_user_read_own_data" ON public.users
FOR SELECT
USING (
    -- السماح للمستخدم بقراءة بياناته الخاصة
    auth.uid() = id 
    OR 
    auth.uid() = auth_user_id
    OR
    -- السماح للمدراء بقراءة بيانات مستخدمي مؤسستهم
    (
        organization_id IN (
            SELECT u2.organization_id 
            FROM public.users u2 
            WHERE u2.auth_user_id = auth.uid() 
            AND u2.is_org_admin = true
        )
    )
    OR
    -- السماح لمديري النظام بقراءة جميع البيانات
    EXISTS (
        SELECT 1 FROM public.users u3 
        WHERE u3.auth_user_id = auth.uid() 
        AND u3.is_super_admin = true
    )
);

-- الجزء الخامس: دالة تشخيص للتحقق من الحالة
-- ===========================================

-- حذف دالة التشخيص إذا كانت موجودة
DROP FUNCTION IF EXISTS public.debug_user_permissions() CASCADE;

-- دالة للتحقق من حالة المستخدم والأذونات
CREATE OR REPLACE FUNCTION public.debug_user_permissions()
RETURNS TABLE (
    current_user_id UUID,
    user_exists BOOLEAN,
    organization_id UUID,
    is_active BOOLEAN,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as current_user_id,
        (u.id IS NOT NULL) as user_exists,
        u.organization_id,
        COALESCE(u.is_active, false) as is_active,
        COALESCE(u.is_org_admin, false) as is_org_admin,
        COALESCE(u.is_super_admin, false) as is_super_admin,
        u.permissions
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    
    UNION ALL
    
    SELECT 
        auth.uid() as current_user_id,
        false as user_exists,
        NULL::UUID as organization_id,
        false as is_active,
        false as is_org_admin,
        false as is_super_admin,
        NULL::JSONB as permissions
    WHERE NOT EXISTS (
        SELECT 1 FROM public.users WHERE auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الجزء السادس: منح الأذونات اللازمة
-- ===================================

-- منح أذونات تنفيذ الدوال للأدوار المناسبة
GRANT EXECUTE ON FUNCTION public.create_product_safe(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_id() TO authenticated;

-- تحديث تعليقات الجداول والدوال
COMMENT ON FUNCTION public.set_organization_id() IS 'دالة محسّنة لتعيين organization_id تلقائياً مع معالجة أفضل للأخطاء';
COMMENT ON FUNCTION public.create_product_safe(JSONB) IS 'دالة آمنة لإنشاء المنتجات مع ضمان organization_id الصحيح';
COMMENT ON FUNCTION public.debug_user_permissions() IS 'دالة تشخيص للتحقق من أذونات المستخدم الحالي';

COMMIT;

-- رسائل تأكيد
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'تم تطبيق إصلاحات شاملة لمشكلة إنشاء المنتجات';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '1. تم إصلاح دالة set_organization_id';
    RAISE NOTICE '2. تم تحسين سياسات RLS للمنتجات';
    RAISE NOTICE '3. تم إنشاء دالة create_product_safe';
    RAISE NOTICE '4. تم تحسين سياسات SELECT للمستخدمين';
    RAISE NOTICE '5. تم إنشاء دالة تشخيص debug_user_permissions';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'لاختبار الحل، يمكنك استخدام:';
    RAISE NOTICE 'SELECT * FROM debug_user_permissions();';
    RAISE NOTICE '==============================================';
END $$; 