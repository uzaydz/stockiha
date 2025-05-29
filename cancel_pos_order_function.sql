-- إنشاء دالة إلغاء طلبيات نقطة البيع مع إرجاع المخزون
CREATE OR REPLACE FUNCTION cancel_pos_order(
  p_order_id uuid,
  p_items_to_cancel text[] DEFAULT NULL, -- قائمة معرفات المنتجات المراد إلغاؤها (null يعني إلغاء كامل)
  p_cancellation_reason text DEFAULT 'تم الإلغاء',
  p_restore_inventory boolean DEFAULT true,
  p_cancelled_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_item record;
  v_total_cancelled_amount numeric := 0;
  v_cancelled_items_count integer := 0;
  v_total_items_count integer := 0;
  v_is_partial_cancellation boolean := false;
  v_new_total numeric;
  v_new_subtotal numeric;
  v_organization_id uuid;
  v_cancellation_id uuid := gen_random_uuid();
  v_result json;
BEGIN
  -- التحقق من وجود الطلب
  SELECT * INTO v_order 
  FROM orders 
  WHERE id = p_order_id 
    AND is_online = false 
    AND status != 'cancelled';
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو تم إلغاؤه مسبقاً'
    );
  END IF;
  
  v_organization_id := v_order.organization_id;
  
  -- حساب العدد الكلي للمنتجات
  SELECT COUNT(*) INTO v_total_items_count
  FROM order_items 
  WHERE order_id = p_order_id;
  
  -- تحديد نوع الإلغاء (كامل أم جزئي)
  IF p_items_to_cancel IS NULL OR array_length(p_items_to_cancel, 1) IS NULL THEN
    -- إلغاء كامل
    v_is_partial_cancellation := false;
    
    -- حساب المبلغ الكلي المُلغى
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_cancelled_amount
    FROM order_items 
    WHERE order_id = p_order_id;
    
    v_cancelled_items_count := v_total_items_count;
    
  ELSE
    -- إلغاء جزئي
    v_is_partial_cancellation := true;
    
    -- حساب المبلغ المُلغى للمنتجات المحددة
    SELECT COALESCE(SUM(total_price), 0), COUNT(*) 
    INTO v_total_cancelled_amount, v_cancelled_items_count
    FROM order_items 
    WHERE order_id = p_order_id 
      AND id = ANY(p_items_to_cancel::uuid[]);
  END IF;
  
  -- التحقق من صحة البيانات
  IF v_cancelled_items_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا توجد منتجات للإلغاء'
    );
  END IF;
  
  -- إرجاع المنتجات للمخزون (إذا كان مطلوباً)
  IF p_restore_inventory THEN
    FOR v_item IN 
      SELECT oi.product_id, oi.quantity, oi.product_name
      FROM order_items oi
      WHERE oi.order_id = p_order_id
        AND (p_items_to_cancel IS NULL OR oi.id = ANY(p_items_to_cancel::uuid[]))
    LOOP
      -- إرجاع الكمية للمخزون
      BEGIN
        UPDATE products 
        SET 
          stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity,
          updated_at = now()
        WHERE id = v_item.product_id
          AND organization_id = v_organization_id;
          
        -- تسجيل حركة المخزون
        INSERT INTO inventory_logs (
          id,
          product_id,
          organization_id,
          change_type,
          quantity_change,
          old_quantity,
          new_quantity,
          reason,
          reference_type,
          reference_id,
          created_at
        )
        SELECT 
          gen_random_uuid(),
          v_item.product_id,
          v_organization_id,
          'adjustment',
          v_item.quantity,
          p.stock_quantity - v_item.quantity,
          p.stock_quantity,
          'إرجاع مخزون من إلغاء طلبية رقم: ' || COALESCE(v_order.slug, p_order_id::text),
          'order_cancellation',
          p_order_id,
          now()
        FROM products p
        WHERE p.id = v_item.product_id;
        
      EXCEPTION 
        WHEN OTHERS THEN
          -- تجاهل أخطاء تحديث المخزون ومتابعة العملية
          RAISE NOTICE 'خطأ في إرجاع مخزون المنتج %: %', v_item.product_name, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  -- إنشاء سجل الإلغاء
  INSERT INTO order_cancellations (
    id,
    order_id,
    organization_id,
    cancelled_by,
    cancellation_reason,
    cancelled_amount,
    cancelled_items_count,
    total_items_count,
    is_partial_cancellation,
    inventory_restored,
    created_at
  ) VALUES (
    v_cancellation_id,
    p_order_id,
    v_organization_id,
    p_cancelled_by,
    p_cancellation_reason,
    v_total_cancelled_amount,
    v_cancelled_items_count,
    v_total_items_count,
    v_is_partial_cancellation,
    p_restore_inventory,
    now()
  );
  
  IF v_is_partial_cancellation THEN
    -- إلغاء جزئي - حذف المنتجات المحددة وتحديث المجموع
    DELETE FROM order_items 
    WHERE order_id = p_order_id 
      AND id = ANY(p_items_to_cancel::uuid[]);
    
    -- إعادة حساب المجموع الجديد
    SELECT 
      COALESCE(SUM(total_price), 0),
      COALESCE(SUM(unit_price * quantity), 0)
    INTO v_new_total, v_new_subtotal
    FROM order_items 
    WHERE order_id = p_order_id;
    
    -- تحديث الطلب مع المجموع الجديد
    UPDATE orders 
    SET 
      subtotal = v_new_subtotal,
      total = v_new_total,
      status = CASE 
        WHEN v_new_total = 0 THEN 'cancelled'
        ELSE status
      END,
      updated_at = now(),
      notes = COALESCE(notes, '') || 
        CASE 
          WHEN COALESCE(notes, '') = '' THEN ''
          ELSE ' | '
        END || 
        'إلغاء جزئي: ' || v_cancelled_items_count || ' منتج - ' || 
        v_total_cancelled_amount || ' دج - ' || p_cancellation_reason
    WHERE id = p_order_id;
    
  ELSE
    -- إلغاء كامل
    UPDATE orders 
    SET 
      status = 'cancelled',
      updated_at = now(),
      notes = COALESCE(notes, '') || 
        CASE 
          WHEN COALESCE(notes, '') = '' THEN ''
          ELSE ' | '
        END || 
        'تم الإلغاء: ' || p_cancellation_reason
    WHERE id = p_order_id;
    
    -- وضع علامة على جميع عناصر الطلب كملغاة
    UPDATE order_items 
    SET 
      notes = COALESCE(notes, '') || 
        CASE 
          WHEN COALESCE(notes, '') = '' THEN ''
          ELSE ' | '
        END || 
        'تم الإلغاء: ' || p_cancellation_reason
    WHERE order_id = p_order_id;
  END IF;
  
  -- إرجاع نتيجة العملية
  v_result := json_build_object(
    'success', true,
    'cancellation_id', v_cancellation_id,
    'order_id', p_order_id,
    'is_partial_cancellation', v_is_partial_cancellation,
    'cancelled_amount', v_total_cancelled_amount,
    'cancelled_items_count', v_cancelled_items_count,
    'total_items_count', v_total_items_count,
    'inventory_restored', p_restore_inventory,
    'new_total', CASE WHEN v_is_partial_cancellation THEN v_new_total ELSE 0 END,
    'message', CASE 
      WHEN v_is_partial_cancellation THEN 
        'تم إلغاء ' || v_cancelled_items_count || ' منتج من الطلبية بنجاح'
      ELSE 
        'تم إلغاء الطلبية بالكامل بنجاح'
    END
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- تراجع عن جميع التغييرات في حالة الخطأ
    RETURN json_build_object(
      'success', false,
      'error', 'حدث خطأ أثناء إلغاء الطلبية: ' || SQLERRM
    );
END;
$$;

-- إنشاء جدول سجل الإلغاءات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cancelled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason text NOT NULL DEFAULT 'تم الإلغاء',
  cancelled_amount numeric(10,2) NOT NULL DEFAULT 0,
  cancelled_items_count integer NOT NULL DEFAULT 0,
  total_items_count integer NOT NULL DEFAULT 0,
  is_partial_cancellation boolean NOT NULL DEFAULT false,
  inventory_restored boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_organization_id ON order_cancellations(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_created_at ON order_cancellations(created_at);

-- تحديث دالة الإحصائيات لاستبعاد الطلبيات الملغاة من حساب الأرباح
CREATE OR REPLACE FUNCTION get_pos_order_stats(p_organization_id uuid)
RETURNS TABLE (
  total_orders bigint,
  total_revenue numeric,
  completed_orders bigint,
  pending_orders bigint,
  pending_payment_orders bigint,
  cancelled_orders bigint,
  cash_orders bigint,
  card_orders bigint,
  avg_order_value numeric,
  today_orders bigint,
  today_revenue numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_orders,
    -- استبعاد الطلبيات الملغاة من إجمالي الإيرادات
    COALESCE(SUM(CASE WHEN orders.status != 'cancelled' THEN orders.total ELSE 0 END), 0) AS total_revenue,
    COUNT(*) FILTER (WHERE orders.status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE orders.status = 'pending') AS pending_orders,
    COUNT(*) FILTER (WHERE orders.payment_status = 'pending') AS pending_payment_orders,
    COUNT(*) FILTER (WHERE orders.status = 'cancelled') AS cancelled_orders,
    COUNT(*) FILTER (WHERE orders.payment_method = 'cash' AND orders.status != 'cancelled') AS cash_orders,
    COUNT(*) FILTER (WHERE orders.payment_method != 'cash' AND orders.status != 'cancelled') AS card_orders,
    -- حساب متوسط قيمة الطلب (استبعاد الملغاة)
    COALESCE(
      AVG(CASE WHEN orders.status != 'cancelled' THEN orders.total ELSE NULL END), 
      0
    ) AS avg_order_value,
    COUNT(*) FILTER (WHERE DATE(orders.created_at) = CURRENT_DATE) AS today_orders,
    -- إيرادات اليوم (استبعاد الملغاة)
    COALESCE(
      SUM(CASE 
        WHEN DATE(orders.created_at) = CURRENT_DATE AND orders.status != 'cancelled' 
        THEN orders.total 
        ELSE 0 
      END), 
      0
    ) AS today_revenue
  FROM orders
  WHERE orders.organization_id = p_organization_id
    AND orders.is_online = false;
END;
$$;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION cancel_pos_order IS 'دالة إلغاء طلبيات نقطة البيع مع إمكانية الإلغاء الجزئي وإرجاع المخزون';
COMMENT ON TABLE order_cancellations IS 'جدول سجل إلغاءات الطلبيات لتتبع عمليات الإلغاء والمراجعة';