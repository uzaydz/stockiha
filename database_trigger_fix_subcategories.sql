-- إنشاء trigger لضمان أن جميع الفئات الفرعية الجديدة تحتوي على organization_id
-- من الفئة الأم إذا لم يتم تمريره

CREATE OR REPLACE FUNCTION auto_set_subcategory_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا لم يتم تمرير organization_id، استخرجه من الفئة الأم
    IF NEW.organization_id IS NULL AND NEW.category_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM product_categories
        WHERE id = NEW.category_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ trigger
DROP TRIGGER IF EXISTS trigger_auto_set_subcategory_organization_id ON product_subcategories;

CREATE TRIGGER trigger_auto_set_subcategory_organization_id
    BEFORE INSERT OR UPDATE ON product_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_subcategory_organization_id();

-- إضافة تعليق للتوثيق
COMMENT ON FUNCTION auto_set_subcategory_organization_id() IS 'Automatically sets organization_id for subcategories based on parent category';

-- التحقق من أن الـ trigger تم إنشاؤه بنجاح
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_set_subcategory_organization_id'; 