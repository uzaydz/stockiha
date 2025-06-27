-- استعادة الـ triggers بعد الاختبار

-- 1. حذف triggers الاختبار
DROP TRIGGER IF EXISTS test_orders_trigger ON orders;
DROP TRIGGER IF EXISTS test_order_items_trigger ON order_items;
DROP FUNCTION IF EXISTS test_trigger_function();

-- 2. إعادة تفعيل triggers الأصلية
ALTER TABLE order_items ENABLE TRIGGER log_sales_trigger;
ALTER TABLE orders ENABLE TRIGGER refresh_stats_on_orders_simple;
ALTER TABLE orders ENABLE TRIGGER update_pos_stats_trigger;

RAISE NOTICE 'تم استعادة جميع الـ triggers الأصلية'; 