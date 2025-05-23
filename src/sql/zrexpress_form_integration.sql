-- ملف تكامل نماذج ZR Express مع نظام البازار
-- يستخدم لإنشاء نماذج افتراضية للمؤسسات التي تستخدم ZR Express

-- البحث عن المؤسسات التي تستخدم ZR Express
WITH zr_express_orgs AS (
  SELECT DISTINCT organization_id 
  FROM shipping_provider_settings sps
  JOIN shipping_providers sp ON sps.provider_id = sp.id
  WHERE sp.code = 'zrexpress' AND sps.is_enabled = true
)

-- التحقق مما إذا كان هناك نموذج موجود للمؤسسة
, existing_forms AS (
  SELECT organization_id, COUNT(*) as form_count
  FROM form_settings
  WHERE is_default = true
  GROUP BY organization_id
)

-- إنشاء نموذج افتراضي لكل مؤسسة تستخدم ZR Express ولا تملك نموذج افتراضي
INSERT INTO form_settings (
  id,
  organization_id, 
  name, 
  fields, 
  is_default, 
  is_active,
  created_at, 
  updated_at,
  settings
)
SELECT 
  gen_random_uuid(),
  zeo.organization_id, 
  'نموذج ZR Express الافتراضي', 
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'fullName',
      'type', 'text',
      'label', 'الاسم الكامل',
      'order', 0,
      'required', true,
      'isVisible', true,
      'validation', jsonb_build_object(
        'message', 'يرجى إدخال الاسم الكامل بشكل صحيح',
        'minLength', 3
      ),
      'placeholder', 'أدخل الاسم الكامل'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'phone',
      'type', 'tel',
      'label', 'رقم الهاتف',
      'order', 1,
      'required', true,
      'isVisible', true,
      'validation', jsonb_build_object(
        'message', 'يرجى إدخال رقم هاتف صحيح',
        'minLength', 10
      ),
      'placeholder', '0XXXXXXXXX'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'deliveryOption',
      'type', 'select',
      'label', 'طريقة التوصيل',
      'order', 2,
      'required', true,
      'isVisible', true,
      'options', jsonb_build_array(
        jsonb_build_object(
          'label', 'توصيل إلى المنزل',
          'value', 'home'
        )
      ),
      'validation', jsonb_build_object(
        'message', 'يرجى اختيار طريقة التوصيل'
      ),
      'placeholder', 'اختر طريقة التوصيل'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'province',
      'type', 'province',
      'label', 'الولاية',
      'order', 3,
      'required', true,
      'isVisible', true,
      'placeholder', 'اختر الولاية',
      'linkedFields', jsonb_build_object(
        'municipalityField', 'auto'
      )
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'municipality',
      'type', 'municipality',
      'label', 'البلدية',
      'order', 4,
      'required', true,
      'isVisible', true,
      'placeholder', 'اختر البلدية',
      'linkedFields', jsonb_build_object(
        'provinceField', 'auto'
      )
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'address',
      'type', 'text',
      'label', 'العنوان بالكامل',
      'order', 5,
      'required', true,
      'isVisible', true,
      'validation', jsonb_build_object(
        'message', 'يرجى إدخال العنوان بشكل صحيح',
        'minLength', 5
      ),
      'placeholder', 'أدخل العنوان بالكامل'
    )
  ),
  true,
  true,
  NOW(), 
  NOW(),
  jsonb_build_object(
    'shipping_integration', jsonb_build_object(
      'enabled', true,
      'provider_id', (SELECT id FROM shipping_providers WHERE code = 'zrexpress' LIMIT 1),
      'provider', 'zrexpress'
    )
  )
FROM zr_express_orgs zeo
LEFT JOIN existing_forms ef ON zeo.organization_id = ef.organization_id
WHERE ef.form_count IS NULL OR ef.form_count = 0;

-- إنشاء دالة لإضافة نموذج افتراضي عند تفعيل ZR Express
CREATE OR REPLACE FUNCTION create_default_zr_express_form()
RETURNS TRIGGER AS $$
DECLARE
  zr_provider_id INTEGER;
  uuid_form_id UUID;
BEGIN
  -- الحصول على معرف مزود الشحن ZR Express
  SELECT id INTO zr_provider_id FROM shipping_providers WHERE code = 'zrexpress' LIMIT 1;

  -- التحقق من أن المؤسسة فعلت ZR Express
  IF NEW.is_enabled = true AND NEW.provider_id = zr_provider_id THEN
    -- التحقق من وجود نموذج افتراضي
    IF NOT EXISTS (
      SELECT 1 FROM form_settings 
      WHERE organization_id = NEW.organization_id AND is_default = true
    ) THEN
      -- إنشاء معرف UUID جديد للنموذج
      uuid_form_id := gen_random_uuid();
      
      -- إنشاء نموذج افتراضي
      INSERT INTO form_settings (
        id,
        organization_id, 
        name, 
        fields, 
        is_default,
        is_active,
        created_at, 
        updated_at,
        settings
      )
      VALUES (
        uuid_form_id,
        NEW.organization_id,
        'نموذج ZR Express الافتراضي',
        jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'fullName',
            'type', 'text',
            'label', 'الاسم الكامل',
            'order', 0,
            'required', true,
            'isVisible', true,
            'validation', jsonb_build_object(
              'message', 'يرجى إدخال الاسم الكامل بشكل صحيح',
              'minLength', 3
            ),
            'placeholder', 'أدخل الاسم الكامل'
          ),
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'phone',
            'type', 'tel',
            'label', 'رقم الهاتف',
            'order', 1,
            'required', true,
            'isVisible', true,
            'validation', jsonb_build_object(
              'message', 'يرجى إدخال رقم هاتف صحيح',
              'minLength', 10
            ),
            'placeholder', '0XXXXXXXXX'
          ),
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'deliveryOption',
            'type', 'select',
            'label', 'طريقة التوصيل',
            'order', 2,
            'required', true,
            'isVisible', true,
            'options', jsonb_build_array(
              jsonb_build_object(
                'label', 'توصيل إلى المنزل',
                'value', 'home'
              )
            ),
            'validation', jsonb_build_object(
              'message', 'يرجى اختيار طريقة التوصيل'
            ),
            'placeholder', 'اختر طريقة التوصيل'
          ),
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'province',
            'type', 'province',
            'label', 'الولاية',
            'order', 3,
            'required', true,
            'isVisible', true,
            'placeholder', 'اختر الولاية',
            'linkedFields', jsonb_build_object(
              'municipalityField', 'auto'
            )
          ),
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'municipality',
            'type', 'municipality',
            'label', 'البلدية',
            'order', 4,
            'required', true,
            'isVisible', true,
            'placeholder', 'اختر البلدية',
            'linkedFields', jsonb_build_object(
              'provinceField', 'auto'
            )
          ),
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'address',
            'type', 'text',
            'label', 'العنوان بالكامل',
            'order', 5,
            'required', true,
            'isVisible', true,
            'validation', jsonb_build_object(
              'message', 'يرجى إدخال العنوان بشكل صحيح',
              'minLength', 5
            ),
            'placeholder', 'أدخل العنوان بالكامل'
          )
        ),
        true,
        true,
        NOW(),
        NOW(),
        jsonb_build_object(
          'shipping_integration', jsonb_build_object(
            'enabled', true,
            'provider_id', zr_provider_id,
            'provider', 'zrexpress'
          )
        )
      );

      -- تحديث إعدادات مزود الشحن بإضافة معرف النموذج الافتراضي
      UPDATE shipping_provider_settings
      SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('default_form_id', uuid_form_id)
      WHERE organization_id = NEW.organization_id AND provider_id = zr_provider_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة Trigger لإنشاء نموذج افتراضي عند تفعيل ZR Express
DROP TRIGGER IF EXISTS create_default_form_on_zr_express_activation ON shipping_provider_settings;

CREATE TRIGGER create_default_form_on_zr_express_activation
AFTER INSERT OR UPDATE ON shipping_provider_settings
FOR EACH ROW
EXECUTE FUNCTION create_default_zr_express_form();

-- إضافة نظام لتتبع تغييرات النماذج
CREATE OR REPLACE FUNCTION update_form_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة Trigger لتحديث وقت التعديل عند تغيير النماذج
DROP TRIGGER IF EXISTS update_form_settings_timestamp ON form_settings;

CREATE TRIGGER update_form_settings_timestamp
BEFORE UPDATE ON form_settings
FOR EACH ROW
EXECUTE FUNCTION update_form_settings_updated_at();

-- ربط نماذج ZR Express بإعدادات المؤسسة المتعلقة بالشحن
-- تحديث النماذج الحالية للمؤسسات لربطها بخدمة ZR Express
UPDATE form_settings fs
SET 
  settings = COALESCE(fs.settings, '{}'::jsonb) || 
  jsonb_build_object(
    'shipping_integration', jsonb_build_object(
      'enabled', true,
      'provider_id', (SELECT id FROM shipping_providers WHERE code = 'zrexpress' LIMIT 1),
      'provider', 'zrexpress'
    )
  )
FROM shipping_provider_settings sps
JOIN shipping_providers sp ON sps.provider_id = sp.id
WHERE 
  fs.organization_id = sps.organization_id AND 
  sp.code = 'zrexpress' AND 
  sps.is_enabled = true AND
  fs.is_default = true; 