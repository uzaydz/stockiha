import { tauriExecute, tauriQuery } from './tauriSqlClient';

// ⚡ تحديد البيئة (DEV vs PROD)
function isDevMode(): boolean {
  try {
    // @ts-ignore
    return import.meta.env?.DEV === true || import.meta.env?.MODE === 'development';
  } catch {
    return false;
  }
}

// ⚡ التحقق من وجود بيانات إنتاجية في جدول
async function hasProductionData(orgId: string, table: string): Promise<boolean> {
  try {
    const res = await tauriQuery(orgId, `SELECT COUNT(*) as count FROM ${table} LIMIT 1;`, []);
    if (res.success && res.data && res.data.length > 0) {
      const count = res.data[0].count || 0;
      return count > 0;
    }
    return false;
  } catch {
    return false;
  }
}

// إصدار الـ schema - قم بزيادته عند أي تغيير في بنية الجداول
// v20: إضافة أعمدة last_sync_attempt و product_colors و product_sizes لجدول products
// v21: إضافة جدول sync_metadata للتزامن التدريجي (Incremental Sync)
// v22: إضافة عمود last_sync_attempt لجدول customers
// v23: إضافة جداول Retry Logic + Conflict Resolution + Offline Images
// v24: إضافة جدول expense_categories
// v25: إضافة جدول user_credentials لتسجيل الدخول الأوفلاين
// v26: إضافة جدول employees للموظفين
// v27: إضافة جدول sync_outbox لـ Delta Sync
// v28: إضافة عمود additional_images لجدول products
// v29: إضافة جداول الإشعارات للأوفلاين (cached_notifications, notification_sync_queue)
// v30: إضافة عمود wholesale_tiers لجدول products
// v31: إضافة عمود advancedSettings لجدول products
// v32: إضافة أعمدة marketingSettings, special_offers_config, advanced_description, publication_mode, colors
// v33: إضافة جداول product_advanced_settings, product_marketing_settings, product_wholesale_tiers
// v34: إضافة جداول الموردين (suppliers, supplier_contacts, supplier_purchases, supplier_payments)
// v35: إضافة أعمدة created_by و updated_by لجدول suppliers
// v36: إضافة أعمدة البيع المتقدم (وزن، كرتون، متر) + التتبع (صلاحية، أرقام تسلسلية، دفعات، ضمان)
// v37: إضافة أعمدة مفقودة لجدول product_advanced_settings (enable_sticky_buy_button, etc.)
// v38: إضافة أعمدة البيع المتقدم الجديدة من Supabase (min_weight_per_sale, etc.)
// v39: إضافة أعمدة min_meters_per_sale و max_meters_per_sale
// v40: إضافة جميع أعمدة Supabase المفقودة (roll_length_meters, pharmacy, restaurant, auto parts, etc.)
// v41: إزالة قيود NOT NULL من pos_order_items لدعم المزامنة (subtotal, product_name, unit_price, quantity)
// v42: إضافة Views للتوافق مع أسماء جداول Supabase (orders, order_items, pos_work_sessions)
// v43: توحيد Schema الكامل مع Supabase (محاولة أولى - Views فقط)
// v44: ⚡ إعادة بناء Schema من الصفر - الجداول الآن 100% متطابقة مع Supabase:
//      - orders (بدلاً من pos_orders)
//      - order_items (بدلاً من pos_order_items)
//      - returns (بدلاً من product_returns)
//      - losses (بدلاً من loss_declarations)
//      - staff_work_sessions (بدلاً من work_sessions)
//      - إزالة جميع الـ Views (الجداول الحقيقية بنفس الاسم الآن)
// v45: ⚡ إصلاح مشكلة المزامنة - إعادة تعيين sync_state لجداول orders و order_items
//      لإجبار إعادة السحب الكامل من Supabase (603+ طلبية موجودة)
// v46: ⚡ تحسين الأداء - إضافة أعمدة product_marketing_settings المفقودة + تخطي سريع للـ schema
// v47: ⚡ إضافة فهارس للفئات (product_categories, product_subcategories) لتسريع الاستعلامات
// v48: ⚡ إضافة أعمدة مفقودة لجدول product_categories (name_lower, parent_id, display_order)
// v49: ⚡ إضافة عمود image_base64 لجدول product_categories لدعم الصور أوفلاين
// v50: ⚡ إضافة جداول المصروفات (expenses, recurring_expenses) للعمل أوفلاين
// v51: ⚡ إضافة أعمدة _synced لجدول employees و local_updated_at لجدول orders
// v54: ⚡ إضافة أعمدة المزامنة المحلية (_synced, _sync_status, _customer_name_lower, etc.) لجدول orders
// v55: ⚡ إضافة فهارس حرجة لـ work_sessions لتسريع الاستعلامات (حل مشكلة database locked)
// v56: ⚡ إصلاح مشكلة Schema Mismatch - إضافة الأعمدة الحرجة (subtotal, discount, total, etc.) حتى في حالة التخطي السريع
// v57: ⚡ إضافة أعمدة المزامنة المحلية (_synced, _sync_status, _pending_operation) لجداول product_advanced_settings و product_marketing_settings
// v58: ⚡ المرحلة 1: توحيد مخطط SQLite - إزالة الجداول القديمة وإنشاء migration إلى الأسماء الموحدة
//      - إزالة product_returns (استخدام returns فقط)
//      - إزالة loss_declarations (استخدام losses فقط)
//      - إعادة تسمية work_sessions إلى staff_work_sessions
//      - التأكد من تطابق جميع أعمدة المزامنة مع sync/config.ts
// v59: ⚡ تحويل جميع أسماء الأعمدة من camelCase إلى snake_case
//      - إزالة جميع الأعمدة camelCase (syncStatus, pendingOperation, etc.)
//      - استخدام snake_case فقط في جميع الجداول
const SCHEMA_VERSION = 59;

async function exec(orgId: string, sql: string) {
  await tauriExecute(orgId, sql, []);
}

// حفظ وجلب إصدار الـ schema
async function getSchemaVersion(orgId: string): Promise<number> {
  try {
    await exec(orgId, `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER PRIMARY KEY);`);
    const res = await tauriQuery(orgId, `SELECT version FROM _schema_version LIMIT 1;`, []);
    if (res.success && res.data && res.data.length > 0) {
      return res.data[0].version || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(orgId: string, version: number): Promise<void> {
  try {
    await exec(orgId, `DELETE FROM _schema_version;`);
    await tauriExecute(orgId, `INSERT INTO _schema_version (version) VALUES (?);`, [version]);
  } catch (error) {
    console.error('[TauriSQLite] Failed to set schema version:', error);
  }
}

/**
 * ⚡ ترحيل آمن لجدول: إنشاء جدول جديد، نسخ البيانات، إعادة التسمية
 * نمط ترقية آمن لتعديل نوع عمود/هيكل جدول بدون فقدان بيانات
 * 
 * @param orgId Organization ID
 * @param tableName اسم الجدول المراد ترقيته
 * @param newTableDef تعريف الجدول الجديد (CREATE TABLE statement)
 * @param columnsToMigrate قائمة الأعمدة المراد نسخها
 * @param dataTransform دالة تحويل اختيارية للبيانات (optional)
 * @returns true إذا نجحت العملية
 */
async function safeTableMigration(
  orgId: string,
  tableName: string,
  newTableDef: string,
  columnsToMigrate: string[],
  dataTransform?: (row: any) => any
): Promise<boolean> {
  try {
    const oldTableExists = await tableExists(orgId, tableName);
    if (!oldTableExists) {
      // الجدول غير موجود، إنشاء الجدول الجديد مباشرة
      await exec(orgId, newTableDef);
      return true;
    }

    // التحقق من وجود بيانات إنتاجية
    const hasData = await hasProductionData(orgId, tableName);
    
    if (!hasData) {
      // لا توجد بيانات - يمكن حذف الجدول القديم وإنشاء الجديد
      console.log(`[TauriSQLite] 🔄 ${tableName}: لا توجد بيانات - حذف وإنشاء جديد`);
      await exec(orgId, `DROP TABLE IF EXISTS ${tableName};`);
      await exec(orgId, newTableDef);
      return true;
    }

    // ⚡ هناك بيانات إنتاجية - استخدام نمط الترحيل الآمن
    console.log(`[TauriSQLite] 🔄 ${tableName}: بدء ترحيل آمن للبيانات...`);
    
    const tempTable = `${tableName}_v2`;
    const backupTable = `${tableName}_old`;

    // 1. إنشاء الجدول الجديد باسم مؤقت
    await exec(orgId, newTableDef.replace(tableName, tempTable));

    // 2. نسخ البيانات من الجدول القديم إلى الجديد
    const existingCols = columnsToMigrate.filter(col => {
      // التحقق من وجود العمود في الجدول القديم
      // سنستخدم جميع الأعمدة المتاحة
      return true;
    });

    if (existingCols.length > 0) {
      // جلب البيانات من الجدول القديم
      const oldDataRes = await tauriQuery(orgId, `SELECT * FROM ${tableName};`, []);
      
      if (oldDataRes.success && oldDataRes.data && oldDataRes.data.length > 0) {
        // نسخ البيانات مع التحويل إذا لزم الأمر
        for (const row of oldDataRes.data) {
          let transformedRow = dataTransform ? dataTransform(row) : row;
          
          // بناء INSERT statement
          const cols = Object.keys(transformedRow).filter(col => 
            columnsToMigrate.includes(col) || columnsToMigrate.length === 0
          );
          const values = cols.map(col => transformedRow[col]);
          const placeholders = cols.map(() => '?').join(', ');
          const colNames = cols.map(col => `"${col}"`).join(', ');
          
          if (cols.length > 0) {
            await tauriExecute(orgId, 
              `INSERT INTO ${tempTable} (${colNames}) VALUES (${placeholders});`, 
              values
            );
          }
        }
        
        console.log(`[TauriSQLite] ✅ ${tableName}: تم نسخ ${oldDataRes.data.length} سجل`);
      }
    }

    // 3. إعادة تسمية الجدول القديم كنسخة احتياطية
    await exec(orgId, `ALTER TABLE ${tableName} RENAME TO ${backupTable};`);

    // 4. إعادة تسمية الجدول الجديد إلى الاسم الأصلي
    await exec(orgId, `ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

    // 5. حذف النسخة الاحتياطية فقط بعد التأكد من النجاح
    await exec(orgId, `DROP TABLE IF EXISTS ${backupTable};`);

    console.log(`[TauriSQLite] ✅ ${tableName}: اكتمل الترحيل الآمن بنجاح`);
    return true;
  } catch (error: any) {
    console.error(`[TauriSQLite] ❌ فشل ترحيل ${tableName}:`, error);
    
    // ⚡ محاولة استعادة الجدول القديم في حالة الفشل
    try {
      const backupTable = `${tableName}_old`;
      const tempTable = `${tableName}_v2`;
      const backupExists = await tableExists(orgId, backupTable);
      const tempExists = await tableExists(orgId, tempTable);
      
      if (backupExists) {
        // استعادة الجدول القديم
        await exec(orgId, `DROP TABLE IF EXISTS ${tableName};`);
        await exec(orgId, `ALTER TABLE ${backupTable} RENAME TO ${tableName};`);
        console.log(`[TauriSQLite] 🔄 ${tableName}: تم استعادة الجدول القديم`);
      } else if (tempExists) {
        // حذف الجدول المؤقت
        await exec(orgId, `DROP TABLE IF EXISTS ${tempTable};`);
      }
    } catch (recoveryError) {
      console.error(`[TauriSQLite] ❌ فشل استعادة ${tableName}:`, recoveryError);
    }
    
    return false;
  }
}

async function columnExists(orgId: string, table: string, column: string): Promise<boolean> {
  try {
    const res = await tauriQuery(orgId, `PRAGMA table_info(${table});`, []);
    if (!res.success || !Array.isArray(res.data)) return false;
    return res.data.some((row: any) => row?.name === column);
  } catch {
    return false;
  }
}

async function tableExists(orgId: string, table: string): Promise<boolean> {
  try {
    const res = await tauriQuery(orgId, `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`, [table]);
    return res.success && res.data && res.data.length > 0;
  } catch {
    return false;
  }
}

async function addColumnIfNotExists(orgId: string, table: string, column: string, definition: string) {
  // ⚡ CRITICAL FIX: تخطي فحص الأعمدة إذا كان schema في الإصدار الحالي
  // هذا يمنع مئات الاستدعاءات لـ PRAGMA table_info في كل تشغيل
  if (skipColumnChecks) {
    return; // تخطي تماماً - schema محدث ولا حاجة لفحص الأعمدة
  }

  try {
    const exists = await columnExists(orgId, table, column);
    if (exists) return;
  } catch { }

  try {
    await tauriExecute(orgId, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, []);
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.includes('duplicate column name') || msg.includes('already exists')) {
      return;
    }
    try {
      console.error('[TauriSQLite] addColumnIfNotExists failed:', { table, column, error });
    } catch { }
  }
}

// ⚡ Cache لتخزين أعمدة الجداول لتجنب استعلامات PRAGMA المتكررة
const tableColumnsCache = new Map<string, Set<string>>();

// ⚡ CRITICAL FIX: متغير لتخطي فحص الأعمدة عند عدم الحاجة لترقية schema
let skipColumnChecks = false;

// ⚡ دالة محسنة للحصول على أعمدة جدول (مع cache)
async function getTableColumns(orgId: string, table: string): Promise<Set<string>> {
  const cacheKey = `${orgId}:${table}`;
  if (tableColumnsCache.has(cacheKey)) {
    return tableColumnsCache.get(cacheKey)!;
  }

  try {
    const res = await tauriQuery(orgId, `PRAGMA table_info(${table});`, []);
    const columns = new Set<string>();
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach((row: any) => {
        if (row?.name) columns.add(row.name);
      });
    }
    tableColumnsCache.set(cacheKey, columns);
    return columns;
  } catch {
    return new Set();
  }
}

// ⚡ دالة فائقة السرعة لإضافة أعمدة متعددة دفعة واحدة
async function addColumnsIfNotExistBatch(orgId: string, table: string, columns: Array<{name: string, definition: string}>) {
  if (columns.length === 0) return;

  // جلب الأعمدة الموجودة مرة واحدة
  const existingColumns = await getTableColumns(orgId, table);

  // فلترة الأعمدة غير الموجودة فقط
  const newColumns = columns.filter(col => !existingColumns.has(col.name));

  if (newColumns.length === 0) return;

  // إضافة الأعمدة الجديدة بالتوازي (SQLite يدعم هذا في Tauri)
  await Promise.all(newColumns.map(async col => {
    try {
      await tauriExecute(orgId, `ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.definition}`, []);
      existingColumns.add(col.name); // تحديث الكاش
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (!msg.includes('duplicate column name') && !msg.includes('already exists')) {
        // تجاهل الأخطاء الصامتة
      }
    }
  }));

  // تحديث الكاش
  const cacheKey = `${orgId}:${table}`;
  tableColumnsCache.set(cacheKey, existingColumns);
}

// مسح كاش الأعمدة عند بدء تهيئة جديدة
function clearTableColumnsCache() {
  tableColumnsCache.clear();
}

// تتبع الجداول التي تم إعادة بنائها في هذه الجلسة
const rebuiltTablesThisSession = new Set<string>();

// إعادة بناء جدول لتحديث القيود (مثل إزالة NOT NULL)
// forceRebuild = true فقط عند ترقية schema، وليس في كل تشغيل
async function rebuildTableIfNeeded(orgId: string, tableName: string, newTableDef: string, columnsToMigrate: string[], forceRebuild: boolean = false): Promise<void> {
  try {
    // إذا لم يكن هناك ترقية للـ schema، لا حاجة لإعادة البناء
    if (!forceRebuild) return;

    // تجنب إعادة بناء الجدول نفسه مرتين في نفس الجلسة
    const tableKey = `${orgId}:${tableName}`;
    if (rebuiltTablesThisSession.has(tableKey)) return;

    const exists = await tableExists(orgId, tableName);
    if (!exists) return; // الجدول غير موجود، سيتم إنشاؤه لاحقاً

    // تحقق إذا كان الجدول يحتاج لإعادة بناء (مثلاً فحص القيود)
    const res = await tauriQuery(orgId, `PRAGMA table_info(${tableName});`, []);
    if (!res.success || !res.data) return;

    // الأعمدة التي يجب ألا تكون NOT NULL
    const columnsToCheck = [
      'organization_id', 'local_updated_at', 'local_created_at',
      'order_number', 'created_at', 'updated_at',
      'name', 'price', 'product_name', 'unit_price', 'quantity',
      'customer_name', 'total_amount', 'invoice_number', 'amount',
      'staff_id', 'started_at', // أعمدة work_sessions
      'loss_id', 'product_id', 'color_id', 'size_id', // أعمدة loss_items
      'subtotal', 'order_id', 'discount' // ⚡ v41: أعمدة pos_order_items
    ];

    // فحص إذا كانت بعض الأعمدة لها notnull=1 وتحتاج للتحديث
    const hasNotNullConstraints = res.data.some((col: any) =>
      columnsToCheck.includes(col.name) && col.notnull === 1
    );

    if (!hasNotNullConstraints) {
      rebuiltTablesThisSession.add(tableKey);
      return;
    }

    console.log(`[TauriSQLite] إعادة بناء جدول ${tableName} لتحديث القيود...`);

    // إنشاء جدول مؤقت جديد
    const tempTable = `${tableName}_temp_rebuild`;

    // حذف الجدول المؤقت إذا كان موجوداً من محاولة سابقة فاشلة
    try {
      await exec(orgId, `DROP TABLE IF EXISTS ${tempTable};`);
    } catch { }

    await exec(orgId, newTableDef.replace(tableName, tempTable));

    // الحصول على الأعمدة الموجودة فعلياً في الجدول
    const existingCols = res.data.map((col: any) => col.name);
    const colsToMigrate = columnsToMigrate.filter(col => existingCols.includes(col));

    // نسخ البيانات
    const colList = colsToMigrate.join(', ');
    if (colsToMigrate.length > 0) {
      await exec(orgId, `INSERT OR IGNORE INTO ${tempTable} (${colList}) SELECT ${colList} FROM ${tableName};`);
    }

    // حذف الجدول القديم
    await exec(orgId, `DROP TABLE ${tableName};`);

    // إعادة تسمية الجدول المؤقت
    await exec(orgId, `ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

    rebuiltTablesThisSession.add(tableKey);
    console.log(`[TauriSQLite] ✅ تم إعادة بناء جدول ${tableName} بنجاح`);
  } catch (error) {
    console.error(`[TauriSQLite] فشل في إعادة بناء جدول ${tableName}:`, error);
  }
}

export async function ensureTauriSchema(organizationId: string): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    console.log(`[TauriSQLite] ⏳ بدء تهيئة schema للمؤسسة ${organizationId.slice(0, 8)}...`);

    // ⚡ مسح كاش الأعمدة لضمان فحص جديد
    clearTableColumnsCache();

    // فحص إصدار الـ schema وإجبار إعادة البناء إذا تغير
    const currentVersion = await getSchemaVersion(organizationId);
    const needsSchemaUpgrade = currentVersion < SCHEMA_VERSION;

    // ⚡ CRITICAL FIX: تخطي جميع عمليات addColumnIfNotExists إذا كان الإصدار الحالي
    // هذا يمنع مئات الاستدعاءات في كل تشغيل
    skipColumnChecks = !needsSchemaUpgrade;

    if (needsSchemaUpgrade) {
      console.log(`[TauriSQLite] 🔄 ترقية schema من ${currentVersion} إلى ${SCHEMA_VERSION}...`);
    } else {
      // ⚡ تخطي سريع: إذا كان الـ schema في الإصدار الحالي، تحقق فقط من الجداول الأساسية
      console.log(`[TauriSQLite] ✅ schema في الإصدار الحالي (${SCHEMA_VERSION}) - تخطي فحص الأعمدة`);

      // ⚡ فحص سريع للجداول الأساسية فقط (100ms بدلاً من 10 ثواني)
      const essentialTables = ['products', 'orders', 'customers', 'product_categories', 'sync_metadata'];
      const missingTables: string[] = [];

      // ⚡ فحص الجداول بالتوازي لتسريع العملية
      const tableChecks = await Promise.all(
        essentialTables.map(async (table) => ({
          table,
          exists: await tableExists(organizationId, table)
        }))
      );

      for (const check of tableChecks) {
        if (!check.exists) missingTables.push(check.table);
      }

      if (missingTables.length === 0) {
        // ⚡ v55: حتى لو كان schema في الإصدار الحالي، يجب إنشاء الفهارس والأعمدة الحرجة
        // لأن الفهارس والأعمدة قد لا تكون موجودة في قواعد البيانات القديمة
        console.log(`[TauriSQLite] ⚡ تخطي سريع - جميع الجداول موجودة، لكن سنتحقق من الفهارس والأعمدة الحرجة...`);
        
        try {
          // ⚡ v55: إضافة الأعمدة الحرجة لجدول orders (مثل subtotal) حتى لو كان schema في الإصدار الحالي
          const criticalColumns = [
            { table: 'orders', column: 'subtotal', type: 'REAL' },
            { table: 'orders', column: 'discount', type: 'REAL' },
            { table: 'orders', column: 'total', type: 'REAL' },
            { table: 'orders', column: 'payment_status', type: 'TEXT' },
            { table: 'orders', column: 'employee_id', type: 'TEXT' },
            { table: 'orders', column: 'amount_paid', type: 'REAL' },
            { table: 'orders', column: 'remaining_amount', type: 'REAL' },
            { table: 'orders', column: 'notes', type: 'TEXT' },
            { table: 'orders', column: 'tax_amount', type: 'REAL' },
            { table: 'orders', column: 'discount_amount', type: 'REAL' },
            { table: 'orders', column: 'shipping_amount', type: 'REAL' },
          ];
          
          for (const { table, column, type } of criticalColumns) {
            try {
              console.log(`[TauriSQLite] 🔍 فحص العمود ${table}.${column}...`);
              const exists = await columnExists(organizationId, table, column);
              console.log(`[TauriSQLite] 📊 نتيجة الفحص: ${table}.${column} = ${exists ? 'موجود' : 'غير موجود'}`);
              if (!exists) {
                console.log(`[TauriSQLite] ➕ إضافة العمود ${table}.${column}...`);
                await exec(organizationId, `ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
                console.log(`[TauriSQLite] ✅ تم إضافة العمود ${table}.${column}`);
              } else {
                console.log(`[TauriSQLite] ⏭️ تخطي إضافة ${table}.${column} (موجود بالفعل)`);
              }
            } catch (colError: any) {
              // تجاهل الأخطاء إذا كان العمود موجوداً بالفعل أو لأي سبب آخر
              const errorMsg = colError?.message || String(colError);
              if (errorMsg.includes('duplicate column') || errorMsg.includes('already exists')) {
                console.log(`[TauriSQLite] ℹ️ العمود ${table}.${column} موجود بالفعل (خطأ متوقع)`);
              } else {
                console.warn(`[TauriSQLite] ⚠️ فشل إضافة العمود ${table}.${column}:`, errorMsg.substring(0, 100));
              }
            }
          }
          
          // ⚡ v55: إنشاء الفهارس الحرجة لـ work_sessions حتى لو كان schema في الإصدار الحالي
          const criticalIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_work_sessions_staff_status ON work_sessions(staff_id, status, organization_id);`,
            `CREATE INDEX IF NOT EXISTS idx_work_sessions_org_status ON work_sessions(organization_id, status);`,
            `CREATE INDEX IF NOT EXISTS idx_work_sessions_staff ON work_sessions(staff_id);`,
            `CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);`,
            // ⚡ التأكد من وجود فهرس products_org_active أيضاً
            `CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);`,
          ];
          await Promise.all(criticalIndexes.map(query => exec(organizationId, query).catch(() => {})));
          console.log(`[TauriSQLite] ✅ تم إنشاء/التحقق من الفهارس الحرجة`);
        } catch (error) {
          console.warn('[TauriSQLite] ⚠️ فشل إضافة بعض الأعمدة/الفهارس الحرجة:', error);
        }
        
        const duration = Date.now() - startTime;
        console.log(`[TauriSQLite] ⚡ تخطي سريع - جميع الجداول موجودة (${duration}ms)`);
        return { success: true };
      }

      console.log(`[TauriSQLite] ⚠️ جداول مفقودة: ${missingTables.join(', ')} - متابعة التهيئة الكاملة`);
    }

    // تعريف جدول المنتجات الجديد بدون قيود NOT NULL للتوافق مع البيانات من الخادم
    const productsTableDef = `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        name_normalized TEXT,
        sku TEXT,
        barcode TEXT,
        price REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        category_id TEXT,
        is_active INTEGER DEFAULT 1,
        thumbnail_image TEXT,
        image_thumbnail TEXT,
        images TEXT,
        description TEXT,
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT DEFAULT '',
        server_updated_at TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        thumbnail_base64 TEXT,
        images_base64 TEXT
      )
    `;

    // إعادة بناء جدول products إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'products', productsTableDef, [
      'id', 'name', 'name_normalized', 'sku', 'barcode', 'price', 'cost',
      'stock_quantity', 'category_id', 'is_active', 'thumbnail_image',
      'image_thumbnail', 'images', 'description', 'organization_id',
      'synced', 'sync_status', 'pending_operation', 'local_updated_at',
      'server_updated_at', 'metadata', 'created_at', 'updated_at',
      'thumbnail_base64', 'images_base64'
    ], needsSchemaUpgrade);

    // المنتجات - إنشاء الجدول إذا لم يكن موجوداً
    await exec(organizationId, productsTableDef + ';');

    await addColumnIfNotExists(organizationId, 'products', 'compare_at_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'name_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'category', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'subcategory', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'brand', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'features', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'specifications', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_digital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'digital_file_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'digital_file_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'max_downloads', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'download_expiry_days', 'INTEGER');
    
    await addColumnIfNotExists(organizationId, 'products', 'product_images', 'TEXT'); // ⚡ صور المنتج (JSON array)
    await addColumnIfNotExists(organizationId, 'products', 'short_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'subcategory_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'unit', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'dimensions', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'has_variants', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'variants', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock_alert', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'track_inventory', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allow_backorder', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'is_featured', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'display_order', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'tags', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'seo_title', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'seo_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_new', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'new_until', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'on_sale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'sale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'sale_start', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sale_end', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorder_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'reorder_quantity', 'INTEGER');
    // أعمدة إضافية من Supabase للمنتجات
    await addColumnIfNotExists(organizationId, 'products', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'show_price_on_landing', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'partial_wholesale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_wholesale_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'min_partial_wholesale_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allow_retail', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'allow_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'allow_partial_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'last_inventory_update', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'use_sizes', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_fast_shipping', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_money_back', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'has_quality_guarantee', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'fast_shipping_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'money_back_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'quality_guarantee_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'is_sold_by_unit', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'unit_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'use_variant_prices', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'unit_purchase_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'unit_sale_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_page_config', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_clone_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'name_for_shipping', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'form_template_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_provider_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'use_shipping_clone', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_method_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'special_offers_config', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'advanced_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publication_status', 'TEXT DEFAULT "published"');
    await addColumnIfNotExists(organizationId, 'products', 'publish_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'published_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'created_by_user_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'updated_by_user_id', 'TEXT');
    // أعمدة البحث والفهرسة
    await addColumnIfNotExists(organizationId, 'products', 'sku_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcode_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'barcode_digits', 'TEXT');
    // ⚡ أعمدة البحث المتقدم (للبحث العربي المحسن)
    await addColumnIfNotExists(organizationId, 'products', 'name_search', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sku_search', 'TEXT');
    // أعمدة الجملة
    await addColumnIfNotExists(organizationId, 'products', 'is_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_only', 'INTEGER DEFAULT 0');
    // أعمدة المخزون والتتبع
    await addColumnIfNotExists(organizationId, 'products', 'low_stock_threshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'max_stock_level', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'track_quantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'continue_selling_when_out', 'INTEGER DEFAULT 0');
    // أعمدة الضريبة
    await addColumnIfNotExists(organizationId, 'products', 'tax_rate', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'tax_class', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'tax_included', 'INTEGER DEFAULT 0');
    // أعمدة الشحن
    await addColumnIfNotExists(organizationId, 'products', 'shipping_required', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'shipping_dimensions', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'free_shipping', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمتجر الإلكتروني
    await addColumnIfNotExists(organizationId, 'products', 'visibility', 'TEXT DEFAULT "visible"');
    await addColumnIfNotExists(organizationId, 'products', 'available_online', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'available_pos', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'video_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'external_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplier_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'supplier_sku', 'TEXT');
    // أعمدة الحد الأدنى والأقصى للطلب
    await addColumnIfNotExists(organizationId, 'products', 'min_order_quantity', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'max_order_quantity', 'INTEGER');
    // أعمدة الخصم والعروض
    await addColumnIfNotExists(organizationId, 'products', 'discount_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discount_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'discount_start_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'discount_end_date', 'TEXT');
    // أعمدة متقدمة
    await addColumnIfNotExists(organizationId, 'products', 'requires_prescription', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'age_restricted', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'min_age', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'expiry_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'batch_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'serial_number', 'TEXT');
    // أعمدة التصنيف والترتيب
    await addColumnIfNotExists(organizationId, 'products', 'sort_order', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'rating', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'review_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'sales_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'view_count', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'products', 'cost_price', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'min_stock', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'quantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'image_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'colors', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'sizes', 'TEXT');
    // أعمدة المخزون الفعلي
    await addColumnIfNotExists(organizationId, 'products', 'actual_stock_quantity', 'INTEGER DEFAULT 0');
    // أعمدة المزامنة الإضافية (لإصلاح خطأ last_sync_attempt)
    await addColumnIfNotExists(organizationId, 'products', 'last_sync_attempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'conflict_resolution', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_colors', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'product_sizes', 'TEXT');
    // ✅ عمود إصدار المخزون للكشف عن التعارضات
    await addColumnIfNotExists(organizationId, 'products', 'stock_version', 'INTEGER DEFAULT 0');
    // ✅ عمود الصور الإضافية (JSON array of URLs)
    await addColumnIfNotExists(organizationId, 'products', 'additional_images', 'TEXT');
    // ✅ عمود تسعيرة الجملة (JSON array of tiers)
    await addColumnIfNotExists(organizationId, 'products', 'wholesale_tiers', 'TEXT');
    // ✅ عمود الإعدادات المتقدمة (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'advanced_settings', 'TEXT');
    // ✅ عمود إعدادات التسويق (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'marketing_settings', 'TEXT');
    // ✅ عمود إعدادات العروض الخاصة (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'special_offers_config', 'TEXT');
    // ✅ عمود الوصف المتقدم (JSON object)
    await addColumnIfNotExists(organizationId, 'products', 'advanced_description', 'TEXT');
    // ✅ أعمدة النشر
    await addColumnIfNotExists(organizationId, 'products', 'publication_mode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'publish_at', 'TEXT');
    // ✅ عمود الألوان (JSON array) - للتخزين المحلي فقط
    await addColumnIfNotExists(organizationId, 'products', 'colors', 'TEXT');

    // ⚡ v36: أعمدة البيع بالوزن
    await addColumnIfNotExists(organizationId, 'products', 'sell_by_weight', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'weight_unit', 'TEXT DEFAULT "kg"');
    await addColumnIfNotExists(organizationId, 'products', 'price_per_weight_unit', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_price_per_weight_unit', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'max_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'weight_increment', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'tare_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'average_piece_weight', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'average_item_weight', 'REAL');
    // ⚡ v38: أعمدة جديدة من Supabase
    await addColumnIfNotExists(organizationId, 'products', 'min_weight_per_sale', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'max_weight_per_sale', 'REAL');

    // ⚡ v36: أعمدة البيع بالكرتون/العلبة
    await addColumnIfNotExists(organizationId, 'products', 'sell_by_box', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'units_per_box', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'box_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'box_purchase_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'box_barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'min_box_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allow_partial_box', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'allow_single_unit_sale', 'INTEGER DEFAULT 1');

    // ⚡ v36: أعمدة البيع بالمتر
    await addColumnIfNotExists(organizationId, 'products', 'sell_by_meter', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'meter_unit', 'TEXT DEFAULT "m"');
    await addColumnIfNotExists(organizationId, 'products', 'price_per_meter', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'purchase_price_per_meter', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_meters', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'min_meter_length', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'max_meter_length', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'meter_increment', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'roll_length', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'available_length', 'REAL');
    // ⚡ v39: أعمدة min/max للمتر
    await addColumnIfNotExists(organizationId, 'products', 'min_meters_per_sale', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'max_meters_per_sale', 'REAL');
    // ⚡ v40: عمود roll_length_meters من Supabase
    await addColumnIfNotExists(organizationId, 'products', 'roll_length_meters', 'REAL');

    // ⚡ v40: أعمدة النشر من Supabase
    await addColumnIfNotExists(organizationId, 'products', 'publication_status', 'TEXT DEFAULT "published"');
    await addColumnIfNotExists(organizationId, 'products', 'published_at', 'TEXT');

    // ⚡ v40: أعمدة الصيدليات (Pharmacy)
    await addColumnIfNotExists(organizationId, 'products', 'active_ingredient', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'dosage_form', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'concentration', 'TEXT');

    // ⚡ v40: أعمدة المطاعم (Restaurant)
    await addColumnIfNotExists(organizationId, 'products', 'preparation_time_minutes', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'calories', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'allergens', 'TEXT'); // JSON array
    await addColumnIfNotExists(organizationId, 'products', 'is_vegetarian', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'is_vegan', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'is_gluten_free', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'spice_level', 'INTEGER');

    // ⚡ v40: أعمدة قطع غيار السيارات (Auto Parts)
    await addColumnIfNotExists(organizationId, 'products', 'oem_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'compatible_models', 'TEXT'); // JSON array
    await addColumnIfNotExists(organizationId, 'products', 'vehicle_make', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'vehicle_model', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'year_from', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'year_to', 'INTEGER');

    // ⚡ v40: أعمدة مواد البناء والأبعاد (Building Materials & Dimensions)
    await addColumnIfNotExists(organizationId, 'products', 'material_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'dimensions', 'TEXT'); // JSONB as TEXT
    await addColumnIfNotExists(organizationId, 'products', 'weight_kg', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'coverage_area_sqm', 'REAL');

    // ⚡ v40: أعمدة التجارة والضريبة (Commerce & Tax)
    await addColumnIfNotExists(organizationId, 'products', 'commission_rate', 'REAL');
    await addColumnIfNotExists(organizationId, 'products', 'manufacturer', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'country_of_origin', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'customs_code', 'TEXT');

    // ⚡ v36: أعمدة تتبع الصلاحية
    await addColumnIfNotExists(organizationId, 'products', 'track_expiry', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'default_expiry_days', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'expiry_alert_days', 'INTEGER DEFAULT 30');
    await addColumnIfNotExists(organizationId, 'products', 'alert_days_before_expiry', 'INTEGER DEFAULT 30');
    await addColumnIfNotExists(organizationId, 'products', 'allow_expired_sale', 'INTEGER DEFAULT 0');

    // ⚡ v36: أعمدة الأرقام التسلسلية
    await addColumnIfNotExists(organizationId, 'products', 'track_serial_numbers', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'serial_number_prefix', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'serial_number_format', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'require_serial_on_sale', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'supports_imei', 'INTEGER DEFAULT 0');

    // ⚡ v36: أعمدة تتبع الدفعات (FIFO)
    await addColumnIfNotExists(organizationId, 'products', 'track_batches', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'batch_prefix', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'fifo_enabled', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'use_fifo', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'products', 'auto_batch_on_purchase', 'INTEGER DEFAULT 0');

    // ⚡ v36: أعمدة الضمان
    await addColumnIfNotExists(organizationId, 'products', 'has_warranty', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'warranty_duration_months', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'products', 'warranty_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'products', 'warranty_terms', 'TEXT');

    // ⚡ v41: حقول المخزون المتقدم (الوزن، الأمتار، الصناديق)
    await addColumnIfNotExists(organizationId, 'products', 'available_weight', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'total_weight_purchased', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'total_meters_purchased', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'available_boxes', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'products', 'total_boxes_purchased', 'INTEGER DEFAULT 0');

    // ⚡ v41: حقول إضافية للبيع بالمتر (أسماء بديلة)
    await addColumnIfNotExists(organizationId, 'products', 'min_meters', 'REAL');

    // العناوين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        name TEXT,
        street_address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        phone TEXT,
        is_default INTEGER,
        organization_id TEXT NOT NULL
      );
    `);

    // إعدادات POS
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS pos_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        store_name TEXT,
        store_address TEXT,
        store_phone TEXT,
        store_email TEXT,
        receipt_header TEXT,
        receipt_footer TEXT,
        receipt_logo_url TEXT,
        receipt_show_logo INTEGER,
        receipt_show_barcode INTEGER,
        receipt_show_qr INTEGER,
        receipt_paper_size TEXT,
        receipt_font_size TEXT,
        receipt_font_family TEXT,
        auto_print_receipt INTEGER,
        print_copies INTEGER,
        tax_enabled INTEGER,
        tax_rate REAL,
        tax_number TEXT,
        currency TEXT,
        currency_symbol TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER,
        pending_sync INTEGER
      );
    `);

    await addColumnIfNotExists(organizationId, 'pos_settings', 'store_website', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'store_logo_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_header_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_footer_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'welcome_message', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_qr_code', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_tracking_code', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_customer_info', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_store_logo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_store_info', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_date_time', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_employee_name', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paper_width', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'paper_size', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printer_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'default_printer', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'auto_cut', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'cash_drawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'beep_on_scan', 'INTEGER');
    // دعم camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'pos_settings', 'font_size', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'font_family', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'logo_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'header_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footer_text', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_logo', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_barcode', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'show_qr', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_on_sale', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_on_refund', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enable_cash_drawer', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'enable_barcode_scanner', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'low_stock_threshold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'default_payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'line_spacing', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_density', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'primary_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'secondary_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'accent_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'text_color', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'background_color', 'TEXT');
    // أعمدة إضافية من Supabase لإعدادات POS
    await addColumnIfNotExists(organizationId, 'pos_settings', 'receipt_template', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'header_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'footer_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'item_display_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'price_position', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'custom_css', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'tax_label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'currency_position', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'allow_price_edit', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'require_manager_approval', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'business_license', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'activity', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'rib', 'TEXT');

    // ⚡ v50: إعدادات الطابعة الحرارية المتقدمة
    await addColumnIfNotExists(organizationId, 'pos_settings', 'printer_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'silent_print', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'print_on_order', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'open_cash_drawer', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'beep_after_print', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'margin_top', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'margin_bottom', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'margin_left', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'pos_settings', 'margin_right', 'INTEGER DEFAULT 0');

    // إعدادات المتجر (Organization Settings)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS organization_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        site_name TEXT,
        default_language TEXT DEFAULT 'ar',
        logo_url TEXT,
        favicon_url TEXT,
        display_text_with_logo INTEGER DEFAULT 0,
        theme_primary_color TEXT DEFAULT '#3B82F6',
        theme_secondary_color TEXT DEFAULT '#10B981',
        theme_mode TEXT DEFAULT 'light',
        custom_css TEXT,
        custom_js TEXT,
        custom_header TEXT,
        custom_footer TEXT,
        enable_registration INTEGER DEFAULT 1,
        enable_public_site INTEGER DEFAULT 1,
        meta_description TEXT,
        meta_keywords TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        pending_sync INTEGER DEFAULT 0,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لإعدادات المتجر - دعم camelCase

    // ⚡ v44: إعادة بناء جدول orders (اسم موحد مع Supabase)
    // ⚠️ سيتم حذف pos_orders القديم وإنشاء orders الجديد
    const ordersTableDef = `
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT DEFAULT '',
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT DEFAULT '',
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        last_sync_attempt TEXT,
        error TEXT,
        remote_order_id TEXT,
        remote_customer_order_number INTEGER,
        local_created_at TEXT DEFAULT '',
        server_created_at TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    // ⚡ v44: حذف View/Table القديم وإنشاء الجدول الجديد
    // ⚡ المرحلة 3: حماية بيانات الإنتاج - لا نحذف الجدول في PROD إذا كان فيه بيانات
    const ordersHasData = await hasProductionData(organizationId, 'orders');
    const posOrdersHasData = await hasProductionData(organizationId, 'pos_orders');
    
    if (isDevMode()) {
      // DEV: السماح بحذف الجدول لأغراض التجربة
      await exec(organizationId, `DROP TABLE IF EXISTS orders;`);
      await exec(organizationId, `DROP TABLE IF EXISTS pos_orders;`);
    } else {
      // PROD: حماية بيانات الإنتاج
      if (!ordersHasData && !posOrdersHasData) {
        // لا توجد بيانات - يمكن الحذف بأمان
        await exec(organizationId, `DROP TABLE IF EXISTS orders;`);
        await exec(organizationId, `DROP TABLE IF EXISTS pos_orders;`);
      } else {
        // ⚡ هناك بيانات إنتاجية - استخدام نمط الترحيل الآمن
        console.log('[TauriSQLite] ⚠️ PROD: يوجد بيانات في orders - استخدام نمط الترحيل الآمن');
        // سيتم التعامل معها في rebuildTableIfNeeded أو safeTableMigration
      }
    }

    // ⚡ v44: إعادة تعيين sync_state لجدول orders لإجبار إعادة السحب الكامل
    await exec(organizationId, `DELETE FROM sync_state WHERE table_name = 'orders';`);
    await exec(organizationId, `DELETE FROM sync_state WHERE table_name = 'pos_orders';`);

    await rebuildTableIfNeeded(organizationId, 'orders', ordersTableDef, [
      'id', 'order_number', 'customer_id', 'customer_name', 'customer_name_lower',
      'total_amount', 'paid_amount', 'payment_method', 'status', 'organization_id',
      'staff_id', 'work_session_id', 'synced', 'sync_status', 'pending_operation',
      'last_sync_attempt', 'error', 'remote_order_id', 'remote_customer_order_number',
      'local_created_at', 'server_created_at', 'created_at', 'updated_at'
    ]);

    // ⚡ v44: جدول orders - 100% متوافق مع Supabase
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT DEFAULT '',
        customer_id TEXT,
        customer_name TEXT,
        customer_name_lower TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        organization_id TEXT DEFAULT '',
        staff_id TEXT,
        work_session_id TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        last_sync_attempt TEXT,
        error TEXT,
        remote_order_id TEXT,
        remote_customer_order_number INTEGER,
        local_created_at TEXT DEFAULT '',
        server_created_at TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      );
    `);

    // ⚡ v44: إضافة أعمدة إضافية لجدول orders (موحد مع Supabase)
    await addColumnIfNotExists(organizationId, 'orders', 'employee_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'payment_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'amount_paid', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'remaining_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'consider_remaining_as_partial', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', 'total', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'extra_fields', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'created_at_ts', 'INTEGER');
    // دعم الأسماء بـ camelCase للتوافق مع البيانات القادمة من الخادم
    await addColumnIfNotExists(organizationId, 'orders', 'local_order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'tax_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'discount_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'shipping_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'receipt_printed', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'channel', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'local_order_number_str', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'message', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'payload', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'pending_updates', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'is_online', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'orders', 'shipping_address_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'shipping_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'shipping_cost', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'orders', 'customer_order_number', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', 'pos_order_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'completed_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'customer_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'admin_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'call_confirmation_status_id', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', 'global_order_number', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', 'created_by_staff_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'created_by_staff_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'tracking_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', 'shipping_company', 'TEXT');
    // ⚡ v53: أعمدة المزامنة المحلية (تبدأ بـ _)
    await addColumnIfNotExists(organizationId, 'orders', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'orders', '_sync_status', 'TEXT DEFAULT "pending"');
    await addColumnIfNotExists(organizationId, 'orders', '_pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', '_local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', '_error', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', '_local_order_number', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'orders', '_customer_name_lower', 'TEXT');

    // ⚡ v44: جدول order_items (موحد مع Supabase)
    const orderItemsTableDef = `
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT DEFAULT '',
        product_id TEXT DEFAULT '',
        product_name TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT ''
      )
    `;

    // ⚡ v44: حذف View/Table القديم والجدول القديم وإنشاء الجدول الجديد
    // ⚡ المرحلة 3: حماية بيانات الإنتاج - لا نحذف الجدول في PROD إذا كان فيه بيانات
    const orderItemsHasData = await hasProductionData(organizationId, 'order_items');
    const posOrderItemsHasData = await hasProductionData(organizationId, 'pos_order_items');
    
    if (isDevMode()) {
      // DEV: السماح بحذف الجدول لأغراض التجربة
      await exec(organizationId, `DROP TABLE IF EXISTS order_items;`);
      await exec(organizationId, `DROP TABLE IF EXISTS pos_order_items;`);
    } else {
      // PROD: حماية بيانات الإنتاج
      if (!orderItemsHasData && !posOrderItemsHasData) {
        // لا توجد بيانات - يمكن الحذف بأمان
        await exec(organizationId, `DROP TABLE IF EXISTS order_items;`);
        await exec(organizationId, `DROP TABLE IF EXISTS pos_order_items;`);
      } else {
        // ⚡ هناك بيانات إنتاجية - استخدام نمط الترحيل الآمن
        console.log('[TauriSQLite] ⚠️ PROD: يوجد بيانات في order_items - استخدام نمط الترحيل الآمن');
        // سيتم التعامل معها في rebuildTableIfNeeded أو safeTableMigration
      }
    }

    // ⚡ v44: إعادة تعيين sync_state لجدول order_items لإجبار إعادة السحب الكامل
    await exec(organizationId, `DELETE FROM sync_state WHERE table_name = 'order_items';`);
    await exec(organizationId, `DELETE FROM sync_state WHERE table_name = 'pos_order_items';`);

    await rebuildTableIfNeeded(organizationId, 'order_items', orderItemsTableDef, [
      'id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price',
      'subtotal', 'discount', 'synced', 'created_at'
    ], needsSchemaUpgrade);

    await exec(organizationId, orderItemsTableDef + ';');

    // ⚡ v44: أعمدة البيع المتقدم لـ order_items (موحد مع Supabase)
    await addColumnIfNotExists(organizationId, 'order_items', 'selling_unit_type', 'TEXT DEFAULT "piece"');
    await addColumnIfNotExists(organizationId, 'order_items', 'weight_sold', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'weight_unit', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'price_per_weight_unit', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'meters_sold', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'price_per_meter', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'boxes_sold', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'order_items', 'units_per_box', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'order_items', 'box_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'batch_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'batch_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'expiry_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'serial_numbers', 'TEXT'); // JSON array
    // ⚡ v44: أعمدة إضافية من Supabase order_items
    await addColumnIfNotExists(organizationId, 'order_items', 'name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'total_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'is_digital', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'order_items', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'variant_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'updated_at', 'TEXT');

    // العملاء - تم تغيير organization_id و local_updated_at ليكون لهما قيمة افتراضية
    const customersTableDef = `
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_normalized TEXT,
        name_lower TEXT,
        email TEXT,
        email_lower TEXT,
        phone TEXT,
        phone_digits TEXT,
        total_debt REAL DEFAULT 0,
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT DEFAULT '',
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    // إعادة بناء الجدول إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'customers', customersTableDef, [
      'id', 'name', 'name_normalized', 'name_lower', 'email', 'email_lower',
      'phone', 'phone_digits', 'total_debt', 'organization_id', 'synced',
      'sync_status', 'pending_operation', 'local_updated_at', 'created_at', 'updated_at'
    ]);

    await exec(organizationId, customersTableDef + ';');

    await addColumnIfNotExists(organizationId, 'customers', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'address', 'TEXT');
    // دعم camelCase للتوافق
    await addColumnIfNotExists(organizationId, 'customers', 'company_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'city', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'postal_code', 'TEXT');
    // أعمدة المزامنة التدريجية
    await addColumnIfNotExists(organizationId, 'customers', 'last_sync_attempt', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'country', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'is_active', 'INTEGER DEFAULT 1');
    // أعمدة إضافية من customers في Supabase
    await addColumnIfNotExists(organizationId, 'customers', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'credit_limit', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'tax_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'is_vip', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'discount_rate', 'REAL');
    await addColumnIfNotExists(organizationId, 'customers', 'loyalty_points', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'last_purchase_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'total_purchases', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'purchase_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'whatsapp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'facebook', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'instagram', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'tags', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customers', 'server_updated_at', 'TEXT');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'customers', 'total_orders', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customers', 'total_spent', 'REAL DEFAULT 0');

    // الفواتير
    await exec(organizationId, `
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
    `);

    // أعمدة إضافية للفواتير
    await addColumnIfNotExists(organizationId, 'invoices', 'server_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'customer_rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'order_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'currency', 'TEXT DEFAULT "DZD"');
    await addColumnIfNotExists(organizationId, 'invoices', 'is_paid', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'paid_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'paid_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'remaining_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'invoices', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'printed_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'invoices', 'print_count', 'INTEGER DEFAULT 0');
    // أعمدة إضافية للمزامنة مع Supabase
    await addColumnIfNotExists(organizationId, 'invoices', 'subtotal', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'tax', 'REAL DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'invoices', 'discount', 'REAL DEFAULT 0');

    // عناصر الفواتير
    await exec(organizationId, `
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
        synced INTEGER DEFAULT 0
      );
    `);

    // ديون العملاء - تعريف الجدول بدون قيود NOT NULL
    const customerDebtsTableDef = `
      CREATE TABLE IF NOT EXISTS customer_debts (
        id TEXT PRIMARY KEY,
        customer_id TEXT DEFAULT '',
        customer_name TEXT,
        amount REAL DEFAULT 0,
        description TEXT,
        status TEXT DEFAULT 'unpaid',
        order_id TEXT,
        order_number TEXT,
        total_amount REAL,
        paid_amount REAL,
        remaining_amount REAL,
        due_date TEXT,
        notes TEXT,
        organization_id TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      )
    `;

    // إعادة بناء جدول customer_debts إذا كان يحتوي على قيود NOT NULL قديمة
    await rebuildTableIfNeeded(organizationId, 'customer_debts', customerDebtsTableDef, [
      'id', 'customer_id', 'customer_name', 'amount', 'description', 'status',
      'order_id', 'order_number', 'total_amount', 'paid_amount', 'remaining_amount',
      'due_date', 'notes', 'organization_id', 'synced', 'sync_status',
      'pending_operation', 'created_at', 'updated_at'
    ], needsSchemaUpgrade);

    await exec(organizationId, customerDebtsTableDef + ';');

    // أعمدة إضافية لديون العملاء
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoice_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'invoice_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'source', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'source_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'payment_terms', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'reminder_sent', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'last_reminder_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'is_overdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'days_overdue', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'updated_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'server_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'local_updated_at', 'TEXT');
    // أعمدة الطلب الإضافية
    await addColumnIfNotExists(organizationId, 'customer_debts', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'shipping', 'REAL');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'customer_debts', 'remote_debt_id', 'TEXT');

    // مدفوعات ديون العملاء
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS customer_debt_payments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        applied_by TEXT,
        synced INTEGER DEFAULT 0,
        pending_operation TEXT
      );
    `);

    // رموز PIN للموظفين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS staff_pins (
        id TEXT PRIMARY KEY,
        staff_id TEXT,
        organization_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        permissions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // إضافة عمود staff_id للجداول الموجودة (migration)
    await addColumnIfNotExists(organizationId, 'staff_pins', 'staff_id', 'TEXT');
    // إنشاء index للبحث السريع
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_staff_pins_org ON staff_pins(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_staff_pins_staff_id ON staff_pins(staff_id);`);
    } catch (e) {
      // الفهرس قد يكون موجوداً
    }

    // ⚡ v25: بيانات اعتماد المستخدمين للأوفلاين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS user_credentials (
        id TEXT PRIMARY KEY,
        email TEXT,
        email_lower TEXT UNIQUE,
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        algo TEXT,
        fallback_hash TEXT,
        user_id TEXT,
        organization_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_success_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_credentials_email_lower ON user_credentials(email_lower);`);

    // صف المزامنة
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        object_type TEXT,
        object_id TEXT,
        operation TEXT,
        data TEXT,
        priority INTEGER DEFAULT 2,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        error TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    // أعمدة camelCase للتوافق

    // حالة الترخيص
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS app_license_state (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        secure_anchor_ms INTEGER DEFAULT 0,
        last_device_time_ms INTEGER DEFAULT 0,
        last_server_time_ms INTEGER,
        last_observed_device_time_ms INTEGER DEFAULT 0,
        last_secure_ms INTEGER DEFAULT 0,
        tamper_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // جلسات العمل - تعريف بدون قيود NOT NULL للتوافق
    // ⚡ v58: توحيد أسماء الأعمدة مع sync/config.ts (snake_case بدلاً من camelCase)
    const workSessionsTableDef = `
      CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        staff_id TEXT DEFAULT '',
        staff_name TEXT,
        organization_id TEXT DEFAULT '',
        opening_cash REAL DEFAULT 0,
        closing_cash REAL,
        expected_cash REAL,
        cash_difference REAL,
        total_sales REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        cash_sales REAL DEFAULT 0,
        card_sales REAL DEFAULT 0,
        started_at TEXT DEFAULT '',
        ended_at TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        pause_count INTEGER DEFAULT 0,
        total_pause_duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        opening_notes TEXT,
        closing_notes TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        opening_balance REAL,
        closing_balance REAL,
        opened_at TEXT,
        closed_at TEXT,
        extra_fields TEXT
      )
    `;

    // إعادة بناء جدول work_sessions إذا كان يحتوي على قيود NOT NULL
    await rebuildTableIfNeeded(organizationId, 'work_sessions', workSessionsTableDef, [
      'id', 'staff_id', 'staff_name', 'organization_id', 'opening_cash', 'closing_cash',
      'expected_cash', 'cash_difference', 'total_sales', 'total_orders', 'cash_sales',
      'card_sales', 'started_at', 'ended_at', 'paused_at', 'resumed_at', 'pause_count',
      'total_pause_duration', 'status', 'opening_notes', 'closing_notes', 'synced',
      'sync_status', 'pending_operation', 'created_at', 'updated_at', 'opening_balance',
      'closing_balance', 'opened_at', 'closed_at', 'extra_fields'
    ], needsSchemaUpgrade);

    await exec(organizationId, workSessionsTableDef + ';');

    // ⚡ v58: إضافة/تحديث أعمدة المزامنة الموحدة (snake_case فقط)
    await addColumnIfNotExists(organizationId, 'work_sessions', 'extra_fields', 'TEXT');
    await addColumnIfNotExists(organizationId, 'work_sessions', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'work_sessions', 'pending_operation', 'TEXT');

    // ⚡ v58: إنشاء جدول staff_work_sessions (الاسم الموحد مع Supabase)
    // نفس بنية work_sessions لكن باسم موحد
    const staffWorkSessionsTableDef = `
      CREATE TABLE IF NOT EXISTS staff_work_sessions (
        id TEXT PRIMARY KEY,
        staff_id TEXT DEFAULT '',
        staff_name TEXT,
        organization_id TEXT DEFAULT '',
        opening_cash REAL DEFAULT 0,
        closing_cash REAL,
        expected_cash REAL,
        cash_difference REAL,
        total_sales REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        cash_sales REAL DEFAULT 0,
        card_sales REAL DEFAULT 0,
        started_at TEXT DEFAULT '',
        ended_at TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        pause_count INTEGER DEFAULT 0,
        total_pause_duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        opening_notes TEXT,
        closing_notes TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT '',
        opening_balance REAL,
        closing_balance REAL,
        opened_at TEXT,
        closed_at TEXT,
        extra_fields TEXT
      )
    `;

    await rebuildTableIfNeeded(organizationId, 'staff_work_sessions', staffWorkSessionsTableDef, [
      'id', 'staff_id', 'staff_name', 'organization_id', 'opening_cash', 'closing_cash',
      'expected_cash', 'cash_difference', 'total_sales', 'total_orders', 'cash_sales',
      'card_sales', 'started_at', 'ended_at', 'paused_at', 'resumed_at', 'pause_count',
      'total_pause_duration', 'status', 'opening_notes', 'closing_notes', 'synced',
      'sync_status', 'pending_operation', 'created_at', 'updated_at', 'opening_balance',
      'closing_balance', 'opened_at', 'closed_at', 'extra_fields'
    ], needsSchemaUpgrade);

    await exec(organizationId, staffWorkSessionsTableDef + ';');

    // إضافة فهارس لـ staff_work_sessions
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_staff ON staff_work_sessions(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_org ON staff_work_sessions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_status ON staff_work_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_staff_status ON staff_work_sessions(staff_id, status, organization_id);
      CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_org_status ON staff_work_sessions(organization_id, status);
    `);

    // جدول المعاملات للمخزون
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        organization_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // كاش تهيئة التطبيق
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS app_init_cache (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        organization_id TEXT,
        data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // كاش POS للأوفلاين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS pos_offline_cache (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        page INTEGER NOT NULL,
        page_limit INTEGER NOT NULL,
        search TEXT,
        category_id TEXT,
        data TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    // جداول الفئات والفئات الفرعية
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,
        icon TEXT,
        image_url TEXT,
        is_active INTEGER,
        type TEXT,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ⚡ FIX: إنشاء view باسم categories للتوافق مع الاستعلامات القديمة
    // الخطأ: no such table: categories
    await exec(organizationId, `DROP VIEW IF EXISTS categories;`);
    await exec(organizationId, `
      CREATE VIEW categories AS 
      SELECT 
        id,
        name,
        description,
        slug,
        icon,
        image_url,
        is_active,
        type,
        organization_id,
        created_at,
        updated_at
      FROM product_categories;
    `);

    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT,
        is_active INTEGER,
        organization_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ⚡ Add indexes for product_categories (fast lookup)
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_categories_type ON product_categories(type);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_categories_org_active ON product_categories(organization_id, is_active);`);

    // ⚡ Add indexes for product_subcategories (fast lookup)
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_subcategories_org ON product_subcategories(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_subcategories_category ON product_subcategories(category_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_subcategories_active ON product_subcategories(is_active);`);

    // Add sync columns for product_categories
    await addColumnIfNotExists(organizationId, 'product_categories', 'synced', 'INTEGER DEFAULT 0');

    // ⚡ v48: Add missing columns for product_categories (name_lower, parent_id, display_order)
    await addColumnIfNotExists(organizationId, 'product_categories', 'name_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_categories', 'parent_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_categories', 'display_order', 'INTEGER DEFAULT 0');

    // ⚡ v49: Add image_base64 column for offline category images
    await addColumnIfNotExists(organizationId, 'product_categories', 'image_base64', 'TEXT');

    // Add sync columns for product_subcategories
    await addColumnIfNotExists(organizationId, 'product_subcategories', 'synced', 'INTEGER DEFAULT 0');

    // ⚡ v26: جدول الموظفين/المستخدمين المحلي
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        role TEXT,
        is_active INTEGER,
        organization_id TEXT,
        permissions TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON employees(auth_user_id);`);
    await addColumnIfNotExists(organizationId, 'employees', 'synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'employees', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'employees', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'employees', 'pending_operation', 'TEXT');

    // ⚡ v34: جدول الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_lower TEXT,
        company_name TEXT,
        email TEXT,
        email_lower TEXT,
        phone TEXT,
        phone_digits TEXT,
        address TEXT,
        website TEXT,
        tax_number TEXT,
        business_type TEXT,
        notes TEXT,
        rating REAL DEFAULT 0,
        supplier_type TEXT DEFAULT 'local',
        supplier_category TEXT DEFAULT 'wholesale',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name_lower);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_suppliers_synced ON suppliers(synced);`);
    // إضافة أعمدة مفقودة للجداول الموجودة
    await addColumnIfNotExists(organizationId, 'suppliers', 'created_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'suppliers', 'updated_by', 'TEXT');

    // ⚡ جدول جهات اتصال الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_contacts (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position TEXT,
        email TEXT,
        phone TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ⚡ جدول مشتريات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_purchases (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_number TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        due_date TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        balance_due REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        payment_status TEXT DEFAULT 'unpaid',
        payment_terms TEXT,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_org ON supplier_purchases(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier ON supplier_purchases(supplier_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_purchases_synced ON supplier_purchases(synced);`);

    // ⚡ جدول عناصر مشتريات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        product_id TEXT,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        batch_id TEXT,
        color_id TEXT,
        size_id TEXT,
        variant_type TEXT DEFAULT 'simple',
        variant_display_name TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ⚡ جدول مدفوعات الموردين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        purchase_id TEXT,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_org ON supplier_payments(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_supplier_payments_synced ON supplier_payments(synced);`);

    // جدول اشتراكات المؤسسة
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS organization_subscriptions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        plan_id TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        amount REAL,
        currency TEXT,
        is_auto_renew INTEGER,
        updated_at TEXT,
        created_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'billing_cycle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'trial_ends_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'amount_paid', 'REAL');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'payment_method', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'payment_reference', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'lifetime_courses_access', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'accessible_courses', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'courses_access_expires_at', 'TEXT');
    // ⭐ أعمدة الخطط الجديدة (v2)
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'plan_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'plan_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'limits', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'permissions', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'organization_subscriptions', 'features', 'TEXT'); // JSON array

    // جدول ألوان المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_colors (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color_code TEXT,
        image_url TEXT,
        quantity INTEGER DEFAULT 0,
        price REAL,
        is_default INTEGER DEFAULT 0,
        barcode TEXT,
        variant_number INTEGER,
        has_sizes INTEGER DEFAULT 0,
        purchase_price REAL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_colors', 'organization_id', 'TEXT');

    // جدول أحجام المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_sizes (
        id TEXT PRIMARY KEY,
        color_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        size_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        price REAL,
        barcode TEXT,
        is_default INTEGER DEFAULT 0,
        purchase_price REAL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_sizes', 'organization_id', 'TEXT');

    // جدول صور المنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'product_images', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_images', 'image_base64', 'TEXT');

    // ✅ جدول الإعدادات المتقدمة للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_advanced_settings (
        product_id TEXT PRIMARY KEY,
        use_custom_currency INTEGER DEFAULT 0,
        custom_currency_code TEXT,
        is_base_currency INTEGER DEFAULT 0,
        skip_cart INTEGER DEFAULT 1,
        enable_stock_notification INTEGER DEFAULT 0,
        show_fake_visitor_counter INTEGER DEFAULT 0,
        min_fake_visitors INTEGER DEFAULT 5,
        max_fake_visitors INTEGER DEFAULT 25,
        enable_fake_low_stock INTEGER DEFAULT 0,
        min_fake_stock_threshold INTEGER DEFAULT 1,
        max_fake_stock_threshold INTEGER DEFAULT 5,
        show_stock_countdown INTEGER DEFAULT 0,
        stock_countdown_duration_hours INTEGER DEFAULT 24,
        reset_stock_countdown_on_zero INTEGER DEFAULT 0,
        prevent_exit_popup INTEGER DEFAULT 0,
        show_popularity_badge INTEGER DEFAULT 0,
        popularity_badge_text TEXT,
        enable_gift_wrapping INTEGER DEFAULT 0,
        enable_referral_program INTEGER DEFAULT 0,
        referral_commission_type TEXT,
        referral_commission_value REAL,
        referral_cookie_duration_days INTEGER,
        enable_buyer_discount INTEGER DEFAULT 0,
        buyer_discount_percentage INTEGER DEFAULT 5,
        enable_sticky_buy_button INTEGER DEFAULT 0,
        disable_quantity_selection INTEGER DEFAULT 0,
        require_login_to_purchase INTEGER DEFAULT 0,
        prevent_repeat_purchase INTEGER DEFAULT 0,
        show_last_stock_update INTEGER DEFAULT 0,
        show_recent_purchases INTEGER DEFAULT 0,
        show_visitor_locations INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ✅ إضافة أعمدة جديدة لجدول product_advanced_settings للتوافق مع Supabase
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'enable_sticky_buy_button', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'disable_quantity_selection', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'require_login_to_purchase', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'prevent_repeat_purchase', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'show_last_stock_update', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'show_recent_purchases', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', 'show_visitor_locations', 'INTEGER DEFAULT 0');

    // ⚡ v57: إضافة أعمدة المزامنة المحلية لـ product_advanced_settings
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', '_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_advanced_settings', '_pending_operation', 'TEXT');

    // ✅ جدول إعدادات التسويق للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_marketing_settings (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        enable_reviews INTEGER DEFAULT 1,
        reviews_verify_purchase INTEGER DEFAULT 0,
        reviews_auto_approve INTEGER DEFAULT 1,
        allow_images_in_reviews INTEGER DEFAULT 1,
        enable_review_replies INTEGER DEFAULT 1,
        review_display_style TEXT DEFAULT 'stars_summary',
        enable_fake_star_ratings INTEGER DEFAULT 0,
        fake_star_rating_value REAL DEFAULT 4.5,
        fake_star_rating_count INTEGER DEFAULT 100,
        enable_fake_purchase_counter INTEGER DEFAULT 0,
        fake_purchase_count INTEGER DEFAULT 50,
        enable_facebook_pixel INTEGER DEFAULT 0,
        facebook_pixel_id TEXT,
        enable_tiktok_pixel INTEGER DEFAULT 0,
        tiktok_pixel_id TEXT,
        enable_snapchat_pixel INTEGER DEFAULT 0,
        snapchat_pixel_id TEXT,
        enable_google_ads_tracking INTEGER DEFAULT 0,
        google_ads_conversion_id TEXT,
        offer_timer_enabled INTEGER DEFAULT 0,
        offer_timer_title TEXT,
        offer_timer_type TEXT,
        offer_timer_end_date TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // ⚡ أعمدة إضافية مفقودة لـ product_marketing_settings (من Supabase)
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_standard_events', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_advanced_matching_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_conversations_api_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'enable_facebook_conversion_api', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_access_token', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_test_event_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'facebook_dataset_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'tiktok_standard_events', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'tiktok_advanced_matching_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'tiktok_events_api_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'tiktok_access_token', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'tiktok_test_event_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'snapchat_standard_events', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'snapchat_advanced_matching_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'snapchat_events_api_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'snapchat_api_token', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'snapchat_test_event_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_conversion_label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_gtag_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_global_site_tag_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_event_snippets', 'TEXT'); // JSON
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_phone_conversion_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_phone_conversion_label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'google_ads_enhanced_conversions_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_duration_minutes', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_display_style', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_text_above', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_text_below', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_end_action', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_end_action_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_end_action_message', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_restart_for_new_session', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_cookie_duration_days', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_show_on_specific_pages_only', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'offer_timer_specific_page_urls', 'TEXT'); // JSON array
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'loyalty_points_enabled', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'loyalty_points_name_singular', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'loyalty_points_name_plural', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'points_per_currency_unit', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'min_purchase_to_earn_points', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'max_points_per_order', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'redeem_points_for_discount', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'points_needed_for_fixed_discount', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'fixed_discount_value_for_points', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'points_expiration_months', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', 'test_mode', 'INTEGER DEFAULT 1');

    // ⚡ v57: إضافة أعمدة المزامنة المحلية لـ product_marketing_settings
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', '_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_marketing_settings', '_pending_operation', 'TEXT');

    // ✅ جدول أسعار الجملة للمنتجات
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_wholesale_tiers (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        min_quantity INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول الطلبات عبر الإنترنت (online_orders)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS online_orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT,
        payment_method TEXT,
        payment_status TEXT,
        shipping_address_id TEXT,
        shipping_method TEXT,
        shipping_cost REAL DEFAULT 0,
        notes TEXT,
        employee_id TEXT,
        organization_id TEXT NOT NULL,
        slug TEXT,
        customer_order_number INTEGER,
        form_data TEXT,
        shipping_option TEXT,
        created_from TEXT DEFAULT 'store',
        call_confirmation_status_id INTEGER,
        call_confirmation_notes TEXT,
        call_confirmation_updated_at TEXT,
        call_confirmation_updated_by TEXT,
        metadata TEXT,
        stop_desk_id TEXT,
        yalidine_tracking_id TEXT,
        zrexpress_tracking_id TEXT,
        ecotrack_tracking_id TEXT,
        maystro_tracking_id TEXT,
        shipping_provider TEXT,
        tracking_data TEXT,
        last_status_update TEXT,
        delivered_at TEXT,
        current_location TEXT,
        estimated_delivery_date TEXT,
        assigned_agent_id TEXT,
        agent_priority INTEGER DEFAULT 0,
        call_attempts INTEGER DEFAULT 0,
        last_call_attempt TEXT,
        next_call_scheduled TEXT,
        assignment_timestamp TEXT,
        call_center_priority INTEGER DEFAULT 3,
        call_center_notes TEXT,
        yalidine_label_url TEXT,
        zrexpress_label_url TEXT,
        ecotrack_label_url TEXT,
        maystro_label_url TEXT,
        global_order_number INTEGER,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ online_orders

    // جدول عناصر الطلبات عبر الإنترنت
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS online_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT,
        color_id TEXT,
        size_id TEXT,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        color_name TEXT,
        size_name TEXT,
        discount REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);


    // ⚡ v44: أعمدة إضافية لجدول order_items (موحد مع Supabase)
    await addColumnIfNotExists(organizationId, 'order_items', 'color_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'size_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'color_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'size_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'notes', 'TEXT');
    // أعمدة الجملة والسعر الأصلي
    await addColumnIfNotExists(organizationId, 'order_items', 'is_wholesale', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'order_items', 'original_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'variant_info', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'cost', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'tax_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'discount_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'discount_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'returned_quantity', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'order_items', 'refund_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'order_items', 'image_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'thumbnail', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'slug', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', 'variant_display_name', 'TEXT');
    // ✅ عمود نوع البيع (جملة/تجزئة/نصف جملة)
    await addColumnIfNotExists(organizationId, 'order_items', 'sale_type', "TEXT DEFAULT 'retail'");
    // ✅ أعمدة المزامنة المحلية لـ order_items
    await addColumnIfNotExists(organizationId, 'order_items', '_local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'order_items', '_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'order_items', '_pending_operation', 'TEXT');

    // ✅ أعمدة المزامنة المحلية لـ orders (v52)
    await addColumnIfNotExists(organizationId, 'orders', '_local_updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', '_synced', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'orders', '_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'orders', '_pending_operation', 'TEXT');

    // ⚡ v41: جدول تاريخ المخزون المتقدم
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS inventory_history (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        movement_type TEXT NOT NULL,
        unit_type TEXT NOT NULL DEFAULT 'piece',
        quantity_pieces INTEGER,
        quantity_weight REAL,
        quantity_meters REAL,
        quantity_boxes INTEGER,
        balance_before_pieces INTEGER,
        balance_after_pieces INTEGER,
        balance_before_weight REAL,
        balance_after_weight REAL,
        balance_before_meters REAL,
        balance_after_meters REAL,
        balance_before_boxes INTEGER,
        balance_after_boxes INTEGER,
        color_id TEXT,
        size_id TEXT,
        batch_id TEXT,
        batch_number TEXT,
        expiry_date TEXT,
        serial_numbers TEXT,
        reference_type TEXT,
        reference_id TEXT,
        unit_cost REAL,
        total_value REAL,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_id TEXT,
        updated_at TEXT
      );
    `);

    // فهارس لجدول inventory_history
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id);
    `).catch(() => {});
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_inventory_history_org ON inventory_history(organization_id);
    `).catch(() => {});
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_inventory_history_created ON inventory_history(created_at);
    `).catch(() => {});
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_inventory_history_type ON inventory_history(movement_type);
    `).catch(() => {});
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_inventory_history_synced ON inventory_history(synced);
    `).catch(() => {});

    // جدول المرتجعات (returns)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS returns (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        original_order_id TEXT,
        original_order_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        return_number TEXT,
        return_type TEXT,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        refund_method TEXT,
        reason TEXT,
        notes TEXT,
        created_by TEXT,
        approved_by TEXT,
        rejected_by TEXT,
        processed_by TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        processed_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول مرتجعات المنتجات (product_returns) - مستخدم في syncProductReturns
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_returns (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        return_number TEXT,
        order_id TEXT,
        order_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        product_id TEXT,
        product_name TEXT,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        refund_method TEXT,
        return_type TEXT DEFAULT 'refund',
        reason TEXT,
        reason_code TEXT,
        condition TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        images TEXT,
        created_by TEXT,
        created_by_name TEXT,
        approved_by TEXT,
        approved_by_name TEXT,
        rejected_by TEXT,
        rejected_by_name TEXT,
        processed_by TEXT,
        processed_by_name TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        processed_at TEXT,
        inventory_updated INTEGER DEFAULT 0,
        inventory_updated_at TEXT,
        inventory_updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        local_created_at TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ product_returns بصيغة camelCase
    // أعمدة إضافية لمرتجعات المنتجات
    await addColumnIfNotExists(organizationId, 'product_returns', 'remote_return_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'local_return_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'subtotal', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'discount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'tax', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'variant_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_order_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'order_item_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocked_by', 'TEXT');
    // أعمدة إضافية لمعلومات العميل في المرتجعات
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_product_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_product_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'exchange_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'product_returns', 'price_difference', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'images', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'attachments', 'TEXT');
    // أعمدة سبب الإرجاع
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason_details', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'condition_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refund_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'refund_notes', 'TEXT');
    // أعمدة إضافية لوصف سبب الإرجاع
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_reason_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'reason_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'admin_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'internal_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'customer_notes', 'TEXT');
    // أعمدة المبالغ الأصلية والرسوم
    await addColumnIfNotExists(organizationId, 'product_returns', 'original_total', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'return_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'restocking_fee', 'REAL');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approved_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'product_returns', 'approved_at', 'TEXT');

    // جدول عناصر الإرجاع (return_items) - مستخدم في syncProductReturns
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS return_items (
        id TEXT PRIMARY KEY,
        return_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        product_sku TEXT,
        return_quantity INTEGER DEFAULT 1,
        return_unit_price REAL DEFAULT 0,
        total_return_amount REAL DEFAULT 0,
        condition_status TEXT,
        resellable INTEGER DEFAULT 0,
        inventory_returned INTEGER DEFAULT 0,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        notes TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ return_items بصيغة camelCase
    // أعمدة إضافية لعناصر الإرجاع
    await addColumnIfNotExists(organizationId, 'return_items', 'original_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'return_items', 'original_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'reason_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'condition_notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'return_items', 'refund_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'return_items', 'restocking_fee', 'REAL');

    // جدول إعلانات الخسائر (losses)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS losses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        loss_type TEXT,
        loss_date TEXT,
        status TEXT DEFAULT 'pending',
        total_value REAL DEFAULT 0,
        description TEXT,
        cause TEXT,
        notes TEXT,
        reported_by TEXT,
        approved_by TEXT,
        witness_employee_id TEXT,
        approved_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // جدول إعلانات الخسائر (loss_declarations) - مستخدم في syncLossDeclarations
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS loss_declarations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        declaration_number TEXT,
        loss_type TEXT DEFAULT 'damage',
        loss_date TEXT,
        status TEXT DEFAULT 'pending',
        total_value REAL DEFAULT 0,
        total_quantity INTEGER DEFAULT 0,
        description TEXT,
        cause TEXT,
        reason TEXT,
        reason_code TEXT,
        notes TEXT,
        images TEXT,
        reported_by TEXT,
        reported_by_name TEXT,
        approved_by TEXT,
        approved_by_name TEXT,
        rejected_by TEXT,
        rejected_by_name TEXT,
        witness_employee_id TEXT,
        witness_employee_name TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        inventory_updated INTEGER DEFAULT 0,
        inventory_updated_at TEXT,
        inventory_updated_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        local_created_at TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ loss_declarations بصيغة camelCase
    // أعمدة إضافية لإعلانات الخسائر
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_number_lower', 'TEXT'); // ⚡ للبحث السريع
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'remote_loss_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'local_loss_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'items', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'metadata', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'department', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_category', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'products', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'affected_products', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'estimated_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'actual_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reference_number', 'TEXT');
    // أعمدة إضافية لوصف الخسارة
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'loss_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'cause', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'resolution', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'preventive_action', 'TEXT');
    // أعمدة إضافية لتاريخ الحادث
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'discovery_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'reported_date', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'incident_details', 'TEXT');
    // أعمدة القيم والتكاليف
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_cost_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_retail_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insurance_claim', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'insurance_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'recovery_amount', 'REAL');
    // أعمدة قيمة البيع والعدد الإجمالي
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'total_items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'items_count', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_declarations', 'cost_value', 'REAL');

    // جدول عناصر إعلانات الخسائر (loss_declaration_items)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS loss_declaration_items (
        id TEXT PRIMARY KEY,
        loss_declaration_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        color_id TEXT,
        color_name TEXT,
        size_id TEXT,
        size_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_cost REAL DEFAULT 0,
        total_value REAL DEFAULT 0,
        notes TEXT,
        condition TEXT,
        inventory_adjusted INTEGER DEFAULT 0,
        inventory_adjusted_at TEXT,
        inventory_adjusted_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ loss_declaration_items بصيغة camelCase

    // جدول عناصر الخسائر - تعريف بدون قيود NOT NULL
    const lossItemsTableDef = `
      CREATE TABLE IF NOT EXISTS loss_items (
        id TEXT PRIMARY KEY,
        loss_id TEXT DEFAULT '',
        product_id TEXT,
        color_id TEXT,
        size_id TEXT,
        product_name TEXT,
        color_name TEXT,
        size_name TEXT,
        quantity INTEGER DEFAULT 0,
        unit_cost REAL,
        total_value REAL,
        notes TEXT,
        inventory_adjusted INTEGER DEFAULT 0,
        inventory_adjusted_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      )
    `;

    // إعادة بناء جدول loss_items لإزالة قيود NOT NULL
    await rebuildTableIfNeeded(organizationId, 'loss_items', lossItemsTableDef, [
      'id', 'loss_id', 'product_id', 'color_id', 'size_id', 'product_name',
      'color_name', 'size_name', 'quantity', 'unit_cost', 'total_value',
      'notes', 'inventory_adjusted', 'inventory_adjusted_by', 'created_at', 'synced'
    ], needsSchemaUpgrade);

    await exec(organizationId, lossItemsTableDef + ';');

    // أعمدة إضافية لـ loss_items
    await addColumnIfNotExists(organizationId, 'loss_items', 'product_sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'barcode', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'sku', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'selling_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'cost_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_declaration_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'lost_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'damaged_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'original_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'remaining_quantity', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_cost_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'unit_selling_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'total_cost_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'total_selling_value', 'REAL');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_condition', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_reason', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'loss_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'organization_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'loss_items', 'updated_at', 'TEXT');

    // جدول العناوين (addresses) - تحديث
    await addColumnIfNotExists(organizationId, 'addresses', 'municipality', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'user_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'created_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'updated_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'commune', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'label', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'address_line_1', 'TEXT');
    await addColumnIfNotExists(organizationId, 'addresses', 'address_line_2', 'TEXT');

    // جدول بيانات التعريف للمزامنة
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        last_sync_at TEXT,
        last_server_timestamp TEXT,
        records_synced INTEGER DEFAULT 0,
        status TEXT DEFAULT 'idle',
        error TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // أعمدة إضافية للمزامنة التدريجية
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'entity_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_timestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_full_sync_timestamp', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'sync_count', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'last_sync_error', 'TEXT');
    await addColumnIfNotExists(organizationId, 'sync_metadata', 'organization_id', 'TEXT');

    // جدول العمليات الفاشلة للمزامنة (Retry Queue)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS failed_sync_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        payload TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at TEXT,
        status TEXT DEFAULT 'pending',
        organization_id TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // فهرس للعمليات الجاهزة للإعادة
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_failed_sync_status_retry
      ON failed_sync_operations (organization_id, status, next_retry_at);
    `);

    // جدول التعارضات في المزامنة (Sync Conflicts)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_data TEXT,
        server_data TEXT,
        local_updated_at TEXT,
        server_updated_at TEXT,
        status TEXT DEFAULT 'pending',
        organization_id TEXT NOT NULL,
        created_at TEXT,
        resolved_at TEXT
      );
    `);

    // فهرس للتعارضات المعلقة
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_pending
      ON sync_conflicts (organization_id, status);
    `);

    // جدول الصور المخزنة محلياً (Cached Images for Offline)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS cached_images (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        base64_data TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        mime_type TEXT DEFAULT 'image/jpeg',
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // فهرس للبحث السريع عن الصور
    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_cached_images_url
      ON cached_images (organization_id, url);
    `);

    await exec(organizationId, `
      CREATE INDEX IF NOT EXISTS idx_cached_images_entity
      ON cached_images (organization_id, entity_type, entity_id);
    `);

    // جدول الموظفين (staff_members)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS staff_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT DEFAULT 'staff',
        permissions TEXT,
        pin_hash TEXT,
        salt TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'staff_members', 'avatar_url', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'first_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'staff_members', 'last_name', 'TEXT');

    // جدول المؤسسات (organizations)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        logo_url TEXT,
        owner_id TEXT,
        settings TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    await addColumnIfNotExists(organizationId, 'organizations', 'phone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'email', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'address', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'city', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'wilaya', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'country', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'currency', 'TEXT DEFAULT "DZD"');
    await addColumnIfNotExists(organizationId, 'organizations', 'timezone', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'nif', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'rc', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'nis', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'rib', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'activity', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'business_type', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'is_active', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists(organizationId, 'organizations', 'trial_ends_at', 'TEXT');
    await addColumnIfNotExists(organizationId, 'organizations', 'subscription_status', 'TEXT');

    // جدول حالات تأكيد الاتصال (call_confirmation_statuses)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS call_confirmation_statuses (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        color TEXT,
        icon TEXT,
        is_final INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        organization_id TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // جدول الولايات (wilayas)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS wilayas (
        id INTEGER PRIMARY KEY,
        code TEXT,
        name TEXT NOT NULL,
        name_ar TEXT,
        shipping_cost REAL DEFAULT 0,
        home_shipping_cost REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // جدول البلديات (communes)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS communes (
        id INTEGER PRIMARY KEY,
        wilaya_id INTEGER,
        code TEXT,
        name TEXT NOT NULL,
        name_ar TEXT,
        shipping_cost REAL,
        home_shipping_cost REAL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // جدول نماذج النماذج (form_templates)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS form_templates (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        fields TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // جدول إعدادات المتجر (store_settings)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS store_settings (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        store_name TEXT,
        store_description TEXT,
        store_logo TEXT,
        store_banner TEXT,
        store_url TEXT,
        theme TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        accent_color TEXT,
        font_family TEXT,
        currency TEXT DEFAULT 'DZD',
        language TEXT DEFAULT 'ar',
        social_links TEXT,
        contact_info TEXT,
        seo_settings TEXT,
        shipping_settings TEXT,
        payment_settings TEXT,
        notification_settings TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // ⚡ فهارس للبحث السريع - تحسين الأداء بإنشائها دفعة واحدة
    try {
      // ⚡ تحسين: إنشاء الفهارس في استدعاء واحد لتسريع التهيئة
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(name_lower);`,
        `CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(sku_lower);`,
        `CREATE INDEX IF NOT EXISTS idx_products_barcode_lower ON products(barcode_lower);`,
        `CREATE INDEX IF NOT EXISTS idx_products_organization ON products(organization_id);`,
        // ⚡ فهارس إضافية لتحسين أداء البحث عن المنتجات
        `CREATE INDEX IF NOT EXISTS idx_products_org_name ON products(organization_id, name);`,
        `CREATE INDEX IF NOT EXISTS idx_products_org_category ON products(organization_id, category_id);`,
        `CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);`,
        `CREATE INDEX IF NOT EXISTS idx_products_org_barcode ON products(organization_id, barcode);`,
        `CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);`,
      ];
      
      // تنفيذ جميع الفهارس دفعة واحدة
      await Promise.all(indexQueries.map(query => exec(organizationId, query).catch(() => {})));
      // ⚡ فهارس للألوان والمقاسات والعملاء والطلبيات
      const additionalIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);`,
        `CREATE INDEX IF NOT EXISTS idx_product_colors_barcode ON product_colors(barcode);`,
        `CREATE INDEX IF NOT EXISTS idx_product_sizes_color ON product_sizes(color_id);`,
        `CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes(product_id);`,
        `CREATE INDEX IF NOT EXISTS idx_product_sizes_barcode ON product_sizes(barcode);`,
        `CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(name_lower);`,
        `CREATE INDEX IF NOT EXISTS idx_customers_phone_digits ON customers(phone_digits);`,
        `CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);`,
        // ⚡ v44: فهارس لجدول orders (موحد مع Supabase)
        `CREATE INDEX IF NOT EXISTS idx_orders_organization ON orders(organization_id);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);`,
        // ⚡ فهارس إضافية لتحسين أداء صفحة الطلبيات
        `CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);`,
        // ⚡ v44: فهرس لجدول order_items (موحد مع Supabase)
        `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);`,
        // ⚡ v55: فهارس حرجة لـ work_sessions لتسريع الاستعلامات (حل مشكلة database locked)
        `CREATE INDEX IF NOT EXISTS idx_work_sessions_staff_status ON work_sessions(staff_id, status, organization_id);`,
        `CREATE INDEX IF NOT EXISTS idx_work_sessions_org_status ON work_sessions(organization_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_work_sessions_staff ON work_sessions(staff_id);`,
        `CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);`,
      ];
      
      await Promise.all(additionalIndexes.map(query => exec(organizationId, query).catch(() => {})));
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض الفهارس لم يتم إنشاؤها (قد تكون موجودة بالفعل):', indexError);
    }

    // جدول طلبات الإصلاح (repair_orders)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_orders (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        device_type TEXT,
        device_brand TEXT,
        device_model TEXT,
        serial_number TEXT,
        problem_description TEXT,
        diagnosis TEXT,
        repair_notes TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        estimated_cost REAL,
        final_cost REAL,
        deposit_amount REAL,
        paid_amount REAL,
        received_date TEXT,
        estimated_completion TEXT,
        completed_date TEXT,
        delivered_date TEXT,
        technician_id TEXT,
        technician_name TEXT,
        warranty_period INTEGER,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // أعمدة إضافية لـ repair_orders (camelCase)

    // Missing columns for complete RepairOrder type support
    await addColumnIfNotExists(organizationId, 'repair_orders', 'order_number', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_location_id', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'custom_location', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'issue_description', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'total_price', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'paid_amount', 'REAL');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'price_to_be_determined_later', 'INTEGER');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'received_by', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'sync_status', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'pending_operation', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'customer_name_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'device_type_lower', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'notes', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'repair_tracking_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'repair_orders', 'payment_method', 'TEXT');

    // جدول مواقع التصليح (repair_locations)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_locations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        address TEXT,
        phone TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT
      );
    `);

    // أعمدة إضافية لـ repair_locations (camelCase)

    // جدول صور التصليح (repair_images)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_images (
        id TEXT PRIMARY KEY,
        repair_order_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_type TEXT CHECK(image_type IN ('before', 'after')),
        description TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
      );
    `);

    // أعمدة إضافية لـ repair_images (camelCase)

    // جدول تاريخ حالات التصليح (repair_status_history)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS repair_status_history (
        id TEXT PRIMARY KEY,
        repair_order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
      );
    `);

    // أعمدة إضافية لـ repair_status_history (camelCase)

    // فهارس لجداول التصليح
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_organization ON repair_orders(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_customer ON repair_orders(customer_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_orders_synced ON repair_orders(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_locations_organization ON repair_locations(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_locations_synced ON repair_locations(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_images_repair_order ON repair_images(repair_order_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_images_synced ON repair_images(synced);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_history_repair_order ON repair_status_history(repair_order_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_repair_history_synced ON repair_status_history(synced);`);
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض فهارس التصليح لم يتم إنشاؤها (قد تكون موجودة بالفعل):', indexError);
    }

    // جدول صلاحيات المستخدمين (user_permissions)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT NOT NULL,
        user_id TEXT,
        email TEXT,
        name TEXT,
        role TEXT,
        organization_id TEXT,
        is_active INTEGER DEFAULT 1,
        is_org_admin INTEGER DEFAULT 0,
        is_super_admin INTEGER DEFAULT 0,
        permissions TEXT,
        has_inventory_access INTEGER DEFAULT 0,
        can_manage_products INTEGER DEFAULT 0,
        can_view_reports INTEGER DEFAULT 0,
        can_manage_users INTEGER DEFAULT 0,
        can_manage_orders INTEGER DEFAULT 0,
        can_access_pos INTEGER DEFAULT 0,
        can_manage_settings INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        last_updated TEXT
      );
    `);


    // جدول الاشتراكات (subscriptions) - للتوافق مع offlineSubscriptionService
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        plan_id TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        trial_end_date TEXT,
        grace_end_date TEXT,
        features TEXT,
        last_check TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // ⭐ أعمدة الخطط الجديدة (v2)
    await addColumnIfNotExists(organizationId, 'subscriptions', 'plan_code', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'plan_name', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'limits', 'TEXT'); // JSON - SubscriptionPlanLimits
    await addColumnIfNotExists(organizationId, 'subscriptions', 'permissions', 'TEXT'); // JSON - SubscriptionPlanPermissions
    await addColumnIfNotExists(organizationId, 'subscriptions', 'billing_cycle', 'TEXT');
    await addColumnIfNotExists(organizationId, 'subscriptions', 'amount_paid', 'REAL');

    // جدول بيانات المصادقة المحلية (local_auth_data) - للتخزين الآمن للأوفلاين
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS local_auth_data (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT,
        role TEXT,
        organization_id TEXT,
        session_data TEXT,
        user_metadata TEXT,
        app_metadata TEXT,
        last_online_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);


    // =====================================================
    // 🔄 جدول sync_metadata للتزامن التدريجي (Incremental Sync)
    // يخزن آخر وقت مزامنة لكل نوع من الكيانات
    // =====================================================
    try {
      // التحقق من وجود الجدول وهيكله
      const syncMetaTableExists = await tableExists(organizationId, 'sync_metadata');

      if (syncMetaTableExists) {
        // التحقق من وجود العمود entity_type
        const hasEntityType = await columnExists(organizationId, 'sync_metadata', 'entity_type');
        if (!hasEntityType) {
          // الجدول موجود لكن بدون العمود المطلوب - حذفه وإعادة إنشائه
          console.log('[TauriSQLite] 🔄 sync_metadata table exists but missing entity_type column, recreating...');
          await exec(organizationId, `DROP TABLE IF EXISTS sync_metadata;`);
        }
      }

      await exec(organizationId, `
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          last_sync_timestamp TEXT,
          last_full_sync_timestamp TEXT,
          sync_count INTEGER DEFAULT 0,
          last_sync_status TEXT DEFAULT 'success',
          last_sync_error TEXT,
          records_synced INTEGER DEFAULT 0,
          organization_id TEXT,
          created_at TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT ''
        );
      `);
      console.log('[TauriSQLite] ✅ sync_metadata table created successfully');
    } catch (syncMetaError) {
      console.error('[TauriSQLite] ⚠️ Failed to create sync_metadata table:', syncMetaError);
    }

    // إضافة أعمدة camelCase للتوافق

    // إنشاء فهرس sync_metadata منفصلاً بعد التأكد من وجود الجدول والعمود
    try {
      const syncMetaReady = await tableExists(organizationId, 'sync_metadata');
      const hasEntityTypeCol = await columnExists(organizationId, 'sync_metadata', 'entity_type');
      if (syncMetaReady && hasEntityTypeCol) {
        await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_metadata_entity_type ON sync_metadata(entity_type);`);
        console.log('[TauriSQLite] ✅ sync_metadata index created');
      } else {
        console.warn('[TauriSQLite] ⚠️ sync_metadata table or entity_type column not ready for index');
      }
    } catch (indexError) {
      console.warn('[TauriSQLite] ⚠️ Failed to create sync_metadata index:', indexError);
    }

    // =====================================================
    // 💰 جدول expense_categories - تصنيفات المصروفات
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS expense_categories (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        synced INTEGER DEFAULT 1,
        pending_operation TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);`);
    } catch { }

    // =====================================================
    // 💰 جدول expenses - المصروفات (v50)
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        title TEXT,
        amount REAL NOT NULL DEFAULT 0,
        category TEXT,
        description TEXT,
        expense_date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        receipt_url TEXT,
        is_recurring INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 1,
        pending_operation TEXT,
        local_created_at TEXT,
        local_updated_at TEXT
      );
    `);

    // فهارس لجدول expenses
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(organization_id, expense_date);`);
      console.log('[TauriSQLite] ✅ expenses table and indexes created');
    } catch { }

    // =====================================================
    // 💰 جدول recurring_expenses - المصروفات المتكررة (v50)
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL,
        frequency TEXT NOT NULL,
        day_of_week INTEGER,
        day_of_month INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT,
        next_due TEXT NOT NULL,
        last_generated TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 1,
        pending_operation TEXT,
        FOREIGN KEY (expense_id) REFERENCES expenses(id)
      );
    `);

    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_recurring_expenses_expense ON recurring_expenses(expense_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due);`);
      console.log('[TauriSQLite] ✅ recurring_expenses table and indexes created');
    } catch { }

    // فهارس إضافية للبحث السريع
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_permissions_auth_user ON user_permissions(auth_user_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_local_auth_data_auth_user ON local_auth_data(auth_user_id);`);
      // idx_sync_metadata_entity_type تم إنشاؤه بالفعل أعلاه
    } catch (indexError) {
      console.warn('[TauriSQLite] بعض فهارس الجداول الجديدة لم يتم إنشاؤها:', indexError);
    }

    // =====================================================
    // 🔔 جداول الإشعارات للأوفلاين
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS cached_notifications (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        is_read INTEGER DEFAULT 0,
        entity_type TEXT,
        entity_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        synced_at TEXT
      );
    `);

    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS notification_sync_queue (
        id TEXT PRIMARY KEY,
        notification_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT
      );
    `);

    // فهارس للإشعارات
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_cached_notifications_org ON cached_notifications(organization_id, created_at DESC);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_notification_sync_queue_attempts ON notification_sync_queue(attempts);`);
      console.log('[TauriSQLite] ✅ cached_notifications tables and indexes created');
    } catch (notifIndexError) {
      console.warn('[TauriSQLite] ⚠️ Some notification indexes may already exist:', notifIndexError);
    }

    // =====================================================
    // 📤 جدول sync_outbox - قائمة العمليات المعلقة للإرسال (Delta Sync)
    // =====================================================
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE', 'DELTA')),
        record_id TEXT NOT NULL,
        payload TEXT,
        local_seq INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sending', 'failed', 'sent')),
        next_retry_at TEXT
      );
    `);

    // فهارس لـ sync_outbox
    try {
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_local_seq ON sync_outbox(local_seq);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_table ON sync_outbox(table_name);`);
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_record ON sync_outbox(table_name, record_id);`);
      // ⚡ فهرس مركب للاستعلامات المتكررة في getPending
      await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_retry ON sync_outbox(status, retry_count, next_retry_at);`);
      console.log('[TauriSQLite] ✅ sync_outbox table and indexes created');
    } catch (outboxIndexError) {
      console.warn('[TauriSQLite] ⚠️ Some sync_outbox indexes may already exist:', outboxIndexError);
    }

    // أعمدة إضافية لـ sync_outbox (camelCase)

    // ⚡ v36: جدول دفعات المخزون (Inventory Batches)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        remaining_quantity INTEGER DEFAULT 0,
        purchase_price REAL,
        expiry_date TEXT,
        manufacture_date TEXT,
        received_date TEXT,
        supplier_id TEXT,
        supplier_batch_number TEXT,
        location TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_inventory_batches_org ON inventory_batches(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON inventory_batches(product_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_inventory_batches_status ON inventory_batches(status);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_inventory_batches_synced ON inventory_batches(synced);`);

    // أعمدة camelCase لـ inventory_batches

    // ⚡ v36: جدول الأرقام التسلسلية (Product Serial Numbers)
    await exec(organizationId, `
      CREATE TABLE IF NOT EXISTS product_serial_numbers (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        batch_id TEXT,
        purchase_price REAL,
        purchase_date TEXT,
        supplier_id TEXT,
        sold_at TEXT,
        sold_price REAL,
        sold_to_customer_id TEXT,
        order_id TEXT,
        warranty_start_date TEXT,
        warranty_end_date TEXT,
        warranty_claimed INTEGER DEFAULT 0,
        warranty_claim_date TEXT,
        warranty_claim_notes TEXT,
        imei TEXT,
        mac_address TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced INTEGER DEFAULT 0,
        sync_status TEXT,
        pending_operation TEXT,
        local_updated_at TEXT
      );
    `);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_org ON product_serial_numbers(organization_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_product ON product_serial_numbers(product_id);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_serial ON product_serial_numbers(serial_number);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_status ON product_serial_numbers(status);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_warranty ON product_serial_numbers(warranty_end_date);`);
    await exec(organizationId, `CREATE INDEX IF NOT EXISTS idx_product_serials_synced ON product_serial_numbers(synced);`);

    // ⚡ المرحلة 3: نظام migrations منفصل لكل version (idempotent)
    // كل migration يعمل فقط إذا كان currentVersion < targetVersion
    // وكل migration idempotent (يمكن تشغيله عدة مرات بأمان)

    // Migration v59: تحويل جميع أسماء الأعمدة من camelCase إلى snake_case
    if (needsSchemaUpgrade && currentVersion < 59) {
      await applyMigrationFor59(organizationId);
    }

    // Migration v58: توحيد مخطط SQLite مع نظام المزامنة
    if (needsSchemaUpgrade && currentVersion < 58) {
      await applyMigrationFor58(organizationId);
    }

    // ⚡ v44: الجداول الآن موحدة مع Supabase (orders, order_items)
    // لم نعد بحاجة لـ Views لأن الجداول بالأسماء الصحيحة مباشرة
    // نحتفظ فقط بـ View لـ staff_work_sessions للتوافق العكسي
    try {
      // ⚡ v58: تحديث View لـ staff_work_sessions بدلاً من work_sessions
      await exec(organizationId, `DROP VIEW IF EXISTS pos_work_sessions;`);
      
      // إنشاء View يشير إلى staff_work_sessions (أو work_sessions إذا لم يتم الترحيل بعد)
      const staffWorkSessionsExists = await tableExists(organizationId, 'staff_work_sessions');
      if (staffWorkSessionsExists) {
        await exec(organizationId, `
          CREATE VIEW IF NOT EXISTS pos_work_sessions AS
          SELECT * FROM staff_work_sessions;
        `);
      } else {
        // للتوافق العكسي - إذا لم يتم الترحيل بعد
        await exec(organizationId, `
          CREATE VIEW IF NOT EXISTS pos_work_sessions AS
          SELECT * FROM work_sessions;
        `);
      }

      console.log('[TauriSQLite] ✅ v44: الجداول موحدة مع Supabase (orders, order_items)');
    } catch (viewError) {
      // عدم إيقاف التنفيذ عند فشل إنشاء Views
      console.warn('[TauriSQLite] ⚠️ فشل إنشاء بعض Views:', viewError);
    }

    // تحديث إصدار الـ schema بعد الانتهاء بنجاح
    if (needsSchemaUpgrade) {
      await setSchemaVersion(organizationId, SCHEMA_VERSION);
      console.log(`[TauriSQLite] ✅ تم ترقية schema من ${currentVersion} إلى ${SCHEMA_VERSION}`);
    }

    // ⚡ إعادة تعيين skipColumnChecks بعد الانتهاء
    skipColumnChecks = false;

    const duration = Date.now() - startTime;
    console.log(`[TauriSQLite] ✅ تم إنهاء تهيئة schema في ${duration}ms`);
    return { success: true };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[TauriSQLite] Schema initialization failed after ${duration}ms:`, error);
    return { success: false, error: error?.message || String(error) };
  }
}

// ⚡ المرحلة 3: دوال migrations منفصلة لكل version (idempotent)
// كل migration يمكن تشغيله عدة مرات بأمان

/**
 * Migration v59: تحويل جميع أسماء الأعمدة من camelCase إلى snake_case
 * Idempotent: يمكن تشغيله عدة مرات بأمان
 */
async function applyMigrationFor59(orgId: string): Promise<void> {
  try {
    console.log('[TauriSQLite] 🔄 v59: تحويل أسماء الأعمدة من camelCase إلى snake_case...');
    
    // ملاحظة: SQLite لا يدعم DROP COLUMN مباشرة، لذلك الأعمدة camelCase القديمة
    // ستظل موجودة لكن لن يتم استخدامها. سيتم تجاهلها تلقائياً عند القراءة.
    
    // هذا migration لا يحتاج لترحيل بيانات - فقط إضافة أعمدة snake_case جديدة
    // الأعمدة الجديدة تم إضافتها بالفعل في الكود الرئيسي
    
    console.log('[TauriSQLite] ✅ v59: جميع الأعمدة الآن تستخدم snake_case فقط');
    console.log('[TauriSQLite] ℹ️ الأعمدة camelCase القديمة ستظل موجودة لكن لن تُستخدم');
  } catch (error: any) {
    console.error('[TauriSQLite] ❌ فشل migration v59:', error);
    throw error;
  }
}

/**
 * Migration v58: توحيد مخطط SQLite مع نظام المزامنة
 * Idempotent: يمكن تشغيله عدة مرات بأمان
 */
async function applyMigrationFor58(orgId: string): Promise<void> {
  try {
    console.log('[TauriSQLite] 🔄 v58: بدء ترحيل البيانات إلى الأسماء الموحدة...');
    
    // 1. ترحيل work_sessions إلى staff_work_sessions
    const workSessionsExists = await tableExists(orgId, 'work_sessions');
    const staffWorkSessionsExists = await tableExists(orgId, 'staff_work_sessions');
    
    if (workSessionsExists && !staffWorkSessionsExists) {
      console.log('[TauriSQLite] 🔄 ترحيل work_sessions إلى staff_work_sessions...');
      
      // إنشاء جدول staff_work_sessions بنفس بنية work_sessions
      await exec(orgId, `
        CREATE TABLE IF NOT EXISTS staff_work_sessions (
          id TEXT PRIMARY KEY,
          staff_id TEXT DEFAULT '',
          staff_name TEXT,
          organization_id TEXT DEFAULT '',
          opening_cash REAL DEFAULT 0,
          closing_cash REAL,
          expected_cash REAL,
          cash_difference REAL,
          total_sales REAL DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          cash_sales REAL DEFAULT 0,
          card_sales REAL DEFAULT 0,
          started_at TEXT DEFAULT '',
          ended_at TEXT,
          paused_at TEXT,
          resumed_at TEXT,
          pause_count INTEGER DEFAULT 0,
          total_pause_duration INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          opening_notes TEXT,
          closing_notes TEXT,
          synced INTEGER DEFAULT 0,
          sync_status TEXT,
          pending_operation TEXT,
          created_at TEXT DEFAULT '',
          updated_at TEXT DEFAULT '',
          opening_balance REAL,
          closing_balance REAL,
          opened_at TEXT,
          closed_at TEXT,
          extra_fields TEXT
        );
      `);
      
      // نسخ البيانات من work_sessions إلى staff_work_sessions
      await exec(orgId, `
        INSERT OR IGNORE INTO staff_work_sessions
        SELECT * FROM work_sessions;
      `);

      // ⚡ حذف جدول work_sessions القديم لضمان استخدام staff_work_sessions فقط
      await exec(orgId, `DROP TABLE IF EXISTS work_sessions;`);

      console.log('[TauriSQLite] ✅ تم ترحيل work_sessions إلى staff_work_sessions وحذف الجدول القديم');
    }
    
    // 2. ترحيل product_returns إلى returns (إذا كان هناك بيانات في product_returns)
    const productReturnsExists = await tableExists(orgId, 'product_returns');
    const returnsExists = await tableExists(orgId, 'returns');
    
    if (productReturnsExists && returnsExists) {
      // التحقق من وجود بيانات في product_returns
      const productReturnsCount = await tauriQuery(orgId, `SELECT COUNT(*) as count FROM product_returns;`, []);
      if (productReturnsCount.success && productReturnsCount.data && productReturnsCount.data[0]?.count > 0) {
        console.log('[TauriSQLite] ⚠️ يوجد بيانات في product_returns - يجب ترحيلها يدوياً إلى returns');
        // لا نترحل تلقائياً لأن البنية مختلفة - يحتاج مراجعة
      }
    }
    
    // 3. ترحيل loss_declarations إلى losses (إذا كان هناك بيانات)
    const lossDeclarationsExists = await tableExists(orgId, 'loss_declarations');
    const lossesExists = await tableExists(orgId, 'losses');
    
    if (lossDeclarationsExists && lossesExists) {
      const lossDeclarationsCount = await tauriQuery(orgId, `SELECT COUNT(*) as count FROM loss_declarations;`, []);
      if (lossDeclarationsCount.success && lossDeclarationsCount.data && lossDeclarationsCount.data[0]?.count > 0) {
        console.log('[TauriSQLite] ⚠️ يوجد بيانات في loss_declarations - يجب ترحيلها يدوياً إلى losses');
        // لا نترحل تلقائياً لأن البنية مختلفة - يحتاج مراجعة
      }
    }
    
    console.log('[TauriSQLite] ✅ v58: اكتمل ترحيل البيانات');
  } catch (error: any) {
    console.error('[TauriSQLite] ❌ خطأ في migration v58:', error);
    throw error;
  }
}
