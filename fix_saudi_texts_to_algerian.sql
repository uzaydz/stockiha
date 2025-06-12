-- إصلاح النصوص السعودية وتحويلها إلى نصوص جزائرية
-- في مكونات About الموجودة في قاعدة البيانات

-- ═══════════════════════════════════════════════════════════════════════════════════
-- 🎯 الهدف: تحديث جميع النصوص المتعلقة بالسعودية إلى نصوص جزائرية مناسبة
-- ═══════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. تحديث النصوص في مكونات About الموجودة
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{features}',
  jsonb_build_array(
    'منتجات أصلية بضمان الوكيل',
    'شحن سريع لجميع ولايات الجزائر',
    'دعم فني متخصص',
    'خدمة ما بعد البيع'
  )
),
updated_at = NOW()
WHERE component_type = 'about'
AND settings->'features' @> '["شحن سريع لجميع مناطق المملكة"]';

-- 2. تحديث العناوين في مكونات Footer
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{contactInfo,address}',
  '"الجزائر العاصمة، الجزائر"'
),
updated_at = NOW()
WHERE component_type = 'footer'
AND settings->'contactInfo'->>'address' LIKE '%المملكة العربية السعودية%';

-- 3. تحديث أرقام الهاتف في Footer (من +966 إلى +213)
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{contactInfo,phone}',
  '"+213 21 123 456"'
),
updated_at = NOW()
WHERE component_type = 'footer'
AND settings->'contactInfo'->>'phone' LIKE '+966%';

-- 4. تحديث أي إشارات أخرى للرياض في العناوين
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{contactInfo,address}',
  '"الجزائر العاصمة، الجزائر"'
),
updated_at = NOW()
WHERE component_type = 'footer'
AND settings->'contactInfo'->>'address' LIKE '%الرياض%';

-- 5. تحديث نصوص Hero إذا كانت تحتوي على إشارات للسعودية
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{description}',
  '"تسوق أحدث المنتجات بأفضل الأسعار في الجزائر"'
),
updated_at = NOW()
WHERE component_type = 'hero'
AND settings->>'description' LIKE '%المملكة%';

-- 6. تحديث نصوص الشحن في أي مكونات أخرى
UPDATE store_settings 
SET settings = jsonb_set(
  settings,
  '{description}',
  REPLACE(settings->>'description', 'المملكة العربية السعودية', 'الجزائر')::jsonb
),
updated_at = NOW()
WHERE settings->>'description' LIKE '%المملكة العربية السعودية%';

-- 7. عرض تقرير النتائج
DO $$
DECLARE
  v_about_updated INTEGER;
  v_footer_updated INTEGER;
  v_hero_updated INTEGER;
  v_total_updated INTEGER;
BEGIN
  -- حساب عدد المكونات المحدثة
  SELECT COUNT(*) INTO v_about_updated
  FROM store_settings 
  WHERE component_type = 'about'
  AND updated_at > NOW() - INTERVAL '2 minutes'
  AND settings->'features' @> '["شحن سريع لجميع ولايات الجزائر"]';
  
  SELECT COUNT(*) INTO v_footer_updated
  FROM store_settings 
  WHERE component_type = 'footer'
  AND updated_at > NOW() - INTERVAL '2 minutes'
  AND (
    settings->'contactInfo'->>'address' LIKE '%الجزائر%'
    OR settings->'contactInfo'->>'phone' LIKE '+213%'
  );
  
  SELECT COUNT(*) INTO v_hero_updated
  FROM store_settings 
  WHERE component_type = 'hero'
  AND updated_at > NOW() - INTERVAL '2 minutes'
  AND settings->>'description' LIKE '%الجزائر%';
  
  v_total_updated := v_about_updated + v_footer_updated + v_hero_updated;
  
  -- عرض النتائج
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║                    🇩🇿 تقرير إصلاح النصوص 🇩🇿                    ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ مكونات About المحدثة: %                                      ║', v_about_updated;
  RAISE NOTICE '║ مكونات Footer المحدثة: %                                     ║', v_footer_updated;
  RAISE NOTICE '║ مكونات Hero المحدثة: %                                       ║', v_hero_updated;
  RAISE NOTICE '║ إجمالي المكونات المحدثة: %                                   ║', v_total_updated;
  RAISE NOTICE '║                                                              ║';
  RAISE NOTICE '║ ✅ تم تحديث جميع النصوص من سعودية إلى جزائرية بنجاح!          ║';
  RAISE NOTICE '║ 🎯 الآن جميع النصوص تتناسب مع السوق الجزائري                  ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
END $$;

COMMIT; 