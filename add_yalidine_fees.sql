-- إضافة رسوم شحن ياليدين للمؤسسة
-- هذا مثال لإضافة رسوم الشحن للولايات الأكثر شيوعاً

-- حذف البيانات القديمة إذا وجدت
DELETE FROM yalidine_fees WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe';

-- إضافة رسوم الشحن للمؤسسة
-- من ولاية خنشلة (40) إلى الولايات الأكثر طلباً

-- الجزائر العاصمة (16) - منطقة 1
INSERT INTO yalidine_fees (
  organization_id, 
  from_wilaya_id, 
  to_wilaya_id, 
  commune_id, 
  from_wilaya_name, 
  to_wilaya_name, 
  commune_name, 
  zone, 
  express_home, 
  express_desk, 
  oversize_fee,
  is_home_available,
  is_stop_desk_available
) 
SELECT 
  'fed872f9-1ade-4351-b020-5598fda976fe', -- معرف المؤسسة
  40, -- من ولاية خنشلة
  w.id, -- إلى ولاية
  m.id, -- بلدية
  'Khenchela', -- اسم ولاية المصدر
  w.name, -- اسم ولاية الوجهة
  m.name, -- اسم البلدية
  w.zone, -- المنطقة
  CASE 
    WHEN w.zone = 1 THEN 500 -- المنطقة 1
    WHEN w.zone = 2 THEN 600 -- المنطقة 2
    WHEN w.zone = 3 THEN 700 -- المنطقة 3
    ELSE 800 -- المنطقة 4 وغيرها
  END AS express_home, -- رسوم التوصيل للمنزل
  CASE 
    WHEN w.zone = 1 THEN 400 -- المنطقة 1
    WHEN w.zone = 2 THEN 500 -- المنطقة 2
    WHEN w.zone = 3 THEN 600 -- المنطقة 3
    ELSE 700 -- المنطقة 4 وغيرها
  END AS express_desk, -- رسوم التوصيل للمكتب
  100 AS oversize_fee, -- رسوم الوزن الزائد
  true AS is_home_available, -- التوصيل للمنزل متاح
  m.has_stop_desk AS is_stop_desk_available -- التوصيل للمكتب متاح حسب البلدية
FROM 
  yalidine_provinces_global w
JOIN 
  yalidine_municipalities_global m ON w.id = m.wilaya_id
WHERE 
  w.is_deliverable = true 
  AND m.is_deliverable = true;

-- تحديث تاريخ آخر تحديث
UPDATE yalidine_fees 
SET last_updated_at = NOW() 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe';

-- عرض عدد السجلات التي تمت إضافتها
SELECT COUNT(*) AS added_fees_count FROM yalidine_fees WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'; 