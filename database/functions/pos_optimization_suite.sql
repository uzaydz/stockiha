-- ===============================================================
-- 🚀 POS Optimization Suite - مجموعة تحسين شاملة لنظام نقطة البيع
-- ===============================================================
-- تاريخ الإنشاء: 2024-12-19
-- الهدف: حل مشاكل الأداء وتقليل الاستدعاءات المتكررة
-- المطور: AI Assistant
-- ===============================================================

-- ===============================================================
-- 📊 الدالة الرئيسية: جلب جميع بيانات صفحة POS في استدعاء واحد
-- ===============================================================
CREATE OR REPLACE FUNCTION get_pos_page_comprehensive_data(
  p_organization_id UUID,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_orders JSONB;
  v_stats JSONB;
  v_pos_settings JSONB;
  v_employees JSONB;
  v_organization_settings JSONB;
  v_total_count INTEGER;
  v_status_filter TEXT;
  v_payment_method_filter TEXT;
  v_employee_filter UUID;
  v_date_from_filter DATE;
  v_date_to_filter DATE;
BEGIN
  -- استخراج الفلاتر من JSONB
  v_status_filter := p_filters->>'status';
  v_payment_method_filter := p_filters->>'payment_method';
  v_employee_filter := (p_filters->>'employee_id')::UUID;
  v_date_from_filter := (p_filters->>'date_from')::DATE;
  v_date_to_filter := (p_filters->>'date_to')::DATE;

  -- 1. جلب إحصائيات POS الشاملة بشكل مُحسن
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'total_revenue', COALESCE(SUM(total), 0),
    'completed_orders', COUNT(CASE WHEN status = 'completed' THEN 1 END),
    'pending_orders', COUNT(CASE WHEN status = 'pending' THEN 1 END),
    'cancelled_orders', COUNT(CASE WHEN status = 'cancelled' THEN 1 END),
    'cash_orders', COUNT(CASE WHEN payment_method = 'cash' THEN 1 END),
    'card_orders', COUNT(CASE WHEN payment_method != 'cash' THEN 1 END),
    'avg_order_value', COALESCE(AVG(total), 0),
    'today_orders', COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END),
    'today_revenue', COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total END), 0),
    'this_week_orders', COUNT(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN 1 END),
    'this_month_orders', COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END),
    'pending_payment_orders', COUNT(CASE WHEN payment_status = 'pending' THEN 1 END)
  ) INTO v_stats
  FROM orders 
  WHERE organization_id = p_organization_id 
    AND is_online = false;

  -- 2. حساب العدد الإجمالي للطلبات مع الفلاتر
  SELECT COUNT(*) INTO v_total_count
  FROM orders o
  WHERE o.organization_id = p_organization_id 
    AND o.is_online = false
    AND (v_status_filter IS NULL OR o.status = v_status_filter)
    AND (v_payment_method_filter IS NULL OR o.payment_method = v_payment_method_filter)
    AND (v_employee_filter IS NULL OR o.employee_id = v_employee_filter)
    AND (v_date_from_filter IS NULL OR DATE(o.created_at) >= v_date_from_filter)
    AND (v_date_to_filter IS NULL OR DATE(o.created_at) <= v_date_to_filter);

  -- 3. جلب الطلبات مع البيانات المرتبطة في استعلام واحد محسّن
  WITH order_data AS (
    SELECT 
      o.id,
      o.customer_order_number,
      o.slug,
      o.customer_id,
      o.employee_id,
      o.status,
      o.payment_status,
      o.payment_method,
      o.total,
      o.subtotal,
      o.tax,
      o.discount,
      o.amount_paid,
      o.remaining_amount,
      o.notes,
      o.created_at,
      o.updated_at,
      o.completed_at,
      -- معلومات العميل
      COALESCE(c.name, 'زائر') as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      -- معلومات الموظف
      u.name as employee_name,
      u.email as employee_email,
      -- إحصائيات العناصر
      COUNT(oi.id) as items_count,
      COALESCE(SUM(oi.quantity), 0) as total_quantity,
      -- معلومات المبيعات
      o.pos_order_type,
      o.metadata
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.employee_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.organization_id = p_organization_id 
      AND o.is_online = false
      AND (v_status_filter IS NULL OR o.status = v_status_filter)
      AND (v_payment_method_filter IS NULL OR o.payment_method = v_payment_method_filter)
      AND (v_employee_filter IS NULL OR o.employee_id = v_employee_filter)
      AND (v_date_from_filter IS NULL OR DATE(o.created_at) >= v_date_from_filter)
      AND (v_date_to_filter IS NULL OR DATE(o.created_at) <= v_date_to_filter)
    GROUP BY o.id, c.name, c.phone, c.email, u.name, u.email
    ORDER BY o.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit
  )
  SELECT jsonb_agg(
    json_build_object(
      'id', od.id,
      'customer_order_number', od.customer_order_number,
      'slug', od.slug,
      'customer_id', od.customer_id,
      'employee_id', od.employee_id,
      'status', od.status,
      'payment_status', od.payment_status,
      'payment_method', od.payment_method,
      'total', od.total,
      'subtotal', od.subtotal,
      'tax', od.tax,
      'discount', od.discount,
      'amount_paid', od.amount_paid,
      'remaining_amount', od.remaining_amount,
      'notes', od.notes,
      'created_at', od.created_at,
      'updated_at', od.updated_at,
      'completed_at', od.completed_at,
      'customer_name', od.customer_name,
      'customer_phone', od.customer_phone,
      'customer_email', od.customer_email,
      'employee_name', od.employee_name,
      'employee_email', od.employee_email,
      'items_count', od.items_count,
      'total_quantity', od.total_quantity,
      'pos_order_type', od.pos_order_type,
      'metadata', od.metadata
    )
  ) INTO v_orders FROM order_data od;

  -- 4. جلب إعدادات POS (بدون الحقول الثقيلة غير الضرورية)
  SELECT json_build_object(
    'id', ps.id,
    'organization_id', ps.organization_id,
    'store_name', ps.store_name,
    'store_phone', ps.store_phone,
    'store_email', ps.store_email,
    'currency_symbol', ps.currency_symbol,
    'currency_position', ps.currency_position,
    'tax_label', ps.tax_label,
    'primary_color', ps.primary_color,
    'secondary_color', ps.secondary_color,
    'receipt_template', ps.receipt_template,
    'paper_width', ps.paper_width,
    'font_size', ps.font_size,
    'show_store_logo', ps.show_store_logo,
    'show_customer_info', ps.show_customer_info,
    'allow_price_edit', ps.allow_price_edit,
    'created_at', ps.created_at,
    'updated_at', ps.updated_at
  ) INTO v_pos_settings
  FROM pos_settings ps 
  WHERE ps.organization_id = p_organization_id;

  -- 5. جلب قائمة الموظفين النشطين فقط
  SELECT jsonb_agg(json_build_object(
    'id', id,
    'name', name,
    'email', email,
    'role', role,
    'is_org_admin', COALESCE(is_org_admin, false),
    'last_activity_at', last_activity_at
  )) INTO v_employees
  FROM users 
  WHERE organization_id = p_organization_id 
    AND is_active = true
  ORDER BY name;

  -- 6. جلب إعدادات المؤسسة الأساسية فقط
  SELECT json_build_object(
    'id', id,
    'name', name,
    'subscription_tier', subscription_tier,
    'subscription_status', subscription_status,
    'logo_url', logo_url,
    'domain', domain,
    'created_at', created_at
  ) INTO v_organization_settings
  FROM organizations 
  WHERE id = p_organization_id;

  -- 7. تجميع النتائج النهائية
  v_result := json_build_object(
    'success', true,
    'data', json_build_object(
      'stats', v_stats,
      'orders', COALESCE(v_orders, '[]'::jsonb),
      'pos_settings', v_pos_settings,
      'employees', COALESCE(v_employees, '[]'::jsonb),
      'organization_settings', v_organization_settings
    ),
    'pagination', json_build_object(
      'page', p_page,
      'limit', p_limit,
      'total_count', v_total_count,
      'total_pages', CEIL(v_total_count::DECIMAL / p_limit),
      'has_more', v_total_count > p_page * p_limit,
      'has_previous', p_page > 1
    ),
    'filters_applied', p_filters,
    'timestamp', NOW(),
    'cache_key', 'pos_comprehensive_' || p_organization_id || '_' || p_page || '_' || md5(p_filters::text)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- في حالة الخطأ، إرجاع رسالة خطأ مفيدة
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 🛍️ دالة محسّنة: جلب المنتجات مع المتغيرات في استدعاء واحد
-- ===============================================================
CREATE OR REPLACE FUNCTION get_pos_products_optimized_batch(
  p_organization_id UUID,
  p_search TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
  v_products JSONB;
  v_stats JSONB;
  v_categories JSONB;
  v_total_count INTEGER;
BEGIN
  -- حساب العدد الإجمالي للمنتجات
  SELECT COUNT(*) INTO v_total_count
  FROM products p
  WHERE p.organization_id = p_organization_id
    AND p.is_active = true
    AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%' OR p.barcode = p_search)
    AND (p_category_id IS NULL OR p.category_id = p_category_id);

  -- جلب المنتجات مع المتغيرات في استعلام واحد محسّن
  WITH products_with_variants AS (
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.compare_at_price,
      p.sku,
      p.barcode,
      p.category,
      p.category_id,
      p.brand,
      p.images,
      p.thumbnail_image,
      p.stock_quantity,
      p.purchase_price,
      p.wholesale_price,
      p.partial_wholesale_price,
      p.min_wholesale_quantity,
      p.min_partial_wholesale_quantity,
      p.allow_retail,
      p.allow_wholesale,
      p.allow_partial_wholesale,
      p.has_variants,
      p.use_sizes,
      p.is_digital,
      p.is_new,
      p.is_featured,
      p.is_active,
      p.min_stock_level,
      p.reorder_level,
      p.created_at,
      p.updated_at,
      -- حساب المخزون الفعلي مع المتغيرات
      CASE 
        WHEN p.has_variants THEN
          COALESCE((
            SELECT SUM(
              CASE WHEN pc.has_sizes 
              THEN (SELECT SUM(ps.quantity) FROM product_sizes ps WHERE ps.color_id = pc.id)
              ELSE pc.quantity END
            ) FROM product_colors pc WHERE pc.product_id = p.id
          ), p.stock_quantity)
        ELSE p.stock_quantity
      END as actual_stock,
      -- جلب الألوان والمقاسات
      CASE WHEN p.has_variants THEN
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', pc.id,
            'name', pc.name,
            'color_code', pc.color_code,
            'image_url', pc.image_url,
            'quantity', pc.quantity,
            'price', pc.price,
            'barcode', pc.barcode,
            'is_default', pc.is_default,
            'has_sizes', pc.has_sizes,
            'purchase_price', pc.purchase_price,
            'sizes', CASE WHEN pc.has_sizes THEN
              (SELECT jsonb_agg(jsonb_build_object(
                'id', ps.id,
                'size_name', ps.size_name,
                'quantity', ps.quantity,
                'price', ps.price,
                'barcode', ps.barcode,
                'is_default', ps.is_default,
                'purchase_price', ps.purchase_price
              ) ORDER BY ps.is_default DESC, ps.size_name) 
              FROM product_sizes ps WHERE ps.color_id = pc.id)
            ELSE NULL END
          ) ORDER BY pc.is_default DESC, pc.name
        ) FROM product_colors pc WHERE pc.product_id = p.id)
      ELSE NULL END as variants,
      -- تحديد حالة المخزون
      CASE 
        WHEN p.stock_quantity = 0 THEN 'out_of_stock'
        WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low_stock'
        ELSE 'in_stock'
      END as stock_status
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%' OR p.barcode = p_search)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY p.name
    LIMIT p_limit OFFSET (p_page - 1) * p_limit
  )
  SELECT jsonb_agg(to_jsonb(products_with_variants)) INTO v_products FROM products_with_variants;

  -- إحصائيات المنتجات الشاملة
  SELECT json_build_object(
    'total_products', COUNT(*),
    'active_products', COUNT(CASE WHEN is_active = true THEN 1 END),
    'low_stock_products', COUNT(CASE WHEN is_active = true AND stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock_level, 5) THEN 1 END),
    'out_of_stock_products', COUNT(CASE WHEN is_active = true AND stock_quantity = 0 THEN 1 END),
    'products_with_variants', COUNT(CASE WHEN is_active = true AND has_variants = true THEN 1 END),
    'featured_products', COUNT(CASE WHEN is_active = true AND is_featured = true THEN 1 END),
    'digital_products', COUNT(CASE WHEN is_active = true AND is_digital = true THEN 1 END),
    'avg_product_price', COALESCE(AVG(CASE WHEN is_active = true THEN price END), 0),
    'total_inventory_value', COALESCE(SUM(CASE WHEN is_active = true THEN stock_quantity * COALESCE(purchase_price, price * 0.6) END), 0)
  ) INTO v_stats
  FROM products WHERE organization_id = p_organization_id;

  -- الفئات مع عدد المنتجات
  SELECT jsonb_agg(json_build_object(
    'id', pc.id,
    'name', pc.name,
    'description', pc.description,
    'is_active', pc.is_active,
    'products_count', (SELECT COUNT(*) FROM products WHERE category_id = pc.id AND is_active = true),
    'created_at', pc.created_at
  )) INTO v_categories
  FROM product_categories pc 
  WHERE pc.organization_id = p_organization_id AND pc.is_active = true
  ORDER BY pc.name;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'products', COALESCE(v_products, '[]'::jsonb),
      'stats', v_stats,
      'categories', COALESCE(v_categories, '[]'::jsonb)
    ),
    'pagination', json_build_object(
      'page', p_page,
      'limit', p_limit,
      'total_count', v_total_count,
      'total_pages', CEIL(v_total_count::DECIMAL / p_limit),
      'has_more', v_total_count > p_page * p_limit
    ),
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 👤 دالة محسّنة: جلب معلومات المستخدم والمؤسسة في استدعاء واحد
-- ===============================================================
CREATE OR REPLACE FUNCTION get_user_organization_comprehensive(
  p_user_id UUID DEFAULT NULL,
  p_auth_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user_data JSONB;
  v_organization_data JSONB;
  v_permissions JSONB;
BEGIN
  -- البحث عن المستخدم باستخدام user_id أو auth_user_id
  WITH user_info AS (
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.permissions,
      u.is_active,
      u.is_org_admin,
      u.is_super_admin,
      u.organization_id,
      u.avatar_url,
      u.last_activity_at,
      u.created_at,
      -- معلومات المؤسسة
      o.id as org_id,
      o.name as org_name,
      o.subscription_tier,
      o.subscription_status,
      o.logo_url as org_logo,
      o.domain,
      o.subdomain,
      o.settings as org_settings
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE (p_user_id IS NOT NULL AND u.id = p_user_id)
       OR (p_auth_user_id IS NOT NULL AND u.auth_user_id = p_auth_user_id)
    LIMIT 1
  )
  SELECT 
    json_build_object(
      'id', ui.id,
      'name', ui.name,
      'email', ui.email,
      'phone', ui.phone,
      'role', ui.role,
      'permissions', ui.permissions,
      'is_active', ui.is_active,
      'is_org_admin', COALESCE(ui.is_org_admin, false),
      'is_super_admin', COALESCE(ui.is_super_admin, false),
      'avatar_url', ui.avatar_url,
      'last_activity_at', ui.last_activity_at,
      'created_at', ui.created_at
    ) INTO v_user_data,
    json_build_object(
      'id', ui.org_id,
      'name', ui.org_name,
      'subscription_tier', ui.subscription_tier,
      'subscription_status', ui.subscription_status,
      'logo_url', ui.org_logo,
      'domain', ui.domain,
      'subdomain', ui.subdomain,
      'settings', ui.org_settings
    ) INTO v_organization_data
  FROM user_info ui;

  -- تحديد الصلاحيات بناءً على الدور
  SELECT json_build_object(
    'can_manage_products', CASE 
      WHEN v_user_data->>'is_super_admin' = 'true' THEN true
      WHEN v_user_data->>'is_org_admin' = 'true' THEN true
      WHEN v_user_data->>'role' IN ('admin', 'manager') THEN true
      WHEN (v_user_data->'permissions'->>'manageProducts')::boolean = true THEN true
      ELSE false
    END,
    'can_manage_orders', CASE 
      WHEN v_user_data->>'is_super_admin' = 'true' THEN true
      WHEN v_user_data->>'is_org_admin' = 'true' THEN true
      WHEN v_user_data->>'role' IN ('admin', 'manager', 'cashier') THEN true
      WHEN (v_user_data->'permissions'->>'manageOrders')::boolean = true THEN true
      ELSE false
    END,
    'can_manage_pos_settings', CASE 
      WHEN v_user_data->>'is_super_admin' = 'true' THEN true
      WHEN v_user_data->>'is_org_admin' = 'true' THEN true
      WHEN v_user_data->>'role' = 'admin' THEN true
      WHEN (v_user_data->'permissions'->>'managePOSSettings')::boolean = true THEN true
      ELSE false
    END,
    'can_view_reports', CASE 
      WHEN v_user_data->>'is_super_admin' = 'true' THEN true
      WHEN v_user_data->>'is_org_admin' = 'true' THEN true
      WHEN v_user_data->>'role' IN ('admin', 'manager') THEN true
      WHEN (v_user_data->'permissions'->>'viewReports')::boolean = true THEN true
      ELSE false
    END
  ) INTO v_permissions;

  -- تجميع النتيجة النهائية
  v_result := json_build_object(
    'success', true,
    'user', v_user_data,
    'organization', v_organization_data,
    'computed_permissions', v_permissions,
    'timestamp', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- ⚙️ دالة محسّنة: جلب إعدادات POS بشكل مُحسن (بديل للدالة البطيئة)
-- ===============================================================
CREATE OR REPLACE FUNCTION get_pos_settings_optimized(
  p_org_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_settings JSONB;
BEGIN
  -- جلب الإعدادات الأساسية فقط (بدون الحقول الثقيلة)
  SELECT json_build_object(
    'id', id,
    'organization_id', organization_id,
    'store_name', store_name,
    'store_phone', store_phone,
    'store_email', store_email,
    'store_address', store_address,
    'store_website', store_website,
    'currency_symbol', currency_symbol,
    'currency_position', currency_position,
    'tax_label', tax_label,
    'primary_color', primary_color,
    'secondary_color', secondary_color,
    'text_color', text_color,
    'background_color', background_color,
    'receipt_template', receipt_template,
    'paper_width', paper_width,
    'font_size', font_size,
    'line_spacing', line_spacing,
    'show_store_logo', show_store_logo,
    'show_customer_info', show_customer_info,
    'show_date_time', show_date_time,
    'show_employee_name', show_employee_name,
    'allow_price_edit', allow_price_edit,
    'require_manager_approval', require_manager_approval,
    'auto_cut', auto_cut,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_settings
  FROM pos_settings 
  WHERE organization_id = p_org_id;

  -- إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
  IF v_settings IS NULL THEN
    INSERT INTO pos_settings (
      organization_id,
      store_name,
      currency_symbol,
      currency_position,
      tax_label,
      primary_color,
      secondary_color,
      receipt_template,
      paper_width,
      font_size,
      show_store_logo,
      show_customer_info,
      allow_price_edit
    ) VALUES (
      p_org_id,
      'المتجر',
      'دج',
      'after',
      'الضريبة',
      '#0099ff',
      '#6c757d',
      'classic',
      58,
      10,
      true,
      true,
      false
    ) RETURNING json_build_object(
      'id', id,
      'organization_id', organization_id,
      'store_name', store_name,
      'store_phone', store_phone,
      'store_email', store_email,
      'currency_symbol', currency_symbol,
      'currency_position', currency_position,
      'tax_label', tax_label,
      'primary_color', primary_color,
      'secondary_color', secondary_color,
      'receipt_template', receipt_template,
      'paper_width', paper_width,
      'font_size', font_size,
      'show_store_logo', show_store_logo,
      'show_customer_info', show_customer_info,
      'allow_price_edit', allow_price_edit,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO v_settings;
  END IF;

  RETURN json_build_object(
    'success', true,
    'settings', v_settings,
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 📈 دالة محسّنة: إحصائيات سريعة لـ POS
-- ===============================================================
CREATE OR REPLACE FUNCTION get_pos_quick_stats(
  p_organization_id UUID,
  p_date_range TEXT DEFAULT 'today' -- 'today', 'week', 'month', 'year'
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- تحديد نطاق التاريخ
  CASE p_date_range
    WHEN 'today' THEN
      v_start_date := date_trunc('day', CURRENT_TIMESTAMP);
      v_end_date := date_trunc('day', CURRENT_TIMESTAMP) + interval '1 day';
    WHEN 'week' THEN
      v_start_date := date_trunc('week', CURRENT_TIMESTAMP);
      v_end_date := date_trunc('week', CURRENT_TIMESTAMP) + interval '1 week';
    WHEN 'month' THEN
      v_start_date := date_trunc('month', CURRENT_TIMESTAMP);
      v_end_date := date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month';
    WHEN 'year' THEN
      v_start_date := date_trunc('year', CURRENT_TIMESTAMP);
      v_end_date := date_trunc('year', CURRENT_TIMESTAMP) + interval '1 year';
    ELSE
      v_start_date := date_trunc('day', CURRENT_TIMESTAMP);
      v_end_date := date_trunc('day', CURRENT_TIMESTAMP) + interval '1 day';
  END CASE;

  -- جلب الإحصائيات المطلوبة
  SELECT json_build_object(
    'period', p_date_range,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'orders_count', COUNT(*),
    'total_revenue', COALESCE(SUM(total), 0),
    'avg_order_value', COALESCE(AVG(total), 0),
    'completed_orders', COUNT(CASE WHEN status = 'completed' THEN 1 END),
    'pending_orders', COUNT(CASE WHEN status = 'pending' THEN 1 END),
    'cancelled_orders', COUNT(CASE WHEN status = 'cancelled' THEN 1 END),
    'cash_revenue', COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total END), 0),
    'card_revenue', COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total END), 0),
    'total_items_sold', COALESCE((
      SELECT SUM(oi.quantity)
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.organization_id = p_organization_id
        AND o.is_online = false
        AND o.created_at >= v_start_date
        AND o.created_at < v_end_date
    ), 0)
  ) INTO v_stats
  FROM orders
  WHERE organization_id = p_organization_id
    AND is_online = false
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  RETURN json_build_object(
    'success', true,
    'stats', v_stats,
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 🔍 دالة البحث السريع في المنتجات
-- ===============================================================
CREATE OR REPLACE FUNCTION search_pos_products_fast(
  p_organization_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_products JSONB;
BEGIN
  -- البحث السريع في المنتجات
  WITH search_results AS (
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.barcode,
      p.price,
      p.stock_quantity,
      p.thumbnail_image,
      p.has_variants,
      -- حساب المخزون الفعلي للمتغيرات
      CASE 
        WHEN p.has_variants THEN
          COALESCE((
            SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id
          ), p.stock_quantity)
        ELSE p.stock_quantity
      END as actual_stock,
      -- درجة التطابق للترتيب
      CASE 
        WHEN p.barcode = p_query THEN 100
        WHEN p.sku = p_query THEN 90
        WHEN p.name ILIKE p_query || '%' THEN 80
        WHEN p.name ILIKE '%' || p_query || '%' THEN 70
        WHEN p.sku ILIKE p_query || '%' THEN 60
        WHEN p.sku ILIKE '%' || p_query || '%' THEN 50
        ELSE 40
      END as relevance_score
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true
      AND (
        p.name ILIKE '%' || p_query || '%'
        OR p.sku ILIKE '%' || p_query || '%'
        OR p.barcode = p_query
      )
    ORDER BY relevance_score DESC, p.name
    LIMIT p_limit
  )
  SELECT jsonb_agg(
    json_build_object(
      'id', sr.id,
      'name', sr.name,
      'sku', sr.sku,
      'barcode', sr.barcode,
      'price', sr.price,
      'stock_quantity', sr.stock_quantity,
      'actual_stock', sr.actual_stock,
      'thumbnail_image', sr.thumbnail_image,
      'has_variants', sr.has_variants,
      'relevance_score', sr.relevance_score
    )
  ) INTO v_products
  FROM search_results sr;

  RETURN json_build_object(
    'success', true,
    'products', COALESCE(v_products, '[]'::jsonb),
    'query', p_query,
    'timestamp', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- 📝 تعليقات ختامية وتوجيهات الاستخدام
-- ===============================================================

-- استخدام الدوال الجديدة:
-- 1. get_pos_page_comprehensive_data() - بديل لجميع استدعاءات POSOrdersDataContext
-- 2. get_pos_products_optimized_batch() - بديل لجميع استدعاءات POSDataContext للمنتجات
-- 3. get_user_organization_comprehensive() - بديل للاستدعاءات المتكررة في AddProductDialog
-- 4. get_pos_settings_optimized() - بديل سريع للدالة البطيئة get_pos_settings
-- 5. get_pos_quick_stats() - للإحصائيات السريعة
-- 6. search_pos_products_fast() - للبحث السريع في المنتجات

-- مثال على الاستخدام:
-- SELECT get_pos_page_comprehensive_data('6c2ed605-0880-4e40-af50-78f80f7283bb'::UUID, 1, 20, '{}'::JSONB);
-- SELECT get_pos_products_optimized_batch('6c2ed605-0880-4e40-af50-78f80f7283bb'::UUID);
-- SELECT get_user_organization_comprehensive(NULL, auth.uid());

-- تحسينات إضافية مقترحة:
-- 1. إضافة فهارس إضافية إذا لزم الأمر
-- 2. تفعيل Connection Pooling
-- 3. استخدام Redis للتخزين المؤقت في الواجهة الأمامية
-- 4. تنفيذ Lazy Loading للبيانات الثقيلة