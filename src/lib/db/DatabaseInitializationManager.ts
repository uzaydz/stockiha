/**
 * مدير التهيئة الموحد لقاعدة البيانات SQLite
 * يحل مشكلة Race Conditions ويضمن تهيئة آمنة ومنسقة
 */

import { sqliteDB, isSQLiteAvailable } from './sqliteAPI';

/**
 * حالة التهيئة لكل مؤسسة
 */
interface InitializationState {
  promise: Promise<boolean>;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  startTime: number;
}

class DatabaseInitializationManager {
  // خريطة لتتبع حالة التهيئة لكل مؤسسة
  private initializationStates = new Map<string, InitializationState>();

  // Set للمؤسسات المهيئة بنجاح
  private initializedOrgs = new Set<string>();

  // Timeout افتراضي (10 ثوان)
  private readonly DEFAULT_TIMEOUT = 10000;

  // فترة الانتظار بين محاولات التحقق (100ms)
  private readonly POLL_INTERVAL = 100;

  /**
   * تهيئة قاعدة البيانات لمؤسسة معينة
   * يضمن عدم التهيئة المتزامنة للمؤسسة نفسها
   */
  async initialize(
    orgId: string,
    options: {
      timeout?: number;
      force?: boolean;
    } = {}
  ): Promise<boolean> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const force = options.force || false;

    // إذا كانت المؤسسة مهيئة بالفعل وليس force، نرجع true مباشرة
    if (!force && this.initializedOrgs.has(orgId)) {
      return true;
    }

    // إذا كان هناك تهيئة جارية، ننتظرها
    const existingState = this.initializationStates.get(orgId);
    if (existingState && existingState.status === 'pending') {
      console.log(`[DBInitManager] Waiting for ongoing initialization: ${orgId.slice(0, 8)}...`);

      // انتظار التهيئة الجارية مع timeout
      try {
        const result = await Promise.race([
          existingState.promise,
          this.createTimeoutPromise(timeout, orgId)
        ]);
        return result;
      } catch (error) {
        console.error(`[DBInitManager] Failed waiting for initialization:`, error);
        // إزالة الحالة المعطوبة
        this.initializationStates.delete(orgId);
        throw error;
      }
    }

    // إنشاء promise جديد للتهيئة
    const initPromise = this.performInitialization(orgId, timeout);

    // تسجيل الحالة
    this.initializationStates.set(orgId, {
      promise: initPromise,
      status: 'pending',
      startTime: Date.now()
    });

    try {
      const result = await initPromise;

      // تحديث الحالة بناءً على النتيجة
      const state = this.initializationStates.get(orgId);
      if (state) {
        state.status = result ? 'success' : 'failed';
      }

      if (result) {
        this.initializedOrgs.add(orgId);
      }

      return result;
    } catch (error) {
      // تحديث الحالة بالفشل
      const state = this.initializationStates.get(orgId);
      if (state) {
        state.status = 'failed';
        state.error = error instanceof Error ? error.message : String(error);
      }
      throw error;
    } finally {
      // تنظيف الحالة بعد 5 ثوان (للسماح بالمحاولات المتأخرة بالانتظار)
      setTimeout(() => {
        this.initializationStates.delete(orgId);
      }, 5000);
    }
  }

  /**
   * تنفيذ التهيئة الفعلية
   */
  private async performInitialization(orgId: string, timeout: number): Promise<boolean> {
    console.log(`[DBInitManager] Starting initialization for org: ${orgId.slice(0, 8)}...`);
    const startTime = Date.now();

    // الخطوة 1: التحقق من توفر SQLite API
    const isAvailable = await this.waitForSQLiteAPI(timeout);
    if (!isAvailable) {
      console.error(`[DBInitManager] SQLite API not available after ${timeout}ms`);
      return false;
    }

    // الخطوة 2: تهيئة قاعدة البيانات
    try {
      const result = await sqliteDB.initialize(orgId);

      if (result.success) {
        const duration = Date.now() - startTime;
        console.log(`[DBInitManager] ✅ Initialization successful for org ${orgId.slice(0, 8)} in ${duration}ms`);
        return true;
      } else {
        console.error(`[DBInitManager] ❌ Initialization failed:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`[DBInitManager] ❌ Initialization threw error:`, error);
      return false;
    }
  }

  /**
   * انتظار توفر SQLite API
   */
  private async waitForSQLiteAPI(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (isSQLiteAvailable()) {
        return true;
      }
      await this.sleep(this.POLL_INTERVAL);
    }

    return isSQLiteAvailable();
  }

  /**
   * إنشاء promise للـ timeout
   */
  private createTimeoutPromise(timeoutMs: number, orgId: string): Promise<boolean> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`[DBInitManager] Initialization timeout after ${timeoutMs}ms for org: ${orgId.slice(0, 8)}`));
      }, timeoutMs);
    });
  }

  /**
   * مساعد للنوم
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * التحقق من أن المؤسسة مهيئة
   */
  isInitialized(orgId: string): boolean {
    return this.initializedOrgs.has(orgId);
  }

  /**
   * الحصول على حالة التهيئة
   */
  getInitializationState(orgId: string): 'not_started' | 'pending' | 'success' | 'failed' {
    if (this.initializedOrgs.has(orgId)) {
      return 'success';
    }

    const state = this.initializationStates.get(orgId);
    if (!state) {
      return 'not_started';
    }

    return state.status;
  }

  /**
   * إعادة تعيين حالة التهيئة لمؤسسة (للاستخدام في الحالات الخاصة)
   */
  reset(orgId: string): void {
    console.log(`[DBInitManager] Resetting initialization state for org: ${orgId.slice(0, 8)}`);
    this.initializedOrgs.delete(orgId);
    this.initializationStates.delete(orgId);
  }

  /**
   * إعادة تعيين جميع الحالات
   */
  resetAll(): void {
    console.log(`[DBInitManager] Resetting all initialization states`);
    this.initializedOrgs.clear();
    this.initializationStates.clear();
  }

  /**
   * الحصول على إحصائيات
   */
  getStats(): {
    initializedCount: number;
    pendingCount: number;
    failedCount: number;
    totalAttempts: number;
  } {
    let pendingCount = 0;
    let failedCount = 0;

    for (const state of this.initializationStates.values()) {
      if (state.status === 'pending') pendingCount++;
      if (state.status === 'failed') failedCount++;
    }

    return {
      initializedCount: this.initializedOrgs.size,
      pendingCount,
      failedCount,
      totalAttempts: this.initializationStates.size
    };
  }
}

// تصدير singleton
export const dbInitManager = new DatabaseInitializationManager();

// تصدير الكلاس للاستخدام المتقدم
export { DatabaseInitializationManager };
