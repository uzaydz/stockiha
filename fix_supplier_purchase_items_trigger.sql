-- إصلاح مشكلة تضارب batch_number في trigger المشتريات
-- المشكلة: unique constraint على (batch_number, organization_id) يسبب فشل الإدراج
-- الحل: إضافة آلية retry وtimestamp أكثر دقة

-- 1. إنشاء function محدثة مع آلية retry
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    new_batch_id UUID;
    batch_number TEXT;
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
        
        -- إنشاء رقم Batch فريد
        batch_number := 'PURCHASE-' || 
                       COALESCE(supplier_purchase.purchase_number, 'UNKNOWN') || '-' || 
                       COALESCE(NEW.product_id::TEXT, 'NO-PRODUCT') || '-' ||
                       COALESCE(NEW.color_id::TEXT, 'NO-COLOR') || '-' ||
                       COALESCE(NEW.size_id::TEXT, 'NO-SIZE') || '-' ||
                       unique_suffix;
        
        -- قطع الاسم إذا كان طويلاً جداً (PostgreSQL limit)
        IF length(batch_number) > 255 THEN
            batch_number := left(batch_number, 250) || batch_attempt::TEXT;
        END IF;
        
        -- فحص إن كان batch_number فريد
        IF NOT EXISTS (
            SELECT 1 FROM inventory_batches 
            WHERE batch_number = batch_number 
            AND organization_id = supplier_purchase.organization_id
        ) THEN
            EXIT; -- خروج من اللوب إذا كان فريد
        END IF;
        
        -- تجنب اللوب اللانهائي
        IF batch_attempt >= max_attempts THEN
            -- استخدام UUID كحل أخير
            batch_number := 'PURCHASE-FALLBACK-' || gen_random_uuid()::TEXT;
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
            'تم إنشاؤه تلقائياً من فاتورة الشراء رقم: ' || 
            COALESCE(supplier_purchase.purchase_number, 'غير محدد') || 
            CASE 
                WHEN variant_display_name_val IS NOT NULL AND 
                     variant_display_name_val != COALESCE((SELECT name FROM products WHERE id = NEW.product_id), '') 
                THEN ' - المتغير: ' || variant_display_name_val 
                ELSE '' 
            END
        ) RETURNING id INTO new_batch_id;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'فشل في إنشاء batch بسبب تضارب البيانات. batch_number: %, organization_id: %', 
                           batch_number, supplier_purchase.organization_id;
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
        UPDATE product_sizes 
        SET quantity = COALESCE(quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        -- تحديث مخزون اللون
        UPDATE product_colors 
        SET quantity = COALESCE(quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE id = NEW.color_id;
    END IF;
    
    -- تحديث مخزون المنتج الإجمالي أيضاً
    IF NEW.product_id IS NOT NULL THEN
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity::INTEGER,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. إضافة function للتنظيف (اختياري)
CREATE OR REPLACE FUNCTION cleanup_duplicate_batches()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- حذف batches مكررة (إن وجدت)
    WITH duplicate_batches AS (
        SELECT id, 
               ROW_NUMBER() OVER (
                   PARTITION BY batch_number, organization_id 
                   ORDER BY created_at DESC
               ) as rn
        FROM inventory_batches
        WHERE batch_number LIKE 'PURCHASE-%'
    )
    DELETE FROM inventory_batches 
    WHERE id IN (
        SELECT id FROM duplicate_batches WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء function لاختبار النظام
CREATE OR REPLACE FUNCTION test_supplier_purchase_with_variants(
    p_organization_id UUID,
    p_supplier_id UUID,
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_unit_price DECIMAL DEFAULT 100.00
)
RETURNS JSON AS $$
DECLARE
    purchase_id UUID;
    item_id UUID;
    result JSON;
BEGIN
    -- إنشاء شراء اختبار
    INSERT INTO supplier_purchases (
        purchase_number,
        supplier_id,
        purchase_date,
        total_amount,
        paid_amount,
        status,
        organization_id
    ) VALUES (
        'TEST-' || EXTRACT(epoch FROM NOW())::TEXT,
        p_supplier_id,
        NOW(),
        p_quantity * p_unit_price,
        0,
        'confirmed',
        p_organization_id
    ) RETURNING id INTO purchase_id;
    
    -- إنشاء عنصر شراء
    INSERT INTO supplier_purchase_items (
        purchase_id,
        product_id,
        description,
        quantity,
        unit_price,
        tax_rate,
        variant_type
    ) VALUES (
        purchase_id,
        p_product_id,
        'اختبار منتج - ' || (SELECT name FROM products WHERE id = p_product_id),
        p_quantity,
        p_unit_price,
        0,
        'simple'
    ) RETURNING id INTO item_id;
    
    -- جمع النتائج
    SELECT json_build_object(
        'success', true,
        'purchase_id', purchase_id,
        'item_id', item_id,
        'batch_created', EXISTS(
            SELECT 1 FROM inventory_batches 
            WHERE supplier_purchase_item_id = item_id
        ),
        'movement_logged', EXISTS(
            SELECT 1 FROM inventory_batch_movements 
            WHERE reference_id = purchase_id 
            AND reference_type = 'SUPPLIER_PURCHASE'
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- 4. تشغيل اختبار تشخيصي
DO $$
DECLARE
    test_result JSON;
    sample_org_id UUID;
    sample_supplier_id UUID;
    sample_product_id UUID;
BEGIN
    -- جلب بيانات عينة للاختبار
    SELECT id INTO sample_org_id FROM (
        SELECT DISTINCT organization_id as id 
        FROM products 
        WHERE organization_id IS NOT NULL 
        LIMIT 1
    ) t;
    
    SELECT id INTO sample_supplier_id FROM suppliers 
    WHERE organization_id = sample_org_id 
    LIMIT 1;
    
    SELECT id INTO sample_product_id FROM products 
    WHERE organization_id = sample_org_id 
    LIMIT 1;
    
    IF sample_org_id IS NOT NULL AND sample_supplier_id IS NOT NULL AND sample_product_id IS NOT NULL THEN
        -- تشغيل اختبار
        SELECT test_supplier_purchase_with_variants(
            sample_org_id,
            sample_supplier_id, 
            sample_product_id,
            1,
            150.00
        ) INTO test_result;
        
        RAISE NOTICE 'نتيجة الاختبار: %', test_result;
    ELSE
        RAISE NOTICE 'لم يتم العثور على بيانات كافية للاختبار';
        RAISE NOTICE 'Organization: %, Supplier: %, Product: %', 
                    sample_org_id, sample_supplier_id, sample_product_id;
    END IF;
END;
$$;

-- تعليقات الإصلاح:
-- تم إصلاح المشاكل التالية:
-- 1. تضارب batch_number عبر إضافة microseconds و random number
-- 2. إضافة آلية retry مع حد أقصى للمحاولات
-- 3. إضافة معالجة أفضل للأخطاء
-- 4. إضافة NULL checks لتجنب errors
-- 5. إضافة function اختبار للتحقق من عمل النظام 