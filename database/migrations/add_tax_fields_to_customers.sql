-- =====================================================
-- إضافة حقول ضريبية لجدول العملاء
-- للامتثال الضريبي الجزائري وتكامل مع كشف 104
-- =====================================================

-- إضافة الحقول الجديدة إلى جدول customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nif VARCHAR(15), -- رقم التعريف الجبائي
ADD COLUMN IF NOT EXISTS rc VARCHAR(50), -- رقم السجل التجاري
ADD COLUMN IF NOT EXISTS nis VARCHAR(50), -- رقم التعريف الإحصائي
ADD COLUMN IF NOT EXISTS rib VARCHAR(50), -- الهوية البنكية
ADD COLUMN IF NOT EXISTS address TEXT; -- العنوان الكامل

-- إضافة تعليقات على الأعمدة
COMMENT ON COLUMN customers.nif IS 'رقم التعريف الجبائي (NIF) - 15 رقم';
COMMENT ON COLUMN customers.rc IS 'رقم السجل التجاري (RC)';
COMMENT ON COLUMN customers.nis IS 'رقم التعريف الإحصائي (NIS)';
COMMENT ON COLUMN customers.rib IS 'الهوية البنكية (RIB)';
COMMENT ON COLUMN customers.address IS 'العنوان الكامل للعميل';

-- إنشاء فهرس على NIF للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_nif ON customers(nif) WHERE nif IS NOT NULL;

-- إنشاء فهرس على RC للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_rc ON customers(rc) WHERE rc IS NOT NULL;

-- =====================================================
-- ملاحظات:
-- 1. جميع الحقول اختيارية (nullable)
-- 2. يمكن استخدام هذه البيانات في كشف 104
-- 3. الفهارس تسرع البحث عن العملاء حسب NIF أو RC
-- =====================================================
