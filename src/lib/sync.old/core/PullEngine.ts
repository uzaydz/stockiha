/**
 * ⚡ PullEngine - Unified Pull Engine
 *
 * محرك سحب البيانات من Supabase إلى SQLite المحلي
 *
 * المميزات:
 * - أسماء موحدة 100% مع Supabase (لا TABLE_MAP)
 * - فلترة تلقائية للأعمدة المحلية (تبدأ بـ _)
 * - دعم المزامنة التفاضلية (Delta Sync)
 * - حماية العمليات المعلقة (Pending Operations)
 * - مزامنة متوازية للجداول المستقلة
 * - ⚡ فحص الاتصال بالشبكة قبل الجلب
 * - ⚡ إعادة المحاولة مع تأخير تصاعدي للأخطاء المؤقتة
 */

import { supabase } from '@/lib/supabase-unified';
import { sqliteWriteQueue } from './SQLiteWriteQueue';
import {
    SYNCED_TABLES,
    INDEPENDENT_TABLES,
    isLocalOnlyTable,
    tableNeedsOrgId,
    getSyncTimestampField,
    getUnifiedTableName,
    addLocalSyncColumns,
    RETRY_CONFIG,
} from '../config';
import { databaseCoordinator } from './DatabaseCoordinator';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';
import type { PullResult, SyncState } from '@/lib/types';

/**
 * ⚡ أنواع أخطاء الشبكة
 */
type NetworkErrorType = 'load_failed' | 'timeout' | 'network_error' | 'server_error' | 'unknown';

/**
 * ⚡ تحديد نوع الخطأ
 */
function classifyNetworkError(error: any): NetworkErrorType {
    const message = error?.message || String(error);
    
    if (message.includes('Load failed') || message.includes('Failed to fetch')) {
        return 'load_failed';
    }
    if (message.includes('timeout') || message.includes('AbortError')) {
        return 'timeout';
    }
    if (message.includes('network') || message.includes('Network')) {
        return 'network_error';
    }
    if (error?.code === 'PGRST' || message.includes('500') || message.includes('503')) {
        return 'server_error';
    }
    return 'unknown';
}

/**
 * ⚡ هل الخطأ قابل لإعادة المحاولة؟
 */
function isRetryableError(errorType: NetworkErrorType): boolean {
    return ['load_failed', 'timeout', 'network_error', 'server_error'].includes(errorType);
}

/**
 * ⚡ تأخير مع exponential backoff
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ⚡ حساب وقت الانتظار للمحاولة القادمة
 */
function getRetryDelay(attempt: number): number {
    const baseDelay = RETRY_CONFIG.BASE_DELAY_MS;
    const maxDelay = RETRY_CONFIG.MAX_DELAY_MS;
    const factor = RETRY_CONFIG.EXPONENTIAL_FACTOR;
    
    const calculatedDelay = baseDelay * Math.pow(factor, attempt - 1);
    return Math.min(calculatedDelay, maxDelay);
}

/**
 * ⚡ PullEngine Configuration
 */
interface PullEngineConfig {
    batchSize: number;
    maxParallel: number;
    enableSmartBatching: boolean; // ⚡ CRITICAL FIX: Smart Batching للسماح بالعمل أثناء المزامنة
}

const DEFAULT_CONFIG: PullEngineConfig = {
    batchSize: 1000,
    maxParallel: 5,
    enableSmartBatching: true,
};

/**
 * ⚡ CRITICAL FIX: جداول حرجة يجب مزامنتها أولاً قبل السماح للمستخدم بالعمل
 * هذه الجداول ضرورية للعمل اليومي (POS, Inventory, etc.)
 */
const CRITICAL_TABLES = [
    'products',
    'product_categories',
    'customers',
    'orders',
] as const;

/**
 * ⚡ جداول غير حرجة يمكن مزامنتها في الخلفية بعد الجداول الحرجة
 */
function isCriticalTable(tableName: string): boolean {
    return CRITICAL_TABLES.includes(tableName as any);
}

/**
 * ⚡ PullEngine Class
 */
export class PullEngine {
    private organizationId: string;
    private pendingIds: Map<string, Set<string>> = new Map();
    private config: PullEngineConfig;

    constructor(organizationId: string, config: Partial<PullEngineConfig> = {}) {
        this.organizationId = organizationId;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * ⚡ Initialize the engine
     */
    async init(): Promise<void> {
        // Create sync_state table if not exists
        await sqliteWriteQueue.write(`
            CREATE TABLE IF NOT EXISTS sync_state (
                table_name TEXT PRIMARY KEY,
                last_synced_at TEXT,
                last_sync_status TEXT,
                error_message TEXT
            )
        `);

        // Load pending operations cache
        await this.refreshPendingCache();
    }

    /**
     * ⚡ Refresh the cache of pending operations
     */
    async refreshPendingCache(): Promise<void> {
        try {
            const pending = await sqliteWriteQueue.read<any[]>(`
                SELECT table_name, record_id FROM sync_outbox
                WHERE status IN ('pending', 'sending')
            `);

            this.pendingIds.clear();
            for (const op of pending) {
                if (!this.pendingIds.has(op.table_name)) {
                    this.pendingIds.set(op.table_name, new Set());
                }
                this.pendingIds.get(op.table_name)!.add(op.record_id);
            }

            console.log(`[PullEngine] 📋 Cached ${pending.length} pending operations`);
        } catch (error) {
            console.warn('[PullEngine] ⚠️ Failed to refresh pending cache:', error);
        }
    }

    /**
     * ⚡ Clear the pending cache
     */
    clearCache(): void {
        this.pendingIds.clear();
    }

    /**
     * ⚡ Pull all synced tables
     * 
     * ⚠️ CRITICAL FIX: Smart Batching للسماح بالعمل أثناء المزامنة
     * - الجداول الحرجة تُزامن أولاً (products, orders, customers)
     * - بعدها يمكن للمستخدم البدء بالعمل
     * - الجداول غير الحرجة تُزامن في الخلفية
     */
    async pullAll(): Promise<Map<string, PullResult>> {
        console.log('[PullEngine] 🔄 Starting full pull...');

        await this.refreshPendingCache();

        const results = new Map<string, PullResult>();

        if (this.config.enableSmartBatching) {
            // ⚡ Smart Batching: فصل الجداول الحرجة عن غير الحرجة
            const allTables = SYNCED_TABLES as unknown as string[];
            const criticalTables: string[] = [];
            const nonCriticalTables: string[] = [];

            for (const table of allTables) {
                if (isCriticalTable(table)) {
                    criticalTables.push(table);
                } else {
                    nonCriticalTables.push(table);
                }
            }

            console.log(`[PullEngine] ⚡ Smart Batching: ${criticalTables.length} critical, ${nonCriticalTables.length} non-critical`);

            // 1️⃣ مزامنة الجداول الحرجة أولاً (يجب إكمالها قبل السماح بالعمل)
            console.log('[PullEngine] 🔴 Phase 1: Syncing critical tables...');
            const criticalResults = await this.pullTablesParallel(criticalTables);
            criticalResults.forEach((result, table) => results.set(table, result));

            // ⚡ إشعار أن الجداول الحرجة اكتملت - يمكن للمستخدم البدء بالعمل
            const criticalProcessed = Array.from(criticalResults.values()).reduce((sum, r) => sum + r.processed, 0);
            const criticalErrors = Array.from(criticalResults.values()).reduce((sum, r) => sum + r.errors, 0);
            console.log(
                `[PullEngine] ✅ Critical tables complete: ${criticalProcessed} processed, ${criticalErrors} errors. ` +
                `User can start working. Background sync continuing...`
            );

            // 2️⃣ مزامنة الجداول غير الحرجة في الخلفية (لا تمنع المستخدم من العمل)
            if (nonCriticalTables.length > 0) {
                console.log('[PullEngine] 🟢 Phase 2: Syncing non-critical tables in background...');
                // ⚡ استخدام setTimeout للسماح للمتصفح بمعالجة أحداث المستخدم
                const backgroundSync = async () => {
                    // تقسيم الجداول غير الحرجة إلى batches صغيرة لتجنب حجب UI
                    const batchSize = 3;
                    for (let i = 0; i < nonCriticalTables.length; i += batchSize) {
                        const batch = nonCriticalTables.slice(i, i + batchSize);
                        const batchResults = await this.pullTablesParallel(batch);
                        batchResults.forEach((result, table) => results.set(table, result));

                        // ⚡ Yield للسماح للمتصفح بمعالجة أحداث المستخدم
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    console.log('[PullEngine] ✅ Background sync complete');
                };

                // ⚡ تشغيل المزامنة في الخلفية بدون انتظار
                backgroundSync().catch(error => {
                    console.error('[PullEngine] ❌ Background sync error:', error);
                });
            }
        } else {
            // ⚡ الوضع القديم: مزامنة جميع الجداول بالتسلسل
            const independentResults = await this.pullTablesParallel(
                INDEPENDENT_TABLES as unknown as string[]
            );
            independentResults.forEach((result, table) => results.set(table, result));

            const processedTables = new Set(INDEPENDENT_TABLES);
            const remainingTables = SYNCED_TABLES.filter(t => !processedTables.has(t as any));

            for (const table of remainingTables) {
                const result = await this.pullTable(table);
                results.set(table, result);
            }
        }

        return results;
    }

    /**
     * ⚡ Pull multiple tables in parallel
     */
    async pullTablesParallel(tableNames: string[]): Promise<Map<string, PullResult>> {
        const results = new Map<string, PullResult>();

        // ⚡ CRITICAL: التحقق من إيقاف المزامنة
        if (databaseCoordinator.isSyncPaused()) {
            console.log('[PullEngine] ⏸️ Sync paused, skipping parallel pull');
            return results;
        }

        // Split into chunks to respect maxParallel
        const chunks: string[][] = [];
        for (let i = 0; i < tableNames.length; i += this.config.maxParallel) {
            chunks.push(tableNames.slice(i, i + this.config.maxParallel));
        }

        for (const chunk of chunks) {
            // ⚡ التحقق قبل كل chunk
            if (databaseCoordinator.isSyncPaused()) {
                console.log('[PullEngine] ⏸️ Sync paused during chunk processing');
                break;
            }

            const chunkResults = await Promise.all(
                chunk.map(table => this.pullTable(table))
            );

            chunk.forEach((table, index) => {
                results.set(table, chunkResults[index]);
            });
        }

        return results;
    }

    /**
     * ⚡ Pull a single table with retry logic
     */
    async pullTable(tableName: string): Promise<PullResult> {
        const startTime = Date.now();
        const result: PullResult = { processed: 0, skipped: 0, errors: 0 };

        // ⚡ CRITICAL: التحقق من إيقاف المزامنة بواسطة DatabaseCoordinator
        if (databaseCoordinator.isSyncPaused()) {
            console.log(`[PullEngine] ⏸️ Sync paused, skipping table: ${tableName}`);
            return result;
        }

        // ⚡ CRITICAL: فحص الاتصال بالشبكة قبل محاولة الجلب
        if (!isAppOnline()) {
            console.log(`[PullEngine] 📴 Offline, skipping table: ${tableName}`);
            return result;
        }

        // Get unified table name (for legacy support)
        const unifiedTableName = getUnifiedTableName(tableName);

        // Skip local-only tables
        if (isLocalOnlyTable(unifiedTableName)) {
            console.log(`[PullEngine] ⏭️ Skipping local-only table: ${unifiedTableName}`);
            return result;
        }

        try {
            const syncState = await this.getSyncState(unifiedTableName);
            const lastSynced = syncState?.last_synced_at || '1970-01-01T00:00:00Z';
            const timestampField = getSyncTimestampField(unifiedTableName);

            console.log(`[PullEngine] ⬇️ Pulling ${unifiedTableName} since ${lastSynced}`);

            // Get pending IDs for this table
            const pendingIds = this.pendingIds.get(tableName) || this.pendingIds.get(unifiedTableName) || new Set();

            let page = 0;
            let hasMore = true;
            let maxTimestamp = lastSynced;

            while (hasMore) {
                // ⚡ إعادة فحص الشبكة قبل كل صفحة
                if (!isAppOnline()) {
                    console.log(`[PullEngine] 📴 Connection lost during pull, stopping: ${unifiedTableName}`);
                    break;
                }

                // ⚡ جلب البيانات مع إعادة المحاولة
                const fetchResult = await this.fetchTablePageWithRetry(
                    unifiedTableName,
                    timestampField,
                    lastSynced,
                    page
                );

                if (fetchResult.error) {
                    const errorType = classifyNetworkError(fetchResult.error);
                    console.error(`[PullEngine] ❌ Error fetching ${unifiedTableName} (${errorType}):`, fetchResult.error);
                    
                    // ⚡ تحديث حالة الشبكة إذا كان خطأ شبكة
                    if (errorType === 'load_failed' || errorType === 'network_error') {
                        markNetworkOffline();
                    }
                    
                    result.errors++;
                    break;
                }

                const data = fetchResult.data;

                if (!data || data.length === 0) {
                    hasMore = false;
                    break;
                }

                // Process records
                const toUpsert: any[] = [];
                const toDelete: string[] = [];

                for (const record of data as any[]) {
                    // Skip pending records (local wins)
                    const recordId = record?.id;
                    if (recordId && pendingIds.has(recordId)) {
                        result.skipped++;
                        continue;
                    }

                    // Handle soft delete
                    if (record?.deleted_at) {
                        if (recordId) {
                            toDelete.push(recordId);
                        }
                    } else {
                        // ⚡ CRITICAL FIX: جداول مختلفة تستخدم أنماط أعمدة مختلفة
                        // - orders, order_items, staff_work_sessions تستخدم: synced, sync_status, pending_operation (بدون underscore)
                        // - باقي الجداول تستخدم: _synced, _sync_status, _pending_operation (مع underscore)
                        const TABLES_WITHOUT_UNDERSCORE = ['orders', 'order_items', 'staff_work_sessions'];
                        const usesUnderscorePrefix = !TABLES_WITHOUT_UNDERSCORE.includes(unifiedTableName);
                        
                        let localRecord: any;
                        if (usesUnderscorePrefix) {
                            // الجداول التي تستخدم underscore prefix
                            localRecord = {
                                ...record,
                                _synced: 1,
                                _sync_status: 'synced',
                                _pending_operation: null as any,
                                _local_updated_at: new Date().toISOString(),
                            };
                        } else {
                            // ⚡ الجداول التي لا تستخدم underscore prefix (orders, order_items, staff_work_sessions)
                            localRecord = {
                                ...record,
                                synced: 1,
                                sync_status: 'synced',
                                pending_operation: null as any,
                            };
                        }
                        
                        toUpsert.push(localRecord);
                    }

                    // Track max timestamp
                    const recordTimestamp = record[timestampField];
                    if (recordTimestamp && recordTimestamp > maxTimestamp) {
                        maxTimestamp = recordTimestamp;
                    }
                }

                // Apply deletes
                if (toDelete.length > 0) {
                    await this.deleteRecords(unifiedTableName, toDelete);
                    result.processed += toDelete.length;
                }

                // Apply upserts
                if (toUpsert.length > 0) {
                    await this.upsertRecords(unifiedTableName, toUpsert);
                    result.processed += toUpsert.length;
                }

                // Check if more pages
                if (data.length < this.config.batchSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            // Update sync state
            if (result.errors === 0) {
                await this.updateSyncState(unifiedTableName, maxTimestamp, 'success');
            }

            const duration = Date.now() - startTime;
            console.log(
                `[PullEngine] ✅ ${unifiedTableName}: ${result.processed} processed, ` +
                `${result.skipped} skipped, ${result.errors} errors (${duration}ms)`
            );

        } catch (error: any) {
            console.error(`[PullEngine] ❌ Critical error pulling ${unifiedTableName}:`, error);
            result.errors++;
            await this.updateSyncState(unifiedTableName, null, 'error', error.message);
        }

        return result;
    }

    /**
     * ⚡ Fetch a page of data with retry logic
     */
    private async fetchTablePageWithRetry(
        tableName: string,
        timestampField: string,
        lastSynced: string,
        page: number
    ): Promise<{ data: any[] | null; error: any }> {
        const maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // ⚡ فحص الشبكة قبل كل محاولة
            if (!isAppOnline()) {
                console.log(`[PullEngine] 📴 Offline, aborting retry for ${tableName}`);
                return { data: null, error: new Error('Network offline') };
            }

            try {
                // Build query
                const queryBuilder = supabase.from(tableName as any) as any;
                let query = queryBuilder
                    .select('*')
                    .gt(timestampField, lastSynced)
                    .order(timestampField, { ascending: true })
                    .range(page * this.config.batchSize, (page + 1) * this.config.batchSize - 1);

                // Add organization filter if needed
                if (tableNeedsOrgId(tableName)) {
                    query = query.eq('organization_id', this.organizationId);
                }

                const { data, error } = await query;

                if (error) {
                    lastError = error;
                    const errorType = classifyNetworkError(error);

                    // ⚡ إذا كان الخطأ قابل لإعادة المحاولة
                    if (isRetryableError(errorType) && attempt < maxAttempts) {
                        const retryDelay = getRetryDelay(attempt);
                        console.log(
                            `[PullEngine] 🔄 Retry ${attempt}/${maxAttempts} for ${tableName} ` +
                            `(${errorType}), waiting ${retryDelay}ms...`
                        );
                        await delay(retryDelay);
                        continue;
                    }

                    // ⚡ خطأ غير قابل لإعادة المحاولة أو نفدت المحاولات
                    return { data: null, error };
                }

                // ⚡ نجاح! تحديث حالة الشبكة
                markNetworkOnline();
                return { data, error: null };

            } catch (error: any) {
                lastError = error;
                const errorType = classifyNetworkError(error);

                console.warn(
                    `[PullEngine] ⚠️ Attempt ${attempt}/${maxAttempts} failed for ${tableName}:`,
                    { type: errorType, message: error?.message }
                );

                // ⚡ إذا كان الخطأ قابل لإعادة المحاولة
                if (isRetryableError(errorType) && attempt < maxAttempts) {
                    const retryDelay = getRetryDelay(attempt);
                    console.log(`[PullEngine] 🔄 Retrying in ${retryDelay}ms...`);
                    await delay(retryDelay);
                    continue;
                }

                // ⚡ خطأ غير قابل لإعادة المحاولة أو نفدت المحاولات
                break;
            }
        }

        // ⚡ فشلت جميع المحاولات
        console.error(`[PullEngine] ❌ All ${maxAttempts} attempts failed for ${tableName}`);
        return { data: null, error: lastError || new Error('All retry attempts failed') };
    }

    /**
     * ⚡ Delete records from local database
     */
    private async deleteRecords(tableName: string, ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        const placeholders = ids.map(() => '?').join(',');
        await sqliteWriteQueue.write(
            `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
            ids
        );
    }

    /**
     * ⚡ Upsert records to local database
     */
    private async upsertRecords(tableName: string, records: any[]): Promise<void> {
        if (records.length === 0) return;
        
        // ⚡ CRITICAL FIX: تعريف الجداول التي تستخدم أعمدة بدون underscore
        const TABLES_WITHOUT_UNDERSCORE = ['orders', 'order_items', 'staff_work_sessions', 'products'];
        const usesUnderscorePrefix = !TABLES_WITHOUT_UNDERSCORE.includes(tableName);
        
        // ⚡ الأعمدة التي يجب تجاهلها للجداول التي لا تستخدم underscore
        const UNDERSCORE_SYNC_COLUMNS = ['_synced', '_sync_status', '_pending_operation', '_local_updated_at', '_error'];

        for (const record of records) {
            // ⚡ Map columns to match database schema
            const mappedRecord: Record<string, any> = {};
            
            for (const [key, value] of Object.entries(record)) {
                // ⚡ CRITICAL FIX: للجداول التي لا تستخدم underscore prefix
                // يجب تجاهل جميع أعمدة underscore sync
                if (!usesUnderscorePrefix && UNDERSCORE_SYNC_COLUMNS.includes(key)) {
                    // تحويل _synced إلى synced إذا لم يكن موجوداً بالفعل
                    if (key === '_synced' && !('synced' in record)) {
                        mappedRecord['synced'] = value ? 1 : 0;
                    }
                    // تجاهل باقي أعمدة underscore
                    continue;
                }
                
                // ⚡ Filter out _customer_name_lower for orders if column doesn't exist
                // (The column should exist per schema, but handle gracefully if migration hasn't run)
                if (key === '_customer_name_lower' && tableName === 'orders') {
                    // Keep it - the column should exist per schema
                    mappedRecord[key] = value;
                    continue;
                }
                
                // ⚡ Convert arrays and objects to JSON strings
                if (Array.isArray(value) || (typeof value === 'object' && value !== null && value !== undefined)) {
                    mappedRecord[key] = JSON.stringify(value);
                } else {
                    mappedRecord[key] = value;
                }
            }

            // Get column names and values
            const columns = Object.keys(mappedRecord);
            const values = columns.map(col => mappedRecord[col]);
            const placeholders = columns.map(() => '?').join(',');

            try {
                await sqliteWriteQueue.write(
                    `INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`,
                    values
                );
            } catch (error: any) {
                // ⚡ Handle missing column errors gracefully
                if (error?.message?.includes('no column named')) {
                    const columnMatch = error.message.match(/no column named (\w+)/);
                    if (columnMatch) {
                        const missingColumn = columnMatch[1];
                        console.warn(`[PullEngine] ⚠️ Column ${missingColumn} doesn't exist in ${tableName}, filtering it out`);
                        
                        // Retry without the missing column
                        const filteredColumns = columns.filter(col => col !== missingColumn);
                        const filteredValues = filteredColumns.map(col => mappedRecord[col]);
                        const filteredPlaceholders = filteredColumns.map(() => '?').join(',');
                        
                        await sqliteWriteQueue.write(
                            `INSERT OR REPLACE INTO ${tableName} (${filteredColumns.join(',')}) VALUES (${filteredPlaceholders})`,
                            filteredValues
                        );
                        continue;
                    }
                }
                throw error;
            }
        }
    }

    /**
     * ⚡ Get sync state for a table
     */
    private async getSyncState(tableName: string): Promise<SyncState | null> {
        try {
            const result = await sqliteWriteQueue.read<SyncState[]>(
                `SELECT * FROM sync_state WHERE table_name = ?`,
                [tableName]
            );
            return result[0] || null;
        } catch {
            return null;
        }
    }

    /**
     * ⚡ Update sync state for a table
     */
    private async updateSyncState(
        tableName: string,
        lastSynced: string | null,
        status: 'success' | 'error',
        errorMessage?: string
    ): Promise<void> {
        await sqliteWriteQueue.write(
            `INSERT OR REPLACE INTO sync_state (table_name, last_synced_at, last_sync_status, error_message)
             VALUES (?, ?, ?, ?)`,
            [tableName, lastSynced, status, errorMessage || null]
        );
    }

    /**
     * ⚡ Reset sync state for specific tables (forces full re-sync)
     * يُستخدم عند الحاجة لإعادة مزامنة جداول معينة من البداية
     */
    async resetSyncState(tableNames: string[]): Promise<void> {
        for (const tableName of tableNames) {
            const unifiedName = getUnifiedTableName(tableName);
            console.log(`[PullEngine] 🔄 Resetting sync state for: ${unifiedName}`);
            await sqliteWriteQueue.write(
                `DELETE FROM sync_state WHERE table_name = ?`,
                [unifiedName]
            );
        }
    }

    /**
     * ⚡ Reset sync state for all tables
     */
    async resetAllSyncState(): Promise<void> {
        console.log('[PullEngine] 🔄 Resetting ALL sync states...');
        await sqliteWriteQueue.write(`DELETE FROM sync_state`);
    }

    /**
     * ⚡ CRITICAL FIX: Pull only critical tables (for fast startup)
     * يُستخدم عند الحاجة لبدء العمل بسرعة دون انتظار مزامنة جميع الجداول
     */
    async pullCriticalOnly(): Promise<Map<string, PullResult>> {
        console.log('[PullEngine] 🔴 Pulling critical tables only...');

        await this.refreshPendingCache();

        const results = new Map<string, PullResult>();
        const criticalTables = (SYNCED_TABLES as unknown as string[]).filter(isCriticalTable);

        const criticalResults = await this.pullTablesParallel(criticalTables);
        criticalResults.forEach((result, table) => results.set(table, result));

        const totalProcessed = Array.from(criticalResults.values()).reduce((sum, r) => sum + r.processed, 0);
        const totalErrors = Array.from(criticalResults.values()).reduce((sum, r) => sum + r.errors, 0);
        console.log(
            `[PullEngine] ✅ Critical tables complete: ${totalProcessed} processed, ${totalErrors} errors`
        );

        return results;
    }
}
