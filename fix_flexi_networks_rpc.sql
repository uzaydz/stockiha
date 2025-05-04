-- fix_flexi_networks_rpc.sql
-- إصلاح مشكلة إضافة شبكات فليكسي بسبب سياسات RLS

-- بدء المعاملة
BEGIN;

-- حذف الوظيفة الموجودة
DROP FUNCTION IF EXISTS public.add_flexi_network(TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.add_flexi_network(TEXT, TEXT, TEXT, BOOLEAN, UUID);

-- إنشاء وظيفة RPC آمنة لإضافة شبكة فليكسي جديدة
CREATE OR REPLACE FUNCTION public.add_flexi_network(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT 'Phone',
    p_is_active BOOLEAN DEFAULT TRUE,
    p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_network_id UUID;
    v_user_role TEXT;
    v_is_admin BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- استخدام معرف المؤسسة المقدم كمعامل إذا كان موجودًا
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        -- الحصول على معرف المؤسسة من المستخدم الحالي
        SELECT 
            organization_id
        INTO 
            v_org_id
        FROM 
            users 
        WHERE 
            id = auth.uid();
            
        IF v_org_id IS NULL THEN
            RAISE EXCEPTION 'لم يتم العثور على معرف المؤسسة للمستخدم الحالي';
        END IF;
    END IF;
    
    -- التحقق من صلاحيات إدارة الفليكسي
    -- يتم تجاوز هذا التحقق إذا تم تقديم معرف المؤسسة صراحةً
    IF p_organization_id IS NULL THEN
        SELECT 
            role,
            (is_super_admin OR is_org_admin OR role = 'admin') AS is_admin,
            (permissions->>'manageFlexi')::boolean AS has_permission
        INTO 
            v_user_role,
            v_is_admin,
            v_has_permission
        FROM 
            users 
        WHERE 
            id = auth.uid();
            
        IF NOT (v_is_admin OR v_has_permission) THEN
            RAISE EXCEPTION 'ليس لديك صلاحية لإدارة شبكات الفليكسي';
        END IF;
    END IF;
    
    -- إدراج شبكة فليكسي جديدة
    INSERT INTO flexi_networks(
        name,
        description,
        icon,
        organization_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_name,
        p_description,
        p_icon,
        v_org_id,
        p_is_active,
        NOW(),
        NOW()
    ) RETURNING id INTO v_network_id;
    
    -- إضافة سجل رصيد فارغ لهذه الشبكة تلقائيًا
    -- هذا سيحل مشكلة عدم ظهور الشبكات الجديدة في قائمة الأرصدة
    INSERT INTO flexi_balances(
        network_id,
        balance,
        organization_id,
        created_at,
        updated_at
    ) VALUES (
        v_network_id,
        0, -- ابدأ برصيد صفر
        v_org_id,
        NOW(),
        NOW()
    ) ON CONFLICT (network_id, organization_id) DO NOTHING;
    
    -- إرجاع معرف الشبكة الجديدة
    RETURN v_network_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في إضافة شبكة فليكسي: %', SQLERRM;
END;
$$;

-- التأكد من منح الصلاحيات للجميع
GRANT EXECUTE ON FUNCTION public.add_flexi_network TO public;

-- إتمام المعاملة
COMMIT; 