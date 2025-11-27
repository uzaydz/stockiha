# SQLite Offline & Sync Audit Report

> Central report for analyzing SQLite usage, schema alignment, and sync flows in the Electron build.
> This file will be updated incrementally as we progress in the audit.

---

## 1. Scope & Goals

- **Environment focus**: Electron build only.
- **Primary requirements**:
  - Use **SQLite only** for offline data in Electron.
  - Remove any reliance on **IndexedDB / Dexie / localforage** from Electron paths.
  - Ensure all offline caches (app init, POS, inventory, permissions, etc.) are persisted in SQLite.
  - Verify schema alignment between **Supabase** (remote) and **SQLite** (local) for core tables.

---

## 2. Architecture Overview (Current Understanding)

- **Electron main process**:
  - `electron/sqliteManager.cjs` manages the SQLite database:
    - Opens per-organization DB.
    - Creates tables with `CREATE TABLE IF NOT EXISTS`.
    - Runs safe migrations using `addColumnIfNotExists`.
    - Applies performance PRAGMAs (WAL, synchronous, cache size, etc.).

- **Renderer SQLite API**:
  - `src/lib/db/sqliteAPI.ts` wraps `window.electronAPI.db`:
    - Methods: `query`, `queryOne`, `upsert`, `delete`, `execute`, transactions.
    - Handles Electron-only availability and initialization per organization.

- **Compatibility / Adapter Layer**:
  - `src/lib/db/dbAdapter.ts` (`DatabaseAdapter`, `TableAdapter`):
    - Preserves **Dexie-like API** (`add`, `put`, `bulkPut`, `where`, `count`, etc.).
    - Backend:
      - **Electron** → SQLite via `sqliteDB`.
      - **Web** → Dexie (for browser fallback).
    - Table coverage includes: `products`, `inventory`, `pos_orders`, `pos_order_items`, `customers`, `invoices`, `invoice_items`, `customer_debts`, `customer_debt_payments`, `work_sessions`, `transactions`, `loss_declarations`, `loss_items`, `user_permissions`, `staff_pins`, etc.

- **Offline services & hooks** (examples):
  - `src/lib/db/inventoryDB.ts` – inventory stock + transactions.
  - `src/api/localPosOrderService.ts` – local POS orders.
  - `src/api/localInvoiceService.ts` – local invoices.
  - `src/api/localCustomerDebtService.ts` – local customer debts.
  - `src/api/localWorkSessionService.ts` – work sessions.
  - `src/api/localLossDeclarationService.ts` – loss declarations.
  - `src/context/PermissionsContext.tsx` – user permissions.
  - `src/hooks/useUnifiedPOSData.ts` – unified POS data (online/offline).

---

## 3. IndexedDB / Dexie / localforage Usage (Electron vs Web)

### 3.1 High-level status

- **Electron build (focus of this audit)**:
  - Core offline flows (POS orders, invoices, inventory, work sessions, customer debts, loss declarations, permissions, staff PINs) are designed to use **SQLite** through `window.electronAPI.db` and/or `DatabaseAdapter`.
  - Remaining Dexie usage is generally confined to **browser fallback paths** (when `window.electronAPI` is not available).

- **Web build**:
  - Still relies on Dexie/IndexedDB via `localDb` / `inventoryDB` as expected.

### 3.2 Key findings by file

- **`src/database/localDb.ts`**
  - Contains TypeScript interfaces for local entities and **wrapper stores** for a `localforage`-like API (e.g. `productsStore`, `syncQueueStore`).
  - Actual Dexie implementation moved to `localDb.backup.ts` (legacy). `localDb.ts` is now mostly types + wrappers over `inventoryDB`/`DatabaseAdapter`.

- **`src/database/localDb.backup.ts`**
  - Legacy Dexie implementation:
    - `import Dexie from 'dexie';`
    - `class LocalDatabase extends Dexie { ... }` with tables: `products`, `inventory`, `transactions`, `syncQueue`, `customers`, `posOrders`, `posOrderItems`, `invoices`, `invoiceItems`, `customerDebts`, `lossDeclarations`, `lossItems`, `workSessions`, etc.
  - Provides extra `localforage`-style helpers (`keys()` etc.).
  - Should **not** be used directly in Electron; to be treated as backup/legacy only.

- **`src/hooks/useUnifiedPOSData.ts`**
  - Contains `hydrateDexieFromCachedResponse` but logs make it clear it is now hydrating **SQLite** via `inventoryDB` in Electron:
    - Uses `inventoryDB.products.bulkPut(...)`, `inventoryDB.customers.bulkPut(...)`, `inventoryDB.posOrders.bulkPut(...)`.
  - Naming is historical (mentions Dexie), but in Electron the backend is SQLite (through the adapter).

- **`src/components/navbar/NavbarSyncIndicator.tsx`**
  - Electron path:
    - Reads unsynced counts from SQLite via raw SQL queries and `inventoryDB`.
  - Web fallback:
    - Explicit comment `// Fallback: استخدام Dexie إذا لم يكن Electron`.
    - Uses `inventoryDB.syncQueue.count()`, `inventoryDB.posOrders.count()`, etc., backed by Dexie in the browser.

- **`src/api/localInvoiceService.ts`**
  - **Electron (SQLite)**:
    - Uses `window.electronAPI.db.query(...)` and `window.electronAPI.db.upsert('invoices', ...)`, `upsert('invoice_items', ...)`.
  - **Web fallback (Dexie)**:
    - Commented as `// استخدام Dexie في المتصفح`.
    - Uses `inventoryDB.invoices.where(...).equals(...).toArray()` and `bulkPut` on Dexie tables.
  - Conclusion: invoices in Electron **do not** depend on Dexie.

- **`src/lib/db/migrationTool.ts`**
  - Commented explicitly that IndexedDB/Dexie migration path is **disabled** in SQLite build.
  - Provides stubs for compatibility without pulling Dexie in Electron.

- **`src/lib/db/dbAdapter.ts`**
  - Described as: "provides the same interface that was used with Dexie/IndexedDB".
  - In Electron, all table operations are executed against **SQLite** (`sqliteDB`), not Dexie.

**Conclusion (so far)**:
- For Electron, the main offline flows are correctly wired to **SQLite**.
- Dexie/IndexedDB usage is largely isolated to:
  - Legacy file `localDb.backup.ts`.
  - Browser-specific fallback branches.
- Next steps: confirm that `localDb.backup.ts` is **not imported** by any active Electron path, and that no Electron-only code path still calls Dexie APIs directly.

---

## 4. Schema Comparison: `invoices` & `invoice_items`

### 4.1 Supabase schema – `invoices` (remote)

From `src/types/database.types.ts`:

- **Identity & ownership**:
  - `id: string`
  - `organization_id: string`

- **Core invoice fields**:
  - `invoice_number: string`
  - `invoice_date: string`
  - `due_date: string | null`
  - `status: string`
  - `source_type: string`
  - `payment_method: string`
  - `payment_status: string`

- **Amounts**:
  - `subtotal_amount: number`
  - `discount_amount: number`
  - `tax_amount: number`
  - `shipping_amount: number | null`
  - `total_amount: number`

- **Customer / org / metadata**:
  - `customer_id: string | null`
  - `customer_name: string | null`
  - `customer_info: Json | null`
  - `organization_info: Json | null`
  - `custom_fields: Json | null`
  - `source_id: string | null`
  - `notes: string | null`

- **Timestamps**:
  - `created_at: string | null`
  - `updated_at: string | null`

### 4.2 SQLite schema – `invoices` (local)

From `electron/sqliteManager.cjs`:

```sql
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  invoice_number_lower TEXT,
  remote_invoice_id TEXT,
  customer_name TEXT,
  customer_name_lower TEXT,
  customer_id TEXT,
  total_amount REAL NOT NULL,
  invoice_date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  source_type TEXT,
  payment_method TEXT,
  payment_status TEXT,
  notes TEXT,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  subtotal_amount REAL DEFAULT 0,
  shipping_amount REAL,
  discount_type TEXT,
  discount_percentage REAL,
  tva_rate REAL,
  amount_ht REAL,
  amount_tva REAL,
  amount_ttc REAL,
  organization_id TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  sync_status TEXT,
  pending_operation TEXT,
  local_created_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 4.3 SQLite schema – `invoice_items` (local)

```sql
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  product_id TEXT,
  type TEXT DEFAULT 'product',
  sku TEXT,
  barcode TEXT,
  tva_rate REAL,
  unit_price_ht REAL,
  unit_price_ttc REAL,
  total_ht REAL,
  total_tva REAL,
  total_ttc REAL,
  created_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

### 4.4 Alignment & differences

- **Aligned core fields** (present in both Supabase and SQLite):
  - `id`, `organization_id`.
  - `invoice_number`, `invoice_date`, `due_date`.
  - `status`, `source_type`, `payment_method`, `payment_status`.
  - `subtotal_amount`, `discount_amount`, `tax_amount`, `shipping_amount`, `total_amount`.
  - `customer_id`, `customer_name`.
  - `notes`, `created_at`, `updated_at`.

- **Extra local-only fields in SQLite**:
  - Search/normalization: `invoice_number_lower`, `customer_name_lower`.
  - Remote linkage: `remote_invoice_id`.
  - Tax/price breakdown: `discount_type`, `discount_percentage`, `tva_rate`, `amount_ht`, `amount_tva`, `amount_ttc`.
  - Sync metadata: `synced`, `sync_status`, `pending_operation`, `local_created_at`.
  - In `invoice_items`: `tva_rate`, `unit_price_ht`, `unit_price_ttc`, `total_ht`, `total_tva`, `total_ttc`, `synced`.

  These are reasonable local enhancements and do **not** conflict with Supabase.

- **Remote-only fields (present in Supabase, missing in SQLite)**:
  - `custom_fields: Json | null`.
  - `customer_info: Json | null`.
  - `organization_info: Json | null`.
  - `source_id: string | null`.

  Potential impact:
  - If any offline UI requires rich JSON metadata (custom fields, full customer/org info), SQLite currently does **not** store it.
  - If offline flows only need core financial and status data (amounts, status, customer basic info), this omission is acceptable but limits offline feature parity.

### 4.5 Preliminary conclusion for invoices

- From a **sync and core business logic** perspective, the SQLite schema for `invoices` and `invoice_items` is broadly aligned with Supabase.
- SQLite adds useful offline/sync-specific fields without breaking compatibility.
- Missing JSON metadata fields should be reviewed against actual usage:
  - If they are not used in any offline path → no immediate issue.
  - If needed offline → we should consider adding JSON/text columns (or separate tables) to mirror them.

---

## 5. Next Steps (to be filled as we proceed)

Planned next comparisons:

- `pos_orders` + `pos_order_items` (Supabase vs SQLite).
- `customer_debts` + `customer_debt_payments`.
- `work_sessions`.
- `inventory` + `transactions`.
- `loss_declarations` + `loss_items`.
- `user_permissions`, `staff_pins`.

For each table we will:

1. Extract Supabase schema from `src/types/database.types.ts`.
2. Extract SQLite schema from `electron/sqliteManager.cjs`.
3. Document:
   - Core aligned fields.
   - Local-only fields (offline/sync/optimization).
   - Remote-only fields (and whether they matter offline).
4. Note any **confirmed issues**, **potential risks**, and **OK/healthy patterns**.

---

## 6. Schema comparison: POS orders & POS order items

### 6.1 Supabase – `pos_orders_with_items_count` (remote)

From `src/types/database.types.ts` (`pos_orders_with_items_count.Row`):

- **Identity & ownership**:
  - `id: string | null`
  - `organization_id: string | null`

- **Core order amounts & status**:
  - `subtotal: number | null`
  - `discount: number | null`
  - `tax: number | null`
  - `total: number | null`
  - `amount_paid: number | null`
  - `remaining_amount: number | null`
  - `status: string | null`
  - `payment_method: string | null`
  - `payment_status: string | null`
  - `consider_remaining_as_partial: boolean | null`

- **Customer & shipping**:
  - `customer_id: string | null`
  - `customer_order_number: number | null`
  - `shipping_address_id: string | null`
  - `shipping_cost: number | null`
  - `shipping_method: string | null`

- **Other metadata**:
  - `employee_id: string | null`
  - `is_online: boolean | null`
  - `items_count: number | null` (aggregated count of items)
  - `metadata: Json | null`
  - `notes: string | null`
  - `slug: string | null`
  - `created_at: string | null`
  - `updated_at: string | null`

> ملاحظة: Supabase لا يعرّف جدولًا خامًا باسم `pos_orders` هنا، بل view غنيًا يلخص الطلب + عدد العناصر + معلومات الشحن.

### 6.2 SQLite – `pos_orders` & `pos_order_items` (local)

From `electron/sqliteManager.cjs`:

`pos_orders`:

- `id TEXT PRIMARY KEY`
- `order_number TEXT NOT NULL`
- `customer_id TEXT`
- `customer_name TEXT`
- `customer_name_lower TEXT`
- `total_amount REAL NOT NULL DEFAULT 0`
- `paid_amount REAL NOT NULL DEFAULT 0`
- `payment_method TEXT`
- `status TEXT DEFAULT 'completed'`
- `organization_id TEXT NOT NULL`
- `staff_id TEXT`
- `work_session_id TEXT`
- `synced INTEGER DEFAULT 0`
- `sync_status TEXT`
- `pending_operation TEXT`
- `last_sync_attempt TEXT`
- `error TEXT`
- `remote_order_id TEXT`
- `remote_customer_order_number INTEGER`
- `local_created_at TEXT NOT NULL`
- `server_created_at TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

`pos_order_items`:

- `id TEXT PRIMARY KEY`
- `order_id TEXT NOT NULL` (FK → `pos_orders.id`)
- `product_id TEXT NOT NULL`
- `product_name TEXT NOT NULL`
- `quantity INTEGER NOT NULL`
- `unit_price REAL NOT NULL`
- `subtotal REAL NOT NULL`
- `discount REAL DEFAULT 0`
- `synced INTEGER DEFAULT 0`
- `created_at TEXT NOT NULL`

### 6.3 Alignment (conceptual)

- **Identity & ownership**:
  - Supabase `id` ↔ SQLite `id`.
  - Supabase `organization_id` ↔ SQLite `organization_id`.

- **Core financial amounts**:
  - Supabase `total` ↔ SQLite `total_amount`.
  - Supabase `amount_paid` ↔ SQLite `paid_amount`.
  - Supabase `discount` / `tax` / `subtotal` ↔ SQLite `discount` و `subtotal` على مستوى العناصر في `pos_order_items`، مع إمكانية تجميعها على مستوى الطلب.
  - Supabase `remaining_amount` يمكن حسابه محليًا من `total_amount - paid_amount` في SQLite (لا يوجد عمود صريح لكن يمكن اشتقاقه).

- **Status & payment**:
  - Supabase `status` ↔ SQLite `status`.
  - Supabase `payment_method` ↔ SQLite `payment_method`.
  - Supabase `payment_status` ↔ SQLite `payment_status` (إذا تم تخزينه في الطلب أو اشتقاقه من حالة المزامنة/الدفعات).

- **Customer linkage**:
  - Supabase `customer_id`, `customer_order_number` ↔ SQLite `customer_id`, `remote_customer_order_number`.
  - SQLite يضيف `customer_name` و `customer_name_lower` لتحسين البحث الأوفلاين.

- **Items vs items_count**:
  - Supabase view يوفر `items_count` مباشرة.
  - SQLite يخزن كل عنصر في `pos_order_items` مع `quantity`, `unit_price`, `subtotal`, مما يسمح بحساب `items_count` أو أي إحصائيات أخرى عند الحاجة.

- **Sync metadata & linkage**:
  - Supabase لا يخزن حقول مزامنة محلية.
  - SQLite يضيف: `synced`, `sync_status`, `pending_operation`, `last_sync_attempt`, `error`, `local_created_at`, `server_created_at`, `remote_order_id`، وهي ضرورية لمسارات الأوفلاين.

### 6.4 Differences & offline impact

- **حقول موجودة في Supabase فقط (ليست في SQLite)**:
  - `consider_remaining_as_partial`, `is_online`.
  - حقول الشحن: `shipping_address_id`, `shipping_cost`, `shipping_method`.
  - `items_count` (كحقل جاهز)، `metadata` (Json), `slug`, `employee_id`.

  **الأثر**:
  - لا توجد في سكيمة SQLite الحالية حقول شحن أوفلاين مخصصة للـ POS (إلا إذا حُفظت في جداول أخرى). إذا لم يكن الـ UI الأوفلاين يعرض تفاصيل شحن الطلب، فهذا مقبول حاليًا لكنه يحد من تكافؤ الميزات.
  - معلومات مثل `metadata` و `slug` مستخدمة أكثر في طبقات الويب/التحليلات، وغالبًا ليست ضرورية للتشغيل الأوفلاين داخل الـ POS.

- **حقول موجودة في SQLite فقط (محلية/أوفلاين)**:
  - رقم الطلب المحلي: `order_number`.
  - أسماء العملاء مع صيغ للبحث: `customer_name`, `customer_name_lower`.
  - ربط بالجلسات والموظفين محليًا: `staff_id`, `work_session_id`.
  - حقول ربط ومزامنة مع السيرفر: `remote_order_id`, `remote_customer_order_number`, `synced`, `sync_status`, `pending_operation`, `last_sync_attempt`, `error`, `local_created_at`, `server_created_at`.

  **الأثر**:
  - هذه الحقول ضرورية لسلوك الأوفلاين (عداد الطلبات المعلقة، إعادة المحاولة، تتبع الأخطاء، ربط الطلب بجلسة العمل المحلية وغيرها)، ولا تحتاج أن تكون موجودة في Supabase.

### 6.5 Preliminary conclusion for POS orders

- جوهريًا، سكيمة SQLite لـ `pos_orders` و `pos_order_items` تغطي ما يحتاجه التطبيق للأوفلاين:
  - قيم مالية أساسية، حالة الطلب، طريقة الدفع، ربط بالعميل، وربط بالعناصر التفصيلية.
  - حقول مزامنة محلية قوية لإدارة الطابور (`sync_queue`) ومراقبة حالة كل طلب.
- الفروقات الرئيسية مع Supabase تتركز في:
  - تفاصيل الشحن والـ metadata، وهي حاليًا غير ممثلة في SQLite.
  - اعتماد Supabase على view مجمّع بينما SQLite يحتفظ بجداول خام بسيطة + حقول مزامنة.
- بناءً على الكود الحالي لمسارات `localPosOrderService` و `syncService`، لا يوجد تعارض واضح يمنع المزامنة؛ لكن:
  - إذا ظهرت مستقبلاً حاجة لعرض تفاصيل الشحن أو استخدام `consider_remaining_as_partial` أو `metadata` في وضع الأوفلاين، قد نحتاج إلى توسيع سكيمة SQLite لتخزين هذه الحقول أو ما يكافئها.

---

## 7. Potential issues & risk areas (current snapshot)

### 7.1 Schema coverage / data completeness

- **Invoices JSON metadata not persisted in SQLite (medium)**
  - Remote `invoices` in Supabase exposes JSON-style fields: `custom_fields`, `customer_info`, `organization_info`, `source_id`.
  - Local SQLite `invoices` does **not** have equivalents; only core numeric and string fields are stored.
  - **Risk**: If future offline features need to display or edit these rich metadata fields while offline, the data will not be available locally and may require extra fetches or schema changes.

- **POS shipping & extended metadata not stored locally (medium)**
  - Supabase `pos_orders_with_items_count` exposes: `shipping_address_id`, `shipping_cost`, `shipping_method`, `metadata`, `slug`, `consider_remaining_as_partial`, `is_online`, `employee_id`.
  - SQLite `pos_orders` currently does not store these fields.
  - **Risk**: Offline POS cannot show full shipping context or advanced payment semantics (e.g. partial remaining handling). If UI or reports later rely on these fields offline, schema extensions will be required.

### 7.2 Data consistency & constraints

- **No explicit uniqueness constraints on order/invoice numbers (medium)**
  - SQLite `invoices` and `pos_orders` define `invoice_number` / `order_number` as `TEXT NOT NULL` but without `UNIQUE` constraints.
  - **Risk**: If business rules implicitly assume uniqueness (per organization), duplicates could be created offline, potentially causing conflicts or rejections during sync. Mitigation would be at application-level validation or adding DB-level constraints.

- **Derived values not stored explicitly (low)**
  - Fields like `remaining_amount` (in Supabase) are not present as columns in SQLite and must be derived from `total_amount - paid_amount`.
  - **Risk**: Not a correctness problem by itself, but different calculation logic in multiple places could lead to subtle discrepancies if not centralized.

### 7.3 Offline cache architecture & Dexie legacy

- **Presence of `localDb.backup.ts` (legacy Dexie database) (medium)**
  - There is a full Dexie-based implementation in `src/database/localDb.backup.ts`.
  - Current Electron code paths appear to use `sqliteAPI`/`DatabaseAdapter` instead, but the backup file still exists under `src/database/`.
  - **Risk**: If this legacy file is ever imported accidentally in new code (or by refactor/autocomplete), it could reintroduce IndexedDB/Dexie usage into Electron builds, leading to split sources of truth.

- **Electron vs web fallbacks using `inventoryDB` (low → medium)**
  - Many services follow the pattern: `if (window.electronAPI?.db) { use SQLite } else { use Dexie via inventoryDB }`.
  - In normal Electron runs this is correct, but if for any reason `window.electronAPI.db` is not initialized while the app is still running, the code may silently fall back to Dexie, diverging offline data.
  - **Risk**: Environment detection bugs or preload misconfigurations could cause mixed storage backends. Mitigation: hard-fail in Electron if `electronAPI.db` is missing, instead of falling back.

### 7.4 Migration & legacy schema files

- **Multiple schema sources: `sqliteManager.cjs` vs `sqlite-schema.sql` (low)**
  - The effective SQLite schema is defined in `electron/sqliteManager.cjs`.
  - There is an older, more generic `src/sql/sqlite-schema.sql` that does not match the current, richer schema.
  - **Risk**: Future contributors may mistakenly edit `sqlite-schema.sql` thinking it is the source of truth, leading to confusion and inconsistent expectations. Documentation should clearly state that `sqliteManager.cjs` is authoritative for Electron.

- **Migrations rely on `addColumnIfNotExists` without always backfilling semantics (low → medium)**
  - For several tables (e.g. `work_sessions`, `pos_orders`, `pos_order_items`), new columns were added using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
  - While this avoids destructive migrations, default values do not always fully capture the intended semantics (e.g. status transitions, new monetary fields).
  - **Risk**: Existing rows created before new fields were introduced may have partially populated columns. Most current code seems defensive, but future logic must be careful to handle `NULL` or default values gracefully.

### 7.5 SQLite health & write patterns

- **Historical corruption due to heavy write patterns (medium, mitigated but watch)**
  - There was a previous incident where SQLite became corrupted (`database disk image is malformed`) and the fix included using bulk operations instead of many single-row writes in loops.
  - **Risk**: New code that reintroduces high-frequency per-row writes (especially in app-init hydration or POS sync) might increase the chance of corruption on unstable disks or abrupt shutdowns.
  - Mitigation: Keep using bulk operations (`bulkPut`-style batched upserts via SQLite) and ensure long-running migrations or hydrations are idempotent and resumable.

---
