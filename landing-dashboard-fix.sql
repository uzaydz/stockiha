-- ملف SQL لحل مشكلة عدم ظهور طلبات صفحات الهبوط (landing_page_submissions) في لوحة التحكم

------ الجزء الأول: تحليل المشكلة ------

-- 1. التحقق من وجود الطلب في قاعدة البيانات
SELECT * FROM landing_page_submissions WHERE id = 'a66657e9-a7c6-41b1-9a29-10a083e80faa';

-- 2. التحقق من جدول الطلبات الذي تستخدمه لوحة التحكم
SELECT * FROM online_orders LIMIT 1;

------ الجزء الثاني: حل المشكلة ------

-- الحل 1: إنشاء وظيفة RPC تحول طلبات صفحات الهبوط إلى طلبات في المتجر
CREATE OR REPLACE FUNCTION convert_landing_page_submission_to_order(
  submission_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission landing_page_submissions;
  v_order_id UUID;
  v_organization_id UUID;
  v_product_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_customer_address TEXT;
  v_customer_id UUID;
  v_order_item_id UUID;
  v_shipping_address_id UUID;
  v_total NUMERIC;
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
  
  -- 2. إنشاء عنوان شحن
  INSERT INTO addresses (
    name,
    street_address,
    state,
    country,
    phone,
    customer_id,
    organization_id
  ) VALUES (
    v_customer_name,
    v_customer_address,
    v_submission.data->>'province',
    'الجزائر',
    v_customer_phone,
    v_customer_id,
    v_organization_id
  )
  RETURNING id INTO v_shipping_address_id;
  
  -- الحصول على سعر المنتج
  SELECT price INTO v_total FROM products WHERE id = v_product_id;
  
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
  
  -- 4. إنشاء عنصر الطلب
  INSERT INTO online_order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price
  ) VALUES (
    v_order_id,
    v_product_id,
    (SELECT name FROM products WHERE id = v_product_id),
    1,
    v_total,
    v_total
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
$$;

-- منح صلاحيات استخدام الوظيفة للأدوار
GRANT EXECUTE ON FUNCTION convert_landing_page_submission_to_order TO authenticated;

-- الحل 2: إنشاء صفحة لعرض طلبات صفحات الهبوط مباشرة

-- 1. إضافة عمود جديد إلى جدول online_orders لتتبع مصدر الطلب (اختياري)
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS created_from VARCHAR(50) DEFAULT 'store';

-- 2. إنشاء view لعرض طلبات صفحات الهبوط
CREATE OR REPLACE VIEW landing_page_submissions_view AS
SELECT 
  lps.id,
  lps.landing_page_id,
  lps.form_id,
  lps.product_id,
  lps.is_processed,
  lps.processed_at,
  lps.created_at,
  lps.updated_at,
  lps.notes,
  lps.data,
  lp.name AS landing_page_name,
  lp.slug AS landing_page_slug,
  p.name AS product_name,
  p.price AS product_price,
  lp.organization_id
FROM 
  landing_page_submissions lps
JOIN 
  landing_pages lp ON lps.landing_page_id = lp.id
LEFT JOIN 
  products p ON lps.product_id = p.id;

-- 3. لا يمكن إضافة RLS على Views، بل نعتمد على RLS الموجود على الجداول الأساسية
-- تعديل سياسة RLS على جدول landing_page_submissions بدلاً من ذلك
DROP POLICY IF EXISTS "Organization members can view landing page submissions" ON landing_page_submissions;
CREATE POLICY "Organization members can view landing page submissions"
  ON landing_page_submissions
  FOR SELECT
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- الحل 3: إنشاء محفز (trigger) لتحويل طلبات صفحات الهبوط إلى طلبات متجر تلقائياً

-- 1. إنشاء وظيفة للمحفز
CREATE OR REPLACE FUNCTION auto_convert_landing_page_submission_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- استدعاء وظيفة التحويل لكل إدخال جديد
  PERFORM convert_landing_page_submission_to_order(NEW.id);
  
  RETURN NEW;
END;
$$;

-- 2. إنشاء المحفز على جدول landing_page_submissions
DROP TRIGGER IF EXISTS landing_page_submission_to_order_trigger ON landing_page_submissions;
CREATE TRIGGER landing_page_submission_to_order_trigger
AFTER INSERT ON landing_page_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_convert_landing_page_submission_to_order();

-- ملاحظات تنفيذية:
-- 1. يمكنك تعطيل المحفز إذا كنت تريد معالجة الطلبات يدوياً بدلاً من التحويل التلقائي:
--    ALTER TABLE landing_page_submissions DISABLE TRIGGER landing_page_submission_to_order_trigger;
-- 2. لتحويل الطلب الحالي يدوياً استخدم:
--    SELECT convert_landing_page_submission_to_order('a66657e9-a7c6-41b1-9a29-10a083e80faa'); 