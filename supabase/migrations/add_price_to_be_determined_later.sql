-- إضافة عمود "السعر يحدد لاحقاً" لجدول طلبات التصليح
-- تاريخ الإنشاء: 2024-12-21

-- إضافة العمود الجديد
ALTER TABLE repair_orders 
ADD COLUMN IF NOT EXISTS price_to_be_determined_later BOOLEAN DEFAULT FALSE;

-- إضافة تعليق توضيحي للعمود
COMMENT ON COLUMN repair_orders.price_to_be_determined_later IS 'يحدد ما إذا كان السعر سيتم تحديده لاحقاً أم لا';

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS repair_orders_price_tbd_idx ON repair_orders(price_to_be_determined_later);

-- تحديث الحقول الموجودة (اختياري - لضمان التوافق مع البيانات الموجودة)
-- جعل total_price قابل للإلغاء عندما يكون price_to_be_determined_later = true
ALTER TABLE repair_orders 
ALTER COLUMN total_price DROP NOT NULL;

-- إضافة constraint للتأكد من صحة البيانات
-- إما أن يكون السعر محدد أو يكون مؤجل التحديد
ALTER TABLE repair_orders 
ADD CONSTRAINT check_price_consistency 
CHECK (
  (price_to_be_determined_later = FALSE AND total_price IS NOT NULL AND total_price >= 0) 
  OR 
  (price_to_be_determined_later = TRUE)
);

-- تحديث البيانات الموجودة لضمان التوافق
UPDATE repair_orders 
SET price_to_be_determined_later = FALSE 
WHERE price_to_be_determined_later IS NULL 
AND total_price IS NOT NULL; 