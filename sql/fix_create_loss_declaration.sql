-- إصلاح دالة create_loss_declaration
-- تحديث الدالة لتتطابق مع الاستخدام في الكود وأسماء الأعمدة الصحيحة

DROP FUNCTION IF EXISTS create_loss_declaration(VARCHAR, TEXT, TIMESTAMP WITH TIME ZONE, UUID, UUID, VARCHAR, TEXT, JSONB, UUID, VARCHAR, TEXT) CASCADE;

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
        true
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
                    COALESCE(v_item->'variant_info', '{}'::jsonb),
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
    
    -- تحديث الإجماليات
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