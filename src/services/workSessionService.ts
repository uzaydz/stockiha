import { supabase } from '@/lib/supabase';

export interface POSWorkSession {
  id: string;
  organization_id: string;
  staff_id: string;
  staff_name: string;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  started_at: string;
  ended_at?: string;
  paused_at?: string;
  resumed_at?: string;
  pause_count?: number;
  total_pause_duration?: number; // بالثواني
  status: 'active' | 'paused' | 'closed';
  opening_notes?: string;
  closing_notes?: string;
}

export interface StartSessionInput {
  staff_id: string;
  opening_cash: number;
  opening_notes?: string;
}

export interface CloseSessionInput {
  session_id: string;
  closing_cash: number;
  closing_notes?: string;
}

export const workSessionService = {
  /**
   * بدء جلسة عمل جديدة
   */
  async startSession(input: StartSessionInput): Promise<{ success: boolean; session_id?: string; error?: string }> {
    try {
      console.log('🟢 [workSessionService] بدء جلسة عمل:', input);

      const { data, error } = await (supabase as any).rpc('start_pos_work_session', {
        p_staff_id: input.staff_id,
        p_opening_cash: input.opening_cash,
        p_opening_notes: input.opening_notes || null,
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في بدء الجلسة:', error);
        throw new Error(error.message);
      }

      console.log('✅ [workSessionService] تم بدء الجلسة:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * إغلاق جلسة العمل
   */
  async closeSession(input: CloseSessionInput): Promise<{ success: boolean; expected_cash?: number; closing_cash?: number; difference?: number; error?: string }> {
    try {
      console.log(' [workSessionService] إغلاق جلسة:', input);

      const { data, error } = await (supabase as any).rpc('close_pos_work_session', {
        p_session_id: input.session_id,
        p_closing_cash: input.closing_cash,
        p_closing_notes: input.closing_notes || null,
      });

      if (error) {
        console.error(' [workSessionService] خطأ في إغلاق الجلسة:', error);
        console.error('❌ [workSessionService] خطأ في إغلاق الجلسة:', error);
        throw new Error(error.message);
      }

      console.log('✅ [workSessionService] تم إغلاق الجلسة:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * جلب الجلسة النشطة للموظف
   */
  async getActiveSession(staffId: string): Promise<{ success: boolean; has_active_session: boolean; session?: POSWorkSession; error?: string }> {
    try {
      const { data, error } = await (supabase as any).rpc('get_active_work_session', {
        p_staff_id: staffId,
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في جلب الجلسة النشطة:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * جلب جلسات اليوم
   */
  async getTodaySessions(date?: string): Promise<{ success: boolean; sessions: POSWorkSession[]; error?: string }> {
    try {
      const { data, error } = await (supabase as any).rpc('get_today_work_sessions', {
        p_date: date || new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في جلب جلسات اليوم:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * إيقاف الجلسة مؤقتاً
   */
  async pauseSession(sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('⏸️ [workSessionService] إيقاف الجلسة مؤقتاً:', sessionId);

      const { data, error } = await (supabase as any).rpc('pause_work_session', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في إيقاف الجلسة:', error);
        throw new Error(error.message);
      }

      console.log('✅ [workSessionService] تم إيقاف الجلسة مؤقتاً:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * استئناف الجلسة
   */
  async resumeSession(sessionId: string): Promise<{ success: boolean; message?: string; pause_duration?: number; error?: string }> {
    try {
      console.log('▶️ [workSessionService] استئناف الجلسة:', sessionId);

      const { data, error } = await (supabase as any).rpc('resume_work_session', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في استئناف الجلسة:', error);
        throw new Error(error.message);
      }

      console.log('✅ [workSessionService] تم استئناف الجلسة:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },

  /**
   * جلب الجلسة النشطة أو المتوقفة للموظف
   */
  async getActiveOrPausedSession(staffId: string): Promise<{ success: boolean; has_session: boolean; session?: POSWorkSession; error?: string }> {
    try {
      const { data, error } = await (supabase as any).rpc('get_active_or_paused_session', {
        p_staff_id: staffId,
      });

      if (error) {
        console.error('❌ [workSessionService] خطأ في جلب الجلسة:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('❌ [workSessionService] خطأ:', error);
      throw error;
    }
  },
};
