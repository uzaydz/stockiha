/**
 * ⚡ POS Order Service - نظام Delta Sync الموحد
 *
 * تم إعادة كتابة هذا الملف لاستخدام Delta Sync فقط
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - Event-Driven: المزامنة تحدث تلقائياً عبر BatchSender
 *
 * ❌ تم حذف النظام القديم (Legacy RPC):
 * - syncPendingPOSOrders
 * - submitPOSOrderOnline (RPC)
 * - createPOSOrderLegacy
 */

import { queryClient } from '@/lib/config/queryClient';
import type { POSOrderPayload, POSOrderResultPayload } from '@/types/posOrder';
import {
  createLocalPOSOrder,
  type LocalPOSOrder
} from '@/api/localPosOrderService';
import { isAppOnline } from '@/utils/networkStatus';

// ⚡ Re-exports للتوافق مع الكود القائم
export type POSOrderData = POSOrderPayload;
export type POSOrderResult = POSOrderResultPayload;

const OFFLINE_SAVE_MESSAGE = 'تم حفظ الطلب وسيتم مزامنته تلقائياً';

/**
 * التحقق من حالة الشبكة
 */
const isDeviceOnline = (): boolean => {
  if (!isAppOnline()) return false;
  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.onLine === 'boolean') return navigator.onLine;
  return true;
};

/**
 * بناء payload العناصر من بيانات الطلب
 */
const buildItemPayloads = (items: POSOrderData['items']) =>
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

/**
 * ⚡ إنشاء طلبية POS - نظام Delta Sync الموحد
 *
 * التدفق:
 * 1. يتم حفظ الطلب محلياً فوراً (Local-First)
 * 2. يتم إضافته إلى Outbox
 * 3. BatchSender يرسله تلقائياً عند توفر الاتصال
 */
export async function createPOSOrder(orderData: POSOrderData): Promise<POSOrderResult> {
  if (!orderData.organizationId) {
    throw new Error('Organization ID is required');
  }

  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  console.log('[createPOSOrder] ⚡ Delta Sync - إنشاء طلب محلي...', {
    org: orderData.organizationId.slice(0, 8),
    items: orderData.items.length,
    total: orderData.total,
    isOnline: isDeviceOnline()
  });

  try {
    // ⚡ إنشاء الطلب محلياً عبر Delta Sync
    const offlineOrder = await createLocalPOSOrder(
      {
        ...orderData,
        metadata: orderData.metadata
      },
      buildItemPayloads(orderData.items)
    );

    // تحديث الكاش
    try {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('pos-order') || key === 'pos-orders' || key === 'products';
        }
      });
    } catch {
      // تجاهل أخطاء الكاش
    }

    return {
      success: true,
      orderId: offlineOrder.id,
      slug: `pos-${offlineOrder.local_order_number}`,
      customerOrderNumber: offlineOrder.local_order_number,
      status: offlineOrder.status,
      paymentStatus: offlineOrder.payment_status,
      total: offlineOrder.total,
      processingTime: 0,
      databaseProcessingTime: 0,
      fifoResults: [],
      totalFifoCost: 0,
      message: OFFLINE_SAVE_MESSAGE,
      isOffline: !isDeviceOnline(),
      syncStatus: 'pending',
      localOrderNumber: offlineOrder.local_order_number,
      metadata: offlineOrder.metadata
    };

  } catch (error) {
    console.error('[createPOSOrder] ❌ فشل إنشاء الطلب:', error);
    throw error;
  }
}

/**
 * ⚡ تهيئة نظام المزامنة
 *
 * ملاحظة: في نظام Delta Sync، المزامنة تحدث تلقائياً عبر:
 * - BatchSender (كل 5 ثواني)
 * - RealtimeReceiver (فوري من السيرفر)
 * - عند استعادة الاتصال
 */
export const initializePOSOfflineSync = () => {
  console.log('[POS] ⚡ Delta Sync mode - المزامنة تلقائية');
};

// ⚡ Deprecated: هذه الدوال لم تعد مستخدمة
// المزامنة تحدث تلقائياً عبر BatchSender
export async function syncPendingPOSOrders(): Promise<{ synced: number; failed: number }> {
  console.log('[syncPendingPOSOrders] ⚡ Deprecated - المزامنة تلقائية عبر Delta Sync');
  return { synced: 0, failed: 0 };
}

export async function syncPendingPOSOrderUpdates(): Promise<{ synced: number; failed: number }> {
  console.log('[syncPendingPOSOrderUpdates] ⚡ Deprecated - المزامنة تلقائية عبر Delta Sync');
  return { synced: 0, failed: 0 };
}
