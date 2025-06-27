-- ===================================================
-- إصلاح مشكلة GROUP BY مع users.name في نقطة البيع
-- ===================================================

-- 1. حذف الـ views والـ functions المشكوك فيها أولاً
DROP VIEW IF EXISTS pos_orders_with_details CASCADE;
DROP VIEW IF EXISTS pos_orders_with_returns_calculated CASCADE;
DROP VIEW IF EXISTS pos_orders_summary CASCADE;
DROP VIEW IF EXISTS pos_orders_display CASCADE;

-- حذف الدوال القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_pos_order_stats(UUID);
DROP FUNCTION IF EXISTS get_daily_pos_summary(UUID, DATE);
DROP FUNCTION IF EXISTS search_pos_orders(UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_pos_orders_with_returns(UUID, INTEGER, INTEGER, TEXT, UUID, UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_pos_orders_stats_with_returns(UUID);

-- 2. إنشاء view محسن لطلبيات نقطة البيع (مع إصلاح GROUP BY)
CREATE OR REPLACE VIEW pos_orders_with_details AS
SELECT 
  o.id,
  o.organization_id,
  o.customer_id,
  o.employee_id,
  o.slug,
  o.customer_order_number,
  o.status,
  o.payment_status,
  o.payment_method,
  o.total,
  o.subtotal,
  o.tax,
  o.discount,
  o.amount_paid,
  o.remaining_amount,
  o.pos_order_type,
  o.notes,
  o.is_online,
  o.created_at,
  o.updated_at,
  o.completed_at,
  c.name as customer_name,
  c.phone as customer_phone,
  c.email as customer_email,
  u.name as employee_name,
  u.email as employee_email,
  COUNT(oi.id) as items_count,
  COALESCE(SUM(oi.quantity), 0) as total_quantity
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN users u ON u.id = o.employee_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE (o.is_online = false OR o.is_online IS NULL)
GROUP BY 
  o.id, o.organization_id, o.customer_id, o.employee_id, o.slug, 
  o.customer_order_number, o.status, o.payment_status, o.payment_method,
  o.total, o.subtotal, o.tax, o.discount, o.amount_paid, o.remaining_amount,
  o.pos_order_type, o.notes, o.is_online, o.created_at, o.updated_at, o.completed_at,
  c.name, c.phone, c.email, u.name, u.email;

-- 3. إنشاء view مبسط للاستعلامات السريعة
CREATE OR REPLACE VIEW pos_orders_summary AS
SELECT 
  o.id,
  o.organization_id,
  o.customer_id,
  o.employee_id,
  o.slug,
  o.customer_order_number,
  o.status,
  o.payment_status,
  o.payment_method,
  o.total,
  o.created_at,
  o.updated_at,
  c.name as customer_name,
  u.name as employee_name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN users u ON u.id = o.employee_id
WHERE (o.is_online = false OR o.is_online IS NULL)
ORDER BY o.created_at DESC;

-- 4. دالة محسنة لجلب إحصائيات طلبيات نقطة البيع
CREATE OR REPLACE FUNCTION get_pos_order_stats(p_organization_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue NUMERIC,
  completed_orders BIGINT,
  pending_orders BIGINT,
  cancelled_orders BIGINT,
  cash_orders BIGINT,
  card_orders BIGINT,
  avg_order_value NUMERIC,
  today_orders BIGINT,
  today_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_orders,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COUNT(*) FILTER (WHERE o.status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
    COUNT(*) FILTER (WHERE o.payment_method = 'cash') as cash_orders,
    COUNT(*) FILTER (WHERE o.payment_method != 'cash') as card_orders,
    COALESCE(AVG(o.total), 0) as avg_order_value,
    COUNT(*) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE) as today_orders,
    COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0) as today_revenue
  FROM orders o
  WHERE o.organization_id = p_organization_id 
    AND (o.is_online = false OR o.is_online IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. دالة محسنة لجلب ملخص المبيعات اليومية
CREATE OR REPLACE FUNCTION get_daily_pos_summary(
  p_organization_id UUID,
  p_date DATE
)
RETURNS TABLE (
  orders_count BIGINT,
  total_revenue NUMERIC,
  cash_sales NUMERIC,
  card_sales NUMERIC,
  completed_orders BIGINT,
  pending_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as orders_count,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0) as cash_sales,
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total ELSE 0 END), 0) as card_sales,
    COUNT(*) FILTER (WHERE o.status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders
  FROM orders o
  WHERE o.organization_id = p_organization_id 
    AND (o.is_online = false OR o.is_online IS NULL)
    AND DATE(o.created_at) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. دالة محسنة للبحث في طلبيات نقطة البيع (بدون GROUP BY معقد)
CREATE OR REPLACE FUNCTION search_pos_orders(
  p_organization_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  subtotal NUMERIC,
  tax NUMERIC,
  discount NUMERIC,
  total NUMERIC,
  status TEXT,
  payment_method TEXT,
  payment_status TEXT,
  employee_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  slug TEXT,
  customer_name TEXT,
  employee_name TEXT,
  items_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH order_items_count AS (
    SELECT 
      oi.order_id,
      COUNT(oi.id) as item_count
    FROM order_items oi
    GROUP BY oi.order_id
  )
  SELECT 
    o.id,
    o.customer_id,
    o.subtotal,
    o.tax,
    o.discount,
    o.total,
    o.status,
    o.payment_method,
    o.payment_status,
    o.employee_id,
    o.created_at,
    o.updated_at,
    o.slug,
    c.name as customer_name,
    u.name as employee_name,
    COALESCE(oic.item_count, 0) as items_count
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.employee_id
  LEFT JOIN order_items_count oic ON oic.order_id = o.id
  WHERE o.organization_id = p_organization_id 
    AND (o.is_online = false OR o.is_online IS NULL)
    AND (p_search_term IS NULL OR (
      o.slug ILIKE '%' || p_search_term || '%' OR
      o.notes ILIKE '%' || p_search_term || '%' OR
      c.name ILIKE '%' || p_search_term || '%'
    ))
    AND (p_status IS NULL OR o.status = p_status)
    AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
    AND (p_employee_id IS NULL OR o.employee_id = p_employee_id)
    AND (p_date_from IS NULL OR DATE(o.created_at) >= p_date_from)
    AND (p_date_to IS NULL OR DATE(o.created_at) <= p_date_to)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. دالة للحصول على طلبية واحدة مع تفاصيلها (بدون GROUP BY)
CREATE OR REPLACE FUNCTION get_pos_order_details(p_order_id UUID)
RETURNS TABLE (
  -- معلومات الطلبية
  order_id UUID,
  order_slug TEXT,
  customer_order_number INTEGER,
  status TEXT,
  payment_status TEXT,
  payment_method TEXT,
  total NUMERIC,
  subtotal NUMERIC,
  tax NUMERIC,
  discount NUMERIC,
  amount_paid NUMERIC,
  remaining_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- معلومات العميل
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- معلومات الموظف
  employee_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  
  -- معلومات العناصر
  items_count BIGINT,
  total_quantity BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      oi.order_id,
      COUNT(oi.id) as item_count,
      COALESCE(SUM(oi.quantity), 0) as total_qty
    FROM order_items oi
    WHERE oi.order_id = p_order_id
    GROUP BY oi.order_id
  )
  SELECT 
    -- معلومات الطلبية
    o.id,
    o.slug,
    o.customer_order_number,
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
    o.customer_id,
    c.name,
    c.phone,
    c.email,
    
    -- معلومات الموظف
    o.employee_id,
    u.name,
    u.email,
    
    -- معلومات العناصر
    COALESCE(os.item_count, 0),
    COALESCE(os.total_qty, 0)
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.employee_id
  LEFT JOIN order_stats os ON os.order_id = o.id
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. إنشاء فهارس محسنة للأداء
CREATE INDEX IF NOT EXISTS idx_orders_pos_org_online_created 
ON orders(organization_id, is_online, created_at DESC)
WHERE (is_online = false OR is_online IS NULL);

CREATE INDEX IF NOT EXISTS idx_orders_pos_status_payment 
ON orders(organization_id, status, payment_status, payment_method)
WHERE (is_online = false OR is_online IS NULL);

CREATE INDEX IF NOT EXISTS idx_orders_pos_employee_date 
ON orders(organization_id, employee_id, created_at DESC)
WHERE (is_online = false OR is_online IS NULL);

CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON order_items(order_id, product_id, quantity);

-- 9. إضافة تعليقات للتوضيح
COMMENT ON VIEW pos_orders_with_details IS 'عرض محسن لطلبيات نقطة البيع - تم إصلاح مشكلة GROUP BY';
COMMENT ON VIEW pos_orders_summary IS 'عرض مبسط لطلبيات نقطة البيع للاستعلامات السريعة';
COMMENT ON FUNCTION get_pos_order_stats IS 'جلب إحصائيات شاملة لطلبيات نقطة البيع';
COMMENT ON FUNCTION get_daily_pos_summary IS 'جلب ملخص المبيعات اليومية لنقطة البيع';
COMMENT ON FUNCTION search_pos_orders IS 'البحث المتقدم في طلبيات نقطة البيع مع فلترة وترقيم الصفحات';
COMMENT ON FUNCTION get_pos_order_details IS 'جلب تفاصيل طلبية واحدة من نقطة البيع مع جميع المعلومات المرتبطة';

-- 10. إصلاح دالة create_pos_order_fast إذا كانت تحتوي على مشاكل
DROP FUNCTION IF EXISTS create_pos_order_fast(UUID, UUID, JSON, DECIMAL, UUID, TEXT, TEXT, TEXT);

-- 11. إعادة إنشاء دالة create_pos_order_fast المحسنة
CREATE OR REPLACE FUNCTION create_pos_order_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items JSON,
    p_total_amount DECIMAL,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_id UUID;
    v_order_slug VARCHAR;
    v_customer_order_number INTEGER;
    v_item JSON;
    v_result JSON;
BEGIN
    -- توليد معرف فريد
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;

    -- الحصول على رقم طلبية العميل التالي
    SELECT COALESCE(MAX(customer_order_number), 0) + 1 
    INTO v_customer_order_number 
    FROM orders 
    WHERE organization_id = p_organization_id;

    -- إنشاء الطلبية الرئيسية
    INSERT INTO orders (
        id,
        organization_id,
        customer_id,
        employee_id,
        slug,
        customer_order_number,
        status,
        payment_status,
        payment_method,
        total,
        subtotal,
        tax,
        discount,
        amount_paid,
        pos_order_type,
        notes,
        is_online,
        created_at,
        updated_at,
        completed_at
    ) VALUES (
        v_new_order_id,
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        v_customer_order_number,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        p_total_amount,
        0,
        0,
        CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
        'pos',
        p_notes,
        false,
        NOW(),
        NOW(),
        NOW()
    );

    -- إضافة عناصر الطلبية
    IF json_typeof(p_items::json) = 'array' THEN
        FOR v_item IN SELECT * FROM json_array_elements(p_items::json)
        LOOP
            INSERT INTO order_items (
                id,
                order_id,
                product_id,
                product_name,
                name,
                quantity,
                unit_price,
                total_price,
                organization_id,
                slug,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_new_order_id,
                (v_item->>'product_id')::UUID,
                COALESCE(v_item->>'name', 'منتج'),
                COALESCE(v_item->>'name', 'منتج'),
                (v_item->>'quantity')::INTEGER,
                (v_item->>'price')::DECIMAL,
                (v_item->>'total')::DECIMAL,
                p_organization_id,
                'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INTEGER,
                NOW()
            );
        END LOOP;
    END IF;

    -- إنشاء الاستجابة
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', p_payment_status,
        'total', p_total_amount,
        'items_count', CASE 
            WHEN json_typeof(p_items::json) = 'array' THEN json_array_length(p_items::json) 
            ELSE 1 
        END,
        'created_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'message', 'فشل في إنشاء الطلب: ' || SQLERRM
    );
END;
$$;

-- 12. منح الصلاحيات
GRANT SELECT ON pos_orders_with_details TO authenticated;
GRANT SELECT ON pos_orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_order_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_pos_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION search_pos_orders(UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_order_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_pos_order_fast(UUID, UUID, JSON, DECIMAL, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 13. إشعارات النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة GROUP BY في نقطة البيع بنجاح!';
    RAISE NOTICE '📊 تم إنشاء Views محسنة: pos_orders_with_details, pos_orders_summary';
    RAISE NOTICE '🔧 تم إنشاء دوال محسنة: get_pos_order_stats, get_daily_pos_summary, search_pos_orders';
    RAISE NOTICE '⚡ تم إصلاح دالة create_pos_order_fast';
    RAISE NOTICE '🚀 النظام جاهز للاستخدام!';
END;
$$; 