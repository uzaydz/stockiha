-- إنشاء وظيفة RPC لإدراج عناصر الطلب بشكل آمن
CREATE OR REPLACE FUNCTION insert_order_items_safe(items_json JSONB)
RETURNS VOID AS $$
DECLARE
  item_record JSONB;
  item_id UUID;
  item_slug TEXT;
BEGIN
  -- التعامل مع كل عنصر في المصفوفة
  FOR item_record IN SELECT jsonb_array_elements(items_json)
  LOOP
    -- استخراج معرف العنصر
    item_id := (item_record->>'id')::UUID;
    
    -- التأكد من وجود حقل slug
    IF item_record->>'slug' IS NULL OR item_record->>'slug' = '' THEN
      item_slug := 'item-' || item_id::text;
    ELSE
      item_slug := item_record->>'slug';
    END IF;
    
    -- إدراج العنصر في جدول order_items بشكل آمن
    INSERT INTO order_items (
      id, 
      order_id, 
      product_id, 
      product_name, 
      quantity, 
      unit_price, 
      total_price, 
      is_digital, 
      organization_id, 
      name, 
      slug, 
      is_wholesale, 
      original_price
    ) VALUES (
      item_id,
      (item_record->>'order_id')::UUID,
      (item_record->>'product_id')::UUID,
      item_record->>'product_name',
      (item_record->>'quantity')::INTEGER,
      (item_record->>'unit_price')::NUMERIC,
      (item_record->>'total_price')::NUMERIC,
      (item_record->>'is_digital')::BOOLEAN,
      (item_record->>'organization_id')::UUID,
      item_record->>'name',
      item_slug,
      COALESCE((item_record->>'is_wholesale')::BOOLEAN, FALSE),
      (item_record->>'original_price')::NUMERIC
    );
    
    -- السجل في التصحيح
    RAISE NOTICE 'تم إدراج عنصر الطلب بنجاح: %', item_id;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 