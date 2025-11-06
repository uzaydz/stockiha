import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, syncQueueStore, type LocalPOSOrder, type LocalPOSOrderItem, type SyncQueueItem } from '@/database/localDb';
import type { POSOrderPayload } from '@/types/posOrder';
import { updateProductStock } from './offlineProductService';
import { UnifiedQueue } from '@/sync/UnifiedQueue';

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

interface OfflinePOSOrderQueuePayload {
  order: LocalPOSOrder;
  items: LocalPOSOrderItem[];
}

const LOCAL_COUNTER_KEY = 'pos_offline_order_counter';

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

const queueOrderSync = async (payload: OfflinePOSOrderQueuePayload): Promise<void> => {
  // توحيد صفوف المزامنة عبر UnifiedQueue
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: payload.order.id,
    operation: 'create',
    data: payload,
    priority: 1
  });
};

export const createLocalPOSOrder = async (
  orderData: OfflinePOSOrderPayload,
  items: OfflinePOSOrderItemPayload[]
): Promise<LocalPOSOrder> => {
  const now = new Date().toISOString();
  const orderId = uuidv4();
  const localNumber = getNextLocalOrderNumber();

  const orderRecord: LocalPOSOrder = {
    id: orderId,
    order_number: String(localNumber),
    organization_id: orderData.organizationId,
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

  await inventoryDB.posOrders.put(orderRecord);

  const itemRecords: LocalPOSOrderItem[] = [];

  for (const item of items) {
    const itemRecord: LocalPOSOrderItem = {
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
      created_at: now
    };

    itemRecords.push(itemRecord);
    await inventoryDB.posOrderItems.put(itemRecord);
  }

  await queueOrderSync({
    order: orderRecord,
    items: itemRecords
  });

  // تحديث المخزون المحلي حسب العناصر
  for (const item of items) {
    try {
      const variantColorId =
        item.colorId ??
        (item.variant_info && typeof item.variant_info === 'object'
          ? (item.variant_info as Record<string, unknown>)?.colorId
          : null);
      const variantSizeId =
        item.sizeId ??
        (item.variant_info && typeof item.variant_info === 'object'
          ? (item.variant_info as Record<string, unknown>)?.sizeId
          : null);

      await updateProductStock(
        orderData.organizationId,
        item.productId,
        Math.abs(item.quantity),
        true,
        {
          colorId: (variantColorId as string | null | undefined) ?? null,
          sizeId: (variantSizeId as string | null | undefined) ?? null
        }
      );
    } catch {
      // تجاهل أخطاء تحديث المخزون المحلي لضمان عدم إيقاف إنشاء الطلب
    }
  }

  return orderRecord;
};

export const getPendingPOSOrders = async (): Promise<LocalPOSOrder[]> => {
  try {
    // استخدام filter بدلاً من equals للـ boolean لتجنب مشاكل IDBKeyRange
    const byStatus = await inventoryDB.posOrders
      .where('status')
      .anyOf(['pending_sync', 'syncing', 'failed'])
      .toArray();
    
    // استخدام toArray مع filter بدلاً من indexed query على boolean
    // لأن indexed queries على boolean fields يمكن أن تفشل إذا كانت هناك قيم null/undefined
    const allOrders = await inventoryDB.posOrders.toArray();
    const isFalse = (v: any) => v === false || v === 0 || v === '0' || v == null;
    const bySynced = allOrders.filter((order: any) => isFalse(order.synced));

    // دمج النتائج مع إزالة التكرار حسب id
    const map = new Map<string, LocalPOSOrder>();
    for (const o of byStatus) map.set(o.id, o);
    for (const o of bySynced) map.set(o.id, o);
    const pendingOrders = Array.from(map.values());

    console.log('[getPendingPOSOrders] via-index', {
      byStatus: byStatus.length,
      bySynced: bySynced.length,
      merged: pendingOrders.length
    });

    return pendingOrders;
  } catch (error) {
    console.error('[getPendingPOSOrders] خطأ:', error);
    // في حال فشل، استخدم فلترة كاملة كحل احتياطي
    const allOrders = await inventoryDB.posOrders.toArray();
    const isFalse = (v: any) => v === false || v === 0 || v === '0' || v == null;
    return allOrders.filter((order: any) => 
      order.status === 'pending_sync' || 
      order.status === 'failed' ||
      order.status === 'syncing' ||
      isFalse(order.synced)
    );
  }
};

export const markLocalPOSOrderAsSyncing = async (orderId: string): Promise<void> => {
  await inventoryDB.posOrders.update(orderId, {
    status: 'syncing',
    syncStatus: 'syncing',
    lastSyncAttempt: new Date().toISOString()
  });
};

export const markLocalPOSOrderAsSynced = async (
  orderId: string,
  remoteOrderId: string,
  remoteCustomerNumber: number
): Promise<void> => {
  const now = new Date().toISOString();

  await inventoryDB.transaction('rw', inventoryDB.posOrders, inventoryDB.posOrderItems, async () => {
    await inventoryDB.posOrders.update(orderId, {
      status: 'synced',
      syncStatus: 'synced',
      synced: true,
      pendingOperation: undefined,
      updated_at: now,
      lastSyncAttempt: now,
      error: undefined,
      remote_order_id: remoteOrderId,
      remote_customer_order_number: remoteCustomerNumber
    });

    await inventoryDB.posOrderItems
      .where('order_id')
      .equals(orderId)
      .modify({ synced: true });
  });

  await removeOrderFromSyncQueue(orderId);
};

export const markLocalPOSOrderAsFailed = async (orderId: string, error: string): Promise<void> => {
  await inventoryDB.posOrders.update(orderId, {
    status: 'failed',
    syncStatus: 'failed',
    lastSyncAttempt: new Date().toISOString(),
    error
  });
};

export const getLocalPOSOrderItems = async (orderId: string): Promise<LocalPOSOrderItem[]> => {
  return await inventoryDB.posOrderItems
    .where('order_id')
    .equals(orderId)
    .toArray();
};

export const removeOrderFromSyncQueue = async (orderId: string): Promise<void> => {
  const keys: string[] = [];

  await syncQueueStore.iterate<SyncQueueItem, void>((item, key) => {
    if (item.objectId === orderId && item.objectType === 'order') {
      keys.push(key);
    }
  });

  for (const key of keys) {
    try {
      await syncQueueStore.removeItem(key);
    } catch {
      // تجاهل أخطاء الحذف الفردية لضمان متابعة التنظيف لباقي العناصر
    }
  }

  // حذف أيضاً من جدول Dexie الموحد
  try {
    const items = await inventoryDB.syncQueue
      .where('objectId' as any)
      .equals(orderId as any)
      .toArray();
    for (const it of items) {
      if (it.objectType === 'order') {
        await inventoryDB.syncQueue.delete(it.id);
      }
    }
  } catch {
    // تجاهل
  }
};

const mapRemoteOrderToLocal = (order: any): LocalPOSOrder => {
  const createdAt = order.created_at || new Date().toISOString();
  const updatedAt = order.updated_at || createdAt;

  // Compute robust order_number to satisfy NOT NULL in SQLite
  const computedOrderNumber =
    order.order_number ||
    order.orderNumber ||
    (order.customer_order_number != null ? String(order.customer_order_number) : null) ||
    (order.local_order_number != null ? String(order.local_order_number) : null) ||
    (order.local_order_number_str ? String(order.local_order_number_str) : null) ||
    (order.remote_customer_order_number != null ? String(order.remote_customer_order_number) : null) ||
    (order.slug ? String(order.slug) : null) ||
    (order.id ? String(order.id) : null) ||
    new Date().toISOString().replace(/\D/g, '').slice(-12);

  return {
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
      product_items_count: order.product_items_count,
      subscription_items_count: order.subscription_items_count,
      effective_status: order.effective_status,
      effective_total: order.effective_total,
      original_total: order.original_total,
      has_returns: order.has_returns,
      is_fully_returned: order.is_fully_returned,
      total_returned_amount: order.total_returned_amount
    }
  };
};

export const saveRemoteOrders = async (orders: any[]): Promise<void> => {
  if (!orders?.length) return;

  await inventoryDB.transaction('rw', inventoryDB.posOrders, async () => {
    for (const order of orders) {
      const existing = await inventoryDB.posOrders.get(order.id);
      if (existing && existing.pendingOperation && existing.pendingOperation !== 'create') {
        continue;
      }
      await inventoryDB.posOrders.put(mapRemoteOrderToLocal(order));
    }
  });
};

export const saveRemoteOrderItems = async (orderId: string, items: any[]): Promise<void> => {
  if (!orderId) return;
  await inventoryDB.transaction('rw', inventoryDB.posOrderItems, async () => {
    await inventoryDB.posOrderItems.where('order_id').equals(orderId).delete();

    for (const item of items) {
      await inventoryDB.posOrderItems.put({
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
        created_at: new Date().toISOString()
      });
    }
  });
};

export const getOrdersByOrganization = async (
  organizationId: string,
  page: number,
  limit: number
): Promise<{ orders: LocalPOSOrder[]; total: number }> => {
  if (!organizationId) {
    return { orders: [], total: 0 };
  }

  const allOrders = await inventoryDB.posOrders.where('organization_id').equals(organizationId).toArray();
  const sorted = allOrders.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const total = sorted.length;
  const start = Math.max(0, (page - 1) * limit);
  const end = start + limit;
  const orders = sorted.slice(start, end);

  return { orders, total };
};

export const queueOrderUpdate = async (orderId: string, updates: Record<string, any>): Promise<void> => {
  if (!orderId || !updates) return;

  const current = await inventoryDB.posOrders.get(orderId);
  if (!current) return;

  const mergedUpdates = { ...(current.pending_updates || {}), ...updates };

  let mergedExtraFields = current.extra_fields || null;
  if (updates.extra_fields) {
    mergedExtraFields = {
      ...(current.extra_fields || {}),
      ...updates.extra_fields
    };
  }

  const nextOrder: LocalPOSOrder = {
    ...current,
    ...updates,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: current.pendingOperation === 'create' ? 'create' : 'update',
    pending_updates: mergedUpdates,
    extra_fields: mergedExtraFields,
    updated_at: new Date().toISOString()
  };

  await inventoryDB.posOrders.put(nextOrder);
};

export const queueOrderDeletion = async (orderId: string): Promise<void> => {
  if (!orderId) return;
  const current = await inventoryDB.posOrders.get(orderId);
  if (!current) return;

  const nextOrder: LocalPOSOrder = {
    ...current,
    pendingOperation: 'delete',
    synced: false,
    syncStatus: 'pending',
    updated_at: new Date().toISOString()
  };

  await inventoryDB.posOrders.put(nextOrder);
};

export const getPendingOrderUpdates = async (): Promise<LocalPOSOrder[]> => {
  return inventoryDB.posOrders
    .where('pendingOperation')
    .equals('update')
    .toArray();
};

export const getPendingOrderDeletions = async (): Promise<LocalPOSOrder[]> => {
  return inventoryDB.posOrders
    .where('pendingOperation')
    .equals('delete')
    .toArray();
};

export const markLocalPOSOrderUpdateSynced = async (orderId: string, updates?: Record<string, any>): Promise<void> => {
  const current = await inventoryDB.posOrders.get(orderId);
  if (!current) return;

  let mergedExtraFields = current.extra_fields || null;
  if (updates?.extra_fields) {
    mergedExtraFields = {
      ...(current.extra_fields || {}),
      ...updates.extra_fields
    };
  }

  const nextOrder: LocalPOSOrder = {
    ...current,
    ...(updates || {}),
    synced: true,
    syncStatus: 'synced',
    pendingOperation: undefined,
    pending_updates: null,
    extra_fields: mergedExtraFields,
    updated_at: new Date().toISOString()
  };

  await inventoryDB.posOrders.put(nextOrder);
};

export const markLocalPOSOrderUpdateFailed = async (orderId: string, error: string): Promise<void> => {
  const current = await inventoryDB.posOrders.get(orderId);
  if (!current) return;

  await inventoryDB.posOrders.put({
    ...current,
    syncStatus: 'failed',
    error,
    lastSyncAttempt: new Date().toISOString()
  });
};

export const markLocalPOSOrderUpdateInProgress = async (orderId: string): Promise<void> => {
  const current = await inventoryDB.posOrders.get(orderId);
  if (!current) return;

  await inventoryDB.posOrders.put({
    ...current,
    syncStatus: 'syncing',
    lastSyncAttempt: new Date().toISOString()
  });
};

export const findLocalOrderByRemoteId = async (remoteOrderId: string): Promise<LocalPOSOrder | null> => {
  if (!remoteOrderId) return null;
  try {
    const found = await inventoryDB.posOrders
      .where('remote_order_id' as any)
      .equals(remoteOrderId as any)
      .first();
    if (found) return found as any;
  } catch {
    // تجاهل ونستخدم طريقة احتياطية
  }
  // كحل احتياطي، ابحث عبر فلترة كاملة
  const allOrders = await inventoryDB.posOrders.toArray();
  return allOrders.find((order) => order.remote_order_id === remoteOrderId) || null;
};

// ==================== بحث وتصفح محلي مفهرس ====================

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

  try {
    // مسار SQLite: تجنب سلاسل Dexie (reverse/and/offset/limit) واستخدم معالجة يدوية
    if ((inventoryDB as any).isSQLite && (inventoryDB as any).isSQLite()) {
      let items = await inventoryDB.posOrders
        .where('organization_id')
        .equals(organizationId)
        .toArray();

      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        items = items.filter((o: any) => statuses.includes(o.status as any));
      }
      if (payment_status) {
        const pstats = Array.isArray(payment_status) ? payment_status : [payment_status];
        items = items.filter((o: any) => pstats.includes(o.payment_status as any));
      }

      items.sort((a: any, b: any) => {
        const ta = new Date(a.created_at || a.updated_at || 0).getTime();
        const tb = new Date(b.created_at || b.updated_at || 0).getTime();
        return createdSort === 'desc' ? tb - ta : ta - tb;
      });

      const total = items.length;
      const page = items.slice(offset, offset + limit);
      return { orders: page as any, total };
    }

    // مسار IndexedDB (Dexie)
    let coll = inventoryDB.posOrders
      .where('[organization_id+created_at]' as any)
      .between([organizationId, ''], [organizationId, '\uffff']);

    if (createdSort === 'desc') coll = (coll as any).reverse();
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      coll = (coll as any).and((o: any) => statuses.includes(o.status as any));
    }
    if (payment_status) {
      const pstats = Array.isArray(payment_status) ? payment_status : [payment_status];
      coll = (coll as any).and((o: any) => pstats.includes(o.payment_status as any));
    }

    const total = await (coll as any).count();
    const page = await (coll as any).offset(offset).limit(limit).toArray();
    return { orders: page as any, total };
  } catch (error) {
    // احتياطي: فلترة كاملة
    let items = await inventoryDB.posOrders
      .where('organization_id')
      .equals(organizationId)
      .toArray();
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      items = items.filter((o: any) => statuses.includes(o.status as any));
    }
    if (payment_status) {
      const pstats = Array.isArray(payment_status) ? payment_status : [payment_status];
      items = items.filter((o: any) => pstats.includes(o.payment_status as any));
    }
    items.sort((a: any, b: any) => {
      const ta = new Date(a.created_at || a.updated_at || 0).getTime();
      const tb = new Date(b.created_at || b.updated_at || 0).getTime();
      return createdSort === 'desc' ? tb - ta : ta - tb;
    });
    const total = items.length;
    const page = items.slice(offset, offset + limit);
    return { orders: page as any, total };
  }
}

export async function fastSearchLocalPOSOrders(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalPOSOrder[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;
  const statuses = options.status ? (Array.isArray(options.status) ? options.status : [options.status]) : null;

  const results = new Map<string, LocalPOSOrder>();

  // بحث بالاسم
  const nameMatches = await inventoryDB.posOrders
    .where('[organization_id+customer_name_lower]')
    .between([organizationId, q], [organizationId, q + '\uffff'])
    .limit(limit)
    .toArray();
  nameMatches.forEach((o: any) => {
    if (!statuses || statuses.includes(o.status)) results.set(o.id, o);
  });

  // بحث بالأرقام: رقم الطلب المحلي/العميل عن طريق مطابقة جزئية
  if (results.size < limit) {
    const digits = q.replace(/\D+/g, '');
    if (digits) {
      const more = await inventoryDB.posOrders
        .where('organization_id')
        .equals(organizationId)
        .filter((o: any) => {
          const localStr = o.local_order_number_str || String(o.local_order_number || '');
          const remoteStr = String(o.remote_customer_order_number || '');
          return localStr.startsWith(digits) || remoteStr.startsWith(digits);
        })
        .limit(limit - results.size)
        .toArray();
      more.forEach((o: any) => {
        if (!statuses || statuses.includes(o.status)) results.set(o.id, o);
      });
    }
  }

  return Array.from(results.values()).slice(0, limit);
}

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
  // إجمالي الطلبات (مفهرس على organization_id)
  const total_orders = await inventoryDB.posOrders
    .where('organization_id')
    .equals(organizationId)
    .count();

  // حساب عدد الطلبات لكل حالة باستخدام الفهرس المركب [organization_id+status+created_at]
  const countByStatus = async (status: string): Promise<number> => {
    try {
      // نطاق يبدأ من organizationId + status ويغطي كل created_at
      const coll = inventoryDB.posOrders
        .where('[organization_id+status+created_at]' as any)
        .between([organizationId, status, ''], [organizationId, status, '\uffff']);
      return await coll.count();
    } catch {
      // احتياطي: فلترة حسب المؤسسة ثم الحالة
      return await inventoryDB.posOrders
        .where('organization_id')
        .equals(organizationId)
        .filter((o: any) => o.status === status)
        .count();
    }
  };

  const completed_orders = (await countByStatus('completed')) + (await countByStatus('synced'));
  const pending_orders = (await countByStatus('pending')) + (await countByStatus('pending_sync'));
  const cancelled_orders = await countByStatus('cancelled');

  // عدد الطلبات ذات حالة دفع معلّقة: استخدام الفهرس المركب [organization_id+payment_status]
  let pending_payment_orders = 0;
  try {
    pending_payment_orders = await (inventoryDB.posOrders
      .where('[organization_id+payment_status]' as any)
      .equals([organizationId, 'pending'] as any)
      .count());
  } catch {
    pending_payment_orders = await inventoryDB.posOrders
      .where('organization_id')
      .equals(organizationId)
      .filter((o: any) => o.payment_status === 'pending')
      .count();
  }

  // عدد الطلبات حسب طريقة الدفع: فلترة احتياطية لعدم وجود فهرس مركب
  let cash_orders = 0;
  let card_orders = 0;
  try {
    cash_orders = await (inventoryDB.posOrders
      .where('[organization_id+payment_method]' as any)
      .equals([organizationId, 'cash'] as any)
      .count());
    card_orders = await (inventoryDB.posOrders
      .where('[organization_id+payment_method]' as any)
      .equals([organizationId, 'card'] as any)
      .count());
  } catch {
    cash_orders = await inventoryDB.posOrders
      .where('organization_id')
      .equals(organizationId)
      .filter((o: any) => o.payment_method === 'cash')
      .count();
    card_orders = await inventoryDB.posOrders
      .where('organization_id')
      .equals(organizationId)
      .filter((o: any) => o.payment_method === 'card')
      .count();
  }

  // إجمالي الإيرادات بدون تحميل كل الصفوف في الذاكرة
  let total_revenue = 0;
  await inventoryDB.posOrders
    .where('organization_id')
    .equals(organizationId)
    .each((o: any) => { total_revenue += Number(o.total || 0); });

  return {
    total_orders,
    total_revenue,
    completed_orders,
    pending_orders,
    pending_payment_orders,
    cancelled_orders,
    cash_orders,
    card_orders
  };
}
