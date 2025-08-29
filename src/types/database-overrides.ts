/**
 * Database Type Overrides
 * لحل مشاكل النوعيات في قاعدة البيانات
 */

// إعادة تعريف نوعيات الجداول المفقودة
export interface DatabaseOverrides {
  Tables: {
    returns: {
      Row: {
        id: string;
        original_order_id: string;
        status: string;
        refund_amount: string;
        return_items: any[];
        created_at: string;
        updated_at: string;
      };
      Insert: {
        original_order_id: string;
        status?: string;
        refund_amount?: string;
        return_items?: any[];
      };
      Update: {
        status?: string;
        refund_amount?: string;
        return_items?: any[];
        updated_at?: string;
      };
    };
    subscription_transactions: {
      Row: {
        id: string;
        service_id: string;
        amount: number;
        quantity: number;
        description: string;
        transaction_date: string;
        customer_name: string;
        processed_by: string;
        transaction_type: string;
        service?: {
          name: string;
          description: string;
        };
      };
      Insert: {
        service_id: string;
        amount: number;
        quantity?: number;
        description?: string;
        transaction_date?: string;
        customer_name?: string;
        processed_by?: string;
        transaction_type?: string;
      };
      Update: {
        amount?: number;
        quantity?: number;
        description?: string;
        transaction_date?: string;
        customer_name?: string;
        processed_by?: string;
      };
    };
  };
  Functions: {
    get_pos_orders_count_with_returns: {
      Args: {
        p_organization_id: string;
      };
      Returns: number;
    };
  };
}

// نوعيات مساعدة للطلبات
export interface OrderItemWithDetails {
  id: string;
  product_id: string;
  product_name?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_wholesale: boolean;
  variant_info?: any;
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  slug?: string;
  original_price?: number;
  item_type?: 'product' | 'subscription' | 'digital_service';
}

// نوعية مدمجة للقواعد
export type ExtendedDatabase = DatabaseOverrides;
