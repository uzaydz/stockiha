-- 🚀 فهارس محسنة لدالة get_store_products_page

-- تمكين pg_trgm للبحث السريع (مرة واحدة فقط)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- فهرس مركب لدعم فرز الأحدث وتقييد المؤسسة والحالة
CREATE INDEX IF NOT EXISTS idx_products_org_active_created_at
  ON public.products (organization_id, is_active, created_at DESC);

-- فهرس مركب لدعم فلترة الفئة مع المؤسسة والحالة
CREATE INDEX IF NOT EXISTS idx_products_org_category_active_created_at
  ON public.products (organization_id, category_id, is_active, created_at DESC);

-- فهارس بحث نصي سريع على الاسم والوصف
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON public.products USING gin (description gin_trgm_ops);

-- فهرس للفئات بحسب المؤسسة والنشاط والاسم
CREATE INDEX IF NOT EXISTS idx_product_categories_org_active_name
  ON public.product_categories (organization_id, is_active, name);

-- فهرس للفئات الفرعية بحسب الفئة والنشاط والاسم
CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_active_name
  ON public.product_subcategories (category_id, is_active, name);

