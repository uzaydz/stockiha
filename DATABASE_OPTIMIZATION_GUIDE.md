# دليل تحسين أداء قاعدة البيانات

## نظرة عامة

تم تطبيق نظام شامل لتحسين أداء قاعدة البيانات وتقليل الضغط عليها من خلال:

1. **نظام تخزين مؤقت مركزي** (CentralCacheManager)
2. **عميل Supabase محسن** (OptimizedSupabaseClient)
3. **دوال قاعدة بيانات محسنة**
4. **نظام مراقبة الأداء**

## المكونات الرئيسية

### 1. CentralCacheManager
موقع الملف: `src/lib/cache/CentralCacheManager.ts`

#### الميزات:
- **LRU Cache** بحد أقصى 500 عنصر و 50MB
- **Stale-while-revalidate**: تقديم البيانات القديمة أثناء التحديث
- **تخزين متعدد الطبقات**: ذاكرة، جلسة، تخزين محلي
- **إحصائيات مفصلة** لمعدل الإصابة والأخطاء

#### مثال الاستخدام:
```typescript
import { cacheManager } from '@/lib/cache/CentralCacheManager';

// جلب البيانات مع التخزين المؤقت
const data = await cacheManager.get(
  'products_list',
  async () => fetchProductsFromAPI(),
  { 
    ttl: 5 * 60 * 1000, // 5 دقائق
    staleWhileRevalidate: 30 * 1000 // 30 ثانية
  }
);
```

### 2. OptimizedSupabaseClient
موقع الملف: `src/lib/supabase/OptimizedSupabaseClient.ts`

#### الميزات:
- **تجميع الاستعلامات** (Batch Queries)
- **إعادة المحاولة الذكية** مع Exponential Backoff
- **Prefetching** للبيانات الشائعة
- **إبطال ذكي للكاش**

#### مثال الاستخدام:
```typescript
import { optimizedSupabase } from '@/lib/supabase/OptimizedSupabaseClient';

// Prefetch البيانات الشائعة
await optimizedSupabase.prefetchCommonData(organizationId);

// جلب البيانات مع التخزين المؤقت
const products = await optimizedSupabase.fetchWithCache(
  'products',
  (query) => query.select('*').eq('organization_id', orgId),
  `products_${orgId}`,
  { ttl: 5 * 60 * 1000 }
);
```

### 3. useOptimizedQuery Hook
موقع الملف: `src/hooks/useOptimizedQuery.ts`

#### الميزات:
- تكامل مع React Query ونظام التخزين المؤقت
- إبطال تلقائي عند تغيير البيانات
- دعم الاستعلامات المجمعة

#### مثال الاستخدام:
```typescript
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

function MyComponent() {
  const { data, isLoading } = useOptimizedQuery(
    ['products', organizationId],
    () => fetchProducts(organizationId),
    {
      staleTime: 5 * 60 * 1000,
      invalidateOn: ['products', 'categories']
    }
  );
}
```

### 4. دوال قاعدة البيانات المحسنة

#### الدوال المتاحة:
1. **`get_dashboard_data`**: جلب جميع بيانات لوحة التحكم في استعلام واحد
2. **`get_products_with_categories`**: منتجات مع تصنيفات
3. **`get_customers_with_stats`**: عملاء مع إحصائياتهم
4. **`get_pos_order_stats`**: إحصائيات طلبيات نقطة البيع

#### مثال الاستخدام:
```sql
SELECT * FROM get_dashboard_data('organization-id-here');
```

## مراقبة الأداء

### 1. PerformanceMonitor Component
موقع الملف: `src/components/debug/PerformanceMonitor.tsx`

يعرض إحصائيات في الوقت الفعلي عن:
- معدل إصابة الكاش
- عدد الاستعلامات النشطة
- استخدام الذاكرة
- نصائح لتحسين الأداء

### 2. QueryInterceptor
موقع الملف: `src/lib/supabase/QueryInterceptor.ts`

في وضع التطوير، يمكن الوصول إلى إحصائيات الاستعلامات:
```javascript
// في وحدة تحكم المتصفح
window.__queryInterceptor.generateReport();
window.__queryInterceptor.getStats();
```

## أفضل الممارسات

### 1. استخدام Prefetching
```typescript
// في بداية الصفحة
useEffect(() => {
  if (organizationId) {
    optimizedSupabase.prefetchCommonData(organizationId);
  }
}, [organizationId]);
```

### 2. تحديد TTL مناسب
```typescript
// بيانات ثابتة - TTL طويل
const categories = await fetchWithCache(..., { ttl: 60 * 60 * 1000 }); // 1 ساعة

// بيانات ديناميكية - TTL قصير
const orders = await fetchWithCache(..., { ttl: 30 * 1000 }); // 30 ثانية
```

### 3. استخدام invalidateOn
```typescript
const { data } = useOptimizedQuery(
  ['orders'],
  fetchOrders,
  {
    // تحديث تلقائي عند تغيير الطلبيات أو المنتجات
    invalidateOn: ['orders', 'products']
  }
);
```

### 4. تجميع الاستعلامات
```typescript
const { data } = useBatchQueries([
  { key: 'products', fetcher: fetchProducts },
  { key: 'categories', fetcher: fetchCategories },
  { key: 'customers', fetcher: fetchCustomers }
]);
```

## الفهارس المحسنة

تم إنشاء فهارس محسنة لتسريع الاستعلامات الشائعة:

1. **idx_orders_pos_queries**: لاستعلامات طلبيات نقطة البيع
2. **idx_orders_search_text**: للبحث النصي
3. **idx_products_search**: للبحث في المنتجات
4. **idx_customers_search**: للبحث في العملاء

## النتائج المتوقعة

- **تقليل الاستعلامات بنسبة 70-80%**
- **تحسين سرعة التحميل بنسبة 3-5x**
- **تقليل استهلاك النطاق الترددي بنسبة 60%**
- **تحسين تجربة المستخدم بشكل كبير**

## استكشاف الأخطاء

### 1. معدل إصابة كاش منخفض
- تحقق من قيم TTL
- تأكد من استخدام مفاتيح كاش ثابتة
- راجع إعدادات staleWhileRevalidate

### 2. استعلامات متكررة
- استخدم QueryInterceptor لتحديد الاستعلامات المتكررة
- طبق debouncing على الفلاتر والبحث
- استخدم prefetching للبيانات الشائعة

### 3. أداء بطيء
- تحقق من حجم الكاش (قد يكون ممتلئ)
- راجع الفهارس في قاعدة البيانات
- استخدم الدوال المحسنة بدلاً من الاستعلامات المتعددة