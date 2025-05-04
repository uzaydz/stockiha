-- إضافة منظمة عامة لاستخدامها مع المصروفات اللتي ليس لها معرف منظمة
-- هذا الحل هو حل بديل في حالة فشل المحفزات في قاعدة البيانات

-- التحقق من وجود المنظمة العامة وإنشائها إذا لم تكن موجودة
DO $$
DECLARE
    public_org_id UUID := '11111111-1111-1111-1111-111111111111';
    org_exists BOOLEAN;
BEGIN
    -- التحقق من وجود المنظمة
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = public_org_id) INTO org_exists;
    
    -- إنشاء المنظمة العامة إذا لم تكن موجودة
    IF NOT org_exists THEN
        INSERT INTO organizations (
            id, 
            name, 
            description, 
            subscription_tier, 
            subscription_status, 
            created_at, 
            updated_at
        )
        VALUES (
            public_org_id, 
            'منظمة عامة', 
            'منظمة عامة للاستخدام مع البيانات اللتي ليس لها منظمة محددة', 
            'basic', 
            'active', 
            NOW(), 
            NOW()
        );
        RAISE NOTICE 'تم إنشاء المنظمة العامة بنجاح';
    ELSE
        RAISE NOTICE 'المنظمة العامة موجودة مسبقاً';
    END IF;
END $$;

-- تعديل جدول المصروفات لتعيين المنظمة العامة كقيمة افتراضية للمنظمة
ALTER TABLE expenses 
    ALTER COLUMN organization_id 
    SET DEFAULT '11111111-1111-1111-1111-111111111111';

-- تعديل جدول المصروفات المتكررة لتعيين المنظمة العامة كقيمة افتراضية للمنظمة
ALTER TABLE recurring_expenses 
    ALTER COLUMN organization_id 
    SET DEFAULT '11111111-1111-1111-1111-111111111111';
    
-- تعديل جدول فئات المصروفات لتعيين المنظمة العامة كقيمة افتراضية للمنظمة
ALTER TABLE expense_categories 
    ALTER COLUMN organization_id 
    SET DEFAULT '11111111-1111-1111-1111-111111111111';

-- إنشاء فئات المصروفات الافتراضية للمنظمة العامة إذا لم تكن موجودة
DO $$
DECLARE
    public_org_id UUID := '11111111-1111-1111-1111-111111111111';
    categories_exist BOOLEAN;
BEGIN
    -- التحقق من وجود فئات المصروفات للمنظمة العامة
    SELECT EXISTS(
        SELECT 1 FROM expense_categories 
        WHERE organization_id = public_org_id
        LIMIT 1
    ) INTO categories_exist;
    
    -- إنشاء فئات المصروفات الافتراضية إذا لم تكن موجودة
    IF NOT categories_exist THEN
        INSERT INTO expense_categories (name, organization_id)
        VALUES 
            ('الرواتب', public_org_id),
            ('إيجار', public_org_id),
            ('مرافق', public_org_id),
            ('مشتريات', public_org_id),
            ('نقل ومواصلات', public_org_id),
            ('تسويق وإعلان', public_org_id),
            ('أخرى', public_org_id);
            
        RAISE NOTICE 'تم إنشاء فئات المصروفات الافتراضية للمنظمة العامة بنجاح';
    ELSE
        RAISE NOTICE 'فئات المصروفات للمنظمة العامة موجودة مسبقاً';
    END IF;
END $$; 