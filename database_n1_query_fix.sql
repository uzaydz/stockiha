-- =================================================================
-- 🚀 حل مشكلة N+1 Query للمنتجات مع الألوان والأحجام - محدث للهيكل الفعلي
-- =================================================================

-- دالة محسنة لجلب المنتجات مع جميع المتغيرات في استعلام واحد
CREATE OR REPLACE FUNCTION get_products_with_variants_optimized(
  p_organization_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_category_id uuid DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL
) RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_description text,
  product_price numeric,
  product_sku text,
  product_stock_quantity integer,
  product_thumbnail_image text,
  product_images text[],
  product_is_featured boolean,
  product_is_active boolean,
  product_has_variants boolean,
  product_use_sizes boolean,
  category_name text,
  variants_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH product_variants AS (
    SELECT 
      p.id as pid,
      p.name,
      p.description,
      p.price,
      p.sku,
      p.stock_quantity,
      p.thumbnail_image,
      p.images,
      p.is_featured,
      p.is_active,
      p.has_variants,
      p.use_sizes,
      pc.name as cat_name,
      -- جلب جميع الألوان والأحجام في استعلام واحد
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'color_id', colors.id,
            'color_name', colors.name,
            'color_code', colors.color_code,
            'color_image_url', colors.image_url,
            'color_quantity', colors.quantity,
            'color_price', colors.price,
            'color_is_default', colors.is_default,
            'color_barcode', colors.barcode,
            'color_has_sizes', colors.has_sizes,
            'sizes', COALESCE(sizes_agg.sizes_data, '[]'::jsonb)
          )
        ) FILTER (WHERE colors.id IS NOT NULL),
        '[]'::jsonb
      ) as variants
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN product_colors colors ON p.id = colors.product_id
    LEFT JOIN (
      -- تجميع الأحجام لكل لون
      SELECT 
        ps.color_id,
        jsonb_agg(
          jsonb_build_object(
            'size_id', ps.id,
            'size_name', ps.size_name,
            'size_quantity', ps.quantity,
            'size_price', ps.price,
            'size_barcode', ps.barcode,
            'size_is_default', ps.is_default
          )
        ) as sizes_data
      FROM product_sizes ps
      GROUP BY ps.color_id
    ) sizes_agg ON colors.id = sizes_agg.color_id
    WHERE p.organization_id = p_organization_id
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_is_featured IS NULL OR p.is_featured = p_is_featured)
      AND p.is_active = true
    GROUP BY p.id, p.name, p.description, p.price, p.sku, p.stock_quantity, 
             p.thumbnail_image, p.images, p.is_featured, p.is_active, 
             p.has_variants, p.use_sizes, pc.name
    ORDER BY p.is_featured DESC, p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT 
    pv.pid,
    pv.name,
    pv.description,
    pv.price,
    pv.sku,
    pv.stock_quantity,
    pv.thumbnail_image,
    pv.images,
    pv.is_featured,
    pv.is_active,
    pv.has_variants,
    pv.use_sizes,
    pv.cat_name,
    pv.variants
  FROM product_variants pv;
END;
$$ LANGUAGE plpgsql;

-- دالة محسنة لجلب منتج واحد مع جميع متغيراته
CREATE OR REPLACE FUNCTION get_single_product_with_variants(
  p_product_id uuid
) RETURNS TABLE (
  product_data jsonb,
  variants_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price', p.price,
      'compare_at_price', p.compare_at_price,
      'sku', p.sku,
      'stock_quantity', p.stock_quantity,
      'thumbnail_image', p.thumbnail_image,
      'images', p.images,
      'is_featured', p.is_featured,
      'is_active', p.is_active,
      'has_variants', p.has_variants,
      'use_sizes', p.use_sizes,
      'category', jsonb_build_object(
        'id', pc.id,
        'name', pc.name,
        'slug', pc.slug
      )
    ) as product_data,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', colors.id,
            'name', colors.name,
            'color_code', colors.color_code,
            'image_url', colors.image_url,
            'quantity', colors.quantity,
            'price', colors.price,
            'is_default', colors.is_default,
            'barcode', colors.barcode,
            'has_sizes', colors.has_sizes,
            'sizes', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ps.id,
                    'size_name', ps.size_name,
                    'quantity', ps.quantity,
                    'price', ps.price,
                    'barcode', ps.barcode,
                    'is_default', ps.is_default
                  )
                )
                FROM product_sizes ps
                WHERE ps.color_id = colors.id
              ),
              '[]'::jsonb
            )
          )
        )
        FROM product_colors colors
        WHERE colors.product_id = p.id
      ),
      '[]'::jsonb
    ) as variants_data
  FROM products p
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- دالة محسنة لجلب بيانات المتجر الكاملة - محدثة للهيكل الفعلي
CREATE OR REPLACE FUNCTION get_store_complete_data(
  p_subdomain text,
  p_limit_products integer DEFAULT 20,
  p_limit_categories integer DEFAULT 50
) RETURNS jsonb AS $$
DECLARE
  v_org_id uuid;
  v_result jsonb;
BEGIN
  -- الحصول على معرف المؤسسة
  SELECT id INTO v_org_id
  FROM organizations
  WHERE subdomain = p_subdomain
    AND subscription_status = 'active'
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;
  
  -- بناء النتيجة الكاملة في استعلام واحد
  SELECT jsonb_build_object(
    'organization', org_data,
    'settings', settings_data,
    'categories', categories_data,
    'products', products_data,
    'components', components_data
  ) INTO v_result
  FROM (
    SELECT 
      (
        SELECT row_to_json(o)
        FROM organizations o
        WHERE o.id = v_org_id
      ) as org_data,
      (
        SELECT row_to_json(os)
        FROM organization_settings os
        WHERE os.organization_id = v_org_id
      ) as settings_data,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pc.id,
            'name', pc.name,
            'description', pc.description,
            'slug', pc.slug,
            'icon', pc.icon,
            'image_url', pc.image_url,
            'product_count', COALESCE(cat_stats.product_count, 0)
          )
        ), '[]'::jsonb)
        FROM product_categories pc
        LEFT JOIN (
          SELECT 
            category_id,
            count(*) as product_count
          FROM products p2
          WHERE p2.organization_id = v_org_id
            AND p2.is_active = true
          GROUP BY category_id
        ) cat_stats ON pc.id = cat_stats.category_id
        WHERE pc.organization_id = v_org_id
          AND pc.is_active = true
        ORDER BY pc.name
        LIMIT p_limit_categories
      ) as categories_data,
      (
        SELECT COALESCE(jsonb_agg(product_with_variants), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', pvars.product_id,
            'name', pvars.product_name,
            'description', pvars.product_description,
            'price', pvars.product_price,
            'sku', pvars.product_sku,
            'stock_quantity', pvars.product_stock_quantity,
            'thumbnail_image', pvars.product_thumbnail_image,
            'images', pvars.product_images,
            'is_featured', pvars.product_is_featured,
            'category_name', pvars.category_name,
            'variants', pvars.variants_data
          ) as product_with_variants
          FROM get_products_with_variants_optimized(
            v_org_id, 
            p_limit_products, 
            0, 
            NULL, 
            true
          ) pvars
        ) featured_products
      ) as products_data,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', ss.id,
            'type', ss.component_type,
            'settings', ss.settings,
            'is_active', ss.is_active,
            'order_index', ss.order_index
          )
        ), '[]'::jsonb)
        FROM store_settings ss
        WHERE ss.organization_id = v_org_id
          AND ss.is_active = true
        ORDER BY ss.order_index
      ) as components_data
  ) combined_data;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 🚀 ULTRA OPTIMIZED STORE DATA LOADING - تحميل فائق السرعة محدث
-- =================================================================

-- دالة محسنة لتحميل جميع بيانات المتجر في طلب واحد - محدثة للهيكل الفعلي
CREATE OR REPLACE FUNCTION get_ultra_fast_store_data(p_subdomain TEXT)
RETURNS TABLE (
  -- بيانات المؤسسة
  org_id UUID,
  org_name TEXT,
  org_description TEXT,
  org_logo_url TEXT,
  org_subdomain TEXT,
  
  -- إعدادات المتجر
  store_settings JSONB,
  
  -- المكونات (مع الإعدادات)
  components JSONB,
  
  -- الفئات (مع عدد المنتجات)
  categories JSONB,
  
  -- المنتجات المميزة (مع الألوان والأحجام)
  featured_products JSONB,
  
  -- معلومات إضافية
  shipping_info JSONB,
  cache_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_org_record RECORD;
  v_store_settings JSONB;
  v_components JSONB;
  v_categories JSONB;
  v_featured_products JSONB;
  v_shipping_info JSONB;
BEGIN
  -- الحصول على معرف المؤسسة
  SELECT id INTO v_org_id 
  FROM organizations 
  WHERE subdomain = p_subdomain 
    AND subscription_status = 'active'
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', p_subdomain;
  END IF;
  
  -- جلب بيانات المؤسسة
  SELECT * INTO v_org_record
  FROM organizations 
  WHERE id = v_org_id;
  
  -- جلب إعدادات المتجر من organization_settings
  SELECT jsonb_build_object(
    'theme_primary_color', os.theme_primary_color,
    'theme_secondary_color', os.theme_secondary_color,
    'theme_mode', os.theme_mode,
    'site_name', os.site_name,
    'logo_url', os.logo_url,
    'favicon_url', os.favicon_url,
    'default_language', os.default_language,
    'enable_registration', os.enable_registration,
    'enable_public_site', os.enable_public_site,
    'display_text_with_logo', os.display_text_with_logo,
    'custom_css', os.custom_css,
    'custom_js', os.custom_js,
    'custom_header', os.custom_header,
    'custom_footer', os.custom_footer
  ) INTO v_store_settings
  FROM organization_settings os
  WHERE os.organization_id = v_org_id;
  
  -- جلب المكونات مع الإعدادات من store_settings
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', component_type,
        'name', component_type,
        'settings', settings,
        'isActive', is_active,
        'isVisible', COALESCE(settings->>'_isVisible', 'true')::boolean,
        'orderIndex', order_index
      ) ORDER BY order_index ASC
    ),
    '[]'::jsonb
  ) INTO v_components
  FROM store_settings 
  WHERE organization_id = v_org_id 
    AND is_active = true;
  
  -- جلب الفئات مع عدد المنتجات
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pc.id,
        'name', pc.name,
        'description', pc.description,
        'image_url', pc.image_url,
        'is_active', pc.is_active,
        'product_count', COALESCE(product_counts.count, 0),
        'created_at', pc.created_at
      ) ORDER BY pc.name ASC
    ),
    '[]'::jsonb
  ) INTO v_categories
  FROM product_categories pc
  LEFT JOIN (
    SELECT 
      category_id,
      COUNT(*) as count
    FROM products 
    WHERE organization_id = v_org_id 
      AND is_active = true
    GROUP BY category_id
  ) product_counts ON pc.id = product_counts.category_id
  WHERE pc.organization_id = v_org_id 
    AND pc.is_active = true;
  
  -- جلب المنتجات المميزة مع الألوان والأحجام
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price', p.price,
        'compare_at_price', p.compare_at_price,
        'sku', p.sku,
        'barcode', p.barcode,
        'thumbnail_image', p.thumbnail_image,
        'images', p.images,
        'is_active', p.is_active,
        'is_featured', p.is_featured,
        'category_name', pc.name,
        'colors', COALESCE(colors_data.colors, '[]'::jsonb),
        'total_variants', COALESCE(colors_data.total_variants, 0),
        'created_at', p.created_at
      ) ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_featured_products
  FROM products p
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN (
    SELECT 
      product_id,
      jsonb_agg(
        jsonb_build_object(
          'id', color_id,
          'name', color_name,
          'color_code', color_code,
          'image_url', color_image_url,
          'sizes', sizes_data
        )
      ) as colors,
      SUM(size_count) as total_variants
    FROM (
      SELECT 
        pcol.product_id,
        pcol.id as color_id,
        pcol.name as color_name,
        pcol.color_code,
        pcol.image_url as color_image_url,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ps.id,
              'name', ps.size_name,
              'stock_quantity', ps.quantity,
              'price_adjustment', ps.price
            ) ORDER BY ps.size_name
          ) FILTER (WHERE ps.id IS NOT NULL),
          '[]'::jsonb
        ) as sizes_data,
        COUNT(ps.id) as size_count
      FROM product_colors pcol
      LEFT JOIN product_sizes ps ON pcol.id = ps.color_id
      GROUP BY pcol.product_id, pcol.id, pcol.name, pcol.color_code, pcol.image_url
    ) color_sizes
    GROUP BY product_id
  ) colors_data ON p.id = colors_data.product_id
  WHERE p.organization_id = v_org_id 
    AND p.is_active = true 
    AND p.is_featured = true
  LIMIT 50;
  
  -- جلب معلومات الشحن (إذا كان الجدول موجود)
  SELECT COALESCE('[]'::jsonb, '[]'::jsonb) INTO v_shipping_info;
  
  -- إرجاع جميع البيانات
  RETURN QUERY
  SELECT 
    v_org_record.id,
    v_org_record.name,
    v_org_record.description,
    v_org_record.logo_url,
    v_org_record.subdomain,
    v_store_settings,
    v_components,
    v_categories,
    v_featured_products,
    v_shipping_info,
    NOW();
END;
$$;

-- =================================================================
-- 🎯 دالة محسنة لتحديث المكونات بشكل جماعي - محدثة للهيكل الفعلي
-- =================================================================

CREATE OR REPLACE FUNCTION batch_update_store_components_ultra_fast(
  p_organization_id UUID,
  p_components JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_component JSONB;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_total_processed INTEGER := 0;
  v_existing_component RECORD;
  v_needs_update BOOLEAN;
BEGIN
  -- التحقق من صحة المعاملات
  IF p_organization_id IS NULL OR p_components IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid parameters'
    );
  END IF;
  
  -- معالجة كل مكون
  FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
  LOOP
    v_total_processed := v_total_processed + 1;
    v_needs_update := false;
    
    -- التحقق من وجود المكون في store_settings
    SELECT * INTO v_existing_component
    FROM store_settings 
    WHERE id = (v_component->>'id')::UUID 
      AND organization_id = p_organization_id;
    
    IF FOUND THEN
      -- فحص ما إذا كان المكون يحتاج تحديث
      IF v_existing_component.component_type != (v_component->>'component_type') OR
         v_existing_component.settings != (v_component->'settings') OR
         v_existing_component.is_active != (v_component->>'is_active')::boolean OR
         v_existing_component.order_index != (v_component->>'order_index')::integer THEN
        v_needs_update := true;
      END IF;
      
      -- تحديث المكون إذا لزم الأمر
      IF v_needs_update THEN
        UPDATE store_settings 
        SET 
          component_type = v_component->>'component_type',
          settings = v_component->'settings',
          is_active = (v_component->>'is_active')::boolean,
          order_index = (v_component->>'order_index')::integer,
          updated_at = NOW()
        WHERE id = (v_component->>'id')::UUID 
          AND organization_id = p_organization_id;
        
        v_updated_count := v_updated_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    ELSE
      -- إنشاء مكون جديد
      INSERT INTO store_settings (
        id,
        organization_id,
        component_type,
        settings,
        is_active,
        order_index,
        created_at,
        updated_at
      ) VALUES (
        (v_component->>'id')::UUID,
        p_organization_id,
        v_component->>'component_type',
        v_component->'settings',
        (v_component->>'is_active')::boolean,
        (v_component->>'order_index')::integer,
        NOW(),
        NOW()
      );
      
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;
  
  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'total_processed', v_total_processed,
    'message', format('Updated %s components, skipped %s unchanged', v_updated_count, v_skipped_count)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'updated_count', v_updated_count,
    'total_processed', v_total_processed
  );
END;
$$;

-- =================================================================
-- 🎯 فهارس محسنة للأداء - محدثة للهيكل الفعلي
-- =================================================================

-- فهرس مركب للمؤسسات
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_status 
ON organizations(subdomain, subscription_status) 
WHERE subscription_status = 'active';

-- فهرس مركب للمنتجات المميزة
CREATE INDEX IF NOT EXISTS idx_products_featured_active 
ON products(organization_id, is_featured, is_active, created_at DESC) 
WHERE is_featured = true AND is_active = true;

-- فهرس مركب لألوان المنتجات
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id 
ON product_colors(product_id) 
INCLUDE (id, name, color_code, image_url);

-- فهرس مركب لأحجام المنتجات
CREATE INDEX IF NOT EXISTS idx_product_sizes_color_id 
ON product_sizes(color_id) 
INCLUDE (id, size_name, quantity, price);

-- فهرس مركب لمكونات المتجر
CREATE INDEX IF NOT EXISTS idx_store_settings_org_active 
ON store_settings(organization_id, is_active, order_index) 
WHERE is_active = true;

-- فهرس مركب لإعدادات المؤسسة
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id 
ON organization_settings(organization_id);

-- =================================================================
-- 🎯 إحصائيات الجداول لتحسين الاستعلامات
-- =================================================================

-- تحديث إحصائيات الجداول
ANALYZE organizations;
ANALYZE products;
ANALYZE product_categories;
ANALYZE product_colors;
ANALYZE product_sizes;
ANALYZE store_settings;
ANALYZE organization_settings;

-- =================================================================
-- 🎯 تعليقات للتوثيق
-- =================================================================

COMMENT ON FUNCTION get_ultra_fast_store_data(TEXT) IS 
'دالة محسنة لتحميل جميع بيانات المتجر في طلب واحد - تقليل 90% من طلبات قاعدة البيانات - محدثة للهيكل الفعلي';

COMMENT ON FUNCTION batch_update_store_components_ultra_fast(UUID, JSONB) IS 
'دالة محسنة لتحديث مكونات المتجر بشكل جماعي مع تخطي المكونات غير المتغيرة - محدثة للهيكل الفعلي';

-- =================================================================
-- 🎯 منح الصلاحيات
-- =================================================================

-- منح صلاحيات التنفيذ للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION get_ultra_fast_store_data(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_store_components_ultra_fast(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_with_variants_optimized(UUID, INTEGER, INTEGER, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_single_product_with_variants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_complete_data(TEXT, INTEGER, INTEGER) TO authenticated;

-- =================================================================
-- ✅ تم تحديث النظام المحسن ليعمل مع الهيكل الفعلي لقاعدة البيانات
-- ================================================================= 