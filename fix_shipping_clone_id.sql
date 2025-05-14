-- fix_shipping_clone_id.sql
-- حل مشكلة معرف مزود الشحن المستنسخ في نماذج الطلبات

-- 1. إنشاء وظيفة للتصحيح الشامل لجميع النماذج الحالية
CREATE OR REPLACE FUNCTION fix_all_shipping_clone_ids() RETURNS void AS $$
DECLARE
  org_record RECORD;
  form_record RECORD;
  default_clone_id TEXT;
BEGIN
  -- معالجة كل مؤسسة على حدة
  FOR org_record IN SELECT id FROM organizations
  LOOP
    -- البحث عن معرف مزود الشحن المستنسخ الافتراضي للمؤسسة
    SELECT id::text INTO default_clone_id 
    FROM shipping_provider_clones 
    WHERE organization_id = org_record.id AND is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- إذا لم يوجد مزود شحن مستنسخ، قم بإنشاء واحد
    IF default_clone_id IS NULL THEN
      -- إدخال مزود شحن مستنسخ افتراضي لهذه المؤسسة
      INSERT INTO shipping_provider_clones (
        organization_id, 
        original_provider_id, 
        name, 
        is_active, 
        is_home_delivery_enabled, 
        is_desk_delivery_enabled, 
        use_unified_price, 
        unified_home_price, 
        unified_desk_price
      ) 
      VALUES (
        org_record.id, 
        1, -- ياليدين
        'مزود شحن افتراضي', 
        true, 
        true, 
        true, 
        true, 
        400, 
        350
      )
      RETURNING id::text INTO default_clone_id;
      
      RAISE NOTICE 'تم إنشاء مزود شحن مستنسخ جديد للمؤسسة %: %', org_record.id, default_clone_id;
    END IF;
    
    -- تحديث جميع نماذج هذه المؤسسة التي تفتقد إلى معرف مزود الشحن المستنسخ
    FOR form_record IN 
      SELECT id, settings 
      FROM form_settings 
      WHERE organization_id = org_record.id 
      AND is_active = true
      AND (
        -- حالة 1: التكامل مع الشحن مفعل ولكن بدون معرف مزود الشحن المستنسخ
        ((settings::jsonb -> 'shipping_integration' ->> 'enabled')::boolean = true AND (settings::jsonb ->> 'shipping_clone_id') IS NULL)
        OR
        -- حالة 2: النموذج الافتراضي بدون معرف مزود الشحن المستنسخ
        (is_default = true AND (settings::jsonb ->> 'shipping_clone_id') IS NULL)
      )
    LOOP
      UPDATE form_settings 
      SET settings = jsonb_set(
        CASE 
          WHEN settings IS NULL THEN '{}'::jsonb 
          ELSE settings::jsonb 
        END, 
        '{shipping_clone_id}', 
        concat('"', default_clone_id, '"')::jsonb
      )
      WHERE id = form_record.id;
      
      RAISE NOTICE 'تم تحديث النموذج % للمؤسسة %', form_record.id, org_record.id;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'تم الانتهاء من تصحيح معرف مزود الشحن المستنسخ لجميع النماذج';
END;
$$ LANGUAGE plpgsql;

-- 2. إنشاء وظيفة تشغل عند تحديث أو إنشاء نموذج جديد
CREATE OR REPLACE FUNCTION ensure_shipping_clone_id() RETURNS TRIGGER AS $$
DECLARE
  default_clone_id TEXT;
  has_shipping_integration BOOLEAN;
BEGIN
  -- التحقق إذا كان هناك تكامل شحن مفعل
  has_shipping_integration := 
    (NEW.settings::jsonb -> 'shipping_integration' ->> 'enabled')::boolean = true 
    OR NEW.is_default = true;
  
  -- التحقق إذا كان يفتقد معرف مزود الشحن المستنسخ
  IF has_shipping_integration AND (NEW.settings::jsonb ->> 'shipping_clone_id') IS NULL THEN
    -- البحث عن معرف مزود الشحن المستنسخ الافتراضي للمؤسسة
    SELECT id::text INTO default_clone_id 
    FROM shipping_provider_clones 
    WHERE organization_id = NEW.organization_id AND is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- إذا لم يوجد، قم بإنشاء واحد
    IF default_clone_id IS NULL THEN
      INSERT INTO shipping_provider_clones (
        organization_id, 
        original_provider_id, 
        name, 
        is_active, 
        is_home_delivery_enabled, 
        is_desk_delivery_enabled, 
        use_unified_price, 
        unified_home_price, 
        unified_desk_price
      ) 
      VALUES (
        NEW.organization_id, 
        1, -- ياليدين
        'مزود شحن افتراضي', 
        true, 
        true, 
        true, 
        true, 
        400, 
        350
      )
      RETURNING id::text INTO default_clone_id;
    END IF;
    
    -- تحديث السجل الجديد بإضافة معرف مزود الشحن المستنسخ
    NEW.settings := jsonb_set(
      CASE 
        WHEN NEW.settings IS NULL THEN '{}'::jsonb 
        ELSE NEW.settings::jsonb 
      END, 
      '{shipping_clone_id}', 
      concat('"', default_clone_id, '"')::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء المُشغل (trigger) على جدول form_settings
DO $$
BEGIN
  -- التحقق من وجود المُشغل وإزالته إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'ensure_shipping_clone_id_trigger' 
    AND tgrelid = 'form_settings'::regclass
  ) THEN
    DROP TRIGGER ensure_shipping_clone_id_trigger ON form_settings;
  END IF;
  
  -- إنشاء المُشغل الجديد
  CREATE TRIGGER ensure_shipping_clone_id_trigger
  BEFORE INSERT OR UPDATE ON form_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_shipping_clone_id();
END;
$$;

-- 4. تنفيذ التصحيح الشامل لجميع النماذج الموجودة حالياً
SELECT fix_all_shipping_clone_ids();

-- 5. إنشاء وظيفة تساعد على إصلاح المشاكل في المستقبل (تستدعى يدوياً عند الحاجة)
CREATE OR REPLACE FUNCTION fix_form_settings_for_organization(org_id UUID) RETURNS void AS $$
DECLARE
  default_clone_id TEXT;
BEGIN
  -- البحث عن معرف مزود الشحن المستنسخ الافتراضي للمؤسسة
  SELECT id::text INTO default_clone_id 
  FROM shipping_provider_clones 
  WHERE organization_id = org_id AND is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- إذا لم يوجد، قم بإنشاء واحد
  IF default_clone_id IS NULL THEN
    INSERT INTO shipping_provider_clones (
      organization_id, 
      original_provider_id, 
      name, 
      is_active, 
      is_home_delivery_enabled, 
      is_desk_delivery_enabled, 
      use_unified_price, 
      unified_home_price, 
      unified_desk_price
    ) 
    VALUES (
      org_id, 
      1, -- ياليدين
      'مزود شحن افتراضي', 
      true, 
      true, 
      true, 
      true, 
      400, 
      350
    )
    RETURNING id::text INTO default_clone_id;
  END IF;
  
  -- تحديث جميع نماذج هذه المؤسسة
  UPDATE form_settings 
  SET settings = jsonb_set(
    CASE 
      WHEN settings IS NULL THEN '{}'::jsonb 
      ELSE settings::jsonb 
    END, 
    '{shipping_clone_id}', 
    concat('"', default_clone_id, '"')::jsonb
  )
  WHERE organization_id = org_id 
  AND is_active = true
  AND (settings::jsonb ->> 'shipping_clone_id') IS NULL;
  
  RAISE NOTICE 'تم تصحيح النماذج للمؤسسة %', org_id;
END;
$$ LANGUAGE plpgsql;

-- 6. إنشاء وظيفة لمعرفة النماذج التي تحتاج إلى إصلاح
CREATE OR REPLACE FUNCTION diagnose_missing_shipping_clone_ids() RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  form_id UUID,
  form_name TEXT,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.organization_id,
    o.name as organization_name,
    f.id as form_id,
    f.name as form_name,
    f.is_default
  FROM form_settings f
  JOIN organizations o ON f.organization_id = o.id
  WHERE f.is_active = true
  AND (
    ((f.settings::jsonb -> 'shipping_integration' ->> 'enabled')::boolean = true AND (f.settings::jsonb ->> 'shipping_clone_id') IS NULL)
    OR
    (f.is_default = true AND (f.settings::jsonb ->> 'shipping_clone_id') IS NULL)
  )
  ORDER BY o.name, f.name;
END;
$$ LANGUAGE plpgsql;

-- 7. للتشخيص فقط: عرض النماذج التي تحتاج إلى إصلاح
-- استدعِ هذه الوظيفة للمراجعة قبل تنفيذ التصحيح الشامل
-- SELECT * FROM diagnose_missing_shipping_clone_ids(); 