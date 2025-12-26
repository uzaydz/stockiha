/**
 * ===================================================================
 * 🧹 CLEAR STUCK CRUD OPERATIONS - تنظيف العمليات العالقة في PowerSync
 * ===================================================================
 *
 * يحل مشكلة العمليات العالقة في CRUD queue التي تم إنشاؤها بسبب
 * logout غير صحيح (حذف IndexedDB بدون إخبار PowerSync)
 *
 * الاستخدام:
 * ```typescript
 * import { clearStuckCrudOperations } from '@/lib/utils/clear-stuck-crud-operations';
 *
 * // تنظيف جميع عمليات DELETE العالقة
 * await clearStuckCrudOperations.clearAllDeleteOperations();
 *
 * // أو فحص العمليات أولاً
 * const report = await clearStuckCrudOperations.analyzeCrudQueue();
 * console.log(report);
 * ```
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface CrudOperation {
  id: number;
  table: string;
  op_type: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  created_at?: string;
}

export interface CrudAnalysisReport {
  totalOperations: number;
  deleteOperations: number;
  insertOperations: number;
  updateOperations: number;
  operationsByTable: Record<string, number>;
  oldestOperation?: Date;
  newestOperation?: Date;
  stuckDeletesByTable: Record<string, string[]>; // table -> product IDs
}

export class ClearStuckCrudOperations {
  /**
   * فحص CRUD queue وإرجاع تقرير تفصيلي
   */
  static async analyzeCrudQueue(): Promise<CrudAnalysisReport> {
    console.log('[CrudCleaner] 🔍 Analyzing CRUD queue...');

    try {
      if (!powerSyncService.isReady()) {
        throw new Error('PowerSync not initialized');
      }

      const db = powerSyncService.getDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      // جلب جميع العمليات من ps_crud
      const operations = await db.getAll<CrudOperation>(
        `SELECT * FROM ps_crud ORDER BY id ASC`
      );

      console.log(`[CrudCleaner] 📊 Found ${operations.length} operations in queue`);

      // تحليل العمليات
      const report: CrudAnalysisReport = {
        totalOperations: operations.length,
        deleteOperations: 0,
        insertOperations: 0,
        updateOperations: 0,
        operationsByTable: {},
        stuckDeletesByTable: {}
      };

      operations.forEach(op => {
        // عد الأنواع
        if (op.op_type === 'DELETE') report.deleteOperations++;
        else if (op.op_type === 'INSERT') report.insertOperations++;
        else if (op.op_type === 'UPDATE') report.updateOperations++;

        // عد حسب الجدول
        if (!report.operationsByTable[op.table]) {
          report.operationsByTable[op.table] = 0;
        }
        report.operationsByTable[op.table]++;

        // جمع DELETE operations حسب الجدول
        if (op.op_type === 'DELETE') {
          if (!report.stuckDeletesByTable[op.table]) {
            report.stuckDeletesByTable[op.table] = [];
          }

          // محاولة استخراج ID من البيانات
          let recordId = null;
          if (op.data && typeof op.data === 'string') {
            try {
              const parsed = JSON.parse(op.data);
              recordId = parsed.id;
            } catch {
              // تجاهل أخطاء JSON
            }
          } else if (op.data && typeof op.data === 'object') {
            recordId = (op.data as any).id;
          }

          if (recordId) {
            report.stuckDeletesByTable[op.table].push(recordId);
          }
        }
      });

      console.log('[CrudCleaner] 📊 Analysis complete:', report);
      return report;

    } catch (error: any) {
      console.error('[CrudCleaner] ❌ Analysis failed:', error?.message);
      throw error;
    }
  }

  /**
   * عرض تقرير مفصل بشكل جميل
   */
  static async printAnalysisReport(): Promise<void> {
    const report = await this.analyzeCrudQueue();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 POWERSYNC CRUD QUEUE ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📦 Total Operations: ${report.totalOperations}`);
    console.log(`  ├─ 🗑️  DELETE: ${report.deleteOperations}`);
    console.log(`  ├─ ➕ INSERT: ${report.insertOperations}`);
    console.log(`  └─ ✏️  UPDATE: ${report.updateOperations}\n`);

    console.log('📋 Operations by Table:');
    Object.entries(report.operationsByTable).forEach(([table, count]) => {
      console.log(`  ├─ ${table}: ${count}`);
    });

    if (Object.keys(report.stuckDeletesByTable).length > 0) {
      console.log('\n🚨 Stuck DELETE Operations:');
      Object.entries(report.stuckDeletesByTable).forEach(([table, ids]) => {
        console.log(`  ├─ ${table}: ${ids.length} records`);
        if (ids.length > 0) {
          console.log(`  │   └─ IDs: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''}`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * حذف جميع عمليات DELETE من CRUD queue
   */
  static async clearAllDeleteOperations(): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    console.log('[CrudCleaner] 🧹 Clearing all DELETE operations...');

    try {
      if (!powerSyncService.isReady()) {
        throw new Error('PowerSync not initialized');
      }

      const db = powerSyncService.getDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      // عد عمليات DELETE أولاً
      const countResult = await db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ps_crud WHERE op = 'DELETE'`
      );

      const deleteCount = countResult?.count || 0;

      if (deleteCount === 0) {
        console.log('[CrudCleaner] ✅ No DELETE operations found');
        return { success: true, deletedCount: 0 };
      }

      console.log(`[CrudCleaner] Found ${deleteCount} DELETE operations to remove`);

      // حذف جميع عمليات DELETE
      await db.execute(`DELETE FROM ps_crud WHERE op = 'DELETE'`);

      console.log(`[CrudCleaner] ✅ Successfully removed ${deleteCount} DELETE operations`);

      return {
        success: true,
        deletedCount: deleteCount
      };

    } catch (error: any) {
      console.error('[CrudCleaner] ❌ Failed to clear DELETE operations:', error?.message);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * حذف عمليات DELETE لجدول معين
   */
  static async clearDeleteOperationsForTable(table: string): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    console.log(`[CrudCleaner] 🧹 Clearing DELETE operations for table: ${table}...`);

    try {
      if (!powerSyncService.isReady()) {
        throw new Error('PowerSync not initialized');
      }

      const db = powerSyncService.getDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      // عد عمليات DELETE للجدول المحدد
      const countResult = await db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ps_crud WHERE op = 'DELETE' AND [table] = ?`,
        [table]
      );

      const deleteCount = countResult?.count || 0;

      if (deleteCount === 0) {
        console.log(`[CrudCleaner] ✅ No DELETE operations found for table: ${table}`);
        return { success: true, deletedCount: 0 };
      }

      console.log(`[CrudCleaner] Found ${deleteCount} DELETE operations for table: ${table}`);

      // حذف عمليات DELETE للجدول المحدد
      await db.execute(`DELETE FROM ps_crud WHERE op = 'DELETE' AND [table] = ?`, [table]);

      console.log(`[CrudCleaner] ✅ Successfully removed ${deleteCount} DELETE operations for ${table}`);

      return {
        success: true,
        deletedCount: deleteCount
      };

    } catch (error: any) {
      console.error(`[CrudCleaner] ❌ Failed to clear DELETE operations for ${table}:`, error?.message);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * حذف عمليات DELETE لمنتجات معينة (بالـ IDs)
   */
  static async clearDeleteOperationsForProducts(productIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    console.log(`[CrudCleaner] 🧹 Clearing DELETE operations for ${productIds.length} products...`);

    try {
      if (!powerSyncService.isReady()) {
        throw new Error('PowerSync not initialized');
      }

      const db = powerSyncService.getDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      let totalDeleted = 0;

      // حذف عمليات DELETE لكل product ID
      for (const productId of productIds) {
        try {
          // البحث عن العملية في ps_crud
          // ملاحظة: data قد يكون JSON string أو object
          const result = await db.execute(
            `DELETE FROM ps_crud
             WHERE op = 'DELETE'
             AND [table] = 'products'
             AND (
               data LIKE ?
               OR data LIKE ?
             )`,
            [`%"id":"${productId}"%`, `%"id": "${productId}"%`]
          );

          if (result.rowsAffected && result.rowsAffected > 0) {
            totalDeleted += result.rowsAffected;
            console.log(`[CrudCleaner] ✅ Removed DELETE operation for product: ${productId}`);
          }
        } catch (e: any) {
          console.warn(`[CrudCleaner] ⚠️ Failed to remove DELETE for product ${productId}:`, e?.message);
        }
      }

      console.log(`[CrudCleaner] ✅ Successfully removed ${totalDeleted} DELETE operations`);

      return {
        success: true,
        deletedCount: totalDeleted
      };

    } catch (error: any) {
      console.error('[CrudCleaner] ❌ Failed to clear DELETE operations for products:', error?.message);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * مسح CRUD queue بالكامل (خطير!)
   * استخدم فقط إذا كنت متأكداً
   */
  static async clearEntireCrudQueue(): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    console.warn('[CrudCleaner] 🚨 CLEARING ENTIRE CRUD QUEUE - THIS IS DANGEROUS!');

    try {
      if (!powerSyncService.isReady()) {
        throw new Error('PowerSync not initialized');
      }

      const db = powerSyncService.getDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      // عد جميع العمليات أولاً
      const countResult = await db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ps_crud`
      );

      const totalCount = countResult?.count || 0;

      if (totalCount === 0) {
        console.log('[CrudCleaner] ✅ CRUD queue is already empty');
        return { success: true, deletedCount: 0 };
      }

      console.warn(`[CrudCleaner] 🚨 About to delete ${totalCount} operations from CRUD queue`);

      // حذف جميع العمليات
      await db.execute(`DELETE FROM ps_crud`);

      console.log(`[CrudCleaner] ✅ Successfully cleared entire CRUD queue (${totalCount} operations)`);

      return {
        success: true,
        deletedCount: totalCount
      };

    } catch (error: any) {
      console.error('[CrudCleaner] ❌ Failed to clear CRUD queue:', error?.message);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }
}

// تصدير instance للاستخدام المباشر
export const clearStuckCrudOperations = ClearStuckCrudOperations;
