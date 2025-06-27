import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ensureCustomerExists } from '@/lib/fallback_customer';
import { queryClient } from '@/lib/config/queryClient';

// نظام حماية لمنع التحديث المضاعف للمخزون
const processedInventoryUpdates = new Set<string>();

// دالة محسنة لإنشاء طلبية نقطة البيع
export const createPOSOrder = async (
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
      employee_id: order.employeeId || null,
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
        console.log(`🔄 بدء إدراج ${order.items.length} عنصر للطلبية ${newOrderId}`);
        
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

          console.log(`📝 إدراج العنصر ${index + 1}: ${item.productName} - الكمية: ${item.quantity}`);
          
          const { error: itemError } = await supabase
            .from('order_items')
            .insert(itemData);

          if (itemError) {
            console.error(`❌ خطأ في إدراج العنصر ${index + 1}:`, itemError);
            // رمي الخطأ لإيقاف العملية
            throw new Error(`فشل في إدراج العنصر: ${item.productName} - ${itemError.message}`);
          } else {
            console.log(`✅ تم إدراج العنصر ${index + 1} بنجاح`);
          }
        }

        console.log(`✅ تم إدراج جميع العناصر (${order.items.length}) بنجاح`);
        
        // تحديث المخزون - مع logs للتتبع وتطبيق FIFO
        await updateInventoryForOrder(order.items, newOrderId, currentOrganizationId);
      } catch (error) {
        console.error('❌ خطأ في إضافة عناصر الطلب:', error);
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
        console.warn(`⚠️ تم تجاهل التحديث المكرر للمنتج ${item.productId}`);
        continue;
      }
      
      processedInventoryUpdates.add(itemUpdateKey);
      const variantInfo = item.variant_info ? 
        ` - ${item.variant_info.colorName || 'بدون لون'}${item.variant_info.sizeName ? ` (${item.variant_info.sizeName})` : ''}` : '';
      console.log(`🔄 [${index + 1}/${items.length}] تحديث مخزون المنتج ${item.productId} - الكمية: ${item.quantity} (FIFO)${variantInfo}`);
      
      // جلب الكمية الحالية قبل التحديث للمراقبة
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock_quantity, organization_id')
        .eq('id', item.productId)
        .single();
      
      const stockBefore = currentProduct?.stock_quantity || 0;
      const productOrgId = organizationId || currentProduct?.organization_id;
      
      console.log(`📊 المخزون الحالي قبل التحديث: ${stockBefore}`);
      
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
          console.error(`❌ خطأ في معالجة FIFO للمنتج ${item.productId}:`, error);
          // العودة للطريقة القديمة كبديل
          const { error: fallbackError } = await supabase.rpc('update_product_stock_safe', {
            p_product_id: item.productId,
            p_quantity_sold: item.quantity
          });
          
          if (fallbackError) {
            console.error(`❌ فشل أيضاً في الطريقة البديلة:`, fallbackError);
          } else {
            console.log(`✅ تم التحديث بالطريقة البديلة (بدون FIFO)`);
          }
          
          processedInventoryUpdates.delete(itemUpdateKey);
        } else if (fifoResult && (fifoResult as any).success) {
          const result = fifoResult as any;
          console.log(`✅ تم تطبيق FIFO بنجاح:`, {
            من_المخزون_الأولي: result.quantity_from_initial_stock,
            من_الباتشات: result.quantity_from_batches,
            التكلفة_الإجمالية: result.total_cost,
            متوسط_التكلفة: result.average_cost_per_unit
          });
          
          // تنظيف Set بعد 30 ثانية لمنع تراكم البيانات
          setTimeout(() => {
            processedInventoryUpdates.delete(itemUpdateKey);
          }, 30000);
        } else {
          console.error(`❌ فشل في معالجة FIFO:`, fifoResult);
          processedInventoryUpdates.delete(itemUpdateKey);
        }
      } catch (fifoError) {
        console.error(`❌ خطأ في استدعاء دالة FIFO، استخدام الطريقة القديمة:`, fifoError);
        // العودة للطريقة القديمة
        const { error: fallbackError } = await supabase.rpc('update_product_stock_safe', {
          p_product_id: item.productId,
          p_quantity_sold: item.quantity
        });
        
        if (fallbackError) {
          console.error(`❌ فشل في الطريقة البديلة أيضاً:`, fallbackError);
        } else {
          console.log(`✅ تم التحديث بالطريقة البديلة (بدون FIFO)`);
        }
        
        processedInventoryUpdates.delete(itemUpdateKey);
      }
    } catch (error) {
      console.error(`❌ خطأ عام في تحديث المخزون للمنتج ${item.productId}:`, error);
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
