-- إنشاء جدول الفواتير
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL,
    customer_name TEXT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount NUMERIC NOT NULL,
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue', 'canceled')),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('pos', 'online', 'service', 'combined')),
    source_id TEXT,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'canceled', 'partial')),
    notes TEXT,
    custom_fields JSONB,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    subtotal_amount NUMERIC NOT NULL,
    shipping_amount NUMERIC,
    customer_info JSONB,
    organization_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (invoice_number, organization_id)
);

-- إنشاء جدول عناصر الفواتير
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('product', 'service', 'fee', 'discount', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء مؤشر للبحث في الفواتير
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_source_type ON public.invoices(source_type);

-- إنشاء مؤشر للبحث في عناصر الفواتير
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON public.invoice_items(service_id);

-- إنشاء دالة لتحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- إنشاء محفز لتحديث تاريخ التعديل في جدول الفواتير
DROP TRIGGER IF EXISTS update_invoices_modtime ON public.invoices;
CREATE TRIGGER update_invoices_modtime
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- إنشاء محفز لتحديث تاريخ التعديل في جدول عناصر الفواتير
DROP TRIGGER IF EXISTS update_invoice_items_modtime ON public.invoice_items;
CREATE TRIGGER update_invoice_items_modtime
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- تطبيق سياسات أمان حسب المؤسسة
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة الفواتير (يمكن للمستخدمين المصرح لهم قراءة فواتير مؤسستهم فقط)
DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;
CREATE POLICY invoices_select_policy ON public.invoices
    FOR SELECT
    USING (
        organization_id IN (
            SELECT org.id FROM organizations org
            JOIN user_organizations uo ON org.id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- سياسة إدارة الفواتير (يمكن للمستخدمين المصرح لهم إدارة فواتير مؤسستهم فقط)
DROP POLICY IF EXISTS invoices_modify_policy ON public.invoices;
CREATE POLICY invoices_modify_policy ON public.invoices
    FOR ALL
    USING (
        organization_id IN (
            SELECT org.id FROM organizations org
            JOIN user_organizations uo ON org.id = uo.organization_id
            WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'editor')
        )
    );

-- سياسة قراءة عناصر الفواتير (يمكن للمستخدمين المصرح لهم قراءة عناصر فواتير مؤسستهم فقط)
DROP POLICY IF EXISTS invoice_items_select_policy ON public.invoice_items;
CREATE POLICY invoice_items_select_policy ON public.invoice_items
    FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE organization_id IN (
                SELECT org.id FROM organizations org
                JOIN user_organizations uo ON org.id = uo.organization_id
                WHERE uo.user_id = auth.uid()
            )
        )
    );

-- سياسة إدارة عناصر الفواتير (يمكن للمستخدمين المصرح لهم إدارة عناصر فواتير مؤسستهم فقط)
DROP POLICY IF EXISTS invoice_items_modify_policy ON public.invoice_items;
CREATE POLICY invoice_items_modify_policy ON public.invoice_items
    FOR ALL
    USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE organization_id IN (
                SELECT org.id FROM organizations org
                JOIN user_organizations uo ON org.id = uo.organization_id
                WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'editor')
            )
        )
    );

-- إنشاء دالة لإنشاء فاتورة من طلب نقاط البيع
CREATE OR REPLACE FUNCTION create_invoice_from_pos_order(order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_customer RECORD;
    v_organization RECORD;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_next_number INTEGER;
    v_prefix TEXT;
    v_order_item RECORD;
BEGIN
    -- جلب معلومات الطلب
    SELECT * INTO v_order FROM orders WHERE id = order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الطلب غير موجود: %', order_id;
    END IF;
    
    -- جلب معلومات العميل إذا كان موجوداً
    IF v_order.customer_id IS NOT NULL THEN
        SELECT * INTO v_customer FROM customers WHERE id = v_order.customer_id;
    END IF;
    
    -- جلب معلومات المؤسسة
    SELECT * INTO v_organization FROM organizations WHERE id = v_order.organization_id;
    
    -- إنشاء رقم الفاتورة
    SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 4) AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM invoices
    WHERE organization_id = v_order.organization_id;
    
    v_prefix = COALESCE(LEFT(v_organization.name, 3), 'INV');
    v_invoice_number = CONCAT(
        UPPER(v_prefix),
        '-POS-',
        TO_CHAR(NOW(), 'YYMM'),
        '-',
        LPAD(v_next_number::TEXT, 4, '0')
    );
    
    -- إنشاء الفاتورة
    INSERT INTO invoices (
        invoice_number,
        customer_name,
        customer_id,
        total_amount,
        invoice_date,
        status,
        organization_id,
        source_type,
        source_id,
        payment_method,
        payment_status,
        notes,
        tax_amount,
        discount_amount,
        subtotal_amount,
        shipping_amount,
        customer_info,
        organization_info
    ) VALUES (
        v_invoice_number,
        COALESCE(v_customer.name, 'عميل نقدي'),
        v_order.customer_id,
        v_order.total,
        COALESCE(v_order.created_at, NOW()),
        CASE WHEN v_order.payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
        v_order.organization_id,
        'pos',
        order_id::TEXT,
        v_order.payment_method,
        v_order.payment_status,
        v_order.notes,
        v_order.tax,
        COALESCE(v_order.discount, 0),
        v_order.subtotal,
        v_order.shipping_cost,
        CASE WHEN v_customer.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_customer.id,
                'name', v_customer.name,
                'email', v_customer.email,
                'phone', v_customer.phone,
                'address', null
            )
        ELSE
            jsonb_build_object(
                'id', null,
                'name', 'عميل نقدي',
                'email', null,
                'phone', null,
                'address', null
            )
        END,
        jsonb_build_object(
            'name', v_organization.name,
            'logo', null,
            'address', v_organization.address,
            'phone', v_organization.phone,
            'email', v_organization.email,
            'website', v_organization.website,
            'taxNumber', v_organization.tax_number,
            'registrationNumber', v_organization.registration_number,
            'additionalInfo', null
        )
    )
    RETURNING id INTO v_invoice_id;
    
    -- إضافة عناصر الفاتورة
    FOR v_order_item IN SELECT * FROM order_items WHERE order_id = order_id
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            name,
            description,
            quantity,
            unit_price,
            total_price,
            product_id,
            type
        ) VALUES (
            v_invoice_id,
            COALESCE(v_order_item.product_name, v_order_item.name),
            null,
            v_order_item.quantity,
            v_order_item.unit_price,
            v_order_item.total_price,
            v_order_item.product_id,
            'product'
        );
    END LOOP;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ فقط إذا كان هناك طلبات
COMMENT ON FUNCTION create_invoice_from_pos_order(UUID) IS 'دالة لإنشاء فاتورة تلقائياً من طلب نقاط البيع'; 