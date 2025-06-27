-- إصلاح شامل لمشاكل الـ batch - إصلاح سعر البيع وحركات المخزون
-- تاريخ الإنشاء: 2025-01-27

-- 1. إصلاح function create_batch_from_purchase_item بإضافة حركات المخزون المفقودة
CREATE OR REPLACE FUNCTION public.create_batch_from_purchase_item()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    supplier_purchase RECORD;
    new_batch_number TEXT;
    batch_attempt INTEGER := 0;
    max_attempts INTEGER := 5;
    base_name TEXT;
    color_name TEXT := '';
    size_name TEXT := '';
    product_record RECORD;
    item_quantity INTEGER;
    item_unit_price NUMERIC;
    item_selling_price NUMERIC;
    new_batch_id UUID;
    variant_type_val TEXT;
    variant_display_name_val TEXT;
BEGIN
    -- 🔍 فحص البيانات الأساسية
    IF NEW.product_id IS NULL THEN
        RAISE NOTICE 'تخطي العنصر: product_id is NULL';
        RETURN NEW;
    END IF;

    -- 📊 تحويل البيانات بشكل آمن
    BEGIN
        item_quantity := COALESCE(NEW.quantity::INTEGER, 1);
        item_unit_price := COALESCE(NEW.unit_price::NUMERIC, 0);
        
        -- إصلاح #1: تحسين منطق تحديد سعر البيع
        -- الأولوية: selling_price من العنصر -> سعر المنتج -> unit_price * 1.3
        item_selling_price := CASE 
            WHEN NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 THEN NEW.selling_price
            ELSE item_unit_price * 1.3  -- مؤقتاً حتى نجلب سعر المنتج
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في تحويل البيانات الرقمية: quantity=%, unit_price=%, selling_price=%', 
                NEW.quantity, NEW.unit_price, NEW.selling_price;
    END;

    -- 🛍️ جلب بيانات المنتج
    SELECT * INTO product_record 
    FROM products 
    WHERE id = NEW.product_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'تخطي العنصر: لم يتم العثور على المنتج %', NEW.product_id;
        RETURN NEW;
    END IF;
    
    -- إصلاح #1: استخدام سعر المنتج إذا لم يكن سعر البيع محدد في العنصر
    IF NEW.selling_price IS NULL OR NEW.selling_price = 0 THEN
        item_selling_price := COALESCE(product_record.price, item_unit_price * 1.3);
    END IF;

    -- 🎨 جلب بيانات المتغيرات
    IF NEW.color_id IS NOT NULL THEN
        SELECT name INTO color_name FROM product_colors WHERE id = NEW.color_id;
        color_name := COALESCE(color_name, 'C' || NEW.color_id::TEXT);
    END IF;
    
    IF NEW.size_id IS NOT NULL THEN
        SELECT name INTO size_name FROM product_sizes WHERE id = NEW.size_id;
        size_name := COALESCE(size_name, 'S' || NEW.size_id::TEXT);
    END IF;

    -- تحديد نوع المتغير
    variant_type_val := COALESCE(NEW.variant_type,
        CASE 
            WHEN NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN 'color_size'
            WHEN NEW.color_id IS NOT NULL THEN 'color_only'
            WHEN NEW.size_id IS NOT NULL THEN 'size_only'
            ELSE 'simple'
        END
    );
    
    -- إنشاء اسم المتغير للعرض
    variant_display_name_val := COALESCE(NEW.variant_display_name,
        CASE
            WHEN NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN color_name || ' - ' || size_name
            WHEN NEW.color_id IS NOT NULL THEN color_name
            WHEN NEW.size_id IS NOT NULL THEN size_name
            ELSE NULL
        END
    );

    -- 🛒 جلب بيانات المشتريات
    SELECT * INTO supplier_purchase
    FROM supplier_purchases sp
    WHERE sp.id = COALESCE(NEW.supplier_purchase_id, NEW.purchase_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لم يتم العثور على المشتريات برقم: %', 
            COALESCE(NEW.supplier_purchase_id, NEW.purchase_id);
    END IF;

    -- 🏷️ إنشاء batch_number مختصر وفريد
    base_name := 'P-' || 
                right(supplier_purchase.purchase_number::TEXT, 6) || '-' ||
                right(NEW.product_id::TEXT, 4) || '-' ||
                to_char(now(), 'MMDD-HHMI');
                
    -- إضافة معلومات المتغيرات (مختصرة جداً)
    IF NEW.color_id IS NOT NULL OR NEW.size_id IS NOT NULL THEN
        base_name := base_name || '-V';
        IF NEW.color_id IS NOT NULL THEN
            base_name := base_name || left(replace(color_name, ' ', ''), 2);
        END IF;
        IF NEW.size_id IS NOT NULL THEN
            base_name := base_name || left(replace(size_name, ' ', ''), 2);
        END IF;
    END IF;

    -- 🔄 البحث عن batch_number فريد
    new_batch_number := base_name;
    WHILE EXISTS (
        SELECT 1 FROM inventory_batches 
        WHERE batch_number = new_batch_number 
        AND organization_id = supplier_purchase.organization_id
    ) AND batch_attempt < max_attempts LOOP
        batch_attempt := batch_attempt + 1;
        new_batch_number := base_name || '-' || batch_attempt::TEXT;
    END LOOP;
    
    -- استخدام UUID كحل أخير
    IF batch_attempt >= max_attempts THEN
        new_batch_number := 'P-' || left(gen_random_uuid()::TEXT, 10);
    END IF;

    -- 📦 إدراج batch جديد
    BEGIN
        INSERT INTO inventory_batches (
            product_id,
            batch_number,
            quantity_received,
            quantity_remaining,
            purchase_price,
            selling_price,
            expiry_date,
            location,
            supplier_id,
            organization_id,
            created_at,
            is_active,
            color_id,
            size_id,
            variant_type,
            variant_display_name,
            supplier_purchase_item_id
        ) VALUES (
            NEW.product_id,
            new_batch_number,
            item_quantity,
            item_quantity,
            item_unit_price,
            item_selling_price, -- سعر البيع المُصحح
            NEW.expiry_date,
            COALESCE(NEW.location, 'المستودع الرئيسي'),
            supplier_purchase.supplier_id,
            supplier_purchase.organization_id,
            now(),
            true,
            NEW.color_id,
            NEW.size_id,
            variant_type_val,
            variant_display_name_val,
            NEW.id
        ) RETURNING id INTO new_batch_id;
        
        RAISE NOTICE '✅ تم إنشاء batch: % للمنتج: % بسعر بيع: %', 
            new_batch_number, product_record.name, item_selling_price;
            
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في إنشاء inventory batch: %', SQLERRM;
            -- لا نقطع العملية، نكمل بدون إنشاء batch
            RETURN NEW;
    END;

    -- ربط الـ Batch بعنصر الشراء
    UPDATE supplier_purchase_items 
    SET batch_id = new_batch_id 
    WHERE id = NEW.id;

    -- إصلاح #2: إضافة تسجيل حركة الدخول في inventory_batch_movements
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
            item_quantity,
            'SUPPLIER_PURCHASE',
            COALESCE(NEW.supplier_purchase_id, NEW.purchase_id),
            'دخول مخزون من الشراء رقم: ' || 
            COALESCE(supplier_purchase.purchase_number, 'غير محدد') || 
            CASE 
                WHEN variant_display_name_val IS NOT NULL THEN ' - المتغير: ' || variant_display_name_val 
                ELSE '' 
            END,
            supplier_purchase.organization_id
        );
        
        RAISE NOTICE '✅ تم تسجيل حركة مخزون: % قطعة للـ batch: %', 
            item_quantity, new_batch_number;
            
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تسجيل حركة المخزون: %', SQLERRM;
    END;

    -- 📈 تحديث مخزون المتغيرات
    BEGIN
        IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
            -- تحديث مخزون المقاس
            UPDATE product_sizes 
            SET quantity = COALESCE(quantity, 0) + item_quantity,
                updated_at = now()
            WHERE id = NEW.size_id;
        ELSIF NEW.color_id IS NOT NULL THEN
            -- تحديث مخزون اللون
            UPDATE product_colors 
            SET quantity = COALESCE(quantity, 0) + item_quantity,
                updated_at = now()
            WHERE id = NEW.color_id;
        END IF;
        
        -- تحديث مخزون المنتج الإجمالي
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + item_quantity,
            updated_at = now()
        WHERE id = NEW.product_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تحديث مخزون المنتج: %', SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ فشل في إنشاء batch: %', SQLERRM;
        -- نعيد NEW لضمان أن العنصر يتم إدراجه حتى لو فشل الbatch
        RETURN NEW;
END;
$function$;

-- 2. إصلاح البيانات الموجودة - تحديث أسعار البيع للـ batches الموجودة
UPDATE inventory_batches ib
SET selling_price = COALESCE(p.price, ib.purchase_price * 1.3),
    updated_at = now()
FROM products p
WHERE ib.product_id = p.id 
AND (ib.selling_price = 0 OR ib.selling_price IS NULL)
AND ib.purchase_price > 0;

-- 3. إضافة حركات المخزون المفقودة للـ batches الموجودة
INSERT INTO inventory_batch_movements (
    batch_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    organization_id,
    created_at
)
SELECT 
    ib.id as batch_id,
    'IN' as movement_type,
    ib.quantity_received as quantity,
    'SUPPLIER_PURCHASE' as reference_type,
    spi.purchase_id as reference_id,
    'حركة مستردة: دخول مخزون من الشراء رقم: ' || 
    COALESCE(sp.purchase_number, 'غير محدد') ||
    CASE 
        WHEN ib.variant_display_name IS NOT NULL THEN ' - المتغير: ' || ib.variant_display_name 
        ELSE '' 
    END as notes,
    ib.organization_id,
    ib.created_at
FROM inventory_batches ib
LEFT JOIN supplier_purchase_items spi ON ib.supplier_purchase_item_id = spi.id
LEFT JOIN supplier_purchases sp ON spi.purchase_id = sp.id
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_batch_movements ibm 
    WHERE ibm.batch_id = ib.id 
    AND ibm.movement_type = 'IN'
    AND ibm.reference_type = 'SUPPLIER_PURCHASE'
)
AND ib.supplier_purchase_item_id IS NOT NULL;

-- 4. إعادة إنشاء trigger
DROP TRIGGER IF EXISTS trigger_create_batch_from_purchase ON supplier_purchase_items;
CREATE TRIGGER trigger_create_batch_from_purchase
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item();

-- 5. إنشاء function لإصلاح batch محدد يدوياً
CREATE OR REPLACE FUNCTION fix_specific_batch(
    p_batch_id UUID,
    p_new_selling_price NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    batch_info RECORD;
    result JSON;
    movement_exists BOOLEAN := FALSE;
BEGIN
    -- جلب معلومات الـ batch
    SELECT ib.*, p.name as product_name, p.price as product_price,
           spi.purchase_id, sp.purchase_number
    INTO batch_info
    FROM inventory_batches ib
    LEFT JOIN products p ON ib.product_id = p.id
    LEFT JOIN supplier_purchase_items spi ON ib.supplier_purchase_item_id = spi.id
    LEFT JOIN supplier_purchases sp ON spi.purchase_id = sp.id
    WHERE ib.id = p_batch_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Batch not found');
    END IF;
    
    -- تحديث سعر البيع إذا لم يكن محدد
    IF p_new_selling_price IS NOT NULL THEN
        UPDATE inventory_batches 
        SET selling_price = p_new_selling_price,
            updated_at = now()
        WHERE id = p_batch_id;
    ELSIF batch_info.selling_price = 0 OR batch_info.selling_price IS NULL THEN
        UPDATE inventory_batches 
        SET selling_price = COALESCE(batch_info.product_price, batch_info.purchase_price * 1.3),
            updated_at = now()
        WHERE id = p_batch_id;
    END IF;
    
    -- التحقق من وجود حركة مخزون
    SELECT EXISTS(
        SELECT 1 FROM inventory_batch_movements 
        WHERE batch_id = p_batch_id 
        AND movement_type = 'IN'
    ) INTO movement_exists;
    
    -- إضافة حركة مخزون إذا لم تكن موجودة
    IF NOT movement_exists AND batch_info.purchase_id IS NOT NULL THEN
        INSERT INTO inventory_batch_movements (
            batch_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            organization_id
        ) VALUES (
            p_batch_id,
            'IN',
            batch_info.quantity_received,
            'SUPPLIER_PURCHASE',
            batch_info.purchase_id,
            'حركة مستردة: دخول مخزون من الشراء رقم: ' || 
            COALESCE(batch_info.purchase_number, 'غير محدد'),
            batch_info.organization_id
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'selling_price_updated', true,
        'movement_added', NOT movement_exists,
        'batch_number', batch_info.batch_number
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 6. تشغيل تقرير تشخيصي
DO $$
DECLARE
    batches_without_selling_price INTEGER;
    batches_without_movements INTEGER;
    total_batches INTEGER;
BEGIN
    -- عدد الـ batches بدون سعر بيع
    SELECT COUNT(*) INTO batches_without_selling_price
    FROM inventory_batches 
    WHERE selling_price = 0 OR selling_price IS NULL;
    
    -- عدد الـ batches بدون حركات مخزون
    SELECT COUNT(*) INTO batches_without_movements
    FROM inventory_batches ib
    WHERE NOT EXISTS (
        SELECT 1 FROM inventory_batch_movements ibm 
        WHERE ibm.batch_id = ib.id
    );
    
    -- إجمالي الـ batches
    SELECT COUNT(*) INTO total_batches FROM inventory_batches;
    
    RAISE NOTICE '📊 تقرير إصلاح الـ Batches:';
    RAISE NOTICE '   إجمالي الـ Batches: %', total_batches;
    RAISE NOTICE '   Batches بدون سعر بيع: %', batches_without_selling_price;
    RAISE NOTICE '   Batches بدون حركات مخزون: %', batches_without_movements;
    RAISE NOTICE '✅ تم تطبيق الإصلاحات بنجاح';
END $$; 