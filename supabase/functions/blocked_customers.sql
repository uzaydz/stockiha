-- دوال إدارة العملاء المحظورين

-- التحقق من الحظر
CREATE OR REPLACE FUNCTION is_phone_blocked(
  p_org_id UUID,
  p_phone TEXT
)
RETURNS TABLE(is_blocked BOOLEAN, reason TEXT, blocked_id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  v_norm := normalize_phone(p_phone);
  IF v_norm IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT TRUE, bc.reason, bc.id, bc.name
  FROM blocked_customers bc
  WHERE bc.organization_id = p_org_id
    AND bc.phone_normalized = v_norm
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$;

-- حظر عميل
CREATE OR REPLACE FUNCTION block_customer(
  p_org_id UUID,
  p_phone TEXT,
  p_name TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_id UUID;
BEGIN
  v_norm := normalize_phone(p_phone);
  IF v_norm IS NULL THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  INSERT INTO blocked_customers (organization_id, phone_raw, phone_normalized, name, reason, source)
  VALUES (p_org_id, p_phone, v_norm, p_name, p_reason, 'manual')
  ON CONFLICT (organization_id, phone_normalized)
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, blocked_customers.name),
    reason = COALESCE(EXCLUDED.reason, blocked_customers.reason),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- إلغاء الحظر بالمعرّف
CREATE OR REPLACE FUNCTION unblock_customer_by_id(
  p_org_id UUID,
  p_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM blocked_customers
  WHERE id = p_id AND organization_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- إلغاء الحظر بالهاتف
CREATE OR REPLACE FUNCTION unblock_customer(
  p_org_id UUID,
  p_phone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_count INT;
BEGIN
  v_norm := normalize_phone(p_phone);
  IF v_norm IS NULL THEN
    RETURN FALSE;
  END IF;
  DELETE FROM blocked_customers
  WHERE organization_id = p_org_id AND phone_normalized = v_norm;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- قائمة المحظورين مع بحث وترقيم بسيط
CREATE OR REPLACE FUNCTION list_blocked_customers(
  p_org_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  name TEXT,
  phone_raw TEXT,
  phone_normalized TEXT,
  reason TEXT,
  source TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT bc.id, bc.organization_id, bc.name, bc.phone_raw, bc.phone_normalized,
         bc.reason, bc.source, bc.created_by, bc.created_at, bc.updated_at
  FROM blocked_customers bc
  WHERE bc.organization_id = p_org_id
    AND (
      p_search IS NULL OR p_search = '' OR
      bc.phone_normalized ILIKE '%' || regexp_replace(p_search, '[^0-9]+', '', 'g') || '%'
      OR bc.phone_raw ILIKE '%' || p_search || '%'
      OR (bc.name IS NOT NULL AND bc.name ILIKE '%' || p_search || '%')
    )
  ORDER BY bc.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

