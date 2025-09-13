-- إضافة أعمدة لدعم وضع النشر والجدولة في جدول المنتجات
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft','scheduled','published','archived')),
  ADD COLUMN IF NOT EXISTS publish_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- فهارس مساعدة
CREATE INDEX IF NOT EXISTS idx_products_publication_status ON public.products (publication_status);
CREATE INDEX IF NOT EXISTS idx_products_publish_at ON public.products (publish_at);


