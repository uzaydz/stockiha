-- إضافة عمود productSlug إلى جدول آراء العملاء
ALTER TABLE customer_testimonials ADD COLUMN product_slug TEXT;

-- تحديث دالة إضافة رأي عميل جديد
CREATE OR REPLACE FUNCTION add_customer_testimonial(
  p_organization_id UUID,
  p_customer_name TEXT,
  p_customer_avatar TEXT,
  p_rating NUMERIC,
  p_comment TEXT,
  p_verified BOOLEAN,
  p_purchase_date TIMESTAMPTZ,
  p_product_name TEXT,
  p_product_image TEXT,
  p_product_slug TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_testimonial_id UUID;
BEGIN
  -- التحقق من وجود المؤسسة
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'المؤسسة غير موجودة';
  END IF;

  -- إدراج رأي العميل الجديد
  INSERT INTO customer_testimonials(
    organization_id,
    customer_name,
    customer_avatar,
    rating,
    comment,
    verified,
    purchase_date,
    product_name,
    product_image,
    product_slug,
    is_active
  )
  VALUES (
    p_organization_id,
    p_customer_name,
    p_customer_avatar,
    p_rating,
    p_comment,
    COALESCE(p_verified, FALSE),
    p_purchase_date,
    p_product_name,
    p_product_image,
    p_product_slug,
    TRUE
  )
  RETURNING id INTO v_testimonial_id;

  RETURN v_testimonial_id;
END;
$$;

-- تحديث دالة تحديث رأي عميل
CREATE OR REPLACE FUNCTION update_customer_testimonial(
  p_testimonial_id UUID,
  p_customer_name TEXT,
  p_customer_avatar TEXT,
  p_rating NUMERIC,
  p_comment TEXT,
  p_verified BOOLEAN,
  p_purchase_date TIMESTAMPTZ,
  p_product_name TEXT,
  p_product_image TEXT,
  p_product_slug TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من وجود رأي العميل
  IF NOT EXISTS (SELECT 1 FROM customer_testimonials WHERE id = p_testimonial_id) THEN
    RAISE EXCEPTION 'رأي العميل غير موجود';
  END IF;

  -- تحديث رأي العميل
  UPDATE customer_testimonials
  SET
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_avatar = p_customer_avatar,
    rating = COALESCE(p_rating, rating),
    comment = COALESCE(p_comment, comment),
    verified = COALESCE(p_verified, verified),
    purchase_date = p_purchase_date,
    product_name = p_product_name,
    product_image = p_product_image,
    product_slug = p_product_slug,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_testimonial_id;

  RETURN TRUE;
END;
$$;

-- تحديث دالة جلب آراء العملاء
CREATE OR REPLACE FUNCTION get_organization_testimonials(
  p_organization_id UUID,
  p_active_only BOOLEAN DEFAULT TRUE
) RETURNS SETOF customer_testimonials
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- جلب آراء العملاء للمؤسسة المحددة
  RETURN QUERY
  SELECT *
  FROM customer_testimonials
  WHERE organization_id = p_organization_id
    AND (NOT p_active_only OR is_active = TRUE)
  ORDER BY created_at DESC;
END;
$$;

-- إضافة تعليق للعمود الجديد
COMMENT ON COLUMN customer_testimonials.product_slug IS 'معرف URL للمنتج للانتقال مباشرة لصفحة المنتج'; 