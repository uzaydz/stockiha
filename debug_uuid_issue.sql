-- ✅ نسخة debug لتتبع مصدر مشكلة UUID
-- تاريخ التعديل: 2025-01-14

-- دالة debug لتتبع مصدر المشكلة
CREATE OR REPLACE FUNCTION create_pos_order_debug(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT '',
    p_amount_paid NUMERIC DEFAULT NULL,
    p_discount NUMERIC DEFAULT 0,
    p_subtotal NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debug_info JSONB := '[]'::JSONB;
    v_new_order_id UUID;
    v_order_slug TEXT;
    v_customer_order_number INTEGER;
    v_item JSONB;
    v_result JSONB;
    v_final_subtotal NUMERIC;
    v_final_amount_paid NUMERIC;
    v_items_count INTEGER := 0;
    v_processing_start_time TIMESTAMP := NOW();
    v_step TEXT := 'initialization';
BEGIN
    -- تسجيل بداية المعالجة
    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'start',
        'timestamp', NOW(),
        'input_params', jsonb_build_object(
            'organization_id', p_organization_id,
            'employee_id', p_employee_id,
            'customer_id', p_customer_id,
            'items_type', jsonb_typeof(p_items),
            'items_length', CASE WHEN jsonb_typeof(p_items) = 'array' THEN jsonb_array_length(p_items) ELSE NULL END,
            'total_amount', p_total_amount
        )
    );
    
    -- التحقق من صحة البيانات
    v_step := 'validation';
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'p_items يجب أن يكون مصفوفة JSON صالحة',
            'debug_info', v_debug_info,
            'failed_step', v_step
        );
    END IF;
    
    v_items_count := jsonb_array_length(p_items);
    
    IF v_items_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن إنشاء طلب فارغ',
            'debug_info', v_debug_info,
            'failed_step', v_step
        );
    END IF;
    
    -- إنشاء معرف الطلب
    v_step := 'order_creation';
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'POS-' || EXTRACT(epoch FROM NOW())::TEXT || '-' || SUBSTRING(v_new_order_id::TEXT FROM 1 FOR 8);
    
    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'order_id_generated',
        'order_id', v_new_order_id,
        'slug', v_order_slug
    );
    
    -- الحصول على رقم الطلب التتابعي
    v_step := 'customer_order_number';
    SELECT COALESCE(MAX(customer_order_number), 0) + 1
    INTO v_customer_order_number
    FROM orders 
    WHERE organization_id = p_organization_id 
    AND is_online = false;
    
    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'customer_order_number_generated',
        'customer_order_number', v_customer_order_number
    );
    
    -- تحضير القيم النهائية
    v_step := 'prepare_values';
    v_final_subtotal := COALESCE(p_subtotal, p_total_amount - p_discount);
    v_final_amount_paid := COALESCE(p_amount_paid, p_total_amount);
    
    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'values_prepared',
        'final_subtotal', v_final_subtotal,
        'final_amount_paid', v_final_amount_paid
    );
    
    -- إنشاء الطلب الأساسي
    v_step := 'insert_order';
    BEGIN
        INSERT INTO orders (
            id, organization_id, employee_id, customer_id, subtotal, tax, discount, total,
            status, payment_method, payment_status, notes, amount_paid, remaining_amount,
            slug, customer_order_number, is_online, pos_order_type, completed_at, created_at, updated_at
        ) VALUES (
            v_new_order_id, p_organization_id, p_employee_id, p_customer_id, v_final_subtotal, 0, p_discount, p_total_amount,
            'completed', p_payment_method, p_payment_status, p_notes, v_final_amount_paid, 
            GREATEST(0, p_total_amount - v_final_amount_paid), v_order_slug, v_customer_order_number, false, 'pos',
            CASE WHEN p_payment_status = 'paid' THEN NOW() ELSE NULL END, NOW(), NOW()
        );
        
        v_debug_info := v_debug_info || jsonb_build_object(
            'step', 'order_inserted_successfully',
            'order_id', v_new_order_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object(
            'step', 'order_insert_failed',
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في إدراج الطلب: ' || SQLERRM,
            'debug_info', v_debug_info,
            'failed_step', v_step,
            'sqlstate', SQLSTATE
        );
    END;
    
    -- معالجة العناصر
    v_step := 'process_items';
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_debug_info := v_debug_info || jsonb_build_object(
                'step', 'processing_item',
                'item', v_item,
                'product_id', v_item->>'product_id',
                'color_id_raw', v_item->>'color_id',
                'size_id_raw', v_item->>'size_id',
                'color_id_type', jsonb_typeof(v_item->'color_id'),
                'size_id_type', jsonb_typeof(v_item->'size_id')
            );
            
            IF v_item->>'product_id' IS NULL OR v_item->>'quantity' IS NULL THEN
                v_debug_info := v_debug_info || jsonb_build_object(
                    'step', 'item_skipped',
                    'reason', 'missing_product_id_or_quantity'
                );
                CONTINUE;
            END IF;
            
            -- إدراج عنصر الطلب مع تسجيل تفصيلي
            INSERT INTO order_items (
                id, order_id, product_id, product_name, name, slug, quantity, unit_price, total_price,
                color_id, color_name, size_id, size_name, variant_display_name, organization_id, created_at
            ) VALUES (
                gen_random_uuid(), 
                v_new_order_id, 
                (v_item->>'product_id')::UUID,
                COALESCE(v_item->>'product_name', 'منتج'), 
                COALESCE(v_item->>'product_name', 'منتج'),
                COALESCE(v_item->>'slug', 'product-' || (v_item->>'product_id')), 
                (v_item->>'quantity')::INTEGER,
                COALESCE((v_item->>'unit_price')::NUMERIC, 0), 
                COALESCE((v_item->>'total_price')::NUMERIC, 0),
                -- هنا المشكلة المحتملة - تحويل UUID
                CASE 
                    WHEN v_item->>'color_id' IS NULL OR v_item->>'color_id' = '' OR v_item->>'color_id' = 'null' 
                    THEN NULL 
                    ELSE (v_item->>'color_id')::UUID 
                END,
                v_item->>'color_name',
                CASE 
                    WHEN v_item->>'size_id' IS NULL OR v_item->>'size_id' = '' OR v_item->>'size_id' = 'null' 
                    THEN NULL 
                    ELSE (v_item->>'size_id')::UUID 
                END,
                v_item->>'size_name',
                CASE 
                    WHEN v_item->>'color_name' IS NOT NULL AND v_item->>'size_name' IS NOT NULL 
                    THEN v_item->>'color_name' || ' - ' || v_item->>'size_name'
                    WHEN v_item->>'color_name' IS NOT NULL 
                    THEN v_item->>'color_name'
                    WHEN v_item->>'size_name' IS NOT NULL 
                    THEN v_item->>'size_name'
                    ELSE NULL 
                END,
                p_organization_id, 
                NOW()
            );
            
            v_debug_info := v_debug_info || jsonb_build_object(
                'step', 'item_inserted_successfully',
                'product_id', v_item->>'product_id'
            );
            
        EXCEPTION WHEN OTHERS THEN
            v_debug_info := v_debug_info || jsonb_build_object(
                'step', 'item_insert_failed',
                'item', v_item,
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'product_id', v_item->>'product_id',
                'color_id_value', v_item->>'color_id',
                'size_id_value', v_item->>'size_id'
            );
            
            RETURN jsonb_build_object(
                'success', false,
                'error', 'فشل في إدراج عنصر الطلب: ' || SQLERRM,
                'debug_info', v_debug_info,
                'failed_step', v_step,
                'failed_item', v_item,
                'sqlstate', SQLSTATE
            );
        END;
    END LOOP;
    
    -- إنشاء المعاملة المالية
    v_step := 'create_transaction';
    IF p_payment_status = 'paid' THEN
        BEGIN
            INSERT INTO transactions (
                id, order_id, amount, type, payment_method, description, employee_id, organization_id, created_at
            ) VALUES (
                gen_random_uuid(), v_new_order_id, v_final_amount_paid, 'sale', p_payment_method,
                'دفع طلب نقطة البيع رقم: ' || v_customer_order_number, p_employee_id, p_organization_id, NOW()
            );
            
            v_debug_info := v_debug_info || jsonb_build_object(
                'step', 'transaction_created_successfully'
            );
            
        EXCEPTION WHEN OTHERS THEN
            v_debug_info := v_debug_info || jsonb_build_object(
                'step', 'transaction_creation_failed',
                'error', SQLERRM,
                'sqlstate', SQLSTATE
            );
            
            -- لا نفشل الطلب بسبب فشل المعاملة
        END;
    END IF;
    
    -- النتيجة النهائية
    v_result := jsonb_build_object(
        'success', true,
        'order_id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', p_payment_status,
        'total', p_total_amount,
        'items_count', v_items_count,
        'processing_time_ms', EXTRACT(epoch FROM (NOW() - v_processing_start_time)) * 1000,
        'debug_info', v_debug_info,
        'version', 'debug_v1',
        'message', 'تم إنشاء الطلب بنجاح مع معلومات debug'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object(
        'step', 'unexpected_error',
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'failed_step', v_step
    );
    
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ غير متوقع: ' || COALESCE(SQLERRM, 'خطأ غير محدد'),
        'debug_info', v_debug_info,
        'failed_step', v_step,
        'sqlstate', COALESCE(SQLSTATE, 'UNKNOWN'),
        'processing_time_ms', EXTRACT(epoch FROM (NOW() - v_processing_start_time)) * 1000
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_pos_order_debug(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء دالة debug بنجاح!';
    RAISE NOTICE '🔍 يمكن استخدام create_pos_order_debug لتتبع مصدر المشكلة';
END $$; 