/**
 * ⚡ Unified OutboxManager - إدارة قائمة العمليات المحلية المعلقة
 *
 * المميزات:
 * - أسماء موحدة 100% مع Supabase (لا TABLE_MAP)
 * - فلترة تلقائية للأعمدة المحلية (تبدأ بـ _)
 * - Smart Retry مع Error Classification
 * - Exponential Backoff مع Jitter
 * - تجميع عمليات DELTA
 *
 * نمط Outbox:
 * 1. العملية تُكتب محلياً فوراً
 * 2. تُضاف للـ Outbox
 * 3. يُرسلها PushEngine للخادم
 * 4. عند النجاح تُزال من الـ Outbox
 */

import { sqliteWriteQueue } from '../core/SQLiteWriteQueue';
import {
    filterLocalColumns,
    getUnifiedTableName,
    BATCH_CONFIG,
    RETRY_CONFIG,
    OUTBOX_STATUS,
    SYNC_OPERATIONS,
    type OutboxStatus,
    type SyncOperation,
} from '../config';
import { dispatchAppEvent } from '../../events/eventManager';

// ============================================
// 📝 Types
// ============================================

export interface OutboxEntry {
    id: string;
    table_name: string;
    operation: SyncOperation;
    record_id: string;
    payload: string;
    local_seq: number;
    created_at: string;
    retry_count: number;
    last_error: string | null;
    next_retry_at: string | null;
    status: OutboxStatus;
}

interface AddOperationParams {
    tableName: string;
    operation: SyncOperation;
    recordId: string;
    payload: Record<string, unknown>;
}

type ErrorType = 'PERMANENT' | 'TRANSIENT' | 'SERVER_ERROR' | 'RATE_LIMIT' | 'FK_WAITING' | 'UNKNOWN';

interface ErrorClassification {
    type: ErrorType;
    shouldRetry: boolean;
    retryDelay?: number;
    reason: string;
}

interface OutboxStats {
    pending: number;
    sending: number;
    failed: number;
    total: number;
    byTable: Record<string, number>;
    byOperation: Record<string, number>;
}

// ============================================
// 🔧 Constants
// ============================================

const DELTA_SYNC_CONSTANTS = {
    BATCH_SIZE: BATCH_CONFIG.PUSH_BATCH_SIZE,
    MAX_RETRY_COUNT: RETRY_CONFIG.MAX_ATTEMPTS,
    INITIAL_RETRY_DELAY_MS: RETRY_CONFIG.BASE_DELAY_MS,
    MAX_RETRY_DELAY_MS: RETRY_CONFIG.MAX_DELAY_MS,
    RATE_LIMIT_RETRY_DELAY_MS: 30000,
    SERVER_ERROR_RETRY_DELAY_MS: 60000,
    FK_WAITING_RETRY_DELAY_MS: 5000,
};

// Child tables that depend on parent tables
const CHILD_TABLES = [
    'order_items',
    'invoice_items',
    'return_items',
    'loss_items',
    'supplier_purchase_items',
    'supplier_payments',
    'repair_status_history',
];

// ============================================
// ⚡ OutboxManager Class
// ============================================

class OutboxManager {
    private localSeqCounter: number = 0;
    private isInitialized = false;
    
    // ⚡ CRITICAL FIX: Cache لـ getPendingCount لمنع الاستعلامات المتكررة
    private _pendingCountCache: { count: number; timestamp: number } | null = null;
    private static readonly PENDING_COUNT_CACHE_TTL_MS = 2000; // ⚡ Cache لمدة 2 ثانية (كان 500ms)
    private static readonly PENDING_COUNT_CACHE_TTL_DURING_POS_MS = 30000; // ⚡ 30 ثانية أثناء POS

    /**
     * ⚡ Initialize the manager
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Create outbox table if not exists
            await sqliteWriteQueue.write(`
                CREATE TABLE IF NOT EXISTS sync_outbox (
                    id TEXT PRIMARY KEY,
                    table_name TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    local_seq INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    next_retry_at TEXT,
                    status TEXT DEFAULT 'pending'
                )
            `);

            // Create indexes
            await sqliteWriteQueue.write(`
                CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox(status);
                CREATE INDEX IF NOT EXISTS idx_outbox_table ON sync_outbox(table_name);
                CREATE INDEX IF NOT EXISTS idx_outbox_seq ON sync_outbox(local_seq);
            `);

            // ⚡ CRITICAL FIX: إنشاء Dead Letter Queue لحفظ العمليات الفاشلة
            // بدلاً من حذفها نهائياً (خاصة Schema Errors)
            await sqliteWriteQueue.write(`
                CREATE TABLE IF NOT EXISTS sync_dead_letter_queue (
                    id TEXT PRIMARY KEY,
                    original_outbox_id TEXT,
                    table_name TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    local_seq INTEGER NOT NULL,
                    original_created_at TEXT NOT NULL,
                    failed_at TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT NOT NULL,
                    error_type TEXT NOT NULL,
                    error_reason TEXT,
                    status TEXT DEFAULT 'quarantined',
                    can_recover BOOLEAN DEFAULT 1,
                    recovery_notes TEXT
                )
            `);

            // ⚡ إضافة الأعمدة إذا لم تكن موجودة (للجداول القديمة)
            // نستخدم PRAGMA table_info للتحقق من وجود الأعمدة أولاً
            try {
                const tableInfo = await sqliteWriteQueue.read<Array<{ name: string }>>(
                    `PRAGMA table_info(sync_dead_letter_queue)`,
                    []
                );
                const existingColumns = new Set(tableInfo.map(col => col.name.toLowerCase()));

                if (!existingColumns.has('status')) {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN status TEXT DEFAULT 'quarantined'`);
                }
                if (!existingColumns.has('can_recover')) {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN can_recover BOOLEAN DEFAULT 1`);
                }
                if (!existingColumns.has('recovery_notes')) {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN recovery_notes TEXT`);
                }
            } catch (e: any) {
                // Fallback: محاولة إضافة مع معالجة الأخطاء
                try {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN status TEXT DEFAULT 'quarantined'`);
                } catch (err: any) {
                    if (!err?.message?.includes('duplicate column') && !err?.message?.includes('already exists')) {
                        console.warn('[OutboxManager] ⚠️ Failed to add status column:', err);
                    }
                }
                try {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN can_recover BOOLEAN DEFAULT 1`);
                } catch (err: any) {
                    if (!err?.message?.includes('duplicate column') && !err?.message?.includes('already exists')) {
                        console.warn('[OutboxManager] ⚠️ Failed to add can_recover column:', err);
                    }
                }
                try {
                    await sqliteWriteQueue.write(`ALTER TABLE sync_dead_letter_queue ADD COLUMN recovery_notes TEXT`);
                } catch (err: any) {
                    if (!err?.message?.includes('duplicate column') && !err?.message?.includes('already exists')) {
                        console.warn('[OutboxManager] ⚠️ Failed to add recovery_notes column:', err);
                    }
                }
            }

            // Create indexes for Dead Letter Queue (بعد التأكد من وجود الأعمدة)
            await sqliteWriteQueue.write(`
                CREATE INDEX IF NOT EXISTS idx_dlq_table ON sync_dead_letter_queue(table_name);
                CREATE INDEX IF NOT EXISTS idx_dlq_status ON sync_dead_letter_queue(status);
                CREATE INDEX IF NOT EXISTS idx_dlq_can_recover ON sync_dead_letter_queue(can_recover);
            `);

            // Get max local_seq
            const result = await sqliteWriteQueue.read<{ max_seq: number }[]>(
                `SELECT MAX(local_seq) as max_seq FROM sync_outbox`
            );

            this.localSeqCounter = (result[0]?.max_seq || 0) + 1;
            this.isInitialized = true;

            console.log(`[OutboxManager] ✅ Initialized with local_seq starting at ${this.localSeqCounter}`);
        } catch (error) {
            console.error('[OutboxManager] ❌ Initialization failed:', error);
            this.localSeqCounter = Date.now();
            this.isInitialized = true;
        }
    }

    /**
     * ⚡ Add a new operation to the outbox
     */
    async add(params: AddOperationParams): Promise<string> {
        const addStartTime = Date.now();
        console.log('[OutboxManager] 🚀 ========== بدء إضافة عملية للـ Outbox ==========');
        console.log('[OutboxManager] 📦 بيانات العملية:', {
            tableName: params.tableName,
            operation: params.operation,
            recordId: params.recordId?.slice(0, 8) || 'missing',
            payloadKeys: Object.keys(params.payload || {}).length
        });

        await this.initialize();

        const id = crypto.randomUUID();
        const localSeq = this.localSeqCounter++;

        // ✅ فلترة الأعمدة المحلية (تبدأ بـ _) + تحويل camelCase → snake_case
        const cleanedPayload = this.cleanPayload(params.tableName, params.payload);

        // ✅ استخدام اسم الجدول الموحد
        const unifiedTableName = getUnifiedTableName(params.tableName);

        console.log('[OutboxManager] 🔄 بعد التنظيف:', {
            unifiedTableName,
            cleanedPayloadKeys: Object.keys(cleanedPayload).length,
            localSeq
        });

        const entry: OutboxEntry = {
            id,
            table_name: unifiedTableName,
            operation: params.operation,
            record_id: params.recordId,
            payload: JSON.stringify(cleanedPayload),
            local_seq: localSeq,
            created_at: new Date().toISOString(),
            retry_count: 0,
            last_error: null,
            next_retry_at: null,
            status: OUTBOX_STATUS.PENDING,
        };

        const dbStartTime = Date.now();
        console.log('[OutboxManager] 💾 قبل INSERT في sync_outbox:', {
            id: id.slice(0, 8),
            table: unifiedTableName,
            operation: params.operation,
            recordId: params.recordId?.slice(0, 8),
            payloadSize: entry.payload.length,
            timestamp: new Date().toISOString()
        });
        
        try {
            await sqliteWriteQueue.write(
                `INSERT INTO sync_outbox (id, table_name, operation, record_id, payload, local_seq, created_at, retry_count, last_error, next_retry_at, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    entry.next_retry_at,
                    entry.status,
                ]
            );
            const dbDuration = Date.now() - dbStartTime;
            console.log('[OutboxManager] ✅ بعد INSERT في sync_outbox:', {
                id: id.slice(0, 8),
                duration: `${dbDuration}ms`,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            const dbDuration = Date.now() - dbStartTime;
            console.error('[OutboxManager] ❌ فشل INSERT في sync_outbox:', {
                id: id.slice(0, 8),
                duration: `${dbDuration}ms`,
                error: error?.message || String(error),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
        
        const dbDuration = Date.now() - dbStartTime;

        const totalDuration = Date.now() - addStartTime;
        console.log('[OutboxManager] ✅ ========== تم إضافة العملية للـ Outbox بنجاح ==========');
        console.log('[OutboxManager] 📊 ملخص:', {
            id: id.slice(0, 8),
            operation: params.operation,
            table: unifiedTableName,
            recordId: params.recordId?.slice(0, 8) || 'missing',
            localSeq,
            dbDuration: dbDuration + 'ms',
            totalDuration: totalDuration + 'ms'
        });

        // ⚡ مسح Cache العدد
        this.invalidatePendingCountCache();
        
        return id;
    }

    /**
     * ⚡ Add a DELTA operation for stock updates
     */
    async addDelta(
        tableName: string,
        recordId: string,
        delta: Record<string, number>
    ): Promise<string> {
        return this.add({
            tableName,
            operation: SYNC_OPERATIONS.DELTA,
            recordId,
            payload: delta as unknown as Record<string, unknown>,
        });
    }

    /**
     * ⚡ Get pending operations (with smart retry support)
     * 
     * ⚠️ CRITICAL FIX: يتحقق من حالة POS لمنع التعارض مع عمليات الكتابة
     */
    async getPending(limit: number = DELTA_SYNC_CONSTANTS.BATCH_SIZE): Promise<OutboxEntry[]> {
        // ⚡ CRITICAL: تحقق من حالة POS
        try {
            const { databaseCoordinator } = await import('../core/DatabaseCoordinator');
            if (databaseCoordinator.isSyncPaused()) {
                console.log('[OutboxManager] ⏸️ POS active - skipping getPending()');
                return [];
            }
        } catch {
            // تجاهل الخطأ
        }
        
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
     * ⚡ Get pending operations count
     * 
     * ⚠️ CRITICAL FIX: إضافة Cache لمنع الاستعلامات المتكررة
     * هذه الدالة كانت تُستدعى آلاف المرات في الثانية مما يسبب "هجوم DDoS ذاتي"
     */
    async getPendingCount(): Promise<number> {
        const now = Date.now();
        
        // ⚡ CRITICAL: تحقق من حالة POS باستخدام lazy import لتجنب circular dependency
        let isPOSActive = false;
        try {
            const { databaseCoordinator } = await import('../core/DatabaseCoordinator');
            isPOSActive = databaseCoordinator.isSyncPaused();
        } catch {
            // تجاهل الخطأ - نفترض أن POS غير نشط
        }
        
        // ⚡ استخدام TTL أطول أثناء عمليات POS
        const ttl = isPOSActive 
            ? OutboxManager.PENDING_COUNT_CACHE_TTL_DURING_POS_MS 
            : OutboxManager.PENDING_COUNT_CACHE_TTL_MS;
        
        // ⚡ استخدام Cache إذا كانت البيانات حديثة
        if (this._pendingCountCache && (now - this._pendingCountCache.timestamp) < ttl) {
            return this._pendingCountCache.count;
        }
        
        // ⚡ CRITICAL: لا تستعلم أثناء عمليات POS
        if (isPOSActive) {
            if (this._pendingCountCache) {
                console.log('[OutboxManager] ⏸️ POS active - using stale cache for getPendingCount()');
                return this._pendingCountCache.count;
            }
            // لا يوجد cache - أرجع 0 بدلاً من الاستعلام
            console.log('[OutboxManager] ⏸️ POS active - returning 0 (no cache)');
            return 0;
        }
        
        const result = await sqliteWriteQueue.read<{ count: number }[]>(
            `SELECT COUNT(*) as count FROM sync_outbox WHERE status IN ('pending', 'sending')`
        );
        const count = result[0]?.count || 0;
        
        // ⚡ تحديث Cache
        this._pendingCountCache = { count, timestamp: now };
        
        return count;
    }
    
    /**
     * ⚡ مسح Cache العدد (يُستدعى بعد إضافة/حذف عمليات)
     */
    invalidatePendingCountCache(): void {
        this._pendingCountCache = null;
    }

    /**
     * ⚡ Mark operations as sending
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
     * ⚡ Mark operations as sent (update source table and delete from outbox)
     */
    async markSent(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        // 1️⃣ جلب معلومات العناصر قبل الحذف لتحديث الجداول الأصلية
        const placeholders = ids.map(() => '?').join(',');
        const entries = await sqliteWriteQueue.read<Array<{ table_name: string; record_id: string }>>(
            `SELECT table_name, record_id FROM sync_outbox WHERE id IN (${placeholders})`,
            ids
        );

        // 2️⃣ تحديث حالة المزامنة في الجداول الأصلية
        // تجميع حسب الجدول للتحديث بكفاءة
        const byTable = new Map<string, string[]>();
        for (const entry of entries) {
            const records = byTable.get(entry.table_name) || [];
            records.push(entry.record_id);
            byTable.set(entry.table_name, records);
        }

        // تحديث كل جدول
        for (const [tableName, recordIds] of byTable) {
            const recordPlaceholders = recordIds.map(() => '?').join(',');

            // ⚡ جدول staff_work_sessions: السكيمة المحلية تملك فقط synced بدون _synced
            // لذلك نحدّث synced فقط لتجنّب أخطاء "no such column: _synced"
            if (tableName === 'staff_work_sessions') {
                try {
                    await sqliteWriteQueue.write(
                        `UPDATE staff_work_sessions SET synced = 1 WHERE id IN (${recordPlaceholders})`,
                        recordIds
                    );
                } catch (err) {
                    console.warn('[OutboxManager] ⚠️ Could not update synced for staff_work_sessions:', err);
                }
                continue;
            }

            try {
                // ⚡ قائمة الجداول التي لديها عمود _synced
                const tablesWithUnderscoreSynced = [
                    'orders',
                    'order_items',
                    'employees',
                    'product_advanced_settings',
                    'product_marketing_settings'
                ];

                // تحديث عمود synced (و _synced إذا كان موجوداً)
                if (tablesWithUnderscoreSynced.includes(tableName)) {
                    // الجداول التي لديها كلا العمودين: synced و _synced
                    try {
                        await sqliteWriteQueue.write(
                            `UPDATE ${tableName} SET synced = 1, _synced = 1 WHERE id IN (${recordPlaceholders})`,
                            recordIds
                        );
                    } catch (err) {
                        console.warn(`[OutboxManager] ⚠️ Could not update synced/_synced for ${tableName}:`, err);
                    }
                } else {
                    // الجداول التي لديها synced فقط (products, customers, categories, إلخ)
                    try {
                        await sqliteWriteQueue.write(
                            `UPDATE ${tableName} SET synced = 1 WHERE id IN (${recordPlaceholders})`,
                            recordIds
                        );
                    } catch (err) {
                        console.warn(`[OutboxManager] ⚠️ Could not update synced for ${tableName}:`, err);
                    }
                }

                // ⚡ منطق خاص بجدول orders لتحديث sync_status و status بعد المزامنة
                if (tableName === 'orders') {
                    try {
                        await sqliteWriteQueue.write(
                            `UPDATE orders
                             SET synced = 1,
                                 _synced = 1,
                                 sync_status = 'synced',
                                 _sync_status = 'synced',
                                 status = CASE
                                     WHEN status = 'pending_sync' THEN 'synced'
                                     WHEN status = 'syncing' THEN 'synced'
                                     ELSE status
                                 END,
                                 pending_operation = NULL,
                                 _pending_operation = NULL,
                                 updated_at = datetime('now')
                             WHERE id IN (${recordPlaceholders})`,
                            recordIds
                        );
                        console.log(`[OutboxManager] ✅ Updated sync_status and status to 'synced' for ${recordIds.length} orders`);

                        // ⚡ CRITICAL FIX: إطلاق حدث لتحديث واجهة المستخدم
                        // هذا يضمن أن React Query تقوم بتحديث الـ cache وإظهار الحالة الصحيحة في الواجهة
                        dispatchAppEvent('pos-orders-synced', {
                            orderIds: recordIds,
                            count: recordIds.length
                        });
                        console.log(`[OutboxManager] 📣 Dispatched 'pos-orders-synced' event for ${recordIds.length} orders`);
                    } catch (err) {
                        console.error(`[OutboxManager] ❌ Failed to update order sync_status:`, {
                            error: err,
                            recordIds,
                            message: err instanceof Error ? err.message : String(err)
                        });
                    }
                }
            } catch (err) {
                // تجاهل الأخطاء إذا لم يكن العمود موجوداً في الجدول
                console.warn(`[OutboxManager] ⚠️ Could not update sync status for ${tableName}:`, err);
            }
        }

        // 3️⃣ حذف العناصر من outbox
        await sqliteWriteQueue.write(
            `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
            ids
        );

        // ⚡ مسح Cache العدد
        this.invalidatePendingCountCache();
        
        console.log(`[OutboxManager] ✅ Removed ${ids.length} sent operations (updated source tables)`);
    }

    /**
     * ⚡ Mark operation as failed with smart retry
     * 
     * ⚠️ CRITICAL FIX: نقل العمليات الفاشلة إلى Dead Letter Queue بدلاً من حذفها
     * - Schema Errors (PGRST204) تُنقل إلى DLQ ويمكن استعادتها بعد تحديث التطبيق
     * - فقط الأخطاء الدائمة الحقيقية (مثل JWT expired) تُحذف نهائياً
     */
    async markFailed(id: string, error: string, statusCode?: number): Promise<void> {
        // Get entry details
        const entries = await sqliteWriteQueue.read<OutboxEntry[]>(
            `SELECT * FROM sync_outbox WHERE id = ?`,
            [id]
        );

        if (entries.length === 0) return;

        const entry = entries[0];
        const classification = this.classifyError(error, statusCode, entry.table_name);

        // ⚡ Phase 4: تحديد ما إذا كان الخطأ قابلاً للاستعادة (Recoverable)
        // Schema Errors (PGRST204) قابلة للاستعادة بعد تحديث التطبيق
        const isRecoverable = this.isRecoverableError(error, classification);
        const errorLower = error.toLowerCase();
        const isSchemaError = errorLower.includes('pgrst204') || 
                             errorLower.includes('schema cache') ||
                             errorLower.includes('could not find the') ||
                             (errorLower.includes('column') && errorLower.includes('does not exist')) ||
                             errorLower.includes('no such column') ||
                             errorLower.includes('no such table') ||
                             errorLower.includes('relation') && errorLower.includes('does not exist');

        // ⚡ Phase 4: Permanent error - نقل إلى Dead Letter Queue بدلاً من الحذف
        if (!classification.shouldRetry) {
            if (isSchemaError || isRecoverable) {
                // ⚡ Schema Errors قابلة للاستعادة - نقل إلى DLQ مع log واضح
                console.error(
                    `[OutboxManager] 🚫 ========== Schema Error (UNFIXABLE) ==========`
                );
                console.error(`[OutboxManager] 🚫 Table: ${entry.table_name}`);
                console.error(`[OutboxManager] 🚫 Record ID: ${entry.record_id}`);
                console.error(`[OutboxManager] 🚫 Operation: ${entry.operation}`);
                console.error(`[OutboxManager] 🚫 Error: ${error}`);
                console.error(`[OutboxManager] 🚫 Reason: ${classification.reason}`);
                console.error(`[OutboxManager] 🚫 Moving to Dead Letter Queue (recoverable: ${isRecoverable})`);
                
                await this.moveToDeadLetterQueue(entry, error, classification, isRecoverable);
            } else {
                // ⚡ أخطاء دائمة حقيقية (مثل JWT expired) - حذف نهائي
                console.warn(
                    `[OutboxManager] 🚫 Permanent non-recoverable error - deleting: ${entry.table_name}/${entry.record_id}`
                );
                console.warn(`[OutboxManager] 🚫 Reason: ${classification.reason}`);

                // Save to localStorage for diagnostics
                this.saveDiscardedOperation(entry, error, classification);

                await sqliteWriteQueue.write(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
            }
            return;
        }

        const newRetry = entry.retry_count + 1;

        // Max retries exceeded - نقل إلى Dead Letter Queue
        if (newRetry >= DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT) {
            console.error(
                `[OutboxManager] ❌ Max retries exceeded - moving to Dead Letter Queue: ${entry.table_name}/${entry.record_id}`
            );

            await this.moveToDeadLetterQueue(entry, error, classification, isRecoverable);
            return;
        }

        // Calculate retry delay
        const delay = classification.retryDelay || this.calculateBackoffDelay(newRetry);
        const nextRetryAt = new Date(Date.now() + delay).toISOString();

        await sqliteWriteQueue.write(
            `UPDATE sync_outbox
             SET status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ?
             WHERE id = ?`,
            [newRetry, error, nextRetryAt, id]
        );

        const delayStr = delay >= 60000 ? `${Math.round(delay / 60000)}m` : `${Math.round(delay / 1000)}s`;
        console.log(
            `[OutboxManager] 🔄 [${classification.type}] Retry ${newRetry}/${DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT} in ${delayStr}`
        );
    }

    /**
     * ⚡ Requeue stuck 'sending' operations
     */
    async requeueStuck(): Promise<number> {
        const result = await sqliteWriteQueue.write<{ changes: number }>(
            `UPDATE sync_outbox SET status = 'pending' WHERE status = 'sending'`
        );

        const count = result?.changes || 0;
        if (count > 0) {
            console.log(`[OutboxManager] 🔄 Requeued ${count} stuck operations`);
        }

        return count;
    }

    /**
     * ⚡ Requeue failed operations
     */
    async requeueFailed(): Promise<number> {
        const result = await sqliteWriteQueue.write<{ changes: number }>(
            `UPDATE sync_outbox
             SET status = 'pending'
             WHERE status = 'failed' AND retry_count < ?`,
            [DELTA_SYNC_CONSTANTS.MAX_RETRY_COUNT]
        );

        const count = result?.changes || 0;
        if (count > 0) {
            console.log(`[OutboxManager] 🔄 Requeued ${count} failed operations`);
        }

        return count;
    }

    /**
     * ⚡ Get outbox statistics
     * 
     * ⚠️ CRITICAL FIX: يستخدم Cache ويمنع الاستعلامات أثناء عمليات POS الحرجة
     * كانت هذه الاستعلامات تسبب تعارض في قفل قاعدة البيانات مما يؤدي إلى timeout
     */
    private _statsCache: { stats: OutboxStats; timestamp: number } | null = null;
    private static readonly STATS_CACHE_TTL_MS = 5000; // ⚡ Cache لمدة 5 ثواني (كان 2)
    private static readonly STATS_CACHE_TTL_DURING_POS_MS = 30000; // ⚡ 30 ثانية أثناء POS
    
    async getStats(): Promise<OutboxStats> {
        const now = Date.now();
        
        // ⚡ CRITICAL: تحقق من حالة POS باستخدام lazy import لتجنب circular dependency
        let isPOSActive = false;
        try {
            const { databaseCoordinator } = await import('../core/DatabaseCoordinator');
            isPOSActive = databaseCoordinator.isSyncPaused();
        } catch {
            // تجاهل الخطأ - نفترض أن POS غير نشط
        }
        
        // ⚡ استخدام TTL أطول أثناء عمليات POS
        const ttl = isPOSActive 
            ? OutboxManager.STATS_CACHE_TTL_DURING_POS_MS 
            : OutboxManager.STATS_CACHE_TTL_MS;
        
        // ⚡ استخدام Cache إذا كانت البيانات حديثة
        if (this._statsCache && (now - this._statsCache.timestamp) < ttl) {
            return this._statsCache.stats;
        }
        
        // ⚡ CRITICAL: لا تستعلم أثناء عمليات POS
        if (isPOSActive) {
            if (this._statsCache) {
                console.log('[OutboxManager] ⏸️ POS active - using stale cache for getStats()');
                return this._statsCache.stats;
            }
            // لا يوجد cache - أرجع قيم فارغة بدلاً من الاستعلام
            console.log('[OutboxManager] ⏸️ POS active - returning empty stats (no cache)');
            return {
                pending: 0,
                sending: 0,
                failed: 0,
                total: 0,
                byTable: {},
                byOperation: {},
            };
        }
        
        const [statusCounts, tableCounts, opCounts] = await Promise.all([
            sqliteWriteQueue.read<{ status: string; count: number }[]>(
                `SELECT status, COUNT(*) as count FROM sync_outbox GROUP BY status`
            ),
            sqliteWriteQueue.read<{ table_name: string; count: number }[]>(
                `SELECT table_name, COUNT(*) as count FROM sync_outbox GROUP BY table_name`
            ),
            sqliteWriteQueue.read<{ operation: string; count: number }[]>(
                `SELECT operation, COUNT(*) as count FROM sync_outbox GROUP BY operation`
            ),
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

        const stats: OutboxStats = {
            pending: byStatus['pending'] || 0,
            sending: byStatus['sending'] || 0,
            failed: byStatus['failed'] || 0,
            total: (byStatus['pending'] || 0) + (byStatus['sending'] || 0) + (byStatus['failed'] || 0),
            byTable,
            byOperation,
        };
        
        // ⚡ تحديث Cache
        this._statsCache = { stats, timestamp: Date.now() };
        
        return stats;
    }

    /**
     * ⚡ Get detailed pending operations
     */
    async getDetailedPending(limit: number = 20): Promise<OutboxEntry[]> {
        return await sqliteWriteQueue.read<OutboxEntry[]>(
            `SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT ?`,
            [limit]
        );
    }

    /**
     * ⚡ Get all pending operations (for PullEngine cache)
     */
    async getPendingOperations(): Promise<OutboxEntry[]> {
        return await sqliteWriteQueue.read<OutboxEntry[]>(
            `SELECT * FROM sync_outbox
             WHERE status IN ('pending', 'sending', 'failed')
             ORDER BY local_seq ASC`
        );
    }

    /**
     * ⚡ Clear all operations
     */
    async clear(): Promise<void> {
        await sqliteWriteQueue.write(`DELETE FROM sync_outbox`);
        console.log('[OutboxManager] 🗑️ Cleared all operations');
    }

    /**
     * ⚡ Clear operations for a specific table
     */
    async clearForTable(tableName: string): Promise<number> {
        const result = await sqliteWriteQueue.write<{ changes: number }>(
            `DELETE FROM sync_outbox WHERE table_name = ?`,
            [tableName]
        );

        const count = result?.changes || 0;
        if (count > 0) {
            console.log(`[OutboxManager] 🗑️ Cleared ${count} operations for ${tableName}`);
        }

        return count;
    }

    /**
     * ⚡ Remove a single operation by ID
     */
    async remove(id: string): Promise<boolean> {
        const result = await sqliteWriteQueue.write<{ changes: number }>(
            `DELETE FROM sync_outbox WHERE id = ?`,
            [id]
        );
        return (result?.changes || 0) > 0;
    }

    /**
     * ⚡ Remove operations for a specific record
     */
    async removeForRecord(tableName: string, recordId: string): Promise<number> {
        const result = await sqliteWriteQueue.write<{ changes: number }>(
            `DELETE FROM sync_outbox WHERE table_name = ? AND record_id = ?`,
            [tableName, recordId]
        );

        return result?.changes || 0;
    }

    /**
     * ⚡ Consolidate multiple DELTA operations for the same record
     */
    async consolidateDeltas(): Promise<number> {
        const deltas = await sqliteWriteQueue.read<OutboxEntry[]>(
            `SELECT * FROM sync_outbox
             WHERE operation = 'DELTA' AND status = 'pending'
             ORDER BY table_name, record_id, local_seq ASC`
        );

        if (deltas.length < 2) return 0;

        // Group by table_name + record_id
        const groups = new Map<string, OutboxEntry[]>();
        for (const delta of deltas) {
            const key = `${delta.table_name}:${delta.record_id}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(delta);
        }

        let consolidatedCount = 0;

        for (const [, entries] of groups) {
            if (entries.length < 2) continue;

            // Merge all payloads
            const mergedPayload: Record<string, number> = {};
            for (const entry of entries) {
                const payload = JSON.parse(entry.payload);
                for (const [field, value] of Object.entries(payload)) {
                    if (typeof value === 'number') {
                        mergedPayload[field] = (mergedPayload[field] || 0) + value;
                    }
                }
            }

            // Update first entry with merged payload
            const firstEntry = entries[0];
            await sqliteWriteQueue.write(
                `UPDATE sync_outbox SET payload = ? WHERE id = ?`,
                [JSON.stringify(mergedPayload), firstEntry.id]
            );

            // Delete remaining entries
            const idsToDelete = entries.slice(1).map((e) => e.id);
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
            console.log(`[OutboxManager] 📦 Consolidated ${consolidatedCount} DELTA operations`);
        }

        return consolidatedCount;
    }

    /**
     * ⚡ Auto-clean all payloads (fix legacy data)
     */
    async autoCleanAllPayloads(): Promise<{ cleaned: number; removed: number; converted: number }> {
        const entries = await sqliteWriteQueue.read<OutboxEntry[]>(
            `SELECT * FROM sync_outbox WHERE status IN ('pending', 'failed')`
        );

        let cleanedCount = 0;
        let removedCount = 0;
        let convertedCount = 0;

        for (const entry of entries) {
            try {
                const payload = JSON.parse(entry.payload);
                const cleanedPayload = this.cleanPayload(entry.table_name, payload);

                const wasModified = JSON.stringify(payload) !== JSON.stringify(cleanedPayload);

                if (wasModified) {
                    await sqliteWriteQueue.write(
                        `UPDATE sync_outbox SET payload = ?, status = 'pending', retry_count = 0, last_error = NULL WHERE id = ?`,
                        [JSON.stringify(cleanedPayload), entry.id]
                    );
                    cleanedCount++;
                    convertedCount++;
                }
            } catch {
                // Remove corrupted entries
                await sqliteWriteQueue.write(`DELETE FROM sync_outbox WHERE id = ?`, [entry.id]);
                removedCount++;
            }
        }

        if (cleanedCount > 0 || removedCount > 0) {
            console.log(
                `[OutboxManager] 🧹 Auto-clean: ${cleanedCount} cleaned, ${convertedCount} converted, ${removedCount} removed`
            );
        }

        return { cleaned: cleanedCount, removed: removedCount, converted: convertedCount };
    }

    // ============================================
    // 🔧 Private Helper Methods
    // ============================================

    /**
     * ⚡ Clean payload - remove local columns and convert camelCase
     * Now using the enhanced filterLocalColumns which handles:
     * - Removing _ prefixed columns
     * - Removing local-only columns
     * - Converting camelCase to snake_case
     * - Validating against Supabase schema for orders/order_items
     */
    private cleanPayload(tableName: string, payload: Record<string, unknown>): Record<string, unknown> {
        // ✅ استخدام filterLocalColumns المحسّن من config
        // يقوم بـ: إزالة _ columns، إزالة local columns، تحويل camelCase، التحقق من Schema
        const clean = filterLocalColumns(payload, tableName) as Record<string, unknown>;

        // ✅ إصلاح الحقول المطلوبة للطلبات
        if (tableName === 'orders') {
            if (!clean.payment_method) {
                clean.payment_method = 'cash';
            }
            if (clean.total === undefined) {
                clean.total = clean.subtotal || 0;
            }
            if (clean.subtotal === undefined) {
                clean.subtotal = clean.total || 0;
            }
            if (!clean.status) {
                clean.status = 'completed';
            }
            if (!clean.payment_status) {
                clean.payment_status = 'paid';
            }
            if (clean.tax === undefined) {
                clean.tax = 0;
            }
        }

        return clean;
    }

    /**
     * ⚡ Remove corrupted outbox entries that cannot be fixed
     * Returns number of removed entries
     */
    async removeCorruptedEntries(): Promise<number> {
        let removedCount = 0;

        // 1. Remove order_items without order_id (unfixable)
        const orphanItems = await sqliteWriteQueue.read<{ id: string }[]>(
            `SELECT o.id FROM sync_outbox o
             WHERE o.table_name = 'order_items'
             AND (
                 json_extract(o.payload, '$.order_id') IS NULL
                 OR json_extract(o.payload, '$.order_id') = ''
             )`
        );

        if (orphanItems.length > 0) {
            const ids = orphanItems.map(e => e.id);
            const placeholders = ids.map(() => '?').join(',');
            await sqliteWriteQueue.write(
                `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
                ids
            );
            removedCount += orphanItems.length;
            console.log(`[OutboxManager] 🗑️ Removed ${orphanItems.length} orphan order_items (no order_id)`);
        }

        // 2. Remove entries that have failed too many times with validation errors
        const failedValidation = await sqliteWriteQueue.read<{ id: string }[]>(
            `SELECT id FROM sync_outbox
             WHERE status = 'failed'
             AND retry_count >= 3
             AND (
                 last_error LIKE '%is required%'
                 OR last_error LIKE '%validation%'
             )`
        );

        if (failedValidation.length > 0) {
            const ids = failedValidation.map(e => e.id);
            const placeholders = ids.map(() => '?').join(',');
            await sqliteWriteQueue.write(
                `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
                ids
            );
            removedCount += failedValidation.length;
            console.log(`[OutboxManager] 🗑️ Removed ${failedValidation.length} failed validation entries`);
        }

        return removedCount;
    }

    /**
     * ⚡ Remove all entries with PGRST204 (schema mismatch) errors
     * هذه الأخطاء تحدث عندما يحتوي الـ payload على أعمدة غير موجودة في Supabase
     * بعد إصلاح filterLocalColumns، هذه العمليات القديمة يجب حذفها
     */
    async removeSchemaErrors(): Promise<number> {
        const schemaErrors = await sqliteWriteQueue.read<{ id: string }[]>(
            `SELECT id FROM sync_outbox
             WHERE status = 'failed'
             AND (
                 last_error LIKE '%PGRST204%'
                 OR last_error LIKE '%schema cache%'
                 OR last_error LIKE '%could not find the%column%'
             )`
        );

        if (schemaErrors.length > 0) {
            const ids = schemaErrors.map(e => e.id);
            const placeholders = ids.map(() => '?').join(',');
            await sqliteWriteQueue.write(
                `DELETE FROM sync_outbox WHERE id IN (${placeholders})`,
                ids
            );
            console.log(`[OutboxManager] 🗑️ Removed ${schemaErrors.length} schema mismatch errors (PGRST204)`);
        }

        return schemaErrors.length;
    }

    /**
     * ⚡ Reset all failed entries to pending (for retry after fix)
     * يُستخدم بعد إصلاح المشاكل لإعادة محاولة جميع العمليات الفاشلة
     */
    async resetFailedToPending(): Promise<number> {
        const result = await sqliteWriteQueue.write(
            `UPDATE sync_outbox
             SET status = 'pending', retry_count = 0, last_error = NULL, next_retry_at = NULL
             WHERE status = 'failed'`
        );
        const count = result?.changes || 0;
        if (count > 0) {
            console.log(`[OutboxManager] 🔄 Reset ${count} failed entries to pending`);
        }
        return count;
    }

    /**
     * ⚡ Convert camelCase to snake_case
     */
    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }

    /**
     * ⚡ Classify error for retry strategy
     * 
     * ⚡ Phase 4 Enhancement: تحسين تصنيف الأخطاء
     * - Network/timeout errors → retry (pending)
     * - Schema errors (fixed) → DLQ/UNFIXABLE (with clear log)
     */
    private classifyError(
        errorMessage: string,
        statusCode?: number,
        tableName?: string
    ): ErrorClassification {
        const error = (errorMessage || '').toLowerCase();
        const code = statusCode || 0;

        // ⚡ Phase 4: Network/Timeout errors - يجب إعادة المحاولة (pending)
        const networkTimeoutPatterns = [
            'network',
            'timeout',
            'econnreset',
            'fetch failed',
            'failed to fetch',
            'load failed',
            'offline',
            'connection refused',
            'connection timeout',
            'socket hang up',
            'econnaborted',
            'etimedout',
            'enotfound',
            'eai_again',
            'dns',
            'no internet',
            'network error',
            'networkerror',
            'network request failed',
            'networkerror when attempting to fetch resource',
            'err_network',
            'net::err_',
        ];

        for (const pattern of networkTimeoutPatterns) {
            if (error.includes(pattern)) {
                return {
                    type: 'TRANSIENT',
                    shouldRetry: true,
                    retryDelay: DELTA_SYNC_CONSTANTS.INITIAL_RETRY_DELAY_MS,
                    reason: `Network/timeout error: ${errorMessage.slice(0, 100)}`,
                };
            }
        }

        // ⚡ Phase 4: Auth errors (JWT expired) - يجب إعادة المحاولة بعد refresh token
        const authErrorPatterns = [
            'jwt expired',
            'invalid jwt',
            'jwt malformed',
            'token expired',
            'authentication failed',
            'unauthorized',
            '401',
        ];

        for (const pattern of authErrorPatterns) {
            if (error.includes(pattern) || code === 401) {
                // ⚡ Phase 4: Auth errors قابلة للاستعادة بعد refresh token
                // لا نحذفها فوراً - ننتظر refresh token
                return {
                    type: 'TRANSIENT',
                    shouldRetry: true,
                    retryDelay: DELTA_SYNC_CONSTANTS.SERVER_ERROR_RETRY_DELAY_MS, // انتظار أطول للسماح بـ refresh token
                    reason: `Auth error (JWT expired) - will retry after token refresh: ${errorMessage.slice(0, 100)}`,
                };
            }
        }

        // FK Constraint for child tables - wait for parent
        const isFKError = error.includes('foreign key constraint') || error.includes('23503');
        const isChildTable = tableName && CHILD_TABLES.some((t) => tableName.includes(t));

        if (isFKError && isChildTable) {
            return {
                type: 'FK_WAITING',
                shouldRetry: true,
                retryDelay: DELTA_SYNC_CONSTANTS.FK_WAITING_RETRY_DELAY_MS,
                reason: 'Waiting for parent record to sync first',
            };
        }

        // ⚡ Phase 4: Schema errors (PGRST204/column does not exist) - يجب نقلها إلى DLQ
        // هذه أخطاء في Schema الثابتة (عمود ناقص/جدول غير موجود)
        const schemaErrorPatterns = [
            'pgrst204',                    // PostgREST schema cache error
            'could not find the',          // Column/table not found
            'column of .* in the schema cache',
            'schema cache',
            'column .* does not exist',    // Column doesn't exist
            'relation .* does not exist',  // Table doesn't exist
            'no such column',              // SQLite column error
            'no such table',               // SQLite table error
            '42703',                       // PostgreSQL undefined column
            '42p01',                       // PostgreSQL undefined table
            'undefined column',            // Generic undefined column
            'undefined table',             // Generic undefined table
        ];

        // ⚡ Phase 4: التحقق من statusCode أيضاً (PGRST204 = 204)
        const isSchemaError = schemaErrorPatterns.some(pattern => error.match(new RegExp(pattern, 'i'))) ||
                             code === 204; // PGRST204 = HTTP 204

        if (isSchemaError) {
            return {
                type: 'PERMANENT',
                shouldRetry: false,
                reason: `Schema mismatch (PGRST204/column does not exist): ${errorMessage.slice(0, 150)} - Moving to DLQ for recovery after app update`,
            };
        }

        // ⚡ Phase 4: Permanent errors - no retry (but not schema/auth errors - تم التعامل معها أعلاه)
        const permanentPatterns = [
            'violates not-null constraint',
            'violates unique constraint',
            'violates check constraint',
            'duplicate key',
            'invalid input syntax',
            'value too long',
            'not authenticated', // ⚠️ تم التعامل مع auth errors أعلاه، لكن نترك هذا للتوافق
            'permission denied',
            'invalid uuid',
            '22p02',  // PostgreSQL invalid input syntax
            '23502',  // PostgreSQL not-null violation
            '23505',  // PostgreSQL unique violation
        ];

        for (const pattern of permanentPatterns) {
            if (error.match(new RegExp(pattern, 'i'))) {
                return {
                    type: 'PERMANENT',
                    shouldRetry: false,
                    reason: `Permanent error: ${errorMessage.slice(0, 100)}`,
                };
            }
        }

        // ⚡ Phase 4: HTTP 4xx errors (باستثناء 401 و 429 - تم التعامل معها)
        if (code >= 400 && code < 500 && code !== 401 && code !== 429) {
            return {
                type: 'PERMANENT',
                shouldRetry: false,
                reason: `HTTP ${code} error: ${errorMessage.slice(0, 100)}`,
            };
        }

        // Rate limit
        if (code === 429 || error.includes('rate limit') || error.includes('too many requests')) {
            return {
                type: 'RATE_LIMIT',
                shouldRetry: true,
                retryDelay: DELTA_SYNC_CONSTANTS.RATE_LIMIT_RETRY_DELAY_MS,
                reason: 'Rate limited, will retry in 30s',
            };
        }

        // Server errors
        if (code >= 500 || error.includes('internal server error') || error.includes('service unavailable')) {
            return {
                type: 'SERVER_ERROR',
                shouldRetry: true,
                retryDelay: DELTA_SYNC_CONSTANTS.SERVER_ERROR_RETRY_DELAY_MS,
                reason: 'Server error, will retry in 1 minute',
            };
        }

        // Unknown - default to transient (retry)
        return {
            type: 'UNKNOWN',
            shouldRetry: true,
            reason: 'Unknown error, will retry with backoff',
        };
    }

    /**
     * ⚡ Calculate exponential backoff delay with jitter
     */
    private calculateBackoffDelay(retryCount: number): number {
        const baseDelay = DELTA_SYNC_CONSTANTS.INITIAL_RETRY_DELAY_MS;
        const maxDelay = DELTA_SYNC_CONSTANTS.MAX_RETRY_DELAY_MS;

        const exponentialDelay = Math.pow(2, retryCount) * baseDelay;
        const jitter = exponentialDelay * 0.3 * (Math.random() - 0.5);

        return Math.min(exponentialDelay + jitter, maxDelay);
    }

    /**
     * ⚡ Save discarded operation to localStorage for diagnostics
     */
    private saveDiscardedOperation(
        entry: OutboxEntry,
        error: string,
        classification: ErrorClassification
    ): void {
        try {
            const discarded = JSON.parse(localStorage.getItem('discarded_operations') || '[]');
            discarded.push({
                id: entry.id,
                table_name: entry.table_name,
                operation: entry.operation,
                record_id: entry.record_id,
                error,
                error_type: classification.type,
                reason: classification.reason,
                discarded_at: new Date().toISOString(),
            });
            if (discarded.length > 50) discarded.shift();
            localStorage.setItem('discarded_operations', JSON.stringify(discarded));
        } catch {
            // Ignore localStorage errors
        }
    }

    /**
     * ⚡ CRITICAL FIX: نقل العملية الفاشلة إلى Dead Letter Queue
     * بدلاً من حذفها نهائياً - يسمح بالاستعادة بعد إصلاح المشكلة
     */
    private async moveToDeadLetterQueue(
        entry: OutboxEntry,
        error: string,
        classification: ErrorClassification,
        canRecover: boolean
    ): Promise<void> {
        try {
            const dlqId = crypto.randomUUID();
            const failedAt = new Date().toISOString();

            // تحديد ملاحظات الاستعادة
            let recoveryNotes = '';
            if (error.toLowerCase().includes('pgrst204') || error.toLowerCase().includes('schema cache')) {
                recoveryNotes = 'Schema mismatch - can be recovered after app update';
            } else if (error.toLowerCase().includes('validation')) {
                recoveryNotes = 'Validation error - may be recoverable after schema fix';
            } else {
                recoveryNotes = classification.reason || 'Unknown error';
            }

            await sqliteWriteQueue.write(
                `INSERT INTO sync_dead_letter_queue 
                 (id, original_outbox_id, table_name, operation, record_id, payload, local_seq, 
                  original_created_at, failed_at, retry_count, last_error, error_type, error_reason, 
                  status, can_recover, recovery_notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarantined', ?, ?)`,
                [
                    dlqId,
                    entry.id,
                    entry.table_name,
                    entry.operation,
                    entry.record_id,
                    entry.payload,
                    entry.local_seq,
                    entry.created_at,
                    failedAt,
                    entry.retry_count,
                    error,
                    classification.type,
                    classification.reason || '',
                    canRecover ? 1 : 0,
                    recoveryNotes
                ]
            );

            // حذف من Outbox بعد النقل
            await sqliteWriteQueue.write(`DELETE FROM sync_outbox WHERE id = ?`, [entry.id]);

            console.log(
                `[OutboxManager] 📦 Moved to Dead Letter Queue: ${entry.table_name}/${entry.record_id} ` +
                `(recoverable: ${canRecover}, type: ${classification.type})`
            );
        } catch (dlqError) {
            console.error('[OutboxManager] ❌ Failed to move to Dead Letter Queue:', dlqError);
            // ⚡ Fallback: حفظ في localStorage كـ backup
            this.saveDiscardedOperation(entry, error, classification);
        }
    }

    /**
     * ⚡ تحديد ما إذا كان الخطأ قابلاً للاستعادة
     */
    private isRecoverableError(error: string, classification: ErrorClassification): boolean {
        const errorLower = error.toLowerCase();
        
        // ⚡ Schema Errors قابلة للاستعادة بعد تحديث التطبيق
        if (errorLower.includes('pgrst204') || 
            errorLower.includes('schema cache') ||
            errorLower.includes('could not find the') ||
            (errorLower.includes('column') && errorLower.includes('does not exist'))) {
            return true;
        }

        // ⚡ Validation Errors قد تكون قابلة للاستعادة
        if (errorLower.includes('validation') && 
            !errorLower.includes('violates unique constraint') &&
            !errorLower.includes('violates not-null constraint')) {
            return true;
        }

        // ⚡ أخطاء JWT أو Authentication غير قابلة للاستعادة (تحتاج إعادة تسجيل دخول)
        if (errorLower.includes('jwt expired') || 
            errorLower.includes('invalid jwt') ||
            errorLower.includes('not authenticated') ||
            errorLower.includes('permission denied')) {
            return false;
        }

        // ⚡ Default: غير قابلة للاستعادة إلا إذا كانت Schema Error
        return false;
    }

    /**
     * ⚡ استعادة عمليات من Dead Letter Queue (بعد إصلاح المشكلة)
     */
    async recoverFromDeadLetterQueue(filter?: {
        tableName?: string;
        errorType?: string;
        canRecover?: boolean;
    }): Promise<number> {
        let query = `SELECT * FROM sync_dead_letter_queue WHERE can_recover = 1`;
        const params: any[] = [];

        if (filter?.tableName) {
            query += ` AND table_name = ?`;
            params.push(filter.tableName);
        }
        if (filter?.errorType) {
            query += ` AND error_type = ?`;
            params.push(filter.errorType);
        }
        if (filter?.canRecover !== undefined) {
            query += ` AND can_recover = ?`;
            params.push(filter.canRecover ? 1 : 0);
        }

        const dlqEntries = await sqliteWriteQueue.read<any[]>(query, params);

        if (dlqEntries.length === 0) {
            console.log('[OutboxManager] ℹ️ No recoverable entries in Dead Letter Queue');
            return 0;
        }

        let recoveredCount = 0;

        for (const dlqEntry of dlqEntries) {
            try {
                // إعادة إضافة إلى Outbox
                await sqliteWriteQueue.write(
                    `INSERT INTO sync_outbox 
                     (id, table_name, operation, record_id, payload, local_seq, created_at, 
                      retry_count, last_error, next_retry_at, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'pending')`,
                    [
                        crypto.randomUUID(), // ID جديد
                        dlqEntry.table_name,
                        dlqEntry.operation,
                        dlqEntry.record_id,
                        dlqEntry.payload,
                        dlqEntry.local_seq,
                        new Date().toISOString()
                    ]
                );

                // تحديث حالة DLQ
                await sqliteWriteQueue.write(
                    `UPDATE sync_dead_letter_queue 
                     SET status = 'recovered', recovery_notes = ? 
                     WHERE id = ?`,
                    [`Recovered at ${new Date().toISOString()}`, dlqEntry.id]
                );

                recoveredCount++;
            } catch (recoverError) {
                console.error(`[OutboxManager] ❌ Failed to recover DLQ entry ${dlqEntry.id}:`, recoverError);
            }
        }

        if (recoveredCount > 0) {
            console.log(`[OutboxManager] ✅ Recovered ${recoveredCount} entries from Dead Letter Queue`);
        }

        return recoveredCount;
    }

    /**
     * ⚡ الحصول على إحصائيات Dead Letter Queue
     */
    async getDeadLetterQueueStats(): Promise<{
        total: number;
        recoverable: number;
        nonRecoverable: number;
        byTable: Record<string, number>;
        byErrorType: Record<string, number>;
    }> {
        const [total, recoverable, byTable, byErrorType] = await Promise.all([
            sqliteWriteQueue.read<{ count: number }[]>(
                `SELECT COUNT(*) as count FROM sync_dead_letter_queue`
            ),
            sqliteWriteQueue.read<{ count: number }[]>(
                `SELECT COUNT(*) as count FROM sync_dead_letter_queue WHERE can_recover = 1`
            ),
            sqliteWriteQueue.read<{ table_name: string; count: number }[]>(
                `SELECT table_name, COUNT(*) as count FROM sync_dead_letter_queue GROUP BY table_name`
            ),
            sqliteWriteQueue.read<{ error_type: string; count: number }[]>(
                `SELECT error_type, COUNT(*) as count FROM sync_dead_letter_queue GROUP BY error_type`
            )
        ]);

        const byTableMap: Record<string, number> = {};
        for (const row of byTable) {
            byTableMap[row.table_name] = row.count;
        }

        const byErrorTypeMap: Record<string, number> = {};
        for (const row of byErrorType) {
            byErrorTypeMap[row.error_type] = row.count;
        }

        return {
            total: total[0]?.count || 0,
            recoverable: recoverable[0]?.count || 0,
            nonRecoverable: (total[0]?.count || 0) - (recoverable[0]?.count || 0),
            byTable: byTableMap,
            byErrorType: byErrorTypeMap
        };
    }
}

// ============================================
// 📤 Export Singleton
// ============================================

export const outboxManager = new OutboxManager();
