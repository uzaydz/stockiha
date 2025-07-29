import { supabase } from '@/lib/supabase';
import { getCachedAuth } from '@/lib/authCache';

// تتبع الطلبات المحظورة
let blockedAuthRequests = 0;

/**
 * تفعيل اعتراض طلبات المصادقة
 */
export const enableAuthInterception = (): void => {
  console.log('🔐 تم تفعيل اعتراض طلبات المصادقة - لا مزيد من الطلبات المكررة!');
  
  // حفظ الدوال الأصلية
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  
  // إعادة تعريف getUser
  (supabase.auth as any).getUser = async () => {
    blockedAuthRequests++;
    console.warn(`🚫 تم حظر طلب مكرر رقم ${blockedAuthRequests} إلى auth/v1/user - استخدام cache المصادقة`);
    
    try {
      const { user } = await getCachedAuth();
      return {
        data: { user },
        error: null
      };
    } catch (error) {
      console.error('❌ خطأ في cache المصادقة، استخدام الطريقة الأصلية:', error);
      return await originalGetUser();
    }
  };
  
  // إعادة تعريف getSession
  (supabase.auth as any).getSession = async () => {
    blockedAuthRequests++;
    console.warn(`🚫 تم حظر طلب مكرر رقم ${blockedAuthRequests} إلى auth/v1/session - استخدام cache المصادقة`);
    
    try {
      const { session } = await getCachedAuth();
      return {
        data: { session },
        error: null
      };
    } catch (error) {
      console.error('❌ خطأ في cache المصادقة، استخدام الطريقة الأصلية:', error);
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
