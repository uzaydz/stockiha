-- إصلاح مشكلة حقل المدينة في وظيفة convert_landing_page_submission_to_order
-- هذا الملف يعالج خطأ "null value in column 'city' of relation 'addresses' violates not-null constraint"

CREATE OR REPLACE FUNCTION public.convert_landing_page_submission_to_order(submission_id uuid) 
RETURNS uuid 
LANGUAGE plpgsql SECURITY DEFINER AS 
$function$
DECLARE
  v_submission landing_page_submissions;
  v_order_id UUID;
  v_organization_id UUID;
  v_product_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_customer_address TEXT;
  v_customer_city TEXT; -- متغير جديد للمدينة
  v_customer_id UUID;
  v_order_item_id UUID;
  v_shipping_address_id UUID;
  v_total NUMERIC;
  v_product_name TEXT;
  v_product_slug TEXT; -- متغير جديد للسلاج
BEGIN
  -- استرجاع بيانات الطلب
  SELECT * INTO v_submission FROM landing_page_submissions WHERE id = submission_id;
  
  IF v_submission IS NULL THEN
    RAISE EXCEPTION 'لم يتم العثور على الطلب';
  END IF;
  
  -- استخراج البيانات الأساسية من الطلب
  v_organization_id := (v_submission.data->>'organization_id')::UUID;
  v_product_id := v_submission.product_id;
  v_customer_name := v_submission.data->>'fullName';
  v_customer_phone := v_submission.data->>'phone';
  v_customer_address := COALESCE(
    v_submission.data->>'street_address',
    CONCAT(
      v_submission.data->>'province', ', ',
      COALESCE(v_submission.data->>'municipality', ''), ' - ',
      COALESCE(v_submission.data->>'address', '')
    )
  );
  
  -- تحديد قيمة المدينة مع استخدام بدائل في حالة عدم وجود قيمة
  v_customer_city := COALESCE(
    v_submission.data->>'city',
    v_submission.data->>'municipality',
    v_submission.data->>'province',
    'غير محدد'
  );
  
  -- 1. إنشاء عميل ضيف إذا لم يكن موجوداً
  INSERT INTO guest_customers (
    name,
    phone,
    organization_id
  ) VALUES (
    v_customer_name,
    v_customer_phone,
    v_organization_id
  )
  RETURNING id INTO v_customer_id;
  
  -- 2. إنشاء عنوان شحن مع التأكد من وجود قيمة للمدينة
  INSERT INTO addresses (
    name,
    street_address,
    city, -- تحديد قيمة المدينة صراحةً
    state,
    country,
    phone,
    customer_id,
    organization_id
  ) VALUES (
    v_customer_name,
    v_customer_address,
    v_customer_city, -- استخدام المتغير الجديد للمدينة
    v_submission.data->>'province',
    'الجزائر',
    v_customer_phone,
    v_customer_id,
    v_organization_id
  )
  RETURNING id INTO v_shipping_address_id;
  
  -- الحصول على سعر المنتج وبياناته بأمان
  BEGIN
    SELECT price, name, slug INTO v_total, v_product_name, v_product_slug 
    FROM products 
    WHERE id = v_product_id;
  EXCEPTION WHEN OTHERS THEN
    -- في حالة حدوث خطأ، استخدم قيم افتراضية
    v_total := 0;
  END;
  
  -- استخدام قيم افتراضية إذا لم يتم الحصول على بيانات صالحة
  IF v_total IS NULL THEN
    v_total := 0;
  END IF;
  
  IF v_product_name IS NULL THEN
    v_product_name := 'منتج ' || v_product_id;
  END IF;
  
  IF v_product_slug IS NULL THEN
    v_product_slug := 'product-' || v_product_id;
  END IF;
  
  -- 3. إنشاء طلب جديد
  INSERT INTO online_orders (
    customer_id,
    subtotal,
    tax,
    discount,
    total,
    status,
    payment_method,
    payment_status,
    shipping_address_id,
    shipping_method,
    shipping_cost,
    notes,
    organization_id,
    created_from
  ) VALUES (
    v_customer_id,
    v_total,
    0,
    0,
    v_total,
    'pending',
    'cod', -- الدفع عند الاستلام
    'pending',
    v_shipping_address_id,
    COALESCE(v_submission.data->>'deliveryCompany', 'yalidine'),
    0,
    'تم إنشاؤه من صفحة هبوط: ' || (
      SELECT name FROM landing_pages WHERE id = v_submission.landing_page_id
    ),
    v_organization_id,
    'landing_page'
  )
  RETURNING id INTO v_order_id;
  
  -- 4. إنشاء عنصر الطلب مع التأكد من وجود القيم المطلوبة
  INSERT INTO online_order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    organization_id,
    slug,
    name -- إضافة حقل الاسم صراحة
  ) VALUES (
    v_order_id,
    v_product_id,
    v_product_name,
    1,
    v_total,
    v_total,
    v_organization_id,
    v_product_slug,
    v_product_name -- استخدام نفس قيمة اسم المنتج لحقل الاسم
  )
  RETURNING id INTO v_order_item_id;
  
  -- 5. تحديث حالة الطلب الأصلي إلى "تمت معالجته"
  UPDATE landing_page_submissions
  SET 
    is_processed = true,
    processed_at = now(),
    notes = 'تم تحويله إلى طلب رقم: ' || v_order_id::text
  WHERE id = submission_id;
  
  RETURN v_order_id;
END;
$function$
;

-- تحديث بيانات النموذج الحالية لإضافة قيمة للمدينة إن كانت فارغة
UPDATE landing_page_submissions
SET data = jsonb_set(
  data, 
  '{city}', 
  to_jsonb(
    COALESCE(
      data->>'city',
      data->>'municipality', 
      data->>'province', 
      'غير محدد'
    )
  )
)
WHERE data->>'city' IS NULL OR data->>'city' = ''; 