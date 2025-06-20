-- إصلاح مشكلة تضارب أنواع البيانات في دالة get_inventory_variants_log
-- المشكلة: العمود reference_type من نوع VARCHAR(20) بينما الدالة تتوقع TEXT

-- 1. حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_inventory_variants_log(uuid, uuid, uuid, integer, integer);

-- 2. إنشاء الدالة مع أنواع البيانات الصحيحة
CREATE OR REPLACE FUNCTION get_inventory_variants_log(
    p_organization_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_variant_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    log_id UUID,
    product_id UUID,
    product_name TEXT,
    variant_type VARCHAR(20), -- تم تغييره من TEXT إلى VARCHAR(20)
    variant_id UUID,
    variant_name TEXT,
    operation_type VARCHAR(50), -- تم تعديله أيضاً للتطابق مع جدول inventory_log
    quantity_change INTEGER,
    previous_stock INTEGER,
    new_stock INTEGER,
    notes TEXT,
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ,
    reference_info JSONB
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.id,
        il.product_id,
        p.name as product_name,
        il.reference_type::VARCHAR(20) as variant_type, -- تحويل صريح للنوع
        il.reference_id as variant_id,
        
        -- اسم المتغير حسب نوعه
        CASE 
            WHEN il.reference_type = 'simple' THEN 'منتج بسيط'::TEXT
            WHEN il.reference_type = 'color' THEN COALESCE(pc.name, 'لون غير محدد')::TEXT
            WHEN il.reference_type = 'size' THEN COALESCE(pc.name || ' - ' || ps.size_name, 'مقاس غير محدد')::TEXT
            ELSE 'غير محدد'::TEXT
        END as variant_name,
        
        il.type::VARCHAR(50) as operation_type, -- تحويل صريح للنوع
        il.quantity as quantity_change,
        il.previous_stock,
        il.new_stock,
        il.notes,
        il.created_by,
        COALESCE(u.name, 'مستخدم غير محدد')::TEXT as created_by_name,
        il.created_at,
        
        -- معلومات إضافية مرجعية
        jsonb_build_object(
            'variant_type', il.reference_type,
            'color_info', CASE WHEN pc.id IS NOT NULL THEN 
                jsonb_build_object(
                    'color_name', pc.name,
                    'color_code', pc.color_code,
                    'color_image', pc.image_url
                ) 
                ELSE NULL 
            END,
            'size_info', CASE WHEN ps.id IS NOT NULL THEN 
                jsonb_build_object(
                    'size_name', ps.size_name,
                    'size_barcode', ps.barcode
                ) 
                ELSE NULL 
            END
        ) as reference_info
        
    FROM inventory_log il
    JOIN products p ON il.product_id = p.id
    LEFT JOIN users u ON il.created_by = u.id
    LEFT JOIN product_colors pc ON il.reference_id = pc.id AND il.reference_type IN ('color', 'size')
    LEFT JOIN product_sizes ps ON il.reference_id = ps.id AND il.reference_type = 'size'
    
    WHERE il.organization_id = p_organization_id
    AND (p_product_id IS NULL OR il.product_id = p_product_id)
    AND (p_variant_id IS NULL OR il.reference_id = p_variant_id)
    
    ORDER BY il.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. إصلاح دالة update_variant_inventory أيضاً لضمان التوافق
DROP FUNCTION IF EXISTS update_variant_inventory(uuid, uuid, integer, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_organization_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_updated_by UUID,
    p_variant_id UUID DEFAULT NULL,
    p_operation_type VARCHAR(50) DEFAULT 'manual', -- تم تغييره من TEXT إلى VARCHAR(50)
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_quantity INTEGER,
    new_quantity INTEGER,
    affected_levels JSONB
) 
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_old_quantity INTEGER := 0;
    v_old_color_quantity INTEGER := 0;
    v_old_product_quantity INTEGER := 0;
    v_affected_levels JSONB := '{}'::jsonb;
    v_variant_type VARCHAR(20);
    v_color_id UUID;
    v_size_id UUID;
    v_reference_id UUID;
BEGIN
    -- التحقق من وجود المنتج والصلاحيات
    SELECT p.*, p.stock_quantity as current_stock
    INTO v_product
    FROM products p
    WHERE p.id = p_product_id 
    AND p.organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'المنتج غير موجود أو ليس لديك صلاحية للوصول إليه'::TEXT, 0, 0, '{}'::jsonb;
        RETURN;
    END IF;
    
    v_old_product_quantity := v_product.current_stock;
    
    -- تحديد نوع المتغير ومعالجته
    IF p_variant_id IS NULL THEN
        -- منتج بسيط (بدون متغيرات)
        IF v_product.has_variants THEN
            RETURN QUERY SELECT false, 'هذا المنتج له متغيرات، يجب تحديد المتغير المطلوب'::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
        END IF;
        
        v_variant_type := 'simple';
        v_old_quantity := v_product.current_stock;
        v_reference_id := p_product_id;
        
        -- تحديث المنتج الأساسي
        UPDATE products 
        SET 
            stock_quantity = p_new_quantity,
            last_inventory_update = NOW(),
            updated_by_user_id = p_updated_by
        WHERE id = p_product_id;
        
        v_affected_levels := jsonb_build_object(
            'product_level', jsonb_build_object(
                'old_quantity', v_old_quantity,
                'new_quantity', p_new_quantity
            )
        );
        
    ELSE
        -- منتج بمتغيرات - تحديد نوع المتغير
        IF EXISTS (SELECT 1 FROM product_sizes WHERE id = p_variant_id) THEN
            -- المتغير هو مقاس
            v_variant_type := 'size';
            
            SELECT ps.quantity, ps.color_id
            INTO v_old_quantity, v_color_id
            FROM product_sizes ps
            JOIN product_colors pc ON ps.color_id = pc.id
            WHERE ps.id = p_variant_id 
            AND pc.product_id = p_product_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'المقاس غير موجود أو لا ينتمي للمنتج المحدد'::TEXT, 0, 0, '{}'::jsonb;
                RETURN;
            END IF;
            
            SELECT quantity INTO v_old_color_quantity FROM product_colors WHERE id = v_color_id;
            v_size_id := p_variant_id;
            v_reference_id := p_variant_id;
            
            -- تحديث المقاس
            UPDATE product_sizes 
            SET quantity = p_new_quantity, updated_at = NOW()
            WHERE id = p_variant_id;
            
            -- إعادة حساب كمية اللون
            UPDATE product_colors 
            SET quantity = (
                SELECT COALESCE(SUM(ps.quantity), 0)
                FROM product_sizes ps 
                WHERE ps.color_id = v_color_id
            ),
            updated_at = NOW()
            WHERE id = v_color_id;
            
            v_affected_levels := jsonb_build_object(
                'size_level', jsonb_build_object(
                    'size_id', v_size_id,
                    'old_quantity', v_old_quantity,
                    'new_quantity', p_new_quantity
                ),
                'color_level', jsonb_build_object(
                    'color_id', v_color_id,
                    'old_quantity', v_old_color_quantity,
                    'new_quantity', (SELECT quantity FROM product_colors WHERE id = v_color_id)
                )
            );
            
        ELSIF EXISTS (SELECT 1 FROM product_colors WHERE id = p_variant_id) THEN
            -- المتغير هو لون
            v_variant_type := 'color';
            
            SELECT pc.quantity
            INTO v_old_quantity
            FROM product_colors pc
            WHERE pc.id = p_variant_id 
            AND pc.product_id = p_product_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'اللون غير موجود أو لا ينتمي للمنتج المحدد'::TEXT, 0, 0, '{}'::jsonb;
                RETURN;
            END IF;
            
            v_color_id := p_variant_id;
            v_reference_id := p_variant_id;
            
            -- تحديث اللون
            UPDATE product_colors 
            SET quantity = p_new_quantity, updated_at = NOW()
            WHERE id = p_variant_id;
            
            -- إذا كان اللون له مقاسات، تحديث كمياتها بالتوزيع المتناسب
            IF EXISTS (SELECT 1 FROM product_sizes WHERE color_id = p_variant_id) THEN
                UPDATE product_sizes 
                SET quantity = CASE 
                    WHEN v_old_quantity = 0 THEN p_new_quantity / (SELECT COUNT(*) FROM product_sizes WHERE color_id = p_variant_id)
                    ELSE ROUND((quantity::NUMERIC / v_old_quantity) * p_new_quantity)
                END,
                updated_at = NOW()
                WHERE color_id = p_variant_id;
            END IF;
            
            v_affected_levels := jsonb_build_object(
                'color_level', jsonb_build_object(
                    'color_id', v_color_id,
                    'old_quantity', v_old_quantity,
                    'new_quantity', p_new_quantity
                )
            );
            
        ELSE
            RETURN QUERY SELECT false, 'المتغير المحدد غير موجود'::TEXT, 0, 0, '{}'::jsonb;
            RETURN;
        END IF;
        
        -- إعادة حساب الكمية الإجمالية للمنتج
        UPDATE products 
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(pc.quantity), 0)
                FROM product_colors pc 
                WHERE pc.product_id = p_product_id
            ),
            last_inventory_update = NOW(),
            updated_by_user_id = p_updated_by
        WHERE id = p_product_id;
        
        v_affected_levels := v_affected_levels || jsonb_build_object(
            'product_level', jsonb_build_object(
                'old_quantity', v_old_product_quantity,
                'new_quantity', (SELECT stock_quantity FROM products WHERE id = p_product_id)
            )
        );
    END IF;
    
    -- تسجيل العملية في سجل المخزون
    INSERT INTO inventory_log (
        product_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        reference_type,
        notes,
        created_by,
        organization_id
    ) VALUES (
        p_product_id,
        p_new_quantity - v_old_quantity,
        v_old_quantity,
        p_new_quantity,
        p_operation_type,
        v_reference_id,
        v_variant_type,
        COALESCE(p_notes, format('تحديث مخزون %s', v_variant_type)),
        p_updated_by,
        p_organization_id
    );
    
    RETURN QUERY SELECT 
        true as success,
        format('تم تحديث المخزون بنجاح من %s إلى %s', v_old_quantity, p_new_quantity)::TEXT as message,
        v_old_quantity,
        p_new_quantity,
        v_affected_levels;
END;
$$;

-- 4. منح الصلاحيات للدوال المُحدثة
GRANT EXECUTE ON FUNCTION get_inventory_variants_log(UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_variant_inventory(UUID, UUID, INTEGER, UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- 5. إضافة تعليقات
COMMENT ON FUNCTION get_inventory_variants_log IS 'دالة مُصححة لجلب سجل المخزون للمتغيرات - أنواع البيانات متطابقة';
COMMENT ON FUNCTION update_variant_inventory IS 'دالة مُصححة لتحديث مخزون المتغيرات - أنواع البيانات متطابقة'; 