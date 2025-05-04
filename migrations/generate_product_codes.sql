-- إضافة وظائف توليد رمز المنتج والباركود
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
        SELECT SUBSTRING(name FROM 1 FOR 2) INTO org_prefix 
        FROM organizations
        WHERE id = organization_id;
        
        -- إذا لم يتم العثور على المؤسسة، استخدم البادئة الافتراضية
        IF org_prefix IS NULL THEN
            org_prefix := 'OR';
        END IF;
    END IF;
    
    -- تنظيف وتوحيد رمز الفئة
    category_short_name := UPPER(REGEXP_REPLACE(category_short_name, '[^A-Za-z0-9]', '', 'g'));
    IF LENGTH(category_short_name) < 2 THEN
        category_short_name := RPAD(category_short_name, 2, 'X');
    ELSIF LENGTH(category_short_name) > 2 THEN
        category_short_name := SUBSTRING(category_short_name FROM 1 FOR 2);
    END IF;
    
    -- تنظيف وتوحيد رمز الماركة (إذا كان متوفرًا)
    IF brand_short_name IS NOT NULL AND brand_short_name != '' THEN
        brand_short_name := UPPER(REGEXP_REPLACE(brand_short_name, '[^A-Za-z0-9]', '', 'g'));
        IF LENGTH(brand_short_name) > 2 THEN
            brand_short_name := SUBSTRING(brand_short_name FROM 1 FOR 2);
        END IF;
        brand_short_name := '-' || brand_short_name;
    END IF;
    
    -- إنشاء القاعدة الأساسية للـ SKU
    base_sku := category_short_name || brand_short_name || '-' || year_code;
    
    -- حلقة لضمان فرادة SKU
    LOOP
        -- الحصول على الرقم التسلسلي التالي
        SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '.+-\d+$') AS INTEGER)), 0) + 1
        INTO sequential_number
        FROM products
        WHERE sku LIKE base_sku || '%';
        
        -- إنشاء SKU نهائي
        final_sku := base_sku || '-' || LPAD(sequential_number::TEXT, 4, '0');
        
        -- التحقق من وجود SKU
        SELECT EXISTS(SELECT 1 FROM products WHERE sku = final_sku) INTO sku_exists;
        
        -- الخروج من الحلقة إذا كان SKU فريدًا أو تجاوزنا الحد الأقصى للمحاولات
        EXIT WHEN NOT sku_exists OR attempts >= max_attempts;
        
        -- زيادة عداد المحاولات
        attempts := attempts + 1;
    END LOOP;
    
    -- التحقق من نجاح العملية
    IF attempts >= max_attempts AND sku_exists THEN
        RAISE EXCEPTION 'فشل في إنشاء SKU فريد بعد % محاولات', max_attempts;
    END IF;
    
    RETURN final_sku;
END;
$$;

-- وظيفة لتوليد باركود EAN-13 فريد للمنتج
CREATE OR REPLACE FUNCTION public.generate_product_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    barcode_prefix TEXT := '200'; -- بادئة الباركود (يمكن تغييرها)
    barcode_body TEXT;
    check_digit INTEGER;
    final_barcode TEXT;
    sum_odd INTEGER;
    sum_even INTEGER;
    barcode_exists BOOLEAN;
    max_attempts INTEGER := 10;
    attempts INTEGER := 0;
    
    -- تعريف المصفوفات اللازمة للتحقق من الرقم
    digit_array INTEGER[];
    weight_array INTEGER[] := ARRAY[1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
BEGIN
    -- حلقة لضمان فرادة الباركود
    LOOP
        -- إنشاء جسم الباركود (9 أرقام عشوائية)
        barcode_body := barcode_prefix || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
        
        -- تحويل النص إلى مصفوفة أرقام
        digit_array := ARRAY[]::INTEGER[];
        FOR i IN 1..LENGTH(barcode_body) LOOP
            digit_array := array_append(digit_array, SUBSTR(barcode_body, i, 1)::INTEGER);
        END LOOP;
        
        -- حساب مجموع الأرقام الفردية والزوجية (بناءً على خوارزمية EAN-13)
        sum_odd := 0;
        sum_even := 0;
        FOR i IN 1..12 LOOP
            IF i <= array_length(digit_array, 1) THEN
                IF i % 2 = 1 THEN -- الأرقام الفردية
                    sum_odd := sum_odd + digit_array[i];
                ELSE -- الأرقام الزوجية
                    sum_even := sum_even + digit_array[i];
                END IF;
            END IF;
        END LOOP;
        
        -- حساب رقم التحقق
        check_digit := (10 - ((sum_odd + sum_even * 3) % 10)) % 10;
        
        -- إنشاء الباركود النهائي
        final_barcode := barcode_body || check_digit::TEXT;
        
        -- التحقق من وجود الباركود
        SELECT EXISTS(SELECT 1 FROM products WHERE barcode = final_barcode) INTO barcode_exists;
        
        -- الخروج من الحلقة إذا كان الباركود فريدًا أو تجاوزنا الحد الأقصى للمحاولات
        EXIT WHEN NOT barcode_exists OR attempts >= max_attempts;
        
        -- زيادة عداد المحاولات
        attempts := attempts + 1;
    END LOOP;
    
    -- التحقق من نجاح العملية
    IF attempts >= max_attempts AND barcode_exists THEN
        RAISE EXCEPTION 'فشل في إنشاء باركود فريد بعد % محاولات', max_attempts;
    END IF;
    
    RETURN final_barcode;
END;
$$;

-- وظيفة لتوليد باركود فريد لمتغير المنتج (لون)
CREATE OR REPLACE FUNCTION public.generate_variant_barcode(
    product_id UUID,
    variant_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_barcode TEXT;
    variant_suffix TEXT;
    final_barcode TEXT;
    barcode_exists BOOLEAN;
    max_attempts INTEGER := 10;
    attempts INTEGER := 0;
BEGIN
    -- استخراج باركود المنتج الأساسي
    SELECT barcode INTO product_barcode FROM products WHERE id = product_id;
    
    -- إذا لم يكن للمنتج باركود، قم بإنشاء واحد
    IF product_barcode IS NULL OR product_barcode = '' THEN
        product_barcode := public.generate_product_barcode();
        
        -- تحديث باركود المنتج الأساسي
        UPDATE products SET barcode = product_barcode WHERE id = product_id;
    END IF;
    
    -- حلقة لضمان فرادة باركود المتغير
    LOOP
        -- إنشاء لاحقة فريدة (رقمين)
        variant_suffix := LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');
        
        -- إنشاء الباركود النهائي
        final_barcode := product_barcode || '-' || variant_suffix;
        
        -- التحقق من وجود الباركود في جدول ألوان المنتج
        SELECT EXISTS(
            SELECT 1 FROM product_colors WHERE barcode = final_barcode
        ) INTO barcode_exists;
        
        -- الخروج من الحلقة إذا كان الباركود فريدًا أو تجاوزنا الحد الأقصى للمحاولات
        EXIT WHEN NOT barcode_exists OR attempts >= max_attempts;
        
        -- زيادة عداد المحاولات
        attempts := attempts + 1;
    END LOOP;
    
    -- التحقق من نجاح العملية
    IF attempts >= max_attempts AND barcode_exists THEN
        RAISE EXCEPTION 'فشل في إنشاء باركود فريد للمتغير بعد % محاولات', max_attempts;
    END IF;
    
    RETURN final_barcode;
END;
$$;

-- وظيفة للتحقق من صحة الباركود
CREATE OR REPLACE FUNCTION public.validate_barcode(
    barcode TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    barcode_length INTEGER;
    check_digit INTEGER;
    calculated_check_digit INTEGER;
    sum_odd INTEGER := 0;
    sum_even INTEGER := 0;
    digit_array INTEGER[];
BEGIN
    -- التحقق من طول الباركود (13 رقمًا لـ EAN-13)
    barcode_length := LENGTH(barcode);
    IF barcode_length != 13 THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من أن الباركود يتكون من أرقام فقط
    IF barcode !~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    -- استخراج رقم التحقق
    check_digit := SUBSTR(barcode, 13, 1)::INTEGER;
    
    -- تحويل النص إلى مصفوفة أرقام
    digit_array := ARRAY[]::INTEGER[];
    FOR i IN 1..12 LOOP
        digit_array := array_append(digit_array, SUBSTR(barcode, i, 1)::INTEGER);
    END LOOP;
    
    -- حساب مجموع الأرقام الفردية والزوجية (بناءً على خوارزمية EAN-13)
    FOR i IN 1..12 LOOP
        IF i % 2 = 1 THEN -- الأرقام الفردية
            sum_odd := sum_odd + digit_array[i];
        ELSE -- الأرقام الزوجية
            sum_even := sum_even + digit_array[i];
        END IF;
    END LOOP;
    
    -- حساب رقم التحقق المتوقع
    calculated_check_digit := (10 - ((sum_odd + sum_even * 3) % 10)) % 10;
    
    -- التحقق من تطابق رقم التحقق
    RETURN check_digit = calculated_check_digit;
END;
$$;

-- تعديل جدول ألوان المنتجات لإضافة حقل الباركود
ALTER TABLE public.product_colors
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS variant_number INTEGER; 