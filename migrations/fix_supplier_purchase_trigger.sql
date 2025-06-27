-- إصلاح trigger مشتريات الموردين - إصلاح مرجع stock_quantity
-- تاريخ الإنشاء: 2025-01-27

-- إصلاح function create_batch_from_purchase_item
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
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في إنشاء inventory batch: %', SQLERRM;
            -- لا نقطع العملية، نكمل بدون إنشاء batch
            RETURN NEW;
    END;

    -- 📈 تحديث مخزون المتغيرات - إصلاح مرجع الحقل
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
        
        -- تحديث مخزون المنتج الإجمالي - استخدام stock_quantity بدلاً من quantity
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + item_quantity,
            updated_at = now()
        WHERE id = NEW.product_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تحديث مخزون المنتج: %', SQLERRM;
            -- لا نقطع العملية، المهم أن العنصر تم إدراجه
    END;

    RAISE NOTICE '✅ تم إنشاء batch: % للمنتج: % بكمية: %', 
        new_batch_number, product_record.name, item_quantity;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ فشل في إنشاء batch: %', SQLERRM;
        -- نعيد NEW لضمان أن العنصر يتم إدراجه حتى لو فشل الbatch
        RETURN NEW;
END;
$function$;

-- إعادة إنشاء trigger
DROP TRIGGER IF EXISTS trigger_create_batch_from_purchase ON supplier_purchase_items;
CREATE TRIGGER trigger_create_batch_from_purchase
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item();

-- تحديث أي functions أخرى قد تستخدم حقل quantity خاطئ
CREATE OR REPLACE FUNCTION update_product_stock_from_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث مخزون المنتج عند تأكيد المشتريات
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + spi.quantity,
            updated_at = now()
        FROM supplier_purchase_items spi
        WHERE products.id = spi.product_id 
        AND spi.purchase_id = NEW.id
        AND spi.product_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث المخزون
DROP TRIGGER IF EXISTS trigger_update_stock_from_purchase ON supplier_purchases;
CREATE TRIGGER trigger_update_stock_from_purchase
    AFTER UPDATE OF status ON supplier_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_from_purchase();

-- تسجيل التحديث
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح trigger مشتريات الموردين وتصحيح مرجع stock_quantity';
END $$; 