-- =============================================================================
-- نظام إدارة مخزون المتغيرات المتقدم (مصحح)
-- يدعم المنتجات البسيطة، المنتجات بألوان، والمنتجات بألوان ومقاسات
-- =============================================================================

-- 1. حذف الدوال القديمة إن وجدت
DROP FUNCTION IF EXISTS get_product_inventory_details(uuid, uuid);
DROP FUNCTION IF EXISTS update_variant_inventory(uuid, uuid, uuid, integer, text, text, uuid);
DROP FUNCTION IF EXISTS sync_inventory_levels(uuid, uuid);
DROP FUNCTION IF EXISTS get_inventory_variants_log(uuid, uuid, uuid, integer, integer);

-- =============================================================================
-- 1. دالة الحصول على تفاصيل مخزون المنتج الشاملة
-- =============================================================================
CREATE OR REPLACE FUNCTION get_product_inventory_details(
    p_organization_id UUID,
    p_product_id UUID
)
RETURNS TABLE(
    -- معلومات المنتج الأساسية
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    product_barcode TEXT,
    has_variants BOOLEAN,
    use_sizes BOOLEAN,
    
    -- مخزون المنتج الأساسي
    total_stock_quantity INTEGER,
    min_stock_level INTEGER,
    reorder_level INTEGER,
    reorder_quantity INTEGER,
    last_inventory_update TIMESTAMPTZ,
    
    -- حالة المخزون
    stock_status TEXT,
    reorder_needed BOOLEAN,
    
    -- تفاصيل الألوان والمقاسات
    variants_data JSONB,
    
    -- إحصائيات الأداء
    low_stock_variants INTEGER,
    out_of_stock_variants INTEGER,
    total_variants INTEGER,
    
    -- معلومات مالية
    total_stock_value NUMERIC,
    average_purchase_price NUMERIC
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_product_record RECORD;
    v_variants_data JSONB := '[]'::jsonb;
    v_total_variants INTEGER := 0;
    v_low_stock_variants INTEGER := 0;
    v_out_of_stock_variants INTEGER := 0;
    v_total_stock_value NUMERIC := 0;
    v_avg_purchase_price NUMERIC := 0;
BEGIN
    -- جلب معلومات المنتج الأساسية
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.has_variants,
        p.use_sizes,
        p.stock_quantity,
        p.min_stock_level,
        p.reorder_level,
        p.reorder_quantity,
        p.last_inventory_update,
        p.purchase_price
    INTO v_product_record
    FROM products p
    WHERE p.id = p_product_id 
    AND p.organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN; -- المنتج غير موجود
    END IF;
    
    -- حساب بيانات المتغيرات حسب نوع المنتج
    IF v_product_record.has_variants THEN
        -- المنتج له متغيرات (ألوان)
        IF v_product_record.use_sizes THEN
            -- منتج بألوان ومقاسات
            WITH variants_details AS (
                SELECT 
                    c.id as color_id,
                    c.name as color_name,
                    c.color_code,
                    c.image_url as color_image,
                    c.quantity as color_total_quantity,
                    c.price as color_price,
                    c.purchase_price as color_purchase_price,
                    
                    -- تفاصيل المقاسات
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'size_id', s.id,
                                'size_name', s.size_name,
                                'quantity', s.quantity,
                                'price', s.price,
                                'purchase_price', s.purchase_price,
                                'barcode', s.barcode,
                                'is_default', s.is_default,
                                'stock_status', 
                                CASE 
                                    WHEN s.quantity = 0 THEN 'out-of-stock'
                                    WHEN s.quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN 'low-stock'
                                    ELSE 'in-stock'
                                END
                            ) ORDER BY s.size_name
                        ) FILTER (WHERE s.id IS NOT NULL),
                        '[]'::jsonb
                    ) as sizes,
                    
                    -- عدد المقاسات
                    COUNT(s.id) as sizes_count,
                    COUNT(s.id) FILTER (WHERE s.quantity = 0) as out_of_stock_sizes,
                    COUNT(s.id) FILTER (WHERE s.quantity > 0 AND s.quantity <= COALESCE(v_product_record.min_stock_level, 5)) as low_stock_sizes
                    
                FROM product_colors c
                LEFT JOIN product_sizes s ON c.id = s.color_id
                WHERE c.product_id = p_product_id
                GROUP BY c.id, c.name, c.color_code, c.image_url, c.quantity, c.price, c.purchase_price
            )
            SELECT 
                jsonb_agg(
                    jsonb_build_object(
                        'type', 'color_with_sizes',
                        'color_id', vd.color_id,
                        'color_name', vd.color_name,
                        'color_code', vd.color_code,
                        'color_image', vd.color_image,
                        'color_quantity', vd.color_total_quantity,
                        'color_price', vd.color_price,
                        'color_purchase_price', vd.color_purchase_price,
                        'sizes', vd.sizes,
                        'sizes_count', vd.sizes_count,
                        'out_of_stock_sizes', vd.out_of_stock_sizes,
                        'low_stock_sizes', vd.low_stock_sizes,
                        'stock_status',
                        CASE 
                            WHEN vd.color_total_quantity = 0 THEN 'out-of-stock'
                            WHEN vd.color_total_quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN 'low-stock'
                            ELSE 'in-stock'
                        END
                    ) ORDER BY vd.color_name
                ),
                SUM(vd.sizes_count),
                SUM(vd.low_stock_sizes) + COUNT(*) FILTER (WHERE vd.color_total_quantity > 0 AND vd.color_total_quantity <= COALESCE(v_product_record.min_stock_level, 5)),
                SUM(vd.out_of_stock_sizes) + COUNT(*) FILTER (WHERE vd.color_total_quantity = 0),
                SUM(vd.color_total_quantity * COALESCE(vd.color_purchase_price, v_product_record.purchase_price, 0))
            INTO v_variants_data, v_total_variants, v_low_stock_variants, v_out_of_stock_variants, v_total_stock_value
            FROM variants_details vd;
            
        ELSE
            -- منتج بألوان فقط (بدون مقاسات)
            SELECT 
                jsonb_agg(
                    jsonb_build_object(
                        'type', 'color_only',
                        'color_id', c.id,
                        'color_name', c.name,
                        'color_code', c.color_code,
                        'color_image', c.image_url,
                        'quantity', c.quantity,
                        'price', c.price,
                        'purchase_price', c.purchase_price,
                        'barcode', c.barcode,
                        'stock_status',
                        CASE 
                            WHEN c.quantity = 0 THEN 'out-of-stock'
                            WHEN c.quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN 'low-stock'
                            ELSE 'in-stock'
                        END
                    ) ORDER BY c.name
                ),
                COUNT(*),
                COUNT(*) FILTER (WHERE c.quantity > 0 AND c.quantity <= COALESCE(v_product_record.min_stock_level, 5)),
                COUNT(*) FILTER (WHERE c.quantity = 0),
                SUM(c.quantity * COALESCE(c.purchase_price, v_product_record.purchase_price, 0))
            INTO v_variants_data, v_total_variants, v_low_stock_variants, v_out_of_stock_variants, v_total_stock_value
            FROM product_colors c
            WHERE c.product_id = p_product_id;
        END IF;
    ELSE
        -- منتج بسيط (بدون متغيرات)
        v_variants_data := jsonb_build_array(
            jsonb_build_object(
                'type', 'simple',
                'quantity', v_product_record.stock_quantity,
                'price', (SELECT price FROM products WHERE id = p_product_id),
                'purchase_price', v_product_record.purchase_price,
                'stock_status',
                CASE 
                    WHEN v_product_record.stock_quantity = 0 THEN 'out-of-stock'
                    WHEN v_product_record.stock_quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN 'low-stock'
                    ELSE 'in-stock'
                END
            )
        );
        v_total_variants := 1;
        v_total_stock_value := v_product_record.stock_quantity * COALESCE(v_product_record.purchase_price, 0);
        
        IF v_product_record.stock_quantity = 0 THEN
            v_out_of_stock_variants := 1;
        ELSIF v_product_record.stock_quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN
            v_low_stock_variants := 1;
        END IF;
    END IF;
    
    -- حساب متوسط سعر الشراء
    IF v_total_variants > 0 AND v_product_record.stock_quantity > 0 THEN
        v_avg_purchase_price := v_total_stock_value / v_product_record.stock_quantity;
    END IF;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT
        v_product_record.id,
        v_product_record.name,
        v_product_record.sku,
        v_product_record.barcode,
        v_product_record.has_variants,
        v_product_record.use_sizes,
        
        v_product_record.stock_quantity,
        v_product_record.min_stock_level,
        v_product_record.reorder_level,
        v_product_record.reorder_quantity,
        v_product_record.last_inventory_update,
        
        CASE 
            WHEN v_product_record.stock_quantity = 0 THEN 'out-of-stock'
            WHEN v_product_record.stock_quantity <= COALESCE(v_product_record.min_stock_level, 5) THEN 'low-stock'
            WHEN v_product_record.stock_quantity <= COALESCE(v_product_record.reorder_level, 10) THEN 'reorder-needed'
            ELSE 'in-stock'
        END as stock_status,
        
        (v_product_record.stock_quantity <= COALESCE(v_product_record.reorder_level, 10)) as reorder_needed,
        
        v_variants_data,
        
        v_low_stock_variants,
        v_out_of_stock_variants,
        v_total_variants,
        
        v_total_stock_value,
        v_avg_purchase_price;
END;
$$;

-- =============================================================================
-- 2. دالة تحديث مخزون المتغيرات (مصححة - ترتيب المعاملات)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_organization_id UUID,
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_updated_by UUID,
    p_variant_id UUID DEFAULT NULL, -- color_id أو size_id
    p_operation_type TEXT DEFAULT 'manual', -- manual, sale, purchase, adjustment, return
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_quantity INTEGER,
    new_quantity INTEGER,
    affected_levels JSONB -- يوضح المستويات التي تم تحديثها
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
    v_variant_type TEXT;
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
        RETURN QUERY SELECT false, 'المنتج غير موجود أو ليس لديك صلاحية للوصول إليه', 0, 0, '{}'::jsonb;
        RETURN;
    END IF;
    
    v_old_product_quantity := v_product.current_stock;
    
    -- تحديد نوع المتغير ومعالجته
    IF p_variant_id IS NULL THEN
        -- منتج بسيط (بدون متغيرات)
        IF v_product.has_variants THEN
            RETURN QUERY SELECT false, 'هذا المنتج له متغيرات، يجب تحديد المتغير المطلوب', 0, 0, '{}'::jsonb;
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
        -- منتج بمتغيرات
        -- أولاً: تحديد نوع المتغير (لون أم مقاس)
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
                RETURN QUERY SELECT false, 'المقاس غير موجود أو لا ينتمي للمنتج المحدد', 0, 0, '{}'::jsonb;
                RETURN;
            END IF;
            
            -- الحصول على كمية اللون الحالية
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
                RETURN QUERY SELECT false, 'اللون غير موجود أو لا ينتمي للمنتج المحدد', 0, 0, '{}'::jsonb;
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
                -- توزيع الكمية الجديدة على المقاسات بنفس النسب
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
            RETURN QUERY SELECT false, 'المتغير المحدد غير موجود', 0, 0, '{}'::jsonb;
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
        
        -- إضافة تحديث مستوى المنتج للمتغيرات المتأثرة
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
        format('تم تحديث المخزون بنجاح من %s إلى %s', v_old_quantity, p_new_quantity) as message,
        v_old_quantity,
        p_new_quantity,
        v_affected_levels;
END;
$$;

-- =============================================================================
-- 3. دالة مزامنة مستويات المخزون
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_inventory_levels(
    p_organization_id UUID,
    p_product_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    sync_report JSONB
) 
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_sync_report JSONB := '{}'::jsonb;
    v_color_record RECORD;
    v_calculated_product_total INTEGER := 0;
    v_differences JSONB := '[]'::jsonb;
BEGIN
    -- جلب معلومات المنتج
    SELECT * INTO v_product 
    FROM products 
    WHERE id = p_product_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'المنتج غير موجود', '{}'::jsonb;
        RETURN;
    END IF;
    
    IF NOT v_product.has_variants THEN
        -- منتج بسيط - لا يحتاج مزامنة
        RETURN QUERY SELECT true, 'منتج بسيط - لا يحتاج مزامنة', 
            jsonb_build_object('type', 'simple', 'stock_quantity', v_product.stock_quantity);
        RETURN;
    END IF;
    
    -- مزامنة الألوان والمقاسات
    FOR v_color_record IN 
        SELECT id, name, quantity as current_color_quantity 
        FROM product_colors 
        WHERE product_id = p_product_id
    LOOP
        -- حساب الكمية الصحيحة للون من مجموع المقاسات
        DECLARE
            v_calculated_color_quantity INTEGER;
            v_old_color_quantity INTEGER := v_color_record.current_color_quantity;
        BEGIN
            SELECT COALESCE(SUM(quantity), 0) 
            INTO v_calculated_color_quantity
            FROM product_sizes 
            WHERE color_id = v_color_record.id;
            
            -- تحديث كمية اللون إذا كانت مختلفة
            IF v_calculated_color_quantity != v_old_color_quantity THEN
                UPDATE product_colors 
                SET quantity = v_calculated_color_quantity, updated_at = NOW()
                WHERE id = v_color_record.id;
                
                v_differences := v_differences || jsonb_build_object(
                    'type', 'color',
                    'color_id', v_color_record.id,
                    'color_name', v_color_record.name,
                    'old_quantity', v_old_color_quantity,
                    'new_quantity', v_calculated_color_quantity,
                    'difference', v_calculated_color_quantity - v_old_color_quantity
                );
            END IF;
            
            v_calculated_product_total := v_calculated_product_total + v_calculated_color_quantity;
        END;
    END LOOP;
    
    -- تحديث الكمية الإجمالية للمنتج
    IF v_calculated_product_total != v_product.stock_quantity THEN
        UPDATE products 
        SET stock_quantity = v_calculated_product_total, 
            last_inventory_update = NOW()
        WHERE id = p_product_id;
        
        v_differences := v_differences || jsonb_build_object(
            'type', 'product',
            'product_id', p_product_id,
            'old_quantity', v_product.stock_quantity,
            'new_quantity', v_calculated_product_total,
            'difference', v_calculated_product_total - v_product.stock_quantity
        );
    END IF;
    
    v_sync_report := jsonb_build_object(
        'product_id', p_product_id,
        'synchronized_at', NOW(),
        'differences', v_differences,
        'total_differences', jsonb_array_length(v_differences)
    );
    
    RETURN QUERY SELECT 
        true as success,
        CASE 
            WHEN jsonb_array_length(v_differences) = 0 THEN 'المخزون متزامن بالفعل'
            ELSE format('تم مزامنة %s اختلاف في المخزون', jsonb_array_length(v_differences))
        END as message,
        v_sync_report;
END;
$$;

-- =============================================================================
-- 4. دالة الحصول على سجل المخزون للمتغيرات
-- =============================================================================
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
    variant_type TEXT,
    variant_id UUID,
    variant_name TEXT,
    operation_type TEXT,
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
        il.reference_type as variant_type,
        il.reference_id as variant_id,
        
        -- اسم المتغير حسب نوعه
        CASE 
            WHEN il.reference_type = 'simple' THEN 'منتج بسيط'
            WHEN il.reference_type = 'color' THEN pc.name
            WHEN il.reference_type = 'size' THEN pc.name || ' - ' || ps.size_name
            ELSE 'غير محدد'
        END as variant_name,
        
        il.type as operation_type,
        il.quantity as quantity_change,
        il.previous_stock,
        il.new_stock,
        il.notes,
        il.created_by,
        u.name as created_by_name,
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

-- =============================================================================
-- 5. إنشاء فهارس محسنة للأداء
-- =============================================================================

-- فهرس للبحث السريع في سجل المخزون حسب المتغيرات
CREATE INDEX IF NOT EXISTS idx_inventory_log_variants 
ON inventory_log (organization_id, product_id, reference_type, reference_id, created_at DESC);

-- فهرس لكميات الألوان والمقاسات
CREATE INDEX IF NOT EXISTS idx_product_colors_quantity 
ON product_colors (product_id, quantity);

CREATE INDEX IF NOT EXISTS idx_product_sizes_quantity 
ON product_sizes (color_id, quantity);

-- فهرس مركب للمنتجات والمتغيرات
CREATE INDEX IF NOT EXISTS idx_products_variants_inventory 
ON products (organization_id, has_variants, use_sizes, stock_quantity);

-- =============================================================================
-- منح الصلاحيات
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_product_inventory_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_variant_inventory(UUID, UUID, INTEGER, UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_inventory_levels(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_variants_log(UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;

-- إضافة تعليقات
COMMENT ON FUNCTION get_product_inventory_details IS 'الحصول على تفاصيل شاملة لمخزون المنتج مع دعم جميع أنواع المتغيرات';
COMMENT ON FUNCTION update_variant_inventory IS 'تحديث مخزون المتغيرات مع مزامنة تلقائية لجميع المستويات (ترتيب معاملات مصحح)';
COMMENT ON FUNCTION sync_inventory_levels IS 'مزامنة مستويات المخزون بين المنتج والألوان والمقاسات';
COMMENT ON FUNCTION get_inventory_variants_log IS 'الحصول على سجل تفصيلي لعمليات المخزون للمتغيرات'; 