-- RPC Function لتحديث الطلب والعناصر في استدعاء واحد
CREATE OR REPLACE FUNCTION update_order_complete(
  p_order_id UUID,
  p_organization_id UUID,
  p_order_data JSONB,
  p_form_data JSONB,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  updated_rows INTEGER;
BEGIN
  -- التحقق من وجود الطلب
  IF NOT EXISTS (
    SELECT 1 FROM online_orders 
    WHERE id = p_order_id AND organization_id = p_organization_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or access denied'
    );
  END IF;

  -- 1. تحديث بيانات الطلب
  UPDATE online_orders 
  SET 
    shipping_cost = (p_order_data->>'shipping_cost')::DECIMAL,
    subtotal = (p_order_data->>'subtotal')::DECIMAL,
    discount = (p_order_data->>'discount')::DECIMAL,
    total = (p_order_data->>'total')::DECIMAL,
    form_data = p_form_data,
    updated_at = NOW()
  WHERE id = p_order_id AND organization_id = p_organization_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update order'
    );
  END IF;

  -- 2. حذف العناصر القديمة
  DELETE FROM online_order_items 
  WHERE order_id = p_order_id;

  -- 3. إضافة العناصر الجديدة (إذا كانت موجودة)
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO online_order_items (
      order_id, product_id, product_name, name, quantity, 
      unit_price, total_price, color_id, color_name, 
      size_id, size_name, organization_id, slug
    )
    SELECT 
      p_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      item->>'product_name',
      (item->>'quantity')::INTEGER,
      (item->>'unit_price')::DECIMAL,
      (item->>'total_price')::DECIMAL,
      CASE 
        WHEN item->>'color_id' IS NOT NULL AND item->>'color_id' != 'null' 
        THEN (item->>'color_id')::UUID 
        ELSE NULL 
      END,
      CASE 
        WHEN item->>'color_name' IS NOT NULL AND item->>'color_name' != 'null' 
        THEN item->>'color_name' 
        ELSE NULL 
      END,
      CASE 
        WHEN item->>'size_id' IS NOT NULL AND item->>'size_id' != 'null' 
        THEN (item->>'size_id')::UUID 
        ELSE NULL 
      END,
      CASE 
        WHEN item->>'size_name' IS NOT NULL AND item->>'size_name' != 'null' 
        THEN item->>'size_name' 
        ELSE NULL 
      END,
      p_organization_id,
      COALESCE(
        LOWER(REPLACE(COALESCE(item->>'product_name', ''), ' ', '-')), 
        'product-' || COALESCE(item->>'product_id', 'unknown')
      )
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  -- 4. إرجاع النتيجة الناجحة
  SELECT jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'updated_at', NOW(),
    'items_count', COALESCE(jsonb_array_length(p_items), 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION update_order_complete IS 'تحديث شامل للطلب والعناصر في استدعاء واحد محسن';
