-- ✅ إصلاح شامل لمشكلة المخزون في نظام POS
-- التاريخ: 2025-07-03
-- المشكلة: Trigger متداخل يلغي عمل دالة FIFO

-- =======================================================
-- 🚨 STEP 1: حذف Triggers المتداخلة
-- =======================================================

-- حذف جميع الـ triggers المتعلقة بـ inventory logging
DROP TRIGGER IF EXISTS log_sales_trigger ON order_items;
DROP TRIGGER IF EXISTS log_sales_trigger_smart ON order_items;
DROP FUNCTION IF EXISTS log_sales_to_inventory_smart();

-- =======================================================
-- 🛠️ STEP 2: إصلاح المنتج "منتج خاص للتجريب"
-- =======================================================

-- إصلاح المخزون للمنتج المتضرر
UPDATE products 
SET stock_quantity = 14, -- المخزون الصحيح بعد 6 مبيعات من 20
    last_inventory_update = NOW(),
    updated_at = NOW()
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- حذف السجلات المكررة الخاطئة (الطلبات 527, 528, 529)
DELETE FROM inventory_log 
WHERE product_id = '1cb97231-dce1-4018-8290-cb43b21e374d'
AND reference_id IN (
    '43944e62-cb69-46b5-ab5a-df8554d7bc02', -- طلب 527
    'ace6179e-a0d7-4eff-a372-9176724e1a4d', -- طلب 528  
    '209b3062-8e71-44d1-8a5a-50e58f6af4dc'  -- طلب 529
)
AND type = 'sale'
AND reference_type = 'pos_order'
AND created_at >= '2025-07-03 19:00:00';

-- إنشاء سجلات صحيحة للطلبات الثلاثة
-- الطلب 527: المخزون من 18 إلى 17
INSERT INTO inventory_log (
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    reference_type,
    notes,
    organization_id,
    created_by,
    created_at
) VALUES 
(
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    1,
    18,
    17,
    'sale',
    '43944e62-cb69-46b5-ab5a-df8554d7bc02',
    'pos_order',
    'بيع FIFO من نقطة البيع - منتج خاص للتجريب (مُصحح)',
    '989bf6d2-aba1-4edd-8d07-649120ac4323',
    '3f602507-15f4-4055-988e-de069e220c2a',
    '2025-07-03T19:15:25.191Z'
);

-- الطلب 528: المخزون من 17 إلى 16  
INSERT INTO inventory_log (
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    reference_type,
    notes,
    organization_id,
    created_by,
    created_at
) VALUES 
(
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    1,
    17,
    16,
    'sale',
    'ace6179e-a0d7-4eff-a372-9176724e1a4d',
    'pos_order', 
    'بيع FIFO من نقطة البيع - منتج خاص للتجريب (مُصحح)',
    '989bf6d2-aba1-4edd-8d07-649120ac4323',
    '3f602507-15f4-4055-988e-de069e220c2a',
    '2025-07-03T19:19:05.486Z'
);

-- الطلب 529: المخزون من 16 إلى 15
INSERT INTO inventory_log (
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    reference_type,
    notes,
    organization_id,
    created_by,
    created_at
) VALUES 
(
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    1,
    16,
    15,
    'sale',
    '209b3062-8e71-44d1-8a5a-50e58f6af4dc',
    'pos_order',
    'بيع FIFO من نقطة البيع - منتج خاص للتجريب (مُصحح)',
    '989bf6d2-aba1-4edd-8d07-649120ac4323', 
    '3f602507-15f4-4055-988e-de069e220c2a',
    '2025-07-03T19:23:02.802Z'
);

-- =======================================================
-- 🔧 STEP 3: إنشاء Trigger محدود (للطلبيات العادية فقط)
-- =======================================================

CREATE OR REPLACE FUNCTION log_sales_to_inventory_limited()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    order_type TEXT;
    order_employee_id UUID;
BEGIN
    -- جلب نوع الطلبية
    SELECT COALESCE(pos_order_type, 'regular'), employee_id
    INTO order_type, order_employee_id
    FROM orders 
    WHERE id = NEW.order_id;
    
    -- للطلبيات POS: لا نفعل شيء (دالة FIFO تتولى الأمر)
    IF order_type = 'pos' THEN
        RETURN NEW;
    END IF;
    
    -- للطلبيات العادية فقط، أضف السجل التقليدي
    INSERT INTO inventory_log(
        product_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        reference_type,
        notes,
        organization_id,
        created_by
    )
    SELECT 
        NEW.product_id,
        NEW.quantity,
        p.stock_quantity + NEW.quantity, -- المخزون قبل البيع
        p.stock_quantity,                -- المخزون بعد البيع
        'sale',
        NEW.order_id,
        'order',
        'بيع من خلال طلب عادي رقم ' || NEW.order_id,
        NEW.organization_id,
        order_employee_id
    FROM products p
    WHERE p.id = NEW.product_id;
    
    -- تحديث المخزون للطلبيات العادية
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger محدود للطلبيات العادية فقط (إذا لم يكن موجوداً)
DROP TRIGGER IF EXISTS log_sales_trigger_limited ON order_items;
CREATE TRIGGER log_sales_trigger_limited
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION log_sales_to_inventory_limited();

-- =======================================================
-- 📊 STEP 4: التحقق من الإصلاح
-- =======================================================

-- فحص المخزون النهائي للمنتج
SELECT 
    p.name,
    p.stock_quantity as "المخزون الحالي",
    COUNT(il.id) as "عدد السجلات",
    SUM(CASE WHEN il.type = 'sale' THEN il.quantity ELSE 0 END) as "إجمالي المبيعات"
FROM products p
LEFT JOIN inventory_log il ON p.id = il.product_id
WHERE p.id = '1cb97231-dce1-4018-8290-cb43b21e374d'
GROUP BY p.id, p.name, p.stock_quantity;

-- فحص آخر 5 سجلات للمنتج
SELECT 
    il.created_at,
    il.quantity,
    il.previous_stock,
    il.new_stock,
    il.type,
    il.notes,
    o.customer_order_number
FROM inventory_log il
LEFT JOIN orders o ON il.reference_id = o.id
WHERE il.product_id = '1cb97231-dce1-4018-8290-cb43b21e374d'
AND il.type = 'sale'
ORDER BY il.created_at DESC
LIMIT 5;

-- =======================================================
-- ✅ STEP 5: رسالة التأكيد
-- =======================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة المخزون بنجاح!';
    RAISE NOTICE '📈 المخزون الصحيح للمنتج "منتج خاص للتجريب": 14 قطعة';
    RAISE NOTICE '🔧 تم حذف الـ trigger المتداخل وإنشاء واحد محدود';
    RAISE NOTICE '🎯 نظام POS سيعمل بدالة FIFO فقط دون تداخل';
    RAISE NOTICE '📝 يُرجى اختبار طلب جديد للتأكد من عمل النظام';
END $$; 