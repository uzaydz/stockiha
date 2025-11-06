# أمثلة عملية لاستخدام قاعدة البيانات المحلية

---

## 1. التعامل مع IndexedDB (المخزون)

### مثال 1: البحث السريع عن منتج

```typescript
import { inventoryDB } from '@/database/localDb';

// البحث عن منتج بالاسم ضمن منظمة محددة
async function searchProduct(organizationId: string, productName: string) {
  try {
    const results = await inventoryDB.products
      .where('[organization_id+name_lower]')
      .equals([organizationId, productName.toLowerCase()])
      .toArray();
    
    return results;
  } catch (error) {
    console.error('خطأ في البحث:', error);
    return [];
  }
}

// البحث بالرمز الشريطي
async function searchByBarcode(organizationId: string, barcode: string) {
  const results = await inventoryDB.products
    .where('[organization_id+barcode_digits]')
    .equals([organizationId, barcode.replace(/\D+/g, '')])
    .toArray();
  
  return results;
}

// البحث المتقدم بنص عربي
async function searchArabic(organizationId: string, searchText: string) {
  const normalized = normalizeArabic(searchText);
  
  return await inventoryDB.products
    .where('name_search')
    .startsWith(normalized)
    .and(p => p.organization_id === organizationId)
    .toArray();
}
```

### مثال 2: تحديث كمية المخزون

```typescript
import { inventoryDB } from '@/database/localDb';

async function updateProductStock(productId: string, quantity: number) {
  // داخل معاملة (Transaction)
  await inventoryDB.transaction('rw', 
    [inventoryDB.inventory, inventoryDB.transactions], 
    async () => {
      // الحصول على المخزون الحالي
      const currentItem = await inventoryDB.inventory
        .where('product_id')
        .equals(productId)
        .first();
      
      if (currentItem) {
        // تحديث الكمية
        await inventoryDB.inventory.put({
          ...currentItem,
          stock_quantity: Math.max(0, currentItem.stock_quantity + quantity),
          last_updated: new Date(),
          synced: false // علامة للمزامنة
        });
      }
      
      // تسجيل العملية
      await inventoryDB.transactions.add({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        product_id: productId,
        quantity,
        reason: 'manual_adjustment',
        timestamp: new Date(),
        synced: false,
        created_by: currentUserId
      });
    }
  );
}
```

### مثال 3: الحصول على الفئات بسرعة

```typescript
// البحث حسب الفئة والاسم (فهرس مركب)
async function getProductsByCategory(
  organizationId: string, 
  categoryId: string
) {
  return await inventoryDB.products
    .where('[organization_id+category_id+name_lower]')
    .between(
      [organizationId, categoryId, ''],
      [organizationId, categoryId, '\uffff']
    )
    .toArray();
}
```

---

## 2. التعامل مع طلبات POS

### مثال 1: حفظ طلب محلي

```typescript
import { inventoryDB, LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';

async function savePOSOrder(order: {
  customer_name: string;
  items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
}) {
  const orderId = uuidv4();
  const now = new Date();
  
  try {
    await inventoryDB.transaction('rw', 
      [inventoryDB.posOrders, inventoryDB.posOrderItems], 
      async () => {
        // حفظ الطلب الرئيسي
        const posOrder: LocalPOSOrder = {
          id: orderId,
          organization_id: currentOrganizationId,
          employee_id: currentEmployeeId,
          customer_name: order.customer_name,
          customer_name_lower: order.customer_name.toLowerCase(),
          subtotal: order.subtotal,
          total: order.total,
          discount: order.discount,
          amount_paid: 0,
          payment_method: order.payment_method,
          payment_status: 'pending',
          status: 'pending_sync',
          synced: false,
          created_at: now.toISOString(),
          created_at_ts: now.getTime(),
          updated_at: now.toISOString(),
          local_order_number: await getNextLocalOrderNumber(),
          local_order_number_str: String(await getNextLocalOrderNumber()),
          pendingOperation: 'create'
        };
        
        await inventoryDB.posOrders.add(posOrder);
        
        // حفظ عناصر الطلب
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          await inventoryDB.posOrderItems.add({
            id: `${orderId}_${i}`,
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
            synced: false,
            created_at: now.toISOString()
          });
        }
      }
    );
    
    return orderId;
  } catch (error) {
    console.error('خطأ في حفظ الطلب:', error);
    throw error;
  }
}
```

### مثال 2: البحث عن الطلبات

```typescript
// البحث عن جميع الطلبات المعلقة
async function getPendingOrders(organizationId: string) {
  return await inventoryDB.posOrders
    .where('[organization_id+status+created_at]')
    .between(
      [organizationId, 'pending_sync', new Date(0)],
      [organizationId, 'pending_sync', new Date()]
    )
    .reverse()
    .toArray();
}

// البحث عن طلبات عميل معين
async function getCustomerOrders(
  organizationId: string, 
  customerName: string
) {
  return await inventoryDB.posOrders
    .where('[organization_id+customer_name_lower]')
    .equals([organizationId, customerName.toLowerCase()])
    .reverse()
    .toArray();
}

// الطلبات المتأخرة عن المزامنة
async function getUnsyncedOrders(organizationId: string) {
  return await inventoryDB.posOrders
    .where('organization_id')
    .equals(organizationId)
    .filter(o => !o.synced)
    .toArray();
}
```

### مثال 3: تحديث حالة طلب

```typescript
async function updateOrderStatus(
  orderId: string, 
  status: 'pending_sync' | 'syncing' | 'synced' | 'failed',
  remoteOrderId?: string
) {
  const order = await inventoryDB.posOrders.get(orderId);
  
  if (!order) throw new Error('الطلب غير موجود');
  
  await inventoryDB.posOrders.update(orderId, {
    status,
    synced: status === 'synced',
    remote_order_id: remoteOrderId,
    updated_at: new Date().toISOString(),
    lastSyncAttempt: new Date().toISOString()
  });
}
```

---

## 3. التعامل مع بيانات المصادقة

### مثال 1: حفظ وتحميل الجلسة

```typescript
import { saveAuthToStorage, loadAuthFromStorage } from '@/context/auth/utils/authStorage';

// بعد تسجيل الدخول الناجح
function handleLoginSuccess(session: Session, user: SupabaseUser) {
  saveAuthToStorage(session, user);
  
  // حفظ بيانات المستخدم أيضاً
  saveUserDataToStorage(userProfile, organization, organizationId);
  
  // حفظ لقطة أوفلاين
  saveOfflineAuthSnapshot(session, user);
}

// عند تحميل التطبيق
function loadStoredAuth() {
  const stored = loadAuthFromStorage();
  
  if (stored?.user) {
    // استخدام البيانات المخزنة مؤقتاً
    console.log('وجدت بيانات مستخدم محفوظة:', stored.user.email);
    return stored;
  }
  
  // أو تحميل لقطة الأوفلاين
  const offlineSnapshot = loadOfflineAuthSnapshot();
  if (offlineSnapshot?.user) {
    console.log('استخدام بيانات الأوفلاين');
  }
}
```

### مثال 2: تنظيف الجلسة عند الخروج

```typescript
import { CompleteLogoutCleaner } from '@/lib/utils/complete-logout-cleaner';

async function handleLogout() {
  try {
    // تنظيف شامل
    await CompleteLogoutCleaner.performCompleteCleanup();
  } catch (error) {
    console.error('خطأ في التنظيف:', error);
    
    // تنظيف سريع كحل بديل
    CompleteLogoutCleaner.quickCleanup();
  }
}
```

---

## 4. التعامل مع البيانات المتزامنة

### مثال 1: تتبع حالة المزامنة

```typescript
import { inventoryDB, SyncQueueItem } from '@/database/localDb';

// إضافة عنصر لقائمة الانتظار
async function queueForSync(
  objectType: 'product' | 'order' | 'customer',
  objectId: string,
  operation: 'create' | 'update' | 'delete',
  data: any
) {
  const item: SyncQueueItem = {
    id: uuidv4(),
    objectType,
    objectId,
    operation,
    data,
    attempts: 0,
    createdAt: new Date().toISOString(),
    priority: 2 // متوسط
  };
  
  await inventoryDB.syncQueue.add(item);
}

// الحصول على قائمة الانتظار
async function getSyncQueue(organizationId: string) {
  // الحصول على العناصر المعلقة
  const pending = await inventoryDB.syncQueue
    .where('priority')
    .between(1, 3)
    .sortBy('priority');
  
  return pending;
}

// تحديث محاولة المزامنة
async function markSyncAttempt(
  queueItemId: string,
  success: boolean,
  error?: string
) {
  const item = await inventoryDB.syncQueue.get(queueItemId);
  
  if (!item) return;
  
  if (success) {
    await inventoryDB.syncQueue.delete(queueItemId);
  } else {
    await inventoryDB.syncQueue.update(queueItemId, {
      attempts: (item.attempts || 0) + 1,
      lastAttempt: new Date().toISOString(),
      error
    });
  }
}
```

### مثال 2: معالجة تضارب البيانات

```typescript
async function resolveDataConflict(
  localData: any,
  remoteData: any,
  strategy: 'local' | 'remote' | 'merge'
): Promise<any> {
  switch (strategy) {
    case 'local':
      // الاحتفاظ بالبيانات المحلية
      return localData;
    
    case 'remote':
      // استبدال بالبيانات البعيدة
      return remoteData;
    
    case 'merge':
      // دمج البيانات بذكاء
      return {
        ...remoteData,
        // احتفظ ببعض الحقول المحلية
        lastModifiedLocally: localData.updated_at,
        localModifications: localData.pendingChanges
      };
    
    default:
      return localData;
  }
}
```

---

## 5. إدارة الذاكرة والأداء

### مثال 1: تنظيف البيانات القديمة

```typescript
// تنظيف الفواتير القديمة (أكثر من 90 يوم)
async function cleanupOldInvoices(organizationId: string) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const oldInvoices = await inventoryDB.invoices
    .where('[organization_id+created_at]')
    .between(
      [organizationId, new Date(0)],
      [organizationId, ninetyDaysAgo.toISOString()]
    )
    .toArray();
  
  // حذف الفواتير القديمة المتزامنة
  const syncedIds = oldInvoices
    .filter(inv => inv.synced)
    .map(inv => inv.id);
  
  await inventoryDB.invoices.bulkDelete(syncedIds);
  
  return syncedIds.length;
}

// تنظيف عمليات المخزون
async function cleanupOldTransactions(productId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const oldTransactions = await inventoryDB.transactions
    .where('product_id')
    .equals(productId)
    .filter(t => 
      t.synced && 
      new Date(t.timestamp) < thirtyDaysAgo
    )
    .toArray();
  
  const ids = oldTransactions.map(t => t.id);
  await inventoryDB.transactions.bulkDelete(ids);
}
```

### مثال 2: مراقبة حجم قاعدة البيانات

```typescript
// الحصول على إحصائيات قاعدة البيانات
async function getDatabaseStats() {
  const stats = {
    products: await inventoryDB.products.count(),
    inventory: await inventoryDB.inventory.count(),
    posOrders: await inventoryDB.posOrders.count(),
    customers: await inventoryDB.customers.count(),
    invoices: await inventoryDB.invoices.count(),
    syncQueue: await inventoryDB.syncQueue.count(),
    unsyncedItems: {
      products: await inventoryDB.products.where('synced').equals(false).count(),
      orders: await inventoryDB.posOrders.where('synced').equals(false).count(),
      customers: await inventoryDB.customers.where('synced').equals(false).count()
    }
  };
  
  return stats;
}

// تحذير من امتلاء قاعدة البيانات
async function checkStorageCapacity() {
  const stats = await getDatabaseStats();
  const totalItems = Object.values(stats).reduce((a, b) => 
    typeof b === 'number' ? a + b : a, 0
  );
  
  if (totalItems > 100000) {
    console.warn('تحذير: قاعدة البيانات كبيرة جداً، قد تحتاج للتنظيف');
    return 'warning';
  }
  
  return 'ok';
}
```

---

## 6. أمثلة متقدمة

### مثال 1: البحث بنص كامل

```typescript
async function fullTextSearch(
  organizationId: string,
  searchText: string
): Promise<Array<{ type: string; data: any }>> {
  const results: Array<{ type: string; data: any }> = [];
  
  // البحث في المنتجات
  const products = await inventoryDB.products
    .where('[organization_id+name_search]')
    .startsWith([organizationId, normalizeArabic(searchText)])
    .limit(20)
    .toArray();
  
  results.push(...products.map(p => ({ type: 'product', data: p })));
  
  // البحث في العملاء
  const customers = await inventoryDB.customers
    .where('[organization_id+name_lower]')
    .startsWith([organizationId, searchText.toLowerCase()])
    .limit(10)
    .toArray();
  
  results.push(...customers.map(c => ({ type: 'customer', data: c })));
  
  // البحث في الفواتير برقم الفاتورة
  const invoices = await inventoryDB.invoices
    .where('[organization_id+invoice_number_lower]')
    .startsWith([organizationId, searchText.toLowerCase()])
    .limit(10)
    .toArray();
  
  results.push(...invoices.map(i => ({ type: 'invoice', data: i })));
  
  return results;
}
```

### مثال 2: إعادة بناء الفهارس

```typescript
// في حالة الأخطاء، قد تحتاج لإعادة بناء الفهارس
async function rebuildIndexes(organizationId: string) {
  try {
    // إعادة بناء فهارس المنتجات
    const products = await inventoryDB.products
      .where('organization_id')
      .equals(organizationId)
      .toArray();
    
    for (const product of products) {
      await inventoryDB.products.put({
        ...product,
        name_lower: (product.name || '').toLowerCase(),
        sku_lower: (product.sku || '').toLowerCase(),
        barcode_lower: (product.barcode || '').toLowerCase(),
        name_search: normalizeArabic(product.name || ''),
        sku_search: normalizeArabic(product.sku || ''),
        barcode_digits: (product.barcode || '').replace(/\D+/g, '')
      });
    }
    
    console.log('تم إعادة بناء الفهارس بنجاح');
    return true;
  } catch (error) {
    console.error('خطأ في إعادة البناء:', error);
    return false;
  }
}
```

---

## 7. ملاحظات مهمة

### الأداء
- استخدم الفهارس المركب�� للاستعلامات التي تتضمن حقول متعددة
- استخدم `limit()` و `reverse()` لتحسين الأداء
- تجنب `toArray()` مع البيانات الكبيرة جداً

### الأمان
- تشفير البيانات الحساسة قبل الحفظ
- تحقق من صلاحيات المستخدم قبل الوصول
- لا تثق بالبيانات المحفوظة في localStorage

### المزامنة
- تأكد من وجود اتصال قبل محاولة المزامنة
- استخدم نظام الأولويات لتحديد البيانات الحرجة
- احفظ بيانات الخطأ لتحليل المشاكل

