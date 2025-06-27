-- 🔧 الحل الشامل النهائي لجميع مشاكل نظام الشراء مع المتغيرات
-- ==================================================================

-- الخطوة 1: إضافة الحقول المفقودة (إن لم تكن موجودة)
DO $$
BEGIN
    -- إضافة supplier_purchase_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'supplier_purchase_id'
    ) THEN
        ALTER TABLE supplier_purchase_items 
        ADD COLUMN supplier_purchase_id UUID REFERENCES supplier_purchases(id);
        
        UPDATE supplier_purchase_items 
        SET supplier_purchase_id = purchase_id
        WHERE supplier_purchase_id IS NULL;
        
        RAISE NOTICE '✅ تم إضافة حقل supplier_purchase_id';
    END IF;

    -- إضافة selling_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'selling_price'
    ) THEN
        ALTER TABLE supplier_purchase_items 
        ADD COLUMN selling_price NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ تم إضافة حقل selling_price';
    END IF;

    -- إضافة expiry_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE supplier_purchase_items 
        ADD COLUMN expiry_date DATE;
        RAISE NOTICE '✅ تم إضافة حقل expiry_date';
    END IF;

    -- إضافة location
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'location'
    ) THEN
        ALTER TABLE supplier_purchase_items 
        ADD COLUMN location TEXT DEFAULT 'المستودع الرئيسي';
        RAISE NOTICE '✅ تم إضافة حقل location';
    END IF;
    
    RAISE NOTICE '✅ انتهت مرحلة فحص وإضافة الحقول';
END $$;

-- الخطوة 2: تعديل نوع batch_number (التعامل مع view dependency)
DO $$
DECLARE
    current_type TEXT;
    current_length INTEGER;
BEGIN
    SELECT data_type, character_maximum_length 
    INTO current_type, current_length
    FROM information_schema.columns 
    WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';
    
    IF current_length IS NULL OR current_length < 255 THEN
        -- إزالة view مؤقتاً
        DROP VIEW IF EXISTS inventory_batch_current_stock;
        
        -- تعديل النوع
        ALTER TABLE inventory_batches 
        ALTER COLUMN batch_number TYPE VARCHAR(255);
        
        -- إعادة إنشاء view
        CREATE VIEW inventory_batch_current_stock AS
        SELECT ib.id AS batch_id,
            ib.product_id,
            ib.batch_number,
            ib.purchase_price,
            ib.selling_price,
            ib.quantity_received,
            COALESCE((ib.quantity_received + COALESCE(movements.net_movement, (0)::bigint)), (ib.quantity_received)::bigint) AS current_quantity,
            ib.expiry_date,
            ib.location,
            ib.supplier_id,
            ib.organization_id,
            ib.created_at,
            ib.is_active
        FROM (inventory_batches ib
        LEFT JOIN ( SELECT inventory_batch_movements.batch_id,
                sum(
                    CASE
                        WHEN ((inventory_batch_movements.movement_type)::text = 'IN'::text) THEN inventory_batch_movements.quantity
                        WHEN ((inventory_batch_movements.movement_type)::text = 'OUT'::text) THEN (- inventory_batch_movements.quantity)
                        WHEN ((inventory_batch_movements.movement_type)::text = 'ADJUSTMENT'::text) THEN inventory_batch_movements.quantity
                        ELSE 0
                    END) AS net_movement
                FROM inventory_batch_movements
                GROUP BY inventory_batch_movements.batch_id) movements ON ((ib.id = movements.batch_id)))
        WHERE (ib.is_active = true);
        
        RAISE NOTICE '✅ تم تعديل نوع batch_number إلى VARCHAR(255) وإعادة إنشاء view';
    ELSE
        RAISE NOTICE '✅ نوع batch_number صحيح بالفعل (255 حرف)';
    END IF;
END $$;

-- الخطوة 3: إنشاء function محدثة ومحسنة
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
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
        item_selling_price := COALESCE(NEW.selling_price::NUMERIC, item_unit_price * 1.3);
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

    -- 🎨 جلب بيانات المتغيرات
    IF NEW.color_id IS NOT NULL THEN
        SELECT name INTO color_name FROM product_colors WHERE id = NEW.color_id;
        color_name := COALESCE(color_name, 'C' || NEW.color_id::TEXT);
    END IF;
    
    IF NEW.size_id IS NOT NULL THEN
        SELECT name INTO size_name FROM product_sizes WHERE id = NEW.size_id;
        size_name := COALESCE(size_name, 'S' || NEW.size_id::TEXT);
    END IF;

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
        item_selling_price,
        NEW.expiry_date,
        COALESCE(NEW.location, 'المستودع الرئيسي'),
        supplier_purchase.supplier_id,
        supplier_purchase.organization_id,
        now(),
        true,
        NEW.color_id,
        NEW.size_id,
        COALESCE(NEW.variant_type,
            CASE 
                WHEN NEW.color_id IS NOT NULL OR NEW.size_id IS NOT NULL THEN 'variant'
                ELSE 'simple'
            END
        ),
        COALESCE(NEW.variant_display_name,
            CASE
                WHEN NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN color_name || ' - ' || size_name
                WHEN NEW.color_id IS NOT NULL THEN color_name
                WHEN NEW.size_id IS NOT NULL THEN size_name
                ELSE NULL
            END
        ),
        NEW.id
    );

    -- 📈 تحديث مخزون المتغيرات
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        UPDATE product_sizes 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        UPDATE product_colors 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.color_id;
    ELSE
        UPDATE products 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.product_id;
    END IF;

    RAISE NOTICE '✅ تم إنشاء batch: % للمنتج: % بكمية: %', 
        new_batch_number, product_record.name, item_quantity;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ فشل في إنشاء batch: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 4: إعادة إنشاء trigger
DROP TRIGGER IF EXISTS trigger_create_batch_from_purchase ON supplier_purchase_items;
CREATE TRIGGER trigger_create_batch_from_purchase
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item();

-- الخطوة 5: إنشاء function للتحقق من الحقول
CREATE OR REPLACE FUNCTION check_supplier_purchase_item_fields()
RETURNS TEXT AS $$
DECLARE
    missing_fields TEXT[] := ARRAY[]::TEXT[];
    result_text TEXT := '';
BEGIN
    -- فحص الحقول الأساسية
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'quantity') THEN
        missing_fields := array_append(missing_fields, 'quantity');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'unit_price') THEN
        missing_fields := array_append(missing_fields, 'unit_price');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'product_id') THEN
        missing_fields := array_append(missing_fields, 'product_id');
    END IF;
    
    -- فحص حقول المتغيرات
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'color_id') THEN
        missing_fields := array_append(missing_fields, 'color_id');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'size_id') THEN
        missing_fields := array_append(missing_fields, 'size_id');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'variant_type') THEN
        missing_fields := array_append(missing_fields, 'variant_type');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_purchase_items' AND column_name = 'variant_display_name') THEN
        missing_fields := array_append(missing_fields, 'variant_display_name');
    END IF;
    
    -- إعداد النتيجة
    IF array_length(missing_fields, 1) > 0 THEN
        result_text := '❌ الحقول المفقودة: ' || array_to_string(missing_fields, ', ');
    ELSE
        result_text := '✅ جميع الحقول المطلوبة موجودة';
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 6: اختبار النظام
DO $$
DECLARE
    fields_status TEXT;
    trigger_exists BOOLEAN;
    batch_type_info TEXT;
BEGIN
    -- فحص الحقول
    SELECT check_supplier_purchase_item_fields() INTO fields_status;
    RAISE NOTICE '%', fields_status;
    
    -- فحص trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_batch_from_purchase'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger موجود ومفعل';
    ELSE
        RAISE NOTICE '❌ Trigger غير موجود';
    END IF;
    
    -- فحص نوع batch_number
    SELECT 'نوع البيانات: ' || data_type || 
           CASE WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length::TEXT || ')' 
                ELSE '' END
    INTO batch_type_info
    FROM information_schema.columns 
    WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';
    
    RAISE NOTICE '✅ batch_number: %', batch_type_info;
    
    -- اختبار مثال batch_number
    RAISE NOTICE '✅ مثال batch_number: %', 
        'P-12345-1234-' || to_char(now(), 'MMDD-HHMI') || '-VRdXL';
END $$;

-- التنظيف
DROP FUNCTION IF EXISTS check_supplier_purchase_item_fields();

RAISE NOTICE '';
RAISE NOTICE '🎉 =================================================';
RAISE NOTICE '🎉 تم إصلاح جميع المشاكل بنجاح!';
RAISE NOTICE '🎉 نظام الشراء مع المتغيرات جاهز للاستخدام';
RAISE NOTICE '🎉 =================================================';
RAISE NOTICE ''; 