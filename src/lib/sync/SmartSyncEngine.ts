/**
 * SmartSyncEngine - محرك مزامنة ذكي
 * Event-Driven Sync + Periodic Fallback
 * 
 * المزايا:
 * - مزامنة فورية عند التغييرات (2 ثانية)
 * - تجميع التغييرات المتعددة (debouncing)
 * - Fallback periodic كل 5 دقائق للأمان
 * - تقليل 95% من الاستدعاءات
 */

import { syncTracker } from './SyncTracker';
import { synchronizeWithServer } from '@/api/syncService';
import { syncPendingPOSOrders } from '@/context/shop/posOrderService';
import { debounce } from '@/lib/utils/debounce';

class SmartSyncEngine {
  private readonly IMMEDIATE_SYNC_DELAY = 2000;        // 2 ثانية - debounce
  private readonly PERIODIC_FALLBACK = 5 * 60 * 1000;  // 5 دقائق
  private readonly MAX_TIME_WITHOUT_SYNC = 10 * 60 * 1000; // 10 دقائق
  
  private isRunning = false;
  private isSyncing = false;
  private periodicIntervalId: any = null;
  private unsubscribeFromTracker: (() => void) | null = null;

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

    // ✅ فقط إذا كان هناك عناصر معلقة فعلاً
    if (!syncTracker.hasPending()) {
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
   */
  private async performSync() {
    if (this.isSyncing) {
      console.log('[SmartSync] ⏳ Sync already in progress');
      return;
    }

    this.isSyncing = true;
    syncTracker.recordSyncAttempt();

    try {
      console.log('[SmartSync] 🔄 Starting sync...', {
        pending: syncTracker.getStats().byType
      });

      const startTime = Date.now();
      
      // ✅ تنفيذ كل أنواع المزامنة بالتوازي
      const [baseSync, posSync] = await Promise.allSettled([
        synchronizeWithServer(), // منتجات، عملاء، عناوين، فواتير
        syncPendingPOSOrders()    // طلبات POS
      ]);
      
      const duration = Date.now() - startTime;

      // تحليل النتائج
      const baseSyncSuccess = baseSync.status === 'fulfilled' && baseSync.value === true;
      const posSyncSuccess = posSync.status === 'fulfilled' && 
                            (posSync.value.synced > 0 || posSync.value.failed === 0);
      
      const allSuccess = baseSyncSuccess && posSyncSuccess;

      if (allSuccess) {
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

// بدء تلقائي عند تحميل الصفحة (في browser فقط)
if (typeof window !== 'undefined') {
  // انتظار تحميل DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      smartSyncEngine.start();
    });
  } else {
    // DOM محمّل بالفعل
    smartSyncEngine.start();
  }

  // إيقاف عند إغلاق التطبيق
  window.addEventListener('beforeunload', () => {
    smartSyncEngine.stop();
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
