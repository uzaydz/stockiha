-- تحديث دالة إنشاء إعدادات المتجر الافتراضية لتشمل أنماط الأزرار 

-- إنشاء أو تحديث وظيفة initialize_store_settings
CREATE OR REPLACE FUNCTION initialize_store_settings(p_organization_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin
  INTO 
    v_user_org_id,
    v_is_admin
  FROM 
    users u
  WHERE 
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بإعداد متجر لهذه المؤسسة';
  END IF;

  -- إضافة مكون الهيرو الافتراضي مع الأنماط الجديدة للأزرار
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'hero',
    '{
      "title": "أحدث المنتجات",
      "description": "تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.",
      "primaryButton": {
        "text": "تصفح الكل",
        "link": "/products"
      },
      "primaryButtonStyle": "primary",
      "secondaryButton": {
        "text": "العروض الخاصة",
        "link": "/offers"
      },
      "secondaryButtonStyle": "primary",
      "imageUrl": "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop",
      "trustBadges": [
        {
          "id": "1",
          "text": "توصيل سريع",
          "icon": "Truck"
        },
        {
          "id": "2",
          "text": "دفع آمن",
          "icon": "ShieldCheck"
        },
        {
          "id": "3",
          "text": "جودة عالية",
          "icon": "Gem"
        }
      ]
    }',
    1
  );
  
  -- إضافة باقي المكونات كما هي (بدون تعديل)
  -- مكون الفئات الافتراضي
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'categories',
    '{
      "title": "تصفح فئات منتجاتنا",
      "description": "أفضل الفئات المختارة لتلبية احتياجاتك",
      "displayCount": 6,
      "displayType": "grid"
    }',
    2
  );
  
  -- مكون المنتجات المميزة الافتراضي
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'featured_products',
    '{
      "title": "منتجاتنا المميزة",
      "description": "اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك",
      "displayCount": 4,
      "displayType": "grid",
      "selectionCriteria": "featured"
    }',
    3
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعليق توضيحي على التحديث
COMMENT ON FUNCTION initialize_store_settings(UUID) IS '
وظيفة إنشاء إعدادات المتجر الافتراضية للمؤسسة الجديدة.
تم تحديثها لتشمل خصائص أنماط الأزرار primaryButtonStyle و secondaryButtonStyle.
';

-- إذا كانت هناك مؤسسات موجودة بالفعل تحتاج إلى تحديث إعدادات الهيرو، يمكن استخدام التحديث التالي
-- نلاحظة: هذا التحديث سيؤثر فقط على المؤسسات التي لا توجد بها الخصائص الجديدة
-- UPDATE store_settings
-- SET settings = jsonb_set(
--   jsonb_set(
--     settings, 
--     '{primaryButtonStyle}', 
--     '"primary"', 
--     true
--   ), 
--   '{secondaryButtonStyle}', 
--   '"primary"', 
--   true
-- )
-- WHERE component_type = 'hero'
-- AND NOT (settings ? 'primaryButtonStyle')
-- AND NOT (settings ? 'secondaryButtonStyle'); 