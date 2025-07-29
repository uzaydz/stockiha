-- إضافة الأعمدة المفقودة لشركات التوصيل في جدول online_orders
-- Add missing shipping provider columns to online_orders table

-- إضافة عمود yalidine_label_url إذا لم يكن موجوداً
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS yalidine_label_url TEXT;

-- إضافة عمود zrexpress_label_url إذا لم يكن موجوداً  
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS zrexpress_label_url TEXT;

-- إضافة عمود ecotrack_label_url إذا لم يكن موجوداً
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS ecotrack_label_url TEXT;

-- إضافة عمود maystro_label_url إذا لم يكن موجوداً
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS maystro_label_url TEXT;

-- التأكد من وجود عمود shipping_provider (يجب أن يكون موجود)
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS shipping_provider TEXT;

-- إضافة تعليقات للأعمدة الجديدة
COMMENT ON COLUMN online_orders.yalidine_label_url IS 'رابط ملصق الشحن من ياليدين';
COMMENT ON COLUMN online_orders.zrexpress_label_url IS 'رابط ملصق الشحن من ZR Express';
COMMENT ON COLUMN online_orders.ecotrack_label_url IS 'رابط ملصق الشحن من Ecotrack';
COMMENT ON COLUMN online_orders.maystro_label_url IS 'رابط ملصق الشحن من Maystro';
COMMENT ON COLUMN online_orders.shipping_provider IS 'شركة التوصيل المستخدمة (yalidine, zrexpress, ecotrack, maystro)';

-- إنشاء فهرس لتحسين الأداء على shipping_provider
CREATE INDEX IF NOT EXISTS idx_online_orders_shipping_provider ON online_orders(shipping_provider);

-- رسالة نجاح
DO $$ 
BEGIN 
  RAISE NOTICE 'تم إضافة أعمدة شركات التوصيل بنجاح إلى جدول online_orders';
END $$; 