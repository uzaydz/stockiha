-- دالة اختبار لفحص خصم المخزون
CREATE OR REPLACE FUNCTION test_inventory_deduction(
  p_color_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_quantity INTEGER;
  v_new_quantity INTEGER;
  v_rows_affected INTEGER;
BEGIN
  RAISE NOTICE '🧪 [test_inventory_deduction] بدء اختبار خصم المخزون';
  RAISE NOTICE '🎨 [test_inventory_deduction] معرف اللون: %', p_color_id;
  RAISE NOTICE '📦 [test_inventory_deduction] الكمية المطلوب خصمها: %', p_quantity;
  
  -- جلب الكمية الحالية
  SELECT quantity INTO v_old_quantity 
  FROM product_colors 
  WHERE id = p_color_id;
  
  RAISE NOTICE '📊 [test_inventory_deduction] الكمية الحالية: %', v_old_quantity;
  
  -- محاولة خصم المخزون
  UPDATE product_colors 
  SET quantity = quantity - p_quantity 
  WHERE id = p_color_id;
  
  -- الحصول على عدد الصفوف المتأثرة
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RAISE NOTICE '🔄 [test_inventory_deduction] عدد الصفوف المتأثرة: %', v_rows_affected;
  
  -- جلب الكمية الجديدة
  SELECT quantity INTO v_new_quantity 
  FROM product_colors 
  WHERE id = p_color_id;
  
  RAISE NOTICE '📈 [test_inventory_deduction] الكمية بعد التحديث: %', v_new_quantity;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'old_quantity', v_old_quantity,
    'new_quantity', v_new_quantity,
    'rows_affected', v_rows_affected,
    'deducted_amount', p_quantity
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ [test_inventory_deduction] خطأ: %, كود: %', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$; 