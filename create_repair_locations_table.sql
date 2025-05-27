-- إنشاء جدول أماكن التصليح
-- هذا الجدول يحتوي على معلومات أماكن التصليح المختلفة للمؤسسة

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول أماكن التصليح
CREATE TABLE IF NOT EXISTS repair_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- معلومات المكان الأساسية
  name VARCHAR(255) NOT NULL, -- اسم مكان التصليح
  description TEXT, -- وصف المكان
  address TEXT, -- عنوان المكان
  phone VARCHAR(50), -- رقم هاتف المكان
  email VARCHAR(100), -- بريد إلكتروني للمكان
  
  -- إعدادات المكان
  is_active BOOLEAN DEFAULT true, -- هل المكان نشط
  is_default BOOLEAN DEFAULT false, -- هل هو المكان الافتراضي
  capacity INTEGER DEFAULT 10, -- السعة القصوى للخدمات المتزامنة
  
  -- معلومات إضافية
  working_hours JSONB, -- ساعات العمل (مثال: {"monday": {"start": "09:00", "end": "17:00"}})
  specialties TEXT[], -- التخصصات (مثال: ["إصلاح الهواتف", "إصلاح الحاسوب"])
  manager_name VARCHAR(255), -- اسم مدير المكان
  
  -- طوابع زمنية
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_repair_locations_organization_id ON repair_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_repair_locations_active ON repair_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_repair_locations_default ON repair_locations(is_default);

-- إضافة قيد للتأكد من وجود مكان افتراضي واحد فقط لكل مؤسسة
CREATE UNIQUE INDEX IF NOT EXISTS idx_repair_locations_unique_default 
ON repair_locations(organization_id) 
WHERE is_default = true;

-- إضافة عمود مكان التصليح إلى جدول service_bookings
ALTER TABLE service_bookings 
ADD COLUMN IF NOT EXISTS repair_location_id UUID REFERENCES repair_locations(id) ON DELETE SET NULL;

-- إنشاء فهرس لعمود مكان التصليح
CREATE INDEX IF NOT EXISTS idx_service_bookings_repair_location ON service_bookings(repair_location_id);

-- دالة للحصول على أماكن التصليح لمؤسسة معينة
CREATE OR REPLACE FUNCTION get_repair_locations(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  is_active BOOLEAN,
  is_default BOOLEAN,
  capacity INTEGER,
  working_hours JSONB,
  specialties TEXT[],
  manager_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- التحقق من صلاحية المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND (u.organization_id = p_organization_id OR u.is_super_admin = true)
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى أماكن التصليح لهذه المؤسسة';
  END IF;

  RETURN QUERY
  SELECT 
    rl.id,
    rl.name,
    rl.description,
    rl.address,
    rl.phone,
    rl.email,
    rl.is_active,
    rl.is_default,
    rl.capacity,
    rl.working_hours,
    rl.specialties,
    rl.manager_name,
    rl.created_at,
    rl.updated_at
  FROM repair_locations rl
  WHERE rl.organization_id = p_organization_id
  ORDER BY rl.is_default DESC, rl.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء أو تحديث مكان تصليح
CREATE OR REPLACE FUNCTION upsert_repair_location(
  p_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_name VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_phone VARCHAR(50) DEFAULT NULL,
  p_email VARCHAR(100) DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_is_default BOOLEAN DEFAULT false,
  p_capacity INTEGER DEFAULT 10,
  p_working_hours JSONB DEFAULT NULL,
  p_specialties TEXT[] DEFAULT NULL,
  p_manager_name VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_result_id UUID;
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin
  INTO 
    v_user_org_id,
    v_is_admin
  FROM 
    users u
  WHERE 
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != COALESCE(p_organization_id, v_user_org_id) AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بإدارة أماكن التصليح لهذه المؤسسة';
  END IF;

  -- إذا كان هذا المكان سيصبح افتراضياً، قم بإلغاء الافتراضية من الأماكن الأخرى
  IF p_is_default = true THEN
    UPDATE repair_locations 
    SET is_default = false, updated_at = NOW()
    WHERE organization_id = COALESCE(p_organization_id, v_user_org_id) 
    AND id != COALESCE(p_id, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;

  -- إدراج أو تحديث مكان التصليح
  INSERT INTO repair_locations (
    id,
    organization_id,
    name,
    description,
    address,
    phone,
    email,
    is_active,
    is_default,
    capacity,
    working_hours,
    specialties,
    manager_name,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_id, uuid_generate_v4()),
    COALESCE(p_organization_id, v_user_org_id),
    p_name,
    p_description,
    p_address,
    p_phone,
    p_email,
    p_is_active,
    p_is_default,
    p_capacity,
    p_working_hours,
    p_specialties,
    p_manager_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    capacity = EXCLUDED.capacity,
    working_hours = EXCLUDED.working_hours,
    specialties = EXCLUDED.specialties,
    manager_name = EXCLUDED.manager_name,
    updated_at = NOW()
  RETURNING id INTO v_result_id;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء مكان تصليح افتراضي لمؤسسة جديدة
CREATE OR REPLACE FUNCTION initialize_default_repair_location(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_org_name VARCHAR(255);
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin
  INTO 
    v_user_org_id,
    v_is_admin
  FROM 
    users u
  WHERE 
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بإعداد أماكن التصليح لهذه المؤسسة';
  END IF;
  
  -- الحصول على اسم المؤسسة
  SELECT name INTO v_org_name FROM organizations WHERE id = p_organization_id;

  -- إنشاء مكان تصليح افتراضي
  INSERT INTO repair_locations (
    organization_id,
    name,
    description,
    is_active,
    is_default,
    capacity,
    working_hours,
    specialties
  ) VALUES (
    p_organization_id,
    'ورشة ' || COALESCE(v_org_name, 'المتجر') || ' الرئيسية',
    'مكان التصليح الافتراضي للمؤسسة',
    true,
    true,
    10,
    '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "14:00", "end": "17:00"}, "saturday": {"start": "09:00", "end": "17:00"}, "sunday": {"closed": true}}'::jsonb,
    ARRAY['إصلاح عام', 'صيانة', 'تركيب']
  ) ON CONFLICT (organization_id) WHERE is_default = true DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات للجدول والوظائف
COMMENT ON TABLE repair_locations IS 'جدول أماكن التصليح لكل مؤسسة';
COMMENT ON FUNCTION get_repair_locations IS 'الحصول على أماكن التصليح لمؤسسة معينة';
COMMENT ON FUNCTION upsert_repair_location IS 'حفظ أو تحديث مكان تصليح';
COMMENT ON FUNCTION initialize_default_repair_location IS 'إنشاء مكان تصليح افتراضي لمؤسسة جديدة';

-- إنشاء سياسات الأمان (RLS)
ALTER TABLE repair_locations ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: يمكن للمستخدمين في نفس المؤسسة قراءة أماكن التصليح
CREATE POLICY "Users can view repair locations in their organization" ON repair_locations
  FOR SELECT USING (
    organization_id IN (
      SELECT u.organization_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

-- سياسة الإدراج: يمكن للمدراء إضافة أماكن تصليح جديدة
CREATE POLICY "Admins can insert repair locations" ON repair_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  );

-- سياسة التحديث: يمكن للمدراء تحديث أماكن التصليح
CREATE POLICY "Admins can update repair locations" ON repair_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  );

-- سياسة الحذف: يمكن للمدراء حذف أماكن التصليح (ما عدا الافتراضي)
CREATE POLICY "Admins can delete non-default repair locations" ON repair_locations
  FOR DELETE USING (
    is_default = false AND
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = organization_id 
      AND (u.is_org_admin = true OR u.is_super_admin = true)
    )
  ); 