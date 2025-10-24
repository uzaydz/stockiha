# ميزة اختيار البكسلات السابقة
## Previous Pixels Selection Feature

تاريخ الإضافة: 11 أكتوبر 2025

## 📋 نظرة عامة

تم إضافة ميزة جديدة لتتبع التحويلات المتقدم تسمح للمستخدمين بإيجاد واختيار جميع البكسلات والـ Conversion APIs التي تم استخدامها سابقاً في المؤسسة، بدلاً من إدخالها يدوياً في كل مرة.

## ✨ الميزات

### 1. **جلب البكسلات السابقة**
- جلب جميع بكسلات فيسبوك المستخدمة سابقاً
- جلب جميع معرفات جوجل Ads & Analytics
- جلب جميع بكسلات تيك توك المستخدمة سابقاً

### 2. **إحصائيات الاستخدام**
- عدد المنتجات التي تستخدم كل بكسل
- تاريخ آخر استخدام
- تاريخ أول استخدام

### 3. **معلومات Conversion API**
- عرض حالة تفعيل Conversion API لكل بكسل
- رمز الوصول (Access Token) إذا كان متاحاً
- كود الاختبار (Test Event Code)

### 4. **واجهة مستخدم سهلة**
- نافذة حوار (Dialog) منظمة
- عرض البطاقات بشكل جذاب
- تحديد سهل وسريع
- تطبيق فوري للإعدادات

## 📂 الملفات المضافة

### 1. **قاعدة البيانات**
```sql
migrations/get_previous_pixels_and_conversion_apis.sql
```
- دالة SQL لجلب جميع البكسلات السابقة
- فهارس للأداء الأمثل
- دعم كامل لجميع المنصات

### 2. **Custom Hook**
```typescript
src/hooks/usePreviousPixels.ts
```
- Hook لجلب البكسلات تلقائياً
- Hook lazy للتحكم اليدوي
- TypeScript types كاملة

### 3. **Component**
```typescript
src/components/tracking/PreviousPixelsSelector.tsx
```
- Component قابل لإعادة الاستخدام
- دعم جميع المنصات (Facebook, Google, TikTok)
- واجهة مستخدم احترافية

### 4. **التكامل**
```typescript
src/components/product/form/marketing-and-engagement/ConversionTrackingTab.tsx
```
- إضافة زر "اختيار من السابق" لكل منصة
- تكامل سلس مع النموذج الموجود

## 🚀 كيفية الاستخدام

### للمستخدم النهائي:

1. **انتقل إلى إعدادات المنتج**
   - افتح المنتج الذي تريد تعديله
   - انتقل إلى تبويب "Marketing & Engagement"
   - اختر "تتبع التحويلات المتقدم"

2. **اختيار بكسل سابق**
   - فعّل المنصة المطلوبة (فيسبوك، جوجل، أو تيك توك)
   - اضغط على زر "اختيار من السابق" 📜
   - ستظهر قائمة بجميع البكسلات المستخدمة سابقاً

3. **معاينة واختيار**
   - شاهد تفاصيل كل بكسل
   - انظر عدد المنتجات المستخدمة
   - تحقق من تاريخ آخر استخدام
   - حدد البكسل المطلوب

4. **تطبيق الإعدادات**
   - اضغط "تطبيق"
   - سيتم ملء جميع الحقول تلقائياً
   - احفظ المنتج

### للمطورين:

#### استخدام Hook مباشرة:
```typescript
import { usePreviousPixels } from '@/hooks/usePreviousPixels';

function MyComponent({ organizationId }) {
  const { data, loading, error, refetch } = usePreviousPixels(organizationId);
  
  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div>خطأ: {error}</div>;
  
  return (
    <div>
      <h3>بكسلات فيسبوك: {data.facebook_pixels.length}</h3>
      <h3>جوجل: {data.google_tracking.length}</h3>
      <h3>تيك توك: {data.tiktok_pixels.length}</h3>
    </div>
  );
}
```

#### استخدام Component مباشرة:
```typescript
import PreviousPixelsSelector from '@/components/tracking/PreviousPixelsSelector';

<PreviousPixelsSelector 
  form={form} 
  organizationId={organizationId} 
  platform="facebook" // or "google" or "tiktok"
/>
```

## 🗄️ بنية قاعدة البيانات

### الدالة الرئيسية:
```sql
get_organization_previous_tracking_pixels(p_organization_id UUID)
```

### البيانات المعادة:
```json
{
  "facebook_pixels": [
    {
      "pixel_id": "123456789012345",
      "conversion_api_enabled": true,
      "access_token": "EAAabc...",
      "test_event_code": "TEST12345",
      "product_count": 5,
      "last_used": "2025-10-11T10:00:00Z",
      "created_at": "2025-09-01T08:00:00Z"
    }
  ],
  "google_tracking": [...],
  "tiktok_pixels": [...],
  "organization_id": "uuid",
  "fetched_at": "2025-10-11T12:00:00Z"
}
```

## 🔧 تثبيت الميزة

### 1. تطبيق Migration:
```bash
# تنفيذ الدالة SQL
psql -d your_database < migrations/get_previous_pixels_and_conversion_apis.sql
```

أو من Supabase Dashboard:
```sql
-- انسخ محتوى ملف get_previous_pixels_and_conversion_apis.sql
-- والصقه في SQL Editor وقم بتنفيذه
```

### 2. التحقق من التثبيت:
```sql
-- اختبار الدالة
SELECT get_organization_previous_tracking_pixels('your-org-id');
```

## 🎨 واجهة المستخدم

### للمنصات الثلاث:
- **فيسبوك**: أيقونة زرقاء مع معلومات Pixel ID و Conversion API
- **جوجل**: أيقونة خضراء مع Google Tag ID و Conversion ID
- **تيك توك**: أيقونة وردية مع Pixel ID و Events API

### المعلومات المعروضة لكل بكسل:
- ✅ معرف البكسل/Tag
- 📦 عدد المنتجات المستخدمة
- 🕐 تاريخ آخر استخدام
- 🔒 حالة Conversion/Events API
- 🔑 وجود Access Token (محمي)

## 🔐 الأمان

- جميع رموز الوصول (Access Tokens) محمية
- استخدام SECURITY DEFINER في دالة SQL
- عدم عرض رموز الوصول في واجهة المستخدم (مخفية)
- التحقق من صلاحيات المؤسسة

## 📊 الفوائد

### 1. **توفير الوقت**
- عدم الحاجة لنسخ ولصق معرفات البكسل
- إعداد سريع للمنتجات الجديدة

### 2. **تقليل الأخطاء**
- منع الأخطاء في كتابة معرفات البكسل
- ضمان استخدام البكسلات الصحيحة

### 3. **إدارة مركزية**
- رؤية شاملة لجميع البكسلات المستخدمة
- تتبع استخدام البكسلات

### 4. **إحصائيات**
- معرفة البكسلات الأكثر استخداماً
- تحليل الاستخدام عبر الوقت

## 🐛 استكشاف الأخطاء

### 1. لا تظهر البكسلات السابقة:
```
الحل: تأكد من وجود منتجات أخرى تستخدم بكسلات في نفس المؤسسة
```

### 2. خطأ في جلب البيانات:
```
الحل: تحقق من تطبيق migration بشكل صحيح
```

### 3. بطء في التحميل:
```
الحل: الفهارس موجودة بشكل تلقائي، تحقق من عدد السجلات
```

## 🔄 التحديثات المستقبلية

### اقتراحات للتطوير:
- [ ] إضافة ميزة البحث والفلترة
- [ ] عرض إحصائيات الأداء لكل بكسل
- [ ] إمكانية حذف البكسلات غير المستخدمة
- [ ] تصدير قائمة البكسلات
- [ ] دعم منصات إضافية (Snapchat, Twitter, etc.)

## 📝 ملاحظات

- الميزة تعمل فقط داخل نفس المؤسسة
- يتم جلب البيانات من جدول `product_marketing_settings`
- لا يتم حفظ رموز الوصول في Local Storage
- جميع البيانات محمية بـ RLS (Row Level Security)

## 🎯 الخلاصة

هذه الميزة تجعل عملية إدارة البكسلات والـ Conversion APIs أسهل وأسرع وأكثر أماناً. تستطيع الآن إعادة استخدام البكسلات السابقة بنقرة زر واحدة!

---

**تم التطوير بواسطة:** AI Assistant  
**التاريخ:** 11 أكتوبر 2025  
**الإصدار:** 1.0.0

