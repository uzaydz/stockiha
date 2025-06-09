-- تحديث دالة create_return_request لدعم المتغيرات (الألوان والمقاسات)
-- سيتم تمرير معلومات المتغير مع كل منتج في JSON

CREATE OR REPLACE FUNCTION create_return_request(
    p_original_order_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_return_type VARCHAR DEFAULT 'partial',
    p_return_reason VARCHAR DEFAULT 'customer_request',
    p_return_reason_description TEXT DEFAULT NULL,
    p_items_to_return JSONB DEFAULT '[]'::jsonb,
    p_refund_method VARCHAR DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_return_id UUID;
    v_original_order RECORD;
    v_item JSONB;
    v_order_item RECORD;
    v_return_item_id UUID;
    v_total_return_amount NUMERIC(10,2) := 0;
    v_total_original_amount NUMERIC(10,2) := 0;
    v_customer RECORD;
    v_result JSON;
    v_color_id UUID DEFAULT NULL;
    v_size_id UUID DEFAULT NULL;
    v_color_name TEXT DEFAULT NULL;
    v_size_name TEXT DEFAULT NULL;
    v_variant_display_name TEXT DEFAULT NULL;
BEGIN
    -- التحقق من وجود الطلبية الأصلية
    SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
    INTO v_original_order
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    WHERE o.id = p_original_order_id
      AND o.organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الطلبية الأصلية غير موجودة'
        );
    END IF;
    
    -- التحقق من عدم وجود إرجاع سابق لنفس الطلبية (في حالة الإرجاع الكامل)
    IF p_return_type = 'full' THEN
        IF EXISTS (
            SELECT 1 FROM returns 
            WHERE original_order_id = p_original_order_id 
              AND return_type = 'full' 
              AND status NOT IN ('rejected', 'cancelled')
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'يوجد طلب إرجاع كامل سابق لهذه الطلبية'
            );
        END IF;
    END IF;
    
    -- إنشاء طلب الإرجاع
    INSERT INTO returns (
        original_order_id,
        original_order_number,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        return_type,
        return_reason,
        return_reason_description,
        original_total,
        refund_method,
        notes,
        organization_id,
        created_by,
        requires_manager_approval
    ) VALUES (
        p_original_order_id,
        v_original_order.customer_order_number::text,
        COALESCE(p_customer_id, v_original_order.customer_id),
        COALESCE(v_original_order.customer_name, 'زائر'),
        v_original_order.customer_phone,
        v_original_order.customer_email,
        p_return_type,
        p_return_reason,
        p_return_reason_description,
        v_original_order.total,
        p_refund_method,
        p_notes,
        p_organization_id,
        p_created_by,
        CASE WHEN v_original_order.total > 1000 THEN true ELSE false END -- يتطلب موافقة إذا كان المبلغ أكبر من 1000
    ) RETURNING id INTO v_return_id;
    
    -- معالجة عناصر الإرجاع
    IF p_return_type = 'full' THEN
        -- إرجاع كامل - إضافة جميع عناصر الطلبية
        FOR v_order_item IN 
            SELECT 
                oi.*,
                p.name as current_product_name, 
                p.sku as current_sku
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = p_original_order_id
        LOOP
            INSERT INTO return_items (
                return_id,
                original_order_item_id,
                product_id,
                product_name,
                product_sku,
                original_quantity,
                return_quantity,
                original_unit_price,
                return_unit_price,
                total_return_amount,
                variant_info,
                -- إضافة معلومات المتغيرات
                color_id,
                size_id,
                color_name,
                size_name,
                variant_display_name
            ) VALUES (
                v_return_id,
                v_order_item.id,
                v_order_item.product_id,
                COALESCE(v_order_item.current_product_name, v_order_item.product_name),
                COALESCE(v_order_item.current_sku, ''),
                v_order_item.quantity,
                v_order_item.quantity,
                v_order_item.unit_price,
                v_order_item.unit_price,
                v_order_item.total_price,
                COALESCE(v_order_item.variant_info, '{}'::jsonb),
                v_order_item.color_id,
                v_order_item.size_id,
                v_order_item.color_name,
                v_order_item.size_name,
                v_order_item.variant_display_name
            );
            
            v_total_return_amount := v_total_return_amount + v_order_item.total_price;
        END LOOP;
        
    ELSE
        -- إرجاع جزئي - إضافة العناصر المحددة فقط
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_to_return)
        LOOP
            -- الحصول على معلومات العنصر الأصلي
            SELECT 
                oi.*,
                p.name as current_product_name, 
                p.sku as current_sku
            INTO v_order_item
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.id = (v_item->>'order_item_id')::UUID
              AND oi.order_id = p_original_order_id;
            
            IF FOUND THEN
                -- استخراج معلومات المتغيرات من JSON المُرسل
                v_color_id := CASE WHEN v_item ? 'color_id' AND v_item->>'color_id' != '' 
                                  THEN (v_item->>'color_id')::UUID 
                                  ELSE v_order_item.color_id END;
                v_size_id := CASE WHEN v_item ? 'size_id' AND v_item->>'size_id' != '' 
                                 THEN (v_item->>'size_id')::UUID 
                                 ELSE v_order_item.size_id END;
                v_color_name := COALESCE(v_item->>'color_name', v_order_item.color_name);
                v_size_name := COALESCE(v_item->>'size_name', v_order_item.size_name);
                v_variant_display_name := COALESCE(
                    v_item->>'variant_display_name', 
                    v_order_item.variant_display_name,
                    CASE 
                        WHEN v_color_name IS NOT NULL AND v_size_name IS NOT NULL 
                        THEN v_color_name || ' - ' || v_size_name
                        WHEN v_color_name IS NOT NULL 
                        THEN v_color_name
                        WHEN v_size_name IS NOT NULL 
                        THEN v_size_name
                        ELSE 'المنتج الأساسي'
                    END
                );

                -- التحقق من أن الكمية المطلوبة للإرجاع لا تتجاوز الكمية الأصلية
                DECLARE
                    v_return_quantity INTEGER := (v_item->>'return_quantity')::INTEGER;
                    v_already_returned INTEGER;
                BEGIN
                    -- حساب الكمية المرجعة سابقاً لهذا العنصر (مع نفس المتغير)
                    SELECT COALESCE(SUM(ri.return_quantity), 0)
                    INTO v_already_returned
                    FROM return_items ri
                    JOIN returns r ON ri.return_id = r.id
                    WHERE ri.original_order_item_id = v_order_item.id
                      AND r.status NOT IN ('rejected', 'cancelled')
                      AND (
                        (ri.color_id IS NULL AND v_color_id IS NULL) OR ri.color_id = v_color_id
                      )
                      AND (
                        (ri.size_id IS NULL AND v_size_id IS NULL) OR ri.size_id = v_size_id
                      );
                    
                    IF (v_already_returned + v_return_quantity) > v_order_item.quantity THEN
                        RETURN json_build_object(
                            'success', false,
                            'error', 'الكمية المطلوبة للإرجاع تتجاوز الكمية المتاحة للمنتج: ' || v_order_item.product_name ||
                                     CASE WHEN v_variant_display_name != 'المنتج الأساسي' 
                                          THEN ' (' || v_variant_display_name || ')'
                                          ELSE '' END
                        );
                    END IF;
                    
                    -- إضافة العنصر لطلب الإرجاع
                    INSERT INTO return_items (
                        return_id,
                        original_order_item_id,
                        product_id,
                        product_name,
                        product_sku,
                        original_quantity,
                        return_quantity,
                        original_unit_price,
                        return_unit_price,
                        total_return_amount,
                        variant_info,
                        condition_status,
                        -- إضافة معلومات المتغيرات
                        color_id,
                        size_id,
                        color_name,
                        size_name,
                        variant_display_name
                    ) VALUES (
                        v_return_id,
                        v_order_item.id,
                        v_order_item.product_id,
                        COALESCE(v_order_item.current_product_name, v_order_item.product_name),
                        COALESCE(v_order_item.current_sku, ''),
                        v_order_item.quantity,
                        v_return_quantity,
                        v_order_item.unit_price,
                        v_order_item.unit_price,
                        v_order_item.unit_price * v_return_quantity,
                        COALESCE(v_order_item.variant_info, '{}'::jsonb),
                        COALESCE(v_item->>'condition_status', 'good'),
                        v_color_id,
                        v_size_id,
                        v_color_name,
                        v_size_name,
                        v_variant_display_name
                    );
                    
                    v_total_return_amount := v_total_return_amount + (v_order_item.unit_price * v_return_quantity);
                END;
            END IF;
        END LOOP;
    END IF;
    
    -- تحديث إجمالي مبلغ الإرجاع
    UPDATE returns 
    SET return_amount = v_total_return_amount, 
        refund_amount = v_total_return_amount
    WHERE id = v_return_id;
    
    -- إرجاع النتيجة
    RETURN json_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_amount', v_total_return_amount,
        'message', 'تم إنشاء طلب الإرجاع بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ: ' || SQLERRM
        );
END;
$$; 