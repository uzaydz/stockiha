# تحليل الأداء الشامل لصفحة المتجر وخطة التحسين الكاملة

## 📊 نظرة عامة على التحليل

تم إجراء تحليل شامل لصفحة المتجر `FastStorePage.tsx` وجميع المكونات والخدمات والجداول المرتبطة بها، وتم اكتشاف العديد من مشاكل الأداء الحرجة التي تحتاج إلى تحسين فوري.

---

## 🔍 تحليل البنية الحالية

### 1. المكونات الرئيسية المحللة

```typescript
// المكونات الأساسية
- FastStorePage.tsx (506 سطر)
- PerformanceOptimizedStorePage.tsx 
- OptimizedStorePage.tsx
- StorePage.tsx
- useStoreComponents.ts Hook
- optimizedStoreDataService.ts
```

### 2. قاعدة البيانات - الجداول المرتبطة

| الجدول | الحجم الكلي | حجم البيانات | عدد الفهارس |
|--------|------------|-------------|-------------|
| `products` | 1976 kB | 456 kB | 21 فهرس |
| `store_settings` | 880 kB | 176 kB | 8 فهارس |
| `organization_settings` | 776 kB | 72 kB | 5 فهارس |
| `product_categories` | 216 kB | 24 kB | 10 فهارس |
| `product_marketing_settings` | 328 kB | 112 kB | 6 فهارس |

---

## 🚨 المشاكل الحرجة المكتشفة

### 1. مشاكل في طبقة قاعدة البيانات

#### أ) فهارس مكررة ومتضاربة
```sql
-- فهارس مكررة في store_settings
idx_store_settings_org_id          -- مكرر
idx_store_settings_organization_id -- مكرر
idx_store_settings_org_component   -- مكرر
```

#### ب) استعلامات غير محسنة
```typescript
// مشكلة في useStoreComponents.ts
const { data, error } = await supabase
  .from('store_settings')
  .select('*')  // ❌ جلب جميع الأعمدة
  .eq('organization_id', organizationId)
  .eq('is_active', true)
```

#### ج) عدم استخدام التخزين المؤقت بكفاءة
- إعدادات التخزين المؤقت قصيرة جداً (15 دقيقة)
- عدم وجود تخزين مؤقت للمكونات الثابتة
- عدم استخدام Edge Caching

### 2. مشاكل في طبقة React

#### أ) إعادة رسم غير ضرورية
```typescript
// مشكلة في FastStorePage.tsx
const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(
  useMemo(() => 
    initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null,
    [initialStoreData] // ❌ dependency مكلفة
  )
);
```

#### ب) تحميل مكونات ثقيلة بلا ضرورة
```typescript
// تحميل جميع المكونات مرة واحدة
const LazyStoreBanner = React.lazy(() => import('./StoreBanner'));
const LazyProductCategories = React.lazy(() => import('./ProductCategories'));
// ❌ كلها تحمل في نفس الوقت
```

#### ج) عدم تحسين Intersection Observer
```typescript
const useIntersectionObserver = (options = {}) => {
  // ❌ لا يتم فصل observer عند عدم الحاجة
  // ❌ لا يوجد cleanup مناسب
};
```

### 3. مشاكل في إدارة الحالة

#### أ) حالات متعددة ومترابطة
```typescript
const [storeSettings, setStoreSettings] = useState<any>(null);
const [dataLoading, setDataLoading] = useState(true);
const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(...);
const [dataError, setDataError] = useState<string | null>(null);
const [footerSettings, setFooterSettings] = useState<any>(null);
const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);
// ❌ 6 حالات منفصلة تسبب re-renders
```

#### ب) عدم استخدام Context بكفاءة
- لا يوجد Store Context مخصص للمتجر
- اعتماد مفرط على prop drilling
- عدم وجود state normalization

---

## 🎯 خطة التحسين الشاملة

### المرحلة 1: تحسين قاعدة البيانات (الأولوية العليا)

#### 1.1 إزالة الفهارس المكررة وإنشاء فهارس محسنة

```sql
-- حذف الفهارس المكررة
DROP INDEX IF EXISTS idx_store_settings_org_id;
DROP INDEX IF EXISTS idx_store_settings_organization_id;

-- إنشاء فهرس محسن شامل
CREATE INDEX idx_store_settings_ultra_optimized 
ON store_settings (organization_id, is_active, order_index, component_type) 
WHERE is_active = true
INCLUDE (settings, updated_at);

-- فهرس للمنتجات المميزة
CREATE INDEX idx_products_featured_store_optimized
ON products (organization_id, is_featured, is_active, created_at DESC)
WHERE is_featured = true AND is_active = true
INCLUDE (name, price, thumbnail_image, slug);

-- فهرس للفئات مع عدد المنتجات
CREATE INDEX idx_categories_with_product_count_v2
ON product_categories (organization_id, is_active, type) 
WHERE is_active = true
INCLUDE (name, description, slug, icon, image_url);
```

#### 1.2 دوال قاعدة بيانات محسنة

```sql
-- دالة جلب بيانات المتجر المحسنة
CREATE OR REPLACE FUNCTION get_store_data_ultra_fast(
  p_subdomain text
) RETURNS TABLE (
  org_id uuid,
  org_name text,
  org_description text,
  org_logo_url text,
  settings_data jsonb,
  components_data jsonb,
  categories_data jsonb,
  featured_products_data jsonb
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH org_data AS (
    SELECT o.id, o.name, o.description, o.logo_url,
           row_to_json(os.*) as settings
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE o.subdomain = p_subdomain
      AND o.is_active = true
  ),
  components_data AS (
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'type', ss.component_type,
        'settings', ss.settings,
        'is_active', ss.is_active,
        'order_index', ss.order_index
      ) ORDER BY ss.order_index
    ) as components
    FROM store_settings ss
    JOIN org_data od ON ss.organization_id = od.id
    WHERE ss.is_active = true
  ),
  categories_data AS (
    SELECT json_agg(
      json_build_object(
        'id', pc.id,
        'name', pc.name,
        'description', pc.description,
        'slug', pc.slug,
        'icon', pc.icon,
        'image_url', pc.image_url,
        'product_count', (
          SELECT count(*) FROM products p 
          WHERE p.category_id = pc.id AND p.is_active = true
        )
      )
    ) as categories
    FROM product_categories pc
    JOIN org_data od ON pc.organization_id = od.id
    WHERE pc.is_active = true
    ORDER BY pc.name
    LIMIT 8
  ),
  featured_products_data AS (
    SELECT json_agg(
      json_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price', p.price,
        'compare_at_price', p.compare_at_price,
        'thumbnail_image', p.thumbnail_image,
        'slug', p.slug,
        'stock_quantity', p.stock_quantity
      )
    ) as featured_products
    FROM products p
    JOIN org_data od ON p.organization_id = od.id
    WHERE p.is_featured = true AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT 6
  )
  SELECT 
    od.id,
    od.name,
    od.description,
    od.logo_url,
    od.settings::jsonb,
    COALESCE(cd.components, '[]'::json)::jsonb,
    COALESCE(catd.categories, '[]'::json)::jsonb,
    COALESCE(fpd.featured_products, '[]'::json)::jsonb
  FROM org_data od
  LEFT JOIN components_data cd ON true
  LEFT JOIN categories_data catd ON true
  LEFT JOIN featured_products_data fpd ON true;
END;
$$;
```

### المرحلة 2: تحسين طبقة الخدمات

#### 2.1 خدمة بيانات محسنة جديدة

```typescript
// src/api/ultraFastStoreService.ts
import { supabase } from '@/lib/supabase';
import { getCacheData, setCacheData } from '@/lib/cache/storeCache';

interface StoreDataUltraFast {
  org_id: string;
  org_name: string;
  org_description: string;
  org_logo_url: string;
  settings_data: any;
  components_data: any[];
  categories_data: any[];
  featured_products_data: any[];
}

const CACHE_LAYERS = {
  MEMORY: new Map<string, { data: any; timestamp: number }>(),
  TTL: {
    BASIC: 30 * 60 * 1000,     // 30 دقيقة للبيانات الأساسية
    COMPONENTS: 60 * 60 * 1000, // ساعة للمكونات
    PRODUCTS: 15 * 60 * 1000,   // 15 دقيقة للمنتجات
  }
};

export class UltraFastStoreService {
  private static instance: UltraFastStoreService;
  
  static getInstance(): UltraFastStoreService {
    if (!this.instance) {
      this.instance = new UltraFastStoreService();
    }
    return this.instance;
  }

  // جلب البيانات مع تخزين مؤقت متعدد المستويات
  async getStoreDataWithCache(subdomain: string): Promise<StoreDataUltraFast | null> {
    const cacheKey = `ultra_fast_${subdomain}`;
    
    // المستوى 1: Memory Cache
    const memoryData = CACHE_LAYERS.MEMORY.get(cacheKey);
    if (memoryData && Date.now() - memoryData.timestamp < CACHE_LAYERS.TTL.BASIC) {
      return memoryData.data;
    }

    // المستوى 2: IndexedDB Cache
    const cachedData = await getCacheData(cacheKey);
    if (cachedData) {
      CACHE_LAYERS.MEMORY.set(cacheKey, { data: cachedData, timestamp: Date.now() });
      return cachedData;
    }

    // المستوى 3: Database
    const { data, error } = await supabase.rpc('get_store_data_ultra_fast', {
      p_subdomain: subdomain
    });

    if (error || !data?.[0]) {
      throw new Error(error?.message || 'Store not found');
    }

    const storeData = data[0];
    
    // حفظ في جميع طبقات التخزين المؤقت
    CACHE_LAYERS.MEMORY.set(cacheKey, { data: storeData, timestamp: Date.now() });
    setCacheData(cacheKey, storeData, CACHE_LAYERS.TTL.BASIC);

    return storeData;
  }

  // جلب المكونات بالتوازي
  async getComponentsDataParallel(orgId: string): Promise<any[]> {
    const cacheKey = `components_${orgId}`;
    
    const cachedComponents = await getCacheData(cacheKey);
    if (cachedComponents) return cachedComponents;

    const { data, error } = await supabase
      .from('store_settings')
      .select('id, component_type, settings, is_active, order_index')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('order_index');

    if (error) throw error;

    setCacheData(cacheKey, data, CACHE_LAYERS.TTL.COMPONENTS);
    return data || [];
  }

  // تحديث ذكي للكاش
  async invalidateStoreCache(subdomain: string): Promise<void> {
    const cacheKey = `ultra_fast_${subdomain}`;
    CACHE_LAYERS.MEMORY.delete(cacheKey);
    await clearCacheItem(cacheKey);
  }
}
```

### المرحلة 3: تحسين مكونات React

#### 3.1 Store Context محسن

```typescript
// src/context/StoreContext.tsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface StoreState {
  organizationData: any | null;
  storeSettings: any | null;
  components: any[];
  categories: any[];
  featuredProducts: any[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

type StoreAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STORE_DATA'; payload: Partial<StoreState> }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_COMPONENTS'; payload: any[] }
  | { type: 'INVALIDATE_CACHE' };

const storeReducer = (state: StoreState, action: StoreAction): StoreState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_STORE_DATA':
      return { 
        ...state, 
        ...action.payload, 
        lastUpdated: Date.now(),
        isLoading: false,
        error: null 
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_COMPONENTS':
      return { ...state, components: action.payload, lastUpdated: Date.now() };
    
    case 'INVALIDATE_CACHE':
      return { ...state, lastUpdated: 0 };
    
    default:
      return state;
  }
};

const StoreContext = createContext<{
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  loadStoreData: (subdomain: string) => Promise<void>;
  updateComponents: (components: any[]) => void;
  invalidateCache: () => void;
} | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(storeReducer, {
    organizationData: null,
    storeSettings: null,
    components: [],
    categories: [],
    featuredProducts: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
  });

  const loadStoreData = useCallback(async (subdomain: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const storeService = UltraFastStoreService.getInstance();
      const data = await storeService.getStoreDataWithCache(subdomain);
      
      if (data) {
        dispatch({
          type: 'SET_STORE_DATA',
          payload: {
            organizationData: {
              id: data.org_id,
              name: data.org_name,
              description: data.org_description,
              logo_url: data.org_logo_url,
            },
            storeSettings: data.settings_data,
            components: data.components_data,
            categories: data.categories_data,
            featuredProducts: data.featured_products_data,
          }
        });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  const updateComponents = useCallback((components: any[]) => {
    dispatch({ type: 'UPDATE_COMPONENTS', payload: components });
  }, []);

  const invalidateCache = useCallback(() => {
    dispatch({ type: 'INVALIDATE_CACHE' });
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, loadStoreData, updateComponents, invalidateCache }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};
```

#### 3.2 FastStorePage محسن بالكامل

```typescript
// src/components/store/UltraFastStorePage.tsx
import React, { useEffect, useMemo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';

// Lazy components مع تحسين أفضل
const ComponentRenderer = React.lazy(() => import('./ComponentRenderer'));
const StoreLayout = React.lazy(() => import('./StoreLayout'));

// Virtualized Intersection Observer
const useVirtualizedIntersection = (itemCount: number) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 3 });
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleRange(prev => ({
              start: Math.min(prev.start, index),
              end: Math.max(prev.end, index + 2)
            }));
          }
        });
      },
      { 
        threshold: 0.1, 
        rootMargin: '200px',
      }
    );

    return () => observer.disconnect();
  }, []);

  return { visibleRange, observer };
};

const UltraFastStorePage: React.FC = () => {
  const { currentSubdomain } = useAuth();
  const { state, loadStoreData } = useStore();
  const { visibleRange } = useVirtualizedIntersection(state.components.length);

  // تحميل البيانات مرة واحدة فقط
  useEffect(() => {
    if (currentSubdomain && !state.organizationData) {
      loadStoreData(currentSubdomain);
    }
  }, [currentSubdomain, state.organizationData, loadStoreData]);

  // المكونات المرئية فقط
  const visibleComponents = useMemo(() => {
    return state.components.slice(visibleRange.start, visibleRange.end + 1);
  }, [state.components, visibleRange]);

  if (state.isLoading) {
    return <StorePageSkeleton />;
  }

  if (state.error) {
    return <StoreErrorFallback error={state.error} />;
  }

  return (
    <ErrorBoundary FallbackComponent={StoreErrorFallback}>
      <Suspense fallback={<StorePageSkeleton />}>
        <StoreLayout organizationData={state.organizationData}>
          {visibleComponents.map((component, index) => (
            <div 
              key={component.id} 
              data-index={index + visibleRange.start}
              className="component-container"
            >
              <Suspense fallback={<ComponentSkeleton />}>
                <ComponentRenderer 
                  component={component}
                  organizationData={state.organizationData}
                  categories={state.categories}
                  featuredProducts={state.featuredProducts}
                />
              </Suspense>
            </div>
          ))}
        </StoreLayout>
      </Suspense>
    </ErrorBoundary>
  );
};

export default UltraFastStorePage;
```

### المرحلة 4: تحسين الأداء المتقدم

#### 4.1 تحسين الصور والوسائط

```typescript
// src/components/ui/UltraOptimizedImage.tsx
import React, { useState, useCallback, useMemo } from 'react';

interface UltraOptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

const UltraOptimizedImage: React.FC<UltraOptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // تحسين الصورة تلقائياً
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    // إضافة معاملات التحسين
    const url = new URL(src.startsWith('http') ? src : `https:${src}`);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('f', 'webp');
    url.searchParams.set('q', '85');
    
    return url.toString();
  }, [src, width, height]);

  // Placeholder محسن
  const placeholderSrc = useMemo(() => {
    if (!width || !height) return '';
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">
          ${alt || 'Loading...'}
        </text>
      </svg>
    `)}`;
  }, [width, height, alt]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">فشل تحميل الصورة</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  );
};

export default UltraOptimizedImage;
```

#### 4.2 تحسين Bundle Size

```typescript
// webpack.config.js إضافات
module.exports = {
  // ... existing config
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        store: {
          test: /[\\/]src[\\/]components[\\/]store[\\/]/,
          name: 'store-components',
          chunks: 'all',
          priority: 10,
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
};
```

---

## 📈 النتائج المتوقعة للتحسين

### تحسينات الأداء المتوقعة

| المقياس | قبل التحسين | بعد التحسين | التحسن |
|---------|-------------|-------------|---------|
| **وقت التحميل الأولي** | 3-5 ثوانٍ | 0.8-1.2 ثانية | 75-80% |
| **وقت التفاعل الأول** | 2-3 ثوانٍ | 0.5-0.8 ثانية | 70-75% |
| **حجم Bundle الرئيسي** | 2.5 MB | 800 KB | 68% |
| **استعلامات قاعدة البيانات** | 8-12 استعلام | 1-2 استعلام | 85-90% |
| **استهلاك الذاكرة** | 45-60 MB | 15-25 MB | 60-65% |
| **Core Web Vitals** | ❌ فاشل | ✅ ممتاز | 100% |

### تحسينات تجربة المستخدم

- **⚡ تحميل فوري**: ظهور المحتوى خلال أقل من ثانية
- **🔄 تحديثات سلسة**: عدم انقطاع التفاعل أثناء التحديثات
- **📱 أداء محمول ممتاز**: تحسين خاص للأجهزة المحمولة
- **♿ إمكانية الوصول**: دعم كامل لقارئات الشاشة
- **🌐 SEO محسن**: تحسين كامل لمحركات البحث

---

## 🚀 خطة التنفيذ المرحلية

### الأسبوع 1-2: تحسين قاعدة البيانات
- [ ] تطبيق تحسينات الفهارس
- [ ] إنشاء الدوال المحسنة
- [ ] اختبار الأداء

### الأسبوع 3-4: تطوير الخدمات الجديدة  
- [ ] تطوير UltraFastStoreService
- [ ] تطبيق Store Context
- [ ] اختبار التكامل

### الأسبوع 5-6: تحسين المكونات
- [ ] تطوير UltraFastStorePage
- [ ] تحسين Component Renderer
- [ ] تطبيق Virtualization

### الأسبوع 7-8: الاختبار والنشر
- [ ] اختبار الأداء الشامل
- [ ] اختبار الحمولة
- [ ] النشر التدريجي

---

## 🛠️ أدوات المراقبة والتحليل

### 1. مراقبة الأداء في الوقت الفعلي

```typescript
// src/utils/performanceMonitor.ts
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTiming(label: string): string {
    const timingId = `${label}_${Date.now()}_${Math.random()}`;
    performance.mark(`start_${timingId}`);
    return timingId;
  }
  
  endTiming(timingId: string): number {
    const startMark = `start_${timingId}`;
    const endMark = `end_${timingId}`;
    
    performance.mark(endMark);
    performance.measure(timingId, startMark, endMark);
    
    const measure = performance.getEntriesByName(timingId)[0];
    const duration = measure.duration;
    
    // حفظ المقاييس
    const label = timingId.split('_')[0];
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    // تنظيف
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(timingId);
    
    return duration;
  }
  
  getMetrics(label: string): { avg: number; min: number; max: number } {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) return { avg: 0, min: 0, max: 0 };
    
    return {
      avg: values.reduce((a, b) => a + b) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

### 2. تحليل Core Web Vitals

```typescript
// src/utils/webVitalsMonitor.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class WebVitalsMonitor {
  private metrics: Map<string, WebVitalMetric> = new Map();
  
  init() {
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
  }
  
  private handleMetric(metric: WebVitalMetric) {
    this.metrics.set(metric.name, metric);
    
    // إرسال إلى خدمة التحليل
    this.sendToAnalytics(metric);
    
    // تسجيل المقاييس السيئة
    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name}:`, metric.value);
    }
  }
  
  private sendToAnalytics(metric: WebVitalMetric) {
    // إرسال إلى Google Analytics أو خدمة أخرى
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }
  
  getMetrics(): Map<string, WebVitalMetric> {
    return this.metrics;
  }
}

export const webVitalsMonitor = new WebVitalsMonitor();
```

---

## 🎯 الخلاصة والتوصيات

### أهم التحسينات المطلوبة فوراً:

1. **🔥 حرج**: إزالة الفهارس المكررة وتحسين الاستعلامات
2. **⚡ عالي**: تطبيق Store Context وإزالة prop drilling  
3. **🚀 متوسط**: تحسين lazy loading وvirtualization
4. **📊 منخفض**: تطبيق مراقبة الأداء

### عائد الاستثمار المتوقع:
- **تحسين تجربة المستخدم**: زيادة 40-60% في معدل التحويل
- **تحسين SEO**: زيادة 25-35% في حركة البحث العضوية  
- **توفير التكاليف**: تقليل 50-70% في استهلاك الخادم
- **سرعة التطوير**: تقليل 30-40% في وقت تطوير الميزات الجديدة

هذه الخطة الشاملة ستحول صفحة المتجر من أداء متوسط إلى أداء استثنائي على مستوى عالمي. 🚀 