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
        console.error('Error creating order:', error);
        throw error;
      }
      
      // Check if auto shipping is enabled for this organization
      this.checkAndCreateShippingOrder(data.organization_id, data.id);
      
      return data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
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
        console.error('Error updating order:', error);
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
      console.error('Failed to update order:', error);
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
        console.error('Error fetching order:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get order:', error);
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
        console.error('Error fetching shipping orders:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to get shipping details:', error);
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
        console.error('Error checking existing shipping orders:', checkError);
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
                console.error('Error updating order with shipping info:', error);
              });
            } else {
              console.error('Failed to create shipping order:', result.message);
            }
          })
          .catch(error => {
            console.error('Error in automatic shipping order creation:', error);
          });
      }
    } catch (error) {
      console.error('Error checking auto shipping setting:', error);
    }
  }
}

export const ordersService = new OrdersService(); 