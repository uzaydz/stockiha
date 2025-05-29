# نظام إلغاء طلبيات نقطة البيع

## نظرة عامة

تم تطوير نظام شامل لإلغاء طلبيات نقطة البيع يدعم:

✅ **الإلغاء الكامل**: إلغاء جميع منتجات الطلبية  
✅ **الإلغاء الجزئي**: اختيار منتجات محددة للإلغاء  
✅ **إرجاع المخزون**: استرداد الكميات للمخزون تلقائياً  
✅ **سجل المراجعة**: تتبع كامل لعمليات الإلغاء  
✅ **استبعاد من الأرباح**: الطلبيات الملغاة لا تُحسب في الإحصائيات  

## المكونات المضافة

### 1. قاعدة البيانات

#### دالة `cancel_pos_order`
```sql
cancel_pos_order(
  p_order_id uuid,
  p_items_to_cancel text[] DEFAULT NULL,
  p_cancellation_reason text DEFAULT 'تم الإلغاء',
  p_restore_inventory boolean DEFAULT true,
  p_cancelled_by uuid DEFAULT NULL
)
```

**المعاملات:**
- `p_order_id`: معرف الطلبية المراد إلغاؤها
- `p_items_to_cancel`: قائمة معرفات المنتجات (NULL = إلغاء كامل)
- `p_cancellation_reason`: سبب الإلغاء
- `p_restore_inventory`: إرجاع المنتجات للمخزون
- `p_cancelled_by`: معرف المستخدم الذي قام بالإلغاء

#### جدول `order_cancellations`
```sql
CREATE TABLE order_cancellations (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES orders(id),
  organization_id uuid REFERENCES organizations(id),
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text NOT NULL,
  cancelled_amount numeric(10,2),
  cancelled_items_count integer,
  total_items_count integer,
  is_partial_cancellation boolean,
  inventory_restored boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

### 2. الواجهة الأمامية

#### مكون `CancelOrderDialog.tsx`
واجهة تفاعلية لإلغاء الطلبيات تتضمن:

- **اختيار المنتجات**: تحديد منتجات محددة أو جميع المنتجات
- **خيارات الإلغاء**: 
  - إرجاع المنتجات للمخزون
  - كتابة سبب الإلغاء
- **ملخص مالي**: عرض المبلغ الذي سيتم إلغاؤه
- **التحقق**: التأكد من صحة البيانات قبل الإلغاء

#### صفحة `POSOrdersWithCancellation.tsx`
صفحة إدارة الطلبيات مع دعم الإلغاء:

- **عرض الطلبيات**: جدول شامل بجميع الطلبيات
- **إجراءات الطلبيات**: قائمة منسدلة للإجراءات
- **تنبيهات المستخدم**: رسائل نجاح وخطأ واضحة

### 3. خدمات API

#### `POSOrdersService.cancelOrder()`
```typescript
async cancelOrder(
  orderId: string,
  itemsToCancel: string[] | null = null,
  cancellationReason: string = 'تم الإلغاء',
  restoreInventory: boolean = true,
  cancelledBy?: string
): Promise<CancellationResult>
```

#### `POSOrdersService.getOrderCancellations()`
```typescript
async getOrderCancellations(orderId: string): Promise<CancellationHistory[]>
```

## ميزات النظام

### 1. الإلغاء المرن

#### إلغاء كامل
```typescript
// إلغاء جميع منتجات الطلبية
await posOrdersService.cancelOrder(
  orderId,
  null, // جميع المنتجات
  'طلب العميل',
  true // إرجاع للمخزون
);
```

#### إلغاء جزئي
```typescript
// إلغاء منتجات محددة فقط
await posOrdersService.cancelOrder(
  orderId,
  ['product-id-1', 'product-id-2'], // منتجات محددة
  'نفاد المخزون',
  true
);
```

### 2. إدارة المخزون

عند إلغاء طلبية، يتم تلقائياً:
- **إرجاع الكميات** إلى مخزون المنتجات
- **تسجيل حركة مخزون** في `inventory_logs`
- **تحديث** تواريخ آخر تعديل

### 3. سجل المراجعة الكامل

- **تتبع العمليات**: من قام بالإلغاء ومتى
- **الأسباب**: تسجيل سبب كل إلغاء
- **التفاصيل المالية**: المبالغ والكميات الملغاة
- **نوع الإلغاء**: كامل أم جزئي

### 4. التأثير على الإحصائيات

#### دالة `get_pos_order_stats` المحدثة:
- **استبعاد من الإيرادات**: الطلبيات الملغاة لا تُحسب
- **إحصائيات منفصلة**: عدد الطلبيات الملغاة
- **دقة المعلومات**: حسابات صحيحة للأرباح

```sql
-- مثال على النتائج
{
  "total_orders": 100,
  "total_revenue": 85000.00,  -- لا يشمل الطلبيات الملغاة
  "cancelled_orders": 5,      -- عدد الطلبيات الملغاة
  "completed_orders": 90,     -- طلبيات مكتملة فقط
  "avg_order_value": 944.44   -- متوسط قيمة الطلب (بدون الملغاة)
}
```

## طرق الاستخدام

### 1. إلغاء من واجهة الطلبيات

```typescript
import { POSOrdersWithCancellation } from '@/pages/POSOrdersWithCancellation';

// استخدام الصفحة مباشرة
<POSOrdersWithCancellation />
```

### 2. إلغاء برمجي

```typescript
import { POSOrdersService } from '@/api/posOrdersService';

const posService = POSOrdersService.getInstance();

// إلغاء طلبية كاملة
const result = await posService.cancelOrder(
  orderId,
  null,
  'إلغاء بطلب العميل',
  true, // إرجاع للمخزون
  currentUser.id
);

if (result.success) {
  console.log(result.data.message);
} else {
  console.error(result.error);
}
```

### 3. عرض سجل الإلغاءات

```typescript
// جلب سجل إلغاءات طلبية
const cancellations = await posService.getOrderCancellations(orderId);

cancellations.forEach(cancellation => {
  console.log(`الإلغاء: ${cancellation.cancellation_reason}`);
  console.log(`المبلغ: ${cancellation.cancelled_amount} دج`);
  console.log(`النوع: ${cancellation.is_partial_cancellation ? 'جزئي' : 'كامل'}`);
});
```

## معالجة الأخطاء

### أخطاء الدالة
- **طلب غير موجود**: الطلبية غير موجودة أو ملغاة مسبقاً
- **لا توجد منتجات**: لم يتم تحديد منتجات للإلغاء
- **خطأ قاعدة البيانات**: مشاكل في التحديث أو الإدراج

### معالجة الواجهة
```typescript
try {
  const result = await cancelOrder(/*...*/);
  if (!result.success) {
    toast.error(result.error);
  }
} catch (error) {
  toast.error('حدث خطأ غير متوقع');
}
```

## الأمان والصلاحيات

### التحقق من الصلاحيات
- **المستخدم مسجل**: يجب تسجيل الدخول
- **المنظمة صحيحة**: الطلبية تنتمي للمنظمة
- **حالة الطلبية**: لا يمكن إلغاء طلبية ملغاة مسبقاً

### Row Level Security (RLS)
جدول `order_cancellations` محمي بـ RLS ويرتبط بـ `organization_id`

## الاختبار

### اختبار الوظائف الأساسية

1. **إلغاء كامل**:
   - إنشاء طلبية جديدة
   - إلغاء جميع المنتجات
   - التحقق من تحديث الحالة
   - التحقق من إرجاع المخزون

2. **إلغاء جزئي**:
   - إنشاء طلبية متعددة المنتجات
   - إلغاء منتج واحد
   - التحقق من تحديث المجموع
   - التحقق من بقاء المنتجات الأخرى

3. **إدارة المخزون**:
   - تسجيل كمية قبل الإلغاء
   - تنفيذ الإلغاء مع إرجاع المخزون
   - التحقق من زيادة الكمية
   - مراجعة سجل `inventory_logs`

### اختبار الواجهة

```typescript
// مثال على اختبار الواجهة
describe('Order Cancellation', () => {
  it('should cancel full order', async () => {
    // اختبار إلغاء كامل
  });
  
  it('should cancel partial order', async () => {
    // اختبار إلغاء جزئي
  });
  
  it('should restore inventory', async () => {
    // اختبار إرجاع المخزون
  });
});
```

## الصيانة والمراقبة

### مراقبة الأداء
- **فهرسة الجداول**: تحسين البحث والاستعلامات
- **تنظيف الكاش**: مسح الكاش عند التحديث
- **مراقبة الاستعلامات**: تتبع أداء الدوال

### النسخ الاحتياطي
- **بيانات الإلغاء**: نسخ احتياطية منتظمة
- **سجل المراجعة**: حفظ سجلات الإلغاء
- **استعادة البيانات**: آليات الاستعادة

## تطويرات مستقبلية

### ميزات مقترحة
- **إلغاء دفعي**: إلغاء عدة طلبيات معاً
- **جدولة الإلغاء**: إلغاء مجدول
- **إشعارات**: تنبيهات إلغاء للعملاء
- **تقارير مخصصة**: تحليل أسباب الإلغاء

### تحسينات الأداء
- **تجميع الكاش**: تحسين إدارة الذاكرة
- **فهرسة ذكية**: فهارس أفضل للاستعلامات
- **تحسين الاستعلامات**: استعلامات أسرع

---

## الخلاصة

نظام إلغاء الطلبيات الجديد يوفر:

✅ **مرونة كاملة** في أنواع الإلغاء  
✅ **إدارة تلقائية** للمخزون  
✅ **تتبع شامل** للعمليات  
✅ **دقة محاسبية** في الإحصائيات  
✅ **واجهة سهلة** للمستخدمين  
✅ **أمان متقدم** للبيانات  

النظام جاهز للاستخدام في الإنتاج ويدعم جميع متطلبات إدارة طلبيات نقطة البيع الاحترافية.