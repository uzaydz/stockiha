-- إصلاح شامل لنظام الشراء مع دعم المتغيرات
-- تحديد المشاكل الرئيسية وحلها

-- الخطوة 1: إضافة الحقول المفقودة إلى supplier_purchase_items
DO $$
BEGIN
    -- إضافة supplier_purchase_id (الاسم الصحيح)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'supplier_purchase_id'
    ) THEN
        ALTER TABLE supplier_purchase_items 
        ADD COLUMN supplier_purchase_id UUID REFERENCES supplier_purchases(id);
        
        -- ربط البيانات الموجودة
        UPDATE supplier_purchase_items 
        SET supplier_purchase_id = purchase_id;
        
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
END $$;

-- الخطوة 2: تعديل نوع batch_number في inventory_batches (التعامل مع view)
DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- فحص النوع الحالي
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';
    
    IF current_type != 'character varying' THEN
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
        
        RAISE NOTICE '✅ تم تعديل نوع batch_number وإعادة إنشاء view';
    ELSE
        RAISE NOTICE '✅ نوع batch_number صحيح بالفعل';
    END IF;
END $$;

-- الخطوة 3: إنشاء function محدثة لإنشاء batches
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    supplier_purchase RECORD;
    new_batch_number TEXT;
    batch_attempt INTEGER := 0;
    max_attempts INTEGER := 10;
    short_purchase_num TEXT;
    short_product_id TEXT;
    unique_suffix TEXT;
    color_name TEXT := '';
    size_name TEXT := '';
    product_record RECORD;
BEGIN
    -- التحقق من وجود product_id
    IF NEW.product_id IS NULL THEN
        RAISE NOTICE 'تخطي العنصر: product_id is NULL';
        RETURN NEW;
    END IF;

    -- جلب بيانات المنتج
    SELECT * INTO product_record 
    FROM products 
    WHERE id = NEW.product_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'تخطي العنصر: لم يتم العثور على المنتج %', NEW.product_id;
        RETURN NEW;
    END IF;

    -- جلب بيانات المتغيرات
    IF NEW.color_id IS NOT NULL THEN
        SELECT name INTO color_name FROM product_colors WHERE id = NEW.color_id;
        color_name := COALESCE(color_name, 'C' || NEW.color_id::TEXT);
    END IF;
    
    IF NEW.size_id IS NOT NULL THEN
        SELECT name INTO size_name FROM product_sizes WHERE id = NEW.size_id;
        size_name := COALESCE(size_name, 'S' || NEW.size_id::TEXT);
    END IF;

    -- جلب بيانات المشتريات باستخدام الحقل الصحيح
    SELECT * INTO supplier_purchase
    FROM supplier_purchases sp
    WHERE sp.id = COALESCE(NEW.supplier_purchase_id, NEW.purchase_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لم يتم العثور على المشتريات برقم: %', COALESCE(NEW.supplier_purchase_id, NEW.purchase_id);
    END IF;

    -- إنشاء أرقام مختصرة
    short_purchase_num := right(supplier_purchase.purchase_number::TEXT, 8);
    short_product_id := right(NEW.product_id::TEXT, 6);
    unique_suffix := to_char(now(), 'MMDDHHMI') || extract(microseconds from now())::INTEGER;

    LOOP
        batch_attempt := batch_attempt + 1;
        
        -- إنشاء batch_number قصير ومختصر
        new_batch_number := 'P-' || short_purchase_num || '-' || short_product_id || '-' || unique_suffix;
        
        -- إضافة معلومات المتغيرات (أقصر)
        IF color_name != '' OR size_name != '' THEN
            new_batch_number := new_batch_number || '-V' ||
                CASE WHEN color_name != '' THEN left(replace(color_name, ' ', ''), 2) ELSE '' END ||
                CASE WHEN size_name != '' THEN left(replace(size_name, ' ', ''), 2) ELSE '' END;
        END IF;
        
        -- إضافة رقم المحاولة إذا لزم الأمر
        IF batch_attempt > 1 THEN
            new_batch_number := new_batch_number || '-' || batch_attempt::TEXT;
        END IF;
        
        -- التأكد من أن الطول لا يتجاوز 200 حرف
        IF length(new_batch_number) > 200 THEN
            new_batch_number := left(new_batch_number, 195) || batch_attempt::TEXT;
        END IF;
        
        -- فحص إن كان batch_number فريد
        IF NOT EXISTS (
            SELECT 1 FROM inventory_batches ib
            WHERE ib.batch_number = new_batch_number
            AND ib.organization_id = supplier_purchase.organization_id
        ) THEN
            EXIT; -- خروج من الحلقة إذا كان فريداً
        END IF;
        
        IF batch_attempt >= max_attempts THEN
            -- استخدام UUID مختصر كحل أخير
            new_batch_number := 'FB-' || left(gen_random_uuid()::TEXT, 15);
            EXIT;
        END IF;
        
        -- تعديل unique_suffix للمحاولة التالية
        unique_suffix := unique_suffix || batch_attempt::TEXT;
    END LOOP;

    -- إدراج batch جديد
    INSERT INTO inventory_batches (
        product_id,
        batch_number,
        quantity_received,
        quantity_available,
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
        variant_display_name
    ) VALUES (
        NEW.product_id,
        new_batch_number,
        NEW.quantity,
        NEW.quantity,
        NEW.unit_price,
        COALESCE(NEW.selling_price, NEW.unit_price * 1.3), -- هامش ربح افتراضي 30%
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
        )
    );

    -- تحديث مخزون المتغيرات
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        -- تحديث المقاس (المربوط بالون)
        UPDATE product_sizes 
        SET quantity = COALESCE(quantity, 0) + NEW.quantity
        WHERE id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        -- تحديث اللون فقط
        UPDATE product_colors 
        SET quantity = COALESCE(quantity, 0) + NEW.quantity
        WHERE id = NEW.color_id;
    ELSE
        -- تحديث مخزون المنتج الأساسي
        UPDATE products 
        SET quantity = COALESCE(quantity, 0) + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;

    RAISE NOTICE 'تم إنشاء batch بنجاح: % للمنتج %', new_batch_number, product_record.name;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في إنشاء batch: % | المنتج: % | الخطأ: %', 
            COALESCE(new_batch_number, 'غير محدد'), 
            product_record.name,
            SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 4: إعادة إنشاء trigger
DROP TRIGGER IF EXISTS trigger_create_batch_from_purchase ON supplier_purchase_items;
CREATE TRIGGER trigger_create_batch_from_purchase
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item();

-- الخطوة 5: اختبار النظام
DO $$
DECLARE
    test_batch_name TEXT;
    current_batch_type TEXT;
BEGIN
    -- اختبار إنشاء batch_number
    test_batch_name := 'P-12345678-123456-' || to_char(now(), 'MMDDHHMI') || extract(microseconds from now())::INTEGER || '-VRdXL';
    
    RAISE NOTICE 'مثال على batch_number: % (الطول: %)', test_batch_name, length(test_batch_name);
    
    -- فحص نوع البيانات
    SELECT data_type || '(' || COALESCE(character_maximum_length::TEXT, 'unlimited') || ')' 
    INTO current_batch_type
    FROM information_schema.columns 
    WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';
    
    RAISE NOTICE 'نوع batch_number: %', current_batch_type;
    
    -- فحص triggers
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_batch_from_purchase'
    ) THEN
        RAISE NOTICE '✅ Trigger موجود ومفعل';
    ELSE
        RAISE NOTICE '❌ Trigger غير موجود';
    END IF;
END $$;

RAISE NOTICE '🎉 تم الانتهاء من الإصلاح الشامل لنظام الشراء مع المتغيرات'; 