-- هجرة لإضافة أعمدة جديدة للتحكم في طريقة بيع المنتج وأنواع الوحدات

-- إضافة عمود لتحديد إذا كان المنتج يباع بالقطعة أو بالوزن/الحجم
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_sold_by_unit BOOLEAN DEFAULT TRUE;

-- إضافة عمود لنوع الوحدة (مثل كيلوغرام، لتر، الخ) للمنتجات التي تباع بالوزن/الحجم
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_type TEXT;

-- إضافة عمود للتحكم في ما إذا كان يتم استخدام أسعار مختلفة للألوان/المقاسات
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS use_variant_prices BOOLEAN DEFAULT FALSE;

-- إضافة سعر الشراء للوحدة للمنتجات التي تباع بالوزن/الحجم
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_purchase_price NUMERIC;

-- إضافة سعر البيع للوحدة للمنتجات التي تباع بالوزن/الحجم
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_sale_price NUMERIC;

-- تحديث عمود product_colors لدعم سعر الشراء
ALTER TABLE public.product_colors ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;

-- تحديث عمود product_sizes لدعم سعر الشراء
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS purchase_price NUMERIC; 