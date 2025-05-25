# نظام الطباعة المحسّن والمقسم

تم تقسيم ملف `printUtils.ts` إلى عدة مكونات منفصلة لتسهيل التطوير والصيانة.

## هيكل الملفات

### ملفات الأساسية

- **`printTypes.ts`** - أنواع البيانات والواجهات
- **`printStyles.ts`** - أنماط CSS للطباعة
- **`printScripts.ts`** - سكريبتات JavaScript للطباعة
- **`printDimensions.ts`** - حساب الأبعاد والمقاييس
- **`printWindow.ts`** - إدارة نوافذ الطباعة
- **`printSingle.ts`** - طباعة الباركودات المفردة
- **`printUtils.ts`** - الملف الرئيسي الذي يجمع كل شيء

## الميزات الجديدة

### 🔥 تحسينات الطابعات الحرارية
- دعم شامل للطابعات الحرارية (58mm, 80mm, 110mm)
- تحسين جودة الصور للطباعة الحرارية
- إعدادات الكثافة والتباين والسرعة

### 📏 حساب الأبعاد الذكي
- حساب تلقائي للأبعاد بناءً على نوع الورق
- دعم الأحجام المخصصة
- تحسين المسافات والخطوط

### 🖨️ إدارة نوافذ الطباعة
- فحص دعم الطباعة في المتصفح
- معالجة أخطاء الطباعة
- نوافذ معاينة تفاعلية

### 🎯 طباعة مفردة محسّنة
- أحجام متعددة (صغير، متوسط، كبير)
- طباعة سريعة
- إعدادات مخصصة

## أمثلة الاستخدام

### الطباعة المفردة

```typescript
import { printSingleBarcode, createThermalSettings } from './utils/printUtils';

// طباعة عادية
printSingleBarcode(
  'data:image/png;base64,...',
  '1234567890',
  'اسم المنتج',
  29.99,
  'medium'
);

// طباعة حرارية
const thermalSettings = createThermalSettings({
  contrast: 120,
  density: 'dark'
});

printSingleBarcode(
  'data:image/png;base64,...',
  '1234567890',
  'اسم المنتج',
  29.99,
  'small',
  thermalSettings
);
```

### الطباعة المنفصلة

```typescript
import { 
  printSeparateBarcodes, 
  createDefaultPrintSettings,
  createThermalSettings 
} from './utils/printUtils';

const items = [
  {
    barcodeImageUrl: 'data:image/png;base64,...',
    value: '1234567890',
    productName: 'منتج 1',
    price: 29.99,
    colorName: 'أحمر',
    sizeName: 'كبير'
  }
];

const settings = createDefaultPrintSettings({
  paperSize: 'thermal58',
  orientation: 'portrait',
  fontSize: 6,
  quality: 'thermal'
});

const thermalSettings = createThermalSettings();

printSeparateBarcodes(items, settings, thermalSettings);
```

### الطباعة المتعددة

```typescript
import { printMultipleBarcodes } from './utils/printUtils';

const items = [...]; // مصفوفة العناصر

const settings = {
  columns: 3,
  rows: 4,
  paperSize: 'A4',
  includeName: true,
  includePrice: true,
  showSku: false
};

printMultipleBarcodes(items, settings);
```

## أنواع الورق المدعومة

- **A4** - حجم قياسي (210×297 مم)
- **A5** - حجم متوسط (148×210 مم) 
- **label50x90** - ملصقات صغيرة (50×90 مم)
- **thermal58** - ورق حراري 58 مم
- **thermal80** - ورق حراري 80 مم
- **thermal110** - ورق حراري 110 مم
- **custom** - حجم مخصص

## إعدادات الطابعة الحرارية

```typescript
interface ThermalPrinterSettings {
  density: 'light' | 'normal' | 'dark';
  speed: 'slow' | 'normal' | 'fast';
  dithering: boolean;
  contrast: number; // 100-150
}
```

## التحقق من صحة الإعدادات

```typescript
import { validatePrintSettings } from './utils/printUtils';

const settings = createDefaultPrintSettings({
  fontSize: 25, // خطأ: كبير جداً
  customWidth: 5 // خطأ: صغير جداً
});

const validation = validatePrintSettings(settings);
if (!validation.valid) {
  console.log('أخطاء:', validation.errors);
}
```

## فحص دعم الطباعة

```typescript
import { checkPrintSupport } from './utils/printUtils';

const support = checkPrintSupport();
console.log('دعم الطباعة:', support.supported);
console.log('النوافذ محظورة:', support.popupBlocked);
console.log('الميزات:', support.features);
```

## إدارة الأخطاء

```typescript
import { showPrintError } from './utils/printUtils';

// عرض رسالة خطأ للمستخدم
showPrintError('حدث خطأ في الطباعة');
```

## التوافق مع النسخة السابقة

جميع الدوال الموجودة في النسخة السابقة لا تزال تعمل بنفس الطريقة:

```typescript
// لا يزال يعمل
import { printSingleBarcode, printSeparateBarcodes } from './utils/printUtils';
```

## التحسينات المضافة

### CSS محسّن
- إزالة كاملة للعناوين والتذييلات
- دعم أفضل للطابعات الحرارية
- تحسين عرض الصور

### JavaScript محسّن
- معالجة أخطاء شاملة
- تحميل ذكي للصور
- إعادة المحاولة عند الفشل

### حساب أبعاد ذكي
- تحسين تلقائي للطابعات الحرارية
- حساب المسافات المناسبة
- دعم الاتجاهات المختلفة

### إدارة نوافذ متقدمة
- فحص دعم المتصفح
- معاينة تفاعلية
- أزرار محسّنة

## نصائح للاستخدام

1. **للطابعات الحرارية**: استخدم `quality: 'thermal'` في الإعدادات
2. **للملصقات الصغيرة**: استخدم `size: 'small'` للطباعة المفردة
3. **للجودة العالية**: استخدم `quality: 'high'` للطابعات العادية
4. **للأحجام المخصصة**: حدد `customWidth` و `customHeight` بالملليمتر

## اختبار النظام

```typescript
// اختبار سريع
import printUtils from './utils/printUtils';

// فحص الدعم
const support = printUtils.checkPrintSupport();
if (!support.supported) {
  console.error('الطباعة غير مدعومة');
}

// إعدادات افتراضية
const settings = printUtils.createDefaultPrintSettings();
const validation = printUtils.validatePrintSettings(settings);
console.log('الإعدادات صحيحة:', validation.valid);
```

هذا النظام الجديد يوفر مرونة أكبر وسهولة في الصيانة مع الحفاظ على التوافق مع النسخة السابقة. 