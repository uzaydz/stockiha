-- =================================================================
-- دوال نظام التصريح بالخسائر - RPC Functions
-- =================================================================

-- 1. دالة إنشاء تصريح خسارة جديد
CREATE OR REPLACE FUNCTION create_loss_declaration(
    p_loss_type VARCHAR,
    p_loss_description TEXT,
    p_incident_date TIMESTAMP WITH TIME ZONE,
    p_items_lost JSONB DEFAULT '[]'::jsonb,
    p_notes TEXT DEFAULT NULL,
    p_reported_by UUID,
    p_organization_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_loss_id UUID;
    v_item JSONB;
    v_product RECORD;
    v_total_cost NUMERIC(12,2) := 0;
    v_total_selling NUMERIC(12,2) := 0;
    v_total_items INTEGER := 0;
    v_result JSON;
BEGIN
    -- التحقق من صحة البيانات
    IF p_loss_description IS NULL OR LENGTH(TRIM(p_loss_description)) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'وصف الخسارة مطلوب');
    END IF;
    
    -- إنشاء تصريح الخسارة
    INSERT INTO losses (
        loss_type, loss_description, incident_date, 
        reported_by, notes, organization_id, requires_manager_approval
    ) VALUES (
        p_loss_type, p_loss_description, p_incident_date,
        p_reported_by, p_notes, p_organization_id, true
    ) RETURNING id INTO v_loss_id;
    
    -- معالجة عناصر الخسائر
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_lost)
    LOOP
        SELECT p.*, COALESCE(p.purchase_price, p.price * 0.7) as cost_price
        INTO v_product
        FROM products p
        WHERE p.id = (v_item->>'product_id')::UUID
          AND p.organization_id = p_organization_id;
        
        IF FOUND THEN
            DECLARE
                v_lost_quantity INTEGER := (v_item->>'lost_quantity')::INTEGER;
                v_item_cost_value NUMERIC(10,2);
                v_item_selling_value NUMERIC(10,2);
            BEGIN
                v_item_cost_value := v_product.cost_price * v_lost_quantity;
                v_item_selling_value := v_product.price * v_lost_quantity;
                
                INSERT INTO loss_items (
                    loss_id, product_id, product_name, product_sku,
                    lost_quantity, unit_cost_price, unit_selling_price,
                    total_cost_value, total_selling_value,
                    loss_condition, stock_before_loss
                ) VALUES (
                    v_loss_id, v_product.id, v_product.name, COALESCE(v_product.sku, ''),
                    v_lost_quantity, v_product.cost_price, v_product.price,
                    v_item_cost_value, v_item_selling_value,
                    COALESCE(v_item->>'loss_condition', 'completely_damaged'),
                    v_product.stock_quantity
                );
                
                v_total_cost := v_total_cost + v_item_cost_value;
                v_total_selling := v_total_selling + v_item_selling_value;
                v_total_items := v_total_items + v_lost_quantity;
            END;
        END IF;
    END LOOP;
    
    v_result := json_build_object(
        'success', true,
        'loss_id', v_loss_id,
        'loss_number', (SELECT loss_number FROM losses WHERE id = v_loss_id),
        'total_cost_value', v_total_cost,
        'message', 'تم إنشاء تصريح الخسارة بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 2. دالة معالجة تصريح الخسارة
CREATE OR REPLACE FUNCTION process_loss_declaration(
    p_loss_id UUID,
    p_action VARCHAR, -- 'approve', 'reject', 'process'
    p_processed_by UUID,
    p_adjust_inventory BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_loss RECORD;
    v_item RECORD;
    v_result JSON;
BEGIN
    SELECT * INTO v_loss FROM losses WHERE id = p_loss_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'تصريح الخسارة غير موجود');
    END IF;
    
    IF p_action = 'approve' THEN
        UPDATE losses 
        SET status = 'approved', approved_by = p_processed_by, approved_at = now()
        WHERE id = p_loss_id;
        
        v_result := json_build_object('success', true, 'message', 'تم الموافقة على تصريح الخسارة');
        
    ELSIF p_action = 'process' THEN
        UPDATE losses 
        SET status = 'processed', processed_at = now()
        WHERE id = p_loss_id;
        
        -- تعديل المخزون
        IF p_adjust_inventory THEN
            FOR v_item IN 
                SELECT li.*, p.stock_quantity as current_stock
                FROM loss_items li
                LEFT JOIN products p ON li.product_id = p.id
                WHERE li.loss_id = p_loss_id
            LOOP
                UPDATE products 
                SET stock_quantity = stock_quantity - v_item.lost_quantity
                WHERE id = v_item.product_id;
                
                INSERT INTO inventory_transactions (
                    product_id, quantity, reason, notes, source_id, created_by
                ) VALUES (
                    v_item.product_id, -v_item.lost_quantity, 'loss',
                    'خسارة من تصريح رقم: ' || v_loss.loss_number,
                    p_loss_id, p_processed_by
                );
                
                UPDATE loss_items 
                SET inventory_adjusted = true, inventory_adjusted_at = now()
                WHERE id = v_item.id;
            END LOOP;
        END IF;
        
        v_result := json_build_object('success', true, 'message', 'تم معالجة تصريح الخسارة بنجاح');
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 3. دالة قائمة تصريحات الخسائر
CREATE OR REPLACE FUNCTION get_losses_list(
    p_organization_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID, loss_number VARCHAR, loss_type VARCHAR,
    loss_description TEXT, total_selling_value NUMERIC,
    status VARCHAR, created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id, l.loss_number, l.loss_type, l.loss_description,
        l.total_selling_value, l.status, l.created_at
    FROM losses l
    WHERE l.organization_id = p_organization_id
      AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql; 