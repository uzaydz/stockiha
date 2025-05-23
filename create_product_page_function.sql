-- وظيفة جلب البيانات الكاملة للمنتج لصفحة الشراء
-- تجمع كل البيانات المطلوبة في استعلام واحد لتحسين الأداء
CREATE OR REPLACE FUNCTION public.get_complete_product_data(p_slug TEXT, p_org_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'product', product_details.product_data,
    'colors', product_details.colors_data,
    'sizes', product_details.sizes_data,
    'form_settings', product_details.form_settings_data,
    'marketing_settings', product_details.marketing_settings_data,
    'reviews', product_details.reviews_data
  )
  FROM (
    SELECT
      p.id as product_id,
      p.form_template_id,
      p.organization_id as org_id_for_forms,
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'slug', p.slug,
        'price', p.price,
        'compare_at_price', p.compare_at_price,
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
        'delivery_fee', 0,
        'use_sizes', p.use_sizes,
        'has_variants', p.has_variants,
        'form_template_id', p.form_template_id,
        'organization_id', p.organization_id,
        'additional_images', (
          SELECT COALESCE(jsonb_agg(pi.image_url ORDER BY pi.sort_order), '[]'::jsonb)
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
        ),
        'subcategory', (
          SELECT jsonb_build_object(
            'id', sc.id,
            'name', sc.name,
            'slug', sc.slug
          )
          FROM product_subcategories sc
          WHERE sc.id = p.subcategory_id
        )
      ) AS product_data,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pc.id,
            'name', pc.name,
            'color_code', pc.color_code,
            'image_url', pc.image_url,
            'quantity', pc.quantity,
            'price', pc.price,
            'is_default', pc.is_default,
            'barcode', pc.barcode,
            'has_sizes', pc.has_sizes,
            'product_id', pc.product_id
          )
          ORDER BY pc.is_default DESC, pc.id
        ), '[]'::jsonb)
        FROM product_colors pc
        WHERE pc.product_id = p.id
      ) AS colors_data,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', ps.id,
            'product_id', ps.product_id,
            'color_id', ps.color_id,
            'size_name', ps.size_name,
            'quantity', ps.quantity,
            'price', ps.price,
            'barcode', ps.barcode,
            'is_default', ps.is_default
          )
          ORDER BY ps.color_id, ps.is_default DESC, ps.id
        ), '[]'::jsonb)
        FROM product_sizes ps
        WHERE ps.product_id = p.id
      ) AS sizes_data,
      (
        SELECT jsonb_build_object(
            'id', pms.id,
            'product_id', pms.product_id,
            'organization_id', pms.organization_id,

            'offer_timer_enabled', pms.offer_timer_enabled,
            'offer_timer_title', pms.offer_timer_title,
            'offer_timer_type', pms.offer_timer_type,
            'offer_timer_duration_minutes', pms.offer_timer_duration_minutes,
            'offer_timer_end_date', pms.offer_timer_end_date,
            'offer_timer_text_above', pms.offer_timer_text_above,
            'offer_timer_text_below', pms.offer_timer_text_below,
            'offer_timer_display_style', pms.offer_timer_display_style,
            'offer_timer_end_action', pms.offer_timer_end_action,
            'offer_timer_end_action_url', pms.offer_timer_end_action_url,
            'offer_timer_end_action_message', pms.offer_timer_end_action_message,
            'offer_timer_restart_for_new_session', pms.offer_timer_restart_for_new_session,
            'offer_timer_cookie_duration_days', pms.offer_timer_cookie_duration_days,
            'offer_timer_show_on_specific_pages_only', pms.offer_timer_show_on_specific_pages_only,
            'offer_timer_specific_page_urls', pms.offer_timer_specific_page_urls,

            'enable_reviews', pms.enable_reviews,
            'reviews_verify_purchase', pms.reviews_verify_purchase,
            'reviews_auto_approve', pms.reviews_auto_approve,
            'allow_images_in_reviews', pms.allow_images_in_reviews,
            'enable_review_replies', pms.enable_review_replies,
            'review_display_style', pms.review_display_style,
            'enable_fake_star_ratings', pms.enable_fake_star_ratings,
            'fake_star_rating_value', pms.fake_star_rating_value,
            'fake_star_rating_count', pms.fake_star_rating_count,
            'enable_fake_purchase_counter', pms.enable_fake_purchase_counter,
            'fake_purchase_count', pms.fake_purchase_count,

            'enable_facebook_pixel', pms.enable_facebook_pixel,
            'facebook_pixel_id', pms.facebook_pixel_id,
            'enable_tiktok_pixel', pms.enable_tiktok_pixel,
            'tiktok_pixel_id', pms.tiktok_pixel_id,
            'enable_snapchat_pixel', pms.enable_snapchat_pixel,
            'snapchat_pixel_id', pms.snapchat_pixel_id,
            'enable_google_ads_tracking', pms.enable_google_ads_tracking,
            'google_ads_conversion_id', pms.google_ads_conversion_id,

            'created_at', pms.created_at,
            'updated_at', pms.updated_at
        )
        FROM product_marketing_settings pms
        WHERE pms.product_id = p.id AND pms.organization_id = p_org_id
        LIMIT 1
      ) AS marketing_settings_data,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'product_id', pr.product_id,
            'user_id', pr.user_id,
            'rating', pr.rating,
            'comment', pr.comment,
            'images', pr.images,
            'is_verified_purchase', pr.is_verified_purchase,
            'is_approved', pr.is_approved,
            'admin_reply_text', pr.admin_reply_text,
            'created_at', pr.created_at
          )
          ORDER BY pr.created_at DESC
        ), '[]'::jsonb)
        FROM product_reviews pr
        WHERE pr.product_id = p.id AND pr.is_approved = true
      ) AS reviews_data,
      (
        SELECT fs_data.form_object
        FROM (
            SELECT
                jsonb_build_object(
                    'id', fs.id,
                    'name', fs.name,
                    'is_default', fs.is_default,
                    'is_active', fs.is_active,
                    'version', fs.version,
                    'fields', fs.fields,
                    'settings', fs.settings,
                    'organization_id', fs.organization_id
                ) as form_object,
                CASE
                    WHEN fs.id = p.form_template_id THEN 0
                    WHEN fs.is_default = true THEN 1
                    ELSE 2
                END as priority_order
            FROM form_settings fs
            WHERE fs.organization_id = p.organization_id
              AND fs.is_active = true
              AND fs.deleted_at IS NULL
              AND (fs.id = p.form_template_id OR fs.is_default = true)
            ORDER BY priority_order ASC, fs.updated_at DESC
            LIMIT 1
        ) fs_data
      ) AS form_settings_data
    FROM products p
    WHERE p.slug = p_slug
      AND p.organization_id = p_org_id
      AND p.is_active = true
    LIMIT 1
  ) product_details;
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
  SELECT COALESCE(origin_wilaya_id, 40)
  INTO v_from_wilaya_id
  FROM yalidine_settings_with_origin y
  WHERE y.organization_id = p_org_id;
  
  IF p_delivery_type = 'desk' THEN
    SELECT COALESCE(stop_desk_fee, 0) INTO v_fee
    FROM yalidine_fees yf
    WHERE yf.organization_id = p_org_id
      AND yf.from_wilaya_id = v_from_wilaya_id
      AND yf.to_wilaya_id = p_to_wilaya_id
      AND yf.commune_id = p_to_municipality_id;
  ELSE
    SELECT COALESCE(home_fee, 0) INTO v_fee
    FROM yalidine_fees yf
    WHERE yf.organization_id = p_org_id
      AND yf.from_wilaya_id = v_from_wilaya_id
      AND yf.to_wilaya_id = p_to_wilaya_id
      AND yf.commune_id = p_to_municipality_id;
      
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
CREATE INDEX IF NOT EXISTS product_marketing_settings_product_id_idx ON product_marketing_settings(product_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_id_is_approved_idx ON product_reviews(product_id, is_approved); 