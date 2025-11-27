/**
 * SQLiteWriteQueue - Single Writer Pattern
 * يضمن تسلسل عمليات الكتابة لمنع "Database is locked" errors
 *
 * المشكلة: عندما يكتب Outbox و RealtimeReceiver في نفس الوقت = Deadlock
 * الحل: جميع الكتابات تمر عبر Queue واحدة
 */

import { sqliteDB } from '@/lib/db/sqliteAPI';

type QueuedTask<T = any> = {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
};

export class SQLiteWriteQueue {
  private static instance: SQLiteWriteQueue;
  private queue: QueuedTask[] = [];
  private isProcessing = false;
  private isReady = false;
  private readyPromise: Promise<boolean> | null = null;
  private organizationId: string | null = null;

  private constructor() {
    // لا نفعل checkReady هنا - ننتظر حتى أول استخدام
  }

  /**
   * ⚡ تعيين معرف المؤسسة - مطلوب لتهيئة DB في Tauri
   */
  setOrganizationId(orgId: string): void {
    this.organizationId = orgId;
  }

  static getInstance(): SQLiteWriteQueue {
    if (!SQLiteWriteQueue.instance) {
      SQLiteWriteQueue.instance = new SQLiteWriteQueue();
    }
    return SQLiteWriteQueue.instance;
  }

  /**
   * التحقق من جاهزية SQLite
   * ⚡ يدعم Tauri v2 مع انتظار التهيئة
   * ⚡ يسمح بإعادة المحاولة إذا فشلت المحاولات السابقة
   */
  private async checkReady(): Promise<boolean> {
    // إذا جاهز بالفعل
    if (this.isReady) return true;

    // ⚡ محاولة سريعة مباشرة إذا كانت DB جاهزة الآن
    if (await this._quickCheck()) {
      return true;
    }

    // إذا هناك فحص جارٍ، انتظره
    if (this.readyPromise) {
      const result = await this.readyPromise;
      // ⚡ إذا فشل سابقاً، أعد المحاولة
      if (!result && !this.isReady) {
        this.readyPromise = null;
        return this._doCheckReady();
      }
      return result;
    }

    this.readyPromise = this._doCheckReady();
    return this.readyPromise;
  }

  /**
   * فحص سريع بدون انتظار
   */
  private async _quickCheck(): Promise<boolean> {
    if (this.isReady) return true;
    try {
      if (sqliteDB && typeof sqliteDB.query === 'function') {
        const result = await sqliteDB.query('SELECT 1');
        if (result) {
          this.isReady = true;
          console.log('[SQLiteWriteQueue] ✅ Quick check passed - DB is ready');
          return true;
        }
      }
    } catch {
      // تجاهل - سنحاول بالطريقة الكاملة
    }
    return false;
  }

  private async _doCheckReady(): Promise<boolean> {
    // ⚡ زيادة عدد المحاولات والتأخير لأن Tauri Schema يأخذ وقتاً
    const maxAttempts = 60; // 60 محاولة × 500ms = 30 ثانية كحد أقصى
    const delayMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // فحص جاهزية sqliteDB
        if (sqliteDB && typeof sqliteDB.execute === 'function') {
          // ⚡ في Tauri: نحتاج استدعاء initialize أولاً
          if (this.organizationId) {
            try {
              const initResult = await sqliteDB.initialize(this.organizationId);
              if (initResult.success) {
                const result = await sqliteDB.query('SELECT 1');
                if (result) {
                  this.isReady = true;
                  console.log(`[SQLiteWriteQueue] ✅ Ready (attempt ${attempt + 1})`);
                  return true;
                }
              }
            } catch (initError: any) {
              const errorMsg = initError?.message || String(initError);
              if (attempt % 5 === 0) {
                console.log(`[SQLiteWriteQueue] ⏳ Waiting for DB init (attempt ${attempt + 1}/${maxAttempts})...`);
              }
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
          } else {
            // ⚡ بدون organizationId: نحاول query مباشرة (قد يعمل إذا كان DB مهيأ مسبقاً)
            try {
              const result = await sqliteDB.query('SELECT 1');
              if (result) {
                this.isReady = true;
                console.log(`[SQLiteWriteQueue] ✅ Ready (attempt ${attempt + 1})`);
                return true;
              }
            } catch (testError: any) {
              const errorMsg = testError?.message || String(testError);
              if (errorMsg.includes('not initialized') || errorMsg.includes('Database not initialized') || errorMsg.includes('no such table')) {
                if (attempt % 5 === 0) {
                  console.log(`[SQLiteWriteQueue] ⏳ Waiting for DB init (attempt ${attempt + 1}/${maxAttempts})... (no orgId set)`);
                }
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
              console.warn(`[SQLiteWriteQueue] ⚠️ Query error but continuing:`, errorMsg.slice(0, 50));
            }
          }
        }

        // انتظار قبل المحاولة التالية
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        if (attempt % 10 === 0) {
          console.error(`[SQLiteWriteQueue] Error in checkReady attempt ${attempt + 1}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error('[SQLiteWriteQueue] ❌ Failed to initialize after max attempts (30s)');
    // ⚡ مسح الـ promise للسماح بإعادة المحاولة لاحقاً
    this.readyPromise = null;
    return false;
  }

  /**
   * كتابة مع ضمان التسلسل
   */
  async write<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.isReady) {
      await this.checkReady();
    }

    return this.enqueue(
      async () => {
        const result = await sqliteDB.execute(sql, params);
        return result as T;
      },
      'normal'
    );
  }

  /**
   * كتابة عالية الأولوية (مثل Realtime operations)
   */
  async writeHighPriority<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.isReady) {
      await this.checkReady();
    }

    return this.enqueue(
      async () => {
        const result = await sqliteDB.execute(sql, params);
        return result as T;
      },
      'high'
    );
  }

  /**
   * قراءة (لا تحتاج تسلسل في WAL mode)
   * لكن نمررها عبر sqliteDB مباشرة
   * ⚡ إرجاع مصفوفة دائماً حتى في حالة الفشل
   */
  async read<T = any[]>(sql: string, params: any[] = []): Promise<T> {
    // ⚡ انتظار الجاهزية دائماً
    const ready = await this.checkReady();
    if (!ready) {
      console.warn('[SQLiteWriteQueue] ⚠️ Read called but DB not ready!', { sql: sql.slice(0, 50) });
      return [] as T;
    }

    try {
      const result = await sqliteDB.query(sql, params);
      // ⚡ sqliteDB.query يرجع { success, data, error }
      // نستخرج data ونرجع مصفوفة فارغة كـ fallback
      if (result && typeof result === 'object' && 'data' in result) {
        return (result.data || []) as T;
      }
      // إذا كانت النتيجة مصفوفة مباشرة
      if (Array.isArray(result)) {
        return result as T;
      }
      // fallback: مصفوفة فارغة
      console.warn('[SQLiteWriteQueue] ⚠️ Unexpected result format:', typeof result);
      return [] as T;
    } catch (error: any) {
      // ⚡ كتم أخطاء التهيئة والجداول المفقودة المتوقعة
      const errorMsg = error?.message || String(error);

      // ⚡ تصفية الأخطاء المتوقعة:
      // 1. أخطاء التهيئة (DB not initialized)
      // 2. جداول المزامنة المفقودة في global DB (sync_outbox, sync_cursor)
      const isExpectedError =
        errorMsg.includes('not initialized') ||
        errorMsg.includes('Database not initialized') ||
        (errorMsg.includes('no such table') && (
          errorMsg.includes('sync_outbox') ||
          errorMsg.includes('sync_cursor')
        ));

      if (!isExpectedError) {
        console.error('[SQLiteWriteQueue] ❌ Read error:', { sql: sql.slice(0, 50), error: errorMsg });
      }
      // ⚡ إرجاع مصفوفة فارغة بدلاً من throw لتجنب أخطاء runtime
      return [] as T;
    }
  }

  /**
   * Transaction كاملة - مجموعة عمليات ذرية
   */
  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    if (!this.isReady) {
      await this.checkReady();
    }

    return this.enqueue(
      async () => {
        await sqliteDB.execute('BEGIN IMMEDIATE');
        try {
          const result = await operations();
          await sqliteDB.execute('COMMIT');
          return result;
        } catch (error) {
          await sqliteDB.execute('ROLLBACK');
          throw error;
        }
      },
      'high' // Transactions get high priority
    );
  }

  /**
   * Batch write - تنفيذ عدة عمليات في transaction واحدة
   */
  async batchWrite(statements: Array<{ sql: string; params?: any[] }>): Promise<void> {
    if (statements.length === 0) return;

    return this.transaction(async () => {
      for (const stmt of statements) {
        await sqliteDB.execute(stmt.sql, stmt.params || []);
      }
    });
  }

  /**
   * UPSERT آمن مع merge
   */
  async upsert(
    tableName: string,
    data: Record<string, any>,
    conflictColumns: string[] = ['id']
  ): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const updateSet = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = excluded.${col}`)
      .join(', ');

    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')})
      DO UPDATE SET ${updateSet}
    `;

    await this.write(sql, values);
  }

  /**
   * إضافة للـ Queue
   */
  private async enqueue<T>(
    execute: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: crypto.randomUUID(),
        execute,
        resolve,
        reject,
        priority,
        createdAt: Date.now()
      };

      // إدراج حسب الأولوية
      if (priority === 'high') {
        // High priority goes to front (after other high priority)
        const firstNonHigh = this.queue.findIndex(t => t.priority !== 'high');
        if (firstNonHigh === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(firstNonHigh, 0, task);
        }
      } else if (priority === 'low') {
        this.queue.push(task);
      } else {
        // Normal priority goes after high, before low
        const firstLow = this.queue.findIndex(t => t.priority === 'low');
        if (firstLow === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(firstLow, 0, task);
        }
      }

      this.processQueue();
    });
  }

  /**
   * معالجة الـ Queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;

      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        console.error('[SQLiteWriteQueue] Task error:', error);
        task.reject(error);
      }

      // Small yield to prevent blocking
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.isProcessing = false;
  }

  /**
   * الحصول على حالة الـ Queue
   */
  getQueueStats(): {
    queueLength: number;
    isProcessing: boolean;
    isReady: boolean;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isReady: this.isReady
    };
  }

  /**
   * مسح الـ Queue (للاستخدام في حالات الطوارئ)
   */
  clearQueue(): void {
    const pending = this.queue.splice(0);
    for (const task of pending) {
      task.reject(new Error('Queue cleared'));
    }
  }
}

export const sqliteWriteQueue = SQLiteWriteQueue.getInstance();
