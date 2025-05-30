-- إعداد شامل لنظام تقسيم الطلبيات - النسخة المحدثة
-- تاريخ الإنشاء: 2025-05-30
-- الوصف: ملف SQL شامل لإنشاء جداول وسياسات ووظائف نظام تقسيم الطلبيات
-- تم تصحيح العلاقات لتتوافق مع هيكل قاعدة البيانات الحالية

-- =========================================================================
-- الجزء الأول: إنشاء الجداول الأساسية
-- =========================================================================

-- جدول إعدادات تقسيم الطلبيات
CREATE TABLE IF NOT EXISTS order_distribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  active_plan_id TEXT NOT NULL,
  active_plan_type TEXT NOT NULL CHECK (active_plan_type IN ('round_robin', 'smart', 'availability', 'priority', 'expert')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- جدول تاريخ توزيع الطلبيات
CREATE TABLE IF NOT EXISTS order_distribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  distribution_plan_type TEXT NOT NULL,
  distribution_reason TEXT,
  assignment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled')),
  response_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول قواعد التوزيع المخصصة
CREATE TABLE IF NOT EXISTS distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('product_category', 'customer_location', 'order_value', 'time_based')),
  conditions JSONB NOT NULL DEFAULT '{}',
  assigned_employees UUID[] DEFAULT '{}',
  priority_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إحصائيات أداء الموظفين في التوزيع
CREATE TABLE IF NOT EXISTS employee_distribution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_assigned_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  rejected_orders INTEGER DEFAULT 0,
  average_response_time_minutes DECIMAL(10,2) DEFAULT 0,
  performance_score DECIMAL(5,2) DEFAULT 0,
  last_assignment_at TIMESTAMP WITH TIME ZONE,
  current_open_orders INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  availability_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stats_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, organization_id)
);

-- =========================================================================
-- الجزء الثاني: إنشاء الفهارس للأداء
-- =========================================================================

-- فهارس للجداول الجديدة
CREATE INDEX IF NOT EXISTS idx_order_distribution_settings_org ON order_distribution_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_distribution_history_order ON order_distribution_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_distribution_history_employee ON order_distribution_history(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_order_distribution_history_org ON order_distribution_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_org ON distribution_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_distribution_stats_employee ON employee_distribution_stats(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_distribution_stats_org ON employee_distribution_stats(organization_id);

-- فهارس مركبة للاستعلامات المعقدة
CREATE INDEX IF NOT EXISTS idx_distribution_history_status_time ON order_distribution_history(status, assignment_timestamp);
CREATE INDEX IF NOT EXISTS idx_employee_stats_performance ON employee_distribution_stats(organization_id, performance_score DESC, is_available);

-- =========================================================================
-- الجزء الثالث: تفعيل سياسات RLS
-- =========================================================================

-- تفعيل Row Level Security على جميع الجداول
ALTER TABLE order_distribution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_distribution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_distribution_stats ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للقراءة (SELECT) - استخدام العلاقة المباشرة من خلال users.organization_id
DROP POLICY IF EXISTS order_distribution_settings_select_policy ON order_distribution_settings;
CREATE POLICY order_distribution_settings_select_policy 
  ON order_distribution_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS order_distribution_history_select_policy ON order_distribution_history;
CREATE POLICY order_distribution_history_select_policy 
  ON order_distribution_history FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS distribution_rules_select_policy ON distribution_rules;
CREATE POLICY distribution_rules_select_policy 
  ON distribution_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS employee_distribution_stats_select_policy ON employee_distribution_stats;
CREATE POLICY employee_distribution_stats_select_policy 
  ON employee_distribution_stats FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- سياسات RLS للإدخال (INSERT)
DROP POLICY IF EXISTS order_distribution_settings_insert_policy ON order_distribution_settings;
CREATE POLICY order_distribution_settings_insert_policy 
  ON order_distribution_settings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS order_distribution_history_insert_policy ON order_distribution_history;
CREATE POLICY order_distribution_history_insert_policy 
  ON order_distribution_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS distribution_rules_insert_policy ON distribution_rules;
CREATE POLICY distribution_rules_insert_policy 
  ON distribution_rules FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS employee_distribution_stats_insert_policy ON employee_distribution_stats;
CREATE POLICY employee_distribution_stats_insert_policy 
  ON employee_distribution_stats FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- سياسات RLS للتحديث (UPDATE)
DROP POLICY IF EXISTS order_distribution_settings_update_policy ON order_distribution_settings;
CREATE POLICY order_distribution_settings_update_policy 
  ON order_distribution_settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS order_distribution_history_update_policy ON order_distribution_history;
CREATE POLICY order_distribution_history_update_policy 
  ON order_distribution_history FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS distribution_rules_update_policy ON distribution_rules;
CREATE POLICY distribution_rules_update_policy 
  ON distribution_rules FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS employee_distribution_stats_update_policy ON employee_distribution_stats;
CREATE POLICY employee_distribution_stats_update_policy 
  ON employee_distribution_stats FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- سياسات RLS للحذف (DELETE)
DROP POLICY IF EXISTS order_distribution_settings_delete_policy ON order_distribution_settings;
CREATE POLICY order_distribution_settings_delete_policy 
  ON order_distribution_settings FOR DELETE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS distribution_rules_delete_policy ON distribution_rules;
CREATE POLICY distribution_rules_delete_policy 
  ON distribution_rules FOR DELETE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =========================================================================
-- الجزء الرابع: الوظائف الأساسية لنظام التوزيع
-- =========================================================================

-- وظيفة إنشاء إعدادات التوزيع الافتراضية للمؤسسة
DROP FUNCTION IF EXISTS initialize_distribution_settings;
CREATE OR REPLACE FUNCTION initialize_distribution_settings(
  p_organization_id UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- التحقق من وجود إعدادات موجودة بالفعل
  SELECT EXISTS (
    SELECT 1 FROM order_distribution_settings 
    WHERE organization_id = p_organization_id
  ) INTO v_exists;
  
  IF v_exists THEN
    SELECT id INTO v_settings_id FROM order_distribution_settings 
    WHERE organization_id = p_organization_id;
    RETURN v_settings_id;
  END IF;
  
  -- إنشاء إعدادات افتراضية
  INSERT INTO order_distribution_settings (
    organization_id,
    active_plan_id,
    active_plan_type,
    settings
  ) VALUES (
    p_organization_id,
    'round_robin',
    'round_robin',
    '{
      "maxOpenOrders": 10,
      "responseTimeMinutes": 30,
      "enablePeakTimeOverride": false,
      "selectedEmployees": [],
      "employeeProducts": {}
    }'::jsonb
  ) RETURNING id INTO v_settings_id;
  
  RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql;

-- وظيفة تحديث إعدادات التوزيع
DROP FUNCTION IF EXISTS update_distribution_settings;
CREATE OR REPLACE FUNCTION update_distribution_settings(
  p_organization_id UUID,
  p_active_plan_id TEXT,
  p_active_plan_type TEXT,
  p_settings JSONB
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_has_access BOOLEAN;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.organization_id = p_organization_id AND u.auth_user_id = auth.uid()
  ) INTO v_user_has_access;
  
  IF NOT v_user_has_access THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى هذه المؤسسة';
  END IF;
  
  -- تحديث أو إدخال الإعدادات
  INSERT INTO order_distribution_settings (
    organization_id,
    active_plan_id,
    active_plan_type,
    settings,
    updated_at
  ) VALUES (
    p_organization_id,
    p_active_plan_id,
    p_active_plan_type,
    p_settings,
    NOW()
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    active_plan_id = EXCLUDED.active_plan_id,
    active_plan_type = EXCLUDED.active_plan_type,
    settings = EXCLUDED.settings,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- وظيفة الحصول على الموظف التالي حسب نظام Round Robin
DROP FUNCTION IF EXISTS get_next_employee_round_robin;
CREATE OR REPLACE FUNCTION get_next_employee_round_robin(
  p_organization_id UUID,
  p_selected_employees UUID[]
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_last_assigned_employee UUID;
  v_employee_index INTEGER;
  v_next_index INTEGER;
BEGIN
  -- التحقق من وجود موظفين مختارين
  IF p_selected_employees IS NULL OR array_length(p_selected_employees, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- الحصول على آخر موظف تم توزيع طلب عليه
  SELECT assigned_employee_id INTO v_last_assigned_employee
  FROM order_distribution_history
  WHERE organization_id = p_organization_id 
    AND assigned_employee_id = ANY(p_selected_employees)
    AND status != 'cancelled'
  ORDER BY assignment_timestamp DESC
  LIMIT 1;
  
  -- إذا لم يكن هناك توزيع سابق، اختر الموظف الأول
  IF v_last_assigned_employee IS NULL THEN
    RETURN p_selected_employees[1];
  END IF;
  
  -- العثور على فهرس الموظف الحالي
  SELECT i INTO v_employee_index
  FROM generate_subscripts(p_selected_employees, 1) i
  WHERE p_selected_employees[i] = v_last_assigned_employee;
  
  -- حساب الفهرس التالي (دائري)
  v_next_index := CASE 
    WHEN v_employee_index >= array_length(p_selected_employees, 1) 
    THEN 1 
    ELSE v_employee_index + 1 
  END;
  
  RETURN p_selected_employees[v_next_index];
END;
$$ LANGUAGE plpgsql;

-- وظيفة الحصول على أفضل موظف حسب الأداء (Smart Distribution)
DROP FUNCTION IF EXISTS get_best_employee_smart;
CREATE OR REPLACE FUNCTION get_best_employee_smart(
  p_organization_id UUID,
  p_selected_employees UUID[]
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- اختيار الموظف بأعلى نقاط أداء وأقل طلبات مفتوحة
  SELECT employee_id INTO v_employee_id
  FROM employee_distribution_stats
  WHERE organization_id = p_organization_id
    AND employee_id = ANY(p_selected_employees)
    AND is_available = TRUE
  ORDER BY 
    performance_score DESC,
    current_open_orders ASC,
    average_response_time_minutes ASC
  LIMIT 1;
  
  -- إذا لم توجد إحصائيات، استخدم Round Robin
  IF v_employee_id IS NULL THEN
    RETURN get_next_employee_round_robin(p_organization_id, p_selected_employees);
  END IF;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- وظيفة الحصول على موظف متاح (Availability Based)
DROP FUNCTION IF EXISTS get_available_employee;
CREATE OR REPLACE FUNCTION get_available_employee(
  p_organization_id UUID,
  p_selected_employees UUID[]
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- اختيار موظف متاح مع أقل طلبات مفتوحة
  SELECT employee_id INTO v_employee_id
  FROM employee_distribution_stats
  WHERE organization_id = p_organization_id
    AND employee_id = ANY(p_selected_employees)
    AND is_available = TRUE
  ORDER BY 
    current_open_orders ASC,
    last_assignment_at ASC NULLS FIRST
  LIMIT 1;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- وظيفة الحصول على موظف حسب الأولوية (أقل طلبات مفتوحة)
DROP FUNCTION IF EXISTS get_priority_employee;
CREATE OR REPLACE FUNCTION get_priority_employee(
  p_organization_id UUID,
  p_selected_employees UUID[]
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- اختيار الموظف مع أقل طلبات مفتوحة
  SELECT employee_id INTO v_employee_id
  FROM employee_distribution_stats
  WHERE organization_id = p_organization_id
    AND employee_id = ANY(p_selected_employees)
    AND is_available = TRUE
  ORDER BY 
    current_open_orders ASC,
    performance_score DESC
  LIMIT 1;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- وظيفة الحصول على خبير المنتج (Expert Based)
DROP FUNCTION IF EXISTS get_expert_employee;
CREATE OR REPLACE FUNCTION get_expert_employee(
  p_organization_id UUID,
  p_product_ids UUID[],
  p_employee_products JSONB
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_employee_key TEXT;
  v_employee_product_ids JSONB;
  v_product_id UUID;
BEGIN
  -- البحث عن موظف مختص بأحد المنتجات
  FOR v_employee_key IN SELECT jsonb_object_keys(p_employee_products)
  LOOP
    v_employee_product_ids := p_employee_products->v_employee_key;
    
    -- التحقق من وجود تطابق في المنتجات
    FOR v_product_id IN SELECT unnest(p_product_ids)
    LOOP
      IF v_employee_product_ids ? v_product_id::text THEN
        -- التحقق من توفر الموظف
        SELECT employee_id INTO v_employee_id
        FROM employee_distribution_stats
        WHERE organization_id = p_organization_id
          AND employee_id = v_employee_key::uuid
          AND is_available = TRUE
        ORDER BY current_open_orders ASC
        LIMIT 1;
        
        IF v_employee_id IS NOT NULL THEN
          RETURN v_employee_id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- الوظيفة الرئيسية لتوزيع الطلبات
DROP FUNCTION IF EXISTS distribute_order;
CREATE OR REPLACE FUNCTION distribute_order(
  p_order_id UUID,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_settings RECORD;
  v_selected_employee UUID;
  v_distribution_reason TEXT;
  v_selected_employees UUID[];
  v_employee_products JSONB;
  v_order_product_ids UUID[];
BEGIN
  -- الحصول على معرف المؤسسة إذا لم يتم تمريره
  IF p_organization_id IS NULL THEN
    SELECT organization_id INTO v_organization_id
    FROM online_orders WHERE id = p_order_id;
  ELSE
    v_organization_id := p_organization_id;
  END IF;
  
  -- الحصول على إعدادات التوزيع
  SELECT * INTO v_settings
  FROM order_distribution_settings
  WHERE organization_id = v_organization_id;
  
  -- إذا لم توجد إعدادات، أنشئ إعدادات افتراضية
  IF NOT FOUND THEN
    PERFORM initialize_distribution_settings(v_organization_id);
    SELECT * INTO v_settings
    FROM order_distribution_settings
    WHERE organization_id = v_organization_id;
  END IF;
  
  -- استخراج قائمة الموظفين المختارين
  v_selected_employees := ARRAY(
    SELECT unnest(
      ARRAY(
        SELECT jsonb_array_elements_text(v_settings.settings->'selectedEmployees')
      )::uuid[]
    )
  );
  
  -- التحقق من وجود موظفين مختارين
  IF v_selected_employees IS NULL OR array_length(v_selected_employees, 1) = 0 THEN
    RAISE EXCEPTION 'لا يوجد موظفين مختارين للتوزيع';
  END IF;
  
  -- توزيع الطلب حسب نوع الخطة
  CASE v_settings.active_plan_type
    WHEN 'round_robin' THEN
      v_selected_employee := get_next_employee_round_robin(v_organization_id, v_selected_employees);
      v_distribution_reason := 'توزيع دائري عادل';
      
    WHEN 'smart' THEN
      v_selected_employee := get_best_employee_smart(v_organization_id, v_selected_employees);
      v_distribution_reason := 'توزيع ذكي حسب الأداء';
      
    WHEN 'availability' THEN
      v_selected_employee := get_available_employee(v_organization_id, v_selected_employees);
      v_distribution_reason := 'توزيع حسب الجاهزية';
      
    WHEN 'priority' THEN
      v_selected_employee := get_priority_employee(v_organization_id, v_selected_employees);
      v_distribution_reason := 'توزيع حسب الأولوية';
      
    WHEN 'expert' THEN
      -- الحصول على معرفات المنتجات في الطلب
      SELECT ARRAY_AGG(oi.product_id) INTO v_order_product_ids
      FROM order_items oi
      WHERE oi.order_id = p_order_id;
      
      v_employee_products := v_settings.settings->'employeeProducts';
      v_selected_employee := get_expert_employee(v_organization_id, v_order_product_ids, v_employee_products);
      v_distribution_reason := 'توزيع على خبير المنتج';
      
      -- إذا لم يوجد خبير، استخدم النظام الذكي
      IF v_selected_employee IS NULL THEN
        v_selected_employee := get_best_employee_smart(v_organization_id, v_selected_employees);
        v_distribution_reason := 'توزيع ذكي (لم يوجد خبير)';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'نوع خطة التوزيع غير مدعوم: %', v_settings.active_plan_type;
  END CASE;
  
  -- التحقق من نجاح التوزيع
  IF v_selected_employee IS NULL THEN
    RAISE EXCEPTION 'فشل في العثور على موظف متاح للتوزيع';
  END IF;
  
  -- تسجيل التوزيع في السجل
  INSERT INTO order_distribution_history (
    order_id,
    organization_id,
    assigned_employee_id,
    distribution_plan_type,
    distribution_reason,
    status
  ) VALUES (
    p_order_id,
    v_organization_id,
    v_selected_employee,
    v_settings.active_plan_type,
    v_distribution_reason,
    'assigned'
  );
  
  -- تحديث الطلب بالموظف المسؤول (إذا كان العمود موجود)
  UPDATE online_orders SET
    assigned_employee_id = v_selected_employee,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- تحديث إحصائيات الموظف
  INSERT INTO employee_distribution_stats (
    employee_id,
    organization_id,
    total_assigned_orders,
    current_open_orders,
    last_assignment_at,
    stats_updated_at
  ) VALUES (
    v_selected_employee,
    v_organization_id,
    1,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id, organization_id)
  DO UPDATE SET
    total_assigned_orders = employee_distribution_stats.total_assigned_orders + 1,
    current_open_orders = employee_distribution_stats.current_open_orders + 1,
    last_assignment_at = NOW(),
    stats_updated_at = NOW();
  
  RETURN v_selected_employee;
END;
$$ LANGUAGE plpgsql;

-- وظيفة تحديث حالة التوزيع
DROP FUNCTION IF EXISTS update_distribution_status;
CREATE OR REPLACE FUNCTION update_distribution_status(
  p_order_id UUID,
  p_status TEXT,
  p_response_time_minutes INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distribution_record RECORD;
  v_organization_id UUID;
BEGIN
  -- الحصول على سجل التوزيع
  SELECT * INTO v_distribution_record
  FROM order_distribution_history
  WHERE order_id = p_order_id
  ORDER BY assignment_timestamp DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على سجل توزيع للطلب';
  END IF;
  
  -- تحديث حالة التوزيع
  UPDATE order_distribution_history SET
    status = p_status,
    response_time_minutes = COALESCE(p_response_time_minutes, response_time_minutes),
    updated_at = NOW()
  WHERE id = v_distribution_record.id;
  
  -- تحديث إحصائيات الموظف
  v_organization_id := v_distribution_record.organization_id;
  
  CASE p_status
    WHEN 'completed' THEN
      UPDATE employee_distribution_stats SET
        completed_orders = completed_orders + 1,
        current_open_orders = GREATEST(current_open_orders - 1, 0),
        average_response_time_minutes = (
          (average_response_time_minutes * completed_orders + COALESCE(p_response_time_minutes, 0)) 
          / (completed_orders + 1)
        ),
        stats_updated_at = NOW()
      WHERE employee_id = v_distribution_record.assigned_employee_id
        AND organization_id = v_organization_id;
        
    WHEN 'rejected' THEN
      UPDATE employee_distribution_stats SET
        rejected_orders = rejected_orders + 1,
        current_open_orders = GREATEST(current_open_orders - 1, 0),
        stats_updated_at = NOW()
      WHERE employee_id = v_distribution_record.assigned_employee_id
        AND organization_id = v_organization_id;
        
    WHEN 'cancelled' THEN
      UPDATE employee_distribution_stats SET
        current_open_orders = GREATEST(current_open_orders - 1, 0),
        stats_updated_at = NOW()
      WHERE employee_id = v_distribution_record.assigned_employee_id
        AND organization_id = v_organization_id;
  END CASE;
  
  -- إعادة حساب نقاط الأداء
  PERFORM calculate_employee_performance_score(
    v_distribution_record.assigned_employee_id, 
    v_organization_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- وظيفة حساب نقاط أداء الموظف
DROP FUNCTION IF EXISTS calculate_employee_performance_score;
CREATE OR REPLACE FUNCTION calculate_employee_performance_score(
  p_employee_id UUID,
  p_organization_id UUID
)
RETURNS DECIMAL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats RECORD;
  v_performance_score DECIMAL(5,2);
  v_completion_rate DECIMAL(5,2);
  v_response_time_score DECIMAL(5,2);
  v_workload_score DECIMAL(5,2);
BEGIN
  -- الحصول على إحصائيات الموظف
  SELECT * INTO v_stats
  FROM employee_distribution_stats
  WHERE employee_id = p_employee_id AND organization_id = p_organization_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- حساب معدل الإنجاز (0-40 نقطة)
  IF v_stats.total_assigned_orders > 0 THEN
    v_completion_rate := (v_stats.completed_orders::DECIMAL / v_stats.total_assigned_orders) * 40;
  ELSE
    v_completion_rate := 0;
  END IF;
  
  -- حساب نقاط وقت الاستجابة (0-35 نقطة)
  -- كلما قل وقت الاستجابة، زادت النقاط
  IF v_stats.average_response_time_minutes > 0 THEN
    v_response_time_score := GREATEST(0, 35 - (v_stats.average_response_time_minutes / 2));
  ELSE
    v_response_time_score := 35;
  END IF;
  
  -- حساب نقاط عبء العمل (0-25 نقطة)
  -- كلما قل عدد الطلبات المفتوحة، زادت النقاط
  v_workload_score := GREATEST(0, 25 - (v_stats.current_open_orders * 2));
  
  -- النقاط الإجمالية
  v_performance_score := v_completion_rate + v_response_time_score + v_workload_score;
  
  -- تحديث نقاط الأداء
  UPDATE employee_distribution_stats SET
    performance_score = v_performance_score,
    stats_updated_at = NOW()
  WHERE employee_id = p_employee_id AND organization_id = p_organization_id;
  
  RETURN v_performance_score;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- الجزء الخامس: إنشاء المشغلات (Triggers)
-- =========================================================================

-- مشغل لتحديث timestamp عند التعديل
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة المشغلات لجميع الجداول
DROP TRIGGER IF EXISTS update_order_distribution_settings_updated_at ON order_distribution_settings;
CREATE TRIGGER update_order_distribution_settings_updated_at
  BEFORE UPDATE ON order_distribution_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_distribution_history_updated_at ON order_distribution_history;
CREATE TRIGGER update_order_distribution_history_updated_at
  BEFORE UPDATE ON order_distribution_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_distribution_rules_updated_at ON distribution_rules;
CREATE TRIGGER update_distribution_rules_updated_at
  BEFORE UPDATE ON distribution_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_distribution_stats_updated_at ON employee_distribution_stats;
CREATE TRIGGER update_employee_distribution_stats_updated_at
  BEFORE UPDATE ON employee_distribution_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- الجزء السادس: منح الصلاحيات
-- =========================================================================

-- منح صلاحيات الوصول للجداول
GRANT SELECT, INSERT, UPDATE, DELETE ON order_distribution_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_distribution_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON distribution_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_distribution_stats TO authenticated;

-- منح صلاحيات استخدام الوظائف
GRANT EXECUTE ON FUNCTION initialize_distribution_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_distribution_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_employee_round_robin TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_employee_smart TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_employee TO authenticated;
GRANT EXECUTE ON FUNCTION get_priority_employee TO authenticated;
GRANT EXECUTE ON FUNCTION get_expert_employee TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_order TO authenticated;
GRANT EXECUTE ON FUNCTION update_distribution_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_employee_performance_score TO authenticated;

-- منح الصلاحيات لـ service_role
GRANT ALL ON order_distribution_settings TO service_role;
GRANT ALL ON order_distribution_history TO service_role;
GRANT ALL ON distribution_rules TO service_role;
GRANT ALL ON employee_distribution_stats TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =========================================================================
-- الجزء السابع: إضافة التعليقات
-- =========================================================================

COMMENT ON TABLE order_distribution_settings IS 'جدول إعدادات تقسيم الطلبيات للمؤسسات';
COMMENT ON TABLE order_distribution_history IS 'سجل تاريخ توزيع الطلبيات على الموظفين';
COMMENT ON TABLE distribution_rules IS 'قواعد التوزيع المخصصة للمؤسسات';
COMMENT ON TABLE employee_distribution_stats IS 'إحصائيات أداء الموظفين في نظام التوزيع';

COMMENT ON FUNCTION initialize_distribution_settings IS 'إنشاء إعدادات التوزيع الافتراضية للمؤسسة';
COMMENT ON FUNCTION update_distribution_settings IS 'تحديث إعدادات التوزيع للمؤسسة';
COMMENT ON FUNCTION distribute_order IS 'الوظيفة الرئيسية لتوزيع الطلبات على الموظفين';
COMMENT ON FUNCTION update_distribution_status IS 'تحديث حالة توزيع الطلب';
COMMENT ON FUNCTION calculate_employee_performance_score IS 'حساب نقاط أداء الموظف في النظام';

-- =========================================================================
-- الجزء الثامن: البيانات الأولية والاختبار
-- =========================================================================

-- وظيفة لإنشاء بيانات تجريبية للاختبار
DROP FUNCTION IF EXISTS create_sample_distribution_data;
CREATE OR REPLACE FUNCTION create_sample_distribution_data(
  p_organization_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_ids UUID[];
  v_employee_id UUID;
  v_result TEXT := 'تم إنشاء البيانات التجريبية بنجاح:' || chr(10);
BEGIN
  -- الحصول على قائمة بالموظفين في المؤسسة
  SELECT ARRAY_AGG(u.id) INTO v_employee_ids
  FROM users u
  WHERE u.organization_id = p_organization_id
    AND u.role IN ('employee', 'admin')
    AND u.is_active = true
  LIMIT 5;
  
  IF v_employee_ids IS NULL OR array_length(v_employee_ids, 1) = 0 THEN
    RETURN 'لا يوجد موظفين في المؤسسة لإنشاء البيانات التجريبية';
  END IF;
  
  -- إنشاء إعدادات التوزيع
  PERFORM initialize_distribution_settings(p_organization_id);
  v_result := v_result || '- إعدادات التوزيع الافتراضية' || chr(10);
  
  -- إنشاء إحصائيات للموظفين
  FOREACH v_employee_id IN ARRAY v_employee_ids
  LOOP
    INSERT INTO employee_distribution_stats (
      employee_id,
      organization_id,
      total_assigned_orders,
      completed_orders,
      rejected_orders,
      average_response_time_minutes,
      performance_score,
      current_open_orders,
      is_available
    ) VALUES (
      v_employee_id,
      p_organization_id,
      FLOOR(RANDOM() * 50 + 10)::INTEGER,
      FLOOR(RANDOM() * 40 + 5)::INTEGER,
      FLOOR(RANDOM() * 5)::INTEGER,
      FLOOR(RANDOM() * 30 + 15)::DECIMAL,
      FLOOR(RANDOM() * 40 + 60)::DECIMAL,
      FLOOR(RANDOM() * 5)::INTEGER,
      TRUE
    )
    ON CONFLICT (employee_id, organization_id) DO NOTHING;
  END LOOP;
  
  v_result := v_result || '- إحصائيات ' || array_length(v_employee_ids, 1) || ' موظفين' || chr(10);
  
  -- تحديث إعدادات التوزيع لتشمل الموظفين
  PERFORM update_distribution_settings(
    p_organization_id,
    'smart',
    'smart',
    jsonb_build_object(
      'maxOpenOrders', 10,
      'responseTimeMinutes', 30,
      'enablePeakTimeOverride', false,
      'selectedEmployees', array_to_json(v_employee_ids),
      'employeeProducts', '{}'::jsonb
    )
  );
  
  v_result := v_result || '- تم تحديث الإعدادات لتشمل الموظفين المختارين';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحية استخدام وظيفة البيانات التجريبية
GRANT EXECUTE ON FUNCTION create_sample_distribution_data TO authenticated;
GRANT EXECUTE ON FUNCTION create_sample_distribution_data TO service_role;

-- =========================================================================
-- انتهاء الملف
-- =========================================================================

-- تأكيد نجاح تنفيذ الملف
DO $$
BEGIN
  RAISE NOTICE 'تم تنفيذ ملف إعداد نظام تقسيم الطلبيات بنجاح!';
  RAISE NOTICE 'الجداول المنشأة: order_distribution_settings, order_distribution_history, distribution_rules, employee_distribution_stats';
  RAISE NOTICE 'الوظائف المنشأة: % وظيفة أساسية', (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname LIKE '%distribution%' OR proname LIKE '%employee%'
  );
  RAISE NOTICE 'استخدم الوظيفة create_sample_distribution_data(organization_id) لإنشاء بيانات تجريبية';
END $$;