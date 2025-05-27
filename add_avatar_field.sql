-- إضافة حقل الصورة الشخصية إلى جدول users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- إضافة حقل للاسم الأول والأخير منفصلين
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- إضافة حقل للمنصب/الوظيفة
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- إضافة حقل للسيرة الذاتية المختصرة
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- إضافة حقل لتاريخ الميلاد
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- إضافة حقل للجنس
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- إضافة حقل للعنوان
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- إضافة حقل للمدينة
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city TEXT;

-- إضافة حقل للدولة
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'الجزائر';

-- إضافة حقل لآخر نشاط
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- إضافة حقل لحالة المستخدم (متصل/غير متصل)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy'));

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);

-- تحديث الحقول الموجودة لتقسيم الاسم إذا كان موجوداً
UPDATE users 
SET 
    first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        ELSE ''
    END
WHERE first_name IS NULL AND name IS NOT NULL;

-- إضافة تعليقات للحقول الجديدة
COMMENT ON COLUMN users.avatar_url IS 'رابط الصورة الشخصية للمستخدم';
COMMENT ON COLUMN users.first_name IS 'الاسم الأول للمستخدم';
COMMENT ON COLUMN users.last_name IS 'الاسم الأخير للمستخدم';
COMMENT ON COLUMN users.job_title IS 'المنصب أو الوظيفة';
COMMENT ON COLUMN users.bio IS 'السيرة الذاتية المختصرة';
COMMENT ON COLUMN users.birth_date IS 'تاريخ الميلاد';
COMMENT ON COLUMN users.gender IS 'الجنس';
COMMENT ON COLUMN users.address IS 'العنوان';
COMMENT ON COLUMN users.city IS 'المدينة';
COMMENT ON COLUMN users.country IS 'الدولة';
COMMENT ON COLUMN users.last_activity_at IS 'آخر نشاط للمستخدم';
COMMENT ON COLUMN users.status IS 'حالة المستخدم (متصل/غير متصل/مشغول/بعيد)'; 