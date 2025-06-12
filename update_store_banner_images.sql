-- تحديث صور StoreBanner لتكون أكثر جاذبية ومربعة
-- في مكونات Hero الموجودة في قاعدة البيانات

-- ═══════════════════════════════════════════════════════════════════════════════════
-- 🎯 الهدف: تحديث صور StoreBanner لتكون أكثر جاذبية ومناسبة للمتاجر الإلكترونية
-- ═══════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. تحديث الصورة القديمة إلى الصورة الجديدة المحسنة
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{imageUrl}',
  '"https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center"'
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND settings->>'imageUrl' = 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

-- 2. تحديث أي صور أخرى قديمة لمكونات Hero
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{imageUrl}',
  '"https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center"'
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND (
  settings->>'imageUrl' LIKE '%photo-1522204523234-8729aa6e3d5f%'
  OR settings->>'imageUrl' LIKE '%photo-1511556820780-d912e42b4980%'
);

-- 3. تحديث العناوين لتكون أكثر جاذبية إذا كانت تستخدم النص الافتراضي
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{title}',
  '"أحدث المنتجات"'
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND settings->>'title' = 'أهلاً بك في متجرنا';

-- 4. تحديث الوصف ليكون أكثر تشويقاً
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{description}',
  '"تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية في الجزائر"'
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND (
  settings->>'description' IS NULL 
  OR settings->>'description' = ''
  OR settings->>'description' = 'اكتشف مجموعتنا المتنوعة من المنتجات عالية الجودة'
);

-- 5. إضافة إعدادات محسنة للعرض المربع (إذا لم تكن موجودة)
UPDATE store_settings 
SET settings = settings || jsonb_build_object(
  'aspectRatio', 'square',
  'imageOptimization', true,
  'hoverEffects', true
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND NOT (settings ? 'aspectRatio');

-- 6. تحسين نصوص الأزرار لتكون أكثر جاذبية
UPDATE store_settings 
SET settings = jsonb_set(
  jsonb_set(
    settings,
    '{primaryButtonText}',
    '"تصفح الكل"'
  ),
  '{secondaryButtonText}',
  '"العروض الخاصة"'
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND (
  settings->>'primaryButtonText' IS NULL 
  OR settings->>'primaryButtonText' = 'تسوق الآن'
  OR settings->>'primaryButtonText' = ''
);

-- 7. إضافة أيقونات الثقة الافتراضية إذا لم تكن موجودة
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{trustBadges}',
  jsonb_build_array(
    jsonb_build_object('icon', 'Truck', 'text', 'توصيل سريع'),
    jsonb_build_object('icon', 'ShieldCheck', 'text', 'دفع آمن'),
    jsonb_build_object('icon', 'Gem', 'text', 'جودة عالية')
  )
),
updated_at = NOW()
WHERE component_type IN ('hero', 'banner')
AND NOT (settings ? 'trustBadges');

-- 8. عرض تقرير النتائج
DO $$
DECLARE
  v_images_updated INTEGER;
  v_titles_updated INTEGER;
  v_descriptions_updated INTEGER;
  v_buttons_updated INTEGER;
  v_trust_badges_added INTEGER;
  v_total_components INTEGER;
BEGIN
  -- حساب عدد التحديثات
  SELECT COUNT(*) INTO v_images_updated 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner')
  AND settings->>'imageUrl' = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center'
  AND updated_at > NOW() - INTERVAL '2 minutes';
  
  SELECT COUNT(*) INTO v_titles_updated 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner')
  AND settings->>'title' = 'أحدث المنتجات'
  AND updated_at > NOW() - INTERVAL '2 minutes';
  
  SELECT COUNT(*) INTO v_descriptions_updated 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner')
  AND settings->>'description' LIKE '%الجزائر%'
  AND updated_at > NOW() - INTERVAL '2 minutes';
  
  SELECT COUNT(*) INTO v_buttons_updated 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner')
  AND settings->>'primaryButtonText' = 'تصفح الكل'
  AND updated_at > NOW() - INTERVAL '2 minutes';
  
  SELECT COUNT(*) INTO v_trust_badges_added 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner')
  AND settings ? 'trustBadges'
  AND updated_at > NOW() - INTERVAL '2 minutes';
  
  SELECT COUNT(*) INTO v_total_components 
  FROM store_settings 
  WHERE component_type IN ('hero', 'banner');
  
  -- عرض النتائج
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║              🖼️ تقرير تحديث صور StoreBanner 🖼️                   ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ إجمالي مكونات Hero/Banner: %                                 ║', v_total_components;
  RAISE NOTICE '║ الصور المحدثة: %                                             ║', v_images_updated;
  RAISE NOTICE '║ العناوين المحدثة: %                                          ║', v_titles_updated;
  RAISE NOTICE '║ الأوصاف المحدثة: %                                           ║', v_descriptions_updated;
  RAISE NOTICE '║ الأزرار المحدثة: %                                           ║', v_buttons_updated;
  RAISE NOTICE '║ أيقونات الثقة المضافة: %                                     ║', v_trust_badges_added;
  RAISE NOTICE '║                                                                ║';
  RAISE NOTICE '║ ✅ تم تحديث جميع مكونات StoreBanner بنجاح!                   ║';
  RAISE NOTICE '║ 🎯 الصورة الجديدة: متجر حديث وأنيق                          ║';
  RAISE NOTICE '║ 📐 النسبة: مربعة (1:1) مع تأثيرات بصرية محسنة               ║';
  RAISE NOTICE '║ 🇩🇿 النصوص: محدثة لتناسب السوق الجزائري                    ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
END $$;

COMMIT; 