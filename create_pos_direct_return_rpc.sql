-- دالة RPC محسنة للإرجاع المباشر من نقطة البيع
-- تقوم بجميع العمليات في استدعاء واحد لتحسين الأداء

CREATE OR REPLACE FUNCTION create_pos_direct_return(
    p_organization_id UUID,
    p_created_by UUID,
    p_customer_name TEXT DEFAULT 'زائر',
    p_return_reason VARCHAR(50) DEFAULT 'customer_request',
    p_return_notes TEXT DEFAULT NULL,
    p_refund_method VARCHAR(20) DEFAULT 'cash',
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(
    success BOOLEAN,
    return_id UUID,
    return_number VARCHAR(50),
    total_return_amount NUMERIC,
    message TEXT,
    error TEXT
) AS $$
DECLARE
    v_return_id UUID;
    v_return_number VARCHAR(50);
    v_total_amount NUMERIC(10,2) := 0;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_product_sku TEXT;
    v_unit_price NUMERIC(10,2);
    v_quantity INTEGER;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_item_total NUMERIC(10,2);
BEGIN
    -- إنشاء معرف ورقم الإرجاع
    v_return_id := gen_random_uuid();
    v_return_number := 'RET-DIRECT-' || EXTRACT(epoch FROM NOW())::bigint;
    
    -- التحقق من وجود عناصر للإرجاع
    IF jsonb_array_length(p_items) = 0 THEN
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            NULL::VARCHAR(50), 
            0::NUMERIC, 
            NULL::TEXT,
            'لا توجد عناصر للإرجاع'::TEXT;
        RETURN;
    END IF;
    
    -- معالجة كل عنصر في الإرجاع
    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
        -- استخراج بيانات العنصر
        v_product_id := (v_item->>'product_id')::UUID;
        v_product_name := v_item->>'product_name';
        v_product_sku := COALESCE(v_item->>'product_sku', '');
        v_unit_price := (v_item->>'unit_price')::NUMERIC(10,2);
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_total := v_unit_price * v_quantity;
        
        -- التحقق من وجود المنتج والحصول على المخزون الحالي
        SELECT stock_quantity INTO v_current_stock
        FROM products 
        WHERE id = v_product_id AND organization_id = p_organization_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                false, 
                NULL::UUID, 
                NULL::VARCHAR(50), 
                0::NUMERIC, 
                NULL::TEXT,
                ('المنتج غير موجود: ' || v_product_name)::TEXT;
            RETURN;
        END IF;
        
        -- حساب المخزون الجديد
        v_new_stock := COALESCE(v_current_stock, 0) + v_quantity;
        
        -- تحديث مخزون المنتج
        UPDATE products 
        SET 
            stock_quantity = v_new_stock,
            updated_at = NOW()
        WHERE id = v_product_id;
        
        -- تسجيل حركة المخزون
        INSERT INTO inventory_log (
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            reference_id,
            notes,
            created_by,
            organization_id,
            created_at
        ) VALUES (
            v_product_id,
            v_quantity,
            v_current_stock,
            v_new_stock,
            'return',
            'pos_return',
            v_return_id,
            'إرجاع مباشر من نقطة البيع - ' || v_product_name,
            p_created_by,
            p_organization_id,
            NOW()
        );
        
        -- إضافة للمبلغ الإجمالي
        v_total_amount := v_total_amount + v_item_total;
    END LOOP;
    
    -- إنشاء سجل الإرجاع
    INSERT INTO returns (
        id,
        return_number,
        original_order_id,
        customer_name,
        return_type,
        return_reason,
        return_reason_description,
        original_total,
        return_amount,
        refund_amount,
        status,
        refund_method,
        notes,
        organization_id,
        created_by,
        processed_by,
        processed_at,
        created_at
    ) VALUES (
        v_return_id,
        v_return_number,
        NULL, -- إرجاع مباشر بدون طلبية أصلية
        p_customer_name,
        'direct',
        p_return_reason,
        p_return_notes,
        v_total_amount,
        v_total_amount,
        v_total_amount,
        'completed',
        p_refund_method,
        p_return_notes,
        p_organization_id,
        p_created_by,
        p_created_by,
        NOW(),
        NOW()
    );
    
    -- إنشاء عناصر الإرجاع
    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_product_name := v_item->>'product_name';
        v_product_sku := COALESCE(v_item->>'product_sku', '');
        v_unit_price := (v_item->>'unit_price')::NUMERIC(10,2);
        v_quantity := (v_item->>'quantity')::INTEGER;
        
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
            resellable,
            inventory_returned,
            inventory_returned_at,
            created_at
        ) VALUES (
            v_return_id,
            NULL, -- إرجاع مباشر
            v_product_id,
            v_product_name,
            v_product_sku,
            v_quantity,
            v_quantity,
            v_unit_price,
            v_unit_price,
            v_unit_price * v_quantity,
            CASE 
                WHEN v_item ? 'color_id' OR v_item ? 'size_id' THEN
                    jsonb_build_object(
                        'color_id', v_item->>'color_id',
                        'color_name', v_item->>'color_name',
                        'size_id', v_item->>'size_id',
                        'size_name', v_item->>'size_name'
                    )
                ELSE NULL
            END,
            'good',
            true,
            true,
            NOW(),
            NOW()
        );
    END LOOP;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT 
        true, 
        v_return_id, 
        v_return_number, 
        v_total_amount, 
        ('تم إنشاء إرجاع مباشر رقم ' || v_return_number || ' بنجاح')::TEXT,
        NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ
        RETURN QUERY SELECT 
            false, 
            NULL::UUID, 
            NULL::VARCHAR(50), 
            0::NUMERIC, 
            NULL::TEXT,
            ('حدث خطأ في معالجة الإرجاع: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION create_pos_direct_return IS 'دالة RPC محسنة للإرجاع المباشر من نقطة البيع - تقوم بجميع العمليات في استدعاء واحد';

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_returns_pos_direct ON returns(return_type, organization_id, created_at) 
WHERE return_type = 'direct'; 