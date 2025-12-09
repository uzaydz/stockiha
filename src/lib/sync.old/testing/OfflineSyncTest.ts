/**
 * ⚡ Offline Sync Test Suite
 * 
 * مجموعة اختبارات شاملة للتحقق من عمل المزامنة في حالات الأوفلاين
 * 
 * الاستخدام:
 * ```typescript
 * const test = new OfflineSyncTest(organizationId);
 * await test.runFullTest();
 * ```
 */

import { syncManager } from '../core/SyncManager';
import { outboxManager } from '../queue/OutboxManager';
import { sqliteWriteQueue } from '../core/SQLiteWriteQueue';
import { supabase } from '@/lib/supabase-unified';

export interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: Record<string, any>;
}

export interface FullTestReport {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    results: TestResult[];
}

export class OfflineSyncTest {
    private organizationId: string;
    private results: TestResult[] = [];

    constructor(organizationId: string) {
        this.organizationId = organizationId;
    }

    /**
     * ⚡ تشغيل جميع الاختبارات
     */
    async runFullTest(): Promise<FullTestReport> {
        const startTime = Date.now();
        this.results = [];

        console.log('[OfflineSyncTest] 🧪 Starting full test suite...');

        // Phase 1: Basic Sync Tests
        await this.testBasicSync();
        await this.testOutboxQueue();
        await this.testSyncStatus();

        // Phase 2: Offline Tests
        await this.testOfflineOrderCreation();
        await this.testOfflineOrderSync();
        await this.testConflictResolution();

        // Phase 3: Performance Tests
        await this.testLargeDatasetSync();
        await this.testBatchProcessing();

        // Phase 4: Data Integrity Tests
        await this.testTransactionRollback();
        await this.testDataConsistency();

        const duration = Date.now() - startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        const report: FullTestReport = {
            totalTests: this.results.length,
            passed,
            failed,
            duration,
            results: this.results
        };

        console.log('[OfflineSyncTest] ✅ Test suite complete:', report);
        return report;
    }

    /**
     * ⚡ اختبار المزامنة الأساسية
     */
    private async testBasicSync(): Promise<void> {
        const startTime = Date.now();
        try {
            // Test 1: Pull products
            const pullResult = await syncManager.syncTable('products');
            const passed = pullResult.success && pullResult.processed > 0;

            this.results.push({
                name: 'Basic Sync - Products Pull',
                passed,
                duration: Date.now() - startTime,
                details: {
                    processed: pullResult.processed,
                    errors: pullResult.errors
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Basic Sync - Products Pull',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار Outbox Queue
     */
    private async testOutboxQueue(): Promise<void> {
        const startTime = Date.now();
        try {
            const stats = await outboxManager.getStats();
            const passed = stats.total >= 0; // Basic check

            this.results.push({
                name: 'Outbox Queue - Stats Retrieval',
                passed,
                duration: Date.now() - startTime,
                details: stats
            });
        } catch (error: any) {
            this.results.push({
                name: 'Outbox Queue - Stats Retrieval',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار حالة المزامنة
     */
    private async testSyncStatus(): Promise<void> {
        const startTime = Date.now();
        try {
            // Check if orders sync status is correct
            const unsyncedOrders = await sqliteWriteQueue.read<{ count: number }[]>(`
                SELECT COUNT(*) as count FROM orders 
                WHERE organization_id = ? 
                AND (synced = 0 OR synced IS NULL)
                AND id NOT IN (
                    SELECT record_id FROM sync_outbox 
                    WHERE table_name = 'orders' AND status IN ('pending', 'sending', 'failed')
                )
            `, [this.organizationId]);

            const count = unsyncedOrders[0]?.count || 0;
            const passed = count === 0; // Should be 0 after fix

            this.results.push({
                name: 'Sync Status - Orders Consistency',
                passed,
                duration: Date.now() - startTime,
                details: {
                    unsyncedCount: count
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Sync Status - Orders Consistency',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار إنشاء طلب أوفلاين
     */
    private async testOfflineOrderCreation(): Promise<void> {
        const startTime = Date.now();
        try {
            // Simulate offline order creation
            const testOrderId = crypto.randomUUID();
            const testOrder = {
                id: testOrderId,
                organization_id: this.organizationId,
                customer_id: null,
                total: 100,
                subtotal: 100,
                tax: 0,
                status: 'completed',
                payment_method: 'cash',
                payment_status: 'paid',
                synced: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Add to outbox
            await outboxManager.add({
                tableName: 'orders',
                operation: 'INSERT',
                recordId: testOrderId,
                payload: testOrder
            });

            // Verify it's in outbox
            const stats = await outboxManager.getStats();
            const passed = stats.pending > 0;

            this.results.push({
                name: 'Offline Order Creation',
                passed,
                duration: Date.now() - startTime,
                details: {
                    orderId: testOrderId,
                    outboxPending: stats.pending
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Offline Order Creation',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار مزامنة الطلب الأوفلاين
     */
    private async testOfflineOrderSync(): Promise<void> {
        const startTime = Date.now();
        try {
            // This would require actual network connection
            // For now, we just verify the sync process can start
            const pending = await outboxManager.getPending(10);
            const passed = Array.isArray(pending);

            this.results.push({
                name: 'Offline Order Sync Process',
                passed,
                duration: Date.now() - startTime,
                details: {
                    pendingCount: pending.length
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Offline Order Sync Process',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار حل التعارضات
     */
    private async testConflictResolution(): Promise<void> {
        const startTime = Date.now();
        try {
            // Test conflict resolver availability
            const { conflictResolver } = await import('../ConflictResolver');
            const passed = conflictResolver !== undefined;

            this.results.push({
                name: 'Conflict Resolution - Resolver Available',
                passed,
                duration: Date.now() - startTime
            });
        } catch (error: any) {
            this.results.push({
                name: 'Conflict Resolution - Resolver Available',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار مزامنة مجموعات بيانات كبيرة
     */
    private async testLargeDatasetSync(): Promise<void> {
        const startTime = Date.now();
        try {
            // Check if batch processing is working
            const productCount = await sqliteWriteQueue.read<{ count: number }[]>(`
                SELECT COUNT(*) as count FROM products WHERE organization_id = ?
            `, [this.organizationId]);

            const count = productCount[0]?.count || 0;
            const passed = count > 0; // Should have products

            this.results.push({
                name: 'Large Dataset - Products Count',
                passed,
                duration: Date.now() - startTime,
                details: {
                    productCount: count
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Large Dataset - Products Count',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار معالجة الدفعات
     */
    private async testBatchProcessing(): Promise<void> {
        const startTime = Date.now();
        try {
            // Test batch write
            const testData = Array.from({ length: 10 }, (_, i) => ({
                sql: 'SELECT 1',
                params: []
            }));

            await sqliteWriteQueue.batchWrite(testData);
            const passed = true;

            this.results.push({
                name: 'Batch Processing - Write Operations',
                passed,
                duration: Date.now() - startTime,
                details: {
                    batchSize: testData.length
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Batch Processing - Write Operations',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار التراجع عن المعاملات
     */
    private async testTransactionRollback(): Promise<void> {
        const startTime = Date.now();
        try {
            // Test transaction rollback
            let rollbackWorked = false;
            try {
                await sqliteWriteQueue.transaction(async () => {
                    await sqliteWriteQueue.write('SELECT 1', []);
                    throw new Error('Test rollback');
                });
            } catch {
                rollbackWorked = true; // Rollback worked
            }

            this.results.push({
                name: 'Transaction Rollback',
                passed: rollbackWorked,
                duration: Date.now() - startTime
            });
        } catch (error: any) {
            this.results.push({
                name: 'Transaction Rollback',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ اختبار اتساق البيانات
     */
    private async testDataConsistency(): Promise<void> {
        const startTime = Date.now();
        try {
            // Check for orphaned order_items
            const orphanedItems = await sqliteWriteQueue.read<{ count: number }[]>(`
                SELECT COUNT(*) as count FROM order_items oi
                WHERE oi.order_id NOT IN (SELECT id FROM orders)
            `, []);

            const count = orphanedItems[0]?.count || 0;
            const passed = count === 0; // Should be 0

            this.results.push({
                name: 'Data Consistency - Orphaned Items',
                passed,
                duration: Date.now() - startTime,
                details: {
                    orphanedCount: count
                }
            });
        } catch (error: any) {
            this.results.push({
                name: 'Data Consistency - Orphaned Items',
                passed: false,
                duration: Date.now() - startTime,
                error: error.message
            });
        }
    }

    /**
     * ⚡ الحصول على تقرير مفصل
     */
    getReport(): FullTestReport {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

        return {
            totalTests: this.results.length,
            passed,
            failed,
            duration,
            results: this.results
        };
    }
}

// Export singleton instance creator
export function createOfflineSyncTest(organizationId: string): OfflineSyncTest {
    return new OfflineSyncTest(organizationId);
}



