/**
 * محول قاعدة البيانات - واجهة موحدة تحافظ على التوافقية
 * يوفر نفس الواجهة التي كانت مستخدمة مع Dexie/IndexedDB
 */

import { sqliteDB, isSQLiteAvailable } from './sqliteAPI';
import { cachedSQLiteQuery, sqliteCache } from '../cache/sqliteQueryCache';
import { dbInitManager } from './DatabaseInitializationManager';
// Dexie تم إزالته - هذا البناء يعمل بـ SQLite فقط


// تحويل أسماء الحقول من camelCase إلى snake_case لاستخدامها مع SQLite
function toSQLiteColumnName(name: string): string {
  if (!name) return name;
  const special: Record<string, string> = {
    localUpdatedAt: 'local_updated_at',
    syncStatus: 'sync_status',
    pendingOperation: 'pending_operation',
    workSessionId: 'work_session_id'
  };
  if (special[name]) return special[name];
  return name.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// تم تعطيل أي استخدام لـ IndexedDB بالكامل في هذا البناء

/**
 * نوع الجدول
 */
export type TableName =
  | 'products'
  | 'inventory'
  | 'pos_orders'
  | 'pos_order_items'
  | 'customers'
  | 'addresses'
  | 'invoices'
  | 'invoice_items'
  | 'customer_debts'
  | 'repair_orders'
  | 'repair_images'
  | 'staff_pins'
  | 'sync_queue'
  | 'work_sessions'
  | 'transactions'
  | 'product_returns'
  | 'return_items'
  | 'loss_declarations'
  | 'loss_items'
  | 'repair_locations'
  | 'repair_status_history'
  | 'repair_image_files'
  | 'pos_settings'
  | 'organization_subscriptions'
  | 'user_permissions'
  | 'employees'
  | 'product_categories'
  | 'product_subcategories';

/**
 * واجهة Table - تحاكي Dexie Table
 */
/**
 * تحويل اسم الجدول من snake_case إلى camelCase لـ IndexedDB
 */
// تم حذف تحويل أسماء الجداول الخاص بـ IndexedDB

class TableAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private dbType: 'sqlite' | 'indexeddb'
  ) {}

  /**
   * التأكد من تهيئة SQLite تلقائياً باستخدام المدير الموحد
   * يحل مشكلة Race Conditions
   */
  private async ensureInitialized(): Promise<void> {
    // إذا لم يكن SQLite، لا حاجة للتهيئة
    if (this.dbType !== 'sqlite') {
      return;
    }

    // محاولة الحصول على معرف المؤسسة
    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');

    if (!orgId) {
      console.warn(`[TableAdapter:${this.tableName}] No organization ID found in localStorage`);
      return;
    }

    // استخدام المدير الموحد للتهيئة
    try {
      await dbInitManager.initialize(orgId, {
        timeout: 10000
      });
    } catch (error) {
      console.error(`[TableAdapter:${this.tableName}] Failed to initialize:`, error);
      // لا نرمي الخطأ - نسمح للعمليات بالمحاولة على أي حال
    }
  }

  /**
   * إضافة سجل
   */
  async add(data: T): Promise<string> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.upsert(this.tableName, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add record');
      }
      return (data as any).id;
    }
  }

  /**
   * إضافة أو تحديث سجل (upsert)
   */
  async put(item: T): Promise<string> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.upsert(this.tableName, item);
      if (!result.success) {
        throw new Error(result.error || 'Failed to upsert record');
      }
      // 🗑️ مسح cache لهذا الجدول بعد التعديل
      sqliteCache.clearTable(this.tableName);
      return (item as any).id || '';
    }
    return '';
  }

  /**
   * إضافة أو تحديث عدة سجلات دفعة واحدة (bulk upsert) - أسرع وأكثر أماناً
   */
  async bulkPut(items: T[]): Promise<number> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      if (!items || items.length === 0) return 0;
      
      let successCount = 0;
      let failedCount = 0;
      const failedItems: Array<{ id: string; error: string }> = [];
      
      // استخدام transaction واحد لكل العمليات
      for (const item of items) {
        try {
          const result = await sqliteDB.upsert(this.tableName, item);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            const itemId = (item as any)?.id || 'unknown';
            failedItems.push({ id: itemId, error: result.error || 'Unknown error' });
          }
        } catch (err) {
          failedCount++;
          const itemId = (item as any)?.id || 'unknown';
          const errorMsg = err instanceof Error ? err.message : String(err);
          failedItems.push({ id: itemId, error: errorMsg });
          console.warn(`[TableAdapter:${this.tableName}] ❌ فشل حفظ سجل:`, {
            id: itemId,
            error: errorMsg
          });
        }
      }
      
      // تقرير شامل
      if (failedCount > 0) {
        console.warn(`[TableAdapter:${this.tableName}] 📊 نتائج bulkPut:`, {
          total: items.length,
          success: successCount,
          failed: failedCount,
          failedItems: failedItems.slice(0, 5) // أول 5 أخطاء فقط
        });
      }
      
      // 🗑️ مسح cache مرة واحدة فقط بعد كل العمليات
      sqliteCache.clearTable(this.tableName);
      return successCount;
    }
    return 0;
  }

  /**
   * الحصول على سجل بالـ ID
   */
  async get(id: string): Promise<T | undefined> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.queryOne(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return result.data as T;
    }
  }

  /**
   * حذف سجل
   */
  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.delete(this.tableName, id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete record');
      }
      // 🗑️ مسح cache بعد الحذف
      sqliteCache.clearTable(this.tableName);
    }
  }

  /**
   * تحديث جزئي لسجل واحد
   */
  async update(id: string, updates: Partial<T>): Promise<number> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const entries = Object.entries(updates || {} as any);
      if (entries.length === 0) return 0;
      const cols = entries.map(([k]) => `${toSQLiteColumnName(k)} = ?`).join(', ');
      // تحويل القيم: boolean → 0/1، undefined → null، Date → ISO string
      const values = entries.map(([, v]) => {
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (v === undefined) return null;
        if (v instanceof Date) return v.toISOString();
        return v;
      });
      const sql = `UPDATE ${this.tableName} SET ${cols} WHERE id = ?`;
      console.log(`[TableAdapter:${this.tableName}] UPDATE SQL:`, { sql, values, id });
      const res = await sqliteDB.execute(sql, [...values, id]);
      console.log(`[TableAdapter:${this.tableName}] UPDATE result:`, { success: res.success, changes: res.changes });
      // 🗑️ مسح cache بعد التحديث
      if (res.success && res.changes && res.changes > 0) {
        sqliteCache.clearTable(this.tableName);
      }
      return res.success ? (res.changes || 0) : 0;
    }
    return 0;
  }

  /**
   * حذف كل السجلات
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      await sqliteDB.query(`DELETE FROM ${this.tableName}`, {});
      // 🗑️ مسح cache بعد مسح الجدول
      sqliteCache.clearTable(this.tableName);
    }
  }

  /**
   * عدد السجلات
   */
  async count(): Promise<number> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.queryOne(
        `SELECT COUNT(*) as count FROM ${this.tableName}`,
        {}
      );
      return result.data?.count || 0;
    }
  }

  /**
   * الحصول على كل السجلات
   */
  async toArray(): Promise<T[]> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.query(
        `SELECT * FROM ${this.tableName}`,
        {}
      );
      return result.data as T[];
    }
  }

  /**
   * Where clause - للاستعلامات البسيطة
   */
  where(fieldOrObject: any) {
    if (typeof fieldOrObject === 'string') {
      return new WhereClauseAdapter<T>(this.tableName, fieldOrObject, this.dbType);
    }
    if (fieldOrObject && typeof fieldOrObject === 'object') {
      return new WhereClauseAdapter<T>(this.tableName, '' as any, this.dbType, [], [], fieldOrObject as Record<string, any>);
    }
    return new WhereClauseAdapter<T>(this.tableName, String(fieldOrObject), this.dbType);
  }

  /**
   * Filter - للفلترة المتقدمة
   */
  filter(predicate: (value: T) => boolean) {
    return new FilterAdapter<T>(this.tableName, predicate, this.dbType);
  }

  /**
   * Limit - تحديد عدد النتائج
   */
  limit(count: number) {
    return new LimitAdapter<T>(this.tableName, count, this.dbType);
  }
}

/**
 * محول Where Clause
 */
class WhereClauseAdapter<T = any> {
  private appliedMethod: 'equals' | 'above' | 'below' | 'between' | 'anyOf' | null = null;
  private appliedValue: any = null;
  private initialObject: Record<string, any> | null = null;
  private isComposite = false;
  private compositeFields: string[] = [];
  private orderByField: string | null = null;
  private orderDesc = false;
  private limitCount: number | null = null;
  private offsetCount: number | null = null;

  constructor(
    private tableName: TableName,
    private field: string,
    private dbType: 'sqlite' | 'indexeddb',
    private conditions: string[] = [],
    private params: any[] = [],
    initialObject?: Record<string, any>
  ) {
    // دعم الحقول المركّبة على طريقة Dexie: "[organization_id+created_at]"
    if (typeof this.field === 'string' && this.field.startsWith('[') && this.field.endsWith(']')) {
      const inner = this.field.slice(1, -1);
      this.compositeFields = inner.split('+').map(s => s.trim()).filter(Boolean);
      this.isComposite = this.compositeFields.length > 1;
      // ترتيب افتراضي حسب الحقل الثاني إن وُجد
      if (this.isComposite) {
        this.orderByField = toSQLiteColumnName(this.compositeFields[1]);
      }
    }
    if (initialObject && typeof initialObject === 'object') {
      this.initialObject = initialObject;
      // Pre-build conditions for SQLite path
      if (this.dbType === 'sqlite') {
        for (const [k, v] of Object.entries(initialObject)) {
          this.conditions.push(`${toSQLiteColumnName(k)} = ?`);
          this.params.push(v);
        }
      }
    }
  }

  // مسار IndexedDB محذوف

  /**
   * التأكد من تهيئة SQLite قبل الاستدعاء - يستخدم المدير الموحد
   */
  private async ensureInitialized(): Promise<void> {
    if (this.dbType !== 'sqlite') {
      return;
    }

    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');
    if (!orgId) {
      return;
    }

    try {
      await dbInitManager.initialize(orgId, { timeout: 10000 });
    } catch (error) {
      console.error(`[WhereClauseAdapter:${this.tableName}] Failed to initialize:`, error);
    }
  }

  equals(value: any): this {
    if (this.dbType === 'sqlite') {
      if (this.isComposite && Array.isArray(value) && this.compositeFields.length > 0) {
        // طبّق مساواة على كل الحقول المتوفرة في القيمة
        for (let i = 0; i < Math.min(this.compositeFields.length, value.length); i++) {
          const c = toSQLiteColumnName(this.compositeFields[i]);
          this.conditions.push(`${c} = ?`);
          this.params.push(value[i]);
        }
      } else {
        const base = this.isComposite ? this.compositeFields[0] : this.field;
        const col = toSQLiteColumnName(base);
        this.conditions.push(`${col} = ?`);
        this.params.push(value);
      }
    }
    return this;
  }

  above(value: any): this {
    if (this.dbType === 'sqlite') {
      const col = toSQLiteColumnName(this.field);
      this.conditions.push(`${col} > ?`);
      this.params.push(value);
    }
    return this;
  }

  below(value: any): this {
    if (this.dbType === 'sqlite') {
      const col = toSQLiteColumnName(this.field);
      this.conditions.push(`${col} < ?`);
      this.params.push(value);
    }
    return this;
  }

  between(lower: any, upper: any, includeLower = true, includeUpper = true): this {
    if (this.dbType === 'sqlite') {
      if (this.isComposite && Array.isArray(lower) && Array.isArray(upper) && this.compositeFields.length > 0) {
        // دعم نطاق مركّب مثل [org_id+name_lower] بين [org, q] و [org, q\uffff]
        const firstCol = toSQLiteColumnName(this.compositeFields[0]);
        this.conditions.push(`${firstCol} = ?`);
        this.params.push(lower[0]);

        if (this.compositeFields.length > 1 && lower.length > 1 && upper.length > 1) {
          const secondCol = toSQLiteColumnName(this.compositeFields[1]);
          const lowerOp = includeLower ? '>=' : '>';
          const upperOp = includeUpper ? '<=' : '<';
          this.conditions.push(`${secondCol} ${lowerOp} ?`);
          this.params.push(lower[1]);
          this.conditions.push(`${secondCol} ${upperOp} ?`);
          this.params.push(upper[1]);
          if (!this.orderByField) {
            this.orderByField = secondCol;
          }
        } else if (!this.orderByField && this.compositeFields[1]) {
          this.orderByField = toSQLiteColumnName(this.compositeFields[1]);
        }
      } else {
        const lowerOp = includeLower ? '>=' : '>';
        const upperOp = includeUpper ? '<=' : '<';
        const base = toSQLiteColumnName(this.isComposite ? this.compositeFields[0] : this.field);
        this.conditions.push(`${base} ${lowerOp} ? AND ${base} ${upperOp} ?`);
        this.params.push(lower, upper);
      }
    }
    return this;
  }

  /**
   * anyOf - البحث عن قيم متعددة (IN clause)
   */
  anyOf(values: any[]): this {
    if (this.dbType === 'sqlite') {
      if (values.length === 0) {
        // إذا كانت القائمة فارغة، نضيف شرط دائماً خاطئ
        this.conditions.push('1 = 0');
      } else {
        const placeholders = values.map(() => '?').join(',');
        const base = toSQLiteColumnName(this.isComposite ? this.compositeFields[0] : this.field);
        const col = base;
        this.conditions.push(`${col} IN (${placeholders})`);
        this.params.push(...values);
      }
    }
    return this;
  }

  // دعم reverse/offset/limit على طريقة Dexie
  reverse(): this {
    this.orderDesc = true;
    return this;
  }

  offset(n: number): this {
    this.offsetCount = Math.max(0, Number(n) || 0);
    return this;
  }

  limit(n: number): this {
    this.limitCount = Math.max(0, Number(n) || 0);
    return this;
  }

  async toArray(): Promise<T[]> {
    await this.ensureInitialized();
    
    if (this.dbType === 'sqlite') {
      const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
      const orderBy = this.orderByField ? `ORDER BY ${this.orderByField} ${this.orderDesc ? 'DESC' : 'ASC'}` : '';
      const limit = this.limitCount != null ? `LIMIT ${this.limitCount}` : '';
      const offset = this.offsetCount != null ? `OFFSET ${this.offsetCount}` : '';
      const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} ${limit} ${offset}`.trim();
      
      // 🚀 استخدام cache لتقليل الاستعلامات المتكررة
      return cachedSQLiteQuery.toArray<T[]>(
        this.tableName,
        async () => {
          const result = await sqliteDB.query(sql, this.params);
          return result.data as T[];
        },
        {
          conditions: this.conditions,
          params: this.params,
          orderBy: this.orderByField,
          orderDesc: this.orderDesc,
          limit: this.limitCount,
          offset: this.offsetCount
        }
      );
    }
    return [];
  }

  async delete(): Promise<number> {
    await this.ensureInitialized();
    
    if (this.dbType === 'sqlite') {
      const whereClause = this.conditions.length > 0
        ? `WHERE ${this.conditions.join(' AND ')}`
        : '';

      const sql = `DELETE FROM ${this.tableName} ${whereClause}`;
      const result = await sqliteDB.query(sql, this.params);
      return result.success ? 1 : 0;
    }
  }

  and(predicate: (value: T) => boolean): FilterAdapter<T> {
    return new FilterAdapter<T>(
      this.tableName,
      predicate,
      this.dbType,
      this.conditions,
      this.params,
      this.field,
      this.appliedMethod,
      this.appliedValue
    );
  }

  filter(predicate: (value: T) => boolean): FilterAdapter<T> {
    return new FilterAdapter<T>(
      this.tableName,
      predicate,
      this.dbType,
      this.conditions,
      this.params,
      this.field,
      this.appliedMethod,
      this.appliedValue
    );
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      
      // 🚀 استخدام cache لتقليل الاستعلامات المتكررة
      return cachedSQLiteQuery.count(
        this.tableName,
        async () => {
          const result = await sqliteDB.queryOne(sql, this.params);
          return (result.data?.count as number) || 0;
        },
        { conditions: this.conditions, params: this.params }
      );
    }
    return 0;
  }

  async first(): Promise<T | undefined> {
    await this.ensureInitialized();
    const arr = await this.toArray();
    return arr[0];
  }

  async modify(changes: Partial<T>): Promise<number> {
    await this.ensureInitialized();
    const items = await this.toArray();
    let modified = 0;
    for (const item of items) {
      if (this.dbType === 'sqlite') {
        const id = (item as any).id;
        if (id) {
          const entries = Object.entries(changes);
          if (entries.length > 0) {
            const cols = entries.map(([k]) => `${toSQLiteColumnName(k)} = ?`).join(', ');
            // تحويل القيم: boolean → 0/1، undefined → null، Date → ISO string
            const values = entries.map(([, v]) => {
              if (typeof v === 'boolean') return v ? 1 : 0;
              if (v === undefined) return null;
              if (v instanceof Date) return v.toISOString();
              return v;
            });
            const res = await sqliteDB.execute(`UPDATE ${this.tableName} SET ${cols} WHERE id = ?`, [...values, id]);
            if (res.success && res.changes && res.changes > 0) modified++;
          }
        }
      }
    }
    // 🗑️ مسح cache بعد التعديل
    if (modified > 0) {
      sqliteCache.clearTable(this.tableName);
    }
    console.log(`[FilterAdapter:${this.tableName}] MODIFY completed:`, { modified, changes });
    return modified;
  }

  async each(callback: (item: T, cursor?: any) => void): Promise<void> {
    await this.ensureInitialized();
    const items = await this.toArray();
    for (const item of items) {
      callback(item);
    }
  }
}

/**
 * محول Filter
 */
class FilterAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private predicate: (value: T) => boolean,
    private dbType: 'sqlite' | 'indexeddb',
    private conditions: string[] = [],
    private params: any[] = [],
    private field?: string,
    private appliedMethod?: 'equals' | 'above' | 'below' | 'between' | 'anyOf' | null,
    private appliedValue?: any
  ) {}

  /**
   * التأكد من تهيئة SQLite قبل الاستدعاء - يستخدم المدير الموحد
   */
  private async ensureInitialized(): Promise<void> {
    if (this.dbType !== 'sqlite') {
      return;
    }

    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');
    if (!orgId) {
      return;
    }

    try {
      await dbInitManager.initialize(orgId, { timeout: 10000 });
    } catch (error) {
      console.error(`[FilterAdapter:${this.tableName}] Failed to initialize:`, error);
    }
  }

  async toArray(): Promise<T[]> {
    await this.ensureInitialized();
    
    if (this.dbType === 'sqlite') {
      const whereClause = this.conditions.length > 0
        ? `WHERE ${this.conditions.join(' AND ')}`
        : '';

      const sql = `SELECT * FROM ${this.tableName} ${whereClause}`;
      const result = await sqliteDB.query(sql, this.params);

      // تطبيق الـ predicate يدوياً
      return (result.data as T[]).filter(this.predicate);
    }
  }

  async delete(): Promise<number> {
    // الحصول على العناصر أولاً ثم حذفها
    const items = await this.toArray();
    let deleted = 0;

    for (const item of items) {
      if (this.dbType === 'sqlite') {
        await sqliteDB.delete(this.tableName, (item as any).id);
      }
      deleted++;
    }

    return deleted;
  }

  async count(): Promise<number> {
    const items = await this.toArray();
    return items.length;
  }

  limit(count: number): this {
    // FilterAdapter doesn't natively support limit, but we can simulate via toArray + slice
    // For now, just return this to avoid breaking chain
    return this;
  }

  async first(): Promise<T | undefined> {
    const items = await this.toArray();
    return items.length > 0 ? items[0] : undefined;
  }
}

/**
 * محول Limit
 */
class LimitAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private limitCount: number,
    private dbType: 'sqlite' | 'indexeddb'
  ) {}

  async toArray(): Promise<T[]> {
    if (this.dbType === 'sqlite') {
      const sql = `SELECT * FROM ${this.tableName} LIMIT ?`;
      const result = await sqliteDB.query(sql, [this.limitCount]);
      return result.data as T[];
    }
  }
}

/**
 * محول قاعدة البيانات الرئيسي
 */
class DatabaseAdapter {
  private dbType: 'sqlite' | 'indexeddb';

  // الجداول
  products: TableAdapter;
  inventory: TableAdapter;
  posOrders: TableAdapter;
  posOrderItems: TableAdapter;
  customers: TableAdapter;
  addresses: TableAdapter;
  invoices: TableAdapter;
  invoiceItems: TableAdapter;
  customerDebts: TableAdapter;
  repairOrders: TableAdapter;
  repairImages: TableAdapter;
  staffPins: TableAdapter;
  syncQueue: TableAdapter;
  workSessions: TableAdapter;
  transactions: TableAdapter;
  productReturns: TableAdapter;
  returnItems: TableAdapter;
  lossDeclarations: TableAdapter;
  lossItems: TableAdapter;
  repairLocations: TableAdapter;
  repairStatusHistory: TableAdapter;
  repairImageFiles: TableAdapter;
  posSettings: TableAdapter;
  organizationSubscriptions: TableAdapter;
  userPermissions: TableAdapter;
  employees: TableAdapter;
  productCategories: TableAdapter;
  productSubcategories: TableAdapter;

  constructor() {
    // متطلب المستخدم: استخدام SQLite فقط وإيقاف IndexedDB
    this.dbType = 'sqlite';

    if (!isSQLiteAvailable()) {
      console.warn('[DB Adapter] SQLite DB API is not available yet. Adapter will wait for window.electronAPI.db to be ready.');
    }

    console.log(`[DB Adapter] Using SQLITE`);

    // تهيئة الجداول
    this.products = new TableAdapter('products', this.dbType);
    this.inventory = new TableAdapter('inventory', this.dbType);
    this.posOrders = new TableAdapter('pos_orders', this.dbType);
    this.posOrderItems = new TableAdapter('pos_order_items', this.dbType);
    this.customers = new TableAdapter('customers', this.dbType);
    this.addresses = new TableAdapter('addresses', this.dbType);
    this.invoices = new TableAdapter('invoices', this.dbType);
    this.invoiceItems = new TableAdapter('invoice_items', this.dbType);
    this.customerDebts = new TableAdapter('customer_debts', this.dbType);
    this.repairOrders = new TableAdapter('repair_orders', this.dbType);
    this.repairImages = new TableAdapter('repair_images', this.dbType);
    this.staffPins = new TableAdapter('staff_pins', this.dbType);
    this.syncQueue = new TableAdapter('sync_queue', this.dbType);
    this.workSessions = new TableAdapter('work_sessions', this.dbType);
    this.transactions = new TableAdapter('transactions', this.dbType);
    this.productReturns = new TableAdapter('product_returns', this.dbType);
    this.returnItems = new TableAdapter('return_items', this.dbType);
    this.lossDeclarations = new TableAdapter('loss_declarations', this.dbType);
    this.lossItems = new TableAdapter('loss_items', this.dbType);
    this.repairLocations = new TableAdapter('repair_locations', this.dbType);
    this.repairStatusHistory = new TableAdapter('repair_status_history', this.dbType);
    this.repairImageFiles = new TableAdapter('repair_image_files', this.dbType);
    this.posSettings = new TableAdapter('pos_settings', this.dbType);
    this.organizationSubscriptions = new TableAdapter('organization_subscriptions', this.dbType);
    this.userPermissions = new TableAdapter('user_permissions', this.dbType);
    this.employees = new TableAdapter('employees', this.dbType);
    this.productCategories = new TableAdapter('product_categories', this.dbType);
    this.productSubcategories = new TableAdapter('product_subcategories', this.dbType);
  }

  /**
   * تهيئة قاعدة البيانات
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.dbType === 'sqlite') {
      await sqliteDB.initialize(organizationId);
    }
    // IndexedDB تتهيأ تلقائياً
  }

  /**
   * الحصول على نوع قاعدة البيانات
   */
  getDatabaseType() {
    return this.dbType;
  }

  /**
   * فحص إذا كان SQLite
   */
  isSQLite(): boolean {
    return this.dbType === 'sqlite';
  }

  /**
   * Transaction - للعمليات المركبة
   */
  async transaction<T>(mode: 'r' | 'rw', ...args: any[]): Promise<T> {
    // Last argument must be the callback
    const callback = args.pop();
    if (typeof callback !== 'function') {
      throw new Error('Transaction callback must be a function');
    }
    // SQLite-only: execute callback directly
    return await callback();
  }
}

// تصدير singleton
export const inventoryDB = new DatabaseAdapter();

// تصدير الأنواع
export type { TableAdapter, WhereClauseAdapter, FilterAdapter };
