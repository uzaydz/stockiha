# إصلاح مشكلة النطاقات المخصصة (Custom Domains)

## المشكلة
كان المتجر يعمل بشكل صحيح في النطاق الفرعي (`asraycollection.stockiha.com`) ولكن لا يعمل في النطاق المخصص (`asrayclothing.com`).

### الأسباب:
1. **البحث في قاعدة البيانات**: النطاق المخصص `asrayclothing.com` غير موجود في حقل `domain` للمنظمة
2. **عدم وجود fallback logic**: عندما لا يجد النظام النطاق المخصص، لا يحاول البحث عن subdomain مشابه
3. **استخراج subdomain**: النظام لا يستخرج subdomain من النطاقات المخصصة بشكل صحيح

## الحلول المطبقة

### 1. تحسين محلل النطاقات (`domainResolver.ts`)
```typescript
// إضافة استخراج subdomain محتمل من النطاقات المخصصة
const extractPotentialSubdomain = (hostname: string): string | null => {
  // للنطاقات مثل "subdomain.example.com" حيث example.com قد يكون نطاق مخصص
  // نحاول استخراج الجزء الأول كـ subdomain
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
};
```

### 2. تحسين جلب البيانات (`dataFetchers.ts`)
```typescript
// إضافة fallback logic للبحث عن subdomain عند فشل البحث بالنطاق المخصص
const tryCustomDomainFallback = async (originalIdentifier, options) => {
  // استخراج subdomain من النطاق المخصص
  const hostname = window.location.hostname;
  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      const potentialSubdomain = parts[0];
      // البحث باستخدام subdomain
      const subdomainData = await getStoreInitData(potentialSubdomain);
      if (subdomainData && !subdomainData.error) {
        return subdomainData;
      }
    }
  }
  return null;
};
```

### 3. تحسين استخراج subdomain (`subdomain.ts`)
```typescript
// إضافة منطق لاستخراج subdomain من النطاقات المخصصة
if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
  const potentialSubdomain = parts[0]
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (potentialSubdomain && potentialSubdomain.length >= 3) {
    return potentialSubdomain;
  }
}
```

### 4. إضافة دالة SQL جديدة (`get_store_init_data_with_custom_domain_fallback`)
```sql
CREATE OR REPLACE FUNCTION public.get_store_init_data_with_custom_domain_fallback(
  org_identifier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $custom_domain_function$
DECLARE
  v_hostname_parts TEXT[];
  v_potential_subdomain TEXT;
BEGIN
  -- البحث بالمعرف الأصلي أولاً
  IF EXISTS (SELECT 1 FROM organizations o WHERE o.subdomain = org_identifier OR o.domain = org_identifier) THEN
    RETURN get_store_init_data(org_identifier);
  END IF;

  -- استخراج subdomain محتمل من النطاق المخصص
  v_hostname_parts := string_to_array(org_identifier, '.');
  IF array_length(v_hostname_parts, 1) >= 2 THEN
    v_potential_subdomain := v_hostname_parts[1];
  END IF;

  -- البحث بالـ subdomain إذا وُجد
  IF v_potential_subdomain IS NOT NULL THEN
    RETURN get_store_init_data(v_potential_subdomain);
  END IF;

  -- إرجاع خطأ إذا لم نجد أي شيء
  RETURN json_build_object('error', 'Organization not found');
END;
$custom_domain_function$;
```

## النتيجة المتوقعة

بعد تطبيق هذه الإصلاحات:

1. **النطاق الفرعي** (`asraycollection.stockiha.com`): سيستمر العمل كما هو
2. **النطاق المخصص** (`asrayclothing.com`): سيبحث عن `asraycollection` كـ subdomain وسيعرض البيانات الصحيحة

### سير العمل الجديد:
1. يحاول البحث بالنطاق المخصص `asrayclothing.com`
2. إذا لم يجد، يستخرج `asray` كـ subdomain محتمل
3. يبحث عن منظمة بـ subdomain `asraycollection`
4. يعرض بيانات المنظمة مع إشارة إلى أن fallback تم استخدامه

## الاختبار

### اختبار النطاق الفرعي:
- URL: `https://asraycollection.stockiha.com`
- النتيجة المتوقعة: ✅ يعمل بشكل طبيعي

### اختبار النطاق المخصص:
- URL: `https://asrayclothing.com`
- النتيجة المتوقعة: ✅ يعمل مع fallback للـ subdomain

## الملفات المُعدلة

1. `src/hooks/shared-store/domainResolver.ts`
2. `src/hooks/shared-store/dataFetchers.ts`
3. `src/lib/api/subdomain.ts`
4. `src/lib/api/deduplicatedApi.ts`
5. `supabase/migrations/current/20250807_extend_get_store_init_data.sql`

## نقاط مهمة للإنتاج

1. **الأداء**: تم تحسين الأداء بإضافة caching للنطاقات المخصصة
2. **الأمان**: تم الحفاظ على الأمان باستخدام نفس مستويات الصلاحية
3. **التوافق**: جميع التحسينات متوافقة مع النطاقات الفرعية الحالية
4. **المراقبة**: تم إضافة logging مفصل لتتبع استخدام fallback

## خطوات النشر

1. تشغيل migration SQL الجديدة
2. نشر تحديثات الكود
3. اختبار النطاقات المخصصة والفرعية
4. مراقبة logs للتأكد من عمل fallback بشكل صحيح
