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
  permissions?: Record<string, boolean>;
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

// ============ أنواع التحقق من الاشتراك ============

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'canceled' | 'error' | 'not_found' | 'pending';
export type SubscriptionType = 'paid' | 'trial_subscription' | 'organization_trial' | 'none';

export interface SubscriptionCheckResult {
  success: boolean;
  status: SubscriptionStatus;
  subscription_type: SubscriptionType;
  subscription_id: string | null;
  plan_name: string;
  plan_code: string;
  start_date: string | null;
  end_date: string | null;
  days_left: number;
  features: string[];
  limits: SubscriptionLimits;
  billing_cycle?: string;
  amount_paid?: number;
  currency?: string;
  trial_period_days?: number;
  message: string;
  error?: string;
}

export interface SubscriptionLimits {
  max_pos: string | number | null;
  max_users: string | number | null;
  max_products: string | number | null;
}

export interface SubscriptionValidationResult {
  isValid: boolean;
  reason?: SubscriptionValidationReason;
  expiryDate?: string;
  tamperDetected?: boolean;
  isLocked?: boolean;
}

export type SubscriptionValidationReason =
  | 'no_subscription_found'
  | 'subscription_expired'
  | 'trial_expired'
  | 'tamper_detected_locked'
  | 'check_error';

// ============ أنواع التدقيق ============

export type SubscriptionAuditEventType =
  | 'ACTIVATION_ATTEMPT'
  | 'ACTIVATION_SUCCESS'
  | 'ACTIVATION_FAILED'
  | 'VALIDATION_SUCCESS'
  | 'VALIDATION_FAILED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'TAMPER_DETECTED'
  | 'CLOCK_TAMPER'
  | 'CACHE_CLEARED'
  | 'SYNC_SUCCESS'
  | 'SYNC_FAILED'
  | 'OFFLINE_ACCESS'
  | 'ERROR';

export interface SubscriptionAuditLog {
  id: string;
  timestamp: string;
  event_type: SubscriptionAuditEventType;
  organization_id: string;
  user_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  synced: boolean;
}

// ============ أنواع التشفير ============

export interface EncryptedSubscriptionData {
  iv: string;
  data: string;
  signature: string;
  timestamp: number;
  version: string;
}

export interface DecryptionResult {
  valid: boolean;
  data: SubscriptionCheckResult | null;
  error?: string;
  tamperDetected?: boolean;
}

// ============ أنواع SecureClock ============

export interface SecureClockResult {
  secureNowMs: number;
  tamperDetected: boolean;
  tamperCount: number;
  isLocked: boolean;
}

export interface TamperTrackerEntry {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}
