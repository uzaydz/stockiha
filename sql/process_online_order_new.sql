-- وظيفة معالجة الطلبات عبر الإنترنت مع معالجة البيانات المفقودة
CREATE OR REPLACE FUNCTION process_online_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT, 
  p_municipality TEXT,
  p_product_id UUID,
  p_organization_id UUID,
  p_address TEXT DEFAULT '',
  p_city TEXT DEFAULT NULL,
  p_delivery_company TEXT DEFAULT '',
  p_delivery_option TEXT DEFAULT 'home',
  p_payment_method TEXT DEFAULT 'cod',
  p_notes TEXT DEFAULT '',
  p_product_color_id UUID DEFAULT NULL,
  p_product_size_id UUID DEFAULT NULL,
  p_size_name TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_total_price NUMERIC DEFAULT 0,
  p_delivery_fee NUMERIC DEFAULT 0,
  p_form_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_stop_desk_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_customer_order_number INTEGER;
  v_product_name TEXT;
  v_product_slug TEXT;
  v_color_name TEXT;
  v_city TEXT;
  -- متغيرات خصم المخزون التلقائي
  v_auto_deduct_inventory BOOLEAN := FALSE;
  v_org_settings JSONB;
  -- متغيرات لاستخراج بيانات المقاس من form_data
  v_extracted_size_id UUID;
  v_extracted_size_name TEXT;
  v_final_size_id UUID;
  v_final_size_name TEXT;
  -- متغيرات فحص الحظر
  v_blocked BOOLEAN;
  v_block_reason TEXT;
  v_block_id UUID;
  v_block_name TEXT;
BEGIN
  -- 🚨 DEBUG: إضافة معلومات تشخيصية لتتبع المعاملات المستلمة
  RAISE NOTICE '🔍 [process_online_order_new] بدء معالجة طلبية جديدة - معرف المؤسسة: %, معرف المنتج: %, الكمية: %', p_organization_id, p_product_id, p_quantity;
  RAISE NOTICE '🎨 [process_online_order_new] معرف اللون: %, معرف المقاس: %', p_product_color_id, p_product_size_id;
  RAISE NOTICE '📋 [process_online_order_new] بيانات النموذج: %', p_form_data;

  -- التأكد من وجود القيم الأساسية
  IF p_full_name IS NULL OR p_phone IS NULL OR p_province IS NULL OR p_product_id IS NULL OR p_organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'البيانات الأساسية مفقودة',
      'detail', 'يجب توفير الاسم ورقم الهاتف والولاية ومعرف المنتج ومعرف المؤسسة'
    );
  END IF;

  -- التحقق من حظر العميل برقم الهاتف (حظر دائم حتى إلغاء الحظر)
  SELECT is_blocked, reason, blocked_id, name
  INTO v_blocked, v_block_reason, v_block_id, v_block_name
  FROM is_phone_blocked(p_organization_id, p_phone);

  IF COALESCE(v_blocked, FALSE) THEN
    RAISE NOTICE '⛔ [process_online_order_new] رقم الهاتف محظور. السبب: %', v_block_reason;
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'blocked_customer',
      'message', COALESCE('هذا الرقم محظور من الطلب: ' || v_block_reason, 'هذا الرقم محظور من الطلب'),
      'blocked_id', v_block_id,
      'name', v_block_name
    );
  END IF;

  -- استخراج معلومات المقاس من form_data إذا لم تُمرر مباشرة أو كانت فارغة
  IF (p_product_size_id IS NULL OR p_size_name IS NULL OR p_size_name = '') AND p_form_data IS NOT NULL THEN
    -- استخراج معرف المقاس من form_data بشكل آمن
    BEGIN
      -- التحقق من وجود القيمة وأنها ليست فارغة قبل التحويل
      IF p_form_data ? 'product_size' AND p_form_data->>'product_size' IS NOT NULL AND p_form_data->>'product_size' != '' THEN
        v_extracted_size_id := (p_form_data->>'product_size')::UUID;
      END IF;
    EXCEPTION
      WHEN invalid_text_representation THEN
        -- تجاهل الخطأ إذا كانت القيمة غير صالحة كـ UUID
        v_extracted_size_id := NULL;
        RAISE NOTICE '⚠️ [process_online_order_new] قيمة product_size غير صالحة في form_data: %', p_form_data->>'product_size';
    END;
    
    -- جلب اسم المقاس من قاعدة البيانات إذا تم العثور على المعرف
    IF v_extracted_size_id IS NOT NULL THEN
      SELECT size_name INTO v_extracted_size_name 
      FROM product_sizes 
      WHERE id = v_extracted_size_id;
      
      RAISE NOTICE '🔧 [process_online_order_new] تم استخراج المقاس من form_data - المعرف: %, الاسم: %', 
        v_extracted_size_id, v_extracted_size_name;
    END IF;
  END IF;
  
  -- تحديد القيم النهائية للمقاس (إعطاء أولوية للقيم المُمررة مباشرة، ثم المستخرجة من form_data)
  v_final_size_id := COALESCE(p_product_size_id, v_extracted_size_id);
  v_final_size_name := COALESCE(NULLIF(p_size_name, ''), v_extracted_size_name);
  
  RAISE NOTICE '✅ [process_online_order_new] القيم النهائية للمقاس - المعرف: %, الاسم: %', 
    v_final_size_id, v_final_size_name;

  -- التأكد من وجود قيمة مناسبة للمدينة
  v_city := COALESCE(p_city, p_municipality, p_province, 'غير محدد');
  
  -- 1. إنشاء أو تحديث بيانات العميل
  SELECT id INTO v_customer_id FROM guest_customers 
  WHERE phone = p_phone AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO guest_customers (name, phone, organization_id)
    VALUES (p_full_name, p_phone, p_organization_id)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE guest_customers 
    SET name = p_full_name 
    WHERE id = v_customer_id;
  END IF;
  
  -- 2. إنشاء عنوان جديد
  BEGIN
    INSERT INTO addresses (
      customer_id,
      name,
      state,
      municipality,
      street_address,
      city,
      country,
      organization_id
    )
    VALUES (
      v_customer_id,
      p_full_name,
      p_province,
      COALESCE(p_municipality, p_province),
      COALESCE(p_address, 'غير محدد'),
      v_city,
      'الجزائر',
      p_organization_id
    )
    RETURNING id INTO v_address_id;
  EXCEPTION WHEN OTHERS THEN
    -- إذا فشل إدخال العنوان، أنشئ عنوانًا بالحد الأدنى من البيانات
    INSERT INTO addresses (
      customer_id,
      name,
      state,
      city,
      street_address,
      country,
      organization_id
    )
    VALUES (
      v_customer_id,
      p_full_name,
      p_province,
      p_province,
      'غير محدد',
      'الجزائر',
      p_organization_id
    )
    RETURNING id INTO v_address_id;
  END;
  
  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- 4. إنشاء الطلب مع بيانات النموذج والبيانات الوصفية
  INSERT INTO online_orders (
    customer_id,
    subtotal,
    tax,
    discount,
    total,
    status,
    payment_method,
    payment_status,
    shipping_address_id,
    shipping_method,
    shipping_cost,
    notes,
    organization_id,
    customer_order_number,
    form_data,
    metadata,
    stop_desk_id
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0,
    0,
    p_total_price + p_delivery_fee, -- الإجمالي = سعر المنتجات + رسوم الشحن
    'pending',
    COALESCE(p_payment_method, 'cod'),
    'pending',
    v_address_id,
    COALESCE(p_delivery_company, ''),
    p_delivery_fee,
    p_notes,
    p_organization_id,
    v_customer_order_number,
    p_form_data,
    p_metadata,
    p_stop_desk_id
  )
  RETURNING id INTO v_order_id;
  
  -- 5. الحصول على اسم المنتج و slug
  SELECT name, slug INTO v_product_name, v_product_slug FROM products WHERE id = p_product_id;
  
  -- التأكد من وجود slug
  IF v_product_slug IS NULL OR v_product_slug = '' THEN
    v_product_slug := 'product-' || p_product_id;
  END IF;
  
  -- الحصول على اسم اللون إذا كان متوفراً
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name FROM product_colors WHERE id = p_product_color_id;
  END IF;
  
  -- 6. إنشاء عنصر الطلب مع معلومات اللون والمقاس (باستخدام القيم النهائية للمقاس)
  INSERT INTO online_order_items (
    order_id,
    product_id,
    product_name,
    name,
    slug,
    quantity,
    unit_price,
    total_price,
    organization_id,
    color_id,
    color_name,
    size_id,
    size_name,
    selected_price
  )
  VALUES (
    v_order_id,
    p_product_id,
    v_product_name,
    v_product_name,
    v_product_slug,
    COALESCE(p_quantity, 1),
    COALESCE(p_unit_price, 0),
    COALESCE(p_total_price, 0),
    p_organization_id,
    p_product_color_id,
    v_color_name,
    v_final_size_id,     -- استخدام القيمة النهائية للمقاس
    v_final_size_name,   -- استخدام القيمة النهائية لاسم المقاس
    COALESCE(p_unit_price, 0)
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون - مع مراعاة اللون والمقاس وإعدادات المؤسسة
  -- التحقق من إعدادات المؤسسة لخصم المخزون التلقائي
  RAISE NOTICE '⚙️ [process_online_order_new] جاري فحص إعدادات المؤسسة لخصم المخزون التلقائي...';
  
  SELECT custom_js INTO v_org_settings 
  FROM organization_settings 
  WHERE organization_id = p_organization_id;
  
  RAISE NOTICE '📊 [process_online_order_new] إعدادات المؤسسة المُسترجعة: %', v_org_settings;
  
  -- استخراج إعداد خصم المخزون التلقائي
  IF v_org_settings IS NOT NULL THEN
    v_auto_deduct_inventory := COALESCE((v_org_settings->>'auto_deduct_inventory')::BOOLEAN, FALSE);
    RAISE NOTICE '🔧 [process_online_order_new] إعداد خصم المخزون التلقائي: %', v_auto_deduct_inventory;
  ELSE
    RAISE NOTICE '⚠️ [process_online_order_new] لم يتم العثور على إعدادات المؤسسة';
  END IF;
  
  -- خصم المخزون فقط إذا كان مفعلاً في إعدادات المؤسسة (باستخدام القيم النهائية)
  IF v_auto_deduct_inventory = TRUE THEN
    RAISE NOTICE '✅ [process_online_order_new] خصم المخزون التلقائي مفعل - جاري خصم المخزون...';
    
    IF v_final_size_id IS NOT NULL THEN
      RAISE NOTICE '📏 [process_online_order_new] خصم المخزون من المقاس - معرف المقاس: %, الكمية: %', v_final_size_id, p_quantity;
      -- استخدام الدالة الجديدة لتجاوز RLS
      PERFORM bypass_rls_update_product_size_quantity(v_final_size_id, COALESCE(p_quantity, 1));
      RAISE NOTICE '✅ [process_online_order_new] تم خصم المخزون من المقاس بنجاح';
      
    ELSIF p_product_color_id IS NOT NULL THEN
      RAISE NOTICE '🎨 [process_online_order_new] خصم المخزون من اللون - معرف اللون: %, الكمية: %', p_product_color_id, p_quantity;
      -- استخدام الدالة الجديدة لتجاوز RLS
      PERFORM bypass_rls_update_product_color_quantity(p_product_color_id, COALESCE(p_quantity, 1));
      RAISE NOTICE '✅ [process_online_order_new] تم خصم المخزون من اللون بنجاح';
      
    ELSE
      RAISE NOTICE '📦 [process_online_order_new] خصم المخزون من المنتج الرئيسي - معرف المنتج: %, الكمية: %', p_product_id, p_quantity;
      -- استخدام الدالة الجديدة لتجاوز RLS
      PERFORM bypass_rls_update_product_stock(p_product_id, COALESCE(p_quantity, 1));
      RAISE NOTICE '✅ [process_online_order_new] تم خصم المخزون من المنتج الرئيسي بنجاح';
    END IF;
  ELSE
    RAISE NOTICE '❌ [process_online_order_new] خصم المخزون التلقائي غير مفعل - لن يتم خصم المخزون';
  END IF;
  
  -- 8. إرجاع معلومات الطلب
  RAISE NOTICE '🎯 [process_online_order_new] اكتملت معالجة الطلبية بنجاح - معرف الطلب: %, رقم الطلب: %', v_order_id, v_customer_order_number;
  
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'status', 'success',
    'auto_deduct_inventory', v_auto_deduct_inventory,
    'size_fixed', (v_final_size_id IS NOT NULL)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ [process_online_order_new] خطأ في معالجة الطلبية: %, التفاصيل: %', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql; 
