/**
 * 🎯 Hook محسن يستخدم AuthSingleton
 * بديل محسن لـ useAuthenticatedSupabase
 */

import { useEffect, useState } from 'react';
import { authSingleton } from '@/lib/authSingleton';
import { Session, User } from '@supabase/supabase-js';

interface AuthSingletonHookReturn {
  isReady: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

/**
 * Hook لاستخدام AuthSingleton مع React
 */
export const useAuthSingleton = (): AuthSingletonHookReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let subscriptionId: string | null = null;

    const initializeAuth = async () => {
      try {
        // التأكد من تهيئة AuthSingleton
        await authSingleton.initialize();
        
        // الحصول على البيانات الحالية
        const authData = await authSingleton.getAuth();
        setSession(authData.session);
        setUser(authData.user);
        setIsReady(true);
        setIsLoading(false);

        // الاشتراك في التحديثات
        subscriptionId = authSingleton.subscribe((authData) => {
          setSession(authData.session);
          setUser(authData.user);
          setIsReady(true);
          setIsLoading(false);
        });

      } catch (error) {
        setIsReady(true);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // تنظيف الاشتراك عند إلغاء تحميل المكون
    return () => {
      if (subscriptionId) {
        authSingleton.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return {
    isReady,
    isAuthenticated: !!session && !!user,
    session,
    user,
    isLoading
  };
};

/**
 * Hook مبسط للحصول على المستخدم الحالي فقط
 */
export const useCurrentUser = (): { user: User | null; isLoading: boolean } => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscriptionId: string | null = null;

    const initializeUser = async () => {
      try {
        const currentUser = await authSingleton.getUser();
        setUser(currentUser);
        setIsLoading(false);

        // الاشتراك في التحديثات
        subscriptionId = authSingleton.subscribe((authData) => {
          setUser(authData.user);
          setIsLoading(false);
        });

      } catch (error) {
        setIsLoading(false);
      }
    };

    initializeUser();

    return () => {
      if (subscriptionId) {
        authSingleton.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return { user, isLoading };
};

/**
 * Hook للحصول على الجلسة الحالية فقط
 */
export const useCurrentSession = (): { session: Session | null; isLoading: boolean } => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscriptionId: string | null = null;

    const initializeSession = async () => {
      try {
        const currentSession = await authSingleton.getSession();
        setSession(currentSession);
        setIsLoading(false);

        // الاشتراك في التحديثات
        subscriptionId = authSingleton.subscribe((authData) => {
          setSession(authData.session);
          setIsLoading(false);
        });

      } catch (error) {
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      if (subscriptionId) {
        authSingleton.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return { session, isLoading };
};

/**
 * Hook للتحقق من حالة المصادقة فقط
 */
export const useAuthStatus = (): { isAuthenticated: boolean; isLoading: boolean } => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscriptionId: string | null = null;

    const checkAuthStatus = async () => {
      try {
        const authenticated = await authSingleton.isAuthenticated();
        setIsAuthenticated(authenticated);
        setIsLoading(false);

        // الاشتراك في التحديثات
        subscriptionId = authSingleton.subscribe((authData) => {
          setIsAuthenticated(!!authData.session && !!authData.user);
          setIsLoading(false);
        });

      } catch (error) {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    return () => {
      if (subscriptionId) {
        authSingleton.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return { isAuthenticated, isLoading };
};

export default useAuthSingleton;
