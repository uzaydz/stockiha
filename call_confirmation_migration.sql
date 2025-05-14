-- 1. إنشاء جدول حالات تأكيد الإتصال
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

-- 2. إضافة عمود جديد في جدول الطلبات
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS call_confirmation_status_id INTEGER REFERENCES call_confirmation_statuses(id);

-- 3. إضافة عمود للملاحظات المتعلقة بتأكيد الإتصال
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS call_confirmation_notes TEXT;

-- 4. إضافة عمود لتاريخ آخر تحديث لحالة تأكيد الإتصال
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS call_confirmation_updated_at TIMESTAMPTZ;

-- 5. إضافة عمود لمعرف الموظف الذي قام بتحديث حالة تأكيد الإتصال
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS call_confirmation_updated_by UUID REFERENCES auth.users(id);

-- 6. إدخال البيانات الإفتراضية لحالات تأكيد الإتصال
-- يتم تعديل هذا ليشمل جميع المؤسسات المتوفرة في النظام
INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default)
SELECT 'مؤكد', id, '#10B981', 'check-circle', TRUE FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO call_confirmation_statuses (name, organization_id, color, icon)
SELECT 'تم الإتصال', id, '#6366F1', 'phone' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO call_confirmation_statuses (name, organization_id, color, icon)
SELECT 'لم يتم الرد', id, '#F43F5E', 'phone-missed' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO call_confirmation_statuses (name, organization_id, color, icon)
SELECT 'تأجيل', id, '#F59E0B', 'clock' FROM organizations
ON CONFLICT DO NOTHING;

-- 7. إنشاء وظيفة لإضافة حالة تأكيد اتصال جديدة
CREATE OR REPLACE FUNCTION add_call_confirmation_status(
  p_name TEXT,
  p_organization_id UUID,
  p_color TEXT DEFAULT '#6366F1',
  p_icon TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon)
  VALUES (p_name, p_organization_id, p_color, p_icon)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء وظيفة لتحديث حالة تأكيد الإتصال للطلب
CREATE OR REPLACE FUNCTION update_order_call_confirmation(
  p_order_id UUID,
  p_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE online_orders SET
    call_confirmation_status_id = p_status_id,
    call_confirmation_notes = COALESCE(p_notes, call_confirmation_notes),
    call_confirmation_updated_at = NOW(),
    call_confirmation_updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. إنشاء وظيفة لجلب إحصائيات حالات تأكيد الإتصال
CREATE OR REPLACE FUNCTION get_call_confirmation_stats(
  org_id UUID
) RETURNS TABLE (
  status_id INTEGER,
  status_name TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as status_id,
    s.name as status_name,
    COUNT(o.id)::BIGINT as count
  FROM call_confirmation_statuses s
  LEFT JOIN online_orders o ON s.id = o.call_confirmation_status_id
  WHERE s.organization_id = org_id
  GROUP BY s.id, s.name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 10. إنشاء فهرس للأداء الأمثل
CREATE INDEX IF NOT EXISTS idx_online_orders_call_confirmation_status
ON online_orders(call_confirmation_status_id);

-- 11. تعديل الأذونات للجداول الجديدة
ALTER TABLE call_confirmation_statuses ENABLE ROW LEVEL SECURITY;

-- تعديل السياسة ليستخدم الجدول الصحيح للعلاقة بين المستخدمين والمؤسسات
CREATE POLICY call_confirmation_statuses_org_policy
  ON call_confirmation_statuses
  USING (organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE ON call_confirmation_statuses TO authenticated;
GRANT USAGE ON SEQUENCE call_confirmation_statuses_id_seq TO authenticated; 