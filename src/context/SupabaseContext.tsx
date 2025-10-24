import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase';

type SupabaseContextType = {
  supabase: SupabaseClient;
  isLoading: boolean;
};

// إنشاء السياق
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// دالة للتأكد من جاهزية Supabase client
const ensureClientReady = async () => {
  try {
    // تحقق من أن supabase متاح
    if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
      return supabase;
    }
    
    // fallback: استخدم getSupabaseClient
    const client = await getSupabaseClient();
    if (client && client.auth && typeof client.auth.getSession === 'function') {
      return client;
    }
    
    throw new Error('Supabase client غير متاح');
  } catch (error) {
    return supabase; // fallback إلى supabase مباشرة
  }
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [clientInstance, setClientInstance] = useState<SupabaseClient>(supabase);

  useEffect(() => {
    const mountStart = performance.now();
    const logDuration = (label: string, start: number) => {
      try { console.log(label, `${(performance.now() - start).toFixed(2)} ms`); } catch {}
    };
    try { console.log('🔌 [SupabaseProvider] mounting'); } catch {}
    // التحقق من جلسة المستخدم الحالية عند تحميل التطبيق
    const checkSession = async () => {
      try {
        const ensureStart = performance.now();
        const client = await ensureClientReady();
        logDuration('⏱️ [SupabaseProvider] ensureClientReady:', ensureStart);
        setClientInstance(client);
        
        const getSessionStart = performance.now();
        const { data, error } = await client.auth.getSession();
        logDuration('⏱️ [SupabaseProvider] auth.getSession:', getSessionStart);
        if (error) {
          console.warn('⚠️ [SupabaseProvider] getSession error', error?.message);
        }
      } catch (error) {
        console.warn('⚠️ [SupabaseProvider] checkSession error', (error as any)?.message);
      } finally {
        setIsLoading(false);
        logDuration('⏱️ [SupabaseProvider] mount:', mountStart);
        try { console.log('🏁 [SupabaseProvider] mounted'); } catch {}
      }
    };

    checkSession();
    
    // الاستماع لتغييرات حالة المصادقة مع تأخير
    const setupAuthListener = async () => {
      try {
        const client = await ensureClientReady();
        
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((event, session) => {
          // تحديث حالة التطبيق عند تغير حالة المصادقة
          try { console.log('🔔 [SupabaseProvider] auth state change', { event, hasSession: !!session }); } catch {}
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    
    // تأخير إعداد المستمع لضمان تحميل Client
    setTimeout(async () => {
      cleanup = await setupAuthListener();
    }, 500);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase: clientInstance, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
});

SupabaseProvider.displayName = 'SupabaseProvider';

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase يجب استخدامه داخل SupabaseProvider');
  }
  return context;
};
