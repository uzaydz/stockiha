-- تعطيل الـ triggers مؤقتاً لاختبار مشكلة GROUP BY
-- هذا ملف تجريبي لمعرفة ما إذا كانت المشكلة في الـ triggers

-- 1. تعطيل trigger معالجة المخزون
ALTER TABLE order_items DISABLE TRIGGER log_sales_trigger;
RAISE NOTICE 'تم تعطيل log_sales_trigger';

-- 2. تعطيل triggers الإحصائيات على orders
ALTER TABLE orders DISABLE TRIGGER refresh_stats_on_orders_simple;
ALTER TABLE orders DISABLE TRIGGER update_pos_stats_trigger;
RAISE NOTICE 'تم تعطيل triggers الإحصائيات';

-- 3. إنشاء trigger بديل مؤقت لتسجيل العمليات فقط
CREATE OR REPLACE FUNCTION test_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'TRIGGER TEST: % على جدول %', TG_OP, TG_TABLE_NAME;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. إضافة trigger اختبار
CREATE TRIGGER test_orders_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION test_trigger_function();

CREATE TRIGGER test_order_items_trigger
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION test_trigger_function();

RAISE NOTICE 'تم إضافة triggers الاختبار';
RAISE NOTICE 'جرب إنشاء طلب POS الآن وراقب console للرسائل'; 