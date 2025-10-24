-- =====================================================
-- إضافة تتبع الموظف الفعلي للطلبيات
-- =====================================================
-- يضيف حقل created_by_staff_id لتتبع الموظف من pos_staff_sessions
-- مع الاحتفاظ بـ employee_id للمدير (صاحب الحساب)

-- 1. إضافة الحقل الجديد
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES pos_staff_sessions(id) ON DELETE SET NULL;

-- 2. إضافة حقل لاسم الموظف (للسرعة)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by_staff_name VARCHAR(255);

-- 3. إنشاء Index للأداء
CREATE INDEX IF NOT EXISTS idx_orders_created_by_staff ON orders(created_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_date ON orders(created_by_staff_id, created_at DESC);

-- 4. تحديث الطلبيات الموجودة (اختياري - فقط إذا كان هناك بيانات)
-- هذا سيضع NULL للطلبيات القديمة، وهو مقبول
-- لأننا نريد فقط تتبع الطلبيات الجديدة

-- 5. تحديث RPC function: create_pos_order_fast
CREATE OR REPLACE FUNCTION create_pos_order_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items TEXT,
    p_total_amount DECIMAL,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_subtotal DECIMAL DEFAULT NULL,
    p_discount DECIMAL DEFAULT 0,
    p_tax DECIMAL DEFAULT 0,
    p_amount_paid DECIMAL DEFAULT NULL,
    p_remaining_amount DECIMAL DEFAULT 0,
    p_consider_remaining_as_partial BOOLEAN DEFAULT FALSE,
    p_notes TEXT DEFAULT '',
    p_subscription_account_info JSONB DEFAULT NULL,
    p_created_by_staff_id UUID DEFAULT NULL,  -- جديد
    p_created_by_staff_name TEXT DEFAULT NULL  -- جديد
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_order_slug TEXT;
    v_customer_order_number INT;
    v_items_array JSONB;
    v_item JSONB;
    v_cust_id UUID;
    v_guest_id UUID;
    v_org_id UUID;
    v_remaining DECIMAL := 0;
    v_pay_status TEXT := 'paid';
    v_tx_id UUID;
    v_employee_id UUID;
    v_debug_info TEXT := '';
BEGIN
    -- تحديد العميل (زائر افتراضيًا إن لم يُرسل)
    SELECT id INTO v_guest_id FROM customers WHERE name = 'زائر' AND organization_id = p_organization_id LIMIT 1;
    v_cust_id := COALESCE(p_customer_id, v_guest_id);

    -- محاولة مطابقة employee_id مع جدول users
    v_employee_id := NULL;
    IF p_employee_id IS NOT NULL THEN
        SELECT id INTO v_employee_id FROM users WHERE id = p_employee_id LIMIT 1;
        IF v_employee_id IS NULL THEN
            SELECT id INTO v_employee_id FROM users WHERE auth_user_id = p_employee_id LIMIT 1;
        END IF;
    END IF;

    -- تحديد حالة الدفع
    IF p_consider_remaining_as_partial AND p_remaining_amount > 0 THEN
        v_pay_status := 'partial';
        v_remaining := p_remaining_amount;
    ELSIF p_payment_status IS NOT NULL THEN
        v_pay_status := p_payment_status;
    END IF;

    -- توليد slug ورقم الطلبية
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT;
    
    SELECT COALESCE(MAX(customer_order_number), 0) + 1 
    INTO v_customer_order_number 
    FROM orders 
    WHERE organization_id = p_organization_id;

    -- إنشاء الطلبية مع الحقول الجديدة
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        created_by_staff_id,        -- جديد
        created_by_staff_name,       -- جديد
        slug,
        status,
        payment_status,
        payment_method,
        subtotal,
        tax,
        discount,
        total,
        notes,
        is_online,
        pos_order_type,
        customer_order_number,
        amount_paid,
        remaining_amount,
        consider_remaining_as_partial,
        completed_at,
        created_at,
        updated_at,
        metadata
    ) VALUES (
        p_organization_id,
        v_cust_id,
        v_employee_id,
        p_created_by_staff_id,       -- جديد
        p_created_by_staff_name,     -- جديد
        v_order_slug,
        'completed',
        v_pay_status,
        COALESCE(p_payment_method, 'cash'),
        COALESCE(p_subtotal, p_total_amount),
        COALESCE(p_tax, 0),
        COALESCE(p_discount, 0),
        p_total_amount,
        COALESCE(p_notes, ''),
        FALSE,
        'pos',
        v_customer_order_number,
        COALESCE(p_amount_paid, p_total_amount),
        v_remaining,
        p_consider_remaining_as_partial,
        NOW(),
        NOW(),
        NOW(),
        CASE 
            WHEN p_subscription_account_info IS NOT NULL 
            THEN jsonb_build_object('subscriptionAccountInfo', p_subscription_account_info)
            ELSE NULL 
        END
    )
    RETURNING id INTO v_order_id;

    -- تحويل النص إلى JSONB
    BEGIN
        v_items_array := p_items::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'فشل في تحليل عناصر الطلبية: ' || SQLERRM
        );
    END;

    -- إدراج عناصر الطلبية
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_array)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            original_price,
            is_wholesale,
            variant_info,
            color_id,
            size_id,
            color_name,
            size_name,
            variant_display_name,
            created_at
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INT,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'original_price')::DECIMAL, (v_item->>'unit_price')::DECIMAL),
            COALESCE((v_item->>'is_wholesale')::BOOLEAN, FALSE),
            COALESCE(v_item->'variant_info', '{}'::JSONB),
            v_item->>'color_id',
            v_item->>'size_id',
            v_item->>'color_name',
            v_item->>'size_name',
            v_item->>'variant_display_name',
            NOW()
        );
    END LOOP;

    -- إنشاء معاملة مالية
    IF p_total_amount > 0 THEN
        INSERT INTO financial_transactions (
            type,
            payment_method,
            description,
            employee_id,
            organization_id,
            created_at
        ) VALUES (
            'sale',
            COALESCE(p_payment_method, 'cash'),
            CASE WHEN v_pay_status = 'partial' THEN 'Partial payment for POS order' ELSE 'Payment for POS order' END,
            p_employee_id,
            p_organization_id,
            NOW()
        ) RETURNING id INTO v_tx_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'orderId', v_order_id,
        'customerOrderNumber', v_customer_order_number,
        'message', 'تم إنشاء الطلبية بنجاح'
    );
END;
$$;

-- 6. تحديث RPC function: create_pos_order_optimized
CREATE OR REPLACE FUNCTION create_pos_order_optimized(
    p_organization_id UUID,
    p_customer_id UUID,
    p_employee_id UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_total_amount DECIMAL,
    p_subtotal DECIMAL DEFAULT NULL,
    p_discount DECIMAL DEFAULT 0,
    p_tax DECIMAL DEFAULT 0,
    p_amount_paid DECIMAL DEFAULT NULL,
    p_remaining_amount DECIMAL DEFAULT 0,
    p_consider_remaining_as_partial BOOLEAN DEFAULT FALSE,
    p_notes TEXT DEFAULT '',
    p_subscription_account_info JSONB DEFAULT NULL,
    p_created_by_staff_id UUID DEFAULT NULL,  -- جديد
    p_created_by_staff_name TEXT DEFAULT NULL  -- جديد
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_order_slug TEXT;
    v_customer_order_number INT;
    v_item JSONB;
    v_pay_status TEXT;
    v_remaining DECIMAL := 0;
BEGIN
    -- تحديد حالة الدفع
    IF p_consider_remaining_as_partial AND p_remaining_amount > 0 THEN
        v_pay_status := 'partial';
        v_remaining := p_remaining_amount;
    ELSE
        v_pay_status := p_payment_status;
    END IF;

    -- توليد slug ورقم الطلبية
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT;
    
    SELECT COALESCE(MAX(customer_order_number), 0) + 1 
    INTO v_customer_order_number 
    FROM orders 
    WHERE organization_id = p_organization_id;

    -- إنشاء الطلبية
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        created_by_staff_id,        -- جديد
        created_by_staff_name,       -- جديد
        slug,
        status,
        payment_status,
        payment_method,
        subtotal,
        tax,
        discount,
        total,
        notes,
        is_online,
        pos_order_type,
        customer_order_number,
        amount_paid,
        remaining_amount,
        consider_remaining_as_partial,
        completed_at,
        created_at,
        updated_at,
        metadata
    ) VALUES (
        p_organization_id,
        p_customer_id,
        p_employee_id,
        p_created_by_staff_id,       -- جديد
        p_created_by_staff_name,     -- جديد
        v_order_slug,
        'completed',
        v_pay_status,
        p_payment_method,
        COALESCE(p_subtotal, p_total_amount),
        COALESCE(p_tax, 0),
        p_discount,
        p_total_amount,
        COALESCE(p_notes, ''),
        FALSE,
        'pos',
        v_customer_order_number,
        COALESCE(p_amount_paid, p_total_amount),
        v_remaining,
        p_consider_remaining_as_partial,
        NOW(),
        NOW(),
        NOW(),
        CASE 
            WHEN p_subscription_account_info IS NOT NULL 
            THEN jsonb_build_object('subscriptionAccountInfo', p_subscription_account_info)
            ELSE NULL 
        END
    )
    RETURNING id INTO v_order_id;

    -- إدراج عناصر الطلبية
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            original_price,
            is_wholesale,
            variant_info,
            color_id,
            size_id,
            color_name,
            size_name,
            variant_display_name,
            created_at
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INT,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'original_price')::DECIMAL, (v_item->>'unit_price')::DECIMAL),
            COALESCE((v_item->>'is_wholesale')::BOOLEAN, FALSE),
            COALESCE(v_item->'variant_info', '{}'::JSONB),
            v_item->>'color_id',
            v_item->>'size_id',
            v_item->>'color_name',
            v_item->>'size_name',
            v_item->>'variant_display_name',
            NOW()
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'orderId', v_order_id,
        'customerOrderNumber', v_customer_order_number,
        'message', 'تم إنشاء الطلبية بنجاح'
    );
END;
$$;

-- 7. Comments
COMMENT ON COLUMN orders.created_by_staff_id IS 'معرف الموظف الفعلي من pos_staff_sessions الذي أنشأ الطلبية';
COMMENT ON COLUMN orders.created_by_staff_name IS 'اسم الموظف الفعلي (نسخة للسرعة)';

-- 8. منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_pos_order_fast TO authenticated;
GRANT EXECUTE ON FUNCTION create_pos_order_optimized TO authenticated;
