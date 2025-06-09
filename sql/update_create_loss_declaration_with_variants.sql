-- تحديث دالة create_loss_declaration لدعم المتغيرات (الألوان والمقاسات)
-- سيتم تمرير معلومات المتغير مع كل منتج في JSON

CREATE OR REPLACE FUNCTION create_loss_declaration(
    p_loss_description TEXT,
    p_branch_id UUID,
    p_created_by UUID,
    p_items_lost JSONB
)
RETURNS TABLE (
    loss_id UUID,
    loss_number TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_loss_id UUID;
    v_loss_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_condition TEXT;
    v_notes TEXT;
    v_color_id UUID DEFAULT NULL;
    v_size_id UUID DEFAULT NULL;
    v_color_name TEXT DEFAULT NULL;
    v_size_name TEXT DEFAULT NULL;
    v_variant_stock INTEGER DEFAULT 0;
    v_product_record RECORD;
    v_purchase_price_calc DECIMAL;
    v_total_value DECIMAL DEFAULT 0;
BEGIN
    -- إنشاء معرف فريد للخسارة
    v_loss_id := gen_random_uuid();
    
    -- إنشاء رقم تسلسلي للخسارة
    SELECT CONCAT('LOSS-', EXTRACT(YEAR FROM CURRENT_DATE), '-', 
                  LPAD((COALESCE(MAX(CAST(SUBSTRING(number FROM 'LOSS-\d{4}-(\d+)') AS INTEGER)), 0) + 1)::TEXT, 6, '0'))
    INTO v_loss_number
    FROM losses 
    WHERE number LIKE CONCAT('LOSS-', EXTRACT(YEAR FROM CURRENT_DATE), '-%');

    -- إدراج سجل الخسارة الرئيسي
    INSERT INTO losses (
        id, number, description, branch_id, 
        created_by, status, created_at, updated_at
    ) VALUES (
        v_loss_id, v_loss_number, p_loss_description, p_branch_id,
        p_created_by, 'pending', NOW(), NOW()
    );

    -- معالجة كل منتج في قائمة الخسائر
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_lost)
    LOOP
        -- استخراج البيانات الأساسية
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_condition := COALESCE(v_item->>'condition', 'completely_damaged');
        v_notes := v_item->>'notes';
        
        -- استخراج معلومات المتغيرات (اختيارية)
        v_color_id := CASE WHEN v_item ? 'color_id' AND v_item->>'color_id' != '' 
                          THEN (v_item->>'color_id')::UUID 
                          ELSE NULL END;
        v_size_id := CASE WHEN v_item ? 'size_id' AND v_item->>'size_id' != '' 
                         THEN (v_item->>'size_id')::UUID 
                         ELSE NULL END;
        v_color_name := v_item->>'color_name';
        v_size_name := v_item->>'size_name';

        -- التحقق من وجود المنتج والحصول على معلوماته
        SELECT p.*
        INTO v_product_record
        FROM products p
        WHERE p.id = v_product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'المنتج غير موجود: %', v_product_id;
        END IF;

        -- حساب سعر الشراء
        v_purchase_price_calc := CASE 
            WHEN v_product_record.purchase_price > 0 
            THEN v_product_record.purchase_price 
            ELSE v_product_record.price * 0.7 
        END;

        -- الحصول على المخزون الحالي للمتغير
        IF v_color_id IS NOT NULL AND v_size_id IS NOT NULL THEN
            -- منتج بلون ومقاس
            SELECT COALESCE(pc.stock, 0) + COALESCE(ps.stock, 0)
            INTO v_variant_stock
            FROM product_colors pc, product_sizes ps
            WHERE pc.id = v_color_id AND ps.id = v_size_id;
        ELSIF v_color_id IS NOT NULL THEN
            -- منتج بلون فقط
            SELECT COALESCE(stock, 0)
            INTO v_variant_stock
            FROM product_colors
            WHERE id = v_color_id;
        ELSIF v_size_id IS NOT NULL THEN
            -- منتج بمقاس فقط
            SELECT COALESCE(stock, 0)
            INTO v_variant_stock
            FROM product_sizes
            WHERE id = v_size_id;
        ELSE
            -- منتج بدون متغيرات
            v_variant_stock := COALESCE(v_product_record.stock, 0);
        END IF;

        -- التحقق من توفر الكمية المطلوبة
        IF v_variant_stock < v_quantity THEN
            RAISE EXCEPTION 'الكمية المطلوبة (%) أكبر من المخزون المتاح (%) للمنتج: %', 
                v_quantity, v_variant_stock, v_product_record.name;
        END IF;

        -- إدراج سجل الخسارة للمنتج
        INSERT INTO loss_items (
            id, loss_id, product_id, quantity, 
            purchase_price_calc, total_value, loss_condition, notes,
            stock_before, stock_after,
            color_id, size_id, color_name, size_name,
            variant_stock_before, variant_stock_after,
            created_at
        ) VALUES (
            gen_random_uuid(), v_loss_id, v_product_id, v_quantity,
            v_purchase_price_calc, (v_purchase_price_calc * v_quantity), v_condition, v_notes,
            v_product_record.stock, v_product_record.stock, -- سيتم تحديثها عند المعالجة
            v_color_id, v_size_id, v_color_name, v_size_name,
            v_variant_stock, (v_variant_stock - v_quantity),
            NOW()
        );

        -- حساب القيمة الإجمالية للخسارة
        v_total_value := v_total_value + (v_purchase_price_calc * v_quantity);
    END LOOP;

    -- تحديث القيمة الإجمالية للخسارة
    UPDATE losses 
    SET total_value = v_total_value
    WHERE id = v_loss_id;

    -- إرجاع معرف ورقم الخسارة
    RETURN QUERY SELECT v_loss_id, v_loss_number;
END;
$$; 