import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { queryClient } from '@/lib/config/queryClient';

export type Order = Database['public']['Tables']['orders']['Row'];
export type InsertOrder = Database['public']['Tables']['orders']['Insert'];
export type UpdateOrder = Database['public']['Tables']['orders']['Update'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type InsertOrderItem = Database['public']['Tables']['order_items']['Insert'];

export const getOrders = async (
  organizationId?: string,
  page: number = 1,
  limit: number = 50,
  status?: string,
  search?: string
): Promise<any[]> => {
  try {
    if (!organizationId) {
      return [];
    }

    // استخدام RPC المحسنة
    const { data, error } = await supabase
      .rpc('get_orders_optimized', {
        p_organization_id: organizationId,
        p_page: page,
        p_limit: limit,
        p_status: status || null,
        p_search: search || null
      });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOrders:', error);
    return [];
  }
};

export const getOrdersByCustomerId = async (customerId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

export const getOrderById = async (id: string): Promise<any | null> => {
  try {
    // استخدام RPC المحسنة لجلب تفاصيل الطلب مع المنتجات
    const { data, error } = await supabase
      .rpc('get_order_details_optimized', {
        p_order_id: id
      })
      .single();

    if (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrderById:', error);
    return null;
  }
};

export const getOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    throw error;
  }

  return data;
};

export const createOrder = async (
  order: InsertOrder,
  orderItems: InsertOrderItem[]
): Promise<{ order: Order; items: OrderItem[] }> => {
  // Use Supabase transaction to ensure both order and items are saved
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (orderError) {
    throw orderError;
  }

  // Add order_id to each item
  const itemsWithOrderId = orderItems.map(item => ({
    ...item,
    order_id: newOrder.id
  }));

  const { data: newItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithOrderId)
    .select();

  if (itemsError) {
    throw itemsError;
  }

  // Invalidate orders queries
  if (newOrder.organization_id) {
    await queryClient.invalidateQueries({ queryKey: ['orders', newOrder.organization_id] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-data', newOrder.organization_id] });
  }

  return { order: newOrder, items: newItems };
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('organization_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    throw new Error('Order not found or could not be fetched for update.');
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    throw error;
  }

  // Invalidate orders queries
  if (order.organization_id) {
    await queryClient.invalidateQueries({ queryKey: ['orders', order.organization_id] });
    await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-data', order.organization_id] });
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('organization_id')
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    throw new Error('Order not found or could not be fetched for deletion.');
  }

  // Due to cascade deletion set up in the database,
  // this will also delete associated order items
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  // Invalidate orders queries
  if (order.organization_id) {
    await queryClient.invalidateQueries({ queryKey: ['orders', order.organization_id] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-data', order.organization_id] });
  }
};
