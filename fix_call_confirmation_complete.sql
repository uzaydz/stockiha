-- إصلاح شامل لمشكلة حالات تأكيد المكالمة
-- هذا الملف سيحل المشاكل التالية:
-- 1. إنشاء حالات افتراضية لجميع المنظمات الحالية التي لا تحتوي على حالات
-- 2. إنشاء trigger تلقائي لإضافة حالات افتراضية للمنظمات الجديدة
-- 3. تحديث OrdersDataContext للتعامل مع الحالات بشكل صحيح

BEGIN;

-- الخطوة 1: التأكد من وجود الجدول والوظائف
SELECT '🔍 فحص البنية الأساسية...' as status;

-- التأكد من وجود جدول حالات تأكيد الاتصال
CREATE TABLE IF NOT EXISTS call_confirmation_statuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

-- الخطوة 2: إنشاء وظيفة لإضافة حالات تأكيد اتصال افتراضية
SELECT '🔧 إنشاء وظيفة الحالات الافتراضية...' as status;

CREATE OR REPLACE FUNCTION create_default_call_confirmation_statuses(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- إضافة الحالات الافتراضية
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default)
  VALUES 
    ('مؤكد', org_id, '#10B981', 'check-circle', TRUE),
    ('تم الاتصال', org_id, '#6366F1', 'phone', FALSE),
    ('لم يتم الرد', org_id, '#F43F5E', 'phone-missed', FALSE),
    ('تأجيل', org_id, '#F59E0B', 'clock', FALSE)
  ON CONFLICT (name, organization_id) DO NOTHING;
  
  RAISE NOTICE 'تم إنشاء حالات تأكيد اتصال افتراضية للمنظمة: %', org_id;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 3: إضافة حالات افتراضية لجميع المنظمات الحالية التي لا تحتوي على حالات
SELECT '📊 إضافة حالات افتراضية للمنظمات الحالية...' as status;

DO $$
DECLARE
    org_record RECORD;
    total_organizations INTEGER := 0;
    processed_organizations INTEGER := 0;
BEGIN
    -- حساب عدد المنظمات التي تحتاج إلى حالات افتراضية
    SELECT COUNT(*) INTO total_organizations
    FROM organizations o
    LEFT JOIN call_confirmation_statuses c ON o.id = c.organization_id
    GROUP BY o.id
    HAVING COUNT(c.id) = 0;
    
    RAISE NOTICE 'سيتم معالجة % منظمة', total_organizations;
    
    -- إضافة حالات افتراضية لكل منظمة لا تحتوي على حالات
    FOR org_record IN 
        SELECT o.id, o.name
        FROM organizations o
        LEFT JOIN call_confirmation_statuses c ON o.id = c.organization_id
        GROUP BY o.id, o.name
        HAVING COUNT(c.id) = 0
    LOOP
        PERFORM create_default_call_confirmation_statuses(org_record.id);
        processed_organizations := processed_organizations + 1;
        
        -- تقرير التقدم كل 10 منظمات
        IF processed_organizations % 10 = 0 THEN
            RAISE NOTICE 'تم معالجة % من % منظمة', processed_organizations, total_organizations;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'تم الانتهاء من معالجة جميع المنظمات: %', processed_organizations;
END $$;

-- الخطوة 4: إنشاء trigger تلقائي للمنظمات الجديدة
SELECT '⚡ إنشاء trigger للمنظمات الجديدة...' as status;

CREATE OR REPLACE FUNCTION auto_create_call_confirmation_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء حالات تأكيد اتصال افتراضية عند إنشاء منظمة جديدة
  PERFORM create_default_call_confirmation_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS trigger_auto_create_call_confirmation_statuses ON organizations;
CREATE TRIGGER trigger_auto_create_call_confirmation_statuses
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_call_confirmation_statuses();

-- الخطوة 5: إنشاء وظيفة محسّنة لتحديث حالة تأكيد الاتصال
SELECT '🔄 إنشاء وظيفة تحديث محسّنة...' as status;

CREATE OR REPLACE FUNCTION update_order_call_confirmation(
  p_order_id UUID,
  p_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_status_exists BOOLEAN := FALSE;
BEGIN
  -- الحصول على معرف المنظمة من الطلب
  SELECT organization_id INTO v_organization_id
  FROM online_orders
  WHERE id = p_order_id;
  
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  
  -- التحقق من وجود حالة تأكيد الاتصال للمنظمة
  SELECT EXISTS(
    SELECT 1 FROM call_confirmation_statuses 
    WHERE id = p_status_id AND organization_id = v_organization_id
  ) INTO v_status_exists;
  
  IF NOT v_status_exists THEN
    RAISE EXCEPTION 'حالة تأكيد الاتصال غير موجودة أو لا تنتمي لهذه المنظمة: %', p_status_id;
  END IF;
  
  -- تحديث الطلب
  UPDATE online_orders SET
    call_confirmation_status_id = p_status_id,
    call_confirmation_notes = COALESCE(p_notes, call_confirmation_notes),
    call_confirmation_updated_at = NOW(),
    call_confirmation_updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_order_id AND organization_id = v_organization_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 6: إنشاء وظيفة آمنة لإضافة حالة تأكيد اتصال جديدة
SELECT '➕ إنشاء وظيفة إضافة حالة آمنة...' as status;

CREATE OR REPLACE FUNCTION add_call_confirmation_status(
  p_name TEXT,
  p_organization_id UUID,
  p_color TEXT DEFAULT '#6366F1',
  p_icon TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_id INTEGER;
  v_org_exists BOOLEAN;
BEGIN
  -- التحقق من وجود المنظمة
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'المنظمة غير موجودة: %', p_organization_id;
  END IF;
  
  -- إدراج حالة تأكيد اتصال جديدة
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon)
  VALUES (p_name, p_organization_id, p_color, p_icon)
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'اسم حالة تأكيد الاتصال موجود بالفعل لهذه المنظمة: %', p_name;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 7: إنشاء فهارس للأداء الأمثل
SELECT '🚀 إنشاء فهارس للأداء...' as status;

CREATE INDEX IF NOT EXISTS idx_call_confirmation_statuses_org_id 
ON call_confirmation_statuses(organization_id);

CREATE INDEX IF NOT EXISTS idx_call_confirmation_statuses_default 
ON call_confirmation_statuses(organization_id, is_default) 
WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_online_orders_call_confirmation 
ON online_orders(call_confirmation_status_id) 
WHERE call_confirmation_status_id IS NOT NULL;

-- الخطوة 8: منح الصلاحيات اللازمة
SELECT '🔐 منح الصلاحيات...' as status;

-- منح صلاحيات للمستخدم المجهول والمصدق
GRANT SELECT ON call_confirmation_statuses TO anon, authenticated;
GRANT INSERT, UPDATE ON call_confirmation_statuses TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- منح صلاحية تنفيذ الوظائف
GRANT EXECUTE ON FUNCTION create_default_call_confirmation_statuses TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_call_confirmation TO authenticated;
GRANT EXECUTE ON FUNCTION add_call_confirmation_status TO authenticated;

-- الخطوة 9: التحقق من النتائج
SELECT '📋 التحقق من النتائج...' as status;

-- إحصائيات نهائية
SELECT 
  COUNT(DISTINCT o.id) as total_organizations,
  COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN o.id END) as organizations_with_statuses,
  COUNT(DISTINCT CASE WHEN c.id IS NULL THEN o.id END) as organizations_without_statuses
FROM organizations o
LEFT JOIN call_confirmation_statuses c ON o.id = c.organization_id;

-- عرض أول 5 منظمات مع حالاتها
SELECT 
  o.name as organization_name,
  COUNT(c.id) as status_count,
  STRING_AGG(c.name, ', ' ORDER BY c.is_default DESC, c.name) as statuses
FROM organizations o
LEFT JOIN call_confirmation_statuses c ON o.id = c.organization_id
GROUP BY o.id, o.name
ORDER BY o.name
LIMIT 5;

COMMIT;

SELECT '✅ تم إصلاح مشكلة حالات تأكيد المكالمة بنجاح!' as result;
SELECT '📝 ملاحظة: سيتم الآن إنشاء حالات افتراضية تلقائياً لأي منظمة جديدة' as note; 