# خطة تنفيذ المزامنة الشاملة لنقطة البيع (Offline Mode)

## نظرة عامة

يهدف هذا المشروع إلى توسيع قدرات نقطة البيع للعمل في وضع عدم الاتصال (أوفلاين) ثم مزامنة البيانات مع الخادم عند استعادة الاتصال. مشابه للنموذج الذي تم تنفيذه مع العملاء، سنطبق نفس النهج على:

1. **المبيعات والطلبات** - إنشاء وعرض وتعديل المبيعات محلياً
2. **المخزون** - تتبع مستويات المخزون وتحديثها محلياً
3. **الديون** - معالجة الدفعات الجزئية والديون محلياً
4. **الخصومات** - تطبيق أنواع مختلفة من الخصومات أثناء عدم الاتصال
5. **الملاحظات** - حفظ وتعديل الملاحظات المتعلقة بالمبيعات محلياً
6. **كود التتبع للخدمات** - إنشاء كود تتبع للخدمات حتى في وضع عدم الاتصال

## هيكل قاعدة البيانات المحلية

سنستخدم مكتبة Dexie.js (التي تعمل على IndexedDB) لتخزين البيانات محلياً. فيما يلي هيكل قاعدة البيانات:

### 1. الجداول الحالية التي سنحتفظ بها

```typescript
// بناءًا على قاعدة البيانات الحالية التي تم تحليلها
export class LocalDatabase extends Dexie {
  // الجداول الحالية
  products: Dexie.Table<LocalProduct, string>;
  inventory: Dexie.Table<InventoryItem, string>;
  transactions: Dexie.Table<InventoryTransaction, string>;
  syncQueue: Dexie.Table<SyncQueueItem, string>;
  customers: Dexie.Table<LocalCustomer, string>;
  addresses: Dexie.Table<LocalAddress, string>;
  
  // الجداول الجديدة
  orders: Dexie.Table<LocalOrder, string>;
  orderItems: Dexie.Table<LocalOrderItem, string>;
  debts: Dexie.Table<LocalDebt, string>;
  serviceBookings: Dexie.Table<LocalServiceBooking, string>;
}
```

### 2. هياكل البيانات الجديدة

#### المبيعات (الطلبات)

```typescript
export interface LocalOrder {
  id: string;
  customer_id?: string;
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address_id?: string;
  shipping_method?: string;
  shipping_cost?: number;
  notes?: string;
  is_online: boolean;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  slug?: string;
  customer_order_number?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

#### عناصر الطلب

```typescript
export interface LocalOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_digital: boolean;
  organization_id: string;
  slug: string;
  name: string;
  is_wholesale?: boolean;
  original_price?: number;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

#### الديون (المدفوعات الجزئية)

```typescript
export interface LocalDebt {
  id: string;
  order_id: string;
  amount: number;
  type: string;
  payment_method: string;
  description?: string;
  employee_id?: string;
  created_at: string;
  organization_id: string;
  slug?: string;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

#### سجل المخزون

```typescript
export interface LocalInventoryLog {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  type: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  organization_id: string;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

#### الخدمات وكود التتبع

```typescript
export interface LocalServiceBooking {
  id: string;
  order_id: string;
  service_id: string;
  service_name: string;
  price: number;
  scheduled_date?: string;
  notes?: string;
  status: string;
  assigned_to?: string;
  completed_at?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  public_tracking_code: string;
  organization_id: string;
  slug?: string;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

### 3. تحديث مخطط قاعدة البيانات

```typescript
// تعريف مخطط قاعدة البيانات المحدث
this.version(2).stores({
  // الجداول الحالية
  products: 'id, name, sku, category, organization_id, synced, pendingOperation',
  inventory: 'id, product_id, variant_id, synced',
  transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
  syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
  customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
  addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation',
  
  // الجداول الجديدة
  orders: 'id, customer_id, status, payment_status, organization_id, created_at, synced, pendingOperation',
  orderItems: 'id, order_id, product_id, synced, pendingOperation',
  debts: 'id, order_id, type, organization_id, synced, pendingOperation',
  serviceBookings: 'id, order_id, service_id, status, organization_id, public_tracking_code, synced, pendingOperation',
  inventoryLogs: 'id, product_id, type, reference_id, created_at, organization_id, synced, pendingOperation'
});
```

## آلية المزامنة

### 1. نظام المزامنة العام

نظام المزامنة سيعمل بشكل مشابه للآلية المستخدمة مع العملاء:

1. **التخزين المحلي أولاً**: كل العمليات تحفظ محلياً أولاً مع علامة `synced: false`
2. **قائمة انتظار المزامنة**: إضافة العمليات إلى قائمة الانتظار مع تحديد الأولوية
3. **المزامنة التلقائية**: محاولة المزامنة تلقائياً عند استعادة الاتصال
4. **حل التعارضات**: استراتيجية واضحة للتعامل مع حالات التعارض

### 2. خدمات المزامنة الجديدة

سنقوم بإنشاء خدمات مزامنة لكل نوع من البيانات:

1. `offlineOrderService.ts` - للتعامل مع الطلبات والمبيعات
2. `offlineDebtService.ts` - للتعامل مع الديون والمدفوعات الجزئية
3. `offlineInventoryService.ts` - للتعامل مع المخزون وسجلات المخزون
4. `offlineServiceBookingService.ts` - للتعامل مع الخدمات وكود التتبع

### 3. توليد كود التتبع للخدمات

```typescript
// آلية إنشاء كود تتبع فريد للخدمات حتى في وضع عدم الاتصال
export const generateTrackingCode = (): string => {
  // إنشاء رمز قصير وفريد يمكن قراءته من قبل المستخدم
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // تنسيق مشابه لرموز التتبع الحالية
  return `SRV-${timestamp.slice(-4)}-${randomPart}`;
};
```

## خطوات التنفيذ

### المرحلة 1: إعداد البنية التحتية

1. **تحديث LocalDatabase**: إضافة الجداول والمخططات الجديدة
2. **تطوير SyncManager**: تحديث مدير المزامنة لمعالجة جميع أنواع البيانات
3. **معالجة الاتصال**: تحسين الكشف عن حالة الاتصال وإدارة الأحداث

### المرحلة 2: تنفيذ المبيعات دون اتصال

1. **خدمة الطلبات المحلية**: تطوير `localOrderService.ts`
2. **واجهة موحدة**: تطوير `offlineOrderService.ts`
3. **تكامل واجهة المستخدم**: تحديث واجهات البيع لدعم وضع عدم الاتصال

### المرحلة 3: تنفيذ المخزون دون اتصال

1. **إدارة المخزون المحلي**: تحسين `localInventoryService.ts`
2. **تتبع تغييرات المخزون**: تطوير `inventoryLogService.ts`
3. **مزامنة تحديثات المخزون**: التعامل مع تعارضات المخزون

### المرحلة 4: تنفيذ الديون دون اتصال

1. **إدارة المدفوعات الجزئية**: تطوير `localDebtService.ts`
2. **واجهة الديون**: تحديث واجهات عرض وإدارة الديون

### المرحلة 5: تنفيذ نظام التتبع للخدمات

1. **خدمة الحجوزات المحلية**: تطوير `localServiceBookingService.ts`
2. **توليد أكواد التتبع**: تنفيذ نظام إنشاء أكواد تتبع فريدة محلياً
3. **واجهة تتبع الخدمات**: تحديث واجهة تتبع الخدمات

### المرحلة 6: الاختبار والتحسين

1. **سيناريوهات الاختبار**: اختبار شامل لحالات الاتصال وعدم الاتصال
2. **معالجة الحالات الشاذة**: تطوير آليات استرداد البيانات والتعافي
3. **تجربة المستخدم**: تحسين واجهة المستخدم لتوفير تجربة سلسة

## تفاصيل وواجهات قاعدة البيانات

### هياكل الجداول في قاعدة البيانات الخلفية (Supabase)

#### جدول الطلبات (orders)

| اسم العمود | نوع البيانات | إلزامي | وصف |
|------------|--------------|---------|------|
| id | uuid | نعم | المعرف الفريد للطلب |
| customer_id | uuid | لا | معرف العميل |
| subtotal | numeric | نعم | المجموع الفرعي |
| tax | numeric | نعم | الضريبة |
| discount | numeric | لا | الخصم |
| total | numeric | نعم | المجموع الكلي |
| status | text | نعم | حالة الطلب |
| payment_method | text | نعم | طريقة الدفع |
| payment_status | text | نعم | حالة الدفع |
| shipping_address_id | uuid | لا | معرف عنوان الشحن |
| shipping_method | text | لا | طريقة الشحن |
| shipping_cost | numeric | لا | تكلفة الشحن |
| notes | text | لا | ملاحظات |
| is_online | boolean | نعم | هل الطلب عبر الإنترنت |
| employee_id | uuid | لا | معرف الموظف |
| created_at | timestamp | لا | تاريخ الإنشاء |
| updated_at | timestamp | لا | تاريخ التحديث |
| organization_id | uuid | نعم | معرف المؤسسة |
| slug | text | لا | الاسم المختصر |
| customer_order_number | integer | لا | رقم طلب العميل |
| amount_paid | numeric | لا | المبلغ المدفوع |
| remaining_amount | numeric | لا | المبلغ المتبقي |
| consider_remaining_as_partial | boolean | لا | اعتبار المتبقي كدفع جزئي |

#### جدول عناصر الطلب (order_items)

| اسم العمود | نوع البيانات | إلزامي | وصف |
|------------|--------------|---------|------|
| id | uuid | نعم | المعرف الفريد للعنصر |
| order_id | uuid | نعم | معرف الطلب |
| product_id | uuid | نعم | معرف المنتج |
| product_name | text | نعم | اسم المنتج |
| quantity | integer | نعم | الكمية |
| unit_price | numeric | نعم | سعر الوحدة |
| total_price | numeric | نعم | السعر الإجمالي |
| is_digital | boolean | نعم | هل المنتج رقمي |
| organization_id | uuid | نعم | معرف المؤسسة |
| slug | text | نعم | الاسم المختصر |
| name | text | نعم | الاسم |
| is_wholesale | boolean | لا | هل بيع بالجملة |
| original_price | numeric | لا | السعر الأصلي |

#### جدول سجل المعاملات (transactions)

| اسم العمود | نوع البيانات | إلزامي | وصف |
|------------|--------------|---------|------|
| id | uuid | نعم | المعرف الفريد للمعاملة |
| order_id | uuid | لا | معرف الطلب |
| amount | numeric | نعم | المبلغ |
| type | text | نعم | نوع المعاملة |
| payment_method | text | نعم | طريقة الدفع |
| description | text | لا | وصف |
| employee_id | uuid | لا | معرف الموظف |
| created_at | timestamp | لا | تاريخ الإنشاء |
| organization_id | uuid | نعم | معرف المؤسسة |
| slug | text | لا | الاسم المختصر |

#### جدول سجل المخزون (inventory_logs)

| اسم العمود | نوع البيانات | إلزامي | وصف |
|------------|--------------|---------|------|
| id | uuid | نعم | المعرف الفريد للسجل |
| product_id | uuid | نعم | معرف المنتج |
| product_name | text | لا | اسم المنتج |
| quantity | integer | نعم | الكمية |
| previous_stock | integer | نعم | المخزون السابق |
| new_stock | integer | نعم | المخزون الجديد |
| type | text | نعم | نوع العملية |
| reference_id | text | لا | معرف المرجع |
| notes | text | لا | ملاحظات |
| created_by | uuid | لا | المنشئ |
| created_by_name | text | لا | اسم المنشئ |
| created_at | timestamp | لا | تاريخ الإنشاء |
| organization_id | uuid | لا | معرف المؤسسة |

#### جدول حجوزات الخدمات (service_bookings)

| اسم العمود | نوع البيانات | إلزامي | وصف |
|------------|--------------|---------|------|
| id | text | نعم | المعرف الفريد للحجز |
| order_id | uuid | نعم | معرف الطلب |
| service_id | uuid | نعم | معرف الخدمة |
| service_name | text | نعم | اسم الخدمة |
| price | numeric | نعم | السعر |
| scheduled_date | timestamp | لا | تاريخ الجدولة |
| notes | text | لا | ملاحظات |
| status | text | نعم | الحالة |
| assigned_to | uuid | لا | معرف المسؤول |
| completed_at | timestamp | لا | تاريخ الإكمال |
| customer_id | uuid | لا | معرف العميل |
| customer_name | text | لا | اسم العميل |
| public_tracking_code | text | لا | رمز التتبع العام |
| organization_id | uuid | نعم | معرف المؤسسة |
| slug | text | لا | الاسم المختصر |
| customer_phone | varchar | لا | هاتف العميل |

## الجدول الزمني للتنفيذ

| المرحلة | المهمة | المدة المقدرة |
|---------|--------|--------------|
| 1 | إعداد البنية التحتية | أسبوع واحد |
| 2 | تنفيذ المبيعات دون اتصال | أسبوعان |
| 3 | تنفيذ المخزون دون اتصال | أسبوع واحد |
| 4 | تنفيذ الديون دون اتصال | أسبوع واحد |
| 5 | تنفيذ نظام التتبع للخدمات | أسبوع واحد |
| 6 | الاختبار والتحسين | أسبوعان |

## المخاطر والتحديات

1. **تعارضات البيانات**: يمكن أن تحدث تعارضات عند مزامنة البيانات، خاصة في المخزون
2. **أداء الأجهزة**: التخزين المحلي الكبير قد يؤثر على أداء الأجهزة الضعيفة
3. **تعقيد التنفيذ**: التكامل مع الواجهات الحالية قد يكون معقداً
4. **اختبار**: يتطلب اختباراً شاملاً لتغطية جميع سيناريوهات عدم الاتصال

## الخلاصة

تنفيذ وضع عدم الاتصال الكامل لنقطة البيع سيمكّن الأعمال من العمل بشكل مستمر حتى في حالة انقطاع الاتصال بالإنترنت. سيوفر هذا التنفيذ تجربة مستخدم سلسة من خلال الاحتفاظ بجميع وظائف نقطة البيع الأساسية، مع ضمان مزامنة آمنة للبيانات عند استعادة الاتصال. 