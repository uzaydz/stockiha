-- وظائف توليد رموز المنتجات والباركود
-- Created: 2024-08-20

-- وظيفة لتوليد SKU فريد للمنتج
CREATE OR REPLACE FUNCTION public.generate_unique_sku(
    category_short_name TEXT DEFAULT 'PR', -- رمز الفئة المختصر (افتراضياً "PR" لمنتج)
    brand_short_name TEXT DEFAULT '', -- رمز الماركة المختصر (اختياري)
    organization_id UUID DEFAULT NULL -- معرف المؤسسة (اختياري)
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    year_code TEXT;
    sequential_number INTEGER;
    org_prefix TEXT := '';
    base_sku TEXT;
    final_sku TEXT;
    sku_exists BOOLEAN;
    max_attempts INTEGER := 10;
    attempts INTEGER := 0;
BEGIN
    -- استخراج السنة الحالية بصيغة YY
    year_code := to_char(now(), 'YY');
    
    -- تحديد بادئة المؤسسة (إذا كانت متوفرة)
    IF organization_id IS NOT NULL THEN
        SELECT UPPER(SUBSTRING(name, 1, 2)) INTO org_prefix 
        FROM organizations 
        WHERE id = organization_id;
        
        IF org_prefix IS NULL THEN
            org_prefix := '';
        END IF;
    END IF;
    
    -- تنظيف وتوحيد رمز الفئة
    IF category_short_name IS NULL OR category_short_name = '' THEN
        category_short_name := 'PR';
    ELSE
        category_short_name := UPPER(category_short_name);
    END IF;
    
    -- تنظيف وتوحيد رمز الماركة
    IF brand_short_name IS NOT NULL AND brand_short_name != '' THEN
        brand_short_name := '-' || UPPER(brand_short_name);
    ELSE
        brand_short_name := '';
    END IF;
    
    -- البحث عن آخر رقم تسلسلي مستخدم للمؤسسة أو بشكل عام
    IF organization_id IS NOT NULL THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '[0-9]+$') AS INTEGER)), 0) INTO sequential_number
        FROM products
        WHERE 
            organization_id = generate_unique_sku.organization_id
            AND sku LIKE category_short_name || brand_short_name || '-%';
    ELSE
        SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '[0-9]+$') AS INTEGER)), 0) INTO sequential_number
        FROM products
        WHERE sku LIKE category_short_name || brand_short_name || '-%';
    END IF;
    
    -- زيادة الرقم التسلسلي
    sequential_number := sequential_number + 1;
    
    -- توليد SKU بالتنسيق: [رمز المؤسسة][رمز الفئة][رمز الماركة]-[السنة]-[رقم تسلسلي]
    base_sku := org_prefix || category_short_name || brand_short_name || '-' || year_code || '-';
    final_sku := base_sku || LPAD(sequential_number::TEXT, 4, '0');
    
    -- التحقق من عدم وجود تكرار للSKU
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM products WHERE sku = final_sku
        ) INTO sku_exists;
        
        EXIT WHEN NOT sku_exists OR attempts >= max_attempts;
        
        -- زيادة الرقم التسلسلي والمحاولة مرة أخرى
        sequential_number := sequential_number + 1;
        final_sku := base_sku || LPAD(sequential_number::TEXT, 4, '0');
        attempts := attempts + 1;
    END LOOP;
    
    RETURN final_sku;
END;
$$;

-- وظيفة لتوليد باركود EAN-13 فريد
CREATE OR REPLACE FUNCTION public.generate_product_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefix TEXT := '200'; -- رمز الدولة (الجزائر)
    manufacturer_code TEXT;
    product_code TEXT;
    barcode_without_checksum TEXT;
    checksum INTEGER;
    barcode TEXT;
    barcode_exists BOOLEAN;
    max_attempts INTEGER := 10;
    attempts INTEGER := 0;
    sum_odd INTEGER;
    sum_even INTEGER;
BEGIN
    LOOP
        -- توليد رمز المصنّع (5 أرقام)
        manufacturer_code := LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
        
        -- توليد رمز المنتج (4 أرقام)
        product_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- دمج الرموز لتكوين 12 رقمًا (بدون رقم التحقق)
        barcode_without_checksum := prefix || manufacturer_code || product_code;
        
        -- حساب رقم التحقق باستخدام خوارزمية EAN-13
        sum_odd := 0;
        sum_even := 0;
        
        FOR i IN 1..12 LOOP
            IF i % 2 = 1 THEN
                sum_odd := sum_odd + CAST(SUBSTRING(barcode_without_checksum FROM i FOR 1) AS INTEGER);
            ELSE
                sum_even := sum_even + CAST(SUBSTRING(barcode_without_checksum FROM i FOR 1) AS INTEGER);
            END IF;
        END LOOP;
        
        checksum := (10 - ((sum_odd + (sum_even * 3)) % 10)) % 10;
        
        -- إضافة رقم التحقق للحصول على باركود كامل EAN-13
        barcode := barcode_without_checksum || checksum::TEXT;
        
        -- التحقق من عدم وجود تكرار للباركود
        SELECT EXISTS (
            SELECT 1 FROM products WHERE barcode = barcode
        ) INTO barcode_exists;
        
        EXIT WHEN NOT barcode_exists OR attempts >= max_attempts;
        attempts := attempts + 1;
    END LOOP;
    
    RETURN barcode;
END;
$$;

-- وظيفة لتوليد باركود خاص بمتغير المنتج (لون)
CREATE OR REPLACE FUNCTION public.generate_variant_barcode(
    product_id UUID,
    variant_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_barcode TEXT;
    variant_suffix TEXT;
    new_barcode TEXT;
    max_attempts INTEGER := 5;
    attempts INTEGER := 0;
    barcode_exists BOOLEAN;
BEGIN
    -- الحصول على باركود المنتج الأساسي
    SELECT barcode INTO product_barcode
    FROM products
    WHERE id = product_id;
    
    -- إذا لم يكن للمنتج باركود، قم بتوليد واحد
    IF product_barcode IS NULL OR product_barcode = '' THEN
        product_barcode := public.generate_product_barcode();
        
        -- تحديث المنتج بالباركود الجديد
        UPDATE products
        SET barcode = product_barcode
        WHERE id = product_id;
    END IF;
    
    -- توليد لاحقة للمتغير (2 أرقام)
    LOOP
        variant_suffix := LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');
        new_barcode := product_barcode || '-' || variant_suffix;
        
        -- التحقق من عدم وجود تكرار للباركود
        SELECT EXISTS (
            SELECT 1 FROM product_colors WHERE barcode = new_barcode
        ) INTO barcode_exists;
        
        EXIT WHEN NOT barcode_exists OR attempts >= max_attempts;
        attempts := attempts + 1;
    END LOOP;
    
    RETURN new_barcode;
END;
$$;

-- وظيفة للتحقق من صحة باركود EAN-13
CREATE OR REPLACE FUNCTION public.validate_barcode(
    barcode TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    barcode_length INTEGER;
    checksum INTEGER;
    calculated_checksum INTEGER;
    sum_odd INTEGER := 0;
    sum_even INTEGER := 0;
BEGIN
    -- التحقق من أن الباركود مكون من 13 رقمًا
    barcode_length := LENGTH(barcode);
    IF barcode_length != 13 OR NOT barcode ~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    -- استخراج رقم التحقق
    checksum := CAST(RIGHT(barcode, 1) AS INTEGER);
    
    -- حساب رقم التحقق المتوقع
    FOR i IN 1..12 LOOP
        IF i % 2 = 1 THEN
            sum_odd := sum_odd + CAST(SUBSTRING(barcode FROM i FOR 1) AS INTEGER);
        ELSE
            sum_even := sum_even + CAST(SUBSTRING(barcode FROM i FOR 1) AS INTEGER);
        END IF;
    END LOOP;
    
    calculated_checksum := (10 - ((sum_odd + (sum_even * 3)) % 10)) % 10;
    
    -- التحقق من تطابق رقم التحقق
    RETURN checksum = calculated_checksum;
END;
$$;

-- إضافة حقل barcode إلى جدول product_colors إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'product_colors' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE product_colors ADD COLUMN barcode TEXT;
    END IF;
END
$$;

-- إضافة حقل variant_number إلى جدول product_colors إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'product_colors' AND column_name = 'variant_number'
    ) THEN
        ALTER TABLE product_colors ADD COLUMN variant_number INTEGER;
    END IF;
END
$$; 