import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { confirmationService } from '@/services/confirmationService';
import { supabase } from '@/lib/supabase';
import type {
  ConfirmationAgent,
  ConfirmationAssignmentRule,
  ConfirmationOrderAssignment,
  ConfirmationCompensationMode,
  ConfirmationCompensationSettings,
  ConfirmationAgentPayment,
  ConfirmationAgentReward,
  ConfirmationAgentPerformanceSnapshot,
  ConfirmationOrganizationSettings,
} from '@/types/confirmation';


interface ConfirmationContextValue {
  loading: boolean;
  refreshing: boolean;
  missingSchema: boolean;
  error?: string | null;

  agents: ConfirmationAgent[];
  agentById: Record<string, ConfirmationAgent>;
  assignmentRules: ConfirmationAssignmentRule[];
  assignments: ConfirmationOrderAssignment[];
  assignmentsByOrderId: Record<string, ConfirmationOrderAssignment>;
  payments: ConfirmationAgentPayment[];
  rewards: ConfirmationAgentReward[];
  performanceSnapshots: ConfirmationAgentPerformanceSnapshot[];
  organizationSettings: ConfirmationOrganizationSettings | null;

  refreshAll: () => Promise<void>;
  refreshAssignments: (orderIds?: string[]) => Promise<void>;
  setMissingSchemaAcknowledged: () => void;

  createAgent: (
    payload: {
      full_name: string;
      email?: string;
      phone?: string;
      user_id?: string;
      access_scope?: ConfirmationAgent['access_scope'];
      assignment_preferences?: ConfirmationAgent['assignment_preferences'];
      compensation_mode?: ConfirmationCompensationMode;
      compensation_settings?: ConfirmationCompensationSettings;
      notes?: string;
      password?: string;
    }
  ) => Promise<{ agent: ConfirmationAgent; authFallback: boolean } | null>;

  updateAgent: (
    agentId: string,
    updates: Partial<ConfirmationAgent>
  ) => Promise<ConfirmationAgent | null>;

  toggleAgentStatus: (agentId: string, status: ConfirmationAgent['status']) => Promise<void>;

  upsertAssignmentRule: (
    rule: Partial<ConfirmationAssignmentRule>
  ) => Promise<ConfirmationAssignmentRule | null>;

  deleteAssignmentRule: (ruleId: string) => Promise<boolean>;

  recordAssignment: (
    payload: {
      order_id: string;
      agent_id?: string | null;
      rule_id?: string | null;
      assignment_strategy?: ConfirmationOrderAssignment['assignment_strategy'];
      assignment_reason?: string | null;
      queue_snapshot?: Record<string, unknown>;
      compensation_snapshot?: Record<string, unknown>;
    }
  ) => Promise<ConfirmationOrderAssignment | null>;

  updateAssignment: (
    assignmentId: string,
    updates: Partial<ConfirmationOrderAssignment>
  ) => Promise<ConfirmationOrderAssignment | null>;

  recordPayment: (
    payload: Parameters<typeof confirmationService.upsertPayment>[1]
  ) => Promise<ConfirmationAgentPayment | null>;

  recordReward: (
    payload: Parameters<typeof confirmationService.awardReward>[1]
  ) => Promise<ConfirmationAgentReward | null>;

  saveOrganizationSettings: (
    settings: Partial<ConfirmationOrganizationSettings>
  ) => Promise<ConfirmationOrganizationSettings | null>;
}

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined);

const DEFAULT_CONFIRMATION_SCOPE: ConfirmationAgent['access_scope'] = [
  'orders_v2',
  'orders_mobile',
  'blocked_customers',
  'abandoned_orders',
  'analytics',
  'settings',
];

const DEFAULT_COMPENSATION_SETTINGS: ConfirmationCompensationSettings = {
  currency: 'DZD',
  monthly_amount: 0,
  per_order_amount: 0,
  payment_cycle: 'monthly',
};

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const location = useLocation();

  const organizationId = currentOrganization?.id || null;

  // دالة احتياطية لإنشاء وكيل التأكيد
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [missingSchema, setMissingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agents, setAgents] = useState<ConfirmationAgent[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<ConfirmationAssignmentRule[]>([]);
  const [assignments, setAssignments] = useState<ConfirmationOrderAssignment[]>([]);
  const [payments, setPayments] = useState<ConfirmationAgentPayment[]>([]);
  const [rewards, setRewards] = useState<ConfirmationAgentReward[]>([]);
  const [performanceSnapshots, setPerformanceSnapshots] = useState<ConfirmationAgentPerformanceSnapshot[]>([]);
  const [organizationSettings, setOrganizationSettings] = useState<ConfirmationOrganizationSettings | null>(null);

  const initializedRef = useRef(false);

  const shouldAutoLoad = useMemo(() => {
    const pathname = location.pathname || '';
    if (!pathname) return false;

    const normalizedPath = pathname.replace(/\/+$/, '');
    const autoLoadPrefixes = [
      '/dashboard/orders-v2',
      '/dashboard/confirmation-center',
      '/dashboard/confirmation',
      '/confirmation/workspace',
      '/confirmation',
    ];

    return autoLoadPrefixes.some((prefix) => {
      if (normalizedPath === prefix) return true;
      return normalizedPath.startsWith(`${prefix}/`);
    });
  }, [location.pathname]);

  const setSchemaFromError = useCallback((serviceError?: { missingSchema?: boolean; message?: string }) => {
    if (serviceError?.missingSchema) {
      setMissingSchema(true);
      if (!error) {
        setError('نظام التأكيد غير مهيأ بعد. يرجى تنفيذ ملف supabase/confirmation_system.sql.');
      }
    } else if (serviceError?.message) {
      setError(serviceError.message);
    }
  }, [error]);

  const resetState = useCallback(() => {
    setAgents([]);
    setAssignmentRules([]);
    setAssignments([]);
    setPayments([]);
    setRewards([]);
    setPerformanceSnapshots([]);
  }, []);

  const fetchAll = useCallback(async ({ showLoader = true, force = false }: { showLoader?: boolean; force?: boolean } = {}) => {
    // console.log('🔄 [ConfirmationContext] fetchAll بدء', { organizationId, missingSchema, showLoader });
    
    if (!organizationId) {
      // console.log('❌ [ConfirmationContext] لا يوجد organizationId - إعادة تعيين الحالة');
      resetState();
      return;
    }

    if (!force && !shouldAutoLoad) {
      return;
    }

    if (missingSchema) {
      // console.log('❌ [ConfirmationContext] المخطط مفقود - تخطي الجلب');
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // console.log('📡 [ConfirmationContext] بدء جلب البيانات من الخدمات...');

      const [
        agentsRes,
        rulesRes,
        assignmentsRes,
        paymentsRes,
        rewardsRes,
        performanceRes,
        settingsRes,
      ] = await Promise.all([
        confirmationService.fetchAgents(organizationId),
        confirmationService.fetchAssignmentRules(organizationId),
        confirmationService.fetchAssignments(organizationId, { status: ['assigned', 'in_progress', 'confirmed'] }),
        confirmationService.fetchPayments(organizationId),
        confirmationService.fetchRewards(organizationId),
        confirmationService.fetchPerformanceOverview(organizationId),
        confirmationService.fetchOrganizationSettings(organizationId),
      ]);

      // console.log('📊 [ConfirmationContext] نتائج جلب البيانات:', {
      //   agents: { count: agentsRes.data?.length || 0, error: agentsRes.error?.message },
      //   rules: { count: rulesRes.data?.length || 0, error: rulesRes.error?.message },
      //   assignments: { count: assignmentsRes.data?.length || 0, error: assignmentsRes.error?.message },
      //   payments: { count: paymentsRes.data?.length || 0, error: paymentsRes.error?.message },
      //   rewards: { count: rewardsRes.data?.length || 0, error: rewardsRes.error?.message },
      //   performance: { count: performanceRes.data?.length || 0, error: performanceRes.error?.message },
      //   settings: { exists: !!settingsRes.data, error: settingsRes.error?.message },
      // });

      if (agentsRes.error) setSchemaFromError(agentsRes.error);
      if (rulesRes.error) setSchemaFromError(rulesRes.error);
      if (assignmentsRes.error) setSchemaFromError(assignmentsRes.error);
      if (paymentsRes.error) setSchemaFromError(paymentsRes.error);
      if (rewardsRes.error) setSchemaFromError(rewardsRes.error);
      if (performanceRes.error) setSchemaFromError(performanceRes.error);
      if (settingsRes.error) setSchemaFromError(settingsRes.error);

      if (agentsRes.data) {
        // console.log('👥 [ConfirmationContext] تم جلب الموظفين:', agentsRes.data.map(a => ({ id: a.id, name: a.full_name, status: a.status })));
        setAgents(agentsRes.data);
      }
      if (rulesRes.data) {
        // console.log('📋 [ConfirmationContext] تم جلب قوانين التوزيع:', rulesRes.data.map(r => ({ id: r.id, name: r.rule_name, type: r.rule_type, active: r.is_active })));
        setAssignmentRules(rulesRes.data);
      }
      if (assignmentsRes.data) {
        // console.log('📦 [ConfirmationContext] تم جلب التوزيعات:', assignmentsRes.data.map(a => ({ 
        //   id: a.id, 
        //   order_id: a.order_id, 
        //   agent_id: a.agent_id, 
        //   status: a.status,
        //   order_number: a.online_orders?.customer_order_number 
        // })));
        setAssignments(assignmentsRes.data);
      }
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (rewardsRes.data) setRewards(rewardsRes.data);
      if (performanceRes.data) setPerformanceSnapshots(performanceRes.data);
      if (settingsRes.data) setOrganizationSettings(settingsRes.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, missingSchema, shouldAutoLoad, resetState, setSchemaFromError]);

  useEffect(() => {
    if (!organizationId) {
      resetState();
      return;
    }

    if (!shouldAutoLoad) {
      return;
    }

    initializedRef.current = true;
    fetchAll();
  }, [organizationId, shouldAutoLoad, fetchAll, resetState]);

  const refreshAll = useCallback(async () => {
    await fetchAll({ showLoader: false, force: true });
  }, [fetchAll]);

  const refreshAssignments = useCallback(async (orderIds?: string[]) => {
    if (!organizationId || missingSchema) return;
    const assignmentsRes = await confirmationService.fetchAssignments(organizationId, {
      status: orderIds && orderIds.length > 0 ? undefined : ['assigned', 'in_progress', 'confirmed'],
      orderIds,
    });

    if (assignmentsRes.error) {
      setSchemaFromError(assignmentsRes.error);
      return;
    }

    if (assignmentsRes.data) {
      if (orderIds?.length) {
        setAssignments((prev) => {
          const filtered = prev.filter((assignment) => !orderIds.includes(assignment.order_id));
          return [...filtered, ...assignmentsRes.data!];
        });
      } else {
        setAssignments(assignmentsRes.data);
      }
    }
  }, [organizationId, missingSchema, setSchemaFromError]);

  const createAgent = useCallback<ConfirmationContextValue['createAgent']>(
    async (payload) => {
      if (!organizationId || missingSchema) return null;

      const {
        password,
        access_scope,
        compensation_mode,
        compensation_settings,
        notes,
        ...rest
      } = payload;

      const normalizedScope = Array.from(
        new Set((access_scope && access_scope.length ? access_scope : DEFAULT_CONFIRMATION_SCOPE).map((item) => item))
      ) as ConfirmationAgent['access_scope'];

      const normalizedCompensation: ConfirmationCompensationSettings = {
        ...DEFAULT_COMPENSATION_SETTINGS,
        ...(compensation_settings || {}),
      };

      if (!rest.email) {
        setError('البريد الإلكتروني مطلوب لإنشاء حساب الموظف');
        return null;
      }

      if (!password || password.length < 6) {
        setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        return null;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token;
      if (!sessionToken) {
        setError('جلسة المصادقة غير متوفرة. يرجى إعادة تسجيل الدخول كمشرف.');
        return null;
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-confirmation-agent', {
        body: {
          email: rest.email,
          password,
          full_name: rest.full_name,
          phone: rest.phone,
          organization_id: organizationId,
          access_scope: normalizedScope,
          compensation_mode,
          compensation_settings: normalizedCompensation,
          notes,
          created_by: user?.id,
        },
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (functionError || !functionData?.success) {
        const details = functionError?.message || functionData?.error || 'تعذر إنشاء حساب الموظف في Supabase Auth';
        setError(details);
        return null;
      }

      const confirmationAgentRecord = functionData.data?.agent as ConfirmationAgent | undefined;
      if (!confirmationAgentRecord) {
        setError('لم يتم استلام بيانات الموظف الجديدة من الخادم');
        return null;
      }

      setError(null);

      setAgents((prev) =>
        [...prev.filter((agent) => agent.id !== confirmationAgentRecord!.id), confirmationAgentRecord!].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );

      return { agent: confirmationAgentRecord, authFallback: false };
    },
    [organizationId, missingSchema, setSchemaFromError, user?.id]
  );

  const updateAgent = useCallback<ConfirmationContextValue['updateAgent']>(
    async (agentId, updates) => {
      if (missingSchema) return null;
      const res = await confirmationService.updateAgent(agentId, updates);
      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }
      if (res.data) {
        setAgents((prev) => prev.map((agent) => (agent.id === agentId ? res.data! : agent)));
        return res.data;
      }
      return null;
    },
    [missingSchema, setSchemaFromError]
  );

  const toggleAgentStatus = useCallback<ConfirmationContextValue['toggleAgentStatus']>(
    async (agentId, status) => {
      await updateAgent(agentId, { status });
    },
    [updateAgent]
  );

  const upsertAssignmentRule = useCallback<ConfirmationContextValue['upsertAssignmentRule']>(
    async (rule) => {
      if (!organizationId || missingSchema) return null;
      const res = await confirmationService.upsertAssignmentRule(organizationId, {
        created_by: user?.id,
        ...rule,
      });

      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }

      if (res.data) {
        setAssignmentRules((prev) => {
          const exists = prev.some((item) => item.id === res.data!.id);
          if (exists) {
            return prev.map((item) => (item.id === res.data!.id ? res.data! : item)).sort((a, b) => a.priority - b.priority);
          }
          return [...prev, res.data!].sort((a, b) => a.priority - b.priority);
        });
        return res.data;
      }
      return null;
    },
    [organizationId, missingSchema, setSchemaFromError, user?.id]
  );

  const deleteAssignmentRule = useCallback<ConfirmationContextValue['deleteAssignmentRule']>(
    async (ruleId) => {
      const res = await confirmationService.deleteAssignmentRule(ruleId);
      if (res.error) {
        setSchemaFromError(res.error);
        return false;
      }
      setAssignmentRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      return true;
    },
    [setSchemaFromError]
  );

  const recordAssignment = useCallback<ConfirmationContextValue['recordAssignment']>(
    async (payload) => {
      if (!organizationId || missingSchema) return null;
      const res = await confirmationService.assignOrder({
        organization_id: organizationId,
        created_by: user?.id,
        ...payload,
      });

      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }

      if (res.data) {
        setAssignments((prev) => [res.data!, ...prev]);
        return res.data;
      }
      return null;
    },
    [organizationId, missingSchema, setSchemaFromError, user?.id]
  );

  const updateAssignment = useCallback<ConfirmationContextValue['updateAssignment']>(
    async (assignmentId, updates) => {
      const res = await confirmationService.updateAssignment(assignmentId, updates);
      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }

      if (res.data) {
        setAssignments((prev) => prev.map((assignment) => (assignment.id === assignmentId ? res.data! : assignment)));
        return res.data;
      }
      return null;
    },
    [setSchemaFromError]
  );

  const recordPayment = useCallback<ConfirmationContextValue['recordPayment']>(
    async (payload) => {
      if (!organizationId || missingSchema) return null;
      const res = await confirmationService.upsertPayment(organizationId, payload);
      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }
      if (res.data) {
        setPayments((prev) => {
          const exists = prev.some((payment) => payment.id === res.data!.id);
          if (exists) {
            return prev.map((payment) => (payment.id === res.data!.id ? res.data! : payment));
          }
          return [res.data!, ...prev];
        });
        return res.data;
      }
      return null;
    },
    [organizationId, missingSchema, setSchemaFromError]
  );

  const recordReward = useCallback<ConfirmationContextValue['recordReward']>(
    async (payload) => {
      if (!organizationId || missingSchema) return null;
      const res = await confirmationService.awardReward(organizationId, payload);
      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }
      if (res.data) {
        setRewards((prev) => [res.data!, ...prev]);
        return res.data;
      }
      return null;
    },
    [organizationId, missingSchema, setSchemaFromError]
  );

  const saveOrganizationSettings = useCallback<ConfirmationContextValue['saveOrganizationSettings']>(
    async (settings) => {
      if (!organizationId || missingSchema) return null;
      const res = await confirmationService.upsertOrganizationSettings(organizationId, settings);
      if (res.error) {
        setSchemaFromError(res.error);
        return null;
      }
      if (res.data) {
        setOrganizationSettings(res.data);
        return res.data;
      }
      return null;
    },
    [organizationId, missingSchema, setSchemaFromError]
  );

  const setMissingSchemaAcknowledged = useCallback(() => {
    setMissingSchema(false);
  }, []);

  const agentById = useMemo(() => {
    return agents.reduce<Record<string, ConfirmationAgent>>((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {});
  }, [agents]);

  const assignmentsByOrderId = useMemo(() => {
    return assignments.reduce<Record<string, ConfirmationOrderAssignment>>((acc, assignment) => {
      acc[assignment.order_id] = assignment;
      return acc;
    }, {});
  }, [assignments]);

  const value = useMemo<ConfirmationContextValue>(
    () => ({
      loading,
      refreshing,
      missingSchema,
      error,
      agents,
      agentById,
      assignmentRules,
      assignments,
      assignmentsByOrderId,
      payments,
      rewards,
      performanceSnapshots,
      organizationSettings,
      refreshAll,
      refreshAssignments,
      setMissingSchemaAcknowledged,
      createAgent,
      updateAgent,
      toggleAgentStatus,
      upsertAssignmentRule,
      deleteAssignmentRule,
      recordAssignment,
      updateAssignment,
      recordPayment,
      recordReward,
      saveOrganizationSettings,
    }),
    [
      loading,
      refreshing,
      missingSchema,
      error,
      agents,
      agentById,
      assignmentRules,
      assignments,
      assignmentsByOrderId,
      payments,
      rewards,
      performanceSnapshots,
      organizationSettings,
      refreshAll,
      refreshAssignments,
      createAgent,
      updateAgent,
      toggleAgentStatus,
      upsertAssignmentRule,
      deleteAssignmentRule,
      recordAssignment,
      updateAssignment,
      recordPayment,
      recordReward,
      saveOrganizationSettings,
      setMissingSchemaAcknowledged,
    ]
  );

  return <ConfirmationContext.Provider value={value}>{children}</ConfirmationContext.Provider>;
};

export const useConfirmation = (): ConfirmationContextValue => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};
