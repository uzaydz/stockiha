-- تعطيل النماذج الافتراضية الحالية
UPDATE form_settings
SET is_default = false
WHERE is_default = true;

-- إضافة النموذج الافتراضي لكل مؤسسة موجودة
DO $$
DECLARE
    org_record RECORD;
    default_fields JSONB;
    form_id UUID;
    province_id UUID := gen_random_uuid();
    municipality_id UUID := gen_random_uuid();
BEGIN
    -- تعريف الحقول الافتراضية استناداً إلى نموذج "new form test"
    default_fields := jsonb_build_array(
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fullName',
            'label', 'الاسم واللقب',
            'type', 'text',
            'required', true,
            'placeholder', 'أدخل الاسم واللقب',
            'order', 0,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 3,
                'message', 'يرجى إدخال اسم واللقب بشكل صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'phone',
            'label', 'رقم الهاتف',
            'type', 'tel',
            'required', true,
            'placeholder', 'أدخل رقم الهاتف',
            'order', 1,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 10,
                'message', 'يرجى إدخال رقم هاتف صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fixedDeliveryType',
            'label', 'نوع التوصيل الثابت',
            'type', 'radio',
            'required', true,
            'placeholder', '',
            'order', 2,
            'isVisible', true,
            'options', jsonb_build_array(
                jsonb_build_object('label', 'توصيل للمنزل', 'value', 'home'),
                jsonb_build_object('label', 'استلام من مكتب شركة التوصيل', 'value', 'desk')
            ),
            'defaultValue', 'home',
            'description', 'حقل نوع التوصيل الثابت مع شركة التوصيل، سيظهر في النموذج ولا يمكن للمستخدم تغييره'
        ),
        jsonb_build_object(
            'id', province_id,
            'name', 'province',
            'label', 'الولاية',
            'type', 'province',
            'required', true,
            'placeholder', 'اختر الولاية',
            'order', 3,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'municipalityField', municipality_id
            )
        ),
        jsonb_build_object(
            'id', municipality_id,
            'name', 'municipality',
            'label', 'البلدية',
            'type', 'municipality',
            'required', true,
            'placeholder', 'اختر البلدية',
            'order', 4,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'provinceField', province_id
            ),
            'dependency', jsonb_build_object(
                'fieldId', province_id,
                'value', '*'
            )
        )
    );
    
    -- إضافة النموذج الافتراضي لكل مؤسسة
    FOR org_record IN SELECT id FROM organizations LOOP
        -- التحقق مما إذا كان لدى المؤسسة نموذج افتراضي بالفعل
        IF NOT EXISTS (
            SELECT 1 FROM form_settings 
            WHERE organization_id = org_record.id 
            AND is_default = true 
            AND deleted_at IS NULL
        ) THEN
            -- إنشاء نموذج افتراضي للمؤسسة
            INSERT INTO form_settings (
                id, 
                organization_id, 
                name, 
                fields, 
                product_ids, 
                is_default, 
                is_active, 
                created_at, 
                updated_at, 
                version, 
                settings
            ) VALUES (
                gen_random_uuid(), 
                org_record.id, 
                'النموذج الافتراضي', 
                default_fields, 
                '[]'::jsonb, -- مصفوفة فارغة يعني: يطبق على كل المنتجات التي ليس لها نموذج مخصص
                true, 
                true, 
                CURRENT_TIMESTAMP, 
                CURRENT_TIMESTAMP, 
                1, 
                jsonb_build_object(
                    'description', 'النموذج الافتراضي مفعل. استخدم هذا النموذج للمنتجات التي ليس لديها نماذج مخصصة'
                )
            );
        END IF;
    END LOOP;
END $$;

-- إنشاء دالة لإضافة النموذج الافتراضي تلقائياً مع إنشاء مؤسسة جديدة
CREATE OR REPLACE FUNCTION auto_create_default_form()
RETURNS TRIGGER AS $$
DECLARE
    default_fields JSONB;
    province_id UUID := gen_random_uuid();
    municipality_id UUID := gen_random_uuid();
BEGIN
    -- تعريف الحقول الافتراضية
    default_fields := jsonb_build_array(
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fullName',
            'label', 'الاسم واللقب',
            'type', 'text',
            'required', true,
            'placeholder', 'أدخل الاسم واللقب',
            'order', 0,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 3,
                'message', 'يرجى إدخال اسم واللقب بشكل صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'phone',
            'label', 'رقم الهاتف',
            'type', 'tel',
            'required', true,
            'placeholder', 'أدخل رقم الهاتف',
            'order', 1,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 10,
                'message', 'يرجى إدخال رقم هاتف صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fixedDeliveryType',
            'label', 'نوع التوصيل الثابت',
            'type', 'radio',
            'required', true,
            'placeholder', '',
            'order', 2,
            'isVisible', true,
            'options', jsonb_build_array(
                jsonb_build_object('label', 'توصيل للمنزل', 'value', 'home'),
                jsonb_build_object('label', 'استلام من مكتب شركة التوصيل', 'value', 'desk')
            ),
            'defaultValue', 'home',
            'description', 'حقل نوع التوصيل الثابت مع شركة التوصيل، سيظهر في النموذج ولا يمكن للمستخدم تغييره'
        ),
        jsonb_build_object(
            'id', province_id,
            'name', 'province',
            'label', 'الولاية',
            'type', 'province',
            'required', true,
            'placeholder', 'اختر الولاية',
            'order', 3,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'municipalityField', municipality_id
            )
        ),
        jsonb_build_object(
            'id', municipality_id,
            'name', 'municipality',
            'label', 'البلدية',
            'type', 'municipality',
            'required', true,
            'placeholder', 'اختر البلدية',
            'order', 4,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'provinceField', province_id
            ),
            'dependency', jsonb_build_object(
                'fieldId', province_id,
                'value', '*'
            )
        )
    );
    
    -- إنشاء نموذج افتراضي للمؤسسة الجديدة
    INSERT INTO form_settings (
        id, 
        organization_id, 
        name, 
        fields, 
        product_ids, 
        is_default, 
        is_active, 
        created_at, 
        updated_at, 
        version, 
        settings
    ) VALUES (
        gen_random_uuid(), 
        NEW.id, 
        'النموذج الافتراضي', 
        default_fields, 
        '[]'::jsonb, -- مصفوفة فارغة يعني: يطبق على كل المنتجات التي ليس لها نموذج مخصص
        true, 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP, 
        1, 
        jsonb_build_object(
            'description', 'النموذج الافتراضي مفعل. استخدم هذا النموذج للمنتجات التي ليس لديها نماذج مخصصة'
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإضافة النموذج الافتراضي تلقائياً مع إنشاء مؤسسة جديدة
DROP TRIGGER IF EXISTS create_default_form_on_org_insert ON organizations;
CREATE TRIGGER create_default_form_on_org_insert
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION auto_create_default_form();

-- أضف إجراء لإنشاء النموذج الافتراضي من واجهة المستخدم
CREATE OR REPLACE FUNCTION create_default_form_for_organization(p_organization_id UUID)
RETURNS UUID AS $$
DECLARE
    default_fields JSONB;
    province_id UUID := gen_random_uuid();
    municipality_id UUID := gen_random_uuid();
    new_form_id UUID := gen_random_uuid();
BEGIN
    -- تعطيل أي نماذج افتراضية موجودة للمؤسسة
    UPDATE form_settings
    SET is_default = false
    WHERE organization_id = p_organization_id AND is_default = true;
    
    -- تعريف الحقول الافتراضية
    default_fields := jsonb_build_array(
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fullName',
            'label', 'الاسم واللقب',
            'type', 'text',
            'required', true,
            'placeholder', 'أدخل الاسم واللقب',
            'order', 0,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 3,
                'message', 'يرجى إدخال اسم واللقب بشكل صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'phone',
            'label', 'رقم الهاتف',
            'type', 'tel',
            'required', true,
            'placeholder', 'أدخل رقم الهاتف',
            'order', 1,
            'isVisible', true,
            'validation', jsonb_build_object(
                'minLength', 10,
                'message', 'يرجى إدخال رقم هاتف صحيح'
            )
        ),
        jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fixedDeliveryType',
            'label', 'نوع التوصيل الثابت',
            'type', 'radio',
            'required', true,
            'placeholder', '',
            'order', 2,
            'isVisible', true,
            'options', jsonb_build_array(
                jsonb_build_object('label', 'توصيل للمنزل', 'value', 'home'),
                jsonb_build_object('label', 'استلام من مكتب شركة التوصيل', 'value', 'desk')
            ),
            'defaultValue', 'home',
            'description', 'حقل نوع التوصيل الثابت مع شركة التوصيل، سيظهر في النموذج ولا يمكن للمستخدم تغييره'
        ),
        jsonb_build_object(
            'id', province_id,
            'name', 'province',
            'label', 'الولاية',
            'type', 'province',
            'required', true,
            'placeholder', 'اختر الولاية',
            'order', 3,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'municipalityField', municipality_id
            )
        ),
        jsonb_build_object(
            'id', municipality_id,
            'name', 'municipality',
            'label', 'البلدية',
            'type', 'municipality',
            'required', true,
            'placeholder', 'اختر البلدية',
            'order', 4,
            'isVisible', true,
            'linkedFields', jsonb_build_object(
                'provinceField', province_id
            ),
            'dependency', jsonb_build_object(
                'fieldId', province_id,
                'value', '*'
            )
        )
    );
    
    -- إنشاء نموذج افتراضي جديد
    INSERT INTO form_settings (
        id, 
        organization_id, 
        name, 
        fields, 
        product_ids, 
        is_default, 
        is_active, 
        created_at, 
        updated_at, 
        version, 
        settings
    ) VALUES (
        new_form_id, 
        p_organization_id, 
        'النموذج الافتراضي', 
        default_fields, 
        '[]'::jsonb, -- مصفوفة فارغة يعني: يطبق على كل المنتجات التي ليس لها نموذج مخصص
        true, 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP, 
        1, 
        jsonb_build_object(
            'description', 'النموذج الافتراضي مفعل. استخدم هذا النموذج للمنتجات التي ليس لديها نماذج مخصصة'
        )
    );
    
    RETURN new_form_id;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ إجراء إنشاء النموذج الافتراضي على جميع المؤسسات التي ليس لديها نموذج افتراضي
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM organizations WHERE id NOT IN (
        SELECT DISTINCT organization_id FROM form_settings WHERE is_default = true AND deleted_at IS NULL
    ) LOOP
        PERFORM create_default_form_for_organization(org_record.id);
    END LOOP;
END $$; 