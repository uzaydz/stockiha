/**
 * ConflictResolver - Intelligent Conflict Detection & Resolution
 * اكتشاف وحل النزاعات بين العمليات المحلية والخادم
 *
 * ⚡ المرحلة الثانية: إضافة مقارنة Timestamps لحل النزاعات بشكل عادل
 *
 * أنواع النزاعات:
 * 1. local_pending_server_update: تعديل محلي معلق + تعديل من الخادم
 * 2. local_pending_server_delete: تعديل محلي معلق + حذف من الخادم
 * 3. local_delete_server_update: حذف محلي + تعديل من الخادم
 * 4. concurrent_delta: عمليتا DELTA على نفس السجل
 *
 * استراتيجية حل النزاعات:
 * - عند تعارض حقيقي: الأحدث يكسب (newest_wins)
 * - tolerance للوقت: ±5 ثواني لتجنب مشاكل sync الساعات
 */

import { sqliteWriteQueue } from './SQLiteWriteQueue';
import { mergeStrategy } from './MergeStrategy';
import {
  ServerOperation,
  OutboxEntry,
  ConflictType,
  ConflictInfo,
  ConflictResult,
  ConflictResolution
} from './types';

// ⚡ Tolerance للوقت بالمللي ثانية (5 ثواني)
const TIMESTAMP_TOLERANCE_MS = 5000;

export class ConflictResolver {
  /**
   * اكتشاف التعارض قبل تطبيق العملية
   */
  async detectConflict(serverOp: ServerOperation): Promise<ConflictInfo | null> {
    // البحث عن عمليات محلية معلقة لنفس السجل
    const pendingLocal = await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE record_id = ? AND table_name = ? AND status IN ('pending', 'sending')
       ORDER BY local_seq ASC`,
      [serverOp.record_id, serverOp.table_name]
    );

    if (pendingLocal.length === 0) {
      return null; // لا تعارض
    }

    const localOp = pendingLocal[0];

    // تحديد نوع التعارض
    let type: ConflictType;

    if (serverOp.operation === 'DELETE') {
      type = 'local_pending_server_delete';
    } else if (localOp.operation === 'DELETE') {
      type = 'local_delete_server_update';
    } else if (localOp.operation === 'DELTA' && serverOp.operation === 'DELTA') {
      type = 'concurrent_delta';
    } else {
      type = 'local_pending_server_update';
    }

    console.log(`[ConflictResolver] Detected conflict: ${type} for ${serverOp.table_name}/${serverOp.record_id}`);

    return {
      type,
      tableName: serverOp.table_name,
      recordId: serverOp.record_id,
      localOperation: localOp,
      serverOperation: serverOp
    };
  }

  /**
   * حل التعارض
   */
  async resolve(conflict: ConflictInfo): Promise<ConflictResult> {
    console.log(`[ConflictResolver] Resolving conflict: ${conflict.type}`);

    switch (conflict.type) {

      case 'local_pending_server_delete':
        // الخادم حذف السجل - نتجاهل التعديل المحلي
        // القرار: الحذف يكسب دائماً
        return {
          resolution: 'server_wins',
          discardLocal: true,
          applyServer: true
        };

      case 'local_delete_server_update':
        // حذفنا محلياً لكن الخادم عدّل
        // القرار: نُعيد السجل (الخادم يكسب) لأن شخص آخر عدّله
        return {
          resolution: 'server_wins',
          discardLocal: true,
          applyServer: true
        };

      case 'concurrent_delta':
        // عمليتا DELTA - يمكن دمجهما لأن DELTA additive
        return await this.resolveConcurrentDelta(conflict);

      case 'local_pending_server_update':
        // تعديلان عاديان - دمج حسب الحقول
        return await this.resolveUpdates(conflict);

      default:
        // الافتراضي: الخادم يكسب
        return {
          resolution: 'server_wins',
          discardLocal: true,
          applyServer: true
        };
    }
  }

  /**
   * حل نزاع DELTA المتزامن
   * DELTA operations are additive - نطبق كليهما
   */
  private async resolveConcurrentDelta(conflict: ConflictInfo): Promise<ConflictResult> {
    // تحليل الـ payloads
    const localPayload = this.parsePayload(conflict.localOperation!.payload);
    const serverPayload = conflict.serverOperation.payload;

    console.log('[ConflictResolver] Concurrent DELTA:', {
      local: localPayload,
      server: serverPayload
    });

    // DELTA operations are additive
    // Local delta سيُرسل للخادم لاحقاً
    // Server delta يُطبَّق محلياً الآن
    // النتيجة: كلاهما يُطبَّق

    return {
      resolution: 'merge',
      discardLocal: false, // أبقِ العملية المحلية للإرسال
      applyServer: true    // طبِّق عملية الخادم
    };
  }

  /**
   * حل نزاع UPDATE vs UPDATE
   * ⚡ محسّن: يستخدم Timestamps لتحديد الأحدث
   */
  private async resolveUpdates(conflict: ConflictInfo): Promise<ConflictResult> {
    const localPayload = this.parsePayload(conflict.localOperation!.payload);
    const serverPayload = conflict.serverOperation.payload;

    // جلب السجل الحالي
    const currentRecords = await sqliteWriteQueue.read<any[]>(
      `SELECT * FROM ${conflict.tableName} WHERE id = ?`,
      [conflict.recordId]
    );

    const current = currentRecords[0];

    if (!current) {
      // السجل غير موجود محلياً - طبق عملية الخادم
      return {
        resolution: 'server_wins',
        discardLocal: true,
        applyServer: true
      };
    }

    // تحليل الحقول المُعدَّلة
    const localChangedFields = Object.keys(localPayload);
    const serverChangedFields = Object.keys(serverPayload);

    // البحث عن تعارضات حقيقية (نفس الحقل مُعدَّل في كلا الجهتين)
    const conflictingFields = localChangedFields.filter(f => serverChangedFields.includes(f));

    if (conflictingFields.length === 0) {
      // لا تعارض حقيقي - دمج الحقول
      const merged = { ...current };

      // تطبيق تغييرات الخادم
      for (const [key, value] of Object.entries(serverPayload)) {
        merged[key] = value;
      }

      // الحفاظ على التغييرات المحلية (ستُرسل للخادم)
      // لا نطبقها الآن لأنها ستُرسل

      return {
        resolution: 'merge',
        mergedData: merged,
        discardLocal: false, // أبقِ للإرسال
        applyServer: false   // سنطبق البيانات المدمجة
      };
    }

    // ⚡ هناك تعارض حقيقي - استخدام Timestamps لتحديد الفائز
    const localTimestamp = this.getTimestamp(localPayload) || this.getTimestamp(current);
    const serverTimestamp = this.getTimestamp(serverPayload) || this.getTimestamp(conflict.serverOperation);

    console.log(`[ConflictResolver] ⚡ Timestamp comparison:`, {
      table: conflict.tableName,
      recordId: conflict.recordId.slice(0, 8),
      localTime: localTimestamp ? new Date(localTimestamp).toISOString() : 'unknown',
      serverTime: serverTimestamp ? new Date(serverTimestamp).toISOString() : 'unknown',
      conflictingFields
    });

    // استخدام استراتيجية الجدول
    const tableConfig = mergeStrategy.getTableConfig(conflict.tableName);

    // ⚡ إذا الوضع local_wins - الحفاظ على المحلي
    if (tableConfig.mode === 'local_wins') {
      console.log(`[ConflictResolver] ⚡ Using local_wins strategy for ${conflict.tableName}`);
      return {
        resolution: 'local_wins',
        discardLocal: false,
        applyServer: false
      };
    }

    // ⚡ إذا الوضع newest_wins أو الافتراضي - مقارنة الأوقات
    const timeDiff = (serverTimestamp || 0) - (localTimestamp || 0);
    const isServerNewer = timeDiff > TIMESTAMP_TOLERANCE_MS;
    const isLocalNewer = timeDiff < -TIMESTAMP_TOLERANCE_MS;

    if (isLocalNewer && tableConfig.mode !== 'server_wins') {
      // ⚡ المحلي أحدث بوضوح - نحافظ على التغييرات المحلية
      console.log(`%c[ConflictResolver] ⚡ Local is newer by ${Math.abs(timeDiff)}ms - keeping local changes`, 'color: #4CAF50');
      return {
        resolution: 'local_wins',
        discardLocal: false,
        applyServer: false
      };
    }

    // ⚡ الخادم أحدث أو متساوي - الخادم يكسب في الحقول المتعارضة
    console.log(`%c[ConflictResolver] ⚡ Server wins - timeDiff: ${timeDiff}ms`, 'color: #FF9800');
    
    const merged = { ...current };

    // تطبيق كل تغييرات الخادم
    for (const [key, value] of Object.entries(serverPayload)) {
      merged[key] = value;
    }

    // الحفاظ على التغييرات المحلية غير المتعارضة
    for (const field of localChangedFields) {
      if (!conflictingFields.includes(field)) {
        // هذا الحقل عُدِّل محلياً فقط - نحافظ على التعديل للإرسال
        // لا نطبقه الآن
      }
    }

    // تعديل العملية المحلية لإزالة الحقول المتعارضة
    // (سيُرسل فقط الحقول غير المتعارضة)
    await this.updateLocalOperation(conflict.localOperation!, conflictingFields);

    return {
      resolution: 'merge',
      mergedData: merged,
      discardLocal: localChangedFields.length === conflictingFields.length, // إذا كل الحقول متعارضة، احذف
      applyServer: false // سنطبق المدمج
    };
  }

  /**
   * ⚡ استخراج timestamp من السجل أو العملية
   */
  private getTimestamp(record: Record<string, any>): number | null {
    const candidates = [
      record.updated_at,
      record.last_modified,
      record.modified_at,
      record.created_at,
      record.timestamp,
      record.server_timestamp
    ];

    for (const candidate of candidates) {
      if (candidate) {
        const time = new Date(candidate).getTime();
        if (!isNaN(time)) return time;
      }
    }

    return null;
  }

  /**
   * تحديث العملية المحلية لإزالة حقول معينة
   */
  private async updateLocalOperation(
    localOp: OutboxEntry,
    fieldsToRemove: string[]
  ): Promise<void> {
    if (fieldsToRemove.length === 0) return;

    const payload = this.parsePayload(localOp.payload);

    // إزالة الحقول المتعارضة
    for (const field of fieldsToRemove) {
      delete payload[field];
    }

    // إذا لم يبقَ شيء، احذف العملية
    const remainingFields = Object.keys(payload).filter(k => k !== 'id');

    if (remainingFields.length === 0) {
      await this.discardLocalOperation(localOp.id);
    } else {
      // تحديث الـ payload
      await sqliteWriteQueue.write(
        `UPDATE sync_outbox SET payload = ? WHERE id = ?`,
        [JSON.stringify(payload), localOp.id]
      );
    }
  }

  /**
   * إزالة العملية المحلية من الـ Outbox
   */
  async discardLocalOperation(outboxId: string): Promise<void> {
    await sqliteWriteQueue.write(
      `DELETE FROM sync_outbox WHERE id = ?`,
      [outboxId]
    );
    console.log(`[ConflictResolver] Discarded local operation: ${outboxId}`);
  }

  /**
   * إزالة جميع العمليات المحلية لسجل معين
   */
  async discardLocalOperationsForRecord(
    tableName: string,
    recordId: string
  ): Promise<number> {
    const result = await sqliteWriteQueue.write<any>(
      `DELETE FROM sync_outbox WHERE table_name = ? AND record_id = ?`,
      [tableName, recordId]
    );

    const count = result?.changes || 0;
    if (count > 0) {
      console.log(`[ConflictResolver] Discarded ${count} local operations for ${tableName}/${recordId}`);
    }

    return count;
  }

  /**
   * التحقق من وجود عمليات محلية معلقة لسجل
   */
  async hasPendingLocalOperations(
    tableName: string,
    recordId: string
  ): Promise<boolean> {
    const result = await sqliteWriteQueue.read<any[]>(
      `SELECT 1 FROM sync_outbox
       WHERE table_name = ? AND record_id = ? AND status IN ('pending', 'sending')
       LIMIT 1`,
      [tableName, recordId]
    );

    return result.length > 0;
  }

  /**
   * الحصول على جميع العمليات المحلية المعلقة لسجل
   */
  async getPendingLocalOperations(
    tableName: string,
    recordId: string
  ): Promise<OutboxEntry[]> {
    return await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE table_name = ? AND record_id = ? AND status IN ('pending', 'sending')
       ORDER BY local_seq ASC`,
      [tableName, recordId]
    );
  }

  /**
   * Parse payload من JSON string
   */
  private parsePayload(payload: string | Record<string, any>): Record<string, any> {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return {};
      }
    }
    return payload || {};
  }

  /**
   * تشخيص: الحصول على ملخص النزاعات الحالية
   */
  async getConflictSummary(): Promise<{
    pendingCount: number;
    byTable: Record<string, number>;
    byOperation: Record<string, number>;
  }> {
    const pending = await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT table_name, operation FROM sync_outbox WHERE status IN ('pending', 'sending')`
    );

    const byTable: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    for (const op of pending) {
      byTable[op.table_name] = (byTable[op.table_name] || 0) + 1;
      byOperation[op.operation] = (byOperation[op.operation] || 0) + 1;
    }

    return {
      pendingCount: pending.length,
      byTable,
      byOperation
    };
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();
