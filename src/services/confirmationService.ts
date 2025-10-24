import { supabase } from '@/lib/supabase';
import type {
  ConfirmationAgent,
  ConfirmationAssignmentPreference,
  ConfirmationAssignmentRule,
  ConfirmationAssignmentStatus,
  ConfirmationAssignmentStrategy,
  ConfirmationOrderAssignment,
  ConfirmationCompensationPlan,
  ConfirmationCompensationSettings,
  ConfirmationAgentPayment,
  ConfirmationAgentReward,
  ConfirmationAgentPerformanceSnapshot,
  ConfirmationCompensationMode,
  ConfirmationPaymentStatus,
  ConfirmationPaymentType,
  ConfirmationOrganizationSettings,
} from '@/types/confirmation';

type ServiceError = {
  message: string;
  code?: string;
  missingSchema?: boolean;
};

interface ServiceResponse<T> {
  data: T | null;
  error?: ServiceError;
}

const isMissingSchemaError = (error: any) =>
  error?.code === '42P01' || error?.hint?.includes('relation') || error?.message?.includes('does not exist');

const buildError = (error: any): ServiceError => ({
  message: error?.message || 'حدث خطأ غير متوقع في نظام التأكيد',
  code: error?.code,
  missingSchema: isMissingSchemaError(error),
});

export const confirmationService = {
  async fetchAgents(organizationId: string): Promise<ServiceResponse<ConfirmationAgent[]>> {
    if (!organizationId) {
      return { data: [] };
    }

    const { data, error } = await supabase
      .from('confirmation_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true });

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationAgent[] };
  },

  async createAgent(
    organizationId: string,
    payload: {
      full_name: string;
      email?: string;
      phone?: string;
      user_id?: string;
      status?: ConfirmationAgent['status'];
      access_scope?: ConfirmationAgent['access_scope'];
      assignment_preferences?: ConfirmationAssignmentPreference;
      compensation_mode?: ConfirmationCompensationMode;
      compensation_settings?: ConfirmationCompensationSettings;
      workload_settings?: ConfirmationAgent['workload_settings'];
      default_queue?: ConfirmationAgent['default_queue'];
      notification_settings?: ConfirmationAgent['notification_settings'];
      notes?: string;
      created_by?: string;
    }
  ): Promise<ServiceResponse<ConfirmationAgent>> {
    const insertPayload = {
      organization_id: organizationId,
      status: 'active',
      ...payload,
    };

    const { data, error } = await supabase
      .from('confirmation_agents')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationAgent };
  },

  async updateAgent(agentId: string, updates: Partial<ConfirmationAgent>): Promise<ServiceResponse<ConfirmationAgent>> {
    const { data, error } = await supabase
      .from('confirmation_agents')
      .update(updates)
      .eq('id', agentId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationAgent };
  },

  async fetchCompensationPlans(agentId: string): Promise<ServiceResponse<ConfirmationCompensationPlan[]>> {
    const { data, error } = await supabase
      .from('confirmation_agent_compensation_plans')
      .select('*')
      .eq('agent_id', agentId)
      .order('effective_from', { ascending: false });

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationCompensationPlan[] };
  },

  async upsertCompensationPlan(
    organizationId: string,
    plan: Partial<ConfirmationCompensationPlan> & { agent_id: string }
  ): Promise<ServiceResponse<ConfirmationCompensationPlan>> {
    const upsertPayload = {
      organization_id: organizationId,
      ...plan,
    };

    const { data, error } = await supabase
      .from('confirmation_agent_compensation_plans')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationCompensationPlan };
  },

  async fetchAssignmentRules(organizationId: string): Promise<ServiceResponse<ConfirmationAssignmentRule[]>> {
    const { data, error } = await supabase
      .from('confirmation_assignment_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('priority', { ascending: true });

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationAssignmentRule[] };
  },

  async upsertAssignmentRule(
    organizationId: string,
    rule: Partial<ConfirmationAssignmentRule>
  ): Promise<ServiceResponse<ConfirmationAssignmentRule>> {
    const payload = {
      organization_id: organizationId,
      priority: 1,
      is_active: true,
      ...rule,
    };

    const { data, error } = await supabase
      .from('confirmation_assignment_rules')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationAssignmentRule };
  },

  async deleteAssignmentRule(ruleId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase
      .from('confirmation_assignment_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      return { data: false, error: buildError(error) };
    }

    return { data: true };
  },

  async fetchAssignments(
    organizationId: string,
    options: {
      status?: ConfirmationAssignmentStatus[];
      agentId?: string;
      orderIds?: string[];
      limit?: number;
    } = {}
  ): Promise<ServiceResponse<ConfirmationOrderAssignment[]>> {
    // console.log('📡 [confirmationService] fetchAssignments بدء', { organizationId, options });
    
    let query = supabase
      .from('confirmation_order_assignments')
      .select(`
        *,
        online_orders (
          id,
          customer_order_number,
          form_data,
          total,
          status,
          created_at
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.status?.length) {
      // console.log('🔍 [confirmationService] تصفية حسب الحالة:', options.status);
      query = query.in('status', options.status);
    }

    if (options.agentId) {
      // console.log('👤 [confirmationService] تصفية حسب الموظف:', options.agentId);
      query = query.eq('agent_id', options.agentId);
    }

    if (options.orderIds?.length) {
      // console.log('📦 [confirmationService] تصفية حسب الطلبات:', options.orderIds);
      query = query.in('order_id', options.orderIds);
    }

    if (options.limit) {
      // console.log('📏 [confirmationService] تحديد الحد الأقصى:', options.limit);
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    // console.log('📊 [confirmationService] نتائج fetchAssignments:', {
    //   count: data?.length || 0,
    //   error: error?.message,
    //   assignments: data?.map(a => ({
    //     id: a.id,
    //     order_id: a.order_id,
    //     agent_id: a.agent_id,
    //     status: a.status,
    //     order_number: a.online_orders?.customer_order_number
    //   }))
    // });

    if (error) {
      // console.error('❌ [confirmationService] خطأ في fetchAssignments:', error);
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationOrderAssignment[] };
  },

  async assignOrder(payload: {
    organization_id: string;
    order_id: string;
    agent_id?: string | null;
    rule_id?: string | null;
    assignment_strategy?: ConfirmationAssignmentStrategy;
    assignment_reason?: string | null;
    queue_snapshot?: Record<string, unknown>;
    compensation_snapshot?: ConfirmationCompensationSettings | Record<string, unknown>;
    created_by?: string | null;
  }): Promise<ServiceResponse<ConfirmationOrderAssignment>> {
    const { data, error } = await supabase
      .from('confirmation_order_assignments')
      .insert({
        assignment_strategy: 'manual',
        assignment_reason: null,
        queue_snapshot: {},
        compensation_snapshot: {},
        status: 'assigned',
        ...payload,
      })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationOrderAssignment };
  },

  async updateAssignment(
    assignmentId: string,
    updates: Partial<ConfirmationOrderAssignment>
  ): Promise<ServiceResponse<ConfirmationOrderAssignment>> {
    const { data, error } = await supabase
      .from('confirmation_order_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationOrderAssignment };
  },

  async fetchPayments(
    organizationId: string,
    filters: {
      agentId?: string;
      status?: ConfirmationPaymentStatus[];
      periodStart?: string;
      periodEnd?: string;
    } = {}
  ): Promise<ServiceResponse<ConfirmationAgentPayment[]>> {
    let query = supabase
      .from('confirmation_agent_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });

    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId);
    }

    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters.periodStart) {
      query = query.gte('period_start', filters.periodStart);
    }

    if (filters.periodEnd) {
      query = query.lte('period_end', filters.periodEnd);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationAgentPayment[] };
  },

  async upsertPayment(
    organizationId: string,
    payload: Partial<ConfirmationAgentPayment> & {
      agent_id: string;
      period_start: string;
      period_end: string;
      payment_type: ConfirmationPaymentType;
      status?: ConfirmationPaymentStatus;
      amount: number;
    }
  ): Promise<ServiceResponse<ConfirmationAgentPayment>> {
    const upsertPayload = {
      organization_id: organizationId,
      status: 'pending',
      currency: 'DZD',
      breakdown: [],
      generated_from: 'manual',
      ...payload,
    };

    const { data, error } = await supabase
      .from('confirmation_agent_payments')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationAgentPayment };
  },

  async fetchRewards(
    organizationId: string,
    agentId?: string
  ): Promise<ServiceResponse<ConfirmationAgentReward[]>> {
    let query = supabase
      .from('confirmation_agent_rewards')
      .select('*')
      .eq('organization_id', organizationId)
      .order('awarded_at', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationAgentReward[] };
  },

  async awardReward(
    organizationId: string,
    payload: {
      agent_id: string;
      reward_type: string;
      reward_value?: number;
      metadata?: Record<string, unknown>;
      awarded_by?: string;
    }
  ): Promise<ServiceResponse<ConfirmationAgentReward>> {
    const { data, error } = await supabase
      .from('confirmation_agent_rewards')
      .insert({
        organization_id: organizationId,
        reward_value: 0,
        metadata: {},
        ...payload,
      })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationAgentReward };
  },

  async fetchPerformanceSnapshots(
    organizationId: string,
    filters: {
      agentIds?: string[];
      from?: string;
      to?: string;
      limit?: number;
    } = {}
  ): Promise<ServiceResponse<ConfirmationAgentPerformanceSnapshot[]>> {
    let query = supabase
      .from('confirmation_agent_performance_daily')
      .select('*')
      .eq('organization_id', organizationId)
      .order('snapshot_date', { ascending: false });

    if (filters.agentIds?.length) {
      query = query.in('agent_id', filters.agentIds);
    }

    if (filters.from) {
      query = query.gte('snapshot_date', filters.from);
    }

    if (filters.to) {
      query = query.lte('snapshot_date', filters.to);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as ConfirmationAgentPerformanceSnapshot[] };
  },

  async fetchPerformanceOverview(
    organizationId: string
  ): Promise<ServiceResponse<ConfirmationAgentPerformanceSnapshot[]>> {
    const { data, error } = await supabase
      .from('confirmation_agent_performance_overview')
      .select('*')
      .eq('organization_id', organizationId)
      .order('snapshot_date', { ascending: false })
      .limit(500);

    if (error) {
      return { data: [], error: buildError(error) };
    }

    return { data: data as unknown as ConfirmationAgentPerformanceSnapshot[] };
  },
  async fetchOrganizationSettings(
    organizationId: string
  ): Promise<ServiceResponse<ConfirmationOrganizationSettings>> {
    const { data, error } = await supabase
      .from('confirmation_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    if (!data) {
      return {
        data: {
          organization_id: organizationId,
          auto_assignment_enabled: true,
          default_strategy: 'fair_rotation',
          escalation_minutes: 45,
          queue_rebalancing_minutes: 15,
          auto_assignment_windows: { weekdays: ['sat', 'sun', 'mon', 'tue', 'wed'], hours: { start: '09:00', end: '19:00' } },
          segmentation_defaults: { product: [], priority: ['vip', 'normal'], regions: [] },
          compensation_defaults: { mode: 'monthly', monthly_amount: 45000, per_order_amount: 200 },
          reminders_settings: { pending_followups: true, bonus_alerts: true, queue_threshold: 10 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    return { data: data as ConfirmationOrganizationSettings };
  },

  async upsertOrganizationSettings(
    organizationId: string,
    settings: Partial<ConfirmationOrganizationSettings>
  ): Promise<ServiceResponse<ConfirmationOrganizationSettings>> {
    const payload = {
      organization_id: organizationId,
      ...settings,
    };

    const { data, error } = await supabase
      .from('confirmation_settings')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: buildError(error) };
    }

    return { data: data as ConfirmationOrganizationSettings };
  },
};

export type ConfirmationService = typeof confirmationService;
