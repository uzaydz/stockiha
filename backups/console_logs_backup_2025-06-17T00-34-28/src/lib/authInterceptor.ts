import { supabase } from '@/lib/supabase';
import { getCachedAuth } from '@/lib/authCache';

// تتبع الطلبات المحظورة
let blockedAuthRequests = 0;

/**
 * تفعيل اعتراض طلبات المصادقة
 */
export const enableAuthInterception = (): void => {
  
  // حفظ الدوال الأصلية
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  
  // إعادة تعريف getUser
  (supabase.auth as any).getUser = async () => {
    blockedAuthRequests++;
    
    try {
      const { user } = await getCachedAuth();
      return {
        data: { user },
        error: null
      };
    } catch (error) {
      return await originalGetUser();
    }
  };
  
  // إعادة تعريف getSession
  (supabase.auth as any).getSession = async () => {
    blockedAuthRequests++;
    
    try {
      const { session } = await getCachedAuth();
      return {
        data: { session },
        error: null
      };
    } catch (error) {
      return await originalGetSession();
    }
  };
  
};

/**
 * الحصول على إحصائيات الطلبات المحظورة
 */
export const getAuthInterceptionStats = () => {
  return {
    blockedRequests: blockedAuthRequests,
    message: `تم حظر ${blockedAuthRequests} طلب مكرر للمصادقة`
  };
};
