-- ===============================================
-- 🔔 نظام الإشعارات الفوري للطلبيات الأونلاين والمخزون المنخفض
-- ===============================================

-- 📋 إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_order', 'low_stock', 'payment_received', 'order_status_change'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  is_read BOOLEAN DEFAULT FALSE,
  entity_type VARCHAR(50), -- 'online_order', 'product', 'customer'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 فهارس لتحسين الأداء
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- 🔒 سياسات أمان RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ✅ السماح للمستخدمين بقراءة إشعارات منظمتهم فقط
CREATE POLICY "Allow users to view their organization notifications" 
ON notifications FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- ✅ السماح للإدارة والموظفين بإدراج إشعارات جديدة
CREATE POLICY "Allow staff to insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

-- ✅ السماح بتحديث حالة القراءة
CREATE POLICY "Allow users to update read status" 
ON notifications FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- 🚀 دالة إشعار الطلبيات الجديدة الأونلاين
CREATE OR REPLACE FUNCTION notify_new_online_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ إضافة SECURITY DEFINER لتجاوز RLS
AS $$
DECLARE
  customer_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  priority_level TEXT;
BEGIN
  -- 📝 الحصول على اسم العميل من form_data
  SELECT COALESCE(
    NEW.form_data->>'customer_name',
    NEW.form_data->>'name',
    'عميل غير معروف'
  ) INTO customer_name;
  
  -- 🎯 تحديد أولوية الإشعار حسب قيمة الطلبية
  IF NEW.total >= 10000 THEN
    priority_level := 'urgent';
  ELSIF NEW.total >= 5000 THEN
    priority_level := 'high';
  ELSE
    priority_level := 'medium';
  END IF;
  
  -- 📢 عنوان ونص الإشعار
  notification_title := '🛒 طلبية جديدة #' || COALESCE(NEW.customer_order_number::text, NEW.id::text);
  notification_message := '💰 طلبية بقيمة ' || NEW.total || ' دج من ' || customer_name;
  
  -- 📤 إدراج الإشعار في قاعدة البيانات
  INSERT INTO notifications (
    organization_id, type, title, message, priority,
    entity_type, entity_id, metadata
  ) VALUES (
    NEW.organization_id,
    'new_order',
    notification_title,
    notification_message,
    priority_level,
    'online_order',
    NEW.id,
    jsonb_build_object(
      'total', NEW.total,
      'status', NEW.status,
      'customer_name', customer_name,
      'payment_method', NEW.payment_method,
      'order_number', NEW.customer_order_number,
      'created_at', NEW.created_at
    )
  );
  
  -- 🔔 إشعار Realtime فوري عبر pg_notify
  PERFORM pg_notify(
    'new_order_' || NEW.organization_id,
    json_build_object(
      'type', 'new_order',
      'order_id', NEW.id,
      'organization_id', NEW.organization_id,
      'total', NEW.total,
      'customer_name', customer_name,
      'priority', priority_level,
      'timestamp', extract(epoch from NOW())
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔗 ربط الـ Trigger بجدول online_orders
DROP TRIGGER IF EXISTS trigger_new_online_order ON online_orders;
CREATE TRIGGER trigger_new_online_order
  AFTER INSERT ON online_orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_online_order();

-- 📦 دالة إشعار المخزون المنخفض
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ إضافة SECURITY DEFINER لتجاوز RLS
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  priority_level TEXT;
  min_level INTEGER;
BEGIN
  -- 📊 تحديد الحد الأدنى للمخزون
  min_level := COALESCE(NEW.min_stock_level, 5);
  
  -- ⚠️ التحقق من انخفاض المخزون
  IF NEW.stock_quantity <= min_level 
     AND (OLD.stock_quantity IS NULL OR NEW.stock_quantity != OLD.stock_quantity) THEN
    
    -- 🎯 تحديد أولوية الإشعار
    IF NEW.stock_quantity <= 0 THEN
      priority_level := 'urgent';
      notification_title := '🚨 نفاذ المخزون: ' || NEW.name;
      notification_message := '⛔ المخزون نفد تماماً! يجب إعادة التموين فوراً';
    ELSIF NEW.stock_quantity <= 2 THEN
      priority_level := 'high';
      notification_title := '⚠️ مخزون منخفض جداً: ' || NEW.name;
      notification_message := '📦 المتبقي: ' || NEW.stock_quantity || ' قطعة فقط';
    ELSE
      priority_level := 'medium';
      notification_title := '📉 مخزون منخفض: ' || NEW.name;
      notification_message := '📦 المتبقي: ' || NEW.stock_quantity || ' قطعة';
    END IF;
    
    -- 📤 إدراج إشعار المخزون المنخفض
    INSERT INTO notifications (
      organization_id, type, title, message, priority,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.organization_id,
      'low_stock',
      notification_title,
      notification_message,
      priority_level,
      'product',
      NEW.id,
      jsonb_build_object(
        'product_name', NEW.name,
        'stock_quantity', NEW.stock_quantity,
        'min_stock_level', min_level,
        'previous_stock', OLD.stock_quantity,
        'sku', NEW.sku
      )
    );
    
    -- 🔔 إشعار Realtime فوري
    PERFORM pg_notify(
      'low_stock_' || NEW.organization_id,
      json_build_object(
        'type', 'low_stock',
        'product_id', NEW.id,
        'organization_id', NEW.organization_id,
        'product_name', NEW.name,
        'stock_quantity', NEW.stock_quantity,
        'priority', priority_level,
        'timestamp', extract(epoch from NOW())
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔗 ربط الـ Trigger بجدول products
DROP TRIGGER IF EXISTS trigger_low_stock ON products;
CREATE TRIGGER trigger_low_stock
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- 🔄 دالة إشعار تغيير حالة الطلبية
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  priority_level TEXT;
BEGIN
  -- ✅ التحقق من تغيير الحالة فقط
  IF NEW.status != OLD.status THEN
    
    -- 📝 الحصول على اسم العميل
    SELECT COALESCE(
      NEW.form_data->>'customer_name',
      NEW.form_data->>'name',
      'عميل غير معروف'
    ) INTO customer_name;
    
    -- 🎯 تحديد نوع الإشعار حسب الحالة الجديدة
    CASE NEW.status
      WHEN 'processing' THEN
        priority_level := 'medium';
        notification_title := '⚡ تأكيد الطلبية #' || COALESCE(NEW.customer_order_number::text, NEW.id::text);
        notification_message := '✅ تم تأكيد طلبية ' || customer_name || ' وهي قيد التحضير';
      WHEN 'shipped' THEN
        priority_level := 'medium';
        notification_title := '🚚 شحن الطلبية #' || COALESCE(NEW.customer_order_number::text, NEW.id::text);
        notification_message := '📦 تم شحن طلبية ' || customer_name;
      WHEN 'delivered' THEN
        priority_level := 'low';
        notification_title := '✅ تسليم الطلبية #' || COALESCE(NEW.customer_order_number::text, NEW.id::text);
        notification_message := '🎉 تم تسليم طلبية ' || customer_name || ' بنجاح';
      WHEN 'cancelled' THEN
        priority_level := 'high';
        notification_title := '❌ إلغاء الطلبية #' || COALESCE(NEW.customer_order_number::text, NEW.id::text);
        notification_message := '⚠️ تم إلغاء طلبية ' || customer_name;
      ELSE
        RETURN NEW; -- تجاهل الحالات الأخرى
    END CASE;
    
    -- 📤 إدراج الإشعار
    INSERT INTO notifications (
      organization_id, type, title, message, priority,
      entity_type, entity_id, metadata
    ) VALUES (
      NEW.organization_id,
      'order_status_change',
      notification_title,
      notification_message,
      priority_level,
      'online_order',
      NEW.id,
      jsonb_build_object(
        'order_number', NEW.customer_order_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'customer_name', customer_name,
        'total', NEW.total
      )
    );
    
    -- 🔔 إشعار Realtime فوري
    PERFORM pg_notify(
      'order_status_' || NEW.organization_id,
      json_build_object(
        'type', 'order_status_change',
        'order_id', NEW.id,
        'organization_id', NEW.organization_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'customer_name', customer_name,
        'priority', priority_level,
        'timestamp', extract(epoch from NOW())
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔗 ربط الـ Trigger بجدول online_orders لتغيير الحالة
DROP TRIGGER IF EXISTS trigger_order_status_change ON online_orders;
CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE OF status ON online_orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();

-- 🧹 دالة تنظيف الإشعارات القديمة (تشغيل دوري)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- 🗑️ حذف الإشعارات المقروءة الأقدم من 30 يوم
  DELETE FROM notifications 
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- 🗑️ حذف الإشعارات غير المقروءة الأقدم من 90 يوم
  DELETE FROM notifications 
  WHERE is_read = FALSE 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 📊 دالة إحصائيات الإشعارات
CREATE OR REPLACE FUNCTION get_notification_stats(org_id UUID)
RETURNS TABLE(
  total_notifications INTEGER,
  unread_notifications INTEGER,
  urgent_notifications INTEGER,
  new_orders_today INTEGER,
  low_stock_alerts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_notifications,
    COUNT(CASE WHEN NOT is_read THEN 1 END)::INTEGER as unread_notifications,
    COUNT(CASE WHEN priority = 'urgent' AND NOT is_read THEN 1 END)::INTEGER as urgent_notifications,
    COUNT(CASE WHEN type = 'new_order' AND created_at >= CURRENT_DATE THEN 1 END)::INTEGER as new_orders_today,
    COUNT(CASE WHEN type = 'low_stock' AND NOT is_read THEN 1 END)::INTEGER as low_stock_alerts
  FROM notifications 
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

-- ✅ التعليقات والملاحظات
COMMENT ON TABLE notifications IS 'جدول الإشعارات الفورية للطلبيات الأونلاين والمخزون المنخفض';
COMMENT ON FUNCTION notify_new_online_order() IS 'دالة إشعار الطلبيات الجديدة مع Realtime';
COMMENT ON FUNCTION notify_low_stock() IS 'دالة إشعار المخزون المنخفض مع Realtime';
COMMENT ON FUNCTION notify_order_status_change() IS 'دالة إشعار تغيير حالة الطلبية';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'دالة تنظيف الإشعارات القديمة';
COMMENT ON FUNCTION get_notification_stats(UUID) IS 'دالة إحصائيات الإشعارات'; 