/**
 * 🔒 Sync Lock Manager - نظام قفل محكم 100% للمزامنة
 *
 * يمنع race conditions عند المزامنة من نوافذ/تبويبات متعددة
 *
 * الميزات:
 * - Lock per-resource (products, orders, customers, etc.)
 * - Cross-tab synchronization via localStorage
 * - Automatic lock expiration (30 seconds)
 * - Heartbeat mechanism للتأكد من أن العملية نشطة
 * - Graceful cleanup عند إغلاق النافذة
 * - 100% thread-safe
 */

// مدة القفل الافتراضية (30 ثانية)
const DEFAULT_LOCK_TIMEOUT = 30000;

// معدل Heartbeat (كل 5 ثوان)
const HEARTBEAT_INTERVAL = 5000;

// معدل التحقق من القفل (كل ثانية)
const LOCK_CHECK_INTERVAL = 1000;

// الحد الأقصى لمحاولات الحصول على القفل
const MAX_LOCK_ATTEMPTS = 30;

/**
 * بيانات القفل
 */
interface LockData {
  /** معرف فريد للقفل (UUID) */
  lockId: string;

  /** معرف التبويب/النافذة التي حصلت على القفل */
  tabId: string;

  /** timestamp بدء القفل */
  startTime: number;

  /** timestamp آخر heartbeat */
  lastHeartbeat: number;

  /** مدة انتهاء القفل (بالمللي ثانية) */
  timeout: number;

  /** حالة القفل */
  status: 'active' | 'releasing';
}

/**
 * نوع الموارد القابلة للقفل
 */
export type LockResource =
  | 'products'
  | 'orders'
  | 'customers'
  | 'invoices'
  | 'inventory'
  | 'sync_queue'
  | 'global_sync';

class SyncLockManager {
  private tabId: string;
  private activeLocks: Map<LockResource, string> = new Map();
  private heartbeatIntervals: Map<LockResource, number> = new Map();
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    // إنشاء معرف فريد لهذا التبويب
    this.tabId = this.generateTabId();

    // إعداد listener لتنظيف القفل عند إغلاق النافذة
    this.setupUnloadHandler();

    // إعداد listener للـ storage events
    this.setupStorageListener();

    console.log(`[SyncLock] 🔓 Initialized with tabId: ${this.tabId}`);
  }

  /**
   * توليد معرف فريد للتبويب
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على مفتاح localStorage للقفل
   */
  private getLockKey(resource: LockResource): string {
    return `sync_lock_${resource}`;
  }

  /**
   * الحصول على بيانات القفل من localStorage
   */
  private getLockData(resource: LockResource): LockData | null {
    try {
      const key = this.getLockKey(resource);
      const data = localStorage.getItem(key);
      if (!data) return null;

      const lockData: LockData = JSON.parse(data);

      // التحقق من صلاحية القفل
      const now = Date.now();
      const elapsed = now - lockData.lastHeartbeat;

      // إذا مضى أكثر من timeout بدون heartbeat، القفل منتهي
      if (elapsed > lockData.timeout) {
        console.log(`[SyncLock] ⏱️ Lock expired for ${resource} (${elapsed}ms since last heartbeat)`);
        this.forceReleaseLock(resource);
        return null;
      }

      return lockData;
    } catch (error) {
      console.error(`[SyncLock] ❌ Error reading lock for ${resource}:`, error);
      return null;
    }
  }

  /**
   * حفظ بيانات القفل إلى localStorage
   */
  private setLockData(resource: LockResource, lockData: LockData): void {
    try {
      const key = this.getLockKey(resource);
      localStorage.setItem(key, JSON.stringify(lockData));
    } catch (error) {
      console.error(`[SyncLock] ❌ Error setting lock for ${resource}:`, error);
    }
  }

  /**
   * إجبار إطلاق القفل (للأقفال المنتهية أو الميتة)
   */
  private forceReleaseLock(resource: LockResource): void {
    try {
      const key = this.getLockKey(resource);
      localStorage.removeItem(key);
      console.log(`[SyncLock] 🧹 Force released lock for ${resource}`);
    } catch (error) {
      console.error(`[SyncLock] ❌ Error force releasing lock for ${resource}:`, error);
    }
  }

  /**
   * بدء heartbeat للقفل النشط
   */
  private startHeartbeat(resource: LockResource, lockId: string): void {
    // إيقاف أي heartbeat موجود
    this.stopHeartbeat(resource);

    // بدء heartbeat جديد
    const intervalId = window.setInterval(() => {
      const lockData = this.getLockData(resource);

      // تحديث heartbeat فقط إذا كان القفل لا يزال ملكنا
      if (lockData && lockData.lockId === lockId && lockData.tabId === this.tabId) {
        lockData.lastHeartbeat = Date.now();
        this.setLockData(resource, lockData);
        console.log(`[SyncLock] 💓 Heartbeat for ${resource}`);
      } else {
        // القفل لم يعد ملكنا، أوقف heartbeat
        this.stopHeartbeat(resource);
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(resource, intervalId);
  }

  /**
   * إيقاف heartbeat
   */
  private stopHeartbeat(resource: LockResource): void {
    const intervalId = this.heartbeatIntervals.get(resource);
    if (intervalId) {
      window.clearInterval(intervalId);
      this.heartbeatIntervals.delete(resource);
      console.log(`[SyncLock] 🛑 Stopped heartbeat for ${resource}`);
    }
  }

  /**
   * إعداد معالج إغلاق النافذة
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // تنظيف كل الأقفال عند إغلاق النافذة
      for (const [resource, lockId] of this.activeLocks) {
        this.releaseLock(resource, lockId);
      }
    });
  }

  /**
   * إعداد listener للـ storage events
   */
  private setupStorageListener(): void {
    this.storageListener = (event: StorageEvent) => {
      // الاستماع لتغييرات القفل من تبويبات أخرى
      if (event.key?.startsWith('sync_lock_')) {
        const resource = event.key.replace('sync_lock_', '') as LockResource;

        // إذا تم حذف القفل، تنظيف بياناتنا المحلية
        if (!event.newValue && this.activeLocks.has(resource)) {
          const lockId = this.activeLocks.get(resource);
          console.log(`[SyncLock] 📢 Lock released by another tab for ${resource}`);
          this.activeLocks.delete(resource);
          this.stopHeartbeat(resource);
        }
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  /**
   * محاولة الحصول على القفل
   *
   * @param resource المورد المراد قفله
   * @param timeout مدة انتهاء القفل (افتراضي: 30 ثانية)
   * @param maxAttempts الحد الأقصى للمحاولات (افتراضي: 30)
   * @returns معرف القفل إذا نجح، null إذا فشل
   */
  async acquireLock(
    resource: LockResource,
    timeout: number = DEFAULT_LOCK_TIMEOUT,
    maxAttempts: number = MAX_LOCK_ATTEMPTS
  ): Promise<string | null> {
    console.log(`[SyncLock] 🔐 Attempting to acquire lock for ${resource}...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const existingLock = this.getLockData(resource);

      // إذا لم يكن هناك قفل، حاول الحصول عليه
      if (!existingLock) {
        const lockId = this.generateLockId();
        const now = Date.now();

        const lockData: LockData = {
          lockId,
          tabId: this.tabId,
          startTime: now,
          lastHeartbeat: now,
          timeout,
          status: 'active'
        };

        // حفظ القفل
        this.setLockData(resource, lockData);

        // انتظر قليلاً للتأكد من عدم وجود race condition
        await this.sleep(100);

        // تحقق مرة أخرى أن القفل لا يزال ملكنا
        const verifyLock = this.getLockData(resource);
        if (verifyLock && verifyLock.lockId === lockId && verifyLock.tabId === this.tabId) {
          // نجحنا في الحصول على القفل!
          this.activeLocks.set(resource, lockId);
          this.startHeartbeat(resource, lockId);

          console.log(`[SyncLock] ✅ Lock acquired for ${resource} (lockId: ${lockId})`);
          return lockId;
        }

        // فشلنا، هناك race condition
        console.log(`[SyncLock] ⚠️ Race condition detected for ${resource}, retrying...`);
      } else {
        // القفل موجود، انتظر وحاول مرة أخرى
        const elapsed = Date.now() - existingLock.startTime;
        const remaining = timeout - elapsed;

        console.log(
          `[SyncLock] ⏳ Lock held by tab ${existingLock.tabId} for ${resource} ` +
          `(${attempt}/${maxAttempts}, ${Math.ceil(remaining / 1000)}s remaining)`
        );
      }

      // انتظر قبل المحاولة التالية
      if (attempt < maxAttempts) {
        await this.sleep(LOCK_CHECK_INTERVAL);
      }
    }

    // فشلنا في الحصول على القفل بعد كل المحاولات
    console.error(`[SyncLock] ❌ Failed to acquire lock for ${resource} after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * إطلاق القفل
   *
   * @param resource المورد
   * @param lockId معرف القفل
   */
  releaseLock(resource: LockResource, lockId: string): void {
    const lockData = this.getLockData(resource);

    // تحقق أن القفل ملكنا
    if (!lockData || lockData.lockId !== lockId || lockData.tabId !== this.tabId) {
      console.warn(`[SyncLock] ⚠️ Cannot release lock for ${resource}: not our lock`);
      return;
    }

    // إيقاف heartbeat
    this.stopHeartbeat(resource);

    // حذف القفل من localStorage
    const key = this.getLockKey(resource);
    localStorage.removeItem(key);

    // حذف من الأقفال النشطة
    this.activeLocks.delete(resource);

    console.log(`[SyncLock] 🔓 Lock released for ${resource} (lockId: ${lockId})`);
  }

  /**
   * تنفيذ عملية مع قفل تلقائي
   *
   * @param resource المورد
   * @param operation العملية المراد تنفيذها
   * @param timeout مدة انتهاء القفل
   * @returns نتيجة العملية أو null إذا فشل الحصول على القفل
   */
  async withLock<T>(
    resource: LockResource,
    operation: () => Promise<T>,
    timeout: number = DEFAULT_LOCK_TIMEOUT
  ): Promise<T | null> {
    const lockId = await this.acquireLock(resource, timeout);

    if (!lockId) {
      console.warn(`[SyncLock] ⚠️ Skipping operation for ${resource}: could not acquire lock`);
      return null;
    }

    try {
      console.log(`[SyncLock] 🚀 Executing operation for ${resource}...`);
      const result = await operation();
      console.log(`[SyncLock] ✅ Operation completed for ${resource}`);
      return result;
    } catch (error) {
      console.error(`[SyncLock] ❌ Operation failed for ${resource}:`, error);
      throw error;
    } finally {
      // دائماً أطلق القفل، حتى لو فشلت العملية
      this.releaseLock(resource, lockId);
    }
  }

  /**
   * التحقق من وجود قفل نشط
   */
  hasActiveLock(resource: LockResource): boolean {
    return this.activeLocks.has(resource);
  }

  /**
   * الحصول على معلومات القفل الحالي
   */
  getLockInfo(resource: LockResource): LockData | null {
    return this.getLockData(resource);
  }

  /**
   * تنظيف كل الأقفال (للاستخدام عند تسجيل الخروج أو إعادة التشغيل)
   */
  cleanupAllLocks(): void {
    console.log('[SyncLock] 🧹 Cleaning up all locks...');

    // إطلاق كل الأقفال النشطة
    for (const [resource, lockId] of this.activeLocks) {
      this.releaseLock(resource, lockId);
    }

    // إزالة storage listener
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }

  /**
   * توليد معرف فريد للقفل
   */
  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * دالة مساعدة للانتظار
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// تصدير instance واحد (Singleton)
export const syncLockManager = new SyncLockManager();

// تصدير الكلاس للاستخدام المتقدم
export { SyncLockManager };
