-- إضافة قيود لتمكين جدول العملاء الزوار من العمل مع جداول أخرى

-- 1. تعديل القيد الأجنبي في جدول العناوين
DO $$
BEGIN
    -- حذف القيد الأجنبي الحالي في حال وجوده
    ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_customer_id_fkey;
    
    -- إضافة جدول مرجعي جديد يسمح بربط العناوين إما بجدول العملاء العاديين أو العملاء الزوار
    -- للقيام بذلك، سنستخدم إجراءً مختلفًا عن مجرد إضافة foreign key constraint
    -- وبدلاً من ذلك سنضيف قيدًا جديدًا يتحقق من أن العنوان مرتبط بواحد من الجدولين
    
    RAISE NOTICE 'تم حذف القيد الأجنبي القديم من جدول العناوين';
    
    -- نحتاج أولاً إلى التأكد من أن كل العناوين الموجودة مرتبطة بعميل صالح
    -- ويمكن عمل ذلك عن طريق تحديث addresses بحيث يكون customer_id هو نفسه user_id
    -- إذا كان customer_id غير صالح (NULL)
    UPDATE addresses SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;
    
    RAISE NOTICE 'تم تحديث العناوين التي ليس لها عميل معين';
END $$;

-- 2. إنشاء دالة trigger للتحقق من صحة customer_id في جدول addresses
CREATE OR REPLACE FUNCTION check_customer_id_validity()
RETURNS TRIGGER AS $$
BEGIN
    -- نتحقق مما إذا كان customer_id موجودًا في جدول customers أو guest_customers
    IF NEW.customer_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id) OR
           EXISTS (SELECT 1 FROM guest_customers WHERE id = NEW.customer_id) THEN
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'معرف العميل % غير صالح. يجب أن يكون موجودًا في جدول customers أو guest_customers', NEW.customer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتنفيذ الدالة
DROP TRIGGER IF EXISTS check_customer_id_trigger ON addresses;
CREATE TRIGGER check_customer_id_trigger
BEFORE INSERT OR UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION check_customer_id_validity();

-- 3. إضافة قيد خارجي بين جدول online_orders وجدول guest_customers
DO $$
BEGIN
    -- حذف القيد الأجنبي الحالي في جدول online_orders إذا كان موجودًا
    ALTER TABLE online_orders DROP CONSTRAINT IF EXISTS online_orders_customer_id_fkey;
    
    -- إضافة القيد الجديد
    -- هذا سيسمح بربط online_orders مع guest_customers
    ALTER TABLE online_orders ADD CONSTRAINT online_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES guest_customers(id);
    
    RAISE NOTICE 'تم تحديث القيد الأجنبي في جدول online_orders لربطه بجدول guest_customers';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث القيد الأجنبي: %', SQLERRM;
END $$;

-- 4. تحديث البيانات الحالية
-- نريد التأكد من أن كل الطلبات عبر الإنترنت تستخدم عملاء زوار صالحين
DO $$
DECLARE
    v_count INT := 0;
    v_orders_processed INT := 0;
    v_order RECORD;
    v_guest_id UUID;
BEGIN
    -- إنشاء سجلات عملاء زوار لأي طلبات أونلاين ليس لها سجل في جدول guest_customers
    FOR v_order IN (
        SELECT DISTINCT o.customer_id, c.name, c.phone, o.organization_id
        FROM online_orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE NOT EXISTS (SELECT 1 FROM guest_customers gc WHERE gc.id = o.customer_id)
    ) LOOP
        -- إنشاء سجل عميل زائر جديد لهذا العميل
        INSERT INTO guest_customers (id, name, phone, organization_id)
        VALUES (
            v_order.customer_id, 
            COALESCE(v_order.name, 'زائر'),
            COALESCE(v_order.phone, 'غير معروف'),
            v_order.organization_id
        )
        RETURNING id INTO v_guest_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'تم إنشاء % سجل عميل زائر للطلبات الأونلاين الموجودة', v_count;
END $$; 