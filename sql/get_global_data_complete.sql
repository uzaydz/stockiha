-- ================================================================
-- 🚀 الدالة الموحدة لجلب جميع البيانات العامة في استدعاء واحد
-- تهدف لتقليل 40+ استدعاء إلى استدعاء واحد فقط
-- ================================================================

CREATE OR REPLACE FUNCTION get_global_data_complete(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  organization_data JSON;
  user_data JSON;
  settings_data JSON;
  products_data JSON;
  categories_data JSON;
  customers_data JSON;
  users_data JSON;
  apps_data JSON;
  subscription_data JSON;
  stats_data JSON;
  orders_data JSON;
  provinces_data JSON;
BEGIN
  -- التحقق من صحة المدخلات
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID is required';
  END IF;

  -- ================================================================
  -- 1. بيانات المؤسسة الأساسية
  -- ================================================================
  SELECT to_json(org.*) INTO organization_data
  FROM organizations org
  WHERE org.id = p_organization_id;

  -- ================================================================
  -- 2. بيانات المستخدم (إذا تم توفيرها)
  -- ================================================================
  IF p_user_id IS NOT NULL THEN
    SELECT to_json(u.*) INTO user_data
    FROM users u
    WHERE u.id = p_user_id 
      AND u.organization_id = p_organization_id;
  END IF;

  -- ================================================================
  -- 3. إعدادات المؤسسة و POS
  -- ================================================================
  SELECT json_build_object(
    'organization_settings', (
      SELECT to_json(os.*)
      FROM organization_settings os
      WHERE os.organization_id = p_organization_id
      LIMIT 1
    ),
    'pos_settings', (
      SELECT to_json(ps.*)
      FROM pos_settings ps
      WHERE ps.organization_id = p_organization_id
      LIMIT 1
    )
  ) INTO settings_data;

  -- ================================================================
  -- 4. بيانات المنتجات الكاملة مع المتغيرات
  -- ================================================================
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'slug', p.slug,
      'price', p.price,
              'purchase_price', p.purchase_price,
              'stock_quantity', p.stock_quantity,
        'min_stock_level', p.min_stock_level,
      'is_active', p.is_active,
      'has_variants', p.has_variants,
              'category_id', p.category_id,
        'thumbnail_image', p.thumbnail_image,
        'description', p.description,
        'brand', p.brand,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'category_name', pc.name,
      'colors', COALESCE(colors.data, '[]'::json),
      'sizes', COALESCE(sizes.data, '[]'::json)
    )
  ) INTO products_data
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object(
        'id', pcolor.id,
        'name', pcolor.name,
        'color_code', pcolor.color_code,
        'quantity', pcolor.quantity,
        'price', pcolor.price,
        'purchase_price', pcolor.purchase_price,
        'barcode', pcolor.barcode,
        'image_url', pcolor.image_url,
        'is_default', pcolor.is_default,
        'has_sizes', pcolor.has_sizes,
        'variant_number', pcolor.variant_number
      )
    ) as data
    FROM product_colors pcolor
    WHERE pcolor.product_id = p.id
  ) colors ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object(
        'id', psize.id,
        'size_name', psize.size_name,
        'quantity', psize.quantity,
        'price', psize.price,
        'purchase_price', psize.purchase_price,
        'barcode', psize.barcode,
        'color_id', psize.color_id,
        'is_default', psize.is_default
      )
    ) as data
    FROM product_sizes psize
    WHERE psize.product_id = p.id
  ) sizes ON true
  WHERE p.organization_id = p_organization_id 
    AND p.is_active = true;

  -- ================================================================
  -- 5. فئات المنتجات والخدمات
  -- ================================================================
  SELECT json_build_object(
    'product_categories', (
      SELECT json_agg(
        json_build_object(
          'id', pc.id,
          'name', pc.name,
          'slug', pc.slug,
          'image_url', pc.image_url,
          'is_active', pc.is_active,
          'type', pc.type
        )
      )
      FROM product_categories pc
      WHERE pc.organization_id = p_organization_id AND pc.is_active = true
    ),
    'subscription_categories', (
      SELECT json_agg(
        json_build_object(
          'id', sc.id,
          'name', sc.name,
          'description', sc.description,
          'is_active', sc.is_active
        )
      )
      FROM subscription_categories sc
      WHERE sc.organization_id = p_organization_id AND sc.is_active = true
    ),
    'subscription_services', (
      SELECT json_agg(
        json_build_object(
          'id', ss.id,
          'name', ss.name,
          'description', ss.description,
                  'selling_price', ss.selling_price,
        'purchase_price', ss.purchase_price,
        'service_type', ss.service_type,
          'category_id', ss.category_id,
          'is_active', ss.is_active
        )
      )
      FROM subscription_services ss
      WHERE ss.organization_id = p_organization_id AND ss.is_active = true
    )
  ) INTO categories_data;

  -- ================================================================
  -- 6. العملاء والمستخدمين
  -- ================================================================
  SELECT json_build_object(
    'customers', (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'phone', c.phone,
          'email', c.email,
                          'organization_id', c.organization_id,
          'created_at', c.created_at
        )
      )
      FROM customers c
      WHERE c.organization_id = p_organization_id
      LIMIT 50
    ),
    'users', (
      SELECT json_agg(
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'role', u.role,
          'is_active', u.is_active,
          'created_at', u.created_at
        )
      )
      FROM users u
      WHERE u.organization_id = p_organization_id AND u.is_active = true
    )
  ) INTO customers_data;

  -- ================================================================
  -- 7. تطبيقات المؤسسة والاشتراك
  -- ================================================================
  SELECT json_build_object(
    'organization_apps', (
      SELECT json_agg(oa.*)
      FROM organization_apps oa
      WHERE oa.organization_id = p_organization_id
    ),
    'active_subscription', (
      SELECT json_agg(subscription_data.*)
      FROM (
        SELECT os.*
        FROM organization_subscriptions os
        WHERE os.organization_id = p_organization_id
          AND os.status = 'active'
        ORDER BY os.created_at DESC
        LIMIT 1
      ) subscription_data
    )
  ) INTO apps_data;

  -- ================================================================
  -- 8. إحصائيات POS والطلبات (مع معالجة الأخطاء)
  -- ================================================================
  BEGIN
    -- جلب إحصائيات الطلبات
    WITH order_stats AS (
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total::numeric), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders
      FROM orders
      WHERE organization_id = p_organization_id
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    inventory_stats AS (
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE stock_quantity <= min_stock_level) as low_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity <= 0) as out_of_stock,
        COALESCE(SUM(stock_quantity * price::numeric), 0) as total_stock_value
      FROM products
      WHERE organization_id = p_organization_id AND is_active = true
    )
    SELECT json_build_object(
      'order_stats', json_build_object(
        'total_orders', os.total_orders,
        'total_revenue', os.total_revenue,
        'pending_orders', os.pending_orders,
        'completed_orders', os.completed_orders
      ),
      'inventory_summary', json_build_object(
        'total_products', is_data.total_products,
        'low_stock_products', is_data.low_stock_products,
        'out_of_stock', is_data.out_of_stock,
        'total_stock_value', is_data.total_stock_value
      )
    ) INTO stats_data
    FROM order_stats os, inventory_stats is_data;
  EXCEPTION WHEN OTHERS THEN
    stats_data := json_build_object('error', 'Failed to fetch stats', 'message', SQLERRM);
  END;

  -- ================================================================
  -- 9. أحدث الطلبات (عادية وأونلاين)
  -- ================================================================
  SELECT json_build_object(
    'recent_orders', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', o.id,
          'slug', o.slug,
          'customer_order_number', o.customer_order_number,
          'status', o.status,
          'payment_status', o.payment_status,
          'total', o.total,
          'created_at', o.created_at,
          'customer_name', o.name,
          'customer_phone', o.phone,
          'items', COALESCE(o.items_data, '[]'::json)
        )
      ), '[]'::json)
      FROM (
        SELECT o.*, c.name, c.phone,
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', oi.id,
                     'product_name', oi.product_name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'total_price', oi.total_price
                   )
                 )
                 FROM order_items oi 
                 WHERE oi.order_id = o.id
               ) as items_data
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.organization_id = p_organization_id 
          AND (o.is_online = false OR o.is_online IS NULL)
        ORDER BY o.created_at DESC
        LIMIT 10
      ) o
    ),
    'recent_online_orders', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', oo.id,
          'total', oo.total,
          'status', oo.status,
          'created_at', oo.created_at,
          'customer_order_number', oo.customer_order_number,
          'payment_status', oo.payment_status,
          'shipping_method', oo.shipping_method,
          'customer_name', oo.customer_name,
          'items', COALESCE(oo.items_data, '[]'::json)
        )
      ), '[]'::json)
      FROM (
        SELECT oo.*, 
               COALESCE(c.name, 'عميل غير محدد') as customer_name,
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', ooi.id,
                     'product_name', ooi.product_name,
                     'quantity', ooi.quantity,
                     'unit_price', ooi.unit_price,
                     'total_price', ooi.total_price
                   )
                 )
                 FROM online_order_items ooi 
                 WHERE ooi.order_id = oo.id
               ) as items_data
        FROM online_orders oo
        LEFT JOIN customers c ON c.id = oo.customer_id
        WHERE oo.organization_id = p_organization_id
        ORDER BY oo.created_at DESC
        LIMIT 5
      ) oo
    )
  ) INTO orders_data;

  -- ================================================================
  -- 10. بيانات إضافية للولايات والتحليلات وتحليلات الزوار
  -- ================================================================
  SELECT json_build_object(
    'provinces_global', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'province_id', combined.province_id,
          'province_name', combined.province_name,
          'order_count', combined.order_count,
          'total_revenue', combined.total_revenue,
          'avg_order_value', combined.avg_order_value
        )
      ), '[]'::json)
      FROM (
        SELECT 
          COALESCE(yp.id::text, 'unknown') as province_id,
          COALESCE(yp.name_ar, 'ولاية غير محددة') as province_name,
          COUNT(oo.id) as order_count,
          COALESCE(SUM(oo.total), 0) as total_revenue,
          CASE 
            WHEN COUNT(oo.id) > 0 THEN COALESCE(SUM(oo.total), 0) / COUNT(oo.id)
            ELSE 0 
          END as avg_order_value
        FROM yalidine_provinces_global yp
        LEFT JOIN online_orders_view oo ON oo.province = yp.id::text 
          AND oo.organization_id = p_organization_id
        GROUP BY yp.id, yp.name_ar
        HAVING COUNT(oo.id) > 0
        ORDER BY COUNT(oo.id) DESC
        LIMIT 5
      ) combined
    ),
    'top_selling_products', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'product_id', tsp.product_id,
          'product_name', tsp.product_name,
          'total_sold', tsp.total_sold,
          'total_revenue', tsp.total_revenue
        )
      ), '[]'::json)
      FROM (
        SELECT 
          oi.product_id,
          oi.product_name,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.organization_id = p_organization_id
          AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY oi.product_id, oi.product_name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 10
      ) tsp
    ),
    'visitor_analytics', (
      SELECT json_build_object(
        'traffic_overview', json_build_object(
          'total_views', COALESCE(SUM(vs.page_views), 0),
          'total_sessions', COUNT(DISTINCT vs.session_id),
          'unique_visitors', COUNT(DISTINCT vs.visitor_id),
          'avg_session_duration', COALESCE(AVG(EXTRACT(EPOCH FROM (vs.last_activity - vs.start_time))), 0)
        ),
        'traffic_by_device', (
          SELECT COALESCE(json_object_agg(vs.device_type, device_count), '{}'::json)
          FROM (
            SELECT vs.device_type, COUNT(*) as device_count
            FROM visitor_sessions vs
            WHERE vs.organization_id = p_organization_id
              AND vs.start_time >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY vs.device_type
          ) vs
        ),
        'traffic_by_location', (
          SELECT COALESCE(json_object_agg(vs.country, location_count), '{}'::json)
          FROM (
            SELECT vs.country, COUNT(*) as location_count
            FROM visitor_sessions vs
            WHERE vs.organization_id = p_organization_id
              AND vs.start_time >= CURRENT_DATE - INTERVAL '30 days'
              AND vs.country IS NOT NULL
            GROUP BY vs.country
          ) vs
        ),
        'traffic_by_time', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'hour', time_data.hour,
              'day_of_week', time_data.day_of_week,
              'session_count', time_data.session_count,
              'page_views', time_data.page_views
            )
          ), '[]'::json)
          FROM (
            SELECT 
              EXTRACT(HOUR FROM vs.start_time) as hour,
              EXTRACT(DOW FROM vs.start_time) as day_of_week,
              COUNT(DISTINCT vs.session_id) as session_count,
              SUM(vs.page_views) as page_views
            FROM visitor_sessions vs
            WHERE vs.organization_id = p_organization_id
              AND vs.start_time >= CURRENT_DATE - INTERVAL '30 days'
              AND EXTRACT(HOUR FROM vs.start_time) BETWEEN 9 AND 21
            GROUP BY EXTRACT(HOUR FROM vs.start_time), EXTRACT(DOW FROM vs.start_time)
            ORDER BY hour, day_of_week
          ) time_data
        ),
        'popular_pages', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'page_url', page_data.page_url,
              'view_count', page_data.view_count,
              'unique_visitors', page_data.unique_visitors
            )
          ), '[]'::json)
          FROM (
            SELECT 
              pv.page_url,
              COUNT(*) as view_count,
              COUNT(DISTINCT pv.visitor_id) as unique_visitors
            FROM page_views pv
            WHERE pv.organization_id = p_organization_id
              AND pv.timestamp >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY pv.page_url
            ORDER BY COUNT(*) DESC
            LIMIT 10
          ) page_data
        ),
        'top_products_by_views', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'product_id', product_data.product_id,
              'product_name', product_data.product_name,
              'view_count', product_data.view_count,
              'unique_visitors', product_data.unique_visitors
            )
          ), '[]'::json)
          FROM (
            SELECT 
              vs.product_id,
              p.name as product_name,
              COUNT(*) as view_count,
              COUNT(DISTINCT vs.visitor_id) as unique_visitors
            FROM visitor_sessions vs
            LEFT JOIN products p ON p.id = vs.product_id
            WHERE vs.organization_id = p_organization_id
              AND vs.product_id IS NOT NULL
              AND vs.start_time >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY vs.product_id, p.name
            ORDER BY COUNT(*) DESC
            LIMIT 10
          ) product_data
        )
      )
      FROM visitor_sessions vs
      WHERE vs.organization_id = p_organization_id
        AND vs.start_time >= CURRENT_DATE - INTERVAL '30 days'
      LIMIT 1
    ),
    'online_order_analytics', (
      SELECT json_build_object(
        'overview', json_build_object(
          'total_orders', COUNT(oo.id),
          'total_revenue', COALESCE(SUM(oo.total), 0),
          'average_order_value', CASE 
            WHEN COUNT(oo.id) > 0 THEN COALESCE(SUM(oo.total), 0) / COUNT(oo.id)
            ELSE 0 
          END,
          'completion_rate', CASE 
            WHEN COUNT(oo.id) > 0 THEN 
              (COUNT(oo.id) FILTER (WHERE oo.status IN ('delivered', 'completed'))::numeric / COUNT(oo.id)::numeric) * 100
            ELSE 0 
          END
        ),
        'status_breakdown', (
          SELECT COALESCE(json_object_agg(
            status_data.status, 
            json_build_object(
              'count', status_data.count,
              'percentage', status_data.percentage
            )
          ), '{}'::json)
          FROM (
            SELECT 
              oo.status,
              COUNT(*) as count,
              CASE 
                WHEN (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days') > 0 
                THEN (COUNT(*)::numeric / (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric) * 100
                ELSE 0 
              END as percentage
            FROM online_orders oo
            WHERE oo.organization_id = p_organization_id
              AND oo.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY oo.status
          ) status_data
        ),
        'payment_status_breakdown', (
          SELECT COALESCE(json_object_agg(
            payment_data.payment_status, 
            json_build_object(
              'count', payment_data.count,
              'percentage', payment_data.percentage,
              'total_amount', payment_data.total_amount
            )
          ), '{}'::json)
          FROM (
            SELECT 
              oo.payment_status,
              COUNT(*) as count,
              CASE 
                WHEN (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days') > 0 
                THEN (COUNT(*)::numeric / (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric) * 100
                ELSE 0 
              END as percentage,
              COALESCE(SUM(oo.total), 0) as total_amount
            FROM online_orders oo
            WHERE oo.organization_id = p_organization_id
              AND oo.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY oo.payment_status
          ) payment_data
        ),
        'call_confirmation_breakdown', (
          SELECT COALESCE(json_object_agg(
            call_data.status_name, 
            json_build_object(
              'count', call_data.count,
              'percentage', call_data.percentage,
              'color', call_data.color,
              'icon', call_data.icon
            )
          ), '{}'::json)
          FROM (
            SELECT 
              COALESCE(ccs.name, 'غير محدد') as status_name,
              COUNT(*) as count,
              CASE 
                WHEN (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days') > 0 
                THEN (COUNT(*)::numeric / (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric) * 100
                ELSE 0 
              END as percentage,
              COALESCE(ccs.color, '#6b7280') as color,
              ccs.icon
            FROM online_orders oo
            LEFT JOIN call_confirmation_statuses ccs ON ccs.id = oo.call_confirmation_status_id
            WHERE oo.organization_id = p_organization_id
              AND oo.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY ccs.name, ccs.color, ccs.icon
          ) call_data
        ),
        'payment_method_breakdown', (
          SELECT COALESCE(json_object_agg(
            method_data.payment_method, 
            json_build_object(
              'count', method_data.count,
              'percentage', method_data.percentage,
              'total_amount', method_data.total_amount
            )
          ), '{}'::json)
          FROM (
            SELECT 
              oo.payment_method,
              COUNT(*) as count,
              CASE 
                WHEN (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days') > 0 
                THEN (COUNT(*)::numeric / (SELECT COUNT(*) FROM online_orders WHERE organization_id = p_organization_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric) * 100
                ELSE 0 
              END as percentage,
              COALESCE(SUM(oo.total), 0) as total_amount
            FROM online_orders oo
            WHERE oo.organization_id = p_organization_id
              AND oo.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY oo.payment_method
          ) method_data
        )
      )
      FROM online_orders oo
      WHERE oo.organization_id = p_organization_id
        AND oo.created_at >= CURRENT_DATE - INTERVAL '30 days'
      LIMIT 1
    )
  ) INTO provinces_data;

  -- ================================================================
  -- 11. تجميع النتيجة النهائية
  -- ================================================================
  SELECT json_build_object(
    'organization', organization_data,
    'user', user_data,
    'settings', settings_data,
    'products', products_data,
    'categories', categories_data,
    'customers_and_users', customers_data,
    'apps_and_subscription', apps_data,
    'stats', stats_data,
    'orders', orders_data,
    'additional_data', provinces_data,
    'fetched_at', NOW(),
    'organization_id', p_organization_id
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة الخطأ، إرجاع خطأ مفصل
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'organization_id', p_organization_id,
      'fetched_at', NOW()
    );
END;
$$;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_global_data_organization ON organizations(id);
CREATE INDEX IF NOT EXISTS idx_global_data_users_org ON users(organization_id, id);
CREATE INDEX IF NOT EXISTS idx_global_data_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_global_data_orders_org_online_date ON orders(organization_id, is_online, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_data_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_data_product_categories_org ON product_categories(organization_id, is_active);

-- إضافة تعليق للدالة
COMMENT ON FUNCTION get_global_data_complete(UUID, UUID) IS 
'دالة موحدة لجلب جميع البيانات العامة للمؤسسة في استدعاء واحد. تهدف لتقليل 40+ استدعاء HTTP إلى استدعاء واحد فقط.'; 