import { supabase } from '../../lib/supabase-client'
import { logOrderSubmit, logStockUpdate } from '../../utils/inventoryLogger'
import { Order, OrderItem, OrderStatus } from '../../types'
import { v4 as uuidv4 } from 'uuid'

// دالة إضافية للـ logging
const logError = (message: string, context: string, data?: any) => {
};

const logSuccess = (message: string, context: string, data?: any) => {
};

// Types للدالة الجديدة
export interface POSOrderData {
  organizationId: string
  employeeId: string
  items: OrderItem[]
  total: number
  customerId?: string | null
  paymentMethod?: string
  paymentStatus?: string
  notes?: string
  amountPaid?: number
  discount?: number
  subtotal?: number
}

export interface POSOrderResult {
  success: boolean
  orderId: string
  slug: string
  customerOrderNumber: number
  status: string
  paymentStatus: string
  total: number
  processingTime: number
  databaseProcessingTime: number
  fifoResults: any[]
  totalFifoCost: number
  message: string
}

// نظام حماية لمنع التحديث المضاعف للمخزون
const processedInventoryUpdates = new Set<string>();

// دالة محسنة لإنشاء طلبية نقطة البيع
export async function createPOSOrder(orderData: POSOrderData): Promise<POSOrderResult> {
  const startTime = performance.now();
  
  try {
    // تحضير البيانات للدالة المحسنة مع تنظيف شامل للقيم
    const orderItems = orderData.items.map(item => {
      const cleanItem = {
        product_id: item.productId,
        product_name: item.productName || 'منتج',
        slug: item.slug || `product-${item.productId}`,
        quantity: item.quantity,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || 0,
        // ✅ تنظيف شامل للـ UUID - إزالة null كنص
        color_id: (item.variant_info?.colorId && item.variant_info.colorId !== 'null' && item.variant_info.colorId !== '') 
          ? item.variant_info.colorId : undefined,
        color_name: (item.variant_info?.colorName && item.variant_info.colorName !== 'null' && item.variant_info.colorName !== '') 
          ? item.variant_info.colorName : undefined,
        size_id: (item.variant_info?.sizeId && item.variant_info.sizeId !== 'null' && item.variant_info.sizeId !== '') 
          ? item.variant_info.sizeId : undefined,
        size_name: (item.variant_info?.sizeName && item.variant_info.sizeName !== 'null' && item.variant_info.sizeName !== '') 
          ? item.variant_info.sizeName : undefined
      };
      
      // تنظيف شامل للقيم - إزالة undefined تماماً من الكائن
      const finalItem: any = {};
      Object.keys(cleanItem).forEach(key => {
        const value = cleanItem[key as keyof typeof cleanItem];
        if (value !== undefined && value !== null && value !== 'null' && value !== '') {
          finalItem[key] = value;
        }
      });
      
      // إضافة القيم المطلوبة
      finalItem.product_id = item.productId;
      finalItem.product_name = item.productName || 'منتج';
      finalItem.slug = item.slug || `product-${item.productId}`;
      finalItem.quantity = item.quantity;
      finalItem.unit_price = item.unitPrice || 0;
      finalItem.total_price = item.totalPrice || 0;
      
      return finalItem;
    });

    // تنظيف البيانات لتجنب مشاكل JSON مع معالجة خاصة للـ UUID
    const cleanedParams = {
      p_organization_id: orderData.organizationId,
      p_employee_id: orderData.employeeId,
      p_items: orderItems, // إرسال كـ JSONB مباشرة
      p_total_amount: orderData.total,
      p_customer_id: orderData.customerId && orderData.customerId !== 'null' ? orderData.customerId : undefined,
      p_payment_method: orderData.paymentMethod || 'cash',
      p_payment_status: orderData.paymentStatus || 'paid',
      p_notes: orderData.notes || '',
      p_amount_paid: orderData.amountPaid || orderData.total,
      p_discount: orderData.discount || 0,
      p_subtotal: orderData.subtotal || (orderData.total - (orderData.discount || 0))
    };
    
    // إزالة undefined من المعاملات الرئيسية
    Object.keys(cleanedParams).forEach(key => {
      if (cleanedParams[key as keyof typeof cleanedParams] === undefined) {
        delete cleanedParams[key as keyof typeof cleanedParams];
      }
    });

    // 🔍 تتبع مصدر الرقم 666 - نقطة 1: قبل الإرسال

    // ✅ استخدام الدالة الجديدة المحسنة مع حماية UUID شاملة
    const { data: result, error } = await supabase.rpc(
      'create_pos_order_ultra_fast_uuid_safe' as any,
      cleanedParams
    );

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    if (error) {
      
      // محاولة fallback للدالة القديمة في حالة عدم وجود الدالة الجديدة
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        
        const { data: fallbackResult, error: fallbackError } = await supabase.rpc(
          'create_pos_order_ultra_fast_with_fifo_corrected' as any,
          cleanedParams
        );
        
        if (fallbackError) {
          logError('فشل في إنشاء طلب POS - حتى مع fallback', 'posOrderService.createPOSOrder', {
            error: fallbackError.message,
            fallbackError,
            originalError: error,
            orderData,
            cleanedParams,
            processingTime
          });
          throw new Error(`فشل في إنشاء الطلب: ${fallbackError.message}`);
        }
        
        // استخدام نتيجة fallback
        const fallbackOrderResult = fallbackResult as any;
        
        if (!fallbackOrderResult?.success) {
          logError('فشل في إنشاء طلب POS - نتيجة fallback غير ناجحة', 'posOrderService.createPOSOrder', {
            result: fallbackOrderResult,
            orderData,
            cleanedParams,
            processingTime
          });
          throw new Error(fallbackOrderResult?.error || 'فشل في إنشاء الطلب');
        }

        return {
          success: true,
          orderId: fallbackOrderResult.order_id,
          slug: fallbackOrderResult.slug,
          customerOrderNumber: fallbackOrderResult.customer_order_number,
          status: fallbackOrderResult.status,
          paymentStatus: fallbackOrderResult.payment_status,
          total: fallbackOrderResult.total,
          processingTime,
          databaseProcessingTime: fallbackOrderResult.processing_time_ms,
          fifoResults: fallbackOrderResult.fifo_results,
          totalFifoCost: fallbackOrderResult.total_fifo_cost,
          message: fallbackOrderResult.message + ' (fallback used)'
        };
      }
      
      logError('فشل في إنشاء طلب POS', 'posOrderService.createPOSOrder', {
        error: error.message,
        orderData,
        cleanedParams,
        processingTime
      });
      throw new Error(`فشل في إنشاء الطلب: ${error.message}`);
    }

    // تحويل النتيجة مع type safety
    const orderResult = result as any;

    // 🔍 تتبع مصدر الرقم 666 - نقطة 2: بعد استقبال النتيجة من قاعدة البيانات

    if (!orderResult?.success) {
      logError('فشل في إنشاء طلب POS - نتيجة غير ناجحة', 'posOrderService.createPOSOrder', {
        result,
        orderData,
        cleanedParams,
        processingTime
      });
      throw new Error(orderResult?.error || 'فشل في إنشاء الطلب');
    }

    logSuccess(
      'تم إنشاء طلب POS بنجاح مع حماية UUID',
      'posOrderService.createPOSOrder',
      {
        orderId: orderResult.order_id,
        slug: orderResult.slug,
        customerOrderNumber: orderResult.customer_order_number,
        itemsCount: orderResult.items_count,
        total: orderData.total,
        processingTime: `${processingTime.toFixed(2)}ms`,
        databaseProcessingTime: `${orderResult.processing_time_ms}ms`,
        fifoCostSavings: orderResult.total_fifo_cost ? `${(orderData.total - orderResult.total_fifo_cost).toFixed(2)}` : 'N/A',
        uuidSafeEnabled: orderResult.uuid_safe_enabled,
        version: orderResult.version
      }
    );

    // 🔍 تتبع مصدر الرقم 666 - نقطة 3: قبل إرجاع النتيجة النهائية

    return {
      success: true,
      orderId: orderResult.order_id,
      slug: orderResult.slug,
      customerOrderNumber: orderResult.customer_order_number,
      status: orderResult.status,
      paymentStatus: orderResult.payment_status,
      total: orderResult.total,
      processingTime,
      databaseProcessingTime: orderResult.processing_time_ms,
      fifoResults: orderResult.fifo_results,
      totalFifoCost: orderResult.total_fifo_cost,
      message: orderResult.message
    };

  } catch (error) {
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    logError('خطأ عام في إنشاء طلب POS', 'posOrderService.createPOSOrder', {
      error: error instanceof Error ? error.message : String(error),
      orderData,
      processingTime
    });

    throw error;
  }
}

// دالة الطريقة القديمة للتوافق مع الكود الموجود
export const createPOSOrderLegacy = async (
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, 
  currentOrganizationId: string | undefined
): Promise<Order> => {
  // تحويل البيانات للدالة الجديدة
  const orderData: POSOrderData = {
    organizationId: currentOrganizationId || localStorage.getItem('bazaar_organization_id') || 'fed872f9-1ade-4351-b020-5598fda976fe',
    employeeId: order.employeeId,
    items: order.items || [],
    total: order.total,
    customerId: order.customerId === 'walk-in' ? null : order.customerId,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    notes: order.notes,
    amountPaid: order.partialPayment?.amountPaid || order.total,
    discount: order.discount,
    subtotal: order.subtotal
  };

  const result = await createPOSOrder(orderData);

  // إنشاء كائن الطلب المُرجع بالتنسيق القديم
  const completedOrder: Order = {
    id: result.orderId,
    customerId: order.customerId,
    items: order.items || [],
    services: order.services || [],
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    discount: order.discount || 0,
    total: order.total,
    status: 'completed' as const,
    paymentMethod: order.paymentMethod || 'cash',
    paymentStatus: order.paymentStatus || 'paid',
    notes: order.notes,
    isOnline: false,
    employeeId: order.employeeId,
    partialPayment: order.partialPayment,
    considerRemainingAsPartial: false,
    subscriptionAccountInfo: order.subscriptionAccountInfo,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization_id: orderData.organizationId,
    customer_order_number: result.customerOrderNumber
  };

  return completedOrder;
};

// دالة لتحديث المخزون مع نظام FIFO محسن وسريع
async function updateInventoryForOrder(items: OrderItem[], orderId?: string, organizationId?: string) {
  const startTime = performance.now();

  for (const item of items) {
    if (!item.productId) {
      continue;
    }
      
    try {
      // ✅ استخدام الدالة المحسنة والمصححة
      const { data: fifoResult, error: fifoError } = await supabase.rpc('process_pos_sale_with_variants_fifo_optimized', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_organization_id: organizationId || localStorage.getItem('bazaar_organization_id'),
        p_color_id: item.variant_info?.colorId || null,
        p_size_id: item.variant_info?.sizeId || null,
        p_order_id: orderId || null
      });
      
      if (fifoError || !fifoResult?.success) {
        
        // العودة للطريقة البسيطة عند فشل FIFO
        const { error: simpleError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: supabase.sql`GREATEST(0, stock_quantity - ${item.quantity})`,
            updated_at: new Date().toISOString(),
            last_inventory_update: new Date().toISOString()
          })
          .eq('id', item.productId);
        
        if (simpleError) {
          logError(`فشل في تحديث المخزون: ${item.productName}`, 'posOrderService.updateInventoryForOrder', {
            productId: item.productId,
            error: simpleError.message,
            fallbackUsed: true
          });
        } else {
          logStockUpdate(
            item.productId,
            item.productName || 'منتج',
            0,
            0,
            'posOrderService.updateInventoryForOrder.fallback',
            item.variant_info?.colorId,
            item.variant_info?.sizeId,
            {
              operation: 'STOCK_UPDATE_SIMPLE',
              orderId,
              quantity: -item.quantity,
              variantInfo: item.variant_info
            }
          );
        }
      } else {
        // نجح FIFO
        logStockUpdate(
          item.productId,
          item.productName || 'منتج',
          fifoResult.previous_stock || 0,
          fifoResult.new_stock || 0,
          'posOrderService.updateInventoryForOrder.fifo',
          item.variant_info?.colorId,
          item.variant_info?.sizeId,
          {
            operation: 'FIFO_OPTIMIZED_SUCCESS',
            orderId,
            quantity: -item.quantity,
            totalCost: fifoResult.total_cost,
            averageCost: fifoResult.average_cost_per_unit,
            variantInfo: item.variant_info,
            hasVariants: fifoResult.has_variants,
            processingOptimized: fifoResult.processing_optimized
          }
        );
      }
    } catch (error) {
      
      logError(`خطأ في تحديث مخزون المنتج: ${item.productName}`, 'posOrderService.updateInventoryForOrder', {
        productId: item.productId,
        error: error instanceof Error ? error.message : String(error),
        variantInfo: item.variant_info
      });
    }
  }

  const endTime = performance.now();
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
    
    // التأكد من وجود جميع الحقول المطلوبة فقط
    const transactionData = {
      order_id: orderId,
      amount: order.paymentStatus === 'paid' ? order.total : (order.partialPayment?.amountPaid || 0),
      type: 'sale',
      payment_method: order.paymentMethod || 'cash',
      description: order.paymentStatus === 'paid' 
        ? `Payment for POS order` 
        : `Partial payment for POS order`,
      employee_id: order.employeeId || null,
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
