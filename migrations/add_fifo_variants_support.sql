-- إضافة دعم المتغيرات لنظام FIFO
-- تاريخ الإنشاء: 2025-01-27

-- 1. إضافة حقول المتغيرات إلى inventory_batches
ALTER TABLE inventory_batches 
ADD COLUMN color_id UUID REFERENCES product_colors(id),
ADD COLUMN size_id UUID REFERENCES product_sizes(id),
ADD COLUMN variant_type VARCHAR(20) DEFAULT 'simple',
ADD COLUMN variant_display_name TEXT;

-- 2. إضافة حقول المتغيرات إلى supplier_purchase_items
ALTER TABLE supplier_purchase_items 
ADD COLUMN color_id UUID REFERENCES product_colors(id),
ADD COLUMN size_id UUID REFERENCES product_sizes(id),
ADD COLUMN variant_type VARCHAR(20) DEFAULT 'simple',
ADD COLUMN variant_display_name TEXT;

-- 3. إضافة فهارس للأداء
CREATE INDEX idx_inventory_batches_variant ON inventory_batches(product_id, color_id, size_id);
CREATE INDEX idx_supplier_purchase_items_variant ON supplier_purchase_items(product_id, color_id, size_id);

-- 4. إضافة قيود البيانات
ALTER TABLE inventory_batches
ADD CONSTRAINT check_variant_type 
CHECK (variant_type IN ('simple', 'color_only', 'size_only', 'color_size'));

ALTER TABLE supplier_purchase_items
ADD CONSTRAINT check_variant_type_purchase 
CHECK (variant_type IN ('simple', 'color_only', 'size_only', 'color_size'));

-- 5. Function لتحديد نوع المتغير
CREATE OR REPLACE FUNCTION determine_variant_type(
    p_color_id UUID,
    p_size_id UUID
)
RETURNS TEXT AS $$
BEGIN
    IF p_color_id IS NOT NULL AND p_size_id IS NOT NULL THEN
        RETURN 'color_size';
    ELSIF p_color_id IS NOT NULL THEN
        RETURN 'color_only';
    ELSIF p_size_id IS NOT NULL THEN
        RETURN 'size_only';
    ELSE
        RETURN 'simple';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function لإنشاء اسم المتغير للعرض
CREATE OR REPLACE FUNCTION generate_variant_display_name(
    p_product_id UUID,
    p_color_id UUID,
    p_size_id UUID
)
RETURNS TEXT AS $$
DECLARE
    color_name TEXT;
    size_name TEXT;
    product_name TEXT;
BEGIN
    -- جلب اسم المنتج
    SELECT name INTO product_name FROM products WHERE id = p_product_id;
    
    -- جلب اسم اللون
    IF p_color_id IS NOT NULL THEN
        SELECT name INTO color_name FROM product_colors WHERE id = p_color_id;
    END IF;
    
    -- جلب اسم المقاس
    IF p_size_id IS NOT NULL THEN
        SELECT size_name INTO size_name FROM product_sizes WHERE id = p_size_id;
    END IF;
    
    -- تكوين الاسم حسب نوع المتغير
    IF color_name IS NOT NULL AND size_name IS NOT NULL THEN
        RETURN product_name || ' - ' || color_name || ' - ' || size_name;
    ELSIF color_name IS NOT NULL THEN
        RETURN product_name || ' - ' || color_name;
    ELSIF size_name IS NOT NULL THEN
        RETURN product_name || ' - ' || size_name;
    ELSE
        RETURN product_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. تحديث function إنشاء Batch لدعم المتغيرات
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    new_batch_id UUID;
    batch_number TEXT;
    supplier_purchase RECORD;
    variant_type_val TEXT;
    variant_display_name_val TEXT;
BEGIN
    -- جلب بيانات الشراء
    SELECT sp.*, s.name as supplier_name 
    INTO supplier_purchase
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.id = NEW.purchase_id;
    
    -- تحديد نوع المتغير
    variant_type_val := determine_variant_type(NEW.color_id, NEW.size_id);
    
    -- إنشاء اسم المتغير للعرض
    variant_display_name_val := generate_variant_display_name(NEW.product_id, NEW.color_id, NEW.size_id);
    
    -- إنشاء رقم Batch فريد مع المتغير
    batch_number := 'PURCHASE-' || supplier_purchase.purchase_number || '-' || 
                   EXTRACT(epoch FROM NOW())::TEXT || '-' || 
                   COALESCE(NEW.product_id::TEXT, 'NO-PRODUCT') || '-' ||
                   COALESCE(NEW.color_id::TEXT, 'NO-COLOR') || '-' ||
                   COALESCE(NEW.size_id::TEXT, 'NO-SIZE');
    
    -- إنشاء Batch جديد
    INSERT INTO inventory_batches (
        product_id,
        batch_number,
        supplier_id,
        purchase_date,
        purchase_price,
        selling_price,
        quantity_received,
        quantity_remaining,
        cost_per_unit,
        organization_id,
        supplier_purchase_item_id,
        color_id,
        size_id,
        variant_type,
        variant_display_name,
        notes
    ) VALUES (
        NEW.product_id,
        batch_number,
        supplier_purchase.supplier_id,
        supplier_purchase.purchase_date,
        NEW.unit_price,
        COALESCE((SELECT price FROM products WHERE id = NEW.product_id), NEW.unit_price),
        NEW.quantity::INTEGER,
        NEW.quantity::INTEGER,
        NEW.unit_price,
        supplier_purchase.organization_id,
        NEW.id,
        NEW.color_id,
        NEW.size_id,
        variant_type_val,
        variant_display_name_val,
        'تم إنشاؤه تلقائياً من فاتورة الشراء رقم: ' || supplier_purchase.purchase_number || 
        CASE WHEN variant_display_name_val != (SELECT name FROM products WHERE id = NEW.product_id) 
             THEN ' - المتغير: ' || variant_display_name_val 
             ELSE '' 
        END
    ) RETURNING id INTO new_batch_id;
    
    -- ربط الـ Batch بعنصر الشراء
    UPDATE supplier_purchase_items 
    SET batch_id = new_batch_id 
    WHERE id = NEW.id;
    
    -- تسجيل حركة الدخول
    INSERT INTO inventory_batch_movements (
        batch_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        organization_id
    ) VALUES (
        new_batch_id,
        'IN',
        NEW.quantity::INTEGER,
        'SUPPLIER_PURCHASE',
        NEW.purchase_id,
        'دخول مخزون من الشراء رقم: ' || supplier_purchase.purchase_number || 
        ' - ' || variant_display_name_val,
        supplier_purchase.organization_id
    );
    
    -- تحديث مخزون المتغير المحدد
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        -- تحديث مخزون المقاس
        UPDATE product_sizes 
        SET quantity = quantity + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        -- تحديث مخزون اللون
        UPDATE product_colors 
        SET quantity = quantity + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE id = NEW.color_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. تحديث function للحصول على Batches مع دعم المتغيرات
CREATE OR REPLACE FUNCTION get_available_batches_fifo_variants(
    p_product_id UUID,
    p_organization_id UUID,
    p_color_id UUID DEFAULT NULL,
    p_size_id UUID DEFAULT NULL
)
RETURNS TABLE (
    batch_id UUID,
    batch_number TEXT,
    purchase_price NUMERIC,
    quantity_available INTEGER,
    purchase_date TIMESTAMPTZ,
    supplier_name TEXT,
    color_id UUID,
    color_name TEXT,
    size_id UUID,
    size_name TEXT,
    variant_type TEXT,
    variant_display_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ib.id as batch_id,
        ib.batch_number,
        ib.purchase_price,
        ib.quantity_remaining as quantity_available,
        ib.purchase_date,
        COALESCE(s.name, 'غير محدد') as supplier_name,
        ib.color_id,
        pc.name as color_name,
        ib.size_id,
        ps.size_name,
        ib.variant_type,
        ib.variant_display_name
    FROM inventory_batches ib
    LEFT JOIN suppliers s ON ib.supplier_id = s.id
    LEFT JOIN product_colors pc ON ib.color_id = pc.id
    LEFT JOIN product_sizes ps ON ib.size_id = ps.id
    WHERE ib.product_id = p_product_id
    AND ib.organization_id = p_organization_id
    AND ib.quantity_remaining > 0
    AND ib.is_active = true
    AND (p_color_id IS NULL OR ib.color_id = p_color_id)
    AND (p_size_id IS NULL OR ib.size_id = p_size_id)
    ORDER BY ib.purchase_date ASC, ib.created_at ASC; -- FIFO order
END;
$$ LANGUAGE plpgsql;

-- 9. إضافة تعليقات للتوثيق
COMMENT ON COLUMN inventory_batches.color_id IS 'معرف اللون للمتغير';
COMMENT ON COLUMN inventory_batches.size_id IS 'معرف المقاس للمتغير';
COMMENT ON COLUMN inventory_batches.variant_type IS 'نوع المتغير: simple, color_only, size_only, color_size';
COMMENT ON COLUMN inventory_batches.variant_display_name IS 'اسم المتغير للعرض';

COMMENT ON COLUMN supplier_purchase_items.color_id IS 'معرف اللون للمتغير المشتراة';
COMMENT ON COLUMN supplier_purchase_items.size_id IS 'معرف المقاس للمتغير المشتراة';
COMMENT ON COLUMN supplier_purchase_items.variant_type IS 'نوع المتغير المشتراة';
COMMENT ON COLUMN supplier_purchase_items.variant_display_name IS 'اسم المتغير المشتراة للعرض'; 