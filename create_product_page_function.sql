-- وظيفة جلب البيانات الكاملة للمنتج لصفحة الشراء
-- تجمع كل البيانات المطلوبة في استعلام واحد لتحسين الأداء
CREATE OR REPLACE FUNCTION public.get_complete_product_data(p_slug TEXT, p_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'product', product,
    'colors', colors,
    'sizes', sizes,
    'form_settings', form_settings
  )
  FROM (
    -- المنتج الأساسي مع كافة البيانات المطلوبة
    SELECT jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'price', p.price,
      'discount_price', p.compare_at_price,
      'stock_quantity', p.stock_quantity,
      'description', p.description,
      'short_description', SUBSTRING(p.description, 1, 150),
      'thumbnail_image', p.thumbnail_image,
      'has_fast_shipping', p.has_fast_shipping,
      'has_money_back', p.has_money_back,
      'has_quality_guarantee', p.has_quality_guarantee,
      'fast_shipping_text', p.fast_shipping_text,
      'money_back_text', p.money_back_text,
      'quality_guarantee_text', p.quality_guarantee_text,
      'purchase_page_config', p.purchase_page_config,
      'is_new', p.is_new,
      'is_featured', p.is_featured,
      'delivery_fee', 0, -- قيمة افتراضية لرسوم التوصيل
      'use_sizes', p.use_sizes,
      'additional_images', (
        SELECT jsonb_agg(pi.image_url ORDER BY pi.sort_order) 
        FROM product_images pi 
        WHERE pi.product_id = p.id
      ),
      'category', (
        SELECT jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        )
        FROM product_categories c 
        WHERE c.id = p.category_id
      )
    ) AS product,
    p.id as product_id
    FROM products p
    WHERE p.slug = p_slug 
      AND p.organization_id = p_org_id 
      AND p.is_active = true
  ) products,
  LATERAL (
    -- الألوان
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name, 
        'color_code', c.color_code,
        'image_url', c.image_url,
        'quantity', c.quantity,
        'price', c.price,
        'is_default', c.is_default,
        'barcode', c.barcode,
        'has_sizes', c.has_sizes,
        'product_id', c.product_id
      )
      ORDER BY c.is_default DESC, c.id
    ), '[]'::jsonb) as colors
    FROM product_colors c
    WHERE c.product_id = products.product_id
  ) colors,
  LATERAL (
    -- المقاسات لجميع الألوان
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'product_id', s.product_id,
        'color_id', s.color_id,
        'size_name', s.size_name,
        'quantity', s.quantity,
        'price', s.price,
        'barcode', s.barcode,
        'is_default', s.is_default
      )
      ORDER BY s.color_id, s.is_default DESC, s.id
    ), '[]'::jsonb) as sizes
    FROM product_sizes s
    WHERE s.product_id = products.product_id
  ) sizes,
  LATERAL (
    -- إعدادات النموذج للمنتج - استخدام طريقة مختلفة للترتيب
    SELECT COALESCE(jsonb_agg(form_data), '[]'::jsonb) as form_settings
    FROM (
      SELECT
        jsonb_build_object(
          'id', fs.id,
          'name', fs.name,
          'is_default', fs.is_default,
          'is_active', fs.is_active,
          'version', fs.version,
          'fields', fs.fields,
          'settings', fs.settings
        ) as form_data,
        -- استخدام هذا الترتيب داخل الاستعلام الفرعي
        CASE 
          WHEN fs.product_ids @> jsonb_build_array(products.product_id::text) THEN 0 
          ELSE 1 
        END as priority_order
      FROM form_settings fs
      WHERE fs.organization_id = p_org_id
        AND fs.is_active = true
        AND (
          (fs.product_ids IS NULL) OR
          (fs.product_ids @> jsonb_build_array(products.product_id::text)) OR
          (fs.is_default = true)
        )
      ORDER BY priority_order, fs.is_default DESC
      LIMIT 1
    ) subquery
  ) form_settings;
$$;

-- وظيفة لجلب بيانات الولايات الخاصة بشركة التوصيل ياليدين
CREATE OR REPLACE FUNCTION public.get_shipping_provinces(p_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', yp.id,
      'name', yp.name,
      'is_deliverable', yp.is_deliverable,
      'zone', yp.zone,
      'desk_fee', COALESCE((
        -- نحاول الحصول على رسوم المكتب من جدول yalidine_fees إذا كانت متوفرة
        SELECT MIN(stop_desk_fee)
        FROM yalidine_fees yf
        WHERE yf.organization_id = p_org_id
          AND yf.to_wilaya_id = yp.id
      ), 0)
    )
    ORDER BY yp.id
  ), '[]'::jsonb) as provinces
  FROM yalidine_provinces yp
  WHERE yp.organization_id = p_org_id
    AND yp.is_deliverable = true;
$$;

-- وظيفة لجلب بيانات البلديات في ولاية معينة
CREATE OR REPLACE FUNCTION public.get_shipping_municipalities(p_wilaya_id INT, p_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ym.id,
      'name', ym.name,
      'wilaya_id', ym.wilaya_id,
      'is_deliverable', ym.is_deliverable,
      'has_stop_desk', ym.has_stop_desk
    )
    ORDER BY ym.id
  ), '[]'::jsonb) as municipalities
  FROM yalidine_municipalities ym
  WHERE ym.organization_id = p_org_id
    AND ym.wilaya_id = p_wilaya_id
    AND ym.is_deliverable = true;
$$;

-- وظيفة لحساب سعر التوصيل
CREATE OR REPLACE FUNCTION public.calculate_shipping_fee(
  p_org_id UUID,
  p_to_wilaya_id INT,
  p_to_municipality_id INT,
  p_delivery_type TEXT,
  p_weight INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fee NUMERIC;
  v_from_wilaya_id INT;
BEGIN
  -- جلب ولاية المصدر من إعدادات المؤسسة
  SELECT COALESCE(origin_wilaya_id, 40)
  INTO v_from_wilaya_id
  FROM yalidine_settings_with_origin y
  WHERE y.organization_id = p_org_id;
  
  IF p_delivery_type = 'desk' THEN
    -- للتوصيل للمكتب، نستخدم رسوم المكتب من جدول yalidine_fees
    SELECT COALESCE(stop_desk_fee, 0) INTO v_fee
    FROM yalidine_fees yf
    WHERE yf.organization_id = p_org_id
      AND yf.from_wilaya_id = v_from_wilaya_id
      AND yf.to_wilaya_id = p_to_wilaya_id
      AND yf.commune_id = p_to_municipality_id;
  ELSE
    -- للتوصيل للمنزل، نستخدم رسوم المنزل
    SELECT COALESCE(home_fee, 0) INTO v_fee
    FROM yalidine_fees yf
    WHERE yf.organization_id = p_org_id
      AND yf.from_wilaya_id = v_from_wilaya_id
      AND yf.to_wilaya_id = p_to_wilaya_id
      AND yf.commune_id = p_to_municipality_id;
      
    -- زيادة الرسوم حسب الوزن (كل وحدة = 1 كجم)
    IF p_weight > 1 THEN
      v_fee := v_fee + ((p_weight - 1) * 100);
    END IF;
  END IF;
  
  RETURN COALESCE(v_fee, 0);
END;
$$;

-- إنشاء مؤشرات للتحسين
CREATE INDEX IF NOT EXISTS products_slug_organization_id_idx ON products(slug, organization_id);
CREATE INDEX IF NOT EXISTS product_colors_product_id_idx ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS product_sizes_product_id_idx ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS product_sizes_color_id_idx ON product_sizes(color_id);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id); 