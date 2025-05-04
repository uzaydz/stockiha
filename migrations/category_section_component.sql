-- ملف لإضافة مكون قسم الفئات مع خيارات متقدمة
-- إنشاء بواسطة: نظام بازار
-- التاريخ: 2025/05/01

-- 1. أولاً نتأكد من وجود مخطط التتبع للتحديثات
CREATE TABLE IF NOT EXISTS migrations_log (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL,
  details TEXT
);

-- 2. إضافة عمود order_count إلى جدول product_categories إذا لم يكن موجودًا
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_categories' 
    AND column_name = 'order_count'
  ) THEN
    ALTER TABLE product_categories ADD COLUMN order_count BIGINT DEFAULT 0;
    RAISE NOTICE 'تمت إضافة عمود order_count إلى جدول الفئات لتتبع المبيعات';
  END IF;
END $$;

-- 3. إنشاء وظيفة لتحديث عدد الطلبات لكل فئة
CREATE OR REPLACE FUNCTION update_category_order_counts() RETURNS VOID AS $$
BEGIN
  -- تحديث عدد الطلبات لكل فئة بناءً على بيانات المبيعات
  -- ملاحظة: نستخدم جدول orders.created_at لأن عمود created_at غير موجود في جدول order_items
  UPDATE product_categories pc
  SET order_count = COALESCE(
    (SELECT COUNT(DISTINCT oi.order_id)
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     JOIN orders o ON oi.order_id = o.id
     WHERE p.category_id = pc.id
     AND o.created_at >= NOW() - INTERVAL '6 month'),
    0
  );
  
  RAISE NOTICE 'تم تحديث عدد الطلبات لجميع الفئات';
END;
$$ LANGUAGE plpgsql;

-- 4. وظيفة لتحديث عدد الطلبات تلقائيًا عند إضافة طلب جديد
CREATE OR REPLACE FUNCTION increment_category_order_count() RETURNS TRIGGER AS $$
DECLARE
  category_id UUID;
BEGIN
  -- الحصول على معرف الفئة من المنتج
  SELECT category_id INTO category_id
  FROM products 
  WHERE id = NEW.product_id;
  
  -- زيادة عدد الطلبات للفئة
  IF category_id IS NOT NULL THEN
    UPDATE product_categories
    SET order_count = order_count + 1
    WHERE id = category_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء المحفز الذي سيقوم بتشغيل الوظيفة عند إضافة عنصر طلب جديد
DROP TRIGGER IF EXISTS trigger_order_item_increment_category_count ON order_items;
CREATE TRIGGER trigger_order_item_increment_category_count
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION increment_category_order_count();

-- 6. تحديث بيانات التطبيق لإضافة مكون قسم الفئات
DO $$
BEGIN
  -- تحديث عدد الطلبات الأولي
  PERFORM update_category_order_counts();
  
  -- تسجيل بدء تنفيذ المهاجرة
  INSERT INTO migrations_log (migration_name, status, details)
  VALUES (
    'add_category_section_component_start', 
    'IN_PROGRESS', 
    'بدأ تنفيذ إضافة مكون قسم الفئات'
  );
  
  -- إضافة مكون القسم للمؤسسات التي لا تملكه
  RAISE NOTICE 'جار إضافة مكون القسم للمؤسسات...';
END $$;

-- تنفيذ الإدراج المباشر باستخدام استعلام SQL عادي (تجاوز PL/pgSQL)
-- هذا يتجنب ظروف المحفزات في البلوكات الإجرائية
INSERT INTO store_settings (
  id,
  organization_id,
  component_type,
  settings,
  is_active,
  order_index,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  organizations.id,
  'CategorySection',
  '{
    "title": "تصفح فئات منتجاتنا",
    "description": "أفضل الفئات المختارة لتلبية احتياجاتك",
    "selectionMethod": "random",
    "maxCategories": 6,
    "showProductCount": true,
    "showDescription": true,
    "selectedCategories": [],
    "displayStyle": "cards",
    "enableViewAll": true,
    "backgroundStyle": "light"
  }'::jsonb,
  true,
  COALESCE((SELECT MAX(order_index) + 1 FROM store_settings ss WHERE ss.organization_id = organizations.id), 1),
  NOW(),
  NOW()
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM store_settings
  WHERE component_type = 'CategorySection'
  AND organization_id = organizations.id
);

-- تسجيل اكتمال المهاجرة
DO $$
BEGIN
  -- تسجيل نجاح التحديث
  INSERT INTO migrations_log (migration_name, status, details)
  VALUES (
    'add_category_section_component', 
    'COMPLETED', 
    'تم إضافة مكون قسم الفئات وإنشاء وظائف تحديث عدد الطلبات'
  );
  
  RAISE NOTICE 'تم تطبيق التحديث بنجاح وإضافة مكون قسم الفئات إلى جميع المؤسسات';
END $$; 