-- إنشاء دالة معالجة طلب سلة متعددة العناصر
CREATE OR REPLACE FUNCTION process_cart_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_municipality TEXT,
  p_organization_id UUID,
  p_address TEXT DEFAULT '',
  p_city TEXT DEFAULT NULL,
  p_delivery_company TEXT DEFAULT 'yalidine',
  p_delivery_option TEXT DEFAULT 'home',
  p_payment_method TEXT DEFAULT 'cod',
  p_notes TEXT DEFAULT '',
  p_delivery_fee NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_form_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_stop_desk_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_customer_order_number INTEGER;
  v_org_settings JSONB;
  v_auto_deduct_inventory BOOLEAN := FALSE;
  v_subtotal NUMERIC := 0;
  v_it JSONB;
  v_pid UUID;
  v_qty INTEGER;
  v_unit NUMERIC;
  v_size_id UUID;
  v_size_name TEXT;
  v_color_id UUID;
  v_product_name TEXT;
  v_product_slug TEXT;
  v_color_name TEXT;
BEGIN
  IF p_full_name IS NULL OR p_phone IS NULL OR p_province IS NULL OR p_municipality IS NULL OR p_organization_id IS NULL THEN
    RETURN jsonb_build_object('status','error','error','missing_required_fields');
  END IF;

  -- حساب المجموع الفرعي
  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + COALESCE( (v_it->>'unit_price')::NUMERIC, 0) * COALESCE( (v_it->>'quantity')::INT, 1);
  END LOOP;

  -- عميل
  SELECT id INTO v_customer_id FROM guest_customers WHERE phone = p_phone AND organization_id = p_organization_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO guest_customers(name, phone, organization_id) VALUES (p_full_name, p_phone, p_organization_id) RETURNING id INTO v_customer_id;
  ELSE
    UPDATE guest_customers SET name = p_full_name WHERE id = v_customer_id;
  END IF;

  -- عنوان
  INSERT INTO addresses (customer_id, name, state, municipality, street_address, city, country, organization_id)
  VALUES (v_customer_id, p_full_name, p_province, p_municipality, COALESCE(p_address,'غير محدد'), COALESCE(p_city,p_municipality), 'الجزائر', p_organization_id)
  RETURNING id INTO v_address_id;

  -- رقم الطلب المتسلسل داخل المؤسسة
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 INTO v_customer_order_number FROM online_orders WHERE organization_id = p_organization_id;

  -- الطلب
  INSERT INTO online_orders(
    customer_id, subtotal, tax, discount, total, status, payment_method, payment_status,
    shipping_address_id, shipping_method, shipping_cost, notes, organization_id, customer_order_number,
    form_data, metadata, stop_desk_id
  ) VALUES (
    v_customer_id,
    v_subtotal,
    0,
    0,
    v_subtotal + COALESCE(p_delivery_fee,0),
    'pending',
    COALESCE(p_payment_method,'cod'),
    'pending',
    v_address_id,
    COALESCE(p_delivery_company,''),
    COALESCE(p_delivery_fee,0),
    p_notes,
    p_organization_id,
    v_customer_order_number,
    p_form_data,
    p_metadata,
    p_stop_desk_id
  ) RETURNING id INTO v_order_id;

  -- عناصر الطلب + خصم المخزون
  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := (v_it->>'product_id')::UUID;
    v_qty := COALESCE((v_it->>'quantity')::INT, 1);
    v_unit := COALESCE((v_it->>'unit_price')::NUMERIC, 0);
    v_size_id := NULLIF(v_it->>'size_id','')::UUID;
    v_size_name := NULLIF(v_it->>'size_name','');
    v_color_id := NULLIF(v_it->>'color_id','')::UUID;

    SELECT name, slug INTO v_product_name, v_product_slug FROM products WHERE id = v_pid;
    IF v_color_id IS NOT NULL THEN SELECT name INTO v_color_name FROM product_colors WHERE id = v_color_id; END IF;

    INSERT INTO online_order_items(
      order_id, product_id, product_name, name, slug, quantity, unit_price, total_price, organization_id,
      color_id, color_name, size_id, size_name, selected_price
    ) VALUES (
      v_order_id, v_pid, v_product_name, v_product_name, COALESCE(v_product_slug, 'product-'||v_pid::text),
      v_qty, v_unit, v_unit * v_qty, p_organization_id,
      v_color_id, v_color_name, v_size_id, v_size_name, v_unit
    );
  END LOOP;

  -- إعداد خصم المخزون التلقائي
  SELECT custom_js::jsonb INTO v_org_settings FROM organization_settings WHERE organization_id = p_organization_id;
  IF v_org_settings IS NOT NULL THEN v_auto_deduct_inventory := COALESCE((v_org_settings->>'auto_deduct_inventory')::BOOLEAN, FALSE); END IF;

  IF v_auto_deduct_inventory THEN
    FOR v_it IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_pid := (v_it->>'product_id')::UUID;
      v_qty := COALESCE((v_it->>'quantity')::INT, 1);
      v_size_id := NULLIF(v_it->>'size_id','')::UUID;
      v_color_id := NULLIF(v_it->>'color_id','')::UUID;

      IF v_size_id IS NOT NULL THEN
        PERFORM bypass_rls_update_product_size_quantity(v_size_id, v_qty);
      ELSIF v_color_id IS NOT NULL THEN
        PERFORM bypass_rls_update_product_color_quantity(v_color_id, v_qty);
      ELSE
        PERFORM bypass_rls_update_product_stock(v_pid, v_qty);
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('status','success','order_id', v_order_id, 'order_number', v_customer_order_number);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','error','error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_cart_order_new(TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,JSONB,JSONB,JSONB,UUID) TO anon;
GRANT EXECUTE ON FUNCTION process_cart_order_new(TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC,JSONB,JSONB,JSONB,UUID) TO authenticated;
