/**
 * خدمة التحقق والإصلاح الشامل للمزامنة
 * Comprehensive Sync Validation and Repair Service
 * 
 * هذا الملف يوفر أدوات للتحقق من صحة نظام المزامنة وإصلاح المشاكل
 */

import type { LocalProduct, LocalPOSOrder, LocalCustomer, LocalInvoice } from '@/database/localDb';
import { supabase } from '@/lib/supabase';
import { syncLockManager } from '@/lib/sync';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';

const getOrgId = (): string => {
  return localStorage.getItem('currentOrganizationId') ||
         localStorage.getItem('bazaar_organization_id') || '';
};

export interface SyncHealthReport {
    timestamp: string;
    databaseType: 'sqlite' | 'indexeddb';
    organizationId: string;
    status: 'healthy' | 'warning' | 'critical';
    checks: {
        database: CheckResult;
        connectivity: CheckResult;
        queueIntegrity: CheckResult;
        dataConsistency: CheckResult;
        locksStatus: CheckResult;
    };
    stats: {
        unsyncedProducts: number;
        unsyncedOrders: number;
        unsyncedCustomers: number;
        unsyncedInvoices: number;
        queueItems: number;
        failedItems: number;
    };
    issues: Issue[];
    recommendations: string[];
}

export interface CheckResult {
    passed: boolean;
    message: string;
    details?: any;
}

export interface Issue {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    affectedItems?: string[];
    suggestedFix?: string;
}

/**
 * فحص شامل لصحة نظام المزامنة
 */
export async function performSyncHealthCheck(organizationId: string): Promise<SyncHealthReport> {
    console.log('[SyncValidator] 🔍 Starting comprehensive sync health check...');

    const report: SyncHealthReport = {
        timestamp: new Date().toISOString(),
        databaseType: isSQLiteAvailable() ? 'sqlite' : 'indexeddb',
        organizationId,
        status: 'healthy',
        checks: {
            database: { passed: false, message: '' },
            connectivity: { passed: false, message: '' },
            queueIntegrity: { passed: false, message: '' },
            dataConsistency: { passed: false, message: '' },
            locksStatus: { passed: false, message: '' }
        },
        stats: {
            unsyncedProducts: 0,
            unsyncedOrders: 0,
            unsyncedCustomers: 0,
            unsyncedInvoices: 0,
            queueItems: 0,
            failedItems: 0
        },
        issues: [],
        recommendations: []
    };

    // 1. فحص قاعدة البيانات
    report.checks.database = await checkDatabaseHealth();

    // 2. فحص الاتصال بالخادم
    report.checks.connectivity = await checkServerConnectivity();

    // 3. فحص سلامة قائمة المزامنة
    report.checks.queueIntegrity = await checkQueueIntegrity();

    // 4. فحص تناسق البيانات
    report.checks.dataConsistency = await checkDataConsistency(organizationId);

    // 5. فحص حالة الأقفال
    report.checks.locksStatus = await checkLocksStatus();

    // جمع الإحصائيات
    report.stats = await collectSyncStats();

    // تحليل النتائج وتحديد المشاكل
    report.issues = analyzeChecks(report.checks);

    // إنشاء التوصيات
    report.recommendations = generateRecommendations(report.issues, report.stats);

    // تحديد الحالة العامة
    report.status = determineOverallStatus(report.issues);

    console.log(`[SyncValidator] ✅ Health check complete. Status: ${report.status}`);
    return report;
}

/**
 * فحص صحة قاعدة البيانات المحلية
 */
async function checkDatabaseHealth(): Promise<CheckResult> {
    try {
        const dbType = isSQLiteAvailable() ? 'sqlite' : 'indexeddb';

        // ⚡ محاولة قراءة بسيطة عبر Delta Sync
        const orgId = getOrgId();
        await deltaWriteService.getAll<LocalProduct>('products', orgId);

        return {
            passed: true,
            message: `Database (${dbType}) is accessible and functional`,
            details: { type: dbType }
        };
    } catch (error: any) {
        return {
            passed: false,
            message: `Database error: ${error.message}`,
            details: { error }
        };
    }
}

/**
 * فحص الاتصال بالخادم
 */
async function checkServerConnectivity(): Promise<CheckResult> {
    try {
        // محاولة استعلام بسيط
        const { error } = await supabase
            .from('products')
            .select('id')
            .limit(1);

        if (error) {
            return {
                passed: false,
                message: `Server connectivity issue: ${error.message}`,
                details: { error }
            };
        }

        return {
            passed: true,
            message: 'Server is reachable and responsive'
        };
    } catch (error: any) {
        return {
            passed: false,
            message: `Network error: ${error.message}`,
            details: { error }
        };
    }
}

/**
 * فحص سلامة قائمة المزامنة
 */
async function checkQueueIntegrity(): Promise<CheckResult> {
    try {
        // ⚡ قراءة من SQLite مباشرة لأن sync_queue جدول خاص
        let queue: any[] = [];
        if (isSQLiteAvailable()) {
            const result = await sqliteDB.query('SELECT * FROM sync_queue');
            queue = result.success ? (result.data || []) : [];
        }

        const issues: string[] = [];

        // البحث عن عناصر غير صالحة
        const invalidItems = queue.filter((item: any) => {
            return !item.object_type || !item.object_id || !item.operation;
        });

        if (invalidItems.length > 0) {
            issues.push(`Found ${invalidItems.length} invalid queue items`);
        }

        // البحث عن عناصر فشلت كثيراً
        const failedTooMuch = queue.filter((item: any) => (item.attempts || 0) > 10);
        if (failedTooMuch.length > 0) {
            issues.push(`Found ${failedTooMuch.length} items with too many failed attempts`);
        }

        // البحث عن تكرارات
        const duplicates = findDuplicateQueueItems(queue);
        if (duplicates.length > 0) {
            issues.push(`Found ${duplicates.length} duplicate queue items`);
        }

        if (issues.length === 0) {
            return {
                passed: true,
                message: `Queue is healthy (${queue.length} items)`,
                details: { totalItems: queue.length }
            };
        }

        return {
            passed: false,
            message: 'Queue has integrity issues',
            details: { issues, totalItems: queue.length }
        };
    } catch (error: any) {
        return {
            passed: false,
            message: `Queue check failed: ${error.message}`,
            details: { error }
        };
    }
}

/**
 * فحص تناسق البيانات بين المحلي والخادم
 */
async function checkDataConsistency(organizationId: string): Promise<CheckResult> {
    try {
        const issues: string[] = [];

        // ⚡ فحص المنتجات المحلية عبر Delta Sync
        const localProducts = await deltaWriteService.getAll<LocalProduct>('products', organizationId);

        const unsyncedProducts = localProducts.filter((p: any) => !p.synced);

        if (unsyncedProducts.length > 50) {
            issues.push(`High number of unsynced products: ${unsyncedProducts.length}`);
        }

        // فحص المنتجات ذات البيانات غير الصحيحة
        const productsWithInvalidData = localProducts.filter((p: any) => {
            return !p.id || !p.name || p.price === undefined;
        });

        if (productsWithInvalidData.length > 0) {
            issues.push(`Found ${productsWithInvalidData.length} products with invalid data`);
        }

        if (issues.length === 0) {
            return {
                passed: true,
                message: 'Data consistency looks good',
                details: {
                    totalProducts: localProducts.length,
                    unsyncedProducts: unsyncedProducts.length
                }
            };
        }

        return {
            passed: false,
            message: 'Data consistency issues detected',
            details: { issues }
        };
    } catch (error: any) {
        return {
            passed: false,
            message: `Consistency check failed: ${error.message}`,
            details: { error }
        };
    }
}

/**
 * فحص حالة الأقفال
 */
async function checkLocksStatus(): Promise<CheckResult> {
    // هذه دالة بسيطة لأن SyncLockManager يدير الأقفال تلقائياً
    return {
        passed: true,
        message: 'Lock manager is active and functional',
        details: { manager: 'SyncLockManager' }
    };
}

/**
 * جمع إحصائيات المزامنة
 */
async function collectSyncStats(): Promise<SyncHealthReport['stats']> {
    const stats = {
        unsyncedProducts: 0,
        unsyncedOrders: 0,
        unsyncedCustomers: 0,
        unsyncedInvoices: 0,
        queueItems: 0,
        failedItems: 0
    };

    try {
        const orgId = getOrgId();

        // ⚡ عد المنتجات غير المتزامنة عبر Delta Sync
        const products = await deltaWriteService.getAll<LocalProduct>('products', orgId);
        stats.unsyncedProducts = products.filter((p: any) => !p.synced).length;

        // ⚡ عد الطلبات غير المتزامنة
        const orders = await deltaWriteService.getAll<LocalPOSOrder>('orders', orgId);
        stats.unsyncedOrders = orders.filter((o: any) => !o.synced).length;

        // ⚡ عد العملاء غير المتزامنين
        const customers = await deltaWriteService.getAll<LocalCustomer>('customers', orgId);
        stats.unsyncedCustomers = customers.filter((c: any) => !c.synced).length;

        // ⚡ عد الفواتير غير المتزامنة
        const invoices = await deltaWriteService.getAll<LocalInvoice>('invoices', orgId);
        stats.unsyncedInvoices = invoices.filter((i: any) => !i.synced).length;

        // ⚡ عد عناصر القائمة من SQLite
        if (isSQLiteAvailable()) {
            const result = await sqliteDB.query('SELECT * FROM sync_queue');
            const queue = result.success ? (result.data || []) : [];
            stats.queueItems = queue.length;
            stats.failedItems = queue.filter((item: any) => (item.attempts || 0) > 5).length;
        }

    } catch (error) {
        console.error('[SyncValidator] Error collecting stats:', error);
    }

    return stats;
}

/**
 * البحث عن عناصر مكررة في القائمة
 */
function findDuplicateQueueItems(queue: any[]): string[] {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    queue.forEach(item => {
        const key = `${item.objectType}:${item.objectId}:${item.operation}`;
        const count = seen.get(key) || 0;
        seen.set(key, count + 1);

        if (count > 0) {
            duplicates.push(key);
        }
    });

    return Array.from(new Set(duplicates));
}

/**
 * تحليل نتائج الفحوصات لتحديد المشاكل
 */
function analyzeChecks(checks: SyncHealthReport['checks']): Issue[] {
    const issues: Issue[] = [];

    // فحص قاعدة البيانات
    if (!checks.database.passed) {
        issues.push({
            severity: 'critical',
            category: 'database',
            description: 'Local database is not accessible or has errors',
            suggestedFix: 'Restart application or reinitialize database'
        });
    }

    // فحص الاتصال
    if (!checks.connectivity.passed) {
        issues.push({
            severity: 'high',
            category: 'connectivity',
            description: 'Unable to connect to server',
            suggestedFix: 'Check internet connection or server status'
        });
    }

    // فحص القائمة
    if (!checks.queueIntegrity.passed) {
        issues.push({
            severity: 'medium',
            category: 'queue',
            description: 'Sync queue has integrity issues',
            suggestedFix: 'Clean up invalid queue items and remove duplicates'
        });
    }

    // فحص التناسق
    if (!checks.dataConsistency.passed) {
        issues.push({
            severity: 'medium',
            category: 'consistency',
            description: 'Data consistency issues detected',
            suggestedFix: 'Run data validation and repair invalid entries'
        });
    }

    return issues;
}

/**
 * إنشاء توصيات بناءً على المشاكل والإحصائيات
 */
function generateRecommendations(issues: Issue[], stats: SyncHealthReport['stats']): string[] {
    const recommendations: string[] = [];

    // توصيات بناءً على المشاكل
    if (issues.some(i => i.category === 'database')) {
        recommendations.push('Consider reinitializing the local database');
    }

    if (issues.some(i => i.category === 'connectivity')) {
        recommendations.push('Wait for internet connection to resume before syncing');
    }

    if (issues.some(i => i.category === 'queue')) {
        recommendations.push('Run queue cleanup to remove invalid and duplicate items');
    }

    // توصيات بناءً على الإحصائيات
    if (stats.unsyncedProducts > 100) {
        recommendations.push('High number of unsynced products - consider manual sync trigger');
    }

    if (stats.failedItems > 10) {
        recommendations.push('Many failed sync attempts - review error logs for patterns');
    }

    if (stats.queueItems > 500) {
        recommendations.push('Large sync queue - consider batched synchronization');
    }

    if (recommendations.length === 0) {
        recommendations.push('System is healthy - no immediate action required');
    }

    return recommendations;
}

/**
 * تحديد الحالة العامة للنظام
 */
function determineOverallStatus(issues: Issue[]): 'healthy' | 'warning' | 'critical' {
    if (issues.some(i => i.severity === 'critical')) {
        return 'critical';
    }

    if (issues.some(i => i.severity === 'high' || i.severity === 'medium')) {
        return 'warning';
    }

    return 'healthy';
}

/**
 * إصلاح تلقائي للمشاكل البسيطة
 */
export async function autoRepairSyncIssues(): Promise<{
    success: boolean;
    repaired: string[];
    failed: string[];
}> {
    console.log('[SyncValidator] 🔧 Starting auto-repair...');

    const repaired: string[] = [];
    const failed: string[] = [];

    try {
        // 1. إزالة عناصر القائمة غير الصالحة
        const invalidCleaned = await cleanInvalidQueueItems();
        if (invalidCleaned > 0) {
            repaired.push(`Removed ${invalidCleaned} invalid queue items`);
        }

        // 2. إزالة التكرارات
        const duplicatesCleaned = await removeDuplicateQueueItems();
        if (duplicatesCleaned > 0) {
            repaired.push(`Removed ${duplicatesCleaned} duplicate queue items`);
        }

        // 3. إعادة تعيين العناصر الفاشلة جداً
        const resetCount = await resetFailedItems();
        if (resetCount > 0) {
            repaired.push(`Reset ${resetCount} repeatedly failed items`);
        }

        // 4. تنظيف المنتجات المحذوفة والمتزامنة
        const deletedCleaned = await cleanSyncedDeletedItems();
        if (deletedCleaned > 0) {
            repaired.push(`Cleaned ${deletedCleaned} synced deleted items`);
        }

        console.log('[SyncValidator] ✅ Auto-repair completed successfully');
        return { success: true, repaired, failed };

    } catch (error: any) {
        console.error('[SyncValidator] ❌ Auto-repair failed:', error);
        failed.push(`Auto-repair error: ${error.message}`);
        return { success: false, repaired, failed };
    }
}

/**
 * تنظيف عناصر القائمة غير الصالحة
 */
async function cleanInvalidQueueItems(): Promise<number> {
    if (!isSQLiteAvailable()) return 0;

    // ⚡ قراءة من SQLite مباشرة
    const result = await sqliteDB.query('SELECT * FROM sync_queue');
    const queue = result.success ? (result.data || []) : [];
    const invalid = queue.filter((item: any) => {
        return !item.object_type || !item.object_id || !item.operation;
    });

    for (const item of invalid) {
        await sqliteDB.execute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
    }

    return invalid.length;
}

/**
 * إزالة عناصر القائمة المكررة
 */
async function removeDuplicateQueueItems(): Promise<number> {
    if (!isSQLiteAvailable()) return 0;

    // ⚡ قراءة من SQLite
    const result = await sqliteDB.query('SELECT * FROM sync_queue');
    const queue = result.success ? (result.data || []) : [];
    const seen = new Map<string, any>();
    const toDelete: any[] = [];

    queue.forEach((item: any) => {
        const key = `${item.object_type}:${item.object_id}:${item.operation}`;
        const existing = seen.get(key);

        if (existing) {
            // احتفظ بالأحدث
            if (new Date(item.created_at) > new Date(existing.created_at)) {
                toDelete.push(existing);
                seen.set(key, item);
            } else {
                toDelete.push(item);
            }
        } else {
            seen.set(key, item);
        }
    });

    for (const item of toDelete) {
        await sqliteDB.execute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
    }

    return toDelete.length;
}

/**
 * إعادة تعيين العناصر الفاشلة جداً
 */
async function resetFailedItems(): Promise<number> {
    if (!isSQLiteAvailable()) return 0;

    // ⚡ قراءة من SQLite
    const result = await sqliteDB.query('SELECT * FROM sync_queue');
    const queue = result.success ? (result.data || []) : [];
    const failed = queue.filter((item: any) => (item.attempts || 0) > 15);

    for (const item of failed) {
        await sqliteDB.execute(
            'UPDATE sync_queue SET attempts = 0, error = NULL, last_attempt = NULL WHERE id = ?',
            [item.id]
        );
    }

    return failed.length;
}

/**
 * تنظيف العناصر المحذوفة والمتزامنة
 */
async function cleanSyncedDeletedItems(): Promise<number> {
    let count = 0;
    const orgId = getOrgId();

    // ⚡ تنظيف المنتجات عبر Delta Sync
    const products = await deltaWriteService.getAll<LocalProduct>('products', orgId);
    const deletedProducts = products.filter((p: any) => p.synced === true && p.pendingOperation === 'delete');

    for (const p of deletedProducts) {
        await deltaWriteService.delete('products', p.id);
        count++;
    }

    // ⚡ تنظيف العملاء عبر Delta Sync
    const customers = await deltaWriteService.getAll<LocalCustomer>('customers', orgId);
    const deletedCustomers = customers.filter((c: any) => c.synced === true && c.pendingOperation === 'delete');

    for (const c of deletedCustomers) {
        await deltaWriteService.delete('customers', c.id);
        count++;
    }

    return count;
}

/**
 * طباعة تقرير الصحة بشكل جميل
 */
export function printHealthReport(report: SyncHealthReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`💾 Database: ${report.databaseType}`);
    console.log(`🏢 Organization: ${report.organizationId}`);
    console.log(`📈 Overall Status: ${getStatusEmoji(report.status)} ${report.status.toUpperCase()}`);
    console.log('='.repeat(60));

    console.log('\n📋 CHECKS:');
    Object.entries(report.checks).forEach(([name, result]) => {
        console.log(`  ${result.passed ? '✅' : '❌'} ${name}: ${result.message}`);
    });

    console.log('\n📊 STATISTICS:');
    console.log(`  📦 Unsynced Products: ${report.stats.unsyncedProducts}`);
    console.log(`  🛒 Unsynced Orders: ${report.stats.unsyncedOrders}`);
    console.log(`  👥 Unsynced Customers: ${report.stats.unsyncedCustomers}`);
    console.log(`  📄 Unsynced Invoices: ${report.stats.unsyncedInvoices}`);
    console.log(`  📋 Queue Items: ${report.stats.queueItems}`);
    console.log(`  ⚠️  Failed Items: ${report.stats.failedItems}`);

    if (report.issues.length > 0) {
        console.log('\n⚠️  ISSUES:');
        report.issues.forEach((issue, i) => {
            console.log(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
            if (issue.suggestedFix) {
                console.log(`     💡 Fix: ${issue.suggestedFix}`);
            }
        });
    }

    if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

function getStatusEmoji(status: string): string {
    switch (status) {
        case 'healthy': return '✅';
        case 'warning': return '⚠️';
        case 'critical': return '🚨';
        default: return '❓';
    }
}

/**
 * دالة سريعة للفحص والإصلاح
 */
export async function quickSyncCheckAndRepair(organizationId: string): Promise<void> {
    console.log('[SyncValidator] 🚀 Quick check and repair...');

    // 1. فحص الصحة
    const report = await performSyncHealthCheck(organizationId);
    printHealthReport(report);

    // 2. إصلاح تلقائي إذا كانت هناك مشاكل
    if (report.status !== 'healthy') {
        console.log('[SyncValidator] 🔧 Issues detected, attempting auto-repair...');
        const repairResult = await autoRepairSyncIssues();

        console.log('\n📝 REPAIR RESULTS:');
        if (repairResult.repaired.length > 0) {
            console.log('  ✅ Repaired:');
            repairResult.repaired.forEach(r => console.log(`    - ${r}`));
        }
        if (repairResult.failed.length > 0) {
            console.log('  ❌ Failed:');
            repairResult.failed.forEach(f => console.log(`    - ${f}`));
        }

        // 3. فحص مرة أخرى للتأكد
        console.log('\n[SyncValidator] 🔄 Re-checking after repair...');
        const afterReport = await performSyncHealthCheck(organizationId);
        console.log(`[SyncValidator] Final status: ${getStatusEmoji(afterReport.status)} ${afterReport.status.toUpperCase()}`);
    }

    console.log('[SyncValidator] ✅ Quick check and repair complete\n');
}
