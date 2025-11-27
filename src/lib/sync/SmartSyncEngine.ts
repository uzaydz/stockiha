/**
 * SmartSyncEngine - محرك مزامنة ذكي
 * Event-Driven Sync + Periodic Fallback
 *
 * ⚡ تم التحديث لاستخدام Delta Sync Engine
 *
 * المزايا:
 * - مزامنة فورية عند التغييرات (2 ثانية)
 * - تجميع التغييرات المتعددة (debouncing)
 * - Fallback periodic كل 5 دقائق للأمان
 * - تقليل 95% من الاستدعاءات
 * - دعم Tauri مع SQLite
 * - Delta-Based Sync للمخزون
 */

import { syncTracker } from './SyncTracker';
import { synchronizeWithServer, syncOrdersFromServer, syncInvoicesFromServer } from '@/api/syncService';
import { syncPendingPOSOrders } from '@/context/shop/posOrderService';
import { debounce } from '@/lib/utils/debounce';
import {
  isTauriEnvironment,
  fullSync as tauriFullSync,
  getSQLiteStats
} from './TauriSyncService';
import { deltaSyncEngine } from './delta';

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
   * ⚡ تم التحديث: يستخدم Delta Sync Engine أولاً
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

      // ⚡ الأولوية لـ Delta Sync Engine (إذا كان مُهيئ)
      const deltaStatus = await deltaSyncEngine.getStatus();
      if (deltaStatus.isInitialized && orgId) {
        console.log('[SmartSync] ⚡ Using Delta Sync Engine...');

        try {
          await deltaSyncEngine.fullSync();
          const duration = Date.now() - startTime;
          this.lastSuccessfulSyncTime = Date.now();

          const newStatus = await deltaSyncEngine.getStatus();
          console.log('[SmartSync] ✅ Delta sync completed', {
            duration: duration + 'ms',
            pendingOutbox: newStatus.pendingOutboxCount,
            lastSyncAt: newStatus.lastSyncAt
          });

          return; // الخروج - Delta Sync نجح
        } catch (deltaError) {
          console.warn('[SmartSync] ⚠️ Delta sync failed, falling back...', deltaError);
          // استمر للمزامنة التقليدية
        }
      }

      // ✅ التحقق من بيئة Tauri - استخدام مزامنة SQLite المخصصة
      if (isTauriEnvironment() && orgId) {
        console.log('[SmartSync] 🦀 Tauri detected - using SQLite sync...');

        const tauriResult = await tauriFullSync(orgId);
        const duration = Date.now() - startTime;

        if (tauriResult.success) {
          this.lastSuccessfulSyncTime = Date.now();
          console.log('[SmartSync] ✅ Tauri sync completed successfully', {
            duration: duration + 'ms',
            products: tauriResult.results.products.count,
            customers: tauriResult.results.customers.count,
            orders: tauriResult.results.orders.count,
            invoices: tauriResult.results.invoices.count,
            uploaded: tauriResult.results.uploaded.uploaded
          });
        } else {
          console.warn('[SmartSync] ⚠️ Tauri sync completed with some errors', {
            duration: duration + 'ms',
            results: tauriResult.results
          });
        }

        return; // الخروج هنا - لا نحتاج المزامنة القديمة
      }

      // ✅ المزامنة العادية لـ Electron أو المتصفح
      console.log('[SmartSync] 🔄 Starting legacy sync...', {
        pending: syncTracker.getStats().byType
      });

      // ✅ تنفيذ كل أنواع المزامنة بالتوازي
      const [baseSync, posSync] = await Promise.allSettled([
        orgId ? synchronizeWithServer(orgId) : Promise.resolve({ products: 0, customers: 0, orders: 0, invoices: 0 }), // منتجات، عملاء، عناوين، فواتير
        syncPendingPOSOrders(),    // طلبات POS (رفع)
        // ✅ جلب الطلبات من السيرفر (تنزيل) لضمان التزامن الكامل
        (async () => {
          if (orgId) {
            return await syncOrdersFromServer(orgId);
          }
          return { success: false, count: 0 };
        })(),
        // ✅ جلب الفواتير من السيرفر (تنزيل)
        (async () => {
          if (orgId) {
            return await syncInvoicesFromServer(orgId);
          }
          return false;
        })()
      ]);

      const duration = Date.now() - startTime;

      // تحليل النتائج
      const baseSyncSuccess = baseSync.status === 'fulfilled' && baseSync.value === true;
      const posSyncSuccess = posSync.status === 'fulfilled' &&
        (posSync.value.synced > 0 || posSync.value.failed === 0);

      const allSuccess = baseSyncSuccess && posSyncSuccess;

      if (allSuccess) {
        this.lastSuccessfulSyncTime = Date.now();
        console.log('[SmartSync] ✅ Sync completed successfully', {
          duration: duration + 'ms',
          posOrders: posSync.status === 'fulfilled' ? posSync.value : null,
          remainingPending: syncTracker.getPendingCount()
        });
      } else {
        console.warn('[SmartSync] ⚠️ Sync completed with some errors', {
          duration: duration + 'ms',
          baseSync: baseSync.status,
          posSync: posSync.status,
          remainingPending: syncTracker.getPendingCount()
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
 * - DeltaSyncEngine هو المحرك الرئيسي الآن
 * - يتم تهيئته في AuthContext عند تسجيل الدخول
 * - SmartSyncEngine متاح فقط للاستدعاء اليدوي إذا لزم الأمر
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
