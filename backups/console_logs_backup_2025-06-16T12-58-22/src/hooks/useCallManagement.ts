import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { CallLog, CallStatus, CallOutcome } from '../types/callCenter';

interface CallSession {
  orderId: string;
  agentId: string;
  startTime: Date;
  isActive: boolean;
  duration: number; // بالثواني
  notes: string;
}

interface UseCallManagementReturn {
  // حالة المكالمة الحالية
  currentCall: CallSession | null;
  callDuration: number;
  isCallActive: boolean;
  
  // سجل المكالمات
  callHistory: CallLog[];
  
  // حالات التحميل والأخطاء
  loading: boolean;
  error: string | null;
  
  // عمليات المكالمة
  startCall: (orderId: string, agentId: string) => Promise<boolean>;
  endCall: (outcome: CallOutcome, notes?: string) => Promise<boolean>;
  pauseCall: () => void;
  resumeCall: () => void;
  updateCallNotes: (notes: string) => void;
  
  // إدارة سجل المكالمات
  fetchCallHistory: (agentId: string, limit?: number) => Promise<void>;
  getOrderCallHistory: (orderId: string) => Promise<CallLog[]>;
  
  // إحصائيات المكالمات
  callStats: {
    totalCalls: number;
    successfulCalls: number;
    avgDuration: number;
    todayCalls: number;
  };
}

export const useCallManagement = (): UseCallManagementReturn => {
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    successfulCalls: 0,
    avgDuration: 0,
    todayCalls: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // بدء مؤقت المكالمة
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // إيقاف مؤقت المكالمة
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // بدء مكالمة جديدة
  const startCall = async (orderId: string, agentId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // التأكد من عدم وجود مكالمة نشطة
      if (currentCall?.isActive) {
        setError('يوجد مكالمة نشطة بالفعل');
        return false;
      }

      const startTime = new Date();
      
      // إنشاء جلسة مكالمة جديدة
      const newCall: CallSession = {
        orderId,
        agentId,
        startTime,
        isActive: true,
        duration: 0,
        notes: ''
      };

      setCurrentCall(newCall);
      setCallDuration(0);
      pausedTimeRef.current = 0;
      
      // بدء المؤقت
      startTimer();

      return true;
    } catch (err) {
      console.error('خطأ في بدء المكالمة:', err);
      setError('فشل في بدء المكالمة');
      return false;
    }
  };

  // إنهاء المكالمة
  const endCall = async (outcome: CallOutcome, notes?: string): Promise<boolean> => {
    try {
      if (!currentCall) {
        setError('لا توجد مكالمة نشطة');
        return false;
      }

      setError(null);
      
      // إيقاف المؤقت
      stopTimer();
      
      const endTime = new Date();
      const totalDuration = callDuration;

      // تسجيل المكالمة في قاعدة البيانات
      const { data, error: insertError } = await supabase
        .from('call_logs')
        .insert({
          agent_id: currentCall.agentId,
          order_id: currentCall.orderId,
          call_start_time: currentCall.startTime.toISOString(),
          call_end_time: endTime.toISOString(),
          call_status: outcome === 'completed' ? 'answered' : 'not_answered',
          call_outcome: outcome,
          call_notes: notes || currentCall.notes,
          phone_number: null, // سيتم إضافته لاحقاً
          call_attempt_number: 1 // سيتم حسابه من قاعدة البيانات
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // تحديث عداد المحاولات في جدول الطلبيات
      const { error: updateError } = await supabase
        .from('online_orders')
        .update({
          call_attempts: supabase.raw('COALESCE(call_attempts, 0) + 1'),
          last_call_attempt: endTime.toISOString(),
          call_confirmation_notes: notes || currentCall.notes
        })
        .eq('id', currentCall.orderId);

      if (updateError) {
        console.error('خطأ في تحديث الطلب:', updateError);
      }

      // إضافة المكالمة إلى السجل المحلي
      const newCallLog: CallLog = {
        id: data.id,
        agent_id: currentCall.agentId,
        order_id: currentCall.orderId,
        call_start_time: currentCall.startTime,
        call_end_time: endTime,
        call_duration: totalDuration,
        call_status: outcome === 'completed' ? 'answered' : 'not_answered',
        call_outcome: outcome,
        call_notes: notes || currentCall.notes,
        follow_up_required: outcome === 'no_answer' || outcome === 'busy',
        call_attempt_number: 1,
        created_at: new Date()
      };

      setCallHistory(prev => [newCallLog, ...prev]);

      // إعادة تعيين حالة المكالمة
      setCurrentCall(null);
      setCallDuration(0);
      pausedTimeRef.current = 0;

      // تحديث الإحصائيات
      await updateCallStats(currentCall.agentId);

      return true;
    } catch (err) {
      console.error('خطأ في إنهاء المكالمة:', err);
      setError('فشل في إنهاء المكالمة');
      return false;
    }
  };

  // إيقاف مؤقت المكالمة
  const pauseCall = () => {
    if (currentCall?.isActive) {
      stopTimer();
      pausedTimeRef.current = callDuration;
      setCurrentCall(prev => prev ? { ...prev, isActive: false } : null);
    }
  };

  // استئناف المكالمة
  const resumeCall = () => {
    if (currentCall && !currentCall.isActive) {
      startTimer();
      setCurrentCall(prev => prev ? { ...prev, isActive: true } : null);
    }
  };

  // تحديث ملاحظات المكالمة
  const updateCallNotes = (notes: string) => {
    if (currentCall) {
      setCurrentCall(prev => prev ? { ...prev, notes } : null);
    }
  };

  // جلب سجل المكالمات
  const fetchCallHistory = async (agentId: string, limit = 50): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('call_logs')
        .select(`
          *,
          online_orders(customer_order_number, form_data)
        `)
        .eq('agent_id', agentId)
        .order('call_start_time', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      const transformedHistory: CallLog[] = (data || []).map(log => ({
        id: log.id,
        agent_id: log.agent_id,
        order_id: log.order_id,
        call_start_time: new Date(log.call_start_time),
        call_end_time: log.call_end_time ? new Date(log.call_end_time) : undefined,
        call_duration: log.call_duration || 0,
        call_status: log.call_status,
        call_outcome: log.call_outcome,
        call_notes: log.call_notes,
        customer_feedback: log.customer_feedback,
        follow_up_required: log.follow_up_required || false,
        follow_up_date: log.follow_up_date ? new Date(log.follow_up_date) : undefined,
        phone_number: log.phone_number,
        call_attempt_number: log.call_attempt_number || 1,
        created_at: new Date(log.created_at)
      }));

      setCallHistory(transformedHistory);
    } catch (err) {
      console.error('خطأ في جلب سجل المكالمات:', err);
      setError('فشل في جلب سجل المكالمات');
    } finally {
      setLoading(false);
    }
  };

  // جلب سجل مكالمات طلب محدد
  const getOrderCallHistory = async (orderId: string): Promise<CallLog[]> => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('call_start_time', { ascending: false });

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        agent_id: log.agent_id,
        order_id: log.order_id,
        call_start_time: new Date(log.call_start_time),
        call_end_time: log.call_end_time ? new Date(log.call_end_time) : undefined,
        call_duration: log.call_duration || 0,
        call_status: log.call_status,
        call_outcome: log.call_outcome,
        call_notes: log.call_notes,
        customer_feedback: log.customer_feedback,
        follow_up_required: log.follow_up_required || false,
        follow_up_date: log.follow_up_date ? new Date(log.follow_up_date) : undefined,
        phone_number: log.phone_number,
        call_attempt_number: log.call_attempt_number || 1,
        created_at: new Date(log.created_at)
      }));
    } catch (err) {
      console.error('خطأ في جلب سجل مكالمات الطلب:', err);
      return [];
    }
  };

  // تحديث إحصائيات المكالمات
  const updateCallStats = async (agentId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // جلب إحصائيات اليوم
      const { data: todayStats } = await supabase
        .from('call_logs')
        .select('call_outcome, call_duration')
        .eq('agent_id', agentId)
        .gte('call_start_time', `${today}T00:00:00.000Z`)
        .lt('call_start_time', `${today}T23:59:59.999Z`);

      // جلب إحصائيات إجمالية
      const { data: totalStats } = await supabase
        .from('call_logs')
        .select('call_outcome, call_duration')
        .eq('agent_id', agentId);

      const todayCallsCount = todayStats?.length || 0;
      const totalCallsCount = totalStats?.length || 0;
      
      const successfulCallsCount = totalStats?.filter(
        call => call.call_outcome === 'completed'
      ).length || 0;

      const totalDuration = totalStats?.reduce(
        (sum, call) => sum + (call.call_duration || 0), 0
      ) || 0;
      
      const avgDuration = totalCallsCount > 0 ? totalDuration / totalCallsCount : 0;

      setCallStats({
        totalCalls: totalCallsCount,
        successfulCalls: successfulCallsCount,
        avgDuration: Math.round(avgDuration),
        todayCalls: todayCallsCount
      });
    } catch (err) {
      console.error('خطأ في تحديث إحصائيات المكالمات:', err);
    }
  };

  // تنظيف المؤقت عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    currentCall,
    callDuration,
    isCallActive: currentCall?.isActive || false,
    callHistory,
    loading,
    error,
    startCall,
    endCall,
    pauseCall,
    resumeCall,
    updateCallNotes,
    fetchCallHistory,
    getOrderCallHistory,
    callStats
  };
}; 