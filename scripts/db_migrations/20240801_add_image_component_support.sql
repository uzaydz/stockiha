-- ترقية لإضافة دعم مكونات الصورة المحسنة وإعداداتها

-- تسجيل عملية الترقية
INSERT INTO migrations_log (name, applied_at, description)
VALUES (
  '20240801_add_image_component_support',
  NOW(),
  'إضافة دعم مكونات الصورة المحسنة في صفحات الهبوط'
);

-- نظرًا لكون البنية الحالية مرنة بالفعل باستخدام JSONB
-- ليس هناك حاجة لتعديل بنية الجداول
-- لكن هذا الملف يوفر مثالًا للاختبار وضمان عمل المكون بشكل صحيح

-- مثال لإنشاء مكون صورة اختباري
DO $$
DECLARE
  test_landing_page_id UUID;
  org_id UUID;
BEGIN
  -- الحصول على أول منظمة
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  -- التحقق مما إذا كانت هناك منظمة ضرورية للاختبار
  IF org_id IS NULL THEN
    RAISE NOTICE 'لا توجد منظمات لإجراء الاختبار عليها';
    RETURN;
  END IF;
  
  -- إنشاء صفحة هبوط اختبارية إذا لم تكن موجودة
  SELECT id INTO test_landing_page_id 
  FROM landing_pages 
  WHERE name = 'صفحة اختبار مكون الصورة'
  LIMIT 1;
  
  -- إذا لم تكن صفحة الاختبار موجودة، قم بإنشائها
  IF test_landing_page_id IS NULL THEN
    INSERT INTO landing_pages (
      id, 
      organization_id, 
      name, 
      slug, 
      title, 
      description, 
      is_published, 
      created_at, 
      updated_at,
      created_by
    ) VALUES (
      uuid_generate_v4(),
      org_id,
      'صفحة اختبار مكون الصورة',
      'image-component-test',
      'اختبار مكون الصورة',
      'صفحة لاختبار مكون الصورة المحسن',
      TRUE,
      NOW(),
      NOW(),
      (SELECT id FROM users WHERE organization_id = org_id LIMIT 1)
    )
    RETURNING id INTO test_landing_page_id;
    
    RAISE NOTICE 'تم إنشاء صفحة هبوط اختبارية بمعرف: %', test_landing_page_id;
  ELSE
    RAISE NOTICE 'صفحة الاختبار موجودة بالفعل بمعرف: %', test_landing_page_id;
  END IF;
  
  -- إنشاء مكون صورة اختباري
  INSERT INTO landing_page_components (
    id,
    landing_page_id,
    type,
    position,
    is_active,
    settings,
    created_at,
    updated_at
  ) VALUES (
    uuid_generate_v4(),
    test_landing_page_id,
    'image',
    0,
    TRUE,
    '{
      "imageUrl": "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9",
      "altText": "صورة اختبارية للمكون",
      "caption": "هذا مثال لمكون الصورة المحسن",
      "maxWidth": "80%",
      "alignment": "center",
      "border": true,
      "borderColor": "#3366FF",
      "borderWidth": 2,
      "borderRadius": 12,
      "shadow": true,
      "shadowIntensity": "medium",
      "overlay": true,
      "overlayColor": "#000000",
      "overlayOpacity": 30,
      "onClick": "enlarge",
      "linkUrl": ""
    }'::jsonb,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'تم إنشاء مكون صورة اختباري في صفحة الهبوط';
END $$; 
 
 
 