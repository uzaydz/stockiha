/**
 * ⚡ ConflictResolution - نظام إدارة التعارضات
 * 
 * استراتيجيات حل التعارضات:
 * - Last-Write-Wins: الكتابة الأخيرة تفوز (للبيانات البسيطة)
 * - Merge: دمج القيم (للكميات مثل المخزون)
 * - Manual: يتطلب تدخل يدوي (للتعارضات المعقدة)
 */

import { powerSyncService } from './PowerSyncService';

// ========================================
// 📦 Types
// ========================================

export type ConflictStrategy = 'last-write-wins' | 'merge' | 'manual' | 'keep-local' | 'keep-remote';

export interface ConflictRecord {
  id: string;
  table_name: string;
  record_id: string;
  local_data: Record<string, any>;
  remote_data: Record<string, any>;
  conflict_type: 'update' | 'delete' | 'both_modified';
  detected_at: string;
  resolved_at?: string;
  resolution_strategy?: ConflictStrategy;
  resolved_data?: Record<string, any>;
  status: 'pending' | 'resolved' | 'ignored';
}

export interface MergeResult {
  mergedData: Record<string, any>;
  fieldsChanged: string[];
  strategy: ConflictStrategy;
}

// ========================================
// 🔧 Conflict Resolution Strategies
// ========================================

/**
 * استراتيجية Last-Write-Wins
 * الكتابة الأخيرة (بناءً على updated_at) تفوز
 */
export function lastWriteWins(
  localData: Record<string, any>,
  remoteData: Record<string, any>
): MergeResult {
  const localTime = new Date(localData.updated_at || 0).getTime();
  const remoteTime = new Date(remoteData.updated_at || 0).getTime();

  if (localTime >= remoteTime) {
    return {
      mergedData: localData,
      fieldsChanged: [],
      strategy: 'last-write-wins'
    };
  }

  return {
    mergedData: remoteData,
    fieldsChanged: Object.keys(remoteData).filter(
      k => JSON.stringify(localData[k]) !== JSON.stringify(remoteData[k])
    ),
    strategy: 'last-write-wins'
  };
}

/**
 * استراتيجية Merge للكميات
 * يدمج التغييرات في الكميات بدلاً من استبدالها
 */
export function mergeQuantities(
  localData: Record<string, any>,
  remoteData: Record<string, any>,
  originalData: Record<string, any>,
  quantityFields: string[] = ['stock_quantity', 'quantity']
): MergeResult {
  const mergedData = { ...remoteData };
  const fieldsChanged: string[] = [];

  for (const field of quantityFields) {
    if (field in localData && field in remoteData && field in originalData) {
      // حساب الفرق المحلي والبعيد
      const localDelta = (localData[field] || 0) - (originalData[field] || 0);
      const remoteDelta = (remoteData[field] || 0) - (originalData[field] || 0);

      // دمج التغييرات
      const newValue = (originalData[field] || 0) + localDelta + remoteDelta;
      mergedData[field] = Math.max(0, newValue); // لا نسمح بقيم سالبة
      
      if (mergedData[field] !== localData[field]) {
        fieldsChanged.push(field);
      }
    }
  }

  // استخدام LWW للحقول الأخرى
  const otherResult = lastWriteWins(
    { ...localData, updated_at: localData.updated_at },
    { ...remoteData, updated_at: remoteData.updated_at }
  );

  // دمج النتائج
  for (const key of Object.keys(localData)) {
    if (!quantityFields.includes(key) && key !== 'updated_at') {
      if (otherResult.mergedData[key] !== undefined) {
        mergedData[key] = otherResult.mergedData[key];
      }
    }
  }

  return {
    mergedData,
    fieldsChanged: [...new Set([...fieldsChanged, ...otherResult.fieldsChanged])],
    strategy: 'merge'
  };
}

// ========================================
// 🔧 ConflictResolutionService Class
// ========================================

class ConflictResolutionServiceClass {
  private conflictQueue: ConflictRecord[] = [];

  /**
   * اكتشاف التعارض
   */
  async detectConflict(
    tableName: string,
    recordId: string,
    localData: Record<string, any>,
    remoteData: Record<string, any>
  ): Promise<ConflictRecord | null> {
    // إذا كانت البيانات متطابقة، لا يوجد تعارض
    if (JSON.stringify(localData) === JSON.stringify(remoteData)) {
      return null;
    }

    // التحقق من وجود updated_at للمقارنة
    const localUpdated = localData.updated_at;
    const remoteUpdated = remoteData.updated_at;

    // تحديد نوع التعارض
    let conflictType: ConflictRecord['conflict_type'] = 'update';
    if (localData._deleted && remoteData._deleted) {
      return null; // كلاهما محذوف، لا تعارض
    } else if (localData._deleted || remoteData._deleted) {
      conflictType = 'delete';
    } else if (localUpdated !== remoteUpdated) {
      conflictType = 'both_modified';
    }

    const conflict: ConflictRecord = {
      id: `conflict-${tableName}-${recordId}-${Date.now()}`,
      table_name: tableName,
      record_id: recordId,
      local_data: localData,
      remote_data: remoteData,
      conflict_type: conflictType,
      detected_at: new Date().toISOString(),
      status: 'pending'
    };

    this.conflictQueue.push(conflict);
    console.log(`[ConflictResolution] 🔀 Detected conflict in ${tableName}:${recordId}`);

    return conflict;
  }

  /**
   * حل التعارض تلقائياً
   */
  async resolveAutomatically(
    conflict: ConflictRecord,
    strategy: ConflictStrategy = 'last-write-wins'
  ): Promise<MergeResult> {
    let result: MergeResult;

    switch (strategy) {
      case 'last-write-wins':
        result = lastWriteWins(conflict.local_data, conflict.remote_data);
        break;

      case 'merge':
        // جلب البيانات الأصلية إذا كانت متاحة
        const originalData = await this.getOriginalData(conflict.table_name, conflict.record_id);
        result = mergeQuantities(
          conflict.local_data,
          conflict.remote_data,
          originalData || conflict.remote_data
        );
        break;

      case 'keep-local':
        result = {
          mergedData: conflict.local_data,
          fieldsChanged: [],
          strategy: 'keep-local'
        };
        break;

      case 'keep-remote':
        result = {
          mergedData: conflict.remote_data,
          fieldsChanged: Object.keys(conflict.remote_data),
          strategy: 'keep-remote'
        };
        break;

      default:
        result = lastWriteWins(conflict.local_data, conflict.remote_data);
    }

    // تحديث سجل التعارض
    conflict.resolved_at = new Date().toISOString();
    conflict.resolution_strategy = strategy;
    conflict.resolved_data = result.mergedData;
    conflict.status = 'resolved';

    // إزالة من قائمة الانتظار
    this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflict.id);

    console.log(`[ConflictResolution] ✅ Resolved conflict: ${conflict.id} with strategy: ${strategy}`);

    return result;
  }

  /**
   * جلب البيانات الأصلية من سجل التغييرات
   */
  private async getOriginalData(
    tableName: string,
    recordId: string
  ): Promise<Record<string, any> | null> {
    try {
      // ⚡ استخدام queryOne بدلاً من get المنتهية
      const result = await powerSyncService.queryOne<{ original_data: string }>({
        sql: `SELECT original_data FROM local_change_log
              WHERE table_name = ? AND record_id = ?
              ORDER BY created_at ASC LIMIT 1`,
        params: [tableName, recordId]
      });

      if (result?.original_data) {
        return JSON.parse(result.original_data);
      }
    } catch (error) {
      console.warn('[ConflictResolution] Could not fetch original data:', error);
    }

    return null;
  }

  /**
   * جلب التعارضات المعلقة
   */
  getPendingConflicts(): ConflictRecord[] {
    return this.conflictQueue.filter(c => c.status === 'pending');
  }

  /**
   * حل تعارض يدوياً
   */
  async resolveManually(
    conflictId: string,
    resolvedData: Record<string, any>
  ): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    conflict.resolved_at = new Date().toISOString();
    conflict.resolution_strategy = 'manual';
    conflict.resolved_data = resolvedData;
    conflict.status = 'resolved';

    // تطبيق الحل على قاعدة البيانات
    await this.applyResolution(conflict);

    // إزالة من قائمة الانتظار
    this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId);

    console.log(`[ConflictResolution] ✅ Manually resolved conflict: ${conflictId}`);
  }

  /**
   * تطبيق الحل على قاعدة البيانات
   */
  private async applyResolution(conflict: ConflictRecord): Promise<void> {
    if (!conflict.resolved_data) return;

    try {
      if (!powerSyncService.db) {
        throw new Error('PowerSync DB not initialized');
      }
      await powerSyncService.transaction(async (tx) => {
        const data = conflict.resolved_data!;
        const columns = Object.keys(data).filter(k => k !== 'id');
        const setClause = columns.map(k => `${k} = ?`).join(', ');
        const values = columns.map(k => data[k]);

        await tx.execute(
          `UPDATE ${conflict.table_name} SET ${setClause} WHERE id = ?`,
          [...values, conflict.record_id]
        );
      });
    } catch (error) {
      console.error('[ConflictResolution] Failed to apply resolution:', error);
      throw error;
    }
  }

  /**
   * تجاهل التعارض
   */
  ignoreConflict(conflictId: string): void {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (conflict) {
      conflict.status = 'ignored';
      this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId);
      console.log(`[ConflictResolution] 🔇 Ignored conflict: ${conflictId}`);
    }
  }

  /**
   * الحصول على إحصائيات التعارضات
   */
  getStats(): {
    pending: number;
    resolved: number;
    ignored: number;
    byTable: Record<string, number>;
  } {
    const pending = this.conflictQueue.filter(c => c.status === 'pending').length;
    const resolved = this.conflictQueue.filter(c => c.status === 'resolved').length;
    const ignored = this.conflictQueue.filter(c => c.status === 'ignored').length;

    const byTable: Record<string, number> = {};
    for (const conflict of this.conflictQueue) {
      byTable[conflict.table_name] = (byTable[conflict.table_name] || 0) + 1;
    }

    return { pending, resolved, ignored, byTable };
  }

  /**
   * مسح جميع التعارضات
   */
  clearAll(): void {
    this.conflictQueue = [];
    console.log('[ConflictResolution] 🧹 Cleared all conflicts');
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const conflictResolutionService = new ConflictResolutionServiceClass();
export default conflictResolutionService;

