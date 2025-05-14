-- إنشاء جداول نسخ مزودي التوصيل
-- هذا الملف ينشئ الجداول اللازمة لتمكين استنساخ مزودي التوصيل وتخصيصها

-- 1. جدول نسخ مزودي التوصيل
CREATE TABLE IF NOT EXISTS shipping_provider_clones (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_provider_id INTEGER NOT NULL REFERENCES shipping_providers(id),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_home_delivery_enabled BOOLEAN DEFAULT true,
  is_desk_delivery_enabled BOOLEAN DEFAULT true,
  use_unified_price BOOLEAN DEFAULT false,
  unified_home_price INTEGER,
  unified_desk_price INTEGER,
  is_free_delivery_home BOOLEAN DEFAULT false,
  is_free_delivery_desk BOOLEAN DEFAULT false,
  api_token VARCHAR(255),
  api_key VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. جدول أسعار التوصيل المخصصة لكل ولاية
CREATE TABLE IF NOT EXISTS shipping_clone_prices (
  id SERIAL PRIMARY KEY,
  clone_id INTEGER NOT NULL REFERENCES shipping_provider_clones(id) ON DELETE CASCADE,
  province_id INTEGER NOT NULL,
  province_name VARCHAR(100) NOT NULL,
  home_price INTEGER,
  desk_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clone_id, province_id)
);

-- 3. إضافة حقل في جدول المنتجات لربطها بمزود التوصيل المستنسخ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'shipping_clone_id'
  ) THEN
    ALTER TABLE products ADD COLUMN shipping_clone_id INTEGER REFERENCES shipping_provider_clones(id);
  END IF;
END $$;

-- 4. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_org ON shipping_provider_clones(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_orig_provider ON shipping_provider_clones(original_provider_id);
CREATE INDEX IF NOT EXISTS idx_shipping_clone_prices_clone ON shipping_clone_prices(clone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_clone_prices_province ON shipping_clone_prices(province_id);
CREATE INDEX IF NOT EXISTS idx_products_shipping_clone ON products(shipping_clone_id);

-- 5. إنشاء دالة لتحديث الطابع الزمني عند التعديل
CREATE OR REPLACE FUNCTION update_shipping_clone_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. إنشاء triggers لتحديث الطابع الزمني
CREATE TRIGGER update_shipping_provider_clones_timestamp
BEFORE UPDATE ON shipping_provider_clones
FOR EACH ROW EXECUTE FUNCTION update_shipping_clone_timestamp();

CREATE TRIGGER update_shipping_clone_prices_timestamp
BEFORE UPDATE ON shipping_clone_prices
FOR EACH ROW EXECUTE FUNCTION update_shipping_clone_timestamp();

-- 7. إنشاء دالة لاستنساخ مزود توصيل
CREATE OR REPLACE FUNCTION clone_shipping_provider(
  p_organization_id UUID,
  p_original_provider_id INTEGER,
  p_new_name VARCHAR,
  p_copy_api_credentials BOOLEAN DEFAULT true,
  p_enable_sync BOOLEAN DEFAULT false
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

-- 8. إنشاء دالة للحصول على خيارات التوصيل للمنتج
CREATE OR REPLACE FUNCTION get_product_shipping_options(
  p_product_id UUID,
  p_province_id INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_clone_id INTEGER;
  v_original_provider_id INTEGER;
  v_result JSONB;
  v_home_price INTEGER;
  v_desk_price INTEGER;
BEGIN
  -- الحصول على معرف نسخة مزود التوصيل المرتبط بالمنتج
  SELECT shipping_clone_id INTO v_clone_id
  FROM products
  WHERE id = p_product_id;
  
  -- إذا لم يكن هناك مزود توصيل مرتبط بالمنتج، إرجاع بيانات فارغة
  IF v_clone_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا يوجد مزود توصيل مرتبط بهذا المنتج'
    );
  END IF;
  
  -- الحصول على بيانات مزود التوصيل
  SELECT
    spc.id,
    spc.name,
    spc.original_provider_id,
    spc.is_home_delivery_enabled,
    spc.is_desk_delivery_enabled,
    spc.use_unified_price,
    spc.unified_home_price,
    spc.unified_desk_price,
    spc.is_free_delivery_home,
    spc.is_free_delivery_desk,
    sp.code AS provider_code,
    sp.name AS provider_name
  INTO v_result
  FROM shipping_provider_clones spc
  JOIN shipping_providers sp ON spc.original_provider_id = sp.id
  WHERE spc.id = v_clone_id;
  
  -- إذا تم تحديد ولاية، الحصول على أسعار التوصيل لها
  IF p_province_id IS NOT NULL THEN
    -- إذا كان يستخدم سعر موحد
    IF (v_result->>'use_unified_price')::BOOLEAN THEN
      v_home_price := (v_result->>'unified_home_price')::INTEGER;
      v_desk_price := (v_result->>'unified_desk_price')::INTEGER;
    ELSE
      -- الحصول على الأسعار المخصصة للولاية
      SELECT home_price, desk_price INTO v_home_price, v_desk_price
      FROM shipping_clone_prices
      WHERE clone_id = v_clone_id AND province_id = p_province_id;
    END IF;
    
    -- تطبيق خيارات التوصيل المجاني
    IF (v_result->>'is_free_delivery_home')::BOOLEAN THEN
      v_home_price := 0;
    END IF;
    
    IF (v_result->>'is_free_delivery_desk')::BOOLEAN THEN
      v_desk_price := 0;
    END IF;
    
    -- إضافة الأسعار إلى النتيجة
    v_result := v_result || jsonb_build_object(
      'home_price', v_home_price,
      'desk_price', v_desk_price
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'provider', v_result
  );
END;
$$ LANGUAGE plpgsql; 