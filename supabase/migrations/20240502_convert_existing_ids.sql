-- تحويل معرفات الحجوزات الموجودة إلى تنسيق SRV-XXXX-XXXX

-- حفظ المعرفات القديمة في حقل مؤقت
ALTER TABLE service_bookings 
ADD COLUMN old_id UUID;

-- نسخ المعرفات القديمة إلى الحقل المؤقت
UPDATE service_bookings
SET old_id = id::uuid;

-- إنشاء تنسيق جديد للمعرفات باستخدام وظيفة للحصول على أرقام عشوائية
DO $$
DECLARE
  sb RECORD;
  new_id TEXT;
  part1 TEXT;
  part2 TEXT;
BEGIN
  FOR sb IN SELECT old_id FROM service_bookings LOOP
    -- إنشاء رقمين عشوائيين بين 1000 و 9999
    part1 := (1000 + floor(random() * 9000))::TEXT;
    part2 := (1000 + floor(random() * 9000))::TEXT;
    new_id := 'SRV-' || part1 || '-' || part2;
    
    -- تحديث المعرف
    UPDATE service_bookings
    SET id = new_id
    WHERE old_id = sb.old_id;
    
    -- تحديث service_progress مع المعرف الجديد
    UPDATE service_progress
    SET service_booking_id = new_id
    WHERE service_booking_id::uuid = sb.old_id;
  END LOOP;
END $$;

-- التحقق من عدم وجود تعارضات في المعرفات
DO $$
DECLARE
  duplicate_count INT;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT id) 
  INTO duplicate_count
  FROM service_bookings;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'تم العثور على % معرف متكرر. يرجى إعادة تنفيذ السكريبت.', duplicate_count;
  END IF;
END $$;

-- إزالة العمود المؤقت بعد الانتهاء
ALTER TABLE service_bookings
DROP COLUMN old_id; 