-- تحديث دالة استنساخ مزود التوصيل
-- هذا الملف يحدث الدالة الموجودة لاستخدام أسعار حقيقية من جدول yalidine_fees
-- وإزالة خيارات المزامنة وبيانات API

-- حذف عمود sync_enabled من جدول نسخ مزودي التوصيل
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipping_provider_clones' AND column_name = 'sync_enabled'
  ) THEN
    ALTER TABLE shipping_provider_clones DROP COLUMN sync_enabled;
  END IF;
END $$;

-- إنشاء نسخة محدثة من دالة استنساخ مزود التوصيل
CREATE OR REPLACE FUNCTION clone_shipping_provider(
  p_organization_id UUID,
  p_original_provider_id INTEGER,
  p_new_name VARCHAR,
  p_copy_api_credentials BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
  v_clone_id INTEGER;
  v_api_token VARCHAR;
  v_api_key VARCHAR;
  v_province RECORD;
  v_from_wilaya_id INTEGER;
  v_home_fee INTEGER;
  v_desk_fee INTEGER;
BEGIN
  -- الحصول على بيانات API إذا كان مطلوبًا نسخها
  IF p_copy_api_credentials THEN
    SELECT api_token, api_key INTO v_api_token, v_api_key
    FROM shipping_provider_settings
    WHERE organization_id = p_organization_id AND provider_id = p_original_provider_id;
  END IF;
  
  -- الحصول على معرف الولاية الافتراضية للشحن من
  -- يتم استخدام أول ولاية متاحة في جدول yalidine_fees
  SELECT DISTINCT from_wilaya_id INTO v_from_wilaya_id
  FROM yalidine_fees
  WHERE organization_id = p_organization_id
  LIMIT 1;
  
  -- إذا لم يتم العثور على ولاية، استخدم القيمة الافتراضية 16 (الجزائر العاصمة)
  IF v_from_wilaya_id IS NULL THEN
    v_from_wilaya_id := 16;
  END IF;
  
  -- إنشاء نسخة جديدة من مزود التوصيل
  INSERT INTO shipping_provider_clones (
    organization_id,
    original_provider_id,
    name,
    is_active,
    is_home_delivery_enabled,
    is_desk_delivery_enabled,
    api_token,
    api_key
  ) VALUES (
    p_organization_id,
    p_original_provider_id,
    p_new_name,
    true,
    true,
    true,
    v_api_token,
    v_api_key
  ) RETURNING id INTO v_clone_id;
  
  -- نسخ أسعار الولايات من yalidine_provinces_global وربطها بأسعار yalidine_fees
  FOR v_province IN (
    SELECT id, name FROM yalidine_provinces_global WHERE is_deliverable = true
  ) LOOP
    -- الحصول على متوسط أسعار التوصيل للمنزل والمكتب من yalidine_fees للولاية
    SELECT 
      COALESCE(AVG(home_fee)::INTEGER, 800) AS home_fee,
      COALESCE(AVG(stop_desk_fee)::INTEGER, 500) AS desk_fee
    INTO v_home_fee, v_desk_fee
    FROM yalidine_fees
    WHERE organization_id = p_organization_id 
      AND to_wilaya_id = v_province.id
      AND from_wilaya_id = v_from_wilaya_id;
    
    -- إدراج السعر في جدول أسعار النسخة
    INSERT INTO shipping_clone_prices (
      clone_id,
      province_id,
      province_name,
      home_price,
      desk_price
    ) VALUES (
      v_clone_id,
      v_province.id,
      v_province.name,
      v_home_fee,
      v_desk_fee
    );
  END LOOP;
  
  RETURN v_clone_id;
END;
$$ LANGUAGE plpgsql; 