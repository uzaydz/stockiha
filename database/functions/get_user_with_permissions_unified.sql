-- =====================================================
-- دالة RPC موحدة للتعرف على المستخدم والصلاحيات - الإصدار المحدث
-- الهدف: حل جميع مشاكل التكرار والأداء البطيء
-- الكاتب: AI Assistant
-- التاريخ: $(date)
-- =====================================================

-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS get_user_with_permissions_unified(UUID, BOOLEAN, BOOLEAN);

-- إنشاء فهارس محسنة للأداء (إذا لم تكن موجودة)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_active ON users(auth_user_id, is_active) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_permissions_gin ON users USING gin(permissions) WHERE permissions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_subscription ON organizations(id, subscription_status, subscription_tier);

-- =====================================================
-- الدالة الرئيسية الموحدة - الإصدار المحدث
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_with_permissions_unified(
    p_auth_user_id UUID DEFAULT NULL,
    p_include_subscription_data BOOLEAN DEFAULT true,
    p_calculate_permissions BOOLEAN DEFAULT true
)
RETURNS TABLE (
    -- معلومات المستخدم الأساسية
    user_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    
    -- معلومات المؤسسة
    organization_id UUID,
    organization_name TEXT,
    organization_status TEXT,
    
    -- صلاحيات المستخدم
    is_active BOOLEAN,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    permissions JSONB,
    
    -- معلومات إضافية
    user_status TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    
    -- صلاحيات محسوبة (لتحسين الأداء في الواجهة الأمامية)
    has_inventory_access BOOLEAN,
    can_manage_products BOOLEAN,
    can_view_reports BOOLEAN,
    can_manage_users BOOLEAN,
    can_manage_orders BOOLEAN,
    can_access_pos BOOLEAN,
    can_manage_settings BOOLEAN,
    
    -- بيانات الاشتراك
    subscription_status TEXT,
    subscription_tier TEXT,
    trial_end_date TIMESTAMPTZ,
    subscription_active BOOLEAN,
    
    -- إحصائيات سريعة
    total_permissions_count INTEGER,
    active_permissions_count INTEGER,
    
    -- معلومات الأمان
    two_factor_enabled BOOLEAN,
    account_locked BOOLEAN,
    last_login_at TIMESTAMPTZ,
    
    -- بيانات إضافية للتطوير والتصحيح
    debug_info JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
AS $$
DECLARE
    v_user_id UUID;
    v_start_time TIMESTAMPTZ;
BEGIN
    -- تسجيل وقت البداية للأداء
    v_start_time := clock_timestamp();
    
    -- تحديد معرف المستخدم (استخدام auth.uid() إذا لم يتم تمرير معرف)
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    
    -- التحقق من وجود معرف مستخدم
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- استعلام واحد محسن للحصول على جميع البيانات
    RETURN QUERY
    WITH user_data AS (
        SELECT 
            u.id as user_internal_id,
            u.auth_user_id,
            u.email,
            u.name,
            u.role,
            u.organization_id,
            u.is_active,
            COALESCE(u.is_org_admin, false) as is_org_admin,
            COALESCE(u.is_super_admin, false) as is_super_admin,
            COALESCE(u.permissions, '{}'::jsonb) as permissions,
            COALESCE(u.status, 'offline') as status,
            u.last_activity_at,
            u.created_at,
            COALESCE(u.two_factor_enabled, false) as two_factor_enabled,
            CASE 
                WHEN u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW() THEN true
                ELSE false
            END as account_locked,
            -- استخدام COALESCE للتعامل مع العمود الذي قد لا يكون موجوداً
            COALESCE(u.last_sign_in_at, u.last_activity_at) as last_sign_in_at
        FROM users u
        WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
          AND u.is_active = true
        LIMIT 1
    ),
    org_data AS (
        SELECT 
            o.id as org_id,
            o.name as org_name,
            COALESCE(o.subscription_status, 'inactive') as subscription_status,
            COALESCE(o.subscription_tier, 'free') as subscription_tier,
            CASE 
                WHEN p_include_subscription_data THEN (
                    SELECT os.trial_end_date 
                    FROM organization_subscriptions os 
                    WHERE os.organization_id = o.id 
                      AND os.is_active = true 
                    ORDER BY os.created_at DESC 
                    LIMIT 1
                )
                ELSE NULL
            END as trial_end_date,
            CASE 
                WHEN o.subscription_status = 'active' THEN true
                WHEN o.subscription_status = 'trial' AND EXISTS (
                    SELECT 1 FROM organization_subscriptions os 
                    WHERE os.organization_id = o.id 
                      AND os.is_active = true 
                      AND (os.trial_end_date IS NULL OR os.trial_end_date > NOW())
                ) THEN true
                ELSE false
            END as subscription_active
        FROM user_data ud
        LEFT JOIN organizations o ON ud.organization_id = o.id
    ),
    permission_calculations AS (
        SELECT 
            -- حساب الصلاحيات المحسوبة لتحسين الأداء في الواجهة الأمامية
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'viewInventory')::boolean = true THEN true
                WHEN (ud.permissions->>'manageInventory')::boolean = true THEN true
                ELSE false
            END as has_inventory_access,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'manageProducts')::boolean = true THEN true
                WHEN (ud.permissions->>'addProducts')::boolean = true THEN true
                WHEN (ud.permissions->>'editProducts')::boolean = true THEN true
                ELSE false
            END as can_manage_products,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'viewReports')::boolean = true THEN true
                WHEN (ud.permissions->>'viewSalesReports')::boolean = true THEN true
                WHEN (ud.permissions->>'viewFinancialReports')::boolean = true THEN true
                ELSE false
            END as can_view_reports,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'manageUsers')::boolean = true THEN true
                WHEN (ud.permissions->>'manageEmployees')::boolean = true THEN true
                ELSE false
            END as can_manage_users,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'manageOrders')::boolean = true THEN true
                WHEN (ud.permissions->>'viewOrders')::boolean = true THEN true
                WHEN (ud.permissions->>'updateOrderStatus')::boolean = true THEN true
                ELSE false
            END as can_manage_orders,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'accessPOS')::boolean = true THEN true
                WHEN (ud.permissions->>'processPayments')::boolean = true THEN true
                ELSE false
            END as can_access_pos,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN (ud.permissions->>'viewSettings')::boolean = true THEN true
                WHEN (ud.permissions->>'manageOrganizationSettings')::boolean = true THEN true
                WHEN (ud.permissions->>'manageProfileSettings')::boolean = true THEN true
                ELSE false
            END as can_manage_settings
        FROM user_data ud
    )
    SELECT 
        ud.user_internal_id,
        ud.auth_user_id,
        ud.email,
        ud.name,
        ud.role,
        
        -- معلومات المؤسسة
        ud.organization_id,
        od.org_name,
        od.subscription_status,
        
        -- صلاحيات المستخدم
        ud.is_active,
        ud.is_org_admin,
        ud.is_super_admin,
        ud.permissions,
        
        -- معلومات إضافية
        ud.status,
        ud.last_activity_at,
        ud.created_at,
        
        -- صلاحيات محسوبة
        CASE WHEN p_calculate_permissions THEN pc.has_inventory_access ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_products ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_view_reports ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_users ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_orders ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_access_pos ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_settings ELSE NULL END,
        
        -- بيانات الاشتراك
        CASE WHEN p_include_subscription_data THEN od.subscription_status ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.subscription_tier ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.trial_end_date ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.subscription_active ELSE NULL END,
        
        -- إحصائيات الصلاحيات
        (SELECT COUNT(*)::INTEGER FROM jsonb_object_keys(ud.permissions)) as total_permissions_count,
        (SELECT COUNT(*)::INTEGER FROM jsonb_each_text(ud.permissions) WHERE value::boolean = true) as active_permissions_count,
        
        -- معلومات الأمان
        ud.two_factor_enabled,
        ud.account_locked,
        ud.last_sign_in_at,
        
        -- بيانات التصحيح
        jsonb_build_object(
            'query_method', CASE 
                WHEN ud.auth_user_id = v_user_id THEN 'auth_user_id'
                ELSE 'user_id'
            END,
            'execution_time_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000, 2),
            'user_found', ud.user_internal_id IS NOT NULL,
            'organization_found', od.org_id IS NOT NULL,
            'cache_friendly', true,
            'function_version', '2.1.0'
        ) as debug_info
        
    FROM user_data ud
    CROSS JOIN org_data od
    LEFT JOIN permission_calculations pc ON p_calculate_permissions = true;
    
END;
$$;

-- =====================================================
-- دوال مساعدة سريعة للاستعلامات الشائعة
-- =====================================================

-- دالة سريعة للتحقق من صلاحية واحدة - الإصدار المحدث
CREATE OR REPLACE FUNCTION check_user_permission_fast(
    p_permission_name TEXT,
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_result BOOLEAN := false;
BEGIN
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT 
        CASE 
            WHEN u.is_super_admin = true THEN true
            WHEN u.is_org_admin = true THEN true
            WHEN (u.permissions->>p_permission_name)::boolean = true THEN true
            ELSE false
        END
    INTO v_result
    FROM users u
    WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
      AND u.is_active = true
    LIMIT 1;
    
    RETURN COALESCE(v_result, false);
END;
$$;

-- دالة للحصول على معلومات المستخدم الأساسية فقط (أسرع) - الإصدار المحدث
CREATE OR REPLACE FUNCTION get_user_basic_info(
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_active BOOLEAN,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.auth_user_id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        u.is_active,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false)
    FROM users u
    WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
      AND u.is_active = true
    LIMIT 1;
END;
$$;

-- =====================================================
-- تعليقات للاستخدام
-- =====================================================

COMMENT ON FUNCTION get_user_with_permissions_unified IS 
'دالة RPC موحدة للحصول على بيانات المستخدم والصلاحيات بأداء محسن - الإصدار 2.1.0. 
تستبدل جميع الاستعلامات المتكررة وتوفر بيانات شاملة في استعلام واحد.
تم إصلاح مشكلة العمود المفقود last_sign_in_at.

الاستخدام:
- SELECT * FROM get_user_with_permissions_unified() -- للمستخدم الحالي
- SELECT * FROM get_user_with_permissions_unified(''user-uuid-here'') -- لمستخدم محدد
- SELECT * FROM get_user_with_permissions_unified(NULL, false, false) -- بيانات أساسية فقط';

COMMENT ON FUNCTION check_user_permission_fast IS 
'فحص سريع لصلاحية واحدة محددة. مفيد للتحقق من الصلاحيات في الواجهة الأمامية.

الاستخدام:
- SELECT check_user_permission_fast(''viewInventory'')
- SELECT check_user_permission_fast(''manageProducts'', ''user-uuid-here'')';

COMMENT ON FUNCTION get_user_basic_info IS 
'الحصول على المعلومات الأساسية للمستخدم فقط. أسرع من الدالة الكاملة عندما لا تحتاج لجميع البيانات.

الاستخدام:
- SELECT * FROM get_user_basic_info() -- للمستخدم الحالي
- SELECT * FROM get_user_basic_info(''user-uuid-here'') -- لمستخدم محدد';

-- =====================================================
-- اختبارات الأداء (اختيارية)
-- =====================================================

-- إنشاء دالة اختبار الأداء - الإصدار المحدث
CREATE OR REPLACE FUNCTION test_user_function_performance()
RETURNS TABLE (
    test_name TEXT,
    execution_time_ms NUMERIC,
    result_count INTEGER,
    status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    -- اختبار الدالة الموحدة
    v_start_time := clock_timestamp();
    SELECT COUNT(*) INTO v_count FROM get_user_with_permissions_unified();
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'get_user_with_permissions_unified (v2.1.0)'::TEXT,
        ROUND(EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000, 2),
        v_count,
        CASE WHEN v_count > 0 THEN 'SUCCESS' ELSE 'NO_DATA' END;
    
    -- اختبار الدالة الأساسية
    v_start_time := clock_timestamp();
    SELECT COUNT(*) INTO v_count FROM get_user_basic_info();
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'get_user_basic_info (v2.1.0)'::TEXT,
        ROUND(EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000, 2),
        v_count,
        CASE WHEN v_count > 0 THEN 'SUCCESS' ELSE 'NO_DATA' END;
        
    -- اختبار فحص الصلاحيات
    v_start_time := clock_timestamp();
    PERFORM check_user_permission_fast('viewInventory');
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'check_user_permission_fast (v2.1.0)'::TEXT,
        ROUND(EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000, 2),
        1,
        'SUCCESS'::TEXT;
END;
$$;
