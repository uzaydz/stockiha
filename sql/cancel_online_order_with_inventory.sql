-- دالة إلغاء الطلبات الإلكترونية مع إرجاع المخزون التلقائي
CREATE OR REPLACE FUNCTION cancel_online_order_with_inventory(
  p_order_id uuid,
  p_organization_id uuid,
  p_cancelled_by uuid DEFAULT NULL,
  p_cancellation_reason text DEFAULT 'تم إلغاء الطلب'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_item record;
  v_organization_settings jsonb;
  v_auto_deduct_inventory boolean := false;
  v_total_restored_items integer := 0;
  v_result json;
BEGIN
  -- التحقق من وجود الطلب وأنه لم يتم إلغاؤه مسبقاً
  SELECT * INTO v_order 
  FROM online_orders 
  WHERE id = p_order_id 
    AND organization_id = p_organization_id
    AND status != 'cancelled';
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو تم إلغاؤه مسبقاً'
    );
  END IF;
  
  -- جلب إعدادات المؤسسة للتحقق من خصم المخزون التلقائي
  SELECT custom_js INTO v_organization_settings
  FROM organization_settings 
  WHERE organization_id = p_organization_id;
  
  -- التحقق من إعداد خصم المخزون التلقائي
  IF v_organization_settings IS NOT NULL THEN
    v_auto_deduct_inventory := COALESCE(
      (v_organization_settings->>'auto_deduct_inventory')::boolean, 
      false
    );
  END IF;
  
  -- إذا كان خصم المخزون التلقائي مفعلاً، قم بإرجاع المخزون
  IF v_auto_deduct_inventory = true THEN
    -- إرجاع كل منتج في الطلب إلى المخزون
    FOR v_item IN 
      SELECT 
        oi.product_id, 
        oi.quantity, 
        oi.product_name,
        oi.color_id,
        oi.size_id
      FROM online_order_items oi
      WHERE oi.order_id = p_order_id
        AND oi.product_id IS NOT NULL
    LOOP
      BEGIN
        -- إرجاع الكمية للمنتج الأساسي
        UPDATE products 
        SET 
          stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity,
          updated_at = now()
        WHERE id = v_item.product_id
          AND organization_id = p_organization_id;
        
        -- تسجيل حركة المخزون في السجل
        DECLARE
          v_previous_stock integer;
          v_new_stock integer;
        BEGIN
          SELECT stock_quantity INTO v_previous_stock
          FROM products 
          WHERE id = v_item.product_id AND organization_id = p_organization_id;
          
          v_new_stock := COALESCE(v_previous_stock, 0) + v_item.quantity;
          
          INSERT INTO inventory_logs (
            id,
            product_id,
            product_name,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_id,
            notes,
            created_by,
            organization_id,
            created_at
          ) VALUES (
            gen_random_uuid(),
            v_item.product_id,
            v_item.product_name,
            v_item.quantity,
            COALESCE(v_previous_stock, 0),
            v_new_stock,
            'return',
            p_order_id::text,
            'إرجاع مخزون بسبب إلغاء الطلب: ' || p_cancellation_reason,
            p_cancelled_by,
            p_organization_id,
            now()
          );
        END;
        
        v_total_restored_items := v_total_restored_items + v_item.quantity;
        
      EXCEPTION WHEN OTHERS THEN
        -- تسجيل الخطأ ولكن المتابعة مع باقي المنتجات
        RAISE NOTICE 'خطأ في إرجاع المخزون للمنتج %: %', v_item.product_id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  -- تحديث حالة الطلب إلى ملغي
  UPDATE online_orders 
  SET 
    status = 'cancelled',
    updated_at = now(),
    notes = COALESCE(notes, '') || 
      CASE 
        WHEN notes IS NOT NULL AND notes != '' THEN E'\n' 
        ELSE '' 
      END || 
      'تم إلغاء الطلب: ' || p_cancellation_reason ||
      CASE 
        WHEN v_auto_deduct_inventory = true THEN 
          E'\nتم إرجاع ' || v_total_restored_items || ' قطعة للمخزون'
        ELSE 
          E'\nلم يتم إرجاع المخزون (خصم المخزون التلقائي غير مفعل)'
      END
  WHERE id = p_order_id 
    AND organization_id = p_organization_id;
  
  -- إنشاء سجل إلغاء الطلب
  INSERT INTO order_cancellations (
    id,
    order_id,
    organization_id,
    cancellation_reason,
    cancelled_by,
    inventory_restored,
    cancelled_items_count,
    cancelled_amount,
    total_items_count,
    is_partial_cancellation,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_order_id,
    p_organization_id,
    p_cancellation_reason,
    p_cancelled_by,
    v_auto_deduct_inventory,
    v_total_restored_items,
    0, -- يمكن حساب المبلغ لاحقاً
    v_total_restored_items,
    false,
    now()
  );
  
  -- إرجاع النتيجة
  v_result := json_build_object(
    'success', true,
    'order_id', p_order_id,
    'inventory_restored', v_auto_deduct_inventory,
    'restored_items_count', v_total_restored_items,
    'message', 
      CASE 
        WHEN v_auto_deduct_inventory = true THEN 
          'تم إلغاء الطلب وإرجاع ' || v_total_restored_items || ' قطعة للمخزون'
        ELSE 
          'تم إلغاء الطلب (لم يتم إرجاع المخزون لأن خصم المخزون التلقائي غير مفعل)'
      END
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'حدث خطأ أثناء إلغاء الطلب: ' || SQLERRM
  );
END;
$$;

-- ملاحظة: جدول order_cancellations موجود بالفعل في قاعدة البيانات

-- تعليق على الدالة
COMMENT ON FUNCTION cancel_online_order_with_inventory IS 
'دالة إلغاء الطلبات الإلكترونية مع إرجاع المخزون التلقائي حسب إعدادات المؤسسة'; 