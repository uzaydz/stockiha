# مايجريشن العروض الخاصة

## الهدف
إضافة دعم العروض الخاصة (Special Offers) للمنتجات، وهو نظام منفصل عن `purchase_page_config.quantityOffers` الموجود حالياً.

## الفرق بين النظامين

### النظام الحالي: `purchase_page_config.quantityOffers`
- **الهدف**: خصومات بسيطة حسب الكمية
- **البنية**: نوع الخصم (نسبة/قيمة ثابتة) + الحد الأدنى للكمية
- **الاستخدام**: تخفيضات عادية وتوصيل مجاني

### النظام الجديد: `special_offers_config`
- **الهدف**: عروض باقات متقدمة ومتنوعة
- **البنية**: عروض كاملة مع أسعار مخصصة، كميات إضافية مجانية، ميزات خاصة
- **الاستخدام**: عروض مثل "اشتري 3 واحصل على 1 مجاناً + توصيل مجاني"

## الملفات المطلوب تطبيقها

### 1. إضافة الحقل الجديد
```bash
# تطبيق مايجريشن الحقل الأساسي
psql -f migrations/add_special_offers_config_to_products.sql
```

### 2. إضافة الدوال المساعدة
```bash
# تطبيق مايجريشن الدوال
psql -f migrations/add_special_offers_functions.sql
```

## بنية البيانات الجديدة

```json
{
  "enabled": false,
  "offers": [
    {
      "id": "offer_1",
      "name": "عرض الثلاث قطع",
      "description": "توفير أكثر مع الكمية الأكبر",
      "quantity": 3,
      "bonusQuantity": 0,
      "originalPrice": 6000,
      "discountedPrice": 5400,
      "discountPercentage": 10,
      "freeShipping": true,
      "isRecommended": true,
      "isPopular": false,
      "savings": 600,
      "pricePerUnit": 1800,
      "features": ["توفير 10%", "التوصيل مجاني"],
      "badgeText": "الأفضل",
      "badgeColor": "success"
    }
  ],
  "displayStyle": "cards",
  "showSavings": true,
  "showUnitPrice": true,
  "currency": "دج"
}
```

## الدوال الجديدة

### 1. `get_products_with_special_offers(org_id)`
تجلب المنتجات التي لديها عروض خاصة مفعلة

### 2. `calculate_special_offer_price(product_id, quantity)`
تحسب أفضل سعر للكمية المطلوبة من العروض المتاحة

### 3. `validate_special_offer_json(offer_json)`
تتحقق من صحة بنية العرض الخاص

## الفهارس المضافة

- `idx_products_special_offers_enabled`: فهرس للبحث السريع في المنتجات ذات العروض المفعلة

## قيود التحقق

- التحقق من صحة بنية JSON
- التأكد من وجود الحقول المطلوبة
- التحقق من نوع البيانات

## الصلاحيات

تم منح صلاحيات `SELECT` و `UPDATE` لجدول المنتجات للمستخدمين المصرح لهم.

## ملاحظات مهمة

1. **لا يؤثر على النظام الحالي**: العروض الخاصة منفصلة تماماً عن `quantityOffers`
2. **القيمة الافتراضية**: جميع المنتجات تبدأ بعروض خاصة معطلة
3. **التوافق العكسي**: لا يؤثر على أي وظائف موجودة
4. **الأداء**: تم إضافة فهارس للبحث السريع

## اختبار المايجريشن

```sql
-- اختبار إضافة الحقل
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'special_offers_config';

-- اختبار الدوال
SELECT get_products_with_special_offers('your-org-id');

-- اختبار التحديث
UPDATE products 
SET special_offers_config = '{"enabled": true, "offers": [], "displayStyle": "cards", "showSavings": true, "showUnitPrice": true, "currency": "دج"}'::jsonb
WHERE id = 'test-product-id';
```

## الاستخدام في الكود

```typescript
import { updateProductSpecialOffers } from '@/lib/api/products';

// تحديث العروض الخاصة
await updateProductSpecialOffers(productId, {
  enabled: true,
  offers: [...],
  displayStyle: 'cards',
  showSavings: true,
  showUnitPrice: true,
  currency: 'دج'
});
``` 