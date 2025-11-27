# 🤖 PROMPT للذكاء الاصطناعي - تطبيق نظام القوالب الديناميكية

---

## المهمة المطلوبة

قم بتطوير نظام عرض ديناميكي لصفحة المتجر بحيث يتغير التصميم حسب القالب المختار من قبل المؤسسة في قاعدة البيانات.

---

## معلومات قاعدة البيانات

### جدول `organization_templates`

| الحقل | الوصف | مثال |
|------|-------|------|
| `id` | UUID (توليد تلقائي) | `a1b2c3d4-...` |
| `organization_id` | معرف المؤسسة | `org-123` |
| `template_type` | نوع القالب (دائماً `'STORE_THEME'`) | `STORE_THEME` |
| `name` | اسم القالب | `الشبكة العصرية V2` |
| `content` | **معرف القالب الحقيقي** | `modern-grid-v2` |
| `is_default` | القالب النشط؟ | `true` |

**⚠️ مهم جداً:**
- حقل `content` يحتوي على معرف القالب الذي ستستخدمه في الكود (مثل: `modern-grid-v2`)
- `is_default = true` يعني هذا القالب مفعّل للمؤسسة

---

## API Functions الجاهزة

### 1. جلب القالب المفعّل

```typescript
import { getSelectedStoreTheme } from '@/lib/api/organizationTemplates';

const theme = await getSelectedStoreTheme(organizationId);
// النتيجة:
// {
//   id: "modern-grid-v2",  // من حقل content
//   name: "الشبكة العصرية V2",
//   is_default: true
// }
```

---

## القوالب المتاحة

### 1. القالب الافتراضي
```javascript
{
  id: 'default-store-v1',
  name: 'التصميم الأساسي V1'
}
```

### 2. الشبكة العصرية V2 (مطلوب تصميمه)
```javascript
{
  id: 'modern-grid-v2',
  name: 'الشبكة العصرية V2'
}
```

---

## الخطوات المطلوبة

### 1️⃣ إنشاء المكونات

أنشئ المجلد والملفات التالية:

```
src/components/store-themes/
├── ThemeSelector.tsx       ← يختار القالب المناسب
├── DefaultStoreV1.tsx      ← التصميم الافتراضي
└── ModernGridV2.tsx        ← الشبكة العصرية (جديد)
```

### 2️⃣ كود ThemeSelector.tsx

```typescript
import React from 'react';
import DefaultStoreV1 from './DefaultStoreV1';
import ModernGridV2 from './ModernGridV2';

interface ThemeSelectorProps {
  themeId: string;
  products: any[];
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themeId, products }) => {
  switch (themeId) {
    case 'modern-grid-v2':
      return <ModernGridV2 products={products} />;
    case 'default-store-v1':
    default:
      return <DefaultStoreV1 products={products} />;
  }
};

export default ThemeSelector;
```

### 3️⃣ تعديل صفحة المتجر

ابحث عن الملف الذي يعرض المتجر (مثل `StorePage.tsx`) وعدّله:

```typescript
import React, { useEffect, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { getSelectedStoreTheme } from '@/lib/api/organizationTemplates';
import ThemeSelector from '@/components/store-themes/ThemeSelector';

const StorePage: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [themeId, setThemeId] = useState('default-store-v1');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadTheme = async () => {
      if (currentOrganization?.id) {
        const theme = await getSelectedStoreTheme(currentOrganization.id);
        setThemeId(theme?.id || 'default-store-v1');
      }
    };
    loadTheme();
  }, [currentOrganization?.id]);

  useEffect(() => {
    // تحميل المنتجات...
  }, []);

  return <ThemeSelector themeId={themeId} products={products} />;
};

export default StorePage;
```

### 4️⃣ تصميم ModernGridV2.tsx

**المواصفات المطلوبة:**

1. **قسم Featured Products** (أول 4 منتجات):
   - Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
   - بطاقات كبيرة مع صور `aspect-square`
   - زر "أضف للسلة"
   - عرض السعر والخصم
   - Hover effect: تكبير الصورة قليلاً

2. **قسم All Products** (باقي المنتجات):
   - Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
   - بطاقات مصغرة

3. **التصميم:**
   - استخدم `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button`
   - ألوان من Tailwind: `primary`, `muted`, `secondary`
   - Spacing: `gap-4`, `gap-6`, `mb-8`, `mb-12`

**مثال كود ModernGridV2.tsx:**

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ModernGridV2: React.FC<{ products: any[] }> = ({ products }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">متجرنا</h1>

      {/* Featured Products */}
      <h2 className="text-2xl font-bold mb-6">منتجات مميزة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {products.slice(0, 4).map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow group">
            <div className="aspect-square bg-muted overflow-hidden">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              )}
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary mb-3">
                {product.price} دج
              </p>
              <Button className="w-full">أضف إلى السلة</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Products */}
      <h2 className="text-2xl font-bold mb-6">جميع المنتجات</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {products.slice(4).map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <div className="aspect-square bg-muted">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              )}
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold text-sm line-clamp-2 mb-2">{product.name}</h3>
              <p className="text-primary font-bold">{product.price} دج</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModernGridV2;
```

### 5️⃣ DefaultStoreV1.tsx

استخدم التصميم الحالي البسيط أو أنشئ نسخة مبسطة:

```typescript
const DefaultStoreV1: React.FC<{ products: any[] }> = ({ products }) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">المتجر</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4">
            <div className="aspect-square bg-muted rounded mb-3">
              {product.image_url && <img src={product.image_url} alt={product.name} />}
            </div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-primary font-bold">{product.price} دج</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## ✅ Checklist

- [ ] إنشاء `src/components/store-themes/ThemeSelector.tsx`
- [ ] إنشاء `src/components/store-themes/DefaultStoreV1.tsx`
- [ ] إنشاء `src/components/store-themes/ModernGridV2.tsx`
- [ ] تعديل صفحة المتجر الرئيسية لاستخدام `ThemeSelector`
- [ ] إضافة `useEffect` لجلب القالب من قاعدة البيانات
- [ ] اختبار التبديل بين القوالب

---

## 🧪 كيفية الاختبار

1. افتح صفحة المتجر → يجب أن يظهر القالب الافتراضي
2. اذهب إلى صفحة إدارة القوالب (`/dashboard/store-themes`)
3. اختر "الشبكة العصرية V2"
4. ارجع لصفحة المتجر → يجب أن يظهر التصميم الجديد

---

## 📌 ملاحظات مهمة

1. **الملفات الموجودة:**
   - API: `src/lib/api/organizationTemplates.ts` ✅ جاهز
   - إدارة: `src/pages/dashboard/StoreThemes.tsx` ✅ جاهز

2. **المطلوب منك:**
   - إنشاء مكونات القوالب (3 ملفات فقط)
   - تعديل صفحة المتجر الرئيسية (ملف واحد)

3. **Dependencies:**
   - `@/components/ui/card`
   - `@/components/ui/button`
   - `@/components/ui/badge`
   - `@/context/TenantContext`

---

## 🎯 الهدف النهائي

عند اكتمال المهمة:
- عند فتح المتجر → يُجلب القالب من قاعدة البيانات تلقائياً
- إذا كان `content = 'modern-grid-v2'` → يظهر تصميم الشبكة العصرية
- إذا كان `content = 'default-store-v1'` → يظهر التصميم الافتراضي
- إذا لم يوجد قالب محفوظ → يظهر التصميم الافتراضي

---

**انتهى - ابدأ التطبيق الآن! 🚀**
