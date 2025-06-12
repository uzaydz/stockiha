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
    console.error('❌ فشل في الحصول على Supabase client:', error);
    return supabase; // fallback إلى supabase مباشرة
  }
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [clientInstance, setClientInstance] = useState<SupabaseClient>(supabase);

  useEffect(() => {
    // التحقق من جلسة المستخدم الحالية عند تحميل التطبيق
    const checkSession = async () => {
      try {
        const client = await ensureClientReady();
        setClientInstance(client);
        
        const { data, error } = await client.auth.getSession();
        if (error) {
          console.warn('⚠️ خطأ في جلب الجلسة:', error);
        }
      } catch (error) {
        console.error('❌ خطأ في التحقق من الجلسة:', error);
      } finally {
        setIsLoading(false);
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
          console.log('🔐 Auth state change:', event, !!session);
          // تحديث حالة التطبيق عند تغير حالة المصادقة
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('❌ فشل في إعداد auth listener:', error);
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
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase يجب استخدامه داخل SupabaseProvider');
  }
  return context;
};
