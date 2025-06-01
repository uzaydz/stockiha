-- جدول طلبات التصليح (repair_orders)
CREATE TABLE IF NOT EXISTS repair_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  repair_location_id UUID REFERENCES repair_locations(id),
  custom_location TEXT,
  issue_description TEXT,
  repair_images JSONB DEFAULT '[]',
  total_price DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT,
  order_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'قيد الانتظار',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- فهارس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS repair_orders_organization_id_idx ON repair_orders(organization_id);
CREATE INDEX IF NOT EXISTS repair_orders_status_idx ON repair_orders(status);
CREATE INDEX IF NOT EXISTS repair_orders_order_number_idx ON repair_orders(order_number);

-- دالة لتوليد رقم طلبية تصليح فريد
CREATE OR REPLACE FUNCTION generate_repair_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT := 'RPR';
  random_part TEXT;
  seq_part TEXT;
  current_count INTEGER;
BEGIN
  -- الحصول على عدد طلبات التصليح الحالية للمؤسسة + 1
  SELECT COUNT(*) + 1 INTO current_count
  FROM repair_orders
  WHERE organization_id = NEW.organization_id;
  
  -- توليد رقم تسلسلي بتنسيق 0001
  seq_part := LPAD(current_count::TEXT, 4, '0');
  
  -- توليد جزء عشوائي
  random_part := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  
  -- تجميع رقم الطلبية بتنسيق RPR-0001-123
  NEW.order_number := prefix || '-' || seq_part || '-' || random_part;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ترقر لتعيين رقم الطلبية تلقائيًا
CREATE TRIGGER set_repair_order_number
BEFORE INSERT ON repair_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_repair_order_number();

-- جدول صور التصليح (repair_images)
CREATE TABLE IF NOT EXISTS repair_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'before', -- 'before' أو 'after'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للصور حسب طلبية التصليح
CREATE INDEX IF NOT EXISTS repair_images_repair_order_id_idx ON repair_images(repair_order_id);

-- جدول سجل تغيير حالة طلبات التصليح (repair_status_history)
CREATE TABLE IF NOT EXISTS repair_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس لسجل الحالات
CREATE INDEX IF NOT EXISTS repair_status_history_repair_order_id_idx ON repair_status_history(repair_order_id);

-- تحديث حقل الصور في جدول repair_orders لحفظ مراجع الصور
COMMENT ON COLUMN repair_orders.repair_images IS 'يحتوي على مصفوفة من معرفات الصور من جدول repair_images';

-- ترقر لتسجيل تغييرات الحالة تلقائيًا
CREATE OR REPLACE FUNCTION log_repair_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO repair_status_history (
      repair_order_id, 
      status, 
      notes, 
      created_by
    ) VALUES (
      NEW.id, 
      NEW.status, 
      'تم تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status,
      NULL -- سيتم تحديثه من خلال التطبيق
    );
  END IF;
  
  -- إذا كانت الحالة "مكتمل" وحقل completed_at فارغ، قم بتحديثه
  IF NEW.status = 'مكتمل' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ترقر لتسجيل تغييرات الحالة
CREATE TRIGGER log_repair_status_changes
AFTER UPDATE OF status ON repair_orders
FOR EACH ROW
EXECUTE FUNCTION log_repair_status_change(); 