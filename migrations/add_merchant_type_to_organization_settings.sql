-- إضافة حقل نوع التاجر إلى جدول إعدادات المؤسسة
-- Migration: add_merchant_type_to_organization_settings
-- Date: 2024-01-15
-- Description: إضافة حقل merchant_type لتحديد نوع التاجر (traditional, ecommerce, both)

-- إضافة العمود الجديد مع القيمة الافتراضية
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS merchant_type VARCHAR(20) DEFAULT 'both' CHECK (merchant_type IN ('traditional', 'ecommerce', 'both'));

-- إضافة تعليق على العمود
COMMENT ON COLUMN organization_settings.merchant_type IS 'نوع التاجر: traditional (تقليدي), ecommerce (إلكتروني), both (كلاهما)';

-- تحديث السجلات الموجودة - جميع السجلات الحالية ستكون 'both' افتراضياً
-- يمكن للمستخدمين تغيير هذا لاحقاً من الإعدادات
UPDATE organization_settings 
SET merchant_type = 'both'
WHERE merchant_type IS NULL;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_organization_settings_merchant_type 
ON organization_settings(merchant_type);
