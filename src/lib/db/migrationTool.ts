/**
 * أداة ترحيل البيانات - تم تعطيل مسار IndexedDB/Dexie في بناء SQLite فقط
 * يتم توفير دوال Stubs آمنة لضمان التوافق دون جلب Dexie
 */

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

// تم تعطيل الوصول إلى IndexedDB في هذا البناء

/**
 * ترحيل جدول واحد
 */
// مسارات الترحيل من IndexedDB معطلة بالكامل

/**
 * تنظيف السجل - تحويل Date إلى string
 */
// لا حاجة لتنظيف السجلات في هذا البناء

/**
 * ترحيل جميع البيانات
 */
export const migrateAllData = async (
  organizationId: string
): Promise<MigrationResult> => {
  const startTime = Date.now();

  const result: MigrationResult = {
    success: true,
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    tables: {},
    errors: [],
    duration: 0,
  };

  try {
    if (!isElectron()) {
      // لا حاجة لترحيل في المتصفح
      result.duration = Date.now() - startTime;
      return result;
    }

    // تهيئة SQLite للتأكد من جاهزية القاعدة
    await sqliteDB.initialize(organizationId);

    // في بناء SQLite فقط: اعتبر الترحيل ناجحاً دون قراءة IndexedDB
    result.success = true;
    result.duration = Date.now() - startTime;

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
  if (!migrationResult) return true; // اعتبره منجزاً افتراضياً
  try {
    const result = JSON.parse(migrationResult);
    return result.success === true;
  } catch {
    return true;
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
  // تم تعطيل تنظيف IndexedDB في هذا البناء
  return { success: true };
};

/**
 * إعادة تعيين حالة الترحيل (للاختبار)
 */
export const resetMigrationStatus = (): void => {
  localStorage.removeItem('migration_result');
  console.log('[Migration] Migration status reset');
};
