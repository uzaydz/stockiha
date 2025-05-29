-- إصلاح سياسات RLS لجدول deleted_files
-- هذا الجدول يُستخدم لتسجيل الملفات المحذوفة للتنظيف اللاحق

-- تمكين RLS على الجدول
ALTER TABLE public.deleted_files ENABLE ROW LEVEL SECURITY;

-- إضافة عمود organization_id للتوافق مع نظام المؤسسات
ALTER TABLE public.deleted_files 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_deleted_files_organization_id ON public.deleted_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_deleted_files_processed ON public.deleted_files(processed);

-- سياسة للقراءة: المدراء فقط يمكنهم رؤية الملفات المحذوفة في مؤسستهم
CREATE POLICY "المدراء يمكنهم رؤية الملفات المحذوفة في مؤسستهم" ON public.deleted_files
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
    );

-- سياسة للإدراج: النظام فقط يمكنه إدراج سجلات جديدة
CREATE POLICY "النظام يمكنه إدراج سجلات الملفات المحذوفة" ON public.deleted_files
    FOR INSERT WITH CHECK (
        -- السماح للنظام بإدراج السجلات عند حذف المنتجات
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND organization_id = deleted_files.organization_id
        )
    );

-- سياسة للتحديث: المدراء فقط يمكنهم تحديث حالة المعالجة
CREATE POLICY "المدراء يمكنهم تحديث حالة المعالجة" ON public.deleted_files
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
    ) WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
    );

-- سياسة للحذف: المدراء فقط يمكنهم حذف السجلات المعالجة
CREATE POLICY "المدراء يمكنهم حذف السجلات المعالجة" ON public.deleted_files
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
        AND processed = true
    );

-- تحديث دالة handle_deleted_product_images لتشمل organization_id
CREATE OR REPLACE FUNCTION public.handle_deleted_product_images()
RETURNS TRIGGER AS $$
BEGIN
    -- تسجيل روابط الصور المحذوفة للتنظيف اللاحق مع organization_id
    INSERT INTO public.deleted_files (file_path, organization_id, deleted_at)
    SELECT thumbnail_image, organization_id, now() 
    FROM OLD_TABLE
    WHERE thumbnail_image IS NOT NULL
    UNION ALL
    SELECT unnest(images), organization_id, now() 
    FROM OLD_TABLE
    WHERE images IS NOT NULL AND array_length(images, 1) > 0;
    
    -- تسجيل صور الألوان المحذوفة
    INSERT INTO public.deleted_files (file_path, organization_id, deleted_at)
    SELECT pc.image_url, p.organization_id, now()
    FROM product_colors pc
    JOIN OLD_TABLE p ON pc.product_id = p.id
    WHERE pc.image_url IS NOT NULL;
    
    -- تسجيل الصور الإضافية المحذوفة
    INSERT INTO public.deleted_files (file_path, organization_id, deleted_at)
    SELECT pi.image_url, p.organization_id, now()
    FROM product_images pi
    JOIN OLD_TABLE p ON pi.product_id = p.id
    WHERE pi.image_url IS NOT NULL;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء المشغل مع الدالة المحدثة
DROP TRIGGER IF EXISTS log_deleted_product_images ON public.products;
CREATE TRIGGER log_deleted_product_images
AFTER DELETE ON public.products
REFERENCING OLD TABLE AS OLD_TABLE
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_deleted_product_images();

-- دالة للمساعدة في تنظيف الملفات المحذوفة القديمة
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_files(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.deleted_files
    WHERE processed = true 
    AND deleted_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- إضافة تعليق توضيحي
COMMENT ON TABLE public.deleted_files IS 'جدول لتسجيل الملفات المحذوفة من النظام للتنظيف اللاحق';
COMMENT ON COLUMN public.deleted_files.file_path IS 'مسار الملف المحذوف';
COMMENT ON COLUMN public.deleted_files.organization_id IS 'معرف المؤسسة التي كان الملف ينتمي إليها';
COMMENT ON COLUMN public.deleted_files.processed IS 'هل تمت معالجة الملف وحذفه من التخزين';
COMMENT ON FUNCTION public.cleanup_old_deleted_files IS 'دالة لحذف سجلات الملفات المحذوفة القديمة التي تمت معالجتها';