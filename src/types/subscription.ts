/**
 * 📋 Stokiha Subscription Plans - خطط الاشتراك
 *
 * الخطط المتاحة:
 * - البداية (starter_v2): 2,500 دج - 600 منتج، مستخدم واحد، نقطة بيع واحدة
 * - النمو (growth_v2): 5,000 دج - 1,000 منتج، 3 مستخدمين، نقطتا بيع
 * - الأعمال (business_v2): 7,500 دج - 5,000 منتج، 7 مستخدمين، 5 نقاط بيع
 * - المؤسسات (enterprise_v2): 12,500 دج - غير محدود، 15 مستخدم، 10 نقاط بيع
 * - غير محدود (unlimited_v2): 20,000 دج - كل شيء غير محدود
 */

export interface SubscriptionPlanLimits {
  max_products: number | null;
  max_users: number | null;
  max_pos: number | null;
  max_branches: number | null;
  max_staff: number | null;
  max_customers: number | null;
  max_suppliers: number | null;
}

export interface SubscriptionPlanPermissions {
  all_features: boolean;
  accessPOS: boolean;
  offlineMode: boolean;
  realtimeSync: boolean;
  invoicing: boolean;
  inventory: boolean;
  customers: boolean;
  suppliers: boolean;
  repairs: boolean;
  ecommerce: boolean;
  delivery: boolean;
  staff: boolean;
  reports: boolean;
  analytics: boolean;
  zakat: boolean;
  expenses: boolean;
  debts: boolean;
  callCenter: boolean;
  aiAssistant: boolean;
  courses: boolean;
  api?: boolean;
  whiteLabel?: boolean;
  customDomain?: boolean;
  support: 'email' | 'priority' | 'premium' | 'dedicated' | 'vip';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: SubscriptionPlanLimits;
  permissions: SubscriptionPlanPermissions;
  max_online_orders: number | null;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// أكواد الخطط المتاحة
export type PlanCode =
  | 'trial'
  | 'starter_v2'
  | 'growth_v2'
  | 'business_v2'
  | 'enterprise_v2'
  | 'unlimited_v2';

// أسعار الخطط بالدينار الجزائري
export const PLAN_PRICES: Record<PlanCode, { monthly: number; yearly: number }> = {
  trial: { monthly: 0, yearly: 0 },
  starter_v2: { monthly: 2500, yearly: 25000 },
  growth_v2: { monthly: 5000, yearly: 50000 },
  business_v2: { monthly: 7500, yearly: 75000 },
  enterprise_v2: { monthly: 12500, yearly: 125000 },
  unlimited_v2: { monthly: 20000, yearly: 200000 }
};

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
  max_branches?: string | number | null;
  max_staff?: string | number | null;
  max_customers?: string | number | null;
  max_suppliers?: string | number | null;
}

// ============ أنواع المميزات ============

export type FeatureCategory =
  | 'pos_management'
  | 'ecommerce'
  | 'delivery'
  | 'repairs'
  | 'staff'
  | 'ai'
  | 'analytics'
  | 'support';

export interface StokihaFeature {
  id: string;
  category: FeatureCategory;
  category_icon: string;
  feature_key: string;
  feature_name_ar: string;
  feature_name_en?: string;
  feature_description_ar: string;
  feature_description_en?: string;
  is_core: boolean;
  display_order: number;
}

// ============ التحقق من الحدود ============

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining?: number;
  unlimited: boolean;
}

export interface SubscriptionSummary {
  plan_name: string;
  status: SubscriptionStatus;
  end_date: string | null;
  days_remaining: number | null;
  limits: SubscriptionPlanLimits;
  usage: {
    products: number;
    users: number;
  };
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
