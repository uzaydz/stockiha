-- =================================================================
-- دوال نظام التصريح بالخسائر - RPC Functions
-- =================================================================

-- 1. دالة إنشاء تصريح خسارة جديد
CREATE OR REPLACE FUNCTION create_loss_declaration(
    p_loss_type VARCHAR,
    p_loss_description TEXT,
    p_incident_date TIMESTAMP WITH TIME ZONE,
    p_reported_by UUID,
    p_organization_id UUID,
    p_loss_category VARCHAR DEFAULT 'operational',
    p_location_description TEXT DEFAULT NULL,
    p_items_lost JSONB DEFAULT '[]'::jsonb,
    p_witness_employee_id UUID DEFAULT NULL,
    p_witness_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
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
    -- التحقق من صحة البيانات الأساسية
    IF p_loss_description IS NULL OR LENGTH(TRIM(p_loss_description)) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'وصف الخسارة مطلوب'
        );
    END IF;
    
    IF p_incident_date > now() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'تاريخ الحادث لا يمكن أن يكون في المستقبل'
        );
    END IF;
    
    -- إنشاء تصريح الخسارة
    INSERT INTO losses (
        loss_type,
        loss_category,
        loss_description,
        incident_date,
        location_description,
        reported_by,
        witness_employee_id,
        witness_name,
        notes,
        organization_id,
        requires_manager_approval
    ) VALUES (
        p_loss_type,
        p_loss_category,
        p_loss_description,
        p_incident_date,
        p_location_description,
        p_reported_by,
        p_witness_employee_id,
        p_witness_name,
        p_notes,
        p_organization_id,
        true -- جميع التصريحات تتطلب موافقة
    ) RETURNING id INTO v_loss_id;
    
    -- معالجة عناصر الخسائر
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_lost)
    LOOP
        -- الحصول على معلومات المنتج
        SELECT p.*, COALESCE(p.purchase_price, p.price * 0.7) as purchase_price_calc
        INTO v_product
        FROM products p
        WHERE p.id = (v_item->>'product_id')::UUID
          AND p.organization_id = p_organization_id;
        
        IF FOUND THEN
            DECLARE
                v_lost_quantity INTEGER := (v_item->>'lost_quantity')::INTEGER;
                v_loss_condition VARCHAR := COALESCE(v_item->>'loss_condition', 'completely_damaged');
                v_loss_percentage NUMERIC := COALESCE((v_item->>'loss_percentage')::NUMERIC, 100.00);
                v_item_cost_value NUMERIC(10,2);
                v_item_selling_value NUMERIC(10,2);
            BEGIN
                -- التحقق من الكمية
                IF v_lost_quantity <= 0 THEN
                    RETURN json_build_object(
                        'success', false,
                        'error', 'كمية الخسارة يجب أن تكون أكبر من الصفر للمنتج: ' || v_product.name
                    );
                END IF;
                
                -- حساب قيم الخسارة
                v_item_cost_value := v_product.purchase_price_calc * v_lost_quantity * (v_loss_percentage / 100);
                v_item_selling_value := v_product.price * v_lost_quantity * (v_loss_percentage / 100);
                
                -- إضافة العنصر لتصريح الخسارة
                INSERT INTO loss_items (
                    loss_id,
                    product_id,
                    product_name,
                    product_sku,
                    product_barcode,
                    lost_quantity,
                    unit_cost_price,
                    unit_selling_price,
                    total_cost_value,
                    total_selling_value,
                    variant_info,
                    loss_condition,
                    loss_percentage,
                    stock_before_loss,
                    item_notes
                ) VALUES (
                    v_loss_id,
                    v_product.id,
                    v_product.name,
                    COALESCE(v_product.sku, ''),
                    COALESCE(v_product.barcode, ''),
                    v_lost_quantity,
                    v_product.purchase_price_calc,
                    v_product.price,
                    v_item_cost_value,
                    v_item_selling_value,
                    COALESCE(v_item->>'variant_info', '{}'::jsonb),
                    v_loss_condition,
                    v_loss_percentage,
                    v_product.stock_quantity,
                    v_item->>'item_notes'
                );
                
                -- تجميع الإجماليات
                v_total_cost := v_total_cost + v_item_cost_value;
                v_total_selling := v_total_selling + v_item_selling_value;
                v_total_items := v_total_items + v_lost_quantity;
            END;
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'المنتج غير موجود أو لا ينتمي للمنظمة'
            );
        END IF;
    END LOOP;
    
    -- تحديث الإجماليات (سيتم تحديثها تلقائياً بواسطة المحفز، لكن للتأكد)
    UPDATE losses 
    SET 
        total_cost_value = v_total_cost,
        total_selling_value = v_total_selling,
        total_items_count = v_total_items
    WHERE id = v_loss_id;
    
    -- إرجاع نتيجة العملية
    v_result := json_build_object(
        'success', true,
        'loss_id', v_loss_id,
        'loss_number', (SELECT loss_number FROM losses WHERE id = v_loss_id),
        'total_cost_value', v_total_cost,
        'total_selling_value', v_total_selling,
        'total_items_count', v_total_items,
        'requires_approval', true,
        'message', 'تم إنشاء تصريح الخسارة بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء إنشاء تصريح الخسارة: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 2. دالة معالجة تصريح الخسارة (الموافقة والمعالجة)
CREATE OR REPLACE FUNCTION process_loss_declaration(
    p_loss_id UUID,
    p_action VARCHAR, -- 'approve', 'reject', 'process'
    p_processed_by UUID,
    p_approval_notes TEXT DEFAULT NULL,
    p_adjust_inventory BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_loss RECORD;
    v_item RECORD;
    v_previous_stock INTEGER;
    v_new_stock INTEGER;
    v_result JSON;
BEGIN
    -- الحصول على معلومات تصريح الخسارة
    SELECT * INTO v_loss
    FROM losses 
    WHERE id = p_loss_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'تصريح الخسارة غير موجود'
        );
    END IF;
    
    -- التحقق من حالة التصريح
    IF p_action = 'approve' AND v_loss.status != 'pending' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا يمكن الموافقة على تصريح خسارة غير معلق'
        );
    END IF;
    
    IF p_action = 'process' AND v_loss.status NOT IN ('approved', 'pending') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا يمكن معالجة تصريح خسارة غير موافق عليه'
        );
    END IF;
    
    -- معالجة حسب نوع الإجراء
    IF p_action = 'approve' THEN
        UPDATE losses 
        SET 
            status = 'approved',
            approved_by = p_processed_by,
            approved_at = now(),
            approval_notes = p_approval_notes
        WHERE id = p_loss_id;
        
        v_result := json_build_object(
            'success', true,
            'message', 'تم الموافقة على تصريح الخسارة'
        );
        
    ELSIF p_action = 'reject' THEN
        UPDATE losses 
        SET 
            status = 'rejected',
            approved_by = p_processed_by,
            approved_at = now(),
            approval_notes = p_approval_notes
        WHERE id = p_loss_id;
        
        v_result := json_build_object(
            'success', true,
            'message', 'تم رفض تصريح الخسارة'
        );
        
    ELSIF p_action = 'process' THEN
        -- تحديث حالة التصريح
        UPDATE losses 
        SET 
            status = 'processed',
            processed_at = now()
        WHERE id = p_loss_id;
        
        -- تعديل المخزون (إذا كان مطلوباً)
        IF p_adjust_inventory THEN
            FOR v_item IN 
                SELECT li.*, p.stock_quantity as current_stock
                FROM loss_items li
                LEFT JOIN products p ON li.product_id = p.id
                WHERE li.loss_id = p_loss_id
            LOOP
                -- التحقق من أن المخزون الحالي كافٍ
                IF v_item.current_stock < v_item.lost_quantity THEN
                    RETURN json_build_object(
                        'success', false,
                        'error', 'المخزون الحالي غير كافٍ للمنتج: ' || v_item.product_name || 
                                ' (متوفر: ' || v_item.current_stock || ', مطلوب: ' || v_item.lost_quantity || ')'
                    );
                END IF;
                
                -- تحديث المخزون
                v_previous_stock := v_item.current_stock;
                v_new_stock := v_previous_stock - v_item.lost_quantity;
                
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
                    -v_item.lost_quantity, -- سالب لأنه خسارة
                    'loss',
                    'خسارة من تصريح رقم: ' || v_loss.loss_number || ' - ' || v_loss.loss_description,
                    p_loss_id,
                    p_processed_by
                );
                
                -- تحديث حالة تعديل المخزون للعنصر
                UPDATE loss_items 
                SET 
                    stock_after_loss = v_new_stock,
                    inventory_adjusted = true,
                    inventory_adjusted_at = now(),
                    inventory_adjusted_by = p_processed_by
                WHERE id = v_item.id;
            END LOOP;
        END IF;
        
        -- لا نحتاج إدراج في جدول transactions لأن الخسائر ليست معاملات مبيعات
        -- المعلومات مسجلة في جدول losses وجدول inventory_transactions
        
        v_result := json_build_object(
            'success', true,
            'inventory_adjusted', p_adjust_inventory,
            'total_loss_value', v_loss.total_selling_value,
            'message', 'تم معالجة تصريح الخسارة بنجاح'
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء معالجة تصريح الخسارة: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 3. دالة الحصول على قائمة تصريحات الخسائر
CREATE OR REPLACE FUNCTION get_losses_list(
    p_organization_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_loss_type VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    loss_number VARCHAR,
    loss_type VARCHAR,
    loss_category VARCHAR,
    loss_description TEXT,
    incident_date TIMESTAMP WITH TIME ZONE,
    total_cost_value NUMERIC,
    total_selling_value NUMERIC,
    total_items_count INTEGER,
    status VARCHAR,
    reported_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    requires_approval BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.loss_number,
        l.loss_type,
        l.loss_category,
        l.loss_description,
        l.incident_date,
        l.total_cost_value,
        l.total_selling_value,
        l.total_items_count,
        l.status,
        COALESCE(u.name, 'غير محدد') as reported_by_name,
        l.created_at,
        l.requires_manager_approval
    FROM losses l
    LEFT JOIN users u ON l.reported_by = u.id
    WHERE l.organization_id = p_organization_id
      AND (p_status IS NULL OR l.status = p_status)
      AND (p_loss_type IS NULL OR l.loss_type = p_loss_type)
      AND (p_date_from IS NULL OR l.incident_date::date >= p_date_from)
      AND (p_date_to IS NULL OR l.incident_date::date <= p_date_to)
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة الحصول على تفاصيل تصريح خسارة محدد
CREATE OR REPLACE FUNCTION get_loss_details(p_loss_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'loss_info', (
            SELECT row_to_json(loss_with_users.*)
            FROM (
                SELECT l.*,
                       u1.name as reported_by_name,
                       u2.name as approved_by_name,
                       u3.name as witness_employee_name
                FROM losses l
                LEFT JOIN users u1 ON l.reported_by = u1.id
                LEFT JOIN users u2 ON l.approved_by = u2.id
                LEFT JOIN users u3 ON l.witness_employee_id = u3.id
                WHERE l.id = p_loss_id
            ) loss_with_users
        ),
        'items', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', li.id,
                    'product_id', li.product_id,
                    'product_name', li.product_name,
                    'product_sku', li.product_sku,
                    'lost_quantity', li.lost_quantity,
                    'unit_cost_price', li.unit_cost_price,
                    'unit_selling_price', li.unit_selling_price,
                    'total_cost_value', li.total_cost_value,
                    'total_selling_value', li.total_selling_value,
                    'loss_condition', li.loss_condition,
                    'loss_percentage', li.loss_percentage,
                    'stock_before_loss', li.stock_before_loss,
                    'stock_after_loss', li.stock_after_loss,
                    'inventory_adjusted', li.inventory_adjusted,
                    'current_stock', p.stock_quantity
                )
            )
             FROM loss_items li
             LEFT JOIN products p ON li.product_id = p.id
             WHERE li.loss_id = p_loss_id), 
            '[]'::json
        ),
        'evidence', COALESCE(
            (SELECT json_agg(row_to_json(le.*))
             FROM loss_evidence le
             WHERE le.loss_id = p_loss_id), 
            '[]'::json
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة إحصائيات الخسائر
CREATE OR REPLACE FUNCTION get_losses_statistics(
    p_organization_id UUID,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    WITH loss_stats AS (
        SELECT 
            COUNT(*) as total_declarations,
            COUNT(*) FILTER (WHERE status = 'processed') as processed_declarations,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_declarations,
            SUM(total_items_count) as total_items_lost,
            COALESCE(SUM(total_cost_value), 0) as total_cost_loss,
            COALESCE(SUM(total_selling_value), 0) as total_selling_loss,
            COALESCE(AVG(total_selling_value), 0) as avg_loss_value
        FROM losses
        WHERE organization_id = p_organization_id
          AND (p_period_start IS NULL OR incident_date::date >= p_period_start)
          AND (p_period_end IS NULL OR incident_date::date <= p_period_end)
    ),
    type_stats AS (
        SELECT 
            loss_type,
            COUNT(*) as count,
            SUM(total_selling_value) as total_value
        FROM losses
        WHERE organization_id = p_organization_id
          AND (p_period_start IS NULL OR incident_date::date >= p_period_start)
          AND (p_period_end IS NULL OR incident_date::date <= p_period_end)
        GROUP BY loss_type
        ORDER BY total_value DESC
    ),
    top_lost_products AS (
        SELECT 
            li.product_name,
            SUM(li.lost_quantity) as total_lost_quantity,
            SUM(li.total_selling_value) as total_lost_value
        FROM loss_items li
        JOIN losses l ON li.loss_id = l.id
        WHERE l.organization_id = p_organization_id
          AND (p_period_start IS NULL OR l.incident_date::date >= p_period_start)
          AND (p_period_end IS NULL OR l.incident_date::date <= p_period_end)
        GROUP BY li.product_name
        ORDER BY total_lost_value DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'overview', row_to_json(ls.*),
        'by_type', COALESCE(
            (SELECT json_agg(row_to_json(type_stats.*)) FROM type_stats),
            '[]'::json
        ),
        'top_lost_products', COALESCE(
            (SELECT json_agg(row_to_json(top_lost_products.*)) FROM top_lost_products),
            '[]'::json
        )
    ) INTO v_stats
    FROM loss_stats ls;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql; 