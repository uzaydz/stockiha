-- إنشاء جداول نظام الأسعار المتعددة للاشتراكات
-- الجزء الأول: إنشاء الجداول الأساسية

-- ================================
-- 1. حذف الجداول المتضاربة (إن وجدت)
-- ================================
DROP TABLE IF EXISTS public.subscription_reviews CASCADE;
DROP TABLE IF EXISTS public.subscription_coupons CASCADE;
DROP TABLE IF EXISTS public.subscription_pricing_history CASCADE;
DROP TABLE IF EXISTS public.subscription_service_pricing CASCADE;

-- ================================
-- 2. إنشاء جدول أسعار مدد الاشتراكات
-- ================================
CREATE TABLE public.subscription_service_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_service_id UUID NOT NULL REFERENCES public.subscription_services(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- معلومات المدة
    duration_months INTEGER NOT NULL CHECK (duration_months > 0),
    duration_label VARCHAR(100) NOT NULL,
    duration_description TEXT,
    
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
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- خصومات ومكافآت
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    bonus_days INTEGER DEFAULT 0 CHECK (bonus_days >= 0),
    
    -- معلومات إضافية
    features JSONB DEFAULT '[]'::jsonb,
    limitations JSONB DEFAULT '{}'::jsonb,
    promo_text VARCHAR(200),
    
    -- تواريخ الصلاحية
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    promotion_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- قيود
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
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    
    -- معلومات التغيير
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    
    -- معلومات إضافية
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_pricing_history_pricing_id ON public.subscription_pricing_history(pricing_id);
CREATE INDEX idx_pricing_history_date ON public.subscription_pricing_history(changed_at);

-- ================================
-- 4. إنشاء جدول كوبونات وخصومات
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
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    max_uses_per_customer INTEGER DEFAULT 1,
    minimum_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- تواريخ الصلاحية
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- حالة الكوبون
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_subscription_coupons_code ON public.subscription_coupons(code);
CREATE INDEX idx_subscription_coupons_organization ON public.subscription_coupons(organization_id);
CREATE INDEX idx_subscription_coupons_active ON public.subscription_coupons(is_active) WHERE is_active = TRUE;

-- ================================
-- 5. إنشاء جدول تقييمات الاشتراكات
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
-- 6. إعدادات الأمان والصلاحيات
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

-- ================================
-- 7. إضافة بيانات تجريبية للخدمات الموجودة
-- ================================
DO $$
DECLARE
    service_record RECORD;
BEGIN
    -- لكل خدمة موجودة، أضف أسعار افتراضية
    FOR service_record IN 
        SELECT id, selling_price, purchase_price, available_quantity, organization_id 
        FROM public.subscription_services 
        WHERE selling_price > 0 AND purchase_price >= 0
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
            COALESCE(service_record.available_quantity, 1),
            COALESCE(service_record.available_quantity, 1),
            TRUE,
            TRUE,
            1,
            'الخيار القياسي'
        );
        
        -- إضافة خيار 3 أشهر بخصم 5%
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
            LEAST(COALESCE(service_record.available_quantity, 1), 5),
            LEAST(COALESCE(service_record.available_quantity, 1), 5),
            FALSE,
            TRUE,
            2,
            5.00,
            'وفر 5%'
        );
        
        -- إضافة خيار سنة كاملة بخصم 15%
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
            LEAST(COALESCE(service_record.available_quantity, 1), 2),
            LEAST(COALESCE(service_record.available_quantity, 1), 2),
            FALSE,
            TRUE,
            3,
            15.00,
            'أفضل قيمة - وفر 15%',
            TRUE
        );
    END LOOP;
    
    RAISE NOTICE 'تم إنشاء جداول الأسعار بنجاح وإضافة البيانات التجريبية';
END $$;

SELECT 'تم إنشاء نظام الأسعار المتعددة بنجاح! ✅' as status; 