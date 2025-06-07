-- الحل الصحيح: إضافة مايسترو حسب النظام الموجود

-- 1. إضافة الشركة (فقط إذا لم تكن موجودة)
INSERT INTO shipping_providers (code, name, is_active, base_url, created_at, updated_at) 
VALUES ('maystro_delivery', 'مايسترو ديليفري', true, 'https://backend.maystro-delivery.com/api/', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 2. إضافة عمود التتبع (مثل باقي الشركات)
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS maystro_tracking_id TEXT;

-- 3. إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_online_orders_maystro_tracking 
ON online_orders(maystro_tracking_id) 
WHERE maystro_tracking_id IS NOT NULL;

-- 4. التحقق من النتيجة
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'online_orders' 
  AND column_name LIKE '%tracking%'
ORDER BY column_name; 