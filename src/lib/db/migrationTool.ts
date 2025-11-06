/**
 * أداة ترحيل البيانات من IndexedDB إلى SQLite
 * تستخدم مرة واحدة عند بدء التطبيق لأول مرة في Electron
 */

import Dexie from 'dexie';
import { sqliteDB, isElectron } from './sqliteAPI';

/**
 * نتيجة الترحيل
 */
export interface MigrationResult {
  success: boolean;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  tables: {
    [tableName: string]: {
      total: number;
      migrated: number;
      failed: number;
    };
  };
  errors: string[];
  duration: number;
}

/**
 * الجداول المطلوب ترحيلها
 */
const TABLES_TO_MIGRATE = [
  'products',
  'posOrders',
  'posOrderItems',
  'customers',
  'invoices',
  'invoiceItems',
  'customerDebts',
  'repairOrders',
  'repairImages',
  'staffPins',
  'syncQueue',
  'workSessions',
  'transactions',
];

/**
 * تعيين أسماء الجداول من IndexedDB إلى SQLite
 */
const TABLE_NAME_MAPPING: { [key: string]: string } = {
  posOrders: 'pos_orders',
  posOrderItems: 'pos_order_items',
  invoiceItems: 'invoice_items',
  customerDebts: 'customer_debts',
  repairOrders: 'repair_orders',
  repairImages: 'repair_images',
  staffPins: 'staff_pins',
  syncQueue: 'sync_queue',
  workSessions: 'work_sessions',
};

/**
 * فتح قاعدة IndexedDB القديمة
 */
const openIndexedDB = (organizationId: string): Dexie => {
  const db = new Dexie(`bazaarDB_v2`);

  db.version(1).stores({
    products: 'id, name, sku, barcode, organization_id',
    posOrders: 'id, organization_id, created_at',
    posOrderItems: 'id, order_id, product_id',
    customers: 'id, name, phone, organization_id',
    invoices: 'id, organization_id, created_at',
    invoiceItems: 'id, invoice_id',
    customerDebts: 'id, customer_id, organization_id',
    repairOrders: 'id, organization_id, created_at',
    repairImages: 'id, repair_id',
    staffPins: 'id, organization_id',
    syncQueue: 'id, object_type, object_id',
    workSessions: 'id, organization_id',
    transactions: 'id, product_id',
  });

  return db;
};

/**
 * ترحيل جدول واحد
 */
const migrateTable = async (
  indexedDB: Dexie,
  tableName: string,
  sqliteTableName: string
): Promise<{
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let total = 0;
  let migrated = 0;
  let failed = 0;

  try {
    // الحصول على الجدول من IndexedDB
    const table = (indexedDB as any)[tableName];
    if (!table) {
      errors.push(`Table ${tableName} not found in IndexedDB`);
      return { total: 0, migrated: 0, failed: 0, errors };
    }

    // الحصول على جميع السجلات
    const records = await table.toArray();
    total = records.length;

    console.log(`[Migration] Migrating ${total} records from ${tableName}...`);

    // ترحيل كل سجل
    for (const record of records) {
      try {
        // تحويل التواريخ إلى string إذا لزم الأمر
        const cleanedRecord = cleanRecord(record);

        // إضافة إلى SQLite
        const result = await sqliteDB.upsert(sqliteTableName, cleanedRecord);

        if (result.success) {
          migrated++;
        } else {
          failed++;
          errors.push(`Failed to migrate ${tableName}/${record.id}: ${result.error}`);
        }
      } catch (error: any) {
        failed++;
        errors.push(`Error migrating ${tableName}/${record.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Table migration error for ${tableName}: ${error.message}`);
  }

  return { total, migrated, failed, errors };
};

/**
 * تنظيف السجل - تحويل Date إلى string
 */
const cleanRecord = (record: any): any => {
  const cleaned: any = {};

  for (const key in record) {
    const value = record[key];

    if (value instanceof Date) {
      cleaned[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null && !(value instanceof Array)) {
      // تحويل Objects إلى JSON
      cleaned[key] = JSON.stringify(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * ترحيل جميع البيانات
 */
export const migrateAllData = async (
  organizationId: string
): Promise<MigrationResult> => {
  const startTime = Date.now();

  const result: MigrationResult = {
    success: false,
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    tables: {},
    errors: [],
    duration: 0,
  };

  try {
    // فحص إذا كان Electron
    if (!isElectron()) {
      result.errors.push('Migration is only available in Electron');
      return result;
    }

    console.log('[Migration] Starting data migration...');

    // تهيئة SQLite
    const initResult = await sqliteDB.initialize(organizationId);
    if (!initResult.success) {
      result.errors.push(`Failed to initialize SQLite: ${initResult.error}`);
      return result;
    }

    // فتح IndexedDB
    const indexedDB = openIndexedDB(organizationId);

    // ترحيل كل جدول
    for (const tableName of TABLES_TO_MIGRATE) {
      const sqliteTableName = TABLE_NAME_MAPPING[tableName] || tableName;

      console.log(`[Migration] Processing table: ${tableName} -> ${sqliteTableName}`);

      const tableResult = await migrateTable(
        indexedDB,
        tableName,
        sqliteTableName
      );

      result.tables[tableName] = {
        total: tableResult.total,
        migrated: tableResult.migrated,
        failed: tableResult.failed,
      };

      result.totalRecords += tableResult.total;
      result.migratedRecords += tableResult.migrated;
      result.failedRecords += tableResult.failed;
      result.errors.push(...tableResult.errors);
    }

    // إغلاق IndexedDB
    indexedDB.close();

    result.success = result.failedRecords === 0;
    result.duration = Date.now() - startTime;

    console.log('[Migration] Migration completed:', {
      total: result.totalRecords,
      migrated: result.migratedRecords,
      failed: result.failedRecords,
      duration: `${(result.duration / 1000).toFixed(2)}s`,
    });

    // حفظ نتيجة الترحيل في localStorage
    localStorage.setItem(
      'migration_result',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        organizationId,
        ...result,
      })
    );

    return result;
  } catch (error: any) {
    result.errors.push(`Migration failed: ${error.message}`);
    result.duration = Date.now() - startTime;
    return result;
  }
};

/**
 * فحص إذا تم الترحيل مسبقاً
 */
export const hasMigrated = (): boolean => {
  if (!isElectron()) return false;

  const migrationResult = localStorage.getItem('migration_result');
  if (!migrationResult) return false;

  try {
    const result = JSON.parse(migrationResult);
    return result.success === true;
  } catch {
    return false;
  }
};

/**
 * الحصول على نتيجة الترحيل السابقة
 */
export const getMigrationResult = (): MigrationResult | null => {
  const migrationResult = localStorage.getItem('migration_result');
  if (!migrationResult) return null;

  try {
    return JSON.parse(migrationResult);
  } catch {
    return null;
  }
};

/**
 * حذف بيانات IndexedDB بعد الترحيل الناجح
 */
export const cleanupIndexedDB = async (
  organizationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isElectron()) {
      return { success: false, error: 'Only available in Electron' };
    }

    // فتح وحذف قاعدة IndexedDB
    await Dexie.delete('bazaarDB_v2');

    console.log('[Migration] IndexedDB cleaned up successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[Migration] Failed to cleanup IndexedDB:', error);
    return { success: false, error: error.message };
  }
};

/**
 * إعادة تعيين حالة الترحيل (للاختبار)
 */
export const resetMigrationStatus = (): void => {
  localStorage.removeItem('migration_result');
  console.log('[Migration] Migration status reset');
};
