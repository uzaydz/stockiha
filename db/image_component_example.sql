-- مثال لإدراج مكون صورة جديد في صفحة هبوط موجودة
-- ملاحظة: استبدل المعرفات UUID بالقيم الفعلية في بيئتك

-- إدراج مكون صورة جديد
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
  uuid_generate_v4(), -- أو استخدم معرف UUID محدد
  '9fbbe1b6-4329-454c-bcf1-9b4ce790775f', -- معرف صفحة الهبوط
  'image', -- نوع المكون
  0, -- الموضع (قم بتعديله حسب الحاجة)
  true, -- الحالة النشطة
  '{
    "imageUrl": "https://example.com/path/to/image.jpg",
    "altText": "وصف الصورة",
    "caption": "تعليق توضيحي تحت الصورة",
    "maxWidth": "80%",
    "alignment": "center",
    "border": true,
    "borderColor": "#000000",
    "borderWidth": 1,
    "borderRadius": 8,
    "shadow": true,
    "shadowIntensity": "medium",
    "overlay": false,
    "overlayColor": "#000000",
    "overlayOpacity": 50,
    "onClick": "enlarge",
    "linkUrl": ""
  }'::jsonb,
  NOW(),
  NOW()
);

-- مثال لتحديث إعدادات مكون صورة موجود
UPDATE landing_page_components
SET settings = '{
    "imageUrl": "https://example.com/path/to/updated-image.jpg",
    "altText": "وصف محدث للصورة",
    "caption": "تعليق توضيحي محدث",
    "maxWidth": "100%",
    "alignment": "right",
    "border": true,
    "borderColor": "#3366FF",
    "borderWidth": 2,
    "borderRadius": 12,
    "shadow": true,
    "shadowIntensity": "strong",
    "overlay": true,
    "overlayColor": "#000033",
    "overlayOpacity": 30,
    "onClick": "link",
    "linkUrl": "https://example.com/page"
  }'::jsonb,
  updated_at = NOW()
WHERE id = '3e56a244-a2f5-4469-bafe-bd630770a194' -- معرف مكون الصورة للتحديث
  AND type = 'image';

-- مثال لاستعلام يجلب مكونات الصورة لصفحة هبوط محددة
SELECT 
  id, 
  position, 
  is_active, 
  settings->'imageUrl' AS image_url,
  settings->'altText' AS alt_text,
  settings->'caption' AS caption,
  settings->'alignment' AS alignment
FROM landing_page_components
WHERE landing_page_id = '9fbbe1b6-4329-454c-bcf1-9b4ce790775f'
  AND type = 'image'
  AND is_active = true
ORDER BY position ASC;

-- مثال لحذف مكون صورة
DELETE FROM landing_page_components
WHERE id = '3e56a244-a2f5-4469-bafe-bd630770a194' -- معرف مكون الصورة للحذف
  AND type = 'image';

-- استعلام يوضح كيفية استخراج إعدادات مكون الصورة
-- هذا مفيد لفهم كيفية التعامل مع حقول JSONB في الاستعلامات
SELECT
  id,
  landing_page_id,
  type,
  position,
  settings->>'imageUrl' AS image_url,
  settings->>'altText' AS alt_text,
  settings->>'caption' AS caption,
  settings->>'maxWidth' AS max_width,
  settings->>'alignment' AS alignment,
  (settings->>'border')::boolean AS has_border,
  settings->>'borderColor' AS border_color,
  (settings->>'borderWidth')::int AS border_width,
  (settings->>'borderRadius')::int AS border_radius,
  (settings->>'shadow')::boolean AS has_shadow,
  settings->>'shadowIntensity' AS shadow_intensity,
  (settings->>'overlay')::boolean AS has_overlay,
  settings->>'overlayColor' AS overlay_color,
  (settings->>'overlayOpacity')::int AS overlay_opacity,
  settings->>'onClick' AS on_click,
  settings->>'linkUrl' AS link_url
FROM landing_page_components
WHERE type = 'image'
LIMIT 10; 
 
 
 