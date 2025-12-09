import { supabase } from '@/lib/supabase';
import { SYNC_CONFIG, getLocalTableName, getLocalColumnName } from './config';
import { tauriUpsert, tauriExecute } from '@/lib/db/tauriSqlClient';
import { outboxManager } from './queue/OutboxManager';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * ⚡ RealtimeEngine - محرك التحديثات الفورية
 *
 * يستخدم Supabase Realtime للاستماع للتغييرات في قاعدة البيانات
 * ويطبقها محلياً فوراً (بدون انتظار دورة المزامنة)
 *
 * المبادئ:
 * 1. Local Wins - إذا كان هناك تغيير محلي معلق، نتجاهل التحديث من السيرفر
 * 2. Optimistic Apply - نطبق التغيير فوراً محلياً
 * 3. Event Dispatch - نرسل أحداث للـ UI للتحديث الفوري
 */

interface RealtimeConfig {
    /** الجداول التي نريد تحديثات فورية لها */
    tables: string[];
    /** هل نفعّل الـ debug logging */
    debug?: boolean;
}

const DEFAULT_REALTIME_TABLES = [
    'products',
    'orders',
    'customers',
    'pos_work_sessions'
];

export class RealtimeEngine {
    private organizationId: string;
    private channels: Map<string, RealtimeChannel> = new Map();
    private config: RealtimeConfig;
    private isConnected = false;

    // ⚡ Cache للعمليات المعلقة
    private pendingOpsCache: Set<string> | null = null;
    private pendingOpsCacheTime: number = 0;
    private readonly CACHE_TTL_MS = 2000; // 2 ثواني

    // 📊 Statistics
    private stats = {
        messagesReceived: 0,
        changesApplied: 0,
        changesSkipped: 0,
        errors: 0
    };

    constructor(organizationId: string, config?: Partial<RealtimeConfig>) {
        this.organizationId = organizationId;
        this.config = {
            tables: config?.tables || DEFAULT_REALTIME_TABLES,
            debug: config?.debug || false
        };
    }

    /**
     * ⚡ بدء الاستماع للتحديثات
     */
    async subscribe(): Promise<void> {
        if (this.isConnected) {
            console.log('[RealtimeEngine] Already connected');
            return;
        }

        console.log(`[RealtimeEngine] 🔴 Subscribing to ${this.config.tables.length} tables...`);

        for (const serverTable of this.config.tables) {
            await this.subscribeToTable(serverTable);
        }

        this.isConnected = true;
        console.log('[RealtimeEngine] ✅ Connected to Supabase Realtime');

        // ⚡ إرسال حدث للـ UI
        window.dispatchEvent(new CustomEvent('realtime-connected', {
            detail: { tables: this.config.tables }
        }));
    }

    /**
     * ⚡ الاشتراك في جدول معين
     */
    private async subscribeToTable(serverTable: string): Promise<void> {
        const channelName = `realtime_${serverTable}_${this.organizationId}`;

        // إلغاء الاشتراك السابق إذا وجد
        if (this.channels.has(serverTable)) {
            await supabase.removeChannel(this.channels.get(serverTable)!);
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: serverTable,
                    filter: `organization_id=eq.${this.organizationId}`
                },
                (payload: RealtimePostgresChangesPayload<any>) => {
                    this.handleChange(serverTable, payload);
                }
            )
            .subscribe((status) => {
                if (this.config.debug) {
                    console.log(`[RealtimeEngine] ${serverTable} subscription status:`, status);
                }
            });

        this.channels.set(serverTable, channel);
    }

    /**
     * ⚡ معالجة التغيير الوارد من السيرفر
     */
    private async handleChange(
        serverTable: string,
        payload: RealtimePostgresChangesPayload<any>
    ): Promise<void> {
        this.stats.messagesReceived++;

        const eventType = payload.eventType;
        const newRecord = payload.new as Record<string, any> | null;
        const oldRecord = payload.old as Record<string, any> | null;
        const record = newRecord || oldRecord;

        if (!record || !record.id) {
            if (this.config.debug) {
                console.log('[RealtimeEngine] ⚠️ Invalid payload, skipping');
            }
            return;
        }

        const localTable = getLocalTableName(serverTable);
        const recordId = record.id;

        if (this.config.debug) {
            console.log(`[RealtimeEngine] 📨 ${eventType} on ${serverTable}:${recordId}`);
        }

        try {
            // ⚡ 1. تحقق من وجود عملية محلية معلقة
            const hasPending = await this.hasPendingOperation(localTable, recordId);

            if (hasPending) {
                this.stats.changesSkipped++;
                console.log(`[RealtimeEngine] ⚠️ Skipping ${localTable}:${recordId} - local change pending`);
                return;
            }

            // ⚡ 2. تطبيق التغيير محلياً
            if (eventType === 'DELETE') {
                await tauriExecute(
                    this.organizationId,
                    `DELETE FROM ${localTable} WHERE id = ?`,
                    [recordId]
                );
            } else {
                // INSERT or UPDATE
                const mappedRecord = this.mapServerToLocal(localTable, newRecord!);
                await tauriUpsert(this.organizationId, localTable, {
                    ...mappedRecord,
                    synced: 1
                });
            }

            this.stats.changesApplied++;

            // ⚡ 3. إرسال حدث للـ UI للتحديث الفوري
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: {
                    table: localTable,
                    serverTable,
                    eventType,
                    recordId,
                    record: eventType === 'DELETE' ? oldRecord : newRecord,
                    timestamp: new Date().toISOString()
                }
            }));

            if (this.config.debug) {
                console.log(`[RealtimeEngine] ✅ Applied ${eventType} for ${localTable}:${recordId}`);
            }

        } catch (error) {
            this.stats.errors++;
            console.error(`[RealtimeEngine] ❌ Failed to apply ${eventType} for ${localTable}:${recordId}:`, error);
        }
    }

    /**
     * ⚡ التحقق من وجود عملية محلية معلقة (مع caching)
     */
    private async hasPendingOperation(tableName: string, recordId: string): Promise<boolean> {
        const now = Date.now();

        // تحديث الـ cache إذا انتهت صلاحيته
        if (!this.pendingOpsCache || (now - this.pendingOpsCacheTime) > this.CACHE_TTL_MS) {
            const pendingOps = await outboxManager.getPendingOperations();
            this.pendingOpsCache = new Set(
                pendingOps.map(op => `${op.table_name}:${op.record_id}`)
            );
            this.pendingOpsCacheTime = now;
        }

        return this.pendingOpsCache.has(`${tableName}:${recordId}`);
    }

    /**
     * ⚡ تحويل أسماء الأعمدة من Server إلى Local
     */
    private mapServerToLocal(tableName: string, record: Record<string, any>): Record<string, any> {
        const mappedRecord: Record<string, any> = {};

        for (const [serverCol, value] of Object.entries(record)) {
            const localCol = getLocalColumnName(tableName, serverCol);
            mappedRecord[localCol] = value;
        }

        return mappedRecord;
    }

    /**
     * ⚡ مسح الـ cache (يُستدعى بعد push ناجح)
     */
    clearPendingCache(): void {
        this.pendingOpsCache = null;
        this.pendingOpsCacheTime = 0;
    }

    /**
     * ⚡ إضافة جدول للاستماع
     */
    async addTable(serverTable: string): Promise<void> {
        if (!this.config.tables.includes(serverTable)) {
            this.config.tables.push(serverTable);
        }
        await this.subscribeToTable(serverTable);
    }

    /**
     * ⚡ إزالة جدول من الاستماع
     */
    async removeTable(serverTable: string): Promise<void> {
        const channel = this.channels.get(serverTable);
        if (channel) {
            await supabase.removeChannel(channel);
            this.channels.delete(serverTable);
        }
        this.config.tables = this.config.tables.filter(t => t !== serverTable);
    }

    /**
     * ⚡ الحصول على الإحصائيات
     */
    getStats(): typeof this.stats & { isConnected: boolean; tablesCount: number } {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            tablesCount: this.channels.size
        };
    }

    /**
     * ⚡ إلغاء جميع الاشتراكات
     */
    async unsubscribe(): Promise<void> {
        console.log('[RealtimeEngine] 🔴 Unsubscribing from all channels...');

        for (const [table, channel] of this.channels) {
            try {
                await supabase.removeChannel(channel);
            } catch (error) {
                console.error(`[RealtimeEngine] Failed to unsubscribe from ${table}:`, error);
            }
        }

        this.channels.clear();
        this.isConnected = false;
        this.pendingOpsCache = null;

        window.dispatchEvent(new CustomEvent('realtime-disconnected'));

        console.log('[RealtimeEngine] ⏹️ Disconnected');
    }
}

// ⚡ Factory function لإنشاء instance
export function createRealtimeEngine(
    organizationId: string,
    config?: Partial<RealtimeConfig>
): RealtimeEngine {
    return new RealtimeEngine(organizationId, config);
}
