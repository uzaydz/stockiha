-- إنشاء جدول الخدمات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL,
    estimated_time TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.services;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.services;

-- إنشاء سياسات جديدة

-- السماح لجميع المستخدمين بقراءة الخدمات
CREATE POLICY "Enable read access for all users" 
ON public.services FOR SELECT 
USING (true);

-- السماح للمستخدمين المصادق عليهم بإضافة وتحديث الخدمات
CREATE POLICY "Enable write access for authenticated users" 
ON public.services FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.services FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بحذف الخدمات
CREATE POLICY "Enable delete for authenticated users" 
ON public.services FOR DELETE 
TO authenticated 
USING (true);

-- إنشاء دالة لتحديث timestamp عند التعديل
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء trigger لتحديث updated_at تلقائياً
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- إضافة تعليقات توضيحية
COMMENT ON TABLE public.services IS 'جدول الخدمات في النظام';
COMMENT ON COLUMN public.services.id IS 'معرف فريد للخدمة';
COMMENT ON COLUMN public.services.name IS 'اسم الخدمة';
COMMENT ON COLUMN public.services.description IS 'وصف الخدمة';
COMMENT ON COLUMN public.services.price IS 'سعر الخدمة';
COMMENT ON COLUMN public.services.estimated_time IS 'الوقت التقديري للخدمة';
COMMENT ON COLUMN public.services.category IS 'فئة الخدمة';
COMMENT ON COLUMN public.services.image IS 'رابط صورة الخدمة (اختياري)';
COMMENT ON COLUMN public.services.is_available IS 'حالة توفر الخدمة';
COMMENT ON COLUMN public.services.created_at IS 'تاريخ إنشاء الخدمة';
COMMENT ON COLUMN public.services.updated_at IS 'تاريخ آخر تحديث للخدمة'; 