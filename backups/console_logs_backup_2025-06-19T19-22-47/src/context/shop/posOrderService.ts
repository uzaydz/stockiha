import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ensureCustomerExists } from '@/lib/fallback_customer';
import { queryClient } from '@/lib/config/queryClient';

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
      updated_at: new Date().toISOString()
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
          
          const itemData = {
            order_id: newOrderId,
            product_id: item.productId,
            product_name: item.productName || item.name || 'منتج',
            name: item.productName || item.name || 'منتج',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
            is_digital: item.isDigital || false,
            organization_id: currentOrganizationId, // التأكد من أنه ليس null
            slug: `item-${Date.now()}-${index}`
          };

          const { error: itemError } = await supabase
            .from('order_items')
            .insert(itemData);

          if (itemError) {
            // نستمر في إضافة باقي العناصر حتى لو فشل أحدها
          }
        }

        // تحديث المخزون
        await updateInventoryForOrder(order.items);
      } catch (error) {
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

// دالة لتحديث المخزون
async function updateInventoryForOrder(items: OrderItem[]) {
  for (const item of items) {
    try {
      // استخدام الدالة الآمنة لتحديث مخزون المنتج
      await supabase.rpc('update_product_stock_safe', {
        p_product_id: item.productId,
        p_quantity_sold: item.quantity
      });
    } catch (error) {
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
