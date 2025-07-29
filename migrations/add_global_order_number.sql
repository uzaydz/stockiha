-- إضافة حقل global_order_number للحصول على ترقيم عام للطلبيات
-- يتم تشغيل هذا المايجريشن لحل مشكلة ترتيب الطلبيات حسب الرقم العام

-- إضافة العمود الجديد إلى كلا الجدولين
ALTER TABLE orders ADD COLUMN IF NOT EXISTS global_order_number SERIAL;
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS global_order_number SERIAL;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_orders_global_order_number ON orders(global_order_number);
CREATE INDEX IF NOT EXISTS idx_online_orders_global_order_number ON online_orders(global_order_number);

-- دالة لتحديث الأرقام الموجودة حسب تاريخ الإنشاء
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
BEGIN
    -- تحديث جميع الطلبيات الموجودة بأرقام متسلسلة حسب تاريخ الإنشاء
    -- أولاً: تحديث جدول orders
    FOR rec IN 
        SELECT id FROM orders 
        ORDER BY created_at ASC
    LOOP
        UPDATE orders 
        SET global_order_number = counter 
        WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
    
    -- ثانياً: تحديث جدول online_orders
    FOR rec IN 
        SELECT id FROM online_orders 
        ORDER BY created_at ASC
    LOOP
        UPDATE online_orders 
        SET global_order_number = counter 
        WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- إنشاء دالة trigger لتوليد الرقم العام تلقائياً للطلبيات الجديدة
CREATE OR REPLACE FUNCTION generate_global_order_number()
RETURNS TRIGGER AS $$
BEGIN
    -- الحصول على أعلى رقم عام موجود من كلا الجدولين وإضافة 1
    IF NEW.global_order_number IS NULL THEN
        SELECT COALESCE(
            GREATEST(
                (SELECT MAX(global_order_number) FROM orders), 
                (SELECT MAX(global_order_number) FROM online_orders)
            ), 0
        ) + 1
        INTO NEW.global_order_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للطلبيات الجديدة على كلا الجدولين
DROP TRIGGER IF EXISTS set_global_order_number ON orders;
DROP TRIGGER IF EXISTS set_global_order_number ON online_orders;
CREATE TRIGGER set_global_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_global_order_number();
CREATE TRIGGER set_global_order_number_online
    BEFORE INSERT ON online_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_global_order_number();

-- إضافة تعليق توضيحي
COMMENT ON COLUMN orders.global_order_number IS 'رقم متسلسل عام لجميع الطلبيات في النظام';
COMMENT ON FUNCTION generate_global_order_number() IS 'دالة توليد الرقم العام للطلبيات تلقائياً'; 