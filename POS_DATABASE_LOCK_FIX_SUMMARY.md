# ملخص إصلاح مشكلة "Database is Locked" عند إنشاء طلبية POS

## 🔍 المشكلة المكتشفة

بعد تحليل شامل للكود واللوجات، تم اكتشاف المشكلة الحقيقية:

### المشكلة الأساسية:
1. **إدارة Connections غير محسّنة**: في `tauriSqlClient.ts`، الدالة `ensureDb()` قد تُنشئ connection جديد في كل مرة يتم استدعاء `Database.load()`, حتى لو كان هناك connection موجود لنفس organization.

2. **عدم إغلاق Connections السابقة**: عند التبديل بين organizations، لا يتم إغلاق connection السابق، مما يؤدي إلى وجود connections متعددة لنفس database.

3. **Retry Logic غير كافٍ**: الـ retry logic الحالي يستخدم delays صغيرة نسبياً (300ms)، مما قد لا يكون كافياً في حالات القفل الشديدة.

## ✅ الحلول المطبقة

### 1. إضافة Connection Pooling
- ✅ إضافة `connectionPool` Map لتخزين connection واحد فقط لكل organization
- ✅ التحقق من أن connection لا يزال نشطاً قبل إعادة استخدامه
- ✅ إغلاق connection السابق قبل إنشاء جديد

**الكود المضاف:**
```typescript
const connectionPool = new Map<string, any>();

async function ensureDb(organizationId: string) {
  // فحص Connection Pool أولاً
  if (connectionPool.has(organizationId)) {
    const cachedDb = connectionPool.get(organizationId);
    try {
      await cachedDb.select('SELECT 1', []);
      return cachedDb;
    } catch {
      connectionPool.delete(organizationId);
    }
  }
  
  // إغلاق connection السابق إذا كان مختلفاً
  if (db && currentOrgId !== organizationId) {
    // ... إغلاق connection السابق
  }
  
  // إنشاء connection جديد وحفظه في Pool
  const newDb = await Database.load(dbPath);
  connectionPool.set(organizationId, newDb);
  return newDb;
}
```

### 2. تحسين Retry Logic
- ✅ زيادة `RETRY_DELAY_MS` من 300ms إلى 500ms
- ✅ زيادة `MAX_RETRY_DELAY_MS` من 5000ms إلى 8000ms
- ✅ تقليل jitter من 50% إلى 30% لتحسين التنبؤ

**التغييرات:**
```typescript
const RETRY_DELAY_MS = 500; // زيادة من 300ms
const MAX_RETRY_DELAY_MS = 8000; // زيادة من 5000ms

function getRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = exponentialDelay * Math.random() * 0.3; // تقليل من 0.5
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}
```

### 3. إضافة دوال إدارة Connections
- ✅ `tauriCloseDatabase(organizationId)`: إغلاق connection لـ organization معين
- ✅ `tauriCloseAllDatabases()`: إغلاق جميع connections
- ✅ `getConnectionPoolInfo()`: الحصول على معلومات Connection Pool للتشخيص

**الدوال المضافة:**
```typescript
export async function tauriCloseDatabase(organizationId: string)
export async function tauriCloseAllDatabases()
export function getConnectionPoolInfo()
```

### 4. تحسين Logging للتشخيص
- ✅ إضافة معلومات Connection Pool في database state checks
- ✅ تحسين رسائل الخطأ لتشمل معلومات Connection Pool

## 📊 النتائج المتوقعة

بعد تطبيق هذه الحلول، نتوقع:

1. **تقليل "database is locked" errors**: من خلال ضمان connection واحد فقط لكل organization
2. **تحسين الأداء**: تقليل وقت الانتظار من ~18 ثانية إلى أقل من 5 ثواني في معظم الحالات
3. **تقليل عدد Retries**: من 3-4 محاولات إلى 1-2 محاولات في معظم الحالات
4. **تحسين استقرار النظام**: من خلال إدارة أفضل للـ connections

## 🧪 اختبار الحلول

### خطوات الاختبار:
1. ✅ إنشاء طلبية POS جديدة
2. ✅ مراقبة اللوجات للتأكد من إعادة استخدام connection
3. ✅ التحقق من عدم وجود "database is locked" errors
4. ✅ التحقق من أن عدد retries أقل من السابق
5. ✅ التحقق من أن وقت التنفيذ أقل من السابق

### مؤشرات النجاح:
- ✅ لا توجد "database is locked" errors
- ✅ عدد retries ≤ 2 في معظم الحالات
- ✅ وقت التنفيذ < 5 ثواني في معظم الحالات
- ✅ Connection Pool يحتوي على connection واحد فقط لكل organization

## 📝 ملاحظات إضافية

1. **WAL Mode**: رغم تفعيل WAL mode، قد نحتاج إلى تحسين إعداداته في المستقبل
2. **Busy Timeout**: Tauri SQLite plugin لا يدعم PRAGMA busy_timeout، لذلك نعتمد على retry logic يدوياً
3. **Connection Management**: يجب التأكد من إغلاق connections عند التبديل بين organizations أو عند إغلاق التطبيق

## 🔗 الملفات المعدلة

1. ✅ `src/lib/db/tauriSqlClient.ts`:
   - إضافة Connection Pooling
   - تحسين Retry Logic
   - إضافة دوال إدارة Connections
   - تحسين Logging

## 📅 تاريخ التطبيق

- **التاريخ**: 2025-12-03
- **الإصدار**: v5.0
- **الحالة**: ✅ مكتمل


















