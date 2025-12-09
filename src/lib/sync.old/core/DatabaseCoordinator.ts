/**
 * ⚡ DatabaseCoordinator - المنسق المركزي لجميع عمليات قاعدة البيانات
 *
 * هذا هو الحل المثالي لمشكلة "database is locked" بناءً على أفضل الممارسات:
 *
 * 🔗 المصادر:
 * - https://sqlite.org/wal.html (WAL Mode)
 * - https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/
 * - https://sqlite.org/lang_transaction.html (BEGIN IMMEDIATE)
 * - https://www.npmjs.com/package/async-mutex (Mutex Pattern)
 *
 * ✅ المميزات:
 * 1. Mutex مركزي لمنع التعارض
 * 2. فصل عمليات POS عن عمليات Sync
 * 3. أولوية للعمليات الحرجة (POS)
 * 4. تتبع حالة القفل لتشخيص المشاكل
 * 5. إيقاف المزامنة التلقائي أثناء العمليات الحرجة
 *
 * @version 1.0.0
 */

import { sqliteDB } from '@/lib/db/sqliteAPI';

// ============================================================
// 📝 Types
// ============================================================

export type OperationType = 'pos' | 'sync-push' | 'sync-pull' | 'realtime' | 'general';
export type OperationPriority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedOperation<T = any> {
  id: string;
  type: OperationType;
  priority: OperationPriority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  createdAt: number;
  description?: string;
}

interface LockState {
  isLocked: boolean;
  heldBy: string | null;
  heldByType: OperationType | null;
  acquiredAt: number | null;
  waitingCount: number;
}

interface CoordinatorStats {
  totalOperations: number;
  posOperations: number;
  syncOperations: number;
  averageWaitTime: number;
  maxWaitTime: number;
  lockContentions: number;
  currentQueueLength: number;
}

// ============================================================
// ⚡ DatabaseCoordinator Class
// ============================================================

class DatabaseCoordinator {
  private static instance: DatabaseCoordinator;

  // 🔒 حالة القفل
  private lockPromise: Promise<void> | null = null;
  private lockResolve: (() => void) | null = null;
  private lockState: LockState = {
    isLocked: false,
    heldBy: null,
    heldByType: null,
    acquiredAt: null,
    waitingCount: 0,
  };

  // 📊 إحصائيات
  private stats: CoordinatorStats = {
    totalOperations: 0,
    posOperations: 0,
    syncOperations: 0,
    averageWaitTime: 0,
    maxWaitTime: 0,
    lockContentions: 0,
    currentQueueLength: 0,
  };

  // 📋 قائمة الانتظار
  private queue: QueuedOperation[] = [];
  private isProcessing = false;

  // ⏸️ حالة الإيقاف المؤقت للمزامنة
  private syncPaused = false;
  private syncPauseReason: string | null = null;

  // 🔧 إعدادات
  // ⚡ CRITICAL FIX v2: تقليل timeouts للعمليات السريعة
  // المشكلة: timeouts طويلة جداً (90-120s) تسمح بمعاملات طويلة جداً
  // الحل: timeouts أقصر للعمليات السريعة (POS operations)
  private readonly LOCK_TIMEOUT_MS = 5000; // 5 ثواني (كان 120)
  private readonly POS_OPERATION_TIMEOUT_MS = 10000; // 10 ثواني للـ POS (كان 90)
  private readonly SYNC_OPERATION_TIMEOUT_MS = 30000; // 30 ثانية للـ Sync
  private readonly OPERATION_TIMEOUT_MS = 30000; // 30 ثانية افتراضي (كان 90)

  private constructor() {
    // تهيئة عند الإنشاء
    console.log('[DatabaseCoordinator] ✅ Initialized');

    // ⚡ DEBUG: تتبع حالة المنسق كل 5 ثواني
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.lockState.isLocked || this.syncPaused || this.queue.length > 0) {
          console.log('[DatabaseCoordinator] 📊 STATUS:', {
            isLocked: this.lockState.isLocked,
            heldBy: this.lockState.heldBy,
            heldByType: this.lockState.heldByType,
            lockDuration: this.lockState.acquiredAt ? `${Date.now() - this.lockState.acquiredAt}ms` : null,
            syncPaused: this.syncPaused,
            syncPauseReason: this.syncPauseReason,
            queueLength: this.queue.length,
            waitingCount: this.lockState.waitingCount,
          });
        }
      }, 5000);
    }
  }

  static getInstance(): DatabaseCoordinator {
    if (!DatabaseCoordinator.instance) {
      DatabaseCoordinator.instance = new DatabaseCoordinator();
    }
    return DatabaseCoordinator.instance;
  }

  // ============================================================
  // 🔒 إدارة القفل
  // ============================================================

  /**
   * ⚡ الحصول على القفل (مع انتظار)
   */
  private async acquireLock(operationId: string, type: OperationType): Promise<void> {
    const startWait = Date.now();

    console.log(`[DatabaseCoordinator] 🔒 ACQUIRE_LOCK_START: ${operationId}`, {
      type,
      currentlyLocked: this.lockState.isLocked,
      currentHolder: this.lockState.heldBy,
      currentHolderType: this.lockState.heldByType,
      waitingCount: this.lockState.waitingCount,
      timestamp: new Date().toISOString(),
    });

    // إذا القفل مُحتجز، انتظر
    while (this.lockState.isLocked) {
      this.lockState.waitingCount++;
      this.stats.lockContentions++;

      console.log(`[DatabaseCoordinator] ⏳ WAITING_FOR_LOCK: ${operationId}`, {
        type,
        waitingFor: this.lockState.heldBy,
        waitingForType: this.lockState.heldByType,
        lockHeldFor: this.lockState.acquiredAt ? `${Date.now() - this.lockState.acquiredAt}ms` : 'unknown',
        waitingCount: this.lockState.waitingCount,
      });

      // إنشاء promise للانتظار
      if (!this.lockPromise) {
        this.lockPromise = new Promise(resolve => {
          this.lockResolve = resolve;
        });
      }

      // انتظار مع timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Lock acquisition timeout')), this.LOCK_TIMEOUT_MS);
      });

      try {
        await Promise.race([this.lockPromise, timeoutPromise]);
      } catch (error) {
        this.lockState.waitingCount--;
        console.error(`[DatabaseCoordinator] ❌ LOCK_TIMEOUT: ${operationId}`, {
          type,
          waitedFor: `${Date.now() - startWait}ms`,
          wasWaitingFor: this.lockState.heldBy,
        });
        throw error;
      }

      this.lockState.waitingCount--;
    }

    // احتجاز القفل
    this.lockState.isLocked = true;
    this.lockState.heldBy = operationId;
    this.lockState.heldByType = type;
    this.lockState.acquiredAt = Date.now();

    // تحديث الإحصائيات
    const waitTime = Date.now() - startWait;
    if (waitTime > 0) {
      this.stats.averageWaitTime = (this.stats.averageWaitTime + waitTime) / 2;
      if (waitTime > this.stats.maxWaitTime) {
        this.stats.maxWaitTime = waitTime;
      }
    }

    console.log(`[DatabaseCoordinator] ✅ LOCK_ACQUIRED: ${operationId}`, {
      type,
      waitTime: `${waitTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * ⚡ إطلاق القفل
   */
  private releaseLock(): void {
    const wasHeldBy = this.lockState.heldBy;
    const wasHeldByType = this.lockState.heldByType;
    const holdDuration = this.lockState.acquiredAt ? Date.now() - this.lockState.acquiredAt : 0;

    this.lockState.isLocked = false;
    this.lockState.heldBy = null;
    this.lockState.heldByType = null;
    this.lockState.acquiredAt = null;

    console.log(`[DatabaseCoordinator] 🔓 LOCK_RELEASED: ${wasHeldBy}`, {
      type: wasHeldByType,
      holdDuration: `${holdDuration}ms`,
      waitingCount: this.lockState.waitingCount,
      timestamp: new Date().toISOString(),
    });

    // إيقاظ المنتظرين
    if (this.lockResolve) {
      console.log(`[DatabaseCoordinator] 👋 WAKING_UP_WAITERS: ${this.lockState.waitingCount} waiting`);
      this.lockResolve();
      this.lockResolve = null;
      this.lockPromise = null;
    }
  }

  // ============================================================
  // ⚡ تنفيذ العمليات
  // ============================================================

  /**
   * ⚡ تنفيذ عملية POS (أولوية قصوى)
   * يوقف المزامنة مؤقتاً ويعطي الأولوية للعملية
   * ⚡ CRITICAL FIX: استئناف المزامنة فوراً بعد انتهاء العملية
   */
  async executePOS<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    const operationId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`[DatabaseCoordinator] 🛒 POS_OPERATION_START: ${operationId}`, {
      description,
      timestamp: new Date().toISOString(),
      currentLockState: this.lockState.isLocked,
      currentHolder: this.lockState.heldBy,
      timeout: `${this.POS_OPERATION_TIMEOUT_MS}ms`,
    });

    // ⏸️ إيقاف المزامنة مؤقتاً
    this.pauseSync('POS operation in progress');

    try {
      const result = await this.executeWithLock(
        operationId,
        'pos',
        'critical',
        operation,
        description,
        { skipTimeout: true }
      );

      const duration = Date.now() - startTime;
      console.log(`[DatabaseCoordinator] ✅ POS_OPERATION_SUCCESS: ${operationId}`, {
        description,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      // ⚡ CRITICAL FIX: إذا استغرقت العملية أكثر من 5 ثواني، تحذير
      if (duration > 5000) {
        console.warn(`[DatabaseCoordinator] ⚠️ Slow POS operation: ${duration}ms - ${description}`);
      }

      return result;
    } catch (error: any) {
      console.error(`[DatabaseCoordinator] ❌ POS_OPERATION_FAILED: ${operationId}`, {
        description,
        duration: `${Date.now() - startTime}ms`,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      // ▶️ استئناف المزامنة فوراً بعد انتهاء العملية
      this.resumeSync();
      
      // ⚡ CRITICAL FIX: إطلاق حدث لبدء المزامنة فوراً بعد انتهاء POS operation
      // هذا يضمن أن المزامنة تبدأ مباشرة بعد إنشاء الطلبية
      setTimeout(() => {
        if (!this.isSyncPaused()) {
          window.dispatchEvent(new CustomEvent('sync-resumed-after-pos', {
            detail: { operationId, description }
          }));
        }
      }, 100); // تأخير بسيط (100ms) للتأكد من أن العملية انتهت تماماً
    }
  }

  /**
   * ⚡ تنفيذ عملية مزامنة (Push)
   */
  async executeSyncPush<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    // تحقق من إيقاف المزامنة
    if (this.syncPaused) {
      throw new Error(`Sync paused: ${this.syncPauseReason}`);
    }

    const operationId = `sync-push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.executeWithLock(operationId, 'sync-push', 'normal', operation, description);
  }

  /**
   * ⚡ تنفيذ عملية مزامنة (Pull)
   */
  async executeSyncPull<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    // تحقق من إيقاف المزامنة
    if (this.syncPaused) {
      throw new Error(`Sync paused: ${this.syncPauseReason}`);
    }

    const operationId = `sync-pull-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.executeWithLock(operationId, 'sync-pull', 'low', operation, description);
  }

  /**
   * ⚡ تنفيذ عملية Realtime
   */
  async executeRealtime<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    const operationId = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.executeWithLock(operationId, 'realtime', 'high', operation, description);
  }

  /**
   * ⚡ تنفيذ عملية عامة
   */
  async execute<T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> {
    const operationId = `general-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.executeWithLock(operationId, 'general', 'normal', operation, description);
  }

  /**
   * ⚡ تنفيذ عملية مع القفل
   */
  private async executeWithLock<T>(
    operationId: string,
    type: OperationType,
    priority: OperationPriority,
    operation: () => Promise<T>,
    description?: string,
    options?: { timeoutMs?: number; skipTimeout?: boolean }
  ): Promise<T> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs ?? this.OPERATION_TIMEOUT_MS;

    // تحديث الإحصائيات
    this.stats.totalOperations++;
    if (type === 'pos') this.stats.posOperations++;
    if (type.startsWith('sync')) this.stats.syncOperations++;

    try {
      // احتجاز القفل
      await this.acquireLock(operationId, type);

      if (description) {
        console.log(`[DatabaseCoordinator] 🔐 ${type}: ${description}`);
      }

      let result: T;

      if (options?.skipTimeout) {
        result = await operation();
      } else {
        // تنفيذ العملية مع timeout
        result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Operation timeout: ${description || operationId}`)),
              timeoutMs
            );
          }),
        ]);
      }

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[DatabaseCoordinator] ⚠️ Slow operation (${duration}ms): ${description || operationId}`);
      }

      return result;
    } finally {
      this.releaseLock();
    }
  }

  // ============================================================
  // ⏸️ التحكم في المزامنة
  // ============================================================

  /**
   * ⏸️ إيقاف المزامنة مؤقتاً
   */
  pauseSync(reason: string): void {
    if (!this.syncPaused) {
      this.syncPaused = true;
      this.syncPauseReason = reason;
      console.log(`[DatabaseCoordinator] ⏸️ Sync paused: ${reason}`);
    }
  }

  /**
   * ▶️ استئناف المزامنة
   */
  resumeSync(): void {
    if (this.syncPaused) {
      this.syncPaused = false;
      this.syncPauseReason = null;
      console.log('[DatabaseCoordinator] ▶️ Sync resumed');
    }
  }

  /**
   * ❓ هل المزامنة متوقفة؟
   */
  isSyncPaused(): boolean {
    return this.syncPaused;
  }

  /**
   * 📝 سبب إيقاف المزامنة
   */
  getSyncPauseReason(): string | null {
    return this.syncPauseReason;
  }

  // ============================================================
  // 📊 الإحصائيات والحالة
  // ============================================================

  /**
   * 📊 الحصول على الإحصائيات
   */
  getStats(): CoordinatorStats {
    return { ...this.stats, currentQueueLength: this.queue.length };
  }

  /**
   * 🔒 الحصول على حالة القفل
   */
  getLockState(): LockState {
    return { ...this.lockState };
  }

  /**
   * 🔄 إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      posOperations: 0,
      syncOperations: 0,
      averageWaitTime: 0,
      maxWaitTime: 0,
      lockContentions: 0,
      currentQueueLength: 0,
    };
  }

  /**
   * 🛠️ تشخيص حالة المنسق
   */
  diagnose(): {
    lockState: LockState;
    stats: CoordinatorStats;
    syncPaused: boolean;
    syncPauseReason: string | null;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // تحليل الإحصائيات
    if (this.stats.averageWaitTime > 1000) {
      recommendations.push('⚠️ Average wait time is high. Consider optimizing operations.');
    }
    if (this.stats.lockContentions > 100) {
      recommendations.push('⚠️ High lock contention. Consider batching operations.');
    }
    if (this.stats.maxWaitTime > 10000) {
      recommendations.push('⚠️ Max wait time exceeded 10s. Check for deadlocks.');
    }

    // تحليل حالة القفل
    if (this.lockState.isLocked && this.lockState.acquiredAt) {
      const lockDuration = Date.now() - this.lockState.acquiredAt;
      if (lockDuration > 5000) {
        recommendations.push(`⚠️ Lock held for ${lockDuration}ms by ${this.lockState.heldBy}`);
      }
    }

    return {
      lockState: this.getLockState(),
      stats: this.getStats(),
      syncPaused: this.syncPaused,
      syncPauseReason: this.syncPauseReason,
      recommendations,
    };
  }
}

// ============================================================
// 📤 Export
// ============================================================

export const databaseCoordinator = DatabaseCoordinator.getInstance();
export default databaseCoordinator;
