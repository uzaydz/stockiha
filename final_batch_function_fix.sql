-- إصلاح نهائي شامل للـ function create_batch_from_purchase_item

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
    item_quantity INTEGER;
    item_unit_price NUMERIC;
BEGIN
    -- التحقق من وجود product_id
    IF NEW.product_id IS NULL THEN
        RAISE NOTICE 'تخطي العنصر: product_id is NULL';
        RETURN NEW;
    END IF;

    -- الحصول على الكمية وسعر الوحدة بشكل آمن
    item_quantity := COALESCE(NEW.quantity, 1)::INTEGER;
    item_unit_price := COALESCE(NEW.unit_price, 0);

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

    -- إدراج batch جديد مع التعامل الصحيح مع الحقول
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
        item_quantity,  -- الكمية المتبقية = الكمية المستلمة في البداية
        item_unit_price,
        COALESCE(
            CASE WHEN NEW.selling_price IS NOT NULL THEN NEW.selling_price ELSE NULL END,
            item_unit_price * 1.3
        ), -- هامش ربح افتراضي 30%
        CASE WHEN NEW.expiry_date IS NOT NULL THEN NEW.expiry_date ELSE NULL END,
        COALESCE(
            CASE WHEN NEW.location IS NOT NULL THEN NEW.location ELSE NULL END,
            'المستودع الرئيسي'
        ),
        supplier_purchase.supplier_id,
        supplier_purchase.organization_id,
        now(),
        true,
        NEW.color_id,
        NEW.size_id,
        COALESCE(
            CASE WHEN NEW.variant_type IS NOT NULL THEN NEW.variant_type ELSE NULL END,
            CASE 
                WHEN NEW.color_id IS NOT NULL OR NEW.size_id IS NOT NULL THEN 'variant'
                ELSE 'simple'
            END
        ),
        COALESCE(
            CASE WHEN NEW.variant_display_name IS NOT NULL THEN NEW.variant_display_name ELSE NULL END,
            CASE
                WHEN NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN color_name || ' - ' || size_name
                WHEN NEW.color_id IS NOT NULL THEN color_name
                WHEN NEW.size_id IS NOT NULL THEN size_name
                ELSE NULL
            END
        ),
        NEW.id  -- ربط batch بـ purchase item
    );

    -- تحديث مخزون المتغيرات
    IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
        -- تحديث المقاس (المربوط بالون)
        UPDATE product_sizes 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.size_id;
    ELSIF NEW.color_id IS NOT NULL THEN
        -- تحديث اللون فقط
        UPDATE product_colors 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.color_id;
    ELSE
        -- تحديث مخزون المنتج الأساسي
        UPDATE products 
        SET quantity = COALESCE(quantity, 0) + item_quantity
        WHERE id = NEW.product_id;
    END IF;

    RAISE NOTICE 'تم إنشاء batch بنجاح: % للمنتج % بكمية %', new_batch_number, product_record.name, item_quantity;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في إنشاء batch: % | المنتج: % | الكمية: % | الخطأ: %', 
            COALESCE(new_batch_number, 'غير محدد'), 
            COALESCE(product_record.name, 'غير محدد'),
            item_quantity,
            SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- التحقق من وجود الحقول المطلوبة في supplier_purchase_items
DO $$
DECLARE
    missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- فحص الحقول المطلوبة
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'selling_price'
    ) THEN
        missing_fields := array_append(missing_fields, 'selling_price');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'expiry_date'
    ) THEN
        missing_fields := array_append(missing_fields, 'expiry_date');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'location'
    ) THEN
        missing_fields := array_append(missing_fields, 'location');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_purchase_items' AND column_name = 'supplier_purchase_id'
    ) THEN
        missing_fields := array_append(missing_fields, 'supplier_purchase_id');
    END IF;
    
    IF array_length(missing_fields, 1) > 0 THEN
        RAISE NOTICE 'تحذير: الحقول التالية مفقودة من supplier_purchase_items: %', array_to_string(missing_fields, ', ');
        RAISE NOTICE 'سيتم استخدام قيم افتراضية للحقول المفقودة';
    ELSE
        RAISE NOTICE '✅ جميع الحقول المطلوبة موجودة';
    END IF;
END $$;

RAISE NOTICE '✅ تم إصلاح function create_batch_from_purchase_item نهائياً'; 