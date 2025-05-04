-- =============================
-- نظام إدارة الموردين - SQL Implementation
-- =============================

-- التأكد من وجود الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================
-- إنشاء الجداول الأساسية
-- ======================

-- جدول الموردين
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  tax_number VARCHAR(100),
  business_type VARCHAR(100),
  notes TEXT,
  rating SMALLINT DEFAULT 0,
  supplier_type VARCHAR(50) CHECK (supplier_type IN ('local', 'international')),
  supplier_category VARCHAR(50) CHECK (supplier_category IN ('wholesale', 'retail', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- جدول مشتريات الموردين
CREATE TABLE IF NOT EXISTS public.supplier_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number VARCHAR(100) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status VARCHAR(50) CHECK (status IN ('draft', 'confirmed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  payment_status VARCHAR(50) GENERATED ALWAYS AS (
    CASE
      WHEN paid_amount = 0 THEN 'unpaid'
      WHEN paid_amount < total_amount THEN 'partially_paid'
      WHEN paid_amount >= total_amount THEN 'paid'
    END
  ) STORED,
  payment_terms VARCHAR(100),
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- جدول عناصر المشتريات
CREATE TABLE IF NOT EXISTS public.supplier_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.supplier_purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price * tax_rate / 100) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول مدفوعات الموردين
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.supplier_purchases(id) ON DELETE SET NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'check', 'other')),
  reference_number VARCHAR(100),
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- جدول جهات الاتصال للموردين
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول تقييمات الموردين
CREATE TABLE IF NOT EXISTS public.supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  review_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ======================
-- الوظائف (Functions) والمحفزات (Triggers)
-- ======================

-- وظيفة لتحديث وقت التعديل تلقائيًا
CREATE OR REPLACE FUNCTION update_supplier_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتحديث متوسط تقييم المورد
CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.suppliers
  SET rating = (
    SELECT ROUND(AVG(rating))
    FROM public.supplier_ratings
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتحديث المخزون عند تأكيد المشتريات
CREATE OR REPLACE FUNCTION update_inventory_from_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث المخزون فقط عند تغيير حالة المشتريات إلى "confirmed"
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- تحديث كميات المنتجات في المخزون
    INSERT INTO public.inventory_log (
      product_id, 
      quantity, 
      type,
      reference_type, 
      reference_id, 
      organization_id, 
      created_by
    )
    SELECT 
      spi.product_id,
      spi.quantity,
      'increase',
      'supplier_purchase',
      NEW.id,
      NEW.organization_id,
      NEW.created_by
    FROM 
      public.supplier_purchase_items spi
    WHERE 
      spi.purchase_id = NEW.id AND spi.product_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- وظيفة للتحقق من المدفوعات المتأخرة
CREATE OR REPLACE FUNCTION check_overdue_purchases()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث حالة المشتريات إلى "overdue" إذا تجاوزت تاريخ الاستحقاق
  -- Use a direct update that won't fire the updated_at trigger to avoid recursion
  UPDATE public.supplier_purchases
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE 
    status NOT IN ('paid', 'cancelled', 'overdue') 
    AND due_date < CURRENT_DATE
    AND balance_due > 0;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء المحفزات (Triggers)
DROP TRIGGER IF EXISTS update_supplier_updated_at ON public.suppliers;
CREATE TRIGGER update_supplier_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_purchase_updated_at ON public.supplier_purchases;
CREATE TRIGGER update_supplier_purchase_updated_at
BEFORE UPDATE ON public.supplier_purchases
FOR EACH ROW EXECUTE FUNCTION update_supplier_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_rating_trigger ON public.supplier_ratings;
CREATE TRIGGER update_supplier_rating_trigger
AFTER INSERT OR UPDATE ON public.supplier_ratings
FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

DROP TRIGGER IF EXISTS update_inventory_from_purchase_trigger ON public.supplier_purchases;
CREATE TRIGGER update_inventory_from_purchase_trigger
AFTER UPDATE OF status ON public.supplier_purchases
FOR EACH ROW EXECUTE FUNCTION update_inventory_from_purchase();

-- Modified trigger to execute less frequently to avoid stack depth issues
DROP TRIGGER IF EXISTS check_overdue_purchases_trigger ON public.supplier_purchases;
CREATE TRIGGER check_overdue_purchases_trigger
AFTER INSERT ON public.supplier_purchases
FOR EACH STATEMENT EXECUTE FUNCTION check_overdue_purchases();

-- ======================
-- إنشاء المناظير (Views) للتقارير
-- ======================

-- منظور لملخص مدفوعات الموردين
CREATE OR REPLACE VIEW public.supplier_payment_summary AS
SELECT
  s.id AS supplier_id,
  s.name,
  s.company_name,
  COUNT(DISTINCT sp.id) AS total_purchases,
  SUM(sp.total_amount) AS total_purchase_amount,
  SUM(sp.paid_amount) AS total_paid_amount,
  SUM(sp.balance_due) AS total_outstanding,
  s.organization_id
FROM
  public.suppliers s
LEFT JOIN
  public.supplier_purchases sp ON s.id = sp.supplier_id
GROUP BY
  s.id, s.name, s.company_name, s.organization_id;

-- منظور لأداء المورّدين
CREATE OR REPLACE VIEW public.supplier_performance AS
SELECT
  s.id AS supplier_id,
  s.name,
  s.company_name,
  s.rating,
  COUNT(DISTINCT sp.id) AS total_purchases,
  AVG(EXTRACT(EPOCH FROM (sp.created_at - sp.purchase_date))/86400) AS avg_delivery_days,
  s.organization_id
FROM
  public.suppliers s
LEFT JOIN
  public.supplier_purchases sp ON s.id = sp.supplier_id
GROUP BY
  s.id, s.name, s.company_name, s.rating, s.organization_id;

-- منظور للمشتريات المتأخرة
CREATE OR REPLACE VIEW public.overdue_supplier_purchases AS
SELECT
  sp.id,
  sp.purchase_number,
  sp.supplier_id,
  s.name AS supplier_name,
  sp.purchase_date,
  sp.due_date,
  sp.total_amount,
  sp.paid_amount,
  sp.balance_due,
  sp.status,
  sp.payment_status,
  sp.organization_id,
  EXTRACT(DAY FROM (CURRENT_DATE - sp.due_date)) AS days_overdue
FROM
  public.supplier_purchases sp
JOIN
  public.suppliers s ON sp.supplier_id = s.id
WHERE
  sp.due_date < CURRENT_DATE
  AND sp.balance_due > 0
  AND sp.status != 'cancelled';

-- ======================
-- سياسات أمان الصفوف (RLS Policies)
-- ======================

-- تفعيل RLS على الجداول
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ratings ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للمؤسسات بقراءة السجلات الخاصة بها
DROP POLICY IF EXISTS "org_tenant_suppliers_select" ON public.suppliers;
CREATE POLICY "org_tenant_suppliers_select" 
ON public.suppliers
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_suppliers_insert" ON public.suppliers;
CREATE POLICY "org_tenant_suppliers_insert" 
ON public.suppliers
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_suppliers_update" ON public.suppliers;
CREATE POLICY "org_tenant_suppliers_update" 
ON public.suppliers
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_suppliers_delete" ON public.suppliers;
CREATE POLICY "org_tenant_suppliers_delete" 
ON public.suppliers
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسات لجدول مشتريات الموردين
DROP POLICY IF EXISTS "org_tenant_supplier_purchases_select" ON public.supplier_purchases;
CREATE POLICY "org_tenant_supplier_purchases_select" 
ON public.supplier_purchases
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_purchases_insert" ON public.supplier_purchases;
CREATE POLICY "org_tenant_supplier_purchases_insert" 
ON public.supplier_purchases
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_purchases_update" ON public.supplier_purchases;
CREATE POLICY "org_tenant_supplier_purchases_update" 
ON public.supplier_purchases
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_purchases_delete" ON public.supplier_purchases;
CREATE POLICY "org_tenant_supplier_purchases_delete" 
ON public.supplier_purchases
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسات لجدول العناصر
DROP POLICY IF EXISTS "org_tenant_supplier_purchase_items_select" ON public.supplier_purchase_items;
CREATE POLICY "org_tenant_supplier_purchase_items_select" 
ON public.supplier_purchase_items
FOR SELECT
USING (purchase_id IN (
  SELECT id FROM public.supplier_purchases 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_purchase_items_insert" ON public.supplier_purchase_items;
CREATE POLICY "org_tenant_supplier_purchase_items_insert" 
ON public.supplier_purchase_items
FOR INSERT
WITH CHECK (purchase_id IN (
  SELECT id FROM public.supplier_purchases 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_purchase_items_update" ON public.supplier_purchase_items;
CREATE POLICY "org_tenant_supplier_purchase_items_update" 
ON public.supplier_purchase_items
FOR UPDATE
USING (purchase_id IN (
  SELECT id FROM public.supplier_purchases 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_purchase_items_delete" ON public.supplier_purchase_items;
CREATE POLICY "org_tenant_supplier_purchase_items_delete" 
ON public.supplier_purchase_items
FOR DELETE
USING (purchase_id IN (
  SELECT id FROM public.supplier_purchases 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

-- سياسات لجدول المدفوعات
DROP POLICY IF EXISTS "org_tenant_supplier_payments_select" ON public.supplier_payments;
CREATE POLICY "org_tenant_supplier_payments_select" 
ON public.supplier_payments
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_payments_insert" ON public.supplier_payments;
CREATE POLICY "org_tenant_supplier_payments_insert" 
ON public.supplier_payments
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_payments_update" ON public.supplier_payments;
CREATE POLICY "org_tenant_supplier_payments_update" 
ON public.supplier_payments
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_payments_delete" ON public.supplier_payments;
CREATE POLICY "org_tenant_supplier_payments_delete" 
ON public.supplier_payments
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسات لجدول جهات الاتصال
DROP POLICY IF EXISTS "org_tenant_supplier_contacts_select" ON public.supplier_contacts;
CREATE POLICY "org_tenant_supplier_contacts_select" 
ON public.supplier_contacts
FOR SELECT
USING (supplier_id IN (
  SELECT id FROM public.suppliers 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_contacts_insert" ON public.supplier_contacts;
CREATE POLICY "org_tenant_supplier_contacts_insert" 
ON public.supplier_contacts
FOR INSERT
WITH CHECK (supplier_id IN (
  SELECT id FROM public.suppliers 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_contacts_update" ON public.supplier_contacts;
CREATE POLICY "org_tenant_supplier_contacts_update" 
ON public.supplier_contacts
FOR UPDATE
USING (supplier_id IN (
  SELECT id FROM public.suppliers 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "org_tenant_supplier_contacts_delete" ON public.supplier_contacts;
CREATE POLICY "org_tenant_supplier_contacts_delete" 
ON public.supplier_contacts
FOR DELETE
USING (supplier_id IN (
  SELECT id FROM public.suppliers 
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

-- سياسات لجدول التقييمات
DROP POLICY IF EXISTS "org_tenant_supplier_ratings_select" ON public.supplier_ratings;
CREATE POLICY "org_tenant_supplier_ratings_select" 
ON public.supplier_ratings
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_ratings_insert" ON public.supplier_ratings;
CREATE POLICY "org_tenant_supplier_ratings_insert" 
ON public.supplier_ratings
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_ratings_update" ON public.supplier_ratings;
CREATE POLICY "org_tenant_supplier_ratings_update" 
ON public.supplier_ratings
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_tenant_supplier_ratings_delete" ON public.supplier_ratings;
CREATE POLICY "org_tenant_supplier_ratings_delete" 
ON public.supplier_ratings
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ملاحظة: لا يمكن تطبيق RLS مباشرة على المناظير (Views)
-- الأمان سيتم تنفيذه عبر الجداول الأساسية التي تعتمد عليها المناظير

-- ======================
-- محفزات للإعداد التلقائي للمنظمة
-- ======================

-- محفز لتعيين معرف المنظمة تلقائيًا عند إنشاء المورد
CREATE OR REPLACE FUNCTION set_supplier_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set organization_id if it's NULL to prevent recursive triggers
    IF NEW.organization_id IS NULL THEN
        -- Use a direct query with explicit type casting to prevent RLS policy recursion
        NEW.organization_id := (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_supplier_organization_id_trigger ON public.suppliers;
CREATE TRIGGER set_supplier_organization_id_trigger
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION set_supplier_organization_id();

-- محفز لتعيين معرف المنظمة تلقائيًا عند إنشاء المشتريات
DROP TRIGGER IF EXISTS set_supplier_purchases_organization_id_trigger ON public.supplier_purchases;
CREATE TRIGGER set_supplier_purchases_organization_id_trigger
BEFORE INSERT ON public.supplier_purchases
FOR EACH ROW
EXECUTE FUNCTION set_supplier_organization_id();

-- محفز لتعيين معرف المنظمة تلقائيًا عند إنشاء المدفوعات
DROP TRIGGER IF EXISTS set_supplier_payments_organization_id_trigger ON public.supplier_payments;
CREATE TRIGGER set_supplier_payments_organization_id_trigger
BEFORE INSERT ON public.supplier_payments
FOR EACH ROW
EXECUTE FUNCTION set_supplier_organization_id();

-- محفز لتعيين معرف المنظمة تلقائيًا عند إنشاء التقييمات
DROP TRIGGER IF EXISTS set_supplier_ratings_organization_id_trigger ON public.supplier_ratings;
CREATE TRIGGER set_supplier_ratings_organization_id_trigger
BEFORE INSERT ON public.supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION set_supplier_organization_id();

-- ======================
-- الوظائف المساعدة للتطبيق
-- ======================

-- وظيفة للحصول على قائمة المشتريات المتأخرة
CREATE OR REPLACE FUNCTION get_overdue_purchases(org_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_number VARCHAR,
  supplier_id UUID,
  supplier_name VARCHAR,
  due_date TIMESTAMP WITH TIME ZONE,
  balance_due DECIMAL,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.purchase_number,
    sp.supplier_id,
    s.name AS supplier_name,
    sp.due_date,
    sp.balance_due,
    EXTRACT(DAY FROM (CURRENT_DATE - sp.due_date))::INTEGER AS days_overdue
  FROM 
    public.supplier_purchases sp
  JOIN 
    public.suppliers s ON sp.supplier_id = s.id
  WHERE 
    sp.organization_id = org_id
    AND sp.due_date < CURRENT_DATE
    AND sp.balance_due > 0
    AND sp.status != 'cancelled'
  ORDER BY 
    days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة للحصول على ملخص أداء الموردين
CREATE OR REPLACE FUNCTION get_supplier_performance(org_id UUID)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name VARCHAR,
  company_name VARCHAR,
  total_purchases BIGINT,
  total_amount DECIMAL,
  rating SMALLINT,
  avg_delivery_days FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.company_name,
    COUNT(DISTINCT sp.id) AS total_purchases,
    COALESCE(SUM(sp.total_amount), 0) AS total_amount,
    s.rating,
    COALESCE(AVG(EXTRACT(EPOCH FROM (sp.created_at - sp.purchase_date))/86400), 0) AS avg_delivery_days
  FROM 
    public.suppliers s
  LEFT JOIN 
    public.supplier_purchases sp ON s.id = sp.supplier_id
  WHERE 
    s.organization_id = org_id
  GROUP BY 
    s.id, s.name, s.company_name, s.rating
  ORDER BY 
    total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة للحصول على إحصائيات الموردين
CREATE OR REPLACE FUNCTION get_supplier_statistics(org_id UUID)
RETURNS TABLE (
  total_suppliers BIGINT,
  active_suppliers BIGINT,
  total_purchases BIGINT,
  total_amount DECIMAL,
  total_outstanding DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT s.id) AS total_suppliers,
    COUNT(DISTINCT CASE WHEN s.is_active THEN s.id END) AS active_suppliers,
    COUNT(DISTINCT sp.id) AS total_purchases,
    COALESCE(SUM(sp.total_amount), 0) AS total_amount,
    COALESCE(SUM(sp.balance_due), 0) AS total_outstanding
  FROM 
    public.suppliers s
  LEFT JOIN 
    public.supplier_purchases sp ON s.id = sp.supplier_id
  WHERE 
    s.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة لإكمال المدفوعات
CREATE OR REPLACE FUNCTION complete_supplier_payment(
  p_purchase_id UUID,
  p_amount DECIMAL,
  p_payment_method VARCHAR,
  p_reference_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_supplier_id UUID;
  v_organization_id UUID;
  v_payment_id UUID;
  v_current_paid DECIMAL;
  v_total_amount DECIMAL;
BEGIN
  -- الحصول على معلومات المشتريات
  SELECT 
    supplier_id, 
    organization_id, 
    paid_amount, 
    total_amount 
  INTO 
    v_supplier_id, 
    v_organization_id, 
    v_current_paid, 
    v_total_amount
  FROM 
    public.supplier_purchases
  WHERE 
    id = p_purchase_id;
  
  -- إنشاء سجل المدفوعات
  INSERT INTO public.supplier_payments (
    supplier_id,
    purchase_id,
    amount,
    payment_method,
    reference_number,
    notes,
    organization_id,
    created_by
  ) VALUES (
    v_supplier_id,
    p_purchase_id,
    p_amount,
    p_payment_method,
    p_reference_number,
    p_notes,
    v_organization_id,
    auth.uid()
  ) RETURNING id INTO v_payment_id;
  
  -- تحديث المبلغ المدفوع في سجل المشتريات
  UPDATE public.supplier_purchases
  SET 
    paid_amount = v_current_paid + p_amount,
    updated_by = auth.uid(),
    updated_at = NOW(),
    -- تحديث الحالة إذا تم دفع المبلغ بالكامل
    status = CASE 
      WHEN (v_current_paid + p_amount) >= v_total_amount THEN 'paid'
      WHEN (v_current_paid + p_amount) > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE 
    id = p_purchase_id;
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 