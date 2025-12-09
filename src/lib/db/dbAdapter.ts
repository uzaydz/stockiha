/**
 * محول قاعدة البيانات - واجهة موحدة تحافظ على التوافقية
 * يوفر نفس الواجهة التي كانت مستخدمة مع Dexie/IndexedDB
 */

// ⚡ تم إزالة sqliteAPI و sqliteWriteQueue - استخدام PowerSync
// import { sqliteDB, isSQLiteAvailable } from './sqliteAPI';
import { cachedSQLiteQuery, sqliteCache } from '../cache/sqliteQueryCache';
import { dbInitManager } from './DatabaseInitializationManager';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

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

/**
 * نوع الجدول
 */
export type TableName =
  | 'products'
  | 'inventory'
  | 'orders'
  | 'order_items'
  | 'customers'
  | 'addresses'
  | 'invoices'
  | 'invoice_items'
  | 'customer_debts'
  | 'customer_debt_payments'
  | 'repair_orders'
  | 'repair_images'
  | 'staff_pins'
  | 'sync_queue'
  | 'sync_metadata'
  | 'work_sessions'
  | 'transactions'
  | 'returns'
  | 'return_items'
  | 'losses'
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
  | 'product_subcategories'
  | 'game_categories'
  | 'games_catalog'
  | 'game_download_orders'
  | 'game_downloads_settings'
  | 'suppliers'
  | 'supplier_contacts'
  | 'supplier_purchases'
  | 'supplier_purchase_items'
  | 'supplier_payments';

class TableAdapter<T = any> {
  constructor(
    private tableName: TableName
  ) { }

  private async ensureInitialized(): Promise<void> {
    const storedOrgId = localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');

    // ⚡ PowerSync متاح دائماً - لا حاجة للتحقق من sqliteDB

    if (!storedOrgId) {
      if (this.tableName !== 'sync_queue') {
        console.warn(`[TableAdapter:${this.tableName}] No organization ID found in localStorage`);
      }
      return;
    }

    try {
      await dbInitManager.initialize(storedOrgId, {
        timeout: 60000
      });
    } catch (error) {
      console.error(`[TableAdapter:${this.tableName}] Failed to initialize:`, error);
    }
  }

  async add(data: T): Promise<string> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(data as any);
      const columns = keys.map(k => toSQLiteColumnName(k));
      const placeholders = columns.map(() => '?').join(', ');
      const values = keys.map(k => {
        const v = (data as any)[k];
        if (v === null || v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      await tx.execute(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    });
    return (data as any).id;
  }

  async put(item: T): Promise<string> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      const keys = Object.keys(item as any);
      const columns = keys.map(k => toSQLiteColumnName(k));
      const placeholders = columns.map(() => '?').join(', ');
      const updateSet = columns.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
      const values = keys.map(k => {
        const v = (item as any)[k];
        if (v === null || v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      await tx.execute(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
        values
      );
    });
    sqliteCache.clearTable(this.tableName);
    return (item as any).id || '';
  }

  /**
   * ⚡ bulkPut محسّن - يستخدم batchWrite لتنفيذ كل العمليات في transaction واحدة
   * تحسين الأداء: من ~15-30 ثانية لـ 1000 عنصر إلى ~0.5-1 ثانية
   * ⚡ إصلاح: يجمع كل الأعمدة من كل العناصر (ليس فقط العنصر الأول)
   */
  async bulkPut(items: T[]): Promise<number> {
    await this.ensureInitialized();
    if (!items || items.length === 0) return 0;

    const startTime = Date.now();
    let successCount = 0;
    const failedItems: Array<{ id: string; error: string }> = [];

    try {
      // ⚡ جمع كل الأعمدة من كل العناصر (إصلاح مشكلة فقدان الأعمدة)
      const allColumnsSet = new Set<string>();
      for (const item of items) {
        Object.keys(item as any).forEach(k => allColumnsSet.add(k));
      }
      const allKeys = Array.from(allColumnsSet);
      const columns = allKeys.map(k => toSQLiteColumnName(k));
      
      const placeholders = columns.map(() => '?').join(', ');
      const updateSet = columns
        .filter(c => c !== 'id')
        .map(c => `${c} = excluded.${c}`)
        .join(', ');

      const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')})
                   VALUES (${placeholders})
                   ON CONFLICT(id) DO UPDATE SET ${updateSet}`;

      // ⚡ تحضير كل الـ statements
      const statements: Array<{ sql: string; params: any[] }> = [];

      for (const item of items) {
        try {
          // ⚡ استخدام allKeys لضمان شمول كل الأعمدة
          const values = allKeys.map(k => {
            const v = (item as any)[k];
            if (v === null || v === undefined) return null;
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (v instanceof Date) return v.toISOString();
            if (typeof v === 'object') return JSON.stringify(v);
            return v;
          });

          statements.push({ sql, params: values });
        } catch (err) {
          const itemId = (item as any)?.id || 'unknown';
          const errorMsg = err instanceof Error ? err.message : String(err);
          failedItems.push({ id: itemId, error: errorMsg });
        }
      }

      // ⚡ تنفيذ كل العمليات في transaction واحدة
      if (statements.length > 0) {
        await powerSyncService.transaction(async (tx) => {
          // db accessed via tx.execute
          for (const stmt of statements) {
            await tx.execute(stmt.sql, stmt.params);
          }
        });
        successCount = statements.length;
      }

    } catch (err) {
      // ⚡ Fallback: إذا فشل batchWrite، نستخدم الطريقة القديمة
      console.warn(`[TableAdapter:${this.tableName}] ⚠️ batchWrite failed, falling back to individual inserts:`, err);
      
      // ⚡ Fallback: استخدام PowerSync مباشرة
      for (const item of items) {
        try {
          await powerSyncService.transaction(async (tx) => {
            // db accessed via tx.execute
            const keys = Object.keys(item as any);
            const columns = keys.map(k => toSQLiteColumnName(k));
            const placeholders = columns.map(() => '?').join(', ');
            const updateSet = columns.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
            const values = keys.map(k => {
              const v = (item as any)[k];
              if (v === null || v === undefined) return null;
              if (typeof v === 'boolean') return v ? 1 : 0;
              if (v instanceof Date) return v.toISOString();
              if (typeof v === 'object') return JSON.stringify(v);
              return v;
            });
            await tx.execute(
              `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})
               ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
              values
            );
          });
          successCount++;
        } catch (innerErr) {
          const itemId = (item as any)?.id || 'unknown';
          const errorMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
          failedItems.push({ id: itemId, error: errorMsg });
        }
      }
    }

    const elapsed = Date.now() - startTime;

    // ⚡ Log performance metrics
    if (items.length >= 10) {
      console.log(`[TableAdapter:${this.tableName}] ⚡ bulkPut: ${successCount}/${items.length} في ${elapsed}ms (${Math.round(items.length / (elapsed / 1000))} ops/sec)`);
    }

    if (failedItems.length > 0) {
      console.warn(`[TableAdapter:${this.tableName}] ⚠️ bulkPut فشل ${failedItems.length} عنصر:`, failedItems.slice(0, 5));
    }

    sqliteCache.clearTable(this.tableName);
    return successCount;
  }

  async get(id: string): Promise<T | undefined> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.queryOne<T>({
      sql: `SELECT * FROM ${this.tableName} WHERE id = ?`,
      params: [id]
    });
    return result || undefined;
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      await tx.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    });
    sqliteCache.clearTable(this.tableName);
  }

  async update(id: string, updates: Partial<T>): Promise<number> {
    await this.ensureInitialized();
    const entries = Object.entries(updates || {} as any);
    if (entries.length === 0) return 0;
    const cols = entries.map(([k]) => `${toSQLiteColumnName(k)} = ?`).join(', ');
    const values = entries.map(([, v]) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v === undefined) return null;
      if (v instanceof Date) return v.toISOString();
      return v;
    });
    const sql = `UPDATE ${this.tableName} SET ${cols} WHERE id = ?`;
    console.log(`[TableAdapter:${this.tableName}] UPDATE SQL:`, { sql, values, id });
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      await tx.execute(sql, [...values, id]);
    });
    sqliteCache.clearTable(this.tableName);
    return 1; // PowerSync لا يرجع عدد الصفوف المتأثرة مباشرة
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      await tx.execute(`DELETE FROM ${this.tableName}`, []);
    });
    sqliteCache.clearTable(this.tableName);
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.queryOne<{ count: number }>({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName}`,
      params: []
    });
    return result?.count || 0;
  }

  async toArray(): Promise<T[]> {
    await this.ensureInitialized();
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query<T>({
      sql: `SELECT * FROM ${this.tableName}`,
      params: []
    });
    return result || [];
  }

  where(fieldOrObject: any) {
    if (typeof fieldOrObject === 'string') {
      return new WhereClauseAdapter<T>(this.tableName, fieldOrObject);
    }
    if (fieldOrObject && typeof fieldOrObject === 'object') {
      return new WhereClauseAdapter<T>(this.tableName, '' as any, [], [], fieldOrObject as Record<string, any>);
    }
    return new WhereClauseAdapter<T>(this.tableName, String(fieldOrObject));
  }

  filter(predicate: (value: T) => boolean) {
    return new FilterAdapter<T>(this.tableName, predicate);
  }

  limit(count: number) {
    return new LimitAdapter<T>(this.tableName, count);
  }
}

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
    private conditions: string[] = [],
    private params: any[] = [],
    initialObject?: Record<string, any>
  ) {
    if (typeof this.field === 'string' && this.field.startsWith('[') && this.field.endsWith(']')) {
      const inner = this.field.slice(1, -1);
      this.compositeFields = inner.split('+').map(s => s.trim()).filter(Boolean);
      this.isComposite = this.compositeFields.length > 1;
      if (this.isComposite) {
        this.orderByField = toSQLiteColumnName(this.compositeFields[1]);
      }
    }
    if (initialObject && typeof initialObject === 'object') {
      this.initialObject = initialObject;
      for (const [k, v] of Object.entries(initialObject)) {
        this.conditions.push(`${toSQLiteColumnName(k)} = ?`);
        this.params.push(v);
      }
    }
  }

  private async ensureInitialized(): Promise<void> {
    const orgId = localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');
    if (!orgId) return;
    try {
      await dbInitManager.initialize(orgId, { timeout: 60000 });
    } catch (error) {
      console.error(`[WhereClauseAdapter:${this.tableName}] Failed to initialize:`, error);
    }
  }

  equals(value: any): this {
    if (this.isComposite && Array.isArray(value) && this.compositeFields.length > 0) {
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
    return this;
  }

  above(value: any): this {
    const col = toSQLiteColumnName(this.field);
    this.conditions.push(`${col} > ?`);
    this.params.push(value);
    return this;
  }

  below(value: any): this {
    const col = toSQLiteColumnName(this.field);
    this.conditions.push(`${col} < ?`);
    this.params.push(value);
    return this;
  }

  between(lower: any, upper: any, includeLower = true, includeUpper = true): this {
    if (this.isComposite && Array.isArray(lower) && Array.isArray(upper) && this.compositeFields.length > 0) {
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
    return this;
  }

  anyOf(values: any[]): this {
    if (values.length === 0) {
      this.conditions.push('1 = 0');
    } else {
      const placeholders = values.map(() => '?').join(',');
      const base = toSQLiteColumnName(this.isComposite ? this.compositeFields[0] : this.field);
      const col = base;
      this.conditions.push(`${col} IN (${placeholders})`);
      this.params.push(...values);
    }
    return this;
  }

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

    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
    const orderBy = this.orderByField ? `ORDER BY ${this.orderByField} ${this.orderDesc ? 'DESC' : 'ASC'}` : '';
    const limit = this.limitCount != null ? `LIMIT ${this.limitCount}` : '';
    const offset = this.offsetCount != null ? `OFFSET ${this.offsetCount}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} ${limit} ${offset}`.trim();

    return cachedSQLiteQuery.toArray<T[]>(
      this.tableName,
      async () => {
        // ⚡ استخدام PowerSync مباشرة
        const result = await powerSyncService.query<T>({ sql, params: this.params });
        return result || [];
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

  async delete(): Promise<number> {
    await this.ensureInitialized();

    const whereClause = this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';

    const sql = `DELETE FROM ${this.tableName} ${whereClause}`;
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      await tx.execute(sql, this.params);
    });
    return 1; // PowerSync لا يرجع عدد الصفوف المتأثرة مباشرة
  }

  and(predicate: (value: T) => boolean): FilterAdapter<T> {
    return new FilterAdapter<T>(
      this.tableName,
      predicate,
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
      this.conditions,
      this.params,
      this.field,
      this.appliedMethod,
      this.appliedValue
    );
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;

    return cachedSQLiteQuery.count(
      this.tableName,
      async () => {
        // ⚡ استخدام PowerSync مباشرة
        const result = await powerSyncService.queryOne<{ count: number }>({ sql, params: this.params });
        return result?.count || 0;
      },
      { conditions: this.conditions, params: this.params }
    );
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
      const id = (item as any).id;
      if (id) {
        const entries = Object.entries(changes);
        if (entries.length > 0) {
          const cols = entries.map(([k]) => `${toSQLiteColumnName(k)} = ?`).join(', ');
          const values = entries.map(([, v]) => {
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (v === undefined) return null;
            if (v instanceof Date) return v.toISOString();
            return v;
          });
          // ⚡ استخدام PowerSync مباشرة
          await powerSyncService.transaction(async (tx) => {
            // db accessed via tx.execute
            await tx.execute(`UPDATE ${this.tableName} SET ${cols} WHERE id = ?`, [...values, id]);
          });
          modified++;
        }
      }
    }
    if (modified > 0) {
      sqliteCache.clearTable(this.tableName);
    }
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

class FilterAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private predicate: (value: T) => boolean,
    private conditions: string[] = [],
    private params: any[] = [],
    private field?: string,
    private appliedMethod?: 'equals' | 'above' | 'below' | 'between' | 'anyOf' | null,
    private appliedValue?: any
  ) { }

  private async ensureInitialized(): Promise<void> {
    const orgId = localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id');
    if (!orgId) return;
    try {
      await dbInitManager.initialize(orgId, { timeout: 60000 });
    } catch (error) {
      console.error(`[FilterAdapter:${this.tableName}] Failed to initialize:`, error);
    }
  }

  async toArray(): Promise<T[]> {
    await this.ensureInitialized();

    const whereClause = this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';

    const sql = `SELECT * FROM ${this.tableName} ${whereClause}`;
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query<T>({ sql, params: this.params });

    return (result || []).filter(this.predicate);
  }

  async delete(): Promise<number> {
    const items = await this.toArray();
    let deleted = 0;

    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      for (const item of items) {
        await tx.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [(item as any).id]);
        deleted++;
      }
    });

    return deleted;
  }

  async count(): Promise<number> {
    const items = await this.toArray();
    return items.length;
  }

  limit(count: number): this {
    return this;
  }

  async first(): Promise<T | undefined> {
    const items = await this.toArray();
    return items.length > 0 ? items[0] : undefined;
  }
}

class LimitAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private limitCount: number
  ) { }

  async toArray(): Promise<T[]> {
    const sql = `SELECT * FROM ${this.tableName} LIMIT ?`;
    // ⚡ استخدام PowerSync مباشرة
    const result = await powerSyncService.query<T>({ sql, params: [this.limitCount] });
    return result || [];
  }
}

class DatabaseAdapter {
  products: TableAdapter;
  inventory: TableAdapter;
  posOrders: TableAdapter;
  posOrderItems: TableAdapter;
  customers: TableAdapter;
  addresses: TableAdapter;
  invoices: TableAdapter;
  invoiceItems: TableAdapter;
  customerDebts: TableAdapter;
  customerDebtPayments: TableAdapter;
  repairOrders: TableAdapter;
  repairImages: TableAdapter;
  staffPins: TableAdapter;
  syncQueue: TableAdapter;
  workSessions: TableAdapter;
  transactions: TableAdapter;
  productReturns: TableAdapter;
  returnItems: TableAdapter;
  losses: TableAdapter;
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
  gameCategories: TableAdapter;
  gamesCatalog: TableAdapter;
  gameDownloadOrders: TableAdapter;
  gameDownloadsSettings: TableAdapter;
  syncMetadata: TableAdapter;

  constructor() {
    // ⚡ PowerSync متاح دائماً - لا حاجة للتحقق

    console.log(`[DB Adapter] Using SQLITE`);

    this.products = new TableAdapter('products');
    this.inventory = new TableAdapter('inventory');
    this.posOrders = new TableAdapter('orders');
    this.posOrderItems = new TableAdapter('order_items');
    this.customers = new TableAdapter('customers');
    this.addresses = new TableAdapter('addresses');
    this.invoices = new TableAdapter('invoices');
    this.invoiceItems = new TableAdapter('invoice_items');
    this.customerDebts = new TableAdapter('customer_debts');
    this.customerDebtPayments = new TableAdapter('customer_debt_payments');
    this.repairOrders = new TableAdapter('repair_orders');
    this.repairImages = new TableAdapter('repair_images');
    this.staffPins = new TableAdapter('staff_pins');
    this.syncQueue = new TableAdapter('sync_queue');
    this.workSessions = new TableAdapter('work_sessions');
    this.transactions = new TableAdapter('transactions');
    this.productReturns = new TableAdapter('returns');
    this.returnItems = new TableAdapter('return_items');
    this.losses = new TableAdapter('losses');
    this.lossDeclarations = new TableAdapter('loss_declarations');
    this.lossItems = new TableAdapter('loss_items');
    this.repairLocations = new TableAdapter('repair_locations');
    this.repairStatusHistory = new TableAdapter('repair_status_history');
    this.repairImageFiles = new TableAdapter('repair_image_files');
    this.posSettings = new TableAdapter('pos_settings');
    this.organizationSubscriptions = new TableAdapter('organization_subscriptions');
    this.userPermissions = new TableAdapter('user_permissions');
    this.employees = new TableAdapter('employees');
    this.productCategories = new TableAdapter('product_categories');
    this.productSubcategories = new TableAdapter('product_subcategories');
    this.gameCategories = new TableAdapter('game_categories');
    this.gamesCatalog = new TableAdapter('games_catalog');
    this.gameDownloadOrders = new TableAdapter('game_download_orders');
    this.gameDownloadsSettings = new TableAdapter('game_downloads_settings');
    this.syncMetadata = new TableAdapter('sync_metadata');
  }

  async initialize(organizationId: string): Promise<void> {
    await dbInitManager.initialize(organizationId);
  }

  getDatabaseType(): 'sqlite' | 'indexeddb' {
    return 'sqlite';
  }

  isSQLite(): boolean {
    return true;
  }

  async transaction<T>(mode: 'r' | 'rw', ...args: any[]): Promise<T> {
    const callback = args.pop();
    if (typeof callback !== 'function') {
      throw new Error('Transaction callback must be a function');
    }
    return await callback();
  }
}

export const inventoryDB = new DatabaseAdapter();
export type { TableAdapter, WhereClauseAdapter, FilterAdapter };
