-- إصلاح مشكلة handle_deleted_product_images trigger
-- السبب: يحاول إدراج قيم null في جدول deleted_files

-- ==================================================================
-- إصلاح الدالة لتجنب إدراج القيم الفارغة
-- ==================================================================

CREATE OR REPLACE FUNCTION public.handle_deleted_product_images()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- تسجيل روابط الصور المحذوفة للتنظيف اللاحق
    -- فقط إذا كانت القيم غير فارغة
    
    -- إدراج thumbnail_image إذا لم يكن فارغاً
    INSERT INTO public.deleted_files (file_path, deleted_at)
    SELECT thumbnail_image, now() 
    FROM OLD_TABLE
    WHERE thumbnail_image IS NOT NULL 
    AND thumbnail_image != '';
    
    -- إدراج images array إذا لم تكن فارغة
    INSERT INTO public.deleted_files (file_path, deleted_at)
    SELECT unnest(images), now() 
    FROM OLD_TABLE
    WHERE images IS NOT NULL 
    AND array_length(images, 1) > 0
    AND unnest(images) IS NOT NULL
    AND unnest(images) != '';
    
    RETURN OLD;
END;
$function$;

-- رسالة النجاح
SELECT 'تم إصلاح trigger handle_deleted_product_images!' as status; 