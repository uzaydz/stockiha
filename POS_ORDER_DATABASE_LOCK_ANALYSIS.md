# تحليل مشكلة "Database is Locked" عند إنشاء طلبية POS

## 📋 الملخص التنفيذي

عند إنشاء طلبية في نقطة البيع، تحدث مشكلة **"database is locked"** (code: 5) مما يؤدي إلى:
- تأخير في إنشاء الطلبية (~18 ثانية)
- إعادة محاولة متعددة (3-4 محاولات)
- تجربة مستخدم سيئة

## 🔍 تحليل اللوجات

### التسلسل الزمني للأحداث:

1. **✅ بدء العملية بنجاح** (17:25:55)
   - DatabaseCoordinator يحصل على lock بنجاح
   - SQLiteWriteQueue تبدأ معاملة (BEGIN IMMEDIATE) بنجاح

2. **❌ فشل INSERT في جدول orders** (بعد ~5 ثوان)
   ```
   [Warning] [TauriSQLite] 🔄 EXECUTE_RETRY: exec-42 (attempt 1/8)
   errorType: "error returned from database: (code: 5) database is locked"
   attemptDuration: "5190ms"
   ```

3. **🔄 إعادة المحاولة** (3 محاولات إضافية)
   - المحاولة 2: فشل بعد ~5 ثوان
   - المحاولة 3: فشل بعد ~5 ثوان
   - المحاولة 4: نجحت بعد ~18 ثانية إجمالاً

### المشكلة الأساسية:

```
[Log] [TauriSQLite] ✅ EXECUTE_SUCCESS: exec-41 (BEGIN IMMEDIATE) - duration: "85ms"
[Warning] [TauriSQLite] 🔄 EXECUTE_RETRY: exec-42 (INSERT) - database is locked
```

**الملاحظة المهمة**: المعاملة تبدأ بنجاح، لكن INSERT يفشل بسبب قفل قاعدة البيانات.

## 🔎 الأسباب المحتملة

### 1. **مشكلة في إدارة Connections في Tauri SQLite**

**المشكلة**: في `tauriSqlClient.ts`، الدالة `ensureDb()` قد تُنشئ connection جديد في كل مرة بدلاً من إعادة استخدام connection موجود.

**الدليل**:
```typescript
// في tauriSqlClient.ts
async function ensureDb(organizationId: string) {
  if (db && currentOrgId === organizationId) {
    return db; // ✅ إعادة استخدام connection موجود
  }
  // ❌ لكن قد يكون هناك connection آخر لا يزال نشطاً
  const newDb = await Database.load(dbPath);
}
```

**المشكلة**: Tauri SQLite plugin قد يُنشئ connection جديد في كل مرة يتم استدعاء `Database.load()`، حتى لو كان هناك connection موجود.

### 2. **تعارض بين عمليات متعددة**

**المشكلة**: قد يكون هناك query/operation آخر لا يزال يعمل في نفس الوقت.

**الدليل من اللوجات**:
```
[Log] [TauriSQLite] 🔍 Database state check (attempt 1):
  walMode: "wal"
  busyTimeoutSupported: false  // ⚠️ المشكلة هنا!
  activeOpsCount: 1
  otherOpsCount: 0
```

**الملاحظة**: `busyTimeoutSupported: false` يعني أن PRAGMA busy_timeout لا يعمل في Tauri SQLite plugin، لذلك نعتمد على retry logic يدوياً.

### 3. **مشكلة في WAL Mode**

**المشكلة**: رغم تفعيل WAL mode، قد يكون هناك مشكلة في التكوين.

**الدليل**:
- WAL mode مفعّل: `walMode: "wal"`
- لكن لا يزال هناك قفل: `database is locked`

**السبب المحتمل**: قد يكون هناك reader connection لا يزال يحتفظ بقفل على قاعدة البيانات.

## 🛠️ الحلول المقترحة

### الحل 1: تحسين إدارة Connections (الأولوية العالية)

**المشكلة**: `ensureDb()` قد تُنشئ connection جديد في كل مرة.

**الحل**: التأكد من إعادة استخدام connection موجود فقط:

```typescript
// في tauriSqlClient.ts
let db: any = null;
let currentOrgId: string | null = null;
let dbInitializationPromise: Promise<any> | null = null;

async function ensureDb(organizationId: string) {
  // ⚡ إذا كان نفس الـ DB موجود، نرجعه مباشرة
  if (db && currentOrgId === organizationId) {
    return db;
  }

  // ⚡ إذا كان هناك تهيئة جارية لنفس org، انتظرها
  if (dbInitializationPromise && currentOrgId === organizationId) {
    return dbInitializationPromise;
  }

  // ⚡ إغلاق connection السابق إذا كان مختلفاً
  if (db && currentOrgId !== organizationId) {
    try {
      await db.close();
    } catch (e) {
      console.warn('[TauriSQLite] Error closing previous DB:', e);
    }
    db = null;
    currentOrgId = null;
  }

  // ⚡ إنشاء promise جديد للتهيئة
  dbInitializationPromise = (async () => {
    const mod = await import('@tauri-apps/plugin-sql');
    const Database: any = (mod as any).default ?? (mod as any).Database ?? mod;
    const dbPath = `sqlite:stockiha_${organizationId}.db`;
    const newDb = await Database.load(dbPath);
    
    db = newDb;
    currentOrgId = organizationId;
    dbInitializationPromise = null;
    
    return newDb;
  })();

  return dbInitializationPromise;
}
```

### الحل 2: تحسين Retry Logic

**المشكلة**: Retry logic الحالي قد لا يكون كافياً.

**الحل**: زيادة delay بين المحاولات وتحسين exponential backoff:

```typescript
// في tauriSqlClient.ts
const MAX_RETRIES = 8;
const RETRY_DELAY_MS = 500; // زيادة من 300ms إلى 500ms
const MAX_RETRY_DELAY_MS = 8000; // زيادة من 5000ms إلى 8000ms

function getRetryDelay(attempt: number): number {
  // exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, ...
  const exponentialDelay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = exponentialDelay * Math.random() * 0.3; // تقليل jitter
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}
```

### الحل 3: تحسين Transaction Management

**المشكلة**: قد يكون هناك تعارض بين transactions متعددة.

**الحل**: التأكد من أن جميع العمليات داخل transaction واحدة تستخدم نفس connection:

```typescript
// في SQLiteWriteQueue.ts
async transaction<T>(operations: () => Promise<T>): Promise<T> {
  // ⚡ CRITICAL: التأكد من أن جميع العمليات داخل transaction تستخدم نفس connection
  this.inTransaction = true;
  
  try {
    await sqliteDB.execute('BEGIN IMMEDIATE');
    const result = await operations();
    await sqliteDB.execute('COMMIT');
    return result;
  } catch (error) {
    await sqliteDB.execute('ROLLBACK');
    throw error;
  } finally {
    this.inTransaction = false;
  }
}
```

### الحل 4: إضافة Connection Pooling (اختياري)

**المشكلة**: قد نحتاج connection pool لإدارة أفضل للـ connections.

**الحل**: استخدام connection pool بحد أقصى connection واحد لكل organization:

```typescript
// في tauriSqlClient.ts
const connectionPool = new Map<string, any>();

async function ensureDb(organizationId: string) {
  if (connectionPool.has(organizationId)) {
    const db = connectionPool.get(organizationId);
    // ⚡ التحقق من أن connection لا يزال نشطاً
    try {
      await db.select('SELECT 1', []);
      return db;
    } catch {
      // Connection غير نشط، إزالته وإنشاء جديد
      connectionPool.delete(organizationId);
    }
  }

  const mod = await import('@tauri-apps/plugin-sql');
  const Database: any = (mod as any).default ?? (mod as any).Database ?? mod;
  const dbPath = `sqlite:stockiha_${organizationId}.db`;
  const newDb = await Database.load(dbPath);
  
  connectionPool.set(organizationId, newDb);
  return newDb;
}
```

## 📊 التوصيات

### الأولوية العالية:
1. ✅ **تحسين إدارة Connections** - التأكد من إعادة استخدام connection موجود فقط
2. ✅ **تحسين Retry Logic** - زيادة delay بين المحاولات
3. ✅ **تحسين Transaction Management** - التأكد من أن جميع العمليات داخل transaction تستخدم نفس connection

### الأولوية المتوسطة:
4. ⚠️ **إضافة Connection Pooling** - إذا استمرت المشكلة
5. ⚠️ **تحسين Logging** - لتتبع المشكلة بشكل أفضل

### الأولوية المنخفضة:
6. ℹ️ **إضافة Metrics** - لتتبع أداء قاعدة البيانات
7. ℹ️ **إضافة Health Checks** - للتحقق من حالة قاعدة البيانات

## 🧪 اختبار الحلول

### اختبار الحل 1 (إدارة Connections):
1. إنشاء طلبية POS
2. مراقبة اللوجات للتأكد من إعادة استخدام connection
3. التحقق من عدم وجود "database is locked" errors

### اختبار الحل 2 (Retry Logic):
1. محاكاة قفل قاعدة البيانات
2. مراقبة retry attempts
3. التحقق من نجاح العملية بعد retries

### اختبار الحل 3 (Transaction Management):
1. إنشاء طلبية POS مع items متعددة
2. مراقبة transactions
3. التحقق من عدم وجود تعارضات

## 📝 ملاحظات إضافية

1. **WAL Mode**: رغم تفعيل WAL mode، قد نحتاج إلى تحسين إعداداته
2. **Busy Timeout**: Tauri SQLite plugin لا يدعم PRAGMA busy_timeout، لذلك نعتمد على retry logic يدوياً
3. **Connection Management**: قد نحتاج إلى إدارة أفضل للـ connections في Tauri SQLite plugin

## 🔗 المراجع

- [SQLite WAL Mode Documentation](https://sqlite.org/wal.html)
- [SQLite Concurrency Best Practices](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)
- [Tauri SQLite Plugin Documentation](https://tauri.app/v1/api/js/sql)

























