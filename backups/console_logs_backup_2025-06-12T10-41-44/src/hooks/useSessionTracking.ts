import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createUserSession, updateSessionActivity, getDeviceInfo } from '@/lib/api/security';

export function useSessionTracking() {
  const sessionTokenRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // الحصول على الجلسة الحالية
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return;
        }
        
        if (session?.access_token && !sessionTokenRef.current) {
          sessionTokenRef.current = session.access_token;
          
          // إنشاء جلسة حقيقية باستخدام النظام
          await createRealSession(session.access_token, session.user.id);
          
          // بدء تتبع النشاط
          startActivityTracking();
        }
      } catch (error) {
      }
    };

    const createRealSession = async (sessionToken: string, userId: string) => {
      try {
        
        // الحصول على معلومات الجهاز الحقيقية
        const deviceInfo = getDeviceInfo();
        
        // إنشاء الجلسة باستخدام النظام الحقيقي
        const result = await createUserSession(sessionToken, deviceInfo, 'email');
        
        if (result.success) {
        } else {
          
          // محاولة إنشاء جلسة مبسطة باستخدام RPC functions
          await createSimpleSessionViaRPC(userId, sessionToken, deviceInfo);
        }
      } catch (error) {
        
        // محاولة إنشاء جلسة مبسطة كبديل
        try {
          await createSimpleSessionViaRPC(userId, sessionToken, getDeviceInfo());
        } catch (fallbackError) {
        }
      }
    };

    const createSimpleSessionViaRPC = async (userId: string, sessionToken: string, deviceInfo: any) => {
      try {
        // إنشاء جلسة مبسطة باستخدام RPC function
        const { data: sessionData, error: sessionError } = await (supabase as any)
          .rpc('create_simple_session', {
            p_user_id: userId,
            p_session_token: sessionToken,
            p_device_info: deviceInfo,
            p_ip_address: '127.0.0.1',
            p_user_agent: navigator.userAgent
          });

        if (sessionError) {
        } else {
          
          // إنشاء جهاز موثوق أيضاً
          await createSimpleDeviceViaRPC(userId, deviceInfo);
        }
      } catch (error) {
      }
    };

    const createSimpleDeviceViaRPC = async (userId: string, deviceInfo: any) => {
      try {
        const { data, error } = await (supabase as any)
          .rpc('create_simple_device', {
            p_user_id: userId,
            p_device_info: deviceInfo,
            p_device_fingerprint: `${deviceInfo.browser}_${deviceInfo.os}_${Date.now()}`,
            p_ip_address: '127.0.0.1'
          });

        if (error) {
        } else {
        }
      } catch (error) {
      }
    };

    const startActivityTracking = () => {
      // تحديث النشاط كل 5 دقائق
      intervalRef.current = setInterval(async () => {
        if (sessionTokenRef.current) {
          const now = Date.now();
          const timeSinceLastActivity = now - lastActivityRef.current;
          
          // إذا كان هناك نشاط في آخر 5 دقائق
          if (timeSinceLastActivity < 5 * 60 * 1000) {
            try {
              await updateSessionActivity(sessionTokenRef.current);
            } catch (error) {
            }
          }
        }
      }, 5 * 60 * 1000); // كل 5 دقائق
    };

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleAuthStateChange = (event: string, session: any) => {
      
      if (event === 'SIGNED_IN' && session?.access_token) {
        sessionTokenRef.current = session.access_token;
        initializeSession();
      } else if (event === 'SIGNED_OUT') {
        sessionTokenRef.current = null;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // تتبع أحداث النشاط
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // تتبع تغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // تهيئة الجلسة إذا كان المستخدم مسجل دخول بالفعل
    initializeSession();

    return () => {
      // تنظيف المستمعين
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      subscription.unsubscribe();
    };
  }, []);

  return {
    sessionToken: sessionTokenRef.current,
    lastActivity: lastActivityRef.current
  };
}
