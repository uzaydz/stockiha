-- إصلاح شامل لمشكلة تتبع المخزون في المشتريات
-- تاريخ الإنشاء: 2025-07-03
-- المشكلة: trigger create_batch_from_purchase_item يقرأ المخزون من مصدر خاطئ
-- الحل: إصلاح الـ trigger + إضافة آليات مراقبة وحماية

-- ==========================================
-- الجزء الأول: إصلاح فوري للحالة الحالية
-- ==========================================

-- إصلاح منتج المستخدم الحالي
UPDATE products 
SET stock_quantity = 18
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d'
AND organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323';

-- تصحيح سجل المخزون الخاطئ
UPDATE inventory_log 
SET 
    previous_stock = 17,
    new_stock = 18,
    notes = 'تم تصحيح السجل - كان خاطئ (1→2) والصحيح (17→18) - إضافة دفعة جديدة: P-213123-374d-0703-0535'
WHERE id = '7df0d3b0-a1c9-4ebb-912b-72a96ca50e4e';

-- ==========================================
-- الجزء الثاني: إصلاح trigger إنشاء الـ batch
-- ==========================================

-- حذف الـ trigger القديم المُشكِل
DROP TRIGGER IF EXISTS trigger_create_batch_from_purchase ON supplier_purchase_items;

-- إنشاء دالة محدثة وآمنة
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item_safe()
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
    new_batch_id UUID;
    variant_type_val TEXT;
    variant_display_name_val TEXT;
    current_stock INTEGER;
    new_stock INTEGER;
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
        
        -- تحسين منطق تحديد سعر البيع
        item_selling_price := CASE 
            WHEN NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 THEN NEW.selling_price
            ELSE item_unit_price * 1.3
        END;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'خطأ في تحويل البيانات الرقمية: quantity=%, unit_price=%, selling_price=%', 
                NEW.quantity, NEW.unit_price, NEW.selling_price;
    END;

    -- 🛍️ جلب بيانات المنتج والمخزون الحالي الصحيح
    SELECT * INTO product_record 
    FROM products 
    WHERE id = NEW.product_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'تخطي العنصر: لم يتم العثور على المنتج %', NEW.product_id;
        RETURN NEW;
    END IF;
    
    -- 🔥 الإصلاح الأساسي: قراءة المخزون الحقيقي من المنتج
    current_stock := COALESCE(product_record.stock_quantity, 0);
    new_stock := current_stock + item_quantity;
    
    -- تحسين سعر البيع
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

    -- 🏷️ إنشاء batch_number فريد
    base_name := 'P-' || 
                right(supplier_purchase.purchase_number::TEXT, 6) || '-' ||
                right(NEW.product_id::TEXT, 4) || '-' ||
                to_char(now(), 'MMDD-HHMI');
                
    -- إضافة معلومات المتغيرات
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
            variant_type_val,
            variant_display_name_val,
            NEW.id
        ) RETURNING id INTO new_batch_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في إنشاء inventory batch: %', SQLERRM;
            RETURN NEW;
    END;

    -- ربط الـ Batch بعنصر الشراء
    UPDATE supplier_purchase_items 
    SET batch_id = new_batch_id 
    WHERE id = NEW.id;

    -- 📈 تحديث مخزون المنتج بالمخزون الصحيح
    BEGIN
        UPDATE products 
        SET stock_quantity = new_stock,
            updated_at = now()
        WHERE id = NEW.product_id;
        
        -- تسجيل حركة المخزون الصحيحة
        INSERT INTO inventory_log (
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            reference_id,
            notes,
            organization_id,
            created_at
        ) VALUES (
            NEW.product_id,
            item_quantity,
            current_stock, -- المخزون الحقيقي قبل الإضافة
            new_stock,     -- المخزون الجديد الصحيح
            'purchase',
            'BATCH',
            new_batch_id,
            format('إضافة دفعة جديدة: %s - كمية: %s - سعر شراء: %s دج (مخزون صحيح: %s→%s)', 
                   new_batch_number, item_quantity, item_unit_price, current_stock, new_stock),
            supplier_purchase.organization_id,
            now()
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تحديث مخزون المنتج: %', SQLERRM;
    END;

    -- تحديث مخزون المتغيرات
    BEGIN
        IF NEW.color_id IS NOT NULL AND NEW.size_id IS NOT NULL THEN
            UPDATE product_sizes 
            SET quantity = COALESCE(quantity, 0) + item_quantity,
                updated_at = now()
            WHERE id = NEW.size_id;
        ELSIF NEW.color_id IS NOT NULL THEN
            UPDATE product_colors 
            SET quantity = COALESCE(quantity, 0) + item_quantity,
                updated_at = now()
            WHERE id = NEW.color_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تحديث مخزون المتغيرات: %', SQLERRM;
    END;
    
    -- تسجيل حركة batch
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
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'فشل في تسجيل حركة المخزون: %', SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ فشل في إنشاء batch: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger جديد آمن
CREATE TRIGGER trigger_create_batch_from_purchase_safe
    AFTER INSERT ON supplier_purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION create_batch_from_purchase_item_safe();

-- ==========================================
-- الجزء الثالث: منع التكرار في triggers المخزون
-- ==========================================

-- تحديث trigger المخزون العادي ليتجنب التكرار مع نظام batch
CREATE OR REPLACE FUNCTION update_inventory_from_purchase_no_batch_conflict()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث المخزون فقط عند تغيير الحالة إلى confirmed
    -- وفقط للعناصر التي لا تستخدم نظام batch
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- تحديث المخزون فقط للمنتجات التي لا تحتوي على batch_id في عناصرها
        INSERT INTO inventory_log (
            product_id, 
            quantity, 
            type,
            reference_type, 
            reference_id, 
            organization_id, 
            created_by,
            previous_stock,
            new_stock,
            notes
        )
        SELECT 
            spi.product_id,
            spi.quantity,
            'purchase' AS type,
            'supplier_purchase' AS reference_type,
            NEW.id AS reference_id,
            NEW.organization_id,
            NEW.created_by,
            p.stock_quantity AS previous_stock,
            p.stock_quantity + spi.quantity AS new_stock,
            'تحديث مخزون من مشتريات مؤكدة (بدون batch) - ' || COALESCE(spi.description, 'عنصر غير محدد')
        FROM 
            supplier_purchase_items spi
        JOIN 
            products p ON p.id = spi.product_id
        WHERE 
            spi.purchase_id = NEW.id 
            AND spi.product_id IS NOT NULL
            AND spi.batch_id IS NULL; -- فقط العناصر بدون batch
              
        -- تحديث المخزون الفعلي
        UPDATE products p
        SET 
            stock_quantity = p.stock_quantity + spi.quantity,
            updated_at = NOW()
        FROM 
            supplier_purchase_items spi
        WHERE 
            p.id = spi.product_id 
            AND spi.purchase_id = NEW.id
            AND spi.product_id IS NOT NULL
            AND spi.batch_id IS NULL; -- فقط العناصر بدون batch
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'فشل في تحديث المخزون من المشتريات: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- استبدال trigger المخزون القديم
DROP TRIGGER IF EXISTS update_inventory_from_purchase_trigger ON supplier_purchases;
CREATE TRIGGER update_inventory_from_purchase_no_batch_trigger
    AFTER UPDATE ON supplier_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_from_purchase_no_batch_conflict();

-- ==========================================
-- الجزء الرابع: دالة مراقبة وتصحيح تلقائي
-- ==========================================

CREATE OR REPLACE FUNCTION monitor_purchase_inventory_consistency()
RETURNS TABLE (
    status TEXT,
    purchase_id UUID,
    purchase_number TEXT,
    product_id UUID,
    product_name TEXT,
    expected_stock INTEGER,
    actual_stock INTEGER,
    difference INTEGER,
    corrected BOOLEAN,
    details TEXT
) AS $$
DECLARE
    purchase_rec RECORD;
    product_rec RECORD;
    log_rec RECORD;
    expected_final_stock INTEGER;
    current_actual_stock INTEGER;
    stock_difference INTEGER;
BEGIN
    -- فحص جميع المشتريات الحديثة (آخر 24 ساعة)
    FOR purchase_rec IN 
        SELECT sp.id, sp.purchase_number, sp.status, sp.created_at
        FROM supplier_purchases sp
        WHERE sp.created_at >= NOW() - INTERVAL '24 hours'
        AND sp.status IN ('confirmed', 'paid')
    LOOP
        -- فحص كل منتج في المشتريات
        FOR product_rec IN
            SELECT DISTINCT spi.product_id, p.name as product_name, p.stock_quantity
            FROM supplier_purchase_items spi
            JOIN products p ON p.id = spi.product_id
            WHERE spi.purchase_id = purchase_rec.id
            AND spi.product_id IS NOT NULL
        LOOP
            -- حساب المخزون المتوقع بناءً على سجلات inventory_log
            SELECT 
                COALESCE(MIN(il.previous_stock), 0) + COALESCE(SUM(il.quantity), 0) as expected_stock
            INTO expected_final_stock
            FROM inventory_log il
            WHERE il.product_id = product_rec.product_id
            AND il.reference_id::TEXT = purchase_rec.id::TEXT
            AND il.type = 'purchase'
            AND il.created_at >= purchase_rec.created_at;
            
            current_actual_stock := product_rec.stock_quantity;
            stock_difference := current_actual_stock - COALESCE(expected_final_stock, current_actual_stock);
            
            -- إذا كان هناك عدم تطابق، قم بالتصحيح
            IF stock_difference != 0 AND expected_final_stock IS NOT NULL THEN
                -- تصحيح المخزون
                UPDATE products 
                SET stock_quantity = expected_final_stock,
                    updated_at = NOW()
                WHERE id = product_rec.product_id;
                
                -- تسجيل التصحيح
                INSERT INTO inventory_log (
                    product_id,
                    quantity,
                    previous_stock,
                    new_stock,
                    type,
                    reference_type,
                    reference_id,
                    notes,
                    organization_id,
                    created_at
                ) VALUES (
                    product_rec.product_id,
                    stock_difference,
                    current_actual_stock,
                    expected_final_stock,
                    'adjustment',
                    'system_correction',
                    purchase_rec.id,
                    format('تصحيح تلقائي - عدم تطابق في مشتريات %s', purchase_rec.purchase_number),
                    (SELECT organization_id FROM products WHERE id = product_rec.product_id),
                    NOW()
                );
                
                status := '✅ تم التصحيح';
                corrected := true;
                details := format('تم تصحيح المخزون من %s إلى %s', current_actual_stock, expected_final_stock);
            ELSE
                status := '✅ متطابق';
                corrected := false;
                details := 'المخزون متطابق مع السجلات';
            END IF;
            
            purchase_id := purchase_rec.id;
            purchase_number := purchase_rec.purchase_number;
            product_id := product_rec.product_id;
            product_name := product_rec.product_name;
            expected_stock := expected_final_stock;
            actual_stock := current_actual_stock;
            difference := stock_difference;
            
            RETURN NEXT;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء الخامس: دالة إصلاح شاملة للمشتريات السابقة
-- ==========================================

CREATE OR REPLACE FUNCTION fix_all_purchase_inventory_inconsistencies()
RETURNS TABLE (
    action TEXT,
    purchase_number TEXT,
    product_name TEXT,
    old_stock INTEGER,
    new_stock INTEGER,
    message TEXT
) AS $$
DECLARE
    issue_rec RECORD;
    corrected_stock INTEGER;
BEGIN
    -- البحث عن جميع المشاكل في المشتريات
    FOR issue_rec IN
        WITH purchase_inventory_analysis AS (
            SELECT 
                sp.id as purchase_id,
                sp.purchase_number,
                spi.product_id,
                p.name as product_name,
                p.stock_quantity as current_stock,
                SUM(spi.quantity) as total_purchased,
                -- البحث عن أول سجل inventory_log لهذه المشتريات
                (SELECT il.previous_stock 
                 FROM inventory_log il 
                 WHERE il.reference_id::TEXT = sp.id::TEXT 
                 AND il.product_id = spi.product_id
                 AND il.type = 'purchase'
                 ORDER BY il.created_at ASC 
                 LIMIT 1) as logged_previous_stock,
                -- آخر stock مسجل
                (SELECT il.new_stock 
                 FROM inventory_log il 
                 WHERE il.reference_id::TEXT = sp.id::TEXT 
                 AND il.product_id = spi.product_id
                 AND il.type = 'purchase'
                 ORDER BY il.created_at DESC 
                 LIMIT 1) as logged_new_stock
            FROM supplier_purchases sp
            JOIN supplier_purchase_items spi ON sp.id = spi.purchase_id
            JOIN products p ON p.id = spi.product_id
            WHERE sp.status IN ('confirmed', 'paid')
            AND sp.created_at >= NOW() - INTERVAL '7 days' -- آخر أسبوع
            GROUP BY sp.id, sp.purchase_number, spi.product_id, p.name, p.stock_quantity
        )
        SELECT *
        FROM purchase_inventory_analysis
        WHERE logged_previous_stock IS NOT NULL 
        AND logged_new_stock IS NOT NULL
        AND current_stock != logged_new_stock -- عدم تطابق
    LOOP
        corrected_stock := issue_rec.logged_new_stock;
        
        -- تصحيح المخزون
        UPDATE products 
        SET stock_quantity = corrected_stock,
            updated_at = NOW()
        WHERE id = issue_rec.product_id;
        
        -- تسجيل التصحيح
        INSERT INTO inventory_log (
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            reference_id,
            notes,
            organization_id,
            created_at
        ) VALUES (
            issue_rec.product_id,
            corrected_stock - issue_rec.current_stock,
            issue_rec.current_stock,
            corrected_stock,
            'adjustment',
            'bulk_correction',
            issue_rec.purchase_id,
            format('إصلاح شامل - مشتريات %s', issue_rec.purchase_number),
            (SELECT organization_id FROM products WHERE id = issue_rec.product_id),
            NOW()
        );
        
        action := 'تم التصحيح';
        purchase_number := issue_rec.purchase_number;
        product_name := issue_rec.product_name;
        old_stock := issue_rec.current_stock;
        new_stock := corrected_stock;
        message := format('تم تصحيح عدم التطابق في المشتريات');
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء السادس: إنشاء فهارس وقيود للحماية
-- ==========================================

-- فهرس لتحسين أداء البحث في المخزون
CREATE INDEX IF NOT EXISTS idx_inventory_log_purchase_tracking 
ON inventory_log (reference_id, reference_type, product_id, created_at);

-- فهرس لـ supplier_purchase_items
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_batch 
ON supplier_purchase_items (purchase_id, product_id, batch_id);

-- قيد فريد لمنع تكرار المفاتيح
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_batches_unique_number 
ON inventory_batches (organization_id, batch_number);

-- ==========================================
-- الجزء السابع: تشغيل الإصلاحات
-- ==========================================

-- تشغيل مراقبة المشتريات الحديثة
SELECT 'مراقبة المشتريات الحديثة:' as title;
SELECT * FROM monitor_purchase_inventory_consistency();

-- تشغيل الإصلاح الشامل
SELECT 'إصلاح المشاكل السابقة:' as title;
SELECT * FROM fix_all_purchase_inventory_inconsistencies();

-- تأكيد حالة منتج المستخدم بعد الإصلاح
SELECT 
    'حالة منتج المستخدم بعد الإصلاح:' as title,
    p.name,
    p.stock_quantity,
    (SELECT COUNT(*) FROM inventory_log WHERE product_id = p.id) as total_logs,
    (SELECT new_stock FROM inventory_log WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as last_logged_stock
FROM products p 
WHERE p.id = '1cb97231-dce1-4018-8290-cb43b21e374d';

COMMIT;