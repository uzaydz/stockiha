-- ============================================
-- Atomic Delta Functions for Race-Condition-Free Updates
-- ============================================
-- هذه الدوال تضمن تحديثات آمنة للمخزون والأرقام
-- بدون مشاكل Race Conditions

-- ============================================
-- 1. دالة apply_delta العامة
-- تطبق تغييرات تفاضلية على أي جدول
-- ============================================
CREATE OR REPLACE FUNCTION apply_delta(
  p_table_name TEXT,
  p_record_id UUID,
  p_delta JSONB
) RETURNS VOID AS $$
DECLARE
  field_name TEXT;
  field_value NUMERIC;
  update_sql TEXT := '';
  first_field BOOLEAN := TRUE;
BEGIN
  -- بناء جملة UPDATE ديناميكياً
  FOR field_name, field_value IN
    SELECT key, value::NUMERIC
    FROM jsonb_each_text(p_delta)
    WHERE value ~ '^-?[0-9]+\.?[0-9]*$'
  LOOP
    IF NOT first_field THEN
      update_sql := update_sql || ', ';
    END IF;
    update_sql := update_sql || format('%I = %I + %s', field_name, field_name, field_value);
    first_field := FALSE;
  END LOOP;

  -- تنفيذ UPDATE إذا كانت هناك حقول للتحديث
  IF update_sql != '' THEN
    EXECUTE format('UPDATE %I SET %s WHERE id = %L', p_table_name, update_sql, p_record_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. دالة execute_delta_update
-- بديل لـ apply_delta بتوقيع مختلف
-- ============================================
CREATE OR REPLACE FUNCTION execute_delta_update(
  p_table TEXT,
  p_id UUID,
  p_updates JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM apply_delta(p_table, p_id, p_updates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. دالة متخصصة لتحديث المخزون
-- أكثر أماناً للاستخدام في جداول products
-- ============================================
CREATE OR REPLACE FUNCTION update_stock_quantity(
  p_product_id UUID,
  p_quantity_change INTEGER
) RETURNS TABLE(
  new_stock INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  -- تحديث المخزون بشكل atomic
  UPDATE products
  SET
    stock_quantity = COALESCE(stock_quantity, 0) + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock_quantity INTO v_new_stock;

  -- التحقق من نجاح التحديث
  IF v_new_stock IS NOT NULL THEN
    RETURN QUERY SELECT v_new_stock, TRUE;
  ELSE
    RETURN QUERY SELECT 0, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. دالة لتحديث المخزون الفعلي
-- للفرق بين stock_quantity و actual_stock_quantity
-- ============================================
CREATE OR REPLACE FUNCTION update_actual_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
) RETURNS TABLE(
  new_actual_stock INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  UPDATE products
  SET
    actual_stock_quantity = COALESCE(actual_stock_quantity, 0) + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING actual_stock_quantity INTO v_new_stock;

  IF v_new_stock IS NOT NULL THEN
    RETURN QUERY SELECT v_new_stock, TRUE;
  ELSE
    RETURN QUERY SELECT 0, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. دالة لتحديث رصيد العميل (الديون)
-- ============================================
CREATE OR REPLACE FUNCTION update_customer_balance(
  p_customer_id UUID,
  p_amount_change NUMERIC
) RETURNS TABLE(
  new_balance NUMERIC,
  success BOOLEAN
) AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE customers
  SET
    balance = COALESCE(balance, 0) + p_amount_change,
    updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NOT NULL THEN
    RETURN QUERY SELECT v_new_balance, TRUE;
  ELSE
    RETURN QUERY SELECT 0::NUMERIC, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. دالة لتحديث كمية اللون (product_colors)
-- للمنتجات ذات الألوان بدون مقاسات
-- ============================================
CREATE OR REPLACE FUNCTION update_color_quantity(
  p_color_id UUID,
  p_quantity_change INTEGER
) RETURNS TABLE(
  new_quantity INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_new_quantity INTEGER;
BEGIN
  UPDATE product_colors
  SET
    quantity = COALESCE(quantity, 0) + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_color_id
  RETURNING quantity INTO v_new_quantity;

  IF v_new_quantity IS NOT NULL THEN
    RETURN QUERY SELECT v_new_quantity, TRUE;
  ELSE
    RETURN QUERY SELECT 0, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. دالة لتحديث كمية المقاس (product_sizes)
-- للمنتجات ذات الألوان والمقاسات
-- ============================================
CREATE OR REPLACE FUNCTION update_size_quantity(
  p_size_id UUID,
  p_quantity_change INTEGER
) RETURNS TABLE(
  new_quantity INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_new_quantity INTEGER;
BEGIN
  UPDATE product_sizes
  SET
    quantity = COALESCE(quantity, 0) + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_size_id
  RETURNING quantity INTO v_new_quantity;

  IF v_new_quantity IS NOT NULL THEN
    RETURN QUERY SELECT v_new_quantity, TRUE;
  ELSE
    RETURN QUERY SELECT 0, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. دالة ذكية لتحديث المخزون حسب نوع المنتج
-- تحدد تلقائياً أين يجب تحديث الكمية
-- ============================================
CREATE OR REPLACE FUNCTION update_variant_stock(
  p_product_id UUID,
  p_color_id UUID DEFAULT NULL,
  p_size_id UUID DEFAULT NULL,
  p_quantity_change INTEGER DEFAULT 0
) RETURNS TABLE(
  updated_table TEXT,
  updated_id UUID,
  new_quantity INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_new_quantity INTEGER;
  v_has_colors BOOLEAN;
  v_has_sizes BOOLEAN;
BEGIN
  -- إذا تم تحديد size_id، نحدث المقاس
  IF p_size_id IS NOT NULL THEN
    UPDATE product_sizes
    SET
      quantity = COALESCE(quantity, 0) + p_quantity_change,
      updated_at = NOW()
    WHERE id = p_size_id
    RETURNING quantity INTO v_new_quantity;

    IF v_new_quantity IS NOT NULL THEN
      RETURN QUERY SELECT 'product_sizes'::TEXT, p_size_id, v_new_quantity, TRUE;
    ELSE
      RETURN QUERY SELECT 'product_sizes'::TEXT, p_size_id, 0, FALSE;
    END IF;
    RETURN;
  END IF;

  -- إذا تم تحديد color_id فقط، نحدث اللون
  IF p_color_id IS NOT NULL THEN
    UPDATE product_colors
    SET
      quantity = COALESCE(quantity, 0) + p_quantity_change,
      updated_at = NOW()
    WHERE id = p_color_id
    RETURNING quantity INTO v_new_quantity;

    IF v_new_quantity IS NOT NULL THEN
      RETURN QUERY SELECT 'product_colors'::TEXT, p_color_id, v_new_quantity, TRUE;
    ELSE
      RETURN QUERY SELECT 'product_colors'::TEXT, p_color_id, 0, FALSE;
    END IF;
    RETURN;
  END IF;

  -- إذا لم يتم تحديد أي متغير، نحدث المنتج مباشرة
  UPDATE products
  SET
    stock_quantity = COALESCE(stock_quantity, 0) + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock_quantity INTO v_new_quantity;

  IF v_new_quantity IS NOT NULL THEN
    RETURN QUERY SELECT 'products'::TEXT, p_product_id, v_new_quantity, TRUE;
  ELSE
    RETURN QUERY SELECT 'products'::TEXT, p_product_id, 0, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- منح الصلاحيات للمستخدمين المصادقين
-- ============================================
GRANT EXECUTE ON FUNCTION apply_delta(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_delta_update(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_stock_quantity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_actual_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_color_quantity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_size_quantity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_variant_stock(UUID, UUID, UUID, INTEGER) TO authenticated;

-- ============================================
-- تعليقات للتوثيق
-- ============================================
COMMENT ON FUNCTION apply_delta IS 'تطبيق تغييرات تفاضلية على أي جدول بشكل atomic';
COMMENT ON FUNCTION execute_delta_update IS 'بديل لـ apply_delta بتوقيع مختلف';
COMMENT ON FUNCTION update_stock_quantity IS 'تحديث كمية المخزون للمنتج بدون متغيرات';
COMMENT ON FUNCTION update_actual_stock IS 'تحديث المخزون الفعلي بشكل آمن';
COMMENT ON FUNCTION update_customer_balance IS 'تحديث رصيد العميل بشكل آمن';
COMMENT ON FUNCTION update_color_quantity IS 'تحديث كمية اللون للمنتجات ذات الألوان';
COMMENT ON FUNCTION update_size_quantity IS 'تحديث كمية المقاس للمنتجات ذات المقاسات';
COMMENT ON FUNCTION update_variant_stock IS 'تحديث ذكي للمخزون حسب نوع المتغير (منتج/لون/مقاس)';
