import { supabase } from '@/lib/supabase';
import { getCachedAuth } from '@/lib/authCache';

// تتبع الطلبات المحظورة
let blockedAuthRequests = 0;
let interceptionEnabled = false;

/**
 * تفعيل اعتراض طلبات المصادقة
 */
export const enableAuthInterception = (): void => {
  if (interceptionEnabled) return;

  interceptionEnabled = true;

  // حفظ الدوال الأصلية
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

  // إعادة تعريف getUser فقط لتجنب أي استدعاء دائري مع getSession
  (supabase.auth as any).getUser = async () => {
    blockedAuthRequests++;
    try {
      const { user } = await getCachedAuth();
      return { data: { user }, error: null };
    } catch (error) {
      return await originalGetUser();
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
