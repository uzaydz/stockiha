-- حذف إعدادات مزود خدمة Yalidine (الفرنسي) للمستخدم المحدد
DELETE FROM shipping_provider_settings 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
AND provider_id = 5; -- معرف Yalidine الفرنسي

-- حذف بيانات طلبات الشحن المرتبطة بمزود خدمة Yalidine (الفرنسي) للمستخدم المحدد
DELETE FROM shipping_orders
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
AND provider_id = 5; -- معرف Yalidine الفرنسي

-- تعطيل مزود خدمة Yalidine (الفرنسي) فقط
UPDATE shipping_providers
SET is_active = false
WHERE id = 5; -- معرف Yalidine الفرنسي

-- التأكد من أن المزود العربي (ياليدين) مفعل
UPDATE shipping_providers
SET is_active = true
WHERE id = 1; -- معرف ياليدين العربي