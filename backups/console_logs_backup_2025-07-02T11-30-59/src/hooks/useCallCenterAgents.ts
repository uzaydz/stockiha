import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { 
  CallCenterAgent, 
  AgentWithUser, 
  UseCallCenterAgentsReturn,
  AgentFilters 
} from '@/types/call-center.types';

export const useCallCenterAgents = (filters?: AgentFilters): UseCallCenterAgentsReturn => {
  const [agents, setAgents] = useState<AgentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  const fetchAgents = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('call_center_agents')
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAgents((data || []) as AgentWithUser[]);
    } catch (err: any) {
      setError('فشل في جلب بيانات الوكلاء');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  // إنشاء وكيل جديد
  const createAgent = useCallback(async (agentData: Omit<CallCenterAgent, 'id' | 'created_at' | 'updated_at' | 'user'>): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('معرف المنظمة غير متوفر');
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from('call_center_agents')
        .insert({
          ...agentData,
          organization_id: organization.id,
          performance_metrics: {
            failed_calls: 0,
            successful_calls: 0,
            avg_call_duration: 0,
            total_orders_handled: 0,
            customer_satisfaction: 0,
            last_performance_update: null
          },
          work_schedule: {
            monday: { start: '09:00', end: '17:00', active: true },
            tuesday: { start: '09:00', end: '17:00', active: true },
            wednesday: { start: '09:00', end: '17:00', active: true },
            thursday: { start: '09:00', end: '17:00', active: true },
            friday: { start: '09:00', end: '17:00', active: true },
            saturday: { start: '09:00', end: '17:00', active: false },
            sunday: { start: '09:00', end: '17:00', active: false }
          }
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('تم إضافة الوكيل بنجاح');
      await fetchAgents();
      return true;
    } catch (err) {
      toast.error('فشل في إضافة الوكيل');
      return false;
    }
  }, [organization?.id, fetchAgents]);

  // تحديث بيانات الوكيل
  const updateAgent = useCallback(async (id: string, updates: Partial<CallCenterAgent>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('call_center_agents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      toast.success('تم تحديث بيانات الوكيل بنجاح');
      await fetchAgents();
      return true;
    } catch (err) {
      toast.error('فشل في تحديث بيانات الوكيل');
      return false;
    }
  }, [fetchAgents]);

  // حذف الوكيل (إلغاء تفعيل)
  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('call_center_agents')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('تم إلغاء تفعيل الوكيل بنجاح');
      await fetchAgents();
      return true;
    } catch (err) {
      toast.error('فشل في إلغاء تفعيل الوكيل');
      return false;
    }
  }, [fetchAgents]);

  // إعادة تحميل البيانات
  const refreshAgents = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  // إعادة تحميل البيانات عند تغيير المنظمة
  useEffect(() => {
    if (organization?.id) {
      fetchAgents();
    }
  }, [organization?.id, fetchAgents]);

  // الاستماع لأحداث إنشاء وكيل جديد
  useEffect(() => {
    const handleAgentCreated = () => {
      fetchAgents();
    };

    window.addEventListener('agentCreated', handleAgentCreated);
    return () => window.removeEventListener('agentCreated', handleAgentCreated);
  }, [fetchAgents]);

  // جلب البيانات عند التحميل الأول
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents
  };
};
