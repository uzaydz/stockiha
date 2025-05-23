-- إزالة كل التريجرز المتعلقة بـ shipping_clone_id لمنع أي تداخل
DROP TRIGGER IF EXISTS fix_shipping_clone_id_products_trigger ON products;
DROP TRIGGER IF EXISTS validate_shipping_clone_id_trigger ON products;
DROP TRIGGER IF EXISTS auto_assign_shipping_provider_trigger ON products; 
DROP TRIGGER IF EXISTS sanitize_shipping_clone_id_trigger ON products;

-- وظيفة جديدة تعمل على منع إدخال "default" بشكل صارم
CREATE OR REPLACE FUNCTION block_default_shipping_clone_id()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كانت القيمة المرسلة هي 'default'، قم بتعيينها إلى NULL
    IF NEW.shipping_clone_id::text = 'default' OR 
       NEW.shipping_clone_id::text = 'default_provider' OR 
       NEW.shipping_clone_id::text = '1' OR 
       NEW.shipping_clone_id::text = '0' THEN
        NEW.shipping_clone_id := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء تريجر وحيد بأعلى أولوية
CREATE TRIGGER block_default_shipping_clone_id_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION block_default_shipping_clone_id();

-- إصلاح السجلات الموجودة
UPDATE products
SET shipping_clone_id = NULL
WHERE shipping_clone_id::text = 'default' OR 
      shipping_clone_id::text = 'default_provider' OR 
      shipping_clone_id::text = '1' OR 
      shipping_clone_id::text = '0';

-- إصلاح تعريف العمود لمنع إدخال "default" 
COMMENT ON COLUMN products.shipping_clone_id IS 'معرف نسخة مزود التوصيل - يجب أن يكون رقم صحيح فقط، أو NULL للمزود الافتراضي';

-- إضافة قيد للتحقق من العمود (اختياري إذا كان مدعوماً من قبل قاعدة البيانات)
DO $$
BEGIN
    BEGIN
        ALTER TABLE products ADD CONSTRAINT check_shipping_clone_id_format
        CHECK (shipping_clone_id IS NULL OR shipping_clone_id::text ~ '^[0-9]+$');
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'لا يمكن إضافة قيد التحقق. سيتم الاعتماد على التريجر فقط.';
    END;
END;
$$; 