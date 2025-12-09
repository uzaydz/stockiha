/**
 * ⚡ ordersService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedOrderService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedOrderService للعمل Offline-First
 */

import { unifiedOrderService } from '@/services/UnifiedOrderService';
import type { CreateOrderInput, OrderWithItems } from '@/services/UnifiedOrderService';

/**
 * Service for order processing and management
 * 
 * ⚡ تم تحديثه للعمل Offline-First مع PowerSync
 */
export class OrdersService {
  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderInput): Promise<OrderWithItems> {
    // استخدام الخدمة الموحدة
    return unifiedOrderService.createPOSOrder(orderData);
  }
  
  /**
   * Delete an order (for admins only) with inventory restoration
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    return unifiedOrderService.deleteOrder(orderId, true); // restoreStock = true
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    return unifiedOrderService.updateOrderStatus(orderId, status as any);
  }

  /**
   * Update order payment
   */
  async updateOrderPayment(orderId: string, amountPaid: number, paymentMethod?: string): Promise<any> {
    return unifiedOrderService.updatePayment(orderId, amountPaid, paymentMethod as any);
  }
}

// Export singleton instance
export const ordersService = new OrdersService();
export default ordersService;
