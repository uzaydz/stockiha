import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { getCurrentSession, sessionMonitor } from '@/lib/session-monitor';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';

/**
 * SupabaseContext v2.0
 * ====================
 * تحسينات الأداء:
 * - استخدام sessionMonitor بدلاً من استدعاء auth.getSession مباشرة
 * - منع التحميل المتكرر باستخدام singleton
 * - إزالة السجلات من الإنتاج
 */

type SupabaseContextType = {
  supabase: SupabaseClient;
  isLoading: boolean;
};

// وضع التطوير
const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

// إنشاء السياق
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// 🔒 Singleton للتحقق من التهيئة (يمنع التكرار)
const INIT_KEY = '__SUPABASE_CONTEXT_INITIALIZED__';
let cachedClient: SupabaseClient | null = null;

const ensureClientReady = async (): Promise<SupabaseClient> => {
  // استخدام الـ cache إذا كان متاحاً
  if (cachedClient) {
    return cachedClient;
  }

  try {
    // تحقق من أن supabase متاح
    if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
      cachedClient = supabase;
      return supabase;
    }

    // fallback: استخدم getSupabaseClient
    const client = await getSupabaseClient();
    if (client && client.auth && typeof client.auth.getSession === 'function') {
      cachedClient = client;
      return client;
    }

    throw new Error('Supabase client غير متاح');
  } catch (error) {
    cachedClient = supabase;
    return supabase; // fallback إلى supabase مباشرة
  }
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [clientInstance, setClientInstance] = useState<SupabaseClient>(supabase);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // ✅ منع التحميل المتكرر في StrictMode
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    // التحقق من جلسة المستخدم الحالية عند تحميل التطبيق
    const checkSession = async () => {
      try {
        const client = await ensureClientReady();
        setClientInstance(client);

        // ✅ استخدام sessionMonitor بدلاً من auth.getSession مباشرة
        // sessionMonitor يقوم بالـ caching تلقائياً
        const { session: existingSession, isValid } = getCurrentSession();
        const isOnline = isAppOnline();

        if (!isOnline) {
          try {
            client.auth.stopAutoRefresh?.();
            client.removeAllChannels?.();
            client.realtime?.disconnect?.();
          } catch {}
        }
        // ✅ لا نستدعي auth.getSession هنا - sessionMonitor يتولى ذلك
      } catch (error) {
        if (isDev) {
          console.warn('⚠️ [SupabaseProvider] checkSession error', (error as any)?.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // ✅ استخدام sessionMonitor للاستماع لتغييرات الجلسة
    const unsubscribeSession = sessionMonitor.addListener((session, isValid) => {
      // يتم إخطارنا عند تغير الجلسة - لا حاجة لمستمع منفصل
    });

    return () => {
      unsubscribeSession();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = async () => {
      markNetworkOffline({ force: true });
      try {
        const client = await ensureClientReady();
        client.auth.stopAutoRefresh?.();
        client.removeAllChannels?.();
        client.realtime?.disconnect?.();
      } catch {}
    };

    const handleOnline = async () => {
      markNetworkOnline();
      try {
        const client = await ensureClientReady();
        client.auth.startAutoRefresh?.();
        client.realtime?.connect?.();
      } catch {}
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
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
