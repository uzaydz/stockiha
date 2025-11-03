-- ============================================================================
-- حل مشاكل Super Admin
-- ============================================================================
-- المشكلة 1: get_app_initialization_data لا يعمل مع super admin بدون organization
-- المشكلة 2: admin_get_organizations_with_subscriptions يرفض super admin
-- ============================================================================

-- ============================================================================
-- 1️⃣ إصلاح get_app_initialization_data
-- ============================================================================

DROP FUNCTION IF EXISTS get_app_initialization_data(UUID, UUID);
DROP FUNCTION IF EXISTS get_app_initialization_data();
DROP FUNCTION IF EXISTS get_app_initialization_data(UUID);

CREATE OR REPLACE FUNCTION get_app_initialization_data(
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
  v_user_data JSON;
  v_organization_data JSON;
  v_organization_settings JSON;
  v_pos_settings JSON;
  v_categories JSON;
  v_subcategories JSON;
  v_employees JSON;
  v_confirmation_agents JSON;
  v_expense_categories JSON;
  v_result JSON;
  v_is_super_admin BOOLEAN;
BEGIN
  -- 1️⃣ تحديد معرف المستخدم
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- 2️⃣ جلب بيانات المستخدم
  SELECT json_build_object(
    'id', u.id,
    'auth_user_id', u.auth_user_id,
    'name', u.name,
    'email', u.email,
    'phone', u.phone,
    'role', u.role,
    'organization_id', u.organization_id,
    'is_active', u.is_active,
    'is_super_admin', u.is_super_admin,
    'avatar_url', u.avatar_url,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'permissions', '[]'::json
  ), u.is_super_admin
  INTO v_user_data, v_is_super_admin
  FROM users u
  WHERE u.auth_user_id = v_user_id
  LIMIT 1;

  -- إذا لم يتم العثور على المستخدم
  IF v_user_data IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- 3️⃣ تحديد معرف المؤسسة
  v_organization_id := COALESCE(
    p_organization_id,
    (v_user_data->>'organization_id')::UUID
  );

  -- ✅ حل المشكلة: السماح للـ super admin بالعمل بدون مؤسسة
  IF v_organization_id IS NULL THEN
    -- إذا كان super admin، إرجاع بيانات محدودة
    IF COALESCE(v_is_super_admin, false) = true THEN
      v_result := json_build_object(
        'user', v_user_data,
        'is_super_admin', true,
        'organization', NULL,
        'organization_settings', NULL,
        'pos_settings', NULL,
        'categories', '[]'::json,
        'subcategories', '[]'::json,
        'employees', '[]'::json,
        'confirmation_agents', '[]'::json,
        'expense_categories', '[]'::json,
        'timestamp', extract(epoch from now())::bigint
      );
      RETURN v_result;
    END IF;
    
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- 4️⃣ جلب بيانات المؤسسة
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'description', o.description,
    'logo_url', o.logo_url,
    'domain', o.domain,
    'subdomain', o.subdomain,
    'subscription_tier', o.subscription_tier,
    'subscription_status', o.subscription_status,
    'settings', o.settings,
    'created_at', o.created_at,
    'updated_at', o.updated_at
  )
  INTO v_organization_data
  FROM organizations o
  WHERE o.id = v_organization_id
  LIMIT 1;

  -- 5️⃣ جلب إعدادات المؤسسة
  SELECT json_build_object(
    'id', os.id,
    'organization_id', os.organization_id,
    'theme_primary_color', os.theme_primary_color,
    'theme_secondary_color', os.theme_secondary_color,
    'theme_mode', os.theme_mode,
    'site_name', os.site_name,
    'custom_css', os.custom_css,
    'logo_url', os.logo_url,
    'favicon_url', os.favicon_url,
    'default_language', os.default_language,
    'custom_js', os.custom_js,
    'custom_header', os.custom_header,
    'custom_footer', os.custom_footer,
    'enable_registration', os.enable_registration,
    'enable_public_site', os.enable_public_site,
    'display_text_with_logo', os.display_text_with_logo,
    'created_at', os.created_at,
    'updated_at', os.updated_at
  )
  INTO v_organization_settings
  FROM organization_settings os
  WHERE os.organization_id = v_organization_id
  LIMIT 1;

  -- 6️⃣ جلب إعدادات POS
  SELECT json_build_object(
    'id', ps.id,
    'organization_id', ps.organization_id,
    'store_name', ps.store_name,
    'store_phone', ps.store_phone,
    'store_email', ps.store_email,
    'store_address', ps.store_address,
    'currency_symbol', ps.currency_symbol,
    'currency_position', ps.currency_position,
    'tax_label', ps.tax_label,
    'receipt_header_text', ps.receipt_header_text,
    'receipt_footer_text', ps.receipt_footer_text,
    'show_store_logo', ps.show_store_logo,
    'show_store_info', ps.show_store_info,
    'paper_width', ps.paper_width,
    'created_at', ps.created_at,
    'updated_at', ps.updated_at
  )
  INTO v_pos_settings
  FROM pos_settings ps
  WHERE ps.organization_id = v_organization_id
  LIMIT 1;

  -- 7️⃣ جلب الفئات
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', pc.id,
      'name', pc.name,
      'description', pc.description,
      'organization_id', pc.organization_id,
      'is_active', pc.is_active,
      'created_at', pc.created_at
    )
    ORDER BY pc.name
  ), '[]'::json)
  INTO v_categories
  FROM product_categories pc
  WHERE pc.organization_id = v_organization_id
    AND pc.is_active = true
  LIMIT 100;

  -- 8️⃣ جلب الفئات الفرعية
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', psc.id,
      'name', psc.name,
      'category_id', psc.category_id,
      'organization_id', psc.organization_id,
      'is_active', psc.is_active,
      'created_at', psc.created_at
    )
    ORDER BY psc.name
  ), '[]'::json)
  INTO v_subcategories
  FROM product_subcategories psc
  WHERE psc.organization_id = v_organization_id
    AND psc.is_active = true
  LIMIT 200;

  -- 9️⃣ جلب الموظفين
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', u.id,
      'auth_user_id', u.auth_user_id,
      'name', u.name,
      'email', u.email,
      'role', u.role,
      'is_active', u.is_active,
      'avatar_url', u.avatar_url
    )
    ORDER BY u.name
  ), '[]'::json)
  INTO v_employees
  FROM users u
  WHERE u.organization_id = v_organization_id
    AND u.is_active = true
  LIMIT 50;

  -- 🔟 جلب وكلاء التأكيد
  BEGIN
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', ca.id,
        'user_id', ca.user_id,
        'agent_type', ca.agent_type,
        'agent_data', ca.agent_data,
        'is_active', ca.is_active,
        'created_at', ca.created_at
      )
    ), '[]'::json)
    INTO v_confirmation_agents
    FROM confirmation_agents ca
    WHERE ca.user_id = v_user_id
      AND ca.is_active = true;
  EXCEPTION
    WHEN OTHERS THEN
      v_confirmation_agents := '[]'::json;
  END;

  -- 1️⃣1️⃣ جلب فئات المصروفات
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', ec.id,
      'name', ec.name,
      'description', ec.description,
      'organization_id', ec.organization_id,
      'created_at', ec.created_at,
      'updated_at', ec.updated_at
    )
    ORDER BY ec.name
  ), '[]'::json)
  INTO v_expense_categories
  FROM expense_categories ec
  WHERE ec.organization_id = v_organization_id
  LIMIT 100;

  -- ✅ بناء النتيجة النهائية
  v_result := json_build_object(
    'user', v_user_data,
    'is_super_admin', v_is_super_admin,
    'organization', v_organization_data,
    'organization_settings', v_organization_settings,
    'pos_settings', v_pos_settings,
    'categories', v_categories,
    'subcategories', v_subcategories,
    'employees', v_employees,
    'confirmation_agents', v_confirmation_agents,
    'expense_categories', v_expense_categories,
    'timestamp', extract(epoch from now())::bigint
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in get_app_initialization_data: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION get_app_initialization_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_app_initialization_data(UUID, UUID) TO anon;

COMMENT ON FUNCTION get_app_initialization_data IS 
'RPC موحد لجلب كل بيانات تهيئة التطبيق. يدعم Super Admin بدون organization.';

-- ============================================================================
-- 2️⃣ إصلاح admin_get_organizations_with_subscriptions
-- ============================================================================

DROP FUNCTION IF EXISTS admin_get_organizations_with_subscriptions(TEXT, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION admin_get_organizations_with_subscriptions(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  subscription_status TEXT,
  subscription_tier TEXT,
  created_at TIMESTAMPTZ,
  domain TEXT,
  subdomain TEXT,
  users_count BIGINT,
  subscription_id UUID,
  plan_id UUID,
  plan_name TEXT,
  plan_code TEXT,
  subscription_state TEXT,
  billing_cycle TEXT,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER,
  amount_paid NUMERIC,
  last_updated TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_current_uid UUID;
  v_limit INT;
  v_sanitized_search TEXT;
BEGIN
  -- ✅ حل المشكلة: تحسين التحقق من super admin
  v_current_uid := auth.uid();
  
  IF v_current_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING HINT = 'User must be authenticated';
  END IF;

  -- التحقق من super admin بطريقة محسنة
  SELECT COALESCE(is_super_admin, false)
  INTO v_is_super
  FROM users
  WHERE auth_user_id = v_current_uid
    AND is_active = true
  LIMIT 1;

  -- رفع خطأ واضح إذا لم يكن super admin
  IF NOT v_is_super THEN
    RAISE EXCEPTION 'not_authorized' 
      USING HINT = 'Super admin access required',
            DETAIL = format('User %s is not a super admin', v_current_uid);
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  -- Sanitize search parameter
  v_sanitized_search := CASE
    WHEN p_search IS NULL OR p_search = '' THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(p_search, '%', '\%'), '_', '\_'), '\\', '\\\\')
  END;

  RETURN QUERY
  WITH filtered_orgs AS (
    SELECT o.*
    FROM organizations o
    WHERE (p_status IS NULL OR p_status = '' OR o.subscription_status = p_status)
      AND (p_tier IS NULL OR p_tier = '' OR o.subscription_tier = p_tier)
      AND (
        v_sanitized_search IS NULL OR
        o.name ILIKE '%' || v_sanitized_search || '%' ESCAPE '\' OR
        COALESCE(o.domain, '') ILIKE '%' || v_sanitized_search || '%' ESCAPE '\' OR
        COALESCE(o.subdomain, '') ILIKE '%' || v_sanitized_search || '%' ESCAPE '\'
      )
    ORDER BY o.created_at DESC
    LIMIT v_limit
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.created_at,
    o.domain,
    o.subdomain,
    COALESCE(u.user_count, 0) AS users_count,
    os.id AS subscription_id,
    os.plan_id,
    sp.name AS plan_name,
    sp.code AS plan_code,
    os.status AS subscription_state,
    os.billing_cycle,
    os.start_date::date,
    os.end_date::date,
    CASE
      WHEN os.end_date IS NULL THEN NULL
      ELSE GREATEST(0, (os.end_date::date - CURRENT_DATE))
    END AS days_remaining,
    os.amount_paid,
    COALESCE(os.updated_at, o.updated_at) AS last_updated
  FROM filtered_orgs o
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS user_count
    FROM users u
    WHERE u.organization_id = o.id
  ) u ON TRUE
  LEFT JOIN LATERAL (
    SELECT os_inner.*
    FROM organization_subscriptions os_inner
    WHERE os_inner.organization_id = o.id
    ORDER BY os_inner.created_at DESC
    LIMIT 1
  ) os ON TRUE
  LEFT JOIN subscription_plans sp ON sp.id = os.plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_organizations_with_subscriptions(TEXT, TEXT, TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION admin_get_organizations_with_subscriptions IS 
'إرجاع قائمة المؤسسات مع معلومات الاشتراك للسوبر أدمن فقط. تم تحسين التحقق من الصلاحيات.';

-- ============================================================================
-- ✅ تم إصلاح المشاكل
-- ============================================================================
-- الآن يمكن للـ Super Admin:
-- 1. تسجيل الدخول بدون مؤسسة (get_app_initialization_data يعمل)
-- 2. الوصول لصفحة المؤسسات (admin_get_organizations_with_subscriptions يعمل)
-- ============================================================================
