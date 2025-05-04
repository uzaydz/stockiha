-- check_online_order_items.sql
-- ملف للتحقق من وجود جدول online_order_items وإنشاؤه إذا لم يكن موجوداً

-- 1. فحص ما إذا كان الجدول موجوداً
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'online_order_items'
) AS online_order_items_exists;

-- 2. فحص أعمدة الجدول إذا كان موجوداً
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'online_order_items'
ORDER BY 
    ordinal_position;

-- 3. إنشاء جدول online_order_items إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'online_order_items'
    ) THEN
        CREATE TABLE online_order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES online_orders(id),
            product_id UUID NOT NULL REFERENCES products(id),
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC NOT NULL,
            total_price NUMERIC NOT NULL,
            is_digital BOOLEAN NOT NULL DEFAULT false,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            slug TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_online_order_items_order_id ON online_order_items(order_id);
        CREATE INDEX idx_online_order_items_product_id ON online_order_items(product_id);
        CREATE INDEX idx_online_order_items_organization_id ON online_order_items(organization_id);
        
        RAISE NOTICE 'تم إنشاء جدول online_order_items بنجاح';
    ELSE
        RAISE NOTICE 'جدول online_order_items موجود بالفعل';
        
        -- التحقق من وجود عمود order_id وإضافته إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'online_order_items' 
            AND column_name = 'order_id'
        ) THEN
            ALTER TABLE online_order_items ADD COLUMN order_id UUID NOT NULL REFERENCES online_orders(id);
            CREATE INDEX idx_online_order_items_order_id ON online_order_items(order_id);
            RAISE NOTICE 'تم إضافة عمود order_id إلى جدول online_order_items';
        ELSE
            RAISE NOTICE 'عمود order_id موجود بالفعل في جدول online_order_items';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء إنشاء أو تحديث جدول online_order_items: %', SQLERRM;
END;
$$;

-- 4. فحص نتيجة إنشاء الجدول
SELECT 
    table_name, 
    count(column_name) as column_count
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'online_order_items'
GROUP BY 
    table_name; 