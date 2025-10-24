# 🔄 دليل تحويل الصفحات إلى Offline-First

## 📋 الصفحات المطلوب تحويلها

1. ✅ **إدارة العملاء** (Customers Management)
2. ✅ **إدارة ديون العملاء** (Customer Debts)
3. ✅ **إدارة إرجاع المنتجات** (Product Returns)
4. ✅ **إدارة التصريح بالخسائر** (Loss Declaration)
5. ✅ **الفواتير** (Invoices)

---

## 🎯 البرومبت الشامل

```
أريد تحويل الصفحات التالية لتعمل بنظام Offline-First (دعم كامل للأوفلاين والأونلاين):

### الصفحات المطلوبة:
1. إدارة العملاء (Customers Management)
2. إدارة ديون العملاء (Customer Debts)
3. إدارة إرجاع المنتجات (Product Returns)
4. إدارة التصريح بالخسائر (Loss Declaration)
5. الفواتير (Invoices)

### المتطلبات الأساسية:

#### 1. البنية التحتية (Infrastructure)

**أ) إضافة جداول Dexie في `src/database/localDb.ts`:**
- جدول `customerDebts` للديون
- جدول `productReturns` للإرجاعات
- جدول `lossDeclarations` للخسائر
- جدول `invoices` للفواتير
- جدول `invoiceItems` لعناصر الفواتير

**ب) إنشاء خدمات محلية (Local Services):**
- `src/api/localCustomerDebtService.ts`
- `src/api/localProductReturnService.ts`
- `src/api/localLossDeclarationService.ts`
- `src/api/localInvoiceService.ts`

**ج) إنشاء خدمات المزامنة:**
- `src/api/syncCustomerDebts.ts`
- `src/api/syncProductReturns.ts`
- `src/api/syncLossDeclarations.ts`
- `src/api/syncInvoices.ts`

#### 2. نمط التصميم (Design Pattern)

اتبع نفس النمط المستخدم في `posOrderService.ts`:

```typescript
// 1. التحقق من الاتصال
const isOnline = isDeviceOnline();

// 2. محاولة العملية أونلاين أولاً
if (isOnline) {
  try {
    const result = await onlineOperation();
    return result;
  } catch (error) {
    if (shouldFallbackToOffline(error)) {
      return await offlineOperation();
    }
    throw error;
  }
}

// 3. العملية أوفلاين مباشرة
return await offlineOperation();
```

#### 3. فض النزاعات (Conflict Resolution)

طبق سياسة **Server Win** لجميع الكيانات:
- عند فشل التحديث، اجلب النسخة من الخادم
- احفظها محلياً مع علامة `_sync_resolution: 'server_win'`
- وسّم العملية المحلية كمتزامنة

#### 4. التكامل مع SyncEngine

أضف المهام الجديدة في `src/sync/SyncEngine.ts`:

```typescript
async run(): Promise<SyncResult> {
  // ... المهام الموجودة
  
  const debts = await this.runWithRetry('customerDebts', async () => {
    this.notify('customerDebts');
    return await syncPendingCustomerDebts();
  });
  
  const returns = await this.runWithRetry('productReturns', async () => {
    this.notify('productReturns');
    return await syncPendingProductReturns();
  });
  
  const losses = await this.runWithRetry('lossDeclarations', async () => {
    this.notify('lossDeclarations');
    return await syncPendingLossDeclarations();
  });
  
  const invoices = await this.runWithRetry('invoices', async () => {
    this.notify('invoices');
    return await syncPendingInvoices();
  });
}
```

#### 5. واجهة المستخدم (UI Updates)

**أ) مؤشرات الحالة:**
- أيقونة سحابة للعناصر المتزامنة
- أيقونة ساعة للعناصر المعلقة
- أيقونة تحذير للعناصر الفاشلة

**ب) رسائل واضحة:**
```typescript
// أونلاين
toast.success('تم حفظ الدين بنجاح');

// أوفلاين
toast.success('تم حفظ الدين محلياً - سيتم المزامنة عند الاتصال');

// فشل
toast.error('فشل حفظ الدين - تم الحفظ محلياً');
```

#### 6. الفهارس والأداء

أضف فهارس مناسبة في Dexie:

```typescript
this.version(5).stores({
  // ... الجداول الموجودة
  customerDebts: 'id, customer_id, organization_id, status, synced, created_at',
  productReturns: 'id, order_id, organization_id, status, synced, created_at',
  lossDeclarations: 'id, product_id, organization_id, status, synced, created_at',
  invoices: 'id, customer_id, organization_id, status, synced, invoice_number, created_at',
  invoiceItems: 'id, invoice_id, product_id'
});
```

### الخطوات التفصيلية:

#### المرحلة 1: إدارة العملاء (Customers)

1. **تحديث `src/database/localDb.ts`:**
   - الجدول موجود بالفعل (`customers`)
   - تأكد من الفهارس الصحيحة

2. **تحديث صفحة العملاء:**
   - `src/pages/dashboard/Customers.tsx`
   - استخدم `useUnifiedPOSData` أو hook مشابه
   - أضف مؤشرات الحالة (synced/pending/failed)

3. **تحديث عمليات CRUD:**
   - إنشاء: احفظ محلياً أولاً، ثم زامن
   - تحديث: نفس النمط
   - حذف: علّم كمحذوف محلياً، ثم زامن

#### المرحلة 2: إدارة ديون العملاء

1. **إنشاء `LocalCustomerDebt` interface:**
```typescript
export interface LocalCustomerDebt {
  id: string;
  customer_id: string;
  organization_id: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  notes?: string;
  status: 'pending' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
  remote_debt_id?: string;
}
```

2. **إنشاء `localCustomerDebtService.ts`:**
   - `createLocalDebt()`
   - `updateLocalDebt()`
   - `deleteLocalDebt()`
   - `getPendingDebts()`
   - `markDebtAsSynced()`

3. **إنشاء `syncCustomerDebts.ts`:**
   - `syncPendingDebts()`
   - `syncDebtUpdates()`
   - استخدم Pool=2 للتوازي

4. **تحديث الصفحة:**
   - `src/pages/dashboard/CustomerDebts.tsx`
   - أضف مؤشرات المزامنة
   - دعم الأوفلاين الكامل

#### المرحلة 3: إدارة إرجاع المنتجات

1. **إنشاء `LocalProductReturn` interface:**
```typescript
export interface LocalProductReturn {
  id: string;
  order_id?: string;
  customer_id?: string;
  organization_id: string;
  items: ReturnItem[];
  total_amount: number;
  refund_method: 'cash' | 'credit' | 'exchange';
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
  remote_return_id?: string;
}

export interface ReturnItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason?: string;
}
```

2. **إنشاء الخدمات المحلية والمزامنة**

3. **تحديث الصفحة:**
   - `src/pages/dashboard/ProductReturns.tsx`
   - دعم إنشاء الإرجاع أوفلاين
   - تحديث المخزون محلياً

#### المرحلة 4: إدارة التصريح بالخسائر

1. **إنشاء `LocalLossDeclaration` interface:**
```typescript
export interface LocalLossDeclaration {
  id: string;
  product_id: string;
  organization_id: string;
  quantity: number;
  loss_type: 'damaged' | 'expired' | 'stolen' | 'other';
  reason: string;
  notes?: string;
  estimated_value: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
  remote_loss_id?: string;
}
```

2. **إنشاء الخدمات والمزامنة**

3. **تحديث الصفحة:**
   - `src/pages/dashboard/LossDeclarations.tsx`
   - تحديث المخزون محلياً عند التصريح

#### المرحلة 5: الفواتير

1. **إنشاء `LocalInvoice` و `LocalInvoiceItem`:**
```typescript
export interface LocalInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  organization_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method?: string;
  due_date?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
  remote_invoice_id?: string;
}

export interface LocalInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate?: number;
  discount?: number;
  synced: boolean;
}
```

2. **إنشاء الخدمات الكاملة**

3. **تحديث صفحة الفواتير:**
   - `src/pages/dashboard/Invoices.tsx`
   - دعم إنشاء وتعديل الفواتير أوفلاين
   - مزامنة تلقائية عند الاتصال

### متطلبات إضافية:

#### 1. التحقق من الصلاحيات أوفلاين
```typescript
// احفظ الصلاحيات محلياً
const permissions = await cacheUserPermissions();

// استخدمها أوفلاين
if (!isOnline) {
  return checkLocalPermissions(permissions);
}
```

#### 2. معالجة الأرقام التسلسلية
```typescript
// استخدم أرقام مؤقتة أوفلاين
const tempInvoiceNumber = `TEMP-${Date.now()}`;

// استبدلها بالأرقام الحقيقية عند المزامنة
```

#### 3. إدارة الصور والملفات
```typescript
// احفظ الصور في IndexedDB
// زامنها لاحقاً مع البيانات
```

#### 4. التقارير والإحصائيات
```typescript
// احسب الإحصائيات من البيانات المحلية
// أضف علامة "بيانات محلية - قد لا تكون محدثة"
```

### الاختبار:

1. **سيناريوهات الاختبار:**
   - إنشاء عنصر أوفلاين → الاتصال → التحقق من المزامنة
   - تحديث عنصر أوفلاين → الاتصال → التحقق من المزامنة
   - حذف عنصر أوفلاين → الاتصال → التحقق من المزامنة
   - تضارب البيانات → التحقق من Server Win
   - قطع الاتصال أثناء العملية → التحقق من الحفظ المحلي

2. **اختبار الأداء:**
   - قياس زمن الحفظ المحلي
   - قياس زمن المزامنة
   - اختبار مع 1000+ عنصر

3. **اختبار التجربة:**
   - وضوح المؤشرات
   - سهولة الاستخدام
   - رسائل مفهومة

### الأولويات:

1. **عالية:** العملاء، الفواتير
2. **متوسطة:** ديون العملاء، إرجاع المنتجات
3. **منخفضة:** التصريح بالخسائر

ابدأ بالعملاء والفواتير أولاً، ثم انتقل للبقية.
```

---

## 📝 ملاحظات مهمة

1. **استخدم نفس النمط المطبق في POS Orders**
2. **طبق Server Win لجميع التضاربات**
3. **استخدم Pool=2 للمزامنة**
4. **أضف مؤشرات واضحة للحالة**
5. **اختبر كل ميزة بشكل منفصل**

---

## 🎯 الهدف النهائي

تطبيق يعمل بكفاءة كاملة أوفلاين وأونلاين، مع مزامنة تلقائية شفافة للمستخدم.
