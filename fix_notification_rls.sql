-- إصلاح مشكلة RLS في دوال الإشعارات
-- إضافة SECURITY DEFINER لتجاوز قيود Row Level Security

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
  -- 👤 الحصول على اسم العميل (تصحيح اسم الجدول والعمود)
  SELECT name INTO customer_name 
  FROM guest_customers 
  WHERE id = NEW.customer_id;
  
  -- 🔍 التحقق من وجود اسم العميل
  IF customer_name IS NULL THEN
    customer_name := 'عميل غير محدد';
  END IF;
  
  -- 🎯 تحديد أولوية الإشعار بناءً على قيمة الطلبية
  IF NEW.total >= 10000 THEN
    priority_level := 'high';
  ELSIF NEW.total >= 5000 THEN
    priority_level := 'medium';
  ELSE
    priority_level := 'low';
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
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN NEW;
END;
$$;

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
        'current_stock', NEW.stock_quantity,
        'min_level', min_level,
        'product_id', NEW.id
      )
    );
    
    -- 🔔 إشعار Realtime للمخزون المنخفض
    PERFORM pg_notify(
      'low_stock_' || NEW.organization_id,
      json_build_object(
        'type', 'low_stock',
        'product_id', NEW.id,
        'product_name', NEW.name,
        'current_stock', NEW.stock_quantity,
        'min_level', min_level,
        'priority', priority_level,
        'timestamp', extract(epoch from now())
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$; 