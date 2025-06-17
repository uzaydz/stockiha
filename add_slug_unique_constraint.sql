-- إضافة قيد الفرادة على حقل slug
-- هذا الملف يضيف قيد unique على حقل slug ويتعامل مع البيانات المكررة

DO $$ 
BEGIN
    -- التحقق من وجود حقل slug
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'slug'
        AND table_schema = 'public'
    ) THEN
        -- إضافة حقل slug إذا لم يكن موجوداً
        ALTER TABLE public.products ADD COLUMN slug TEXT;
        RAISE NOTICE 'تم إضافة حقل slug إلى جدول المنتجات';
    END IF;

    -- تحديث القيم الفارغة أو المكررة
    UPDATE public.products 
    SET slug = LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), 
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    ) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || id::TEXT
    WHERE slug IS NULL OR slug = '' OR slug IN (
        SELECT slug 
        FROM public.products 
        WHERE slug IS NOT NULL AND slug != ''
        GROUP BY slug 
        HAVING COUNT(*) > 1
    );

    -- إضافة قيد الفرادة إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'products_slug_unique'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_slug_unique UNIQUE (slug);
        RAISE NOTICE 'تم إضافة قيد الفرادة على حقل slug';
    END IF;

    -- إنشاء فهرس للبحث السريع إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_products_slug_unique'
        AND tablename = 'products'
    ) THEN
        CREATE INDEX idx_products_slug_unique ON public.products(slug) 
        WHERE slug IS NOT NULL;
        RAISE NOTICE 'تم إنشاء فهرس على حقل slug';
    END IF;

END $$;

-- إنشاء/تحديث دالة لضمان فرادة slug
CREATE OR REPLACE FUNCTION ensure_unique_product_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- إذا كان slug فارغاً، أنشئه من اسم المنتج
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), 
                    '\s+', '-', 'g'
                ),
                '-+', '-', 'g'
            )
        );
        base_slug := TRIM(BOTH '-' FROM base_slug);
    ELSE
        -- تنظيف slug المدخل يدوياً
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(NEW.slug, '[^a-z0-9-]', '', 'g'),
                '-+', '-', 'g'
            )
        );
        base_slug := TRIM(BOTH '-' FROM base_slug);
    END IF;

    -- إذا أصبح فارغاً بعد التنظيف، استخدم معرف فريد
    IF base_slug = '' THEN
        base_slug := 'product-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    END IF;

    final_slug := base_slug;

    -- التحقق من فرادة slug (تجاهل المنتج الحالي في حالة التحديث)
    WHILE EXISTS (
        SELECT 1 FROM products 
        WHERE slug = final_slug 
        AND (
            (TG_OP = 'INSERT') OR 
            (TG_OP = 'UPDATE' AND id != NEW.id)
        )
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := final_slug;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS trigger_ensure_unique_product_slug ON products;
CREATE TRIGGER trigger_ensure_unique_product_slug
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_unique_product_slug();

-- إضافة تعليق توضيحي
COMMENT ON COLUMN products.slug IS 'رابط المنتج الفريد المستخدم في URLs';
COMMENT ON CONSTRAINT products_slug_unique ON products IS 'ضمان فرادة رابط المنتج';
COMMENT ON FUNCTION ensure_unique_product_slug() IS 'دالة لضمان فرادة slug للمنتجات'; 