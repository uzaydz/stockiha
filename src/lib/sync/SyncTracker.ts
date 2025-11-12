/**
 * SyncTracker - تتبع ذكي للعناصر المعلقة للمزامنة
 * يسمح بـ Event-Driven Sync بدلاً من Periodic Sync
 */

type SyncEntityType = 'pos_orders' | 'products' | 'customers' | 'addresses' | 'invoices';

interface PendingItem {
  id: string;
  type: SyncEntityType;
  timestamp: number;
}

class SyncTracker {
  private pendingItems = new Map<string, PendingItem>();
  private listeners = new Set<(hasPending: boolean) => void>();
  private lastSyncTime = 0;
  private lastSuccessfulSyncTime = 0;

  /**
   * إضافة عنصر للمزامنة
   */
  addPending(id: string, type: SyncEntityType) {
    const key = `${type}:${id}`;
    
    if (!this.pendingItems.has(key)) {
      this.pendingItems.set(key, {
        id,
        type,
        timestamp: Date.now()
      });
      
      console.log('[SyncTracker] ➕ Added pending item:', {
        type,
        id,
        totalPending: this.pendingItems.size
      });
      
      this.notifyListeners();
    }
  }

  /**
   * إزالة عنصر بعد المزامنة الناجحة
   */
  removePending(id: string, type: SyncEntityType) {
    const key = `${type}:${id}`;
    
    if (this.pendingItems.has(key)) {
      this.pendingItems.delete(key);
      
      console.log('[SyncTracker] ➖ Removed pending item:', {
        type,
        id,
        totalPending: this.pendingItems.size
      });
      
      if (this.pendingItems.size === 0) {
        this.lastSuccessfulSyncTime = Date.now();
        console.log('[SyncTracker] ✅ All items synced!');
      }
      
      this.notifyListeners();
    }
  }

  /**
   * مسح جميع العناصر المعلقة لنوع معين
   */
  clearPendingByType(type: SyncEntityType) {
    let cleared = 0;
    for (const [key, item] of this.pendingItems.entries()) {
      if (item.type === type) {
        this.pendingItems.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log('[SyncTracker] 🗑️ Cleared pending items:', { type, count: cleared });
      this.notifyListeners();
    }
  }

  /**
   * هل يوجد عناصر معلقة؟
   */
  hasPending(): boolean {
    return this.pendingItems.size > 0;
  }

  /**
   * عدد العناصر المعلقة
   */
  getPendingCount(): number {
    return this.pendingItems.size;
  }

  /**
   * عدد العناصر المعلقة حسب النوع
   */
  getPendingCountByType(type: SyncEntityType): number {
    let count = 0;
    for (const item of this.pendingItems.values()) {
      if (item.type === type) count++;
    }
    return count;
  }

  /**
   * الحصول على إحصائيات العناصر المعلقة
   */
  getStats() {
    const byType: Record<SyncEntityType, number> = {
      pos_orders: 0,
      products: 0,
      customers: 0,
      addresses: 0,
      invoices: 0
    };

    for (const item of this.pendingItems.values()) {
      byType[item.type]++;
    }

    return {
      total: this.pendingItems.size,
      byType,
      oldestItem: this.getOldestItem(),
      lastSyncTime: this.lastSyncTime,
      lastSuccessfulSyncTime: this.lastSuccessfulSyncTime,
      timeSinceLastSync: this.timeSinceLastSync()
    };
  }

  /**
   * أقدم عنصر معلق
   */
  private getOldestItem(): PendingItem | null {
    let oldest: PendingItem | null = null;
    
    for (const item of this.pendingItems.values()) {
      if (!oldest || item.timestamp < oldest.timestamp) {
        oldest = item;
      }
    }
    
    return oldest;
  }

  /**
   * الوقت منذ آخر محاولة مزامنة (بالميلي ثانية)
   */
  timeSinceLastSync(): number {
    return Date.now() - this.lastSyncTime;
  }

  /**
   * الوقت منذ آخر مزامنة ناجحة (بالميلي ثانية)
   */
  timeSinceLastSuccessfulSync(): number {
    return Date.now() - this.lastSuccessfulSyncTime;
  }

  /**
   * تسجيل بدء محاولة مزامنة
   */
  recordSyncAttempt() {
    this.lastSyncTime = Date.now();
  }

  /**
   * هل يجب إجراء Fallback Sync؟
   * ✅ فقط إذا كان هناك عناصر معلقة
   * (الـ periodic sync يجب أن يكون فقط عند الحاجة)
   */
  shouldFallbackSync(
    maxTimeSinceLastSync: number = 5 * 60 * 1000 // 5 دقائق افتراضياً (لا يُستخدم حالياً)
  ): boolean {
    // ✅ فقط إذا كان هناك عناصر معلقة فعلاً
    return this.hasPending();
  }

  /**
   * الاستماع للتغييرات
   */
  onChange(callback: (hasPending: boolean) => void): () => void {
    this.listeners.add(callback);
    
    // استدعاء callback فوراً بالحالة الحالية
    callback(this.hasPending());
    
    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * إشعار المستمعين
   */
  private notifyListeners() {
    const hasPending = this.hasPending();
    this.listeners.forEach(callback => {
      try {
        callback(hasPending);
      } catch (error) {
        console.error('[SyncTracker] Error in listener:', error);
      }
    });
  }

  /**
   * عرض الإحصائيات في Console
   */
  logStats() {
    const stats = this.getStats();
    console.log('[SyncTracker] 📊 Stats:', {
      total: stats.total,
      byType: stats.byType,
      timeSinceLastSync: Math.floor(stats.timeSinceLastSync / 1000) + 's',
      timeSinceLastSuccessfulSync: Math.floor(this.timeSinceLastSuccessfulSync() / 1000) + 's'
    });
  }

  /**
   * مسح جميع البيانات (للاختبار فقط)
   */
  reset() {
    this.pendingItems.clear();
    this.lastSyncTime = 0;
    this.lastSuccessfulSyncTime = 0;
    this.notifyListeners();
    console.log('[SyncTracker] 🔄 Reset complete');
  }
}

// Singleton instance
export const syncTracker = new SyncTracker();

// عرض إحصائيات دورية في dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setInterval(() => {
    if (syncTracker.hasPending()) {
      syncTracker.logStats();
    }
  }, 30 * 1000); // كل 30 ثانية
}

export default syncTracker;
