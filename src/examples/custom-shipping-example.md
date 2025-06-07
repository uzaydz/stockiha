# نظام الشحن المخصص

## نظرة عامة

تم تحديث النظام لدعم الطرق المخصصة للشحن بالإضافة إلى شركات التوصيل العادية مثل ZR Express وياليدين.

## كيفية العمل

### 1. إعداد المنتج للشحن المخصص

في صفحة إدارة المنتج، يمكن اختيار "طرق الشحن المخصصة" من قائمة شركات التوصيل. هذا سيؤدي إلى:

- تعيين `shipping_method_type` إلى `'custom'`
- تعيين `shipping_provider_id` إلى `null`

### 2. إعداد أسعار الشحن المخصصة

يتم إنشاء إعدادات الشحن المخصصة في جدول `shipping_provider_settings` مع:

```sql
INSERT INTO shipping_provider_settings (
  organization_id,
  provider_id,        -- NULL للطرق المخصصة
  api_key,           -- 'custom_shipping'
  api_token,         -- 'custom_shipping_token'
  is_enabled,        -- TRUE
  settings           -- JSON مع إعدادات الأسعار
);
```

### 3. أنواع إعدادات الأسعار

#### أ. أسعار موحدة (Unified Pricing)
```json
{
  "use_unified_price": true,
  "unified_home_price": 800,
  "unified_desk_price": 300,
  "is_free_delivery_home": false,
  "is_free_delivery_desk": false
}
```

#### ب. أسعار مخصصة بحسب الولاية
```json
{
  "use_unified_price": false,
  "custom_rates": {
    "16": {  // كود ولاية الجزائر
      "home_delivery": 500,
      "office_delivery": 200
    },
    "31": {  // كود ولاية وهران
      "home_delivery": 600,
      "office_delivery": 250
    }
  },
  "default_price": 800
}
```

### 4. حساب الأسعار في واجهة الطلب

عندما يختار العميل منتج له شحن مخصص:

1. يتم التحقق من `shipping_method_type === 'custom'`
2. يتم استدعاء `CustomShippingCalculator`
3. يتم حساب السعر بناءً على:
   - نوع التوصيل (منزلي/مكتبي)
   - الولاية المختارة
   - إعدادات الأسعار المخصصة

## الملفات المحدثة

### 1. مكونات جديدة
- `CustomShippingCalculator.tsx` - حاسبة أسعار الطرق المخصصة
- `custom-shipping.ts` - API للتعامل مع الشحن المخصص

### 2. ملفات محدثة
- `DeliveryPriceLogic.tsx` - إضافة دعم للطرق المخصصة
- `CustomFormFields.tsx` - تمرير معرف المنتج
- `ProductShippingAndTemplates.tsx` - واجهة اختيار الطرق المخصصة

## مثال للاستخدام

```typescript
// إنشاء إعدادات شحن مخصصة
import { createOrUpdateCustomShipping } from '@/lib/api/custom-shipping';

const settings = {
  use_unified_price: true,
  unified_home_price: 800,
  unified_desk_price: 300,
  is_free_delivery_home: false,
  is_free_delivery_desk: false
};

await createOrUpdateCustomShipping('org-id', settings);

// حساب سعر الشحن
import { calculateCustomShippingPrice } from '@/lib/api/custom-shipping';

const price = await calculateCustomShippingPrice(
  'org-id',
  '16', // ولاية الجزائر
  'home' // توصيل منزلي
);
```

## المزايا

1. **مرونة كاملة** - يمكن تعيين أسعار مختلفة لكل ولاية
2. **سهولة الإدارة** - إعدادات واضحة ومنظمة
3. **دعم متكامل** - يعمل مع نفس واجهة الطلب المتوفرة
4. **تخصيص كامل** - يمكن إضافة قواعد أسعار معقدة حسب الحاجة

## ملاحظات مهمة

- التأكد من وجود إعدادات شحن مخصصة قبل تعيين المنتج لها
- في حالة عدم وجود سعر محدد للولاية، يتم استخدام `default_price`
- النظام يدعم التوصيل المجاني عبر `is_free_delivery_home/desk` 