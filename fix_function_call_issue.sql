-- ✅ إصلاح مشكلة استدعاء الدالة غير الموجودة
-- تاريخ التعديل: 2025-01-14

-- تحديث الدالة create_pos_order_ultra_fast_uuid_safe لاستدعاء الدالة الصحيحة
CREATE OR REPLACE FUNCTION create_pos_order_ultra_fast_uuid_safe(
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
    v_new_order_id UUID;
    v_order_slug TEXT;
    v_customer_order_number INTEGER;
    v_item JSONB;
    v_result JSONB;
    v_final_subtotal NUMERIC;
    v_final_amount_paid NUMERIC;
    v_fifo_results JSONB := '[]'::JSONB;
    v_fifo_result JSONB;
    v_total_fifo_cost NUMERIC := 0;
    v_processing_start_time TIMESTAMP := NOW();
    v_items_count INTEGER := 0;
    v_color_uuid UUID;
    v_size_uuid UUID;
BEGIN
    -- ⚡ تحسين 1: التحقق من صحة البيانات أولاً
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'p_items يجب أن يكون مصفوفة JSON صالحة',
            'debug_info', jsonb_build_object(
                'p_items_type', COALESCE(jsonb_typeof(p_items), 'null'),
                'p_items_value', COALESCE(p_items, 'null'::jsonb)
            )
        );
    END IF;
    
    v_items_count := jsonb_array_length(p_items);
    
    IF v_items_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن إنشاء طلب فارغ - يجب أن يحتوي على عنصر واحد على الأقل'
        );
    END IF;
    
    -- ⚡ تحسين 2: إنشاء معرف الطلب والبيانات الأساسية
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'POS-' || EXTRACT(epoch FROM NOW())::TEXT || '-' || SUBSTRING(v_new_order_id::TEXT FROM 1 FOR 8);
    
    -- ⚡ تحسين 3: الحصول على رقم الطلب التتابعي
    SELECT COALESCE(MAX(customer_order_number), 0) + 1
    INTO v_customer_order_number
    FROM orders 
    WHERE organization_id = p_organization_id 
    AND is_online = false;
    
    -- تحضير القيم النهائية
    v_final_subtotal := COALESCE(p_subtotal, p_total_amount - p_discount);
    v_final_amount_paid := COALESCE(p_amount_paid, p_total_amount);
    
    -- ⚡ تحسين 4: إنشاء الطلب الأساسي
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
    
    -- ⚡ تحسين 5: معالجة العناصر مع حماية UUID شاملة
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF v_item->>'product_id' IS NULL OR v_item->>'quantity' IS NULL THEN
            CONTINUE;
        END IF;
        
        -- ✅ تحويل آمن جداً لـ UUID باستخدام الدالة المساعدة
        v_color_uuid := safe_uuid_convert(v_item->>'color_id');
        v_size_uuid := safe_uuid_convert(v_item->>'size_id');
        
        -- ✅ استدعاء الدالة الصحيحة الموجودة في قاعدة البيانات
        BEGIN
            SELECT process_pos_sale_with_variants_fifo_optimized(
                (v_item->>'product_id')::UUID,
                (v_item->>'quantity')::INTEGER,
                p_organization_id,
                v_color_uuid,
                v_size_uuid,
                v_new_order_id
            ) INTO v_fifo_result;
            
            IF v_fifo_result IS NOT NULL AND COALESCE(v_fifo_result->>'success', 'false') = 'true' THEN
                -- إضافة للتكلفة الإجمالية
                v_total_fifo_cost := v_total_fifo_cost + COALESCE((v_fifo_result->>'total_cost')::NUMERIC, 0);
                
                v_fifo_results := v_fifo_results || jsonb_build_object(
                    'product_id', v_item->>'product_id',
                    'quantity', v_item->>'quantity',
                    'fifo_cost', COALESCE(v_fifo_result->>'total_cost', '0'),
                    'average_cost', COALESCE(v_fifo_result->>'average_cost_per_unit', '0'),
                    'success', true
                );
            ELSE
                -- FIFO فشل، استخدام fallback
                UPDATE products 
                SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
                    updated_at = NOW(),
                    last_inventory_update = NOW()
                WHERE id = (v_item->>'product_id')::UUID;
                
                v_fifo_results := v_fifo_results || jsonb_build_object(
                    'product_id', v_item->>'product_id',
                    'quantity', v_item->>'quantity',
                    'fallback_used', true,
                    'error', COALESCE(v_fifo_result->>'error', 'FIFO فشل')
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- fallback كامل
            UPDATE products 
            SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
                updated_at = NOW(),
                last_inventory_update = NOW()
            WHERE id = (v_item->>'product_id')::UUID;
            
            v_fifo_results := v_fifo_results || jsonb_build_object(
                'product_id', v_item->>'product_id',
                'quantity', v_item->>'quantity',
                'fallback_used', true,
                'error', 'FIFO exception: ' || SQLERRM
            );
        END;
        
        -- ⚡ إدراج عنصر الطلب مع UUID آمن
        INSERT INTO order_items (
            id, order_id, product_id, product_name, name, slug, quantity, unit_price, total_price,
            color_id, color_name, size_id, size_name, variant_display_name, organization_id, created_at
        ) VALUES (
            gen_random_uuid(), v_new_order_id, (v_item->>'product_id')::UUID,
            COALESCE(v_item->>'product_name', 'منتج'), COALESCE(v_item->>'product_name', 'منتج'),
            COALESCE(v_item->>'slug', 'product-' || (v_item->>'product_id')), (v_item->>'quantity')::INTEGER,
            COALESCE((v_item->>'unit_price')::NUMERIC, 0), COALESCE((v_item->>'total_price')::NUMERIC, 0),
            v_color_uuid, v_item->>'color_name', v_size_uuid, v_item->>'size_name',
            CASE 
                WHEN v_item->>'color_name' IS NOT NULL AND v_item->>'size_name' IS NOT NULL 
                THEN v_item->>'color_name' || ' - ' || v_item->>'size_name'
                WHEN v_item->>'color_name' IS NOT NULL 
                THEN v_item->>'color_name'
                WHEN v_item->>'size_name' IS NOT NULL 
                THEN v_item->>'size_name'
                ELSE NULL 
            END,
            p_organization_id, NOW()
        );
    END LOOP;
    
    -- ⚡ تحسين 6: إنشاء المعاملة المالية
    IF p_payment_status = 'paid' THEN
        INSERT INTO transactions (
            id, order_id, amount, type, payment_method, description, employee_id, organization_id, created_at
        ) VALUES (
            gen_random_uuid(), v_new_order_id, v_final_amount_paid, 'sale', p_payment_method,
            'دفع طلب نقطة البيع رقم: ' || v_customer_order_number, p_employee_id, p_organization_id, NOW()
        );
    END IF;
    
    -- ⚡ إعداد النتيجة النهائية
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
        'fifo_results', COALESCE(v_fifo_results, '[]'::jsonb),
        'total_fifo_cost', v_total_fifo_cost,
        'uuid_safe_enabled', true,
        'function_call_fixed', true,
        'version', 'uuid_safe_v2_fixed',
        'created_at', NOW(),
        'updated_at', NOW(),
        'message', 'تم إنشاء الطلب بنجاح مع إصلاح استدعاء الدالة'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في إنشاء الطلب: ' || COALESCE(SQLERRM, 'خطأ غير محدد'),
        'error_code', COALESCE(SQLSTATE, 'UNKNOWN'),
        'processing_time_ms', EXTRACT(epoch FROM (NOW() - v_processing_start_time)) * 1000,
        'order_id', COALESCE(v_new_order_id, gen_random_uuid()),
        'version', 'uuid_safe_v2_fixed',
        'function_call_fixed', true,
        'debug_info', jsonb_build_object(
            'items_count', COALESCE(v_items_count, 0),
            'organization_id', COALESCE(p_organization_id, 'null'),
            'employee_id', COALESCE(p_employee_id, 'null'),
            'p_items_type', COALESCE(jsonb_typeof(p_items), 'null'),
            'p_items_sample', COALESCE(p_items, 'null'::jsonb)
        )
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_pos_order_ultra_fast_uuid_safe(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح الدالة create_pos_order_ultra_fast_uuid_safe بنجاح!';
    RAISE NOTICE '🔧 تم تصحيح استدعاء الدالة process_pos_sale_with_variants_fifo_optimized';
    RAISE NOTICE '🚀 يمكن الآن استخدام الدالة بدون مشاكل';
END $$; 