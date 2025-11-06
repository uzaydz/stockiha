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
  return isElectron() &&
         typeof window !== 'undefined' &&
         window.electronAPI?.db !== undefined &&
         typeof window.electronAPI.db.initialize === 'function';
};

/**
 * مدير قاعدة البيانات SQLite
 */
class SQLiteDatabaseAPI {
  private isInitialized = false;
  private currentOrganizationId: string | null = null;

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
      console.error('[SQLite API] window.electronAPI:', window.electronAPI);
      return { success: false, error };
    }

    try {
      const result = await window.electronAPI!.db.initialize(organizationId);

      if (result.success) {
        this.isInitialized = true;
        this.currentOrganizationId = organizationId;
        console.log(`[SQLite API] Database initialized for org: ${organizationId}`, result);
      } else {
        console.error('[SQLite API] Initialize returned success=false:', result.error);
      }

      return result;
    } catch (error: any) {
      console.error('[SQLite API] Initialize failed with exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
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
    return window.electronAPI!.db.upsertProduct(product);
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
    return window.electronAPI!.db.searchProducts(query, {
      ...options,
      organizationId: options?.organizationId || this.currentOrganizationId
    });
  }

  /**
   * استعلام عام
   */
  async query(sql: string, params: any = {}): Promise<{ success: boolean; data: any[]; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.query(sql, params);
  }

  /**
   * استعلام لعنصر واحد
   */
  async queryOne(sql: string, params: any = {}): Promise<{ success: boolean; data: any; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.queryOne(sql, params);
  }

  /**
   * إضافة أو تحديث سجل
   */
  async upsert(table: string, data: any): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.upsert(table, data);
  }

  /**
   * حذف سجل
   */
  async delete(table: string, id: string): Promise<{ success: boolean; changes?: number; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.delete(table, id);
  }

  /**
   * إضافة طلب POS مع عناصره (معاملة واحدة)
   */
  async addPOSOrder(order: any, items: any[]): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.addPOSOrder(order, items);
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
    return window.electronAPI!.db.getStatistics(
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
    return window.electronAPI!.db.cleanupOldData(daysToKeep);
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
    return window.electronAPI!.db.vacuum();
  }

  /**
   * الحصول على حجم قاعدة البيانات (بالميجابايت)
   */
  async getSize(): Promise<{ success: boolean; size?: number; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.getSize();
  }

  /**
   * نسخ احتياطي
   */
  async backup(destinationPath: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.ensureInitialized();
    return window.electronAPI!.db.backup(destinationPath);
  }

  /**
   * استعادة من نسخة احتياطية
   */
  async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    return window.electronAPI!.db.restore(backupPath);
  }

  /**
   * إغلاق قاعدة البيانات
   */
  async close(): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI!.db.close();
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
