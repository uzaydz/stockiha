-- ===================================================
-- وظائف نقطة البيع - POS Orders Functions
-- ===================================================

-- دالة لجلب إحصائيات طلبيات نقطة البيع
CREATE OR REPLACE FUNCTION get_pos_order_stats(p_organization_id UUID)
RETURNS TABLE (
  total_orders INTEGER,
  total_revenue NUMERIC,
  completed_orders INTEGER,
  pending_orders INTEGER,
  cancelled_orders INTEGER,
  cash_orders INTEGER,
  card_orders INTEGER,
  avg_order_value NUMERIC,
  today_orders INTEGER,
  today_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_count,
      COALESCE(SUM(o.total), 0) as total_rev,
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::INTEGER as completed_count,
      COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::INTEGER as pending_count,
      COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::INTEGER as cancelled_count,
      COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END)::INTEGER as cash_count,
      COUNT(CASE WHEN o.payment_method = 'card' THEN 1 END)::INTEGER as card_count
    FROM orders o
    WHERE o.organization_id = p_organization_id 
      AND o.is_online = false
  ),
  today_stats AS (
    SELECT 
      COUNT(*)::INTEGER as today_count,
      COALESCE(SUM(o.total), 0) as today_rev
    FROM orders o
    WHERE o.organization_id = p_organization_id 
      AND o.is_online = false
      AND DATE(o.created_at) = CURRENT_DATE
  )
  SELECT 
    os.total_count,
    os.total_rev,
    os.completed_count,
    os.pending_count,
    os.cancelled_count,
    os.cash_count,
    os.card_count,
    CASE 
      WHEN os.total_count > 0 THEN os.total_rev / os.total_count 
      ELSE 0 
    END,
    ts.today_count,
    ts.today_rev
  FROM order_stats os, today_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لجلب ملخص المبيعات اليومية لنقطة البيع
CREATE OR REPLACE FUNCTION get_daily_pos_summary(
  p_organization_id UUID,
  p_date DATE
)
RETURNS TABLE (
  orders_count INTEGER,
  total_revenue NUMERIC,
  cash_sales NUMERIC,
  card_sales NUMERIC,
  completed_orders INTEGER,
  pending_orders INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as orders_count,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0) as cash_sales,
    COALESCE(SUM(CASE WHEN o.payment_method = 'card' THEN o.total ELSE 0 END), 0) as card_sales,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::INTEGER as completed_orders,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::INTEGER as pending_orders
  FROM orders o
  WHERE o.organization_id = p_organization_id 
    AND o.is_online = false
    AND DATE(o.created_at) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_orders_pos_org_date 
ON orders(organization_id, created_at) 
WHERE is_online = false;

CREATE INDEX IF NOT EXISTS idx_orders_pos_status 
ON orders(organization_id, status) 
WHERE is_online = false;

CREATE INDEX IF NOT EXISTS idx_orders_pos_payment_method 
ON orders(organization_id, payment_method) 
WHERE is_online = false;

CREATE INDEX IF NOT EXISTS idx_orders_pos_employee 
ON orders(organization_id, employee_id) 
WHERE is_online = false;

-- إضافة تعليقات للوظائف
COMMENT ON FUNCTION get_pos_order_stats IS 'جلب إحصائيات شاملة لطلبيات نقطة البيع لمؤسسة معينة';
COMMENT ON FUNCTION get_daily_pos_summary IS 'جلب ملخص المبيعات اليومية لنقطة البيع لتاريخ معين';

-- إنشاء view محسن لطلبيات نقطة البيع مع التفاصيل
CREATE OR REPLACE VIEW pos_orders_with_details AS
SELECT 
  o.*,
  c.name as customer_name,
  c.phone as customer_phone,
  c.email as customer_email,
  e.name as employee_name,
  e.email as employee_email,
  COUNT(oi.id) as items_count,
  COALESCE(SUM(oi.quantity), 0) as total_quantity
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN employees e ON e.id = o.employee_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.is_online = false
GROUP BY o.id, c.name, c.phone, c.email, e.name, e.email;

-- إضافة تعليق للـ view
COMMENT ON VIEW pos_orders_with_details IS 'عرض محسن لطلبيات نقطة البيع مع تفاصيل العملاء والموظفين والعناصر';

-- دالة لتحديث إحصائيات الطلبيات (للاستخدام في الـ triggers)
CREATE OR REPLACE FUNCTION update_pos_order_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- هنا يمكن إضافة منطق لتحديث جدول إحصائيات منفصل إذا لزم الأمر
  -- لكن حالياً نعتمد على الاستعلامات المباشرة
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث الإحصائيات عند تغيير الطلبيات
DROP TRIGGER IF EXISTS update_pos_stats_trigger ON orders;
CREATE TRIGGER update_pos_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_order_stats();

-- دالة للبحث في طلبيات نقطة البيع
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
    e.name as employee_name,
    COUNT(oi.id) as items_count
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN employees e ON e.id = o.employee_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.organization_id = p_organization_id 
    AND o.is_online = false
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
  GROUP BY o.id, c.name, e.name
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعليق للدالة
COMMENT ON FUNCTION search_pos_orders IS 'البحث المتقدم في طلبيات نقطة البيع مع فلترة وترقيم الصفحات';

RAISE NOTICE 'تم إنشاء وظائف نقطة البيع بنجاح!';
RAISE NOTICE 'الوظائف المتاحة:';
RAISE NOTICE '- get_pos_order_stats(organization_id): إحصائيات شاملة';
RAISE NOTICE '- get_daily_pos_summary(organization_id, date): ملخص يومي';
RAISE NOTICE '- search_pos_orders(...): البحث المتقدم';
RAISE NOTICE '- pos_orders_with_details: عرض محسن للطلبيات';