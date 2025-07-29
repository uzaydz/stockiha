import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// تعريف الأنواع
export interface CallCenterDistributionRule {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  rule_type: 'region' | 'workload' | 'performance' | 'availability' | 'specialization' | 'time_based' | 'order_value';
  priority_order: number;
  is_active: boolean;
  conditions: {
    regions?: string[];
    min_order_value?: number;
    max_order_value?: number;
    product_categories?: string[];
    time_slots?: Array<{
      start: string;
      end: string;
      days: string[];
    }>;
    agent_specializations?: string[];
    max_current_orders?: number;
    min_performance_score?: number;
  };
  actions: {
    assign_to_agents?: string[];
    priority_level?: number;
    max_attempts?: number;
    call_interval_minutes?: number;
    escalate_after_attempts?: number;
    fallback_rule_id?: string;
  };
  usage_count: number;
  success_rate: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CallCenterOrderAssignment {
  id: string;
  order_id: string;
  agent_id: string;
  organization_id: string;
  assignment_type: 'auto' | 'manual' | 'priority' | 'expert' | 'region_based';
  assignment_reason?: string;
  distribution_rule_id?: string;
  assigned_at: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'transferred' | 'cancelled' | 'expired';
  priority_level: number;
  call_attempts: number;
  max_call_attempts: number;
  last_call_attempt?: string;
  next_call_scheduled?: string;
  call_status?: 'pending' | 'answered' | 'no_answer' | 'busy' | 'failed' | 'voicemail';
  call_outcome?: 'confirmed' | 'cancelled' | 'modified' | 'reschedule' | 'no_contact' | 'wrong_number';
  call_duration?: number;
  call_notes?: string;
  completion_time?: string;
  completion_reason?: string;
  agent_rating?: number;
  customer_satisfaction?: number;
  transferred_to_agent_id?: string;
  transfer_reason?: string;
  transferred_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkload {
  id: string;
  agent_id: string;
  organization_id: string;
  date: string;
  assigned_orders: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_call_duration: number;
  response_time_avg: number;
  customer_satisfaction_avg: number;
  completion_rate: number;
  is_available: boolean;
  availability_hours: number;
  actual_work_hours: number;
  last_updated: string;
}

export interface CallCenterDistributionSettings {
  auto_assignment: boolean;
  max_orders_per_agent: number;
  call_retry_interval: number;
  max_retry_attempts: number;
  working_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  weekend_enabled: boolean;
  priority_rules: {
    high_value_threshold: number;
    vip_customer_priority: boolean;
    urgent_order_priority: boolean;
  };
  escalation_rules: {
    no_answer_escalate_after: number;
    failed_call_escalate_after: number;
    escalate_to_supervisor: boolean;
  };
  performance_weights: {
    availability: number;
    success_rate: number;
    customer_satisfaction: number;
  };
}

export interface UseCallCenterDistributionReturn {
  // البيانات
  rules: CallCenterDistributionRule[];
  assignments: CallCenterOrderAssignment[];
  agentWorkloads: AgentWorkload[];
  settings: CallCenterDistributionSettings | null;
  
  // حالات التحميل
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // العمليات
  createRule: (rule: Omit<CallCenterDistributionRule, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'success_rate'>) => Promise<boolean>;
  updateRule: (id: string, updates: Partial<CallCenterDistributionRule>) => Promise<boolean>;
  deleteRule: (id: string) => Promise<boolean>;
  toggleRule: (id: string) => Promise<boolean>;
  
  assignOrderToAgent: (orderId: string, agentId: string, priority?: number) => Promise<boolean>;
  autoAssignOrder: (orderId: string) => Promise<boolean>;
  transferAssignment: (assignmentId: string, newAgentId: string, reason: string) => Promise<boolean>;
  updateAssignmentStatus: (assignmentId: string, status: CallCenterOrderAssignment['status'], notes?: string) => Promise<boolean>;
  
  updateSettings: (newSettings: Partial<CallCenterDistributionSettings>) => Promise<boolean>;
  
  // تحديث البيانات
  refresh: () => Promise<void>;
  refreshAgentWorkloads: () => Promise<void>;
}

export const useCallCenterDistribution = (): UseCallCenterDistributionReturn => {
  const [rules, setRules] = useState<CallCenterDistributionRule[]>([]);
  const [assignments, setAssignments] = useState<CallCenterOrderAssignment[]>([]);
  const [agentWorkloads, setAgentWorkloads] = useState<AgentWorkload[]>([]);
  const [settings, setSettings] = useState<CallCenterDistributionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  // جلب جميع البيانات
  const fetchAllData = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // جلب القواعد
      const { data: rulesData, error: rulesError } = await supabase
        .from('call_center_distribution_rules')
        .select('*')
        .eq('organization_id', organization.id)
        .order('priority_order', { ascending: true });

      if (rulesError) throw rulesError;

      // جلب التوزيعات النشطة
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('call_center_order_assignments')
        .select(`
          *,
          online_orders (
            id,
            form_data,
            total,
            status,
            created_at
          ),
          call_center_agents!call_center_order_assignments_agent_id_fkey (
            id,
            users (name, email)
          )
        `)
        .eq('organization_id', organization.id)
        .in('status', ['assigned', 'in_progress'])
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // جلب أعباء العمل
      const { data: workloadsData, error: workloadsError } = await supabase
        .from('call_center_agent_workload')
        .select(`
          *,
          call_center_agents!call_center_agent_workload_agent_id_fkey (
            id,
            users (name, email)
          )
        `)
        .eq('organization_id', organization.id)
        .eq('date', new Date().toISOString().split('T')[0]);

      if (workloadsError) throw workloadsError;

      // جلب الإعدادات
      const { data: settingsData, error: settingsError } = await supabase
        .from('order_distribution_settings')
        .select('call_center_settings')
        .eq('organization_id', organization.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      setRules(rulesData || []);
      setAssignments(assignmentsData || []);
      setAgentWorkloads(workloadsData || []);
      setSettings(settingsData?.call_center_settings || getDefaultSettings());

    } catch (err: any) {
      setError('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  // الإعدادات الافتراضية
  const getDefaultSettings = (): CallCenterDistributionSettings => ({
    auto_assignment: true,
    max_orders_per_agent: 10,
    call_retry_interval: 30,
    max_retry_attempts: 3,
    working_hours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Asia/Riyadh'
    },
    weekend_enabled: false,
    priority_rules: {
      high_value_threshold: 1000,
      vip_customer_priority: true,
      urgent_order_priority: true
    },
    escalation_rules: {
      no_answer_escalate_after: 2,
      failed_call_escalate_after: 3,
      escalate_to_supervisor: true
    },
    performance_weights: {
      availability: 0.3,
      success_rate: 0.4,
      customer_satisfaction: 0.3
    }
  });

  // إنشاء قاعدة جديدة
  const createRule = useCallback(async (newRule: Omit<CallCenterDistributionRule, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'success_rate'>): Promise<boolean> => {
    if (!organization?.id) return false;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('call_center_distribution_rules')
        .insert({
          ...newRule,
          organization_id: organization.id,
          usage_count: 0,
          success_rate: 0
        })
        .select()
        .single();

      if (error) throw error;

      setRules(prev => [...prev, data].sort((a, b) => a.priority_order - b.priority_order));
      toast.success('تم إنشاء القاعدة بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في إنشاء القاعدة');
      return false;
    } finally {
      setSaving(false);
    }
  }, [organization?.id]);

  // تحديث قاعدة
  const updateRule = useCallback(async (id: string, updates: Partial<CallCenterDistributionRule>): Promise<boolean> => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('call_center_distribution_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRules(prev => prev.map(rule => rule.id === id ? data : rule));
      toast.success('تم تحديث القاعدة بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في تحديث القاعدة');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // حذف قاعدة
  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('call_center_distribution_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== id));
      toast.success('تم حذف القاعدة بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في حذف القاعدة');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // تفعيل/إلغاء تفعيل قاعدة
  const toggleRule = useCallback(async (id: string): Promise<boolean> => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return false;

    return await updateRule(id, { is_active: !rule.is_active });
  }, [rules, updateRule]);

  // توزيع طلب يدوياً
  const assignOrderToAgent = useCallback(async (orderId: string, agentId: string, priority: number = 3): Promise<boolean> => {
    if (!organization?.id) return false;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('call_center_order_assignments')
        .insert({
          order_id: orderId,
          agent_id: agentId,
          organization_id: organization.id,
          assignment_type: 'manual',
          assignment_reason: 'Manual assignment by admin',
          priority_level: priority,
          max_call_attempts: settings?.max_retry_attempts || 3
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAllData(); // إعادة تحميل البيانات
      toast.success('تم توزيع الطلب بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في توزيع الطلب');
      return false;
    } finally {
      setSaving(false);
    }
  }, [organization?.id, settings, fetchAllData]);

  // توزيع تلقائي للطلب
  const autoAssignOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!organization?.id) return false;

    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('auto_assign_order_to_agent', {
        p_order_id: orderId,
        p_organization_id: organization.id
      });

      if (error) throw error;

      if (data?.success) {
        await fetchAllData(); // إعادة تحميل البيانات
        toast.success('تم التوزيع التلقائي بنجاح');
        return true;
      } else {
        toast.error(data?.error || 'فشل في التوزيع التلقائي');
        return false;
      }
    } catch (err: any) {
      toast.error('فشل في التوزيع التلقائي');
      return false;
    } finally {
      setSaving(false);
    }
  }, [organization?.id, fetchAllData]);

  // تحويل مهمة لوكيل آخر
  const transferAssignment = useCallback(async (assignmentId: string, newAgentId: string, reason: string): Promise<boolean> => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('call_center_order_assignments')
        .update({
          transferred_to_agent_id: newAgentId,
          transfer_reason: reason,
          transferred_at: new Date().toISOString(),
          status: 'transferred',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      await fetchAllData(); // إعادة تحميل البيانات
      toast.success('تم تحويل المهمة بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في تحويل المهمة');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAllData]);

  // تحديث حالة التوزيع
  const updateAssignmentStatus = useCallback(async (assignmentId: string, status: CallCenterOrderAssignment['status'], notes?: string): Promise<boolean> => {
    try {
      setSaving(true);
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completion_time = new Date().toISOString();
        updateData.completion_reason = 'Task completed successfully';
      }

      if (notes) {
        updateData.call_notes = notes;
      }

      const { error } = await supabase
        .from('call_center_order_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchAllData(); // إعادة تحميل البيانات
      toast.success('تم تحديث الحالة بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في تحديث الحالة');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAllData]);

  // تحديث الإعدادات
  const updateSettings = useCallback(async (newSettings: Partial<CallCenterDistributionSettings>): Promise<boolean> => {
    if (!organization?.id || !settings) return false;

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from('order_distribution_settings')
        .update({
          call_center_settings: updatedSettings,
          call_center_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organization.id);

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('تم حفظ الإعدادات بنجاح');
      return true;
    } catch (err: any) {
      toast.error('فشل في حفظ الإعدادات');
      return false;
    } finally {
      setSaving(false);
    }
  }, [organization?.id, settings]);

  // تحديث أعباء العمل
  const refreshAgentWorkloads = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('call_center_agent_workload')
        .select(`
          *,
          call_center_agents (
            id,
            users (name, email)
          )
        `)
        .eq('organization_id', organization.id)
        .eq('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      setAgentWorkloads(data || []);
    } catch (err: any) {
    }
  }, [organization?.id]);

  // تحديث عام للبيانات
  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  // تحميل البيانات عند البدء
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    // البيانات
    rules,
    assignments,
    agentWorkloads,
    settings,
    
    // حالات التحميل
    loading,
    saving,
    error,
    
    // العمليات
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    assignOrderToAgent,
    autoAssignOrder,
    transferAssignment,
    updateAssignmentStatus,
    updateSettings,
    
    // تحديث البيانات
    refresh,
    refreshAgentWorkloads
  };
};
