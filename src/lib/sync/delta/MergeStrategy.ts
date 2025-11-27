/**
 * MergeStrategy - Smart Field-Level Merging
 * دمج ذكي للبيانات حسب نوع الجدول والحقول
 *
 * المشكلة: UPSERT البسيط يمحي بيانات محلية مهمة
 * الحل: تحديد استراتيجية دمج لكل جدول وحقل
 */

import { sqliteWriteQueue } from './SQLiteWriteQueue';
import {
  MergeMode,
  TableMergeConfig,
  MergeConfig,
  OperationType
} from './types';

/**
 * ⚡ إعدادات الدمج الافتراضية لكل جدول
 * المرحلة الثانية: إضافة إعدادات POS والجداول الناقصة
 */
const DEFAULT_MERGE_CONFIG: MergeConfig = {
  // ═══════════════════════════════════════════════════
  // المنتجات والمخزون
  // ═══════════════════════════════════════════════════
  products: {
    mode: 'field_merge',
    serverOnlyFields: ['id', 'organization_id', 'created_at'],
    localOnlyFields: ['thumbnail_base64', 'local_cache_at', 'local_updated_at', 'synced', 'sync_status', 'pending_operation'],
    mergeableFields: ['stock_quantity', 'actual_stock_quantity', 'quantity']
  },
  product_colors: {
    mode: 'field_merge',
    serverOnlyFields: ['id', 'product_id', 'organization_id', 'created_at'],
    localOnlyFields: ['image_base64'],
    mergeableFields: ['quantity']
  },
  product_sizes: {
    mode: 'field_merge',
    serverOnlyFields: ['id', 'color_id', 'product_id', 'organization_id', 'created_at'],
    localOnlyFields: [],
    mergeableFields: ['quantity']
  },
  product_categories: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at']
  },

  // ═══════════════════════════════════════════════════
  // الطلبات (POS)
  // ═══════════════════════════════════════════════════
  orders: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'order_number', 'created_at', 'customer_order_number', 'global_order_number'],
    localOnlyFields: ['synced', 'sync_status', 'syncStatus', 'pending_operation', 'pendingOperation', 'last_sync_attempt', 'error', 'items']
  },
  pos_orders: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'order_number', 'created_at', 'customer_order_number', 'global_order_number'],
    localOnlyFields: ['synced', 'sync_status', 'syncStatus', 'pending_operation', 'pendingOperation', 'last_sync_attempt', 'error', 'items', 'remote_order_id', 'remote_customer_order_number']
  },
  order_items: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'order_id', 'product_id', 'organization_id', 'created_at'],
    localOnlyFields: ['synced', 'sync_status', 'pending_operation']
  },
  pos_order_items: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'order_id', 'product_id', 'organization_id', 'created_at'],
    localOnlyFields: ['synced', 'sync_status', 'pending_operation']
  },

  // ═══════════════════════════════════════════════════
  // العملاء
  // ═══════════════════════════════════════════════════
  customers: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at'],
    localOnlyFields: ['synced', 'sync_status', 'pending_operation', 'total_debt']
  },

  // ═══════════════════════════════════════════════════
  // التصنيفات
  // ═══════════════════════════════════════════════════
  categories: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at']
  },

  // ═══════════════════════════════════════════════════
  // الفواتير
  // ═══════════════════════════════════════════════════
  invoices: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'invoice_number', 'created_at'],
    localOnlyFields: ['synced', 'sync_status', 'pending_operation']
  },

  // ═══════════════════════════════════════════════════
  // الموظفين
  // ═══════════════════════════════════════════════════
  staff_members: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at', 'auth_user_id'],
    localOnlyFields: ['synced', 'sync_status']
  },

  // ═══════════════════════════════════════════════════
  // جلسات العمل
  // ═══════════════════════════════════════════════════
  work_sessions: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at'],
    localOnlyFields: ['synced', 'syncStatus', 'pendingOperation']
  },
  pos_work_sessions: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at'],
    localOnlyFields: ['synced', 'syncStatus', 'pendingOperation']
  },

  // ═══════════════════════════════════════════════════
  // التصليح
  // ═══════════════════════════════════════════════════
  repair_orders: {
    mode: 'newest_wins',
    serverOnlyFields: ['id', 'organization_id', 'repair_number', 'created_at'],
    localOnlyFields: ['synced', 'sync_status', 'pending_operation']
  },
  repair_locations: {
    mode: 'server_wins',
    serverOnlyFields: ['id', 'organization_id', 'created_at']
  }
};

export class MergeStrategy {
  private config: MergeConfig;

  constructor(customConfig?: Partial<MergeConfig>) {
    this.config = { ...DEFAULT_MERGE_CONFIG, ...customConfig };
  }

  /**
   * تحديث إعدادات جدول معين
   */
  setTableConfig(tableName: string, config: TableMergeConfig): void {
    this.config[tableName] = config;
  }

  /**
   * الحصول على إعدادات جدول
   */
  getTableConfig(tableName: string): TableMergeConfig {
    return this.config[tableName] || { mode: 'server_wins' };
  }

  /**
   * دمج البيانات الواردة مع الموجودة محلياً
   */
  async merge(
    tableName: string,
    incomingData: Record<string, any>,
    operation: OperationType
  ): Promise<Record<string, any>> {
    const config = this.getTableConfig(tableName);

    // للـ INSERT الجديد - لا حاجة للدمج، فقط نحافظ على الحقول المحلية الفارغة
    if (operation === 'INSERT') {
      return this.prepareInsertData(incomingData, config);
    }

    // للـ DELETE - لا حاجة للدمج
    if (operation === 'DELETE') {
      return incomingData;
    }

    // للـ DELTA - لا نستخدم الدمج العادي (يُعالج بشكل خاص)
    if (operation === 'DELTA') {
      return incomingData;
    }

    // للـ UPDATE - نحتاج جلب البيانات المحلية ودمجها
    const localData = await this.getLocalRecord(tableName, incomingData.id);

    // إذا لا توجد بيانات محلية - استخدم الواردة
    if (!localData) {
      return this.prepareInsertData(incomingData, config);
    }

    // تطبيق استراتيجية الدمج
    switch (config.mode) {
      case 'server_wins':
        return this.mergeServerWins(localData, incomingData, config);

      case 'local_wins':
        return this.mergeLocalWins(localData, incomingData, config);

      case 'field_merge':
        return this.mergeFieldByField(localData, incomingData, config);

      case 'newest_wins':
        return this.mergeNewestWins(localData, incomingData, config);

      default:
        return incomingData;
    }
  }

  /**
   * تحضير بيانات INSERT
   */
  private prepareInsertData(
    data: Record<string, any>,
    config: TableMergeConfig
  ): Record<string, any> {
    const result = { ...data };

    // تأكد من أن الحقول المحلية فارغة (لن نملأها من الخادم)
    if (config.localOnlyFields) {
      for (const field of config.localOnlyFields) {
        if (!(field in result)) {
          result[field] = null;
        }
      }
    }

    return result;
  }

  /**
   * استراتيجية: الخادم يكسب
   * نأخذ كل شيء من الخادم، لكن نحافظ على الحقول المحلية فقط
   */
  private mergeServerWins(
    local: Record<string, any>,
    incoming: Record<string, any>,
    config: TableMergeConfig
  ): Record<string, any> {
    const result = { ...incoming };

    // الحفاظ على الحقول المحلية فقط
    if (config.localOnlyFields) {
      for (const field of config.localOnlyFields) {
        if (local[field] !== undefined && local[field] !== null) {
          result[field] = local[field];
        }
      }
    }

    return result;
  }

  /**
   * استراتيجية: المحلي يكسب
   * نحافظ على البيانات المحلية، لكن نحدث الحقول من الخادم فقط
   */
  private mergeLocalWins(
    local: Record<string, any>,
    incoming: Record<string, any>,
    config: TableMergeConfig
  ): Record<string, any> {
    const result = { ...local };

    // تحديث الحقول من الخادم فقط
    if (config.serverOnlyFields) {
      for (const field of config.serverOnlyFields) {
        if (incoming[field] !== undefined) {
          result[field] = incoming[field];
        }
      }
    }

    return result;
  }

  /**
   * استراتيجية: دمج حسب الحقل
   * - حقول الخادم: دائماً من الخادم
   * - حقول المحلية: دائماً محلية
   * - حقول قابلة للدمج: لا تُستبدل (تنتظر DELTA)
   * - الباقي: من الخادم
   */
  private mergeFieldByField(
    local: Record<string, any>,
    incoming: Record<string, any>,
    config: TableMergeConfig
  ): Record<string, any> {
    const result = { ...local };

    // 1. الحقول من الخادم - دائماً نأخذها
    if (config.serverOnlyFields) {
      for (const field of config.serverOnlyFields) {
        if (incoming[field] !== undefined) {
          result[field] = incoming[field];
        }
      }
    }

    // 2. الحقول العادية - نأخذها من الخادم إذا لم تكن محلية أو قابلة للدمج
    for (const [key, value] of Object.entries(incoming)) {
      const isLocalOnly = config.localOnlyFields?.includes(key);
      const isMergeable = config.mergeableFields?.includes(key);
      const isServerOnly = config.serverOnlyFields?.includes(key);

      if (!isLocalOnly && !isMergeable && !isServerOnly) {
        result[key] = value;
      }
    }

    // 3. الحقول المحلية - نحافظ عليها كما هي
    // (لا نفعل شيء - هي موجودة في result من البداية)

    // 4. الحقول القابلة للدمج - لا نستبدلها
    // (تُعالج فقط عبر DELTA operations)

    return result;
  }

  /**
   * استراتيجية: الأحدث يكسب
   * نقارن updated_at ونأخذ الأحدث
   */
  private mergeNewestWins(
    local: Record<string, any>,
    incoming: Record<string, any>,
    config?: TableMergeConfig
  ): Record<string, any> {
    const localTime = this.getTimestamp(local);
    const incomingTime = this.getTimestamp(incoming);

    // إذا الخادم أحدث، نأخذ منه مع الحفاظ على الحقول المحلية
    if (incomingTime >= localTime) {
      const result = { ...incoming };

      // الحفاظ على الحقول المحلية فقط
      if (config?.localOnlyFields) {
        for (const field of config.localOnlyFields) {
          if (local[field] !== undefined && local[field] !== null) {
            result[field] = local[field];
          }
        }
      }

      return result;
    }

    // إذا المحلي أحدث، نحافظ عليه مع تحديث حقول الخادم فقط
    const result = { ...local };

    if (config?.serverOnlyFields) {
      for (const field of config.serverOnlyFields) {
        if (incoming[field] !== undefined) {
          result[field] = incoming[field];
        }
      }
    }

    return result;
  }

  /**
   * استخراج timestamp من السجل
   */
  private getTimestamp(record: Record<string, any>): number {
    const candidates = [
      record.updated_at,
      record.last_modified,
      record.modified_at,
      record.created_at
    ];

    for (const candidate of candidates) {
      if (candidate) {
        const time = new Date(candidate).getTime();
        if (!isNaN(time)) return time;
      }
    }

    return 0;
  }

  /**
   * جلب السجل المحلي
   */
  private async getLocalRecord(
    tableName: string,
    id: string
  ): Promise<Record<string, any> | null> {
    try {
      const results = await sqliteWriteQueue.read<any[]>(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [id]
      );
      return results[0] || null;
    } catch (error) {
      console.warn(`[MergeStrategy] Failed to get local record: ${tableName}/${id}`, error);
      return null;
    }
  }

  /**
   * التحقق مما إذا كان الحقل قابل للدمج (يحتاج DELTA)
   */
  isMergeableField(tableName: string, fieldName: string): boolean {
    const config = this.getTableConfig(tableName);
    return config.mergeableFields?.includes(fieldName) || false;
  }

  /**
   * التحقق مما إذا كان الحقل محلي فقط
   */
  isLocalOnlyField(tableName: string, fieldName: string): boolean {
    const config = this.getTableConfig(tableName);
    return config.localOnlyFields?.includes(fieldName) || false;
  }

  /**
   * تحليل الفرق بين سجلين
   * مفيد للتشخيص
   */
  analyzeDiff(
    tableName: string,
    local: Record<string, any>,
    incoming: Record<string, any>
  ): {
    changedFields: string[];
    localOnlyDiffs: string[];
    mergeableDiffs: string[];
  } {
    const config = this.getTableConfig(tableName);
    const changedFields: string[] = [];
    const localOnlyDiffs: string[] = [];
    const mergeableDiffs: string[] = [];

    const allKeys = new Set([...Object.keys(local), ...Object.keys(incoming)]);

    for (const key of allKeys) {
      if (local[key] !== incoming[key]) {
        if (config.localOnlyFields?.includes(key)) {
          localOnlyDiffs.push(key);
        } else if (config.mergeableFields?.includes(key)) {
          mergeableDiffs.push(key);
        } else {
          changedFields.push(key);
        }
      }
    }

    return { changedFields, localOnlyDiffs, mergeableDiffs };
  }
}

// Export singleton instance
export const mergeStrategy = new MergeStrategy();
