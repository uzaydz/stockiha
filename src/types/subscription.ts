export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits?: {
    max_users: number | null;
    max_products: number | null;
    max_pos: number | null;
  };
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'trial' | 'canceled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  trial_ends_at?: string;
  amount_paid: number;
  currency: string;
  payment_method?: string;
  payment_reference?: string;
  is_auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: string;
  organization_id: string;
  plan_id: string;
  action: 'created' | 'renewed' | 'upgraded' | 'downgraded' | 'canceled' | 'expired';
  from_status?: string;
  to_status: string;
  from_plan_id?: string;
  amount?: number;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface SubscriptionSettings {
  id: string;
  trial_days: number;
  grace_period_days: number;
  reminder_days: number[];
  payment_methods: string[];
  tax_rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAnalytics {
  total_subscriptions: number;
  active_subscriptions: number;
  monthly_revenue: number;
  yearly_revenue: number;
  plan_distribution: {
    plan: string;
    count: number;
    percentage: number;
  }[];
  recent_subscriptions: {
    organization: string;
    plan: string;
    date: string;
    amount: number;
  }[];
}
