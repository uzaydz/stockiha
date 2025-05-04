-- إصلاح مشكلة عرض الشعار في شريط التنقل
-- Fix logo display in navbar issue

-- 1. إضافة عمود جديد في جدول إعدادات المنظمة للتحكم في عرض النص مع الشعار
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS display_text_with_logo BOOLEAN DEFAULT TRUE;

-- 2. تحديث القيم الحالية للعمود الجديد
UPDATE public.organization_settings
SET display_text_with_logo = TRUE
WHERE display_text_with_logo IS NULL;

-- 3. تعديل دالة إنشاء الإعدادات الافتراضية لتشمل العمود الجديد
CREATE OR REPLACE FUNCTION public.create_default_organization_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_settings (
    organization_id, theme_primary_color, theme_mode, site_name, default_language,
    enable_registration, enable_public_site, custom_css, custom_js, 
    display_text_with_logo, created_at, updated_at
  ) VALUES (
    NEW.id, '#0099ff', 'light', NEW.name, 'ar',
    true, true, 
    get_default_game_platform_css(),
    get_default_game_platform_js(),
    true, -- عرض النص مع الشعار بشكل افتراضي
    NOW(), NOW()
  )
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. توضيح التعليمات للمطورين
COMMENT ON COLUMN public.organization_settings.display_text_with_logo IS
  'خيار للتحكم في عرض اسم المنصة مع الشعار في شريط التنقل. إذا كانت القيمة TRUE فسيتم عرض النص بجانب الشعار، وإذا كانت FALSE فسيتم عرض الشعار فقط.';

/*
ملاحظة مهمة: بعد تنفيذ هذا السكريبت، يجب تعديل مكون Navbar لاستخدام هذا الإعداد الجديد. 
يمكنك إضافة الكود التالي إلى مكون Navbar:

1. استيراد إعدادات المنظمة في مكون Navbar
2. استخدام الشرط التالي لعرض النص مع الشعار:

```tsx
{orgSettings?.logo_url ? (
  <div className="flex items-center gap-2">
    <img 
      src={orgSettings.logo_url} 
      alt={orgSettings.site_name || 'منصة الألعاب الشاملة'} 
      className="h-8 w-auto" 
    />
    {(orgSettings?.display_text_with_logo !== false) && (
      <span className="font-bold text-lg">
        {orgSettings.site_name || 'منصة الألعاب الشاملة'}
      </span>
    )}
  </div>
) : (
  <span className="font-bold text-lg">
    {orgSettings?.site_name || 'منصة الألعاب الشاملة'}
  </span>
)}
```

يمكنك أيضًا إضافة خيار في صفحة إعدادات العلامة التجارية للتحكم في هذا السلوك.
*/ 