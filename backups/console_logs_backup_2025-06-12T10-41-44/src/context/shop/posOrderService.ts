import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ensureCustomerExists } from '@/lib/fallback_customer';

// دالة محسنة لإنشاء طلبية نقطة البيع
export const createPOSOrder = async (
  order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, 
  currentOrganizationId: string | undefined
): Promise<Order> => {
  try {

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
      consider_remaining_as_partial: order.partialPayment ? true : false,
      completed_at: order.status === 'completed' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // محاولة استخدام الدالة المخزنة الآمنة أولاً
    try {
      const rpcParams = {
        p_organization_id: currentOrganizationId,
        p_customer_id: customerId,
        p_items: order.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.unitPrice * item.quantity
        })),
        p_total_amount: order.total,
        p_employee_id: order.employeeId || null,
        p_payment_method: order.paymentMethod || 'cash',
        p_payment_status: order.paymentStatus || 'paid',
        p_notes: order.notes || null
      };
      
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_pos_order_safe', rpcParams);

      if (!rpcError && rpcData && typeof rpcData === 'object' && 'success' in rpcData && rpcData.success) {
        const orderResult = rpcData as any;
        return {
          ...order,
          id: orderResult.id,
          customer_order_number: orderResult.customer_order_number,
          slug: orderResult.slug,
          createdAt: new Date(orderResult.created_at),
          updatedAt: new Date(orderResult.updated_at)
        };
      } else if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
      } else if (rpcError) {
      }
    } catch (rpcErr) {
    }

    // إذا فشلت الدالة المخزنة، جرب الإدخال المباشر
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (orderError) {
      throw new Error(`Error creating order: ${orderError.message}`);
    }
    
    const newOrderId = insertedOrder.id;

    // إضافة عناصر الطلب
    if (order.items && order.items.length > 0) {
      try {
        
        const orderItems = order.items.map((item, index) => ({
          order_id: newOrderId,
          product_id: item.productId,
          product_name: item.productName || item.name || 'منتج',
          name: item.productName || item.name || 'منتج',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.unitPrice * item.quantity,
          is_digital: item.isDigital || false,
          organization_id: currentOrganizationId,
          slug: `item-${Date.now()}-${index}`,
          variant_info: item.variant_info || null
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
          .select();

        if (itemsError) {
          // لا نوقف العملية، نستمر حتى لو فشلت إضافة العناصر
        } else {
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
    
    // إعادة الطلب المضاف مع البيانات الكاملة من قاعدة البيانات
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
      
      // يمكن إضافة تحديث مخزون المتغيرات لاحقاً إذا كان مطلوباً
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
    const transactionData = {
      id: uuidv4(),
      order_id: orderId,
      amount: order.paymentStatus === 'paid' ? order.total : (order.partialPayment?.amountPaid || 0),
      type: 'sale',
      payment_method: order.paymentMethod || 'cash',
      description: order.paymentStatus === 'paid' 
        ? `Payment for POS order` 
        : `Partial payment for POS order`,
      employee_id: order.employeeId || null,
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      slug: `transaction-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
      
    if (error) {
    }
  } catch (error) {
  }
}
