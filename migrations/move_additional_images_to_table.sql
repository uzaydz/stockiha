-- سكريبت لنقل الصور الإضافية من مصفوفة images في جدول products إلى جدول product_images
-- تاريخ الإنشاء: 2024-07-21

-- وظيفة لنقل الصور الإضافية لكل منتج
CREATE OR REPLACE FUNCTION public.migrate_product_images()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    product_record RECORD;
    current_image_url TEXT;
    image_index INTEGER;
    existing_image_record RECORD;
BEGIN
    -- تسجيل بدء العملية
    RAISE NOTICE 'بدء عملية ترحيل الصور الإضافية...';
    
    -- مرور على كل المنتجات
    FOR product_record IN 
        SELECT id, thumbnail_image, images 
        FROM public.products 
        WHERE array_length(images, 1) > 1
    LOOP
        RAISE NOTICE 'معالجة المنتج: % (% صورة)', product_record.id, array_length(product_record.images, 1);
        
        -- مرور على كل الصور في مصفوفة images باستثناء الصورة الرئيسية
        image_index := 0;
        FOREACH current_image_url IN ARRAY product_record.images
        LOOP
            -- تجاهل الصورة الرئيسية
            IF current_image_url <> product_record.thumbnail_image THEN
                -- التحقق مما إذا كانت الصورة موجودة بالفعل في جدول product_images
                SELECT * INTO existing_image_record 
                FROM public.product_images 
                WHERE product_id = product_record.id AND image_url = current_image_url;
                
                -- إذا لم تكن الصورة موجودة، قم بإضافتها
                IF existing_image_record IS NULL THEN
                    RAISE NOTICE 'إضافة صورة جديدة للمنتج %: %', product_record.id, current_image_url;
                    INSERT INTO public.product_images 
                        (product_id, image_url, sort_order, created_at, updated_at)
                    VALUES 
                        (product_record.id, current_image_url, image_index, now(), now());
                ELSE
                    RAISE NOTICE 'الصورة موجودة بالفعل للمنتج %: %', product_record.id, current_image_url;
                END IF;
            END IF;
            
            image_index := image_index + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'اكتملت عملية ترحيل الصور الإضافية بنجاح.';
END;
$$;

-- تنفيذ الوظيفة
SELECT public.migrate_product_images();

-- تنظيف (يمكن التعليق عليه لتنفيذه يدويًا بعد التأكد من نجاح الترحيل)
-- DROP FUNCTION IF EXISTS public.migrate_product_images();

-- ملاحظة: هذا السكريبت لا يقوم بحذف الصور من مصفوفة images في جدول products
-- إذا أردت حذف الصور الإضافية من المصفوفة (مع الاحتفاظ بالصورة الرئيسية)، يمكنك تنفيذ:
/*
UPDATE public.products
SET images = ARRAY[thumbnail_image]
WHERE array_length(images, 1) > 1;
*/ 