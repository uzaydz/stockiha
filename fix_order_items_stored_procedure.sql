-- إنشاء وظيفة مخزنة في قاعدة البيانات للتعامل مع إضافة عناصر الطلب
CREATE OR REPLACE FUNCTION add_order_item(
  _id UUID,
  _order_id UUID,
  _product_id UUID,
  _product_name TEXT,
  _quantity INTEGER,
  _unit_price NUMERIC,
  _total_price NUMERIC,
  _is_digital BOOLEAN,
  _organization_id UUID,
  _name TEXT,
  _slug TEXT,
  _is_wholesale BOOLEAN DEFAULT false,
  _original_price NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  item_id UUID;
BEGIN
  -- التأكد من وجود حقل slug
  IF _slug IS NULL OR _slug = '' THEN
    _slug := 'item-' || _id::text;
  END IF;
  
  -- التأكد من وجود قيمة للاسم
  IF _name IS NULL OR _name = '' THEN
    _name := _product_name;
  END IF;
  
  -- إدراج العنصر
  INSERT INTO order_items (
    id, order_id, product_id, product_name, 
    quantity, unit_price, total_price, 
    is_digital, organization_id, 
    name, slug, is_wholesale, original_price
  ) VALUES (
    _id, _order_id, _product_id, _product_name,
    _quantity, _unit_price, _total_price,
    _is_digital, _organization_id,
    _name, _slug, _is_wholesale, _original_price
  )
  RETURNING id INTO item_id;
  
  RETURN item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 