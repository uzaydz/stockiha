-- حل مشكلة سياسات RLS وحالات تأكيد المكالمات
-- تاريخ الإنشاء: 2025-05-25

-- الجزء الأول: إضافة سياسة RLS تسمح بالوصول للبيانات المرتبطة بمؤسسة المستخدم
-- فحص إذا كان تفعيل RLS مُفعل على الجدول
SELECT tablename, relrowsecurity
FROM pg_tables
JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE tablename = 'call_confirmation_statuses';

-- تفعيل سياسة RLS على الجدول إذا لم تكن مفعلة
ALTER TABLE IF EXISTS call_confirmation_statuses ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة RLS للقراءة تسمح للمستخدمين بقراءة البيانات المرتبطة بمؤسستهم
DROP POLICY IF EXISTS call_confirmation_statuses_select_policy ON call_confirmation_statuses;
CREATE POLICY call_confirmation_statuses_select_policy 
  ON call_confirmation_statuses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT org.id FROM organizations org
      JOIN org_members mem ON mem.organization_id = org.id
      WHERE mem.user_id = auth.uid()
    )
  );

-- إنشاء سياسة RLS للإضافة والتعديل تسمح للمستخدمين بتعديل البيانات المرتبطة بمؤسستهم
DROP POLICY IF EXISTS call_confirmation_statuses_insert_policy ON call_confirmation_statuses;
CREATE POLICY call_confirmation_statuses_insert_policy 
  ON call_confirmation_statuses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT org.id FROM organizations org
      JOIN org_members mem ON mem.organization_id = org.id
      WHERE mem.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS call_confirmation_statuses_update_policy ON call_confirmation_statuses;
CREATE POLICY call_confirmation_statuses_update_policy 
  ON call_confirmation_statuses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT org.id FROM organizations org
      JOIN org_members mem ON mem.organization_id = org.id
      WHERE mem.user_id = auth.uid()
    )
  );

-- الجزء الثاني: إنشاء وظيفة آمنة لإضافة حالات تأكيد المكالمات الافتراضية
-- هذه الوظيفة تعمل مع صلاحيات المشرف وتتجاوز سياسات RLS
DROP FUNCTION IF EXISTS insert_call_confirmation_statuses_secure;
CREATE OR REPLACE FUNCTION insert_call_confirmation_statuses_secure(
  organization_id UUID,
  user_id UUID DEFAULT NULL
)
RETURNS SETOF call_confirmation_statuses
SECURITY DEFINER -- هذا يجعل الوظيفة تعمل بصلاحيات مالك الوظيفة (المشرف)
SET search_path = public -- تحديد المسار للأمان
AS $$
DECLARE
  v_exists BOOLEAN;
  v_count INTEGER;
BEGIN
  -- التحقق من وجود حالات تأكيد مكالمات للمؤسسة
  SELECT EXISTS (
    SELECT 1 FROM call_confirmation_statuses WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
  ) INTO v_exists;
  
  -- إذا كانت الحالات موجودة بالفعل، إرجاع الحالات الموجودة
  IF v_exists THEN
    RETURN QUERY SELECT * FROM call_confirmation_statuses 
      WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
      ORDER BY is_default DESC, name ASC;
    RETURN;
  END IF;
  
  -- إدخال الحالات الافتراضية
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default, created_at, updated_at)
  VALUES
    ('مؤكد', organization_id, '#10B981', 'check-circle', TRUE, NOW(), NOW()),
    ('غير مؤكد', organization_id, '#F43F5E', 'x-circle', FALSE, NOW(), NOW()),
    ('لم يتم الرد', organization_id, '#F59E0B', 'phone-missed', FALSE, NOW(), NOW()),
    ('الاتصال لاحقاً', organization_id, '#6366F1', 'clock', FALSE, NOW(), NOW());
  
  -- إرجاع الحالات المضافة
  RETURN QUERY SELECT * FROM call_confirmation_statuses 
    WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
    ORDER BY is_default DESC, name ASC;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحيات استخدام الوظيفة للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION insert_call_confirmation_statuses_secure TO authenticated;
GRANT EXECUTE ON FUNCTION insert_call_confirmation_statuses_secure TO service_role;

-- الجزء الثالث: إنشاء وظيفة لإضافة حالة تأكيد اتصال جديدة
DROP FUNCTION IF EXISTS add_call_confirmation_status;
CREATE OR REPLACE FUNCTION add_call_confirmation_status(
  p_name TEXT,
  p_organization_id UUID,
  p_color TEXT DEFAULT '#6366F1',
  p_icon TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id INTEGER;
  v_org_exists BOOLEAN;
  v_user_has_access BOOLEAN;
BEGIN
  -- التحقق من وجود المؤسسة
  SELECT EXISTS (
    SELECT 1 FROM organizations WHERE id = p_organization_id
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'المؤسسة غير موجودة: %', p_organization_id;
  END IF;
  
  -- التحقق من صلاحية المستخدم للوصول إلى المؤسسة
  SELECT EXISTS (
    SELECT 1 FROM organizations org
    JOIN org_members mem ON mem.organization_id = org.id
    WHERE org.id = p_organization_id AND mem.user_id = auth.uid()
  ) INTO v_user_has_access;
  
  IF NOT v_user_has_access THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى هذه المؤسسة';
  END IF;
  
  -- إذا كانت هذه الحالة هي الافتراضية، قم بإلغاء تعيين الحالة الافتراضية السابقة
  IF p_is_default THEN
    UPDATE call_confirmation_statuses 
    SET is_default = FALSE 
    WHERE organization_id = p_organization_id AND is_default = TRUE;
  END IF;
  
  -- إدخال حالة تأكيد اتصال جديدة
  INSERT INTO call_confirmation_statuses (
    name, 
    organization_id, 
    color, 
    icon, 
    is_default, 
    created_at, 
    updated_at
  )
  VALUES (
    p_name,
    p_organization_id,
    p_color,
    p_icon,
    p_is_default,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحيات استخدام الوظيفة للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION add_call_confirmation_status TO authenticated;
GRANT EXECUTE ON FUNCTION add_call_confirmation_status TO service_role;

-- الجزء الرابع: إنشاء وظيفة لتحديث حالات تأكيد الاتصال للطلب
DROP FUNCTION IF EXISTS update_order_call_confirmation;
CREATE OR REPLACE FUNCTION update_order_call_confirmation(
  p_order_id UUID,
  p_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) 
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found BOOLEAN;
  v_organization_id UUID;
  v_status_org_id UUID;
BEGIN
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM online_orders WHERE id = p_order_id
  ) INTO v_found;
  
  IF NOT v_found THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  
  -- التحقق من وجود حالة تأكيد الاتصال
  SELECT EXISTS (
    SELECT 1 FROM call_confirmation_statuses WHERE id = p_status_id
  ) INTO v_found;
  
  IF NOT v_found THEN
    RAISE EXCEPTION 'حالة تأكيد الاتصال غير موجودة: %', p_status_id;
  END IF;
  
  -- التحقق من تطابق المؤسسة بين الطلب وحالة تأكيد الاتصال
  SELECT organization_id INTO v_organization_id FROM online_orders WHERE id = p_order_id;
  SELECT organization_id INTO v_status_org_id FROM call_confirmation_statuses WHERE id = p_status_id;
  
  IF v_organization_id <> v_status_org_id THEN
    RAISE EXCEPTION 'حالة تأكيد الاتصال لا تنتمي إلى نفس المؤسسة';
  END IF;
  
  -- تحديث بيانات الطلب
  UPDATE online_orders SET
    call_confirmation_status_id = p_status_id,
    call_confirmation_notes = COALESCE(p_notes, call_confirmation_notes),
    call_confirmation_updated_at = NOW(),
    call_confirmation_updated_by = COALESCE(p_user_id, auth.uid()),
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحيات استخدام الوظيفة للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION update_order_call_confirmation TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_call_confirmation TO service_role;

-- إضافة تعليق بعد تنفيذ الملف
COMMENT ON FUNCTION insert_call_confirmation_statuses_secure IS 'وظيفة آمنة لإضافة حالات تأكيد المكالمات الافتراضية. تستخدم SECURITY DEFINER لتجاوز قيود RLS.';
COMMENT ON FUNCTION add_call_confirmation_status IS 'وظيفة لإضافة حالة تأكيد اتصال جديدة مع التحقق من صلاحيات المستخدم.';
COMMENT ON FUNCTION update_order_call_confirmation IS 'وظيفة لتحديث حالة تأكيد الاتصال للطلب مع التحقق من تطابق المؤسسة.'; 