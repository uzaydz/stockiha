-- إنشاء جدول آراء العملاء
CREATE TABLE IF NOT EXISTS public.customer_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_avatar TEXT,
    rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    comment TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    purchase_date TIMESTAMP WITH TIME ZONE,
    product_name TEXT,
    product_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- إنشاء فهرس للبحث
CREATE INDEX IF NOT EXISTS customer_testimonials_organization_id_idx ON public.customer_testimonials(organization_id);
CREATE INDEX IF NOT EXISTS customer_testimonials_rating_idx ON public.customer_testimonials(rating);
CREATE INDEX IF NOT EXISTS customer_testimonials_verified_idx ON public.customer_testimonials(verified);

-- إضافة سياسات الأمان
ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة العامة (قراءة التقييمات المنشورة فقط)
CREATE POLICY "التقييمات المنشورة مرئية للجميع" ON public.customer_testimonials
    FOR SELECT
    USING (is_active = TRUE);

-- سياسة القراءة للمستخدمين المصرح لهم 
CREATE POLICY "المستخدمون المصرح لهم يمكنهم قراءة جميع التقييمات" ON public.customer_testimonials
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.organization_id = customer_testimonials.organization_id
              AND u.auth_user_id = auth.uid()
        )
    );

-- سياسة الإنشاء للمستخدمين المصرح لهم
CREATE POLICY "المستخدمون المصرح لهم يمكنهم إنشاء تقييمات" ON public.customer_testimonials
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.organization_id = customer_testimonials.organization_id
              AND u.auth_user_id = auth.uid()
        )
    );

-- سياسة التعديل للمستخدمين المصرح لهم
CREATE POLICY "المستخدمون المصرح لهم يمكنهم تعديل التقييمات" ON public.customer_testimonials
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.organization_id = customer_testimonials.organization_id
              AND u.auth_user_id = auth.uid()
        )
    );

-- سياسة الحذف للمستخدمين المصرح لهم
CREATE POLICY "المستخدمون المصرح لهم يمكنهم حذف التقييمات" ON public.customer_testimonials
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.organization_id = customer_testimonials.organization_id
              AND u.auth_user_id = auth.uid()
        )
    );

-- محفز لتحديث updated_at عند تعديل أي سجل
CREATE OR REPLACE FUNCTION public.update_testimonial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_testimonial_updated_at ON public.customer_testimonials;
CREATE TRIGGER update_customer_testimonial_updated_at
BEFORE UPDATE ON public.customer_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_testimonial_updated_at();

-- دالة لإضافة رأي جديد
CREATE OR REPLACE FUNCTION public.add_customer_testimonial(
    p_organization_id UUID,
    p_customer_name TEXT,
    p_customer_avatar TEXT,
    p_rating NUMERIC(2,1),
    p_comment TEXT,
    p_verified BOOLEAN DEFAULT FALSE,
    p_purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_product_name TEXT DEFAULT NULL,
    p_product_image TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_testimonial_id UUID;
BEGIN
    INSERT INTO public.customer_testimonials (
        organization_id,
        customer_name,
        customer_avatar,
        rating,
        comment,
        verified,
        purchase_date,
        product_name,
        product_image
    ) VALUES (
        p_organization_id,
        p_customer_name,
        p_customer_avatar,
        p_rating,
        p_comment,
        p_verified,
        p_purchase_date,
        p_product_name,
        p_product_image
    )
    RETURNING id INTO v_testimonial_id;
    
    RETURN v_testimonial_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث رأي موجود
CREATE OR REPLACE FUNCTION public.update_customer_testimonial(
    p_testimonial_id UUID,
    p_customer_name TEXT,
    p_customer_avatar TEXT,
    p_rating NUMERIC(2,1),
    p_comment TEXT,
    p_verified BOOLEAN,
    p_purchase_date TIMESTAMP WITH TIME ZONE,
    p_product_name TEXT,
    p_product_image TEXT,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected_rows INT;
BEGIN
    UPDATE public.customer_testimonials
    SET 
        customer_name = p_customer_name,
        customer_avatar = p_customer_avatar,
        rating = p_rating,
        comment = p_comment,
        verified = p_verified,
        purchase_date = p_purchase_date,
        product_name = p_product_name,
        product_image = p_product_image,
        is_active = p_is_active
    WHERE id = p_testimonial_id;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RETURN v_affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحذف رأي
CREATE OR REPLACE FUNCTION public.delete_customer_testimonial(
    p_testimonial_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected_rows INT;
BEGIN
    DELETE FROM public.customer_testimonials
    WHERE id = p_testimonial_id;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RETURN v_affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على آراء العملاء لمؤسسة معينة
CREATE OR REPLACE FUNCTION public.get_organization_testimonials(
    p_organization_id UUID,
    p_active_only BOOLEAN DEFAULT TRUE
)
RETURNS SETOF public.customer_testimonials AS $$
BEGIN
    IF p_active_only THEN
        RETURN QUERY
        SELECT *
        FROM public.customer_testimonials
        WHERE organization_id = p_organization_id
        AND is_active = TRUE
        ORDER BY rating DESC, created_at DESC;
    ELSE
        RETURN QUERY
        SELECT *
        FROM public.customer_testimonials
        WHERE organization_id = p_organization_id
        ORDER BY rating DESC, created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتنشيط أو إلغاء تنشيط رأي
CREATE OR REPLACE FUNCTION public.toggle_testimonial_status(
    p_testimonial_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected_rows INT;
BEGIN
    UPDATE public.customer_testimonials
    SET is_active = p_is_active
    WHERE id = p_testimonial_id;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RETURN v_affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة آراء عملاء افتراضية للعرض التوضيحي (يمكن تعطيل هذا في الإنتاج)
DO $$
DECLARE
    v_org_id UUID;
    v_testimonial_ids UUID[];
BEGIN
    -- تنفيذ فقط إذا لم تكن هناك آراء عملاء في النظام
    IF (SELECT COUNT(*) FROM public.customer_testimonials) = 0 THEN
        -- أخذ أول معرف مؤسسة موجود
        SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
        
        IF v_org_id IS NOT NULL THEN
            -- إضافة آراء عملاء نموذجية
            v_testimonial_ids[1] := public.add_customer_testimonial(
                v_org_id, 'أحمد محمود', NULL, 5.0, 
                'منتج رائع جداً! لقد استخدمته لمدة شهر وأنا سعيد جداً بالنتائج. التوصيل كان سريعاً والتغليف كان ممتازاً.',
                TRUE, NOW() - INTERVAL '1 month', 'سماعات بلوتوث لاسلكية', NULL
            );
            
            v_testimonial_ids[2] := public.add_customer_testimonial(
                v_org_id, 'فاطمة علي', NULL, 4.5, 
                'جودة المنتج ممتازة والسعر مناسب جداً مقارنة بالمنتجات المماثلة في السوق. أنصح الجميع بتجربته!',
                TRUE, NOW() - INTERVAL '2 months', 'ساعة ذكية', NULL
            );
            
            v_testimonial_ids[3] := public.add_customer_testimonial(
                v_org_id, 'محمد سعيد', NULL, 5.0, 
                'خدمة العملاء ممتازة والرد سريع على الاستفسارات. المنتج وصل بحالة ممتازة وبدون أي خدوش.',
                TRUE, NOW() - INTERVAL '3 months', 'تلفزيون ذكي 55 بوصة', NULL
            );
        END IF;
    END IF;
END $$; 