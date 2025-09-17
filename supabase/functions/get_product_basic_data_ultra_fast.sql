-- 🚀 دالة البيانات الأساسية فائقة السرعة
-- هذه الدالة تجلب البيانات الأساسية للمنتج فقط
-- مخصصة لعرض قوائم المنتجات والمعاينة السريعة
-- محسنة للسرعة القصوى ولا تشمل البيانات الثقيلة

-- 📋 تعليمات التطبيق:
-- 1. انسخ محتوى هذا الملف
-- 2. اذهب إلى Supabase Dashboard > SQL Editor
-- 3. الصق المحتوى وشغل الاستعلام
-- 4. هذه الدالة تجلب البيانات الأساسية فقط
-- 5. للبيانات المتقدمة استخدم get_product_extended_data_ultra_fast

CREATE OR REPLACE FUNCTION get_product_basic_data_ultra_fast(
  p_product_identifier TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT FALSE,
  p_include_thumbnails BOOLEAN DEFAULT TRUE, -- تحكم في تحميل الصور المصغرة
  p_include_colors_basic BOOLEAN DEFAULT TRUE -- تحكم في تحميل معلومات الألوان الأساسية
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET work_mem = '128MB' -- 🔥 تحسين: ذاكرة أقل للاستعلامات البسيطة
AS $$
DECLARE
  v_result JSON;
  v_product_id UUID;
  v_is_uuid BOOLEAN;
  v_start_time TIMESTAMP;
  v_product_data RECORD;
BEGIN
  -- 🚀 تحسين 1: قياس زمن التنفيذ
  v_start_time := clock_timestamp();
  
  -- 🚀 تحسين 2: التحقق السريع من UUID
  v_is_uuid := length(p_product_identifier) = 36 AND p_product_identifier ~ '^[0-9a-f-]+$';
  
  IF v_is_uuid THEN
    BEGIN
      v_product_id := p_product_identifier::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        v_is_uuid := FALSE;
    END;
  END IF;
  
  IF NOT v_is_uuid THEN
    -- البحث بالـ slug
    IF p_organization_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Organization ID is required when using slug',
          'code', 'MISSING_ORGANIZATION_ID'
        )
      );
    END IF;
    
    -- 🚀 تحسين 3: استعلام محسن للبحث بـ slug
    IF p_include_inactive THEN
      SELECT id INTO v_product_id 
      FROM products 
      WHERE slug = p_product_identifier 
        AND organization_id = p_organization_id 
      LIMIT 1;
    ELSE
      SELECT id INTO v_product_id 
      FROM products 
      WHERE slug = p_product_identifier 
        AND organization_id = p_organization_id 
        AND is_active = TRUE
      LIMIT 1;
    END IF;
      
    IF v_product_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Product not found',
          'code', 'PRODUCT_NOT_FOUND'
        )
      );
    END IF;
  END IF;

  -- 🚀 تحسين 4: استعلام أساسي محسن للبيانات الضرورية فقط
  SELECT 
    -- البيانات الأساسية للمنتج (مطلوبة دائماً)
    p.id, p.name, p.description, p.slug, p.sku, p.price, p.stock_quantity,
    p.is_active, p.has_variants, p.use_sizes, p.use_variant_prices,
    p.category_id, p.subcategory_id, p.organization_id,
    
    -- الوصف المبسط
    CASE WHEN length(p.advanced_description::text) <= 500 
      THEN p.advanced_description 
      ELSE NULL 
    END AS advanced_description,
    
    -- البيانات المالية الأساسية
    p.purchase_price, p.compare_at_price, p.wholesale_price,
    p.allow_retail, p.allow_wholesale, p.is_sold_by_unit,
    
    -- بيانات المخزون الأساسية
    p.min_stock_level, p.last_inventory_update,
    
    -- الميزات الأساسية فقط
    p.has_fast_shipping, p.has_money_back, p.has_quality_guarantee,
    
    -- حالة المنتج
    p.is_digital, p.is_featured, p.is_new, p.show_price_on_landing,
    p.created_at, p.updated_at,
    
    -- الشحن الأساسي
    p.shipping_method_type, p.use_shipping_clone,
    
    -- بيانات إضافية خفيفة
    p.barcode, p.brand, p.name_for_shipping,
    
    -- الصورة المصغرة (مشروطة)
    CASE WHEN p_include_thumbnails = TRUE THEN p.thumbnail_image ELSE NULL END AS thumbnail_image,
    
    -- معلومات المنظمة (JOIN محسن)
    o.name as org_name, o.domain as org_domain,
    
    -- معلومات الفئات (JOIN محسن)
    pc.name as category_name, pc.slug as category_slug, pc.icon as category_icon,
    psc.name as subcategory_name, psc.slug as subcategory_slug,
    
    -- 🚀 تحسين 5: معلومات الألوان الأساسية فقط (بدون صور ضخمة)
    CASE 
      WHEN p.has_variants = TRUE AND p_include_colors_basic = TRUE THEN
        colors_info.colors_basic_data
      ELSE '[]'::json
    END as colors_basic_data,
    
    -- 🚀 تحسين 6: صور المنتج الصغيرة فقط
    CASE 
      WHEN p_include_thumbnails = TRUE THEN
        images_info.images_basic_data
      ELSE '[]'::json
    END as images_basic_data
    
  INTO v_product_data
  FROM products p
  LEFT JOIN organizations o ON p.organization_id = o.id
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN product_subcategories psc ON p.subcategory_id = psc.id
  
  -- 🔥 تحسين 7: LATERAL JOIN محسّن للألوان الأساسية فقط
  LEFT JOIN LATERAL (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pcol.id,
        'name', pcol.name,
        'color_code', pcol.color_code,
        'quantity', pcol.quantity,
        'price', pcol.price,
        'is_default', pcol.is_default,
        -- 🚀 تحسين: عدم تحميل الصور الضخمة، فقط معلومات وجودها
        'has_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 0 THEN TRUE ELSE FALSE END,
        'image_size_info', CASE 
          WHEN pcol.image_url IS NULL THEN 'no_image'
          WHEN length(pcol.image_url) <= 10000 THEN 'small'
          WHEN length(pcol.image_url) <= 50000 THEN 'medium'
          ELSE 'large'
        END,
        -- معلومات الأحجام الأساسية
        'sizes_count', CASE
          WHEN p.use_sizes = TRUE THEN (
            SELECT COUNT(*) FROM product_sizes ps WHERE ps.color_id = pcol.id
          )
          ELSE 0
        END,
        'has_sizes', CASE WHEN p.use_sizes = TRUE THEN TRUE ELSE FALSE END
      ) ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
    ) as colors_basic_data
    FROM product_colors pcol
    WHERE pcol.product_id = p.id
    LIMIT 10 -- 🔥 تحسين: تقليل عدد الألوان للسرعة
  ) colors_info ON p.has_variants = TRUE AND p_include_colors_basic = TRUE
  
  -- 🔥 تحسين 8: LATERAL JOIN محسّن للصور الأساسية
  LEFT JOIN LATERAL (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pi.id,
        'has_image', TRUE,
        'sort_order', COALESCE(pi.sort_order, 999),
        -- معلومات الصورة بدون تحميلها
        'image_size_info', CASE 
          WHEN pi.image_url IS NULL THEN 'no_image'
          WHEN length(pi.image_url) <= 10000 THEN 'small'
          WHEN length(pi.image_url) <= 50000 THEN 'medium'
          ELSE 'large'
        END,
        'image_type', CASE
          WHEN pi.image_url LIKE 'data:image/%' THEN 'base64'
          WHEN pi.image_url LIKE 'http%' THEN 'url'
          ELSE 'unknown'
        END
      ) ORDER BY pi.sort_order NULLS LAST, pi.id
    ) as images_basic_data
    FROM product_images pi
    WHERE pi.product_id = p.id
    LIMIT 5 -- 🔥 تحسين: تقليل عدد الصور للسرعة
  ) images_info ON p_include_thumbnails = TRUE
  
  WHERE p.id = v_product_id
    AND (p_organization_id IS NULL OR p.organization_id = p_organization_id)
    AND (p_include_inactive = TRUE OR p.is_active = TRUE)
  LIMIT 1;

  -- 🚀 تحسين 9: بناء النتيجة النهائية المبسطة
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'data_type', 'basic',
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '1.0_ultra_fast_basic',
      'single_query', TRUE,
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'optimization_level', 'ultra_fast_basic',
      'lightweight_data', TRUE,
      'minimal_joins', TRUE
    ),
    'product', JSON_BUILD_OBJECT(
      -- البيانات الأساسية
      'id', v_product_data.id,
      'name', v_product_data.name,
      'name_for_shipping', v_product_data.name_for_shipping,
      'description', v_product_data.description,
      'advanced_description', v_product_data.advanced_description,
      'slug', v_product_data.slug,
      'sku', v_product_data.sku,
      'barcode', v_product_data.barcode,
      'brand', v_product_data.brand,
      
      -- الأسعار الأساسية
      'pricing', JSON_BUILD_OBJECT(
        'price', v_product_data.price,
        'purchase_price', v_product_data.purchase_price,
        'compare_at_price', v_product_data.compare_at_price,
        'wholesale_price', v_product_data.wholesale_price
      ),
      
      -- أنواع البيع الأساسية
      'selling_options', JSON_BUILD_OBJECT(
        'allow_retail', COALESCE(v_product_data.allow_retail, TRUE),
        'allow_wholesale', COALESCE(v_product_data.allow_wholesale, FALSE),
        'is_sold_by_unit', COALESCE(v_product_data.is_sold_by_unit, TRUE)
      ),

      -- المخزون الأساسي
      'inventory', JSON_BUILD_OBJECT(
        'stock_quantity', v_product_data.stock_quantity,
        'min_stock_level', COALESCE(v_product_data.min_stock_level, 5),
        'last_inventory_update', v_product_data.last_inventory_update
      ),

      -- التصنيفات
      'categories', JSON_BUILD_OBJECT(
        'category_id', v_product_data.category_id,
        'category_name', v_product_data.category_name,
        'category_slug', v_product_data.category_slug,
        'category_icon', v_product_data.category_icon,
        'subcategory_id', v_product_data.subcategory_id,
        'subcategory_name', v_product_data.subcategory_name,
        'subcategory_slug', v_product_data.subcategory_slug
      ),
      
      -- الصور الأساسية
      'images', JSON_BUILD_OBJECT(
        'thumbnail_image', v_product_data.thumbnail_image,
        'additional_images_info', v_product_data.images_basic_data
      ),
      
      -- المتغيرات الأساسية
      'variants', JSON_BUILD_OBJECT(
        'has_variants', COALESCE(v_product_data.has_variants, FALSE),
        'use_sizes', COALESCE(v_product_data.use_sizes, FALSE),
        'use_variant_prices', COALESCE(v_product_data.use_variant_prices, FALSE),
        'colors_basic_info', v_product_data.colors_basic_data
      ),
      
      -- الميزات الأساسية
      'basic_features', JSON_BUILD_OBJECT(
        'has_fast_shipping', COALESCE(v_product_data.has_fast_shipping, FALSE),
        'has_money_back', COALESCE(v_product_data.has_money_back, FALSE),
        'has_quality_guarantee', COALESCE(v_product_data.has_quality_guarantee, FALSE)
      ),
      
      -- حالة المنتج
      'status', JSON_BUILD_OBJECT(
        'is_active', COALESCE(v_product_data.is_active, TRUE),
        'is_digital', v_product_data.is_digital,
        'is_featured', COALESCE(v_product_data.is_featured, FALSE),
        'is_new', COALESCE(v_product_data.is_new, TRUE),
        'show_price_on_landing', COALESCE(v_product_data.show_price_on_landing, TRUE)
      ),
      
      -- المعلومات التنظيمية
      'organization', JSON_BUILD_OBJECT(
        'id', v_product_data.organization_id,
        'name', v_product_data.org_name,
        'domain', v_product_data.org_domain
      ),
      
      -- الشحن الأساسي
      'shipping_basic', JSON_BUILD_OBJECT(
        'shipping_method_type', COALESCE(v_product_data.shipping_method_type, 'default'),
        'use_shipping_clone', COALESCE(v_product_data.use_shipping_clone, FALSE)
      ),
      
      -- التوقيتات
      'timestamps', JSON_BUILD_OBJECT(
        'created_at', v_product_data.created_at,
        'updated_at', v_product_data.updated_at
      )
    ),
    
    -- الإحصائيات الأساسية
    'stats', JSON_BUILD_OBJECT(
      'colors_count', CASE WHEN v_product_data.colors_basic_data::text != '[]' THEN 
        (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(v_product_data.colors_basic_data))
      ELSE 0 END,
      'images_count', CASE WHEN v_product_data.images_basic_data::text != '[]' THEN 
        (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(v_product_data.images_basic_data))
      ELSE 0 END,
      'data_size', 'basic',
      'lightweight', TRUE,
      'last_updated', NOW()
    ),
    
    'metadata', JSON_BUILD_OBJECT(
      'query_timestamp', NOW(),
      'data_type', 'basic_only',
      'performance_optimized', TRUE,
      'optimization_version', '1.0_ultra_fast_basic',
      'lightweight_query', TRUE,
      'minimal_data_transfer', TRUE
    )
  ) INTO v_result;

  -- إرجاع النتيجة مباشرة
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'optimized_version', '1.0_ultra_fast_basic',
        'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
      )
    );
END;
$$;

-- 🚀 إضافة فهارس محسنة للدالة الأساسية
-- هذه الفهارس مخصصة للبيانات الأساسية فقط

-- فهرس محسن للبحث الأساسي
CREATE INDEX IF NOT EXISTS idx_products_basic_ultra_fast_v1
ON products (id, organization_id, is_active, slug, name);

-- فهرس محسن للأسعار الأساسية
CREATE INDEX IF NOT EXISTS idx_products_basic_pricing_ultra_fast_v1
ON products (id, price, compare_at_price, wholesale_price);

-- فهرس محسن للمخزون الأساسي
CREATE INDEX IF NOT EXISTS idx_products_basic_inventory_ultra_fast_v1
ON products (id, stock_quantity, min_stock_level);

-- فهرس محسن للحالة الأساسية
CREATE INDEX IF NOT EXISTS idx_products_basic_status_ultra_fast_v1
ON products (id, is_active, is_featured, is_new, is_digital);

-- فهرس محسن للمتغيرات الأساسية
CREATE INDEX IF NOT EXISTS idx_products_basic_variants_ultra_fast_v1
ON products (id, has_variants, use_sizes, use_variant_prices);

-- فهارس محسنة للألوان الأساسية
CREATE INDEX IF NOT EXISTS idx_product_colors_basic_ultra_fast_v1
ON product_colors (product_id, id, name, color_code, is_default);

-- فهرس محسن للصور الأساسية
CREATE INDEX IF NOT EXISTS idx_product_images_basic_ultra_fast_v1
ON product_images (product_id, id, sort_order);

-- تحديث إحصائيات الفهارس للبيانات الأساسية
ANALYZE products;
ANALYZE product_colors;
ANALYZE product_images;
ANALYZE organizations;
ANALYZE product_categories;
ANALYZE product_subcategories;

-- 🚀 دالة مساعدة لجلب معلومات الألوان الأساسية فقط
CREATE OR REPLACE FUNCTION get_product_colors_basic_info(
  p_product_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'colors_basic_info', COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pcol.id,
          'name', pcol.name,
          'color_code', pcol.color_code,
          'quantity', pcol.quantity,
          'is_default', pcol.is_default,
          'has_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 0 THEN TRUE ELSE FALSE END,
          'sizes_count', (SELECT COUNT(*) FROM product_sizes ps WHERE ps.color_id = pcol.id)
        ) ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
      ) FROM product_colors pcol
      WHERE pcol.product_id = p_product_id
      LIMIT 10),
      '[]'::json
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE
      )
    );
END;
$$;
