/**
 * Orders Types
 * أنواع البيانات الخاصة بالطلبات
 */

import { Order } from '@/types';

export interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
}

export interface OrdersContextType {
  state: OrdersState;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  updateOrder: (order: Order) => Order;
  deleteOrder: (orderId: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
}
