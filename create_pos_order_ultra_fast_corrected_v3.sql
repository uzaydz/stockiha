-- ✅ دالة محسنة جداً لإنشاء طلبيات نقطة البيع بسرعة فائقة (مُصححة v3)
-- تاريخ الإنشاء: 2025-01-14
-- الهدف: حل مشكلة NULL في JSON نهائياً مع الحفاظ على FIFO
-- ✅ تم إصلاح جميع مشاكل NULL والتعامل الآمن مع JSONB

CREATE OR REPLACE FUNCTION create_pos_order_ultra_fast_with_fifo_corrected(
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
    v_safe_fifo_cost TEXT := '0';
    v_safe_avg_cost TEXT := '0';
    v_safe_error_msg TEXT := '';
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
    
    -- حساب عدد العناصر بشكل آمن
    v_items_count := jsonb_array_length(p_items);
    
    IF v_items_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن إنشاء طلب فارغ - يجب أن يحتوي على عنصر واحد على الأقل'
        );
    END IF;
    
    -- ⚡ تحسين 2: إنشاء معرف الطلب والبيانات الأساسية مرة واحدة
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'POS-' || EXTRACT(epoch FROM NOW())::TEXT || '-' || SUBSTRING(v_new_order_id::TEXT FROM 1 FOR 8);
    
    -- ⚡ تحسين 3: الحصول على رقم الطلب التتابعي بكفاءة
    SELECT COALESCE(MAX(customer_order_number), 0) + 1
    INTO v_customer_order_number
    FROM orders 
    WHERE organization_id = p_organization_id 
    AND is_online = false; -- طلبيات نقطة البيع فقط
    
    -- تحضير القيم النهائية
    v_final_subtotal := COALESCE(p_subtotal, p_total_amount - p_discount);
    v_final_amount_paid := COALESCE(p_amount_paid, p_total_amount);
    
    -- ⚡ تحسين 4: إنشاء الطلب الأساسي أولاً
    INSERT INTO orders (
        id,
        organization_id,
        employee_id,
        customer_id,
        subtotal,
        tax,
        discount,
        total,
        status,
        payment_method,
        payment_status,
        notes,
        amount_paid,
        remaining_amount,
        slug,
        customer_order_number,
        is_online,
        pos_order_type,
        completed_at,
        created_at,
        updated_at
    ) VALUES (
        v_new_order_id,
        p_organization_id,
        p_employee_id,
        p_customer_id,
        v_final_subtotal,
        0,
        p_discount,
        p_total_amount,
        'completed',
        p_payment_method,
        p_payment_status,
        p_notes,
        v_final_amount_paid,
        GREATEST(0, p_total_amount - v_final_amount_paid),
        v_order_slug,
        v_customer_order_number,
        false,
        'pos',
        CASE WHEN p_payment_status = 'paid' THEN NOW() ELSE NULL END,
        NOW(),
        NOW()
    );
    
    -- ⚡ تحسين 5: معالجة المخزون والعناصر مع حماية شاملة من NULL
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- التحقق من وجود البيانات المطلوبة
        IF v_item->>'product_id' IS NULL OR v_item->>'quantity' IS NULL THEN
            CONTINUE;
        END IF;
        
        -- ✅ تصفير القيم الآمنة قبل كل عنصر
        v_safe_fifo_cost := '0';
        v_safe_avg_cost := '0';
        v_safe_error_msg := '';
        
                 -- ✅ تحويل آمن لـ UUID مع حماية من NULL
         v_color_uuid := NULL;
         v_size_uuid := NULL;
         
         BEGIN
             -- تحويل color_id بشكل آمن
             IF v_item->>'color_id' IS NOT NULL AND v_item->>'color_id' != '' AND v_item->>'color_id' != 'null' THEN
                 v_color_uuid := (v_item->>'color_id')::UUID;
             END IF;
             
             -- تحويل size_id بشكل آمن
             IF v_item->>'size_id' IS NOT NULL AND v_item->>'size_id' != '' AND v_item->>'size_id' != 'null' THEN
                 v_size_uuid := (v_item->>'size_id')::UUID;
             END IF;
         EXCEPTION WHEN OTHERS THEN
             -- في حالة فشل التحويل، استخدم NULL
             v_color_uuid := NULL;
             v_size_uuid := NULL;
         END;
         
         -- ✅ محاولة FIFO مع حماية شاملة من NULL
         BEGIN
             
             SELECT process_pos_sale_with_variants_fifo_optimized(
                 (v_item->>'product_id')::UUID,
                 (v_item->>'quantity')::INTEGER,
                 p_organization_id,
                 v_color_uuid,
                 v_size_uuid,
                 v_new_order_id
             ) INTO v_fifo_result;
            
            -- ✅ تحويل آمن للقيم مع حماية شاملة من NULL
            IF v_fifo_result IS NOT NULL THEN
                -- استخراج القيم بشكل آمن
                v_safe_fifo_cost := COALESCE(v_fifo_result->>'total_cost', '0');
                v_safe_avg_cost := COALESCE(v_fifo_result->>'average_cost_per_unit', '0');
                
                -- التحقق من أن القيم ليست NULL أو فارغة
                IF v_safe_fifo_cost IS NULL OR v_safe_fifo_cost = '' OR v_safe_fifo_cost = 'null' THEN
                    v_safe_fifo_cost := '0';
                END IF;
                
                IF v_safe_avg_cost IS NULL OR v_safe_avg_cost = '' OR v_safe_avg_cost = 'null' THEN
                    v_safe_avg_cost := '0';
                END IF;
                
                -- فحص حالة النجاح
                IF COALESCE(v_fifo_result->>'success', 'false') = 'true' THEN
                    -- إضافة للتكلفة الإجمالية
                    BEGIN
                        v_total_fifo_cost := v_total_fifo_cost + v_safe_fifo_cost::NUMERIC;
                    EXCEPTION WHEN OTHERS THEN
                        v_total_fifo_cost := v_total_fifo_cost + 0;
                    END;
                    
                    -- إضافة نتيجة ناجحة
                    v_fifo_results := v_fifo_results || jsonb_build_object(
                        'product_id', v_item->>'product_id',
                        'quantity', v_item->>'quantity',
                        'fifo_cost', v_safe_fifo_cost,
                        'average_cost', v_safe_avg_cost,
                        'success', true
                    );
                ELSE
                    -- FIFO فشل، استخدم fallback
                    v_safe_error_msg := COALESCE(v_fifo_result->>'error', 'FIFO فشل');
                    
                    UPDATE products 
                    SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
                        updated_at = NOW(),
                        last_inventory_update = NOW()
                    WHERE id = (v_item->>'product_id')::UUID;
                    
                    v_fifo_results := v_fifo_results || jsonb_build_object(
                        'product_id', v_item->>'product_id',
                        'quantity', v_item->>'quantity',
                        'fallback_used', true,
                        'error', v_safe_error_msg
                    );
                END IF;
            ELSE
                -- v_fifo_result is NULL
                UPDATE products 
                SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
                    updated_at = NOW(),
                    last_inventory_update = NOW()
                WHERE id = (v_item->>'product_id')::UUID;
                
                v_fifo_results := v_fifo_results || jsonb_build_object(
                    'product_id', v_item->>'product_id',
                    'quantity', v_item->>'quantity',
                    'fallback_used', true,
                    'error', 'FIFO result is NULL'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- في حالة فشل FIFO تماماً
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
        
                 -- ⚡ إدراج عنصر الطلب مع استخدام المتغيرات الآمنة
         INSERT INTO order_items (
             id,
             order_id,
             product_id,
             product_name,
             name,
             slug,
             quantity,
             unit_price,
             total_price,
             color_id,
             color_name,
             size_id,
             size_name,
             variant_display_name,
             organization_id,
             created_at
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
             v_color_uuid,
             v_item->>'color_name',
             v_size_uuid,
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
    END LOOP;
    
    -- ⚡ تحسين 6: إنشاء المعاملة المالية (اختياري)
    IF p_payment_status = 'paid' THEN
        INSERT INTO transactions (
            id,
            order_id,
            amount,
            type,
            payment_method,
            description,
            employee_id,
            organization_id,
            created_at
        ) VALUES (
            gen_random_uuid(),
            v_new_order_id,
            v_final_amount_paid,
            'sale',
            p_payment_method,
            'دفع طلب نقطة البيع رقم: ' || v_customer_order_number,
            p_employee_id,
            p_organization_id,
            NOW()
        );
    END IF;
    
    -- ⚡ إعداد النتيجة النهائية مع حماية شاملة من NULL
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
        'null_protection_enabled', true,
        'version', 'v3',
        'created_at', NOW(),
        'updated_at', NOW(),
        'message', 'تم إنشاء الطلب بنجاح مع حماية شاملة من NULL - v3'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- معالجة شاملة للأخطاء مع حماية من NULL
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في إنشاء الطلب: ' || COALESCE(SQLERRM, 'خطأ غير محدد'),
        'error_code', COALESCE(SQLSTATE, 'UNKNOWN'),
        'processing_time_ms', EXTRACT(epoch FROM (NOW() - v_processing_start_time)) * 1000,
        'order_id', COALESCE(v_new_order_id, gen_random_uuid()),
        'version', 'v3',
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

-- إنشاء الفهارس المحسنة (إذا لم تكن موجودة)
CREATE INDEX IF NOT EXISTS idx_orders_pos_performance_v3
ON orders (organization_id, is_online, customer_order_number, created_at)
WHERE is_online = false;

CREATE INDEX IF NOT EXISTS idx_order_items_performance_v3
ON order_items (order_id, product_id, organization_id, created_at);

-- تعليق
COMMENT ON FUNCTION create_pos_order_ultra_fast_with_fifo_corrected IS 
'دالة محسنة لإنشاء طلبيات نقطة البيع بسرعة فائقة مع حماية شاملة من NULL - الإصدار v3'; 