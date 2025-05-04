-- التعديلات اللازمة لدعم مقاسات المنتجات
-- Created: 2024-07-25

-- إنشاء جدول مقاسات المنتجات
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    color_id UUID NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC,
    barcode TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهرس لتسريع البحث عن المقاسات حسب اللون
CREATE INDEX IF NOT EXISTS product_sizes_color_id_idx ON public.product_sizes (color_id);

-- إنشاء فهرس لتسريع البحث عن المقاسات حسب المنتج
CREATE INDEX IF NOT EXISTS product_sizes_product_id_idx ON public.product_sizes (product_id);

-- إضافة مشغل للجدول product_sizes
DROP TRIGGER IF EXISTS update_product_sizes_updated_at ON public.product_sizes;
CREATE TRIGGER update_product_sizes_updated_at
BEFORE UPDATE ON public.product_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();

-- إنشاء دالة RPC لإضافة مقاس جديد للون
CREATE OR REPLACE FUNCTION public.create_product_size(
    color_id UUID,
    size_name TEXT,
    quantity INTEGER,
    price NUMERIC DEFAULT NULL,
    barcode TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_size_id UUID;
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف المنتج من معرف اللون
    SELECT pc.product_id INTO product_id 
    FROM public.product_colors pc 
    WHERE pc.id = create_product_size.color_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'اللون غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF product_org_id IS NULL THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إضافة مقاسات لهذا المنتج';
    END IF;
    
    -- إذا كان هذا هو المقاس الافتراضي، إلغاء تعيين أي مقاس افتراضي آخر لنفس اللون
    IF is_default THEN
        UPDATE public.product_sizes SET is_default = false WHERE color_id = create_product_size.color_id;
    END IF;
    
    -- إضافة المقاس الجديد
    INSERT INTO public.product_sizes (
        color_id,
        product_id,
        size_name,
        quantity,
        price,
        barcode,
        is_default
    ) VALUES (
        create_product_size.color_id,
        product_id,
        create_product_size.size_name,
        create_product_size.quantity,
        create_product_size.price,
        create_product_size.barcode,
        create_product_size.is_default
    ) RETURNING id INTO new_size_id;
    
    -- تحديث كمية اللون بناءً على مجموع كميات المقاسات
    UPDATE public.product_colors 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_sizes 
        WHERE color_id = create_product_size.color_id
    )
    WHERE id = create_product_size.color_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id
    )
    WHERE id = product_id;
    
    RETURN new_size_id;
END;
$$;

-- إنشاء دالة RPC لتحديث مقاس موجود
CREATE OR REPLACE FUNCTION public.update_product_size(
    size_id UUID,
    size_name TEXT DEFAULT NULL,
    quantity INTEGER DEFAULT NULL,
    price NUMERIC DEFAULT NULL,
    barcode TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    color_id UUID;
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف اللون والمنتج من معرف المقاس
    SELECT ps.color_id, ps.product_id INTO color_id, product_id 
    FROM public.product_sizes ps 
    WHERE ps.id = update_product_size.size_id;
    
    IF color_id IS NULL THEN
        RAISE EXCEPTION 'المقاس غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تعديل مقاسات هذا المنتج';
    END IF;
    
    -- إذا كان هذا هو المقاس الافتراضي، إلغاء تعيين أي مقاس افتراضي آخر لنفس اللون
    IF is_default THEN
        UPDATE public.product_sizes SET is_default = false WHERE color_id = color_id;
    END IF;
    
    -- تحديث بيانات المقاس
    UPDATE public.product_sizes SET
        size_name = COALESCE(update_product_size.size_name, size_name),
        quantity = COALESCE(update_product_size.quantity, quantity),
        price = COALESCE(update_product_size.price, price),
        barcode = COALESCE(update_product_size.barcode, barcode),
        is_default = COALESCE(update_product_size.is_default, is_default)
    WHERE id = update_product_size.size_id;
    
    -- تحديث كمية اللون بناءً على مجموع كميات المقاسات
    UPDATE public.product_colors 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_sizes 
        WHERE color_id = color_id
    )
    WHERE id = color_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id
    )
    WHERE id = product_id;
    
    RETURN true;
END;
$$;

-- إنشاء دالة RPC لحذف مقاس
CREATE OR REPLACE FUNCTION public.delete_product_size(
    size_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    color_id UUID;
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
    is_default_size BOOLEAN;
    sizes_count INTEGER;
BEGIN
    -- الحصول على معرف اللون والمنتج وحالة المقاس الافتراضي من معرف المقاس
    SELECT ps.color_id, ps.product_id, ps.is_default INTO color_id, product_id, is_default_size 
    FROM public.product_sizes ps 
    WHERE ps.id = delete_product_size.size_id;
    
    IF color_id IS NULL THEN
        RAISE EXCEPTION 'المقاس غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية حذف مقاسات هذا المنتج';
    END IF;
    
    -- حذف المقاس
    DELETE FROM public.product_sizes WHERE id = delete_product_size.size_id;
    
    -- إذا كان المقاس المحذوف هو الافتراضي، تعيين مقاس آخر كافتراضي
    IF is_default_size THEN
        UPDATE public.product_sizes 
        SET is_default = true 
        WHERE color_id = color_id 
        AND id = (
            SELECT id FROM public.product_sizes 
            WHERE color_id = color_id 
            LIMIT 1
        );
    END IF;
    
    -- تحديث كمية اللون بناءً على مجموع كميات المقاسات
    UPDATE public.product_colors 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_sizes 
        WHERE color_id = color_id
    )
    WHERE id = color_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id
    )
    WHERE id = product_id;
    
    RETURN true;
END;
$$;

-- إنشاء دالة RPC للحصول على مقاسات لون معين
CREATE OR REPLACE FUNCTION public.get_product_sizes(
    color_id UUID
) RETURNS SETOF public.product_sizes
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.product_sizes WHERE color_id = get_product_sizes.color_id ORDER BY is_default DESC, size_name ASC;
$$;

-- تعديل RLS (Row Level Security) على الجدول الجديد
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للجدول الجديد
CREATE POLICY "أي شخص يمكنه قراءة مقاسات المنتجات" ON public.product_sizes
    FOR SELECT USING (true);

CREATE POLICY "فقط المسؤولون عن المؤسسة يمكنهم إدارة مقاسات المنتجات" ON public.product_sizes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.users u ON u.organization_id = p.organization_id
            WHERE p.id = product_id AND u.id = auth.uid() AND u.is_org_admin = true
        )
    );

-- تعديل وظيفة حذف الألوان لتأخذ في الاعتبار المقاسات المرتبطة
CREATE OR REPLACE FUNCTION public.delete_product_color_with_sizes(
    color_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
    colors_count INTEGER;
    is_default_color BOOLEAN;
BEGIN
    -- الحصول على معرف المنتج وحالة اللون الافتراضي من معرف اللون
    SELECT pc.product_id, pc.is_default INTO product_id, is_default_color 
    FROM public.product_colors pc 
    WHERE pc.id = delete_product_color_with_sizes.color_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'اللون غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية حذف ألوان هذا المنتج';
    END IF;
    
    -- حذف جميع المقاسات المرتبطة باللون أولاً (cascade سيعمل تلقائياً ولكن نحتاج لحذف المقاسات صراحةً لتسجيل العملية)
    DELETE FROM public.product_sizes WHERE color_id = delete_product_color_with_sizes.color_id;
    
    -- حذف اللون
    DELETE FROM public.product_colors WHERE id = delete_product_color_with_sizes.color_id;
    
    -- إذا كان اللون المحذوف هو الافتراضي، تعيين لون آخر كافتراضي
    IF is_default_color THEN
        UPDATE public.product_colors 
        SET is_default = true 
        WHERE product_id = product_id 
        AND id = (
            SELECT id FROM public.product_colors 
            WHERE product_id = product_id 
            LIMIT 1
        );
    END IF;
    
    -- التحقق من عدد الألوان المتبقية وتحديث حالة has_variants للمنتج إذا لزم الأمر
    SELECT COUNT(*) INTO colors_count FROM public.product_colors WHERE product_id = product_id;
    
    IF colors_count = 0 THEN
        UPDATE public.products SET has_variants = false WHERE id = product_id;
    END IF;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = product_id
    )
    WHERE id = product_id;
    
    RETURN true;
END;
$$; 