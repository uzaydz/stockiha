-- إضافة دعم المتغيرات (الألوان والمقاسات) لجدول order_items
-- هذا مهم للطلبات المستقبلية ولتحسين نظام الإرجاع

-- إضافة أعمدة المتغيرات
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES product_colors(id),
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id),
ADD COLUMN IF NOT EXISTS color_name TEXT,
ADD COLUMN IF NOT EXISTS size_name TEXT,
ADD COLUMN IF NOT EXISTS variant_display_name TEXT,
ADD COLUMN IF NOT EXISTS variant_info JSONB DEFAULT '{}'::jsonb;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_order_items_color_id ON order_items(color_id);
CREATE INDEX IF NOT EXISTS idx_order_items_size_id ON order_items(size_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_info ON order_items USING GIN (variant_info);

-- إضافة تعليقات للتوضيح
COMMENT ON COLUMN order_items.color_id IS 'معرف اللون المطلوب (إذا كان المنتج له ألوان)';
COMMENT ON COLUMN order_items.size_id IS 'معرف المقاس المطلوب (إذا كان المنتج له مقاسات)';
COMMENT ON COLUMN order_items.color_name IS 'اسم اللون المطلوب';
COMMENT ON COLUMN order_items.size_name IS 'اسم المقاس المطلوب';
COMMENT ON COLUMN order_items.variant_display_name IS 'اسم المتغير للعرض';
COMMENT ON COLUMN order_items.variant_info IS 'معلومات إضافية للمتغير بصيغة JSON'; 