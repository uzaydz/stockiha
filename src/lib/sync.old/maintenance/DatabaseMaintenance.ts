/**
 * ⚡ Database Maintenance Utilities
 * 
 * أدوات صيانة قاعدة البيانات المحلية:
 * - Vacuum (تنظيف وتقليل الحجم)
 * - Analyze (تحسين الفهارس)
 * - Integrity Check (فحص سلامة البيانات)
 * - Cleanup Old Data (حذف البيانات القديمة)
 */

import { sqliteWriteQueue } from '../core/SQLiteWriteQueue';
import { tauriExecute } from '@/lib/db/tauriSqlClient';

export interface MaintenanceResult {
    success: boolean;
    operation: string;
    duration: number;
    details?: Record<string, any>;
    error?: string;
}

export interface MaintenanceReport {
    totalOperations: number;
    successful: number;
    failed: number;
    totalDuration: number;
    results: MaintenanceResult[];
}

export class DatabaseMaintenance {
    private organizationId: string;

    constructor(organizationId: string) {
        this.organizationId = organizationId;
    }

    /**
     * ⚡ تشغيل جميع عمليات الصيانة
     */
    async runFullMaintenance(): Promise<MaintenanceReport> {
        const startTime = Date.now();
        const results: MaintenanceResult[] = [];

        console.log('[DatabaseMaintenance] 🔧 Starting full maintenance...');

        // 1. Vacuum (تنظيف وتقليل الحجم)
        results.push(await this.vacuum());

        // 2. Analyze (تحسين الفهارس)
        results.push(await this.analyze());

        // 3. Integrity Check (فحص سلامة البيانات)
        results.push(await this.integrityCheck());

        // 4. Cleanup Old Data (حذف البيانات القديمة)
        results.push(await this.cleanupOldData());

        // 5. Rebuild Indexes (إعادة بناء الفهارس)
        results.push(await this.rebuildIndexes());

        const duration = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        const report: MaintenanceReport = {
            totalOperations: results.length,
            successful,
            failed,
            totalDuration: duration,
            results
        };

        console.log('[DatabaseMaintenance] ✅ Maintenance complete:', report);
        return report;
    }

    /**
     * ⚡ Vacuum - تنظيف قاعدة البيانات وتقليل الحجم
     */
    async vacuum(): Promise<MaintenanceResult> {
        const startTime = Date.now();
        try {
            // Get size before
            const sizeBefore = await this.getDatabaseSize();

            // Run VACUUM
            await sqliteWriteQueue.write('VACUUM', []);

            // Get size after
            const sizeAfter = await this.getDatabaseSize();
            const sizeReduction = sizeBefore - sizeAfter;

            return {
                success: true,
                operation: 'vacuum',
                duration: Date.now() - startTime,
                details: {
                    sizeBefore,
                    sizeAfter,
                    sizeReduction,
                    reductionPercent: sizeBefore > 0 ? ((sizeReduction / sizeBefore) * 100).toFixed(2) : '0'
                }
            };
        } catch (error: any) {
            return {
                success: false,
                operation: 'vacuum',
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * ⚡ Analyze - تحديث إحصائيات الفهارس
     */
    async analyze(): Promise<MaintenanceResult> {
        const startTime = Date.now();
        try {
            await sqliteWriteQueue.write('ANALYZE', []);

            return {
                success: true,
                operation: 'analyze',
                duration: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                operation: 'analyze',
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * ⚡ Integrity Check - فحص سلامة قاعدة البيانات
     */
    async integrityCheck(): Promise<MaintenanceResult> {
        const startTime = Date.now();
        try {
            const result = await sqliteWriteQueue.read<{ integrity_check: string }[]>(
                'PRAGMA integrity_check',
                []
            );

            const checkResult = result[0]?.integrity_check || 'unknown';
            const passed = checkResult === 'ok';

            return {
                success: passed,
                operation: 'integrity_check',
                duration: Date.now() - startTime,
                details: {
                    result: checkResult
                }
            };
        } catch (error: any) {
            return {
                success: false,
                operation: 'integrity_check',
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * ⚡ Cleanup Old Data - حذف البيانات القديمة
     */
    async cleanupOldData(): Promise<MaintenanceResult> {
        const startTime = Date.now();
        try {
            // حذف الطلبات المحذوفة (soft delete) الأقدم من 90 يوم
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const cutoffDate = ninetyDaysAgo.toISOString();

            // حذف من Dead Letter Queue الأقدم من 30 يوم
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dlqCutoffDate = thirtyDaysAgo.toISOString();

            let deletedOrders = 0;
            let deletedDLQ = 0;

            try {
                const ordersResult = await sqliteWriteQueue.write<{ changes: number }>(
                    `DELETE FROM orders 
                     WHERE organization_id = ? 
                     AND deleted_at IS NOT NULL 
                     AND deleted_at < ?`,
                    [this.organizationId, cutoffDate]
                );
                deletedOrders = ordersResult?.changes || 0;
            } catch (err) {
                // Ignore if column doesn't exist
            }

            try {
                const dlqResult = await sqliteWriteQueue.write<{ changes: number }>(
                    `DELETE FROM sync_dead_letter_queue 
                     WHERE failed_at < ? 
                     AND can_recover = 0`,
                    [dlqCutoffDate]
                );
                deletedDLQ = dlqResult?.changes || 0;
            } catch (err) {
                // Ignore if table doesn't exist
            }

            return {
                success: true,
                operation: 'cleanup_old_data',
                duration: Date.now() - startTime,
                details: {
                    deletedOrders,
                    deletedDLQ,
                    cutoffDate
                }
            };
        } catch (error: any) {
            return {
                success: false,
                operation: 'cleanup_old_data',
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * ⚡ Rebuild Indexes - إعادة بناء الفهارس
     */
    async rebuildIndexes(): Promise<MaintenanceResult> {
        const startTime = Date.now();
        try {
            // Rebuild all indexes
            await sqliteWriteQueue.write('REINDEX', []);

            return {
                success: true,
                operation: 'rebuild_indexes',
                duration: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                operation: 'rebuild_indexes',
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * ⚡ الحصول على حجم قاعدة البيانات
     */
    private async getDatabaseSize(): Promise<number> {
        try {
            // Try to get database file size from Tauri
            // This is a placeholder - actual implementation depends on Tauri API
            return 0;
        } catch {
            return 0;
        }
    }

    /**
     * ⚡ الحصول على إحصائيات قاعدة البيانات
     */
    async getDatabaseStats(): Promise<Record<string, any>> {
        try {
            const [tables, indexes, size] = await Promise.all([
                sqliteWriteQueue.read<{ count: number }[]>(
                    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`,
                    []
                ),
                sqliteWriteQueue.read<{ count: number }[]>(
                    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'`,
                    []
                ),
                this.getDatabaseSize()
            ]);

            return {
                tableCount: tables[0]?.count || 0,
                indexCount: indexes[0]?.count || 0,
                estimatedSize: size
            };
        } catch (error) {
            console.error('[DatabaseMaintenance] Failed to get stats:', error);
            return {};
        }
    }
}

// Export singleton instance creator
export function createDatabaseMaintenance(organizationId: string): DatabaseMaintenance {
    return new DatabaseMaintenance(organizationId);
}



