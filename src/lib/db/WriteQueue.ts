/**
 * 🔐 Write Queue - نظام طابور الكتابة الموحد لـ SQLite
 *
 * يحل مشكلة "database is locked" عن طريق:
 * 1. تسلسل جميع عمليات الكتابة (Serialization)
 * 2. تجميع العمليات في دفعات (Batching)
 * 3. Debouncing للعمليات المتكررة
 *
 * المصادر:
 * - https://sqlite.org/wal.html
 * - https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/
 */

type WriteOperation<T = any> = () => Promise<T>;

interface QueuedOperation<T = any> {
  operation: WriteOperation<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  label?: string;
}

interface BatchedWrite {
  table: string;
  records: any[];
  conflictTarget: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Write Queue Singleton
 * يضمن أن عملية كتابة واحدة فقط تعمل في أي وقت
 */
class WriteQueue {
  private static instance: WriteQueue;
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private batchBuffer: Map<string, BatchedWrite[]> = new Map();
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY_MS = 50; // تأخير قبل تنفيذ الدفعة
  private readonly MAX_BATCH_SIZE = 100; // الحد الأقصى للدفعة

  // إحصائيات للمراقبة
  private stats = {
    totalOperations: 0,
    batchedOperations: 0,
    serializedOperations: 0,
    errors: 0,
    avgWaitTime: 0,
    lastOperationTime: 0
  };

  private constructor() {}

  static getInstance(): WriteQueue {
    if (!WriteQueue.instance) {
      WriteQueue.instance = new WriteQueue();
    }
    return WriteQueue.instance;
  }

  /**
   * إضافة عملية كتابة إلى الطابور
   * تضمن تسلسل العمليات لتجنب database locked
   */
  async enqueue<T>(
    operation: WriteOperation<T>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      label?: string;
    } = {}
  ): Promise<T> {
    const { priority = 'normal', label } = options;

    return new Promise<T>((resolve, reject) => {
      const queuedOp: QueuedOperation<T> = {
        operation,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        label
      };

      // إضافة حسب الأولوية
      if (priority === 'high') {
        // إضافة في البداية بعد العمليات ذات الأولوية العالية الموجودة
        const highPriorityIndex = this.queue.findIndex(op => op.priority !== 'high');
        if (highPriorityIndex === -1) {
          this.queue.push(queuedOp);
        } else {
          this.queue.splice(highPriorityIndex, 0, queuedOp);
        }
      } else if (priority === 'low') {
        this.queue.push(queuedOp);
      } else {
        // normal - إضافة قبل العمليات ذات الأولوية المنخفضة
        const lowPriorityIndex = this.queue.findIndex(op => op.priority === 'low');
        if (lowPriorityIndex === -1) {
          this.queue.push(queuedOp);
        } else {
          this.queue.splice(lowPriorityIndex, 0, queuedOp);
        }
      }

      this.stats.totalOperations++;
      this.processQueue();
    });
  }

  /**
   * تجميع عمليات الإدخال/التحديث في دفعة واحدة
   * أسرع بكثير من العمليات الفردية
   */
  async enqueueBatch<T>(
    table: string,
    records: T[],
    conflictTarget: string = 'id'
  ): Promise<{ success: boolean; totalChanges: number; errors: number }> {
    if (!records || records.length === 0) {
      return { success: true, totalChanges: 0, errors: 0 };
    }

    return new Promise((resolve, reject) => {
      const key = `${table}:${conflictTarget}`;

      if (!this.batchBuffer.has(key)) {
        this.batchBuffer.set(key, []);
      }

      this.batchBuffer.get(key)!.push({
        table,
        records,
        conflictTarget,
        resolve,
        reject
      });

      this.stats.batchedOperations += records.length;

      // جدولة تنفيذ الدفعة
      this.scheduleBatchFlush();
    });
  }

  /**
   * جدولة تنفيذ الدفعات المجمعة
   */
  private scheduleBatchFlush(): void {
    // إلغاء أي timeout سابق
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // جدولة التنفيذ بعد تأخير قصير (للسماح بتجميع المزيد)
    this.batchTimeout = setTimeout(() => {
      this.flushBatches();
    }, this.BATCH_DELAY_MS);
  }

  /**
   * تنفيذ جميع الدفعات المجمعة
   */
  private async flushBatches(): Promise<void> {
    const batches = new Map(this.batchBuffer);
    this.batchBuffer.clear();

    for (const [key, operations] of batches) {
      if (operations.length === 0) continue;

      const [table, conflictTarget] = key.split(':');

      // تجميع كل السجلات من جميع العمليات
      const allRecords: any[] = [];
      for (const op of operations) {
        allRecords.push(...op.records);
      }

      // تقسيم إلى دفعات أصغر إذا لزم الأمر
      const chunks = this.chunkArray(allRecords, this.MAX_BATCH_SIZE);

      try {
        let totalChanges = 0;
        let totalErrors = 0;

        for (const chunk of chunks) {
          // تنفيذ الدفعة عبر الطابور لضمان التسلسل
          const result = await this.enqueue(async () => {
            const { tauriBatchUpsert } = await import('./tauriSqlClient');
            const { sqliteAPI } = await import('./sqliteAPI');
            const orgId = sqliteAPI.getCurrentOrganizationId();

            if (!orgId) {
              throw new Error('Organization ID not set');
            }

            return tauriBatchUpsert(orgId, table, chunk, conflictTarget);
          }, { priority: 'normal', label: `batch:${table}` });

          totalChanges += result.totalChanges || 0;
          totalErrors += result.errors || 0;
        }

        // إعلام جميع العمليات بالنجاح
        const successResult = { success: totalErrors === 0, totalChanges, errors: totalErrors };
        for (const op of operations) {
          op.resolve(successResult);
        }
      } catch (error) {
        // إعلام جميع العمليات بالفشل
        for (const op of operations) {
          op.reject(error);
        }
        this.stats.errors++;
      }
    }
  }

  /**
   * معالجة الطابور
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      const waitTime = Date.now() - operation.timestamp;

      try {
        const startTime = Date.now();
        const result = await operation.operation();
        const executionTime = Date.now() - startTime;

        // تحديث الإحصائيات
        this.stats.serializedOperations++;
        this.stats.lastOperationTime = executionTime;
        this.stats.avgWaitTime =
          (this.stats.avgWaitTime * (this.stats.serializedOperations - 1) + waitTime) /
          this.stats.serializedOperations;

        operation.resolve(result);
      } catch (error) {
        this.stats.errors++;
        operation.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * تقسيم مصفوفة إلى أجزاء
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * الحصول على الإحصائيات
   */
  getStats(): typeof this.stats & { queueLength: number; isProcessing: boolean } {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      batchedOperations: 0,
      serializedOperations: 0,
      errors: 0,
      avgWaitTime: 0,
      lastOperationTime: 0
    };
  }

  /**
   * انتظار اكتمال جميع العمليات
   */
  async flush(): Promise<void> {
    // تنفيذ الدفعات المعلقة فوراً
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.flushBatches();

    // انتظار الطابور
    while (this.isProcessing || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * تنظيف الطابور (للإغلاق)
   */
  clear(): void {
    // رفض جميع العمليات المعلقة
    for (const op of this.queue) {
      op.reject(new Error('Queue cleared'));
    }
    this.queue = [];

    // رفض الدفعات المعلقة
    for (const operations of this.batchBuffer.values()) {
      for (const op of operations) {
        op.reject(new Error('Queue cleared'));
      }
    }
    this.batchBuffer.clear();

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.isProcessing = false;
  }
}

// تصدير Singleton
export const writeQueue = WriteQueue.getInstance();

// تصدير الكلاس للاستخدام المتقدم
export { WriteQueue };

/**
 * Decorator/Helper للتسلسل التلقائي
 * استخدام: await serializedWrite(() => sqliteAPI.execute(...))
 */
export async function serializedWrite<T>(
  operation: WriteOperation<T>,
  options: { priority?: 'high' | 'normal' | 'low'; label?: string } = {}
): Promise<T> {
  return writeQueue.enqueue(operation, options);
}

/**
 * Helper للكتابة المجمعة
 * استخدام: await batchedUpsert('products', products)
 */
export async function batchedUpsert<T>(
  table: string,
  records: T[],
  conflictTarget: string = 'id'
): Promise<{ success: boolean; totalChanges: number; errors: number }> {
  return writeQueue.enqueueBatch(table, records, conflictTarget);
}
