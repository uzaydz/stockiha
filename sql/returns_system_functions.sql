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
    v_return_item_id UUID;
    v_total_return_amount NUMERIC(10,2) := 0;
    v_total_original_amount NUMERIC(10,2) := 0;
    v_customer RECORD;
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
        -- إرجاع جزئي - إضافة العناصر المحددة فقط
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_to_return)
        LOOP
            -- الحصول على معلومات العنصر الأصلي
            SELECT oi.*, p.name as current_product_name, p.sku as current_sku
            INTO v_order_item
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.id = (v_item->>'order_item_id')::UUID
              AND oi.order_id = p_original_order_id;
            
            IF FOUND THEN
                -- التحقق من أن الكمية المطلوبة للإرجاع لا تتجاوز الكمية الأصلية
                DECLARE
                    v_return_quantity INTEGER := (v_item->>'return_quantity')::INTEGER;
                    v_already_returned INTEGER;
                BEGIN
                    -- حساب الكمية المرجعة سابقاً لهذا العنصر
                    SELECT COALESCE(SUM(ri.return_quantity), 0)
                    INTO v_already_returned
                    FROM return_items ri
                    JOIN returns r ON ri.return_id = r.id
                    WHERE ri.original_order_item_id = v_order_item.id
                      AND r.status NOT IN ('rejected', 'cancelled');
                    
                    IF (v_already_returned + v_return_quantity) > v_order_item.quantity THEN
                        RETURN json_build_object(
                            'success', false,
                            'error', 'الكمية المطلوبة للإرجاع تتجاوز الكمية المتاحة للمنتج: ' || v_order_item.product_name
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
    
    -- تحديث مبلغ الإرجاع في الطلب
    UPDATE returns 
    SET 
        return_amount = v_total_return_amount,
        refund_amount = v_total_return_amount -- يمكن تعديلها لاحقاً حسب السياسة
    WHERE id = v_return_id;
    
    -- إرجاع نتيجة العملية
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

-- 2. دالة معالجة طلب الإرجاع (الموافقة والمعالجة)
CREATE OR REPLACE FUNCTION process_return_request(
    p_return_id UUID,
    p_action VARCHAR, -- 'approve', 'reject', 'process'
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_refund_amount NUMERIC(10,2) DEFAULT NULL,
    p_restocking_fee NUMERIC(10,2) DEFAULT 0,
    p_restore_inventory BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_return RECORD;
    v_item RECORD;
    v_previous_stock INTEGER;
    v_new_stock INTEGER;
    v_final_refund_amount NUMERIC(10,2);
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- الحصول على معلومات طلب الإرجاع
    SELECT * INTO v_return
    FROM returns 
    WHERE id = p_return_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'طلب الإرجاع غير موجود'
        );
    END IF;
    
    -- التحقق من حالة الطلب
    IF p_action = 'approve' AND v_return.status != 'pending' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا يمكن الموافقة على طلب إرجاع غير معلق'
        );
    END IF;
    
    IF p_action = 'process' AND v_return.status NOT IN ('approved', 'pending') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا يمكن معالجة طلب إرجاع غير موافق عليه'
        );
    END IF;
    
    -- معالجة حسب نوع الإجراء
    IF p_action = 'approve' THEN
        UPDATE returns 
        SET 
            status = 'approved',
            approved_by = p_processed_by,
            approved_at = now(),
            approval_notes = p_notes
        WHERE id = p_return_id;
        
        v_result := json_build_object(
            'success', true,
            'message', 'تم الموافقة على طلب الإرجاع'
        );
        
    ELSIF p_action = 'reject' THEN
        UPDATE returns 
        SET 
            status = 'rejected',
            approved_by = p_processed_by,
            approved_at = now(),
            approval_notes = p_notes
        WHERE id = p_return_id;
        
        v_result := json_build_object(
            'success', true,
            'message', 'تم رفض طلب الإرجاع'
        );
        
    ELSIF p_action = 'process' THEN
        -- حساب مبلغ الاسترداد النهائي
        v_final_refund_amount := COALESCE(p_refund_amount, v_return.return_amount) - COALESCE(p_restocking_fee, 0);
        
        -- تحديث حالة الطلب
        UPDATE returns 
        SET 
            status = 'processing',
            processed_by = p_processed_by,
            processed_at = now(),
            refund_amount = v_final_refund_amount,
            restocking_fee = COALESCE(p_restocking_fee, 0),
            notes = COALESCE(notes || ' | ', '') || COALESCE(p_notes, '')
        WHERE id = p_return_id;
        
        -- إرجاع المنتجات للمخزون (إذا كان مطلوباً)
        IF p_restore_inventory THEN
            FOR v_item IN 
                SELECT ri.*, p.stock_quantity as current_stock
                FROM return_items ri
                LEFT JOIN products p ON ri.product_id = p.id
                WHERE ri.return_id = p_return_id
                  AND ri.resellable = true
            LOOP
                -- تحديث المخزون
                v_previous_stock := v_item.current_stock;
                v_new_stock := v_previous_stock + v_item.return_quantity;
                
                UPDATE products 
                SET 
                    stock_quantity = v_new_stock,
                    updated_at = now()
                WHERE id = v_item.product_id;
                
                -- تسجيل حركة المخزون
                INSERT INTO inventory_transactions (
                    product_id,
                    quantity,
                    reason,
                    notes,
                    source_id,
                    created_by
                ) VALUES (
                    v_item.product_id,
                    v_item.return_quantity,
                    'return',
                    'إرجاع من طلب رقم: ' || v_return.return_number,
                    p_return_id,
                    p_processed_by
                );
                
                -- تحديث حالة إرجاع المخزون للعنصر
                UPDATE return_items 
                SET 
                    inventory_returned = true,
                    inventory_returned_at = now()
                WHERE id = v_item.id;
            END LOOP;
        END IF;
        
        -- إنشاء معاملة الاسترداد المالي
        IF v_final_refund_amount > 0 THEN
            INSERT INTO refund_transactions (
                return_id,
                transaction_type,
                amount,
                payment_method,
                processed_by,
                notes,
                organization_id
            ) VALUES (
                p_return_id,
                CASE v_return.refund_method
                    WHEN 'cash' THEN 'cash_refund'
                    WHEN 'card' THEN 'card_refund'
                    WHEN 'credit' THEN 'store_credit'
                    ELSE 'cash_refund'
                END,
                v_final_refund_amount,
                v_return.refund_method,
                p_processed_by,
                'استرداد لطلب إرجاع رقم: ' || v_return.return_number,
                v_return.organization_id
            ) RETURNING id INTO v_transaction_id;
            
            -- إنشاء معاملة في جدول المعاملات العامة
            INSERT INTO transactions (
                amount,
                type,
                payment_method,
                description,
                employee_id,
                organization_id
            ) VALUES (
                -v_final_refund_amount, -- سالب لأنه استرداد
                'refund',
                v_return.refund_method,
                'استرداد لطلب إرجاع رقم: ' || v_return.return_number,
                p_processed_by,
                v_return.organization_id
            );
        END IF;
        
        -- تحديث حالة الطلب لمكتمل
        UPDATE returns 
        SET status = 'completed'
        WHERE id = p_return_id;
        
        v_result := json_build_object(
            'success', true,
            'refund_amount', v_final_refund_amount,
            'transaction_id', v_transaction_id,
            'inventory_restored', p_restore_inventory,
            'message', 'تم معالجة طلب الإرجاع بنجاح'
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء معالجة طلب الإرجاع: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 3. دالة الحصول على طلبات الإرجاع مع الفلترة
CREATE OR REPLACE FUNCTION get_returns_list(
    p_organization_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_return_type VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_customer_search TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    return_number VARCHAR,
    original_order_number VARCHAR,
    customer_name VARCHAR,
    return_type VARCHAR,
    return_reason VARCHAR,
    return_amount NUMERIC,
    refund_amount NUMERIC,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    items_count BIGINT,
    requires_approval BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.return_number,
        r.original_order_number,
        r.customer_name,
        r.return_type,
        r.return_reason,
        r.return_amount,
        r.refund_amount,
        r.status,
        r.created_at,
        r.processed_at,
        COUNT(ri.id) as items_count,
        r.requires_manager_approval
    FROM returns r
    LEFT JOIN return_items ri ON r.id = ri.return_id
    WHERE r.organization_id = p_organization_id
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_return_type IS NULL OR r.return_type = p_return_type)
      AND (p_date_from IS NULL OR r.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR r.created_at::date <= p_date_to)
      AND (p_customer_search IS NULL OR r.customer_name ILIKE '%' || p_customer_search || '%')
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة الحصول على تفاصيل طلب إرجاع محدد
CREATE OR REPLACE FUNCTION get_return_details(p_return_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'return_info', row_to_json(r.*),
        'items', COALESCE(
            (SELECT json_agg(row_to_json(ri.*))
             FROM return_items ri
             WHERE ri.return_id = r.id), 
            '[]'::json
        ),
        'refund_transactions', COALESCE(
            (SELECT json_agg(row_to_json(rt.*))
             FROM refund_transactions rt
             WHERE rt.return_id = r.id), 
            '[]'::json
        ),
        'original_order', (
            SELECT row_to_json(o.*)
            FROM orders o
            WHERE o.id = r.original_order_id
        )
    ) INTO v_result
    FROM returns r
    WHERE r.id = p_return_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة إحصائيات الإرجاع
CREATE OR REPLACE FUNCTION get_returns_statistics(
    p_organization_id UUID,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    WITH return_stats AS (
        SELECT 
            COUNT(*) as total_returns,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_returns,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_returns,
            COUNT(*) FILTER (WHERE return_type = 'full') as full_returns,
            COUNT(*) FILTER (WHERE return_type = 'partial') as partial_returns,
            COALESCE(SUM(return_amount), 0) as total_return_amount,
            COALESCE(SUM(refund_amount), 0) as total_refund_amount,
            COALESCE(AVG(return_amount), 0) as avg_return_amount
        FROM returns
        WHERE organization_id = p_organization_id
          AND (p_period_start IS NULL OR created_at::date >= p_period_start)
          AND (p_period_end IS NULL OR created_at::date <= p_period_end)
    ),
    reason_stats AS (
        SELECT 
            return_reason,
            COUNT(*) as count,
            SUM(return_amount) as total_amount
        FROM returns
        WHERE organization_id = p_organization_id
          AND (p_period_start IS NULL OR created_at::date >= p_period_start)
          AND (p_period_end IS NULL OR created_at::date <= p_period_end)
        GROUP BY return_reason
        ORDER BY count DESC
    )
    SELECT json_build_object(
        'overview', row_to_json(rs.*),
        'by_reason', COALESCE(
            (SELECT json_agg(row_to_json(reason_stats.*)) FROM reason_stats),
            '[]'::json
        )
    ) INTO v_stats
    FROM return_stats rs;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql; 