-- ✅ إصلاح سريع للمخزون - منتج خاص للتجريب
-- التاريخ: 2025-07-03

-- إصلاح المخزون للمنتج المتضرر (من 18 إلى 14 - بعد خصم 4 مبيعات لم تُحسب)
UPDATE products 
SET stock_quantity = 14, -- المخزون الصحيح بعد 6 مبيعات من 20
    last_inventory_update = NOW(),
    updated_at = NOW()
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- التحقق من الإصلاح
SELECT 
    name as "اسم المنتج",
    stock_quantity as "المخزون الحالي",
    last_inventory_update as "آخر تحديث"
FROM products 
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- رسالة التأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح المخزون بنجاح!';
    RAISE NOTICE '📈 المخزون الصحيح: 14 قطعة';
    RAISE NOTICE '🎯 يمكنك الآن اختبار طلب جديد';
END $$; 