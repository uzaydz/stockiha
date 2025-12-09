/**
 * ⚡ POS Order Service - نظام PowerSync الموحد
 *
 * تم إعادة كتابة هذا الملف لاستخدام PowerSync فقط
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - Auto-Sync: المزامنة تحدث تلقائياً عبر PowerSync
 */

import { queryClient } from '@/lib/config/queryClient';
import type { POSOrderPayload, POSOrderResultPayload } from '@/types/posOrder';
import type { OrderItem, Product, Service } from '@/types';
import {
  unifiedOrderService,
  type CreateOrderInput,
  type OrderWithItems
} from '@/services/UnifiedOrderService';
import { isAppOnline } from '@/utils/networkStatus';
import { v4 as uuidv4 } from 'uuid';

// ⚡ Re-exports للتوافق مع الكود القائم
export type POSOrderData = POSOrderPayload;
export type POSOrderResult = POSOrderResultPayload;

const OFFLINE_SAVE_MESSAGE = 'تم حفظ الطلب وسيتم مزامنته تلقائياً';

/**
 * ⚡ واجهة موحدة لعنصر السلة (متوافقة مع جميع أنواع السلة)
 */
export interface UnifiedCartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
  // حقول الجملة
  saleType?: 'retail' | 'wholesale' | 'partial_wholesale';
  isWholesale?: boolean;
  originalPrice?: number;
  variant_info?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantImage?: string;
  };
  // ⚡ حقول البيع المتقدم
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pricePerWeightUnit?: number;
  boxCount?: number;
  unitsPerBox?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
  // ⚡ حقول التتبع
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

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
 * ⚡ بناء عناصر الطلب من السلة - دالة موحدة لجميع أنواع البيع
 * 
 * هذه الدالة توحد منطق بناء عناصر الطلب من:
 * - cartItems (منتجات)
 * - selectedServices (خدمات)
 * - selectedSubscriptions (اشتراكات)
 * 
 * تدعم جميع أنواع البيع:
 * - البيع بالقطعة (piece)
 * - البيع بالوزن (weight)
 * - البيع بالصندوق (box)
 * - البيع بالمتر (meter)
 */
export function buildPOSItemsFromCart(
  cartItems: UnifiedCartItem[],
  selectedServices: (Service & {
    scheduledDate?: Date;
    notes?: string;
    customerId?: string;
    public_tracking_code?: string;
  })[] = [],
  selectedSubscriptions: any[] = []
): OrderItem[] {
  const items: OrderItem[] = [];

  // 1️⃣ معالجة المنتجات من السلة
  for (const item of cartItems) {
    const sellingUnit = item.sellingUnit || 'piece';
    
    // حساب السعر والكمية حسب نوع البيع
    let unitPrice = 0;
    let totalPrice = 0;
    let quantity = item.quantity;

    switch (sellingUnit) {
      case 'weight':
        // البيع بالوزن
        unitPrice = item.pricePerWeightUnit || item.product.price_per_weight_unit || 0;
        totalPrice = (item.weight || 0) * unitPrice;
        quantity = 1; // للوزن: الكمية = 1
        break;

      case 'box':
        // البيع بالصندوق
        unitPrice = item.boxPrice || item.product.box_price || 0;
        totalPrice = (item.boxCount || 0) * unitPrice;
        quantity = item.boxCount || 1;
        break;

      case 'meter':
        // البيع بالمتر
        unitPrice = item.pricePerMeter || item.product.price_per_meter || 0;
        totalPrice = (item.length || 0) * unitPrice;
        quantity = 1; // للمتر: الكمية = 1
        break;

      case 'piece':
      default:
        // البيع بالقطعة (الافتراضي)
        unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;
        totalPrice = unitPrice * item.quantity;
        break;
    }

    // حساب السعر الأصلي للجملة
    const originalProductPrice = item.originalPrice || item.product.price || unitPrice;

    items.push({
      id: uuidv4(),
      productId: item.product.id,
      productName: item.product.name,
      name: item.product.name,
      slug: item.product.slug || `product-${item.product.id}`,
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      isDigital: item.product.isDigital || false,
      colorId: item.colorId || item.variant_info?.colorId || null,
      colorName: item.colorName || item.variant_info?.colorName || null,
      sizeId: item.sizeId || item.variant_info?.sizeId || null,
      sizeName: item.sizeName || item.variant_info?.sizeName || null,
      // حقول الجملة
      isWholesale: item.isWholesale || false,
      originalPrice: originalProductPrice,
      saleType: item.saleType || 'retail',
      variant_info: {
        colorId: item.colorId || item.variant_info?.colorId,
        colorName: item.colorName || item.variant_info?.colorName,
        colorCode: item.colorCode || item.variant_info?.colorCode,
        sizeId: item.sizeId || item.variant_info?.sizeId,
        sizeName: item.sizeName || item.variant_info?.sizeName,
        variantImage: item.variantImage || item.variant_info?.variantImage
      },
      // ⚡ حقول البيع المتقدم
      sellingUnit: sellingUnit,
      weight: sellingUnit === 'weight' ? item.weight : undefined,
      weightUnit: sellingUnit === 'weight' ? (item.weightUnit || item.product.weight_unit) : undefined,
      pricePerWeightUnit: sellingUnit === 'weight' ? unitPrice : undefined,
      boxCount: sellingUnit === 'box' ? item.boxCount : undefined,
      unitsPerBox: sellingUnit === 'box' ? (item.unitsPerBox || item.product.units_per_box) : undefined,
      boxPrice: sellingUnit === 'box' ? unitPrice : undefined,
      length: sellingUnit === 'meter' ? item.length : undefined,
      pricePerMeter: sellingUnit === 'meter' ? unitPrice : undefined,
      // ⚡ حقول التتبع
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      serialNumbers: item.serialNumbers
    } as OrderItem);
  }

  // 2️⃣ معالجة الخدمات
  for (const service of selectedServices) {
    items.push({
      id: uuidv4(),
      productId: service.id,
      productName: service.name || 'خدمة',
      name: service.name || 'خدمة',
      slug: `service-${service.id}`,
      quantity: 1,
      unitPrice: service.price || 0,
      totalPrice: service.price || 0,
      isDigital: false,
      variant_info: {
        service_type: 'repair',
        scheduled_date: service.scheduledDate?.toISOString(),
        notes: service.notes,
        tracking_code: service.public_tracking_code,
        is_service: true
      }
    } as OrderItem);
  }

  // 3️⃣ معالجة الاشتراكات
  for (const subscription of selectedSubscriptions) {
    const price = subscription.final_price || subscription.selling_price || subscription.price || 0;
    items.push({
      id: uuidv4(),
      productId: subscription.id,
      productName: subscription.name || 'اشتراك',
      name: subscription.name || 'اشتراك',
      slug: `subscription-${subscription.id}`,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      isDigital: true,
      variant_info: {
        subscription_type: 'digital',
        duration: subscription.duration,
        features: subscription.features,
        is_subscription: true
      }
    } as OrderItem);
  }

  return items;
}

/**
 * بناء payload العناصر من بيانات الطلب (للاستخدام الداخلي)
 */
const buildItemPayloads = (items: POSOrderData['items']) =>
  items.map((item) => {
    // 🔍 DEBUG: تسجيل البيانات الواردة لتتبع حقول البيع المتقدم
    console.log('[buildItemPayloads] 📦 Input item:', {
      productId: item.productId,
      sellingUnit: (item as any).sellingUnit,
      length: (item as any).length,
      weight: (item as any).weight,
      boxCount: (item as any).boxCount,
      quantity: item.quantity
    });

    const payload = {
      productId: item.productId,
      productName: item.productName ?? item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      isDigital: item.isDigital,
      slug: item.slug,
      name: item.name,
      // ✅ حقول الجملة
      isWholesale: item.isWholesale ?? false,
      originalPrice: item.originalPrice ?? item.unitPrice,
      saleType: item.saleType ?? 'retail',
      colorId: item.colorId ?? item.variant_info?.colorId,
      colorName: item.colorName ?? item.variant_info?.colorName,
      sizeId: item.sizeId ?? item.variant_info?.sizeId,
      sizeName: item.sizeName ?? item.variant_info?.sizeName,
      variant_info: item.variant_info ?? null,
      // ⚡ حقول البيع المتقدم
      sellingUnitType: (item as any).sellingUnit ?? 'piece',
      weightSold: (item as any).weight,
      weightUnit: (item as any).weightUnit,
      pricePerWeightUnit: (item as any).pricePerWeightUnit,
      metersSold: (item as any).length,
      pricePerMeter: (item as any).pricePerMeter,
      boxesSold: (item as any).boxCount,
      unitsPerBox: (item as any).unitsPerBox,
      boxPrice: (item as any).boxPrice,
      // ⚡ حقول التتبع
      batchId: (item as any).batchId,
      batchNumber: (item as any).batchNumber,
      expiryDate: (item as any).expiryDate,
      serialNumbers: (item as any).serialNumbers
    };

    // 🔍 DEBUG: تسجيل البيانات المُعالجة
    console.log('[buildItemPayloads] ✅ Output payload:', {
      sellingUnitType: payload.sellingUnitType,
      metersSold: payload.metersSold,
      weightSold: payload.weightSold,
      boxesSold: payload.boxesSold
    });

    return payload;
  });

/**
 * ⚡ إنشاء طلبية POS - نظام Delta Sync الموحد
 *
 * التدفق:
 * 1. يتم حفظ الطلب محلياً فوراً (Local-First)
 * 2. يتم إضافته إلى Outbox
 * 3. BatchSender يرسله تلقائياً عند توفر الاتصال
 */
export async function createPOSOrder(orderData: POSOrderData): Promise<POSOrderResult> {
  const startTime = Date.now();
  console.log('[createPOSOrder] 🚀 ========== بدء createPOSOrder ==========');
  console.log('[createPOSOrder] 📦 بيانات الطلب:', {
    org: orderData.organizationId?.slice(0, 8) || 'missing',
    items: orderData.items?.length || 0,
    total: orderData.total,
    isOnline: isDeviceOnline(),
    paymentMethod: orderData.paymentMethod,
    paymentStatus: orderData.paymentStatus
  });

  if (!orderData.organizationId) {
    console.error('[createPOSOrder] ❌ Organization ID is required');
    throw new Error('Organization ID is required');
  }

  if (!orderData.items || orderData.items.length === 0) {
    console.error('[createPOSOrder] ❌ Order must have at least one item');
    throw new Error('Order must have at least one item');
  }

  try {
    console.log('[createPOSOrder] 💾 بدء إنشاء الطلب محلياً عبر PowerSync...');
    const createStart = Date.now();
    
    // ⚡ استخدام الخدمة الموحدة Offline-First
    unifiedOrderService.setOrganizationId(orderData.organizationId);
    
    const createOrderInput: CreateOrderInput = {
      customer_id: orderData.customerId,
      items: buildItemPayloads(orderData.items).map(item => {
        // 🔍 DEBUG: تسجيل البيانات المرسلة لـ UnifiedOrderService
        console.log('[createPOSOrder] 🔗 Mapping item to CreateOrderInput:', {
          productId: item.productId,
          sellingUnitType: item.sellingUnitType,
          metersSold: item.metersSold,
          weightSold: item.weightSold,
          boxesSold: item.boxesSold
        });

        return {
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          product_name: item.productName || item.name || '',
          color_id: item.colorId,
          size_id: item.sizeId,
          color_name: item.colorName,
          size_name: item.sizeName,
          sale_type: item.saleType as any,
          // ⚡ حقول البيع المتقدم - تم الإصلاح
          selling_unit: item.sellingUnitType as 'piece' | 'weight' | 'box' | 'meter',
          weight: item.weightSold,
          weight_unit: item.weightUnit,
          box_count: item.boxesSold,
          units_per_box: item.unitsPerBox,
          length: item.metersSold
        };
      }),
      payment_method: orderData.paymentMethod as any,
      amount_paid: orderData.amountPaid || orderData.total,
      discount: orderData.discount,
      tax: orderData.tax,
      shipping_cost: orderData.shippingCost,
      notes: orderData.notes,
      // ⚡ إصلاح: استخدام الحقول الصحيحة من POSOrderPayload
      staff_id: orderData.createdByStaffId || orderData.employeeId,
      staff_name: orderData.createdByStaffName || orderData.customerName || 'موظف',
      pos_order_type: orderData.saleType as any
    };
    
    const offlineOrder = await unifiedOrderService.createPOSOrder(createOrderInput);
    const createDuration = Date.now() - createStart;
    console.log('[createPOSOrder] ✅ تم إنشاء الطلب محلياً:', {
      orderId: offlineOrder.id,
      localNumber: offlineOrder.customer_order_number,
      duration: createDuration + 'ms'
    });

    // تحديث الكاش
    try {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('pos-order') || key === 'pos-orders' || key === 'products';
        }
      });

      // ⚡ إبطال كاش صفحة الطلبيات المحسنة
      await queryClient.invalidateQueries({
        queryKey: ['pos-orders-page-data']
      });
    } catch {
      // تجاهل أخطاء الكاش
    }

    // ⚡ إرسال حدث إنشاء طلبية جديدة لتحديث جميع الصفحات
    console.log('[createPOSOrder] 📢 إرسال حدث pos-order-created...');
    window.dispatchEvent(new CustomEvent('pos-order-created', {
      detail: {
        orderId: offlineOrder.id,
        orderNumber: offlineOrder.customer_order_number,
        total: offlineOrder.total,
        source: 'pos-sale'
      }
    }));
    console.log('[createPOSOrder] ✅ تم إرسال حدث pos-order-created');

    const totalDuration = Date.now() - startTime;
    console.log('[createPOSOrder] 🎉 ========== اكتمل createPOSOrder بنجاح ==========');
    console.log('[createPOSOrder] ⏱️ المدة الإجمالية:', totalDuration + 'ms');
    console.log('[createPOSOrder] 📊 النتيجة:', {
      orderId: offlineOrder.id,
      localNumber: offlineOrder.customer_order_number,
      total: offlineOrder.total,
      status: offlineOrder.status,
      syncStatus: 'pending',
      duration: totalDuration + 'ms'
    });

    return {
      success: true,
      orderId: offlineOrder.id,
      slug: offlineOrder.slug || `pos-${offlineOrder.customer_order_number}`,
      customerOrderNumber: offlineOrder.customer_order_number || '',
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
      localOrderNumber: offlineOrder.customer_order_number || '',
      metadata: orderData.metadata
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[createPOSOrder] ❌ ========== فشل createPOSOrder ==========');
    console.error('[createPOSOrder] ❌ تفاصيل الخطأ:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration + 'ms'
    });
    throw error;
  }
}

/**
 * ⚡ تهيئة نظام المزامنة
 *
 * ملاحظة: في نظام PowerSync، المزامنة تحدث تلقائياً عبر:
 * - PowerSync Background Service (مستمر)
 * - عند استعادة الاتصال
 */
export const initializePOSOfflineSync = () => {
  console.log('[POS] ⚡ PowerSync mode - المزامنة تلقائية');
};
