-- تحديث الشهادات الافتراضية لتكون أكثر جزائرية
-- مع صور عالية الجودة من Unsplash

-- ═══════════════════════════════════════════════════════════════════════════════════
-- 🇩🇿 الهدف: تحديث الشهادات الافتراضية لتحتوي على أسماء وصور جزائرية
-- ═══════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. الحصول على معرف مؤسسة افتراضي للشهادات التجريبية
DO $$
DECLARE
  v_demo_org_id UUID;
BEGIN
  -- اختيار مؤسسة موجودة أو إنشاء UUID افتراضي
  SELECT id INTO v_demo_org_id 
  FROM organizations 
  WHERE name LIKE '%demo%' OR name LIKE '%test%'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- إذا لم نجد مؤسسة تجريبية، نستخدم UUID ثابت
  IF v_demo_org_id IS NULL THEN
    v_demo_org_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
  
  -- إنشاء شهادات افتراضية جديدة بأسماء جزائرية
  INSERT INTO customer_testimonials (
    id,
    organization_id,
    customer_name,
    customer_avatar,
    rating,
    comment,
    verified,
    purchase_date,
    product_name,
    product_image,
    is_active,
    created_at,
    updated_at
  ) VALUES 
  -- شهادة 1: أحمد بن يوسف
  (
    gen_random_uuid(),
    v_demo_org_id,
    'أحمد بن يوسف',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    5,
    'منتج رائع جداً! لقد استخدمته لمدة شهر وأنا سعيد جداً بالنتائج. التوصيل كان سريعاً لولاية الجزائر والتغليف كان ممتازاً.',
    true,
    '2023-09-15T12:00:00Z',
    'سماعات بلوتوث لاسلكية',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
    true,
    NOW(),
    NOW()
  ),
  -- شهادة 2: فاطمة بن علي
  (
    gen_random_uuid(),
    v_demo_org_id,
    'فاطمة بن علي',
    'https://images.unsplash.com/photo-1494790108755-2616b612b412?w=150&h=150&fit=crop&crop=face',
    4.5,
    'جودة المنتج ممتازة والسعر مناسب جداً مقارنة بالمنتجات المماثلة في السوق الجزائري. أنصح الجميع بتجربته!',
    true,
    '2023-08-20T09:30:00Z',
    'ساعة ذكية',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop',
    true,
    NOW(),
    NOW()
  ),
  -- شهادة 3: محمد سعيد
  (
    gen_random_uuid(),
    v_demo_org_id,
    'محمد سعيد',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    5,
    'خدمة العملاء ممتازة والرد سريع على الاستفسارات. المنتج وصل لولاية وهران بحالة ممتازة وبدون أي خدوش.',
    true,
    '2023-07-10T15:45:00Z',
    'تلفزيون ذكي 55 بوصة',
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=200&fit=crop',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'تم إنشاء شهادات تجريبية للمؤسسة: %', v_demo_org_id;
END $$;

-- 2. تحديث الشهادات الموجودة التي تستخدم روابط صور محلية غير صالحة
UPDATE customer_testimonials 
SET 
  customer_avatar = CASE 
    WHEN customer_avatar LIKE '/images/avatars%' THEN 
      CASE 
        WHEN customer_name LIKE '%أحمد%' THEN 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        WHEN customer_name LIKE '%فاطمة%' OR customer_name LIKE '%نورا%' OR customer_name LIKE '%ليلى%' OR customer_name LIKE '%سارة%' THEN 'https://images.unsplash.com/photo-1494790108755-2616b612b412?w=150&h=150&fit=crop&crop=face'
        WHEN customer_name LIKE '%محمد%' OR customer_name LIKE '%عمر%' OR customer_name LIKE '%خالد%' THEN 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        ELSE 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      END
    ELSE customer_avatar
  END,
  product_image = CASE 
    WHEN product_image LIKE '/images/products%' THEN 
      CASE 
        WHEN product_name LIKE '%سماعات%' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'
        WHEN product_name LIKE '%ساعة%' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop'
        WHEN product_name LIKE '%تلفزيون%' THEN 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=200&fit=crop'
        WHEN product_name LIKE '%مكنسة%' THEN 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop'
        WHEN product_name LIKE '%لابتوب%' THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop'
        WHEN product_name LIKE '%قهوة%' THEN 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop'
      END
    ELSE product_image
  END,
  comment = CASE 
    WHEN comment LIKE '%المملكة%' THEN REPLACE(comment, 'المملكة', 'الجزائر')
    WHEN comment LIKE '%مناطق المملكة%' THEN REPLACE(comment, 'مناطق المملكة', 'ولايات الجزائر')
    ELSE comment
  END,
  updated_at = NOW()
WHERE 
  customer_avatar LIKE '/images/avatars%' 
  OR product_image LIKE '/images/products%'
  OR comment LIKE '%المملكة%';

-- 3. إنشاء دالة لإضافة شهادات جزائرية افتراضية للمؤسسات الجديدة
CREATE OR REPLACE FUNCTION add_default_algerian_testimonials(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_testimonials_added INTEGER := 0;
BEGIN
  -- التحقق من عدم وجود شهادات بالفعل
  IF EXISTS (SELECT 1 FROM customer_testimonials WHERE organization_id = p_organization_id) THEN
    RETURN 0;
  END IF;

  -- إضافة 3 شهادات افتراضية
  INSERT INTO customer_testimonials (
    id, organization_id, customer_name, customer_avatar, rating, comment,
    verified, product_name, product_image, is_active, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(), p_organization_id, 'أحمد بن يوسف',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    5, 'منتج رائع جداً! التوصيل كان سريعاً في الجزائر والجودة ممتازة.',
    true, 'سماعات بلوتوث', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
    true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), p_organization_id, 'فاطمة بن علي',
    'https://images.unsplash.com/photo-1494790108755-2616b612b412?w=150&h=150&fit=crop&crop=face',
    4.5, 'جودة ممتازة والسعر مناسب. أنصح به للجميع في الجزائر!',
    true, 'ساعة ذكية', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop',
    true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), p_organization_id, 'محمد سعيد',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    5, 'خدمة العملاء ممتازة. المنتج وصل بحالة ممتازة لولاية وهران.',
    true, 'تلفزيون ذكي', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=200&fit=crop',
    true, NOW(), NOW()
  );

  GET DIAGNOSTICS v_testimonials_added = ROW_COUNT;
  RETURN v_testimonials_added;
END;
$$;

-- 4. عرض تقرير النتائج
DO $$
DECLARE
  v_updated_avatars INTEGER;
  v_updated_images INTEGER;
  v_updated_comments INTEGER;
  v_new_testimonials INTEGER;
BEGIN
  -- حساب عدد التحديثات
  SELECT COUNT(*) INTO v_updated_avatars 
  FROM customer_testimonials 
  WHERE customer_avatar LIKE 'https://images.unsplash.com%' 
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO v_updated_images 
  FROM customer_testimonials 
  WHERE product_image LIKE 'https://images.unsplash.com%' 
  AND updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO v_updated_comments 
  FROM customer_testimonials 
  WHERE comment LIKE '%الجزائر%' OR comment LIKE '%ولايات الجزائر%';
  
  SELECT COUNT(*) INTO v_new_testimonials
  FROM customer_testimonials 
  WHERE created_at > NOW() - INTERVAL '1 minute';
  
  -- عرض النتائج
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║               🇩🇿 تقرير تحديث الشهادات الجزائرية 🇩🇿               ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ صور العملاء المحدثة: %                                        ║', v_updated_avatars;
  RAISE NOTICE '║ صور المنتجات المحدثة: %                                       ║', v_updated_images;
  RAISE NOTICE '║ التعليقات المحدثة: %                                          ║', v_updated_comments;
  RAISE NOTICE '║ شهادات جديدة مضافة: %                                         ║', v_new_testimonials;
  RAISE NOTICE '║                                                              ║';
  RAISE NOTICE '║ ✅ تم تحديث جميع الشهادات لتكون أكثر جزائرية!                  ║';
  RAISE NOTICE '║ 🎯 الصور من Unsplash عالية الجودة ومناسبة للعرض                ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
END $$;

COMMIT; 