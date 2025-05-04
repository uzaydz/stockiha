-- إصلاح مشكلة المقاسات في قاعدة بيانات Bazaar
-- إنشاء: تاريخ اليوم

-- قبل البدء، تحقق أولاً من وجود جدول product_sizes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_sizes') THEN
        RAISE NOTICE 'جدول product_sizes غير موجود، يرجى تنفيذ ملف migrations/product_sizes.sql أولاً.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'بدء تنفيذ إصلاحات جدول product_sizes...';
END;
$$;

-- 1. التحقق من وجود الأعمدة المطلوبة وإضافتها إذا لم تكن موجودة
-- إضافة عمود use_sizes لجدول المنتجات إذا لم يكن موجوداً
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS use_sizes BOOLEAN DEFAULT false;

-- إضافة عمود has_sizes لجدول ألوان المنتجات إذا لم يكن موجوداً
ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;

-- 2. إصلاح وظيفة المتابعة (Trigger Function) للتعامل بشكل أفضل مع الخطأ
CREATE OR REPLACE FUNCTION maintain_product_sizes_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- منطق لجدول product_colors
    IF TG_TABLE_NAME = 'product_colors' THEN
        IF TG_OP = 'UPDATE' THEN
            -- التحقق من وجود الأعمدة قبل المقارنة
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'product_colors' AND column_name = 'has_sizes'
            ) THEN
                -- إذا تم تغيير has_sizes من false إلى true
                IF NEW.has_sizes = true AND (OLD.has_sizes IS NULL OR OLD.has_sizes = false) THEN
                    -- تحديث المنتج إذا وجد عمود use_sizes
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'products' AND column_name = 'use_sizes'
                    ) THEN
                        UPDATE products
                        SET use_sizes = true
                        WHERE id = NEW.product_id;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- منطق لجدول product_sizes
    IF TG_TABLE_NAME = 'product_sizes' THEN
        IF TG_OP = 'INSERT' THEN
            -- تحديث اللون إذا وجد عمود has_sizes
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'product_colors' AND column_name = 'has_sizes'
            ) THEN
                UPDATE product_colors
                SET has_sizes = true
                WHERE id = NEW.color_id;
            END IF;
            
            -- تحديث المنتج إذا وجد عمود use_sizes
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'products' AND column_name = 'use_sizes'
            ) THEN
                UPDATE products p
                SET use_sizes = true
                FROM product_colors pc
                WHERE pc.id = NEW.color_id
                AND p.id = pc.product_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إعادة إنشاء الـ Triggers
-- حذف وإعادة إنشاء Trigger على جدول product_colors
DROP TRIGGER IF EXISTS product_colors_consistency_trigger ON product_colors;
CREATE TRIGGER product_colors_consistency_trigger
AFTER UPDATE ON product_colors
FOR EACH ROW EXECUTE FUNCTION maintain_product_sizes_consistency();

-- حذف وإعادة إنشاء Trigger على جدول product_sizes
DROP TRIGGER IF EXISTS product_sizes_consistency_trigger ON product_sizes;
CREATE TRIGGER product_sizes_consistency_trigger
AFTER INSERT ON product_sizes
FOR EACH ROW EXECUTE FUNCTION maintain_product_sizes_consistency();

-- 4. تحديث البيانات الموجودة للتأكد من التناسق
-- تحديث المنتجات التي لها مقاسات
UPDATE products p
SET use_sizes = true
WHERE EXISTS (
    SELECT 1 
    FROM product_colors pc
    JOIN product_sizes ps ON pc.id = ps.color_id
    WHERE pc.product_id = p.id
);

-- تحديث الألوان التي لها مقاسات
UPDATE product_colors pc
SET has_sizes = true
WHERE EXISTS (
    SELECT 1 
    FROM product_sizes ps
    WHERE ps.color_id = pc.id
);

-- 5. إصلاح وظيفة update_product_size لحل مشكلة "column reference color_id is ambiguous"
CREATE OR REPLACE FUNCTION update_product_size(
    size_id UUID,
    size_name TEXT DEFAULT NULL,
    quantity INTEGER DEFAULT NULL,
    price NUMERIC DEFAULT NULL,
    barcode TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_color_id UUID;
    v_product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف اللون والمنتج من معرف المقاس
    SELECT ps.color_id, ps.product_id INTO v_color_id, v_product_id 
    FROM public.product_sizes ps 
    WHERE ps.id = update_product_size.size_id;
    
    IF v_color_id IS NULL THEN
        RAISE EXCEPTION 'المقاس غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = v_product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تعديل مقاسات هذا المنتج';
    END IF;
    
    -- إذا كان هذا هو المقاس الافتراضي، إلغاء تعيين أي مقاس افتراضي آخر لنفس اللون
    IF is_default THEN
        UPDATE public.product_sizes SET is_default = false WHERE color_id = v_color_id AND id != size_id;
    END IF;
    
    -- تحديث بيانات المقاس
    UPDATE public.product_sizes SET
        size_name = COALESCE(update_product_size.size_name, size_name),
        quantity = COALESCE(update_product_size.quantity, quantity),
        price = COALESCE(update_product_size.price, price),
        barcode = COALESCE(update_product_size.barcode, barcode),
        is_default = COALESCE(update_product_size.is_default, is_default)
    WHERE id = update_product_size.size_id;
    
    -- تحديث كمية اللون بناءً على مجموع كميات المقاسات
    UPDATE public.product_colors 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_sizes 
        WHERE color_id = v_color_id
    )
    WHERE id = v_color_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = v_product_id
    )
    WHERE id = v_product_id;
    
    RETURN true;
END;
$$;

-- 6. إضافة ملاحظة توضيحية للتنفيذ
DO $$
BEGIN
    RAISE NOTICE 'تم اكتمال تنفيذ إصلاحات جدول product_sizes بنجاح.';
    RAISE NOTICE 'يرجى تنفيذ النص التالي في واجهة تطوير Supabase للتأكد من تطبيق الإصلاحات:';
    RAISE NOTICE 'SELECT COUNT(*) FROM product_sizes;';
END;
$$;

-- 7. التحقق من الإصلاح
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
WHERE EXISTS (
    SELECT 1
    FROM product_sizes ps
    WHERE ps.color_id = pc.id
)
ORDER BY p.name, pc.name
LIMIT 20;
