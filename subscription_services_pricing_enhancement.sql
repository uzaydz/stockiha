-- تطوير نظام الاشتراكات - دعم أسعار متعددة للمدد المختلفة
-- تاريخ الإنشاء: 2024
-- الوصف: إضافة جدول للمدد والأسعار، تحسين هيكل البيانات، وإضافة ميزات جديدة

-- ================================
-- 1. التحقق من الجداول الموجودة وحذف المكررة
-- ================================

-- حذف الجداول الموجودة إذا كانت موجودة للبدء من الصفر
DROP TABLE IF EXISTS public.subscription_reviews CASCADE;
DROP TABLE IF EXISTS public.subscription_coupons CASCADE;
DROP TABLE IF EXISTS public.subscription_pricing_history CASCADE;
DROP TABLE IF EXISTS public.subscription_service_pricing CASCADE;

-- حذف الـ Views الموجودة
DROP VIEW IF EXISTS public.subscription_services_with_pricing CASCADE;
DROP VIEW IF EXISTS public.subscription_financial_stats CASCADE;

-- ================================
-- 2. إنشاء جدول أسعار مدد الاشتراكات
-- ================================

CREATE TABLE public.subscription_service_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_service_id UUID NOT NULL REFERENCES public.subscription_services(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- معلومات المدة
    duration_months INTEGER NOT NULL CHECK (duration_months > 0),
    duration_label VARCHAR(100) NOT NULL, -- مثل: "شهر واحد", "3 أشهر", "سنة كاملة"
    duration_description TEXT, -- وصف إضافي للمدة
    
    -- الأسعار والتكاليف
    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN purchase_price > 0 THEN ((selling_price - purchase_price) / purchase_price * 100)
            ELSE 0 
        END
    ) STORED,
    profit_amount DECIMAL(10,2) GENERATED ALWAYS AS (selling_price - purchase_price) STORED,
    
    -- المخزون والكميات
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    
    -- خصائص السعر
    is_default BOOLEAN NOT NULL DEFAULT FALSE, -- هل هذا السعر الافتراضي؟
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE, -- مدة مميزة (مثل الأكثر شعبية)
    display_order INTEGER NOT NULL DEFAULT 0, -- ترتيب العرض
    
    -- خصومات ومكافآت
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    bonus_days INTEGER DEFAULT 0 CHECK (bonus_days >= 0), -- أيام إضافية مجانية
    
    -- معلومات إضافية
    features JSONB DEFAULT '[]'::jsonb, -- ميزات خاصة بهذه المدة
    limitations JSONB DEFAULT '{}'::jsonb, -- قيود خاصة بهذه المدة
    promo_text VARCHAR(200), -- نص ترويجي مثل "الأكثر شعبية" أو "أفضل قيمة"
    
    -- تواريخ الصلاحية والعروض
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    promotion_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- فهارس وقيود
    CONSTRAINT unique_service_duration UNIQUE (subscription_service_id, duration_months),
    CONSTRAINT check_quantities CHECK (
        available_quantity + sold_quantity + reserved_quantity <= total_quantity
    ),
    CONSTRAINT check_valid_dates CHECK (
        valid_from < valid_until OR valid_until IS NULL
    )
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_subscription_pricing_service_id ON public.subscription_service_pricing(subscription_service_id);
CREATE INDEX idx_subscription_pricing_organization_id ON public.subscription_service_pricing(organization_id);
CREATE INDEX idx_subscription_pricing_active ON public.subscription_service_pricing(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_subscription_pricing_default ON public.subscription_service_pricing(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_subscription_pricing_display_order ON public.subscription_service_pricing(display_order);
CREATE INDEX idx_subscription_pricing_duration ON public.subscription_service_pricing(duration_months);

-- ================================
-- 3. إنشاء جدول تاريخ تغييرات الأسعار
-- ================================

CREATE TABLE public.subscription_pricing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pricing_id UUID NOT NULL REFERENCES public.subscription_service_pricing(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- التغييرات
    field_name VARCHAR(100) NOT NULL, -- اسم الحقل المُحدث
    old_value TEXT, -- القيمة السابقة
    new_value TEXT, -- القيمة الجديدة
    change_reason TEXT, -- سبب التغيير
    
    -- معلومات التغيير
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    
    -- معلومات إضافية
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_pricing_history_pricing_id ON public.subscription_pricing_history(pricing_id);
CREATE INDEX idx_pricing_history_date ON public.subscription_pricing_history(changed_at);

-- ================================
-- 4. إنشاء جدول كوبونات وخصومات الاشتراكات
-- ================================

CREATE TABLE public.subscription_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- معلومات الكوبون
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- نوع الخصم
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    
    -- قيود الاستخدام
    max_uses INTEGER, -- أقصى عدد استخدامات (NULL = غير محدود)
    used_count INTEGER NOT NULL DEFAULT 0,
    max_uses_per_customer INTEGER DEFAULT 1,
    minimum_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- قيود الخدمات
    applicable_services JSONB DEFAULT '[]'::jsonb, -- معرفات الخدمات المشمولة
    applicable_categories JSONB DEFAULT '[]'::jsonb, -- معرفات الفئات المشمولة
    applicable_durations JSONB DEFAULT '[]'::jsonb, -- المدد المشمولة (بالأشهر)
    
    -- تواريخ الصلاحية
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- حالة الكوبون
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- هل يظهر للجميع أم للعملاء المحددين فقط
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_subscription_coupons_code ON public.subscription_coupons(code);
CREATE INDEX idx_subscription_coupons_organization ON public.subscription_coupons(organization_id);
CREATE INDEX idx_subscription_coupons_active ON public.subscription_coupons(is_active) WHERE is_active = TRUE;

-- ================================
-- 5. تحديث جدول الاشتراكات الرئيسي
-- ================================

-- إضافة أعمدة جديدة لجدول subscription_services
ALTER TABLE public.subscription_services 
ADD COLUMN IF NOT EXISTS has_multiple_pricing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS default_duration_months INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivery_email_template TEXT,
ADD COLUMN IF NOT EXISTS requires_customer_info JSONB DEFAULT '{"email": true, "phone": false}'::jsonb,
ADD COLUMN IF NOT EXISTS refund_policy TEXT,
ADD COLUMN IF NOT EXISTS warranty_period_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(200),
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0 CHECK (review_count >= 0);

-- ================================
-- 6. إنشاء جدول تقييمات الاشتراكات
-- ================================

CREATE TABLE public.subscription_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_service_id UUID NOT NULL REFERENCES public.subscription_services(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- التقييم
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    
    -- حالة المراجعة
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- معلومات الشراء
    purchase_verified BOOLEAN DEFAULT FALSE,
    purchased_duration_months INTEGER,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_reviews_service_id ON public.subscription_reviews(subscription_service_id);
CREATE INDEX idx_subscription_reviews_rating ON public.subscription_reviews(rating);
CREATE INDEX idx_subscription_reviews_approved ON public.subscription_reviews(is_approved) WHERE is_approved = TRUE;

-- ================================
-- 7. إنشاء Views للإحصائيات والتقارير
-- ================================

-- View للحصول على معلومات الاشتراك مع أسعاره
CREATE OR REPLACE VIEW public.subscription_services_with_pricing AS
SELECT 
    s.*,
    
    -- إحصائيات الأسعار
    COALESCE(pricing_stats.pricing_count, 0) as pricing_options_count,
    COALESCE(pricing_stats.min_price, s.selling_price) as lowest_price,
    COALESCE(pricing_stats.max_price, s.selling_price) as highest_price,
    COALESCE(pricing_stats.default_price, s.selling_price) as default_price,
    COALESCE(pricing_stats.total_available_qty, s.available_quantity) as total_available_across_durations,
    
    -- معلومات السعر الافتراضي
    default_pricing.duration_months as default_pricing_duration_months,
    default_pricing.duration_label as default_pricing_duration_label,
    default_pricing.promo_text as default_pricing_promo_text,
    
    -- تقييمات
    COALESCE(s.rating, 0) as avg_rating,
    COALESCE(s.review_count, 0) as total_reviews

FROM public.subscription_services s

-- إحصائيات الأسعار
LEFT JOIN (
    SELECT 
        subscription_service_id,
        COUNT(*) as pricing_count,
        MIN(selling_price) as min_price,
        MAX(selling_price) as max_price,
        SUM(available_quantity) as total_available_qty,
        AVG(selling_price) as avg_price,
        MAX(CASE WHEN is_default THEN selling_price END) as default_price
    FROM public.subscription_service_pricing 
    WHERE is_active = TRUE
    GROUP BY subscription_service_id
) pricing_stats ON s.id = pricing_stats.subscription_service_id

-- السعر الافتراضي
LEFT JOIN public.subscription_service_pricing default_pricing 
    ON s.id = default_pricing.subscription_service_id 
    AND default_pricing.is_default = TRUE 
    AND default_pricing.is_active = TRUE;

-- View للإحصائيات المالية
CREATE OR REPLACE VIEW public.subscription_financial_stats AS
SELECT 
    s.organization_id,
    s.category_id,
    cat.name as category_name,
    
    -- إحصائيات عامة
    COUNT(DISTINCT s.id) as total_services,
    COUNT(DISTINCT CASE WHEN s.is_active THEN s.id END) as active_services,
    
    -- إحصائيات المبيعات (من الأسعار المفصلة)
    COALESCE(SUM(p.sold_quantity), 0) as total_sold_quantity,
    COALESCE(SUM(p.available_quantity), 0) as total_available_quantity,
    COALESCE(SUM(p.sold_quantity * p.selling_price), 0) as total_revenue,
    COALESCE(SUM(p.sold_quantity * p.profit_amount), 0) as total_profit,
    
    -- متوسطات
    CASE 
        WHEN SUM(p.sold_quantity) > 0 THEN 
            SUM(p.sold_quantity * p.selling_price) / SUM(p.sold_quantity)
        ELSE 0 
    END as avg_selling_price,
    
    CASE 
        WHEN SUM(p.sold_quantity) > 0 THEN 
            SUM(p.sold_quantity * p.profit_amount) / SUM(p.sold_quantity)
        ELSE 0 
    END as avg_profit_per_sale

FROM public.subscription_services s
LEFT JOIN public.subscription_categories cat ON s.category_id = cat.id
LEFT JOIN public.subscription_service_pricing p ON s.id = p.subscription_service_id 
    AND p.is_active = TRUE

GROUP BY s.organization_id, s.category_id, cat.name;

-- ================================
-- 8. إنشاء Functions للعمليات المتقدمة
-- ================================

-- Function لحساب أفضل عرض لعميل معين
CREATE OR REPLACE FUNCTION public.get_best_subscription_deal(
    p_service_id UUID,
    p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    pricing_id UUID,
    duration_months INTEGER,
    duration_label VARCHAR(100),
    original_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    savings DECIMAL(10,2),
    promo_text VARCHAR(200)
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.duration_months,
        p.duration_label,
        p.selling_price as original_price,
        p.selling_price * (1 - COALESCE(p.discount_percentage, 0) / 100) as final_price,
        p.selling_price * (COALESCE(p.discount_percentage, 0) / 100) as savings,
        COALESCE(p.promo_text, '') as promo_text
    FROM public.subscription_service_pricing p
    WHERE p.subscription_service_id = p_service_id
      AND p.is_active = TRUE
      AND p.available_quantity > 0
      AND (p.valid_from IS NULL OR p.valid_from <= NOW())
      AND (p.valid_until IS NULL OR p.valid_until >= NOW())
    ORDER BY 
        (p.selling_price * (1 - COALESCE(p.discount_percentage, 0) / 100)) / p.duration_months ASC, -- أفضل قيمة شهرية
        p.display_order ASC;
END;
$$;

-- Function لتطبيق كوبون خصم
CREATE OR REPLACE FUNCTION public.apply_subscription_coupon(
    p_coupon_code VARCHAR(50),
    p_service_id UUID,
    p_duration_months INTEGER,
    p_customer_id UUID,
    p_purchase_amount DECIMAL(10,2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount DECIMAL(10,2),
    final_amount DECIMAL(10,2),
    error_message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_coupon RECORD;
    v_customer_usage_count INTEGER;
    v_discount_amount DECIMAL(10,2) := 0;
BEGIN
    -- جلب معلومات الكوبون
    SELECT * INTO v_coupon 
    FROM public.subscription_coupons 
    WHERE code = p_coupon_code AND is_active = TRUE;
    
    -- التحقق من وجود الكوبون
    IF v_coupon.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0.00, p_purchase_amount, 'كوبون الخصم غير صالح أو منتهي الصلاحية';
        RETURN;
    END IF;
    
    -- التحقق من تاريخ الصلاحية
    IF (v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > NOW()) 
       OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW()) THEN
        RETURN QUERY SELECT FALSE, 0.00, p_purchase_amount, 'كوبون الخصم منتهي الصلاحية';
        RETURN;
    END IF;
    
    -- التحقق من الحد الأدنى للشراء
    IF p_purchase_amount < v_coupon.minimum_purchase_amount THEN
        RETURN QUERY SELECT FALSE, 0.00, p_purchase_amount, 
            format('الحد الأدنى للشراء %s دج', v_coupon.minimum_purchase_amount);
        RETURN;
    END IF;
    
    -- حساب الخصم
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount_amount := p_purchase_amount * (v_coupon.discount_value / 100);
    ELSE
        v_discount_amount := v_coupon.discount_value;
    END IF;
    
    -- التأكد من أن الخصم لا يتجاوز المبلغ
    v_discount_amount := LEAST(v_discount_amount, p_purchase_amount);
    
    RETURN QUERY SELECT TRUE, v_discount_amount, p_purchase_amount - v_discount_amount, NULL::TEXT;
END;
$$;

-- ================================
-- 9. إنشاء Triggers للتحديث التلقائي
-- ================================

-- Trigger لتحديث إحصائيات الخدمة عند تغيير الأسعار
CREATE OR REPLACE FUNCTION public.update_subscription_service_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث إحصائيات الخدمة الرئيسية
    UPDATE public.subscription_services SET
        available_quantity = (
            SELECT COALESCE(SUM(available_quantity), 0) 
            FROM public.subscription_service_pricing 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_active = TRUE
        ),
        sold_quantity = (
            SELECT COALESCE(SUM(sold_quantity), 0) 
            FROM public.subscription_service_pricing 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_active = TRUE
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_stats ON public.subscription_service_pricing;
CREATE TRIGGER trigger_update_subscription_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.subscription_service_pricing
    FOR EACH ROW EXECUTE FUNCTION public.update_subscription_service_stats();

-- Trigger لتحديث التقييمات
CREATE OR REPLACE FUNCTION public.update_subscription_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.subscription_services SET
        rating = (
            SELECT COALESCE(AVG(rating), 0) 
            FROM public.subscription_reviews 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_approved = TRUE
        ),
        review_count = (
            SELECT COUNT(*) 
            FROM public.subscription_reviews 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_approved = TRUE
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_rating ON public.subscription_reviews;
CREATE TRIGGER trigger_update_subscription_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.subscription_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_subscription_rating();

-- ================================
-- 10. إضافة بيانات أساسية للاختبار
-- ================================

-- إدراج مدد قياسية شائعة (يمكن تخصيصها لكل خدمة)
DO $$
DECLARE
    service_record RECORD;
BEGIN
    -- لكل خدمة موجودة، أضف أسعار افتراضية بناءً على البيانات الحالية
    FOR service_record IN 
        SELECT id, selling_price, purchase_price, available_quantity, organization_id 
        FROM public.subscription_services 
        WHERE NOT EXISTS (
            SELECT 1 FROM public.subscription_service_pricing 
            WHERE subscription_service_id = subscription_services.id
        )
    LOOP
        -- إضافة السعر الافتراضي (شهر واحد)
        INSERT INTO public.subscription_service_pricing (
            subscription_service_id,
            organization_id,
            duration_months,
            duration_label,
            purchase_price,
            selling_price,
            total_quantity,
            available_quantity,
            is_default,
            is_active,
            display_order,
            promo_text
        ) VALUES (
            service_record.id,
            service_record.organization_id,
            1,
            'شهر واحد',
            service_record.purchase_price,
            service_record.selling_price,
            service_record.available_quantity,
            service_record.available_quantity,
            TRUE,
            TRUE,
            1,
            'الخيار القياسي'
        );
        
        -- إضافة خيار 3 أشهر بخصم 10%
        INSERT INTO public.subscription_service_pricing (
            subscription_service_id,
            organization_id,
            duration_months,
            duration_label,
            purchase_price,
            selling_price,
            total_quantity,
            available_quantity,
            is_default,
            is_active,
            display_order,
            discount_percentage,
            promo_text
        ) VALUES (
            service_record.id,
            service_record.organization_id,
            3,
            '3 أشهر',
            service_record.purchase_price * 3,
            service_record.selling_price * 3,
            LEAST(service_record.available_quantity, 5),
            LEAST(service_record.available_quantity, 5),
            FALSE,
            TRUE,
            2,
            10.00,
            'وفر 10%'
        );
        
        -- إضافة خيار سنة كاملة بخصم 20%
        INSERT INTO public.subscription_service_pricing (
            subscription_service_id,
            organization_id,
            duration_months,
            duration_label,
            purchase_price,
            selling_price,
            total_quantity,
            available_quantity,
            is_default,
            is_active,
            display_order,
            discount_percentage,
            promo_text,
            is_featured
        ) VALUES (
            service_record.id,
            service_record.organization_id,
            12,
            'سنة كاملة',
            service_record.purchase_price * 12,
            service_record.selling_price * 12,
            LEAST(service_record.available_quantity, 2),
            LEAST(service_record.available_quantity, 2),
            FALSE,
            TRUE,
            3,
            20.00,
            'أفضل قيمة - وفر 20%',
            TRUE
        );
    END LOOP;
    
    -- تحديث خاصية الأسعار المتعددة
    UPDATE public.subscription_services 
    SET has_multiple_pricing = TRUE 
    WHERE id IN (
        SELECT DISTINCT subscription_service_id 
        FROM public.subscription_service_pricing
    );
END $$;

-- ================================
-- 11. إعدادات الأمان والصلاحيات
-- ================================

-- تمكين RLS على الجداول الجديدة
ALTER TABLE public.subscription_service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_reviews ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view pricing for their organization" ON public.subscription_service_pricing
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage pricing for their organization" ON public.subscription_service_pricing
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- منح الصلاحيات
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_service_pricing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_pricing_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_reviews TO authenticated;

-- منح صلاحيات القراءة على الـ Views
GRANT SELECT ON public.subscription_services_with_pricing TO authenticated;
GRANT SELECT ON public.subscription_financial_stats TO authenticated;

-- منح صلاحيات تشغيل الـ Functions
GRANT EXECUTE ON FUNCTION public.get_best_subscription_deal TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_coupon TO authenticated;

-- ================================
-- 12. تعليقات ووثائق الجداول
-- ================================

COMMENT ON TABLE public.subscription_service_pricing IS 'جدول أسعار ومدد الاشتراكات - يدعم أسعار متعددة لكل خدمة';
COMMENT ON TABLE public.subscription_pricing_history IS 'تاريخ تغييرات أسعار الاشتراكات لأغراض التدقيق';
COMMENT ON TABLE public.subscription_coupons IS 'كوبونات وأكواد خصم الاشتراكات';
COMMENT ON TABLE public.subscription_reviews IS 'تقييمات ومراجعات العملاء للاشتراكات';

COMMENT ON COLUMN public.subscription_service_pricing.duration_months IS 'مدة الاشتراك بالأشهر';
COMMENT ON COLUMN public.subscription_service_pricing.is_default IS 'هل هذا السعر الافتراضي للخدمة؟';
COMMENT ON COLUMN public.subscription_service_pricing.is_featured IS 'هل هذه المدة مميزة (مثل الأكثر شعبية)؟';
COMMENT ON COLUMN public.subscription_service_pricing.promo_text IS 'نص ترويجي يظهر مع السعر';
COMMENT ON COLUMN public.subscription_service_pricing.bonus_days IS 'أيام إضافية مجانية';

-- إنجاز التطوير
SELECT 'تم تطوير نظام الاشتراكات بنجاح! ✅' as status,
       'أضيفت الجداول والوظائف والـ Views بنجاح' as message,
       NOW() as completed_at; 