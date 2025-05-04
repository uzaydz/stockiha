-- تعديل نوع البيانات لحقل ID في جدول service_bookings من UUID إلى TEXT
-- لدعم أكواد التتبع بتنسيق SRV-XXXX-XXXX

-- إزالة القيود الأجنبية أولاً من جدول service_progress
ALTER TABLE service_progress
DROP CONSTRAINT IF EXISTS service_progress_service_booking_id_fkey;

-- إزالة القيود الأساسية من جدول service_bookings
ALTER TABLE service_bookings
DROP CONSTRAINT IF EXISTS service_bookings_pkey;

-- تغيير نوع البيانات لحقل id في جدول service_bookings
ALTER TABLE service_bookings
ALTER COLUMN id TYPE TEXT;

-- تغيير نوع البيانات لحقل service_booking_id في جدول service_progress
ALTER TABLE service_progress
ALTER COLUMN service_booking_id TYPE TEXT;

-- إعادة إنشاء القيد الأساسي لجدول service_bookings
ALTER TABLE service_bookings
ADD PRIMARY KEY (id);

-- إعادة إنشاء المفتاح الأجنبي لجدول service_progress
ALTER TABLE service_progress
ADD CONSTRAINT service_progress_service_booking_id_fkey
FOREIGN KEY (service_booking_id) REFERENCES service_bookings(id);

-- إضافة تعليق توضيحي للحقل
COMMENT ON COLUMN service_bookings.id IS 'معرف فريد للحجز، يستخدم كرمز للتتبع بتنسيق SRV-XXXX-XXXX';
COMMENT ON COLUMN service_progress.service_booking_id IS 'معرف حجز الخدمة المرتبط، يستخدم تنسيق SRV-XXXX-XXXX'; 