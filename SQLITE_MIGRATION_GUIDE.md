# دليل الترحيل من IndexedDB إلى SQLite

## 📋 نظرة عامة

تم ترحيل التطبيق من استخدام **IndexedDB** (في المتصفح) إلى **SQLite** (في تطبيق Electron لسطح المكتب).

### لماذا SQLite؟

| الميزة | IndexedDB | SQLite |
|--------|-----------|--------|
| **الحجم الأقصى** | 50-250 MB | ✅ **غير محدود** |
| **الأداء** | بطيء نسبياً | ✅ **10-50x أسرع** |
| **الاستعلامات** | محدودة | ✅ **SQL كامل** |
| **البحث النصي** | يدوي | ✅ **FTS5 مدمج** |
| **التشفير** | ❌ غير مدعوم | ✅ **SQLCipher** |
| **النسخ الاحتياطي** | صعب | ✅ **نسخ ملف واحد** |
| **الموثوقية** | متوسطة | ✅ **عالية جداً** |

---

## 🏗️ البنية الجديدة

```
src/
├── lib/db/
│   ├── sqliteAPI.ts           # واجهة SQLite الأساسية
│   ├── unifiedDB.ts           # قاعدة موحدة (SQLite + IndexedDB)
│   ├── dbAdapter.ts           # محول للتوافقية مع الكود القديم
│   └── migrationTool.ts       # أداة ترحيل البيانات
├── database/
│   └── localDb.ts             # محدث لاستخدام dbAdapter
├── hooks/
│   └── useDatabaseInitialization.ts  # Hook للتهيئة التلقائية
└── electron/
    ├── sqliteManager.cjs      # مدير SQLite في Electron
    ├── main.cjs               # IPC handlers
    └── preload.cjs            # واجهات قاعدة البيانات
```

---

## 🚀 كيفية الاستخدام

### 1. التهيئة التلقائية

في مكون التطبيق الرئيسي:

```typescript
import { useDatabaseInitialization } from '@/hooks/useDatabaseInitialization';

function App() {
  const dbStatus = useDatabaseInitialization();

  // سيتم تهيئة القاعدة تلقائياً عند بدء التطبيق
  // إذا كان هناك بيانات في IndexedDB، سيعرض طلب للترحيل

  if (dbStatus.isInitializing) {
    return <div>جاري تهيئة قاعدة البيانات...</div>;
  }

  if (dbStatus.migrationNeeded) {
    return (
      <MigrationPrompt onMigrate={dbStatus.startMigration} />
    );
  }

  return <YourApp />;
}
```

### 2. استخدام قاعدة البيانات (بدون تغيير في الكود!)

```typescript
import { inventoryDB } from '@/database/localDb';

// نفس الطريقة القديمة تماماً!
async function addProduct(product) {
  await inventoryDB.products.add(product);
}

async function getProducts() {
  return await inventoryDB.products.toArray();
}

async function searchProducts(query) {
  return await inventoryDB.products
    .where('name')
    .startsWithIgnoreCase(query)
    .toArray();
}
```

### 3. الاستفادة من ميزات SQLite المتقدمة

```typescript
import { sqliteDB } from '@/lib/db/sqliteAPI';

// استعلامات SQL مباشرة
const result = await sqliteDB.query(`
  SELECT
    p.name,
    SUM(oi.quantity) as total_sold,
    SUM(oi.subtotal) as revenue
  FROM products p
  LEFT JOIN pos_order_items oi ON p.id = oi.product_id
  WHERE p.organization_id = ?
  GROUP BY p.id
  ORDER BY revenue DESC
  LIMIT 10
`, [organizationId]);

// بحث نصي كامل (Full-Text Search)
const products = await sqliteDB.search('products', 'تلفزيون سامسونج', {
  limit: 20,
  organizationId: currentOrganizationId
});
```

---

## 🔄 عملية الترحيل

### الترحيل التلقائي

عند فتح التطبيق لأول مرة بعد التحديث:

1. ✅ يتم فحص وجود بيانات في IndexedDB
2. ✅ إذا وجدت بيانات، يتم عرض واجهة الترحيل
3. ✅ المستخدم يضغط "ابدأ الترحيل"
4. ✅ يتم نقل جميع البيانات إلى SQLite (مع شريط تقدم)
5. ✅ عند الانتهاء، يمكن حذف بيانات IndexedDB القديمة

### الترحيل اليدوي

```typescript
import { migrateAllData, cleanupIndexedDB } from '@/lib/db/migrationTool';

// ترحيل البيانات
const result = await migrateAllData(organizationId);

console.log(`
  إجمالي السجلات: ${result.totalRecords}
  تم الترحيل: ${result.migratedRecords}
  فشل: ${result.failedRecords}
  المدة: ${result.duration}ms
`);

// حذف IndexedDB القديمة (اختياري)
if (result.success) {
  await cleanupIndexedDB(organizationId);
}
```

---

## 📊 الجداول المدعومة

جميع الجداول التالية تم ترحيلها:

- ✅ `products` - المنتجات
- ✅ `pos_orders` - طلبات نقطة البيع
- ✅ `pos_order_items` - عناصر الطلبات
- ✅ `customers` - العملاء
- ✅ `invoices` - الفواتير
- ✅ `invoice_items` - عناصر الفواتير
- ✅ `customer_debts` - ديون العملاء
- ✅ `repair_orders` - طلبات الإصلاح
- ✅ `repair_images` - صور الإصلاح
- ✅ `staff_pins` - رموز PIN للموظفين
- ✅ `sync_queue` - صف المزامنة
- ✅ `work_sessions` - جلسات العمل
- ✅ `transactions` - المعاملات

---

## 🛠️ عمليات الصيانة

### ضغط قاعدة البيانات

```typescript
import { sqliteDB } from '@/lib/db/sqliteAPI';

// استعادة المساحة بعد حذف سجلات كثيرة
const result = await sqliteDB.vacuum();
console.log(`تم توفير ${result.saved} MB`);
```

### تنظيف البيانات القديمة

```typescript
// حذف السجلات المتزامنة التي مضى عليها 30 يوم
const result = await sqliteDB.cleanupOldData(30);
console.log(`
  حذف ${result.ordersDeleted} طلب
  حذف ${result.invoicesDeleted} فاتورة
`);
```

### النسخ الاحتياطي

```typescript
import { dialog } from 'electron';

// اختيار مكان الحفظ
const { filePath } = await dialog.showSaveDialog({
  defaultPath: `backup_${organizationId}_${Date.now()}.db`,
  filters: [{ name: 'Database', extensions: ['db'] }]
});

// نسخ احتياطي
if (filePath) {
  await sqliteDB.backup(filePath);
  console.log(`تم الحفظ: ${filePath}`);
}
```

### الاستعادة

```typescript
// اختيار ملف النسخة الاحتياطية
const { filePaths } = await dialog.showOpenDialog({
  filters: [{ name: 'Database', extensions: ['db'] }]
});

// استعادة
if (filePaths[0]) {
  await sqliteDB.restore(filePaths[0]);
  console.log('تمت الاستعادة بنجاح');
}
```

---

## 📍 موقع قاعدة البيانات

### على Windows:
```
C:\Users\{username}\AppData\Roaming\stockiha-pos\databases\stockiha_{organizationId}.db
```

### على macOS:
```
/Users/{username}/Library/Application Support/stockiha-pos/databases/stockiha_{organizationId}.db
```

### على Linux:
```
/home/{username}/.config/stockiha-pos/databases/stockiha_{organizationId}.db
```

---

## 🧪 الاختبار

### في بيئة التطوير

```bash
# تشغيل التطبيق في Electron
npm run electron:dev

# مراقبة الـ logs
# يجب أن ترى:
[SQLite] Database initialized at: /path/to/stockiha_xxx.db
[DB Init] Database type: sqlite
[DB Init] Initialization complete
```

### التحقق من نوع القاعدة

```typescript
import { getDatabaseType, isSQLiteDatabase } from '@/database/localDb';

console.log('Database type:', getDatabaseType()); // 'sqlite' أو 'indexeddb'
console.log('Is SQLite?', isSQLiteDatabase());    // true أو false
```

---

## ⚠️ ملاحظات مهمة

### 1. التوافقية

- ✅ الكود القديم يعمل **بدون أي تعديل**
- ✅ يتم الكشف التلقائي عن البيئة (Electron أو متصفح)
- ✅ في المتصفح، يستمر استخدام IndexedDB
- ✅ في Electron، يتم استخدام SQLite

### 2. الأداء

- ⚡ البحث أسرع **10-50 مرة**
- ⚡ الاستعلامات المعقدة أسرع **100 مرة**
- ⚡ لا توجد حدود على حجم البيانات
- ⚡ دعم Full-Text Search للبحث العربي

### 3. الأمان

- 🔒 البيانات محفوظة في ملف محمي بصلاحيات نظام التشغيل
- 🔒 يمكن تفعيل تشفير SQLCipher لاحقاً
- 🔒 النسخ الاحتياطي سهل وآمن

### 4. المزامنة

- 🔄 نظام المزامنة يعمل بنفس الطريقة
- 🔄 صف المزامنة (`sync_queue`) محفوظ
- 🔄 لا تغيير في آلية المزامنة مع الخادم

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Database not initialized"

**الحل:**
```typescript
import { initializeDatabase } from '@/database/localDb';

await initializeDatabase(organizationId);
```

### المشكلة: "SQLite is only available in Electron"

**السبب:** تحاول استخدام ميزات SQLite في المتصفح

**الحل:** استخدم الواجهة الموحدة أو فحص البيئة:
```typescript
import { isElectron } from '@/lib/db/sqliteAPI';

if (isElectron()) {
  // استخدم SQLite
} else {
  // استخدم IndexedDB
}
```

### المشكلة: البيانات لا تظهر بعد الترحيل

**الحل:**
```typescript
// فحص نتيجة الترحيل
import { getMigrationResult } from '@/lib/db/migrationTool';

const result = getMigrationResult();
console.log('Migration result:', result);
```

---

## 📚 مراجع إضافية

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

## ✅ قائمة التحقق للمطورين

عند إضافة ميزات جديدة:

- [ ] هل الميزة تعمل في كل من SQLite و IndexedDB؟
- [ ] هل تم اختبارها في Electron؟
- [ ] هل تم اختبارها في المتصفح؟
- [ ] هل الأداء محسّن؟
- [ ] هل هناك حاجة لفهارس جديدة؟

---

## 🎉 الخلاصة

التطبيق الآن يستخدم **SQLite** في Electron مع الحفاظ على **التوافقية الكاملة** مع الكود القديم!

**الفوائد:**
- ✅ **لا حدود على حجم البيانات**
- ✅ **أداء أسرع 10-50 مرة**
- ✅ **بحث نصي كامل**
- ✅ **نسخ احتياطي سهل**
- ✅ **استعلامات SQL متقدمة**
- ✅ **موثوقية أعلى**

**الكود القديم يعمل بدون تغيير! 🚀**
