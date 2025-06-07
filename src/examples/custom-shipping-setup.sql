-- إعداد الشحن المخصص - مثال تجريبي
-- تأكد من تغيير organization_id إلى المؤسسة الصحيحة

-- 1. إنشاء إعدادات شحن مخصصة مع أسعار موحدة
INSERT INTO shipping_provider_settings (
  organization_id,
  provider_id,
  api_key,
  api_token,
  is_enabled,
  settings,
  created_at,
  updated_at
) VALUES (
  'YOUR_ORGANIZATION_ID_HERE', -- غير هذا لمعرف المؤسسة الصحيح
  NULL, -- NULL للطرق المخصصة
  'custom_shipping',
  'custom_shipping_token',
  TRUE,
  '{
    "use_unified_price": true,
    "unified_home_price": 800,
    "unified_desk_price": 300,
    "is_free_delivery_home": false,
    "is_free_delivery_desk": false,
    "default_price": 800
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (organization_id, api_key) 
DO UPDATE SET 
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- 2. مثال آخر: إعدادات أسعار مخصصة بحسب الولاية
INSERT INTO shipping_provider_settings (
  organization_id,
  provider_id,
  api_key,
  api_token,
  is_enabled,
  settings,
  created_at,
  updated_at
) VALUES (
  'YOUR_ORGANIZATION_ID_HERE_2', -- غير هذا لمعرف مؤسسة أخرى
  NULL,
  'custom_shipping',
  'custom_shipping_token',
  TRUE,
  '{
    "use_unified_price": false,
    "custom_rates": {
      "16": {
        "home_delivery": 500,
        "office_delivery": 200
      },
      "31": {
        "home_delivery": 600,
        "office_delivery": 250
      },
      "6": {
        "home_delivery": 700,
        "office_delivery": 300
      },
      "25": {
        "home_delivery": 900,
        "office_delivery": 400
      }
    },
    "default_price": 800,
    "is_free_delivery_home": false,
    "is_free_delivery_desk": false
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (organization_id, api_key) 
DO UPDATE SET 
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- 3. مثال: توصيل مجاني للمنزل ومدفوع للمكتب
INSERT INTO shipping_provider_settings (
  organization_id,
  provider_id,
  api_key,
  api_token,
  is_enabled,
  settings,
  created_at,
  updated_at
) VALUES (
  'YOUR_ORGANIZATION_ID_HERE_3', -- غير هذا لمعرف مؤسسة ثالثة
  NULL,
  'custom_shipping',
  'custom_shipping_token',
  TRUE,
  '{
    "use_unified_price": true,
    "unified_home_price": 0,
    "unified_desk_price": 200,
    "is_free_delivery_home": true,
    "is_free_delivery_desk": false,
    "default_price": 0
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (organization_id, api_key) 
DO UPDATE SET 
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- 4. التحقق من الإعدادات المنشأة
SELECT 
  id,
  organization_id,
  api_key,
  is_enabled,
  settings,
  created_at
FROM shipping_provider_settings 
WHERE api_key = 'custom_shipping' 
  AND is_enabled = TRUE
ORDER BY created_at DESC;

-- 5. تحديث منتج ليستخدم الشحن المخصص (مثال)
-- استبدل PRODUCT_ID بمعرف المنتج الفعلي
UPDATE products 
SET 
  shipping_method_type = 'custom',
  shipping_provider_id = NULL,
  updated_at = NOW()
WHERE id = 'PRODUCT_ID_HERE'
  AND organization_id = 'YOUR_ORGANIZATION_ID_HERE';

-- 6. دالة مساعدة للتحقق من أسعار الشحن
CREATE OR REPLACE FUNCTION get_custom_shipping_price(
  org_id UUID,
  province_id TEXT,
  delivery_type TEXT DEFAULT 'home'
) RETURNS NUMERIC AS $$
DECLARE
  shipping_settings JSONB;
  province_rates JSONB;
  price NUMERIC := 0;
BEGIN
  -- جلب إعدادات الشحن المخصصة
  SELECT settings INTO shipping_settings
  FROM shipping_provider_settings 
  WHERE organization_id = org_id 
    AND api_key = 'custom_shipping' 
    AND is_enabled = TRUE;
  
  IF shipping_settings IS NULL THEN
    RETURN 0;
  END IF;
  
  -- التحقق من الأسعار الموحدة
  IF (shipping_settings->>'use_unified_price')::boolean = TRUE THEN
    IF delivery_type = 'home' THEN
      IF (shipping_settings->>'is_free_delivery_home')::boolean = TRUE THEN
        RETURN 0;
      ELSE
        RETURN COALESCE((shipping_settings->>'unified_home_price')::numeric, 0);
      END IF;
    ELSE
      IF (shipping_settings->>'is_free_delivery_desk')::boolean = TRUE THEN
        RETURN 0;
      ELSE
        RETURN COALESCE((shipping_settings->>'unified_desk_price')::numeric, 0);
      END IF;
    END IF;
  END IF;
  
  -- البحث عن أسعار مخصصة
  province_rates := shipping_settings->'custom_rates'->province_id;
  
  IF province_rates IS NOT NULL THEN
    IF delivery_type = 'home' THEN
      price := COALESCE((province_rates->>'home_delivery')::numeric, 0);
    ELSE
      price := COALESCE((province_rates->>'office_delivery')::numeric, 0);
    END IF;
  END IF;
  
  -- إذا لم نجد سعر، استخدم السعر الافتراضي
  IF price = 0 THEN
    price := COALESCE((shipping_settings->>'default_price')::numeric, 0);
  END IF;
  
  RETURN price;
END;
$$ LANGUAGE plpgsql STABLE;

-- مثال لاستخدام الدالة
-- SELECT get_custom_shipping_price('YOUR_ORGANIZATION_ID_HERE'::uuid, '16', 'home'); 