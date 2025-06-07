-- إضافة مزود Maystro Delivery (مصحح حسب البنية الحقيقية)

-- 1. التحقق من وجود مايسترو باسم مختلف
SELECT id, code, name FROM shipping_providers WHERE code IN ('maystro', 'mayesto', 'maystro_delivery');

-- 2. إضافة مزود Maystro Delivery (إذا لم يكن موجوداً)
INSERT INTO shipping_providers (
  code,
  name,
  is_active,
  base_url,
  created_at,
  updated_at
) VALUES (
  'maystro_delivery',
  'مايسترو ديليفري',
  true,
  'https://backend.maystro-delivery.com/api/',
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  updated_at = NOW();

-- 3. التحقق من النتيجة
SELECT 
  id, 
  code, 
  name, 
  is_active, 
  base_url 
FROM shipping_providers 
WHERE code = 'maystro_delivery';

-- 4. عرض جميع مزودي الخدمة
SELECT 
  id,
  code,
  name,
  is_active
FROM shipping_providers 
ORDER BY 
  CASE 
    WHEN code IN ('yalidine', 'zrexpress', 'maystro_delivery', 'ecotrack') THEN 1
    ELSE 2
  END,
  name;

-- إضافة تعليق للمطورين
COMMENT ON TABLE shipping_providers IS 'جدول مزودي خدمات الشحن المدعومين في النظام';
COMMENT ON COLUMN shipping_providers.code IS 'رمز مزود الشحن الفريد (مثل: yalidine, zrexpress, maystro)';
COMMENT ON COLUMN shipping_providers.name IS 'اسم مزود الشحن للعرض';
COMMENT ON COLUMN shipping_providers.base_url IS 'الرابط الأساسي لـ API مزود الشحن';
COMMENT ON COLUMN shipping_providers.supports_tracking IS 'هل يدعم مزود الشحن تتبع الطرود';
COMMENT ON COLUMN shipping_providers.supports_labeling IS 'هل يدعم مزود الشحن إنشاء ملصقات الشحن';
COMMENT ON COLUMN shipping_providers.supports_cod IS 'هل يدعم مزود الشحن الدفع عند الاستلام'; 