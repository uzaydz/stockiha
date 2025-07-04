# دليل الترجمة لصفحة شراء المنتج

## 📋 نظرة عامة

تم إنشاء نظام ترجمة شامل لصفحة شراء المنتج يدعم ثلاث لغات:
- **العربية (ar)** - اللغة الافتراضية
- **الإنجليزية (en)**
- **الفرنسية (fr)**

## 🗂️ بنية الملفات

```
src/
├── i18n/
│   └── translations/
│       └── productPurchase.ts          # ملف الترجمات الرئيسي
├── hooks/
│   └── useProductPurchaseTranslation.ts # Hook مخصص للترجمة
└── components/
    └── product/
        └── ProductHeader.example.tsx    # مثال على الاستخدام
```

## 🛠️ كيفية الاستخدام

### 1. استيراد Hook الترجمة

```typescript
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
```

### 2. استخدام الترجمة في المكون

```typescript
const MyComponent = () => {
  const { productHeader, productActions, common } = useProductPurchaseTranslation();
  
  return (
    <div>
      <h1>{productHeader.new()}</h1>
      <button>{productActions.buyNow()}</button>
      <span>{common.loading()}</span>
    </div>
  );
};
```

## 📚 المكونات المدعومة

### 1. ProductHeader
```typescript
const { productHeader } = useProductPurchaseTranslation();

// الاستخدام
productHeader.new()              // "جديد" | "New" | "Nouveau"
productHeader.featured()         // "مميز" | "Featured" | "En Vedette"
productHeader.available()        // "متوفر" | "Available" | "Disponible"
productHeader.piecesAvailable(5) // "5 قطعة متوفرة" | "5 pieces available"
```

### 2. ProductDescription
```typescript
const { productDescription } = useProductPurchaseTranslation();

productDescription.readMore()    // "اقرأ المزيد" | "Read More" | "Lire Plus"
productDescription.showLess()    // "عرض أقل" | "Show Less" | "Afficher Moins"
```

### 3. ProductActions
```typescript
const { productActions } = useProductPurchaseTranslation();

productActions.buyNow()          // "اشتري الآن" | "Buy Now" | "Acheter Maintenant"
productActions.addToCart()       // "أضف للعربة" | "Add to Cart" | "Ajouter au Panier"
productActions.calculating()     // "جاري الحساب..." | "Calculating..." | "Calcul en cours..."
```

### 4. ProductVariantSelector
```typescript
const { productVariantSelector } = useProductPurchaseTranslation();

productVariantSelector.color()           // "اللون" | "Color" | "Couleur"
productVariantSelector.size()            // "المقاس" | "Size" | "Taille"
productVariantSelector.availableStock(10) // "متوفر 10 قطعة" | "10 pieces available"
```

### 5. ProductPriceDisplay
```typescript
const { productPriceDisplay } = useProductPurchaseTranslation();

productPriceDisplay.price()              // "السعر" | "Price" | "Prix"
productPriceDisplay.discount()           // "خصم" | "Discount" | "Remise"
productPriceDisplay.priceRange(100, 500) // "من 100 إلى 500" | "From 100 to 500"
```

### 6. ProductErrorPage
```typescript
const { productErrorPage } = useProductPurchaseTranslation();

productErrorPage.productNotFound()      // "المنتج غير موجود" | "Product Not Found"
productErrorPage.suggestions.checkLink() // "🔍 تحقق من رابط المنتج"
productErrorPage.buttons.retry()        // "إعادة المحاولة" | "Try Again"
```

## 🔄 تغيير اللغة

```typescript
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: 'ar' | 'en' | 'fr') => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage('ar')}>العربية</button>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('fr')}>Français</button>
    </div>
  );
};
```

## 📝 إضافة ترجمات جديدة

### 1. تحديث ملف الترجمة

```typescript
// في src/i18n/translations/productPurchase.ts
export const productPurchaseTranslations = {
  ar: {
    newSection: {
      newKey: "النص بالعربية"
    }
  },
  en: {
    newSection: {
      newKey: "English text"
    }
  },
  fr: {
    newSection: {
      newKey: "Texte français"
    }
  }
};
```

### 2. تحديث Hook الترجمة

```typescript
// في src/hooks/useProductPurchaseTranslation.ts
const newSection = {
  newKey: () => t('newSection', 'newKey')
};

return {
  // ... الأقسام الموجودة
  newSection
};
```

## 🎯 أمثلة عملية

### مثال 1: مكون بسيط
```typescript
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

const SimpleProductCard = ({ product }) => {
  const { productHeader, productActions } = useProductPurchaseTranslation();
  
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      {product.is_new && (
        <span className="badge">{productHeader.new()}</span>
      )}
      <button className="buy-button">
        {productActions.buyNow()}
      </button>
    </div>
  );
};
```

### مثال 2: مكون معقد مع متغيرات
```typescript
const ProductInfo = ({ product, stock }) => {
  const { productHeader, productVariantSelector } = useProductPurchaseTranslation();
  
  return (
    <div>
      <div className="stock-info">
        {stock > 0 ? (
          <span className="available">
            {productVariantSelector.availableStock(stock)}
          </span>
        ) : (
          <span className="out-of-stock">
            {productHeader.outOfStock()}
          </span>
        )}
      </div>
    </div>
  );
};
```

## 🚀 التحسينات والأداء

### 1. استخدام useMemo للترجمات الثقيلة
```typescript
const translatedBadges = useMemo(() => {
  return badges.map(badge => ({
    ...badge,
    label: badge.type === 'new' ? productHeader.new() : productHeader.featured()
  }));
}, [badges, productHeader]);
```

### 2. تجميع الترجمات
```typescript
const translations = useMemo(() => ({
  buyNow: productActions.buyNow(),
  addToCart: productActions.addToCart(),
  loading: common.loading()
}), [productActions, common]);
```

## 🔧 استكشاف الأخطاء

### مشكلة: الترجمة لا تظهر
```typescript
// تحقق من اللغة الحالية
const { currentLanguage } = useProductPurchaseTranslation();
console.log('Current language:', currentLanguage);
```

### مشكلة: ترجمة مفقودة
```typescript
// استخدم fallback
const text = productHeader.someKey() || 'Default text';
```

## 📋 قائمة التحقق

- [ ] استيراد Hook الترجمة
- [ ] استخدام الدوال المناسبة للمكون
- [ ] التعامل مع المتغيرات (interpolation)
- [ ] إضافة fallback للنصوص المفقودة
- [ ] اختبار جميع اللغات
- [ ] تحسين الأداء باستخدام useMemo

## 🌐 اللغات المدعومة

| اللغة | الكود | الاتجاه | الحالة |
|-------|-------|---------|--------|
| العربية | ar | RTL | ✅ مكتملة |
| الإنجليزية | en | LTR | ✅ مكتملة |
| الفرنسية | fr | LTR | ✅ مكتملة |

## 🔮 خطط مستقبلية

- [ ] إضافة المزيد من اللغات
- [ ] تحسين نظام interpolation
- [ ] إضافة ترجمات للتواريخ والأرقام
- [ ] دعم الترجمة التلقائية
- [ ] إضافة اختبارات للترجمات 