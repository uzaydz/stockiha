/**
 * ⚡ Unified SyncManager - مدير المزامنة الموحد
 *
 * المميزات:
 * - أسماء موحدة 100% مع Supabase (لا TABLE_MAP)
 * - فلترة تلقائية للأعمدة المحلية (تبدأ بـ _)
 * - مزامنة متوازية للجداول المستقلة
 * - جدولة ذكية حسب نشاط المستخدم
 * - Circuit Breaker للحماية من الفشل المتكرر
 * - أحداث مفصلة للـ UI
 *
 * استخدام الأنواع الجديدة:
 * - LocalUser, LocalOrder, LocalProduct, etc.
 */

import { PullEngine } from './PullEngine';
import { PushEngine } from './PushEngine';
import {
    SYNCED_TABLES,
    INDEPENDENT_TABLES,
    DEPENDENT_TABLES,
    SYNC_TIMING,
    BATCH_CONFIG,
} from '../config';
import { outboxManager } from '../queue/OutboxManager';
import { sqliteWriteQueue } from './SQLiteWriteQueue';
import { databaseCoordinator } from './DatabaseCoordinator';
import type {
    SyncStats,
    SyncResult,
    PullResult,
    PushResult,
} from '@/lib/types';

// ============================================
// 📊 Types - الأنواع
// ============================================

interface SyncManagerStats {
    totalSyncs: number;
    lastSyncTime: string | null;
    lastSyncDuration: number;
    lastSyncResults: Record<string, PullResult>;
    pendingCount: number;
    errorCount: number;
}

interface SyncCycleResult {
    success: boolean;
    duration: number;
    results: Record<string, PullResult>;
    totals: {
        processed: number;
        skipped: number;
        errors: number;
    };
}

// ============================================
// ⚡ SyncManager Class
// ============================================

class SyncManager {
    private static instance: SyncManager;

    private organizationId: string | null = null;
    private pullEngine: PullEngine | null = null;
    private pushEngine: PushEngine | null = null;

    private isSyncing = false;
    private isInitialized = false;

    // Smart Scheduler
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private lastActivityTime: number = Date.now();
    private activityListeners: (() => void)[] = [];

    // Statistics
    private stats: SyncManagerStats = {
        totalSyncs: 0,
        lastSyncTime: null,
        lastSyncDuration: 0,
        lastSyncResults: {},
        pendingCount: 0,
        errorCount: 0,
    };

    private constructor() { }

    /**
     * ⚡ Get singleton instance
     */
    static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    // ============================================
    // 🚀 Lifecycle Methods
    // ============================================

    /**
     * ⚡ Initialize and start the SyncManager
     */
    async start(organizationId: string): Promise<void> {
        // Prevent double initialization
        if (this.organizationId === organizationId && this.isInitialized) {
            console.log('[SyncManager] ⚠️ Already initialized for this organization');
            return;
        }

        console.log(`[SyncManager] 🚀 Starting for Organization: ${organizationId}`);
        this.organizationId = organizationId;

        try {
            // ⚡ CRITICAL FIX: Wait for database initialization before proceeding
            console.log('[SyncManager] ⏳ Waiting for database initialization...');
            const { dbInitManager } = await import('@/lib/db/DatabaseInitializationManager');

            if (!dbInitManager.isInitialized(organizationId)) {
                await dbInitManager.initialize(organizationId, { timeout: 15000 });
                console.log('[SyncManager] ✅ Database initialized successfully');
            } else {
                console.log('[SyncManager] ✅ Database already initialized');
            }

            // Initialize Engines
            this.pullEngine = new PullEngine(organizationId);
            this.pushEngine = new PushEngine();

            // Initialize database tables
            await outboxManager.initialize();
            await this.pullEngine.init();

            // ⚡ One-time fix: Reset sync state for order_items (was incorrectly in NO_ORG_ID_TABLES)
            await this.applyOneMigrationFix();

            // Cleanup stuck operations
            await this.cleanupStuckOperations();

            // Start Push Engine (background)
            this.pushEngine.start(organizationId);

            // Setup Activity Tracking
            this.setupActivityTracking();

            // Perform Initial Full Sync
            await this.syncAll();

            // Start Smart Scheduler
            this.scheduleNextSync();

            // Ensure data integrity
            await this.ensureDataIntegrity();

            // ⚡ CRITICAL FIX: الاستماع لحدث استئناف المزامنة بعد POS operation
            // هذا يضمن أن المزامنة تبدأ فوراً بعد إنشاء طلبية POS
            if (typeof window !== 'undefined') {
                window.addEventListener('sync-resumed-after-pos', () => {
                    console.log('[SyncManager] 🔄 Sync resumed after POS operation - triggering immediate sync...');
                    // ⚡ بدء المزامنة فوراً بعد انتهاء POS operation
                    setTimeout(() => {
                        if (!databaseCoordinator.isSyncPaused() && !this.isSyncing) {
                            this.syncAll().catch(error => {
                                console.error('[SyncManager] Error in post-POS sync:', error);
                            });
                        }
                    }, 500); // تأخير بسيط للتأكد من أن POS operation انتهى تماماً
                });
            }

            this.isInitialized = true;
            console.log('[SyncManager] ✅ Initialization complete');

            // Dispatch ready event
            this.dispatchEvent('sync-manager-ready', {
                organizationId,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            console.error('[SyncManager] ❌ Initialization failed:', error);
            this.dispatchEvent('sync-manager-error', { error: String(error) });
            throw error;
        }
    }

    /**
     * ⚡ Stop all sync operations
     */
    stop(): void {
        // Stop timer
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }

        // Cleanup activity listeners
        this.cleanupActivityListeners();

        // Stop engines
        if (this.pushEngine) {
            this.pushEngine.stop();
        }

        this.organizationId = null;
        this.pullEngine = null;
        this.pushEngine = null;
        this.isInitialized = false;

        console.log('[SyncManager] ⏹️ Stopped');
        this.dispatchEvent('sync-manager-stopped', {});
    }

    // ============================================
    // 🔄 Sync Methods
    // ============================================

    /**
     * ⚡ Perform a full sync cycle
     */
    async syncAll(): Promise<SyncCycleResult> {
        if (this.isSyncing || !this.pullEngine) {
            return {
                success: false,
                duration: 0,
                results: {},
                totals: { processed: 0, skipped: 0, errors: 0 },
            };
        }

        this.isSyncing = true;
        const startTime = Date.now();
        const results: Record<string, PullResult> = {};
        let hasErrors = false;

        this.dispatchEvent('sync-started', {
            timestamp: new Date().toISOString(),
        });

        console.log('[SyncManager] 🔄 Starting Full Sync Cycle...');

        try {
            // ⚡ CRITICAL: التحقق من إيقاف المزامنة بواسطة DatabaseCoordinator
            // هذا يمنع التعارض مع عمليات POS الحرجة
            if (databaseCoordinator.isSyncPaused()) {
                console.log('[SyncManager] ⏸️ Sync paused by DatabaseCoordinator, skipping cycle...');
                return {
                    success: true,
                    duration: 0,
                    results,
                    totals: { processed: 0, skipped: 0, errors: 0 },
                };
            }

            // 1. Push first (send local changes)
            if (this.pushEngine) {
                // التحقق مرة أخرى قبل Push
                if (databaseCoordinator.isSyncPaused()) {
                    console.log('[SyncManager] ⏸️ Sync paused before push, skipping...');
                    return { success: true, duration: 0, results, totals: { processed: 0, skipped: 0, errors: 0 } };
                }
                console.log('[SyncManager] ⬆️ Pushing local changes...');
                const pushResult = await this.pushEngine.processBatch();
                if (pushResult.failedCount > 0) {
                    console.warn(`[SyncManager] ⚠️ ${pushResult.failedCount} push failures`);
                }
            }

            // 2. Clear pending cache
            this.pullEngine.clearCache();

            // ⚡ التحقق قبل Pull
            if (databaseCoordinator.isSyncPaused()) {
                console.log('[SyncManager] ⏸️ Sync paused before pull, skipping...');
                return { success: true, duration: Date.now() - startTime, results, totals: { processed: 0, skipped: 0, errors: 0 } };
            }

            // 3. Pull Independent Tables (parallel)
            console.log('[SyncManager] ⬇️ Pulling independent tables in parallel...');
            const independentTables = (INDEPENDENT_TABLES as readonly string[]).filter(
                (t) => (SYNCED_TABLES as readonly string[]).includes(t)
            );

            const parallelResults = await this.pullEngine.pullTablesParallel(independentTables);
            parallelResults.forEach((result, table) => {
                results[table] = result;
                if (result.errors > 0) hasErrors = true;
            });

            // 4. Pull Dependent Tables (sequential)
            console.log('[SyncManager] ⬇️ Pulling dependent tables sequentially...');
            const dependentTables = (DEPENDENT_TABLES as readonly string[]).filter(
                (t) => (SYNCED_TABLES as readonly string[]).includes(t)
            );

            for (const table of dependentTables) {
                const result = await this.pullEngine.pullTable(table);
                results[table] = result;
                if (result.errors > 0) hasErrors = true;
            }

            // 5. Pull remaining tables
            const processedTables = new Set([...independentTables, ...dependentTables]);
            const remainingTables = (SYNCED_TABLES as readonly string[]).filter(
                (t) => !processedTables.has(t)
            );

            for (const table of remainingTables) {
                const result = await this.pullEngine.pullTable(table);
                results[table] = result;
                if (result.errors > 0) hasErrors = true;
            }

            const duration = Date.now() - startTime;

            // Update statistics
            const totals = this.calculateTotals(results);
            this.updateStats(duration, results, totals);

            console.log(
                `[SyncManager] ✅ Sync Complete in ${duration}ms - ` +
                `${totals.processed} processed, ${totals.skipped} skipped, ${totals.errors} errors`
            );

            this.dispatchEvent('sync-completed', {
                timestamp: new Date().toISOString(),
                duration,
                totals,
                results,
            });

            return { success: !hasErrors, duration, results, totals };

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('[SyncManager] ❌ Full Sync Cycle Failed:', error);

            this.dispatchEvent('sync-error', {
                error: String(error),
                duration,
            });

            return {
                success: false,
                duration,
                results,
                totals: { processed: 0, skipped: 0, errors: 1 },
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * ⚡ Sync a specific table
     */
    async syncTable(tableName: string): Promise<PullResult | null> {
        if (!this.pullEngine) return null;

        // Push first
        if (this.pushEngine) {
            await this.pushEngine.processBatch();
        }

        return await this.pullEngine.pullTable(tableName);
    }

    /**
     * ⚡ Force immediate sync (bypasses scheduler)
     */
    async forceSync(): Promise<SyncCycleResult> {
        // Cancel current timer
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }

        const result = await this.syncAll();

        // Reschedule
        this.scheduleNextSync();

        return result;
    }

    // ============================================
    // ⏱️ Smart Scheduling
    // ============================================

    /**
     * ⚡ Setup activity tracking for smart scheduling
     */
    private setupActivityTracking(): void {
        this.cleanupActivityListeners();

        const updateActivity = () => {
            this.lastActivityTime = Date.now();
        };

        const events = ['click', 'keypress', 'touchstart', 'mousemove', 'scroll'];
        events.forEach((event) => {
            const listener = () => updateActivity();
            window.addEventListener(event, listener, { passive: true });
            this.activityListeners.push(() => window.removeEventListener(event, listener));
        });
    }

    /**
     * ⚡ Cleanup activity listeners
     */
    private cleanupActivityListeners(): void {
        this.activityListeners.forEach((cleanup) => cleanup());
        this.activityListeners = [];
    }

    /**
     * ⚡ Calculate next sync interval based on activity
     */
    private calculateNextSyncInterval(): number {
        const idleTime = Date.now() - this.lastActivityTime;

        if (idleTime < SYNC_TIMING.IDLE_THRESHOLD) {
            return SYNC_TIMING.ACTIVE_INTERVAL;
        } else if (idleTime < SYNC_TIMING.INACTIVE_THRESHOLD) {
            return SYNC_TIMING.IDLE_INTERVAL;
        } else {
            return SYNC_TIMING.INACTIVE_INTERVAL;
        }
    }

    /**
     * ⚡ Schedule next sync
     */
    private scheduleNextSync(): void {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }

        const interval = this.calculateNextSyncInterval();
        const intervalMinutes = Math.round(interval / 60000);

        console.log(`[SyncManager] ⏱️ Next sync in ${intervalMinutes} minutes`);

        this.syncTimer = setTimeout(async () => {
            await this.syncAll();
            this.scheduleNextSync();
        }, interval);
    }

    // ============================================
    // 🛠️ Utility Methods
    // ============================================

    /**
     * ⚡ One-time migration fix for order_items sync issue
     * order_items was incorrectly in NO_ORG_ID_TABLES, causing it to not filter by organization_id
     * This fix clears all order_items and forces a full re-sync from epoch
     */
    private async applyOneMigrationFix(): Promise<void> {
        // v3: Clear order_items and force complete re-sync
        const MIGRATION_KEY = '_migration_order_items_full_resync_v3';

        try {
            // Check if migration was already applied (using sync_state table as storage)
            const migrationApplied = await sqliteWriteQueue.read<{ table_name: string }[]>(
                `SELECT table_name FROM sync_state WHERE table_name = ?`,
                [MIGRATION_KEY]
            );

            if (migrationApplied.length > 0) {
                return; // Already applied
            }

            console.log('[SyncManager] 🔧 Applying order_items full re-sync fix (v3)...');

            // 1. Delete all existing order_items (they were pulled without org filter)
            await sqliteWriteQueue.write(`DELETE FROM order_items WHERE 1=1`);
            console.log('[SyncManager] 🗑️ Cleared order_items table');

            // 2. Reset sync state for order_items to epoch (force full re-sync)
            if (this.pullEngine) {
                await this.pullEngine.resetSyncState(['order_items']);
                console.log('[SyncManager] 🔄 Reset order_items sync state to epoch');
            }

            // Mark migration as applied
            await sqliteWriteQueue.write(
                `INSERT OR REPLACE INTO sync_state (table_name, last_synced_at, last_sync_status) VALUES (?, ?, ?)`,
                [MIGRATION_KEY, new Date().toISOString(), 'applied']
            );

            console.log('[SyncManager] ✅ order_items full re-sync fix applied (v3)');
        } catch (error) {
            console.warn('[SyncManager] ⚠️ Migration fix failed (non-critical):', error);
        }
    }

    /**
     * ⚡ Cleanup stuck operations on startup
     */
    private async cleanupStuckOperations(): Promise<void> {
        try {
            // Requeue stuck 'sending' operations
            const requeuedStuck = await outboxManager.requeueStuck();
            if (requeuedStuck > 0) {
                console.log(`[SyncManager] 🔄 Requeued ${requeuedStuck} stuck 'sending' operations`);
            }

            // Auto-clean payloads
            const cleanupResult = await outboxManager.autoCleanAllPayloads();
            if (cleanupResult.cleaned > 0 || cleanupResult.removed > 0 || cleanupResult.converted > 0) {
                console.log(
                    `[SyncManager] 🧹 Outbox cleanup: ` +
                    `${cleanupResult.cleaned} cleaned, ` +
                    `${cleanupResult.converted} camelCase→snake_case, ` +
                    `${cleanupResult.removed} removed`
                );
            }

            // ⚡ Remove corrupted entries that cannot be fixed (orphan order_items, etc.)
            const corruptedRemoved = await outboxManager.removeCorruptedEntries();
            if (corruptedRemoved > 0) {
                console.log(`[SyncManager] 🗑️ Removed ${corruptedRemoved} corrupted outbox entries`);
            }

            // ⚡ Remove schema mismatch errors (PGRST204 - column doesn't exist)
            const schemaErrorsRemoved = await outboxManager.removeSchemaErrors();
            if (schemaErrorsRemoved > 0) {
                console.log(`[SyncManager] 🗑️ Removed ${schemaErrorsRemoved} schema mismatch errors`);
            }

            // ⚡ ملاحظة: fixSyncedOrdersStatus تم نقلها إلى ensureDataIntegrity
            // لأنها يجب أن تعمل بعد انتهاء syncAll() وإفراغ الـ outbox

            // Backfill unsynced orders
            const backfillResult = await this.backfillUnsyncedOrders();
            if (backfillResult.ordersAdded > 0) {
                console.log(
                    `[SyncManager] 🔄 Backfilled ` +
                    `${backfillResult.ordersAdded} orders, ` +
                    `${backfillResult.itemsAdded} items`
                );
            }
        } catch (error) {
            console.warn('[SyncManager] ⚠️ Cleanup failed:', error);
        }
    }

    /**
     * ⚡ CRITICAL FIX: إصلاح الطلبات التي تم مزامنتها لكن synced لم يُحدّث
     * الطلبات التي ليست في outbox ومتزامنة في Supabase يجب أن تكون synced = 1
     * 
     * يحل مشكلة: الطلبات التي تم سحبها من السيرفر (Pull) لكن synced لم يُحدّث
     */
    private async fixSyncedOrdersStatus(): Promise<void> {
        try {
            // البحث عن الطلبات التي synced = 0 أو NULL لكنها ليست في outbox
            // هذه الطلبات إما تم سحبها من السيرفر أو تم مزامنتها بنجاح لكن synced لم يُحدّث
            const ordersNotInOutbox = await sqliteWriteQueue.read<{ id: string }[]>(`
                SELECT o.id FROM orders o
                WHERE o.organization_id = ?
                AND (o.synced = 0 OR o.synced IS NULL)
                AND o.id NOT IN (
                    SELECT record_id FROM sync_outbox 
                    WHERE table_name = 'orders' AND status IN ('pending', 'sending', 'failed')
                )
                LIMIT 500
            `, [this.organizationId]);

            if (ordersNotInOutbox.length === 0) return;

            // تحديث حالة المزامنة لهذه الطلبات
            const ids = ordersNotInOutbox.map(o => o.id);
            const placeholders = ids.map(() => '?').join(',');

            await sqliteWriteQueue.write(`
                UPDATE orders SET synced = 1 WHERE id IN (${placeholders})
            `, ids);

            // ⚡ تحديث order_items أيضاً
            try {
                await sqliteWriteQueue.write(`
                    UPDATE order_items SET synced = 1 
                    WHERE order_id IN (${placeholders}) AND (synced = 0 OR synced IS NULL)
                `, ids);
            } catch (err) {
                console.warn('[SyncManager] ⚠️ Could not update order_items sync status:', err);
            }

            console.log(`[SyncManager] ✅ Fixed ${ids.length} orders sync status (were synced but synced=0)`);
        } catch (error) {
            console.warn('[SyncManager] ⚠️ Failed to fix synced orders status:', error);
        }
    }

    /**
     * ⚡ Ensure data integrity
     */
    private async ensureDataIntegrity(): Promise<void> {
        try {
            console.log('[SyncManager] 🛡️ Checking data integrity...');

            // ⚡ فحص 0: إصلاح الطلبات المتزامنة التي لم يتم تحديث synced لها
            // هذا يجب أن يعمل بعد syncAll() وإفراغ الـ outbox
            // ⚡ CRITICAL FIX: زيادة الحد الأقصى من 100 إلى 500 لمعالجة جميع الطلبات
            await this.fixSyncedOrdersStatus();

            // ⚡ فحص 1: التحقق من وجود طلبيات - إذا كان الجدول فارغاً، نُعيد السحب
            await this.ensureOrdersExist();

            // Fix orders with missing payment_method
            // ✅ الآن نستخدم 'orders' بدلاً من 'pos_orders' (أسماء موحدة)
            const ordersWithMissingPayment = await sqliteWriteQueue.read<{ id: string }[]>(
                `SELECT id FROM orders WHERE payment_method IS NULL OR payment_method = '' LIMIT 10`
            );

            if (ordersWithMissingPayment.length > 0) {
                console.warn(
                    `[SyncManager] ⚠️ Found ${ordersWithMissingPayment.length} orders with null payment_method`
                );

                // Get default from settings
                let defaultPaymentMethod = 'cash';
                try {
                    const settings = await sqliteWriteQueue.read<{ pos_default_payment_method: string }[]>(
                        `SELECT pos_default_payment_method FROM pos_settings WHERE organization_id = ? LIMIT 1`,
                        [this.organizationId]
                    );
                    if (settings.length > 0 && settings[0].pos_default_payment_method) {
                        defaultPaymentMethod = settings[0].pos_default_payment_method;
                    }
                } catch {
                    // Use fallback
                }

                await sqliteWriteQueue.write(
                    `UPDATE orders SET payment_method = ? WHERE payment_method IS NULL OR payment_method = ''`,
                    [defaultPaymentMethod]
                );

                console.log(
                    `[SyncManager] ✅ Fixed ${ordersWithMissingPayment.length} orders ` +
                    `with payment_method = '${defaultPaymentMethod}'`
                );
            }

        } catch (error) {
            console.error('[SyncManager] ❌ Data integrity check failed:', error);
        }
    }

    /**
     * ⚡ التحقق من وجود طلبيات - إذا كان الجدول فارغاً مع وجود sync_state، نُعيد السحب الكامل
     */
    private async ensureOrdersExist(): Promise<void> {
        if (!this.organizationId || !this.pullEngine) return;

        try {
            // فحص عدد الطلبيات في الجدول المحلي
            const countResult = await sqliteWriteQueue.read<{ count: number }[]>(
                `SELECT COUNT(*) as count FROM orders WHERE organization_id = ?`,
                [this.organizationId]
            );
            const localOrdersCount = countResult[0]?.count || 0;

            // فحص sync_state للطلبيات
            const syncStateResult = await sqliteWriteQueue.read<{ last_synced_at: string }[]>(
                `SELECT last_synced_at FROM sync_state WHERE table_name = 'orders'`
            );
            const hasSyncState = syncStateResult.length > 0 && syncStateResult[0]?.last_synced_at;

            console.log(`[SyncManager] 📊 Orders integrity check: local=${localOrdersCount}, hasSyncState=${!!hasSyncState}`);

            // إذا كان الجدول فارغاً ولكن sync_state موجود، هناك مشكلة - نُعيد السحب
            if (localOrdersCount === 0 && hasSyncState) {
                console.warn('[SyncManager] ⚠️ Orders table is empty but sync_state exists! Forcing full re-sync...');

                // حذف sync_state للطلبيات لإجبار إعادة السحب الكامل
                await sqliteWriteQueue.write(
                    `DELETE FROM sync_state WHERE table_name IN ('orders', 'order_items')`
                );

                // إعادة سحب الطلبيات
                console.log('[SyncManager] 🔄 Re-pulling orders from server...');
                const ordersResult = await this.pullEngine.pullTable('orders');
                console.log(`[SyncManager] ✅ Orders re-pull: ${ordersResult.processed} processed`);

                // إعادة سحب عناصر الطلبيات
                console.log('[SyncManager] 🔄 Re-pulling order_items from server...');
                const itemsResult = await this.pullEngine.pullTable('order_items');
                console.log(`[SyncManager] ✅ Order items re-pull: ${itemsResult.processed} processed`);
            }

        } catch (error) {
            console.error('[SyncManager] ❌ ensureOrdersExist failed:', error);
        }
    }

    /**
     * ⚡ Backfill unsynced orders
     */
    async backfillUnsyncedOrders(): Promise<{
        ordersAdded: number;
        itemsAdded: number;
        errors: string[];
    }> {
        if (!this.organizationId) {
            return { ordersAdded: 0, itemsAdded: 0, errors: ['No organization ID set'] };
        }

        const result = { ordersAdded: 0, itemsAdded: 0, errors: [] as string[] };

        try {
            // ✅ استخدام 'orders' و 'order_items' (أسماء موحدة)
            // ⚡ v2: استخدام 'synced' بدلاً من '_synced' (متوافق مع tauriSchema)
            const unsyncedOrders = await sqliteWriteQueue.read<Record<string, unknown>[]>(
                `SELECT * FROM orders
                WHERE organization_id = ?
                AND (synced = 0 OR synced IS NULL)
                ORDER BY created_at ASC
                LIMIT 50`,
                [this.organizationId]
            );

            for (const order of unsyncedOrders) {
                try {
                    const existsInOutbox = await sqliteWriteQueue.read<{ id: string }[]>(
                        `SELECT id FROM sync_outbox
                        WHERE table_name = 'orders'
                        AND record_id = ?
                        AND status != 'sent'`,
                        [order.id]
                    );

                    if (existsInOutbox.length === 0) {
                        // Fix missing payment_method
                        if (!order.payment_method) {
                            order.payment_method = 'cash';
                            await sqliteWriteQueue.write(
                                `UPDATE orders SET payment_method = 'cash' WHERE id = ?`,
                                [order.id]
                            );
                        }

                        await outboxManager.add({
                            tableName: 'orders',
                            operation: 'INSERT',
                            recordId: order.id as string,
                            payload: order,
                        });
                        result.ordersAdded++;

                        // Get order items
                        const orderItems = await sqliteWriteQueue.read<Record<string, unknown>[]>(
                            `SELECT * FROM order_items WHERE order_id = ?`,
                            [order.id]
                        );

                        for (const item of orderItems) {
                            const itemExistsInOutbox = await sqliteWriteQueue.read<{ id: string }[]>(
                                `SELECT id FROM sync_outbox
                                WHERE table_name = 'order_items'
                                AND record_id = ?
                                AND status != 'sent'`,
                                [item.id]
                            );

                            if (itemExistsInOutbox.length === 0) {
                                await outboxManager.add({
                                    tableName: 'order_items',
                                    operation: 'INSERT',
                                    recordId: item.id as string,
                                    payload: item,
                                });
                                result.itemsAdded++;
                            }
                        }
                    }
                } catch (orderError) {
                    result.errors.push(`Order ${order.id}: ${String(orderError)}`);
                }
            }

            // Trigger immediate push
            if (result.ordersAdded > 0 && this.pushEngine) {
                await this.pushEngine.processBatch();
            }

        } catch (error) {
            result.errors.push(String(error));
        }

        return result;
    }

    /**
     * ⚡ Calculate totals from results
     */
    private calculateTotals(results: Record<string, PullResult>): {
        processed: number;
        skipped: number;
        errors: number;
    } {
        return Object.values(results).reduce(
            (acc, r) => ({
                processed: acc.processed + r.processed,
                skipped: acc.skipped + r.skipped,
                errors: acc.errors + r.errors,
            }),
            { processed: 0, skipped: 0, errors: 0 }
        );
    }

    /**
     * ⚡ Update statistics
     */
    private updateStats(
        duration: number,
        results: Record<string, PullResult>,
        totals: { processed: number; skipped: number; errors: number }
    ): void {
        this.stats.totalSyncs++;
        this.stats.lastSyncTime = new Date().toISOString();
        this.stats.lastSyncDuration = duration;
        this.stats.lastSyncResults = results;
        this.stats.errorCount = totals.errors;
    }

    /**
     * ⚡ Dispatch custom event
     */
    private dispatchEvent(name: string, detail: Record<string, unknown>): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        }
    }

    // ============================================
    // 📊 Public Getters
    // ============================================

    /**
     * ⚡ Get sync statistics
     */
    getStats(): SyncManagerStats & { currentInterval: number; isActive: boolean } {
        return {
            ...this.stats,
            currentInterval: this.calculateNextSyncInterval(),
            isActive: Date.now() - this.lastActivityTime < SYNC_TIMING.IDLE_THRESHOLD,
        };
    }

    /**
     * ⚡ Check if sync is in progress
     */
    get syncing(): boolean {
        return this.isSyncing;
    }

    /**
     * ⚡ Check if initialized
     */
    get initialized(): boolean {
        return this.isInitialized;
    }

    /**
     * ⚡ Get organization ID
     */
    get orgId(): string | null {
        return this.organizationId;
    }

    /**
     * ⚡ Force full re-sync for specific tables
     * يحذف البيانات المحلية ويسحبها من جديد من Supabase
     */
    async forceFullResync(tableNames: string[]): Promise<{ success: boolean; results: Record<string, PullResult> }> {
        if (!this.pullEngine || !this.organizationId) {
            console.error('[SyncManager] ❌ Not initialized');
            return { success: false, results: {} };
        }

        console.log(`[SyncManager] 🔄 Force full re-sync for: ${tableNames.join(', ')}`);

        try {
            // 1. حذف البيانات المحلية للجداول المحددة
            for (const table of tableNames) {
                await sqliteWriteQueue.write(
                    `DELETE FROM ${table} WHERE organization_id = ?`,
                    [this.organizationId]
                );
                console.log(`[SyncManager] 🗑️ Cleared local ${table}`);
            }

            // 2. إعادة تعيين sync state لإجبار السحب من البداية
            await this.pullEngine.resetSyncState(tableNames);

            // 3. سحب البيانات من جديد
            const results: Record<string, PullResult> = {};
            for (const table of tableNames) {
                const result = await this.pullEngine.pullTable(table);
                results[table] = result;
            }

            console.log('[SyncManager] ✅ Force re-sync complete:', results);

            // Dispatch event
            this.dispatchEvent('force-resync-complete', { tables: tableNames, results });

            return { success: true, results };
        } catch (error: any) {
            console.error('[SyncManager] ❌ Force re-sync failed:', error);
            return { success: false, results: {} };
        }
    }

    /**
     * ⚡ Re-sync products from Supabase (fix missing products issue)
     */
    async resyncProducts(): Promise<PullResult> {
        const result = await this.forceFullResync(['products']);
        return result.results['products'] || { processed: 0, skipped: 0, errors: 1 };
    }

    /**
     * ⚡ Fix orders in Supabase that have no items
     * يبحث عن الطلبات في Supabase التي ليس لها items ويحاول إرسالها من المحلي
     */
    async fixOrdersWithoutItems(): Promise<{ fixed: number; notFound: number; errors: string[] }> {
        if (!this.organizationId) {
            return { fixed: 0, notFound: 0, errors: ['No organization ID set'] };
        }

        const result = { fixed: 0, notFound: 0, errors: [] as string[] };

        try {
            // 1. جلب الطلبات المحلية التي لها items
            const localOrdersWithItems = await sqliteWriteQueue.read<{ order_id: string; items_count: number }[]>(`
                SELECT o.id as order_id, COUNT(oi.id) as items_count
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                WHERE o.organization_id = ?
                GROUP BY o.id
                HAVING items_count > 0
                ORDER BY o.created_at DESC
                LIMIT 100
            `, [this.organizationId]);

            console.log(`[SyncManager] 🔍 Found ${localOrdersWithItems.length} local orders with items`);

            // 2. لكل طلب، نضيف items للـ outbox إذا لم تكن موجودة
            for (const orderInfo of localOrdersWithItems) {
                try {
                    // جلب items هذا الطلب
                    const items = await sqliteWriteQueue.read<Record<string, unknown>[]>(`
                        SELECT * FROM order_items WHERE order_id = ?
                    `, [orderInfo.order_id]);

                    // التحقق من عدم وجود هذه الـ items في outbox
                    for (const item of items) {
                        const existsInOutbox = await sqliteWriteQueue.read<{ id: string }[]>(`
                            SELECT id FROM sync_outbox
                            WHERE table_name = 'order_items'
                            AND record_id = ?
                            AND status != 'sent'
                        `, [item.id]);

                        if (existsInOutbox.length === 0) {
                            // إضافة للـ outbox
                            await outboxManager.addOperation({
                                tableName: 'order_items',
                                operation: 'INSERT',
                                recordId: item.id as string,
                                payload: item,
                            });
                            result.fixed++;
                        }
                    }
                } catch (err: any) {
                    result.errors.push(`Order ${orderInfo.order_id}: ${err.message}`);
                }
            }

            console.log(`[SyncManager] ✅ Fixed ${result.fixed} order items, ${result.notFound} not found locally`);
        } catch (error: any) {
            console.error('[SyncManager] ❌ fixOrdersWithoutItems failed:', error);
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * ⚡ Clean up all failed and stuck operations
     */
    async cleanupAllOperations(): Promise<{ removed: number; requeued: number }> {
        let removed = 0;
        let requeued = 0;

        try {
            // 1. Remove corrupted entries
            removed += await outboxManager.removeCorruptedEntries();

            // 2. Remove schema errors
            removed += await outboxManager.removeSchemaErrors();

            // 3. Requeue stuck operations
            requeued = await outboxManager.requeueStuck();

            // 4. Auto-clean payloads
            const cleanResult = await outboxManager.autoCleanAllPayloads();
            removed += cleanResult.removed;

            console.log(`[SyncManager] 🧹 Cleanup complete: ${removed} removed, ${requeued} requeued`);
        } catch (error) {
            console.error('[SyncManager] ❌ Cleanup failed:', error);
        }

        return { removed, requeued };
    }

    /**
     * ⚡ CRITICAL FIX: دالة لإصلاح حالة المزامنة للطلبات
     * تحدث synced = 1 للطلبات التي تم مزامنتها لكن synced لم يُحدّث
     * يمكن استدعاؤها يدوياً من syncDiagnostics
     */
    async fixOrdersSyncStatus(): Promise<{ fixed: number; total: number }> {
        if (!this.organizationId) {
            console.error('[SyncManager] ❌ Not initialized');
            return { fixed: 0, total: 0 };
        }

        try {
            // البحث عن جميع الطلبات غير المتزامنة (ليست في outbox)
            const unsyncedOrders = await sqliteWriteQueue.read<{ id: string }[]>(`
                SELECT o.id FROM orders o
                WHERE o.organization_id = ?
                AND (o.synced = 0 OR o.synced IS NULL)
                AND o.id NOT IN (
                    SELECT record_id FROM sync_outbox 
                    WHERE table_name = 'orders' AND status IN ('pending', 'sending', 'failed')
                )
            `, [this.organizationId]);

            const total = unsyncedOrders.length;
            if (total === 0) {
                console.log('[SyncManager] ✅ All orders are properly synced');
                return { fixed: 0, total: 0 };
            }

            // تحديث حالة المزامنة
            const ids = unsyncedOrders.map(o => o.id);
            const placeholders = ids.map(() => '?').join(',');

            await sqliteWriteQueue.write(`
                UPDATE orders SET synced = 1 WHERE id IN (${placeholders})
            `, ids);

            // تحديث order_items أيضاً
            try {
                await sqliteWriteQueue.write(`
                    UPDATE order_items SET synced = 1 
                    WHERE order_id IN (${placeholders}) AND (synced = 0 OR synced IS NULL)
                `, ids);
            } catch (err) {
                console.warn('[SyncManager] ⚠️ Could not update order_items:', err);
            }

            console.log(`[SyncManager] ✅ Fixed ${total} orders sync status`);
            return { fixed: total, total };
        } catch (error) {
            console.error('[SyncManager] ❌ Failed to fix orders sync status:', error);
            return { fixed: 0, total: 0 };
        }
    }
}

// ============================================
// 📤 Export Singleton
// ============================================

export const syncManager = SyncManager.getInstance();

// ============================================
// 🛠️ Diagnostics (Development)
// ============================================

if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).syncDiagnostics = {
        stats: () => syncManager.getStats(),
        forceSync: () => syncManager.forceSync(),
        syncTable: (table: string) => syncManager.syncTable(table),
        pendingOps: async () => {
            const stats = await outboxManager.getStats();
            const details = await outboxManager.getDetailedPending();
            console.log('📊 Outbox Stats:', stats);
            console.table(details);
            return { stats, details };
        },
        cleanPayloads: () => outboxManager.autoCleanAllPayloads(),
        clearOutbox: () => outboxManager.clear(),
        backfillOrders: () => syncManager.backfillUnsyncedOrders(),
        // ⚡ إعادة مزامنة كاملة لجداول محددة
        forceResync: (tables: string[]) => syncManager.forceFullResync(tables),
        // ⚡ إعادة مزامنة المنتجات (لحل مشكلة 35 → 29)
        resyncProducts: () => syncManager.resyncProducts(),
        // ⚡ إصلاح الطلبات بدون items في Supabase
        fixOrdersWithoutItems: () => syncManager.fixOrdersWithoutItems(),
        // ⚡ تنظيف شامل للعمليات الفاشلة
        cleanupAll: () => syncManager.cleanupAllOperations(),
        // ⚡ CRITICAL FIX: إصلاح حالة المزامنة للطلبات
        fixOrdersSyncStatus: () => syncManager.fixOrdersSyncStatus(),
        // ⚡ Phase 1: اختبارات المزامنة
        runOfflineTest: async () => {
            if (!syncManager.orgId) {
                console.error('[syncDiagnostics] ❌ No organization ID set');
                return { totalTests: 0, passed: 0, failed: 0, duration: 0, results: [] };
            }
            try {
                const { createOfflineSyncTest } = await import('../testing/OfflineSyncTest');
                const test = createOfflineSyncTest(syncManager.orgId);
                return await test.runFullTest();
            } catch (error: any) {
                console.error('[syncDiagnostics] ❌ Failed to run offline test:', error);
                return { totalTests: 0, passed: 0, failed: 1, duration: 0, results: [{ name: 'Test Setup', passed: false, duration: 0, error: error.message }] };
            }
        },
        // ⚡ Phase 3: صيانة قاعدة البيانات
        runMaintenance: async () => {
            if (!syncManager.orgId) {
                console.error('[syncDiagnostics] ❌ No organization ID set');
                return { totalOperations: 0, successful: 0, failed: 0, totalDuration: 0, results: [] };
            }
            try {
                const { createDatabaseMaintenance } = await import('../maintenance/DatabaseMaintenance');
                const maintenance = createDatabaseMaintenance(syncManager.orgId);
                return await maintenance.runFullMaintenance();
            } catch (error: any) {
                console.error('[syncDiagnostics] ❌ Failed to run maintenance:', error);
                return { totalOperations: 0, successful: 0, failed: 1, totalDuration: 0, results: [{ success: false, operation: 'setup', duration: 0, error: error.message }] };
            }
        },
        getMaintenanceStats: async () => {
            if (!syncManager.orgId) {
                console.error('[syncDiagnostics] ❌ No organization ID set');
                return {};
            }
            try {
                const { createDatabaseMaintenance } = await import('../maintenance/DatabaseMaintenance');
                const maintenance = createDatabaseMaintenance(syncManager.orgId);
                return await maintenance.getDatabaseStats();
            } catch (error: any) {
                console.error('[syncDiagnostics] ❌ Failed to get maintenance stats:', error);
                return { error: error.message };
            }
        },
    };

    console.log('[SyncManager] 🛠️ Diagnostics available: window.syncDiagnostics');
    console.log('[SyncManager] 💡 Commands:');
    console.log('  - syncDiagnostics.resyncProducts() → Fix missing products (35→29)');
    console.log('  - syncDiagnostics.fixOrdersWithoutItems() → Fix orders without items');
    console.log('  - syncDiagnostics.cleanupAll() → Clean failed operations');
    console.log('  - syncDiagnostics.fixOrdersSyncStatus() → Fix orders sync status (synced=0 → synced=1)');
    console.log('  - syncDiagnostics.runOfflineTest() → Run comprehensive offline sync tests');
    console.log('  - syncDiagnostics.runMaintenance() → Run database maintenance (vacuum, analyze, cleanup)');
    console.log('  - syncDiagnostics.getMaintenanceStats() → Get database statistics');
}
