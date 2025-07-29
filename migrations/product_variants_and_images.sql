-- التعديلات اللازمة لدعم متغيرات المنتجات وصور المنتجات
-- Created: 2024-07-20

-- إضافة الأعمدة الجديدة لجدول المنتجات
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_price_on_landing BOOLEAN NOT NULL DEFAULT true;

-- إنشاء جدول ألوان المنتجات
CREATE TABLE IF NOT EXISTS public.product_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_code TEXT NOT NULL,
    image_url TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهرس لتسريع البحث عن الألوان حسب المنتج
CREATE INDEX IF NOT EXISTS product_colors_product_id_idx ON public.product_colors (product_id);

-- إنشاء جدول صور المنتجات الإضافية
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهرس لتسريع البحث عن الصور حسب المنتج
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON public.product_images (product_id);

-- إنشاء المشغلات (Triggers) للتحديث التلقائي لحقل updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة مشغل للجدول product_colors
DROP TRIGGER IF EXISTS update_product_colors_updated_at ON public.product_colors;
CREATE TRIGGER update_product_colors_updated_at
BEFORE UPDATE ON public.product_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();

-- إضافة مشغل للجدول product_images
DROP TRIGGER IF EXISTS update_product_images_updated_at ON public.product_images;
CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();

-- إنشاء دالة RPC لإضافة لون جديد للمنتج
CREATE OR REPLACE FUNCTION public.create_product_color(
    product_id UUID,
    name TEXT,
    color_code TEXT,
    quantity INTEGER,
    price NUMERIC DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_color_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF product_org_id IS NULL THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إضافة ألوان لهذا المنتج';
    END IF;
    
    -- إذا كان هذا هو اللون الافتراضي، إلغاء تعيين أي لون افتراضي آخر
    IF is_default THEN
        UPDATE public.product_colors SET is_default = false WHERE product_id = create_product_color.product_id;
    END IF;
    
    -- إضافة اللون الجديد
    INSERT INTO public.product_colors (
        product_id,
        name,
        color_code,
        quantity,
        price,
        image_url,
        is_default
    ) VALUES (
        create_product_color.product_id,
        create_product_color.name,
        create_product_color.color_code,
        create_product_color.quantity,
        create_product_color.price,
        create_product_color.image_url,
        create_product_color.is_default
    ) RETURNING id INTO new_color_id;
    
    -- تحديث حالة has_variants للمنتج
    UPDATE public.products SET has_variants = true WHERE id = create_product_color.product_id;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان
    UPDATE public.products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM public.product_colors 
        WHERE product_id = create_product_color.product_id
    )
    WHERE id = create_product_color.product_id;
    
    RETURN new_color_id;
END;
$$;

-- إنشاء دالة RPC لتحديث لون موجود
CREATE OR REPLACE FUNCTION public.update_product_color(
    color_id UUID,
    name TEXT DEFAULT NULL,
    color_code TEXT DEFAULT NULL,
    quantity INTEGER DEFAULT NULL,
    price NUMERIC DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف المنتج من معرف اللون
    SELECT pc.product_id INTO product_id 
    FROM public.product_colors pc 
    WHERE pc.id = update_product_color.color_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'اللون غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تعديل ألوان هذا المنتج';
    END IF;
    
    -- إذا كان هذا هو اللون الافتراضي، إلغاء تعيين أي لون افتراضي آخر
    IF is_default THEN
        UPDATE public.product_colors SET is_default = false WHERE product_id = product_id;
    END IF;
    
    -- تحديث بيانات اللون
    UPDATE public.product_colors SET
        name = COALESCE(update_product_color.name, name),
        color_code = COALESCE(update_product_color.color_code, color_code),
        quantity = COALESCE(update_product_color.quantity, quantity),
        price = COALESCE(update_product_color.price, price),
        image_url = COALESCE(update_product_color.image_url, image_url),
        is_default = COALESCE(update_product_color.is_default, is_default)
    WHERE id = update_product_color.color_id;
    
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

-- إنشاء دالة RPC لحذف لون
CREATE OR REPLACE FUNCTION public.delete_product_color(
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
BEGIN
    -- الحصول على معرف المنتج من معرف اللون
    SELECT pc.product_id INTO product_id 
    FROM public.product_colors pc 
    WHERE pc.id = delete_product_color.color_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'اللون غير موجود';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية حذف ألوان هذا المنتج';
    END IF;
    
    -- حذف اللون
    DELETE FROM public.product_colors WHERE id = delete_product_color.color_id;
    
    -- التحقق من عدد الألوان المتبقية وتحديث حالة has_variants للمنتج إذا لزم الأمر
    SELECT COUNT(*) INTO colors_count FROM public.product_colors WHERE product_id = product_id;
    
    IF colors_count = 0 THEN
        UPDATE public.products SET has_variants = false WHERE id = product_id;
    END IF;
    
    -- تحديث كمية المنتج بناءً على مجموع كميات الألوان المتبقية
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

-- إنشاء دالة RPC لإضافة صورة جديدة للمنتج
CREATE OR REPLACE FUNCTION public.create_product_image(
    product_id UUID,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_image_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF product_org_id IS NULL THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إضافة صور لهذا المنتج';
    END IF;
    
    -- إضافة الصورة الجديدة
    INSERT INTO public.product_images (
        product_id,
        image_url,
        sort_order
    ) VALUES (
        create_product_image.product_id,
        create_product_image.image_url,
        create_product_image.sort_order
    ) RETURNING id INTO new_image_id;
    
    RETURN new_image_id;
END;
$$;

-- إنشاء دالة RPC لحذف صورة
CREATE OR REPLACE FUNCTION public.delete_product_image(
    image_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    product_id UUID;
    product_org_id UUID;
    user_org_id UUID;
BEGIN
    -- الحصول على معرف المنتج من معرف الصورة
    SELECT pi.product_id INTO product_id 
    FROM public.product_images pi 
    WHERE pi.id = delete_product_image.image_id;
    
    IF product_id IS NULL THEN
        RAISE EXCEPTION 'الصورة غير موجودة';
    END IF;
    
    -- التحقق من أن المستخدم مسؤول عن المؤسسة المالكة للمنتج
    SELECT organization_id INTO product_org_id FROM public.products WHERE id = product_id;
    SELECT organization_id INTO user_org_id FROM public.users WHERE id = auth.uid() AND is_org_admin = true;

    IF user_org_id IS NULL OR user_org_id != product_org_id THEN
        RAISE EXCEPTION 'ليس لديك صلاحية حذف صور هذا المنتج';
    END IF;
    
    -- حذف الصورة
    DELETE FROM public.product_images WHERE id = delete_product_image.image_id;
    
    RETURN true;
END;
$$;

-- إنشاء دالة RPC للحصول على ألوان منتج معين
CREATE OR REPLACE FUNCTION public.get_product_colors(
    product_id UUID
) RETURNS SETOF public.product_colors
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.product_colors WHERE product_id = get_product_colors.product_id ORDER BY is_default DESC, name ASC;
$$;

-- إنشاء دالة RPC للحصول على صور منتج معين
CREATE OR REPLACE FUNCTION public.get_product_images(
    product_id UUID
) RETURNS SETOF public.product_images
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.product_images WHERE product_id = get_product_images.product_id ORDER BY sort_order ASC;
$$;

-- تعديل RLS (Row Level Security) على الجداول الجديدة
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للجداول الجديدة
CREATE POLICY "أي شخص يمكنه قراءة ألوان المنتجات" ON public.product_colors
    FOR SELECT USING (true);

CREATE POLICY "فقط المسؤولون عن المؤسسة يمكنهم إدارة ألوان المنتجات" ON public.product_colors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.users u ON u.organization_id = p.organization_id
            WHERE p.id = product_id AND u.id = auth.uid() AND u.is_org_admin = true
        )
    );

CREATE POLICY "أي شخص يمكنه قراءة صور المنتجات" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "فقط المسؤولون عن المؤسسة يمكنهم إدارة صور المنتجات" ON public.product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.users u ON u.organization_id = p.organization_id
            WHERE p.id = product_id AND u.id = auth.uid() AND u.is_org_admin = true
        )
    );

-- التأكد من وجود مجلدات التخزين في Supabase Storage
DO $$
BEGIN
    -- لاحظ: هذا الكود لا يقوم فعلياً بإنشاء المجلدات، لكنه يوثق المتطلبات
    RAISE NOTICE 'يرجى التأكد من وجود المجلدات التالية في بكت storage.organization-assets:';
    RAISE NOTICE '- product_thumbnails';
    RAISE NOTICE '- product_images';
    RAISE NOTICE '- product_colors';
END $$;

-- إضافة دالة لتحديث حالة أرشفة جميع الصور المرتبطة بمنتج عند حذفه
CREATE OR REPLACE FUNCTION public.handle_deleted_product_images()
RETURNS TRIGGER AS $$
BEGIN
    -- تسجيل روابط الصور المحذوفة للتنظيف اللاحق
    INSERT INTO public.deleted_files (file_path, deleted_at)
    SELECT thumbnail_image, now() FROM OLD_TABLE
    UNION ALL
    SELECT unnest(images), now() FROM OLD_TABLE;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إنشاء جدول لتسجيل الملفات المحذوفة لتنظيفها لاحقاً
CREATE TABLE IF NOT EXISTS public.deleted_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed BOOLEAN NOT NULL DEFAULT false
);

-- إضافة مشغل (Trigger) لتسجيل الصور المحذوفة
DROP TRIGGER IF EXISTS log_deleted_product_images ON public.products;
CREATE TRIGGER log_deleted_product_images
AFTER DELETE ON public.products
REFERENCING OLD TABLE AS OLD_TABLE
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_deleted_product_images(); 