/**
 * خدمة المزامنة لـ Tauri
 * تدير المزامنة بين SQLite المحلي و Supabase
 * مع دعم المزامنة التدريجية (Incremental Sync) لتقليل الضغط على السيرفر
 */

import { supabase } from '@/lib/supabase-unified';
import { tauriQuery, tauriExecute, tauriUpsert } from '@/lib/db/tauriSqlClient';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// أنواع الكيانات المدعومة للمزامنة
// ============================================

type SyncEntityType =
  | 'products'
  | 'customers'
  | 'orders'
  | 'invoices'
  | 'categories'
  | 'subcategories'
  | 'staff_members';

// ============================================
// 🔄 نظام إعادة المحاولة (Retry Logic)
// ============================================

interface FailedOperation {
  id: string;
  operation_type: 'sync_download' | 'sync_upload' | 'upsert' | 'delete';
  entity_type: SyncEntityType;
  entity_id?: string;
  payload?: string; // JSON string
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  status: 'pending' | 'retrying' | 'failed' | 'success';
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// إعدادات إعادة المحاولة
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1000,       // 1 ثانية
  maxDelayMs: 300000,      // 5 دقائق كحد أقصى
  backoffMultiplier: 2,    // مضاعف Exponential Backoff
};

/**
 * حساب وقت الانتظار قبل المحاولة التالية (Exponential Backoff)
 */
function calculateNextRetryDelay(retryCount: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
    RETRY_CONFIG.maxDelayMs
  );
  // إضافة jitter عشوائي (±20%)
  const jitter = delay * (0.8 + Math.random() * 0.4);
  return Math.floor(jitter);
}

/**
 * إضافة عملية فاشلة إلى طابور إعادة المحاولة
 */
async function queueFailedOperation(
  organizationId: string,
  operation: Omit<FailedOperation, 'id' | 'created_at' | 'updated_at' | 'retry_count' | 'max_retries' | 'next_retry_at' | 'status'>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const nextRetryDelay = calculateNextRetryDelay(0);
    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

    await tauriExecute(
      organizationId,
      `INSERT OR REPLACE INTO failed_sync_operations (
        id, operation_type, entity_type, entity_id, payload, error_message,
        retry_count, max_retries, next_retry_at, status, organization_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        operation.operation_type,
        operation.entity_type,
        operation.entity_id || null,
        operation.payload || null,
        operation.error_message,
        0,
        RETRY_CONFIG.maxRetries,
        nextRetryAt,
        'pending',
        organizationId,
        now,
        now
      ]
    );

    console.log(`[TauriSync] 📋 تم إضافة عملية فاشلة للطابور: ${operation.operation_type} - ${operation.entity_type}`);
  } catch (error) {
    console.error('[TauriSync] ❌ فشل إضافة العملية للطابور:', error);
  }
}

/**
 * تحديث حالة العملية بعد إعادة المحاولة
 */
async function updateFailedOperation(
  organizationId: string,
  operationId: string,
  success: boolean,
  newRetryCount: number,
  errorMessage?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    if (success) {
      // حذف العملية الناجحة
      await tauriExecute(
        organizationId,
        `DELETE FROM failed_sync_operations WHERE id = ?`,
        [operationId]
      );
      console.log(`[TauriSync] ✅ تم حذف العملية الناجحة من الطابور: ${operationId}`);
    } else if (newRetryCount >= RETRY_CONFIG.maxRetries) {
      // وصلنا للحد الأقصى - تحديث الحالة إلى failed
      await tauriExecute(
        organizationId,
        `UPDATE failed_sync_operations SET
          status = 'failed',
          retry_count = ?,
          error_message = ?,
          updated_at = ?
        WHERE id = ?`,
        [newRetryCount, errorMessage || 'Max retries exceeded', now, operationId]
      );
      console.log(`[TauriSync] ❌ فشلت العملية نهائياً بعد ${newRetryCount} محاولات: ${operationId}`);
    } else {
      // تحديث للمحاولة التالية
      const nextRetryDelay = calculateNextRetryDelay(newRetryCount);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

      await tauriExecute(
        organizationId,
        `UPDATE failed_sync_operations SET
          status = 'pending',
          retry_count = ?,
          next_retry_at = ?,
          error_message = ?,
          updated_at = ?
        WHERE id = ?`,
        [newRetryCount, nextRetryAt, errorMessage || '', now, operationId]
      );
      console.log(`[TauriSync] 🔄 جدولة المحاولة ${newRetryCount + 1} للعملية: ${operationId} في ${nextRetryAt}`);
    }
  } catch (error) {
    console.error('[TauriSync] ❌ فشل تحديث حالة العملية:', error);
  }
}

/**
 * جلب العمليات الفاشلة الجاهزة لإعادة المحاولة
 */
async function getRetryableOperations(organizationId: string): Promise<FailedOperation[]> {
  try {
    const now = new Date().toISOString();
    const result = await tauriQuery(
      organizationId,
      `SELECT * FROM failed_sync_operations
       WHERE organization_id = ?
         AND status = 'pending'
         AND next_retry_at <= ?
       ORDER BY created_at ASC
       LIMIT 10`,
      [organizationId, now]
    );

    if (result.success && result.data) {
      return result.data as FailedOperation[];
    }
    return [];
  } catch (error) {
    console.error('[TauriSync] ❌ فشل جلب العمليات القابلة للإعادة:', error);
    return [];
  }
}

/**
 * تنفيذ دورة إعادة المحاولة للعمليات الفاشلة
 */
export async function processRetryQueue(organizationId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const operations = await getRetryableOperations(organizationId);

  if (operations.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[TauriSync] 🔄 معالجة ${operations.length} عملية فاشلة من الطابور...`);

  let succeeded = 0;
  let failed = 0;

  for (const op of operations) {
    try {
      // تحديث الحالة إلى retrying
      await tauriExecute(
        organizationId,
        `UPDATE failed_sync_operations SET status = 'retrying', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), op.id]
      );

      let success = false;
      let errorMessage = '';

      // تنفيذ العملية حسب نوعها
      switch (op.operation_type) {
        case 'sync_download':
          const syncResult = await retryDownloadSync(organizationId, op.entity_type);
          success = syncResult.success;
          errorMessage = syncResult.error || '';
          break;

        case 'sync_upload':
          const uploadResult = await uploadPendingOrdersToSupabase(organizationId);
          success = uploadResult.success;
          errorMessage = uploadResult.error || '';
          break;

        case 'upsert':
          if (op.payload && op.entity_id) {
            const payload = JSON.parse(op.payload);
            const upsertResult = await retryUpsertToSupabase(
              organizationId,
              op.entity_type,
              op.entity_id,
              payload
            );
            success = upsertResult.success;
            errorMessage = upsertResult.error || '';
          }
          break;

        default:
          console.warn(`[TauriSync] ⚠️ نوع عملية غير معروف: ${op.operation_type}`);
          errorMessage = 'Unknown operation type';
      }

      // تحديث الحالة
      await updateFailedOperation(
        organizationId,
        op.id,
        success,
        op.retry_count + 1,
        errorMessage
      );

      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error: any) {
      console.error(`[TauriSync] ❌ خطأ في معالجة العملية ${op.id}:`, error);
      await updateFailedOperation(
        organizationId,
        op.id,
        false,
        op.retry_count + 1,
        error?.message || String(error)
      );
      failed++;
    }
  }

  console.log(`[TauriSync] ✅ اكتمال معالجة الطابور: ${succeeded} نجحت، ${failed} فشلت`);
  return { processed: operations.length, succeeded, failed };
}

/**
 * إعادة محاولة مزامنة التنزيل لكيان معين
 */
async function retryDownloadSync(
  organizationId: string,
  entityType: SyncEntityType
): Promise<{ success: boolean; error?: string }> {
  switch (entityType) {
    case 'products':
      return syncProductsToSQLite(organizationId);
    case 'customers':
      return syncCustomersToSQLite(organizationId);
    case 'orders':
      return syncOrdersToSQLite(organizationId);
    case 'invoices':
      return syncInvoicesToSQLite(organizationId);
    case 'categories':
      return syncCategoriesToSQLite(organizationId);
    case 'subcategories':
      return syncSubcategoriesToSQLite(organizationId);
    case 'staff_members':
      return syncStaffMembersToSQLite(organizationId);
    default:
      return { success: false, error: `Unknown entity type: ${entityType}` };
  }
}

/**
 * إعادة محاولة Upsert إلى Supabase
 */
async function retryUpsertToSupabase(
  organizationId: string,
  entityType: SyncEntityType,
  entityId: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  const tableMap: Record<SyncEntityType, string> = {
    products: 'products',
    customers: 'customers',
    orders: 'orders',
    invoices: 'invoices',
    categories: 'product_categories',
    subcategories: 'product_subcategories',
    staff_members: 'users'
  };

  const tableName = tableMap[entityType];
  if (!tableName) {
    return { success: false, error: `Unknown entity type: ${entityType}` };
  }

  try {
    const { error } = await (supabase
      .from(tableName as any)
      .upsert(payload, { onConflict: 'id' }) as any);

    if (error) {
      return { success: false, error: error.message };
    }

    // تحديث حالة المزامنة محلياً
    await tauriExecute(
      organizationId,
      `UPDATE ${tableName === 'orders' ? 'pos_orders' : tableName} SET synced = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), entityId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * الحصول على إحصائيات طابور إعادة المحاولة
 */
export async function getRetryQueueStats(organizationId: string): Promise<{
  pending: number;
  failed: number;
  total: number;
}> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM failed_sync_operations
       WHERE organization_id = ?`,
      [organizationId]
    );

    if (result.success && result.data && result.data[0]) {
      return {
        total: result.data[0].total || 0,
        pending: result.data[0].pending || 0,
        failed: result.data[0].failed || 0
      };
    }
    return { pending: 0, failed: 0, total: 0 };
  } catch (error) {
    return { pending: 0, failed: 0, total: 0 };
  }
}

/**
 * تنظيف العمليات الفاشلة نهائياً (أقدم من 7 أيام)
 */
export async function cleanupOldFailedOperations(organizationId: string): Promise<number> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await tauriExecute(
      organizationId,
      `DELETE FROM failed_sync_operations
       WHERE organization_id = ?
         AND status = 'failed'
         AND updated_at < ?`,
      [organizationId, sevenDaysAgo]
    );

    const deleted = result.changes || 0;
    if (deleted > 0) {
      console.log(`[TauriSync] 🧹 تم تنظيف ${deleted} عملية فاشلة قديمة`);
    }
    return deleted;
  } catch (error) {
    console.error('[TauriSync] ❌ فشل تنظيف العمليات القديمة:', error);
    return 0;
  }
}

/**
 * دالة مساعدة للالتفاف حول عمليات المزامنة مع دعم Retry
 */
async function withRetry<T>(
  organizationId: string,
  entityType: SyncEntityType,
  operationType: 'sync_download' | 'sync_upload',
  operation: () => Promise<T & { success: boolean; error?: string }>,
  entityId?: string,
  payload?: any
): Promise<T & { success: boolean; error?: string }> {
  const result = await operation();

  if (!result.success && result.error) {
    // إضافة للطابور لإعادة المحاولة لاحقاً
    await queueFailedOperation(organizationId, {
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload ? JSON.stringify(payload) : undefined,
      error_message: result.error,
      organization_id: organizationId
    });
  }

  return result;
}

// ============================================
// 🔀 نظام حل التعارضات (Conflict Resolution)
// ============================================

type ConflictResolutionStrategy = 'server_wins' | 'local_wins' | 'newest_wins' | 'manual';

interface ConflictInfo {
  entityType: SyncEntityType;
  entityId: string;
  localData: any;
  serverData: any;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  resolution?: 'local' | 'server' | 'merged';
}

interface PendingConflict {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  local_data: string; // JSON
  server_data: string; // JSON
  local_updated_at: string;
  server_updated_at: string;
  status: 'pending' | 'resolved_local' | 'resolved_server' | 'resolved_merged';
  organization_id: string;
  created_at: string;
  resolved_at?: string;
}

// استراتيجية حل التعارض الافتراضية
let currentConflictStrategy: ConflictResolutionStrategy = 'newest_wins';

/**
 * تعيين استراتيجية حل التعارض
 */
export function setConflictResolutionStrategy(strategy: ConflictResolutionStrategy): void {
  currentConflictStrategy = strategy;
  console.log(`[TauriSync] 🔀 تم تعيين استراتيجية حل التعارض: ${strategy}`);
}

/**
 * الحصول على استراتيجية حل التعارض الحالية
 */
export function getConflictResolutionStrategy(): ConflictResolutionStrategy {
  return currentConflictStrategy;
}

/**
 * اكتشاف التعارض بين البيانات المحلية والسيرفر
 */
async function detectConflict(
  organizationId: string,
  entityType: SyncEntityType,
  entityId: string,
  serverData: any
): Promise<ConflictInfo | null> {
  const tableMap: Record<SyncEntityType, string> = {
    products: 'products',
    customers: 'customers',
    orders: 'pos_orders',
    invoices: 'invoices',
    categories: 'product_categories',
    subcategories: 'product_subcategories',
    staff_members: 'staff_members'
  };

  const tableName = tableMap[entityType];
  if (!tableName) return null;

  try {
    // جلب البيانات المحلية
    const localResult = await tauriQuery(
      organizationId,
      `SELECT *, updated_at as local_updated_at FROM ${tableName} WHERE id = ? AND organization_id = ?`,
      [entityId, organizationId]
    );

    if (!localResult.success || !localResult.data || localResult.data.length === 0) {
      // لا توجد بيانات محلية - لا يوجد تعارض
      return null;
    }

    const localData = localResult.data[0];

    // التحقق من وجود تغييرات محلية غير مرفوعة
    if (localData.synced === 1) {
      // البيانات متزامنة - لا يوجد تعارض
      return null;
    }

    // التحقق من التعارض الفعلي
    const localUpdatedAt = localData.updated_at || localData.local_updated_at;
    const serverUpdatedAt = serverData.updated_at;

    if (!localUpdatedAt || !serverUpdatedAt) {
      return null;
    }

    // إذا كان هناك تعديل محلي وتعديل من السيرفر
    if (localUpdatedAt !== serverUpdatedAt) {
      return {
        entityType,
        entityId,
        localData,
        serverData,
        localUpdatedAt,
        serverUpdatedAt
      };
    }

    return null;
  } catch (error) {
    console.error(`[TauriSync] ❌ خطأ في اكتشاف التعارض:`, error);
    return null;
  }
}

/**
 * حل التعارض حسب الاستراتيجية المحددة
 */
async function resolveConflict(
  organizationId: string,
  conflict: ConflictInfo
): Promise<{ winner: 'local' | 'server'; data: any }> {
  switch (currentConflictStrategy) {
    case 'server_wins':
      return { winner: 'server', data: conflict.serverData };

    case 'local_wins':
      return { winner: 'local', data: conflict.localData };

    case 'newest_wins':
      // مقارنة التواريخ - الأحدث يفوز
      const localTime = new Date(conflict.localUpdatedAt).getTime();
      const serverTime = new Date(conflict.serverUpdatedAt).getTime();

      if (localTime > serverTime) {
        return { winner: 'local', data: conflict.localData };
      } else {
        return { winner: 'server', data: conflict.serverData };
      }

    case 'manual':
      // حفظ التعارض للمعالجة اليدوية
      await savePendingConflict(organizationId, conflict);
      // بشكل مؤقت، نستخدم بيانات السيرفر
      return { winner: 'server', data: conflict.serverData };

    default:
      return { winner: 'server', data: conflict.serverData };
  }
}

/**
 * حفظ تعارض للمعالجة اليدوية
 */
async function savePendingConflict(
  organizationId: string,
  conflict: ConflictInfo
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await tauriExecute(
      organizationId,
      `INSERT OR REPLACE INTO sync_conflicts (
        id, entity_type, entity_id, local_data, server_data,
        local_updated_at, server_updated_at, status, organization_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        conflict.entityType,
        conflict.entityId,
        JSON.stringify(conflict.localData),
        JSON.stringify(conflict.serverData),
        conflict.localUpdatedAt,
        conflict.serverUpdatedAt,
        'pending',
        organizationId,
        now
      ]
    );
    console.log(`[TauriSync] 📝 تم حفظ تعارض للمعالجة اليدوية: ${conflict.entityType}/${conflict.entityId}`);
  } catch (error) {
    console.error('[TauriSync] ❌ فشل حفظ التعارض:', error);
  }
}

// ============================================
// 📦 نظام فحص تعارض المخزون (Stock Version Control)
// ============================================

/**
 * معلومات إصدار المخزون
 */
interface StockVersion {
  product_id: string;
  local_version: number;
  server_version: number;
  local_quantity: number;
  server_quantity: number;
  local_updated_at: string;
  server_updated_at: string;
}

/**
 * الحصول على إصدار المخزون المحلي
 */
async function getLocalStockVersion(
  organizationId: string,
  productId: string
): Promise<{ version: number; quantity: number; updated_at: string } | null> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT stock_version, stock_quantity, actual_stock_quantity, updated_at
       FROM products WHERE id = ? AND organization_id = ?`,
      [productId, organizationId]
    );

    if (result.success && result.data && result.data.length > 0) {
      const row = result.data[0];
      return {
        version: row.stock_version || 0,
        quantity: row.actual_stock_quantity || row.stock_quantity || 0,
        updated_at: row.updated_at || ''
      };
    }
    return null;
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في جلب إصدار المخزون المحلي:', error);
    return null;
  }
}

/**
 * تحديث إصدار المخزون المحلي
 */
async function incrementStockVersion(
  organizationId: string,
  productId: string
): Promise<number> {
  try {
    // جلب الإصدار الحالي
    const current = await getLocalStockVersion(organizationId, productId);
    const newVersion = (current?.version || 0) + 1;
    const now = new Date().toISOString();

    await tauriExecute(
      organizationId,
      `UPDATE products SET stock_version = ?, updated_at = ? WHERE id = ? AND organization_id = ?`,
      [newVersion, now, productId, organizationId]
    );

    return newVersion;
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في تحديث إصدار المخزون:', error);
    return 0;
  }
}

/**
 * اكتشاف تعارض المخزون باستخدام الإصدار
 */
export async function detectStockConflict(
  organizationId: string,
  productId: string,
  serverQuantity: number,
  serverVersion?: number,
  serverUpdatedAt?: string
): Promise<StockVersion | null> {
  const local = await getLocalStockVersion(organizationId, productId);
  if (!local) return null;

  // إذا كان السيرفر يدعم الإصدارات
  if (serverVersion !== undefined && local.version !== serverVersion) {
    // هناك تعارض في الإصدار
    return {
      product_id: productId,
      local_version: local.version,
      server_version: serverVersion,
      local_quantity: local.quantity,
      server_quantity: serverQuantity,
      local_updated_at: local.updated_at,
      server_updated_at: serverUpdatedAt || ''
    };
  }

  // إذا لم يكن هناك إصدار، نستخدم التاريخ
  if (serverUpdatedAt && local.updated_at) {
    const localTime = new Date(local.updated_at).getTime();
    const serverTime = new Date(serverUpdatedAt).getTime();

    // إذا كان الفرق أكثر من 5 ثواني وكمية مختلفة
    if (Math.abs(localTime - serverTime) > 5000 && local.quantity !== serverQuantity) {
      return {
        product_id: productId,
        local_version: local.version,
        server_version: serverVersion || 0,
        local_quantity: local.quantity,
        server_quantity: serverQuantity,
        local_updated_at: local.updated_at,
        server_updated_at: serverUpdatedAt
      };
    }
  }

  return null;
}

/**
 * حل تعارض المخزون
 * يدمج الكميتين إذا كانت العمليات مختلفة (بيع محلي + بيع على السيرفر)
 */
export async function resolveStockConflict(
  organizationId: string,
  conflict: StockVersion,
  strategy: 'server_wins' | 'local_wins' | 'merge_operations' = 'merge_operations'
): Promise<{ success: boolean; finalQuantity: number; resolution: string }> {
  let finalQuantity: number;
  let resolution: string;

  switch (strategy) {
    case 'server_wins':
      finalQuantity = conflict.server_quantity;
      resolution = 'server_wins';
      break;

    case 'local_wins':
      finalQuantity = conflict.local_quantity;
      resolution = 'local_wins';
      break;

    case 'merge_operations':
    default:
      // دمج العمليات: نحسب الفرق ونطبقه
      // افتراض: كلا الطرفين بدأ من نفس الكمية الأصلية
      // localDelta = local_quantity - original
      // serverDelta = server_quantity - original
      // finalQuantity = original + localDelta + serverDelta
      // لكن بما أننا لا نعرف الكمية الأصلية، نأخذ الأقل كإجراء آمن
      finalQuantity = Math.min(conflict.local_quantity, conflict.server_quantity);
      resolution = 'merge_conservative';
      console.log(`[TauriSync] 🔀 دمج تعارض المخزون: local=${conflict.local_quantity}, server=${conflict.server_quantity}, final=${finalQuantity}`);
      break;
  }

  try {
    const now = new Date().toISOString();
    const newVersion = Math.max(conflict.local_version, conflict.server_version) + 1;

    await tauriExecute(
      organizationId,
      `UPDATE products SET
        stock_quantity = ?,
        actual_stock_quantity = ?,
        stock_version = ?,
        updated_at = ?,
        synced = 1
       WHERE id = ? AND organization_id = ?`,
      [finalQuantity, finalQuantity, newVersion, now, conflict.product_id, organizationId]
    );

    console.log(`[TauriSync] ✅ تم حل تعارض المخزون للمنتج ${conflict.product_id}: ${resolution}`);

    return { success: true, finalQuantity, resolution };
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في حل تعارض المخزون:', error);
    return { success: false, finalQuantity: conflict.local_quantity, resolution: 'failed' };
  }
}

/**
 * مزامنة المخزون مع فحص التعارضات
 */
export async function syncStockWithVersionCheck(
  organizationId: string,
  productId: string,
  serverQuantity: number,
  serverVersion?: number,
  serverUpdatedAt?: string
): Promise<{ success: boolean; hadConflict: boolean; finalQuantity?: number }> {
  // فحص التعارض
  const conflict = await detectStockConflict(
    organizationId,
    productId,
    serverQuantity,
    serverVersion,
    serverUpdatedAt
  );

  if (conflict) {
    console.log(`[TauriSync] ⚠️ تعارض مخزون للمنتج ${productId}:`, conflict);

    // حل التعارض
    const result = await resolveStockConflict(organizationId, conflict);
    return {
      success: result.success,
      hadConflict: true,
      finalQuantity: result.finalQuantity
    };
  }

  // لا يوجد تعارض - تحديث عادي
  try {
    const now = new Date().toISOString();
    await tauriExecute(
      organizationId,
      `UPDATE products SET
        stock_quantity = ?,
        actual_stock_quantity = ?,
        updated_at = ?,
        synced = 1
       WHERE id = ? AND organization_id = ?`,
      [serverQuantity, serverQuantity, now, productId, organizationId]
    );

    return { success: true, hadConflict: false, finalQuantity: serverQuantity };
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في تحديث المخزون:', error);
    return { success: false, hadConflict: false };
  }
}

/**
 * الحصول على التعارضات المعلقة
 */
export async function getPendingConflicts(organizationId: string): Promise<PendingConflict[]> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT * FROM sync_conflicts WHERE organization_id = ? AND status = 'pending' ORDER BY created_at DESC`,
      [organizationId]
    );

    if (result.success && result.data) {
      return result.data as PendingConflict[];
    }
    return [];
  } catch (error) {
    console.error('[TauriSync] ❌ فشل جلب التعارضات:', error);
    return [];
  }
}

/**
 * حل تعارض يدوياً
 */
export async function resolveConflictManually(
  organizationId: string,
  conflictId: string,
  resolution: 'local' | 'server'
): Promise<{ success: boolean; error?: string }> {
  try {
    // جلب التعارض
    const result = await tauriQuery(
      organizationId,
      `SELECT * FROM sync_conflicts WHERE id = ?`,
      [conflictId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return { success: false, error: 'Conflict not found' };
    }

    const conflict = result.data[0] as PendingConflict;
    const now = new Date().toISOString();

    const tableMap: Record<string, string> = {
      products: 'products',
      customers: 'customers',
      orders: 'pos_orders',
      invoices: 'invoices',
      categories: 'product_categories',
      subcategories: 'product_subcategories',
      staff_members: 'staff_members'
    };

    const tableName = tableMap[conflict.entity_type];
    if (!tableName) {
      return { success: false, error: 'Unknown entity type' };
    }

    if (resolution === 'local') {
      // الإبقاء على البيانات المحلية ورفعها للسيرفر
      const localData = JSON.parse(conflict.local_data);

      // رفع البيانات المحلية للسيرفر
      const supabaseTable = conflict.entity_type === 'orders' ? 'orders' : tableName;
      const { error } = await (supabase
        .from(supabaseTable as any)
        .upsert(localData, { onConflict: 'id' }) as any);

      if (error) {
        return { success: false, error: error.message };
      }

      // تحديث حالة المزامنة محلياً
      await tauriExecute(
        organizationId,
        `UPDATE ${tableName} SET synced = 1, updated_at = ? WHERE id = ?`,
        [now, conflict.entity_id]
      );
    } else {
      // استخدام بيانات السيرفر
      const serverData = JSON.parse(conflict.server_data);

      // تحديث البيانات المحلية
      // نحتاج لبناء استعلام UPDATE ديناميكي
      const columns = Object.keys(serverData).filter(k => k !== 'id');
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => {
        const val = serverData[col];
        return typeof val === 'object' ? JSON.stringify(val) : val;
      });
      values.push(conflict.entity_id);

      await tauriExecute(
        organizationId,
        `UPDATE ${tableName} SET ${setClause}, synced = 1 WHERE id = ?`,
        values
      );
    }

    // تحديث حالة التعارض
    await tauriExecute(
      organizationId,
      `UPDATE sync_conflicts SET status = ?, resolved_at = ? WHERE id = ?`,
      [`resolved_${resolution}`, now, conflictId]
    );

    console.log(`[TauriSync] ✅ تم حل التعارض ${conflictId} باستخدام: ${resolution}`);
    return { success: true };
  } catch (error: any) {
    console.error('[TauriSync] ❌ فشل حل التعارض:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * عدد التعارضات المعلقة
 */
export async function getConflictsCount(organizationId: string): Promise<number> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT COUNT(*) as count FROM sync_conflicts WHERE organization_id = ? AND status = 'pending'`,
      [organizationId]
    );

    if (result.success && result.data && result.data[0]) {
      return result.data[0].count || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * مزامنة مع اكتشاف التعارضات
 * يُستخدم داخلياً في دوال المزامنة
 */
export async function syncWithConflictDetection<T extends { id: string; updated_at?: string }>(
  organizationId: string,
  entityType: SyncEntityType,
  serverData: T,
  saveFunction: (data: T) => Promise<{ success: boolean }>
): Promise<{ success: boolean; hadConflict: boolean; resolution?: 'local' | 'server' }> {
  // اكتشاف التعارض
  const conflict = await detectConflict(organizationId, entityType, serverData.id, serverData);

  if (conflict) {
    console.log(`[TauriSync] ⚠️ تم اكتشاف تعارض في ${entityType}/${serverData.id}`);

    // حل التعارض
    const { winner, data } = await resolveConflict(organizationId, conflict);

    if (winner === 'server') {
      // حفظ بيانات السيرفر
      const result = await saveFunction(data as T);
      return { success: result.success, hadConflict: true, resolution: 'server' };
    } else {
      // الإبقاء على البيانات المحلية - لا نحفظ بيانات السيرفر
      // نحتاج لرفع البيانات المحلية لاحقاً
      return { success: true, hadConflict: true, resolution: 'local' };
    }
  }

  // لا يوجد تعارض - حفظ عادي
  const result = await saveFunction(serverData);
  return { success: result.success, hadConflict: false };
}

// ============================================
// إدارة Sync Metadata للمزامنة التدريجية
// ============================================

/**
 * الحصول على آخر timestamp للمزامنة لكيان معين
 */
async function getLastSyncTimestamp(
  organizationId: string,
  entityType: SyncEntityType
): Promise<string | null> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT last_sync_timestamp FROM sync_metadata WHERE entity_type = ? LIMIT 1`,
      [entityType]
    );

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0].last_sync_timestamp || null;
    }
    return null;
  } catch (error) {
    console.warn(`[TauriSync] ⚠️ فشل الحصول على last_sync_timestamp لـ ${entityType}:`, error);
    return null;
  }
}

/**
 * تحديث metadata بعد المزامنة
 */
async function updateSyncMetadata(
  organizationId: string,
  entityType: SyncEntityType,
  options: {
    timestamp?: string;
    status?: 'success' | 'error' | 'partial';
    recordsSynced?: number;
    isFullSync?: boolean;
    error?: string | null;
  } = {}
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const {
      timestamp = now,
      status = 'success',
      recordsSynced = 0,
      isFullSync = false,
      error = null
    } = options;

    // التحقق من وجود السجل
    const existing = await tauriQuery(
      organizationId,
      `SELECT id, sync_count FROM sync_metadata WHERE entity_type = ? LIMIT 1`,
      [entityType]
    );

    if (existing.success && existing.data && existing.data.length > 0) {
      // تحديث السجل الموجود
      const currentCount = existing.data[0].sync_count || 0;
      let updateSQL = `
        UPDATE sync_metadata SET
          last_sync_timestamp = ?,
          last_sync_status = ?,
          last_sync_error = ?,
          records_synced = ?,
          sync_count = ?,
          updated_at = ?
      `;
      const params: any[] = [timestamp, status, error, recordsSynced, currentCount + 1, now];

      if (isFullSync) {
        updateSQL += `, last_full_sync_timestamp = ?`;
        params.push(timestamp);
      }

      updateSQL += ` WHERE entity_type = ?`;
      params.push(entityType);

      await tauriExecute(organizationId, updateSQL, params);
    } else {
      // إنشاء سجل جديد
      // ⚡ إضافة table_name لأنه NOT NULL في الـ schema الأصلي
      await tauriExecute(
        organizationId,
        `INSERT INTO sync_metadata (
          id, table_name, entity_type, last_sync_timestamp, last_full_sync_timestamp,
          sync_count, last_sync_status, last_sync_error, records_synced,
          organization_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          entityType,           // ⚡ table_name = entityType
          entityType,
          timestamp,
          isFullSync ? timestamp : null,
          1,
          status,
          error,
          recordsSynced,
          organizationId,
          now,
          now
        ]
      );
    }

    console.log(`[TauriSync] 📝 تم تحديث sync_metadata لـ ${entityType}: ${recordsSynced} سجل`);
  } catch (err) {
    console.error(`[TauriSync] ❌ فشل تحديث sync_metadata لـ ${entityType}:`, err);
  }
}

/**
 * 🗑️ مزامنة الحذف: حذف السجلات المحلية غير الموجودة على السيرفر
 * يُستخدم مع المزامنة الكاملة لضمان عدم وجود سجلات "يتيمة"
 */
async function reconcileDeletedRecords(
  organizationId: string,
  entityType: 'products' | 'customers' | 'orders' | 'invoices',
  serverIds: string[]
): Promise<number> {
  if (serverIds.length === 0) return 0;

  const tableMap: Record<string, string> = {
    products: 'products',
    customers: 'customers',
    orders: 'pos_orders',
    invoices: 'invoices'
  };

  const tableName = tableMap[entityType];
  if (!tableName) return 0;

  try {
    // جلب IDs المحلية
    const localResult = await tauriQuery(
      organizationId,
      `SELECT id FROM ${tableName} WHERE organization_id = ?`,
      [organizationId]
    );

    if (!localResult.success || !localResult.data) return 0;

    const localIds = new Set(localResult.data.map((r: any) => r.id));
    const serverIdSet = new Set(serverIds);

    // إيجاد IDs المحلية غير الموجودة على السيرفر
    const orphanedIds: string[] = [];
    localIds.forEach((id: unknown) => {
      if (!serverIdSet.has(id as string)) {
        orphanedIds.push(id as string);
      }
    });

    if (orphanedIds.length === 0) return 0;

    // حذف السجلات اليتيمة (بحد أقصى 100 لتجنب استعلامات ضخمة)
    const toDelete = orphanedIds.slice(0, 100);
    const placeholders = toDelete.map(() => '?').join(',');

    await tauriExecute(
      organizationId,
      `DELETE FROM ${tableName} WHERE id IN (${placeholders}) AND organization_id = ?`,
      [...toDelete, organizationId]
    );

    console.log(`[TauriSync] 🗑️ تم حذف ${toDelete.length} سجل يتيم من ${tableName}`);
    return toDelete.length;
  } catch (error) {
    console.warn(`[TauriSync] ⚠️ فشل reconciliation لـ ${entityType}:`, error);
    return 0;
  }
}

/**
 * التحقق مما إذا كانت المزامنة الكاملة مطلوبة
 */
async function needsFullSync(
  organizationId: string,
  entityType: SyncEntityType
): Promise<boolean> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT last_sync_timestamp, last_full_sync_timestamp FROM sync_metadata WHERE entity_type = ? LIMIT 1`,
      [entityType]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      // لا توجد بيانات مزامنة سابقة
      return true;
    }

    const metadata = result.data[0];

    if (!metadata.last_sync_timestamp) {
      return true;
    }

    // التحقق من آخر مزامنة كاملة (كل 24 ساعة)
    if (metadata.last_full_sync_timestamp) {
      const lastFullSync = new Date(metadata.last_full_sync_timestamp).getTime();
      const now = Date.now();
      const hoursSinceFullSync = (now - lastFullSync) / (1000 * 60 * 60);

      if (hoursSinceFullSync > 24) {
        console.log(`[TauriSync] ⏰ مطلوب مزامنة كاملة لـ ${entityType}: ${hoursSinceFullSync.toFixed(1)} ساعة منذ آخر مزامنة كاملة`);
        return true;
      }
    } else {
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`[TauriSync] ⚠️ خطأ في التحقق من needsFullSync لـ ${entityType}:`, error);
    return true;
  }
}

// التحقق من بيئة Tauri
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI_IPC__ || w.__TAURI__ || w.__TAURI_INTERNALS__);
}

// ============================================
// مزامنة المنتجات: Supabase → SQLite (مع دعم التدريجية)
// ============================================

/**
 * فرض إعادة المزامنة الكاملة لجدول معين
 * يمسح بيانات sync_metadata لإجبار المزامنة الكاملة في المرة القادمة
 */
export async function forceFullSync(
  organizationId: string,
  entityType: SyncEntityType
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[TauriSync] 🔄 فرض مزامنة كاملة لـ ${entityType}...`);

    // مسح بيانات sync_metadata لهذا الكيان
    await tauriExecute(
      organizationId,
      `DELETE FROM sync_metadata WHERE entity_type = ?`,
      [entityType]
    );

    console.log(`[TauriSync] ✅ تم مسح بيانات المزامنة لـ ${entityType}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[TauriSync] ❌ خطأ في فرض المزامنة الكاملة:`, error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * فرض إعادة المزامنة الكاملة لجميع الجداول
 */
export async function forceFullSyncAll(organizationId: string): Promise<{ success: boolean; error?: string }> {
  const entities: SyncEntityType[] = [
    'products', 'customers', 'orders', 'invoices',
    'categories', 'subcategories', 'staff_members'
  ];

  try {
    for (const entity of entities) {
      await forceFullSync(organizationId, entity);
    }
    console.log('[TauriSync] ✅ تم فرض المزامنة الكاملة لجميع الجداول');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function syncProductsToSQLite(
  organizationId: string,
  options?: { forceFullSync?: boolean }
): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // فرض المزامنة الكاملة إذا طلب المستخدم
    if (options?.forceFullSync) {
      await forceFullSync(organizationId, 'products');
    }

    // التحقق من الحاجة للمزامنة الكاملة
    let isFullSync = options?.forceFullSync || await needsFullSync(organizationId, 'products');
    let lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'products');

    // ✅ إصلاح: التحقق من عدد المنتجات على السيرفر مقارنة بالمحلي
    // إذا كان الفرق كبيراً، نجبر المزامنة الكاملة
    if (!isFullSync) {
      try {
        // عدد المنتجات على السيرفر
        const { count: serverCount, error: countError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        // عدد المنتجات المحلية
        const localResult = await tauriQuery(
          organizationId,
          `SELECT COUNT(*) as count FROM products WHERE organization_id = ?`,
          [organizationId]
        );
        const localCount = localResult.success && localResult.data?.[0]?.count || 0;

        if (!countError && serverCount !== null) {
          const diff = Math.abs(serverCount - localCount);
          const diffPercentage = localCount > 0 ? (diff / localCount) * 100 : 100;

          // إذا كان الفرق أكثر من 10% أو أكثر من 5 منتجات، نجبر المزامنة الكاملة
          if (diffPercentage > 10 || diff > 5) {
            console.log(`[TauriSync] ⚠️ فرق كبير في عدد المنتجات: سيرفر=${serverCount}, محلي=${localCount}, فرق=${diff}`);
            console.log('[TauriSync] 🔄 تبديل إلى مزامنة كاملة...');
            isFullSync = true;
            lastSyncTime = null;
          } else {
            console.log(`[TauriSync] ✅ عدد المنتجات متطابق تقريباً: سيرفر=${serverCount}, محلي=${localCount}`);
          }
        }
      } catch (checkError) {
        console.warn('[TauriSync] ⚠️ فشل التحقق من عدد المنتجات:', checkError);
      }
    }

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للمنتجات من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للمنتجات (منذ ${lastSyncTime})...`);
    }

    // جلب المنتجات
    let allProducts: any[] = [];
    const pageSize = 500;
    let page = 0;
    let hasMore = true;

    while (hasMore && page < 20) {
      const offset = page * pageSize;

      // ✅ بناء query جديد لكل صفحة لتجنب مشاكل Supabase client caching
      let query = supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: true });

      // إضافة فلتر التاريخ للمزامنة التدريجية
      if (lastSyncTime) {
        query = query.gt('updated_at', lastSyncTime);
      }

      const { data, error } = await query.range(offset, offset + pageSize - 1);

      if (error) {
        console.error('[TauriSync] ❌ خطأ في جلب المنتجات:', error);
        await updateSyncMetadata(organizationId, 'products', {
          status: 'error',
          error: error.message,
          recordsSynced: 0
        });
        return { success: false, count: allProducts.length, error: error.message };
      }

      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    // إذا لم يكن هناك منتجات جديدة/محدثة
    if (allProducts.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد منتجات جديدة أو محدثة');
      await updateSyncMetadata(organizationId, 'products', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${allProducts.length} منتج ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    // حفظ المنتجات في SQLite
    let savedCount = 0;
    const batchSize = 50;
    let latestTimestamp = lastSyncTime;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          // ✅ تصفية الحقول غير المطلوبة (مثل product_images التي هي جدول منفصل)
          const { product_images, ...productData } = product;

          // ⚡ الحفاظ على الصور المحلية (thumbnail_base64, images_base64) أثناء المزامنة
          let existingLocalImages: { thumbnail_base64?: string; images_base64?: string } = {};
          try {
            const existingRows = await tauriQuery<any[]>(
              organizationId,
              `SELECT thumbnail_base64, images_base64 FROM products WHERE id = ?`,
              [productData.id]
            );
            if (existingRows && existingRows.length > 0) {
              existingLocalImages = {
                thumbnail_base64: existingRows[0].thumbnail_base64,
                images_base64: existingRows[0].images_base64
              };
              if (existingLocalImages.thumbnail_base64) {
                console.log(`[TauriSync] 🖼️ Preserving local thumbnail_base64 for product ${productData.id} (${Math.round(existingLocalImages.thumbnail_base64.length/1024)}KB)`);
              }
            }
          } catch { /* ignore - product may not exist locally yet */ }

          const result = await tauriUpsert(organizationId, 'products', {
            id: productData.id,
            organization_id: productData.organization_id,
            name: productData.name || '',
            description: productData.description || '',
            sku: productData.sku || '',
            barcode: productData.barcode || '',
            price: productData.price || 0,
            cost_price: productData.cost_price || 0,
            quantity: productData.quantity || 0,
            min_stock: productData.min_stock || 0,
            category_id: productData.category_id || '',
            image_url: productData.image_url || '',
            images: JSON.stringify(productData.images || []),
            colors: JSON.stringify(productData.colors || []),
            sizes: JSON.stringify(productData.sizes || []),
            variants: JSON.stringify(productData.variants || []),
            is_active: productData.is_active ? 1 : 0,
            track_inventory: productData.track_inventory ? 1 : 0,
            allow_backorder: productData.allow_backorder ? 1 : 0,
            weight: productData.weight || 0,
            created_at: productData.created_at || new Date().toISOString(),
            updated_at: productData.updated_at || new Date().toISOString(),
            synced: 1,
            // ⚡ الحفاظ على الصور المحلية (لا يتم استبدالها ببيانات السيرفر الفارغة)
            thumbnail_base64: existingLocalImages.thumbnail_base64 || null,
            images_base64: existingLocalImages.images_base64 || null
          });

          if (result.success) {
            savedCount++;
            // تتبع أحدث timestamp
            if (product.updated_at && (!latestTimestamp || product.updated_at > latestTimestamp)) {
              latestTimestamp = product.updated_at;
            }
          }
        } catch (err) {
          console.error('[TauriSync] ❌ خطأ في حفظ المنتج:', product.id, err);
        }
      }
    }

    // 🗑️ في حالة المزامنة الكاملة، حذف السجلات المحلية غير الموجودة على السيرفر
    let deletedCount = 0;
    if (isFullSync && allProducts.length > 0) {
      const serverIds = allProducts.map(p => p.id);
      deletedCount = await reconcileDeletedRecords(organizationId, 'products', serverIds);
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'products', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: savedCount,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم حفظ ${savedCount} منتج في SQLite ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}${deletedCount > 0 ? ` | حذف ${deletedCount} سجل يتيم` : ''}`);

    // ⚡ مزامنة الألوان والمقاسات بعد المنتجات
    const productIds = allProducts.map(p => p.id);
    if (productIds.length > 0) {
      await syncProductVariantsToSQLite(organizationId, productIds);
    }

    return { success: true, count: savedCount, isIncremental: !isFullSync };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ غير متوقع:', error);
    await updateSyncMetadata(organizationId, 'products', {
      status: 'error',
      error: error?.message || String(error),
      recordsSynced: 0
    });
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

// ============================================
// ⚡ مزامنة الألوان والمقاسات للمنتجات
// ============================================
async function syncProductVariantsToSQLite(
  organizationId: string,
  productIds: string[]
): Promise<{ colorsCount: number; sizesCount: number }> {
  let colorsCount = 0;
  let sizesCount = 0;

  try {
    // مزامنة الألوان
    console.log(`[TauriSync] 🎨 جلب ألوان المنتجات (${productIds.length} منتج)...`);

    // جلب الألوان على دفعات لتجنب مشاكل الحجم
    const batchSize = 100;
    let allColors: any[] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize);
      const { data: colors, error: colorsError } = await supabase
        .from('product_colors')
        .select('*')
        .in('product_id', batchIds);

      if (colorsError) {
        console.error('[TauriSync] ❌ خطأ في جلب الألوان:', colorsError);
      } else if (colors) {
        allColors = allColors.concat(colors);
      }
    }

    console.log(`[TauriSync] 📥 تم جلب ${allColors.length} لون من Supabase`);

    // حفظ الألوان في SQLite
    for (const color of allColors) {
      try {
        const result = await tauriUpsert(organizationId, 'product_colors', {
          id: color.id,
          product_id: color.product_id,
          name: color.name || '',
          color_code: color.color_code || '#000000',
          quantity: color.quantity || 0,
          price: color.price,
          purchase_price: color.purchase_price,
          barcode: color.barcode || '',
          image_url: color.image_url || '',
          has_sizes: color.has_sizes ? 1 : 0,
          is_default: color.is_default ? 1 : 0,
          variant_number: color.variant_number || 0,
          created_at: color.created_at || new Date().toISOString(),
          updated_at: color.updated_at || new Date().toISOString()
        });
        if (result.success) colorsCount++;
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في حفظ اللون:', color.id, err);
      }
    }

    // مزامنة المقاسات
    console.log(`[TauriSync] 📏 جلب مقاسات المنتجات...`);
    let allSizes: any[] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize);
      const { data: sizes, error: sizesError } = await supabase
        .from('product_sizes')
        .select('*')
        .in('product_id', batchIds);

      if (sizesError) {
        console.error('[TauriSync] ❌ خطأ في جلب المقاسات:', sizesError);
      } else if (sizes) {
        allSizes = allSizes.concat(sizes);
      }
    }

    console.log(`[TauriSync] 📥 تم جلب ${allSizes.length} مقاس من Supabase`);

    // حفظ المقاسات في SQLite
    for (const size of allSizes) {
      try {
        const result = await tauriUpsert(organizationId, 'product_sizes', {
          id: size.id,
          product_id: size.product_id,
          color_id: size.color_id,
          size_name: size.size_name || '',
          quantity: size.quantity || 0,
          price: size.price,
          purchase_price: size.purchase_price,
          barcode: size.barcode || '',
          is_default: size.is_default ? 1 : 0,
          created_at: size.created_at || new Date().toISOString(),
          updated_at: size.updated_at || new Date().toISOString()
        });
        if (result.success) sizesCount++;
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في حفظ المقاس:', size.id, err);
      }
    }

    console.log(`[TauriSync] ✅ تم مزامنة ${colorsCount} لون و ${sizesCount} مقاس`);

  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في مزامنة المتغيرات:', error);
  }

  return { colorsCount, sizesCount };
}

// ============================================
// مزامنة العملاء: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncCustomersToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'customers');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'customers');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للعملاء من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للعملاء (منذ ${lastSyncTime})...`);
    }

    // بناء الاستعلام
    let query = supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true });

    // إضافة فلتر التاريخ للمزامنة التدريجية
    if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب العملاء:', error);
      await updateSyncMetadata(organizationId, 'customers', {
        status: 'error',
        error: error.message,
        recordsSynced: 0
      });
      return { success: false, count: 0, error: error.message };
    }

    // إذا لم يكن هناك عملاء جدد/محدثون
    if (!customers || customers.length === 0) {
      console.log('[TauriSync] ℹ️ لا يوجد عملاء جدد أو محدثون');
      await updateSyncMetadata(organizationId, 'customers', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${customers.length} عميل ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    let savedCount = 0;
    let latestTimestamp = lastSyncTime;

    for (const customer of customers) {
      try {
        const customerData = customer as any;
        const result = await tauriUpsert(organizationId, 'customers', {
          id: customerData.id,
          organization_id: customerData.organization_id,
          name: customerData.name || '',
          phone: customerData.phone || '',
          email: customerData.email || '',
          address: customerData.address || '',
          city: customerData.city || '',
          wilaya: customerData.wilaya || '',
          commune: customerData.commune || '',
          notes: customerData.notes || '',
          total_orders: customerData.total_orders || 0,
          total_spent: customerData.total_spent || 0,
          created_at: customerData.created_at || new Date().toISOString(),
          updated_at: customerData.updated_at || new Date().toISOString(),
          synced: 1
        });

        if (result.success) {
          savedCount++;
          // تتبع أحدث timestamp
          if (customer.updated_at && (!latestTimestamp || customer.updated_at > latestTimestamp)) {
            latestTimestamp = customer.updated_at;
          }
        }
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في حفظ العميل:', customer.id, err);
      }
    }

    // 🗑️ في حالة المزامنة الكاملة، حذف السجلات المحلية غير الموجودة على السيرفر
    let deletedCount = 0;
    if (isFullSync && customers.length > 0) {
      const serverIds = customers.map(c => c.id);
      deletedCount = await reconcileDeletedRecords(organizationId, 'customers', serverIds);
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'customers', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: savedCount,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم حفظ ${savedCount} عميل في SQLite ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}${deletedCount > 0 ? ` | حذف ${deletedCount} سجل يتيم` : ''}`);
    return { success: true, count: savedCount, isIncremental: !isFullSync };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ غير متوقع:', error);
    await updateSyncMetadata(organizationId, 'customers', {
      status: 'error',
      error: error?.message || String(error),
      recordsSynced: 0
    });
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

// ============================================
// مزامنة الطلبات: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncOrdersToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'orders');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'orders');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للطلبات من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للطلبات (منذ ${lastSyncTime})...`);
    }

    // جلب الطلبات
    let allOrders: any[] = [];
    const pageSize = 200;
    let page = 0;
    let hasMore = true;

    while (hasMore && page < 50) {
      const offset = page * pageSize;

      // ✅ بناء query جديد لكل صفحة لتجنب مشاكل Supabase client caching
      let query = supabase
        .from('orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: true });

      // إضافة فلتر التاريخ للمزامنة التدريجية
      if (lastSyncTime) {
        query = query.gt('updated_at', lastSyncTime);
      }

      const { data, error } = await query.range(offset, offset + pageSize - 1);

      if (error) {
        console.error('[TauriSync] ❌ خطأ في جلب الطلبات:', error);
        await updateSyncMetadata(organizationId, 'orders', {
          status: 'error',
          error: error.message,
          recordsSynced: 0
        });
        return { success: false, count: allOrders.length, error: error.message };
      }

      if (data && data.length > 0) {
        allOrders = allOrders.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    // إذا لم يكن هناك طلبات جديدة/محدثة
    if (allOrders.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد طلبات جديدة أو محدثة');
      await updateSyncMetadata(organizationId, 'orders', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${allOrders.length} طلب ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    // حفظ في SQLite (جدول pos_orders)
    let savedCount = 0;
    let latestTimestamp = lastSyncTime;

    for (const order of allOrders) {
      try {
        // ⚡ استخراج البيانات من metadata (حيث تُخزَّن البيانات المحلية)
        let metadata: Record<string, any> = {};
        try {
          if (order.metadata) {
            metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          }
        } catch { /* ignore parse errors */ }

        const result = await tauriUpsert(organizationId, 'pos_orders', {
          id: order.id,
          organization_id: order.organization_id,
          // ⚡ البيانات الأساسية من Supabase
          order_number: order.customer_order_number || order.global_order_number || metadata.local_order_number || '',
          customer_id: order.customer_id || '',
          // ⚡ البيانات المحلية من metadata
          customer_name: metadata.customer_name || '',
          customer_phone: metadata.customer_phone || '',
          customer_address: metadata.customer_address || '',
          wilaya: metadata.wilaya || '',
          commune: metadata.commune || '',
          items: JSON.stringify(metadata.items || order.items || []),
          // ⚡ البيانات المالية
          subtotal: order.subtotal || 0,
          discount: order.discount || 0,
          shipping_cost: order.shipping_cost || 0,
          total_amount: order.total || order.total_amount || 0,
          payment_method: order.payment_method || '',
          payment_status: order.payment_status || 'pending',
          status: order.status || 'pending',
          notes: order.notes || order.admin_notes || '',
          tracking_number: order.tracking_number || '',
          shipping_company: order.shipping_company || '',
          staff_id: order.created_by_staff_id || '',
          created_at: order.created_at || new Date().toISOString(),
          updated_at: order.updated_at || new Date().toISOString(),
          synced: 1
        });

        if (result.success) {
          savedCount++;
          // تتبع أحدث timestamp
          if (order.updated_at && (!latestTimestamp || order.updated_at > latestTimestamp)) {
            latestTimestamp = order.updated_at;
          }
        }
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في حفظ الطلب:', order.id, err);
      }
    }

    // 🗑️ في حالة المزامنة الكاملة، حذف السجلات المحلية غير الموجودة على السيرفر
    let deletedCount = 0;
    if (isFullSync && allOrders.length > 0) {
      const serverIds = allOrders.map(o => o.id);
      deletedCount = await reconcileDeletedRecords(organizationId, 'orders', serverIds);
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'orders', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: savedCount,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم حفظ ${savedCount} طلب في SQLite ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}${deletedCount > 0 ? ` | حذف ${deletedCount} سجل يتيم` : ''}`);
    return { success: true, count: savedCount, isIncremental: !isFullSync };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ غير متوقع:', error);
    await updateSyncMetadata(organizationId, 'orders', {
      status: 'error',
      error: error?.message || String(error),
      recordsSynced: 0
    });
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

// ============================================
// مزامنة الفواتير: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncInvoicesToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'invoices');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'invoices');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للفواتير من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للفواتير (منذ ${lastSyncTime})...`);
    }

    // بناء الاستعلام
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true });

    // إضافة فلتر التاريخ للمزامنة التدريجية
    if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب الفواتير:', error);
      await updateSyncMetadata(organizationId, 'invoices', {
        status: 'error',
        error: error.message,
        recordsSynced: 0
      });
      return { success: false, count: 0, error: error.message };
    }

    // إذا لم يكن هناك فواتير جديدة/محدثة
    if (!invoices || invoices.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد فواتير جديدة أو محدثة');
      await updateSyncMetadata(organizationId, 'invoices', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${invoices.length} فاتورة ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    let savedCount = 0;
    let latestTimestamp = lastSyncTime;

    for (const invoice of invoices) {
      try {
        const invoiceData = invoice as any;
        const result = await tauriUpsert(organizationId, 'invoices', {
          id: invoiceData.id,
          organization_id: invoiceData.organization_id,
          invoice_number: invoiceData.invoice_number || '',
          customer_id: invoiceData.customer_id || '',
          customer_name: invoiceData.customer_name || '',
          items: JSON.stringify(invoiceData.items || invoiceData.invoice_items || []),
          subtotal: invoiceData.subtotal || invoiceData.sub_total || 0,
          discount: invoiceData.discount || invoiceData.discount_amount || 0,
          tax: invoiceData.tax || invoiceData.tax_amount || 0,
          total_amount: invoiceData.total_amount || 0,
          paid_amount: invoiceData.paid_amount || invoiceData.amount_paid || 0,
          payment_status: invoiceData.payment_status || 'pending',
          payment_method: invoiceData.payment_method || '',
          notes: invoiceData.notes || '',
          due_date: invoiceData.due_date || '',
          created_at: invoiceData.created_at || new Date().toISOString(),
          updated_at: invoiceData.updated_at || new Date().toISOString(),
          synced: 1
        });

        if (result.success) {
          savedCount++;
          // تتبع أحدث timestamp
          if (invoice.updated_at && (!latestTimestamp || invoice.updated_at > latestTimestamp)) {
            latestTimestamp = invoice.updated_at;
          }
        }
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في حفظ الفاتورة:', invoice.id, err);
      }
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'invoices', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: savedCount,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم حفظ ${savedCount} فاتورة في SQLite ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}`);
    return { success: true, count: savedCount, isIncremental: !isFullSync };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ غير متوقع:', error);
    await updateSyncMetadata(organizationId, 'invoices', {
      status: 'error',
      error: error?.message || String(error),
      recordsSynced: 0
    });
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

// ============================================
// رفع الطلبات الجديدة: SQLite → Supabase
// ⚡ تم تعطيل هذه الدالة - BatchSender يتولى هذه المهمة تلقائياً
// ============================================
export async function uploadPendingOrdersToSupabase(organizationId: string): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  error?: string;
}> {
  // ⚡ Delta Sync: المزامنة تحدث تلقائياً عبر BatchSender
  console.log('[TauriSync] ⚡ uploadPendingOrdersToSupabase - تم تعطيله، BatchSender يتولى المهمة');
  return { success: true, uploaded: 0, failed: 0 };

  /* ❌ الكود القديم معطل
  if (!isTauriEnvironment()) {
    return { success: false, uploaded: 0, failed: 0, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🔄 بدء رفع الطلبات المعلقة إلى Supabase...');

    // جلب الطلبات غير المرفوعة
    const result = await tauriQuery(
      organizationId,
      `SELECT * FROM pos_orders WHERE organization_id = ? AND (synced = 0 OR synced IS NULL)`,
      [organizationId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد طلبات معلقة للرفع');
      return { success: true, uploaded: 0, failed: 0 };
    }

    console.log('[TauriSync] 📊 طلبات معلقة للرفع:', result.data.length);

    let uploaded = 0;
    let failed = 0;

    for (const order of result.data) {
      try {
        // تحويل البيانات للشكل المطلوب في Supabase
        // ⚡ ملاحظة: جدول orders في Supabase له أعمدة مختلفة عن SQLite المحلي
        // الأعمدة المحلية مثل commune, wilaya, customer_name تُخزن في metadata
        const orderData: Record<string, any> = {
          id: order.id,
          organization_id: order.organization_id,
          customer_order_number: order.order_number || order.customer_order_number,
          customer_id: order.customer_id || null,
          subtotal: order.subtotal || 0,
          discount: order.discount || 0,
          shipping_cost: order.shipping_cost || 0,
          total: order.total_amount || order.total || 0,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          status: order.status,
          notes: order.notes,
          created_by_staff_id: order.staff_id || order.created_by_staff_id || null,
          created_at: order.created_at,
          updated_at: new Date().toISOString(),
          pos_order_type: order.pos_order_type || 'pos',
          // تخزين البيانات الإضافية في metadata
          metadata: JSON.stringify({
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address,
            wilaya: order.wilaya,
            commune: order.commune,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            local_order_number: order.order_number
          })
        };

        // رفع إلى Supabase
        const { error } = await supabase
          .from('orders')
          .upsert(orderData, { onConflict: 'id' });

        if (error) {
          console.error('[TauriSync] ❌ فشل رفع الطلب:', order.id, error);
          failed++;
        } else {
          // تحديث حالة المزامنة في SQLite
          await tauriExecute(
            organizationId,
            `UPDATE pos_orders SET synced = 1, updated_at = ? WHERE id = ?`,
            [new Date().toISOString(), order.id]
          );
          uploaded++;
        }
      } catch (err) {
        console.error('[TauriSync] ❌ خطأ في رفع الطلب:', order.id, err);
        failed++;
      }
    }

    console.log('[TauriSync] ✅ تم رفع', uploaded, 'طلب، فشل:', failed);
    return { success: failed === 0, uploaded, failed };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ غير متوقع:', error);
    return { success: false, uploaded: 0, failed: 0, error: error?.message || String(error) };
  }
  */ // نهاية التعليق
}

// ============================================
// المزامنة الكاملة
// ============================================
export async function fullSync(organizationId: string, authUserId?: string): Promise<{
  success: boolean;
  results: {
    products: { success: boolean; count: number };
    customers: { success: boolean; count: number };
    orders: { success: boolean; count: number };
    invoices: { success: boolean; count: number };
    uploaded: { success: boolean; uploaded: number; failed: number };
    subscription?: { success: boolean };
    permissions?: { success: boolean };
    organization?: { success: boolean };
    categories?: { success: boolean; count: number };
    subcategories?: { success: boolean; count: number };
    staffMembers?: { success: boolean; count: number };
    retryQueue?: { processed: number; succeeded: number; failed: number };
  };
}> {
  console.log('[TauriSync] 🚀 بدء المزامنة الكاملة...');
  const startTime = Date.now();

  // الحصول على authUserId من localStorage إذا لم يتم تمريره
  const userId = authUserId || localStorage.getItem('auth_user_id') || '';

  // 0. معالجة طابور العمليات الفاشلة أولاً
  const retryResult = await processRetryQueue(organizationId);
  if (retryResult.processed > 0) {
    console.log(`[TauriSync] 🔄 تمت معالجة ${retryResult.processed} عملية من طابور الإعادة`);
  }

  // 1. رفع الطلبات المعلقة
  const uploaded = await uploadPendingOrdersToSupabase(organizationId);

  // إضافة للطابور إذا فشل الرفع
  if (!uploaded.success && uploaded.error) {
    await queueFailedOperation(organizationId, {
      operation_type: 'sync_upload',
      entity_type: 'orders',
      error_message: uploaded.error,
      organization_id: organizationId
    });
  }

  // 2. تنزيل البيانات من السيرفر (البيانات الأساسية + الاشتراكات والصلاحيات)
  const [products, customers, orders, invoices, subscription, organization, categories, subcategories, staffMembers] = await Promise.all([
    syncProductsToSQLite(organizationId),
    syncCustomersToSQLite(organizationId),
    syncOrdersToSQLite(organizationId),
    syncInvoicesToSQLite(organizationId),
    syncSubscriptionToSQLite(organizationId, userId),
    syncOrganizationToSQLite(organizationId),
    syncCategoriesToSQLite(organizationId),
    syncSubcategoriesToSQLite(organizationId),
    syncStaffMembersToSQLite(organizationId)
  ]);

  // 3. إضافة العمليات الفاشلة إلى طابور الإعادة
  const failedSyncs: { type: SyncEntityType; error: string }[] = [];
  if (!products.success && products.error) failedSyncs.push({ type: 'products', error: products.error });
  if (!customers.success && customers.error) failedSyncs.push({ type: 'customers', error: customers.error });
  if (!orders.success && orders.error) failedSyncs.push({ type: 'orders', error: orders.error });
  if (!invoices.success && invoices.error) failedSyncs.push({ type: 'invoices', error: invoices.error });
  if (!categories.success && categories.error) failedSyncs.push({ type: 'categories', error: categories.error });
  if (!subcategories.success && subcategories.error) failedSyncs.push({ type: 'subcategories', error: subcategories.error });
  if (!staffMembers.success && staffMembers.error) failedSyncs.push({ type: 'staff_members', error: staffMembers.error });

  for (const failed of failedSyncs) {
    await queueFailedOperation(organizationId, {
      operation_type: 'sync_download',
      entity_type: failed.type,
      error_message: failed.error,
      organization_id: organizationId
    });
  }

  // 4. مزامنة الصلاحيات إذا كان userId متاحاً
  let permissions = { success: true };
  if (userId) {
    permissions = await syncPermissionsToSQLite(organizationId, userId);
  }

  // 5. تنظيف العمليات الفاشلة القديمة (أسبوعياً)
  await cleanupOldFailedOperations(organizationId);

  // 6. بدء مزامنة الصور في الخلفية (بدون انتظار)
  syncImagesInBackground(organizationId).catch(err => {
    console.warn('[TauriSync] ⚠️ فشل مزامنة الصور في الخلفية:', err);
  });

  const duration = Date.now() - startTime;
  const success = products.success && customers.success && orders.success && invoices.success;

  console.log('[TauriSync] ✅ اكتملت المزامنة في', duration, 'ms', {
    products: products.count,
    customers: customers.count,
    orders: orders.count,
    invoices: invoices.count,
    categories: categories.count,
    subcategories: subcategories.count,
    staffMembers: staffMembers.count,
    uploaded: uploaded.uploaded,
    subscription: subscription.success,
    permissions: permissions.success,
    organization: organization.success,
    retryQueue: retryResult
  });

  return {
    success,
    results: {
      products,
      customers,
      orders,
      invoices,
      uploaded,
      subscription,
      permissions,
      organization,
      categories,
      subcategories,
      staffMembers,
      retryQueue: retryResult
    }
  };
}

// ============================================
// مزامنة الاشتراكات: Supabase → SQLite
// ============================================
export async function syncSubscriptionToSQLite(organizationId: string, authUserId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🔄 بدء مزامنة الاشتراك من Supabase...');

    // جلب الاشتراك النشط من السيرفر (الجدول الصحيح: organization_subscriptions)
    const { data: subscription, error } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trial'])
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[TauriSync] ❌ خطأ في جلب الاشتراك:', error);
      return { success: false, error: error.message };
    }

    if (subscription) {
      const subData = subscription as any;
      const result = await tauriUpsert(organizationId, 'subscriptions', {
        id: subData.id,
        organization_id: subData.organization_id,
        plan_id: subData.plan_id,
        status: subData.status,
        start_date: subData.start_date,
        end_date: subData.end_date,
        trial_end_date: subData.trial_end_date || subData.trial_ends_at,
        features: JSON.stringify(subData.features || []),
        last_check: new Date().toISOString(),
        synced: 1,
        created_at: subData.created_at,
        updated_at: new Date().toISOString()
      });

      if (result.success) {
        console.log('[TauriSync] ✅ تم حفظ الاشتراك محلياً');
        return { success: true };
      }
    }

    // إذا لم يوجد اشتراك نشط، نجلب آخر اشتراك
    const { data: lastSub } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (lastSub) {
      const lastSubData = lastSub as any;
      await tauriUpsert(organizationId, 'subscriptions', {
        id: lastSubData.id,
        organization_id: lastSubData.organization_id,
        plan_id: lastSubData.plan_id,
        status: lastSubData.status || 'expired',
        start_date: lastSubData.start_date,
        end_date: lastSubData.end_date,
        trial_end_date: lastSubData.trial_end_date || lastSubData.trial_ends_at,
        features: JSON.stringify([]),
        last_check: new Date().toISOString(),
        synced: 1,
        created_at: lastSubData.created_at,
        updated_at: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الاشتراك:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// مزامنة الصلاحيات: Supabase → SQLite
// ============================================
export async function syncPermissionsToSQLite(organizationId: string, authUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🔄 بدء مزامنة الصلاحيات من Supabase...');

    // استخدام RPC للحصول على الصلاحيات
    const { data: rows, error } = await supabase.rpc('get_user_with_permissions_unified', {
      p_auth_user_id: authUserId,
      p_include_subscription_data: false,
      p_calculate_permissions: true
    });

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب الصلاحيات:', error);
      return { success: false, error: error.message };
    }

    const row = (Array.isArray(rows) ? rows[0] : rows) as any;

    if (row && (row.auth_user_id || row.user_id)) {
      const authId = row.auth_user_id || row.user_id;
      const id = `${organizationId || 'global'}:${authId}`;
      const now = new Date().toISOString();

      const result = await tauriUpsert(organizationId, 'user_permissions', {
        id,
        auth_user_id: authId,
        user_id: row.user_id,
        email: row.email || '',
        name: row.name || '',
        role: row.role || 'user',
        organization_id: row.organization_id || organizationId,
        is_active: row.is_active ? 1 : 0,
        is_org_admin: row.is_org_admin ? 1 : 0,
        is_super_admin: row.is_super_admin ? 1 : 0,
        permissions: JSON.stringify(row.permissions || {}),
        has_inventory_access: row.has_inventory_access ? 1 : 0,
        can_manage_products: row.can_manage_products ? 1 : 0,
        can_view_reports: row.can_view_reports ? 1 : 0,
        can_manage_users: row.can_manage_users ? 1 : 0,
        can_manage_orders: row.can_manage_orders ? 1 : 0,
        can_access_pos: row.can_access_pos ? 1 : 0,
        can_manage_settings: row.can_manage_settings ? 1 : 0,
        created_at: now,
        updated_at: now,
        last_updated: now
      });

      if (result.success) {
        console.log('[TauriSync] ✅ تم حفظ الصلاحيات محلياً');
        return { success: true };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الصلاحيات:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// مزامنة بيانات المصادقة: حفظ محلياً للأوفلاين
// ============================================
export async function syncAuthDataToSQLite(
  organizationId: string,
  authUserId: string,
  userData: {
    email?: string;
    name?: string;
    role?: string;
    user_metadata?: any;
    app_metadata?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isTauriEnvironment()) {
    return { success: false, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🔄 حفظ بيانات المصادقة محلياً...');

    const now = new Date().toISOString();
    const result = await tauriUpsert(organizationId, 'local_auth_data', {
      id: authUserId,
      auth_user_id: authUserId,
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || '',
      organization_id: organizationId,
      user_metadata: JSON.stringify(userData.user_metadata || {}),
      app_metadata: JSON.stringify(userData.app_metadata || {}),
      last_online_at: now,
      created_at: now,
      updated_at: now
    });

    if (result.success) {
      console.log('[TauriSync] ✅ تم حفظ بيانات المصادقة محلياً');
    }

    return result;
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في حفظ بيانات المصادقة:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// مزامنة بيانات المؤسسة: Supabase → SQLite
// ============================================
export async function syncOrganizationToSQLite(organizationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🔄 بدء مزامنة بيانات المؤسسة من Supabase...');

    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب المؤسسة:', error);
      return { success: false, error: error.message };
    }

    if (org) {
      const orgData = org as any;
      const result = await tauriUpsert(organizationId, 'organizations', {
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug || orgData.subdomain,
        logo_url: orgData.logo_url,
        owner_id: orgData.owner_id,
        settings: JSON.stringify(orgData.settings || {}),
        phone: orgData.phone || '',
        email: orgData.email || '',
        address: orgData.address || '',
        city: orgData.city || '',
        wilaya: orgData.wilaya || '',
        country: orgData.country || 'DZ',
        currency: orgData.currency || 'DZD',
        timezone: orgData.timezone || 'Africa/Algiers',
        nif: orgData.nif || '',
        rc: orgData.rc || '',
        nis: orgData.nis || '',
        rib: orgData.rib || '',
        activity: orgData.activity || '',
        business_type: orgData.business_type || '',
        is_active: orgData.is_active ? 1 : 0,
        trial_ends_at: orgData.trial_ends_at || '',
        subscription_status: orgData.subscription_status,
        created_at: orgData.created_at,
        updated_at: orgData.updated_at || new Date().toISOString()
      });

      if (result.success) {
        console.log('[TauriSync] ✅ تم حفظ بيانات المؤسسة محلياً');
        return { success: true };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة المؤسسة:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// جلب الإحصائيات من SQLite
// ============================================
export async function getSQLiteStats(organizationId: string): Promise<{
  products: { total: number; unsynced: number };
  customers: { total: number; unsynced: number };
  orders: { total: number; unsynced: number };
  invoices: { total: number; unsynced: number };
}> {
  if (!isTauriEnvironment()) {
    return {
      products: { total: 0, unsynced: 0 },
      customers: { total: 0, unsynced: 0 },
      orders: { total: 0, unsynced: 0 },
      invoices: { total: 0, unsynced: 0 }
    };
  }

  try {
    const [
      productsTotal,
      productsUnsynced,
      customersTotal,
      customersUnsynced,
      ordersTotal,
      ordersUnsynced,
      invoicesTotal,
      invoicesUnsynced
    ] = await Promise.all([
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM products WHERE organization_id = ?', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM products WHERE organization_id = ? AND synced = 0', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM customers WHERE organization_id = ?', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM customers WHERE organization_id = ? AND synced = 0', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM pos_orders WHERE organization_id = ?', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM pos_orders WHERE organization_id = ? AND (synced = 0 OR synced IS NULL OR status IN (\'pending_sync\', \'syncing\', \'failed\'))', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM invoices WHERE organization_id = ?', [organizationId]),
      tauriQuery(organizationId, 'SELECT COUNT(*) as total FROM invoices WHERE organization_id = ? AND synced = 0', [organizationId])
    ]);

    const stats = {
      products: {
        total: productsTotal.data?.[0]?.total || 0,
        unsynced: productsUnsynced.data?.[0]?.total || 0
      },
      customers: {
        total: customersTotal.data?.[0]?.total || 0,
        unsynced: customersUnsynced.data?.[0]?.total || 0
      },
      orders: {
        total: ordersTotal.data?.[0]?.total || 0,
        unsynced: ordersUnsynced.data?.[0]?.total || 0
      },
      invoices: {
        total: invoicesTotal.data?.[0]?.total || 0,
        unsynced: invoicesUnsynced.data?.[0]?.total || 0
      }
    };

    // 🔍 DEBUG: إذا وجدنا orders غير مزامنة، نجلب تفاصيلها
    if (stats.orders.unsynced > 0) {
      try {
        const unsyncedOrderDetails = await tauriQuery(
          organizationId,
          `SELECT id, customer_order_number, status, synced, created_at
           FROM pos_orders
           WHERE organization_id = ?
           AND (synced = 0 OR synced IS NULL OR status IN ('pending_sync', 'syncing', 'failed'))
           LIMIT 10`,
          [organizationId]
        );
        console.log('[TauriSync] 🔍 DEBUG: Orders غير مزامنة:', unsyncedOrderDetails.data);
      } catch (e) {
        console.error('[TauriSync] خطأ في جلب تفاصيل orders:', e);
      }
    }

    return stats;
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في جلب الإحصائيات:', error);
    return {
      products: { total: 0, unsynced: 0 },
      customers: { total: 0, unsynced: 0 },
      orders: { total: 0, unsynced: 0 },
      invoices: { total: 0, unsynced: 0 }
    };
  }
}

// ============================================
// مزامنة الفئات: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncCategoriesToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'categories');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'categories');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للفئات من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للفئات (منذ ${lastSyncTime})...`);
    }

    // بناء الاستعلام
    let query = supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true });

    // إضافة فلتر التاريخ للمزامنة التدريجية
    if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب الفئات:', error);
      return { success: false, count: 0, error: error.message };
    }

    // إذا لم يكن هناك فئات جديدة/محدثة
    if (!categories || categories.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد فئات جديدة أو محدثة');
      await updateSyncMetadata(organizationId, 'categories', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${categories.length} فئة ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    let count = 0;
    let latestTimestamp = lastSyncTime;

    for (const category of categories) {
      const result = await tauriUpsert(organizationId, 'product_categories', {
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        icon: category.icon,
        image_url: category.image_url,
        is_active: category.is_active ? 1 : 0,
        type: category.type,
        organization_id: category.organization_id,
        created_at: category.created_at,
        updated_at: category.updated_at || new Date().toISOString()
      });
      if (result.success) {
        count++;
        if (category.updated_at && (!latestTimestamp || category.updated_at > latestTimestamp)) {
          latestTimestamp = category.updated_at;
        }
      }
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'categories', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: count,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم مزامنة ${count} فئة ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}`);
    return { success: true, count, isIncremental: !isFullSync };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الفئات:', error);
    return { success: false, count: 0, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// مزامنة الفئات الفرعية: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncSubcategoriesToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'subcategories');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'subcategories');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للفئات الفرعية من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للفئات الفرعية (منذ ${lastSyncTime})...`);
    }

    // بناء الاستعلام
    let query: any = supabase
      .from('product_subcategories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true });

    // إضافة فلتر التاريخ للمزامنة التدريجية
    if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
    }

    const { data: subcategories, error } = await query as any;

    if (error) {
      console.error('[TauriSync] ❌ خطأ في جلب الفئات الفرعية:', error);
      return { success: false, count: 0, error: error.message };
    }

    // إذا لم يكن هناك فئات فرعية جديدة/محدثة
    if (!subcategories || subcategories.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد فئات فرعية جديدة أو محدثة');
      await updateSyncMetadata(organizationId, 'subcategories', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${subcategories.length} فئة فرعية ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    let count = 0;
    let latestTimestamp = lastSyncTime;

    for (const subcategory of subcategories) {
      const subData = subcategory as any;
      const result = await tauriUpsert(organizationId, 'product_subcategories', {
        id: subData.id,
        category_id: subData.category_id,
        name: subData.name,
        description: subData.description,
        slug: subData.slug,
        is_active: subData.is_active ? 1 : 0,
        organization_id: subData.organization_id || organizationId,
        created_at: subData.created_at,
        updated_at: subData.updated_at || new Date().toISOString()
      });
      if (result.success) {
        count++;
        if (subData.updated_at && (!latestTimestamp || subData.updated_at > latestTimestamp)) {
          latestTimestamp = subData.updated_at;
        }
      }
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'subcategories', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: count,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم مزامنة ${count} فئة فرعية ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}`);
    return { success: true, count, isIncremental: !isFullSync };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الفئات الفرعية:', error);
    return { success: false, count: 0, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// مزامنة الموظفين: Supabase → SQLite (مع دعم التدريجية)
// ============================================
export async function syncStaffMembersToSQLite(organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
  isIncremental?: boolean;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, count: 0, error: 'Not in Tauri environment' };
  }

  try {
    // التحقق من الحاجة للمزامنة الكاملة
    const isFullSync = await needsFullSync(organizationId, 'staff_members');
    const lastSyncTime = isFullSync ? null : await getLastSyncTimestamp(organizationId, 'staff_members');

    if (isFullSync) {
      console.log('[TauriSync] 🔄 بدء مزامنة كاملة للموظفين من Supabase...');
    } else {
      console.log(`[TauriSync] 🔄 بدء مزامنة تدريجية للموظفين (منذ ${lastSyncTime})...`);
    }

    // بناء الاستعلام
    let query = supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true });

    // إضافة فلتر التاريخ للمزامنة التدريجية
    if (lastSyncTime) {
      query = query.gt('updated_at', lastSyncTime);
    }

    const { data: staffMembers, error } = await query;

    if (error) {
      // تجاهل خطأ الجدول غير الموجود وإرجاع نجاح مع 0 موظف
      if (error.code === '42P01') {
        console.warn('[TauriSync] ⚠️ جدول المستخدمين غير موجود، تجاوز...');
        return { success: true, count: 0, error: undefined };
      }
      console.error('[TauriSync] ❌ خطأ في جلب الموظفين:', error);
      return { success: false, count: 0, error: error.message };
    }

    // إذا لم يكن هناك موظفين جدد/محدثين
    if (!staffMembers || staffMembers.length === 0) {
      console.log('[TauriSync] ℹ️ لا يوجد موظفين جدد أو محدثين');
      await updateSyncMetadata(organizationId, 'staff_members', {
        status: 'success',
        recordsSynced: 0,
        isFullSync
      });
      return { success: true, count: 0, isIncremental: !isFullSync };
    }

    console.log(`[TauriSync] 📥 تم جلب ${staffMembers.length} موظف ${isFullSync ? '(كاملة)' : '(تدريجية)'}`);

    let count = 0;
    let latestTimestamp = lastSyncTime;

    for (const staff of staffMembers) {
      const result = await tauriUpsert(organizationId, 'staff_members', {
        id: staff.id,
        organization_id: staff.organization_id,
        user_id: staff.auth_user_id || staff.id,
        name: staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
        email: staff.email,
        phone: staff.phone,
        role: staff.role || 'staff',
        permissions: typeof staff.permissions === 'string' ? staff.permissions : JSON.stringify(staff.permissions || {}),
        pin_hash: null,
        salt: null,
        is_active: staff.is_active ? 1 : 0,
        last_login: staff.last_activity_at,
        avatar_url: staff.avatar_url,
        first_name: staff.first_name,
        last_name: staff.last_name,
        created_at: staff.created_at,
        updated_at: staff.updated_at || new Date().toISOString(),
        synced: 1,
        sync_status: 'synced',
        pending_operation: null
      });
      if (result.success) {
        count++;
        if (staff.updated_at && (!latestTimestamp || staff.updated_at > latestTimestamp)) {
          latestTimestamp = staff.updated_at;
        }
      }
    }

    // تحديث sync_metadata
    await updateSyncMetadata(organizationId, 'staff_members', {
      timestamp: latestTimestamp || new Date().toISOString(),
      status: 'success',
      recordsSynced: count,
      isFullSync
    });

    console.log(`[TauriSync] ✅ تم مزامنة ${count} موظف ${isFullSync ? '(مزامنة كاملة)' : '(مزامنة تدريجية)'}`);
    return { success: true, count, isIncremental: !isFullSync };
  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الموظفين:', error);
    return { success: false, count: 0, error: error?.message || 'Unknown error' };
  }
}

// ============================================
// 🖼️ مزامنة الصور للعمل Offline
// ============================================

interface CachedImage {
  id: string;
  url: string;
  base64_data: string;
  entity_type: string;
  entity_id: string;
  organization_id: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

// إعدادات تحميل الصور
const IMAGE_SYNC_CONFIG = {
  maxConcurrentDownloads: 3,
  batchSize: 10,
  maxImageSizeKB: 500,         // الحد الأقصى لحجم الصورة للتخزين المحلي
  thumbnailQuality: 0.7,       // جودة الصورة المصغرة
  retryDelay: 2000,            // تأخير إعادة المحاولة
};

/**
 * تحويل رابط صورة إلى Base64
 */
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string; size: number } | null> {
  try {
    // التحقق من صحة الرابط
    if (!url || !url.startsWith('http')) {
      return null;
    }

    const response = await fetch(url, {
      mode: 'cors',
      cache: 'force-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve({
          base64,
          mimeType,
          size: blob.size
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`[TauriSync] ⚠️ فشل تحميل الصورة: ${url}`, error);
    return null;
  }
}

/**
 * التحقق من وجود صورة مخزنة محلياً
 */
async function isImageCached(
  organizationId: string,
  imageUrl: string
): Promise<boolean> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT 1 FROM cached_images WHERE url = ? AND organization_id = ? LIMIT 1`,
      [imageUrl, organizationId]
    );
    return result.success && result.data && result.data.length > 0;
  } catch {
    return false;
  }
}

/**
 * حفظ صورة في SQLite
 */
async function cacheImage(
  organizationId: string,
  imageData: {
    url: string;
    base64: string;
    mimeType: string;
    size: number;
    entityType: string;
    entityId: string;
  }
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    await tauriExecute(
      organizationId,
      `INSERT OR REPLACE INTO cached_images (
        id, url, base64_data, entity_type, entity_id,
        organization_id, file_size, mime_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        imageData.url,
        imageData.base64,
        imageData.entityType,
        imageData.entityId,
        organizationId,
        imageData.size,
        imageData.mimeType,
        now,
        now
      ]
    );
    return true;
  } catch (error) {
    console.error('[TauriSync] ❌ فشل حفظ الصورة:', error);
    return false;
  }
}

/**
 * جلب صورة من التخزين المحلي
 */
export async function getCachedImage(
  organizationId: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT base64_data FROM cached_images WHERE url = ? AND organization_id = ? LIMIT 1`,
      [imageUrl, organizationId]
    );

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0].base64_data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * مزامنة صور المنتجات
 */
export async function syncProductImagesToSQLite(organizationId: string): Promise<{
  success: boolean;
  cached: number;
  skipped: number;
  failed: number;
  error?: string;
}> {
  if (!isTauriEnvironment()) {
    return { success: false, cached: 0, skipped: 0, failed: 0, error: 'Not in Tauri environment' };
  }

  try {
    console.log('[TauriSync] 🖼️ بدء مزامنة صور المنتجات...');

    // جلب المنتجات التي لديها صور - تضمين جميع حقول الصور الممكنة
    const result = await tauriQuery(
      organizationId,
      `SELECT id, image_url, thumbnail_image, image_thumbnail, images
       FROM products
       WHERE organization_id = ?
       AND (image_url IS NOT NULL OR thumbnail_image IS NOT NULL OR image_thumbnail IS NOT NULL OR images IS NOT NULL)`,
      [organizationId]
    );

    if (!result.success || !result.data || result.data.length === 0) {
      console.log('[TauriSync] ℹ️ لا توجد منتجات بصور للمزامنة');
      return { success: true, cached: 0, skipped: 0, failed: 0 };
    }

    let cached = 0;
    let skipped = 0;
    let failed = 0;

    // تجميع كل روابط الصور
    const imageUrls: { url: string; productId: string }[] = [];
    const seenUrls = new Set<string>(); // لتجنب التكرار

    for (const product of result.data) {
      // ✅ إصلاح: جمع الصور من جميع الحقول الممكنة
      const potentialUrls = [
        product.image_url,
        product.thumbnail_image,
        product.image_thumbnail
      ].filter(Boolean);

      for (const url of potentialUrls) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          imageUrls.push({ url, productId: product.id });
        }
      }

      // الصور الإضافية
      if (product.images) {
        try {
          const images = typeof product.images === 'string'
            ? JSON.parse(product.images)
            : product.images;

          if (Array.isArray(images)) {
            for (const img of images) {
              const imgUrl = typeof img === 'string' ? img : img?.url;
              if (imgUrl && !seenUrls.has(imgUrl)) {
                seenUrls.add(imgUrl);
                imageUrls.push({ url: imgUrl, productId: product.id });
              }
            }
          }
        } catch {
          // تجاهل أخطاء التحليل
        }
      }
    }

    console.log(`[TauriSync] 📊 عدد الصور للمزامنة: ${imageUrls.length}`);

    // معالجة الصور على دفعات
    for (let i = 0; i < imageUrls.length; i += IMAGE_SYNC_CONFIG.batchSize) {
      const batch = imageUrls.slice(i, i + IMAGE_SYNC_CONFIG.batchSize);

      const batchResults = await Promise.all(
        batch.map(async ({ url, productId }) => {
          // التحقق من وجود الصورة مخزنة
          const isCached = await isImageCached(organizationId, url);
          if (isCached) {
            return 'skipped';
          }

          // تحميل الصورة
          const imageData = await urlToBase64(url);
          if (!imageData) {
            return 'failed';
          }

          // التحقق من حجم الصورة
          const sizeKB = imageData.size / 1024;
          if (sizeKB > IMAGE_SYNC_CONFIG.maxImageSizeKB) {
            console.log(`[TauriSync] ⚠️ تجاوز حجم الصورة الحد المسموح: ${sizeKB.toFixed(0)}KB`);
            // يمكن إضافة ضغط الصورة هنا مستقبلاً
          }

          // حفظ الصورة في جدول cached_images
          const saved = await cacheImage(organizationId, {
            url,
            base64: imageData.base64,
            mimeType: imageData.mimeType,
            size: imageData.size,
            entityType: 'product',
            entityId: productId
          });

          // ⚡ أيضاً: تحديث thumbnail_base64 في جدول products ليظهر في POS
          if (saved) {
            try {
              await tauriExecute(
                organizationId,
                `UPDATE products SET thumbnail_base64 = ? WHERE id = ? AND (thumbnail_base64 IS NULL OR thumbnail_base64 = '')`,
                [imageData.base64, productId]
              );
            } catch (updateError) {
              console.warn(`[TauriSync] ⚠️ فشل تحديث thumbnail_base64 للمنتج ${productId}:`, updateError);
            }
          }

          return saved ? 'cached' : 'failed';
        })
      );

      // إحصاء النتائج
      for (const result of batchResults) {
        if (result === 'cached') cached++;
        else if (result === 'skipped') skipped++;
        else failed++;
      }

      // فترة راحة بين الدفعات
      if (i + IMAGE_SYNC_CONFIG.batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[TauriSync] ✅ اكتملت مزامنة الصور: ${cached} جديدة، ${skipped} موجودة، ${failed} فشلت`);

    // ⚡ تحديث thumbnail_base64 للمنتجات التي لديها صور في cached_images ولكن ليس في products
    try {
      await tauriExecute(
        organizationId,
        `UPDATE products 
         SET thumbnail_base64 = (
           SELECT ci.base64_data 
           FROM cached_images ci 
           WHERE ci.entity_id = products.id 
           AND ci.entity_type = 'product' 
           AND ci.organization_id = ?
           LIMIT 1
         )
         WHERE organization_id = ?
         AND (thumbnail_base64 IS NULL OR thumbnail_base64 = '')
         AND EXISTS (
           SELECT 1 FROM cached_images ci 
           WHERE ci.entity_id = products.id 
           AND ci.entity_type = 'product'
         )`,
        [organizationId, organizationId]
      );
      console.log('[TauriSync] ✅ تم تحديث thumbnail_base64 للمنتجات من cached_images');

      // ⚡ مسح الـ cache لإجبار إعادة تحميل المنتجات مع الصور المحدثة
      try {
        const { clearCache } = await import('@/lib/api/products-simple-cache');
        clearCache();
        console.log('[TauriSync] ✅ تم مسح cache المنتجات لتحديث الصور');

        // ⚡ إرسال حدث لتحديث واجهة المستخدم
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('products-images-updated', {
            detail: { organizationId, cached, skipped }
          }));
          console.log('[TauriSync] 📡 تم إرسال حدث products-images-updated');
        }
      } catch (cacheError) {
        console.warn('[TauriSync] ⚠️ فشل مسح cache المنتجات:', cacheError);
      }
    } catch (updateError) {
      console.warn('[TauriSync] ⚠️ فشل تحديث thumbnail_base64 من cached_images:', updateError);
    }

    return { success: true, cached, skipped, failed };

  } catch (error: any) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الصور:', error);
    return {
      success: false,
      cached: 0,
      skipped: 0,
      failed: 0,
      error: error?.message || String(error)
    };
  }
}

/**
 * الحصول على إحصائيات الصور المخزنة
 */
export async function getImageCacheStats(organizationId: string): Promise<{
  totalImages: number;
  totalSizeKB: number;
  productImages: number;
}> {
  try {
    const result = await tauriQuery(
      organizationId,
      `SELECT
        COUNT(*) as total_images,
        SUM(file_size) as total_size,
        SUM(CASE WHEN entity_type = 'product' THEN 1 ELSE 0 END) as product_images
       FROM cached_images
       WHERE organization_id = ?`,
      [organizationId]
    );

    if (result.success && result.data && result.data[0]) {
      return {
        totalImages: result.data[0].total_images || 0,
        totalSizeKB: Math.round((result.data[0].total_size || 0) / 1024),
        productImages: result.data[0].product_images || 0
      };
    }
    return { totalImages: 0, totalSizeKB: 0, productImages: 0 };
  } catch {
    return { totalImages: 0, totalSizeKB: 0, productImages: 0 };
  }
}

/**
 * تنظيف الصور القديمة أو غير المستخدمة
 */
export async function cleanupUnusedImages(organizationId: string): Promise<number> {
  try {
    // حذف الصور التي لم يعد المنتج موجوداً
    const deleteResult = await tauriExecute(
      organizationId,
      `DELETE FROM cached_images
       WHERE organization_id = ?
         AND entity_type = 'product'
         AND entity_id NOT IN (SELECT id FROM products WHERE organization_id = ?)`,
      [organizationId, organizationId]
    );

    const deleted = deleteResult.changes || 0;
    if (deleted > 0) {
      console.log(`[TauriSync] 🧹 تم حذف ${deleted} صورة غير مستخدمة`);
    }
    return deleted;
  } catch (error) {
    console.error('[TauriSync] ❌ فشل تنظيف الصور:', error);
    return 0;
  }
}

/**
 * جلب صورة مع fallback للـ URL الأصلي
 */
export async function getImageWithFallback(
  organizationId: string,
  imageUrl: string
): Promise<string> {
  // محاولة جلب الصورة المخزنة
  const cachedBase64 = await getCachedImage(organizationId, imageUrl);
  if (cachedBase64) {
    return cachedBase64;
  }

  // إذا لم تكن مخزنة، نرجع الرابط الأصلي
  return imageUrl;
}

/**
 * مزامنة الصور في الخلفية (Background Sync)
 * يُستخدم لتحميل الصور بعد انتهاء المزامنة الرئيسية
 */
export async function syncImagesInBackground(organizationId: string): Promise<void> {
  // تأخير قليل قبل البدء لإعطاء الأولوية للبيانات
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('[TauriSync] 🖼️ بدء مزامنة الصور في الخلفية...');

    // مزامنة صور المنتجات
    await syncProductImagesToSQLite(organizationId);

    // تنظيف الصور غير المستخدمة
    await cleanupUnusedImages(organizationId);

    console.log('[TauriSync] ✅ اكتملت مزامنة الصور في الخلفية');
  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في مزامنة الصور في الخلفية:', error);
  }
}

// ============================================
// 🛠️ أدوات التشخيص والإصلاح
// ============================================

/**
 * إحصائيات المزامنة الحالية
 */
export async function getSyncStats(organizationId: string): Promise<{
  products: { local: number; server: number; diff: number };
  customers: { local: number; server: number; diff: number };
  orders: { local: number; server: number; diff: number };
  images: { total: number; cached: number };
  lastSync: Record<string, string | null>;
}> {
  const stats = {
    products: { local: 0, server: 0, diff: 0 },
    customers: { local: 0, server: 0, diff: 0 },
    orders: { local: 0, server: 0, diff: 0 },
    images: { total: 0, cached: 0 },
    lastSync: {} as Record<string, string | null>
  };

  try {
    // عدد المنتجات
    const localProducts = await tauriQuery(organizationId, `SELECT COUNT(*) as c FROM products WHERE organization_id = ?`, [organizationId]);
    const { count: serverProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    stats.products.local = localProducts.data?.[0]?.c || 0;
    stats.products.server = serverProducts || 0;
    stats.products.diff = stats.products.server - stats.products.local;

    // عدد العملاء
    const localCustomers = await tauriQuery(organizationId, `SELECT COUNT(*) as c FROM customers WHERE organization_id = ?`, [organizationId]);
    const { count: serverCustomers } = await supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    stats.customers.local = localCustomers.data?.[0]?.c || 0;
    stats.customers.server = serverCustomers || 0;
    stats.customers.diff = stats.customers.server - stats.customers.local;

    // عدد الطلبات
    const localOrders = await tauriQuery(organizationId, `SELECT COUNT(*) as c FROM pos_orders WHERE organization_id = ?`, [organizationId]);
    const { count: serverOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    stats.orders.local = localOrders.data?.[0]?.c || 0;
    stats.orders.server = serverOrders || 0;
    stats.orders.diff = stats.orders.server - stats.orders.local;

    // إحصائيات الصور
    const imageStats = await getImageCacheStats(organizationId);
    stats.images.total = imageStats.totalImages;
    stats.images.cached = imageStats.productImages;

    // آخر مزامنة
    const entities: SyncEntityType[] = ['products', 'customers', 'orders', 'invoices', 'categories', 'subcategories', 'staff_members'];
    for (const entity of entities) {
      stats.lastSync[entity] = await getLastSyncTimestamp(organizationId, entity);
    }

  } catch (error) {
    console.error('[TauriSync] ❌ خطأ في جلب إحصائيات المزامنة:', error);
  }

  return stats;
}

/**
 * إصلاح المزامنة (يمسح البيانات ويعيد المزامنة)
 */
export async function repairSync(organizationId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[TauriSync] 🔧 بدء إصلاح المزامنة...');

    // 1. مسح بيانات sync_metadata لجميع الكيانات
    await forceFullSyncAll(organizationId);

    // 2. تنفيذ المزامنة الكاملة
    const result = await fullSync(organizationId);

    if (result.success) {
      return {
        success: true,
        message: `تم إصلاح المزامنة: ${result.results.products.count} منتج، ${result.results.customers.count} عميل، ${result.results.orders.count} طلب`
      };
    } else {
      return {
        success: false,
        message: 'فشل إصلاح المزامنة'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || String(error)
    };
  }
}

// تصدير الأدوات للاستخدام من الكونسول
if (typeof window !== 'undefined') {
  (window as any).tauriSync = {
    forceFullSync,
    forceFullSyncAll,
    repairSync,
    getSyncStats,
    fullSync,
    syncProductsToSQLite,
    syncImagesInBackground,
    getImageCacheStats
  };
  console.log('[TauriSync] 🛠️ أدوات التشخيص متاحة: window.tauriSync');
}
