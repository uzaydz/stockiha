-- إنشاء ملف SQL لإصلاح shipping_clone_id

-- إنشاء أو تحديث الوظيفة التي تعالج قيم shipping_clone_id غير المتوافقة
CREATE OR REPLACE FUNCTION sanitize_shipping_clone_id()
RETURNS TRIGGER AS $$
BEGIN
    -- تحويل القيم الخاصة إلى NULL
    IF NEW.shipping_clone_id IS NOT NULL THEN
        -- تحويل القيم النصية إلى NULL إذا كانت تمثل قيمة خاصة
        IF NEW.shipping_clone_id::TEXT IN ('default', 'default_provider', '1', '0') THEN
            NEW.shipping_clone_id := NULL;
        END IF;
        
        -- محاولة أخيرة للتعامل مع أي قيم غير صالحة
        BEGIN
            -- محاولة استخدام القيمة الحالية في صيغة عددية
            PERFORM NEW.shipping_clone_id::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            -- في حالة الفشل، تعيين قيمة NULL
            RAISE WARNING 'قيمة shipping_clone_id غير صالحة تم تحويلها إلى NULL: %', NEW.shipping_clone_id;
            NEW.shipping_clone_id := NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء وتفعيل التريجر الذي يستخدم الوظيفة التي تم إنشاؤها
DROP TRIGGER IF EXISTS sanitize_shipping_clone_id_trigger ON products;
CREATE TRIGGER sanitize_shipping_clone_id_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION sanitize_shipping_clone_id();

-- إضافة إجراء مبسط لتنظيف القيم الموجودة
CREATE OR REPLACE FUNCTION clean_existing_shipping_clone_ids()
RETURNS void AS $$
BEGIN
    -- تحديث القيم الموجودة التي قد تكون غير صالحة
    UPDATE products
    SET shipping_clone_id = NULL
    WHERE shipping_clone_id::TEXT IN ('default', 'default_provider', '1', '0')
       OR (shipping_clone_id IS NOT NULL AND shipping_clone_id::TEXT !~ '^\d+$');
       
    RAISE NOTICE 'تم تنظيف كل قيم shipping_clone_id غير الصالحة';
END;
$$ LANGUAGE plpgsql;

-- تنفيذ التنظيف الأولي للبيانات الموجودة
SELECT clean_existing_shipping_clone_ids();

-- إضافة تعليق على الوظيفة
COMMENT ON FUNCTION sanitize_shipping_clone_id() IS 'وظيفة لضمان أن حقل shipping_clone_id في جدول المنتجات يحتوي فقط على قيم عددية صالحة أو NULL';
