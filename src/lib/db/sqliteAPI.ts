/**
 * طبقة API للتواصل مع قاعدة بيانات SQLite عبر Electron
 * تحل محل IndexedDB (Dexie) بنظام أسرع وأقوى
 */

/**
 * فحص إذا كان التطبيق يعمل في Electron
 * يستخدم عدة طرق للتأكد من البيئة
 */
export const isElectron = (): boolean => {
  // فحص متعدد للتأكد من Electron
  if (typeof window === 'undefined') return false;

  // فحص 2: user agent يحتوي على Electron
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) return true;

  // فحص 3: process.versions.electron موجود
  if (typeof (window as any).process !== 'undefined' && (window as any).process.versions?.electron) return true;

  return false;
};

/**
 * فحص إذا كان SQLite DB API متاح
 */
export const isSQLiteAvailable = (): boolean => {
  const w: any = typeof window !== 'undefined' ? (window as any) : undefined;
  return isElectron() &&
         w &&
         w.electronAPI?.db !== undefined &&
         typeof w.electronAPI.db.initialize === 'function';
};

/**
 * مدير قاعدة البيانات SQLite
 */
class SQLiteDatabaseAPI {
  private isInitialized = false;
  private currentOrganizationId: string | null = null;
  // منع التهيئة المتكررة والطلبات المتزامنة لنفس المؤسسة
  private initPromises: Map<string, Promise<{ success: boolean; path?: string; error?: string }>> = new Map();
  private lastInitResultByOrg: Map<string, { success: boolean; path?: string; error?: string }> = new Map();
  // Use an any-typed accessor to avoid TS complaints about the preload-exposed API shape
  private get db(): any {
    return (window as any)?.electronAPI?.db;
  }

  /**
   * تهيئة قاعدة البيانات
   */
  async initialize(organizationId: string): Promise<{ success: boolean; path?: string; error?: string }> {
    // التحقق من البيئة
    if (!isElectron()) {
      const error = 'SQLite is only available in Electron';
      console.error('[SQLite API]', error);
      return { success: false, error };
    }

    // التحقق من توفر db API
    if (!isSQLiteAvailable()) {
      const error = 'SQLite DB API not available. window.electronAPI.db is undefined. This usually means the Electron preload script has not exposed the db API yet.';
      console.error('[SQLite API]', error);
      console.error('[SQLite API] window.electronAPI:', (window as any).electronAPI);
      return { success: false, error };
    }

    // إذا كانت القاعدة مهيئة بالفعل لنفس المؤسسة، أعد النتيجة المخزنة
    if (this.isInitialized && this.currentOrganizationId === organizationId) {
      const cached = this.lastInitResultByOrg.get(organizationId);
      return cached || { success: true };
    }

    // منع التهيئة المتزامنة لنفس المؤسسة
    if (this.initPromises.has(organizationId)) {
      return this.initPromises.get(organizationId)!;
    }

    const p = (async () => {
      try {
        const result = await this.db.initialize(organizationId);
        if (result.success) {
          this.isInitialized = true;
          this.currentOrganizationId = organizationId;
          this.lastInitResultByOrg.set(organizationId, result);
          try { console.log(`[SQLite API] Database initialized for org: ${organizationId}`, result); } catch {}
        } else {
          try { console.error('[SQLite API] Initialize returned success=false:', result.error); } catch {}
        }
        return result;
      } catch (error: any) {
        try { console.error('[SQLite API] Initialize failed with exception:', error); } catch {}
        return { success: false, error: error.message || 'Unknown error' };
      } finally {
        // إزالة الوعد من الخريطة بعد اكتماله
        this.initPromises.delete(organizationId);
      }
    })();

    this.initPromises.set(organizationId, p);
    return p;
  }

  /**
   * التحقق من أن القاعدة مهيئة
   */
  private ensureInitialized(): void {
    if (!isSQLiteAvailable()) {
      throw new Error('SQLite DB API not available. window.electronAPI.db is undefined.');
    }
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * إضافة أو تحديث منتج
   */
  async upsertProduct(product: any): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.upsertProduct(product);
  }

  /**
   * البحث عن منتجات
   */
  async searchProducts(query: string, options?: {
    limit?: number;
    offset?: number;
    organizationId?: string;
  }): Promise<{ success: boolean; data: any[]; error?: string }> {
    this.ensureInitialized();
    return this.db.searchProducts(query, {
      ...options,
      organizationId: options?.organizationId || this.currentOrganizationId
    });
  }

  /**
   * بحث عام باستخدام FTS (حسب ما هو مفعّل في sqliteManager)
   */
  async search(
    table: string,
    query: string,
    options?: { limit?: number; offset?: number; organizationId?: string }
  ): Promise<{ success: boolean; data: any[]; error?: string }> {
    this.ensureInitialized();
    return this.db.search(table, query, {
      ...options,
      organizationId: options?.organizationId || this.currentOrganizationId
    });
  }

  /**
   * استعلام عام
   */
  async query(sql: string, params: any = {}): Promise<{ success: boolean; data: any[]; error?: string }> {
    this.ensureInitialized();
    return this.db.query(sql, params);
  }

  /**
   * استعلام لعنصر واحد
   */
  async queryOne(sql: string, params: any = {}): Promise<{ success: boolean; data: any; error?: string }> {
    this.ensureInitialized();
    return this.db.queryOne(sql, params);
  }

  /**
   * تنفيذ عمليات UPDATE/INSERT/DELETE
   */
  async execute(sql: string, params: any = {}): Promise<{ success: boolean; changes?: number; error?: string; lastInsertRowid?: number }> {
    this.ensureInitialized();
    return this.db.execute(sql, params);
  }

  /**
   * إضافة أو تحديث سجل
   */
  async upsert(table: string, data: any): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.upsert(table, data);
  }

  /**
   * حذف سجل
   */
  async delete(table: string, id: string): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.delete(table, id);
  }

  /**
   * إضافة طلب POS مع عناصره (معاملة واحدة)
   */
  async addPOSOrder(order: any, items: any[]): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    return this.db.addPOSOrder(order, items);
  }

  /**
   * الحصول على إحصائيات
   */
  async getStatistics(
    dateFrom: string,
    dateTo: string,
    organizationId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    this.ensureInitialized();
    return this.db.getStatistics(
      organizationId || this.currentOrganizationId!,
      dateFrom,
      dateTo
    );
  }

  /**
   * تنظيف البيانات القديمة
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<{
    success: boolean;
    ordersDeleted?: number;
    invoicesDeleted?: number;
    error?: string;
  }> {
    this.ensureInitialized();
    return this.db.cleanupOldData(daysToKeep);
  }

  /**
   * ضغط قاعدة البيانات (استعادة المساحة)
   */
  async vacuum(): Promise<{
    success: boolean;
    before?: number;
    after?: number;
    saved?: number;
    error?: string;
  }> {
    this.ensureInitialized();
    return this.db.vacuum();
  }

  /**
   * الحصول على حجم قاعدة البيانات (بالميجابايت)
   */
  async getSize(): Promise<{ success: boolean; size?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.getSize();
  }

  /**
   * نسخ احتياطي
   */
  async backup(destinationPath: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.ensureInitialized();
    return this.db.backup(destinationPath);
  }

  /**
   * استعادة من نسخة احتياطية
   */
  async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    return this.db.restore(backupPath);
  }

  /**
   * Cache helpers: app_init_cache
   */
  async setAppInitCache(params: {
    id: string; // e.g. app-init:{userId}:{organizationId}
    userId?: string | null;
    organizationId?: string | null;
    data: any;
  }): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    const now = new Date().toISOString();
    return this.db.upsert('app_init_cache', {
      id: params.id,
      user_id: params.userId ?? null,
      organization_id: params.organizationId ?? null,
      data: params.data,
      created_at: now,
      updated_at: now
    });
  }

  async getAppInitCacheById(id: string): Promise<{ success: boolean; data?: any | null; error?: string }> {
    this.ensureInitialized();
    const res = await this.db.queryOne('SELECT data FROM app_init_cache WHERE id = ?', [id]);
    if (!res.success) return { success: false, error: res.error };
    const raw = res.data?.data;
    try {
      // data may already be an object depending on serialization path
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { success: true, data: parsed ?? null };
    } catch {
      return { success: true, data: raw ?? null };
    }
  }

  async getLatestAppInitCacheByUserOrg(
    userId?: string | null,
    organizationId?: string | null
  ): Promise<{ success: boolean; data?: any | null; error?: string }> {
    this.ensureInitialized();
    const res = await this.db.queryOne(
      `SELECT data FROM app_init_cache
       WHERE (user_id IS ? OR user_id = ?) AND (organization_id IS ? OR organization_id = ?)
       ORDER BY updated_at DESC LIMIT 1`,
      [userId ?? null, userId ?? null, organizationId ?? null, organizationId ?? null]
    );
    if (!res.success) return { success: false, error: res.error };
    const raw = res.data?.data;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { success: true, data: parsed ?? null };
    } catch {
      return { success: true, data: raw ?? null };
    }
  }

  /**
   * Cache helpers: pos_offline_cache
   */
  async setPOSOfflineCache(params: {
    id: string; // cache key
    organizationId: string;
    page: number;
    limit: number;
    search?: string | null;
    categoryId?: string | null;
    data: any; // CompletePOSResponse
  }): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    const now = new Date().toISOString();
    return this.db.upsert('pos_offline_cache', {
      id: params.id,
      organization_id: params.organizationId,
      page: params.page,
      page_limit: params.limit,
      search: params.search ?? null,
      category_id: params.categoryId ?? null,
      data: params.data,
      timestamp: now
    });
  }

  async getPOSOfflineCacheById(id: string): Promise<{ success: boolean; data?: any | null; error?: string }> {
    this.ensureInitialized();
    const res = await this.db.queryOne('SELECT data FROM pos_offline_cache WHERE id = ?', [id]);
    if (!res.success) return { success: false, error: res.error };
    const raw = res.data?.data;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { success: true, data: parsed ?? null };
    } catch {
      return { success: true, data: raw ?? null };
    }
  }

  // ========================================
  // 🔒 Conflict Resolution API
  // ========================================

  /**
   * تسجيل تضارب
   */
  async logConflict(conflictEntry: {
    id: string;
    entityType: 'product' | 'customer' | 'invoice' | 'order';
    entityId: string;
    localVersion: any;
    serverVersion: any;
    conflictFields: string[];
    severity: number;
    resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
    resolvedVersion: any;
    resolvedBy?: string;
    detectedAt: string;
    resolvedAt: string;
    userId: string;
    organizationId: string;
    localTimestamp: string;
    serverTimestamp: string;
    notes?: string;
  }): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.logConflict(conflictEntry);
  }

  /**
   * جلب سجل التضاربات لكيان معين
   */
  async getConflictHistory(
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; data: any[]; error?: string }> {
    this.ensureInitialized();
    return this.db.getConflictHistory(entityType, entityId);
  }

  /**
   * جلب التضاربات مع فلترة
   */
  async getConflicts(
    organizationId: string,
    options?: {
      entityType?: string;
      resolution?: string;
      minSeverity?: number;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ success: boolean; data: any[]; count: number; error?: string }> {
    this.ensureInitialized();
    return this.db.getConflicts(organizationId, options);
  }

  /**
   * إحصائيات التضاربات
   */
  async getConflictStatistics(
    organizationId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    this.ensureInitialized();
    return this.db.getConflictStatistics(organizationId, dateFrom, dateTo);
  }

  /**
   * حذف التضاربات القديمة
   */
  async cleanupOldConflicts(
    daysToKeep: number = 90
  ): Promise<{ success: boolean; deleted?: number; error?: string }> {
    this.ensureInitialized();
    return this.db.cleanupOldConflicts(daysToKeep);
  }

  /**
   * إغلاق قاعدة البيانات
   */
  async close(): Promise<{ success: boolean; error?: string }> {
    const result = await this.db.close();
    if (result.success) {
      this.isInitialized = false;
      this.currentOrganizationId = null;
    }
    return result;
  }

  /**
   * الحصول على Organization ID الحالي
   */
  getCurrentOrganizationId(): string | null {
    return this.currentOrganizationId;
  }

  /**
   * فحص إذا كانت القاعدة مهيئة
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// تصدير singleton
export const sqliteDB = new SQLiteDatabaseAPI();

// تصدير الكلاس للاستخدام المتقدم
export { SQLiteDatabaseAPI };
