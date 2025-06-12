import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

/**
 * Hook لضمان الحصول على عميل Supabase مصادق عليه
 */
export const useAuthenticatedSupabase = () => {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // الحصول على الجلسة الحالية
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session) {
        setSession(session);
        // تحديث headers للعميل
        if (supabase.rest.headers && session.access_token) {
          supabase.rest.headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      
      setIsReady(true);
    };

    getSession();

    // مراقبة تغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.access_token && supabase.rest.headers) {
          supabase.rest.headers['Authorization'] = `Bearer ${session.access_token}`;
        } else if (event === 'SIGNED_OUT') {
          // إزالة header عند تسجيل الخروج
          if (supabase.rest.headers) {
            delete supabase.rest.headers['Authorization'];
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    supabase,
    isReady,
    isAuthenticated: !!session,
    session,
    user: session?.user || null
  };
};
