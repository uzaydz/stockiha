import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CallCenterAgent, AgentStatus, CallCenterSession } from '../types/callCenter';

interface UseCallCenterAgentReturn {
  // بيانات الموظف
  agent: CallCenterAgent | null;
  currentSession: CallCenterSession | null;
  
  // حالات التحميل والأخطاء
  loading: boolean;
  error: string | null;
  
  // إحصائيات اليوم
  todayStats: {
    ordersAssigned: number;
    ordersCompleted: number;
    callsMade: number;
    successfulCalls: number;
    successRate: number;
  };
  
  // العمليات
  startSession: () => Promise<boolean>;
  endSession: () => Promise<boolean>;
  updateAvailability: (isAvailable: boolean) => Promise<boolean>;
  updateStatus: (status: AgentStatus) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

export const useCallCenterAgent = (): UseCallCenterAgentReturn => {
  const { user } = useAuth();
  const [agent, setAgent] = useState<CallCenterAgent | null>(null);
  const [currentSession, setCurrentSession] = useState<CallCenterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({
    ordersAssigned: 0,
    ordersCompleted: 0,
    callsMade: 0,
    successfulCalls: 0,
    successRate: 0
  });

  // جلب بيانات الموظف
  const fetchAgentData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // جلب بيانات الموظف
      const { data: agentData, error: agentError } = await supabase
        .from('call_center_agents')
        .select(`
          *,
          users!inner(id, name, email)
        `)
        .eq('user_id', user.id)
        .single();

      if (agentError) {
        if (agentError.code === 'PGRST116') {
          // الموظف غير موجود في نظام مركز الاتصال
          setError('غير مخول للوصول إلى نظام مركز الاتصال');
          return;
        }
        throw agentError;
      }

      // تحويل البيانات إلى النوع المطلوب
      const transformedAgent: CallCenterAgent = {
        id: agentData.id,
        user_id: agentData.user_id,
        organization_id: agentData.organization_id,
        assigned_regions: agentData.assigned_regions || [],
        assigned_stores: agentData.assigned_stores || [],
        max_daily_orders: agentData.max_daily_orders || 50,
        is_available: agentData.is_available,
        is_active: agentData.is_active,
        status: 'offline', // سيتم تحديثه لاحقاً
        last_activity: new Date(agentData.last_activity),
        performance_metrics: agentData.performance_metrics || {
          total_orders_handled: 0,
          successful_calls: 0,
          failed_calls: 0,
          avg_call_duration: 0,
          customer_satisfaction: 0,
          last_performance_update: null
        },
        specializations: agentData.specializations || [],
        work_schedule: agentData.work_schedule || {},
        permissions: {
          can_view_all_orders: false,
          can_assign_orders: false,
          can_modify_order_status: true,
          can_access_reports: false,
          can_manage_agents: false
        },
        created_at: new Date(agentData.created_at),
        updated_at: new Date(agentData.updated_at)
      };

      setAgent(transformedAgent);

      // جلب الجلسة النشطة
      const { data: sessionData } = await supabase
        .from('call_center_sessions')
        .select('*')
        .eq('agent_id', agentData.id)
        .is('end_time', null)
        .single();

      if (sessionData) {
        const transformedSession: CallCenterSession = {
          id: sessionData.id,
          agent_id: sessionData.agent_id,
          start_time: new Date(sessionData.start_time),
          orders_handled: sessionData.orders_handled || 0,
          calls_made: sessionData.calls_made || 0,
          successful_calls: sessionData.successful_calls || 0,
          failed_calls: sessionData.failed_calls || 0,
          session_notes: sessionData.session_notes,
          session_type: sessionData.session_type || 'regular',
          ip_address: sessionData.ip_address,
          user_agent: sessionData.user_agent,
          created_at: new Date(sessionData.created_at)
        };
        setCurrentSession(transformedSession);
        
        // تحديث حالة الموظف إلى متصل
        transformedAgent.status = 'online';
        setAgent(transformedAgent);
      }

      // جلب إحصائيات اليوم
      const { data: statsData } = await supabase
        .from('agent_performance_stats')
        .select('*')
        .eq('agent_id', agentData.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (statsData) {
        setTodayStats({
          ordersAssigned: statsData.orders_assigned || 0,
          ordersCompleted: statsData.orders_completed || 0,
          callsMade: statsData.calls_made || 0,
          successfulCalls: statsData.successful_calls || 0,
          successRate: statsData.success_rate || 0
        });
      }

    } catch (err) {
      console.error('خطأ في جلب بيانات الموظف:', err);
      setError('فشل في جلب بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  // بدء جلسة عمل جديدة
  const startSession = async (): Promise<boolean> => {
    if (!agent || currentSession) return false;

    try {
      const { data, error } = await supabase
        .from('call_center_sessions')
        .insert({
          agent_id: agent.id,
          start_time: new Date().toISOString(),
          session_type: 'regular',
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: CallCenterSession = {
        id: data.id,
        agent_id: data.agent_id,
        start_time: new Date(data.start_time),
        orders_handled: 0,
        calls_made: 0,
        successful_calls: 0,
        failed_calls: 0,
        session_type: data.session_type,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        created_at: new Date(data.created_at)
      };

      setCurrentSession(newSession);
      
      // تحديث حالة الموظف
      if (agent) {
        const updatedAgent = { ...agent, status: 'online' as AgentStatus };
        setAgent(updatedAgent);
      }

      return true;
    } catch (err) {
      console.error('خطأ في بدء الجلسة:', err);
      setError('فشل في بدء جلسة العمل');
      return false;
    }
  };

  // إنهاء جلسة العمل
  const endSession = async (): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      const { error } = await supabase
        .from('call_center_sessions')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      
      // تحديث حالة الموظف
      if (agent) {
        const updatedAgent = { ...agent, status: 'offline' as AgentStatus };
        setAgent(updatedAgent);
      }

      return true;
    } catch (err) {
      console.error('خطأ في إنهاء الجلسة:', err);
      setError('فشل في إنهاء جلسة العمل');
      return false;
    }
  };

  // تحديث حالة التوفر
  const updateAvailability = async (isAvailable: boolean): Promise<boolean> => {
    if (!agent) return false;

    try {
      const { error } = await supabase
        .from('call_center_agents')
        .update({
          is_available: isAvailable,
          last_activity: new Date().toISOString()
        })
        .eq('id', agent.id);

      if (error) throw error;

      const updatedAgent = { 
        ...agent, 
        is_available: isAvailable,
        last_activity: new Date()
      };
      setAgent(updatedAgent);

      return true;
    } catch (err) {
      console.error('خطأ في تحديث حالة التوفر:', err);
      setError('فشل في تحديث حالة التوفر');
      return false;
    }
  };

  // تحديث حالة الموظف
  const updateStatus = async (status: AgentStatus): Promise<boolean> => {
    if (!agent) return false;

    try {
      // تحديث النشاط الأخير
      const { error } = await supabase
        .from('call_center_agents')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('id', agent.id);

      if (error) throw error;

      const updatedAgent = { 
        ...agent, 
        status,
        last_activity: new Date()
      };
      setAgent(updatedAgent);

      return true;
    } catch (err) {
      console.error('خطأ في تحديث حالة الموظف:', err);
      setError('فشل في تحديث حالة الموظف');
      return false;
    }
  };

  // تحديث البيانات
  const refreshData = async (): Promise<void> => {
    await fetchAgentData();
  };

  // دالة مساعدة للحصول على IP العميل
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  // تحميل البيانات عند تغيير المستخدم
  useEffect(() => {
    if (user?.id) {
      fetchAgentData();
    } else {
      setAgent(null);
      setCurrentSession(null);
      setLoading(false);
    }
  }, [user?.id]);

  // تحديث النشاط كل 30 ثانية أثناء الجلسة النشطة
  useEffect(() => {
    if (!currentSession || !agent) return;

    const interval = setInterval(async () => {
      await supabase
        .from('call_center_agents')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', agent.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSession, agent]);

  return {
    agent,
    currentSession,
    loading,
    error,
    todayStats,
    startSession,
    endSession,
    updateAvailability,
    updateStatus,
    refreshData
  };
}; 