import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { 
  CallLog, 
  CallLogWithDetails, 
  UseCallLogsReturn,
  CallLogFilters 
} from '@/types/call-center.types';

export const useCallLogs = (filters?: CallLogFilters): UseCallLogsReturn => {
  const [callLogs, setCallLogs] = useState<CallLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  // جلب سجلات المكالمات من قاعدة البيانات
  const fetchCallLogs = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('call_logs')
        .select(`
          *,
          agent:call_center_agents!call_logs_agent_id_fkey (
            id,
            user:users!call_center_agents_user_id_fkey (
              name
            )
          ),
          order:orders!call_logs_order_id_fkey (
            id,
            customer_name,
            customer_phone,
            total_amount
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // تطبيق الفلاتر
      if (filters?.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }

      if (filters?.status) {
        query = query.eq('call_status', filters.status);
      }

      if (filters?.outcome) {
        query = query.eq('call_outcome', filters.outcome);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // تحويل البيانات إلى الشكل المطلوب
      const callLogsWithDetails: CallLogWithDetails[] = (data || []).map(log => ({
        ...log,
        agent: log.agent || { id: '', user: { name: 'غير محدد' } },
        order: log.order || { 
          id: '', 
          customer_name: 'غير محدد', 
          customer_phone: '', 
          total_amount: 0 
        }
      }));

      setCallLogs(callLogsWithDetails);
    } catch (err) {
      setError('فشل في جلب سجلات المكالمات');
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, filters]);

  // إنشاء سجل مكالمة جديد
  const createCallLog = useCallback(async (callLogData: Omit<CallLog, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('call_logs')
        .insert({
          ...callLogData,
          call_start_time: callLogData.call_start_time || new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('تم إضافة سجل المكالمة بنجاح');
      await fetchCallLogs();
      return true;
    } catch (err) {
      toast.error('فشل في إضافة سجل المكالمة');
      return false;
    }
  }, [fetchCallLogs]);

  // تحديث سجل المكالمة
  const updateCallLog = useCallback(async (id: string, updates: Partial<CallLog>): Promise<boolean> => {
    try {
      // حساب مدة المكالمة إذا تم تحديد وقت الانتهاء
      let callDuration = null;
      if (updates.call_end_time && updates.call_start_time) {
        const startTime = new Date(updates.call_start_time);
        const endTime = new Date(updates.call_end_time);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        callDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
      }

      const { error: updateError } = await supabase
        .from('call_logs')
        .update({
          ...updates,
          call_duration: callDuration || updates.call_duration
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      toast.success('تم تحديث سجل المكالمة بنجاح');
      await fetchCallLogs();
      return true;
    } catch (err) {
      toast.error('فشل في تحديث سجل المكالمة');
      return false;
    }
  }, [fetchCallLogs]);

  // إعادة تحميل البيانات
  const refreshCallLogs = useCallback(async () => {
    await fetchCallLogs();
  }, [fetchCallLogs]);

  // جلب البيانات عند التحميل الأول
  useEffect(() => {
    fetchCallLogs();
  }, [fetchCallLogs]);

  return {
    callLogs,
    loading,
    error,
    createCallLog,
    updateCallLog,
    refreshCallLogs
  };
};
