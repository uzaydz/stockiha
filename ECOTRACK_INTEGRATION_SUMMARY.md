# ملخص تكامل Ecotrack مع النظام

## نظرة عامة

تم دمج دعم شامل لشركات التوصيل التي تستخدم منصة Ecotrack في النظام. هذا يتيح للمستخدمين:

1. **ربط المنتجات بشركات Ecotrack**: يمكن ربط أي منتج بإحدى الـ 22 شركة الجديدة
2. **حساب الأسعار الديناميكي**: جلب أسعار التوصيل مباشرة من API الشركات
3. **دعم كامل في صفحة الشراء**: إظهار الأسعار الصحيحة عند اختيار المنتج والوجهة

## الشركات المدعومة (22 شركة)

تم إضافة الشركات التالية التي تستخدم تكامل Ecotrack:

### الشركات باللغة العربية:
- أريكس (Areex)
- كونكسلوغ (Conexlog)
- ديستازيرو (Distazero)
- فريت دايركت (Fretdirect)
- غوليفري (Golivri)
- نيغمار إكسبرس (Negmar Express)
- باكرز (Packers)
- بريست (Prest)
- ريكس ليفريزون (Rex Livraison)
- سالفا ديليفري (Salva Delivery)
- سبيد ديليفري (Speed Delivery)
- ورلد إكسبرس (Worldexpress)

### الشركات باللغة الإنجليزية:
- Anderson Delivery
- BA Consult
- Coyote Express
- DHD
- E48HR Livraison
- Mono Hub
- MSM Go
- RB Livraison
- Rocket Delivery
- TSL Express

## التحديثات المنجزة

### 1. قاعدة البيانات
- ✅ إضافة 22 شركة جديدة في جدول `shipping_providers`
- ✅ تحديث البيانات الوصفية وإضافة فهارس للأداء
- ✅ تنظيف البيانات غير الصحيحة

### 2. خدمة API
- ✅ دعم كامل لـ `EcotrackShippingService` في `shippingService.ts`
- ✅ إضافة جميع شركات Ecotrack إلى `ShippingProvider` enum
- ✅ تحديث `shippingSettingsService.ts` مع معلومات الشركات
- ✅ دعم جلب الأسعار عبر `/api/v1/get/fees`

### 3. واجهة المستخدم

#### إدارة شركات التوصيل:
- ✅ إضافة أيقونات وأوصاف لجميع الشركات في `AddDeliveryProviderDialog.tsx`
- ✅ دعم ألوان مميزة لكل شركة في `DeliveryProvidersTable.tsx`
- ✅ تحديث `ProviderSettingsForm.tsx` لدعم شركات Ecotrack

#### صفحة الشراء:
- ✅ تحديث `useShippingLogic.ts` لدعم حساب أسعار Ecotrack
- ✅ إضافة دالة `calculateEcotrackShippingPrice` للتكامل مع API
- ✅ تحديث `calculateShippingFee` في `product-page.ts` للتحقق من شركات Ecotrack
- ✅ إنشاء `EcotrackShippingCalculator.tsx` للحسابات المتخصصة

### 4. الأمان والشبكة
- ✅ تحديث Content Security Policy في `vercel.json`
- ✅ إضافة نطاقات `*.ecotrack.dz` إلى `index.html`
- ✅ إنشاء وثائق `CSP_ECOTRACK_SETUP.md`

## كيفية عمل النظام

### 1. ربط المنتج بشركة Ecotrack
```sql
UPDATE products 
SET shipping_provider_id = [PROVIDER_ID]
WHERE id = '[PRODUCT_ID]';
```

### 2. تدفق حساب الأسعار
1. **التحقق من المنتج**: فحص إذا كان المنتج مرتبط بشركة Ecotrack
2. **جلب إعدادات الشركة**: الحصول على API token و base URL
3. **استدعاء API**: طلب الأسعار من `/api/v1/get/fees?to_wilaya_id={WILAYA_ID}`
4. **معالجة النتيجة**: اختيار السعر المناسب (منزلي/مكتبي)
5. **العرض**: إظهار السعر في واجهة المستخدم

### 3. هيكل API Response من Ecotrack
```json
{
  "success": true,
  "data": [
    {
      "wilaya_id_from": "16",
      "wilaya_name_from": "Alger", 
      "wilaya_id_to": "31",
      "wilaya_name_to": "Oran",
      "price_local": "600.00",
      "price_domicile": "800.00"
    }
  ]
}
```

## URLs الشركات

كل شركة لها نطاق فرعي خاص بها تحت `ecotrack.dz`:

- Anderson Delivery: `https://anderson.ecotrack.dz/`
- Areex: `https://areex.ecotrack.dz/`
- BA Consult: `https://baconsult.ecotrack.dz/`
- Conexlog: `https://conexlog.ecotrack.dz/`
- [... والباقي]

## المتطلبات للتفعيل

### للمطورين:
1. **إعداد API Token**: كل شركة تحتاج Bearer Token منفصل
2. **تفعيل الشركة**: في صفحة إدارة التوصيل
3. **ربط المنتجات**: تحديد شركة التوصيل لكل منتج

### للمستخدمين:
1. **اختيار المنتج**: المرتبط بشركة Ecotrack
2. **تحديد الوجهة**: اختيار الولاية والبلدية
3. **مشاهدة السعر**: السعر يُحسب تلقائياً من API الشركة

## الميزات المتقدمة

### 1. التخزين المؤقت
- الأسعار تُخزن مؤقتاً لمدة دقيقة لتحسين الأداء
- مفاتيح التخزين تتضمن: المؤسسة، الولاية، البلدية، نوع التوصيل

### 2. معالجة الأخطاء
- إذا فشل API Ecotrack، النظام يعود للأسعار التقليدية
- رسائل خطأ واضحة للمستخدم
- سجلات مفصلة للمطورين

### 3. المرونة
- دعم التوصيل المنزلي والمكتبي
- إمكانية تحديد شركة مختلفة لكل منتج
- دعم الأسعار الموحدة والمخصصة

## الاختبار

### اختبار الأسعار:
1. إنشاء منتج وربطه بشركة Ecotrack
2. إضافة API Token صحيح للشركة
3. زيارة صفحة الشراء واختيار وجهة
4. التحقق من جلب السعر من API

### مراقبة الأداء:
- مراجعة console logs للتأكد من نجاح الطلبات
- فحص شبكة المطور للتأكد من استدعاءات API
- مراقبة أوقات الاستجابة

## الدعم والصيانة

### ملفات مهمة للمراجعة:
- `src/api/shippingService.ts` - خدمة Ecotrack الأساسية
- `src/components/store/order-form/order-form-logic/useShippingLogic.ts` - منطق الحساب
- `src/api/product-page.ts` - دعم المنتجات
- `migrations/add_ecotrack_providers.sql` - قاعدة البيانات

### المراقبة المطلوبة:
- أداء API calls إلى شركات Ecotrack
- صحة البيانات المُرجعة
- تحديثات أسعار الشركات

## خلاصة

تم تكامل 23 شركة توصيل (22 جديدة + Ecotrack الأصلية) بنجاح مع النظام. المستخدمون يمكنهم الآن:

✅ **ربط منتجاتهم** بأي شركة Ecotrack  
✅ **الحصول على أسعار حقيقية** من APIs الشركات  
✅ **تحسين تجربة العملاء** بأسعار دقيقة ومحدثة  
✅ **توسيع خيارات التوصيل** لتشمل أكثر من 20 شركة جديدة  

النظام جاهز للاستخدام الفوري مع دعم كامل لجميع شركات Ecotrack. 