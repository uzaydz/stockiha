-- دالة محسنة لإنشاء طلبات POS بسرعة فائقة
-- تحل مشاكل الأداء ومشكلة GROUP BY
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
    v_product_data RECORD;
    v_items_data JSON[];
    v_product_ids UUID[];
    v_products_cache JSON;
BEGIN
    -- توليد slug فريد للطلبية
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;

    -- جمع معرفات المنتجات (مع التحقق من نوع البيانات)
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(DISTINCT (item->>'product_id')::UUID)
        INTO v_product_ids
        FROM json_array_elements(p_items::json) AS item;
    ELSE
        -- إذا كانت البيانات ليست array، تحويلها إلى array
        SELECT ARRAY_AGG(DISTINCT (p_items::json->>'product_id')::UUID)
        INTO v_product_ids
        WHERE p_items::json->>'product_id' IS NOT NULL;
    END IF;

    -- جلب بيانات المنتجات مرة واحدة فقط
    SELECT json_object_agg(
        id::text, 
        json_build_object(
            'id', id,
            'name', COALESCE(name, 'منتج'),
            'price', price,
            'stock_quantity', stock_quantity
        )
    )
    INTO v_products_cache
    FROM products 
    WHERE id = ANY(v_product_ids) 
      AND organization_id = p_organization_id;

    -- إنشاء الطلبية الرئيسية
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        slug,
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
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
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
    ) RETURNING id, customer_order_number INTO v_new_order_id, v_customer_order_number;

    -- تحضير بيانات العناصر للإدراج المجمع (مع التحقق من نوع البيانات)
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(
            json_build_object(
                'order_id', v_new_order_id,
                'product_id', (item->>'product_id')::UUID,
                'product_name', COALESCE(
                    (v_products_cache->(item->>'product_id'))->>'name',
                    'منتج'
                ),
                'name', COALESCE(
                    (v_products_cache->(item->>'product_id'))->>'name',
                    'منتج'
                ),
                'quantity', (item->>'quantity')::INTEGER,
                'unit_price', (item->>'price')::DECIMAL,
                'total_price', (item->>'total')::DECIMAL,
                'organization_id', p_organization_id,
                'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                        FLOOR(RANDOM() * 1000)::INTEGER,
                'variant_info', COALESCE(item->'variant_info', '{}'::json),
                'color_id', CASE 
                    WHEN item->>'color_id' IS NOT NULL AND item->>'color_id' != '' 
                    THEN (item->>'color_id')::UUID 
                    ELSE NULL 
                END,
                'size_id', CASE 
                    WHEN item->>'size_id' IS NOT NULL AND item->>'size_id' != '' 
                    THEN (item->>'size_id')::UUID 
                    ELSE NULL 
                END,
                'created_at', NOW()
            )
        )
        INTO v_items_data
        FROM json_array_elements(p_items::json) AS item;
    ELSE
        -- معالجة عنصر واحد فقط
        SELECT ARRAY[json_build_object(
            'order_id', v_new_order_id,
            'product_id', (p_items::json->>'product_id')::UUID,
            'product_name', COALESCE(
                (v_products_cache->(p_items::json->>'product_id'))->>'name',
                'منتج'
            ),
            'name', COALESCE(
                (v_products_cache->(p_items::json->>'product_id'))->>'name',
                'منتج'
            ),
            'quantity', (p_items::json->>'quantity')::INTEGER,
            'unit_price', (p_items::json->>'price')::DECIMAL,
            'total_price', (p_items::json->>'total')::DECIMAL,
            'organization_id', p_organization_id,
            'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER,
            'variant_info', COALESCE(p_items::json->'variant_info', '{}'::json),
            'color_id', CASE 
                WHEN p_items::json->>'color_id' IS NOT NULL AND p_items::json->>'color_id' != '' 
                THEN (p_items::json->>'color_id')::UUID 
                ELSE NULL 
            END,
            'size_id', CASE 
                WHEN p_items::json->>'size_id' IS NOT NULL AND p_items::json->>'size_id' != '' 
                THEN (p_items::json->>'size_id')::UUID 
                ELSE NULL 
            END,
            'created_at', NOW()
        )]
        INTO v_items_data;
    END IF;

    -- إدراج جميع عناصر الطلبية في عملية واحدة
    INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        name,
        quantity,
        unit_price,
        total_price,
        is_digital,
        organization_id,
        slug,
        variant_info,
        color_id,
        size_id,
        created_at
    )
    SELECT 
        (item_data->>'order_id')::UUID,
        (item_data->>'product_id')::UUID,
        item_data->>'product_name',
        item_data->>'name',
        (item_data->>'quantity')::INTEGER,
        (item_data->>'unit_price')::DECIMAL,
        (item_data->>'total_price')::DECIMAL,
        false,
        (item_data->>'organization_id')::UUID,
        item_data->>'slug',
        (item_data->>'variant_info')::jsonb,
        CASE 
            WHEN item_data->>'color_id' IS NOT NULL 
            THEN (item_data->>'color_id')::UUID 
            ELSE NULL 
        END,
        CASE 
            WHEN item_data->>'size_id' IS NOT NULL 
            THEN (item_data->>'size_id')::UUID 
            ELSE NULL 
        END,
        (item_data->>'created_at')::timestamp
    FROM unnest(v_items_data) AS item_data;

    -- تحديث المخزون (إضافي - يمكن تعطيله للسرعة)
    -- UPDATE products 
    -- SET stock_quantity = stock_quantity - quantities.total_qty,
    --     updated_at = NOW()
    -- FROM (
    --     SELECT 
    --         (item->>'product_id')::UUID as product_id,
    --         SUM((item->>'quantity')::INTEGER) as total_qty
    --     FROM json_array_elements(p_items::json) AS item
    --     GROUP BY (item->>'product_id')::UUID
    -- ) AS quantities
    -- WHERE products.id = quantities.product_id
    --   AND products.organization_id = p_organization_id;

    -- إنشاء JSON للنتيجة
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
        'updated_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- في حالة الخطأ، أرجع تفاصيل الخطأ
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'error_detail', SQLSTATE || ': ' || SQLERRM
    );
END;
$$;

-- إنشاء فهرس محسن للطلبات إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_orders_pos_fast_lookup 
ON orders (organization_id, created_at DESC, pos_order_type) 
WHERE pos_order_type = 'pos';

-- إنشاء فهرس محسن لعناصر الطلبات
CREATE INDEX IF NOT EXISTS idx_order_items_fast_lookup 
ON order_items (order_id, product_id, created_at DESC);

-- تعليق حول الاستخدام
COMMENT ON FUNCTION create_pos_order_fast IS 
'دالة محسنة لإنشاء طلبات POS بسرعة فائقة - تستخدم Bulk Insert و Product Caching'; 