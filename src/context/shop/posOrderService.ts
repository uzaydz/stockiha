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
    console.log('Creating POS order:', order);

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

    console.log('Order data to insert:', orderData);

    // محاولة استخدام الدالة المخزنة الآمنة أولاً
    try {
      const rpcParams = {
        p_organization_id: currentOrganizationId,
        p_customer_id: customerId,
        p_items: order.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        p_total_amount: order.total,
        p_employee_id: order.employeeId || null,
        p_payment_method: order.paymentMethod || 'cash',
        p_payment_status: order.paymentStatus || 'paid',
        p_notes: order.notes || null
      };
      
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_pos_order_safe', rpcParams);

      if (!rpcError && rpcData?.success) {
        console.log('Order created successfully via RPC:', rpcData);
        return {
          ...order,
          id: rpcData.id,
          slug: rpcData.slug,
          createdAt: new Date(rpcData.created_at),
          updatedAt: new Date(rpcData.updated_at)
        };
      } else if (rpcData?.error) {
        console.warn('RPC create_pos_order_safe returned error:', rpcData.error);
      } else if (rpcError) {
        console.warn('RPC error:', rpcError);
      }
    } catch (rpcErr) {
      console.warn('RPC create_pos_order_safe failed, falling back to direct insert:', rpcErr);
    }

    // إذا فشلت الدالة المخزنة، جرب الإدخال المباشر
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error(`Error creating order: ${orderError.message}`);
    }
    
    console.log('Order created successfully:', insertedOrder);
    const newOrderId = insertedOrder.id;

    // إضافة عناصر الطلب
    if (order.items && order.items.length > 0) {
      try {
        console.log('Adding order items for order:', newOrderId, 'Items count:', order.items.length);
        
        const orderItems = order.items.map((item, index) => ({
          order_id: newOrderId,
          product_id: item.productId,
          product_name: item.productName || item.name || 'منتج',
          name: item.productName || item.name || 'منتج',
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          is_digital: item.isDigital || false,
          organization_id: currentOrganizationId,
          slug: `item-${Date.now()}-${index}`,
          variant_info: item.variant_info || null
        }));

        console.log('Order items to insert:', orderItems);

        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
          .select();

        if (itemsError) {
          console.error('Error adding order items:', itemsError);
          // لا نوقف العملية، نستمر حتى لو فشلت إضافة العناصر
        } else {
          console.log('Successfully inserted order items:', insertedItems);
        }

        // تحديث المخزون
        await updateInventoryForOrder(order.items);
      } catch (error) {
        console.error('Error processing order items:', error);
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
      console.error('Error adding transaction:', error);
    }
    
    // إعادة الطلب المضاف
    return {
      ...order,
      id: newOrderId,
      createdAt: new Date(insertedOrder.created_at),
      updatedAt: new Date(insertedOrder.updated_at),
      slug: insertedOrder.slug
    };
  } catch (error) {
    console.error('Fatal error creating POS order:', error);
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
      console.error(`Error updating inventory for item ${item.productId}:`, error);
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
        console.error('Error adding service booking:', serviceBookingError);
      }
    } catch (error) {
      console.error('Error processing service booking:', error);
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
      console.error('Error adding transaction:', error);
    }
  } catch (error) {
    console.error('Error in addOrderTransaction:', error);
  }
}