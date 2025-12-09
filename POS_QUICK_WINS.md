# 🚀 إجراءات فورية لتحسين نقطة البيع
## Quick Wins - تحسينات سريعة يمكن تنفيذها فوراً

---

## 📌 الإجراء #1: تحسين PRAGMA Settings (5 دقائق)

### الملف: `src/lib/powersync/PowerSyncService.ts`

**الموقع:** دالة `applyPragmaOptimizations()` (السطر 307)

**التغيير المطلوب:**
```typescript
// ⬆️ تحديث PRAGMA settings لأداء أفضل
private async applyPragmaOptimizations(): Promise<void> {
  if (!this.db) return;

  console.log('[PowerSyncService] 🔧 Applying optimized PRAGMA settings...');

  const optimizedPragmas = [
    // ⬆️ زيادة Cache من 20MB إلى 50MB
    { sql: 'PRAGMA cache_size = -50000', name: 'Cache size (50MB)' },
    { sql: 'PRAGMA temp_store = MEMORY', name: 'Temp store in memory' },
    // ✅ جديد - page size أكبر لقراءة أسرع
    { sql: 'PRAGMA page_size = 8192', name: 'Page size 8KB' },
    // ✅ جديد - memory-mapped I/O للأداء
    { sql: 'PRAGMA mmap_size = 268435456', name: 'Memory-map 256MB' },
  ];

  for (const pragma of optimizedPragmas) {
    try {
      await this.db.execute(pragma.sql);
      console.log(`[PowerSyncService] ✅ ${pragma.name} applied`);
    } catch (error) {
      console.log(`[PowerSyncService] ℹ️ ${pragma.name} not supported`);
    }
  }
}
```

---

## 📌 الإجراء #2: إضافة فهارس مفقودة (10 دقائق)

### الملف: `src/lib/powersync/PowerSyncSchema.ts`

**الموقع:** تعريف جدول `products` (السطر 31)

**إضافة الفهارس:**
```typescript
const products = new Table(
  {
    // ... الأعمدة الحالية
  },
  {
    indexes: {
      // ⚡ الفهارس الحالية
      org: ['organization_id'],
      sku: ['sku'],
      barcode: ['barcode'],
      org_category_active: ['organization_id', 'category_id', 'is_active'],
      org_active: ['organization_id', 'is_active'],
      org_name: ['organization_id', 'name'],
      org_stock: ['organization_id', 'stock_quantity'],
      
      // ✅ فهارس جديدة للأداء
      org_barcode: ['organization_id', 'barcode'],           // بحث بالباركود
      org_sku: ['organization_id', 'sku'],                   // بحث بـ SKU
      org_updated: ['organization_id', 'updated_at'],        // مزامنة تفاضلية
      org_created: ['organization_id', 'created_at'],        // ترتيب زمني
    }
  }
);
```

**إضافة فهارس لـ orders:**
```typescript
const orders = new Table(
  { /* ... */ },
  {
    indexes: {
      // ... الفهارس الحالية
      
      // ✅ فهارس جديدة
      org_payment_status: ['organization_id', 'payment_status'],  // فلترة الدفع
      org_employee: ['organization_id', 'employee_id'],           // طلبات الموظف
    }
  }
);
```

---

## 📌 الإجراء #3: تقليل re-renders في المنتجات (15 دقيقة)

### الملف: `src/hooks/powersync/useReactiveProducts.ts`

**المشكلة:** كل تغيير يعيد render جميع المنتجات

**الحل:**
```typescript
import { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

export function useReactiveProducts(options: UseReactiveProductsOptions = {}): UseReactiveProductsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    categoryId,
    isActive = true,
    limit = 100,  // ⬇️ تقليل من 500 إلى 100
    searchTerm
  } = options;

  // ⚡ Memoized SQL builder
  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = 'SELECT * FROM products WHERE organization_id = ?';
    const queryParams: any[] = [orgId];

    if (isActive !== undefined) {
      query += ' AND (is_active = ? OR is_active IS NULL)';
      queryParams.push(isActive ? 1 : 0);
    }

    if (categoryId) {
      query += ' AND category_id = ?';
      queryParams.push(categoryId);
    }

    if (searchTerm && searchTerm.length >= 2) {
      // ⚡ استخدام LIKE فقط على الأعمدة المفهرسة
      query += ' AND (name LIKE ? OR barcode = ? OR sku = ?)';
      queryParams.push(`%${searchTerm}%`, searchTerm, searchTerm);
    }

    query += ' ORDER BY name LIMIT ?';
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, categoryId, isActive, searchTerm, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveProduct>(sql, params);

  // ⚡ Memoized transformation
  const products = useMemo(() => {
    if (!data) return [];
    return data.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      quantity: Number(p.quantity) || 0,
      min_quantity: p.min_quantity ? Number(p.min_quantity) : null,
      is_active: Boolean(p.is_active),
    }));
  }, [data]);

  return {
    products,
    isLoading,
    isFetching,
    error: error || null,
    total: products.length
  };
}
```

---

## 📌 الإجراء #4: إضافة Debounce للبحث (10 دقائق)

### ملف جديد: `src/hooks/useSearchDebounced.ts`

```typescript
import { useState, useEffect, useRef } from 'react';

interface UseSearchDebouncedOptions {
  delay?: number;
  minLength?: number;
}

export function useSearchDebounced(
  initialValue: string = '',
  options: UseSearchDebouncedOptions = {}
) {
  const { delay = 300, minLength = 2 } = options;
  
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // إلغاء المؤقت السابق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // إذا كان النص قصير جداً، إفراغ البحث فوراً
    if (inputValue.length < minLength && inputValue.length > 0) {
      return;
    }

    // إذا أفرغ الحقل، تحديث فوري
    if (inputValue.length === 0) {
      setDebouncedValue('');
      return;
    }

    // انتظار قبل تحديث القيمة
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, delay, minLength]);

  return {
    inputValue,
    setInputValue,
    debouncedValue,
    isDebouncing: inputValue !== debouncedValue,
  };
}
```

**استخدام في POS:**
```typescript
// في ProductCatalog.tsx أو ProductSearch.tsx
const { inputValue, setInputValue, debouncedValue, isDebouncing } = useSearchDebounced('', {
  delay: 300,
  minLength: 2
});

const { products, isLoading } = useReactiveProducts({
  searchTerm: debouncedValue,  // ⚡ استخدام القيمة المؤجلة
  limit: 50
});
```

---

## 📌 الإجراء #5: تحسين Status Indicator (10 دقائق)

### الملف: `src/components/pos/WorkSessionIndicator.tsx`

**إضافة مؤشر المزامنة:**
```typescript
import { usePowerSyncStatus } from '@/hooks/powersync/usePowerSyncStatus';
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react';

export function SyncStatusIndicator() {
  const { connected, hasSynced, uploading, downloading } = usePowerSyncStatus();

  const getStatusInfo = () => {
    if (!connected) {
      return {
        icon: <CloudOff className="w-4 h-4 text-red-500" />,
        text: 'غير متصل',
        color: 'text-red-500'
      };
    }
    
    if (uploading || downloading) {
      return {
        icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
        text: uploading ? 'جاري الرفع...' : 'جاري التحميل...',
        color: 'text-blue-500'
      };
    }
    
    if (hasSynced) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        text: 'متزامن',
        color: 'text-green-500'
      };
    }
    
    return {
      icon: <Cloud className="w-4 h-4 text-yellow-500" />,
      text: 'في انتظار المزامنة',
      color: 'text-yellow-500'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="flex items-center gap-2">
      {status.icon}
      <span className={`text-sm ${status.color}`}>{status.text}</span>
    </div>
  );
}
```

---

## 📌 الإجراء #6: تقليل حجم البيانات المحملة (15 دقيقة)

### الملف: `src/hooks/useUnifiedPOSData.ts`

**تحسين `loadInitialDataFromLocalDB`:**
```typescript
// ⬇️ تقليل الأعمدة المجلوبة
const loadInitialDataFromLocalDB = async (
  orgId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string
) => {
  // ⚡ جلب الأعمدة الضرورية فقط
  const essentialColumns = `
    id, name, sku, barcode, price, stock_quantity, 
    thumbnail_image, category_id, is_active, has_variants
  `;
  
  let productsQuery = `
    SELECT ${essentialColumns} FROM products 
    WHERE organization_id = ? AND (is_active = 1 OR is_active IS NULL)
  `;
  const queryParams: any[] = [orgId];
  
  // ... بقية الفلترة
  
  // ⚡ LIMIT مع OFFSET للـ pagination الحقيقي
  productsQuery += ` ORDER BY name LIMIT ? OFFSET ?`;
  queryParams.push(limit, (page - 1) * limit);
  
  const result = await powerSyncService.query({
    sql: productsQuery,
    params: queryParams
  });
  
  return result;
};
```

---

## 📌 الإجراء #7: تحسين Connection Handling (10 دقائق)

### الملف: `src/lib/powersync/PowerSyncService.ts`

**تحسين `connectToBackend`:**
```typescript
private async connectToBackend(): Promise<void> {
  if (!this.db) return;

  const powerSyncUrl = (import.meta as any).env?.VITE_POWERSYNC_URL || '';

  if (!powerSyncUrl) {
    console.warn('[PowerSyncService] ⚠️ VITE_POWERSYNC_URL not set - local-only mode');
    return;
  }

  console.log('[PowerSyncService] 🔄 Connecting to PowerSync Backend...');

  // ⚡ Retry with exponential backoff
  let attempt = 0;
  const maxAttempts = 3;
  const baseDelay = 2000;

  while (attempt < maxAttempts) {
    try {
      await this.connector.fetchCredentials();

      const connectPromise = this.db.connect(this.connector);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('[PowerSyncService] ✅ Connected to PowerSync Backend');
      
      this.setupStatusListener();
      return; // ✅ نجح الاتصال
      
    } catch (error: any) {
      attempt++;
      console.warn(`[PowerSyncService] ⚠️ Connection attempt ${attempt}/${maxAttempts} failed:`, error?.message);
      
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[PowerSyncService] ⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[PowerSyncService] ❌ Failed to connect after all attempts');
  // ⚡ العمل في وضع offline
  this.setupOfflineMode();
}

private setupOfflineMode(): void {
  console.log('[PowerSyncService] 📴 Operating in offline mode');
  // إعداد listener لإعادة الاتصال تلقائياً
  window.addEventListener('online', async () => {
    console.log('[PowerSyncService] 🌐 Network restored, attempting reconnection...');
    await this.connectToBackend();
  });
}
```

---

## 📌 الإجراء #8: إضافة Loading Skeleton (10 دقائق)

### ملف جديد: `src/components/pos/ProductGridSkeleton.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 12 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg p-3 space-y-2">
          {/* صورة المنتج */}
          <Skeleton className="aspect-square rounded-md" />
          {/* اسم المنتج */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          {/* السعر */}
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// استخدام:
// {isLoading ? <ProductGridSkeleton /> : <ProductGrid products={products} />}
```

---

## 📊 ملخص الإجراءات الفورية

| الإجراء | الوقت | التأثير | الأولوية |
|---------|-------|---------|----------|
| تحسين PRAGMA | 5 دقائق | أداء SQLite | 🔴 عالية |
| إضافة فهارس | 10 دقائق | سرعة البحث | 🔴 عالية |
| تقليل re-renders | 15 دقيقة | استجابة UI | 🔴 عالية |
| Debounce للبحث | 10 دقائق | تجربة المستخدم | 🟠 متوسطة |
| مؤشر المزامنة | 10 دقائق | وضوح الحالة | 🟠 متوسطة |
| تقليل البيانات | 15 دقيقة | استهلاك الذاكرة | 🔴 عالية |
| Connection Retry | 10 دقائق | موثوقية | 🔴 عالية |
| Loading Skeleton | 10 دقائق | تجربة المستخدم | 🟡 منخفضة |

**الوقت الإجمالي:** ~85 دقيقة (ساعة ونصف تقريباً)

**التحسن المتوقع:**
- ⚡ تحسين 40-50% في سرعة التحميل
- ⚡ تقليل 30% في استهلاك الذاكرة
- ⚡ تحسين 60% في استجابة البحث
- ⚡ تجربة مستخدم أفضل بكثير
