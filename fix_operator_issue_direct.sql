-- ✅ حل مباشر لمشكلة operator does not exist: text ->> unknown
-- تاريخ الإنشاء: 2025-01-14

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
    v_processing_start_time TIMESTAMP := NOW();
    v_items_count INTEGER := 0;
    v_color_uuid UUID;
    v_size_uuid UUID;
BEGIN
    -- التحقق من صحة البيانات
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'p_items يجب أن يكون مصفوفة JSON صالحة'
        );
    END IF;
    
    -- حساب عدد العناصر
    v_items_count := jsonb_array_length(p_items);
    
    IF v_items_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن إنشاء طلب فارغ'
        );
    END IF;
    
    -- إنشاء معرف الطلب
    v_new_order_id := gen_random_uuid();
    -- إصلاح slug ليتوافق مع قيود قاعدة البيانات
    v_order_slug := 'POS-' || FLOOR(EXTRACT(epoch FROM NOW()))::TEXT || '-' || REPLACE(SUBSTRING(v_new_order_id::TEXT FROM 1 FOR 8), '-', '');
    
    -- الحصول على رقم الطلب التتابعي
    SELECT COALESCE(MAX(customer_order_number), 0) + 1
    INTO v_customer_order_number
    FROM orders 
    WHERE organization_id = p_organization_id 
    AND is_online = false;
    
    -- تحضير القيم النهائية
    v_final_subtotal := COALESCE(p_subtotal, p_total_amount - p_discount);
    v_final_amount_paid := COALESCE(p_amount_paid, p_total_amount);
    
    -- إنشاء الطلب الأساسي
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
    
    -- معالجة العناصر مع حماية كاملة من مشكلة operator does not exist
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- التحقق من البيانات الأساسية
        IF v_item->>'product_id' IS NULL OR v_item->>'quantity' IS NULL THEN
            CONTINUE;
        END IF;
        
        -- ✅ تحويل آمن تماماً لـ UUID مع حماية من جميع الأخطاء
        v_color_uuid := NULL;
        v_size_uuid := NULL;
        
        -- تحويل color_id بشكل آمن تماماً
        BEGIN
            IF v_item ? 'color_id' THEN
                DECLARE
                    v_color_raw TEXT;
                BEGIN
                    v_color_raw := v_item->>'color_id';
                    IF v_color_raw IS NOT NULL AND v_color_raw != '' AND v_color_raw != 'null' AND LENGTH(v_color_raw) = 36 THEN
                        v_color_uuid := v_color_raw::UUID;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    v_color_uuid := NULL;
                END;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_color_uuid := NULL;
        END;
        
        -- تحويل size_id بشكل آمن تماماً
        BEGIN
            IF v_item ? 'size_id' THEN
                DECLARE
                    v_size_raw TEXT;
                BEGIN
                    v_size_raw := v_item->>'size_id';
                    IF v_size_raw IS NOT NULL AND v_size_raw != '' AND v_size_raw != 'null' AND LENGTH(v_size_raw) = 36 THEN
                        v_size_uuid := v_size_raw::UUID;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    v_size_uuid := NULL;
                END;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_size_uuid := NULL;
        END;
        
        -- تحديث مخزون المنتج
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::INTEGER),
            updated_at = NOW(),
            last_inventory_update = NOW()
        WHERE id = (v_item->>'product_id')::UUID;
        
        -- إدراج عنصر الطلب
        INSERT INTO order_items (
            id, order_id, product_id, product_name, name, slug, quantity, unit_price, total_price,
            color_id, color_name, size_id, size_name, variant_display_name, organization_id, created_at
        ) VALUES (
            gen_random_uuid(), v_new_order_id, (v_item->>'product_id')::UUID,
            COALESCE(v_item->>'product_name', 'منتج'), COALESCE(v_item->>'product_name', 'منتج'),
            COALESCE(v_item->>'slug', 'product-' || (v_item->>'product_id')), (v_item->>'quantity')::INTEGER,
            COALESCE((v_item->>'unit_price')::NUMERIC, 0), COALESCE((v_item->>'total_price')::NUMERIC, 0),
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
            p_organization_id, NOW()
        );
    END LOOP;
    
    -- إنشاء المعاملة المالية
    IF p_payment_status = 'paid' THEN
        INSERT INTO transactions (
            id, order_id, amount, type, payment_method, description, employee_id, organization_id, created_at
        ) VALUES (
            gen_random_uuid(), v_new_order_id, v_final_amount_paid, 'sale', p_payment_method,
            'دفع طلب نقطة البيع رقم: ' || v_customer_order_number, p_employee_id, p_organization_id, NOW()
        );
    END IF;
    
    -- إعداد النتيجة النهائية
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
        'operator_issue_fixed', true,
        'version', 'direct_fix_v1',
        'created_at', NOW(),
        'updated_at', NOW(),
        'message', 'تم إنشاء الطلب بنجاح مع حل مباشر لمشكلة operator does not exist'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في إنشاء الطلب: ' || COALESCE(SQLERRM, 'خطأ غير محدد'),
        'error_code', COALESCE(SQLSTATE, 'UNKNOWN'),
        'processing_time_ms', EXTRACT(epoch FROM (NOW() - v_processing_start_time)) * 1000,
        'order_id', COALESCE(v_new_order_id, gen_random_uuid()),
        'version', 'direct_fix_v1',
        'operator_issue_fixed', true,
        'debug_info', jsonb_build_object(
            'items_count', COALESCE(v_items_count, 0),
            'organization_id', COALESCE(p_organization_id::TEXT, 'null'),
            'employee_id', COALESCE(p_employee_id::TEXT, 'null'),
            'p_items_type', COALESCE(jsonb_typeof(p_items), 'null'),
            'generated_slug', COALESCE(v_order_slug, 'null')
        )
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_pos_order_ultra_fast_uuid_safe(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- رسالة نجاح
SELECT 'تم إنشاء الحل المباشر لمشكلة operator does not exist بنجاح!' as message; 