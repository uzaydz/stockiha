-- هذا الملف يزيل وظيفة حساب سعر الشحن القديمة حيث تم استبدالها بـ Edge Function

-- حذف الوظيفة
DROP FUNCTION IF EXISTS public.calculate_zrexpress_shipping;

-- حذف الأنواع المخصصة إذا لم تعد مستخدمة
DROP TYPE IF EXISTS public.shipping_calculation_result CASCADE;
DROP TYPE IF EXISTS public.http_header CASCADE;

-- ملاحظة: يمكن الاحتفاظ بالأنواع المخصصة إذا كانت مستخدمة في أماكن أخرى 