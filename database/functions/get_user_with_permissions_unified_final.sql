-- =====================================================
-- دالة RPC موحدة نهائية للتعرف على المستخدم والصلاحيات
-- الإصدار النهائي - تم إصلاح جميع مشاكل الأعمدة
-- =====================================================

-- حذف جميع الإصدارات القديمة
DROP FUNCTION IF EXISTS get_user_with_permissions_unified(UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_user_with_permissions_unified(UUID);
DROP FUNCTION IF EXISTS get_user_with_permissions_unified();

-- =====================================================
-- الدالة الرئيسية النهائية
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
    
    -- صلاحيات محسوبة
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
    
    -- إحصائيات
    total_permissions_count INTEGER,
    active_permissions_count INTEGER,
    
    -- معلومات الأمان
    two_factor_enabled BOOLEAN,
    account_locked BOOLEAN,
    last_login_at TIMESTAMPTZ,
    
    -- بيانات التصحيح
    debug_info JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_start_time TIMESTAMPTZ;
BEGIN
    -- تسجيل وقت البداية للأداء
    v_start_time := clock_timestamp();
    
    -- تحديد معرف المستخدم
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    
    -- التحقق من وجود معرف مستخدم
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- استعلام مبسط يستخدم فقط الأعمدة الموجودة
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
            -- استخدام last_activity_at كبديل لـ last_sign_in_at
            u.last_activity_at as last_login_at
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
                    SELECT os.trial_ends_at 
                    FROM organization_subscriptions os 
                    WHERE os.organization_id = o.id 
                      AND os.status = 'active'
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
                      AND os.status = 'active'
                      AND (os.trial_ends_at IS NULL OR os.trial_ends_at > NOW())
                ) THEN true
                ELSE false
            END as subscription_active
        FROM user_data ud
        LEFT JOIN organizations o ON ud.organization_id = o.id
    ),
    permission_calculations AS (
        SELECT 
            -- حساب الصلاحيات المحسوبة
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'viewInventory' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageInventory' = to_jsonb(true) THEN true
                ELSE false
            END as has_inventory_access,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'manageProducts' = to_jsonb(true) THEN true
                WHEN ud.permissions->'addProducts' = to_jsonb(true) THEN true
                WHEN ud.permissions->'editProducts' = to_jsonb(true) THEN true
                ELSE false
            END as can_manage_products,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'viewReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewSalesReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewFinancialReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_view_reports' = to_jsonb(true) THEN true
                ELSE false
            END as can_view_reports,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'manageUsers' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageEmployees' = to_jsonb(true) THEN true
                ELSE false
            END as can_manage_users,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'manageOrders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewOrders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'updateOrderStatus' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_update_orders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_view_orders' = to_jsonb(true) THEN true
                ELSE false
            END as can_manage_orders,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'accessPOS' = to_jsonb(true) THEN true
                WHEN ud.permissions->'processPayments' = to_jsonb(true) THEN true
                ELSE false
            END as can_access_pos,
            
            CASE 
                WHEN ud.is_super_admin = true THEN true
                WHEN ud.is_org_admin = true THEN true
                WHEN ud.permissions->'viewSettings' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageOrganizationSettings' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageProfileSettings' = to_jsonb(true) THEN true
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
        (
            SELECT COUNT(*)::INTEGER
            FROM jsonb_each(ud.permissions) AS kv(key, value)
            WHERE jsonb_typeof(value) = 'boolean' AND value = to_jsonb(true)
        ) as active_permissions_count,
        
        -- معلومات الأمان
        ud.two_factor_enabled,
        ud.account_locked,
        ud.last_login_at,
        
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
            'function_version', '2.3.0-final'
        ) as debug_info
        
    FROM user_data ud
    CROSS JOIN org_data od
    LEFT JOIN permission_calculations pc ON p_calculate_permissions = true;
    
END;
$$;

-- =====================================================
-- دوال مساعدة
-- =====================================================

-- دالة سريعة للتحقق من صلاحية واحدة
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
            WHEN u.permissions->p_permission_name = to_jsonb(true) THEN true
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

-- دالة للحصول على معلومات المستخدم الأساسية فقط
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
'دالة RPC موحدة نهائية للحصول على بيانات المستخدم والصلاحيات - الإصدار 2.3.0.
تم إصلاح جميع مشاكل الأعمدة المفقودة:
- last_sign_in_at -> last_activity_at
- trial_end_date -> trial_ends_at
- is_active -> status

الاستخدام:
- SELECT * FROM get_user_with_permissions_unified() -- للمستخدم الحالي
- SELECT * FROM get_user_with_permissions_unified(''user-uuid-here'') -- لمستخدم محدد';

COMMENT ON FUNCTION check_user_permission_fast IS 
'فحص سريع لصلاحية واحدة محددة. مفيد للتحقق من الصلاحيات في الواجهة الأمامية.

الاستخدام:
- SELECT check_user_permission_fast(''viewInventory'')
- SELECT check_user_permission_fast(''manageProducts'', ''user-uuid-here'')';

COMMENT ON FUNCTION get_user_basic_info IS 
'الحصول على المعلومات الأساسية للمستخدم فقط. أسرع من الدالة الكاملة.

الاستخدام:
- SELECT * FROM get_user_basic_info() -- للمستخدم الحالي
- SELECT * FROM get_user_basic_info(''user-uuid-here'') -- لمستخدم محدد';
