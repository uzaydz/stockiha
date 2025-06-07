# دليل استخدام EcotrackShippingCalculator 

## 📍 مواقع الاستخدام الرئيسية

تم دمج `EcotrackShippingCalculator.tsx` في **4 أماكن رئيسية** في النظام:

### 1. **في حقول معلومات التوصيل** ✅ 
📁 `src/components/store/order-form/ui-parts/DeliveryInfoFields.tsx`

```tsx
import { EcotrackShippingCalculator } from '../custom-form-fields/EcotrackShippingCalculator';

// داخل المكون
{/* دعم شركات Ecotrack */}
{shippingProviderSettings?.provider_code && 
 isEcotrackProvider(shippingProviderSettings.provider_code) && 
 selectedWilaya && (
  <EcotrackShippingCalculator
    wilayaId={selectedWilaya}
    isHomeDelivery={deliveryType === 'home'}
    providerCode={shippingProviderSettings.provider_code}
    onPriceCalculated={onDeliveryPriceCalculated || (() => {})}
  />
)}
```

### 2. **في منطق حساب أسعار التوصيل** ✅
📁 `src/components/store/order-form/custom-form-fields/DeliveryPriceLogic.tsx`

```tsx
import { EcotrackShippingCalculator } from './EcotrackShippingCalculator';

// داخل دالة getDeliveryPriceCalculator
if (isEcotrackProvider(providerCode)) {
  return async (...params): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      const calculator = (
        <EcotrackShippingCalculator
          wilayaId={toWilayaId}
          isHomeDelivery={deliveryType === 'home'}
          providerCode={providerCode}
          onPriceCalculated={resolve}
        />
      );
    });
  };
}
```

### 3. **في useShippingLogic** ✅
📁 `src/components/store/order-form/order-form-logic/useShippingLogic.ts`

```tsx
// تمت إضافة دعم Ecotrack في دالة updateDeliveryFee
if (providerData && isEcotrackProvider(providerData.code)) {
  console.log('🌿 [updateDeliveryFee] استخدام شركة Ecotrack:', providerData.code);
  
  const ecotrackSettings: ShippingProviderSettings = {
    provider_code: providerData.code,
    is_home_delivery_enabled: true, 
    is_desk_delivery_enabled: true, 
    // ...باقي الإعدادات
  };
  setShippingProviderSettings(ecotrackSettings);
}
```

### 4. **في حساب أسعار صفحة المنتج** ✅
📁 `src/api/product-page.ts`

```tsx
// في دالة calculateShippingFee مع معاملة productId جديدة
if (productData?.shipping_provider_id) {
  const { data: providerData } = await supabase
    .from('shipping_providers')
    .select('code')
    .eq('id', productData.shipping_provider_id)
    .single();
    
  if (providerData && isEcotrackProvider(providerData.code)) {
    // استخدام calculateEcotrackShippingPrice
    const result = await calculateEcotrackShippingPrice(
      organizationId,
      providerData.code,
      toWilayaId.toString(),
      deliveryType
    );
    
    return result.success ? result.price : defaultPrice;
  }
}
```

## 🔧 كيفية عمل المكون

### Parameters المطلوبة:
```tsx
interface Props {
  wilayaId: string;           // معرف الولاية
  isHomeDelivery: boolean;    // نوع التوصيل (منزل أم مكتب)
  providerCode: string;       // رمز شركة التوصيل
  onPriceCalculated: (price: number) => void; // دالة التعامل مع السعر
}
```

### الشركات المدعومة (23 شركة):
- **ecotrack** - الشركة الأساسية
- **anderson_delivery** - أندرسون ديليفري
- **areex** - أريكس
- **ba_consult** - بي إي كونسلت
- **conexlog** - كونكسلوغ
- **coyote_express** - كويوت إكسبرس
- **dhd** - دي إتش دي
- **distazero** - ديستازيرو
- **e48hr_livraison** - إي 48 أتش آر ليفريزون
- **fretdirect** - فريت دايركت
- **golivri** - غوليفري
- **mono_hub** - مونو هاب
- **msm_go** - إم إس إم غو
- **negmar_express** - نيغمار إكسبرس
- **packers** - باكرز
- **prest** - بريست
- **rb_livraison** - آر بي ليفريزون
- **rex_livraison** - ريكس ليفريزون
- **rocket_delivery** - روكيت ديليفري
- **salva_delivery** - سالفا ديليفري
- **speed_delivery** - سبيد ديليفري
- **tsl_express** - تي إس إل إكسبرس
- **worldexpress** - ورلد إكسبرس

## 🌊 تدفق العمل (Workflow)

1. **المستخدم يختار منتج** مربوط بشركة Ecotrack
2. **النظام يتحقق** من `shipping_provider_id` في جدول المنتجات
3. **يتم استدعاء** `isEcotrackProvider()` للتحقق من نوع الشركة
4. **إذا كانت Ecotrack**، يتم إنشاء `EcotrackShippingCalculator`
5. **المكون يجلب** إعدادات الشركة من قاعدة البيانات
6. **يتم الاتصال** بـ API الشركة على `/api/v1/get/fees`
7. **يتم حساب السعر** بناءً على نوع التوصيل
8. **السعر يظهر** في واجهة المستخدم

## 🚀 مثال كامل للاستخدام

```tsx
import React, { useState } from 'react';
import { EcotrackShippingCalculator } from '@/components/store/order-form/custom-form-fields/EcotrackShippingCalculator';

function ProductPurchasePage() {
  const [shippingPrice, setShippingPrice] = useState<number>(0);
  const [selectedWilaya, setSelectedWilaya] = useState<string>('16'); // الجزائر
  const [deliveryType, setDeliveryType] = useState<'home' | 'desk'>('home');
  const [providerCode] = useState<string>('areex'); // شركة أريكس

  const handlePriceCalculated = (price: number) => {
    setShippingPrice(price);
    console.log(`سعر التوصيل عبر ${providerCode}: ${price} دج`);
  };

  return (
    <div>
      <h2>صفحة شراء المنتج</h2>
      
      {/* عرض السعر */}
      <div>سعر التوصيل: {shippingPrice} دج</div>
      
      {/* حاسبة أسعار Ecotrack */}
      <EcotrackShippingCalculator
        wilayaId={selectedWilaya}
        isHomeDelivery={deliveryType === 'home'}
        providerCode={providerCode}
        onPriceCalculated={handlePriceCalculated}
      />
    </div>
  );
}
```

## ⚠️ مُتطلبات مهمة

### 1. **إعدادات قاعدة البيانات**
```sql
-- يجب وجود إعدادات الشركة في shipping_provider_settings
INSERT INTO shipping_provider_settings (
  organization_id,
  provider_id, 
  api_token,        -- Bearer Token مطلوب
  is_enabled
) VALUES (
  'org_id',
  (SELECT id FROM shipping_providers WHERE code = 'areex'),
  'your_bearer_token_here',
  true
);
```

### 2. **Content Security Policy**
```json
// في vercel.json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{
      "key": "Content-Security-Policy",
      "value": "connect-src 'self' https://*.ecotrack.dz https://api.ecotrack.dz"
    }]
  }]
}
```

## 🔍 استكشاف الأخطاء

### الأخطاء الشائعة:
1. **"لا يوجد API token"** - تأكد من وجود Bearer Token في الإعدادات
2. **"CSP error"** - تأكد من إضافة نطاقات Ecotrack إلى CSP
3. **"لا توجد أسعار متاحة"** - تحقق من صحة معرف الولاية
4. **"خطأ HTTP 401"** - Bearer Token غير صحيح أو منتهي الصلاحية

### تسجيل الأخطاء:
المكون يسجل جميع العمليات في Console:
```
🌿 [EcotrackCalculator] بدء حساب سعر Ecotrack
🔗 [EcotrackCalculator] إعدادات الشركة
📡 [EcotrackCalculator] استجابة API
📊 [EcotrackCalculator] بيانات الاستجابة
✅ [EcotrackCalculator] السعر المحسوب
```

## 📚 ملفات ذات صلة

- `src/api/shippingService.ts` - خدمات Ecotrack الأساسية
- `src/api/shippingSettingsService.ts` - معلومات الشركات
- `migrations/add_ecotrack_providers.sql` - بيانات قاعدة البيانات
- `CSP_ECOTRACK_SETUP.md` - إعداد أمان المحتوى

---
✅ **النظام جاهز الآن لاستخدام جميع شركات Ecotrack بالكامل!** 