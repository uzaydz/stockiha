/**
 * SQLiteWriteQueue - Single Writer Pattern (Enhanced v2.0)
 * يضمن تسلسل عمليات الكتابة لمنع "Database is locked" errors
 *
 * المشكلة: عندما يكتب Outbox و RealtimeReceiver في نفس الوقت = Deadlock
 * الحل: جميع الكتابات تمر عبر Queue واحدة
 *
 * ⚡ التحسينات في v2.0:
 * 1. استخدام BEGIN IMMEDIATE بدلاً من BEGIN لتجنب deadlocks
 * 2. busy_timeout أعلى (60 ثانية) في Tauri client
 * 3. تكامل مع DatabaseCoordinator للتنسيق المركزي
 * 4. تتبع أفضل للأداء والتشخيص
 *
 * 🔗 المصادر:
 * - https://sqlite.org/lang_transaction.html (BEGIN IMMEDIATE)
 * - https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/
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
  // ⚡ تتبع ما إذا كنا داخل معاملة لمنع deadlock
  private inTransaction = false;

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

    // ⚡ في حال عدم توفر organizationId، لا ندخل في حلقة انتظار طويلة
    // نحاول فحصاً سريعاً، ثم نرجع false بسرعة بدلاً من إعادة المحاولة 60 مرة
    if (!this.organizationId) {
      try {
        // إذا كانت قاعدة البيانات مهيأة بالفعل (مثلاً global DB)
        if (typeof (sqliteDB as any).isReady === 'function' && (sqliteDB as any).isReady()) {
          this.isReady = true;
          console.log('[SQLiteWriteQueue] ✅ Ready without organizationId (DB already initialized)');
          return true;
        }
      } catch {
        // تجاهل أي خطأ في isReady
      }

      try {
        if (sqliteDB && typeof sqliteDB.query === 'function') {
          const result = await sqliteDB.query('SELECT 1');
          if (result) {
            this.isReady = true;
            console.log('[SQLiteWriteQueue] ✅ Ready (SELECT 1 succeeded without organizationId)');
            return true;
          }
        }
      } catch {
        // إذا فشل الاستعلام فهذا متوقع قبل التهيئة، لا حاجة لإعادة المحاولة
      }

      // ⚡ CRITICAL FIX: استخدام console.log بدلاً من warn - هذا سلوك متوقع أثناء بدء التطبيق
      if (process.env.NODE_ENV === 'development') {
        console.log('[SQLiteWriteQueue] ℹ️ checkReady called before organizationId was set - will retry after initialization');
      }
      // مسح الـ promise للسماح بمحاولات لاحقة بعد تعيين organizationId
      this.readyPromise = null;
      return false;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // فحص جاهزية sqliteDB
        if (sqliteDB && typeof sqliteDB.execute === 'function') {
          // ⚡ في Tauri: نحتاج استدعاء initialize أولاً
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
   * ⚡ إذا كنا داخل معاملة، ننفذ مباشرة لتجنب deadlock
   */
  async write<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.isReady) {
      await this.checkReady();
    }

    // ⚡ CRITICAL FIX: إذا كنا داخل معاملة، ننفذ مباشرة بدون enqueue
    // هذا يمنع deadlock عندما نستدعي write() من داخل transaction callback
    if (this.inTransaction) {
      const directExecuteStart = Date.now();
      console.log('[SQLiteWriteQueue] ⚡ Direct execute (inside transaction):', {
        sql: sql.substring(0, 100),
        paramsCount: params.length,
        timestamp: new Date().toISOString()
      });
      
      // ⚡ CRITICAL FIX v3: retry logic with CONSTANT interval (research-backed)
      // Recent research shows constant intervals are better than exponential backoff for SQLite
      // Source: https://fractaledmind.github.io/2024/07/19/sqlite-in-ruby-backoff-busy-handler-problems/
      let lastError: any;
      const MAX_TRANSACTION_RETRIES = 10; // More retries with shorter delays
      const TRANSACTION_RETRY_DELAY = 50; // ⚡ CONSTANT 50ms delay (not exponential)

      for (let retry = 1; retry <= MAX_TRANSACTION_RETRIES; retry++) {
        try {
          const result = await sqliteDB.execute(sql, params);
          if (retry > 1 && process.env.NODE_ENV === 'development') {
            console.log(`[SQLiteWriteQueue] ✅ Direct execute SUCCESS after ${retry} retries (${Date.now() - directExecuteStart}ms)`);
          }
          return result as T;
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || String(error);
          const isLocked = errorMsg.includes('database is locked') ||
                          errorMsg.includes('SQLITE_BUSY') ||
                          errorMsg.includes('code: 5');

          if (isLocked && retry < MAX_TRANSACTION_RETRIES) {
            // ⚡ CONSTANT delay (not exponential) - research shows this is better for SQLite
            await new Promise(resolve => setTimeout(resolve, TRANSACTION_RETRY_DELAY));
            continue;
          }

          // إذا لم يكن locked error أو انتهت المحاولات، رمي الخطأ
          if (retry >= MAX_TRANSACTION_RETRIES || !isLocked) {
            console.error('[SQLiteWriteQueue] ❌ Direct execute FAILED:', {
              duration: `${Date.now() - directExecuteStart}ms`,
              sql: sql.substring(0, 50),
              error: errorMsg,
              totalRetries: retry
            });
          }
          throw error;
        }
      }

      // إذا وصلنا هنا، فشلت جميع المحاولات
      throw lastError || new Error('Direct execute failed after all retries');
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
   * ⚡ إذا كنا داخل معاملة، ننفذ مباشرة لتجنب deadlock
   */
  async writeHighPriority<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.isReady) {
      await this.checkReady();
    }

    // ⚡ CRITICAL FIX: إذا كنا داخل معاملة، ننفذ مباشرة بدون enqueue
    if (this.inTransaction) {
      console.log('[SQLiteWriteQueue] ⚡ Direct execute (inside transaction, high priority):', sql.substring(0, 100));
      const result = await sqliteDB.execute(sql, params);
      return result as T;
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
   *
   * ⚠️ CRITICAL FIX: منع ابتلاع أخطاء القراءة
   * - الأخطاء المتوقعة فقط (تهيئة، جداول sync) تُعاد كمصفوفة فارغة
   * - جميع الأخطاء الأخرى تُسجل بوضوح وتُرمى لمنع فقدان البيانات
   */
  async read<T = any[]>(sql: string, params: any[] = []): Promise<T> {
    // ⚡ انتظار الجاهزية دائماً
    const ready = await this.checkReady();

    // ⚡ CRITICAL FIX: إذا لم تكن قاعدة البيانات جاهزة، لا تنفذ القراءة
    // بل ارجع مصفوفة فارغة بدلاً من إظهار تحذيرات مُقلقة
    if (!ready) {
      // ⚡ نستخدم log بدلاً من warn لتقليل الضوضاء - هذا سلوك متوقع أثناء التهيئة
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SQLiteWriteQueue] ℹ️ Read skipped - DB initializing. SQL: ${sql.slice(0, 80)}...`);
      }
      // ⚡ حالة عدم الجاهزية متوقعة - نرجع مصفوفة فارغة
      return [] as T;
    }

    try {
      const result = await sqliteDB.query(sql, params);
      // ⚡ sqliteDB.query يرجع { success, data, error }
      // نستخرج data ونرجع مصفوفة فارغة كـ fallback
      if (result && typeof result === 'object' && 'data' in result) {
        // ⚡ التحقق من وجود error في النتيجة
        if ('error' in result && result.error) {
          const errorMsg = `[SQLiteWriteQueue] ❌ Query returned error: ${result.error}. SQL: ${sql.slice(0, 100)}`;
          console.error(errorMsg, { params: params.slice(0, 5) });
          // ⚡ إذا كان خطأ في النتيجة، نرميه بدلاً من إرجاع مصفوفة فارغة
          throw new Error(`SQLite query error: ${result.error}`);
        }
        return (result.data || []) as T;
      }
      // إذا كانت النتيجة مصفوفة مباشرة
      if (Array.isArray(result)) {
        return result as T;
      }
      // fallback: مصفوفة فارغة مع تحذير
      console.warn('[SQLiteWriteQueue] ⚠️ Unexpected result format:', typeof result, { sql: sql.slice(0, 50) });
      return [] as T;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const errorStack = error?.stack || '';

      // ⚡ تصفية الأخطاء المتوقعة فقط:
      // 1. أخطاء التهيئة (DB not initialized)
      // 2. جداول المزامنة المفقودة في global DB (sync_outbox, sync_cursor)
      const isExpectedError =
        errorMsg.includes('not initialized') ||
        errorMsg.includes('Database not initialized') ||
        (errorMsg.includes('no such table') && (
          errorMsg.includes('sync_outbox') ||
          errorMsg.includes('sync_cursor')
        ));

      if (isExpectedError) {
        // ⚡ الأخطاء المتوقعة فقط - نرجع مصفوفة فارغة بدون تسجيل خطأ
        return [] as T;
      }

      // ⚡ CRITICAL: جميع الأخطاء الأخرى يجب تسجيلها بوضوح ورميها
      // هذا يمنع التطبيق من التعامل مع فشل القراءة كـ "بيانات فارغة"
      const criticalError = new Error(
        `[SQLiteWriteQueue] ❌ CRITICAL READ ERROR - Data integrity risk!\n` +
        `SQL: ${sql.slice(0, 200)}\n` +
        `Params: ${JSON.stringify(params.slice(0, 5))}\n` +
        `Error: ${errorMsg}\n` +
        `Stack: ${errorStack.slice(0, 500)}`
      );
      
      // ⚡ تسجيل مفصل للخطأ
      console.error('[SQLiteWriteQueue] ❌ CRITICAL READ ERROR:', {
        sql: sql.slice(0, 200),
        params: params.slice(0, 5),
        error: errorMsg,
        stack: errorStack.slice(0, 500),
        timestamp: new Date().toISOString()
      });

      // ⚡ رمي الخطأ لمنع فقدان البيانات
      // الكود الذي يستدعي read() يجب أن يتعامل مع الخطأ بشكل صحيح
      throw criticalError;
    }
  }

  /**
   * ⚡ CRITICAL FIX: التحقق من حالة المعاملة الفعلية في SQLite
   * يُستخدم لتجنب خطأ "cannot start a transaction within a transaction"
   */
  private async checkActiveTransaction(): Promise<boolean> {
    try {
      // ⚡ محاولة ROLLBACK - إذا لم تكن هناك معاملة، سيفشل بأمان
      const result = await sqliteDB.execute('SELECT 1');
      // إذا نجح، نحاول اكتشاف إذا كانت هناك معاملة نشطة
      // في SQLite، لا توجد طريقة مباشرة للتحقق، لكن يمكننا محاولة ROLLBACK
      const rollbackTest = await sqliteDB.execute('ROLLBACK');
      if (rollbackTest && typeof rollbackTest === 'object' && 'success' in rollbackTest) {
        if (rollbackTest.success) {
          console.warn('[SQLiteWriteQueue] ⚠️ Found orphan transaction - rolled back');
          return true; // كانت هناك معاملة نشطة
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Transaction كاملة - مجموعة عمليات ذرية
   * ⚡ CRITICAL FIX: تعيين inTransaction flag لمنع deadlock
   */
  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const txStartTime = Date.now();

    console.log(`[SQLiteWriteQueue] 🔄 TRANSACTION_START: ${txId}`, {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      inTransaction: this.inTransaction,
      timestamp: new Date().toISOString(),
    });

    if (!this.isReady) {
      await this.checkReady();
    }
    
    // ⚡ CRITICAL FIX: إذا كان flag يقول أننا في معاملة، انتظر قليلاً ثم تحقق
    if (this.inTransaction) {
      console.warn(`[SQLiteWriteQueue] ⚠️ TRANSACTION_WAIT: ${txId} - انتظار انتهاء معاملة سابقة...`);
      let waitAttempts = 0;
      const maxWaitAttempts = 10;
      const waitInterval = 500; // 500ms
      
      while (this.inTransaction && waitAttempts < maxWaitAttempts) {
        await new Promise(resolve => setTimeout(resolve, waitInterval));
        waitAttempts++;
        console.log(`[SQLiteWriteQueue] ⏳ TRANSACTION_WAIT: ${txId} - محاولة ${waitAttempts}/${maxWaitAttempts}`);
      }
      
      if (this.inTransaction) {
        console.error(`[SQLiteWriteQueue] ❌ TRANSACTION_TIMEOUT: ${txId} - المعاملة السابقة لم تنته، إعادة تعيين الحالة`);
        // ⚡ إعادة تعيين الحالة - المعاملة السابقة ربما انتهت بـ timeout
        this.inTransaction = false;
        await this.checkActiveTransaction();
      }
    }

    return this.enqueue(
      async () => {
        // ⚡ تعيين flag قبل بدء المعاملة
        this.inTransaction = true;
        let transactionStarted = false;

        console.log(`[SQLiteWriteQueue] 🔒 BEGIN_IMMEDIATE: ${txId}`, {
          timestamp: new Date().toISOString(),
        });

        try {
          const beginStart = Date.now();
          
          // ⚡ CRITICAL FIX: التحقق من نتيجة BEGIN IMMEDIATE
          const beginResult = await sqliteDB.execute('BEGIN IMMEDIATE');
          if (beginResult && typeof beginResult === 'object' && 'success' in beginResult && !beginResult.success) {
            throw new Error((beginResult as any).error || 'BEGIN IMMEDIATE failed');
          }
          transactionStarted = true;

          console.log(`[SQLiteWriteQueue] ✅ BEGIN_SUCCESS: ${txId}`, {
            duration: `${Date.now() - beginStart}ms`,
            timestamp: new Date().toISOString(),
          });

          try {
            console.log(`[SQLiteWriteQueue] 🔄 EXECUTING_OPERATIONS: ${txId} - بدء تنفيذ العمليات داخل المعاملة`);
            const operationsStartTime = Date.now();
            const result = await operations();
            const operationsDuration = Date.now() - operationsStartTime;
            console.log(`[SQLiteWriteQueue] ✅ OPERATIONS_COMPLETE: ${txId} - انتهت العمليات في ${operationsDuration}ms`);

            const commitStart = Date.now();
            console.log(`[SQLiteWriteQueue] 💾 COMMIT_START: ${txId} - بدء COMMIT`);
            
            // ⚡ CRITICAL FIX: التحقق من نتيجة COMMIT
            const commitResult = await sqliteDB.execute('COMMIT');
            if (commitResult && typeof commitResult === 'object' && 'success' in commitResult && !commitResult.success) {
              const commitError = (commitResult as any).error || 'COMMIT failed';
              // ⚡ إذا فشل COMMIT بسبب "no transaction is active"، المعاملة قد انتهت بالفعل
              if (commitError.includes('no transaction is active') || commitError.includes('cannot commit')) {
                console.warn(`[SQLiteWriteQueue] ⚠️ COMMIT_SKIPPED: ${txId} - المعاملة انتهت مسبقاً (timeout أو خطأ سابق)`);
                transactionStarted = false; // تحديث الحالة
              } else {
                throw new Error(commitError);
              }
            }

            console.log(`[SQLiteWriteQueue] ✅ COMMIT_SUCCESS: ${txId}`, {
              commitDuration: `${Date.now() - commitStart}ms`,
              totalDuration: `${Date.now() - txStartTime}ms`,
              timestamp: new Date().toISOString(),
            });

            return result;
          } catch (error: any) {
            console.error(`[SQLiteWriteQueue] ❌ OPERATION_FAILED: ${txId}`, {
              error: error?.message,
              duration: `${Date.now() - txStartTime}ms`,
              timestamp: new Date().toISOString(),
            });

            // ⚡ محاولة rollback فقط إذا كانت المعاملة قد بدأت
            if (transactionStarted) {
              try {
                console.log(`[SQLiteWriteQueue] 🔙 ROLLBACK_START: ${txId}`);
                const rollbackResult = await sqliteDB.execute('ROLLBACK');
                
                // ⚡ CRITICAL FIX: التحقق من نتيجة ROLLBACK
                if (rollbackResult && typeof rollbackResult === 'object' && 'success' in rollbackResult && !rollbackResult.success) {
                  const rollbackErrorMsg = (rollbackResult as any).error || 'ROLLBACK failed';
                  // ⚡ تجاهل أخطاء ROLLBACK الشائعة
                  const isExpectedRollbackError =
                    rollbackErrorMsg.includes('no transaction is active') ||
                    rollbackErrorMsg.includes('cannot rollback') ||
                    rollbackErrorMsg.includes('database is locked') ||
                    rollbackErrorMsg.includes('SQLITE_BUSY');

                  if (!isExpectedRollbackError) {
                    console.error('[SQLiteWriteQueue] ⚠️ Unexpected rollback error:', rollbackErrorMsg);
                  } else {
                    console.log('[SQLiteWriteQueue] ℹ️ Rollback skipped (expected):', rollbackErrorMsg.substring(0, 100));
                  }
                } else {
                  console.log(`[SQLiteWriteQueue] ✅ ROLLBACK_SUCCESS: ${txId}`);
                }
              } catch (rollbackError: any) {
                // ⚡ تجاهل أخطاء ROLLBACK الشائعة (no transaction active, database locked)
                const errorMsg = rollbackError?.message || String(rollbackError);
                const isExpectedRollbackError =
                  errorMsg.includes('no transaction is active') ||
                  errorMsg.includes('cannot rollback') ||
                  errorMsg.includes('database is locked') ||
                  errorMsg.includes('SQLITE_BUSY');

                if (!isExpectedRollbackError) {
                  console.error('[SQLiteWriteQueue] ⚠️ Unexpected rollback error:', rollbackError);
                } else {
                  console.log('[SQLiteWriteQueue] ℹ️ Rollback skipped (expected):', errorMsg.substring(0, 100));
                }
              }
            }
            throw error;
          }
        } catch (error: any) {
          // ⚡ في حالة فشل BEGIN، لا نحتاج rollback
          console.error(`[SQLiteWriteQueue] ❌ BEGIN_FAILED: ${txId}`, {
            error: error?.message,
            timestamp: new Date().toISOString(),
          });
          throw error;
        } finally {
          // ⚡ إعادة تعيين flag بعد انتهاء المعاملة
          const finalDuration = Date.now() - txStartTime;
          this.inTransaction = false;
          console.log(`[SQLiteWriteQueue] 🏁 TRANSACTION_END: ${txId}`, {
            totalDuration: `${finalDuration}ms`,
            inTransaction: this.inTransaction,
            queueLength: this.queue.length,
            timestamp: new Date().toISOString(),
          });
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

    console.log(`[SQLiteWriteQueue] 📋 QUEUE_PROCESSING_START`, {
      queueLength: this.queue.length,
      tasks: this.queue.map(t => ({ id: t.id.slice(0, 8), priority: t.priority, age: `${Date.now() - t.createdAt}ms` })),
      timestamp: new Date().toISOString(),
    });

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      const taskStartTime = Date.now();

      console.log(`[SQLiteWriteQueue] ▶️ TASK_START: ${task.id}`, {
        priority: task.priority,
        queueAge: `${taskStartTime - task.createdAt}ms`,
        remainingInQueue: this.queue.length,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await task.execute();
        task.resolve(result);

        console.log(`[SQLiteWriteQueue] ✅ TASK_SUCCESS: ${task.id}`, {
          priority: task.priority,
          executionTime: `${Date.now() - taskStartTime}ms`,
          remainingInQueue: this.queue.length,
        });
      } catch (error: any) {
        console.error(`[SQLiteWriteQueue] ❌ TASK_FAILED: ${task.id}`, {
          priority: task.priority,
          executionTime: `${Date.now() - taskStartTime}ms`,
          error: error?.message,
          remainingInQueue: this.queue.length,
        });
        task.reject(error);
      }

      // Small yield to prevent blocking
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.isProcessing = false;
    console.log(`[SQLiteWriteQueue] 📋 QUEUE_PROCESSING_END`, {
      timestamp: new Date().toISOString(),
    });
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
