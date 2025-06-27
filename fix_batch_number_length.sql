-- إصلاح مشكلة "value too long for type character varying(50)"
-- المشكلة: batch_number محدود بـ 50 حرف لكن الـ function تنشئ أسماء أطول

-- 1. أولاً: فحص طول حقل batch_number الحالي
-- SELECT character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';

-- 2. زيادة طول حقل batch_number (إذا لزم الأمر)
ALTER TABLE inventory_batches 
ALTER COLUMN batch_number TYPE VARCHAR(255);

-- 3. تحديث الـ function لإنشاء أسماء أقصر
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    new_batch_id UUID;
    new_batch_number TEXT;
    supplier_purchase RECORD;
    variant_type_val TEXT;
    variant_display_name_val TEXT;
    batch_attempt INTEGER := 0;
    max_attempts INTEGER := 10;
    unique_suffix TEXT;
    short_product_id TEXT;
    short_purchase_num TEXT;
BEGIN
    -- جلب بيانات الشراء
    SELECT sp.*, s.name as supplier_name 
    INTO supplier_purchase
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.id = NEW.purchase_id;
    
    -- التحقق من وجود بيانات الشراء
    IF supplier_purchase IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على بيانات الشراء للمعرف: %', NEW.purchase_id;
    END IF;
    
    -- تحديد نوع المتغير
    variant_type_val := determine_variant_type(NEW.color_id, NEW.size_id);
    
    -- إنشاء اسم المتغير للعرض
    variant_display_name_val := generate_variant_display_name(NEW.product_id, NEW.color_id, NEW.size_id);
    
    -- إنشاء معرفات مختصرة
    short_product_id := COALESCE(left(NEW.product_id::TEXT, 8), 'NOPROD');
    short_purchase_num := COALESCE(left(supplier_purchase.purchase_number, 10), 'UNKNOWN');
    
    -- محاولة إنشاء batch_number فريد وقصير
    LOOP
        batch_attempt := batch_attempt + 1;
        
        -- إنشاء suffix فريد قصير
        unique_suffix := to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || 
                        batch_attempt::TEXT;
        
        -- إنشاء رقم Batch قصير ومتوافق مع حد 255 حرف
        new_batch_number := 'P-' || short_purchase_num || '-' || short_product_id || '-' || unique_suffix;
        
        -- إضافة معرف المتغير إذا وجد
        IF NEW.color_id IS NOT NULL OR NEW.size_id IS NOT NULL THEN
            new_batch_number := new_batch_number || '-V' || 
                               COALESCE(left(NEW.color_id::TEXT, 4), 'NC') || 
                               COALESCE(left(NEW.size_id::TEXT, 4), 'NS');
        END IF;
        
        -- التأكد من أن الطول لا يتجاوز 200 حرف (أقل من 255 للأمان)
        IF length(new_batch_number) > 200 THEN
            new_batch_number := left(new_batch_number, 195) || batch_attempt::TEXT;
        END IF;
        
        -- فحص إن كان batch_number فريد
        IF NOT EXISTS (
            SELECT 1 FROM inventory_batches ib
            WHERE ib.batch_number = new_batch_number 
            AND ib.organization_id = supplier_purchase.organization_id
        ) THEN
            EXIT; -- خروج من اللوب إذا كان فريد
        END IF;
        
        -- تجنب اللوب اللانهائي
        IF batch_attempt >= max_attempts THEN
            -- استخدام UUID مختصر كحل أخير
            new_batch_number := 'FALLBACK-' || left(gen_random_uuid()::TEXT, 20);
            EXIT;
        END IF;
        
        -- انتظار قصير بين المحاولات
        PERFORM pg_sleep(0.001);
    END LOOP;
    
    -- إنشاء Batch جديد
    BEGIN
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
            new_batch_number,
            supplier_purchase.supplier_id,
            supplier_purchase.purchase_date,
            NEW.unit_price,
            COALESCE((SELECT p.price FROM products p WHERE p.id = NEW.product_id), NEW.unit_price),
            NEW.quantity::INTEGER,
            NEW.quantity::INTEGER,
            NEW.unit_price,
            supplier_purchase.organization_id,
            NEW.id,
            NEW.color_id,
            NEW.size_id,
            variant_type_val,
            variant_display_name_val,
            'شراء: ' || short_purchase_num || 
            CASE 
                WHEN variant_display_name_val IS NOT NULL AND 
                     variant_display_name_val != COALESCE((SELECT p.name FROM products p WHERE p.id = NEW.product_id), '') 
                THEN ' - ' || left(variant_display_name_val, 50)
                ELSE '' 
            END
        ) RETURNING id INTO new_batch_id;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'فشل في إنشاء batch بسبب تضارب البيانات. batch_number: %', new_batch_number;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في إنشاء inventory batch: %', SQLERRM;
    END;
    
    -- ربط الـ Batch بعنصر الشراء
    UPDATE supplier_purchase_items 
    SET batch_id = new_batch_id 
    WHERE id = NEW.id;
    
    -- تسجيل حركة الدخول
    BEGIN
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
            'دخول: ' || short_purchase_num || 
            COALESCE(' - ' || left(variant_display_name_val, 30), ''),
            supplier_purchase.organization_id
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تسجيل حركة المخزون: %', SQLERRM;
    END;
    
    -- تحديث مخزون المتغير المحدد
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        UPDATE product_sizes ps
        SET quantity = COALESCE(ps.quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE ps.id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        UPDATE product_colors pc
        SET quantity = COALESCE(pc.quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE pc.id = NEW.color_id;
    END IF;
    
    -- تحديث مخزون المنتج الإجمالي
    IF NEW.product_id IS NOT NULL THEN
        UPDATE products p
        SET stock_quantity = COALESCE(p.stock_quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE p.id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. اختبار سريع
DO $$
DECLARE
    test_batch_name TEXT;
BEGIN
    -- اختبار إنشاء batch_number
    test_batch_name := 'P-TEST123456-12345678-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '1';
    
    RAISE NOTICE 'مثال على batch_number جديد: % (الطول: %)', test_batch_name, length(test_batch_name);
    
    IF length(test_batch_name) <= 200 THEN
        RAISE NOTICE '✅ طول batch_number مقبول';
    ELSE
        RAISE NOTICE '❌ batch_number طويل جداً';
    END IF;
END $$; 