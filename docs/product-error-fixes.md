# حلول مشكلة "Produit Introuvable" في صفحة شراء المنتج

## المشكلة
في بعض الأحيان عند تحديث أو الدخول في صفحة شراء المنتج، يظهر خطأ "Produit Introuvable" (المنتج غير موجود) رغم أن المنتج موجود وكان يعمل عادي.

## أسباب المشكلة المحتملة

### 1. مشاكل في جلب البيانات
- فشل في استدعاء RPC functions
- مشاكل في التزامن بين الطلبات المتعددة
- أخطاء في API calls

### 2. مشاكل في التخزين المؤقت (Cache)
- بيانات cache منتهية الصلاحية
- تضارب في cache keys
- مشاكل في cache invalidation

### 3. مشاكل في قاعدة البيانات
- استعلامات بطيئة
- مشاكل في الاتصال
- أخطاء في RPC functions

## الحلول المطبقة

### 1. تحسين معالجة الأخطاء في `useProductData`

#### إضافة Retry Logic
```typescript
// محاولة جلب البيانات مع إعادة المحاولة للمشاكل المتقطعة
let retryCount = 0;
const maxRetries = 3;

while (retryCount <= maxRetries) {
  try {
    // المحاولة الأولى: الدالة المحسنة
    response = await getProductCompleteDataOptimized(productId, {
      organizationId,
      dataScope: dataScope,
      forceRefresh: retryCount > 0
    });
  } catch (optimizedError) {
    // المحاولة الثانية: الدالة العادية
    try {
      const { getProductCompleteData } = await import('@/lib/api/productComplete');
      response = await getProductCompleteData(productId, {
        organizationId,
        dataScope: dataScope
      });
    } catch (fallbackError) {
      // المحاولة الثالثة: استعلام مباشر بسيط
      if (retryCount === maxRetries - 1) {
        // استخدام استعلام Supabase مباشر
        const { data: simpleData } = await supabase
          .from('products')
          .select('id, name, description, slug, is_active')
          .or(`id.eq.${productId},slug.eq.${productId}`)
          .eq('is_active', true)
          .maybeSingle();
      }
    }
  }
}
```

#### Fallback Mechanisms
- استخدام `getProductCompleteDataOptimized` أولاً
- التراجع لـ `getProductCompleteData` إذا فشلت الأولى
- استخدام استعلام Supabase مباشر كحل أخير

### 2. تحسين معالجة الأخطاء في `ProductPurchasePageV3`

#### إضافة Retry State Management
```typescript
// تحسين معالجة الأخطاء - إضافة retry logic
const [retryCount, setRetryCount] = useState(0);
const maxRetries = 3;

// دالة إعادة المحاولة محسنة
const handleRetry = useCallback(async () => {
  if (retryCount >= maxRetries) {
    // إذا تم استنفاذ المحاولات، إعادة تحميل الصفحة
    window.location.reload();
    return;
  }

  setRetryCount(prev => prev + 1);
  
  try {
    // محاولة إعادة جلب البيانات
    if (unifiedData.refetch) {
      await unifiedData.refetch();
    }
    
    // إعادة تعيين حالة الخطأ
    setPageState(prev => ({ 
      ...prev, 
      showValidationErrors: false, 
      hasTriedToSubmit: false 
    }));
    
  } catch (error) {
    console.error('❌ [ProductPurchasePageV3] فشل في إعادة المحاولة:', error);
    
    // إذا فشلت إعادة المحاولة، انتظار قليل ثم إعادة المحاولة
    setTimeout(() => {
      if (retryCount < maxRetries - 1) {
        handleRetry();
      }
    }, 1000 * (retryCount + 1));
  }
}, [retryCount, maxRetries, unifiedData.refetch]);
```

### 3. تحسين `ProductErrorPage`

#### إضافة معلومات التشخيص
```typescript
interface ProductErrorPageProps {
  error?: string;
  onRetry?: () => void;
  className?: string;
  retryCount?: number;
  maxRetries?: number;
  productId?: string;
  organizationId?: string;
}
```

#### عرض معلومات التشخيص
```typescript
{/* معلومات التشخيص */}
{diagnosticInfo && (
  <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/30">
    <p className="text-xs font-mono text-muted-foreground/80 mb-2">
      معلومات التشخيص (التطوير فقط):
    </p>
    <div className="text-xs text-muted-foreground/60 space-y-1">
      <div>Product ID: {diagnosticInfo.productId || 'غير محدد'}</div>
      <div>Organization ID: {diagnosticInfo.organizationId || 'غير محدد'}</div>
      <div>المحاولات: {diagnosticInfo.retryCount}/{diagnosticInfo.maxRetries}</div>
      <div>الوقت: {new Date(diagnosticInfo.timestamp).toLocaleTimeString('ar-SA')}</div>
    </div>
  </div>
)}

{/* عرض عدد المحاولات */}
{retryCount > 0 && (
  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
    <p className="text-xs text-orange-700 dark:text-orange-300">
      تمت المحاولة {retryCount} من {maxRetries} مرات
    </p>
    {retryCount >= maxRetries && (
      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
        تم استنفاذ جميع المحاولات. سيتم إعادة تحميل الصفحة تلقائياً.
      </p>
    )}
  </div>
)}
```

## التحسينات الإضافية

### 1. تحسين Cache Management
- تقليل TTL للتخزين المؤقت
- إضافة cache invalidation ذكي
- منع الطلبات المكررة

### 2. تحسين Error Handling
- رسائل خطأ أكثر وضوحاً
- إضافة معلومات التشخيص
- تسجيل الأخطاء بشكل أفضل

### 3. تحسين Performance
- استخدام lazy loading للمكونات
- تحسين bundle size
- إضافة skeleton loading

## كيفية الاختبار

### 1. اختبار Retry Logic
- افتح صفحة منتج
- افتح Developer Tools
- اقطع الاتصال بالإنترنت مؤقتاً
- راقب رسائل Retry في Console

### 2. اختبار Fallback Mechanisms
- تأكد من أن RPC functions تعمل
- اختبر مع منتجات مختلفة
- راقب Console للأخطاء

### 3. اختبار Cache
- افتح صفحة منتج
- أعد تحميل الصفحة
- راقب سرعة التحميل

## المراقبة والتشخيص

### 1. Console Logs
- رسائل Retry
- أخطاء Fallback
- معلومات Cache

### 2. Network Tab
- RPC calls
- Cache hits/misses
- Response times

### 3. Performance Metrics
- Time to First Byte
- Cache hit ratio
- Error rates

## الخلاصة

تم تطبيق مجموعة شاملة من الحلول لمعالجة مشكلة "Produit Introuvable":

1. **Retry Logic**: إعادة المحاولة تلقائياً مع تأخير تدريجي
2. **Fallback Mechanisms**: استخدام مصادر بيانات بديلة عند الفشل
3. **Better Error Handling**: رسائل خطأ واضحة مع معلومات تشخيصية
4. **Cache Optimization**: تحسين إدارة التخزين المؤقت
5. **Performance Monitoring**: إضافة logs وmetrics للتشخيص

هذه التحسينات ستقلل بشكل كبير من ظهور هذه المشكلة وستوفر تجربة مستخدم أفضل.
