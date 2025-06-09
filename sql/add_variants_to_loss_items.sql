-- إضافة دعم المتغيرات (الألوان والمقاسات) لجدول loss_items
-- هذا سيسمح بتحديد اللون والمقاس المحدد للمنتج التالف

-- إضافة أعمدة المتغيرات
ALTER TABLE loss_items 
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES product_colors(id),
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id),
ADD COLUMN IF NOT EXISTS color_name TEXT,
ADD COLUMN IF NOT EXISTS size_name TEXT,
ADD COLUMN IF NOT EXISTS variant_stock_before INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_stock_after INTEGER;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_loss_items_color_id ON loss_items(color_id);
CREATE INDEX IF NOT EXISTS idx_loss_items_size_id ON loss_items(size_id);

-- إضافة تعليقات للتوضيح
COMMENT ON COLUMN loss_items.color_id IS 'معرف اللون المتضرر (إذا كان المنتج له ألوان)';
COMMENT ON COLUMN loss_items.size_id IS 'معرف المقاس المتضرر (إذا كان المنتج له مقاسات)';
COMMENT ON COLUMN loss_items.color_name IS 'اسم اللون المتضرر';
COMMENT ON COLUMN loss_items.size_name IS 'اسم المقاس المتضرر';
COMMENT ON COLUMN loss_items.variant_stock_before IS 'مخزون المتغير قبل الخسارة';
COMMENT ON COLUMN loss_items.variant_stock_after IS 'مخزون المتغير بعد الخسارة'; 