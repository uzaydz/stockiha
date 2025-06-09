-- إصلاح مشكلة قيد reason في inventory_transactions
-- تحديث دالة process_loss_declaration لاستخدام 'loss' فقط

DROP FUNCTION IF EXISTS process_loss_declaration(UUID, VARCHAR, UUID, TEXT, BOOLEAN) CASCADE;

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
                
                -- تسجيل حركة المخزون باستخدام 'loss' فقط
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