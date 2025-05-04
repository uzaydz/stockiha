-- التأكد من وجود وظيفة uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول الرواتب والمدفوعات للموظفين
CREATE TABLE IF NOT EXISTS employee_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('monthly', 'commission', 'bonus', 'other')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس على employee_id لتسريع عمليات البحث
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);

-- إنشاء فهرس على تاريخ البدء لتسريع عمليات البحث بالتاريخ
CREATE INDEX IF NOT EXISTS idx_employee_salaries_start_date ON employee_salaries(start_date);

-- إنشاء جدول لتسجيل نشاطات الموظفين
CREATE TABLE IF NOT EXISTS employee_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('login', 'logout', 'order_created', 'service_assigned', 'product_updated', 'other')),
    action_details TEXT,
    related_entity VARCHAR(20) CHECK (related_entity IN ('order', 'product', 'service', 'customer', 'other')),
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس على employee_id لتسريع عمليات البحث
CREATE INDEX IF NOT EXISTS idx_employee_activities_employee_id ON employee_activities(employee_id);

-- إنشاء فهرس على نوع النشاط لتسريع عمليات البحث بنوع النشاط
CREATE INDEX IF NOT EXISTS idx_employee_activities_action_type ON employee_activities(action_type);

-- إنشاء فهرس على تاريخ النشاط لتسريع عمليات البحث بالتاريخ
CREATE INDEX IF NOT EXISTS idx_employee_activities_created_at ON employee_activities(created_at);

-- إنشاء قاعدة لتحديث حقل updated_at تلقائيًا عند تحديث سجل الراتب
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_salaries_updated_at
BEFORE UPDATE ON employee_salaries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- إنشاء وظيفة RPC لإنشاء جدول employee_salaries إذا لم يكن موجودًا
CREATE OR REPLACE FUNCTION create_employee_salaries_if_not_exists() RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_salaries') THEN
        CREATE TABLE public.employee_salaries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            type VARCHAR(20) NOT NULL CHECK (type IN ('monthly', 'commission', 'bonus', 'other')),
            status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_employee_salaries_employee_id ON employee_salaries(employee_id);
        CREATE INDEX idx_employee_salaries_start_date ON employee_salaries(start_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- إنشاء وظيفة RPC لإنشاء جدول employee_activities إذا لم يكن موجودًا
CREATE OR REPLACE FUNCTION create_employee_activities_if_not_exists() RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_activities') THEN
        CREATE TABLE public.employee_activities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('login', 'logout', 'order_created', 'service_assigned', 'product_updated', 'other')),
            action_details TEXT,
            related_entity VARCHAR(20) CHECK (related_entity IN ('order', 'product', 'service', 'customer', 'other')),
            related_entity_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_employee_activities_employee_id ON employee_activities(employee_id);
        CREATE INDEX idx_employee_activities_action_type ON employee_activities(action_type);
        CREATE INDEX idx_employee_activities_created_at ON employee_activities(created_at);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- إضافة سياسات الوصول والأمان لجداول الموظفين في Supabase
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_activities ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للمدراء وأصحاب المتاجر للاطلاع على جميع رواتب الموظفين
CREATE POLICY "admins can see all salaries" ON employee_salaries
    FOR SELECT
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' IN ('admin', 'owner'));

-- إنشاء سياسة للمدراء وأصحاب المتاجر لإدارة جميع رواتب الموظفين
CREATE POLICY "admins can manage all salaries" ON employee_salaries
    FOR ALL
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' IN ('admin', 'owner'));

-- إنشاء سياسة للموظفين للاطلاع على رواتبهم فقط
CREATE POLICY "employees can see their own salaries" ON employee_salaries
    FOR SELECT
    USING (auth.uid() = employee_id AND auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'employee');

-- إنشاء سياسة للمدراء وأصحاب المتاجر للاطلاع على جميع نشاطات الموظفين
CREATE POLICY "admins can see all activities" ON employee_activities
    FOR SELECT
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' IN ('admin', 'owner'));

-- إنشاء سياسة للمدراء وأصحاب المتاجر لإدارة جميع نشاطات الموظفين
CREATE POLICY "admins can manage all activities" ON employee_activities
    FOR ALL
    USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' IN ('admin', 'owner'));

-- إنشاء سياسة للموظفين للاطلاع على نشاطاتهم فقط
CREATE POLICY "employees can see their own activities" ON employee_activities
    FOR SELECT
    USING (auth.uid() = employee_id AND auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'employee');

-- إنشاء دالة لإضافة راتب جديد للموظف
CREATE OR REPLACE FUNCTION add_employee_salary(
    p_employee_id UUID,
    p_amount DECIMAL(10, 2),
    p_start_date DATE,
    p_end_date DATE,
    p_type VARCHAR(20),
    p_status VARCHAR(20),
    p_notes TEXT
) RETURNS UUID AS $$
DECLARE
    v_salary_id UUID;
BEGIN
    INSERT INTO employee_salaries (
        employee_id,
        amount,
        start_date,
        end_date,
        type,
        status,
        notes
    ) VALUES (
        p_employee_id,
        p_amount,
        p_start_date,
        p_end_date,
        p_type,
        p_status,
        p_notes
    ) RETURNING id INTO v_salary_id;
    
    RETURN v_salary_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لإضافة نشاط جديد للموظف
CREATE OR REPLACE FUNCTION add_employee_activity(
    p_employee_id UUID,
    p_action_type VARCHAR(30),
    p_action_details TEXT,
    p_related_entity VARCHAR(20) DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO employee_activities (
        employee_id,
        action_type,
        action_details,
        related_entity,
        related_entity_id
    ) VALUES (
        p_employee_id,
        p_action_type,
        p_action_details,
        p_related_entity,
        p_related_entity_id
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لجلب إحصائيات أداء الموظف
CREATE OR REPLACE FUNCTION get_employee_performance(
    p_employee_id UUID
) RETURNS JSON AS $$
DECLARE
    v_orders_count INT;
    v_sales_total DECIMAL(10, 2);
    v_services_count INT;
    v_result JSON;
BEGIN
    -- عدد الطلبات التي أنشأها الموظف
    SELECT COUNT(*) INTO v_orders_count
    FROM orders
    WHERE employee_id = p_employee_id;
    
    -- إجمالي المبيعات التي حققها الموظف
    SELECT COALESCE(SUM(total), 0) INTO v_sales_total
    FROM orders
    WHERE employee_id = p_employee_id;
    
    -- عدد الخدمات التي قام بها الموظف
    SELECT COUNT(*) INTO v_services_count
    FROM service_bookings
    WHERE assigned_employee_id = p_employee_id;
    
    -- تجميع النتائج
    SELECT json_build_object(
        'ordersCount', v_orders_count,
        'salesTotal', v_sales_total,
        'servicesCount', v_services_count
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة وظيفة لاسترجاع جميع الموظفين
CREATE OR REPLACE FUNCTION public.get_all_employees()
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE role = 'employee' ORDER BY created_at DESC;
$$;

-- إضافة وظيفة لإنشاء جميع وظائف الموظفين الأخرى
CREATE OR REPLACE FUNCTION public.create_employee_functions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- نضمن وجود وظيفة جلب جميع الموظفين
  CREATE OR REPLACE FUNCTION public.get_all_employees()
  RETURNS SETOF public.users
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
    SELECT * FROM public.users WHERE role = 'employee' ORDER BY created_at DESC;
  $func$;

  -- نضمن وجود وظيفة جلب إحصائيات الموظفين
  CREATE OR REPLACE FUNCTION public.get_employee_stats()
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
  DECLARE
    total_count INTEGER;
    active_count INTEGER;
    inactive_count INTEGER;
    stats_json json;
  BEGIN
    -- حساب إجمالي عدد الموظفين
    SELECT COUNT(*) INTO total_count 
    FROM public.users
    WHERE role = 'employee';
    
    -- حساب عدد الموظفين النشطين
    SELECT COUNT(*) INTO active_count 
    FROM public.users
    WHERE role = 'employee' AND is_active = true;
    
    -- حساب عدد الموظفين غير النشطين
    SELECT COUNT(*) INTO inactive_count 
    FROM public.users
    WHERE role = 'employee' AND is_active = false;
    
    -- إنشاء كائن JSON يحتوي على الإحصائيات
    stats_json := json_build_object(
      'total', total_count,
      'active', active_count,
      'inactive', inactive_count
    );
    
    RETURN stats_json;
  END;
  $func$;

  -- نضمن وجود وظيفة لإنشاء موظف جديد
  CREATE OR REPLACE FUNCTION public.create_employee_auth_user(
    employee_email TEXT,
    employee_password TEXT,
    employee_name TEXT
  )
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
  DECLARE
    response json;
    http_response json;
    user_id uuid;
  BEGIN
    -- إرسال طلب إلى Supabase Auth API لإنشاء مستخدم جديد
    SELECT content INTO http_response
    FROM net.http_post(
      url := concat(current_setting('app.settings.supabase_url', true), '/auth/v1/admin/users'),
      headers := jsonb_build_object(
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true)),
        'apikey', current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'email', employee_email,
        'password', employee_password,
        'email_confirm', true,
        'user_metadata', jsonb_build_object(
          'role', 'employee',
          'name', employee_name
        )
      )
    );
    
    -- استخراج معرف المستخدم من الاستجابة
    user_id := (http_response->>'id')::uuid;
    
    -- بناء استجابة بالمعلومات المطلوبة
    response := jsonb_build_object(
      'id', user_id,
      'email', employee_email,
      'name', employee_name
    );
    
    RETURN response;
  EXCEPTION
    WHEN OTHERS THEN
      -- إدارة أي استثناءات
      RETURN jsonb_build_object(
        'error', SQLERRM,
        'details', 'Error creating employee auth user'
      );
  END;
  $func$;

  -- نضمن وجود وظيفة لحذف مستخدم بأمان
  CREATE OR REPLACE FUNCTION public.delete_user_safely(user_id UUID)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
  BEGIN
    -- حذف المستخدم من جدول المستخدمين
    DELETE FROM public.users WHERE id = user_id;
    
    -- إرسال طلب لخدمة Supabase Auth لحذف المستخدم من Auth
    -- هذا يتطلب صلاحيات خاصة، تنفذ عن طريق SECURITY DEFINER
    PERFORM net.http_delete(
      url := concat(current_setting('app.settings.supabase_url', true), '/auth/v1/admin/users/', user_id),
      headers := jsonb_build_object(
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true)),
        'apikey', current_setting('app.settings.service_role_key', true)
      )
    );
  END;
  $func$;
END;
$$; 