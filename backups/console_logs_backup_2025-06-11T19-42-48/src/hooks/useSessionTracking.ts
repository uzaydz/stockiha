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
          console.error('خطأ في الحصول على الجلسة:', error);
          return;
        }
        
        if (session?.access_token && !sessionTokenRef.current) {
          sessionTokenRef.current = session.access_token;
          console.log('تم العثور على جلسة نشطة، بدء إنشاء جلسة في قاعدة البيانات...');
          
          // إنشاء جلسة حقيقية باستخدام النظام
          await createRealSession(session.access_token, session.user.id);
          
          // بدء تتبع النشاط
          startActivityTracking();
        }
      } catch (error) {
        console.error('خطأ في تهيئة تتبع الجلسة:', error);
      }
    };

    const createRealSession = async (sessionToken: string, userId: string) => {
      try {
        console.log('إنشاء جلسة للمستخدم:', userId);
        
        // الحصول على معلومات الجهاز الحقيقية
        const deviceInfo = getDeviceInfo();
        console.log('معلومات الجهاز:', deviceInfo);
        
        // إنشاء الجلسة باستخدام النظام الحقيقي
        const result = await createUserSession(sessionToken, deviceInfo, 'email');
        
        if (result.success) {
          console.log('✅ تم إنشاء الجلسة بنجاح:', result.sessionId);
        } else {
          console.error('❌ فشل في إنشاء الجلسة:', result.error);
          
          // محاولة إنشاء جلسة مبسطة باستخدام RPC functions
          console.log('محاولة إنشاء جلسة مبسطة...');
          await createSimpleSessionViaRPC(userId, sessionToken, deviceInfo);
        }
      } catch (error) {
        console.error('خطأ في إنشاء الجلسة الحقيقية:', error);
        
        // محاولة إنشاء جلسة مبسطة كبديل
        try {
          await createSimpleSessionViaRPC(userId, sessionToken, getDeviceInfo());
        } catch (fallbackError) {
          console.error('فشل في إنشاء الجلسة البديلة:', fallbackError);
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
          console.error('خطأ في إنشاء الجلسة المبسطة:', sessionError);
        } else {
          console.log('✅ تم إنشاء الجلسة المبسطة بنجاح:', sessionData);
          
          // إنشاء جهاز موثوق أيضاً
          await createSimpleDeviceViaRPC(userId, deviceInfo);
        }
      } catch (error) {
        console.error('خطأ في إنشاء الجلسة المبسطة:', error);
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
          console.error('خطأ في إنشاء الجهاز:', error);
        } else {
          console.log('✅ تم إنشاء الجهاز بنجاح:', data);
        }
      } catch (error) {
        console.error('خطأ في إنشاء الجهاز:', error);
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
              console.error('خطأ في تحديث نشاط الجلسة:', error);
            }
          }
        }
      }, 5 * 60 * 1000); // كل 5 دقائق
    };

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleAuthStateChange = (event: string, session: any) => {
      console.log('🔄 [useSessionTracking] تغيير حالة المصادقة:', {
        event,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        currentSessionToken: !!sessionTokenRef.current
      });
      
      if (event === 'SIGNED_IN' && session?.access_token) {
        sessionTokenRef.current = session.access_token;
        console.log('✅ [useSessionTracking] تم تسجيل الدخول، بدء تهيئة الجلسة...');
        initializeSession();
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 [useSessionTracking] تم تسجيل الخروج، تنظيف الجلسة...');
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