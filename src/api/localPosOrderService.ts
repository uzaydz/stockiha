/**
 * localPosOrderService - خدمة طلبيات نقطة البيع المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - DELTA operations: لتحديث المخزون عند البيع
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';
import type { POSOrderPayload } from '@/types/posOrder';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { createLocalCustomerDebt } from './localCustomerDebtService';
import { sqliteWriteQueue } from '@/lib/sync/delta/SQLiteWriteQueue';

// Re-export types
export type { LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';

export interface OfflinePOSOrderPayload extends POSOrderPayload {
  metadata?: Record<string, unknown>;
}

interface OfflinePOSOrderItemPayload {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDigital?: boolean;
  slug?: string;
  name?: string;
  isWholesale?: boolean;
  originalPrice?: number;
  colorId?: string | null;
  colorName?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  variant_info?: Record<string, unknown>;
}

const LOCAL_COUNTER_KEY = 'pos_offline_order_counter';

// الحصول على معرف المؤسسة الحالية
const getCurrentOrganizationId = (): string => {
  return localStorage.getItem('bazaar_organization_id') || localStorage.getItem('currentOrganizationId') || '';
};

const getNextLocalOrderNumber = (): number => {
  if (typeof window === 'undefined') {
    return Number(new Date().getTime().toString().slice(-6));
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_COUNTER_KEY);
    const current = Number.parseInt(raw || '1000', 10);
    const next = Number.isFinite(current) ? current + 1 : 1001;
    window.localStorage.setItem(LOCAL_COUNTER_KEY, String(next));
    return next;
  } catch {
    return Number(new Date().getTime().toString().slice(-6));
  }
};

/**
 * إنشاء طلبية POS جديدة محلياً
 */
export const createLocalPOSOrder = async (
  orderData: OfflinePOSOrderPayload,
  items: OfflinePOSOrderItemPayload[]
): Promise<LocalPOSOrder> => {
  const now = new Date().toISOString();
  const orderId = uuidv4();
  const localNumber = getNextLocalOrderNumber();
  const orgId = orderData.organizationId || getCurrentOrganizationId();

  const orderRecord: LocalPOSOrder = {
    id: orderId,
    order_number: String(localNumber),
    organization_id: orgId,
    employee_id: orderData.employeeId ?? null,
    customer_id: orderData.customerId ?? null,
    customer_name: orderData.customerName ?? null,
    customer_name_lower: (orderData.customerName || '').toLowerCase() || null,
    subtotal: orderData.subtotal ?? orderData.total ?? 0,
    total: orderData.total ?? 0,
    discount: orderData.discount ?? 0,
    amount_paid: orderData.amountPaid ?? orderData.total ?? 0,
    payment_method: orderData.paymentMethod ?? 'cash',
    payment_status: orderData.paymentStatus ?? 'pending',
    notes: orderData.notes ?? '',
    remaining_amount: orderData.remainingAmount ?? 0,
    consider_remaining_as_partial: orderData.considerRemainingAsPartial ?? false,
    status: 'pending_sync',
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create',
    created_at: now,
    created_at_ts: Date.parse(now),
    updated_at: now,
    localCreatedAt: now,
    serverCreatedAt: undefined,
    local_order_number: localNumber,
    local_order_number_str: String(localNumber),
    payload: {
      ...orderData,
      metadata: orderData.metadata
    },
    metadata: orderData.metadata,
    message: 'تم حفظ الطلب في وضع الأوفلاين وسيتم مزامنته عند الاتصال',
    pending_updates: null,
    extra_fields: {
      items_count: items.length,
      sale_type: orderData.metadata?.subscriptionAccountInfo ? 'subscription' : 'product',
      created_by_staff_id: (orderData as any).createdByStaffId ?? null,
      created_by_staff_name: (orderData as any).createdByStaffName ?? null
    }
  };

  const itemRecords: LocalPOSOrderItem[] = items.map((item, index) => ({
    id: uuidv4(),
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName ?? item.name ?? 'منتج',
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    subtotal: item.totalPrice,
    discount: 0,
    is_wholesale: item.isWholesale ?? false,
    original_price: item.originalPrice ?? item.unitPrice,
    color_id: item.colorId ?? null,
    color_name: item.colorName ?? null,
    size_id: item.sizeId ?? null,
    size_name: item.sizeName ?? null,
    variant_info: item.variant_info ?? null,
    synced: false,
    created_at: now,
    slug: item.slug || `item-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`
  }));

  // ⚡ استخدام Delta Sync مع تحديث المخزون
  const result = await deltaWriteService.createOrderWithItems(
    orgId,
    orderRecord,
    itemRecords
  );

  if (!result.success) {
    throw new Error(`Failed to create POS order: ${result.error}`);
  }

  console.log(`[LocalPOSOrder] ⚡ Created order ${orderId} with ${itemRecords.length} items via Delta Sync`);

  // ✅ إنشاء دين تلقائياً إذا كان هناك مبلغ متبقي
  if (orderRecord.remaining_amount > 0 && orderRecord.customer_id) {
    try {
      console.log('[createLocalPOSOrder] 💰 Creating customer debt:', {
        orderId,
        customerId: orderRecord.customer_id,
        remainingAmount: orderRecord.remaining_amount
      });

      await createLocalCustomerDebt({
        customer_id: orderRecord.customer_id,
        customer_name: orderRecord.customer_name || 'عميل',
        order_id: orderId,
        order_number: orderRecord.order_number,
        subtotal: orderRecord.subtotal,
        discount: orderRecord.discount || 0,
        total_amount: orderRecord.total,
        paid_amount: orderRecord.amount_paid,
        remaining_amount: orderRecord.remaining_amount,
        amount: orderRecord.remaining_amount,
        status: orderRecord.payment_status === 'paid' ? 'paid' :
          orderRecord.payment_status === 'partial' ? 'partial' : 'pending',
        due_date: null,
        notes: orderRecord.notes || null,
        organization_id: orderRecord.organization_id
      });

      console.log('[createLocalPOSOrder] ✅ Customer debt created successfully');
    } catch (error) {
      console.error('[createLocalPOSOrder] ❌ Failed to create customer debt:', error);
      // لا نوقف إنشاء الطلب إذا فشل إنشاء الدين
    }
  }

  return orderRecord;
};

/**
 * الحصول على الطلبيات المعلقة للمزامنة
 */
export const getPendingPOSOrders = async (): Promise<LocalPOSOrder[]> => {
  const orgId = getCurrentOrganizationId();

  return deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId, {
    where: "(synced = 0 OR status IN ('pending_sync', 'syncing', 'failed'))"
  });
};

/**
 * تحديث حالة طلبية لـ syncing
 */
export const markLocalPOSOrderAsSyncing = async (orderId: string): Promise<void> => {
  await deltaWriteService.update('pos_orders', orderId, {
    status: 'syncing',
    syncStatus: 'syncing',
    lastSyncAttempt: new Date().toISOString()
  });
};

/**
 * تحديث طلبية كمتزامنة بنجاح
 */
export const markLocalPOSOrderAsSynced = async (
  orderId: string,
  remoteOrderId: string,
  remoteCustomerNumber: number
): Promise<void> => {
  const now = new Date().toISOString();

  console.log('[markLocalPOSOrderAsSynced] 🔄 تحديث الطلبية:', orderId);

  // ⚡ تحديث الطلبية - محلياً فقط (لا نضيف للـ Outbox)
  await deltaWriteService.updateLocalOnly('pos_orders', orderId, {
    status: 'synced',
    syncStatus: 'synced',
    synced: 1, // ⚡ استخدام 1 بدلاً من true لـ SQLite
    pendingOperation: null,
    lastSyncAttempt: now,
    error: null,
    remote_order_id: remoteOrderId,
    remote_customer_order_number: remoteCustomerNumber
  });

  // ⚡ تحديث عناصر الطلبية - محلياً فقط
  const orgId = getCurrentOrganizationId();
  const items = await deltaWriteService.getAll<LocalPOSOrderItem>('pos_order_items', orgId, {
    where: 'order_id = ?',
    params: [orderId]
  });

  for (const item of items) {
    await deltaWriteService.updateLocalOnly('pos_order_items', item.id, { synced: 1 });
  }

  console.log('[markLocalPOSOrderAsSynced] ✅ اكتملت المزامنة بنجاح:', orderId);
};

/**
 * تحديث طلبية كفاشلة
 */
export const markLocalPOSOrderAsFailed = async (orderId: string, error: string): Promise<void> => {
  await deltaWriteService.update('pos_orders', orderId, {
    status: 'failed',
    syncStatus: 'failed',
    lastSyncAttempt: new Date().toISOString(),
    error
  });
};

/**
 * الحصول على عناصر طلبية
 */
export const getLocalPOSOrderItems = async (orderId: string): Promise<LocalPOSOrderItem[]> => {
  const orgId = getCurrentOrganizationId();

  return deltaWriteService.getAll<LocalPOSOrderItem>('pos_order_items', orgId, {
    where: 'order_id = ?',
    params: [orderId]
  });
};

/**
 * حذف طلبية من قائمة المزامنة (للتوافق)
 */
export const removeOrderFromSyncQueue = async (orderId: string): Promise<void> => {
  console.log('[removeOrderFromSyncQueue] ✅ Delta Sync handles this automatically:', orderId);
  // Delta Sync يتعامل مع هذا تلقائياً
};

/**
 * حفظ طلبيات من السيرفر
 */
export const saveRemoteOrders = async (orders: any[]): Promise<void> => {
  if (!orders?.length) return;

  const now = new Date().toISOString();

  for (const order of orders) {
    const createdAt = order.created_at || now;
    const updatedAt = order.updated_at || createdAt;

    const computedOrderNumber =
      order.order_number ||
      order.orderNumber ||
      (order.customer_order_number != null ? String(order.customer_order_number) : null) ||
      (order.local_order_number != null ? String(order.local_order_number) : null) ||
      (order.id ? String(order.id) : null) ||
      new Date().toISOString().replace(/\D/g, '').slice(-12);

    const mappedOrder: LocalPOSOrder = {
      id: order.id,
      organization_id: order.organization_id,
      employee_id: order.employee_id ?? null,
      customer_id: order.customer_id ?? null,
      customer_name: order.customer_name ?? order.customer?.name ?? null,
      customer_name_lower: (order.customer_name ?? order.customer?.name ?? '')?.toString().toLowerCase() || null,
      order_number: computedOrderNumber,
      subtotal: Number(order.subtotal ?? order.original_total ?? order.total ?? 0),
      total: Number(order.effective_total ?? order.total ?? 0),
      discount: Number(order.discount ?? 0),
      amount_paid: Number(order.amount_paid ?? order.total ?? 0),
      payment_method: order.payment_method ?? 'cash',
      payment_status: order.payment_status ?? 'pending',
      notes: order.notes ?? '',
      remaining_amount: Number(order.remaining_amount ?? 0),
      consider_remaining_as_partial: Boolean(order.consider_remaining_as_partial ?? false),
      status: order.status ?? 'completed',
      synced: true,
      syncStatus: 'synced',
      pendingOperation: undefined,
      created_at: createdAt,
      created_at_ts: Date.parse(createdAt),
      updated_at: updatedAt,
      localCreatedAt: createdAt,
      serverCreatedAt: createdAt,
      local_order_number: Number(order.customer_order_number ?? order.local_order_number ?? 0),
      local_order_number_str: String(order.customer_order_number ?? order.local_order_number ?? ''),
      remote_order_id: order.id,
      remote_customer_order_number: order.customer_order_number ?? null,
      metadata: order.metadata ?? {},
      message: undefined,
      payload: undefined,
      pending_updates: null,
      extra_fields: {
        items_count: order.items_count ?? 0,
        sale_type: order.sale_type,
        effective_total: order.effective_total,
        original_total: order.original_total,
        has_returns: order.has_returns,
        is_fully_returned: order.is_fully_returned,
        total_returned_amount: order.total_returned_amount
      }
    };

    await deltaWriteService.saveFromServer('pos_orders', mappedOrder);
  }

  console.log(`[LocalPOSOrder] ⚡ Saved ${orders.length} remote orders`);
};

/**
 * حفظ عناصر طلبية من السيرفر
 */
export const saveRemoteOrderItems = async (orderId: string, items: any[]): Promise<void> => {
  if (!orderId || !items?.length) return;

  const now = new Date().toISOString();

  for (const item of items) {
    const mappedItem: LocalPOSOrderItem = {
      id: item.id ?? uuidv4(),
      order_id: orderId,
      product_id: item.product_id ?? item.id ?? '',
      product_name: item.product_name ?? item.name ?? 'منتج',
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? item.price ?? 0),
      total_price: Number(item.total_price ?? item.total ?? 0),
      subtotal: Number(
        item.subtotal ??
        (item.total_price ?? item.total ?? ((item.quantity ?? 0) * (item.unit_price ?? item.price ?? 0)))
      ),
      discount: Number(item.discount ?? 0),
      is_wholesale: Boolean(item.is_wholesale ?? false),
      original_price: Number(item.original_price ?? item.unit_price ?? 0),
      color_id: item.color_id ?? null,
      color_name: item.color_name ?? null,
      size_id: item.size_id ?? null,
      size_name: item.size_name ?? null,
      variant_info: item.variant_info ?? null,
      synced: true,
      created_at: item.created_at || now
    };

    await deltaWriteService.saveFromServer('pos_order_items', mappedItem);
  }

  console.log(`[LocalPOSOrder] ⚡ Saved ${items.length} remote order items`);
};

/**
 * الحصول على طلبيات حسب المؤسسة مع pagination
 */
export const getOrdersByOrganization = async (
  organizationId: string,
  page: number,
  limit: number
): Promise<{ orders: LocalPOSOrder[]; total: number }> => {
  if (!organizationId) {
    return { orders: [], total: 0 };
  }

  const offset = Math.max(0, (page - 1) * limit);

  const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', organizationId, {
    orderBy: 'updated_at DESC',
    limit,
    offset
  });

  const total = await deltaWriteService.count('pos_orders', organizationId);

  return { orders, total };
};

/**
 * تحديث طلبية محلية
 */
export const queueOrderUpdate = async (orderId: string, updates: Record<string, any>): Promise<void> => {
  if (!orderId || !updates) return;

  const current = await deltaWriteService.get<LocalPOSOrder>('pos_orders', orderId);
  if (!current) return;

  const mergedUpdates = { ...(current.pending_updates || {}), ...updates };

  let mergedExtraFields = current.extra_fields || null;
  if (updates.extra_fields) {
    mergedExtraFields = {
      ...(current.extra_fields || {}),
      ...updates.extra_fields
    };
  }

  await deltaWriteService.update('pos_orders', orderId, {
    ...updates,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: current.pendingOperation === 'create' ? 'create' : 'update',
    pending_updates: mergedUpdates,
    extra_fields: mergedExtraFields,
    updated_at: new Date().toISOString()
  });
};

/**
 * وضع طلبية للحذف
 */
export const queueOrderDeletion = async (orderId: string): Promise<void> => {
  if (!orderId) return;

  const current = await deltaWriteService.get<LocalPOSOrder>('pos_orders', orderId);
  if (!current) return;

  await deltaWriteService.update('pos_orders', orderId, {
    pendingOperation: 'delete',
    synced: false,
    syncStatus: 'pending',
    updated_at: new Date().toISOString()
  });
};

/**
 * الحصول على طلبيات معلقة للتحديث
 */
export const getPendingOrderUpdates = async (): Promise<LocalPOSOrder[]> => {
  const orgId = getCurrentOrganizationId();

  return deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId, {
    where: "pending_operation = 'update'"
  });
};

/**
 * الحصول على طلبيات معلقة للحذف
 */
export const getPendingOrderDeletions = async (): Promise<LocalPOSOrder[]> => {
  const orgId = getCurrentOrganizationId();

  return deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId, {
    where: "pending_operation = 'delete'"
  });
};

/**
 * تحديث طلبية بعد مزامنة التحديث
 */
export const markLocalPOSOrderUpdateSynced = async (orderId: string, updates?: Record<string, any>): Promise<void> => {
  const current = await deltaWriteService.get<LocalPOSOrder>('pos_orders', orderId);
  if (!current) return;

  let mergedExtraFields = current.extra_fields || null;
  if (updates?.extra_fields) {
    mergedExtraFields = {
      ...(current.extra_fields || {}),
      ...updates.extra_fields
    };
  }

  await deltaWriteService.update('pos_orders', orderId, {
    ...(updates || {}),
    synced: true,
    syncStatus: 'synced',
    pendingOperation: undefined,
    pending_updates: null,
    extra_fields: mergedExtraFields,
    updated_at: new Date().toISOString()
  });
};

/**
 * تحديث طلبية بعد فشل التحديث
 */
export const markLocalPOSOrderUpdateFailed = async (orderId: string, error: string): Promise<void> => {
  await deltaWriteService.update('pos_orders', orderId, {
    syncStatus: 'failed',
    error,
    lastSyncAttempt: new Date().toISOString()
  });
};

/**
 * تحديث طلبية لحالة syncing
 */
export const markLocalPOSOrderUpdateInProgress = async (orderId: string): Promise<void> => {
  await deltaWriteService.update('pos_orders', orderId, {
    syncStatus: 'syncing',
    lastSyncAttempt: new Date().toISOString()
  });
};

/**
 * البحث عن طلبية محلية بمعرّف السيرفر
 */
export const findLocalOrderByRemoteId = async (remoteOrderId: string): Promise<LocalPOSOrder | null> => {
  if (!remoteOrderId) return null;
  const orgId = getCurrentOrganizationId();

  const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId, {
    where: 'remote_order_id = ?',
    params: [remoteOrderId],
    limit: 1
  });

  return orders[0] || null;
};

// ==================== بحث وتصفح محلي للطلبيات ====================

export interface POSOrdersPageOptions {
  offset?: number;
  limit?: number;
  status?: string | string[];
  payment_status?: string | string[];
  createdSort?: 'asc' | 'desc';
}

export async function getLocalPOSOrdersPage(
  organizationId: string,
  options: POSOrdersPageOptions = {}
): Promise<{ orders: LocalPOSOrder[]; total: number }> {
  const {
    offset = 0,
    limit = 20,
    status,
    payment_status,
    createdSort = 'desc',
  } = options;

  let whereClause = "organization_id = ?";
  const params: any[] = [organizationId];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    whereClause += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  if (payment_status) {
    const pstats = Array.isArray(payment_status) ? payment_status : [payment_status];
    const placeholders = pstats.map(() => '?').join(',');
    whereClause += ` AND payment_status IN (${placeholders})`;
    params.push(...pstats);
  }

  const orders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', organizationId, {
    where: whereClause,
    params,
    orderBy: `created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}`,
    limit,
    offset
  });

  const total = await deltaWriteService.count('pos_orders', organizationId);

  return { orders, total };
}

export async function fastSearchLocalPOSOrders(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalPOSOrder[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;

  return deltaWriteService.search<LocalPOSOrder>(
    'pos_orders',
    organizationId,
    ['customer_name_lower', 'order_number', 'local_order_number_str'],
    q,
    limit
  );
}

/**
 * ⚡ إحصائيات الطلبيات المحلية - محسّن باستخدام SQL Aggregations
 * تحسين الأداء: من ~3-5 ثانية (10K طلب) إلى ~50ms
 */
export async function getLocalPOSOrderStats(organizationId: string): Promise<{
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
}> {
  const startTime = Date.now();

  // ⚡ استخدام SQL Aggregations لحساب كل الإحصائيات في استعلام واحد
  const sql = `
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      SUM(CASE WHEN status IN ('completed', 'synced') THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN status IN ('pending', 'pending_sync') THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payment_orders,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
      SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_orders,
      SUM(CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END) as card_orders
    FROM pos_orders
    WHERE organization_id = ?
  `;

  try {
    const result = await sqliteWriteQueue.read<any[]>(sql, [organizationId]);
    const stats = result[0] || {};

    const elapsed = Date.now() - startTime;
    if (elapsed > 100) {
      console.log(`[LocalPOSOrderStats] ⚡ إحصائيات ${stats.total_orders || 0} طلب في ${elapsed}ms`);
    }

    return {
      total_orders: Number(stats.total_orders) || 0,
      total_revenue: Number(stats.total_revenue) || 0,
      completed_orders: Number(stats.completed_orders) || 0,
      pending_orders: Number(stats.pending_orders) || 0,
      pending_payment_orders: Number(stats.pending_payment_orders) || 0,
      cancelled_orders: Number(stats.cancelled_orders) || 0,
      cash_orders: Number(stats.cash_orders) || 0,
      card_orders: Number(stats.card_orders) || 0
    };
  } catch (err) {
    // ⚡ Fallback: الطريقة القديمة إذا فشل الاستعلام
    console.warn('[LocalPOSOrderStats] ⚠️ SQL aggregation failed, falling back:', err);
    
    const allOrders = await deltaWriteService.getAll<LocalPOSOrder>('pos_orders', organizationId);

    let total_revenue = 0;
    let completed_orders = 0;
    let pending_orders = 0;
    let pending_payment_orders = 0;
    let cancelled_orders = 0;
    let cash_orders = 0;
    let card_orders = 0;

    for (const order of allOrders) {
      total_revenue += Number(order.total || 0);

      if (order.status === 'completed' || order.status === 'synced') {
        completed_orders++;
      } else if (order.status === 'pending' || order.status === 'pending_sync') {
        pending_orders++;
      } else if (order.status === 'cancelled') {
        cancelled_orders++;
      }

      if (order.payment_status === 'pending') {
        pending_payment_orders++;
      }

      if (order.payment_method === 'cash') {
        cash_orders++;
      } else if (order.payment_method === 'card') {
        card_orders++;
      }
    }

    return {
      total_orders: allOrders.length,
      total_revenue,
      completed_orders,
      pending_orders,
      pending_payment_orders,
      cancelled_orders,
      cash_orders,
      card_orders
    };
  }
}
