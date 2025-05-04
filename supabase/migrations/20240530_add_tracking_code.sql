-- إضافة عمود كود التتبع العام
ALTER TABLE service_bookings ADD COLUMN public_tracking_code TEXT;

-- ملء الخانة بأكواد تتبع للسجلات الموجودة
UPDATE service_bookings
SET public_tracking_code = 'SRV-' 
  || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') 
  || '-' 
  || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE public_tracking_code IS NULL;

-- إنشاء وظيفة لإنشاء كود تتبع عام فريد
CREATE OR REPLACE FUNCTION generate_public_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  order_code TEXT;
  service_count INTEGER;
  service_index TEXT;
BEGIN
  -- استخراج جزء من رقم الطلب (آخر 4 أرقام من UUID)
  order_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- حساب عدد الخدمات في نفس الطلب وإضافة 1 للحصول على المؤشر الحالي
  SELECT COUNT(*) + 1 INTO service_count
  FROM service_bookings
  WHERE order_id = NEW.order_id;
  
  -- تنسيق المؤشر كـ 4 أرقام بدءا من 1001
  service_index := LPAD((1000 + service_count)::TEXT, 4, '0');
  
  -- إنشاء كود التتبع بتنسيق SRV-XXXX-YYYY
  NEW.public_tracking_code := 'SRV-' || order_code || '-' || service_index;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء ترقر لتعيين كود التتبع العام تلقائياً
CREATE TRIGGER set_public_tracking_code
BEFORE INSERT ON service_bookings
FOR EACH ROW
WHEN (NEW.public_tracking_code IS NULL)
EXECUTE FUNCTION generate_public_tracking_code();

-- إضافة فهرس لتسريع البحث عن طريق كود التتبع العام
CREATE INDEX idx_service_bookings_tracking_code ON service_bookings(public_tracking_code);

-- منع تكرار أكواد التتبع (اختياري)
ALTER TABLE service_bookings ADD CONSTRAINT unique_public_tracking_code UNIQUE (public_tracking_code);

-- إضافة تعليق توضيحي للعمود
COMMENT ON COLUMN service_bookings.public_tracking_code IS 'كود تتبع عام بتنسيق SRV-XXXX-YYYY لاستخدامه في واجهة التتبع العامة'; 