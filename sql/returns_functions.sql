-- =================================================================
-- دوال نظام إرجاع المنتجات - RPC Functions
-- =================================================================

-- 1. دالة إنشاء طلب إرجاع جديد
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
RETURNS JSON AS $$
DECLARE
    v_return_id UUID;
    v_original_order RECORD;
    v_item JSONB;
    v_order_item RECORD;
    v_total_return_amount NUMERIC(10,2) := 0;
    v_result JSON;
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
        CASE WHEN v_original_order.total > 1000 THEN true ELSE false END
    ) RETURNING id INTO v_return_id;
    
    -- معالجة عناصر الإرجاع
    IF p_return_type = 'full' THEN
        -- إرجاع كامل
        FOR v_order_item IN 
            SELECT oi.*, p.name as current_product_name, p.sku as current_sku
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
                variant_info
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
                v_order_item.variant_info
            );
            
            v_total_return_amount := v_total_return_amount + v_order_item.total_price;
        END LOOP;
    ELSE
        -- إرجاع جزئي
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_to_return)
        LOOP
            SELECT oi.*, p.name as current_product_name, p.sku as current_sku
            INTO v_order_item
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.id = (v_item->>'order_item_id')::UUID
              AND oi.order_id = p_original_order_id;
            
            IF FOUND THEN
                DECLARE
                    v_return_quantity INTEGER := (v_item->>'return_quantity')::INTEGER;
                BEGIN
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
                        condition_status
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
                        v_order_item.variant_info,
                        COALESCE(v_item->>'condition_status', 'good')
                    );
                    
                    v_total_return_amount := v_total_return_amount + (v_order_item.unit_price * v_return_quantity);
                END;
            END IF;
        END LOOP;
    END IF;
    
    -- تحديث مبلغ الإرجاع
    UPDATE returns 
    SET 
        return_amount = v_total_return_amount,
        refund_amount = v_total_return_amount
    WHERE id = v_return_id;
    
    v_result := json_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', (SELECT return_number FROM returns WHERE id = v_return_id),
        'total_return_amount', v_total_return_amount,
        'requires_approval', (SELECT requires_manager_approval FROM returns WHERE id = v_return_id),
        'message', 'تم إنشاء طلب الإرجاع بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء إنشاء طلب الإرجاع: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 2. دالة معالجة طلب الإرجاع
CREATE OR REPLACE FUNCTION process_return_request(
    p_return_id UUID,
    p_action VARCHAR, -- 'approve', 'reject', 'process'
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_refund_amount NUMERIC(10,2) DEFAULT NULL,
    p_restore_inventory BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_return RECORD;
    v_item RECORD;
    v_final_refund_amount NUMERIC(10,2);
    v_result JSON;
BEGIN
    SELECT * INTO v_return FROM returns WHERE id = p_return_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'طلب الإرجاع غير موجود');
    END IF;
    
    IF p_action = 'approve' THEN
        UPDATE returns 
        SET status = 'approved', approved_by = p_processed_by, approved_at = now()
        WHERE id = p_return_id;
        
        v_result := json_build_object('success', true, 'message', 'تم الموافقة على طلب الإرجاع');
        
    ELSIF p_action = 'reject' THEN
        UPDATE returns 
        SET status = 'rejected', approved_by = p_processed_by, approved_at = now()
        WHERE id = p_return_id;
        
        v_result := json_build_object('success', true, 'message', 'تم رفض طلب الإرجاع');
        
    ELSIF p_action = 'process' THEN
        v_final_refund_amount := COALESCE(p_refund_amount, v_return.return_amount);
        
        UPDATE returns 
        SET status = 'completed', processed_by = p_processed_by, processed_at = now(),
            refund_amount = v_final_refund_amount
        WHERE id = p_return_id;
        
        -- إرجاع للمخزون
        IF p_restore_inventory THEN
            FOR v_item IN 
                SELECT ri.*, p.stock_quantity as current_stock
                FROM return_items ri
                LEFT JOIN products p ON ri.product_id = p.id
                WHERE ri.return_id = p_return_id AND ri.resellable = true
            LOOP
                UPDATE products 
                SET stock_quantity = stock_quantity + v_item.return_quantity
                WHERE id = v_item.product_id;
                
                INSERT INTO inventory_transactions (
                    product_id, quantity, reason, notes, source_id, created_by
                ) VALUES (
                    v_item.product_id, v_item.return_quantity, 'return',
                    'إرجاع من طلب رقم: ' || v_return.return_number,
                    p_return_id, p_processed_by
                );
            END LOOP;
        END IF;
        
        v_result := json_build_object('success', true, 'message', 'تم معالجة طلب الإرجاع بنجاح');
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 3. دالة قائمة طلبات الإرجاع
CREATE OR REPLACE FUNCTION get_returns_list(
    p_organization_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID, return_number VARCHAR, customer_name VARCHAR,
    return_type VARCHAR, return_amount NUMERIC, status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE, items_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id, r.return_number, r.customer_name, r.return_type,
        r.return_amount, r.status, r.created_at,
        COUNT(ri.id) as items_count
    FROM returns r
    LEFT JOIN return_items ri ON r.id = ri.return_id
    WHERE r.organization_id = p_organization_id
      AND (p_status IS NULL OR r.status = p_status)
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql; 