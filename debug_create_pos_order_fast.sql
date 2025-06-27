-- نسخة محسنة من create_pos_order_fast مع تفاصيل debugging
-- لتتبع مشكلة "column users.name must appear in the GROUP BY clause"

CREATE OR REPLACE FUNCTION create_pos_order_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items JSON,
    p_total_amount DECIMAL,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_id UUID;
    v_order_slug VARCHAR;
    v_customer_order_number INTEGER;
    v_item JSON;
    v_result JSON;
    v_step TEXT := 'بدء الدالة';
BEGIN
    RAISE NOTICE '🚀 [DEBUG] بدء create_pos_order_fast - Organization: %, Employee: %', p_organization_id, p_employee_id;
    
    -- الخطوة 1: توليد معرف فريد
    v_step := 'توليد المعرفات';
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;
    
    RAISE NOTICE '📝 [DEBUG] تم توليد - Order ID: %, Slug: %', v_new_order_id, v_order_slug;

    -- الخطوة 2: الحصول على رقم طلبية العميل التالي
    v_step := 'الحصول على رقم العميل';
    SELECT COALESCE(MAX(customer_order_number), 0) + 1 
    INTO v_customer_order_number 
    FROM orders 
    WHERE organization_id = p_organization_id;
    
    RAISE NOTICE '🔢 [DEBUG] رقم العميل: %', v_customer_order_number;

    -- الخطوة 3: إنشاء الطلبية الرئيسية
    v_step := 'إنشاء الطلبية الرئيسية';
    RAISE NOTICE '📋 [DEBUG] إنشاء الطلبية الرئيسية...';
    
    INSERT INTO orders (
        id,
        organization_id,
        customer_id,
        employee_id,
        slug,
        customer_order_number,
        status,
        payment_status,
        payment_method,
        total,
        subtotal,
        tax,
        discount,
        amount_paid,
        pos_order_type,
        notes,
        is_online,
        created_at,
        updated_at,
        completed_at
    ) VALUES (
        v_new_order_id,
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        v_customer_order_number,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        p_total_amount,
        0,
        0,
        CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
        'pos',
        p_notes,
        false,
        NOW(),
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ [DEBUG] تم إنشاء الطلبية الرئيسية بنجاح';

    -- الخطوة 4: إضافة عناصر الطلبية
    v_step := 'إضافة عناصر الطلبية';
    RAISE NOTICE '📦 [DEBUG] بدء إضافة العناصر - نوع البيانات: %', json_typeof(p_items::json);
    
    IF json_typeof(p_items::json) = 'array' THEN
        RAISE NOTICE '📦 [DEBUG] عدد العناصر: %', json_array_length(p_items::json);
        
        FOR v_item IN SELECT * FROM json_array_elements(p_items::json)
        LOOP
            RAISE NOTICE '🔧 [DEBUG] معالجة عنصر: %', v_item;
            
            INSERT INTO order_items (
                id,
                order_id,
                product_id,
                product_name,
                name,
                quantity,
                unit_price,
                total_price,
                organization_id,
                slug,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_new_order_id,
                (v_item->>'product_id')::UUID,
                COALESCE(v_item->>'name', 'منتج'),
                COALESCE(v_item->>'name', 'منتج'),
                (v_item->>'quantity')::INTEGER,
                (v_item->>'price')::DECIMAL,
                (v_item->>'total')::DECIMAL,
                p_organization_id,
                'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INTEGER,
                NOW()
            );
            
            RAISE NOTICE '✅ [DEBUG] تم إضافة عنصر بنجاح';
        END LOOP;
    END IF;
    
    RAISE NOTICE '📦 [DEBUG] تم إنشاء جميع العناصر بنجاح';

    -- الخطوة 5: إنشاء الاستجابة
    v_step := 'إنشاء الاستجابة';
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', p_payment_status,
        'total', p_total_amount,
        'items_count', CASE 
            WHEN json_typeof(p_items::json) = 'array' THEN json_array_length(p_items::json) 
            ELSE 1 
        END,
        'created_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح'
    ) INTO v_result;
    
    RAISE NOTICE '🎉 [DEBUG] تم إنشاء الطلب بنجاح - Result: %', v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ [DEBUG] خطأ في الخطوة: % - الخطأ: %', v_step, SQLERRM;
    RAISE NOTICE '❌ [DEBUG] تفاصيل الخطأ: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'step', v_step,
        'message', 'فشل في إنشاء الطلب: ' || SQLERRM || ' في الخطوة: ' || v_step
    );
END;
$$;

-- تعليق
COMMENT ON FUNCTION create_pos_order_fast IS 'نسخة محسنة مع debugging لتتبع مشكلة GROUP BY';

-- إنشاء دالة مساعدة لتسجيل العمليات
CREATE OR REPLACE FUNCTION log_pos_debug(message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE '[POS-DEBUG] %: %', NOW(), message;
END;
$$; 