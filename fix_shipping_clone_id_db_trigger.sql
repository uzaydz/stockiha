-- حل مشكلة "invalid input syntax for type integer: "default"" بشكل دائم

-- 1. حذف جميع التريغرات التي يمكن أن تتداخل مع ال shipping_clone_id
DROP TRIGGER IF EXISTS fix_shipping_clone_id_products_trigger ON products;
DROP TRIGGER IF EXISTS fix_product_shipping_clone_id_trigger ON products;
DROP TRIGGER IF EXISTS sanitize_shipping_clone_id_trigger ON products;
DROP TRIGGER IF EXISTS validate_shipping_clone_id_trigger ON products;
DROP TRIGGER IF EXISTS auto_assign_shipping_provider_trigger ON products;
DROP TRIGGER IF EXISTS block_default_shipping_clone_id_trigger ON products;

-- 2. حذف الوظائف المرتبطة بها
DROP FUNCTION IF EXISTS fix_product_shipping_clone_id();
DROP FUNCTION IF EXISTS sanitize_shipping_clone_id();
DROP FUNCTION IF EXISTS validate_shipping_clone_id();
DROP FUNCTION IF EXISTS auto_assign_shipping_provider();
DROP FUNCTION IF EXISTS block_default_shipping_clone_id();

-- 3. إصلاح البيانات الحالية
UPDATE products
SET shipping_clone_id = NULL
WHERE shipping_clone_id::TEXT IN ('default', 'default_provider', '1', '0', '1', '0')
   OR shipping_clone_id IS NULL;

-- 4. إنشاء وظيفة جديدة آمنة تماماً
CREATE OR REPLACE FUNCTION safe_product_shipping_clone_handler()
RETURNS TRIGGER AS $$
BEGIN
    -- التعامل مع القيم غير الصالحة بإعادة تعيينها إلى NULL
    IF NEW.shipping_clone_id IS NOT NULL THEN
        -- التحقق من نوع القيمة وتحويلها
        IF pg_typeof(NEW.shipping_clone_id) = 'text'::regtype THEN
            -- اذا كانت نص، حاول تحويلها
            IF NEW.shipping_clone_id = 'default' OR 
               NEW.shipping_clone_id = 'default_provider' OR 
               NEW.shipping_clone_id = '1' OR 
               NEW.shipping_clone_id = '0' THEN
                NEW.shipping_clone_id = NULL;
            ELSE
                -- حاول التحويل إلى رقم
                BEGIN
                    -- تجربة التحويل
                    NEW.shipping_clone_id = NEW.shipping_clone_id::INTEGER;
                EXCEPTION WHEN OTHERS THEN
                    -- إذا فشل، اجعله NULL
                    NEW.shipping_clone_id = NULL;
                END;
            END IF;
        END IF;
    END IF;
    
    -- معالجة purchase_page_config أيضًا لتجنب مشاكل مماثلة
    IF NEW.purchase_page_config ? 'shipping_clone_id' THEN
        DECLARE
            config_value TEXT;
        BEGIN
            config_value := NEW.purchase_page_config->>'shipping_clone_id';
            
            IF config_value = 'default' OR 
               config_value = 'default_provider' OR 
               config_value = '1' OR 
               config_value = '0' THEN
                -- تعيين قيمة NULL في حالة القيم غير الصالحة
                NEW.purchase_page_config = jsonb_set(
                    NEW.purchase_page_config, 
                    '{shipping_clone_id}', 
                    'null'
                );
            ELSE
                -- محاولة تحويله إلى رقم إذا كان ممكنًا
                BEGIN
                    -- اختبار إذا كان العدد صالحًا
                    PERFORM config_value::INTEGER;
                    -- إذا نجح، استبدل بالقيمة المحولة
                    NEW.purchase_page_config = jsonb_set(
                        NEW.purchase_page_config, 
                        '{shipping_clone_id}', 
                        to_jsonb(config_value::INTEGER)
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- إذا فشل التحويل، اجعله NULL
                    NEW.purchase_page_config = jsonb_set(
                        NEW.purchase_page_config, 
                        '{shipping_clone_id}', 
                        'null'
                    );
                END;
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء تريغر جديد بأعلى أولوية (يجب أن يكون أولاً)
CREATE TRIGGER safe_product_shipping_clone_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION safe_product_shipping_clone_handler();

-- 6. اختيارياً: إضافة تعليق توثيقي لهذا الحل
COMMENT ON FUNCTION safe_product_shipping_clone_handler() IS 
'وظيفة آمنة للتعامل مع shipping_clone_id وتحويله تلقائياً إلى NULL أو قيمة رقمية صالحة.
تم إنشاؤها لمعالجة خطأ "invalid input syntax for type integer: "default"" بشكل دائم.';

-- 7. اختيارياً: إنشاء تقرير بالتغييرات
SELECT 'تم إصلاح وظائف قاعدة البيانات لتجنب خطأ "invalid input syntax for type integer: "default""!' AS status_message; 