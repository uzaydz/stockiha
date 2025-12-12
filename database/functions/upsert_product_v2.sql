-- ================================================
-- دالة upsert_product_v2 - إنشاء/تحديث المنتج مع دعم كامل للتتبع المتقدم
-- ================================================
-- تدعم: Serial Numbers, Batches, Expiry, Warranty, Weight/Box/Meter selling
-- ================================================

DROP FUNCTION IF EXISTS upsert_product_v2(
  UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, UUID
);

CREATE OR REPLACE FUNCTION upsert_product_v2(
  p_product_id UUID DEFAULT NULL,
  p_basic_data JSONB DEFAULT '{}',
  p_pricing_data JSONB DEFAULT '{}',
  p_inventory_data JSONB DEFAULT '{}',
  p_weight_selling JSONB DEFAULT NULL,
  p_box_selling JSONB DEFAULT NULL,
  p_meter_selling JSONB DEFAULT NULL,
  p_expiry_tracking JSONB DEFAULT NULL,
  p_serial_tracking JSONB DEFAULT NULL,
  p_warranty JSONB DEFAULT NULL,
  p_batch_tracking JSONB DEFAULT NULL,
  p_variants JSONB DEFAULT NULL,
  p_initial_batches JSONB DEFAULT NULL,
  p_initial_serials JSONB DEFAULT NULL,
  p_price_tiers JSONB DEFAULT NULL,
  p_images JSONB DEFAULT NULL,
  p_business_specific JSONB DEFAULT NULL,
  p_advanced_settings JSONB DEFAULT NULL,
  p_marketing_settings JSONB DEFAULT NULL,
  p_special_offers JSONB DEFAULT NULL,
  p_advanced_description JSONB DEFAULT NULL,
  p_publication JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID;
  v_organization_id UUID;
  v_is_update BOOLEAN := FALSE;
  v_total_stock INTEGER := 0;
  v_color_record RECORD;
  v_color_id UUID;
  v_size_record RECORD;
  v_tier_record RECORD;
  v_batch_record RECORD;
  v_serial_record RECORD;
  v_image_record RECORD;
  v_sort_order INTEGER := 0;
  v_result JSONB;
  v_slug TEXT;
  v_publication_status TEXT;
  v_publish_at TIMESTAMPTZ;
BEGIN
  -- تحديد نوع العملية (إنشاء أو تحديث)
  IF p_product_id IS NOT NULL THEN
    v_is_update := TRUE;
    v_product_id := p_product_id;

    -- التحقق من وجود المنتج
    SELECT organization_id INTO v_organization_id
    FROM products WHERE id = p_product_id;

    IF v_organization_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'المنتج غير موجود'
      );
    END IF;
  ELSE
    v_product_id := gen_random_uuid();
    v_organization_id := (p_basic_data->>'organization_id')::UUID;

    IF v_organization_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'معرف المؤسسة مطلوب'
      );
    END IF;
  END IF;

  -- إعداد الـ slug
  v_slug := COALESCE(
    p_basic_data->>'slug',
    LOWER(REPLACE(COALESCE(p_basic_data->>'name', 'product'), ' ', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  -- إعداد حالة النشر
  v_publication_status := COALESCE(
    p_publication->>'status',
    'published'
  );
  IF p_publication ? 'publish_at' AND (p_publication->>'publish_at') IS NOT NULL THEN
    v_publish_at := (p_publication->>'publish_at')::TIMESTAMPTZ;
  END IF;

  BEGIN
    -- =====================================================
    -- إنشاء أو تحديث المنتج الرئيسي
    -- =====================================================
    IF v_is_update THEN
      UPDATE products SET
        name = COALESCE(p_basic_data->>'name', name),
        description = COALESCE(p_basic_data->>'description', description),
        sku = COALESCE(p_basic_data->>'sku', sku),
        barcode = COALESCE(p_basic_data->>'barcode', barcode),
        category_id = COALESCE((p_basic_data->>'category_id')::UUID, category_id),
        subcategory_id = CASE
          WHEN p_basic_data ? 'subcategory_id' THEN (p_basic_data->>'subcategory_id')::UUID
          ELSE subcategory_id
        END,
        brand = COALESCE(p_basic_data->>'brand', brand),
        slug = COALESCE(p_basic_data->>'slug', slug),
        -- التسعير
        price = COALESCE((p_pricing_data->>'price')::NUMERIC, price),
        purchase_price = COALESCE((p_pricing_data->>'purchase_price')::NUMERIC, purchase_price),
        compare_at_price = CASE WHEN p_pricing_data ? 'compare_at_price' THEN (p_pricing_data->>'compare_at_price')::NUMERIC ELSE compare_at_price END,
        wholesale_price = CASE WHEN p_pricing_data ? 'wholesale_price' THEN (p_pricing_data->>'wholesale_price')::NUMERIC ELSE wholesale_price END,
        partial_wholesale_price = CASE WHEN p_pricing_data ? 'partial_wholesale_price' THEN (p_pricing_data->>'partial_wholesale_price')::NUMERIC ELSE partial_wholesale_price END,
        min_wholesale_quantity = CASE WHEN p_pricing_data ? 'min_wholesale_quantity' THEN (p_pricing_data->>'min_wholesale_quantity')::INTEGER ELSE min_wholesale_quantity END,
        min_partial_wholesale_quantity = CASE WHEN p_pricing_data ? 'min_partial_wholesale_quantity' THEN (p_pricing_data->>'min_partial_wholesale_quantity')::INTEGER ELSE min_partial_wholesale_quantity END,
        allow_retail = COALESCE((p_pricing_data->>'allow_retail')::BOOLEAN, allow_retail),
        allow_wholesale = COALESCE((p_pricing_data->>'allow_wholesale')::BOOLEAN, allow_wholesale),
        allow_partial_wholesale = COALESCE((p_pricing_data->>'allow_partial_wholesale')::BOOLEAN, allow_partial_wholesale),
        -- المخزون
        stock_quantity = COALESCE((p_inventory_data->>'stock_quantity')::INTEGER, stock_quantity),
        min_stock_level = COALESCE((p_inventory_data->>'min_stock_level')::INTEGER, min_stock_level),
        -- البيع بالوزن
        sell_by_weight = COALESCE((p_weight_selling->>'enabled')::BOOLEAN, sell_by_weight),
        weight_unit = COALESCE(p_weight_selling->>'weight_unit', weight_unit),
        price_per_weight_unit = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'price_per_unit')::NUMERIC ELSE price_per_weight_unit END,
        purchase_price_per_weight_unit = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'purchase_price_per_unit')::NUMERIC ELSE purchase_price_per_weight_unit END,
        min_weight = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'min_weight')::NUMERIC ELSE min_weight END,
        max_weight = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'max_weight')::NUMERIC ELSE max_weight END,
        average_item_weight = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'average_item_weight')::NUMERIC ELSE average_item_weight END,
        available_weight = CASE WHEN p_weight_selling IS NOT NULL THEN (p_weight_selling->>'available_weight')::NUMERIC ELSE available_weight END,
        -- البيع بالكرتون
        sell_by_box = COALESCE((p_box_selling->>'enabled')::BOOLEAN, sell_by_box),
        units_per_box = CASE WHEN p_box_selling IS NOT NULL THEN (p_box_selling->>'units_per_box')::INTEGER ELSE units_per_box END,
        box_price = CASE WHEN p_box_selling IS NOT NULL THEN (p_box_selling->>'box_price')::NUMERIC ELSE box_price END,
        box_purchase_price = CASE WHEN p_box_selling IS NOT NULL THEN (p_box_selling->>'box_purchase_price')::NUMERIC ELSE box_purchase_price END,
        box_barcode = CASE WHEN p_box_selling IS NOT NULL THEN p_box_selling->>'box_barcode' ELSE box_barcode END,
        allow_single_unit_sale = COALESCE((p_box_selling->>'allow_single_unit_sale')::BOOLEAN, allow_single_unit_sale),
        available_boxes = CASE WHEN p_box_selling IS NOT NULL THEN (p_box_selling->>'available_boxes')::INTEGER ELSE available_boxes END,
        -- البيع بالمتر
        sell_by_meter = COALESCE((p_meter_selling->>'enabled')::BOOLEAN, sell_by_meter),
        meter_unit = COALESCE(p_meter_selling->>'meter_unit', meter_unit),
        price_per_meter = CASE WHEN p_meter_selling IS NOT NULL THEN (p_meter_selling->>'price_per_meter')::NUMERIC ELSE price_per_meter END,
        purchase_price_per_meter = CASE WHEN p_meter_selling IS NOT NULL THEN (p_meter_selling->>'purchase_price_per_meter')::NUMERIC ELSE purchase_price_per_meter END,
        min_meters = CASE WHEN p_meter_selling IS NOT NULL THEN (p_meter_selling->>'min_meters')::NUMERIC ELSE min_meters END,
        roll_length = CASE WHEN p_meter_selling IS NOT NULL THEN (p_meter_selling->>'roll_length')::NUMERIC ELSE roll_length END,
        available_length = CASE WHEN p_meter_selling IS NOT NULL THEN (p_meter_selling->>'available_length')::NUMERIC ELSE available_length END,
        -- تتبع الصلاحية
        track_expiry = COALESCE((p_expiry_tracking->>'enabled')::BOOLEAN, track_expiry),
        default_expiry_days = CASE WHEN p_expiry_tracking IS NOT NULL THEN (p_expiry_tracking->>'default_expiry_days')::INTEGER ELSE default_expiry_days END,
        expiry_alert_days = CASE WHEN p_expiry_tracking IS NOT NULL THEN (p_expiry_tracking->>'alert_days_before')::INTEGER ELSE expiry_alert_days END,
        -- تتبع الأرقام التسلسلية
        track_serial_numbers = COALESCE((p_serial_tracking->>'enabled')::BOOLEAN, track_serial_numbers),
        require_serial_on_sale = COALESCE((p_serial_tracking->>'require_on_sale')::BOOLEAN, require_serial_on_sale),
        supports_imei = COALESCE((p_serial_tracking->>'supports_imei')::BOOLEAN, supports_imei),
        -- الضمان
        has_warranty = COALESCE((p_warranty->>'enabled')::BOOLEAN, has_warranty),
        warranty_duration_months = CASE WHEN p_warranty IS NOT NULL THEN (p_warranty->>'duration_months')::INTEGER ELSE warranty_duration_months END,
        warranty_type = CASE WHEN p_warranty IS NOT NULL THEN p_warranty->>'type' ELSE warranty_type END,
        -- تتبع الدفعات
        track_batches = COALESCE((p_batch_tracking->>'enabled')::BOOLEAN, track_batches),
        use_fifo = COALESCE((p_batch_tracking->>'use_fifo')::BOOLEAN, use_fifo),
        -- النشر
        publication_status = v_publication_status,
        publish_at = v_publish_at,
        -- تحديث التوقيت
        updated_at = NOW(),
        updated_by_user_id = p_user_id
      WHERE id = v_product_id;
    ELSE
      -- إنشاء منتج جديد
      INSERT INTO products (
        id,
        organization_id,
        name,
        description,
        sku,
        barcode,
        category_id,
        subcategory_id,
        brand,
        slug,
        price,
        purchase_price,
        compare_at_price,
        wholesale_price,
        partial_wholesale_price,
        min_wholesale_quantity,
        min_partial_wholesale_quantity,
        allow_retail,
        allow_wholesale,
        allow_partial_wholesale,
        stock_quantity,
        min_stock_level,
        -- البيع بالوزن
        sell_by_weight,
        weight_unit,
        price_per_weight_unit,
        purchase_price_per_weight_unit,
        min_weight,
        max_weight,
        average_item_weight,
        available_weight,
        -- البيع بالكرتون
        sell_by_box,
        units_per_box,
        box_price,
        box_purchase_price,
        box_barcode,
        allow_single_unit_sale,
        available_boxes,
        -- البيع بالمتر
        sell_by_meter,
        meter_unit,
        price_per_meter,
        purchase_price_per_meter,
        min_meters,
        roll_length,
        available_length,
        -- تتبع الصلاحية
        track_expiry,
        default_expiry_days,
        expiry_alert_days,
        -- تتبع الأرقام التسلسلية
        track_serial_numbers,
        require_serial_on_sale,
        supports_imei,
        -- الضمان
        has_warranty,
        warranty_duration_months,
        warranty_type,
        -- تتبع الدفعات
        track_batches,
        use_fifo,
        -- النشر
        publication_status,
        publish_at,
        published_at,
        is_active,
        -- التتبع
        created_at,
        updated_at,
        created_by_user_id,
        updated_by_user_id
      ) VALUES (
        v_product_id,
        v_organization_id,
        COALESCE(p_basic_data->>'name', 'منتج جديد'),
        COALESCE(p_basic_data->>'description', ''),
        p_basic_data->>'sku',
        p_basic_data->>'barcode',
        (p_basic_data->>'category_id')::UUID,
        (p_basic_data->>'subcategory_id')::UUID,
        p_basic_data->>'brand',
        v_slug,
        COALESCE((p_pricing_data->>'price')::NUMERIC, 0),
        (p_pricing_data->>'purchase_price')::NUMERIC,
        (p_pricing_data->>'compare_at_price')::NUMERIC,
        (p_pricing_data->>'wholesale_price')::NUMERIC,
        (p_pricing_data->>'partial_wholesale_price')::NUMERIC,
        (p_pricing_data->>'min_wholesale_quantity')::INTEGER,
        (p_pricing_data->>'min_partial_wholesale_quantity')::INTEGER,
        COALESCE((p_pricing_data->>'allow_retail')::BOOLEAN, TRUE),
        COALESCE((p_pricing_data->>'allow_wholesale')::BOOLEAN, FALSE),
        COALESCE((p_pricing_data->>'allow_partial_wholesale')::BOOLEAN, FALSE),
        COALESCE((p_inventory_data->>'stock_quantity')::INTEGER, 0),
        COALESCE((p_inventory_data->>'min_stock_level')::INTEGER, 5),
        -- البيع بالوزن
        COALESCE((p_weight_selling->>'enabled')::BOOLEAN, FALSE),
        COALESCE(p_weight_selling->>'weight_unit', 'kg'),
        (p_weight_selling->>'price_per_unit')::NUMERIC,
        (p_weight_selling->>'purchase_price_per_unit')::NUMERIC,
        (p_weight_selling->>'min_weight')::NUMERIC,
        (p_weight_selling->>'max_weight')::NUMERIC,
        (p_weight_selling->>'average_item_weight')::NUMERIC,
        (p_weight_selling->>'available_weight')::NUMERIC,
        -- البيع بالكرتون
        COALESCE((p_box_selling->>'enabled')::BOOLEAN, FALSE),
        (p_box_selling->>'units_per_box')::INTEGER,
        (p_box_selling->>'box_price')::NUMERIC,
        (p_box_selling->>'box_purchase_price')::NUMERIC,
        p_box_selling->>'box_barcode',
        COALESCE((p_box_selling->>'allow_single_unit_sale')::BOOLEAN, TRUE),
        (p_box_selling->>'available_boxes')::INTEGER,
        -- البيع بالمتر
        COALESCE((p_meter_selling->>'enabled')::BOOLEAN, FALSE),
        COALESCE(p_meter_selling->>'meter_unit', 'm'),
        (p_meter_selling->>'price_per_meter')::NUMERIC,
        (p_meter_selling->>'purchase_price_per_meter')::NUMERIC,
        (p_meter_selling->>'min_meters')::NUMERIC,
        (p_meter_selling->>'roll_length')::NUMERIC,
        (p_meter_selling->>'available_length')::NUMERIC,
        -- تتبع الصلاحية
        COALESCE((p_expiry_tracking->>'enabled')::BOOLEAN, FALSE),
        (p_expiry_tracking->>'default_expiry_days')::INTEGER,
        COALESCE((p_expiry_tracking->>'alert_days_before')::INTEGER, 30),
        -- تتبع الأرقام التسلسلية
        COALESCE((p_serial_tracking->>'enabled')::BOOLEAN, FALSE),
        COALESCE((p_serial_tracking->>'require_on_sale')::BOOLEAN, FALSE),
        COALESCE((p_serial_tracking->>'supports_imei')::BOOLEAN, FALSE),
        -- الضمان
        COALESCE((p_warranty->>'enabled')::BOOLEAN, FALSE),
        (p_warranty->>'duration_months')::INTEGER,
        COALESCE(p_warranty->>'type', 'store'),
        -- تتبع الدفعات
        COALESCE((p_batch_tracking->>'enabled')::BOOLEAN, FALSE),
        COALESCE((p_batch_tracking->>'use_fifo')::BOOLEAN, TRUE),
        -- النشر
        v_publication_status,
        v_publish_at,
        CASE WHEN v_publication_status = 'published' THEN NOW() ELSE NULL END,
        CASE WHEN v_publication_status = 'published' THEN TRUE ELSE FALSE END,
        -- التتبع
        NOW(),
        NOW(),
        p_user_id,
        p_user_id
      );
    END IF;

    -- =====================================================
    -- معالجة المتغيرات (الألوان والمقاسات)
    -- =====================================================
    IF p_variants IS NOT NULL AND jsonb_array_length(p_variants) > 0 THEN
      -- حذف المتغيرات القديمة عند التحديث
      IF v_is_update THEN
        DELETE FROM product_sizes WHERE product_id = v_product_id;
        DELETE FROM product_colors WHERE product_id = v_product_id;
      END IF;

      -- إضافة المتغيرات الجديدة
      FOR v_color_record IN SELECT * FROM jsonb_array_elements(p_variants)
      LOOP
        INSERT INTO product_colors (
          product_id,
          name,
          color_code,
          image_url,
          quantity,
          is_default,
          barcode,
          has_sizes,
          price,
          purchase_price
        ) VALUES (
          v_product_id,
          v_color_record.value->>'name',
          COALESCE(v_color_record.value->>'color_code', '#000000'),
          v_color_record.value->>'image_url',
          COALESCE((v_color_record.value->>'quantity')::INTEGER, 0),
          COALESCE((v_color_record.value->>'is_default')::BOOLEAN, FALSE),
          v_color_record.value->>'barcode',
          COALESCE((v_color_record.value->>'has_sizes')::BOOLEAN, FALSE),
          (v_color_record.value->>'price')::NUMERIC,
          (v_color_record.value->>'purchase_price')::NUMERIC
        ) RETURNING id INTO v_color_id;

        -- إضافة المقاسات إن وجدت
        IF v_color_record.value ? 'sizes' AND jsonb_array_length(v_color_record.value->'sizes') > 0 THEN
          FOR v_size_record IN SELECT * FROM jsonb_array_elements(v_color_record.value->'sizes')
          LOOP
            INSERT INTO product_sizes (
              product_id,
              color_id,
              size_name,
              quantity,
              price,
              purchase_price,
              barcode,
              is_default
            ) VALUES (
              v_product_id,
              v_color_id,
              v_size_record.value->>'size_name',
              COALESCE((v_size_record.value->>'quantity')::INTEGER, 0),
              (v_size_record.value->>'price')::NUMERIC,
              (v_size_record.value->>'purchase_price')::NUMERIC,
              v_size_record.value->>'barcode',
              COALESCE((v_size_record.value->>'is_default')::BOOLEAN, FALSE)
            );
          END LOOP;
        END IF;

        v_total_stock := v_total_stock + COALESCE((v_color_record.value->>'quantity')::INTEGER, 0);
      END LOOP;

      -- تحديث إجمالي المخزون
      UPDATE products SET
        has_variants = TRUE,
        stock_quantity = v_total_stock
      WHERE id = v_product_id;
    END IF;

    -- =====================================================
    -- معالجة مستويات الأسعار
    -- =====================================================
    IF p_price_tiers IS NOT NULL AND jsonb_array_length(p_price_tiers) > 0 THEN
      -- حذف المستويات القديمة
      DELETE FROM product_price_tiers WHERE product_id = v_product_id;

      v_sort_order := 0;
      FOR v_tier_record IN SELECT * FROM jsonb_array_elements(p_price_tiers)
      LOOP
        INSERT INTO product_price_tiers (
          product_id,
          organization_id,
          tier_name,
          tier_label,
          min_quantity,
          max_quantity,
          price_type,
          price,
          discount_percentage,
          is_active,
          sort_order
        ) VALUES (
          v_product_id,
          v_organization_id,
          COALESCE(v_tier_record.value->>'tier_name', 'custom'),
          v_tier_record.value->>'tier_label',
          COALESCE((v_tier_record.value->>'min_quantity')::INTEGER, 1),
          (v_tier_record.value->>'max_quantity')::INTEGER,
          COALESCE(v_tier_record.value->>'price_type', 'fixed'),
          (v_tier_record.value->>'price')::NUMERIC,
          (v_tier_record.value->>'discount_percentage')::NUMERIC,
          COALESCE((v_tier_record.value->>'is_active')::BOOLEAN, TRUE),
          v_sort_order
        );
        v_sort_order := v_sort_order + 1;
      END LOOP;
    END IF;

    -- =====================================================
    -- معالجة الصور
    -- =====================================================
    IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
      -- حذف الصور القديمة
      DELETE FROM product_images WHERE product_id = v_product_id;

      v_sort_order := 0;
      FOR v_image_record IN SELECT * FROM jsonb_array_elements(p_images)
      LOOP
        INSERT INTO product_images (
          product_id,
          image_url,
          alt_text,
          sort_order
        ) VALUES (
          v_product_id,
          v_image_record.value->>'url',
          v_image_record.value->>'alt',
          v_sort_order
        );
        v_sort_order := v_sort_order + 1;
      END LOOP;
    END IF;

    -- =====================================================
    -- معالجة الإعدادات المتقدمة
    -- =====================================================
    IF p_advanced_settings IS NOT NULL THEN
      DELETE FROM product_advanced_settings WHERE product_id = v_product_id;

      INSERT INTO product_advanced_settings (
        product_id,
        skip_cart,
        enable_sticky_buy_button,
        require_login_to_purchase,
        prevent_repeat_purchase,
        disable_quantity_selection,
        enable_stock_notification,
        show_fake_visitor_counter,
        enable_fake_low_stock,
        show_recent_purchases
      ) VALUES (
        v_product_id,
        COALESCE((p_advanced_settings->>'skip_cart')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'enable_sticky_buy_button')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'require_login_to_purchase')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'prevent_repeat_purchase')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'disable_quantity_selection')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'enable_stock_notification')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'show_fake_visitor_counter')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'enable_fake_low_stock')::BOOLEAN, FALSE),
        COALESCE((p_advanced_settings->>'show_recent_purchases')::BOOLEAN, FALSE)
      );
    END IF;

    -- =====================================================
    -- معالجة إعدادات التسويق
    -- =====================================================
    IF p_marketing_settings IS NOT NULL THEN
      DELETE FROM product_marketing_settings WHERE product_id = v_product_id;

      INSERT INTO product_marketing_settings (
        product_id,
        organization_id,
        enable_facebook_pixel,
        facebook_pixel_id,
        enable_tiktok_pixel,
        tiktok_pixel_id,
        enable_snapchat_pixel,
        snapchat_pixel_id,
        enable_google_ads_tracking,
        google_ads_conversion_id,
        enable_reviews,
        reviews_verify_purchase,
        reviews_auto_approve
      ) VALUES (
        v_product_id,
        v_organization_id,
        COALESCE((p_marketing_settings->>'enable_facebook_pixel')::BOOLEAN, FALSE),
        p_marketing_settings->>'facebook_pixel_id',
        COALESCE((p_marketing_settings->>'enable_tiktok_pixel')::BOOLEAN, FALSE),
        p_marketing_settings->>'tiktok_pixel_id',
        COALESCE((p_marketing_settings->>'enable_snapchat_pixel')::BOOLEAN, FALSE),
        p_marketing_settings->>'snapchat_pixel_id',
        COALESCE((p_marketing_settings->>'enable_google_ads_tracking')::BOOLEAN, FALSE),
        p_marketing_settings->>'google_ads_conversion_id',
        COALESCE((p_marketing_settings->>'enable_reviews')::BOOLEAN, TRUE),
        COALESCE((p_marketing_settings->>'reviews_verify_purchase')::BOOLEAN, FALSE),
        COALESCE((p_marketing_settings->>'reviews_auto_approve')::BOOLEAN, TRUE)
      );
    END IF;

    -- =====================================================
    -- بناء النتيجة
    -- =====================================================
    v_result := jsonb_build_object(
      'success', true,
      'product_id', v_product_id,
      'action', CASE WHEN v_is_update THEN 'updated' ELSE 'created' END,
      'data', jsonb_build_object(
        'id', v_product_id,
        'organization_id', v_organization_id,
        'track_serial_numbers', COALESCE((p_serial_tracking->>'enabled')::BOOLEAN, FALSE),
        'track_batches', COALESCE((p_batch_tracking->>'enabled')::BOOLEAN, FALSE),
        'track_expiry', COALESCE((p_expiry_tracking->>'enabled')::BOOLEAN, FALSE),
        'has_warranty', COALESCE((p_warranty->>'enabled')::BOOLEAN, FALSE)
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
      );
  END;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION upsert_product_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_product_v2 TO service_role;

-- تعليق توضيحي
COMMENT ON FUNCTION upsert_product_v2 IS 'دالة موحدة لإنشاء وتحديث المنتجات مع دعم كامل للتتبع المتقدم (Serial Numbers, Batches, Expiry, Warranty)';
