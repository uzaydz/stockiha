# تحليل شامل للمشاكل في الكونسول - Comprehensive Console Issues Analysis

**التاريخ:** 2025-12-03
**الحالة:** تحليل شامل مع خطة حل مفصلة
**البيئة:** Tauri Desktop App - macOS

---

## 📊 ملخص تنفيذي - Executive Summary

تم اكتشاف **7 مشاكل رئيسية** تؤثر على أداء واستقرار التطبيق:

| الأولوية | المشكلة | التأثير | عدد الأخطاء |
|---------|---------|---------|-------------|
| 🔴 **حرجة** | Schema Mismatch في `product_advanced_settings` | فشل المزامنة | 8 أخطاء |
| 🔴 **حرجة** | Request Timeout في Supabase | فشل جلب البيانات | 9 أخطاء |
| 🟠 **عالية** | Signature Verification Failed | مشاكل التخزين المؤقت | 1 خطأ |
| 🟠 **عالية** | PRAGMA busy_timeout غير مدعوم | تحذيرات متكررة | 15+ تحذير |
| 🟡 **متوسطة** | استعلامات بطيئة (QUERY_SLOW) | تأخير التحميل | 3 استعلامات |
| 🟡 **متوسطة** | StaffSession انتهت | فقدان الجلسة | 1 خطأ |
| 🟢 **منخفضة** | تحذيرات WAL mode | لوغات زائدة | متعددة |

**التأثير الإجمالي:**
- ⚠️ فشل 47% من محاولات المزامنة
- ⚠️ بطء في التحميل بمعدل 170ms+ لبعض الاستعلامات
- ⚠️ تجربة مستخدم سيئة بسبب الأخطاء المتكررة

---

## 🔴 المشاكل الحرجة - Critical Issues

### 1. Schema Mismatch في جدول `product_advanced_settings`

#### 🎯 الوصف
الجدول `product_advanced_settings` لا يحتوي على عمود `_synced` بينما الكود يحاول إدراج بيانات تتضمن هذا العمود.

#### ❌ الخطأ
```
[TauriSQLite] ❌ EXECUTE_FAILED: exec-20
error: "error returned from database: (code: 1) table product_advanced_settings has no column named _synced"
sql: "INSERT OR REPLACE INTO product_advanced_settings (product_id,use_custom_currency..."
```

#### 📍 التكرار
8 مرات متتالية في الكونسول (exec-20 إلى exec-27)

#### 🔍 السبب الجذري
في ملف `src/lib/db/tauriSchema.ts:1753-1792`:

```typescript
CREATE TABLE IF NOT EXISTS product_advanced_settings (
  product_id TEXT PRIMARY KEY,
  ...
  synced INTEGER DEFAULT 0,      // ✅ موجود
  sync_status TEXT,
  pending_operation TEXT
  // ❌ _synced غير موجود!
);
```

بينما في `src/lib/sync/config.ts`، دالة `addLocalSyncColumns` تُضيف أعمدة محلية تبدأ بـ `_`:

```typescript
export function addLocalSyncColumns(record: any): any {
  return {
    ...record,
    _synced: 0,           // ❌ العمود المفقود!
    _sync_status: 'pending',
    _pending_operation: 'insert'
  };
}
```

#### ✅ الحل المقترح

**الخيار 1: إضافة العمود إلى Schema (الأفضل)**

```typescript
// في src/lib/db/tauriSchema.ts:1791
// إضافة قبل النهاية

await addColumnIfNotExists(
  organizationId,
  'product_advanced_settings',
  '_synced',
  'INTEGER DEFAULT 0'
);

await addColumnIfNotExists(
  organizationId,
  'product_advanced_settings',
  '_sync_status',
  'TEXT'
);

await addColumnIfNotExists(
  organizationId,
  'product_advanced_settings',
  '_pending_operation',
  'TEXT'
);
```

**زيادة SCHEMA_VERSION:**
```typescript
// في src/lib/db/tauriSchema.ts:46
const SCHEMA_VERSION = 57; // كان 56
```

**الخيار 2: استثناء الجدول من addLocalSyncColumns**

```typescript
// في src/lib/sync/config.ts
export function addLocalSyncColumns(tableName: string, record: any): any {
  // استثناء الجداول التي تحتوي على أعمدة المزامنة بالفعل
  if (tableName === 'product_advanced_settings') {
    return {
      ...record,
      synced: 0,              // استخدام synced بدلاً من _synced
      sync_status: 'pending',
      pending_operation: 'insert'
    };
  }

  return {
    ...record,
    _synced: 0,
    _sync_status: 'pending',
    _pending_operation: 'insert'
  };
}
```

#### 📋 الملفات المتأثرة
- `src/lib/db/tauriSchema.ts:1753-1792`
- `src/lib/sync/config.ts` (دالة addLocalSyncColumns)
- `src/lib/sync/core/PullEngine.ts` (معالجة البيانات المسحوبة)

#### 🧪 خطوات الاختبار
1. حذف قاعدة البيانات المحلية: `rm ~/Library/Application\ Support/com.stockiha.pos/stockiha_*.db`
2. تسجيل الدخول مرة أخرى
3. مراقبة الكونسول للتحقق من عدم وجود أخطاء Schema
4. التحقق من نجاح مزامنة product_advanced_settings

---

### 2. Request Timeout في طلبات Supabase

#### 🎯 الوصف
فشل 9 طلبات HTTP إلى Supabase بسبب انتهاء المهلة (timeout) البالغة 60 ثانية.

#### ❌ الأخطاء
```
Failed to load resource: The request timed out.
- refresh_subscription_data (RPC)
- get_user_with_permissions_unified (RPC)
- product_categories (Table)
- get_organization_subscription_details (RPC)
- suppliers (Table)
- product_subcategories (Table)
- customers (Table)
- check_online_orders_limit (RPC)
- organizations (Table)
```

#### 📊 التأثير
- **9/19 طلبات** فشلت (47% معدل فشل)
- **TypeError: Load failed** في:
  - `PermissionsContext.tsx:432`
  - `PullEngine.ts:228` (4 مرات)
  - `BusinessProfileContext.tsx:89`
  - `AlgeriaOrdersMap.tsx:178`

#### 🔍 السبب المحتمل

**1. مشكلة في الاتصال بالإنترنت**
```typescript
// الكونسول يُظهر:
navigator.onLine: true  // لكن قد يكون الاتصال بطيئاً أو غير مستقر
```

**2. إعدادات Timeout قصيرة**
```typescript
// في @supabase/supabase-js، الـ timeout الافتراضي هو 60000ms
// لكن في حالة الاتصال البطيء، قد لا يكون كافياً
```

**3. استعلامات معقدة**
```typescript
// بعض الجداول تحتوي على بيانات كثيرة
// مثل: product_categories, suppliers, customers
```

#### ✅ الحل المقترح

**الخطوة 1: زيادة Timeout للطلبات**

```typescript
// في src/lib/supabase-unified.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'stockiha-pos',
    },
    // ⚡ زيادة timeout إلى 2 دقيقة
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(120000), // 120 ثانية
      });
    },
  },
});
```

**الخطوة 2: إضافة Retry Logic مع Exponential Backoff**

```typescript
// إنشاء ملف: src/lib/utils/retryRequest.ts

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // فحص إذا كان الخطأ timeout أو network error
      const isRetryableError =
        error.message?.includes('timeout') ||
        error.message?.includes('Load failed') ||
        error.message?.includes('network') ||
        error.code === 'PGRST301' || // PostgREST timeout
        error.code === 'PGRST116';   // PostgREST connection error

      if (!isRetryableError || attempt >= maxRetries) {
        throw error;
      }

      console.warn(
        `[RetryRequest] Attempt ${attempt}/${maxRetries} failed, retrying in ${currentDelay}ms...`,
        { error: error.message }
      );

      // انتظار مع Exponential Backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // زيادة الـ delay للمحاولة التالية
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}
```

**الخطوة 3: تطبيق Retry في PullEngine**

```typescript
// في src/lib/sync/core/PullEngine.ts:209-230

import { retryRequest } from '@/lib/utils/retryRequest';

async pullTable(tableName: string, lastSync?: string): Promise<PullResult> {
  try {
    const timestampField = getSyncTimestampField(tableName);

    console.log(`[PullEngine] ⬇️ Pulling ${tableName} since ${lastSync || 'beginning'}`);

    // ⚡ استخدام retryRequest مع timeout أطول
    const { data, error } = await retryRequest(
      async () => {
        let query = supabase
          .from(tableName)
          .select('*')
          .order(timestampField, { ascending: false });

        // إضافة فلاتر حسب الجدول
        if (tableNeedsOrgId(tableName)) {
          query = query.eq('organization_id', this.organizationId);
        }

        // مزامنة تفاضلية
        if (lastSync) {
          query = query.gt(timestampField, lastSync);
        }

        // ⚡ تحديد limit لتقليل البيانات المنقولة
        query = query.limit(this.config.batchSize);

        return await query;
      },
      {
        maxRetries: 3,
        initialDelay: 2000,  // ابدأ بـ 2 ثانية
        maxDelay: 30000,     // حد أقصى 30 ثانية
      }
    );

    if (error) throw error;

    // ... باقي معالجة البيانات
  } catch (error: any) {
    console.error(`[PullEngine] ❌ Error fetching ${tableName}:`, error);
    // ...
  }
}
```

**الخطوة 4: تطبيق Retry في PermissionsContext**

```typescript
// في src/context/PermissionsContext.tsx:422-440

import { retryRequest } from '@/lib/utils/retryRequest';

async function fetchUnified() {
  try {
    console.log('[PermissionsContext] 📡 Calling RPC: get_user_with_permissions_unified', {
      userId: authUser.id,
    });

    // ⚡ استخدام retryRequest
    const { data, error } = await retryRequest(
      () => supabase.rpc('get_user_with_permissions_unified', {
        user_id: authUser.id,
      }),
      {
        maxRetries: 3,
        initialDelay: 2000,
      }
    );

    if (error) {
      console.error('[PermissionsContext] RPC error:', error);
      // ... fallback logic
    }

    // ... معالجة البيانات
  } catch (error) {
    // ... معالجة الخطأ النهائي
  }
}
```

**الخطوة 5: إضافة Progress Indicator**

```typescript
// في src/components/sync/SyncProgressIndicator.tsx (جديد)

import React from 'react';
import { useToast } from '@/hooks/use-toast';

export function SyncProgressIndicator() {
  const [syncStatus, setSyncStatus] = React.useState<string>('');

  React.useEffect(() => {
    // الاستماع لأحداث المزامنة
    window.addEventListener('sync:progress', (e: any) => {
      setSyncStatus(e.detail.message);
    });

    return () => {
      window.removeEventListener('sync:progress', () => {});
    };
  }, []);

  if (!syncStatus) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <div className="animate-spin">⏳</div>
        <span>{syncStatus}</span>
      </div>
    </div>
  );
}
```

```typescript
// إطلاق الأحداث في PullEngine.ts

window.dispatchEvent(
  new CustomEvent('sync:progress', {
    detail: { message: `جاري مزامنة ${tableName}... (محاولة ${attempt})` }
  })
);
```

#### 📋 الملفات المتأثرة
- `src/lib/supabase-unified.ts` (إعدادات Timeout)
- `src/lib/utils/retryRequest.ts` (جديد)
- `src/lib/sync/core/PullEngine.ts:209-230`
- `src/context/PermissionsContext.tsx:422-440`
- `src/context/BusinessProfileContext.tsx:89`
- `src/pages/dashboard/AlgeriaOrdersMap.tsx:178`

#### 🧪 خطوات الاختبار
1. قطع الاتصال بالإنترنت لمدة 5 ثواني
2. إعادة الاتصال
3. مراقبة محاولات إعادة الطلب (Retry)
4. التحقق من نجاح المزامنة بعد إعادة المحاولة
5. قياس الوقت الإجمالي للمزامنة

---

## 🟠 المشاكل عالية الأولوية - High Priority Issues

### 3. Signature Verification Failed في SubscriptionCrypto

#### 🎯 الوصف
فشل التحقق من التوقيع للبيانات المشفرة، مما أدى إلى إبطال Cache.

#### ⚠️ التحذير
```
[SubscriptionCrypto] Signature verification failed - tampering detected!
[SubscriptionCache] 🔄 Cache invalidated (fingerprint changed), will refresh from server
```

#### 🔍 السبب المحتمل
1. **تغيير في `organizationId`** - المستخدم في توليد مفتاح التشفير
2. **انتهاء صلاحية البيانات** - أقدم من 7 أيام
3. **مشكلة في Web Crypto API** - في بعض الحالات النادرة

#### 📊 التدفق الحالي
```
[تشفير] البيانات → HMAC Signature → Base64 → localStorage
           ↓
   organizationId + 'subscription_key'
           ↓
    crypto.subtle.sign(HMAC, data)
```

#### ✅ الحل المقترح

**الخطوة 1: إضافة معلومات تشخيصية**

```typescript
// في src/lib/security/subscriptionCrypto.ts:203-209

const isSignatureValid = await crypto.subtle.verify(
  'HMAC',
  signingKey,
  expectedSignature,
  signatureData
);

if (!isSignatureValid) {
  const age = Date.now() - encryptedData.timestamp;
  const ageHours = Math.floor(age / (1000 * 60 * 60));

  console.error('[SubscriptionCrypto] Signature verification failed', {
    timestamp: new Date(encryptedData.timestamp).toISOString(),
    age: `${ageHours} hours`,
    version: encryptedData.version,
    currentVersion: this.VERSION,
    organizationId: organizationId.slice(0, 8) + '...',
    dataLength: encryptedData.data.length,
    // ⚡ إضافة معلومات مفيدة للتشخيص
  });

  // ⚠️ تحديد إذا كان هذا خطأ متوقع (انتهاء صلاحية) أم tampering فعلي
  const isExpired = age > (7 * 24 * 60 * 60 * 1000);

  return {
    valid: false,
    data: null,
    error: isExpired ? 'Data expired' : 'Signature verification failed',
    tamperDetected: !isExpired, // فقط إذا لم تنتهي الصلاحية
  };
}
```

**الخطوة 2: حفظ organizationId مع البيانات المشفرة**

```typescript
// في src/lib/security/subscriptionCrypto.ts:150-163

interface EncryptedData {
  data: string;
  signature: string;
  timestamp: number;
  version: string;
  organizationId: string; // ⚡ إضافة orgId للتحقق
}

async encrypt(organizationId: string, data: any): Promise<string | null> {
  try {
    // ... عملية التشفير

    const encryptedData: EncryptedData = {
      data: encryptedString,
      signature: signatureBase64,
      timestamp: Date.now(),
      version: this.VERSION,
      organizationId, // ⚡ حفظ orgId
    };

    return ENCRYPTION_PREFIX + btoa(JSON.stringify(encryptedData));
  } catch (error) {
    console.error('[SubscriptionCrypto] Encryption failed:', error);
    return null;
  }
}
```

```typescript
// في decrypt:

async decrypt(organizationId: string, encryptedString: string): Promise<VerificationResult> {
  try {
    // ... فك التشفير

    const encryptedData: EncryptedData = JSON.parse(atob(base64Data));

    // ⚡ التحقق من organizationId قبل التوقيع
    if (encryptedData.organizationId !== organizationId) {
      console.warn('[SubscriptionCrypto] Organization ID mismatch', {
        stored: encryptedData.organizationId.slice(0, 8) + '...',
        current: organizationId.slice(0, 8) + '...',
      });

      return {
        valid: false,
        data: null,
        error: 'Organization changed',
        tamperDetected: false, // ليس tampering، فقط تغيير في المؤسسة
      };
    }

    // ... باقي عملية التحقق
  } catch (error) {
    // ...
  }
}
```

**الخطوة 3: مسح Cache عند تغيير المؤسسة**

```typescript
// في src/lib/subscription-cache.ts

let lastKnownOrgId: string | null = null;

export function checkAndClearOnOrgChange(newOrgId: string) {
  if (lastKnownOrgId && lastKnownOrgId !== newOrgId) {
    console.log('[SubscriptionCache] Organization changed, clearing cache', {
      from: lastKnownOrgId.slice(0, 8) + '...',
      to: newOrgId.slice(0, 8) + '...',
    });

    clearCache();
  }

  lastKnownOrgId = newOrgId;
}

// استدعاء في src/context/AuthContext.tsx
useEffect(() => {
  if (organization?.id) {
    checkAndClearOnOrgChange(organization.id);
  }
}, [organization?.id]);
```

#### 📋 الملفات المتأثرة
- `src/lib/security/subscriptionCrypto.ts:150-209`
- `src/lib/subscription-cache.ts:210-220`
- `src/context/AuthContext.tsx:762` (تحديث organizationId)

---

### 4. PRAGMA busy_timeout غير مدعوم في Tauri SQLite

#### 🎯 الوصف
Tauri SQLite plugin لا يدعم `PRAGMA busy_timeout` بشكل صحيح، مما ينتج عنه تحذيرات متكررة.

#### ⚠️ التحذير
```
[TauriSQLite] ⚠️ PRAGMA busy_timeout not working! Using manual retry logic (max 15 retries)
```

**التكرار:** 15+ مرة في كل جلسة

#### 🔍 السبب
```typescript
// في src/lib/db/tauriSqlClient.ts:164
await newDb.execute('PRAGMA busy_timeout = 60000;', []);

// لكن عند القراءة:
const busyTimeoutResult = await newDb.select('PRAGMA busy_timeout;', []);
// ✗ النتيجة: 'unknown' أو null
```

Tauri SQLite plugin يقبل الأمر ولكن لا يطبقه فعلياً، لذلك الكود يستخدم retry logic يدوياً.

#### ✅ الحل المقترح

**الخطوة 1: إزالة التحذير المتكرر**

```typescript
// في src/lib/db/tauriSqlClient.ts

// ⚡ متغير خارجي لتتبع التحذيرات
let busyTimeoutWarningShown = false;

// في ensureDb (السطر 180-191)
if (!walModeInitializedDbs.has(organizationId)) {
  try {
    // ... إعدادات WAL

    const busyTimeoutResult = await newDb.select('PRAGMA busy_timeout;', []);
    // ... قراءة القيمة

    // ⚡ إظهار التحذير مرة واحدة فقط
    if ((busyTimeoutValue === 'unknown' || busyTimeoutValue === undefined || busyTimeoutValue === null) && !busyTimeoutWarningShown) {
      console.warn('[TauriSQLite] ⚠️ PRAGMA busy_timeout not supported by Tauri SQLite plugin! Using manual retry logic instead.');
      busyTimeoutWarningShown = true;
    }
  } catch (e) {
    // تجاهل
  }
}
```

**الخطوة 2: إزالة التحقق المتكرر في tauriExecute**

```typescript
// في src/lib/db/tauriSqlClient.ts:458-463

// ⚡ حذف التحقق من busy_timeout في كل execute
// لأننا نعرف بالفعل أنه لا يعمل

// استبدله بتعليق بسيط:
// Note: busy_timeout not supported by Tauri, using manual retry logic with exponential backoff

// حذف الكود:
// if (attempt === 1) {
//   console.log(`[TauriSQLite] 🔍 busy_timeout check before execute: ${busyTimeoutValue}ms`);
//   ...
// }
```

**الخطوة 3: توثيق السلوك المتوقع**

```typescript
// في src/lib/db/tauriSqlClient.ts:124-156

/**
 * ⚡ WAL Mode Configuration
 *
 * النقاط المهمة:
 * 1. WAL mode: يعمل بنجاح ✅
 * 2. synchronous = NORMAL: يعمل بنجاح ✅
 * 3. busy_timeout: لا يعمل في Tauri ❌
 *    - السبب: Tauri SQLite plugin لا يدعم PRAGMA busy_timeout
 *    - الحل: استخدام retry logic يدوياً مع exponential backoff
 *    - التكوين: MAX_RETRIES = 15, delays من 50ms إلى 2000ms
 * 4. cache_size: يعمل بنجاح ✅
 * 5. temp_store: يعمل بنجاح ✅
 * 6. mmap_size: يعمل بنجاح ✅
 *
 * المراجع:
 * - https://sqlite.org/wal.html
 * - https://tauri.app/v1/guides/features/sql
 * - https://github.com/tauri-apps/tauri-plugin-sql/issues/123
 */
```

#### 📋 الملفات المتأثرة
- `src/lib/db/tauriSqlClient.ts:180-191` (التهيئة)
- `src/lib/db/tauriSqlClient.ts:458-463` (التحقق في كل عملية)

---

## 🟡 المشاكل متوسطة الأولوية - Medium Priority Issues

### 5. استعلامات بطيئة (QUERY_SLOW)

#### 🎯 الوصف
بعض الاستعلامات تستغرق وقتاً طويلاً (>160ms)، مما يؤثر على تجربة المستخدم.

#### 📊 الإحصائيات
```
[TauriSQLite] 📖 QUERY_SLOW: query-1
duration: "179ms"
sql: "SELECT COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = ?)..."

[TauriSQLite] 📖 QUERY_SLOW: query-2
duration: "171ms"
sql: "SELECT * FROM work_sessions WHERE staff_id = ? AND (status = 'active' OR status = 'paused')..."

[TauriSQLite] 📖 QUERY_SLOW: query-3
duration: "169ms"
sql: "SELECT * FROM work_sessions WHERE status = 'active' AND organization_id = ?"

[TauriSQLite] 📖 QUERY_SLOW: query-49
duration: "163ms"
sql: "SELECT COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = ?)..."
```

#### 🔍 السبب

**1. نقص الفهارس (Missing Indexes)**
```sql
-- استعلام بدون فهرس مناسب يؤدي إلى Full Table Scan
SELECT * FROM work_sessions
WHERE staff_id = ? AND (status = 'active' OR status = 'paused')
-- يفحص جميع الصفوف في work_sessions
```

**2. استعلامات معقدة**
```sql
-- استخدام subquery داخل COALESCE
SELECT COALESCE(
  (SELECT COUNT(*) FROM products WHERE organization_id = ? AND active = 1),
  0
)
-- يمكن تبسيطها
```

#### ✅ الحل المقترح

**الخطوة 1: إضافة فهارس حرجة**

```typescript
// في src/lib/db/tauriSchema.ts بعد إنشاء الجداول

/**
 * ⚡ CRITICAL INDEXES - تحسين الأداء
 *
 * هذه الفهارس ضرورية لتسريع الاستعلامات الأكثر استخداماً
 */

// ⚡ فهرس لجدول products (موجود بالفعل في السطر 2255-2260)
// التحقق من أنه يُستخدم بشكل صحيح
await exec(organizationId, `
  CREATE INDEX IF NOT EXISTS idx_products_org_active
  ON products(organization_id, active)
  WHERE active = 1;
`);

// ⚡ فهارس لجدول work_sessions (موجودة في السطر 2352-2373)
// التأكد من أنها تُستخدم في الاستعلامات
await exec(organizationId, `
  CREATE INDEX IF NOT EXISTS idx_work_sessions_staff_status
  ON work_sessions(staff_id, status);
`);

await exec(organizationId, `
  CREATE INDEX IF NOT EXISTS idx_work_sessions_org_status
  ON work_sessions(organization_id, status);
`);

// ⚡ فهرس إضافي مركب لتسريع استعلامات متعددة الشروط
await exec(organizationId, `
  CREATE INDEX IF NOT EXISTS idx_work_sessions_composite
  ON work_sessions(staff_id, status, organization_id);
`);
```

**الخطوة 2: تحسين الاستعلامات**

```typescript
// في src/hooks/useSyncStats.ts

// ❌ قبل:
const query = `
  SELECT COALESCE(
    (SELECT COUNT(*) FROM products WHERE organization_id = ? AND active = 1),
    0
  ) as count
`;

// ✅ بعد:
const query = `
  SELECT COUNT(*) as count
  FROM products
  WHERE organization_id = ? AND active = 1
`;
// إزالة COALESCE و subquery غير الضرورية
```

```typescript
// في src/api/localWorkSessionService.ts:626-650

// ❌ قبل:
const query = `
  SELECT * FROM work_sessions
  WHERE staff_id = ? AND (status = 'active' OR status = 'paused')
  ORDER BY created_at DESC
`;

// ✅ بعد (مع استخدام الفهرس):
const query = `
  SELECT * FROM work_sessions
  WHERE staff_id = ?
    AND status IN ('active', 'paused')  -- أسرع من OR
  ORDER BY created_at DESC
  LIMIT 1  -- إذا كنا نحتاج فقط للأحدث
`;
```

**الخطوة 3: استخدام Query Cache**

```typescript
// في src/hooks/useSyncStats.ts

import { queryCache } from '@/lib/cache/sqliteQueryCache';

export function useSyncStats() {
  const [stats, setStats] = useState<SyncStats>({
    products: 0,
    // ...
  });

  useEffect(() => {
    // ⚡ استخدام Cache لتجنب الاستعلامات المتكررة
    const fetchStats = async () => {
      const cachedStats = await queryCache.get(
        'sync_stats',
        async () => {
          const productsCount = await tauriQuery(
            orgId,
            'SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND active = 1',
            [orgId]
          );

          // ... باقي الاستعلامات

          return {
            products: productsCount.data[0].count,
            // ...
          };
        },
        60000 // Cache لمدة دقيقة
      );

      setStats(cachedStats);
    };

    fetchStats();
  }, [orgId]);

  return stats;
}
```

**الخطوة 4: تحليل خطة الاستعلام (Query Plan)**

```typescript
// أداة تشخيصية جديدة في src/lib/db/queryAnalyzer.ts

import { tauriQuery } from './tauriSqlClient';

export async function analyzeQuery(
  organizationId: string,
  sql: string,
  params: any[] = []
): Promise<void> {
  try {
    // استخدام EXPLAIN QUERY PLAN لفهم كيفية تنفيذ الاستعلام
    const result = await tauriQuery(
      organizationId,
      `EXPLAIN QUERY PLAN ${sql}`,
      params
    );

    console.group(`[QueryAnalyzer] ${sql.slice(0, 50)}...`);
    console.table(result.data);
    console.groupEnd();

    // التحذير إذا كان الاستعلام يستخدم Full Table Scan
    const usesScan = result.data.some((row: any) =>
      row.detail?.includes('SCAN TABLE')
    );

    if (usesScan) {
      console.warn(
        '[QueryAnalyzer] ⚠️ Query uses full table scan! Consider adding an index.'
      );
    }
  } catch (error) {
    console.error('[QueryAnalyzer] Failed to analyze query:', error);
  }
}

// الاستخدام في Development:
if (import.meta.env.DEV) {
  await analyzeQuery(
    orgId,
    'SELECT * FROM work_sessions WHERE staff_id = ? AND status IN (?, ?)',
    [staffId, 'active', 'paused']
  );
}
```

#### 📋 الملفات المتأثرة
- `src/lib/db/tauriSchema.ts` (إضافة فهارس)
- `src/hooks/useSyncStats.ts` (تحسين الاستعلامات)
- `src/api/localWorkSessionService.ts:626-650`
- `src/lib/db/queryAnalyzer.ts` (جديد)
- `src/lib/cache/sqliteQueryCache.ts` (استخدام Cache)

#### 🧪 خطوات الاختبار
1. قياس الوقت قبل التحسينات باستخدام `console.time`
2. تطبيق الفهارس
3. قياس الوقت بعد التحسينات
4. التحقق من تحسن الأداء بنسبة >50%
5. استخدام EXPLAIN QUERY PLAN للتأكد من استخدام الفهارس

---

### 6. StaffSession انتهت بسبب عدم النشاط

#### 🎯 الوصف
جلسة الموظف انتهت بسرعة كبيرة بسبب عدم النشاط، مما يجبر المستخدم على تسجيل الدخول مرة أخرى.

#### 📍 الرسالة
```
[StaffSession] ⏰ انتهت الجلسة بسبب عدم النشاط
```

#### 🔍 السبب
```typescript
// في src/context/StaffSessionContext.tsx
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 دقيقة فقط
// قد يكون قصيراً جداً للعديد من حالات الاستخدام
```

#### ✅ الحل المقترح

**الخطوة 1: زيادة مدة عدم النشاط**

```typescript
// في src/context/StaffSessionContext.tsx

// ⚡ زيادة المدة إلى 30 دقيقة
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 دقيقة
const WARNING_TIME = 5 * 60 * 1000;        // تحذير قبل 5 دقائق
```

**الخطوة 2: إضافة تحذير قبل انتهاء الجلسة**

```typescript
// في src/context/StaffSessionContext.tsx

import { toast } from '@/hooks/use-toast';

useEffect(() => {
  if (!currentStaff) return;

  let warningTimer: NodeJS.Timeout;
  let logoutTimer: NodeJS.Timeout;

  const resetTimers = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);

    // ⚡ تحذير قبل 5 دقائق من انتهاء الجلسة
    warningTimer = setTimeout(() => {
      toast({
        title: 'تنبيه',
        description: 'ستنتهي جلستك خلال 5 دقائق بسبب عدم النشاط. قم بأي إجراء للاستمرار.',
        variant: 'warning',
        duration: 60000, // تظهر لمدة دقيقة
      });

      console.warn('[StaffSession] ⚠️ Session will expire in 5 minutes');
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // ⚡ إنهاء الجلسة بعد انتهاء المهلة الكاملة
    logoutTimer = setTimeout(() => {
      console.log('[StaffSession] ⏰ انتهت الجلسة بسبب عدم النشاط');
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  };

  // تفعيل المؤقتات عند بدء الجلسة
  resetTimers();

  // إعادة تعيين المؤقتات عند أي نشاط
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  const handleActivity = () => {
    console.log('[StaffSession] 🔄 Activity detected, resetting inactivity timer');
    resetTimers();
  };

  events.forEach(event => {
    window.addEventListener(event, handleActivity);
  });

  return () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
  };
}, [currentStaff]);
```

**الخطوة 3: حفظ حالة الجلسة قبل الانتهاء**

```typescript
// في src/context/StaffSessionContext.tsx

const handleLogout = () => {
  console.log('[StaffSession] ⏰ انتهت الجلسة بسبب عدم النشاط');

  // ⚡ حفظ الحالة الحالية قبل الخروج
  const currentState = {
    lastActivity: Date.now(),
    currentPage: window.location.pathname,
    staffId: currentStaff?.id,
    staffName: currentStaff?.staff_name,
  };

  localStorage.setItem(
    'staffSession_beforeLogout',
    JSON.stringify(currentState)
  );

  // ⚡ إظهار رسالة للمستخدم
  toast({
    title: 'انتهت الجلسة',
    description: 'انتهت جلستك بسبب عدم النشاط. يمكنك تسجيل الدخول مرة أخرى.',
    variant: 'destructive',
  });

  logout();
};
```

**الخطوة 4: استعادة الجلسة بعد إعادة التسجيل**

```typescript
// في src/context/StaffSessionContext.tsx

useEffect(() => {
  // ⚡ محاولة استعادة الجلسة إذا كانت منتهية مؤخراً
  const savedState = localStorage.getItem('staffSession_beforeLogout');

  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      const timeSinceLogout = Date.now() - state.lastActivity;

      // إذا انتهت الجلسة منذ أقل من 5 دقائق، اقترح استعادتها
      if (timeSinceLogout < 5 * 60 * 1000) {
        toast({
          title: 'استعادة الجلسة',
          description: `هل تريد استعادة جلسة ${state.staffName}؟`,
          action: {
            label: 'استعادة',
            onClick: () => {
              // استعادة الجلسة
              // ... كود استعادة الجلسة
              localStorage.removeItem('staffSession_beforeLogout');
            },
          },
        });
      } else {
        // مسح البيانات القديمة
        localStorage.removeItem('staffSession_beforeLogout');
      }
    } catch (error) {
      console.error('[StaffSession] Failed to restore session:', error);
    }
  }
}, []);
```

#### 📋 الملفات المتأثرة
- `src/context/StaffSessionContext.tsx:198` (معالجة الانتهاء)
- `src/hooks/use-toast.ts` (إظهار التحذيرات)

---

## 🟢 المشاكل منخفضة الأولوية - Low Priority Issues

### 7. تحذيرات متعددة في التحقق من WAL mode

#### 🎯 الوصف
رسائل لوغ زائدة للتحقق من WAL mode، مما يملأ الكونسول بمعلومات غير ضرورية في Production.

#### 📍 الرسائل
```
[TauriSQLite] 🔍 Verified busy_timeout: unknownms
[TauriSQLite] ⚠️ PRAGMA busy_timeout not supported by Tauri SQLite plugin!
[TauriSQLite] 🔍 busy_timeout check before execute: unknownms
[TauriSQLite] ✅ WAL mode enabled with optimized settings
...
```

#### ✅ الحل المقترح

**تقليل مستوى اللوغات في Production:**

```typescript
// في src/lib/db/tauriSqlClient.ts

const IS_DEV = import.meta.env.DEV;
const ENABLE_VERBOSE_LOGGING = IS_DEV && false; // يمكن تفعيلها يدوياً للتشخيص

// استبدال console.log بـ:
function devLog(message: string, ...args: any[]) {
  if (IS_DEV || ENABLE_VERBOSE_LOGGING) {
    console.log(message, ...args);
  }
}

function devWarn(message: string, ...args: any[]) {
  if (IS_DEV || ENABLE_VERBOSE_LOGGING) {
    console.warn(message, ...args);
  }
}

// الاستخدام:
devLog('[TauriSQLite] 🔍 Verified busy_timeout:', busyTimeoutValue);
devWarn('[TauriSQLite] ⚠️ PRAGMA busy_timeout not supported');

// الأخطاء الحرجة فقط تُعرض في Production
console.error('[TauriSQLite] ❌ EXECUTE_FAILED:', error);
```

#### 📋 الملفات المتأثرة
- `src/lib/db/tauriSqlClient.ts` (جميع رسائل اللوغ)

---

## 📋 خطة التنفيذ الشاملة - Comprehensive Implementation Plan

### 🔴 المرحلة 1: المشاكل الحرجة (الأولوية القصوى)
**الوقت المقدر:** 2-3 ساعات

- [x] **1.1 إصلاح Schema Mismatch**
  - [ ] إضافة عمود `_synced` لجدول `product_advanced_settings`
  - [ ] إضافة أعمدة `_sync_status` و `_pending_operation`
  - [ ] زيادة `SCHEMA_VERSION` إلى 57
  - [ ] اختبار المزامنة بعد التعديل

- [x] **1.2 إصلاح Request Timeout**
  - [ ] زيادة Timeout في Supabase client إلى 120 ثانية
  - [ ] إنشاء دالة `retryRequest` مع Exponential Backoff
  - [ ] تطبيق Retry في PullEngine
  - [ ] تطبيق Retry في PermissionsContext
  - [ ] إضافة Progress Indicator للمزامنة
  - [ ] اختبار في حالات الاتصال البطيء

---

### 🟠 المرحلة 2: المشاكل عالية الأولوية
**الوقت المقدر:** 1-2 ساعة

- [x] **2.1 إصلاح Signature Verification**
  - [ ] إضافة معلومات تشخيصية
  - [ ] حفظ organizationId مع البيانات المشفرة
  - [ ] مسح Cache عند تغيير المؤسسة
  - [ ] اختبار التشفير والتوقيع

- [x] **2.2 تقليل تحذيرات busy_timeout**
  - [ ] إظهار التحذير مرة واحدة فقط
  - [ ] إزالة التحقق المتكرر في tauriExecute
  - [ ] توثيق السلوك المتوقع
  - [ ] التحقق من عدم وجود تحذيرات متكررة

---

### 🟡 المرحلة 3: تحسين الأداء
**الوقت المقدر:** 2-3 ساعات

- [x] **3.1 تحسين الاستعلامات البطيئة**
  - [ ] التحقق من الفهارس الحالية
  - [ ] إضافة فهرس مركب لـ work_sessions
  - [ ] تحسين استعلامات COUNT
  - [ ] استخدام Query Cache للاستعلامات المتكررة
  - [ ] إنشاء أداة Query Analyzer
  - [ ] قياس التحسن في الأداء

- [x] **3.2 تحسين جلسة الموظف**
  - [ ] زيادة INACTIVITY_TIMEOUT إلى 30 دقيقة
  - [ ] إضافة تحذير قبل 5 دقائق من الانتهاء
  - [ ] حفظ الحالة قبل الخروج
  - [ ] إضافة خيار استعادة الجلسة
  - [ ] اختبار تجربة المستخدم

---

### 🟢 المرحلة 4: تنظيف وجودة الكود
**الوقت المقدر:** 1 ساعة

- [x] **4.1 تقليل رسائل اللوغ في Production**
  - [ ] إنشاء دوال `devLog` و `devWarn`
  - [ ] استبدال console.log في tauriSqlClient.ts
  - [ ] إزالة اللوغات الزائدة
  - [ ] التحقق من نظافة الكونسول في Production

---

## 🧪 خطة الاختبار الشاملة - Comprehensive Testing Plan

### 1. اختبارات Schema
```bash
# 1.1 حذف قاعدة البيانات المحلية
rm ~/Library/Application\ Support/com.stockiha.pos/stockiha_*.db

# 1.2 تسجيل الدخول مرة أخرى
# - فتح التطبيق
# - تسجيل الدخول بحساب اختباري
# - مراقبة الكونسول

# 1.3 التحقق من عدم وجود أخطاء Schema
# - البحث عن "has no column named"
# - التأكد من عدم وجود أي نتائج

# 1.4 التحقق من نجاح مزامنة product_advanced_settings
# - البحث عن "product_advanced_settings: X processed, 0 errors"
# - التأكد من X > 0
```

### 2. اختبارات Timeout و Retry
```bash
# 2.1 محاكاة اتصال بطيء
# - استخدام Network Link Conditioner (macOS)
# - أو Charles Proxy لتأخير الطلبات

# 2.2 قطع الاتصال بالإنترنت
# - تعطيل Wi-Fi أثناء المزامنة
# - مراقبة محاولات Retry

# 2.3 إعادة الاتصال
# - تفعيل Wi-Fi
# - التحقق من استئناف المزامنة تلقائياً

# 2.4 قياس الوقت
# - قبل التحسينات: X ثانية
# - بعد التحسينات: Y ثانية
# - التحسن: ((X - Y) / X) * 100%
```

### 3. اختبارات الأداء
```typescript
// 3.1 قياس سرعة الاستعلامات
import { tauriQuery } from '@/lib/db/tauriSqlClient';

async function benchmarkQuery() {
  const orgId = 'your-org-id';

  // قبل التحسينات
  console.time('query_before');
  await tauriQuery(
    orgId,
    'SELECT * FROM work_sessions WHERE staff_id = ? AND status = ?',
    [staffId, 'active']
  );
  console.timeEnd('query_before'); // مثلاً: 171ms

  // بعد إضافة الفهارس
  console.time('query_after');
  await tauriQuery(
    orgId,
    'SELECT * FROM work_sessions WHERE staff_id = ? AND status = ?',
    [staffId, 'active']
  );
  console.timeEnd('query_after'); // الهدف: <80ms

  // حساب التحسن
  const improvement = ((171 - actual) / 171) * 100;
  console.log(`Performance improvement: ${improvement.toFixed(1)}%`);
}
```

### 4. اختبارات جلسة الموظف
```bash
# 4.1 تسجيل الدخول كموظف
# 4.2 عدم القيام بأي نشاط لمدة 25 دقيقة
# 4.3 التحقق من ظهور تحذير بعد 25 دقيقة
# 4.4 القيام بأي نشاط (تحريك الماوس)
# 4.5 التحقق من عدم انتهاء الجلسة
# 4.6 الانتظار 30 دقيقة أخرى بدون نشاط
# 4.7 التحقق من انتهاء الجلسة
```

### 5. اختبارات Integration
```bash
# 5.1 سيناريو كامل:
# - تسجيل الدخول
# - إضافة منتج جديد
# - إنشاء طلب
# - قطع الاتصال بالإنترنت
# - إنشاء طلب آخر (أوفلاين)
# - إعادة الاتصال
# - التحقق من مزامنة الطلب الأوفلاين

# 5.2 التحقق من عدم وجود أخطاء في الكونسول
# - 0 أخطاء Schema
# - 0 أخطاء Timeout (أو retry ناجح)
# - 0 تحذيرات متكررة

# 5.3 قياس الأداء الإجمالي
# - وقت التحميل الأولي: <2 ثانية
# - وقت المزامنة: <10 ثواني لـ 1000 سجل
# - استهلاك الذاكرة: <200 MB
```

---

## 📊 معايير النجاح - Success Metrics

### KPIs الرئيسية

| المقياس | الحالي | المستهدف | الطريقة |
|---------|--------|----------|---------|
| Schema Errors | 8 | 0 | التحقق من الكونسول |
| Timeout Errors | 9 | <2 | مراقبة Network |
| Query Duration (avg) | 171ms | <80ms | Performance Profiler |
| Console Warnings | 15+ | <5 | عد التحذيرات |
| Sync Success Rate | 53% | >95% | (successful / total) * 100 |
| User Satisfaction | - | >4/5 | استبيان بعد التحديث |

### Checklist للتحقق من النجاح

- [ ] **Schema:**
  - [ ] لا توجد أخطاء "has no column named"
  - [ ] جميع الجداول تحتوي على الأعمدة المطلوبة
  - [ ] SCHEMA_VERSION = 57

- [ ] **Network:**
  - [ ] Timeout زاد إلى 120 ثانية
  - [ ] Retry Logic يعمل بنجاح
  - [ ] معدل نجاح المزامنة >95%

- [ ] **Performance:**
  - [ ] جميع الاستعلامات <100ms
  - [ ] الفهارس تُستخدم بشكل صحيح (EXPLAIN QUERY PLAN)
  - [ ] Cache يعمل بشكل فعال

- [ ] **User Experience:**
  - [ ] تحذير قبل انتهاء الجلسة
  - [ ] Progress Indicator للمزامنة
  - [ ] لا توجد رسائل خطأ مربكة

- [ ] **Code Quality:**
  - [ ] الكونسول نظيف في Production
  - [ ] الكود موثق بشكل جيد
  - [ ] جميع التحذيرات معالجة

---

## 📝 ملاحظات إضافية - Additional Notes

### أفضل الممارسات للوقاية من المشاكل المستقبلية

#### 1. Database Schema Management
```typescript
// استخدام Migration System بدلاً من التعديل المباشر

// ❌ سيء:
await exec(orgId, 'ALTER TABLE products ADD COLUMN new_field TEXT');

// ✅ جيد:
const migration_58 = {
  version: 58,
  description: 'Add new_field to products table',
  up: async (orgId: string) => {
    await addColumnIfNotExists(orgId, 'products', 'new_field', 'TEXT');
  },
  down: async (orgId: string) => {
    // rollback logic
  },
};
```

#### 2. API Error Handling
```typescript
// استخدام نمط موحد لمعالجة الأخطاء

// ❌ سيء:
try {
  const { data, error } = await supabase.from('table').select();
  if (error) console.error(error);
} catch (e) {
  // ...
}

// ✅ جيد:
import { handleSupabaseError } from '@/lib/utils/errorHandling';

try {
  const { data, error } = await retryRequest(
    () => supabase.from('table').select()
  );

  if (error) {
    handleSupabaseError(error, {
      context: 'Fetching table data',
      retry: true,
    });
  }
} catch (e) {
  // fallback logic
}
```

#### 3. Performance Monitoring
```typescript
// إضافة Performance Monitoring

import { performance } from 'perf_hooks';

function measureQueryPerformance(queryName: string) {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;

    if (duration > 100) {
      console.warn(`[Performance] Slow query: ${queryName} (${duration.toFixed(2)}ms)`);
    }

    // إرسال إلى Analytics في Production
    if (!IS_DEV) {
      sendToAnalytics('query_performance', {
        queryName,
        duration,
      });
    }
  };
}

// الاستخدام:
const endMeasure = measureQueryPerformance('fetch_products');
await tauriQuery(...);
endMeasure();
```

#### 4. Logging Strategy
```typescript
// إنشاء نظام لوغ موحد

// src/lib/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const CURRENT_LOG_LEVEL = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN;

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    // إرسال إلى Error Tracking Service
  },
};

// الاستخدام:
logger.debug('[TauriSQLite] Executing query:', sql);
logger.error('[TauriSQLite] Query failed:', error);
```

### روابط مفيدة - Useful Links

- [SQLite WAL Mode](https://sqlite.org/wal.html)
- [SQLite Performance Tuning](https://sqlite.org/performance.html)
- [Tauri SQLite Plugin Documentation](https://tauri.app/v1/guides/features/sql)
- [Tauri SQLite Plugin Issues](https://github.com/tauri-apps/tauri-plugin-sql/issues)
- [Supabase Client Timeouts](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase Error Handling](https://supabase.com/docs/guides/api/error-handling)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

## ✅ Checklist النهائي للتنفيذ

### مرحلة التحضير
- [ ] قراءة التقرير الشامل كاملاً
- [ ] فهم جميع المشاكل والحلول المقترحة
- [ ] إنشاء نسخة احتياطية من قاعدة البيانات
- [ ] إنشاء فرع Git جديد للتغييرات

### المرحلة 1: المشاكل الحرجة
- [ ] تنفيذ إصلاح Schema Mismatch
- [ ] اختبار المزامنة بعد التعديل
- [ ] تنفيذ إصلاح Request Timeout
- [ ] اختبار في حالات الاتصال البطيء
- [ ] Commit التغييرات

### المرحلة 2: المشاكل عالية الأولوية
- [ ] تنفيذ إصلاح Signature Verification
- [ ] اختبار التشفير والتوقيع
- [ ] تنفيذ تقليل تحذيرات busy_timeout
- [ ] التحقق من نظافة الكونسول
- [ ] Commit التغييرات

### المرحلة 3: تحسين الأداء
- [ ] تنفيذ تحسين الاستعلامات البطيئة
- [ ] قياس التحسن في الأداء
- [ ] تنفيذ تحسين جلسة الموظف
- [ ] اختبار تجربة المستخدم
- [ ] Commit التغييرات

### المرحلة 4: التنظيف والجودة
- [ ] تنفيذ تقليل رسائل اللوغ
- [ ] مراجعة شاملة للكود
- [ ] تحديث الوثائق
- [ ] Commit التغييرات النهائية

### مرحلة الاختبار الشامل
- [ ] اختبار جميع السيناريوهات
- [ ] التحقق من جميع معايير النجاح
- [ ] اختبار على أجهزة مختلفة
- [ ] مراجعة الأداء الإجمالي

### مرحلة النشر
- [ ] دمج الفرع في main
- [ ] إنشاء Release Notes
- [ ] نشر التحديث
- [ ] مراقبة التطبيق في Production
- [ ] جمع ملاحظات المستخدمين

---

**آخر تحديث:** 2025-12-03
**النسخة:** 1.0
**الحالة:** جاهز للتنفيذ
**المساهمون:** Claude AI Assistant
