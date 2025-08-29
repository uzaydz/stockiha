# مكونات البانر المحسّنة

تم تقسيم مكون `StoreBanner` إلى مكونات فرعية أصغر وأكثر كفاءة لتحسين الأداء وسهولة الصيانة.

## المكونات الأساسية

### `OptimizedImage`
مكون صورة محسّن مع:
- Lazy loading تلقائي
- Skeleton loader أثناء التحميل
- معالجة حالات الخطأ
- انتقالات سلسة

### `BannerContent`
مكون محتوى البانر يتضمن:
- العنوان والوصف
- الأزرار الأساسية والثانوية
- دعم اتجاه النص (RTL/LTR)
- انيميشنز متقدمة

### `TrustBadges`
مكون شارات الثقة:
- عرض أيقونات الثقة مع النصوص
- دعم أيقونات مخصصة
- تخطيط متجاوب

### `BannerImage`
مكون صورة البانر مع:
- تحسينات بصرية
- عناصر زخرفية متحركة
- تأثيرات hover

## المكونات المحسّنة

### `LazyComponents`
نسخ محسّنة مع Lazy Loading:
- `BannerContentLazy`
- `BannerImageLazy`
- `TrustBadgesLazy`

### `useBannerData`
Hook مخصص لإدارة بيانات البانر:
- معالجة الترجمة
- تحسين الأداء مع useMemo
- إدارة الحالة المركزية

## الاستخدام

### الاستخدام العادي
```tsx
import StoreBanner from '@/components/store/StoreBanner';

<StoreBanner heroData={heroData} />
```

### الاستخدام المحسّن
```tsx
import StoreBannerOptimized from '@/components/store/StoreBannerOptimized';

<StoreBannerOptimized heroData={heroData} />
```

### استخدام المكونات الفرعية
```tsx
import { BannerContent, BannerImage, TrustBadges } from '@/components/store/banner';

<BannerContent title="عنوان" description="وصف" isRTL={true} />
<BannerImage imageUrl="url" title="عنوان" />
<TrustBadges badges={badges} isRTL={true} />
```

## التحسينات المطبقة

### الأداء
- تقسيم الكود إلى مكونات أصغر
- React.memo للمكونات الفرعية
- useMemo للحسابات المعقدة
- Lazy loading للمكونات الثقيلة

### سرعة التحميل
- Skeleton loaders
- Lazy loading للصور
- تحميل تدريجي للمكونات
- تحسين حجم الحزمة

### تجربة المستخدم
- انتقالات سلسة
- معالجة حالات الخطأ
- تصميم متجاوب
- دعم RTL/LTR

## الأنواع والواجهات

جميع الأنواع متوفرة في `types.ts`:
- `HeroData`: بيانات البانر الرئيسية
- `TrustBadge`: شارة الثقة
- `ButtonConfig`: إعدادات الزر
- `ButtonStyleType`: أنواع أنماط الأزرار

## الدوال المساعدة

متوفرة في `utils.ts`:
- `getDefaultHeroData`: البيانات الافتراضية مع الترجمة
- `getIconComponent`: تحويل أسماء الأيقونات
- `processText`: معالجة النصوص مع الترجمة
- `processTrustBadges`: معالجة شارات الثقة 