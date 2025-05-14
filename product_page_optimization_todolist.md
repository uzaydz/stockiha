# خطة تحسين صفحة شراء المنتج (ProductPurchase)

## ملخص المشكلة

الصفحة الحالية تعاني من:
- استعلامات Supabase مباشرة من المتصفح
- عمليات API متعددة متتابعة لكل زيارة
- عدم الاستفادة الكاملة من التخزين المؤقت
- زيارات كثيرة (500 ألف يومياً) تؤدي إلى ارتفاع تكاليف Supabase وVercel

## الأهداف

1. تقليل عدد استدعاءات قاعدة البيانات بنسبة 90-95%
2. تخفيض تكاليف API وقاعدة البيانات بشكل كبير
3. الحفاظ على سرعة وأداء الصفحة أو تحسينها
4. تبسيط الكود وتسهيل الصيانة المستقبلية

## مراحل التنفيذ

### المرحلة 1: إعادة هيكلة استعلامات قاعدة البيانات (أولوية قصوى)

- [x] 1.1 إنشاء وظيفة PostgreSQL مخصصة لجلب البيانات الكاملة للمنتج
  ```sql
  CREATE OR REPLACE FUNCTION public.get_complete_product_data(p_slug TEXT, p_org_id UUID)
  RETURNS JSONB
  LANGUAGE sql
  STABLE
  AS $$
    SELECT jsonb_build_object(
      'product', product,
      'colors', colors,
      'sizes', sizes,
      'form_settings', form_settings
    )
    FROM (
      -- منتج أساسي
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'discount_price', p.compare_at_price,
        'stock_quantity', p.stock_quantity,
        'description', p.description,
        'thumbnail_image', p.thumbnail_image,
        'has_fast_shipping', p.has_fast_shipping,
        'has_money_back', p.has_money_back,
        'has_quality_guarantee', p.has_quality_guarantee,
        'fast_shipping_text', p.fast_shipping_text,
        'money_back_text', p.money_back_text,
        'quality_guarantee_text', p.quality_guarantee_text,
        'purchase_page_config', p.purchase_page_config,
        'additional_images', (
          SELECT jsonb_agg(pi.image_url) FROM product_images pi 
          WHERE pi.product_id = p.id
        ),
        'use_sizes', p.use_sizes,
        'category', (
          SELECT c.name FROM product_categories c 
          WHERE c.id = p.category_id
        )
      ) AS product,
      p.id as product_id
      FROM products p
      WHERE p.slug = p_slug 
        AND p.organization_id = p_org_id 
        AND p.is_active = true
    ) products,
    LATERAL (
      -- الألوان
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name, 
          'color_code', c.color_code,
          'image_url', c.image_url,
          'quantity', c.quantity,
          'price', c.price,
          'is_default', c.is_default,
          'barcode', c.barcode,
          'has_sizes', c.has_sizes
        )
      ), '[]'::jsonb) as colors
      FROM product_colors c
      WHERE c.product_id = products.product_id
    ) colors,
    LATERAL (
      -- المقاسات
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'product_id', s.product_id,
          'color_id', s.color_id,
          'size_name', s.size_name,
          'quantity', s.quantity,
          'price', s.price,
          'barcode', s.barcode,
          'is_default', s.is_default
        )
      ), '[]'::jsonb) as sizes
      FROM product_sizes s
      WHERE s.product_id = products.product_id
    ) sizes,
    LATERAL (
      -- إعدادات النموذج
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', fs.id,
          'name', fs.name,
          'is_default', fs.is_default,
          'is_active', fs.is_active,
          'version', fs.version,
          'fields', fs.fields,
          'settings', fs.settings
        )
      ), '[]'::jsonb) as form_settings
      FROM form_settings fs
      WHERE fs.organization_id = p_org_id
      AND (
        (fs.product_ids IS NULL) OR
        (fs.product_ids @> jsonb_build_array(products.product_id::text)) OR
        (fs.is_default = true)
      )
      AND fs.is_active = true
      ORDER BY 
        CASE WHEN fs.product_ids @> jsonb_build_array(products.product_id::text) THEN 0 ELSE 1 END,
        fs.is_default DESC
      LIMIT 1
    ) form_settings
  $$;
  ```

- [x] 1.2 إنشاء وظائف PostgreSQL مساعدة للشحن والتوصيل
  ```sql
  CREATE OR REPLACE FUNCTION public.get_shipping_provinces(p_org_id UUID)
  CREATE OR REPLACE FUNCTION public.get_shipping_municipalities(p_wilaya_id INT)
  CREATE OR REPLACE FUNCTION public.calculate_shipping_fee(...)
  ```

- [x] 1.3 إنشاء مؤشرات (Indexes) لتسريع الاستعلامات
  ```sql
  CREATE INDEX IF NOT EXISTS products_slug_organization_id_idx ON products(slug, organization_id)
  ```

- [x] 1.4 إنشاء طبقة API مع التخزين المؤقت على مستوى التطبيق
  ```typescript
  src/api/product-page.ts
  ```

- [x] 1.5 تحديث مكون ProductPurchase.tsx لاستخدام API الجديد

- [x] 1.6 إنشاء صفحة وسيطة لتحسين SEO وتخزين مؤقت مسبق
  ```typescript
  src/pages/product/[slug].tsx
  ```

- [x] 1.7 إعداد سياسات التخزين المؤقت في Vercel

### المرحلة 2: تحسين الأداء الإضافي (أولوية متوسطة)

- [ ] 2.1 تطبيق تجزئة الكود (Code splitting) للمكونات الثقيلة
  - [ ] تجزئة OrderForm 
  - [ ] تجزئة UpsellDownsellDisplay 
  - [ ] تجزئة ProductGallery

- [ ] 2.2 تطبيق Lazy Loading للصور
  - [ ] تحسين ProductGallery لدعم Lazy Loading
  - [ ] تطبيق استراتيجية Placeholder للصور

- [ ] 2.3 تحسين استخدام React الداخلي
  - [ ] تطبيق useMemo و useCallback للتوابع الثقيلة
  - [ ] تطبيق React.memo للمكونات التي تتطلب إعادة العرض المتكررة

### المرحلة 3: تحسين Lighthouse والأداء (أولوية منخفضة)

- [ ] 3.1 تحسين زمن التفاعل (Time to Interactive)
  - [ ] تقليل JavaScript غير الضروري
  - [ ] تأجيل تحميل الكود غير الحيوي

- [ ] 3.2 تحسين LCP (Largest Contentful Paint)
  - [ ] تطبيق تنسيقات الصور الحديثة (AVIF/WebP)
  - [ ] Preload للموارد الحرجة

## حالة التنفيذ

### المنفذ
1. وظائف قاعدة البيانات الموحدة لجلب بيانات المنتج
2. طبقة API جديدة مع التخزين المؤقت
3. تحديث مكون صفحة الشراء
4. صفحة وسيطة لتحسين SEO
5. سياسات التخزين المؤقت في Vercel

### قيد التنفيذ
1. تجزئة الكود
2. تحسين Lazy Loading للصور
3. تحسين Lighthouse والأداء

## النتائج المتوقعة

تقليل استدعاءات Supabase من 500K+ يومياً إلى حوالي 20-25K استدعاء، مما يعني توفير حوالي 95% من التكاليف وتحسين زمن التحميل بنسبة تزيد عن 60%. 