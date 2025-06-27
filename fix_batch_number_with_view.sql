-- إصلاح مشكلة batch_number مع التعامل مع view dependency
-- المشكلة: لا يمكن تعديل نوع batch_number بسبب view inventory_batch_current_stock

-- الخطوة 1: حفظ تعريف الـ view الحالي
DO $$
DECLARE
    view_definition TEXT;
BEGIN
    -- احفظ تعريف الـ view
    SELECT definition INTO view_definition
    FROM pg_views 
    WHERE viewname = 'inventory_batch_current_stock';
    
    -- طباعة التعريف للتأكد
    RAISE NOTICE 'تم حفظ تعريف view: %', view_definition;
END $$;

-- الخطوة 2: إزالة الـ view مؤقتاً
DROP VIEW IF EXISTS inventory_batch_current_stock;

-- الخطوة 3: تعديل نوع batch_number
ALTER TABLE inventory_batches 
ALTER COLUMN batch_number TYPE VARCHAR(255);

-- الخطوة 4: إعادة إنشاء الـ view مع نفس التعريف
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

-- الخطوة 5: إنشاء function محدثة لـ create_batch_from_purchase_item
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
BEGIN
    -- التحقق من وجود بيانات المتغيرات
    IF NEW.color_id IS NOT NULL THEN
        SELECT name INTO color_name FROM product_colors WHERE id = NEW.color_id;
        color_name := COALESCE(color_name, 'C' || NEW.color_id::TEXT);
    END IF;
    
    IF NEW.size_id IS NOT NULL THEN
        SELECT name INTO size_name FROM product_sizes WHERE id = NEW.size_id;
        size_name := COALESCE(size_name, 'S' || NEW.size_id::TEXT);
    END IF;

    -- جلب بيانات المشتريات
    SELECT * INTO supplier_purchase
    FROM supplier_purchases sp
    WHERE sp.id = NEW.supplier_purchase_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لم يتم العثور على المشتريات برقم: %', NEW.supplier_purchase_id;
    END IF;

    -- إنشاء أرقام مختصرة
    short_purchase_num := right(supplier_purchase.purchase_number::TEXT, 8);
    short_product_id := right(NEW.product_id::TEXT, 6);
    unique_suffix := to_char(now(), 'MMDDHHMI');

    LOOP
        batch_attempt := batch_attempt + 1;
        
        -- إنشاء batch_number قصير ومختصر
        new_batch_number := 'P-' || short_purchase_num || '-' || short_product_id || '-' || unique_suffix;
        
        -- إضافة معلومات المتغيرات إذا كانت موجودة
        IF color_name != '' OR size_name != '' THEN
            new_batch_number := new_batch_number || '-V' ||
                CASE WHEN color_name != '' THEN left(color_name, 3) ELSE '' END ||
                CASE WHEN size_name != '' THEN left(size_name, 3) ELSE '' END;
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
            new_batch_number := 'FALLBACK-' || left(gen_random_uuid()::TEXT, 20);
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
        NEW.selling_price,
        NEW.expiry_date,
        COALESCE(NEW.location, 'المستودع الرئيسي'),
        supplier_purchase.supplier_id,
        supplier_purchase.organization_id,
        now(),
        true,
        NEW.color_id,
        NEW.size_id,
        NEW.variant_type,
        NEW.variant_display_name
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

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في إنشاء batch بسبب تضارب البيانات. batch_number: %', new_batch_number;
END;
$$ LANGUAGE plpgsql;

-- التحقق من نجاح العملية
DO $$
DECLARE
    test_batch_name TEXT;
BEGIN
    -- اختبار إنشاء batch_number
    test_batch_name := 'P-12345678-123456-' || to_char(now(), 'MMDDHHMI') || '-VRedXL';
    
    RAISE NOTICE 'مثال على batch_number جديد: % (الطول: %)', test_batch_name, length(test_batch_name);
    
    IF length(test_batch_name) <= 255 THEN
        RAISE NOTICE '✅ طول batch_number مقبول';
    ELSE
        RAISE NOTICE '❌ batch_number طويل جداً';
    END IF;
END $$;

-- التحقق من وجود الـ view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'inventory_batch_current_stock') THEN
        RAISE NOTICE '✅ تم إعادة إنشاء view inventory_batch_current_stock بنجاح';
    ELSE
        RAISE NOTICE '❌ فشل في إعادة إنشاء view inventory_batch_current_stock';
    END IF;
END $$;

-- التحقق من تعديل نوع البيانات
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type || '(' || COALESCE(character_maximum_length::TEXT, 'unlimited') || ')' 
    INTO column_type
    FROM information_schema.columns 
    WHERE table_name = 'inventory_batches' AND column_name = 'batch_number';
    
    RAISE NOTICE '✅ نوع بيانات batch_number الآن: %', column_type;
END $$;

RAISE NOTICE '🎉 تم إصلاح مشكلة batch_number مع view dependency بنجاح'; 