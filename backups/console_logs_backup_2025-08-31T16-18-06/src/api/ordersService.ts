import { supabase } from '@/lib/supabase';
import { createShippingOrderForOrder } from '@/utils/shippingOrderIntegration';
import { shippingSettingsService } from './shippingSettingsService';
import { ShippingProvider } from './shippingService';

interface OrderUpdateData {
  status?: string;
  paid_amount?: number;
  payment_status?: string;
  delivery_status?: string;
  shipping_method?: string;
  shipping_cost?: number;
  notes?: string;
  [key: string]: any;
}

/**
 * Service for order processing and management
 */
export class OrdersService {
  /**
   * Create a new order
   */
  async createOrder(orderData: any) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Check if auto shipping is enabled for this organization
      this.checkAndCreateShippingOrder(data.organization_id, data.id);
      
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Delete an order (for admins only) with inventory restoration
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      // 1. Get order items before deletion to restore inventory
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          product_id, 
          quantity,
          product_name,
          unit_price,
          total_price
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        throw itemsError;
      }

      // 2. Restore inventory for each item
      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.product_id) {
            try {
              // Get current product inventory first
              const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

              if (productError) {
                continue;
              }

              // Update with restored quantity
              const newQuantity = (product.stock_quantity || 0) + item.quantity;
              const { error: inventoryError } = await supabase
                .from('products')
                .update({ stock_quantity: newQuantity })
                .eq('id', item.product_id);

              if (inventoryError) {
                // Continue with deletion even if inventory restoration fails
              }
            } catch (inventoryError) {
              // Continue with deletion
            }
          }
        }
      }

      // 3. Delete order items
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteItemsError) {
        // Continue with deletion even if item deletion fails
      }

      // 4. Delete related financial transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId);

      if (transactionsError) {
        // Continue with deletion
      }

      // 5. Delete the order itself (both online and offline orders)
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteOrderError) {
        throw deleteOrderError;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update an existing order
   */
  async updateOrder(orderId: string, updateData: OrderUpdateData) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // If order status changed to confirmed or similar, check shipping
      if (
        updateData.status === 'confirmed' || 
        updateData.status === 'processing' ||
        updateData.delivery_status === 'ready_for_shipping'
      ) {
        // Check if a shipping order should be created
        this.checkAndCreateShippingOrder(data.organization_id, orderId);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get shipping orders for an order
   */
  async getOrderShippingDetails(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('shipping_orders')
        .select(`
          *,
          shipping_providers (
            id,
            code,
            name
          )
        `)
        .eq('order_id', orderId);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Check if auto shipping is enabled and create a shipping order
   */
  private async checkAndCreateShippingOrder(organizationId: string, orderId: string) {
    try {
      // Check if any shipping order already exists for this order
      const { data: existingShippingOrders, error: checkError } = await supabase
        .from('shipping_orders')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);
      
      if (checkError) {
        return;
      }
      
      // If a shipping order already exists, don't create another one
      if (existingShippingOrders && existingShippingOrders.length > 0) {
        return;
      }
      
      // Check if auto shipping is enabled for Yalidine
      const yalidineSettings = await shippingSettingsService.getProviderSettings(
        organizationId,
        ShippingProvider.YALIDINE
      );
      
      // If auto shipping is enabled, create a shipping order
      if (yalidineSettings && yalidineSettings.is_enabled && yalidineSettings.auto_shipping) {

        // Create shipping order asynchronously (fire and forget)
        createShippingOrderForOrder(organizationId, orderId)
          .then(result => {
            if (result.success) {

              // Update the order with shipping information
              this.updateOrder(orderId, {
                shipping_tracking_number: result.trackingNumber,
                delivery_status: 'shipped',
                shipping_method: 'yalidine'
              }).catch(error => {
              });
            } else {
            }
          })
          .catch(error => {
          });
      }
    } catch (error) {
    }
  }
}

export const ordersService = new OrdersService();
