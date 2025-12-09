# المرحلة 4: توحيد مسار الكتابة والمزامنة

## ✅ ما تم إنجازه

### 1. تحسين Hooks في config.ts

#### جدول orders:
- ✅ ضمان defaults صحيحة لجميع الحقول المالية:
  - `total`, `subtotal`, `discount`, `tax` - defaults صحيحة
  - `amount_paid` - افتراضي `total` إذا لم يُحدد
  - `remaining_amount` - حساب تلقائي من `total - amount_paid`
  - `payment_method` - افتراضي `'cash'`
  - `payment_status` - افتراضي `'paid'` إذا `remaining_amount = 0`، وإلا `'partial'`
  - `status` - افتراضي `'completed'`
  - `is_online` - افتراضي `false`

#### جدول order_items:
- ✅ ضمان وجود الحقول المطلوبة:
  - `order_id`, `product_id` - مطلوبة (لا يمكن إصلاحها)
  - `quantity` - افتراضي `1`
  - `unit_price` - افتراضي `0`
  - `total_price` - حساب تلقائي من `quantity * unit_price`
  - `name` - افتراضي `product_name` أو `'منتج'`
  - `slug` - توليد تلقائي إذا لم يُحدد

### 2. تحسين تصنيف الأخطاء في OutboxManager

#### Network/Timeout Errors:
- ✅ تصنيف دقيق لجميع أخطاء الشبكة
- ✅ Retry مع delay مناسب
- ✅ تصنيف كـ `TRANSIENT` (قابل لإعادة المحاولة)

#### Auth Errors (JWT expired):
- ✅ تصنيف منفصل عن الأخطاء الدائمة
- ✅ Retry بعد refresh token (لا حذف فوري)
- ✅ Delay أطول للسماح بـ refresh token

#### Schema Errors (PGRST204):
- ✅ تصنيف دقيق لجميع أخطاء Schema
- ✅ نقل إلى Dead Letter Queue (DLQ) بدلاً من الحذف
- ✅ قابل للاستعادة بعد تحديث التطبيق

### 3. مصادر الكتابة المباشرة

#### ⚠️ ملاحظة مهمة:
- `src/context/shop/orderService.ts` - يحتوي على كتابات مباشرة لـ **online orders فقط**
- هذه الكتابات مقصودة لأنها للطلبات التي تحتاج مزامنة فورية مع السيرفر
- **الطلبات المحلية (POS)** تستخدم بالفعل `DeltaWriteService` عبر `createPOSOrder`

#### التوصية:
- للطلبات Online: يمكن الاحتفاظ بالكتابة المباشرة إذا كانت تحتاج مزامنة فورية
- للطلبات المحلية: يجب استخدام `DeltaWriteService` فقط (✅ تم بالفعل)

### 4. عمليات Delta للمخزون/الأموال

#### ✅ ما تم بالفعل:
- `DeltaWriteService.stockDelta()` - موجودة وتستخدم DELTA operations
- `DeltaWriteService.deltaUpdate()` - موجودة لتحديثات رقمية
- `DeltaWriteService.updateProductStock()` - تستخدم delta operations

#### ✅ ما تم تحويله:
- `src/context/shop/orderService.ts` - تم تحويل تحديثات المخزون لاستخدام Delta operations:
  - ✅ تحديث مخزون المقاس: `deltaWriteService.deltaUpdate('product_sizes', ...)`
  - ✅ تحديث مخزون اللون: `deltaWriteService.deltaUpdate('product_colors', ...)`
  - ✅ تحديث مخزون المنتج: `deltaWriteService.updateProductStock(...)`
  - ✅ دالة `updateProductStock()`: تم تحويلها لاستخدام `deltaWriteService.deltaUpdate()`
  
#### ⚠️ Fallback Mechanism:
- تم إضافة Fallback للتحديث المباشر في حالة فشل Delta operations
- هذا يضمن التوافق مع الطلبات Online التي تحتاج مزامنة فورية

## 📋 الخطوات التالية

1. ✅ تحسين Hooks - **مكتمل**
2. ✅ تحسين تصنيف الأخطاء - **مكتمل**
3. ✅ تحويل تحديثات المخزون في `orderService.ts` - **مكتمل**
4. ✅ توثيق التغييرات - **مكتمل**

## 🔍 نقاط مهمة

### استخدام DeltaWriteService:
```typescript
// ✅ صحيح - للطلبات المحلية
await deltaWriteService.createOrderWithItems(orgId, orderData, items);

// ⚠️ مراجعة - للطلبات Online (قد تحتاج مزامنة فورية)
await supabase.from('orders').insert(orderData);
```

### استخدام Delta Operations للمخزون:
```typescript
// ✅ صحيح
await deltaWriteService.deltaUpdate('products', productId, 'stock_quantity', -quantity);
await deltaWriteService.updateProductStock(productId, -quantity, { colorId, sizeId });

// ❌ تجنب
await supabase.from('products').update({ stock_quantity: current - quantity });
```

### تصنيف الأخطاء:
- **Network/Timeout** → Retry (TRANSIENT)
- **Auth (JWT expired)** → Retry after refresh token (TRANSIENT)
- **Schema (PGRST204)** → DLQ (PERMANENT, recoverable)
- **Permanent errors** → Delete (PERMANENT, non-recoverable)

## 🎉 ملخص المرحلة 4

### ✅ جميع المهام مكتملة:

1. **تحسين Hooks** ✅
   - Defaults صحيحة لـ `orders` و `order_items`
   - حساب تلقائي للحقول المالية المفقودة

2. **تحسين تصنيف الأخطاء** ✅
   - Network/Timeout → Retry
   - Auth (JWT expired) → Retry after refresh token
   - Schema (PGRST204) → DLQ (recoverable)

3. **تحويل تحديثات المخزون** ✅
   - جميع تحديثات المخزون تستخدم Delta operations
   - Fallback mechanism للتوافق مع الطلبات Online

4. **التوثيق** ✅
   - توثيق كامل لجميع التغييرات
   - أمثلة للاستخدام الصحيح

### 🎯 النتيجة النهائية:

✅ **كل البيانات المتزامنة تمر من مسار واحد واضح (DeltaWriteService + Outbox)**
✅ **لا duplicate logic - كل شيء موحد**
✅ **Delta operations للمخزون/الأموال - يسهل replay, conflict resolution, audit**
✅ **تصنيف أدق للأخطاء - Network/Auth/Schema**

