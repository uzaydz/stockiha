/**
 * محول قاعدة البيانات - واجهة موحدة تحافظ على التوافقية
 * يوفر نفس الواجهة التي كانت مستخدمة مع Dexie/IndexedDB
 */

import { sqliteDB, isElectron, isSQLiteAvailable } from './sqliteAPI';
import Dexie from 'dexie';

// إنشاء Dexie database instance للـ IndexedDB
class StockihaDB extends Dexie {
  products!: Dexie.Table<any, string>;
  posOrders!: Dexie.Table<any, string>;
  posOrderItems!: Dexie.Table<any, string>;
  customers!: Dexie.Table<any, string>;
  invoices!: Dexie.Table<any, string>;
  invoiceItems!: Dexie.Table<any, string>;
  customerDebts!: Dexie.Table<any, string>;
  repairOrders!: Dexie.Table<any, string>;
  repairImages!: Dexie.Table<any, string>;
  staffPins!: Dexie.Table<any, string>;
  syncQueue!: Dexie.Table<any, string>;
  workSessions!: Dexie.Table<any, string>;
  transactions!: Dexie.Table<any, string>;
  productReturns!: Dexie.Table<any, string>;
  returnItems!: Dexie.Table<any, string>;
  lossDeclarations!: Dexie.Table<any, string>;
  lossItems!: Dexie.Table<any, string>;
  repairLocations!: Dexie.Table<any, string>;
  repairStatusHistory!: Dexie.Table<any, string>;
  repairImageFiles!: Dexie.Table<any, string>;
  addresses!: Dexie.Table<any, string>;
  posSettings!: Dexie.Table<any, string>;
  organizationSubscriptions!: Dexie.Table<any, string>;
  userPermissions!: Dexie.Table<any, string>;

  constructor() {
    super('stockiha-inventory');

    this.version(1).stores({
      products: 'id, organization_id, [organization_id+name_lower], [organization_id+sku_lower], [organization_id+barcode_lower]',
      posOrders: 'id, organization_id, [organization_id+created_at], [organization_id+customer_name_lower], [organization_id+status+created_at], [organization_id+payment_status]',
      posOrderItems: 'id, order_id, product_id',
      customers: 'id, organization_id, [organization_id+name_lower], [organization_id+phone_digits]',
      invoices: 'id, organization_id, [organization_id+created_at], [organization_id+invoice_number_lower], [organization_id+customer_name_lower]',
      invoiceItems: 'id, invoice_id',
      customerDebts: 'id, customer_id, organization_id',
      repairOrders: 'id, organization_id, [organization_id+created_at], [organization_id+customer_name_lower], [organization_id+device_type_lower]',
      repairImages: 'id, repair_order_id',
      staffPins: 'id, organization_id',
      syncQueue: 'id, objectType, objectId, [objectType+objectId]',
      workSessions: 'id, organization_id, staff_id, status, started_at, synced',
      transactions: 'id, organization_id',
      productReturns: 'id, organization_id, [organization_id+created_at], [organization_id+return_number_lower], [organization_id+customer_name_lower]',
      returnItems: 'id, return_id',
      lossDeclarations: 'id, organization_id, [organization_id+created_at], [organization_id+loss_number_lower], status, synced',
      lossItems: 'id, loss_id, product_id',
      repairLocations: 'id, organization_id',
      repairStatusHistory: 'id, repair_order_id',
      repairImageFiles: 'id, repair_image_id',
      addresses: 'id, customer_id, organization_id',
      // fallback-only tables used by some code paths
      posSettings: 'organization_id',
      organizationSubscriptions: 'id, organization_id, status, end_date',
      userPermissions: 'id, auth_user_id, organization_id'
    });
  }

}

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

// إنشاء instance واحد من IndexedDB
const indexedDBInstance = new StockihaDB();

// Utilities
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSQLiteReady(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isSQLiteAvailable()) return true;
    await sleep(100);
  }
  return isSQLiteAvailable();
}

/**
 * نوع الجدول
 */
export type TableName =
  | 'products'
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
  | 'user_permissions';

/**
 * واجهة Table - تحاكي Dexie Table
 */
/**
 * تحويل اسم الجدول من snake_case إلى camelCase لـ IndexedDB
 */
function tableNameToIndexedDB(tableName: TableName): string {
  const mapping: Record<TableName, string> = {
    'products': 'products',
    'pos_orders': 'posOrders',
    'pos_order_items': 'posOrderItems',
    'customers': 'customers',
    'addresses': 'addresses',
    'invoices': 'invoices',
    'invoice_items': 'invoiceItems',
    'customer_debts': 'customerDebts',
    'repair_orders': 'repairOrders',
    'repair_images': 'repairImages',
    'staff_pins': 'staffPins',
    'sync_queue': 'syncQueue',
    'work_sessions': 'workSessions',
    'transactions': 'transactions',
    'product_returns': 'productReturns',
    'return_items': 'returnItems',
    'loss_declarations': 'lossDeclarations',
    'loss_items': 'lossItems',
    'repair_locations': 'repairLocations',
    'repair_status_history': 'repairStatusHistory',
    'repair_image_files': 'repairImageFiles',
    'pos_settings': 'posSettings',
    'organization_subscriptions': 'organizationSubscriptions',
    'user_permissions': 'userPermissions'
  };
  return mapping[tableName] || tableName;
}

// Global promise cache for initialization to prevent race conditions
let initializationPromise: Promise<void> | null = null;
// Track which orgs have had schema ensured in this session
const ensuredOrgs = new Set<string>();

class TableAdapter<T = any> {
  constructor(
    private tableName: TableName,
    private dbType: 'sqlite' | 'indexeddb'
  ) {}

  /**
   * الحصول على اسم الجدول المناسب لـ IndexedDB
   */
  private getIndexedDBTableName(): string {
    return tableNameToIndexedDB(this.tableName);
  }

  /**
   * التأكد من تهيئة SQLite تلقائياً مع fallback ذكي
   */
  private async ensureInitialized(): Promise<void> {
    // إذا لم يكن SQLite، لا حاجة للتهيئة
    if (this.dbType !== 'sqlite') {
      return;
    }

    // التحقق من توفر SQLite API
    if (!isSQLiteAvailable()) {
      console.log(`[TableAdapter:${this.tableName}] Waiting for SQLite API to be available...`);
      const ready = await waitForSQLiteReady(10000);
      if (!ready) {
        console.warn(`[TableAdapter:${this.tableName}] SQLite API not available after waiting. Operations may be delayed.`);
        return;
      }
    }

    // إذا كان هناك تهيئة جارية، انتظرها
    if (initializationPromise) {
      console.log(`[TableAdapter:${this.tableName}] Waiting for ongoing initialization...`);
      await initializationPromise;
      return;
    }

    // محاولة التهيئة
    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');

    if (!orgId) {
      console.warn(`[TableAdapter:${this.tableName}] No organization ID found. Cannot initialize SQLite.`);
      return;
    }

    // إذا لم نضمن المخطط لهذا الـ org في هذه الجلسة، نفعل ذلك الآن حتى لو كان isReady=true
    if (!ensuredOrgs.has(orgId)) {
      initializationPromise = (async () => {
        try {
          console.log(`[TableAdapter:${this.tableName}] Ensuring SQLite schema for org: ${orgId}`);
          await sqliteDB.initialize(orgId);
          ensuredOrgs.add(orgId);
          console.log(`[TableAdapter:${this.tableName}] SQLite schema ensured`);
        } catch (error) {
          console.error(`[TableAdapter:${this.tableName}] Failed to ensure SQLite schema:`, error);
        } finally {
          initializationPromise = null;
        }
      })();
      await initializationPromise;
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        throw new Error(`Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
      }
      return await table.add(data);
    }
  }

  /**
   * إضافة أو تحديث
   */
  async put(data: T): Promise<string> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      const result = await sqliteDB.upsert(this.tableName, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to put record');
      }
      return (data as any).id;
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        throw new Error(`Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
      }
      return await table.put(data);
    }
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[TableAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return undefined;
      }
      return await table.get(id);
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        throw new Error(`Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
      }
      await table.delete(id);
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
      const values = entries.map(([, v]) => v);
      const sql = `UPDATE ${this.tableName} SET ${cols} WHERE id = ?`;
      const res = await sqliteDB.query(sql, [...values, id]);
      return res.success ? 1 : 0;
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) return 0;
      try {
        return await table.update(id, updates);
      } catch (error) {
        console.error(`[TableAdapter] Error updating ${this.tableName}:`, error);
        return 0;
      }
    }
  }

  /**
   * حذف كل السجلات
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    if (this.dbType === 'sqlite') {
      await sqliteDB.query(`DELETE FROM ${this.tableName}`, {});
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[TableAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return;
      }
      await table.clear();
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[TableAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return 0;
      }
      try {
        return await table.count();
      } catch (error) {
        console.error(`[TableAdapter] Error counting ${this.tableName}:`, error);
        return 0;
      }
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[TableAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return [];
      }
      try {
        return await table.toArray();
      } catch (error) {
        console.error(`[TableAdapter] Error getting array from ${this.tableName}:`, error);
        return [];
      }
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

  private getIndexedDBTableName(): string {
    return tableNameToIndexedDB(this.tableName);
  }

  /**
   * التأكد من تهيئة SQLite قبل الاستدعاء
   */
  private async ensureInitialized(): Promise<void> {
    if (this.dbType !== 'sqlite') {
      return;
    }

    if (!isSQLiteAvailable()) {
      const ready = await waitForSQLiteReady(10000);
      if (!ready) return;
    }

    // إذا كان هناك تهيئة جارية، انتظرها
    if (initializationPromise) {
      await initializationPromise;
      return;
    }

    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');

    if (!orgId) {
      return;
    }

    if (!ensuredOrgs.has(orgId)) {
      initializationPromise = (async () => {
        try {
          await sqliteDB.initialize(orgId);
          ensuredOrgs.add(orgId);
        } catch (error) {
          console.error(`[WhereClauseAdapter:${this.tableName}] Failed to ensure schema:`, error);
        } finally {
          initializationPromise = null;
        }
      })();
      await initializationPromise;
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
    } else {
      this.appliedMethod = 'equals';
      this.appliedValue = value;
    }
    return this;
  }

  above(value: any): this {
    if (this.dbType === 'sqlite') {
      const col = toSQLiteColumnName(this.field);
      this.conditions.push(`${col} > ?`);
      this.params.push(value);
    } else {
      this.appliedMethod = 'above';
      this.appliedValue = value;
    }
    return this;
  }

  below(value: any): this {
    if (this.dbType === 'sqlite') {
      const col = toSQLiteColumnName(this.field);
      this.conditions.push(`${col} < ?`);
      this.params.push(value);
    } else {
      this.appliedMethod = 'below';
      this.appliedValue = value;
    }
    return this;
  }

  between(lower: any, upper: any, includeLower = true, includeUpper = true): this {
    if (this.dbType === 'sqlite') {
      if (this.isComposite && Array.isArray(lower) && Array.isArray(upper) && this.compositeFields.length > 0) {
        // نقيّد فقط بالحقل الأول (organization_id) لتغطية النطاق
        const base = toSQLiteColumnName(this.compositeFields[0]);
        this.conditions.push(`${base} = ?`);
        this.params.push(lower[0]);
        // ترتيب افتراضي حسب الحقل الثاني إذا توفر
        if (!this.orderByField && this.compositeFields[1]) {
          this.orderByField = toSQLiteColumnName(this.compositeFields[1]);
        }
      } else {
        const lowerOp = includeLower ? '>=' : '>';
        const upperOp = includeUpper ? '<=' : '<';
        const base = toSQLiteColumnName(this.isComposite ? this.compositeFields[0] : this.field);
        this.conditions.push(`${base} ${lowerOp} ? AND ${base} ${upperOp} ?`);
        this.params.push(lower, upper);
      }
    } else {
      this.appliedMethod = 'between';
      this.appliedValue = { lower, upper, includeLower, includeUpper };
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
    } else {
      this.appliedMethod = 'anyOf';
      this.appliedValue = values;
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
      const result = await sqliteDB.query(sql, this.params);
      return result.data as T[];
    } else {
      // IndexedDB fallback
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[WhereClauseAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return [];
      }
      try {
        // If initial object is provided, filter client-side to satisfy multi-field where
        if (this.initialObject) {
          const entries = Object.entries(this.initialObject);
          return await table
            .toArray()
            .then((arr: any[]) => arr.filter((item) => entries.every(([k, v]) => item[k] === v)));
        }
        let query = table.where(this.field);
        
        // تطبيق الشرط المناسب
        if (this.appliedMethod === 'equals') {
          query = query.equals(this.appliedValue);
        } else if (this.appliedMethod === 'above') {
          query = query.above(this.appliedValue);
        } else if (this.appliedMethod === 'below') {
          query = query.below(this.appliedValue);
        } else if (this.appliedMethod === 'between') {
          const { lower, upper, includeLower, includeUpper } = this.appliedValue;
          query = query.between(lower, upper, includeLower, includeUpper);
        } else if (this.appliedMethod === 'anyOf') {
          query = query.anyOf(this.appliedValue);
        } else {
          // إذا لم يتم تطبيق أي شرط، نرجع كل العناصر من الجدول
          return await table.toArray();
        }
        
        return await query.toArray();
      } catch (error) {
        console.error(`[WhereClauseAdapter] Error querying ${this.tableName}:`, error);
        return [];
      }
    }
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[WhereClauseAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return 0;
      }
      try {
        let query = table.where(this.field);
        
        // تطبيق الشرط المناسب
        if (this.appliedMethod === 'equals') {
          query = query.equals(this.appliedValue);
        } else if (this.appliedMethod === 'above') {
          query = query.above(this.appliedValue);
        } else if (this.appliedMethod === 'below') {
          query = query.below(this.appliedValue);
        } else if (this.appliedMethod === 'between') {
          const { lower, upper, includeLower, includeUpper } = this.appliedValue;
          query = query.between(lower, upper, includeLower, includeUpper);
        } else if (this.appliedMethod === 'anyOf') {
          query = query.anyOf(this.appliedValue);
        } else {
          // إذا لم يتم تطبيق أي شرط، لا نحذف شيء
          console.warn(`[WhereClauseAdapter] No condition applied for delete operation`);
          return 0;
        }
        
        return await query.delete();
      } catch (error) {
        console.error(`[WhereClauseAdapter] Error deleting from ${this.tableName}:`, error);
        return 0;
      }
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
      const result = await sqliteDB.queryOne(sql, this.params);
      return (result.data?.count as number) || 0;
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) return 0;
      try {
        if (this.initialObject) {
          const items = await this.toArray();
          return items.length;
        }
        let query = table.where(this.field);
        if (this.appliedMethod === 'equals') {
          query = query.equals(this.appliedValue);
        } else if (this.appliedMethod === 'above') {
          query = query.above(this.appliedValue);
        } else if (this.appliedMethod === 'below') {
          query = query.below(this.appliedValue);
        } else if (this.appliedMethod === 'between') {
          const { lower, upper, includeLower, includeUpper } = this.appliedValue;
          query = query.between(lower, upper, includeLower, includeUpper);
        } else if (this.appliedMethod === 'anyOf') {
          query = query.anyOf(this.appliedValue);
        }
        return await query.count();
      } catch (error) {
        console.error(`[WhereClauseAdapter] Error counting ${this.tableName}:`, error);
        return 0;
      }
    }
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
            const values = entries.map(([, v]) => v);
            await sqliteDB.query(`UPDATE ${this.tableName} SET ${cols} WHERE id = ?`, [...values, id]);
            modified++;
          }
        }
      } else {
        const indexedTableName = this.getIndexedDBTableName();
        const table = (indexedDBInstance as any)?.[indexedTableName];
        if (table) {
          try {
            await table.update((item as any).id, changes);
            modified++;
          } catch (err) {
            console.error(`[WhereClauseAdapter] modify error:`, err);
          }
        }
      }
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

  private getIndexedDBTableName(): string {
    return tableNameToIndexedDB(this.tableName);
  }

  /**
   * التأكد من تهيئة SQLite قبل الاستدعاء
   */
  private async ensureInitialized(): Promise<void> {
    if (this.dbType !== 'sqlite') {
      return;
    }

    if (!isSQLiteAvailable()) {
      const ready = await waitForSQLiteReady(10000);
      if (!ready) return;
    }

    // إذا كان هناك تهيئة جارية، انتظرها
    if (initializationPromise) {
      await initializationPromise;
      return;
    }

    const orgId = localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');

    if (!orgId) {
      return;
    }

    // إذا لم نضمن المخطط لهذا الـ org في هذه الجلسة، نفعل ذلك الآن
    if (!ensuredOrgs.has(orgId)) {
      initializationPromise = (async () => {
        try {
          await sqliteDB.initialize(orgId);
          ensuredOrgs.add(orgId);
        } catch (error) {
          console.error(`[FilterAdapter:${this.tableName}] Failed to ensure schema:`, error);
        } finally {
          initializationPromise = null;
        }
      })();
      await initializationPromise;
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
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[FilterAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return [];
      }
      try {
        let query: any = table;
        
        // إذا كان هناك where clause من قبل، نطبقه
        if (this.field && this.appliedMethod) {
          query = table.where(this.field);
          
          if (this.appliedMethod === 'equals') {
            query = query.equals(this.appliedValue);
          } else if (this.appliedMethod === 'above') {
            query = query.above(this.appliedValue);
          } else if (this.appliedMethod === 'below') {
            query = query.below(this.appliedValue);
          } else if (this.appliedMethod === 'between') {
            const { lower, upper, includeLower, includeUpper } = this.appliedValue;
            query = query.between(lower, upper, includeLower, includeUpper);
          } else if (this.appliedMethod === 'anyOf') {
            query = query.anyOf(this.appliedValue);
          }
        }
        
        return await query.filter(this.predicate).toArray();
      } catch (error) {
        console.error(`[FilterAdapter] Error filtering ${this.tableName}:`, error);
        return [];
      }
    }
  }

  async delete(): Promise<number> {
    // الحصول على العناصر أولاً ثم حذفها
    const items = await this.toArray();
    let deleted = 0;

    for (const item of items) {
      if (this.dbType === 'sqlite') {
        await sqliteDB.delete(this.tableName, (item as any).id);
      } else {
        const indexedTableName = this.getIndexedDBTableName();
        const table = (indexedDBInstance as any)?.[indexedTableName];
        if (table) {
          try {
            await table.delete((item as any).id);
          } catch (error) {
            console.error(`[FilterAdapter] Error deleting item from ${this.tableName}:`, error);
          }
        }
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

  private getIndexedDBTableName(): string {
    return tableNameToIndexedDB(this.tableName);
  }

  async toArray(): Promise<T[]> {
    if (this.dbType === 'sqlite') {
      const sql = `SELECT * FROM ${this.tableName} LIMIT ?`;
      const result = await sqliteDB.query(sql, [this.limitCount]);
      return result.data as T[];
    } else {
      const indexedTableName = this.getIndexedDBTableName();
      const table = (indexedDBInstance as any)?.[indexedTableName];
      if (!table) {
        console.warn(`[LimitAdapter] Table ${this.tableName} (${indexedTableName}) not found in IndexedDB`);
        return [];
      }
      try {
        return await table.limit(this.limitCount).toArray();
      } catch (error) {
        console.error(`[LimitAdapter] Error limiting ${this.tableName}:`, error);
        return [];
      }
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

  constructor() {
    // استخدام SQLite فقط إذا كان متاحاً فعلياً
    this.dbType = isElectron() ? 'sqlite' : 'indexeddb';

    if (isElectron() && !isSQLiteAvailable()) {
      console.warn('[DB Adapter] Electron detected but SQLite DB API is not available yet. Adapter will wait for window.electronAPI.db to be ready.');
    }

    console.log(`[DB Adapter] Using ${this.dbType.toUpperCase()}`);

    // تهيئة الجداول
    this.products = new TableAdapter('products', this.dbType);
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

    if (this.dbType === 'sqlite') {
      // better-sqlite3 executes statements atomically; keep simple for now
      return await callback();
    } else {
      // Dexie: accept varargs of tables (TableAdapter | Dexie.Table | string)
      const dexieMode = mode === 'rw' ? 'rw' : 'r';
      const dexieTables: any[] = [];

      for (const t of args) {
        if (!t) continue;
        // If already a Dexie table, push directly
        if (typeof t === 'object' && 'schema' in t && 'name' in t) {
          dexieTables.push(t);
          continue;
        }
        // If TableAdapter instance
        if (typeof t === 'object' && 'tableName' in t) {
          const prop = tableNameToIndexedDB((t as any).tableName as TableName);
          const tableObj = (indexedDBInstance as any)[prop];
          if (tableObj) dexieTables.push(tableObj);
          continue;
        }
        // If string key
        if (typeof t === 'string') {
          const prop = tableNameToIndexedDB(t as TableName);
          const tableObj = (indexedDBInstance as any)[prop] || (indexedDBInstance as any)[t];
          if (tableObj) dexieTables.push(tableObj);
          continue;
        }
      }

      try {
        // Dexie expects: transaction(mode, table1, table2, ..., scope)
        return await (indexedDBInstance as any).transaction(dexieMode, ...dexieTables, callback);
      } catch (error) {
        console.error('[DatabaseAdapter] Transaction error:', error);
        // Fallback without transaction
        return await callback();
      }
    }
  }
}

// تصدير singleton
export const inventoryDB = new DatabaseAdapter();

// تصدير الأنواع
export type { TableAdapter, WhereClauseAdapter, FilterAdapter };
