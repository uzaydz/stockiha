-- إجراء مخزن معدل للاختبار
CREATE OR REPLACE FUNCTION process_online_order_test(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_address TEXT,
  p_delivery_company TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_product_size_id UUID,
  p_size_name TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_customer_order_number INTEGER := 1;
BEGIN
  -- 1. إنشاء عميل جديد
  INSERT INTO guest_customers (name, phone, organization_id)
  VALUES (p_full_name, p_phone, p_organization_id)
  RETURNING id INTO v_customer_id;
  
  -- 2. إنشاء عنوان جديد
  INSERT INTO addresses (
    customer_id,
    name,
    state,
    street_address,
    country,
    organization_id
  )
  VALUES (
    v_customer_id,
    p_full_name,
    p_province,
    p_address,
    'الجزائر',
    p_organization_id
  )
  RETURNING id INTO v_address_id;
  
  -- 3. اختبار للمخرجات
  RETURN jsonb_build_object(
    'status', 'success',
    'customer_id', v_customer_id,
    'address_id', v_address_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql; 