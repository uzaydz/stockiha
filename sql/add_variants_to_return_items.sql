-- إضافة دعم المتغيرات (الألوان والمقاسات) لجدول return_items
-- هذا سيسمح بتحديد اللون والمقاس المحدد للمنتج المرجع

-- إضافة أعمدة المتغيرات
ALTER TABLE return_items 
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES product_colors(id),
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id),
ADD COLUMN IF NOT EXISTS color_name TEXT,
ADD COLUMN IF NOT EXISTS size_name TEXT,
ADD COLUMN IF NOT EXISTS variant_display_name TEXT,
ADD COLUMN IF NOT EXISTS variant_stock_before INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_stock_after INTEGER;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_return_items_color_id ON return_items(color_id);
CREATE INDEX IF NOT EXISTS idx_return_items_size_id ON return_items(size_id);

-- إضافة تعليقات للتوضيح
COMMENT ON COLUMN return_items.color_id IS 'معرف اللون المرجع (إذا كان المنتج له ألوان)';
COMMENT ON COLUMN return_items.size_id IS 'معرف المقاس المرجع (إذا كان المنتج له مقاسات)';
COMMENT ON COLUMN return_items.color_name IS 'اسم اللون المرجع';
COMMENT ON COLUMN return_items.size_name IS 'اسم المقاس المرجع';
COMMENT ON COLUMN return_items.variant_display_name IS 'اسم المتغير للعرض';
COMMENT ON COLUMN return_items.variant_stock_before IS 'مخزون المتغير قبل الإرجاع';
COMMENT ON COLUMN return_items.variant_stock_after IS 'مخزون المتغير بعد الإرجاع'; 