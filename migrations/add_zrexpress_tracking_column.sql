-- إضافة عمود رقم تتبع ZR Express إلى جدول الطلبيات
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS zrexpress_tracking_id TEXT;

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_online_orders_zrexpress_tracking 
ON online_orders(zrexpress_tracking_id) 
WHERE zrexpress_tracking_id IS NOT NULL;

-- إضافة تعليق على العمود
COMMENT ON COLUMN online_orders.zrexpress_tracking_id IS 'رقم تتبع الشحنة من ZR Express'; 