-- إضافة حقل slug إلى جدول service_progress
ALTER TABLE service_progress ADD COLUMN IF NOT EXISTS slug TEXT;

-- إضافة حقل slug إلى جدول transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS slug TEXT;

-- إضافة حقل slug إلى أي جدول آخر قد يحتاجه (احتياطي)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS slug TEXT;

-- تحديث السجلات الموجودة بقيم افتراضية للحقل slug
UPDATE service_progress SET slug = 'progress-' || id WHERE slug IS NULL;
UPDATE transactions SET slug = 'transaction-' || id WHERE slug IS NULL;
UPDATE order_items SET slug = 'item-' || id WHERE slug IS NULL;
UPDATE service_bookings SET slug = 'booking-' || id WHERE slug IS NULL;

-- إضافة ملاحظة للمستخدم
-- بعد تنفيذ هذا الملف، يجب تعديل الكود في ShopContext.tsx لإضافة حقل slug عند إنشاء سجلات جديدة 