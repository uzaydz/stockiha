-- =================================================================
-- دالة جلب البيانات الموحدة المبسطة
-- =================================================================

CREATE OR REPLACE FUNCTION get_global_data_simple(
  p_organization_id TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  organization_data JSON;
  organization_settings_data JSON;
  pos_settings_data JSON;
  products_data JSON;
  categories_data JSON;
  users_data JSON;
  customers_data JSON;
  result JSON;
BEGIN
  -- جلب بيانات المؤسسة
  SELECT row_to_json(o.*)
  INTO organization_data
  FROM organizations o
  WHERE o.id = p_organization_id::uuid;

  -- جلب إعدادات المؤسسة
  SELECT row_to_json(os.*)
  INTO organization_settings_data
  FROM organization_settings os
  WHERE os.organization_id = p_organization_id::uuid;

  -- جلب إعدادات نقطة البيع
  SELECT row_to_json(ps.*)
  INTO pos_settings_data
  FROM pos_settings ps
  WHERE ps.organization_id = p_organization_id::uuid;

  -- جلب المنتجات
  SELECT COALESCE(json_agg(p.*), '[]'::json)
  INTO products_data
  FROM products p
  WHERE p.organization_id = p_organization_id::uuid
    AND p.is_active = true;

  -- جلب فئات المنتجات
  SELECT COALESCE(json_agg(pc.*), '[]'::json)
  INTO categories_data
  FROM product_categories pc
  WHERE pc.organization_id = p_organization_id::uuid
    AND pc.is_active = true;

  -- جلب المستخدمين
  SELECT COALESCE(json_agg(u.*), '[]'::json)
  INTO users_data
  FROM users u
  WHERE u.organization_id = p_organization_id::uuid;

  -- جلب العملاء
  SELECT COALESCE(json_agg(c.*), '[]'::json)
  INTO customers_data
  FROM customers c
  WHERE c.organization_id = p_organization_id::uuid;

  -- تجميع النتيجة النهائية
  SELECT json_build_object(
    'organization_data', organization_data,
    'organization_settings', organization_settings_data,
    'pos_settings', pos_settings_data,
    'products_data', products_data,
    'product_categories', categories_data,
    'users_data', users_data,
    'customers_data', customers_data,
    'fetched_at', NOW(),
    'organization_id', p_organization_id
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'organization_id', p_organization_id,
      'fetched_at', NOW()
    );
END;
$$; 