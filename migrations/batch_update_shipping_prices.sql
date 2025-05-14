-- تحديث الأسعار بشكل جماعي
-- هذا الملف يحتوي على دالة لتحديث أسعار مزود التوصيل بشكل جماعي لتحسين الأداء

-- 1. إنشاء دالة لتحديث جميع أسعار الولايات في عملية واحدة
CREATE OR REPLACE FUNCTION update_shipping_clone_prices_batch(
  p_clone_id INTEGER,
  p_prices JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_price JSONB;
  v_province_id INTEGER;
  v_home_price INTEGER;
  v_desk_price INTEGER;
BEGIN
  -- معالجة كل سعر في المصفوفة
  FOR i IN 0..jsonb_array_length(p_prices) - 1 LOOP
    -- استخراج القيم من كائن JSON
    v_price := p_prices->i;
    v_province_id := (v_price->>'province_id')::INTEGER;
    
    -- تحديد الأسعار مع معالجة القيم الفارغة
    IF v_price ? 'home_price' THEN
      IF v_price->>'home_price' = 'null' THEN
        v_home_price := NULL;
      ELSE
        v_home_price := (v_price->>'home_price')::INTEGER;
      END IF;
    ELSE
      -- لا تغيير لسعر التوصيل للمنزل
      v_home_price := NULL;
    END IF;
    
    IF v_price ? 'desk_price' THEN
      IF v_price->>'desk_price' = 'null' THEN
        v_desk_price := NULL;
      ELSE
        v_desk_price := (v_price->>'desk_price')::INTEGER;
      END IF;
    ELSE
      -- لا تغيير لسعر التوصيل للمكتب
      v_desk_price := NULL;
    END IF;
    
    -- تحديث السعر في قاعدة البيانات فقط للحقول المحددة
    UPDATE shipping_clone_prices
    SET 
      home_price = COALESCE(v_home_price, home_price),
      desk_price = COALESCE(v_desk_price, desk_price),
      updated_at = NOW()
    WHERE 
      clone_id = p_clone_id AND 
      province_id = v_province_id;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. إنشاء دالة لتحديث إعدادات النسخة وأسعارها في معاملة واحدة
CREATE OR REPLACE FUNCTION update_shipping_clone_with_prices(
  p_clone_id INTEGER,
  p_settings JSONB,
  p_prices JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- بدء المعاملة
  BEGIN
    -- تحديث الإعدادات الأساسية
    UPDATE shipping_provider_clones
    SET 
      name = COALESCE(p_settings->>'name', name),
      is_active = COALESCE((p_settings->>'is_active')::BOOLEAN, is_active),
      is_home_delivery_enabled = COALESCE((p_settings->>'is_home_delivery_enabled')::BOOLEAN, is_home_delivery_enabled),
      is_desk_delivery_enabled = COALESCE((p_settings->>'is_desk_delivery_enabled')::BOOLEAN, is_desk_delivery_enabled),
      use_unified_price = COALESCE((p_settings->>'use_unified_price')::BOOLEAN, use_unified_price),
      unified_home_price = COALESCE((p_settings->>'unified_home_price')::INTEGER, unified_home_price),
      unified_desk_price = COALESCE((p_settings->>'unified_desk_price')::INTEGER, unified_desk_price),
      is_free_delivery_home = COALESCE((p_settings->>'is_free_delivery_home')::BOOLEAN, is_free_delivery_home),
      is_free_delivery_desk = COALESCE((p_settings->>'is_free_delivery_desk')::BOOLEAN, is_free_delivery_desk),
      updated_at = NOW()
    WHERE id = p_clone_id;
    
    -- تحديث الأسعار باستخدام الدالة الجماعية
    PERFORM update_shipping_clone_prices_batch(p_clone_id, p_prices);
    
    -- إعداد الاستجابة
    SELECT jsonb_build_object(
      'settings', jsonb_build_object(
        'id', id,
        'name', name,
        'is_active', is_active,
        'is_home_delivery_enabled', is_home_delivery_enabled,
        'is_desk_delivery_enabled', is_desk_delivery_enabled,
        'use_unified_price', use_unified_price,
        'unified_home_price', unified_home_price,
        'unified_desk_price', unified_desk_price,
        'is_free_delivery_home', is_free_delivery_home,
        'is_free_delivery_desk', is_free_delivery_desk
      )
    ) INTO v_result
    FROM shipping_provider_clones
    WHERE id = p_clone_id;
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- تسجيل الخطأ وإعادته
      RAISE EXCEPTION 'حدث خطأ أثناء تحديث نسخة مزود التوصيل: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. منح الصلاحيات المناسبة للدوال الجديدة
GRANT EXECUTE ON FUNCTION update_shipping_clone_prices_batch(INTEGER, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_shipping_clone_with_prices(INTEGER, JSONB, JSONB) TO anon, authenticated, service_role; 