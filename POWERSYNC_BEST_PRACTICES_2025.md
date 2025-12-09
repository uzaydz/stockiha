# خطة إعادة هيكلة PowerSync + Tauri
## أفضل الممارسات 2024/2025

---

## المشاكل الحالية في الكود

### 1. استخدام `getAll()` اليدوي بدلاً من Reactive Queries
```typescript
// ❌ الطريقة الحالية (خاطئة)
const result = await powerSyncService.getAll('SELECT * FROM products');

// ✅ الطريقة الصحيحة (PowerSync Hooks)
const { data, isLoading } = useQuery('SELECT * FROM products');
```

**المشكلة**:
- كل استدعاء `getAll()` يحجز slot في الـ concurrency queue
- لا يوجد caching
- لا يوجد reactivity
- يسبب queue timeout

### 2. Concurrency Limit خاطئ
```typescript
// ❌ الحالي
this.concurrencyLimit = 6; // كثير جداً لـ wa-sqlite

// ✅ الصحيح
this.concurrencyLimit = 1; // wa-sqlite أحادي الخيط!
```

**المشكلة**:
- wa-sqlite في WebAssembly يعمل بخيط واحد فقط
- 6 slots = 5 استعلامات معلقة + 1 يعمل
- PowerSync نفسه يحتاج slot للمزامنة

### 3. عدم استخدام Watch Queries
```typescript
// ❌ الحالي - refetch يدوي
useEffect(() => {
  fetchProducts();
}, [dependency]);

// ✅ الصحيح - Reactive Watch
const { data } = useQuery('SELECT * FROM products WHERE org_id = ?', [orgId]);
// يتحدث تلقائياً عند تغيير البيانات!
```

### 4. عدم استخدام Incremental/Differential Queries
```typescript
// ❌ الحالي - يعيد كل البيانات في كل تغيير
db.watch(sql, params, { onResult: () => refetch() });

// ✅ الصحيح - يعيد فقط التغييرات
const query = db.query(sql, params).differentialWatch();
// يحافظ على object references للبيانات غير المتغيرة
// مثالي لـ React memoization
```

---

## الحل الشامل: Best Practices 2025

### المرحلة 1: تحديث الـ Dependencies

```json
{
  "@powersync/web": "^1.29.1",      // أحدث إصدار
  "@powersync/react": "^1.7.2",     // hooks الرسمية
  "@powersync/tanstack-react-query": "^0.2.0"  // TanStack integration
}
```

**الميزات الجديدة في v1.29+**:
- `differentialWatch()` للتحديثات الذكية
- `WatchedQuery` class للـ caching
- إصلاحات race conditions
- دعم OPFS أفضل

---

### المرحلة 2: إعادة هيكلة PowerSyncService

```typescript
// src/lib/powersync/PowerSyncService.ts

import { PowerSyncDatabase, WASQLiteDBAdapter, WASQLiteVFS } from '@powersync/web';

class PowerSyncService {
  private db: PowerSyncDatabase | null = null;

  // ⚡ إزالة concurrency management تماماً!
  // PowerSync يديره داخلياً

  async initialize(): Promise<void> {
    // 1. اختيار VFS المناسب
    const isTauri = '__TAURI__' in window;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // ⚡ OPFSCoopSyncVFS للأداء الأفضل (Chrome, Firefox)
    // ⚡ IDBBatchAtomicVFS للتوافق (Safari, Tauri)
    const vfs = (isTauri || isSafari)
      ? WASQLiteVFS.IDBBatchAtomicVFS
      : WASQLiteVFS.OPFSCoopSyncVFS;

    const adapter = new WASQLiteDBAdapter({
      dbFilename: 'stockiha.db',
      vfs,
      flags: {
        enableMultiTabs: !isTauri,
        useWebWorker: !isTauri && !isSafari, // Workers فقط في Chrome
      },
    });

    this.db = new PowerSyncDatabase({
      database: adapter,
      schema: PowerSyncSchema,
    });

    await this.db.waitForReady();

    // 2. الاتصال بالخادم
    await this.db.connect(this.connector);
  }

  // ⚡ تصدير الـ database للاستخدام مع hooks
  getDatabase(): PowerSyncDatabase {
    if (!this.db) throw new Error('PowerSync not initialized');
    return this.db;
  }
}
```

---

### المرحلة 3: استخدام React Hooks الرسمية

#### 3.1 إعداد Provider

```typescript
// src/context/PowerSyncProvider.tsx

import { PowerSyncContext } from '@powersync/react';
import { powerSyncService } from '@/lib/powersync';

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);

  useEffect(() => {
    powerSyncService.initialize().then(() => {
      setDb(powerSyncService.getDatabase());
    });
  }, []);

  if (!db) return <LoadingScreen />;

  return (
    <PowerSyncContext.Provider value={{ db }}>
      {children}
    </PowerSyncContext.Provider>
  );
}
```

#### 3.2 استخدام useQuery (Reactive)

```typescript
// src/hooks/useProducts.ts

import { useQuery } from '@powersync/react';

export function useProducts(organizationId: string) {
  // ⚡ Reactive! يتحدث تلقائياً عند تغيير البيانات
  const { data, isLoading, error } = useQuery(
    `SELECT * FROM products WHERE organization_id = ? ORDER BY name`,
    [organizationId]
  );

  return { products: data, isLoading, error };
}
```

#### 3.3 استخدام WatchedQuery للـ Caching

```typescript
// src/queries/sharedQueries.ts

import { WatchedQuery } from '@powersync/web';

// ⚡ Query مشتركة بين عدة components
export const productsQuery = new WatchedQuery({
  sqlStatement: 'SELECT * FROM products WHERE organization_id = ?',
  parameters: [],
});

// في أي component:
import { useWatchedQuerySubscription } from '@powersync/react';
import { productsQuery } from '@/queries/sharedQueries';

function ProductList() {
  const { data, isLoading } = useWatchedQuerySubscription(productsQuery);
  // ⚡ يستخدم الـ cache! لا يعيد الاستعلام
}
```

#### 3.4 استخدام Differential Queries

```typescript
// src/hooks/useOrdersLive.ts

import { usePowerSync } from '@powersync/react';
import { useCallback, useState, useEffect } from 'react';

export function useOrdersLive(organizationId: string) {
  const powerSync = usePowerSync();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // ⚡ Differential Watch - يرجع فقط التغييرات
    const query = powerSync.query(
      'SELECT * FROM orders WHERE organization_id = ? ORDER BY created_at DESC',
      [organizationId]
    );

    const subscription = query.differentialWatch({
      onDiff: (diff) => {
        // diff.added, diff.removed, diff.updated
        setOrders(prev => {
          const newOrders = [...prev];

          // إضافة الجديد
          diff.added.forEach(order => newOrders.push(order));

          // حذف المحذوف
          diff.removed.forEach(order => {
            const idx = newOrders.findIndex(o => o.id === order.id);
            if (idx !== -1) newOrders.splice(idx, 1);
          });

          // تحديث المعدل
          diff.updated.forEach(order => {
            const idx = newOrders.findIndex(o => o.id === order.id);
            if (idx !== -1) newOrders[idx] = order;
          });

          return newOrders;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [powerSync, organizationId]);

  return orders;
}
```

---

### المرحلة 4: TanStack Query Integration (اختياري)

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ لا حاجة لـ refetch - PowerSync يدير التحديثات
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```

```typescript
// src/hooks/useProductsWithCache.ts

import { usePowerSyncQuery } from '@powersync/tanstack-react-query';

export function useProductsWithCache(orgId: string) {
  // ⚡ يجمع بين PowerSync reactivity و TanStack caching
  return usePowerSyncQuery({
    queryKey: ['products', orgId],
    query: {
      sql: 'SELECT * FROM products WHERE organization_id = ?',
      parameters: [orgId],
    },
  });
}
```

---

### المرحلة 5: تحسينات PRAGMA (للأداء)

```typescript
// في PowerSyncService.initialize()

await this.db.execute('PRAGMA journal_mode = WAL');
await this.db.execute('PRAGMA synchronous = NORMAL');
await this.db.execute('PRAGMA cache_size = -20000'); // 20MB cache
await this.db.execute('PRAGMA temp_store = MEMORY');
```

---

## الملفات التي يجب تعديلها

### 1. حذف الملفات (لم تعد مطلوبة)

```
❌ src/lib/powersync/PowerSyncService.ts  → إعادة كتابة
❌ src/hooks/powersync/usePowerSyncQuery.ts → استخدام @powersync/react
❌ src/components/navbar/sync/useSyncStats.ts → تبسيط
```

### 2. إنشاء ملفات جديدة

```
✅ src/context/PowerSyncProvider.tsx
✅ src/queries/sharedQueries.ts
✅ src/hooks/products/useProducts.ts
✅ src/hooks/orders/useOrders.ts
✅ src/hooks/categories/useCategories.ts
```

### 3. تعديل package.json

```json
{
  "dependencies": {
    "@powersync/web": "^1.29.1",
    "@powersync/react": "^1.7.2",
    "@powersync/tanstack-react-query": "^0.2.0"
  }
}
```

---

## مقارنة الأداء المتوقع

| المقياس | قبل | بعد |
|---------|-----|-----|
| Queue Timeout | كثير | لا يوجد |
| Re-renders | كل تغيير | فقط عند الحاجة |
| Memory Usage | عالي | منخفض (caching) |
| First Load | بطيء | سريع |
| Reactivity | يدوي | تلقائي |

---

## خطة التنفيذ

### الأسبوع 1: الأساسيات
1. تحديث dependencies
2. إعادة كتابة PowerSyncService (مبسط)
3. إنشاء PowerSyncProvider

### الأسبوع 2: تحويل Hooks
1. استبدال `getAll()` بـ `useQuery()`
2. إنشاء shared queries للبيانات المشتركة
3. تحويل useSyncStats

### الأسبوع 3: التحسينات
1. إضافة differential queries للطلبات
2. تحسين PRAGMA settings
3. اختبار الأداء

### الأسبوع 4: التنظيف
1. حذف الكود القديم
2. توثيق النظام الجديد
3. اختبار شامل

---

## المصادر

- [PowerSync SQLite Optimizations](https://www.powersync.com/blog/sqlite-optimizations-for-ultra-high-performance)
- [PowerSync Production Readiness Guide](https://docs.powersync.com/resources/production-readiness-guide)
- [PowerSync Watch Queries](https://docs.powersync.com/usage/use-case-examples/watch-queries)
- [PowerSync React Hooks](https://powersync-ja.github.io/powersync-js/react-sdk)
- [SQLite Persistence on Web](https://www.powersync.com/blog/sqlite-persistence-on-the-web)
- [PowerSync Tauri Template](https://github.com/romatallinn/powersync-tauri)
- [PowerSync JS SDK Releases](https://releases.powersync.com/announcements/powersync-js-web-client-sdk)
