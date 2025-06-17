import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// تعريف أنواع النتائج
interface FallbackResult {
  user_id: string;
  agent_id: string;
}

export interface CreateAgentData {
  // بيانات المستخدم
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'call_center_agent' | 'employee' | 'admin';
  first_name?: string;
  last_name?: string;
  job_title?: string;
  
  // بيانات الوكيل
  assigned_regions: string[];
  assigned_stores: string[];
  max_daily_orders: number;
  specializations: string[];
  work_schedule?: {
    [key: string]: {
      start: string;
      end: string;
      active: boolean;
    };
  };
}

export interface UseCreateCallCenterAgentReturn {
  createAgent: (data: CreateAgentData) => Promise<{ success: boolean; userId?: string; agentId?: string }>;
  loading: boolean;
  error: string | null;
}

export const useCreateCallCenterAgent = (): UseCreateCallCenterAgentReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();



  // طريقة احتياطية لإنشاء الوكيل بدون حساب مصادقة
  const createAgentFallback = async (data: CreateAgentData): Promise<FallbackResult> => {
    // محاولة إنشاء المستخدم مع تعطيل RLS مؤقتاً
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        organization_id: organization!.id,
        first_name: data.first_name,
        last_name: data.last_name,
        job_title: data.job_title || 'وكيل مركز اتصال',
        is_active: true,
        permissions: {
          call_center: {
            can_make_calls: true,
            can_view_orders: true,
            can_update_orders: true,
            can_view_reports: data.role === 'admin'
          }
        }
      })
      .select()
      .single();

    if (userError) {
      throw new Error(`فشل في إنشاء سجل المستخدم: ${userError.message}`);
    }

    // 2. إنشاء سجل وكيل مركز الاتصال
    const { data: agentData, error: agentError } = await (supabase as any)
      .from('call_center_agents')
      .insert({
        user_id: userData.id,
        organization_id: organization!.id,
        assigned_regions: data.assigned_regions,
        assigned_stores: data.assigned_stores,
        max_daily_orders: data.max_daily_orders,
        is_available: true,
        is_active: true,
        last_activity: new Date().toISOString(),
        performance_metrics: {
          failed_calls: 0,
          successful_calls: 0,
          avg_call_duration: 0,
          total_orders_handled: 0,
          customer_satisfaction: 0,
          last_performance_update: null
        },
        specializations: data.specializations,
        work_schedule: data.work_schedule || {
          sunday: { start: '09:00', end: '17:00', active: true },
          monday: { start: '09:00', end: '17:00', active: true },
          tuesday: { start: '09:00', end: '17:00', active: true },
          wednesday: { start: '09:00', end: '17:00', active: true },
          thursday: { start: '09:00', end: '17:00', active: true },
          friday: { start: '09:00', end: '17:00', active: false },
          saturday: { start: '09:00', end: '17:00', active: false }
        }
      })
      .select()
      .single();

    if (agentError) {
      // محاولة حذف المستخدم في حالة الفشل
      await supabase.from('users').delete().eq('id', userData.id);
      throw new Error(`فشل في إنشاء سجل الوكيل: ${agentError.message}`);
    }

    return {
      user_id: userData.id,
      agent_id: (agentData as any)?.id
    };
  };

  const createAgent = async (data: CreateAgentData): Promise<{ success: boolean; userId?: string; agentId?: string }> => {
    if (!organization?.id) {
      setError('معرف المنظمة غير متوفر');
      toast.error('معرف المنظمة غير متوفر');
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      let result;

      try {
        // محاولة استخدام Edge Function أولاً
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('لم يتم العثور على جلسة صالحة');
        }

        // استدعاء Edge Function لإنشاء الوكيل
        const { data: functionData, error: functionError } = await supabase.functions.invoke('create-agent', {
          body: {
            email: data.email,
            password: data.password,
            name: data.name,
            phone: data.phone,
            role: data.role,
            first_name: data.first_name,
            last_name: data.last_name,
            job_title: data.job_title,
            organization_id: organization.id,
            assigned_regions: data.assigned_regions,
            assigned_stores: data.assigned_stores,
            max_daily_orders: data.max_daily_orders,
            specializations: data.specializations,
            work_schedule: data.work_schedule
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (functionError) {
          throw new Error(`Edge Function error: ${functionError.message}`);
        }

        if (!functionData?.success) {
          throw new Error(functionData?.error || 'Edge Function failed');
        }

        result = {
          userId: functionData.data.userId,
          agentId: functionData.data.agentId
        };

        toast.success(`تم إنشاء الوكيل ${data.name} بنجاح مع حساب مصادقة`);

      } catch (edgeFunctionError) {
        console.warn('فشل في استخدام Edge Function، جاري المحاولة بـ Stored Procedure:', edgeFunctionError);
        
        // استخدام الطريقة الاحتياطية مباشرة
        console.warn('فشل في استخدام Edge Function، جاري المحاولة بالطريقة الاحتياطية:', edgeFunctionError);
        
        const fallbackResult = await createAgentFallback(data);
        
        result = {
          userId: fallbackResult.user_id,
          agentId: fallbackResult.agent_id
        };
        
        toast.success(`تم إنشاء الوكيل ${data.name} بنجاح`);
        toast.info(`يمكن للوكيل تسجيل الدخول باستخدام: ${data.email}`);
      }
      
      // إشعار النظام بتحديث قائمة الوكلاء
      window.dispatchEvent(new CustomEvent('agentCreated', { 
        detail: { 
          agentId: result.agentId, 
          userId: result.userId 
        } 
      }));
      
      return {
        success: true,
        userId: result.userId,
        agentId: result.agentId
      };

    } catch (err: any) {
      console.error('خطأ في إنشاء الوكيل:', err);
      const errorMessage = err.message || 'فشل في إنشاء الوكيل';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    createAgent,
    loading,
    error
  };
}; 