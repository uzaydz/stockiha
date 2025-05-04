import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Order = Database['public']['Tables']['orders']['Row'];
export type InsertOrder = Database['public']['Tables']['orders']['Insert'];
export type UpdateOrder = Database['public']['Tables']['orders']['Update'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type InsertOrderItem = Database['public']['Tables']['order_items']['Insert'];

export const getOrders = async (organizationId?: string): Promise<Order[]> => {
  try {
    if (!organizationId) {
      console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getOrders");
      return [];
    }
    
    console.log("جلب الطلبات للمؤسسة:", organizationId);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب الطلبات:', error);
      throw error;
    }

    console.log(`تم جلب ${data?.length || 0} طلب للمؤسسة ${organizationId}`);
    return data || [];
  } catch (error) {
    console.error('خطأ غير متوقع أثناء جلب الطلبات:', error);
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
    console.error(`Error fetching orders for customer ${customerId}:`, error);
    throw error;
  }

  return data;
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching order ${id}:`, error);
    throw error;
  }

  return data;
};

export const getOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    console.error(`Error fetching items for order ${orderId}:`, error);
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
    console.error('Error creating order:', orderError);
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
    console.error('Error adding order items:', itemsError);
    throw itemsError;
  }

  return { order: newOrder, items: newItems };
};

export const updateOrderStatus = async (
  id: string,
  status: string
): Promise<Order> => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating order ${id} status:`, error);
    throw error;
  }

  return data;
};

export const deleteOrder = async (id: string): Promise<void> => {
  // Due to cascade deletion set up in the database,
  // this will also delete associated order items
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting order ${id}:`, error);
    throw error;
  }
}; 