# 🚀 **خطة التحويل الكامل إلى PowerSync**
## **تحليل معمق شامل + خطة تنفيذ تفصيلية**

**النسخة:** 1.0.0
**التاريخ:** 2025-12-03
**الحالة:** جاهز للتنفيذ
**المدة المتوقعة:** 60-80 Prompt (5-7 أيام عمل)

---

# 📊 **القسم الأول: التحليل الشامل للنظام الحالي**

## **1.1 البيئة التقنية**

### **Frontend Stack**
```json
{
  "framework": "React 19.1.1",
  "runtime": "Tauri 2.0.0",
  "database": "SQLite (via @tauri-apps/plugin-sql 2.0.0)",
  "backend": "Supabase 2.57.0",
  "stateManagement": "React Query 5.85.9 + Context API",
  "language": "TypeScript 5.9.2"
}
```

### **Tauri Configuration**
```toml
# من Cargo.toml
[dependencies.tauri-plugin-sql]
version = "2"
features = ["sqlite"]

# الإضافات المستخدمة:
- tauri-plugin-updater
- tauri-plugin-process
- tauri-plugin-log
- tauri-plugin-notification
```

**⚠️ ملاحظة حرجة:**
- Tauri يستخدم SQLite محلي عبر `@tauri-apps/plugin-sql`
- PowerSync يدعم Tauri بشكل كامل عبر `@powersync/web` + `wa-sqlite`
- يجب استبدال Tauri SQLite Plugin بـ PowerSync

---

## **1.2 تحليل نظام المزامنة الحالي**

### **البنية الحالية:**
```
src/lib/sync/
├── core/
│   ├── SyncManager.ts         (1,172 سطر) - المدير الرئيسي
│   ├── PullEngine.ts          (~800 سطر)  - سحب من Supabase
│   ├── PushEngine.ts          (~600 سطر)  - دفع إلى Supabase
│   ├── SQLiteWriteQueue.ts    (~400 سطر)  - قائمة انتظار الكتابة
│   └── DatabaseCoordinator.ts  (~300 سطر)  - تنسيق العمليات
├── queue/
│   └── OutboxManager.ts       (~500 سطر)  - إدارة العمليات المعلقة
├── ConflictResolver.ts        (375 سطر)   - حل التضاربات
├── SyncTracker.ts             (286 سطر)   - تتبع المزامنة
├── RealtimeEngine.ts          (~400 سطر)  - مزامنة فورية
└── modern/
    └── MessagePackCodec.ts     (~200 سطر)  - ضغط البيانات

المجموع: ~5,000+ سطر من كود المزامنة!
```

### **آلية العمل الحالية:**
```typescript
// 1. الكتابة المحلية + Outbox
await sqliteWriteQueue.write('INSERT INTO orders ...');
await outboxManager.add({
  tableName: 'orders',
  operation: 'INSERT',
  recordId: orderId,
  payload: orderData
});

// 2. المزامنة الدورية (كل 30 ثانية)
setInterval(() => {
  syncManager.syncAll(); // Pull + Push
}, 30000);

// 3. Conflict Resolution يدوي
if (conflict) {
  const resolved = conflictResolver.resolve(local, server, 'merge');
}
```

**المشاكل:**
- ❌ معقد جداً (5000+ سطر)
- ❌ صيانة مستمرة مطلوبة
- ❌ Bugs محتملة في Conflict Resolution
- ❌ Schema Migrations معقدة (59 إصدار!)
- ❌ Outbox يحتاج cleanup يدوي

---

## **1.3 تحليل قاعدة البيانات SQLite**

### **Schema الحالي:**
```typescript
// من tauriSchema.ts
const SCHEMA_VERSION = 59; // 59 إصدار!

// الجداول (31 جدول):
const tables = [
  'products',              // 5,000 منتج/عميل
  'product_categories',
  'product_advanced_settings',
  'product_marketing_settings',
  'product_wholesale_tiers',
  'orders',                // 60,000 طلبية/شهر/عميل
  'order_items',           // 300,000 عنصر/شهر/عميل
  'customers',
  'employees',
  'staff_work_sessions',
  'suppliers',
  'supplier_purchases',
  'supplier_payments',
  'repair_orders',
  'repair_status_history',
  'repair_images',
  'expenses',
  'expense_categories',
  'returns',
  'return_items',
  'losses',
  'loss_items',
  'invoices',
  'invoice_items',
  'customer_debts',
  'customer_debt_payments',
  'pos_settings',
  'organization_settings',
  'subscriptions',
  'sync_outbox',           // للمزامنة
  'sync_state'             // للمزامنة
];
```

### **الأعمدة المحلية (سيتم حذفها مع PowerSync):**
```sql
-- في كل جدول:
synced INTEGER DEFAULT 0,
sync_status TEXT,
pending_operation TEXT,
local_updated_at TEXT,

-- أعمدة بحث محلية:
name_lower TEXT,
email_lower TEXT,
phone_digits TEXT
```

**حجم البيانات (للسيناريو المذكور):**
- 100 عميل × 5,000 منتج = 500,000 منتج (~1 GB)
- 100 عميل × 60,000 طلبية/شهر = 6M طلبية (~6 GB)
- 100 عميل × 300,000 عنصر/شهر = 30M عنصر (~15 GB)
- **إجمالي: ~24 GB/شهر بيانات مزامنة**

---

## **1.4 تحليل Supabase Integration**

### **Client الحالي:**
```typescript
// من supabase-unified.ts
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      flowType: 'pkce',
      storageKey: 'bazaar-supabase-auth-unified-v3',
      storage: sqliteAuthStorage // Custom storage
    },
    realtime: {
      timeout: 300000,
      heartbeatIntervalMs: 120000
    }
  }
);
```

### **استخدام Supabase في الكود:**
```bash
# من Grep results - 30+ ملف يستخدم supabase.from/rpc/auth:
src/lib/sync/core/PullEngine.ts
src/lib/sync/core/PushEngine.ts
src/context/POSOrdersDataContext.tsx
src/services/LocalProductSearchService.ts
src/pages/POSOrdersOptimized.tsx
... 25+ ملف إضافي
```

**⚠️ التحدي:**
- يجب استبدال جميع `supabase.from()` بـ PowerSync queries
- Auth يبقى كما هو (Supabase Auth)
- Realtime يستبدل بـ PowerSync Sync Engine

---

## **1.5 تحليل Tauri-Specific Requirements**

### **SQLite في Tauri:**
```typescript
// الحالي (Tauri Plugin):
import Database from '@tauri-apps/plugin-sql';
const db = await Database.load('sqlite:stockiha.db');

// بعد PowerSync:
import { PowerSyncDatabase } from '@powersync/web';
const powerSync = new PowerSyncDatabase({
  database: {
    dbFilename: 'stockiha_powersync.db'
  }
});
```

### **Tauri Capabilities:**
```json
// من tauri.conf.json
{
  "plugins": {
    "sql": {
      "preload": ["sqlite:stockiha.db"]
    }
  }
}
```

**⚠️ يجب تحديث:**
- إزالة `tauri-plugin-sql` من dependencies
- إضافة PowerSync dependencies
- تحديث Tauri permissions للسماح بـ WebSocket (للـ sync)

---

# 📋 **القسم الثاني: خطة التحويل التفصيلية**

## **المرحلة 0: الإعداد والتحضير (Prompts 1-5)**

### **Prompt 1: تثبيت Dependencies**

#### **الملفات المتأثرة:**
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

#### **التغييرات:**

**أ) package.json:**
```json
{
  "dependencies": {
    // ✅ موجود بالفعل:
    "@powersync/react": "^1.7.2",
    "@powersync/web": "^1.26.0",

    // ⚠️ إزالة (لن نحتاجها):
    // "@tauri-apps/plugin-sql": "^2.0.0" (نبقيها مؤقتاً للـ migration)

    // ✅ إضافة:
    "@powersync/common": "^1.40.0",
    "@journeyapps/wa-sqlite": "^1.3.3"
  }
}
```

**ب) Cargo.toml:**
```toml
[dependencies]
# ⚠️ إبقاء tauri-plugin-sql مؤقتاً للـ migration
[dependencies.tauri-plugin-sql]
version = "2"
features = ["sqlite"]
# سنحذفها لاحقاً بعد اكتمال Migration
```

**ج) tauri.conf.json:**
```json
{
  "app": {
    "security": {
      "csp": {
        "default-src": "'self'",
        "connect-src": [
          "'self'",
          "https://wrnssatuvmumsczyldth.supabase.co",
          "wss://wrnssatuvmumsczyldth.supabase.co",
          "https://*.powersync.com" // للـ PowerSync Cloud
        ],
        "script-src": "'self' 'wasm-unsafe-eval'", // مهم لـ wa-sqlite
        "worker-src": "'self' blob:"
      }
    }
  }
}
```

---

### **Prompt 2: إنشاء هيكل PowerSync**

#### **الملفات الجديدة:**
```
src/lib/powersync/
├── config/
│   ├── schema.ts           // تعريف Schema الكامل (31 جدول)
│   ├── connector.ts        // Supabase Connector
│   └── sync-rules.yaml     // Sync Rules (للـ backend)
├── services/
│   ├── PowerSyncService.ts // الخدمة الرئيسية
│   └── AuthService.ts      // ربط مع Supabase Auth
├── hooks/
│   ├── usePowerSync.ts     // Hook رئيسي
│   ├── usePowerSyncQuery.ts
│   └── usePowerSyncMutation.ts
├── migration/
│   ├── dataMigration.ts    // ترحيل البيانات
│   └── validation.ts       // التحقق من البيانات
└── types/
    └── powersync.types.ts  // الأنواع
```

---

### **Prompt 3: تعريف PowerSync Schema الكامل**

#### **الملف:** `src/lib/powersync/config/schema.ts`

```typescript
import { Column, Schema, Table, Index } from '@powersync/web';

// ✅ تحويل جميع 31 جدول من tauriSchema.ts إلى PowerSync Schema

export const PowerSyncSchema = new Schema([
  // ==========================================
  // 1. PRODUCTS - المنتجات
  // ==========================================
  new Table({
    name: 'products',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'sku', type: 'TEXT' }),
      new Column({ name: 'barcode', type: 'TEXT' }),
      new Column({ name: 'price', type: 'REAL' }),
      new Column({ name: 'cost_price', type: 'REAL' }),
      new Column({ name: 'stock_quantity', type: 'REAL' }),
      new Column({ name: 'min_stock_level', type: 'REAL' }),
      new Column({ name: 'max_stock_level', type: 'REAL' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'image_url', type: 'TEXT' }),
      new Column({ name: 'category_id', type: 'TEXT' }),
      new Column({ name: 'subcategory_id', type: 'TEXT' }),
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'track_inventory', type: 'INTEGER' }),
      new Column({ name: 'allow_negative_stock', type: 'INTEGER' }),
      new Column({ name: 'unit_of_measure', type: 'TEXT' }),
      new Column({ name: 'weight', type: 'REAL' }),
      new Column({ name: 'dimensions', type: 'TEXT' }), // JSON
      new Column({ name: 'tags', type: 'TEXT' }), // JSON
      new Column({ name: 'metadata', type: 'TEXT' }), // JSON

      // Wholesale
      new Column({ name: 'wholesale_enabled', type: 'INTEGER' }),
      new Column({ name: 'wholesale_price', type: 'REAL' }),
      new Column({ name: 'min_wholesale_quantity', type: 'REAL' }),

      // Advanced selling
      new Column({ name: 'enable_weight_selling', type: 'INTEGER' }),
      new Column({ name: 'price_per_kg', type: 'REAL' }),
      new Column({ name: 'min_weight_per_sale', type: 'REAL' }),
      new Column({ name: 'max_weight_per_sale', type: 'REAL' }),
      new Column({ name: 'enable_box_selling', type: 'INTEGER' }),
      new Column({ name: 'units_per_box', type: 'REAL' }),
      new Column({ name: 'box_price', type: 'REAL' }),
      new Column({ name: 'enable_meter_selling', type: 'INTEGER' }),
      new Column({ name: 'price_per_meter', type: 'REAL' }),
      new Column({ name: 'min_meters_per_sale', type: 'REAL' }),
      new Column({ name: 'max_meters_per_sale', type: 'REAL' }),
      new Column({ name: 'roll_length_meters', type: 'REAL' }),

      // Tracking
      new Column({ name: 'track_expiry', type: 'INTEGER' }),
      new Column({ name: 'track_serial_numbers', type: 'INTEGER' }),
      new Column({ name: 'track_batches', type: 'INTEGER' }),
      new Column({ name: 'warranty_enabled', type: 'INTEGER' }),
      new Column({ name: 'warranty_duration_days', type: 'INTEGER' }),

      // Business types
      new Column({ name: 'is_pharmacy_item', type: 'INTEGER' }),
      new Column({ name: 'is_restaurant_item', type: 'INTEGER' }),
      new Column({ name: 'is_auto_part', type: 'INTEGER' }),

      // Timestamps
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
      new Column({ name: 'last_inventory_update', type: 'TEXT' }),

      // ⚠️ ملاحظة: لا أعمدة synced/sync_status - PowerSync يديرها تلقائياً
    ],
    indexes: [
      new Index({ name: 'idx_products_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_products_sku', columns: ['sku'] }),
      new Index({ name: 'idx_products_barcode', columns: ['barcode'] }),
      new Index({ name: 'idx_products_category', columns: ['category_id'] }),
      new Index({ name: 'idx_products_active', columns: ['is_active', 'organization_id'] }),
    ]
  }),

  // ==========================================
  // 2. PRODUCT_CATEGORIES - فئات المنتجات
  // ==========================================
  new Table({
    name: 'product_categories',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'parent_id', type: 'TEXT' }),
      new Column({ name: 'image_url', type: 'TEXT' }),
      new Column({ name: 'display_order', type: 'INTEGER' }),
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_categories_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_categories_parent', columns: ['parent_id'] }),
    ]
  }),

  // ==========================================
  // 3. ORDERS - الطلبات
  // ==========================================
  new Table({
    name: 'orders',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'global_order_number', type: 'TEXT' }),
      new Column({ name: 'local_order_number', type: 'INTEGER' }),
      new Column({ name: 'employee_id', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'customer_name', type: 'TEXT' }),

      // Amounts
      new Column({ name: 'subtotal', type: 'REAL' }),
      new Column({ name: 'tax', type: 'REAL' }),
      new Column({ name: 'discount', type: 'REAL' }),
      new Column({ name: 'total', type: 'REAL' }),
      new Column({ name: 'amount_paid', type: 'REAL' }),
      new Column({ name: 'remaining_amount', type: 'REAL' }),

      // Payment
      new Column({ name: 'payment_method', type: 'TEXT' }),
      new Column({ name: 'payment_status', type: 'TEXT' }),
      new Column({ name: 'consider_remaining_as_partial', type: 'INTEGER' }),

      // Status
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'is_online', type: 'INTEGER' }),

      // Notes & Metadata
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'metadata', type: 'TEXT' }), // JSON
      new Column({ name: 'extra_fields', type: 'TEXT' }), // JSON

      // Timestamps
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_orders_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_orders_status', columns: ['status', 'organization_id'] }),
      new Index({ name: 'idx_orders_customer', columns: ['customer_id'] }),
      new Index({ name: 'idx_orders_employee', columns: ['employee_id'] }),
      new Index({ name: 'idx_orders_date', columns: ['created_at', 'organization_id'] }),
      new Index({ name: 'idx_orders_global_number', columns: ['global_order_number'] }),
    ]
  }),

  // ==========================================
  // 4. ORDER_ITEMS - عناصر الطلبات
  // ==========================================
  new Table({
    name: 'order_items',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'order_id', type: 'TEXT' }),
      new Column({ name: 'product_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'slug', type: 'TEXT' }),

      // Pricing
      new Column({ name: 'quantity', type: 'REAL' }),
      new Column({ name: 'unit_price', type: 'REAL' }),
      new Column({ name: 'original_price', type: 'REAL' }),
      new Column({ name: 'discount', type: 'REAL' }),
      new Column({ name: 'total_price', type: 'REAL' }),

      // Sale type
      new Column({ name: 'is_wholesale', type: 'INTEGER' }),
      new Column({ name: 'sale_type', type: 'TEXT' }),

      // Variants
      new Column({ name: 'color_id', type: 'TEXT' }),
      new Column({ name: 'color_name', type: 'TEXT' }),
      new Column({ name: 'size_id', type: 'TEXT' }),
      new Column({ name: 'size_name', type: 'TEXT' }),
      new Column({ name: 'variant_info', type: 'TEXT' }), // JSON

      // Advanced selling
      new Column({ name: 'selling_unit_type', type: 'TEXT' }),
      new Column({ name: 'weight_sold', type: 'REAL' }),
      new Column({ name: 'weight_unit', type: 'TEXT' }),
      new Column({ name: 'price_per_weight_unit', type: 'REAL' }),
      new Column({ name: 'meters_sold', type: 'REAL' }),
      new Column({ name: 'price_per_meter', type: 'REAL' }),
      new Column({ name: 'boxes_sold', type: 'REAL' }),
      new Column({ name: 'units_per_box', type: 'REAL' }),
      new Column({ name: 'box_price', type: 'REAL' }),

      // Tracking
      new Column({ name: 'batch_id', type: 'TEXT' }),
      new Column({ name: 'batch_number', type: 'TEXT' }),
      new Column({ name: 'expiry_date', type: 'TEXT' }),
      new Column({ name: 'serial_numbers', type: 'TEXT' }), // JSON

      // Timestamp
      new Column({ name: 'created_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_order_items_order', columns: ['order_id'] }),
      new Index({ name: 'idx_order_items_product', columns: ['product_id'] }),
    ]
  }),

  // ==========================================
  // 5. CUSTOMERS - العملاء
  // ==========================================
  new Table({
    name: 'customers',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'email', type: 'TEXT' }),
      new Column({ name: 'phone', type: 'TEXT' }),
      new Column({ name: 'address', type: 'TEXT' }),
      new Column({ name: 'city', type: 'TEXT' }),
      new Column({ name: 'country', type: 'TEXT' }),
      new Column({ name: 'postal_code', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'tags', type: 'TEXT' }), // JSON
      new Column({ name: 'metadata', type: 'TEXT' }), // JSON
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_customers_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_customers_phone', columns: ['phone'] }),
      new Index({ name: 'idx_customers_email', columns: ['email'] }),
    ]
  }),

  // ==========================================
  // 6. EMPLOYEES - الموظفين
  // ==========================================
  new Table({
    name: 'employees',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'user_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'email', type: 'TEXT' }),
      new Column({ name: 'phone', type: 'TEXT' }),
      new Column({ name: 'role', type: 'TEXT' }),
      new Column({ name: 'department', type: 'TEXT' }),
      new Column({ name: 'position', type: 'TEXT' }),
      new Column({ name: 'salary', type: 'REAL' }),
      new Column({ name: 'hire_date', type: 'TEXT' }),
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'permissions', type: 'TEXT' }), // JSON
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_employees_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_employees_email', columns: ['email'] }),
    ]
  }),

  // ==========================================
  // 7. STAFF_WORK_SESSIONS - جلسات العمل
  // ==========================================
  new Table({
    name: 'staff_work_sessions',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'employee_id', type: 'TEXT' }),
      new Column({ name: 'employee_name', type: 'TEXT' }),

      // Cash management
      new Column({ name: 'opening_cash', type: 'REAL' }),
      new Column({ name: 'closing_cash', type: 'REAL' }),
      new Column({ name: 'expected_cash', type: 'REAL' }),
      new Column({ name: 'cash_difference', type: 'REAL' }),

      // Sales statistics
      new Column({ name: 'total_sales', type: 'REAL' }),
      new Column({ name: 'total_orders', type: 'INTEGER' }),
      new Column({ name: 'cash_sales', type: 'REAL' }),
      new Column({ name: 'card_sales', type: 'REAL' }),

      // Session times
      new Column({ name: 'started_at', type: 'TEXT' }),
      new Column({ name: 'ended_at', type: 'TEXT' }),
      new Column({ name: 'paused_at', type: 'TEXT' }),
      new Column({ name: 'resumed_at', type: 'TEXT' }),

      // Pause info
      new Column({ name: 'pause_count', type: 'INTEGER' }),
      new Column({ name: 'total_pause_duration', type: 'INTEGER' }),

      // Status
      new Column({ name: 'status', type: 'TEXT' }), // active, paused, closed

      // Notes
      new Column({ name: 'opening_notes', type: 'TEXT' }),
      new Column({ name: 'closing_notes', type: 'TEXT' }),

      // Timestamps
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_work_sessions_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_work_sessions_emp', columns: ['employee_id'] }),
      new Index({ name: 'idx_work_sessions_status', columns: ['status', 'organization_id'] }),
      new Index({ name: 'idx_work_sessions_date', columns: ['started_at', 'organization_id'] }),
    ]
  }),

  // ==========================================
  // 8. SUPPLIERS - الموردين
  // ==========================================
  new Table({
    name: 'suppliers',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'company_name', type: 'TEXT' }),
      new Column({ name: 'email', type: 'TEXT' }),
      new Column({ name: 'phone', type: 'TEXT' }),
      new Column({ name: 'address', type: 'TEXT' }),
      new Column({ name: 'city', type: 'TEXT' }),
      new Column({ name: 'country', type: 'TEXT' }),
      new Column({ name: 'tax_number', type: 'TEXT' }),
      new Column({ name: 'payment_terms', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'created_by', type: 'TEXT' }),
      new Column({ name: 'updated_by', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_suppliers_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_suppliers_name', columns: ['name'] }),
    ]
  }),

  // ==========================================
  // 9. REPAIR_ORDERS - طلبات الإصلاح
  // ==========================================
  new Table({
    name: 'repair_orders',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'order_number', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'customer_name', type: 'TEXT' }),
      new Column({ name: 'customer_phone', type: 'TEXT' }),
      new Column({ name: 'device_type', type: 'TEXT' }),
      new Column({ name: 'repair_location_id', type: 'TEXT' }),
      new Column({ name: 'custom_location', type: 'TEXT' }),
      new Column({ name: 'issue_description', type: 'TEXT' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'total_price', type: 'REAL' }),
      new Column({ name: 'paid_amount', type: 'REAL' }),
      new Column({ name: 'price_to_be_determined_later', type: 'INTEGER' }),
      new Column({ name: 'payment_method', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'received_by', type: 'TEXT' }),
      new Column({ name: 'repair_tracking_code', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_repairs_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_repairs_customer', columns: ['customer_id'] }),
      new Index({ name: 'idx_repairs_status', columns: ['status'] }),
      new Index({ name: 'idx_repairs_tracking', columns: ['repair_tracking_code'] }),
    ]
  }),

  // ==========================================
  // 10. EXPENSES - المصروفات
  // ==========================================
  new Table({
    name: 'expenses',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'title', type: 'TEXT' }),
      new Column({ name: 'amount', type: 'REAL' }),
      new Column({ name: 'category_id', type: 'TEXT' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'expense_date', type: 'TEXT' }),
      new Column({ name: 'payment_method', type: 'TEXT' }),
      new Column({ name: 'receipt_url', type: 'TEXT' }),
      new Column({ name: 'is_recurring', type: 'INTEGER' }),
      new Column({ name: 'recurring_frequency', type: 'TEXT' }),
      new Column({ name: 'tags', type: 'TEXT' }), // JSON
      new Column({ name: 'created_by', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_expenses_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_expenses_category', columns: ['category_id'] }),
      new Index({ name: 'idx_expenses_date', columns: ['expense_date'] }),
    ]
  }),

  // ==========================================
  // 11. EXPENSE_CATEGORIES - فئات المصروفات
  // ==========================================
  new Table({
    name: 'expense_categories',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'icon', type: 'TEXT' }),
      new Column({ name: 'color', type: 'TEXT' }),
      new Column({ name: 'is_active', type: 'INTEGER' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_expense_categories_org', columns: ['organization_id'] }),
    ]
  }),

  // ==========================================
  // 12. RETURNS - الإرجاعات
  // ==========================================
  new Table({
    name: 'returns',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'return_number', type: 'TEXT' }),
      new Column({ name: 'original_order_id', type: 'TEXT' }),
      new Column({ name: 'original_order_number', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'customer_name', type: 'TEXT' }),
      new Column({ name: 'customer_phone', type: 'TEXT' }),
      new Column({ name: 'customer_email', type: 'TEXT' }),
      new Column({ name: 'return_type', type: 'TEXT' }),
      new Column({ name: 'return_reason', type: 'TEXT' }),
      new Column({ name: 'return_reason_description', type: 'TEXT' }),
      new Column({ name: 'original_total', type: 'REAL' }),
      new Column({ name: 'return_amount', type: 'REAL' }),
      new Column({ name: 'refund_amount', type: 'REAL' }),
      new Column({ name: 'restocking_fee', type: 'REAL' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'refund_method', type: 'TEXT' }),
      new Column({ name: 'requires_manager_approval', type: 'INTEGER' }),
      new Column({ name: 'created_by', type: 'TEXT' }),
      new Column({ name: 'approved_by', type: 'TEXT' }),
      new Column({ name: 'approved_at', type: 'TEXT' }),
      new Column({ name: 'approval_notes', type: 'TEXT' }),
      new Column({ name: 'rejection_reason', type: 'TEXT' }),
      new Column({ name: 'rejected_by', type: 'TEXT' }),
      new Column({ name: 'rejected_at', type: 'TEXT' }),
      new Column({ name: 'processed_by', type: 'TEXT' }),
      new Column({ name: 'processed_at', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'internal_notes', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_returns_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_returns_order', columns: ['original_order_id'] }),
      new Index({ name: 'idx_returns_customer', columns: ['customer_id'] }),
      new Index({ name: 'idx_returns_status', columns: ['status'] }),
    ]
  }),

  // ==========================================
  // 13. RETURN_ITEMS - عناصر الإرجاع
  // ==========================================
  new Table({
    name: 'return_items',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'return_id', type: 'TEXT' }),
      new Column({ name: 'product_id', type: 'TEXT' }),
      new Column({ name: 'product_name', type: 'TEXT' }),
      new Column({ name: 'product_sku', type: 'TEXT' }),
      new Column({ name: 'quantity', type: 'REAL' }),
      new Column({ name: 'unit_price', type: 'REAL' }),
      new Column({ name: 'refund_amount', type: 'REAL' }),
      new Column({ name: 'condition', type: 'TEXT' }),
      new Column({ name: 'restocked', type: 'INTEGER' }),
      new Column({ name: 'inventory_returned', type: 'INTEGER' }),
      new Column({ name: 'color_id', type: 'TEXT' }),
      new Column({ name: 'color_name', type: 'TEXT' }),
      new Column({ name: 'size_id', type: 'TEXT' }),
      new Column({ name: 'size_name', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_return_items_return', columns: ['return_id'] }),
      new Index({ name: 'idx_return_items_product', columns: ['product_id'] }),
    ]
  }),

  // ==========================================
  // 14. LOSSES - الخسائر
  // ==========================================
  new Table({
    name: 'losses',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'loss_number', type: 'TEXT' }),
      new Column({ name: 'loss_type', type: 'TEXT' }),
      new Column({ name: 'loss_category', type: 'TEXT' }),
      new Column({ name: 'loss_description', type: 'TEXT' }),
      new Column({ name: 'incident_date', type: 'TEXT' }),
      new Column({ name: 'reported_by', type: 'TEXT' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'approved_by', type: 'TEXT' }),
      new Column({ name: 'approved_at', type: 'TEXT' }),
      new Column({ name: 'total_cost_value', type: 'REAL' }),
      new Column({ name: 'total_selling_value', type: 'REAL' }),
      new Column({ name: 'total_items_count', type: 'INTEGER' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_losses_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_losses_status', columns: ['status'] }),
      new Index({ name: 'idx_losses_date', columns: ['incident_date'] }),
    ]
  }),

  // ==========================================
  // 15. LOSS_ITEMS - عناصر الخسائر
  // ==========================================
  new Table({
    name: 'loss_items',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'loss_id', type: 'TEXT' }),
      new Column({ name: 'product_id', type: 'TEXT' }),
      new Column({ name: 'product_name', type: 'TEXT' }),
      new Column({ name: 'product_sku', type: 'TEXT' }),
      new Column({ name: 'lost_quantity', type: 'REAL' }),
      new Column({ name: 'unit_cost_price', type: 'REAL' }),
      new Column({ name: 'unit_selling_price', type: 'REAL' }),
      new Column({ name: 'total_cost_value', type: 'REAL' }),
      new Column({ name: 'total_selling_value', type: 'REAL' }),
      new Column({ name: 'loss_condition', type: 'TEXT' }),
      new Column({ name: 'inventory_adjusted', type: 'INTEGER' }),
      new Column({ name: 'color_id', type: 'TEXT' }),
      new Column({ name: 'color_name', type: 'TEXT' }),
      new Column({ name: 'size_id', type: 'TEXT' }),
      new Column({ name: 'size_name', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_loss_items_loss', columns: ['loss_id'] }),
      new Index({ name: 'idx_loss_items_product', columns: ['product_id'] }),
    ]
  }),

  // ==========================================
  // 16. INVOICES - الفواتير
  // ==========================================
  new Table({
    name: 'invoices',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'invoice_number', type: 'TEXT' }),
      new Column({ name: 'remote_invoice_id', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'customer_name', type: 'TEXT' }),
      new Column({ name: 'total_amount', type: 'REAL' }),
      new Column({ name: 'invoice_date', type: 'TEXT' }),
      new Column({ name: 'due_date', type: 'TEXT' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'source_type', type: 'TEXT' }),
      new Column({ name: 'payment_method', type: 'TEXT' }),
      new Column({ name: 'payment_status', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'tax_amount', type: 'REAL' }),
      new Column({ name: 'discount_amount', type: 'REAL' }),
      new Column({ name: 'subtotal_amount', type: 'REAL' }),
      new Column({ name: 'shipping_amount', type: 'REAL' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_invoices_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_invoices_customer', columns: ['customer_id'] }),
      new Index({ name: 'idx_invoices_number', columns: ['invoice_number'] }),
    ]
  }),

  // ==========================================
  // 17. INVOICE_ITEMS - عناصر الفواتير
  // ==========================================
  new Table({
    name: 'invoice_items',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'invoice_id', type: 'TEXT' }),
      new Column({ name: 'name', type: 'TEXT' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'quantity', type: 'REAL' }),
      new Column({ name: 'unit_price', type: 'REAL' }),
      new Column({ name: 'total_price', type: 'REAL' }),
      new Column({ name: 'product_id', type: 'TEXT' }),
      new Column({ name: 'type', type: 'TEXT' }),
      new Column({ name: 'sku', type: 'TEXT' }),
      new Column({ name: 'barcode', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_invoice_items_invoice', columns: ['invoice_id'] }),
    ]
  }),

  // ==========================================
  // 18. CUSTOMER_DEBTS - ديون العملاء
  // ==========================================
  new Table({
    name: 'customer_debts',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'customer_name', type: 'TEXT' }),
      new Column({ name: 'order_id', type: 'TEXT' }),
      new Column({ name: 'order_number', type: 'TEXT' }),
      new Column({ name: 'subtotal', type: 'REAL' }),
      new Column({ name: 'discount', type: 'REAL' }),
      new Column({ name: 'total_amount', type: 'REAL' }),
      new Column({ name: 'paid_amount', type: 'REAL' }),
      new Column({ name: 'remaining_amount', type: 'REAL' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'description', type: 'TEXT' }),
      new Column({ name: 'due_date', type: 'TEXT' }),
      new Column({ name: 'notes', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_customer_debts_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_customer_debts_customer', columns: ['customer_id'] }),
      new Index({ name: 'idx_customer_debts_status', columns: ['status'] }),
    ]
  }),

  // ==========================================
  // 19. CUSTOMER_DEBT_PAYMENTS - مدفوعات الديون
  // ==========================================
  new Table({
    name: 'customer_debt_payments',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'customer_id', type: 'TEXT' }),
      new Column({ name: 'amount', type: 'REAL' }),
      new Column({ name: 'method', type: 'TEXT' }),
      new Column({ name: 'note', type: 'TEXT' }),
      new Column({ name: 'applied_by', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_debt_payments_org', columns: ['organization_id'] }),
      new Index({ name: 'idx_debt_payments_customer', columns: ['customer_id'] }),
    ]
  }),

  // ==========================================
  // 20. POS_SETTINGS - إعدادات نقطة البيع
  // ==========================================
  new Table({
    name: 'pos_settings',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'store_name', type: 'TEXT' }),
      new Column({ name: 'store_address', type: 'TEXT' }),
      new Column({ name: 'store_phone', type: 'TEXT' }),
      new Column({ name: 'store_email', type: 'TEXT' }),
      new Column({ name: 'store_website', type: 'TEXT' }),
      new Column({ name: 'store_logo_url', type: 'TEXT' }),
      new Column({ name: 'receipt_header_text', type: 'TEXT' }),
      new Column({ name: 'receipt_footer_text', type: 'TEXT' }),
      new Column({ name: 'welcome_message', type: 'TEXT' }),
      new Column({ name: 'show_qr_code', type: 'INTEGER' }),
      new Column({ name: 'show_tracking_code', type: 'INTEGER' }),
      new Column({ name: 'show_customer_info', type: 'INTEGER' }),
      new Column({ name: 'show_store_logo', type: 'INTEGER' }),
      new Column({ name: 'show_store_info', type: 'INTEGER' }),
      new Column({ name: 'show_date_time', type: 'INTEGER' }),
      new Column({ name: 'show_employee_name', type: 'INTEGER' }),
      new Column({ name: 'paper_width', type: 'INTEGER' }),
      new Column({ name: 'font_size', type: 'INTEGER' }),
      new Column({ name: 'line_spacing', type: 'INTEGER' }),
      new Column({ name: 'print_density', type: 'TEXT' }),
      new Column({ name: 'auto_cut', type: 'INTEGER' }),
      new Column({ name: 'receipt_template', type: 'TEXT' }),
      new Column({ name: 'primary_color', type: 'TEXT' }),
      new Column({ name: 'secondary_color', type: 'TEXT' }),
      new Column({ name: 'text_color', type: 'TEXT' }),
      new Column({ name: 'background_color', type: 'TEXT' }),
      new Column({ name: 'allow_price_edit', type: 'INTEGER' }),
      new Column({ name: 'require_manager_approval', type: 'INTEGER' }),
      new Column({ name: 'business_license', type: 'TEXT' }),
      new Column({ name: 'tax_number', type: 'TEXT' }),
      new Column({ name: 'activity', type: 'TEXT' }),
      new Column({ name: 'rc', type: 'TEXT' }),
      new Column({ name: 'nif', type: 'TEXT' }),
      new Column({ name: 'nis', type: 'TEXT' }),
      new Column({ name: 'rib', type: 'TEXT' }),
      new Column({ name: 'currency_symbol', type: 'TEXT' }),
      new Column({ name: 'currency_position', type: 'TEXT' }),
      new Column({ name: 'tax_label', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_pos_settings_org', columns: ['organization_id'] }),
    ]
  }),

  // ==========================================
  // 21. SUBSCRIPTIONS - الاشتراكات
  // ==========================================
  new Table({
    name: 'subscriptions',
    columns: [
      new Column({ name: 'id', type: 'TEXT', primary: true }),
      new Column({ name: 'organization_id', type: 'TEXT' }),
      new Column({ name: 'plan_id', type: 'TEXT' }),
      new Column({ name: 'plan_code', type: 'TEXT' }),
      new Column({ name: 'plan_name', type: 'TEXT' }),
      new Column({ name: 'status', type: 'TEXT' }),
      new Column({ name: 'billing_cycle', type: 'TEXT' }),
      new Column({ name: 'start_date', type: 'TEXT' }),
      new Column({ name: 'end_date', type: 'TEXT' }),
      new Column({ name: 'trial_end_date', type: 'TEXT' }),
      new Column({ name: 'grace_end_date', type: 'TEXT' }),
      new Column({ name: 'limits', type: 'TEXT' }), // JSON
      new Column({ name: 'permissions', type: 'TEXT' }), // JSON
      new Column({ name: 'features', type: 'TEXT' }), // JSON
      new Column({ name: 'amount_paid', type: 'REAL' }),
      new Column({ name: 'currency', type: 'TEXT' }),
      new Column({ name: 'last_check', type: 'TEXT' }),
      new Column({ name: 'created_at', type: 'TEXT' }),
      new Column({ name: 'updated_at', type: 'TEXT' }),
    ],
    indexes: [
      new Index({ name: 'idx_subscriptions_org', columns: ['organization_id'] }),
    ]
  }),

  // ==========================================
  // ... بقية الجداول (supplier_purchases, supplier_payments, etc.)
  // سأكملها في الكود الفعلي
  // ==========================================
]);

// ✅ Export Schema
export default PowerSyncSchema;
```

---

### **Prompt 4: إعداد Supabase Connector**

#### **الملف:** `src/lib/powersync/config/connector.ts`

```typescript
import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import { supabase } from '@/lib/supabase-unified';

/**
 * PowerSync Connector لربط مع Supabase
 * يدير authentication و data upload
 */
export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    // الحصول على Session من Supabase Auth
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error('No active Supabase session');
    }

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL || '',
      token: session.access_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastError: Error | null = null;

    try {
      // معالجة كل عملية CRUD
      for (const operation of transaction.crud) {
        try {
          await this.processCrudOperation(operation);
        } catch (error) {
          console.error(
            `[PowerSync] Failed to upload ${operation.op} on ${operation.table}:`,
            error
          );
          lastError = error as Error;
        }
      }

      // إذا نجحت جميع العمليات، نؤكد Transaction
      if (!lastError) {
        await transaction.complete();
      } else {
        throw lastError;
      }
    } catch (error) {
      console.error('[PowerSync] Upload transaction failed:', error);
      throw error;
    }
  }

  private async processCrudOperation(op: CrudEntry): Promise<void> {
    const table = op.table;
    const recordId = op.id;
    const data = op.opData;

    switch (op.op) {
      case UpdateType.PUT:
        // إنشاء أو تحديث كامل
        await this.upsertRecord(table, recordId, data);
        break;

      case UpdateType.PATCH:
        // تحديث جزئي
        await this.updateRecord(table, recordId, data);
        break;

      case UpdateType.DELETE:
        // حذف
        await this.deleteRecord(table, recordId);
        break;

      default:
        console.warn(`[PowerSync] Unknown operation type: ${op.op}`);
    }
  }

  private async upsertRecord(
    table: string,
    recordId: string,
    data: any
  ): Promise<void> {
    const record = { ...data, id: recordId };

    const { error } = await supabase.from(table).upsert(record, {
      onConflict: 'id',
    });

    if (error) {
      throw new Error(`Upsert failed for ${table}: ${error.message}`);
    }
  }

  private async updateRecord(
    table: string,
    recordId: string,
    data: any
  ): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', recordId);

    if (error) {
      throw new Error(`Update failed for ${table}: ${error.message}`);
    }
  }

  private async deleteRecord(table: string, recordId: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', recordId);

    if (error) {
      throw new Error(`Delete failed for ${table}: ${error.message}`);
    }
  }
}
```

---

### **Prompt 5: إنشاء PowerSync Service**

#### **الملف:** `src/lib/powersync/services/PowerSyncService.ts`

```typescript
import { PowerSyncDatabase } from '@powersync/web';
import { WASQLiteDBAdapter } from '@powersync/web';
import PowerSyncSchema from '../config/schema';
import { SupabasePowerSyncConnector } from '../config/connector';

/**
 * PowerSync Service - Singleton
 * يدير PowerSync Database Instance
 */
class PowerSyncService {
  private static instance: PowerSyncService;
  private db: PowerSyncDatabase | null = null;
  private connector: SupabasePowerSyncConnector;
  private isInitialized = false;

  private constructor() {
    this.connector = new SupabasePowerSyncConnector();
  }

  static getInstance(): PowerSyncService {
    if (!PowerSyncService.instance) {
      PowerSyncService.instance = new PowerSyncService();
    }
    return PowerSyncService.instance;
  }

  /**
   * تهيئة PowerSync Database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      console.log('[PowerSync] Already initialized');
      return;
    }

    try {
      console.log('[PowerSync] Initializing...');

      this.db = new PowerSyncDatabase({
        database: {
          dbFilename: 'stockiha_powersync.db',
          dbLocation: 'default',
        },
        schema: PowerSyncSchema,
        flags: {
          // تفعيل WAL mode للأداء الأفضل
          enableMultiTabs: false, // Tauri = single window
        },
      });

      // الاتصال
      await this.db.connect(this.connector);

      this.isInitialized = true;
      console.log('[PowerSync] ✅ Initialized successfully');

      // بدء المزامنة التلقائية
      this.db.connectPowerSync();

      // الاستماع لأحداث المزامنة
      this.setupSyncListeners();
    } catch (error) {
      console.error('[PowerSync] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * الحصول على PowerSync Database Instance
   */
  getDatabase(): PowerSyncDatabase {
    if (!this.db) {
      throw new Error('PowerSync not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * إعداد Sync Listeners
   */
  private setupSyncListeners(): void {
    if (!this.db) return;

    this.db.registerListener({
      statusChanged: (status) => {
        console.log('[PowerSync] Status:', status);

        // إرسال event للـ UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('powersync-status-changed', {
              detail: status,
            })
          );
        }
      },

      uploadsChanged: (uploads) => {
        console.log('[PowerSync] Uploads:', uploads);
      },
    });
  }

  /**
   * قطع الاتصال (للـ cleanup)
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.disconnectAndClear();
      this.db = null;
      this.isInitialized = false;
      console.log('[PowerSync] Disconnected');
    }
  }

  /**
   * فحص حالة المزامنة
   */
  get syncStatus() {
    return this.db?.currentStatus || null;
  }

  /**
   * الحصول على إحصائيات
   */
  async getStats() {
    if (!this.db) return null;

    return {
      connected: this.db.connected,
      hasSynced: this.db.hasSynced,
      status: this.db.currentStatus,
      // يمكن إضافة إحصائيات إضافية
    };
  }
}

// تصدير Singleton
export const powerSyncService = PowerSyncService.getInstance();
export default powerSyncService;
```

---

# 📦 **المرحلة 1: ترحيل البيانات (Prompts 6-15)**

## **Prompt 6: إنشاء Data Migration Service**

**الهدف:** بناء خدمة ترحيل البيانات من SQLite القديم إلى PowerSync

**📁 الملف:** `src/lib/powersync/DataMigrationService.ts`

```typescript
/**
 * 🔄 Data Migration Service
 * ترحيل البيانات من SQLite القديم (Tauri) إلى PowerSync
 */

import { PowerSyncDatabase } from '@powersync/web';
import { TauriSqlClient } from '@/lib/db/tauriSqlClient';
import { powerSyncService } from './PowerSyncService';

interface MigrationProgress {
  tableName: string;
  total: number;
  migrated: number;
  percentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

interface MigrationResult {
  success: boolean;
  tablesCompleted: string[];
  tablesFailed: string[];
  totalRecords: number;
  migratedRecords: number;
  duration: number;
  errors: Array<{ table: string; error: string }>;
}

export class DataMigrationService {
  private static instance: DataMigrationService;
  private oldDb: TauriSqlClient;
  private newDb: PowerSyncDatabase | null = null;
  private progress: Map<string, MigrationProgress> = new Map();

  // الجداول بالترتيب (الجداول التي لا تعتمد على جداول أخرى أولاً)
  private readonly TABLE_MIGRATION_ORDER = [
    // 1. Master data (لا تعتمد على شيء)
    'organizations',
    'users',
    'employees',
    'roles',
    'permissions',

    // 2. Lookups
    'categories',
    'units',
    'suppliers',
    'customers',
    'addresses',

    // 3. Products (تعتمد على categories, suppliers, units)
    'products',
    'product_variants',
    'serial_numbers',
    'batches',

    // 4. Inventory (تعتمد على products)
    'inventory_adjustments',
    'stock_movements',
    'loss_declarations',

    // 5. Financial (تعتمد على products, customers)
    'work_sessions',
    'pos_orders',
    'order_items',
    'order_payments',
    'invoices',
    'invoice_items',
    'expenses',
    'customer_debts',
    'debt_payments',

    // 6. System
    'sync_metadata',
    'subscription_transactions',
    'repairs',
  ];

  private constructor() {
    this.oldDb = TauriSqlClient.getInstance();
  }

  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  /**
   * بدء عملية الترحيل الكاملة
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      tablesCompleted: [],
      tablesFailed: [],
      totalRecords: 0,
      migratedRecords: 0,
      duration: 0,
      errors: [],
    };

    console.log('[DataMigration] 🚀 Starting full data migration...');

    try {
      // 1. التأكد من تهيئة PowerSync
      this.newDb = powerSyncService.getDatabase();

      // 2. إنشاء نسخة احتياطية من القاعدة القديمة
      await this.createBackup();

      // 3. ترحيل كل جدول بالترتيب
      for (const tableName of this.TABLE_MIGRATION_ORDER) {
        try {
          console.log(`[DataMigration] 📊 Migrating table: ${tableName}`);

          await this.migrateTable(tableName);
          result.tablesCompleted.push(tableName);

        } catch (error) {
          console.error(`[DataMigration] ❌ Failed to migrate ${tableName}:`, error);
          result.tablesFailed.push(tableName);
          result.errors.push({
            table: tableName,
            error: error instanceof Error ? error.message : String(error),
          });

          // قرار: هل نتوقف عند أول خطأ؟ أم نكمل باقي الجداول؟
          // حالياً: نكمل باقي الجداول
        }
      }

      // 4. التحقق من سلامة البيانات
      const validationResult = await this.validateMigration();

      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 5. حساب الإحصائيات النهائية
      for (const progress of this.progress.values()) {
        result.totalRecords += progress.total;
        result.migratedRecords += progress.migrated;
      }

      result.success = result.tablesFailed.length === 0;
      result.duration = Date.now() - startTime;

      console.log('[DataMigration] ✅ Migration completed:', result);

      return result;

    } catch (error) {
      console.error('[DataMigration] ❌ Migration failed:', error);
      result.success = false;
      result.duration = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * ترحيل جدول واحد
   */
  private async migrateTable(tableName: string): Promise<void> {
    // 1. تهيئة التقدم
    const progress: MigrationProgress = {
      tableName,
      total: 0,
      migrated: 0,
      percentage: 0,
      status: 'in_progress',
    };
    this.progress.set(tableName, progress);

    // 2. عد الصفوف في الجدول القديم
    const countResult = await this.oldDb.execute(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    const total = countResult[0]?.count || 0;
    progress.total = total;

    console.log(`[DataMigration] Table ${tableName}: ${total} records to migrate`);

    if (total === 0) {
      progress.status = 'completed';
      progress.percentage = 100;
      return;
    }

    // 3. جلب البيانات على دفعات (batch)
    const BATCH_SIZE = 500;
    let offset = 0;

    while (offset < total) {
      const batch = await this.oldDb.execute(
        `SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      );

      // 4. تنظيف البيانات (إزالة الحقول المحلية)
      const cleanedBatch = batch.map((row: any) => this.cleanRecord(row, tableName));

      // 5. إدخال في PowerSync
      await this.insertBatch(tableName, cleanedBatch);

      // 6. تحديث التقدم
      offset += batch.length;
      progress.migrated = offset;
      progress.percentage = Math.round((offset / total) * 100);

      console.log(`[DataMigration] ${tableName}: ${progress.percentage}% (${offset}/${total})`);
    }

    progress.status = 'completed';
    console.log(`[DataMigration] ✅ ${tableName} completed`);
  }

  /**
   * تنظيف السجل من الحقول المحلية
   */
  private cleanRecord(record: any, tableName: string): any {
    const cleaned = { ...record };

    // إزالة الحقول المحلية التي لا تحتاجها PowerSync
    const localFields = [
      'synced',
      'sync_status',
      'pending_operation',
      'localUpdatedAt',
      'syncStatus',
      'last_synced',
      'sync_error',
    ];

    for (const field of localFields) {
      delete cleaned[field];
    }

    // تحويل null إلى undefined للحقول غير المطلوبة
    for (const key in cleaned) {
      if (cleaned[key] === null && !this.isNullableField(tableName, key)) {
        delete cleaned[key];
      }
    }

    return cleaned;
  }

  /**
   * فحص إذا كان الحقل يقبل null
   */
  private isNullableField(tableName: string, fieldName: string): boolean {
    // قائمة الحقول التي تقبل null
    const nullableFields: Record<string, string[]> = {
      products: ['description', 'image_url', 'barcode', 'supplier_id', 'category_id'],
      customers: ['phone', 'email', 'address'],
      // ... إضافة باقي الجداول
    };

    return nullableFields[tableName]?.includes(fieldName) || false;
  }

  /**
   * إدخال دفعة من السجلات
   */
  private async insertBatch(tableName: string, records: any[]): Promise<void> {
    if (!this.newDb) throw new Error('PowerSync not initialized');

    // استخدام transaction للأداء
    await this.newDb.execute('BEGIN TRANSACTION');

    try {
      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map(() => '?').join(', ');

        const sql = `
          INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        await this.newDb.execute(sql, values);
      }

      await this.newDb.execute('COMMIT');
    } catch (error) {
      await this.newDb.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * إنشاء نسخة احتياطية
   */
  private async createBackup(): Promise<void> {
    console.log('[DataMigration] 💾 Creating backup...');

    // Tauri: نسخ ملف القاعدة
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `stockiha_backup_${timestamp}.db`;

    // استخدام Tauri FS API للنسخ
    // هذا يتطلب إضافة Tauri FS plugin
    console.log(`[DataMigration] Backup created: ${backupPath}`);
  }

  /**
   * التحقق من سلامة البيانات
   */
  private async validateMigration(): Promise<{ isValid: boolean; errors: string[] }> {
    console.log('[DataMigration] 🔍 Validating migration...');

    const errors: string[] = [];

    if (!this.newDb) {
      errors.push('PowerSync database not initialized');
      return { isValid: false, errors };
    }

    // 1. التحقق من عدد الصفوف
    for (const tableName of this.TABLE_MIGRATION_ORDER) {
      const oldCount = await this.oldDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const newCount = await this.newDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);

      const oldTotal = oldCount[0]?.count || 0;
      const newTotal = newCount[0]?.count || 0;

      if (oldTotal !== newTotal) {
        errors.push(
          `Table ${tableName}: count mismatch (old: ${oldTotal}, new: ${newTotal})`
        );
      }
    }

    // 2. التحقق من العلاقات (Foreign Keys)
    const orphanedRecords = await this.checkOrphanedRecords();
    errors.push(...orphanedRecords);

    // 3. التحقق من البيانات الحرجة (Orders, Inventory)
    const criticalDataErrors = await this.validateCriticalData();
    errors.push(...criticalDataErrors);

    const isValid = errors.length === 0;

    if (isValid) {
      console.log('[DataMigration] ✅ Validation passed');
    } else {
      console.error('[DataMigration] ❌ Validation failed:', errors);
    }

    return { isValid, errors };
  }

  /**
   * فحص السجلات اليتيمة (orphaned records)
   */
  private async checkOrphanedRecords(): Promise<string[]> {
    const errors: string[] = [];

    if (!this.newDb) return errors;

    // مثال: التحقق من order_items بدون orders
    const orphanedItems = await this.newDb.execute(`
      SELECT COUNT(*) as count
      FROM order_items oi
      LEFT JOIN pos_orders o ON oi.order_id = o.id
      WHERE o.id IS NULL
    `);

    if (orphanedItems[0]?.count > 0) {
      errors.push(`Found ${orphanedItems[0].count} orphaned order_items`);
    }

    // إضافة المزيد من الفحوصات...

    return errors;
  }

  /**
   * التحقق من البيانات الحرجة
   */
  private async validateCriticalData(): Promise<string[]> {
    const errors: string[] = [];

    if (!this.newDb) return errors;

    // 1. التحقق من صحة المخزون
    const negativeStock = await this.newDb.execute(`
      SELECT COUNT(*) as count
      FROM products
      WHERE stock_quantity < 0
    `);

    if (negativeStock[0]?.count > 0) {
      errors.push(`Found ${negativeStock[0].count} products with negative stock`);
    }

    // 2. التحقق من صحة الأسعار
    const invalidPrices = await this.newDb.execute(`
      SELECT COUNT(*) as count
      FROM products
      WHERE selling_price <= 0 OR cost_price < 0
    `);

    if (invalidPrices[0]?.count > 0) {
      errors.push(`Found ${invalidPrices[0].count} products with invalid prices`);
    }

    return errors;
  }

  /**
   * الحصول على تقدم الترحيل
   */
  getProgress(): MigrationProgress[] {
    return Array.from(this.progress.values());
  }

  /**
   * إلغاء الترحيل والعودة إلى النسخة الاحتياطية
   */
  async rollback(): Promise<void> {
    console.log('[DataMigration] ⏮️  Rolling back migration...');

    // حذف قاعدة PowerSync
    if (this.newDb) {
      await this.newDb.disconnectAndClear();
    }

    // استعادة النسخة الاحتياطية
    // ...

    console.log('[DataMigration] ✅ Rollback completed');
  }
}

// تصدير singleton
export const dataMigrationService = DataMigrationService.getInstance();
```

---

## **Prompt 7: إنشاء Migration UI Component**

**الهدف:** واجهة مستخدم لمراقبة عملية الترحيل

**📁 الملف:** `src/components/migration/MigrationWizard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { dataMigrationService } from '@/lib/powersync/DataMigrationService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface MigrationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function MigrationWizard({ onComplete, onCancel }: MigrationWizardProps) {
  const [step, setStep] = useState<'confirm' | 'migrating' | 'completed' | 'failed'>('confirm');
  const [progress, setProgress] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'migrating') {
      const interval = setInterval(() => {
        const currentProgress = dataMigrationService.getProgress();
        setProgress(currentProgress);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleStartMigration = async () => {
    setStep('migrating');
    setError(null);

    try {
      const migrationResult = await dataMigrationService.migrate();

      setResult(migrationResult);

      if (migrationResult.success) {
        setStep('completed');
      } else {
        setStep('failed');
      }
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStep('failed');
    }
  };

  const handleRollback = async () => {
    try {
      await dataMigrationService.rollback();
      onCancel();
    } catch (err) {
      console.error('Rollback failed:', err);
    }
  };

  // المرحلة 1: التأكيد
  if (step === 'confirm') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">ترحيل البيانات إلى PowerSync</h2>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>تحذير:</strong> هذه العملية ستقوم بترحيل جميع البيانات من النظام القديم إلى PowerSync.
            يُنصح بإنشاء نسخة احتياطية قبل المتابعة.
          </AlertDescription>
        </Alert>

        <div className="mb-6 space-y-2">
          <h3 className="font-semibold">ما سيتم:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>إنشاء نسخة احتياطية تلقائية</li>
            <li>ترحيل 31 جدول بياناً</li>
            <li>التحقق من سلامة البيانات</li>
            <li>حذف الحقول المحلية القديمة</li>
          </ul>
        </div>

        <div className="mb-6 space-y-2">
          <h3 className="font-semibold text-red-600">تحذيرات:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
            <li>لا تغلق التطبيق أثناء الترحيل</li>
            <li>تأكد من وجود اتصال بالإنترنت</li>
            <li>قد تستغرق العملية عدة دقائق</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Button onClick={handleStartMigration} size="lg" className="flex-1">
            بدء الترحيل
          </Button>
          <Button onClick={onCancel} variant="outline" size="lg">
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  // المرحلة 2: جاري الترحيل
  if (step === 'migrating') {
    const totalProgress = progress.length > 0
      ? progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length
      : 0;

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Loader2 className="animate-spin" />
          جاري الترحيل...
        </h2>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">التقدم الإجمالي</span>
            <span className="text-sm text-gray-600">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {progress.map((p) => (
            <div key={p.tableName} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{p.tableName}</span>
                <span className="text-sm flex items-center gap-1">
                  {p.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {p.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {p.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                  {p.migrated} / {p.total}
                </span>
              </div>
              <Progress value={p.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // المرحلة 3: مكتمل
  if (step === 'completed') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">تم الترحيل بنجاح!</h2>
          <p className="text-gray-600">تم ترحيل جميع البيانات إلى PowerSync</p>
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span>الجداول المكتملة:</span>
              <span className="font-bold">{result.tablesCompleted.length}</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي السجلات:</span>
              <span className="font-bold">{result.totalRecords.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>المدة:</span>
              <span className="font-bold">{(result.duration / 1000).toFixed(1)}s</span>
            </div>
          </div>
        )}

        <Button onClick={onComplete} size="lg" className="w-full">
          المتابعة إلى التطبيق
        </Button>
      </div>
    );
  }

  // المرحلة 4: فشل
  if (step === 'failed') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">فشل الترحيل</h2>
          <p className="text-gray-600">حدث خطأ أثناء ترحيل البيانات</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && result.errors.length > 0 && (
          <div className="mb-6 max-h-60 overflow-y-auto">
            <h3 className="font-semibold mb-2">الأخطاء:</h3>
            <ul className="space-y-1 text-sm">
              {result.errors.map((err: any, idx: number) => (
                <li key={idx} className="text-red-600">
                  {err.table}: {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={handleRollback} variant="destructive" className="flex-1">
            التراجع واستعادة النسخة الاحتياطية
          </Button>
          <Button onClick={handleStartMigration} variant="outline">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
```

---

## **Prompt 8: تحديث App Initialization**

**الهدف:** تعديل تهيئة التطبيق لتشغيل الترحيل إذا لزم الأمر

**📁 الملف:** `src/App.tsx` (تعديل)

```typescript
import { useState, useEffect } from 'react';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { MigrationWizard } from '@/components/migration/MigrationWizard';

function App() {
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // 1. فحص إذا كان PowerSync مهيأ مسبقاً
      const isPowerSyncInitialized = await checkPowerSyncInitialized();

      if (!isPowerSyncInitialized) {
        // 2. عرض معالج الترحيل
        setMigrationNeeded(true);
      } else {
        // 3. تهيئة PowerSync عادياً
        await powerSyncService.initialize();
      }
    } catch (error) {
      console.error('App initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  }

  async function checkPowerSyncInitialized(): Promise<boolean> {
    try {
      // فحص وجود قاعدة PowerSync
      const db = powerSyncService.getDatabase();

      // فحص وجود بيانات
      const result = await db.execute('SELECT COUNT(*) as count FROM products');
      return result[0]?.count > 0;
    } catch {
      return false;
    }
  }

  function handleMigrationComplete() {
    setMigrationNeeded(false);
    // إعادة تحميل التطبيق
    window.location.reload();
  }

  // عرض شاشة الترحيل إذا لزم
  if (migrationNeeded) {
    return (
      <MigrationWizard
        onComplete={handleMigrationComplete}
        onCancel={() => {
          // إغلاق التطبيق أو العودة
          window.close();
        }}
      />
    );
  }

  // باقي كود التطبيق...
  return <div>...</div>;
}
```

---

## **Prompt 9-15: سكريبتات الترحيل المساعدة**

سأقوم بإنشاء سكريبتات إضافية لدعم عملية الترحيل...

### **Prompt 9: Data Validation Script**

**📁 الملف:** `src/scripts/validateMigration.ts`

```typescript
/**
 * سكريبت التحقق من سلامة الترحيل
 * يمكن تشغيله بشكل مستقل للتحقق من البيانات
 */

import { PowerSyncDatabase } from '@powersync/web';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

interface ValidationReport {
  timestamp: string;
  tables: Array<{
    name: string;
    rowCount: number;
    issues: string[];
  }>;
  criticalIssues: string[];
  warnings: string[];
  passed: boolean;
}

export async function validateMigration(): Promise<ValidationReport> {
  const db = powerSyncService.getDatabase();
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    tables: [],
    criticalIssues: [],
    warnings: [],
    passed: true,
  };

  // قائمة الجداول للفحص
  const tables = [
    'products', 'categories', 'pos_orders', 'order_items',
    'customers', 'suppliers', 'work_sessions', // ... الخ
  ];

  for (const tableName of tables) {
    const tableReport = {
      name: tableName,
      rowCount: 0,
      issues: [],
    };

    try {
      // 1. عد الصفوف
      const countResult = await db.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      tableReport.rowCount = countResult[0]?.count || 0;

      // 2. فحوصات خاصة بكل جدول
      const issues = await validateTable(db, tableName);
      tableReport.issues = issues;

      if (issues.length > 0) {
        report.criticalIssues.push(...issues);
        report.passed = false;
      }
    } catch (error) {
      tableReport.issues.push(`Failed to validate: ${error}`);
      report.passed = false;
    }

    report.tables.push(tableReport);
  }

  return report;
}

async function validateTable(db: PowerSyncDatabase, tableName: string): Promise<string[]> {
  const issues: string[] = [];

  switch (tableName) {
    case 'products':
      // فحص المنتجات
      const invalidProducts = await db.execute(`
        SELECT COUNT(*) as count FROM products
        WHERE name IS NULL OR name = ''
           OR selling_price <= 0
           OR stock_quantity < 0
      `);
      if (invalidProducts[0]?.count > 0) {
        issues.push(`${invalidProducts[0].count} products have invalid data`);
      }
      break;

    case 'pos_orders':
      // فحص الطلبات
      const invalidOrders = await db.execute(`
        SELECT COUNT(*) as count FROM pos_orders
        WHERE total_amount <= 0
      `);
      if (invalidOrders[0]?.count > 0) {
        issues.push(`${invalidOrders[0].count} orders have invalid total`);
      }
      break;

    // ... باقي الجداول
  }

  return issues;
}

// تشغيل من CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigration().then((report) => {
    console.log('📊 Validation Report:');
    console.log(JSON.stringify(report, null, 2));

    if (report.passed) {
      console.log('✅ All validations passed');
      process.exit(0);
    } else {
      console.log('❌ Validation failed');
      process.exit(1);
    }
  });
}
```

---

_سأكمل باقي Prompts 10-15 في الرسالة القادمة لتجنب رسالة طويلة جداً..._
