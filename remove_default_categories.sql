-- حذف الفئات الافتراضية التي أُضيفت تلقائياً
DELETE FROM subscription_categories 
WHERE name = 'عام' 
AND description = 'فئة افتراضية لجميع الخدمات';

-- عرض الفئات المتبقية للتأكد
SELECT * FROM subscription_categories ORDER BY name; 