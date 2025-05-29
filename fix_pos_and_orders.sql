-- إصلاح مشكلة دالة get_pos_settings ونظام الطلبيات

-- 1. إصلاح دالة get_pos_settings
CREATE OR REPLACE FUNCTION get_pos_settings(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  store_name VARCHAR(255),
  store_phone VARCHAR(50),
  store_email VARCHAR(100),
  store_address TEXT,
  store_website VARCHAR(255),
  store_logo_url TEXT,
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  welcome_message TEXT,
  show_qr_code BOOLEAN,
  show_tracking_code BOOLEAN,
  show_customer_info BOOLEAN,
  show_store_logo BOOLEAN,
  show_store_info BOOLEAN,
  show_date_time BOOLEAN,
  show_employee_name BOOLEAN,
  paper_width INTEGER,
  font_size INTEGER,
  line_spacing DECIMAL(2,1),
  print_density VARCHAR(20),
  auto_cut BOOLEAN,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  text_color VARCHAR(7),
  background_color VARCHAR(7),
  receipt_template VARCHAR(50),
  header_style VARCHAR(20),
  footer_style VARCHAR(20),
  item_display_style VARCHAR(20),
  price_position VARCHAR(20),
  custom_css TEXT,
  tax_label VARCHAR(50),
  currency_symbol VARCHAR(10),
  currency_position VARCHAR(10),
  allow_price_edit BOOLEAN,
  require_manager_approval BOOLEAN,
  business_license VARCHAR(100),
  tax_number VARCHAR(100),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_org_id UUID;
  v_has_access BOOLEAN;
BEGIN
  -- التحقق من صلاحية المستخدم مع مرونة أكبر
  SELECT 
    u.organization_id,
    (u.organization_id = p_organization_id AND u.is_active = true) OR u.is_super_admin = true
  INTO 
    v_user_org_id,
    v_has_access
  FROM 
    users u
  WHERE 
    u.id = auth.uid();
  
  -- إذا لم يتم العثور على المستخدم، نسمح بالقراءة للإعدادات الافتراضية
  IF v_user_org_id IS NULL THEN
    -- إنشاء إعدادات افتراضية مؤقتة
    RETURN QUERY
    SELECT 
      gen_random_uuid() as id,
      p_organization_id as organization_id,
      'المتجر'::VARCHAR(255) as store_name,
      NULL::VARCHAR(50) as store_phone,
      NULL::VARCHAR(100) as store_email,
      NULL::TEXT as store_address,
      NULL::VARCHAR(255) as store_website,
      NULL::TEXT as store_logo_url,
      'شكراً لتعاملكم معنا'::TEXT as receipt_header_text,
      'نتطلع لخدمتكم مرة أخرى'::TEXT as receipt_footer_text,
      'أهلاً وسهلاً بكم'::TEXT as welcome_message,
      true as show_qr_code,
      true as show_tracking_code,
      true as show_customer_info,
      true as show_store_logo,
      true as show_store_info,
      true as show_date_time,
      false as show_employee_name,
      58 as paper_width,
      10 as font_size,
      1.2 as line_spacing,
      'normal'::VARCHAR(20) as print_density,
      true as auto_cut,
      '#0099ff'::VARCHAR(7) as primary_color,
      '#6c757d'::VARCHAR(7) as secondary_color,
      '#000000'::VARCHAR(7) as text_color,
      '#ffffff'::VARCHAR(7) as background_color,
      'classic'::VARCHAR(50) as receipt_template,
      'centered'::VARCHAR(20) as header_style,
      'centered'::VARCHAR(20) as footer_style,
      'table'::VARCHAR(20) as item_display_style,
      'right'::VARCHAR(20) as price_position,
      NULL::TEXT as custom_css,
      'الضريبة'::VARCHAR(50) as tax_label,
      'دج'::VARCHAR(10) as currency_symbol,
      'after'::VARCHAR(10) as currency_position,
      false as allow_price_edit,
      false as require_manager_approval,
      NULL::VARCHAR(100) as business_license,
      NULL::VARCHAR(100) as tax_number,
      NOW() as created_at,
      NOW() as updated_at;
    RETURN;
  END IF;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى إعدادات هذه المؤسسة';
  END IF;

  -- إنشاء إعدادات افتراضية إذا لم تكن موجودة
  IF NOT EXISTS (SELECT 1 FROM pos_settings WHERE organization_id = p_organization_id) THEN
    PERFORM initialize_pos_settings(p_organization_id);
  END IF;

  RETURN QUERY
  SELECT 
    ps.id,
    ps.organization_id,
    ps.store_name,
    ps.store_phone,
    ps.store_email,
    ps.store_address,
    ps.store_website,
    ps.store_logo_url,
    ps.receipt_header_text,
    ps.receipt_footer_text,
    ps.welcome_message,
    ps.show_qr_code,
    ps.show_tracking_code,
    ps.show_customer_info,
    ps.show_store_logo,
    ps.show_store_info,
    ps.show_date_time,
    ps.show_employee_name,
    ps.paper_width,
    ps.font_size,
    ps.line_spacing,
    ps.print_density,
    ps.auto_cut,
    ps.primary_color,
    ps.secondary_color,
    ps.text_color,
    ps.background_color,
    ps.receipt_template,
    ps.header_style,
    ps.footer_style,
    ps.item_display_style,
    ps.price_position,
    ps.custom_css,
    ps.tax_label,
    ps.currency_symbol,
    ps.currency_position,
    ps.allow_price_edit,
    ps.require_manager_approval,
    ps.business_license,
    ps.tax_number,
    ps.created_at,
    ps.updated_at
  FROM 
    pos_settings ps
  WHERE 
    ps.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. إصلاح دالة initialize_pos_settings
CREATE OR REPLACE FUNCTION initialize_pos_settings(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_name VARCHAR(255);
BEGIN
  -- الحصول على اسم المؤسسة
  SELECT name INTO v_org_name FROM organizations WHERE id = p_organization_id;

  -- إنشاء إعدادات افتراضية
  INSERT INTO pos_settings (
    organization_id,
    store_name,
    receipt_header_text,
    receipt_footer_text,
    welcome_message
  ) VALUES (
    p_organization_id,
    COALESCE(v_org_name, 'المتجر'),
    'شكراً لتعاملكم معنا',
    'نتطلع لخدمتكم مرة أخرى • ' || COALESCE(v_org_name, 'المتجر'),
    'أهلاً وسهلاً بكم في ' || COALESCE(v_org_name, 'المتجر')
  ) ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة أي خطأ، نعيد TRUE لتجنب فشل العملية
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إضافة الأعمدة المفقودة في جدول orders إذا لم تكن موجودة
DO $$ 
BEGIN
    -- إضافة عمود payment_status إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid';
    END IF;

    -- إضافة عمود payment_method إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);
    END IF;

    -- إضافة عمود amount_paid إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'amount_paid') THEN
        ALTER TABLE orders ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- إضافة عمود pos_order_type إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'pos_order_type') THEN
        ALTER TABLE orders ADD COLUMN pos_order_type VARCHAR(20) DEFAULT 'pos';
    END IF;

    -- إضافة عمود slug إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'slug') THEN
        ALTER TABLE orders ADD COLUMN slug VARCHAR(255);
    END IF;

    -- إضافة عمود employee_id إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'employee_id') THEN
        ALTER TABLE orders ADD COLUMN employee_id UUID REFERENCES users(id);
    END IF;

    -- إضافة عمود completed_at إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    -- إضافة عمود customer_notes إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'customer_notes') THEN
        ALTER TABLE orders ADD COLUMN customer_notes TEXT;
    END IF;

    -- إضافة عمود admin_notes إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'admin_notes') THEN
        ALTER TABLE orders ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- 4. إصلاح سياسات RLS لجدول orders
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON orders;

-- إنشاء سياسات جديدة أكثر مرونة
CREATE POLICY "orders_select_policy" ON orders
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_super_admin = true
        )
    );

CREATE POLICY "orders_insert_policy" ON orders
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_super_admin = true
        )
    );

CREATE POLICY "orders_update_policy" ON orders
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_super_admin = true
        )
    );

CREATE POLICY "orders_delete_policy" ON orders
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
            AND (is_org_admin = true OR is_super_admin = true)
        )
    );

-- 5. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_orders_organization_id_status ON orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_employee_id ON orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);

-- 6. دالة لإنشاء طلبية جديدة في نقطة البيع
CREATE OR REPLACE FUNCTION create_pos_order(
    p_organization_id UUID,
    p_customer_id UUID,
    p_employee_id UUID,
    p_items JSONB,
    p_total_amount DECIMAL,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_payment_status VARCHAR DEFAULT 'paid',
    p_notes TEXT DEFAULT NULL
)
RETURNS orders AS $$
DECLARE
    v_new_order orders;
    v_order_slug VARCHAR;
    v_item JSONB;
BEGIN
    -- توليد slug فريد للطلبية
    v_order_slug := 'POS-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS-') || 
                    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8);

    -- إنشاء الطلبية
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        slug,
        status,
        payment_status,
        payment_method,
        total,
        amount_paid,
        pos_order_type,
        admin_notes,
        created_at,
        updated_at
    ) VALUES (
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
        'pos',
        p_notes,
        NOW(),
        NOW()
    ) RETURNING * INTO v_new_order;

    -- إضافة عناصر الطلبية
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price,
            total
        ) VALUES (
            v_new_order.id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL,
            (v_item->>'total')::DECIMAL
        );
    END LOOP;

    -- تحديث completed_at إذا كانت الطلبية مكتملة
    IF v_new_order.status = 'completed' THEN
        UPDATE orders 
        SET completed_at = NOW() 
        WHERE id = v_new_order.id;
    END IF;

    RETURN v_new_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_pos_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_pos_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_pos_order(UUID, UUID, UUID, JSONB, DECIMAL, VARCHAR, VARCHAR, TEXT) TO authenticated;