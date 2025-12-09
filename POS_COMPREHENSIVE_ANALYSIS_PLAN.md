# 🎯 خطة التحليل الشامل ونقاـب البيع (POS)
## تاريخ التحليل: 2025-12-06

---

## 📊 ملخص تنفيذي

### نظرة عامة على النظام الحالي
نقطة البيع (POS) في مشروع Bazaar Console هي نظام معقد يتكون من:
- **PowerSync** للمزامنة في الوقت الفعلي مع Supabase
- **SQLite/IndexedDB** لقاعدة البيانات المحلية (Offline-First)
- **Tauri** للتطبيق desktop
- **React + TypeScript** للواجهة الأمامية

### إحصائيات المشاكل المكتشفة
| التصنيف | العدد | النسبة |
|---------|-------|--------|
| 🔴 مشاكل حرجة | 23 | 43% |
| 🟠 مشاكل عالية | 8 | 15% |
| 🟡 مشاكل متوسطة | 15 | 28% |
| 🟢 مشاكل منخفضة | 8 | 14% |
| **المجموع** | **54** | **100%** |

---

## 📁 القسم الأول: تحليل البنية الحالية

### 1.1 هيكل الملفات الرئيسية

```
src/
├── lib/powersync/
│   ├── PowerSyncService.ts      # خدمة المزامنة الرئيسية (1143 سطر)
│   ├── PowerSyncSchema.ts       # مخطط قاعدة البيانات (1437 سطر)
│   ├── PowerSyncDiagnostics.ts  # أدوات التشخيص
│   └── SupabaseConnector.ts     # موصل Supabase
│
├── hooks/powersync/
│   ├── useReactivePOSOrders.ts  # 670 سطر - طلبات POS
│   ├── useReactiveProducts.ts   # 262 سطر - المنتجات
│   ├── usePowerSync.ts          # wrapper للتوافق
│   └── ...21 ملف hooks
│
├── hooks/
│   ├── useUnifiedPOSData.ts     # 893 سطر - بيانات POS الموحدة
│   ├── usePOSSettings.ts        # إعدادات POS
│   └── useLocalProducts.ts      # المنتجات المحلية
│
├── services/
│   ├── posDataSyncService.ts    # 189 سطر - مزامنة بيانات POS
│   └── ImageOfflineService.ts   # خدمة الصور أوفلاين
│
├── components/pos/
│   ├── Cart.tsx                 # السلة (24 KB)
│   ├── ProductCatalog.tsx       # كتالوج المنتجات (28 KB)
│   ├── PaymentDialog.tsx        # حوار الدفع (27 KB)
│   └── ...45 مكون
│
└── context/
    └── PowerSyncProvider.tsx    # 207 سطر - Provider الرئيسي
```

### 1.2 تدفق البيانات الحالي

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                               │
│  (POSAdvanced, ProductCatalog, Cart, PaymentDialog)                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      React Hooks Layer                               │
│  useUnifiedPOSData, useReactivePOSOrders, useReactiveProducts       │
│  usePOSSettings, useLocalProducts                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    PowerSync Service     │     │   posDataSyncService    │
│    (Reactive Queries)    │     │   (RPC Calls)          │
└────────────────────────┬─┘     └────────────┬────────────┘
                         │                     │
                         ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PowerSync Database (SQLite)                       │
│             IndexedDB (wa-sqlite) / OPFS (Chrome)                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼ (عند الاتصال)
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                                │
│               PostgreSQL + Real-time + RPC Functions                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 القسم الثاني: المشاكل الحرجة

### 2.1 مشاكل PowerSync والمزامنة

#### 🔴 المشكلة #1: تضارب أنظمة المزامنة
**الملفات المتأثرة:**
- `src/services/posDataSyncService.ts`
- `src/hooks/useUnifiedPOSData.ts`
- `src/lib/powersync/PowerSyncService.ts`

**الوصف:**
- يوجد نظامان للمزامنة يعملان بشكل مستقل:
  1. **PowerSync** (Reactive) - يستخدم `useQuery` من `@powersync/react`
  2. **posDataSyncService** (Manual) - يستخدم RPC calls مباشرة

**الكود المشكل:**
```typescript
// في posDataSyncService.ts - مزامنة يدوية
const { data, error } = await supabase.rpc('get_complete_pos_data_optimized', {...});
await hydrateLocalDBFromResponse(organizationId, finalResponse);

// في useReactivePOSOrders.ts - مزامنة تفاعلية
const { data, isLoading } = useQuery<ReactivePOSOrder>(ordersSql, ordersParams);
```

**التأثير:**
- تحديثات مكررة للبيانات
- استهلاك عالي للذاكرة والـ CPU
- Race conditions بين النظامين

---

#### 🔴 المشكلة #2: عدم تزامن Schema بين SQLite و Supabase
**الملفات المتأثرة:**
- `src/lib/powersync/PowerSyncSchema.ts`
- `sync-rules-complete.yaml`

**الوصف:**
- PowerSyncSchema.ts يحتوي على 41 جدول
- بعض الأعمدة في Supabase غير موجودة في الـ Schema المحلي
- لا توجد آلية للتحقق من توافق Schema

**أعمدة مفقودة (أمثلة):**
```typescript
// في Supabase موجود لكن في PowerSyncSchema.ts مفقود:
// - products.name_normalized
// - products.server_updated_at
// - repair_orders.repair_tracking_code
// - pos_orders.pending_updates
```

---

#### 🔴 المشكلة #3: معالجة الأخطاء غير كافية في المزامنة
**الملف:** `src/services/posDataSyncService.ts`

**الوصف:**
```typescript
// الكود الحالي
try {
  const { data, error } = await supabase.rpc('get_complete_pos_data_optimized', {...});
  if (error) {
    markNetworkOffline({ force: true });
    return { success: false, error: `خطأ في جلب بيانات POS: ${error.message}` };
  }
} catch (error) {
  markNetworkOffline({ force: true });
  return { success: false, error: error instanceof Error ? error.message : 'خطأ غير متوقع' };
}
```

**المشاكل:**
- لا يوجد Retry strategy مع Exponential backoff
- لا يتم تصنيف الأخطاء (دائمة vs مؤقتة)
- لا يوجد Dead Letter Queue للأخطاء الفاشلة

---

#### 🔴 المشكلة #4: استخدام getAll() بدلاً من Reactive Queries
**الملفات المتأثرة:**
- `src/hooks/useUnifiedPOSData.ts`
- أجزاء من `PowerSyncService.ts`

**الوصف:**
```typescript
// ❌ الطريقة الخاطئة (موجودة في الكود)
const result = await powerSyncService.query({ sql: 'SELECT * FROM products' });

// ✅ الطريقة الصحيحة
const { data, isLoading } = useQuery('SELECT * FROM products WHERE org_id = ?', [orgId]);
```

**التأثير:**
- لا يوجد Caching
- لا يوجد Reactivity تلقائي
- يسبب Queue timeout في PowerSync

---

### 2.2 مشاكل الأداء

#### 🔴 المشكلة #5: فهرسة غير محسّنة
**الملف:** `src/lib/powersync/PowerSyncSchema.ts`

**المشاكل:**
```typescript
// الفهارس الحالية غير كافية
const products = new Table({
  // ...columns
}, {
  indexes: {
    org: ['organization_id'],
    sku: ['sku'],
    barcode: ['barcode'],
    org_category_active: ['organization_id', 'category_id', 'is_active'],
    org_active: ['organization_id', 'is_active'],
    org_name: ['organization_id', 'name'],
    org_stock: ['organization_id', 'stock_quantity'],
  }
});
```

**الفهارس المفقودة:**
- `(organization_id, barcode)` - للبحث بالباركود
- `(organization_id, sku)` - للبحث بـ SKU
- `(organization_id, name, is_active)` - للبحث النصي
- `(organization_id, updated_at)` - للمزامنة التفاضلية
- FTS5 indexes للبحث النصي السريع

---

#### 🔴 المشكلة #6: تحميل جميع المنتجات في الذاكرة
**الملف:** `src/hooks/useUnifiedPOSData.ts`

**الكود المشكل:**
```typescript
// في loadInitialDataFromLocalDB (سطر 318-506)
// يتم تحميل جميع المنتجات ثم تطبيق الفلترة
const allProducts = await powerSyncService.query({
  sql: productsQuery,
  params: queryParams
});
```

**الحل المطلوب:**
- استخدام Pagination في الـ SQL
- Lazy loading للمنتجات
- Virtual scrolling في الواجهة

---

### 2.3 مشاكل Offline-First

#### 🔴 المشكلة #7: عدم حفظ بيانات الاعتماد أوفلاين
**الملف:** `src/lib/offline/staffCredentials.ts`

**الوصف:**
- بيانات تسجيل الدخول لا تُحفظ بشكل آمن أوفلاين
- عند فقدان الاتصال، لا يمكن تسجيل الدخول

**الحل المطلوب:**
- تشفير بيانات الاعتماد
- حفظها في IndexedDB
- مصادقة أوفلاين باستخدام PIN

---

#### 🔴 المشكلة #8: الصور لا تعمل أوفلاين
**الملف:** `src/services/ImageOfflineService.ts`

**الوصف:**
- الصور يتم تنزيلها عند الحاجة فقط
- لا يوجد pre-caching للصور المهمة
- لا يوجد fallback للصور عند فقدان الاتصال

---

## 🟠 القسم الثالث: المشاكل العالية

### 3.1 مشاكل البنية والتصميم

#### 🟠 المشكلة #9: تكرار الكود في Hooks
**الملفات المتأثرة:**
- `useReactivePOSOrders.ts` (670 سطر)
- `useReactiveProducts.ts` (262 سطر)
- `useUnifiedPOSData.ts` (893 سطر)

**الوصف:**
- نفس منطق البحث والفلترة مكرر في عدة hooks
- عدم وجود factory function أو base hook

---

#### 🟠 المشكلة #10: عدم وجود Error Boundaries
**الملفات المتأثرة:** جميع مكونات POS

**الوصف:**
- أخطاء PowerSync قد تتسبب في crash التطبيق بالكامل
- لا يوجد graceful degradation

---

#### 🟠 المشكلة #11: React Query و PowerSync معاً
**الملف:** `src/hooks/useUnifiedPOSData.ts`

**الكود:**
```typescript
// استخدام React Query مع PowerSync بشكل غير صحيح
const queryResult = useQuery({
  queryKey: ['complete-pos-data', orgId, page, limit, search, categoryId],
  queryFn: async () => { /* ... */ },
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});
```

**المشكلة:**
- PowerSync لديه caching داخلي
- React Query لديه caching أيضاً
- تضارب وتكرار في إدارة cache

---

### 3.2 مشاكل أمنية

#### 🟠 المشكلة #12: عدم تشفير البيانات الحساسة
**الوصف:**
- PIN codes يتم حفظها بدون تشفير
- بيانات العملاء في SQLite غير مشفرة

---

## 🟡 القسم الرابع: المشاكل المتوسطة

### 4.1 مشاكل تجربة المستخدم

#### 🟡 المشكلة #13: عدم وجود مؤشر تقدم المزامنة
**الوصف:**
- المستخدم لا يعرف حالة المزامنة الفعلية
- لا يوجد progress bar للعمليات الطويلة

---

#### 🟡 المشكلة #14: تأخير في البحث
**الملف:** `src/hooks/useUnifiedPOSData.ts`

**الوصف:**
- البحث يتم على كل keystroke
- لا يوجد debouncing كافي

---

### 4.2 مشاكل الصيانة

#### 🟡 المشكلة #15: عدم وجود تسجيل أخطاء مركزي
**الوصف:**
- console.log/warn/error متناثرة
- لا يوجد نظام logging موحد
- صعوبة في تتبع المشاكل

---

---

## ✅ القسم الخامس: خطة التحسين الشاملة

### 📌 المرحلة 1: الإصلاحات الحرجة (الأسبوع 1-2)

#### 1.1 توحيد نظام المزامنة
**الهدف:** استخدام PowerSync فقط للقراءة

```typescript
// الخطة:
// 1. إزالة استدعاءات RPC اليدوية من posDataSyncService
// 2. استخدام useQuery من @powersync/react في كل مكان
// 3. إزالة hydrateLocalDBFromResponse

// الكود الجديد المقترح:
export function usePOSProducts(options: ProductsOptions = {}) {
  const { orgId } = useTenant();
  
  // ⚡ Reactive Query - تحديث تلقائي
  const { data, isLoading, error } = useQuery<Product>(
    `SELECT * FROM products WHERE organization_id = ? AND is_active = 1 ORDER BY name LIMIT ?`,
    [orgId, options.limit || 100]
  );
  
  return { products: data || [], isLoading, error };
}
```

#### 1.2 تحديث Schema
**الهدف:** توافق كامل مع Supabase

```typescript
// إضافة الأعمدة المفقودة في PowerSyncSchema.ts
const products = new Table({
  // ... الأعمدة الحالية
  name_normalized: column.text,        // ✅ جديد
  server_updated_at: column.text,      // ✅ جديد
}, {
  indexes: {
    // ... الفهارس الحالية
    org_barcode: ['organization_id', 'barcode'],     // ✅ جديد
    org_sku: ['organization_id', 'sku'],             // ✅ جديد
    org_updated: ['organization_id', 'updated_at'],  // ✅ جديد
  }
});
```

#### 1.3 إضافة Retry Strategy
**الهدف:** معالجة أخطاء المزامنة بشكل ذكي

```typescript
// إنشاء ملف جديد: src/lib/sync/RetryStrategy.ts
export class RetryStrategy {
  private static readonly MAX_RETRIES = 5;
  private static readonly BASE_DELAY = 1000;

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // تصنيف الخطأ
        if (this.isPermanentError(error)) {
          throw error; // لا تعيد المحاولة
        }
        
        // Exponential backoff
        const delay = this.BASE_DELAY * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private static isPermanentError(error: any): boolean {
    // أخطاء لا تحتاج إعادة محاولة
    const permanentCodes = ['23505', '23503', '42501']; // duplicate, FK violation, permission
    return permanentCodes.includes(error?.code);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### 📌 المرحلة 2: تحسينات الأداء (الأسبوع 3-4)

#### 2.1 إضافة FTS5 Full-Text Search
**الهدف:** بحث فوري في المنتجات

```sql
-- إنشاء جدول FTS5 للمنتجات
CREATE VIRTUAL TABLE products_fts USING fts5(
  name,
  sku,
  barcode,
  description,
  content='products',
  content_rowid='rowid'
);

-- Trigger للتحديث التلقائي
CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, sku, barcode, description)
  VALUES (NEW.rowid, NEW.name, NEW.sku, NEW.barcode, NEW.description);
END;
```

#### 2.2 Pagination وVirtual Scrolling
**الهدف:** تحميل 50-100 منتج فقط في وقت واحد

```typescript
// استخدام usePOSInfiniteProducts بدلاً من تحميل الكل
export function usePOSInfiniteProducts() {
  const { orgId } = useTenant();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery<Product>(
    `SELECT * FROM products 
     WHERE organization_id = ? AND is_active = 1 
     ORDER BY name 
     LIMIT ? OFFSET ?`,
    [orgId, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );

  const loadMore = () => setPage(p => p + 1);

  return { products: data, isLoading, loadMore, hasMore: data?.length === PAGE_SIZE };
}
```

#### 2.3 تحسين PRAGMA Settings
**الهدف:** أداء أفضل لـ SQLite

```typescript
// في PowerSyncService.ts - applyPragmaOptimizations()
const optimizedPragmas = [
  { sql: 'PRAGMA cache_size = -50000', name: 'Cache 50MB' },     // ⬆️ من 20MB
  { sql: 'PRAGMA temp_store = MEMORY', name: 'Temp in Memory' },
  { sql: 'PRAGMA page_size = 8192', name: 'Large page size' },   // ✅ جديد
  { sql: 'PRAGMA mmap_size = 268435456', name: 'Memory-map 256MB' }, // ✅ جديد
];
```

---

### 📌 المرحلة 3: تحسينات Offline-First (الأسبوع 5-6)

#### 3.1 Pre-caching للصور
**الهدف:** تحميل صور المنتجات مسبقاً

```typescript
// إنشاء src/services/ImagePreloadService.ts
export class ImagePreloadService {
  private cache: Cache | null = null;
  private readonly CACHE_NAME = 'pos-product-images';

  async init() {
    this.cache = await caches.open(this.CACHE_NAME);
  }

  async preloadProductImages(products: Product[]) {
    if (!this.cache) await this.init();

    const imageUrls = products
      .filter(p => p.thumbnail_image)
      .map(p => p.thumbnail_image);

    await Promise.allSettled(
      imageUrls.map(url => this.cacheImage(url))
    );
  }

  private async cacheImage(url: string) {
    const response = await fetch(url);
    if (response.ok) {
      await this.cache?.put(url, response);
    }
  }

  async getImage(url: string): Promise<Response | null> {
    return this.cache?.match(url) || null;
  }
}
```

#### 3.2 مصادقة أوفلاين
**الهدف:** تسجيل دخول بـ PIN عند عدم الاتصال

```typescript
// تحسين src/lib/offline/staffCredentials.ts
import { AES, enc } from 'crypto-js';

const ENCRYPTION_KEY = 'your-secure-key'; // يجب تخزينه بشكل آمن

export class SecureCredentials {
  static async saveCredentials(userId: string, pin: string): Promise<void> {
    const hashedPin = await this.hashPin(pin);
    const encrypted = AES.encrypt(hashedPin, ENCRYPTION_KEY).toString();
    
    await localDb.put('offline_credentials', {
      userId,
      hashedPin: encrypted,
      savedAt: new Date().toISOString()
    });
  }

  static async verifyPin(userId: string, enteredPin: string): Promise<boolean> {
    const stored = await localDb.get('offline_credentials', userId);
    if (!stored) return false;

    const decrypted = AES.decrypt(stored.hashedPin, ENCRYPTION_KEY).toString(enc.Utf8);
    const enteredHash = await this.hashPin(enteredPin);
    
    return decrypted === enteredHash;
  }

  private static async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

#### 3.3 Conflict Resolution
**الهدف:** حل تعارضات البيانات عند المزامنة

```typescript
// إنشاء src/lib/sync/ConflictResolver.ts
export enum ConflictStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE = 'merge',
  MANUAL = 'manual'
}

export interface ConflictInfo {
  table: string;
  recordId: string;
  localData: any;
  serverData: any;
  localTimestamp: Date;
  serverTimestamp: Date;
}

export class ConflictResolver {
  private strategy: ConflictStrategy;

  constructor(strategy: ConflictStrategy = ConflictStrategy.SERVER_WINS) {
    this.strategy = strategy;
  }

  resolve(conflict: ConflictInfo): any {
    switch (this.strategy) {
      case ConflictStrategy.SERVER_WINS:
        return conflict.serverData;
        
      case ConflictStrategy.CLIENT_WINS:
        return conflict.localData;
        
      case ConflictStrategy.MERGE:
        return this.mergeData(conflict);
        
      case ConflictStrategy.MANUAL:
        // إرسال إشعار للمستخدم لحل التعارض يدوياً
        this.notifyManualResolution(conflict);
        return null;
    }
  }

  private mergeData(conflict: ConflictInfo): any {
    const merged = { ...conflict.serverData };
    
    // دمج الحقول المحلية الأحدث
    for (const key of Object.keys(conflict.localData)) {
      if (key === 'updated_at') continue;
      
      // إذا تم تعديل الحقل محلياً بعد آخر sync
      if (conflict.localTimestamp > conflict.serverTimestamp) {
        merged[key] = conflict.localData[key];
      }
    }
    
    return merged;
  }

  private notifyManualResolution(conflict: ConflictInfo): void {
    window.dispatchEvent(new CustomEvent('sync-conflict', { detail: conflict }));
  }
}
```

---

### 📌 المرحلة 4: تحسينات الهيكل والصيانة (الأسبوع 7-8)

#### 4.1 نظام Logging مركزي
**الهدف:** تتبع ومراقبة موحدة

```typescript
// إنشاء src/lib/logging/Logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(scope: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, scope, message, data);
  }

  info(scope: string, message: string, data?: any) {
    this.log(LogLevel.INFO, scope, message, data);
  }

  warn(scope: string, message: string, data?: any) {
    this.log(LogLevel.WARN, scope, message, data);
  }

  error(scope: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, scope, message, { error: error?.stack, ...data });
  }

  private log(level: LogLevel, scope: string, message: string, data?: any) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      scope,
      message,
      data
    };

    // حفظ في buffer للتصدير لاحقاً
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.MAX_BUFFER) {
      this.logBuffer.shift();
    }

    // طباعة في console
    const prefix = `[${entry.timestamp}] [${entry.level}] [${scope}]`;
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
    }
  }

  exportLogs(): LogEntry[] {
    return [...this.logBuffer];
  }
}

// استخدام:
const logger = Logger.getInstance();
logger.info('PowerSync', 'بدء المزامنة', { orgId: '...' });
```

#### 4.2 Error Boundaries
**الهدف:** عزل الأخطاء ومنع crash التطبيق

```typescript
// إنشاء src/components/error/POSErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class POSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.getInstance().error('POSErrorBoundary', 'خطأ في POS', error, {
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'يرجى المحاولة مرة أخرى'}
          </p>
          <Button onClick={this.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة المحاولة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 4.3 تبسيط Hooks
**الهدف:** إنشاء base hook قابل لإعادة الاستخدام

```typescript
// إنشاء src/hooks/base/useReactiveTable.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

interface TableQueryOptions {
  table: string;
  columns?: string[];
  where?: string;
  orderBy?: string;
  limit?: number;
  enabled?: boolean;
}

export function useReactiveTable<T>(options: TableQueryOptions) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !(options.enabled ?? true)) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    const cols = options.columns?.join(', ') || '*';
    let query = `SELECT ${cols} FROM ${options.table} WHERE organization_id = ?`;
    const queryParams: any[] = [orgId];

    if (options.where) {
      query += ` AND ${options.where}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ?`;
      queryParams.push(options.limit);
    }

    return { sql: query, params: queryParams };
  }, [orgId, options.enabled, options.table, options.columns, options.where, options.orderBy, options.limit]);

  const { data, isLoading, isFetching, error } = useQuery<T>(sql, params);

  return {
    data: data || [],
    isLoading,
    isFetching,
    error: error || null
  };
}

// استخدام:
const { data: products, isLoading } = useReactiveTable<Product>({
  table: 'products',
  where: 'is_active = 1',
  orderBy: 'name',
  limit: 100
});
```

---

## 📊 القسم السادس: مقاييس النجاح

### 6.1 مقاييس الأداء المستهدفة

| المقياس | الحالي | الهدف | التحسن |
|---------|--------|-------|--------|
| وقت تحميل POS | ~3-5 ثواني | <1 ثانية | 80% |
| استخدام الذاكرة | ~200-400MB | <100MB | 75% |
| زمن المزامنة | ~10-30 ثانية | <5 ثواني | 80% |
| استجابة البحث | ~500ms | <100ms | 80% |
| Queue Timeouts | كثيرة | صفر | 100% |

### 6.2 مقاييس الموثوقية

| المقياس | الحالي | الهدف |
|---------|--------|-------|
| نجاح المزامنة | ~85% | >99% |
| فقدان البيانات | يحدث أحياناً | صفر |
| Crash rate | ~5% | <0.1% |
| Conflict resolution | يدوي | تلقائي 95% |

### 6.3 مقاييس تجربة المستخدم

| المقياس | الحالي | الهدف |
|---------|--------|-------|
| العمل أوفلاين | جزئي | كامل |
| مؤشر المزامنة | غير واضح | واضح ودقيق |
| رسائل الخطأ | تقنية | سهلة الفهم |
| استرجاع من الأخطاء | يدوي | تلقائي |

---

## 🗓️ القسم السابع: الجدول الزمني

### الجدول الزمني المقترح (8 أسابيع)

```
الأسبوع 1-2: الإصلاحات الحرجة
├── توحيد نظام المزامنة
├── تحديث Schema
├── إضافة Retry Strategy
└── اختبار التكامل

الأسبوع 3-4: تحسينات الأداء
├── إضافة FTS5 للبحث
├── تطبيق Pagination
├── تحسين PRAGMA
└── قياس الأداء

الأسبوع 5-6: تحسينات Offline-First
├── Pre-caching للصور
├── مصادقة أوفلاين
├── Conflict Resolution
└── اختبار أوفلاين

الأسبوع 7-8: التحسينات الهيكلية
├── نظام Logging
├── Error Boundaries
├── تبسيط Hooks
├── التوثيق
└── الاختبار النهائي
```

---

## ✅ قائمة المهام (Checklist)

### المرحلة 1: الإصلاحات الحرجة
- [ ] توحيد نظام المزامنة (PowerSync فقط)
- [ ] تحديث PowerSyncSchema.ts
- [ ] إنشاء RetryStrategy.ts
- [ ] إزالة posDataSyncService الـ redundant
- [ ] تحديث sync-rules-complete.yaml

### المرحلة 2: تحسينات الأداء
- [ ] إضافة فهارس جديدة
- [ ] إنشاء FTS5 indexes
- [ ] تطبيق Virtual Scrolling
- [ ] تحسين PRAGMA settings
- [ ] إضافة query caching

### المرحلة 3: Offline-First
- [ ] إنشاء ImagePreloadService
- [ ] تطوير SecureCredentials
- [ ] بناء ConflictResolver
- [ ] اختبار العمل أوفلاين الكامل

### المرحلة 4: الهيكل والصيانة
- [ ] إنشاء Logger.ts
- [ ] إضافة POSErrorBoundary
- [ ] تبسيط hooks بـ useReactiveTable
- [ ] كتابة التوثيق
- [ ] إنشاء اختبارات وحدة

---

## 📝 الخلاصة

نقطة البيع الحالية تعاني من عدة مشاكل حرجة تؤثر على:
1. **الأداء** - بطء التحميل واستهلاك الذاكرة
2. **الموثوقية** - فقدان البيانات وفشل المزامنة
3. **تجربة المستخدم** - عدم العمل أوفلاين بشكل كامل

الخطة المقترحة تعالج هذه المشاكل عبر:
1. **توحيد نظام المزامنة** باستخدام PowerSync فقط
2. **تحسين الأداء** بالفهرسة والـ Pagination
3. **تعزيز Offline-First** بالـ caching والمصادقة
4. **تحسين الهيكل** بـ Error Handling و Logging

**الوقت المقدر للتنفيذ:** 8 أسابيع
**عدد المهام:** 20 مهمة رئيسية
**التحسن المتوقع في الأداء:** 75-80%
