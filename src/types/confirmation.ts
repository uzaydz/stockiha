export type ConfirmationAccessScope =
  | 'orders_v2'
  | 'orders_mobile'
  | 'blocked_customers'
  | 'abandoned_orders'
  | 'analytics'
  | 'settings';

export type ConfirmationCompensationMode = 'monthly' | 'per_order' | 'hybrid';

export interface ConfirmationCompensationSettings {
  currency: string;
  monthly_amount?: number;
  per_order_amount?: number;
  payment_cycle?: 'monthly' | 'weekly' | 'biweekly' | 'per_order';
  hybrid_ratio?: number; // used when mode === 'hybrid'
  bonus_rules?: Array<{
    threshold: number;
    reward: number;
    metric: 'confirmed_orders' | 'conversion_rate' | 'productivity_score';
  }>;
}

export interface ConfirmationAssignmentPreference {
  preferred_products?: string[];
  preferred_categories?: string[];
  excluded_products?: string[];
  coverage_regions?: string[];
  skill_tags?: string[];
  priority_levels?: Array<'vip' | 'normal' | 'low'>;
}

export interface ConfirmationWorkloadSettings {
  daily_target: number;
  max_queue_size: number;
  rotation_mode: 'fair' | 'performance' | 'product_specialist';
  auto_pause_threshold?: number;
}

export interface ConfirmationAgent {
  id: string;
  organization_id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: 'active' | 'paused' | 'inactive' | 'invited' | 'archived';
  access_scope: ConfirmationAccessScope[];
  assignment_preferences: ConfirmationAssignmentPreference;
  compensation_mode: ConfirmationCompensationMode;
  compensation_settings: ConfirmationCompensationSettings;
  workload_settings: ConfirmationWorkloadSettings;
  default_queue: {
    type: 'priority' | 'round_robin' | 'custom';
    sequence: string[];
  };
  notification_settings: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
  preferences?: Record<string, unknown>;
  notes?: string | null;
  invitation_sent_at?: string | null;
  onboarding_completed_at?: string | null;
  last_active_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfirmationCompensationPlan {
  id: string;
  agent_id: string;
  organization_id: string;
  plan_name: string;
  plan_type: ConfirmationCompensationMode;
  currency: string;
  monthly_amount?: number | null;
  per_order_amount?: number | null;
  bonus_rules: ConfirmationCompensationSettings['bonus_rules'];
  effective_from: string;
  effective_to?: string | null;
  auto_renew: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ConfirmationRuleType =
  | 'product'
  | 'category'
  | 'fair_rotation'
  | 'priority'
  | 'region'
  | 'custom';

export interface ConfirmationAssignmentRule {
  id: string;
  organization_id: string;
  rule_name: string;
  rule_type: ConfirmationRuleType;
  is_active: boolean;
  priority: number;
  config: Record<string, unknown>;
  fallback_rule_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ConfirmationAssignmentStatus =
  | 'assigned'
  | 'in_progress'
  | 'confirmed'
  | 'cancelled'
  | 'reassigned'
  | 'skipped';

export type ConfirmationAssignmentStrategy =
  | 'manual'
  | 'product_match'
  | 'fair_rotation'
  | 'priority'
  | 'auto';

export interface ConfirmationOrderAssignment {
  id: string;
  organization_id: string;
  order_id: string;
  agent_id?: string | null;
  rule_id?: string | null;
  assignment_strategy: ConfirmationAssignmentStrategy;
  assignment_reason?: string | null;
  queue_snapshot: Record<string, unknown>;
  compensation_snapshot: ConfirmationCompensationSettings | Record<string, unknown>;
  status: ConfirmationAssignmentStatus;
  confirmed_at?: string | null;
  confirmation_notes?: string | null;
  reassigned_to?: string | null;
  reassigned_at?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  online_orders?: {
    id: string;
    customer_order_number?: number | null;
    form_data?: Record<string, unknown> | null;
    total?: number | null;
    status?: string | null;
    customer_name?: string | null;
    customer_contact?: string | null;
    shipping_provider?: string | null;
    created_at?: string | null;
  } | null;
}

export type ConfirmationPaymentStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type ConfirmationPaymentType = 'salary' | 'per_order' | 'bonus' | 'adjustment';

export interface ConfirmationAgentPayment {
  id: string;
  organization_id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  payment_type: ConfirmationPaymentType;
  status: ConfirmationPaymentStatus;
  amount: number;
  currency: string;
  generated_from: string;
  breakdown: Array<{
    label: string;
    value: number;
    count?: number;
  }>;
  notes?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfirmationAgentReward {
  id: string;
  organization_id: string;
  agent_id: string;
  reward_type: string;
  reward_value: number;
  metadata: Record<string, unknown>;
  awarded_by?: string | null;
  awarded_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmationAgentPerformanceSnapshot {
  id: string;
  organization_id: string;
  agent_id: string;
  snapshot_date: string;
  total_assigned: number;
  total_confirmed: number;
  total_cancelled: number;
  total_pending: number;
  contact_attempts: number;
  successful_contacts: number;
  average_response_minutes: number;
  average_handling_minutes: number;
  conversion_rate: number;
  productivity_score: number;
  queue_position?: number | null;
  bonus_earned: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConfirmationQueueEntry {
  assignmentId: string;
  orderId: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  priority?: number;
  segmentation?: string;
}

export interface ConfirmationOrganizationSettings {
  organization_id: string;
  auto_assignment_enabled: boolean;
  default_strategy: 'fair_rotation' | 'product' | 'priority' | 'region';
  escalation_minutes: number;
  queue_rebalancing_minutes: number;
  auto_assignment_windows: {
    weekdays: string[];
    hours: {
      start: string;
      end: string;
    };
  };
  segmentation_defaults: {
    product?: string[];
    priority?: string[];
    regions?: string[];
  };
  compensation_defaults: {
    mode: ConfirmationCompensationMode;
    monthly_amount?: number;
    per_order_amount?: number;
  };
  reminders_settings: {
    pending_followups: boolean;
    bonus_alerts: boolean;
    queue_threshold: number;
  };
  created_at: string;
  updated_at: string;
}
