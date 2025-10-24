import { supabase } from '@/lib/supabase';
import { ensureCustomerExists } from '@/lib/fallback_customer';
import { queryClient } from '@/lib/config/queryClient';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderItem, OrderStatus } from '../../types';
import type { POSOrderPayload, POSOrderResultPayload } from '@/types/posOrder';
import { ConnectivityService } from '@/lib/connectivity/ConnectivityService';
import {
  createLocalPOSOrder,
  getLocalPOSOrderItems,
  getPendingPOSOrders,
  getPendingOrderUpdates,
  markLocalPOSOrderAsFailed,
  markLocalPOSOrderAsSynced,
  markLocalPOSOrderAsSyncing,
  markLocalPOSOrderUpdateFailed,
  markLocalPOSOrderUpdateSynced,
  markLocalPOSOrderUpdateInProgress,
  saveRemoteOrders,
  saveRemoteOrderItems
} from '@/api/localPosOrderService';
import type { LocalPOSOrder, LocalPOSOrderItem } from '@/database/localDb';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';

export type POSOrderData = POSOrderPayload;
export type POSOrderResult = POSOrderResultPayload;

// نظام حماية لمنع التحديث المضاعف للمخزون
const processedInventoryUpdates = new Set<string>();

const OFFLINE_SAVE_MESSAGE = 'تم حفظ الطلب في وضع الأوفلاين وسيتم مزامنته عند الاتصال';

// ✅ إصلاح: إزالة التحقق من users - الـ frontend يرسل user.id الصحيح دائماً
// هذه الدالة كانت تسبب استدعاءين إضافيين
const resolveUserId = async (idOrAuthId: string | null | undefined): Promise<string | null> => {
  return idOrAuthId || null;
};

// ✅ إصلاح: إزالة التحقق من pos_staff_sessions - لا حاجة لذلك
// القيد تم حذفه من قاعدة البيانات، والحقل اختياري
// هذه الدالة كانت تسبب استدعاءين إضافيين  
const resolveStaffSessionId = async (
  candidateId: string | null | undefined,
  usersId: string | null
): Promise<string | null> => {
  return candidateId || usersId || null;
};

const isDeviceOnline = (): boolean => {
  // أولوية لخدمة الاتصال الموحدة
  try {
    return ConnectivityService.isOnline();
  } catch {
    // تجاهل ونستخدم fallback القديم
  }

  if (!isAppOnline()) return false;

  if (typeof window !== 'undefined' && (window as any).electronAPI?.isOnline) {
    try {
      return Boolean((window as any).electronAPI.isOnline());
    } catch {
      // fall back to navigator value
    }
  }

  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.onLine === 'boolean') return navigator.onLine;
  return true;
};

const shouldFallbackToOffline = (error: unknown): boolean => {
  if (!isDeviceOnline()) {
    return true;
  }

  if (!error) {
    return false;
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();

  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network error') ||
    normalized.includes('offline') ||
    normalized.includes('timeout') ||
    normalized.includes('net::') ||
    normalized.includes('fetch') ||
    normalized.includes('could not') ||
    normalized.includes('connection')
  );
};

let offlineSyncInitialized = false;
let offlineSyncInProgress = false;

const submitPOSOrderOnline = async (orderData: POSOrderData): Promise<POSOrderResult> => {
  const startTime = performance.now();

  // تأكيد وجود العميل (إنشاء زائر عند الحاجة)
  const customerId = await ensureCustomerExists(orderData.customerId, orderData.organizationId);

  const itemsPayload = (orderData.items || []).map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    price: item.unitPrice,
    total: item.totalPrice,
    is_wholesale: item.isWholesale ?? false,
    original_price: item.originalPrice ?? item.unitPrice,
    color_id: item.variant_info?.colorId ?? null,
    size_id: item.variant_info?.sizeId ?? null,
    color_name: item.variant_info?.colorName ?? null,
    size_name: item.variant_info?.sizeName ?? null,
    variant_display_name: item.productName ?? item.name ?? 'منتج',
    variant_info: item.variant_info ?? null
  }));

  // ضمان تطابق معرفي الموظف والمنشئ مع users.id لمنع أخطاء FK
  const resolvedEmployeeId = await resolveUserId(orderData.employeeId || null);
  const resolvedCreatedByStaffId = await resolveStaffSessionId(orderData.createdByStaffId || null, resolvedEmployeeId);

  // 🔍 تشخيص: طباعة البيانات المرسلة
  const createdByStaffIdFinal = resolvedCreatedByStaffId || null;

  console.log('🔍 [createPOSOrder] البيانات المرسلة:', {
    createdByStaffId: createdByStaffIdFinal,
    createdByStaffName: orderData.createdByStaffName,
    employeeId: resolvedEmployeeId
  });

  // ✅ تحديث حالة الاتصال قبل الإرسال
  markNetworkOnline();

  const { data, error } = await supabase.rpc('create_pos_order_fast' as any, {
    p_organization_id: orderData.organizationId,
    p_employee_id: resolvedEmployeeId || null,
    p_created_by_staff_id: createdByStaffIdFinal,
    p_created_by_staff_name: orderData.createdByStaffName || null,
    p_items: JSON.stringify(itemsPayload),
    p_total_amount:
      orderData.total ??
      (orderData.subtotal ?? 0) +
        ((orderData as any).tax ?? 0) -
        (orderData.discount ?? 0),
    p_customer_id: customerId,
    p_payment_method: orderData.paymentMethod ?? 'cash',
    p_payment_status: orderData.paymentStatus ?? null,
    p_notes: orderData.notes ?? '',
    p_amount_paid: orderData.amountPaid ?? null,
    p_discount: orderData.discount ?? 0,
    p_subtotal: orderData.subtotal ?? null,
    p_consider_remaining_as_partial:
      orderData.considerRemainingAsPartial ?? false,
    p_tax: (orderData as any).tax ?? 0
  });

  if (error) {
    throw new Error(`Failed to create POS order: ${error.message}`);
  }

  const res = Array.isArray(data) ? data[0] : data;
  if (!res || res.success === false) {
    throw new Error(res?.error || res?.message || 'Failed to create POS order');
  }

  const endTime = performance.now();
  const fifoResults = res.fifo_results ?? [];
  const totalFifoCost = Array.isArray(fifoResults)
    ? fifoResults.reduce(
        (sum: number, r: any) => sum + (parseFloat(r?.fifo_cost ?? '0') || 0),
        0
      )
    : 0;

  try {
    if (orderData.organizationId) {
      await queryClient.invalidateQueries({
        queryKey: ['pos-orders', orderData.organizationId]
      });
      await queryClient.invalidateQueries({
        queryKey: ['pos-orders-stats', orderData.organizationId]
      });
      await queryClient.invalidateQueries({
        queryKey: ['products', orderData.organizationId]
      });
    }
  } catch {
    // تجاهل أخطاء تحديث الكاش لضمان استمرار العملية
  }

  return {
    success: true,
    orderId: res.id,
    slug: res.slug,
    customerOrderNumber: res.customer_order_number,
    status: res.status,
    paymentStatus: res.payment_status,
    total: parseFloat(String(res.total ?? 0)),
    processingTime: endTime - startTime,
    databaseProcessingTime: 0,
    fifoResults,
    totalFifoCost,
    message: res.message || 'تم إنشاء الطلب بنجاح'
  };
};

const buildOfflineItemPayloads = (items: OrderItem[]) =>
  items.map((item) => ({
    productId: item.productId,
    productName: item.productName ?? item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    isDigital: item.isDigital,
    slug: item.slug,
    name: item.name,
    isWholesale: item.isWholesale,
    originalPrice: item.originalPrice,
    colorId: item.variant_info?.colorId,
    colorName: item.variant_info?.colorName,
    sizeId: item.variant_info?.sizeId,
    sizeName: item.variant_info?.sizeName,
    variant_info: item.variant_info ?? null
  }));

const handleOfflineOrder = async (orderData: POSOrderData): Promise<POSOrderResult> => {
  const offlineOrder = await createLocalPOSOrder(
    {
      ...orderData,
      metadata: orderData.metadata
    },
    buildOfflineItemPayloads(orderData.items)
  );

  ensureOfflineSyncInitialized();
  try {
    if (orderData.organizationId) {
      await queryClient.invalidateQueries({ queryKey: ['pos-orders', orderData.organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-stats', orderData.organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['pos-order-stats', orderData.organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['pos-order-stats'] });
      // تحديث صفحة الطلبيات المحسنة
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-page-data', orderData.organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-page-data'] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['pos-order-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['pos-orders-page-data'] });
    }
  } catch {
    // تجاهل أخطاء التحديث لضمان استمرار العملية
  }

  return {
    success: true,
    orderId: offlineOrder.id,
    slug: `offline-${offlineOrder.local_order_number}`,
    customerOrderNumber: offlineOrder.local_order_number,
    status: offlineOrder.status,
    paymentStatus: offlineOrder.payment_status,
    total: offlineOrder.total,
    processingTime: 0,
    databaseProcessingTime: 0,
    fifoResults: [],
    totalFifoCost: 0,
    message: offlineOrder.message ?? OFFLINE_SAVE_MESSAGE,
    isOffline: true,
    syncStatus: offlineOrder.syncStatus ?? 'pending',
    localOrderNumber: offlineOrder.local_order_number,
    metadata: offlineOrder.metadata
  };
};

const reconstructOrderPayload = (order: LocalPOSOrder, items: LocalPOSOrderItem[]): POSOrderData => {
  const convertedItems: OrderItem[] = items.map((item) => ({
    id: uuidv4(),
    productId: item.product_id,
    productName: item.product_name ?? 'منتج',
    name: item.product_name ?? 'منتج',
    slug: `product-${item.product_id}`,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    isDigital: false,
    isWholesale: item.is_wholesale,
    originalPrice: item.original_price,
    variant_info: item.variant_info ?? undefined
  }));

  const payload: POSOrderData = {
    organizationId: order.organization_id,
    employeeId: order.employee_id ?? '',
    createdByStaffId: order.extra_fields?.created_by_staff_id ?? (order as any).created_by_staff_id ?? null,
    createdByStaffName: order.extra_fields?.created_by_staff_name ?? (order as any).created_by_staff_name ?? null,
    items: order.payload?.items ?? convertedItems,
    total: order.total,
    customerId: order.customer_id ?? null,
    customerName: order.customer_name ?? undefined,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    notes: order.notes ?? '',
    amountPaid: order.amount_paid,
    discount: order.discount,
    subtotal: order.subtotal,
    remainingAmount: order.remaining_amount,
    considerRemainingAsPartial: order.consider_remaining_as_partial ?? false,
    metadata: order.metadata
  };

  if (!payload.items || payload.items.length === 0) {
    payload.items = convertedItems;
  }

  if (!payload.employeeId) {
    payload.employeeId = order.employee_id ?? '';
  }

  return payload;
};

// ✅ Singleton Pattern قوي لمنع الاستدعاءات المتزامنة والمكررة
let lastSyncTime = 0;
let syncPromise: Promise<{ synced: number; failed: number }> | null = null;
const SYNC_DEBOUNCE_MS = 5000; // ✅ 5 ثواني لمنع الاستدعاءات المكررة بشكل أقوى

export async function syncPendingPOSOrders(): Promise<{ synced: number; failed: number }> {
  // التحقق من الاتصال - مع fallback لـ navigator.onLine
  const isOnline = isDeviceOnline() || (typeof navigator !== 'undefined' && navigator.onLine);
  
  if (!isOnline) {
    console.log('[syncPendingPOSOrders] لا يوجد اتصال - تخطي المزامنة');
    return { synced: 0, failed: 0 };
  }

  // ✅ إذا كانت هناك مزامنة قيد التنفيذ، نعيد نفس الـ Promise
  if (syncPromise) {
    console.log('[syncPendingPOSOrders] ⏳ مزامنة قيد التنفيذ - انتظار النتيجة');
    return syncPromise;
  }

  // ✅ منع الاستدعاءات المتكررة خلال فترة قصيرة (debounce)
  const now = Date.now();
  if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
    console.log('[syncPendingPOSOrders] ⏭️ تم تجاهل الاستدعاء المكرر (debounce - آخر مزامنة منذ ' + Math.round((now - lastSyncTime) / 1000) + ' ثانية)');
    return { synced: 0, failed: 0 };
  }

  if (offlineSyncInProgress) {
    console.log('[syncPendingPOSOrders] المزامنة قيد التقدم بالفعل');
    return { synced: 0, failed: 0 };
  }

  // ✅ إنشاء Promise جديد وحفظه
  syncPromise = (async () => {
    offlineSyncInProgress = true;
    lastSyncTime = now;
    console.log('[syncPendingPOSOrders] 🚀 بدء المزامنة...');

  try {
    const pendingOrders = await getPendingPOSOrders();
    console.log(`[syncPendingPOSOrders] عدد الطلبيات المعلقة: ${pendingOrders.length}`);

    const orgIds = new Set<string>();
    let synced = 0;
    let failed = 0;

    for (const order of pendingOrders) {
      console.log(`[syncPendingPOSOrders] مزامنة طلبية: ${order.id}`);
      try {
        await markLocalPOSOrderAsSyncing(order.id);

        const items = await getLocalPOSOrderItems(order.id);
        const payload = reconstructOrderPayload(order, items);

        const result = await submitPOSOrderOnline(payload);

        await markLocalPOSOrderAsSynced(order.id, result.orderId, result.customerOrderNumber);
        orgIds.add(order.organization_id);
        synced += 1;
        console.log(`[syncPendingPOSOrders] ✅ نجحت مزامنة طلبية: ${order.id}`);
      } catch (error) {
        console.error(`[syncPendingPOSOrders] ❌ فشلت مزامنة طلبية: ${order.id}`, error);
        await markLocalPOSOrderAsFailed(
          order.id,
          error instanceof Error ? error.message : 'offline_sync_failed'
        );
        failed += 1;
      }
    }
    
    console.log(`[syncPendingPOSOrders] النتيجة: ${synced} نجحت، ${failed} فشلت`);

    for (const organizationId of orgIds) {
      try {
        await queryClient.invalidateQueries({ queryKey: ['pos-orders', organizationId] });
        await queryClient.invalidateQueries({ queryKey: ['pos-orders-stats', organizationId] });
        await queryClient.invalidateQueries({ queryKey: ['products', organizationId] });
      } catch {
        // تجاهل أخطاء تحديث الكاش
      }
    }

    const updateResult = await syncPendingPOSOrderUpdatesInternal();

    updateResult.orgIds.forEach((organizationId) => {
      try {
        queryClient.invalidateQueries({ queryKey: ['pos-orders', organizationId] });
        queryClient.invalidateQueries({ queryKey: ['pos-orders-stats', organizationId] });
      } catch {
        // تجاهل أخطاء تحديث الكاش
      }
    });

    return {
      synced: synced + updateResult.synced,
      failed: failed + updateResult.failed
    };
  } finally {
    offlineSyncInProgress = false;
    syncPromise = null; // ✅ تنظيف الـ Promise بعد الانتهاء
  }
  })();

  return syncPromise;
}

const syncPendingPOSOrderUpdatesInternal = async (): Promise<{ synced: number; failed: number; orgIds: Set<string> }> => {
  if (!isDeviceOnline()) {
    return { synced: 0, failed: 0, orgIds: new Set() };
  }

  const pendingUpdates = await getPendingOrderUpdates();

  if (pendingUpdates.length === 0) {
    return { synced: 0, failed: 0, orgIds: new Set() };
  }

  let synced = 0;
  let failed = 0;
  const orgIds = new Set<string>();

  for (const update of pendingUpdates) {
    try {
      await markLocalPOSOrderUpdateInProgress(update.id);

      const changes = update.pending_updates || {};
      if (Object.keys(changes).length === 0) {
        await markLocalPOSOrderUpdateSynced(update.id);
        continue;
      }

      const remoteOrderId = update.remote_order_id || update.id;

      const { error } = await supabase
        .from('orders')
        .update({
          ...changes,
          updated_at: new Date().toISOString()
        })
        .eq('id', remoteOrderId);

      if (error) {
        throw new Error(error.message);
      }

      await markLocalPOSOrderUpdateSynced(update.id, changes);
      orgIds.add(update.organization_id);
      synced += 1;
    } catch (error) {
      // Server Win: تبنّي بيانات السيرفر عند فشل التحديث
      try {
        const { data: remoteOrder, error: fetchOrderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', update.remote_order_id || update.id)
          .maybeSingle();

        if (!fetchOrderErr && remoteOrder) {
          // حفظ الطلب والعناصر عن السيرفر محلياً
          await saveRemoteOrders([remoteOrder]);
          try {
            const { data: remoteItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', remoteOrder.id);
            await saveRemoteOrderItems(remoteOrder.id, remoteItems || []);
          } catch {
            // تجاهل فشل جلب العناصر
          }

          // وسم التحديث المحلي كمنتهي مع توضيح سبب القرار
          await markLocalPOSOrderUpdateSynced(update.id, {
            extra_fields: {
              ...(update.extra_fields || {}),
              _sync_resolution: 'server_win'
            }
          } as any);
          orgIds.add(update.organization_id);
          synced += 1;
          continue;
        }
      } catch {
        // تجاهل ونعود للفشل الافتراضي
      }

      await markLocalPOSOrderUpdateFailed(
        update.id,
        error instanceof Error ? error.message : 'offline_update_failed'
      );
      failed += 1;
    }
  }

  return { synced, failed, orgIds };
};

export async function syncPendingPOSOrderUpdates(): Promise<{ synced: number; failed: number }> {
  const result = await syncPendingPOSOrderUpdatesInternal();
  return { synced: result.synced, failed: result.failed };
}

const ensureOfflineSyncInitialized = () => {
  if (offlineSyncInitialized || typeof window === 'undefined') {
    return;
  }

  const triggerSync = () => {
    void syncPendingPOSOrders().catch(() => undefined);
  };

  window.addEventListener('online', triggerSync);
  window.addEventListener('focus', triggerSync);

  offlineSyncInitialized = true;

  if (isDeviceOnline()) {
    triggerSync();
  }
};

export const initializePOSOfflineSync = () => {
  ensureOfflineSyncInitialized();
};

const ensureOfflineReady = async (orderData: POSOrderData): Promise<POSOrderResult> => {
  if (!isDeviceOnline()) {
    markNetworkOffline({ force: true });
    return handleOfflineOrder(orderData);
  }

  try {
    const result = await submitPOSOrderOnline(orderData);
    ensureOfflineSyncInitialized();
    void syncPendingPOSOrders().catch(() => undefined);
    return result;
  } catch (error) {
    if (shouldFallbackToOffline(error)) {
      markNetworkOffline({ force: true });
      return handleOfflineOrder(orderData);
    }

    throw error;
  }
};

// دالة محسنة لإنشاء طلبية نقطة البيع - بواجهة جديدة
export async function createPOSOrder(orderData: POSOrderData): Promise<POSOrderResult> {
  if (!orderData.organizationId) {
    throw new Error('Organization ID is required but was not provided');
  }

  return ensureOfflineReady(orderData);
}

// الدالة القديمة للتوافق مع الكود الموجود
export const createPOSOrderLegacy = async (
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, 
  currentOrganizationId: string | undefined
): Promise<Order> => {
  try {
    
    // التحقق من وجود organization_id
    if (!currentOrganizationId) {
      throw new Error('Organization ID is required but was not provided');
    }
    
    // التحقق من وجود العميل وإنشائه إذا لم يكن موجودًا
    const customerId = await ensureCustomerExists(order.customerId, currentOrganizationId);
    
    // توليد slug فريد للطلبية (بأحرف صغيرة لتوافق القيد)
    const orderSlug = `pos-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
    
    // تحضير metadata مع معلومات حساب الاشتراك
    const metadata: any = {};
    if (order.subscriptionAccountInfo) {
      metadata.subscriptionAccountInfo = order.subscriptionAccountInfo;
    }

    // التحقق من صحة employee_id قبل إنشاء الطلب
    let validEmployeeId = null;
    if (order.employeeId && order.employeeId !== "") {
      try {
        // البحث أولاً بـ id ثم بـ auth_user_id
        let { data: employeeExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', order.employeeId)
          .single();
        
        if (employeeExists) {
          validEmployeeId = order.employeeId;
        } else {
          // إذا لم يوجد، البحث بـ auth_user_id
          const { data: employeeByAuthId } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', order.employeeId)
            .single();
          
          if (employeeByAuthId) {
            validEmployeeId = employeeByAuthId.id;
          } else {
          }
        }
      } catch (error) {
      }
    }

    // تحضير بيانات الطلبية
    const orderData = {
      customer_id: customerId,
      organization_id: currentOrganizationId,
      slug: orderSlug,
      status: order.status || 'completed',
      payment_status: order.paymentStatus || 'paid',
      payment_method: order.paymentMethod || 'cash',
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      notes: order.notes || '',
      is_online: false,
      employee_id: validEmployeeId, // استخدام معرف الموظف المتحقق منه أو null
      // حقول إضافية لنقطة البيع
      pos_order_type: 'pos',
      amount_paid: order.partialPayment?.amountPaid || order.total || 0,
      remaining_amount: order.partialPayment?.remainingAmount || 0,
      consider_remaining_as_partial: order.considerRemainingAsPartial || false,
      completed_at: order.status === 'completed' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // إضافة معلومات حساب الاشتراك في metadata
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    };

    // إنشاء الطلب مباشرة
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (orderError) {
      throw new Error(`Error creating order: ${orderError.message}`);
    }
    
    const newOrderId = insertedOrder.id;

    // إضافة عناصر الطلب بشكل منفصل وآمن
    if (order.items && order.items.length > 0) {
      try {
        
        // إدراج العناصر واحد تلو الآخر بالحقول الأساسية فقط
        for (let index = 0; index < order.items.length; index++) {
          const item = order.items[index];
          
          // توليد ID للعنصر إذا لم يكن موجوداً
          const itemId = item.id || uuidv4();
          
          const itemData = {
            id: itemId, // إضافة ID المطلوب
            order_id: newOrderId,
            product_id: item.productId,
            product_name: item.productName || item.name || 'منتج',
            name: item.productName || item.name || 'منتج',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
            is_digital: item.isDigital || false,
            organization_id: currentOrganizationId,
            slug: item.slug || `item-${Date.now()}-${index}`,
            // إضافة الحقول الاختيارية إذا كانت موجودة
            color_id: item.variant_info?.colorId || null,
            size_id: item.variant_info?.sizeId || null,
            variant_info: item.variant_info ? JSON.stringify(item.variant_info) : null,
            is_wholesale: item.isWholesale || false,
            original_price: item.originalPrice || item.unitPrice
          };

          const { error: itemError } = await supabase
            .from('order_items')
            .insert(itemData);

          if (itemError) {
            // رمي الخطأ لإيقاف العملية
            throw new Error(`فشل في إدراج العنصر: ${item.productName} - ${itemError.message}`);
          } else {
          }
        }

        // تحديث المخزون - مع logs للتتبع وتطبيق FIFO
        await updateInventoryForOrder(order.items, newOrderId, currentOrganizationId);
      } catch (error) {
        // حذف الطلبية إذا فشل إدراج العناصر
        await supabase.from('orders').delete().eq('id', newOrderId);
        throw new Error(`فشل في إنشاء عناصر الطلبية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }
    
    // إضافة حجوزات الخدمات
    if (order.services && order.services.length > 0) {
      await addServiceBookings(order.services, newOrderId, customerId, order.employeeId, currentOrganizationId);
    }
    
    // إضافة معاملة مالية
    try {
      await addOrderTransaction(newOrderId, order, currentOrganizationId);
    } catch (error) {
    }
    
    // =================================================================
    // 🚀 CACHE INVALIDATION
    // =================================================================
    try {
      if (currentOrganizationId) {
        // Invalidate orders, products, and dashboard data
        await queryClient.invalidateQueries({ queryKey: ['pos-orders', currentOrganizationId] });
        await queryClient.invalidateQueries({ queryKey: ['pos-orders-stats', currentOrganizationId] });
        await queryClient.invalidateQueries({ queryKey: ['products', currentOrganizationId] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentOrganizationId] });
      }
    } catch (cacheError) {
    }
    
    // إعادة الطلب المضاف مع البيانات الكاملة
    return {
      ...order,
      id: newOrderId,
      customer_order_number: insertedOrder.customer_order_number,
      createdAt: new Date(insertedOrder.created_at),
      updatedAt: new Date(insertedOrder.updated_at),
      slug: insertedOrder.slug
    };
  } catch (error) {
    throw error;
  }
};

// دالة لتحديث المخزون مع نظام FIFO - مع حماية من التحديث المضاعف
async function updateInventoryForOrder(items: OrderItem[], orderId?: string, organizationId?: string) {
  const updateId = `${Date.now()}-${Math.random()}`;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemUpdateKey = `${item.productId}-${item.quantity}-${Date.now()}`;

    try {
      // حماية من التحديث المضاعف
      if (processedInventoryUpdates.has(itemUpdateKey)) {
        continue;
      }
      
      processedInventoryUpdates.add(itemUpdateKey);
      const variantInfo = item.variant_info ? 
        ` - ${item.variant_info.colorName || 'بدون لون'}${item.variant_info.sizeName ? ` (${item.variant_info.sizeName})` : ''}` : '';
      
      // جلب الكمية الحالية قبل التحديث للمراقبة
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock_quantity, organization_id')
        .eq('id', item.productId)
        .single();
      
      const stockBefore = currentProduct?.stock_quantity || 0;
      const productOrgId = organizationId || currentProduct?.organization_id;

      // استخدام الدالة المحسنة مع دعم المتغيرات والـ FIFO
      try {
        
        const { data: fifoResult, error } = await supabase.rpc('process_pos_sale_with_variants_fifo' as any, {
          p_product_id: item.productId,
          p_quantity: item.quantity,
          p_organization_id: productOrgId,
          p_color_id: item.variant_info?.colorId || null,
          p_size_id: item.variant_info?.sizeId || null,
          p_order_id: orderId || null,
          p_unit_price: item.unitPrice
        }) as { data: any, error: any };

        if (error) {
          
          // العودة للطريقة القديمة كبديل
          const { error: fallbackError } = await supabase.rpc('update_product_stock_safe', {
            p_product_id: item.productId,
            p_quantity_sold: item.quantity
          });
          
          if (fallbackError) {
          } else {
          }
          
          processedInventoryUpdates.delete(itemUpdateKey);
        } else if (fifoResult && (fifoResult as any).success) {
          const result = fifoResult as any;

          // تنظيف Set بعد 30 ثانية لمنع تراكم البيانات
          setTimeout(() => {
            processedInventoryUpdates.delete(itemUpdateKey);
          }, 30000);
        } else {
          processedInventoryUpdates.delete(itemUpdateKey);
        }
      } catch (fifoError) {
        
        // العودة للطريقة القديمة
        const { error: fallbackError } = await supabase.rpc('update_product_stock_safe', {
          p_product_id: item.productId,
          p_quantity_sold: item.quantity
        });
        
        if (fallbackError) {
        } else {
        }
        
        processedInventoryUpdates.delete(itemUpdateKey);
      }
      
      // جلب المخزون بعد التحديث للتحقق
      const { data: updatedProduct } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.productId)
        .single();
      
      const stockAfter = updatedProduct?.stock_quantity || 0;

    } catch (error) {
      processedInventoryUpdates.delete(itemUpdateKey);
    }
  }

}

// دالة لإضافة حجوزات الخدمات
async function addServiceBookings(
  services: any[], 
  orderId: string, 
  defaultCustomerId: string, 
  employeeId: string | undefined,
  organizationId: string | undefined
) {
  for (const service of services) {
    try {
      const serviceBookingData = {
        id: service.id || uuidv4(),
        order_id: orderId,
        service_id: service.serviceId,
        service_name: service.serviceName,
        price: service.price,
        scheduled_date: service.scheduledDate,
        notes: service.notes || "",
        customer_name: service.customer_name || "زائر",
        customer_id: service.customerId || defaultCustomerId || null,
        assigned_to: service.assignedTo || employeeId || null,
        status: service.status || 'pending',
        public_tracking_code: service.public_tracking_code || `SRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        slug: `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        organization_id: organizationId,
        created_at: new Date().toISOString()
      };

      const { error: serviceBookingError } = await supabase
        .from('service_bookings')
        .insert(serviceBookingData);
        
      if (serviceBookingError) {
      }
    } catch (error) {
    }
  }
}

// دالة لإضافة معاملة مالية لـ POSOrderData
async function addOrderTransactionForPOS(
  orderId: string, 
  orderData: POSOrderData,
  organizationId: string | undefined
) {
  try {
    // التحقق من وجود organization_id
    if (!organizationId) {
      throw new Error('Organization ID is required for transaction but was not provided');
    }
    
    // التحقق من صحة employee_id قبل إنشاء المعاملة
    let validEmployeeId = null;
    if (orderData.employeeId && orderData.employeeId !== "") {
      try {
        // البحث أولاً بـ id ثم بـ auth_user_id
        let { data: employeeExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', orderData.employeeId)
          .single();
        
        if (employeeExists) {
          validEmployeeId = orderData.employeeId;
        } else {
          // إذا لم يوجد، البحث بـ auth_user_id
          const { data: employeeByAuthId } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', orderData.employeeId)
            .single();
          
          if (employeeByAuthId) {
            validEmployeeId = employeeByAuthId.id;
          }
        }
      } catch (error) {
        // تجاهل الخطأ واستخدام null
      }
    }
    
    // التأكد من وجود جميع الحقول المطلوبة فقط
    const transactionData = {
      order_id: orderId,
      amount: orderData.paymentStatus === 'paid' ? orderData.total : (orderData.amountPaid || 0),
      type: 'sale',
      payment_method: orderData.paymentMethod || 'cash',
      description: orderData.paymentStatus === 'paid' 
        ? `Payment for POS order` 
        : `Partial payment for POS order`,
      employee_id: validEmployeeId, // استخدام معرف الموظف المتحقق منه أو null
      organization_id: organizationId
    };

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
}

// دالة لإضافة معاملة مالية
async function addOrderTransaction(
  orderId: string, 
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  organizationId: string | undefined
) {
  try {
    
    // التحقق من وجود organization_id
    if (!organizationId) {
      throw new Error('Organization ID is required for transaction but was not provided');
    }
    
    // التحقق من صحة employee_id قبل إنشاء المعاملة
    let validEmployeeId = null;
    if (order.employeeId && order.employeeId !== "") {
      try {
        // البحث أولاً بـ id ثم بـ auth_user_id
        let { data: employeeExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', order.employeeId)
          .single();
        
        if (employeeExists) {
          validEmployeeId = order.employeeId;
        } else {
          // إذا لم يوجد، البحث بـ auth_user_id
          const { data: employeeByAuthId } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', order.employeeId)
            .single();
          
          if (employeeByAuthId) {
            validEmployeeId = employeeByAuthId.id;
          }
        }
      } catch (error) {
        // تجاهل الخطأ واستخدام null
      }
    }
    
    // التأكد من وجود جميع الحقول المطلوبة فقط
    const transactionData = {
      order_id: orderId,
      amount: order.paymentStatus === 'paid' ? order.total : (order.partialPayment?.amountPaid || 0),
      type: 'sale',
      payment_method: order.paymentMethod || 'cash',
      description: order.paymentStatus === 'paid' 
        ? `Payment for POS order` 
        : `Partial payment for POS order`,
      employee_id: validEmployeeId, // استخدام معرف الموظف المتحقق منه أو null
      organization_id: organizationId
    };

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
}
