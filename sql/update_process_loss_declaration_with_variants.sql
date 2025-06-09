-- تحديث دالة process_loss_declaration لدعم المتغيرات
-- ستقوم بتحديث مخزون المتغيرات المحددة بدلاً من المنتج الرئيسي فقط

CREATE OR REPLACE FUNCTION process_loss_declaration(
    p_loss_id UUID,
    p_processed_by UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_loss_record RECORD;
    v_item_record RECORD;
    v_total_processed INTEGER := 0;
    v_processed_items TEXT := '';
BEGIN
    -- التحقق من وجود التصريح وحالته
    SELECT l.*, u.name as created_by_name
    INTO v_loss_record
    FROM losses l
    LEFT JOIN users u ON l.created_by = u.id
    WHERE l.id = p_loss_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'تصريح الخسارة غير موجود';
        RETURN;
    END IF;

    IF v_loss_record.status != 'approved' THEN
        RETURN QUERY SELECT FALSE, 'لا يمكن معالجة التصريح إلا بعد الموافقة عليه';
        RETURN;
    END IF;

    -- معالجة كل منتج في التصريح
    FOR v_item_record IN 
        SELECT li.*
        FROM loss_items li
        WHERE li.loss_id = p_loss_id
    LOOP
        -- تحديث مخزون المتغيرات المحددة
        IF v_item_record.color_id IS NOT NULL AND v_item_record.size_id IS NOT NULL THEN
            -- منتج بلون ومقاس - تحديث مخزون كلاهما
            UPDATE product_colors 
            SET stock = GREATEST(0, stock - (v_item_record.quantity / 2)),
                updated_at = NOW()
            WHERE id = v_item_record.color_id;

            UPDATE product_sizes 
            SET stock = GREATEST(0, stock - (v_item_record.quantity / 2)),
                updated_at = NOW()
            WHERE id = v_item_record.size_id;

        ELSIF v_item_record.color_id IS NOT NULL THEN
            -- منتج بلون فقط
            UPDATE product_colors 
            SET stock = GREATEST(0, stock - v_item_record.quantity),
                updated_at = NOW()
            WHERE id = v_item_record.color_id;

        ELSIF v_item_record.size_id IS NOT NULL THEN
            -- منتج بمقاس فقط
            UPDATE product_sizes 
            SET stock = GREATEST(0, stock - v_item_record.quantity),
                updated_at = NOW()
            WHERE id = v_item_record.size_id;

        ELSE
            -- منتج بدون متغيرات - تحديث المخزون الرئيسي
            UPDATE products 
            SET stock = GREATEST(0, stock - v_item_record.quantity),
                updated_at = NOW()
            WHERE id = v_item_record.product_id;
        END IF;

        -- تحديث معلومات المخزون في سجل الخسارة
        UPDATE loss_items
        SET 
            stock_after = GREATEST(0, stock_before - quantity),
            updated_at = NOW()
        WHERE id = v_item_record.id;

        -- إدراج سجل في معاملات المخزون
        INSERT INTO inventory_transactions (
            id, product_id, transaction_type, quantity, 
            cost_price, reference_id, reference_type, reason,
            color_id, size_id, color_name, size_name,
            notes, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 
            v_item_record.product_id, 
            'out', 
            v_item_record.quantity,
            v_item_record.purchase_price_calc,
            p_loss_id,
            'loss',
            'loss',
            v_item_record.color_id,
            v_item_record.size_id,
            v_item_record.color_name,
            v_item_record.size_name,
            CONCAT('خسارة - ', v_item_record.loss_condition, 
                   CASE WHEN v_item_record.notes IS NOT NULL 
                        THEN CONCAT(' - ', v_item_record.notes) 
                        ELSE '' END),
            NOW(), 
            NOW()
        );

        v_total_processed := v_total_processed + v_item_record.quantity;
        
        -- بناء قائمة المنتجات المعالجة
        v_processed_items := v_processed_items || 
            CASE WHEN v_processed_items != '' THEN '، ' ELSE '' END ||
            v_item_record.quantity::TEXT || ' × ' ||
            (SELECT name FROM products WHERE id = v_item_record.product_id) ||
            CASE 
                WHEN v_item_record.color_name IS NOT NULL AND v_item_record.size_name IS NOT NULL 
                THEN ' (' || v_item_record.color_name || ' - ' || v_item_record.size_name || ')'
                WHEN v_item_record.color_name IS NOT NULL 
                THEN ' (' || v_item_record.color_name || ')'
                WHEN v_item_record.size_name IS NOT NULL 
                THEN ' (' || v_item_record.size_name || ')'
                ELSE ''
            END;
    END LOOP;

    -- تحديث حالة التصريح إلى "معالج"
    UPDATE losses
    SET 
        status = 'processed',
        processed_by = p_processed_by,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_loss_id;

    -- إرجاع رسالة نجاح
    RETURN QUERY SELECT 
        TRUE,
        CONCAT('تم معالجة تصريح الخسارة بنجاح. تم تحديث مخزون ', 
               v_total_processed::TEXT, ' منتج: ', v_processed_items);
END;
$$; 