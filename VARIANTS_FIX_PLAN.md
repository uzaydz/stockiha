# 🚨 مشكلة المتغيرات (الألوان والمقاسات) لا تظهر في POS

## 🔍 السبب الجذري:
تضارب في أسماء الحقول بين الـ Backend والـ Frontend:
- **RPC يُرجع**: `colors` (من SQL file)
- **SQLite metadata يحفظ**: `product_colors` 
- **Frontend يبحث عن**: كلاهما لكن بشكل غير متسق

## ✅ الحل الشامل:

### 1. توحيد mapping البيانات في `useUnifiedPOSData`:
```typescript
// في دالة mapLocalProductToPOSProduct
const mappedProduct = {
  ...product,
  // ✅ توحيد الألوان - دعم كلا المفتاحين
  colors: product.colors || product.product_colors || [],
  product_colors: product.colors || product.product_colors || [],
  
  // ✅ التأكد من nested sizes
  colors: (product.colors || product.product_colors || []).map(color => ({
    ...color,
    sizes: color.sizes || color.product_sizes || [],
    product_sizes: color.sizes || color.product_sizes || []
  }))
};
```

### 2. تحسين استعادة metadata في SQLite:
```javascript
// electron/sqliteManager.cjs - في restoreMetadataFields
if (metadata.colors || metadata.product_colors) {
  const colors = metadata.colors || metadata.product_colors;
  row.colors = colors;
  row.product_colors = colors;
  row.has_variants = colors && colors.length > 0;
  restoredFields.push('colors');
}
```

### 3. طباعة debug logs لفهم المشكلة:
```typescript
console.log('[POS Product]', {
  name: product.name,
  has_variants: product.has_variants,
  colors_exists: !!product.colors,
  product_colors_exists: !!product.product_colors,
  colors_count: (product.colors || []).length,
  product_colors_count: (product.product_colors || []).length,
  first_color: product.colors?.[0] || product.product_colors?.[0]
});
```

## 📝 الخطوات:

1. ✅ إضافة console.log في usePOSAdvancedProductHandlers
2. ✅ توحيد mapping في mapLocalProductToPOSProduct  
3. ✅ تحسين restoreMetadataFields في SQLite
4. ✅ اختبار بمنتج له variants
5. ✅ التأكد من ظهور المتغيرات
