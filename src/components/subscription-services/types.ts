export interface SubscriptionServicePricing {
  id: string;
  duration_months: number;
  duration_label: string;
  purchase_price: number;
  selling_price: number;
  profit_margin: number;
  profit_amount: number;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  is_default: boolean;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  discount_percentage: number;
  promo_text: string;
  bonus_days: number;
}

export interface SubscriptionServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionService {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description: string;
  provider: string;
  service_type: string;
  supported_countries: any[];
  delivery_method: 'manual' | 'automatic';
  status: 'active' | 'inactive';
  purchase_price: number;
  selling_price: number;
  profit_margin: number;
  profit_amount: number;
  expires_at: string;
  total_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  reserved_quantity: number;
  is_featured: boolean;
  is_active: boolean;
  logo_url: string;
  terms_conditions: string;
  usage_instructions: string;
  support_contact: string;
  renewal_policy: string;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  category?: SubscriptionServiceCategory;
  pricing_options?: SubscriptionServicePricing[];
}

export interface ServiceStats {
  total_count: number;
  available_count: number;
  sold_count: number;
  expired_count: number;
  total_revenue: number;
  total_profit: number;
  avg_profit_margin: number;
}

export interface SubscriptionTransaction {
  id: string;
  service_id: string;
  inventory_id?: string;
  transaction_type: 'sale' | 'refund' | 'exchange';
  amount: number;
  cost?: number;
  profit?: number;
  customer_id?: string;
  customer_name?: string;
  customer_contact?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  quantity?: number;
  description?: string;
  notes?: string;
  processed_by?: string;
  approved_by?: string;
  transaction_date?: string;
  created_at: string;
  updated_at?: string;
  organization_id: string;
  service_name?: string;
  provider?: string;
  logo_url?: string;
}

export interface TransactionStats {
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  total_revenue: number;
  total_profit: number;
  today_transactions: number;
  today_revenue: number;
}

export interface PricingFormData {
  duration_months: number;
  duration_label: string;
  purchase_price: number;
  selling_price: number;
  total_quantity: number;
  available_quantity: number;
  is_default: boolean;
  is_featured: boolean;
  discount_percentage: number;
  promo_text: string;
  bonus_days: number;
}
