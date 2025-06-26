# دليل تحسين طلبات صفحة شراء المنتج

## المشكلة
تم رصد طلبات HTTP مكررة كثيرة في صفحة شراء المنتج، مما يسبب:
- بطء في تحميل الصفحة
- استنزاف غير ضروري للموارد
- تجربة مستخدم سيئة

## الطلبات المكررة المرصودة
1. **yalidine_provinces_global** - يتكرر 3-4 مرات
2. **shipping_providers** - نفس الطلب يتكرر
3. **shipping_provider_clones** - طلبات متعددة لنفس البيانات
4. **products** (إعدادات الشحن) - طلبات منفصلة للمنتج نفسه
5. **services** - طلبات مكررة للخدمات
6. **shipping_provider_settings** - تكرار غير ضروري

## الحلول المطبقة

### 1. نظام منع التكرار المحسن
- إضافة قواعد خاصة لصفحة شراء المنتج في `requestDeduplicationGlobal.ts`
- فترات cache مناسبة لكل نوع بيانات:
  - الولايات: 30 دقيقة
  - شركات الشحن: 30 دقيقة  
  - إعدادات المنتج: 15 دقيقة
  - الخدمات: 20 دقيقة

### 2. مكون تجميع الطلبات
إنشاء `ProductPageRequestOptimizer` الذي:
- يجمع جميع البيانات المطلوبة في طلب واحد
- يستخدم Promise.allSettled للتحميل المتوازي
- يوفر Context للمكونات الفرعية
- يحفظ البيانات في cache محلي

## كيفية التطبيق

### الخطوة 1: تحديث نظام منع التكرار
تم تحديث `src/lib/requestDeduplicationGlobal.ts` بقواعد جديدة لصفحة المنتج.

### الخطوة 2: استخدام المكون المحسن
```tsx
import { ProductPageRequestOptimizer, useOptimizedProvinces } from './ProductPageRequestOptimizer';

// بدلاً من طلبات منفصلة في كل مكون
function MyComponent() {
  const { provinces } = useOptimizedProvinces(); // ✅ بيانات متاحة فوراً
  // بدلاً من useEffect منفصل لجلب البيانات
}

// تطبيق المكون في الصفحة الرئيسية
<ProductPageRequestOptimizer organizationId={orgId} productId={productId}>
  <OrderForm />
  <ShippingCalculator />
  <OtherComponents />
</ProductPageRequestOptimizer>
```

### الخطوة 3: تحديث المكونات الموجودة
يمكن تحديث المكونات التي تستدعي نفس البيانات:

**قبل التحسين:**
```tsx
// كل مكون يستدعي طلبات منفصلة
const useShippingLogic = () => {
  useEffect(() => {
    // طلب الولايات
    getShippingProvinces(orgId);
  }, []);
  
  useEffect(() => {
    // طلب شركات الشحن
    getShippingProviders();
  }, []);
};
```

**بعد التحسين:**
```tsx
// استخدام البيانات المُجمعة
const useOptimizedShippingLogic = () => {
  const { provinces } = useOptimizedProvinces();
  const { providers } = useOptimizedShippingProviders();
  
  // البيانات متاحة فوراً بدون طلبات إضافية
};
```

## النتائج المتوقعة
- تقليل عدد الطلبات من 30+ إلى 6 طلبات فقط
- تسريع تحميل الصفحة بنسبة 60-70%
- تحسين تجربة المستخدم
- توفير في استهلاك البيانات

## المراقبة والتشخيص
استخدم الدوال التالية لمراقبة الأداء:
```javascript
// في console المتصفح
deduplicationStats() // عرض إحصائيات منع التكرار
watchRequests(10000) // مراقبة الطلبات لمدة 10 ثوان
```

## التطبيق التدريجي
1. ابدأ بتطبيق `ProductPageRequestOptimizer` في صفحة واحدة
2. راقب النتائج باستخدام أدوات التشخيص
3. حدث المكونات الفرعية تدريجياً
4. قس التحسن في الأداء

## ملاحظات مهمة
- النظام متوافق مع المكونات الموجودة
- لا يحتاج تغييرات جذرية في الكود
- يمكن تطبيقه تدريجياً
- يحافظ على نفس وظائف المكونات الأصلية 