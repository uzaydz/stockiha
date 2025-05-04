-- إصلاح مشكلة المقاسات في المنتجات
-- هذا الملف يحتوي على تعليمات SQL لضمان توافق حالة المقاسات بين المنتجات وألوانها

-- 1. تحديث حالة use_sizes للمنتجات التي لها ألوان بمقاسات
UPDATE products p
SET use_sizes = true
WHERE p.use_sizes = false
AND EXISTS (
    SELECT 1 FROM product_colors pc
    JOIN product_sizes ps ON pc.id = ps.color_id
    WHERE pc.product_id = p.id
);

-- 2. تحديث خاصية has_sizes للألوان التي لها مقاسات
UPDATE product_colors pc
SET has_sizes = true
WHERE pc.has_sizes = false
AND EXISTS (
    SELECT 1 FROM product_sizes ps
    WHERE ps.color_id = pc.id
);

-- 3. تحديث خاصية has_sizes للألوان بناءً على حالة المنتج
UPDATE product_colors pc
SET has_sizes = p.use_sizes
FROM products p
WHERE pc.product_id = p.id
AND p.use_sizes = true;

-- 4. تأكد من أن كل منتج له لون افتراضي واحد على الأقل
DO $$
DECLARE
    prod_id UUID;
BEGIN
    FOR prod_id IN
        SELECT p.id FROM products p
        WHERE p.has_variants = true
        AND NOT EXISTS (
            SELECT 1 FROM product_colors pc
            WHERE pc.product_id = p.id
            AND pc.is_default = true
        )
    LOOP
        UPDATE product_colors
        SET is_default = true
        WHERE id = (
            SELECT id FROM product_colors
            WHERE product_id = prod_id
            ORDER BY created_at
            LIMIT 1
        );
    END LOOP;
END $$;

-- 5. إضافة Trigger لضمان التوافق في المستقبل
CREATE OR REPLACE FUNCTION maintain_product_sizes_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تغيير حالة has_sizes في اللون
    IF TG_OP = 'UPDATE' AND NEW.has_sizes != OLD.has_sizes THEN
        -- إذا تم تفعيل has_sizes، تأكد من تفعيل use_sizes في المنتج
        IF NEW.has_sizes = true THEN
            UPDATE products
            SET use_sizes = true
            WHERE id = NEW.product_id;
        END IF;
    END IF;
    
    -- عند إضافة مقاس جديد
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'product_sizes' THEN
        -- تفعيل has_sizes للون
        UPDATE product_colors
        SET has_sizes = true
        WHERE id = NEW.color_id;
        
        -- تفعيل use_sizes للمنتج
        UPDATE products p
        SET use_sizes = true
        FROM product_colors pc
        WHERE pc.id = NEW.color_id
        AND p.id = pc.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة Trigger على جدول product_colors
DROP TRIGGER IF EXISTS product_colors_consistency_trigger ON product_colors;
CREATE TRIGGER product_colors_consistency_trigger
AFTER UPDATE ON product_colors
FOR EACH ROW EXECUTE FUNCTION maintain_product_sizes_consistency();

-- إضافة Trigger على جدول product_sizes
DROP TRIGGER IF EXISTS product_sizes_consistency_trigger ON product_sizes;
CREATE TRIGGER product_sizes_consistency_trigger
AFTER INSERT ON product_sizes
FOR EACH ROW EXECUTE FUNCTION maintain_product_sizes_consistency();

-- 6. التحقق من نتائج التعديلات
SELECT 
    p.id as product_id, 
    p.name as product_name, 
    p.use_sizes, 
    pc.id as color_id, 
    pc.name as color_name, 
    pc.has_sizes,
    (SELECT COUNT(*) FROM product_sizes ps WHERE ps.color_id = pc.id) as sizes_count
FROM products p
JOIN product_colors pc ON p.id = pc.product_id
WHERE p.id IN (
    -- المنتجات التي لديها مقاسات
    SELECT DISTINCT pc.product_id 
    FROM product_colors pc
    JOIN product_sizes ps ON pc.id = ps.color_id
)
ORDER BY p.name, pc.name; 