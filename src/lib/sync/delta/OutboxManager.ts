/**
 * OutboxManager - Local Operation Queue Management
 * إدارة قائمة العمليات المحلية المعلقة للإرسال
 *
 * نمط Outbox:
 * 1. العملية تُكتب محلياً فوراً
 * 2. تُضاف للـ Outbox
 * 3. يُرسلها BatchSender للخادم
 * 4. عند النجاح تُزال من الـ Outbox
 */

import { sqliteWriteQueue } from './SQLiteWriteQueue';
import { syncMetrics } from './SyncMetrics';
import {
  OutboxEntry,
  OperationType,
  SyncStatus,
  ErrorType,
  ErrorClassification,
  DELTA_SYNC_CONSTANTS
} from './types';

interface AddOperationParams {
  tableName: string;
  operation: OperationType;
  recordId: string;
  payload: Record<string, any>;
}

export class OutboxManager {
  private localSeqCounter: number = 0;
  private isInitialized = false;

  /**
   * تهيئة الـ Manager وجلب آخر local_seq
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // جلب أعلى local_seq موجود
      const result = await sqliteWriteQueue.read<any[]>(
        `SELECT MAX(local_seq) as max_seq FROM sync_outbox`
      );

      this.localSeqCounter = (result[0]?.max_seq || 0) + 1;
      this.isInitialized = true;

      console.log(`[OutboxManager] Initialized with local_seq starting at ${this.localSeqCounter}`);
    } catch (error) {
      console.error('[OutboxManager] Initialization failed:', error);
      this.localSeqCounter = Date.now(); // Fallback
      this.isInitialized = true;
    }
  }

  /**
   * إضافة عملية جديدة للـ Outbox
   */
  async add(params: AddOperationParams): Promise<string> {
    await this.initialize();

    const id = crypto.randomUUID();
    const localSeq = this.localSeqCounter++;

    const entry: OutboxEntry = {
      id,
      table_name: params.tableName,
      operation: params.operation,
      record_id: params.recordId,
      payload: JSON.stringify(params.payload),
      local_seq: localSeq,
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
      status: 'pending'
    };

    await sqliteWriteQueue.write(
      `INSERT INTO sync_outbox (id, table_name, operation, record_id, payload, local_seq, created_at, retry_count, last_error, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.table_name,
        entry.operation,
        entry.record_id,
        entry.payload,
        entry.local_seq,
        entry.created_at,
        entry.retry_count,
        entry.last_error,
        entry.status
      ]
    );

    console.log(`[OutboxManager] Added operation: ${params.operation} ${params.tableName}/${params.recordId} (seq=${localSeq})`);

    return id;
  }

  /**
   * إضافة عملية DELTA للمخزون
   */
  async addDelta(
    tableName: string,
    recordId: string,
    delta: Record<string, number>
  ): Promise<string> {
    return this.add({
      tableName,
      operation: 'DELTA',
      recordId,
      payload: delta
    });
  }

  /**
   * ⚡ جلب العمليات المعلقة للإرسال (مع دعم Exponential Backoff)
   * يجلب العمليات pending + الفاشلة التي حان وقت إعادة محاولتها
   */
  async getPending(limit: number = DELTA_SYNC_CONSTANTS.BATCH_SIZE): Promise<OutboxEntry[]> {
    const now = new Date().toISOString();
    
    return await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE status = 'pending'
          OR (status = 'failed' AND retry_count < ? AND (next_retry_at IS NULL OR next_retry_at <= ?))
       ORDER BY local_seq ASC
       LIMIT ?`,
      [DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT, now, limit]
    );
  }

  /**
   * جلب العمليات الفاشلة التي يمكن إعادة محاولتها
   */
  async getRetryable(): Promise<OutboxEntry[]> {
    return await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE status = 'failed' AND retry_count < ?
       ORDER BY local_seq ASC`,
      [DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT]
    );
  }

  /**
   * تحديث حالة العملية إلى "قيد الإرسال"
   */
  async markSending(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    await sqliteWriteQueue.write(
      `UPDATE sync_outbox SET status = 'sending' WHERE id IN (${placeholders})`,
      ids
    );
  }

  /**
   * تحديث حالة العملية إلى "مُرسلة" وحذفها
   */
  async markSent(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');

    // حذف العمليات الناجحة
    await sqliteWriteQueue.write(
      `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`[OutboxManager] Removed ${ids.length} sent operations`);
  }

  /**
   * ⚡ تصنيف الخطأ لتحديد استراتيجية الـ Retry
   * PERMANENT: لا تحاول مرة أخرى
   * TRANSIENT: حاول مع backoff عادي
   * SERVER_ERROR: حاول بعد فترة طويلة
   * RATE_LIMIT: حاول بعد 30 ثانية
   */
  classifyError(errorMessage: string, statusCode?: number): ErrorClassification {
    const error = (errorMessage || '').toLowerCase();
    const code = statusCode || 0;

    // ═══════════════════════════════════════════════════
    // 1. PERMANENT ERRORS - لا فائدة من المحاولة مرة أخرى
    // ═══════════════════════════════════════════════════
    const permanentPatterns = [
      // Validation errors
      'violates not-null constraint',
      'violates unique constraint',
      'violates foreign key constraint',
      'violates check constraint',
      'duplicate key',
      'invalid input syntax',
      'value too long',
      'out of range',
      // Auth errors
      'jwt expired',
      'invalid jwt',
      'not authenticated',
      'permission denied',
      'access denied',
      'unauthorized',
      // Schema errors
      'column .* does not exist',
      'relation .* does not exist',
      'table .* does not exist',
      'unknown column',
      // Data errors
      'invalid uuid',
      'malformed',
      'cannot parse',
      '22p02', // invalid_text_representation
      '23502', // not_null_violation
      '23503', // foreign_key_violation
      '23505', // unique_violation
      '42703', // undefined_column
      '42p01', // undefined_table
    ];

    for (const pattern of permanentPatterns) {
      if (error.match(new RegExp(pattern, 'i')) || (code >= 400 && code < 500 && code !== 429)) {
        return {
          type: 'PERMANENT',
          shouldRetry: false,
          reason: `Permanent error: ${errorMessage.slice(0, 100)}`
        };
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. RATE LIMIT (429)
    // ═══════════════════════════════════════════════════
    if (code === 429 || error.includes('rate limit') || error.includes('too many requests')) {
      return {
        type: 'RATE_LIMIT',
        shouldRetry: true,
        retryDelay: DELTA_SYNC_CONSTANTS.RATE_LIMIT_RETRY_DELAY_MS,
        reason: 'Rate limited, will retry in 30s'
      };
    }

    // ═══════════════════════════════════════════════════
    // 3. SERVER ERRORS (5xx)
    // ═══════════════════════════════════════════════════
    if (code >= 500 || error.includes('internal server error') || error.includes('service unavailable')) {
      return {
        type: 'SERVER_ERROR',
        shouldRetry: true,
        retryDelay: DELTA_SYNC_CONSTANTS.SERVER_ERROR_RETRY_DELAY_MS,
        reason: 'Server error, will retry in 1 minute'
      };
    }

    // ═══════════════════════════════════════════════════
    // 4. TRANSIENT ERRORS - Network/Timeout
    // ═══════════════════════════════════════════════════
    const transientPatterns = [
      'network',
      'timeout',
      'econnreset',
      'econnrefused',
      'socket hang up',
      'fetch failed',
      'failed to fetch',
      'load failed',           // ⚡ Safari/WebKit offline error
      'the internet connection appears to be offline',
      'offline',
      'connection refused',
      'connection reset',
      'aborted'
    ];

    for (const pattern of transientPatterns) {
      if (error.includes(pattern)) {
        return {
          type: 'TRANSIENT',
          shouldRetry: true,
          reason: 'Transient network error'
        };
      }
    }

    // ═══════════════════════════════════════════════════
    // 5. UNKNOWN - Default to transient (safer)
    // ═══════════════════════════════════════════════════
    return {
      type: 'UNKNOWN',
      shouldRetry: true,
      reason: 'Unknown error, will retry with backoff'
    };
  }

  /**
   * ⚡ تحديث حالة العملية إلى "فاشلة" مع Smart Retry
   */
  async markFailed(id: string, error: string, statusCode?: number): Promise<void> {
    // ⚡ تصنيف الخطأ أولاً
    const classification = this.classifyError(error, statusCode);

    // ⚡ إذا كان خطأ دائم - نحذفه فوراً بدون retry
    if (!classification.shouldRetry) {
      const fullEntry = await sqliteWriteQueue.read<OutboxEntry[]>(
        `SELECT * FROM sync_outbox WHERE id = ?`,
        [id]
      );
      
      console.warn(`%c[OutboxManager] 🚫 ═══ خطأ دائم (PERMANENT) - حذف فوري ═══`, 'color: #9C27B0; font-weight: bold');
      console.warn(`[OutboxManager] 🚫 Error Type: ${classification.type}`);
      console.warn(`[OutboxManager] 🚫 Reason: ${classification.reason}`);
      if (fullEntry[0]) {
        console.warn(`[OutboxManager] 🚫 Table: ${fullEntry[0].table_name}`);
        console.warn(`[OutboxManager] 🚫 Operation: ${fullEntry[0].operation}`);
        console.warn(`[OutboxManager] 🚫 Record ID: ${fullEntry[0].record_id}`);
        
        // ⚡ حفظ في localStorage للتشخيص
        try {
          const discarded = JSON.parse(localStorage.getItem('discarded_operations') || '[]');
          discarded.push({
            id,
            table_name: fullEntry[0].table_name,
            operation: fullEntry[0].operation,
            record_id: fullEntry[0].record_id,
            error,
            error_type: classification.type,
            reason: classification.reason,
            discarded_at: new Date().toISOString()
          });
          if (discarded.length > 50) discarded.shift();
          localStorage.setItem('discarded_operations', JSON.stringify(discarded));
        } catch { }
      }
      
      await sqliteWriteQueue.write(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
      
      // ⚡ تسجيل في الإحصائيات
      syncMetrics.recordOperationsFailed(1, classification.type);
      syncMetrics.recordOperationsDiscarded(1);
      return;
    }

    // جلب retry_count الحالي
    const entries = await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT retry_count FROM sync_outbox WHERE id = ?`,
      [id]
    );

    const currentRetry = entries[0]?.retry_count || 0;
    const newRetry = currentRetry + 1;

    if (newRetry >= DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT) {
      // تجاوز الحد الأقصى - نحذفها ونسجل خطأ
      const fullEntry = await sqliteWriteQueue.read<OutboxEntry[]>(
        `SELECT * FROM sync_outbox WHERE id = ?`,
        [id]
      );
      
      console.error(`%c[OutboxManager] ❌ ═══ عملية مفقودة (MAX RETRIES) ═══`, 'color: #f44336; font-weight: bold');
      console.error(`[OutboxManager] ❌ Operation ID: ${id}`);
      console.error(`[OutboxManager] ❌ Error Type: ${classification.type}`);
      if (fullEntry[0]) {
        console.error(`[OutboxManager] ❌ Table: ${fullEntry[0].table_name}`);
        console.error(`[OutboxManager] ❌ Operation: ${fullEntry[0].operation}`);
        console.error(`[OutboxManager] ❌ Record ID: ${fullEntry[0].record_id}`);
        console.error(`[OutboxManager] ❌ Retry Count: ${newRetry}`);
        console.error(`[OutboxManager] ❌ Last Error: ${error}`);
        console.error(`[OutboxManager] ❌ Created At: ${fullEntry[0].created_at}`);
        // ⚡ حفظ في localStorage للتشخيص
        try {
          const discarded = JSON.parse(localStorage.getItem('discarded_operations') || '[]');
          discarded.push({
            id,
            table_name: fullEntry[0].table_name,
            operation: fullEntry[0].operation,
            record_id: fullEntry[0].record_id,
            error,
            error_type: classification.type,
            discarded_at: new Date().toISOString()
          });
          if (discarded.length > 50) discarded.shift();
          localStorage.setItem('discarded_operations', JSON.stringify(discarded));
        } catch { }
      }
      
      await sqliteWriteQueue.write(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
      
      // ⚡ تسجيل في الإحصائيات
      syncMetrics.recordOperationsFailed(1, classification.type);
      syncMetrics.recordOperationsDiscarded(1);
    } else {
      // ⚡ حساب تأخير حسب نوع الخطأ
      let delay: number;
      
      if (classification.retryDelay) {
        // استخدام التأخير المحدد من التصنيف
        delay = classification.retryDelay;
      } else {
        // Exponential Backoff العادي
        delay = this.calculateBackoffDelay(newRetry);
      }
      
      const nextRetryAt = new Date(Date.now() + delay).toISOString();

      await sqliteWriteQueue.write(
        `UPDATE sync_outbox
         SET status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
         WHERE id = ?`,
        [newRetry, error, nextRetryAt, id]
      );

      const delayStr = delay >= 60000 ? `${Math.round(delay / 60000)}m` : `${Math.round(delay / 1000)}s`;
      console.log(`%c[OutboxManager] 🔄 [${classification.type}] Retry ${newRetry}/${DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT} in ${delayStr} for ${id.slice(0, 8)}`, 
        classification.type === 'SERVER_ERROR' ? 'color: #FF5722' : 
        classification.type === 'RATE_LIMIT' ? 'color: #FF9800' : 'color: #2196F3');
      
      // ⚡ تسجيل الخطأ في الإحصائيات (ليس discarded)
      syncMetrics.recordOperationsFailed(1, classification.type);
    }
  }

  /**
   * ⚡ حساب تأخير Exponential Backoff مع Jitter
   * Retry 1: ~2s, Retry 2: ~4s, Retry 3: ~8s, Retry 4: ~16s, Retry 5: ~32s
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = DELTA_SYNC_CONSTANTS.INITIAL_RETRY_DELAY_MS; // 1000ms
    const maxDelay = DELTA_SYNC_CONSTANTS.MAX_RETRY_DELAY_MS;      // 60000ms

    // Exponential: 2^retry * base
    const exponentialDelay = Math.pow(2, retryCount) * baseDelay;

    // Jitter: ±30% لتجنب thundering herd
    const jitter = exponentialDelay * 0.3 * (Math.random() - 0.5);

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * إعادة العمليات الفاشلة للحالة المعلقة
   */
  async requeueFailed(): Promise<number> {
    const result = await sqliteWriteQueue.write<any>(
      `UPDATE sync_outbox
       SET status = 'pending'
       WHERE status = 'failed' AND retry_count < ?`,
      [DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT]
    );

    const count = result?.changes || 0;
    if (count > 0) {
      console.log(`[OutboxManager] Requeued ${count} failed operations`);
    }

    return count;
  }

  /**
   * إعادة العمليات "قيد الإرسال" للحالة المعلقة
   * (مفيد بعد crash أو إعادة تشغيل)
   */
  async requeueStuck(): Promise<number> {
    const result = await sqliteWriteQueue.write<any>(
      `UPDATE sync_outbox
       SET status = 'pending'
       WHERE status = 'sending'`
    );

    const count = result?.changes || 0;
    if (count > 0) {
      console.log(`[OutboxManager] Requeued ${count} stuck operations`);
    }

    return count;
  }

  /**
   * حذف عملية محددة
   */
  async remove(id: string): Promise<void> {
    await sqliteWriteQueue.write(
      `DELETE FROM sync_outbox WHERE id = ?`,
      [id]
    );
  }

  /**
   * حذف جميع العمليات لسجل معين
   */
  async removeForRecord(tableName: string, recordId: string): Promise<number> {
    const result = await sqliteWriteQueue.write<any>(
      `DELETE FROM sync_outbox WHERE table_name = ? AND record_id = ?`,
      [tableName, recordId]
    );

    return result?.changes || 0;
  }

  /**
   * مسح جميع العمليات (للتنظيف أو إعادة التهيئة)
   */
  async clear(): Promise<void> {
    await sqliteWriteQueue.write(`DELETE FROM sync_outbox`);
    console.log('[OutboxManager] Cleared all operations');
  }

  /**
   * جلب جميع العمليات المعلقة (بدون limit)
   * ⚡ يُستخدم لتصفية العمليات اليتيمة
   */
  async getPendingOperations(): Promise<OutboxEntry[]> {
    return await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE status IN ('pending', 'sending', 'failed')
       ORDER BY local_seq ASC`
    );
  }

  /**
   * الحصول على عدد العمليات المعلقة
   */
  async getPendingCount(): Promise<number> {
    const result = await sqliteWriteQueue.read<any[]>(
      `SELECT COUNT(*) as count FROM sync_outbox WHERE status IN ('pending', 'sending')`
    );

    return result[0]?.count || 0;
  }

  /**
   * الحصول على إحصائيات الـ Outbox
   */
  async getStats(): Promise<{
    pending: number;
    sending: number;
    failed: number;
    total: number;
    byTable: Record<string, number>;
    byOperation: Record<string, number>;
  }> {
    const [statusCounts, tableCounts, opCounts] = await Promise.all([
      sqliteWriteQueue.read<any[]>(
        `SELECT status, COUNT(*) as count FROM sync_outbox GROUP BY status`
      ),
      sqliteWriteQueue.read<any[]>(
        `SELECT table_name, COUNT(*) as count FROM sync_outbox GROUP BY table_name`
      ),
      sqliteWriteQueue.read<any[]>(
        `SELECT operation, COUNT(*) as count FROM sync_outbox GROUP BY operation`
      )
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = row.count;
    }

    const byTable: Record<string, number> = {};
    for (const row of tableCounts) {
      byTable[row.table_name] = row.count;
    }

    const byOperation: Record<string, number> = {};
    for (const row of opCounts) {
      byOperation[row.operation] = row.count;
    }

    return {
      pending: byStatus['pending'] || 0,
      sending: byStatus['sending'] || 0,
      failed: byStatus['failed'] || 0,
      total: (byStatus['pending'] || 0) + (byStatus['sending'] || 0) + (byStatus['failed'] || 0),
      byTable,
      byOperation
    };
  }

  /**
   * 🔍 جلب تفاصيل العمليات المعلقة مع الأخطاء
   */
  async getDetailedPending(limit: number = 20): Promise<Array<{
    id: string;
    table_name: string;
    operation: string;
    record_id: string;
    status: string;
    retry_count: number;
    last_error: string | null;
    created_at: string;
  }>> {
    return await sqliteWriteQueue.read<any[]>(
      `SELECT id, table_name, operation, record_id, status, retry_count, last_error, created_at
       FROM sync_outbox
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * تجميع عمليات DELTA المتعددة لنفس السجل
   * يقلل عدد الرحلات للخادم
   */
  async consolidateDeltas(): Promise<number> {
    // جلب جميع عمليات DELTA المعلقة
    const deltas = await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox
       WHERE operation = 'DELTA' AND status = 'pending'
       ORDER BY table_name, record_id, local_seq ASC`
    );

    if (deltas.length < 2) return 0;

    // تجميع حسب table_name + record_id
    const groups = new Map<string, OutboxEntry[]>();
    for (const delta of deltas) {
      const key = `${delta.table_name}:${delta.record_id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(delta);
    }

    let consolidatedCount = 0;

    for (const [key, entries] of groups) {
      if (entries.length < 2) continue;

      // دمج جميع الـ payloads
      const mergedPayload: Record<string, number> = {};
      for (const entry of entries) {
        const payload = JSON.parse(entry.payload);
        for (const [field, value] of Object.entries(payload)) {
          if (typeof value === 'number') {
            mergedPayload[field] = (mergedPayload[field] || 0) + value;
          }
        }
      }

      // تحديث أول entry بالـ payload المدمج
      const firstEntry = entries[0];
      await sqliteWriteQueue.write(
        `UPDATE sync_outbox SET payload = ? WHERE id = ?`,
        [JSON.stringify(mergedPayload), firstEntry.id]
      );

      // حذف باقي الـ entries
      const idsToDelete = entries.slice(1).map(e => e.id);
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(',');
        await sqliteWriteQueue.write(
          `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
          idsToDelete
        );
        consolidatedCount += idsToDelete.length;
      }
    }

    if (consolidatedCount > 0) {
      console.log(`[OutboxManager] Consolidated ${consolidatedCount} DELTA operations`);
    }

    return consolidatedCount;
  }

  /**
   * تنظيف العمليات القديمة التي تحتوي على أعمدة غير صالحة
   * ⚡ يُستخدم لإزالة العمليات المعلقة بسبب أخطاء schema
   */
  async cleanInvalidPayloads(tableName: string, invalidColumns: string[]): Promise<number> {
    const entries = await sqliteWriteQueue.read<OutboxEntry[]>(
      `SELECT * FROM sync_outbox WHERE table_name = ?`,
      [tableName]
    );

    let cleanedCount = 0;

    for (const entry of entries) {
      try {
        const payload = JSON.parse(entry.payload);
        let modified = false;
        const metadata: Record<string, any> = {};

        // نقل الأعمدة غير الصالحة إلى metadata
        for (const col of invalidColumns) {
          if (col in payload) {
            if (['customer_name', 'customer_phone', 'customer_address', 'wilaya', 'commune', 'items'].includes(col)) {
              metadata[col] = payload[col];
            }
            delete payload[col];
            modified = true;
          }
        }

        // إضافة metadata إذا وجدت
        if (Object.keys(metadata).length > 0) {
          const existingMeta = payload.metadata ?
            (typeof payload.metadata === 'string' ? JSON.parse(payload.metadata) : payload.metadata) : {};
          payload.metadata = JSON.stringify({ ...existingMeta, ...metadata });
        }

        if (modified) {
          await sqliteWriteQueue.write(
            `UPDATE sync_outbox SET payload = ?, status = 'pending' WHERE id = ?`,
            [JSON.stringify(payload), entry.id]
          );
          cleanedCount++;
        }
      } catch (error) {
        console.error(`[OutboxManager] Error cleaning payload for ${entry.id}:`, error);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[OutboxManager] Cleaned ${cleanedCount} invalid payloads for ${tableName}`);
    }

    return cleanedCount;
  }

  /**
   * حذف جميع العمليات المعلقة لجدول معين
   */
  async clearForTable(tableName: string): Promise<number> {
    const result = await sqliteWriteQueue.write<any>(
      `DELETE FROM sync_outbox WHERE table_name = ?`,
      [tableName]
    );

    const count = result?.changes || 0;
    if (count > 0) {
      console.log(`[OutboxManager] Cleared ${count} operations for ${tableName}`);
    }

    return count;
  }
}

// Export singleton instance
export const outboxManager = new OutboxManager();
