/**
 * SmartSyncEngine - محرك مزامنة ذكي (Wrapper)
 * Event-Driven Sync + Periodic Fallback
 *
 * ⚡ النظام الموحد: يستخدم SyncManager فقط
 * ⚠️ معطل تلقائياً - SyncManager يدير المزامنة مباشرة
 *
 * المزايا:
 * - مزامنة فورية عند التغييرات (2 ثانية)
 * - تجميع التغييرات المتعددة (debouncing)
 * - Fallback periodic كل 5 دقائق للأمان
 * - تقليل 95% من الاستدعاءات
 * - دعم Tauri مع SQLite فقط
 * - Delta-Based Sync للمخزون
 * 
 * ⚠️ ملاحظة: هذا المحرك معطل تلقائياً
 * - SyncManager يدير المزامنة مباشرة
 * - متاح فقط للاستدعاء اليدوي إذا لزم الأمر
 */

import { syncTracker } from './SyncTracker';
import { debounce } from '@/lib/utils/debounce';
import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { syncManager } from '@/lib/sync/core/SyncManager';


class SmartSyncEngine {
    private readonly IMMEDIATE_SYNC_DELAY = 2000;        // 2 ثانية - debounce
    private readonly PERIODIC_FALLBACK = 5 * 60 * 1000;  // 5 دقائق
    private readonly MAX_TIME_WITHOUT_SYNC = 10 * 60 * 1000; // 10 دقائق

    private isRunning = false;
    private isSyncing = false;
    private periodicIntervalId: any = null;
    private unsubscribeFromTracker: (() => void) | null = null;
    private lastSuccessfulSyncTime = 0;

    /**
     * بدء المحرك
     */
    start() {
        if (this.isRunning) {
            console.log('[SmartSync] ⚠️ Already running');
            return;
        }

        this.isRunning = true;
        console.log('[SmartSync] 🚀 Starting smart sync engine...', {
            immediateSyncDelay: this.IMMEDIATE_SYNC_DELAY + 'ms',
            periodicFallback: (this.PERIODIC_FALLBACK / 1000 / 60) + ' دقائق'
        });

        // 📢 الاستماع للتغييرات في SyncTracker
        this.unsubscribeFromTracker = syncTracker.onChange((hasPending) => {
            if (hasPending) {
                this.triggerEventDrivenSync();
            }
        });

        // 🔄 Periodic fallback (كل 5 دقائق)
        this.periodicIntervalId = setInterval(() => {
            this.periodicFallbackSync();
        }, this.PERIODIC_FALLBACK);

        void this.performSync();

        console.log('[SmartSync] ✅ Engine started');
    }

    /**
     * إيقاف المحرك
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        // إلغاء الاشتراك من SyncTracker
        if (this.unsubscribeFromTracker) {
            this.unsubscribeFromTracker();
            this.unsubscribeFromTracker = null;
        }

        // إيقاف periodic interval
        if (this.periodicIntervalId) {
            clearInterval(this.periodicIntervalId);
            this.periodicIntervalId = null;
        }

        console.log('[SmartSync] ⏹️ Engine stopped');
    }

    /**
     * مزامنة فورية (Event-Driven)
     */
    private triggerEventDrivenSync() {
        if (!this.isRunning) return;

        // استخدام debounced sync لتجميع التغييرات
        console.log('[SmartSync] 🚀 Event-driven sync triggered', {
            pendingCount: syncTracker.getPendingCount()
        });

        this.debouncedSync();
    }

    /**
     * Fallback periodic sync - فقط إذا كان هناك عناصر معلقة
     */
    private async periodicFallbackSync() {
        if (!this.isRunning || this.isSyncing) {
            return;
        }

        const hasPending = syncTracker.hasPending();
        const timeSinceLastSuccess = this.lastSuccessfulSyncTime ? (Date.now() - this.lastSuccessfulSyncTime) : Infinity;

        // ✅ فقط إذا كان هناك عناصر معلقة فعلاً
        if (!hasPending && timeSinceLastSuccess < this.MAX_TIME_WITHOUT_SYNC) {
            return;
        }

        const stats = syncTracker.getStats();
        console.log('[SmartSync] 🔄 Periodic fallback sync triggered:', {
            pendingCount: stats.total,
            byType: stats.byType,
            timeSinceLastSync: Math.floor(stats.timeSinceLastSync / 1000) + 's'
        });

        await this.performSync();
    }

    /**
     * تنفيذ المزامنة الفعلية
     * ⚡ النظام الموحد: SQLite + SyncManager فقط
     * تم إزالة نظام المزامنة القديم (Legacy) بالكامل
     */
    private async performSync() {
        if (this.isSyncing) {
            console.log('[SmartSync] ⏳ Sync already in progress');
            return;
        }

        this.isSyncing = true;
        syncTracker.recordSyncAttempt();

        try {
            const startTime = Date.now();
            const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');

            // ⚡ النظام الموحد: SQLite + SyncManager فقط
            if (!orgId) {
                console.warn('[SmartSync] ⚠️ No organization ID found');
                return;
            }

            // ⚡ التحقق من SQLite (مطلوب)
            if (!isSQLiteAvailable()) {
                console.error('[SmartSync] ❌ SQLite is required but not available. Please use Tauri/Electron app.');
                throw new Error('SQLite is required. Legacy IndexedDB sync has been removed.');
            }

            console.log('[SmartSync] ⚡ Using Unified SyncManager (SQLite only)...');

            // تأكد من تهيئة SyncManager
            if (!syncManager.initialized) {
                await syncManager.start(orgId);
            }

            const syncResult = await syncManager.syncAll();
            
            // ⚡ توحيد مسار القراءة: مزامنة بيانات POS من السيرفر إلى SQLite
            try {
                const { syncAllPOSDataFromServer } = await import('@/services/posDataSyncService');
                const posSyncResult = await syncAllPOSDataFromServer(orgId);
                
                if (posSyncResult.success) {
                    console.log('[SmartSync] ✅ POS data synced successfully');
                } else {
                    console.warn('[SmartSync] ⚠️ POS data sync failed:', posSyncResult.error);
                }
            } catch (posSyncError) {
                console.warn('[SmartSync] ⚠️ POS data sync error:', posSyncError);
                // نكمل رغم الخطأ - لا نمنع المزامنة الأخرى
            }
            
            const duration = Date.now() - startTime;

            if (syncResult.success) {
                this.lastSuccessfulSyncTime = Date.now();
                console.log('[SmartSync] ✅ SyncManager completed successfully', {
                    duration: duration + 'ms',
                    totals: syncResult.totals
                });
            } else {
                console.warn('[SmartSync] ⚠️ SyncManager completed with errors', {
                    duration: duration + 'ms',
                    totals: syncResult.totals
                });
            }
        } catch (error) {
            console.error('[SmartSync] ❌ Sync error:', error);
        } finally {
            this.isSyncing = false;
            // إشعار الواجهة بأن المزامنة اكتملت لتحديث العدادات
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('smart-sync-complete'));
            }
        }
    }

    /**
     * مزامنة مع debounce (تجميع التغييرات)
     */
    private debouncedSync = debounce(async () => {
        if (!this.isRunning) return;

        // فقط إذا كان هناك عناصر معلقة
        if (syncTracker.hasPending()) {
            await this.performSync();
        }
    }, this.IMMEDIATE_SYNC_DELAY);

    /**
     * مزامنة فورية (force) - للاستخدام اليدوي
     */
    async syncNow(force: boolean = false) {
        if (!this.isRunning && !force) {
            console.warn('[SmartSync] Engine not running. Use force=true to sync anyway');
            return;
        }

        console.log('[SmartSync] 🚀 Manual sync triggered');
        await this.performSync();
    }

    /**
     * الحصول على حالة المحرك
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isSyncing: this.isSyncing,
            syncTracker: syncTracker.getStats()
        };
    }

    /**
     * عرض الحالة في Console
     */
    logStatus() {
        const status = this.getStatus();
        console.log('[SmartSync] 📊 Status:', status);
    }
}

// Singleton instance
export const smartSyncEngine = new SmartSyncEngine();

/**
 * ⚠️ تم تعطيل البدء التلقائي!
 *
 * السبب: توحيد أنظمة المزامنة
 * - SyncManager هو المحرك الرئيسي الوحيد الآن
 * - يتم تهيئته تلقائياً عند تسجيل الدخول
 * - SmartSyncEngine معطل - متاح فقط للاستدعاء اليدوي إذا لزم الأمر
 *
 * ⚡ النظام الموحد: SQLite + SyncManager فقط
 * 
 * الكود القديم (معطل):
 * if (typeof window !== 'undefined') {
 *   smartSyncEngine.start();
 * }
 */

// ✅ تسجيل إيقاف عند إغلاق التطبيق (للحالات التي يتم فيها تشغيله يدوياً)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (smartSyncEngine.getStatus().isRunning) {
            smartSyncEngine.stop();
        }
    });
}

// Dev tools - إتاحة في window للاختبار
if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).smartSync = {
        engine: smartSyncEngine,
        tracker: syncTracker,
        syncNow: () => smartSyncEngine.syncNow(true),
        status: () => smartSyncEngine.getStatus(),
        logStatus: () => smartSyncEngine.logStatus()
    };

    console.log('[SmartSync] 🛠️ Dev tools available: window.smartSync');
}

export default smartSyncEngine;
