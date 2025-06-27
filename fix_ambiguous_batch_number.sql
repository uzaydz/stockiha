-- إصلاح مشكلة "column reference batch_number is ambiguous"
-- المشكلة: في الـ function create_batch_from_purchase_item هناك تضارب في اسم batch_number

CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    new_batch_id UUID;
    new_batch_number TEXT;  -- تغيير اسم المتغير لتجنب التضارب
    supplier_purchase RECORD;
    variant_type_val TEXT;
    variant_display_name_val TEXT;
    batch_attempt INTEGER := 0;
    max_attempts INTEGER := 10;
    unique_suffix TEXT;
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
    
    -- محاولة إنشاء batch_number فريد
    LOOP
        batch_attempt := batch_attempt + 1;
        
        -- إنشاء suffix فريد باستخدام microseconds + attempt number + random
        unique_suffix := EXTRACT(epoch FROM clock_timestamp())::TEXT || 
                        '-' || batch_attempt::TEXT || 
                        '-' || (random() * 1000)::INTEGER::TEXT;
        
        -- إنشاء رقم Batch فريد (استخدام new_batch_number بدلاً من batch_number)
        new_batch_number := 'PURCHASE-' || 
                           COALESCE(supplier_purchase.purchase_number, 'UNKNOWN') || '-' || 
                           COALESCE(NEW.product_id::TEXT, 'NO-PRODUCT') || '-' ||
                           COALESCE(NEW.color_id::TEXT, 'NO-COLOR') || '-' ||
                           COALESCE(NEW.size_id::TEXT, 'NO-SIZE') || '-' ||
                           unique_suffix;
        
        -- قطع الاسم إذا كان طويلاً جداً (PostgreSQL limit)
        IF length(new_batch_number) > 255 THEN
            new_batch_number := left(new_batch_number, 250) || batch_attempt::TEXT;
        END IF;
        
        -- فحص إن كان batch_number فريد (استخدام ib.batch_number للوضوح)
        IF NOT EXISTS (
            SELECT 1 FROM inventory_batches ib
            WHERE ib.batch_number = new_batch_number 
            AND ib.organization_id = supplier_purchase.organization_id
        ) THEN
            EXIT; -- خروج من اللوب إذا كان فريد
        END IF;
        
        -- تجنب اللوب اللانهائي
        IF batch_attempt >= max_attempts THEN
            -- استخدام UUID كحل أخير
            new_batch_number := 'PURCHASE-FALLBACK-' || gen_random_uuid()::TEXT;
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
            new_batch_number,  -- استخدام new_batch_number
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
            'تم إنشاؤه تلقائياً من فاتورة الشراء رقم: ' || 
            COALESCE(supplier_purchase.purchase_number, 'غير محدد') || 
            CASE 
                WHEN variant_display_name_val IS NOT NULL AND 
                     variant_display_name_val != COALESCE((SELECT p.name FROM products p WHERE p.id = NEW.product_id), '') 
                THEN ' - المتغير: ' || variant_display_name_val 
                ELSE '' 
            END
        ) RETURNING id INTO new_batch_id;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'فشل في إنشاء batch بسبب تضارب البيانات. batch_number: %, organization_id: %', 
                           new_batch_number, supplier_purchase.organization_id;
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
            'دخول مخزون من الشراء رقم: ' || 
            COALESCE(supplier_purchase.purchase_number, 'غير محدد') || 
            COALESCE(' - ' || variant_display_name_val, ''),
            supplier_purchase.organization_id
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تسجيل حركة المخزون: %', SQLERRM;
    END;
    
    -- تحديث مخزون المتغير المحدد
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        -- تحديث مخزون المقاس
        UPDATE product_sizes ps
        SET quantity = COALESCE(ps.quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE ps.id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        -- تحديث مخزون اللون
        UPDATE product_colors pc
        SET quantity = COALESCE(pc.quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE pc.id = NEW.color_id;
    END IF;
    
    -- تحديث مخزون المنتج الإجمالي أيضاً
    IF NEW.product_id IS NOT NULL THEN
        UPDATE products p
        SET stock_quantity = COALESCE(p.stock_quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE p.id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- اختبار سريع للتأكد من عمل الـ function
DO $$
BEGIN
    RAISE NOTICE 'تم تحديث function create_batch_from_purchase_item بنجاح لحل مشكلة batch_number ambiguous';
END $$; 