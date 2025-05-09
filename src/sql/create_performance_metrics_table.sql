-- إنشاء جدول لتخزين قياسات أداء صفحات المتجر
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  load_time_ms INTEGER NOT NULL,
  component_metrics JSONB,
  dom_interactive_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  user_agent TEXT,
  screen_size TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء مؤشرات لتسريع استعلامات الأداء
CREATE INDEX IF NOT EXISTS idx_perf_metrics_org_id ON performance_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_page_url ON performance_metrics(page_url);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON performance_metrics(timestamp);

-- إنشاء RLS سياسة للقراءة
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - يمكن للمستخدمين فقط قراءة بيانات الأداء لمؤسساتهم
CREATE POLICY read_performance_metrics ON performance_metrics
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = performance_metrics.organization_id
    ))
    OR
    (auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin'
    ))
  );

-- سياسة الإدراج - يمكن لأي مستخدم إضافة بيانات أداء (سيتم تعيين organization_id لاحقًا)
CREATE POLICY insert_performance_metrics ON performance_metrics
  FOR INSERT
  WITH CHECK (true);

-- دالة تحليل بيانات الأداء للمؤسسة
CREATE OR REPLACE FUNCTION analyze_performance_metrics(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  page_url TEXT,
  avg_load_time_ms FLOAT,
  min_load_time_ms INTEGER,
  max_load_time_ms INTEGER,
  avg_dom_interactive_ms FLOAT,
  avg_first_paint_ms FLOAT,
  visits INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    page_url,
    AVG(load_time_ms)::FLOAT AS avg_load_time_ms,
    MIN(load_time_ms) AS min_load_time_ms,
    MAX(load_time_ms) AS max_load_time_ms,
    AVG(dom_interactive_ms)::FLOAT AS avg_dom_interactive_ms,
    AVG(first_contentful_paint_ms)::FLOAT AS avg_first_paint_ms,
    COUNT(*) AS visits
  FROM
    performance_metrics
  WHERE
    organization_id = p_organization_id
    AND timestamp > (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  GROUP BY
    page_url
  ORDER BY
    visits DESC;
$$;

-- تعليقات توضيحية
COMMENT ON TABLE performance_metrics IS 'جدول لتخزين بيانات أداء صفحات المتجر';
COMMENT ON FUNCTION analyze_performance_metrics IS 'دالة لتحليل أداء صفحات المتجر للمؤسسة خلال فترة زمنية محددة'; 