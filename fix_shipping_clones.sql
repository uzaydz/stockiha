-- إصلاح مشكلة استنساخ مزود التوصيل
-- ملف SQL لإضافة عمود sync_enabled إلى جدول shipping_provider_clones وتحديث الإجراءات المخزنة

-- 1. إضافة عمود sync_enabled إلى جدول shipping_provider_clones
ALTER TABLE shipping_provider_clones
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT FALSE;

-- 2. تحديث سجلات الجدول الحالية لتعيين قيمة افتراضية لعمود sync_enabled
UPDATE shipping_provider_clones
SET sync_enabled = FALSE
WHERE sync_enabled IS NULL;

-- 3. حذف الإجراء المخزن القديم المسبب للتعارض (النسختين)
DROP FUNCTION IF EXISTS clone_shipping_provider(uuid, integer, character varying, boolean);
DROP FUNCTION IF EXISTS clone_shipping_provider(uuid, integer, character varying, boolean, boolean);

-- 4. إنشاء إجراء جديد يدعم المعلمة الخامسة p_enable_sync
CREATE OR REPLACE FUNCTION clone_shipping_provider(
  p_organization_id UUID,
  p_original_provider_id INTEGER,
  p_new_name VARCHAR,
  p_copy_api_credentials BOOLEAN DEFAULT FALSE,
  p_enable_sync BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE
  v_clone_id INTEGER;
  v_api_token VARCHAR;
  v_api_key VARCHAR;
  v_province RECORD;
BEGIN
  -- الحصول على بيانات API إذا كان مطلوبًا نسخها
  IF p_copy_api_credentials THEN
    SELECT api_token, api_key INTO v_api_token, v_api_key
    FROM shipping_provider_settings
    WHERE organization_id = p_organization_id AND provider_id = p_original_provider_id;
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
    api_key,
    sync_enabled
  ) VALUES (
    p_organization_id,
    p_original_provider_id,
    p_new_name,
    true,
    true,
    true,
    v_api_token,
    v_api_key,
    p_enable_sync
  ) RETURNING id INTO v_clone_id;
  
  -- نسخ أسعار الولايات من yalidine_provinces_global
  FOR v_province IN (
    SELECT id, name FROM yalidine_provinces_global WHERE is_deliverable = true
  ) LOOP
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
      -- أسعار افتراضية
      800, -- سعر افتراضي للتوصيل للمنزل
      500  -- سعر افتراضي للتوصيل للمكتب
    );
  END LOOP;
  
  RETURN v_clone_id;
END;
$$ LANGUAGE plpgsql;

-- 5. منح الصلاحيات المناسبة للإجراء الجديد
GRANT EXECUTE ON FUNCTION clone_shipping_provider(UUID, INTEGER, VARCHAR, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role; 