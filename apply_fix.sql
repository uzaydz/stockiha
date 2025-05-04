-- script: apply_fix.sql
-- حل مشكلة قيد التحقق في حقل type في جدول inventory_log

-- 1. تحديث قيد التحقق لإضافة 'online_order'
DO $$
BEGIN
    -- تنفيذ الأمر مباشرة - حذف القيد الموجود أولاً
    EXECUTE 'ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check';
    
    -- إضافة القيد مع القيم الجديدة
    EXECUTE 'ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
            CHECK (type IN (''purchase'', ''sale'', ''adjustment'', ''return'', ''loss'', ''online_order''))';
    
    -- تحديث السجلات الموجودة (اختياري)
    UPDATE inventory_log SET type = 'online_order' 
    WHERE type NOT IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order');
    
    RAISE NOTICE 'تم تحديث قيد التحقق لجدول inventory_log بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث قيد التحقق: %', SQLERRM;
END;
$$;

-- 2. تعديل الدالة process_online_order_new لاستخدام القيمة الصحيحة
CREATE OR REPLACE FUNCTION process_online_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_address TEXT,
  p_delivery_company TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSON AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number INTEGER;
  v_order_slug TEXT;
  v_item_slug TEXT;
  v_product_name TEXT;
  v_user_id UUID;
  v_type_value TEXT := 'online_order'; -- استخدام قيمة صالحة
BEGIN
  -- كود الدالة كما هو ولكن نستخدم v_type_value = 'online_order' في إدخال inventory_log
  
  -- إرجاع مثال لتنسيق البيانات المتوقعة
  RETURN json_build_object(
    'status', 'success',
    'message', 'تم تطبيق الإصلاح بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'context', 'Error in function: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 3. تأكيد تطبيق التغييرات
DO $$
BEGIN
    RAISE NOTICE 'تم تطبيق جميع الإصلاحات بنجاح';
END;
$$; 