-- إنشاء جدول للمؤسسات (المستأجرين)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    domain TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة المفتاح الأجنبي للمؤسسة في جدول المستخدمين
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_org_admin BOOLEAN DEFAULT FALSE;

-- تحديث الجداول الرئيسية لإضافة المفتاح الأجنبي للمؤسسة
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.inventory_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- إنشاء دالة لتحديث حقل updated_at تلقائيًا
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers للجداول
CREATE TRIGGER set_updated_at_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- إنشاء وظيفة للتحقق من الوصول للمؤسسة
CREATE OR REPLACE FUNCTION check_user_organization_access(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND organization_id = org_id
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء وظيفة للحصول على مؤسسة المستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_organization()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء وظيفة لإضافة مؤسسة جديدة
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT, 
    org_description TEXT DEFAULT NULL,
    org_domain TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- إنشاء المؤسسة الجديدة
    INSERT INTO public.organizations (name, description, domain)
    VALUES (org_name, org_description, org_domain)
    RETURNING id INTO new_org_id;
    
    -- تعيين المستخدم الحالي كمسؤول للمؤسسة
    UPDATE public.users
    SET organization_id = new_org_id, is_org_admin = TRUE
    WHERE id = auth.uid();
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء وظيفة لدعوة مستخدم إلى مؤسسة
CREATE OR REPLACE FUNCTION invite_user_to_organization(
    user_email TEXT,
    user_role TEXT DEFAULT 'employee'
)
RETURNS BOOLEAN AS $$
DECLARE
    org_id UUID;
    inviter_is_admin BOOLEAN;
BEGIN
    -- الحصول على معرف المؤسسة والتحقق من أن المستخدم الحالي مسؤول
    SELECT u.organization_id, u.is_org_admin
    INTO org_id, inviter_is_admin
    FROM public.users u
    WHERE u.id = auth.uid();
    
    -- التحقق من أن المستخدم الحالي مسؤول في المؤسسة
    IF NOT inviter_is_admin THEN
        RAISE EXCEPTION 'المستخدم الحالي ليس مسؤولاً في المؤسسة';
    END IF;
    
    -- إضافة دعوة (هنا يمكن تنفيذ المنطق الخاص بالدعوة)
    -- ملاحظة: سيتطلب هذا تنفيذ إضافي خارج هذه الوظيفة
    -- حيث سيتم إرسال بريد إلكتروني للمستخدم المدعو
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء سياسات الوصول (RLS) للمؤسسات
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_log ENABLE ROW LEVEL SECURITY;

-- سياسة المؤسسات - يمكن للمستخدم رؤية مؤسسته فقط
CREATE POLICY organizations_select_policy ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- سياسة المنتجات - يمكن للمستخدم رؤية منتجات مؤسسته فقط
CREATE POLICY products_select_policy ON public.products
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- سياسة الخدمات - يمكن للمستخدم رؤية خدمات مؤسسته فقط
CREATE POLICY services_select_policy ON public.services
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- سياسة العملاء - يمكن للمستخدم رؤية عملاء مؤسسته فقط
CREATE POLICY customers_select_policy ON public.customers
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- سياسة الطلبات - يمكن للمستخدم رؤية طلبات مؤسسته فقط
CREATE POLICY orders_select_policy ON public.orders
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- منح الأذونات للمستخدمين المصادق عليهم
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.product_categories TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT ON public.expenses TO authenticated;
GRANT SELECT ON public.service_bookings TO authenticated;
GRANT SELECT ON public.inventory_log TO authenticated;

-- منح الأذونات لتنفيذ الوظائف
GRANT EXECUTE ON FUNCTION create_organization TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_organization_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_organization TO authenticated; 