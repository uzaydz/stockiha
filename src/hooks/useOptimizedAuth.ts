// Hook محسن للمصادقة والمؤسسة
// Optimized Auth and Organization Hook

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  userCache, 
  organizationCache, 
  authCache, 
  cacheKeys, 
  cacheWithFallback 
} from '@/lib/cache/advanced-cache-system';

interface OptimizedAuthState {
  user: any;
  userId: string | null;
  organizationId: string | null;
  isLoading: boolean;
  error: string | null;
  organizationData: any;
  isOrganizationLoading: boolean;
}

// Singleton لتجنب استدعاءات متعددة
class AuthManager {
  private static instance: AuthManager;
  private currentUserId: string | null = null;
  private currentOrgId: string | null = null;
  private authPromise: Promise<any> | null = null;
  private orgPromise: Promise<any> | null = null;
  private listeners: Set<(state: OptimizedAuthState) => void> = new Set();

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // إضافة مستمع للتغييرات
  subscribe(listener: (state: OptimizedAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // إشعار جميع المستمعين
  private notify(state: OptimizedAuthState) {
    this.listeners.forEach(listener => listener(state));
  }

  // جلب معرف المؤسسة بطريقة محسنة
  async getOrganizationId(userId: string): Promise<string | null> {
    const cacheKey = cacheKeys.userOrganization(userId);
    
    return cacheWithFallback(
      userCache,
      cacheKey,
      async () => {
        // منع استدعاءات متعددة لنفس المستخدم
        if (this.orgPromise && this.currentUserId === userId) {
          return this.orgPromise;
        }

        this.orgPromise = this.fetchUserOrganization(userId);
        const result = await this.orgPromise;
        
        // مسح Promise بعد الانتهاء
        this.orgPromise = null;
        
        return result;
      },
      10 * 60 * 1000 // 10 minutes cache
    );
  }

  private async fetchUserOrganization(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (error) {
        return null;
      }

      return data?.organization_id || null;
    } catch (error) {
      return null;
    }
  }

  // جلب بيانات المؤسسة
  async getOrganizationData(orgId: string): Promise<any> {
    const cacheKey = cacheKeys.organization(orgId);
    
    return cacheWithFallback(
      organizationCache,
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch organization: ${error.message}`);
        }

        return data;
      },
      15 * 60 * 1000 // 15 minutes cache
    );
  }

  // مسح cache للمستخدم
  clearUserCache(userId: string) {
    userCache.delete(cacheKeys.user(userId));
    userCache.delete(cacheKeys.userOrganization(userId));
    authCache.delete(cacheKeys.auth(userId));
  }

  // مسح cache للمؤسسة
  clearOrganizationCache(orgId: string) {
    organizationCache.deleteByPrefix(`org:${orgId}`);
  }
}

export function useOptimizedAuth(): OptimizedAuthState {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<OptimizedAuthState>({
    user,
    userId: user?.id || null,
    organizationId: null,
    isLoading: authLoading,
    error: null,
    organizationData: null,
    isOrganizationLoading: false,
  });

  const authManager = useMemo(() => AuthManager.getInstance(), []);

  // دالة محسنة لجلب معرف المؤسسة
  const fetchOrganizationId = useCallback(async (userId: string) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isOrganizationLoading: true, error: null }));

    try {
      const orgId = await authManager.getOrganizationId(userId);
      
      setState(prev => ({ 
        ...prev, 
        organizationId: orgId,
        isOrganizationLoading: false 
      }));

      // جلب بيانات المؤسسة إذا وُجد معرفها
      if (orgId) {
        const orgData = await authManager.getOrganizationData(orgId);
        setState(prev => ({ ...prev, organizationData: orgData }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'خطأ في جلب بيانات المؤسسة',
        isOrganizationLoading: false 
      }));
    }
  }, [authManager]);

  // تأثير لجلب بيانات المؤسسة عند تغيير المستخدم
  useEffect(() => {
    if (user?.id && user.id !== state.userId) {
      setState(prev => ({
        ...prev,
        user,
        userId: user.id,
        isLoading: false,
      }));

             // جلب معرف المؤسسة فقط إذا لم يكن محفوظاً
       const cachedOrgId = userCache.get<string>(cacheKeys.userOrganization(user.id));
       if (cachedOrgId) {
         setState(prev => ({ ...prev, organizationId: cachedOrgId }));
         
         // جلب بيانات المؤسسة إذا كانت محفوظة في cache
         const cachedOrgData = organizationCache.get(cacheKeys.organization(cachedOrgId));
         if (cachedOrgData) {
           setState(prev => ({ ...prev, organizationData: cachedOrgData }));
         } else {
           authManager.getOrganizationData(cachedOrgId).then(orgData => {
             setState(prev => ({ ...prev, organizationData: orgData }));
           }).catch(error => {
           });
         }
       } else {
         fetchOrganizationId(user.id);
       }
    } else if (!user && state.userId) {
      // تسجيل الخروج - مسح البيانات
      setState({
        user: null,
        userId: null,
        organizationId: null,
        isLoading: false,
        error: null,
        organizationData: null,
        isOrganizationLoading: false,
      });
    } else if (!authLoading && !user) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, authLoading, state.userId]); // إزالة fetchOrganizationId و authManager من dependencies

  return state;
}

// Hook لجلب معرف المؤسسة الحالية فقط (محسن)
export function useCurrentOrganizationId(): {
  organizationId: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const { organizationId, isLoading, isOrganizationLoading, error } = useOptimizedAuth();
  
  return {
    organizationId,
    isLoading: isLoading || isOrganizationLoading,
    error,
  };
}

// Hook مخصص لجلب بيانات المؤسسة مع cache
export function useOrganizationData(orgId?: string): {
  organizationData: any;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { organizationId: contextOrgId, organizationData: contextOrgData } = useOptimizedAuth();
  const [localData, setLocalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetOrgId = orgId || contextOrgId;
  const authManager = useMemo(() => AuthManager.getInstance(), []);

  const fetchData = useCallback(async () => {
    if (!targetOrgId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await authManager.getOrganizationData(targetOrgId);
      setLocalData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب بيانات المؤسسة';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [targetOrgId, authManager]);

  useEffect(() => {
    if (targetOrgId) {
      // استخدام البيانات من context إذا كانت متاحة
      if (contextOrgData && targetOrgId === contextOrgId) {
        setLocalData(contextOrgData);
      } else {
        // جلب البيانات إذا لم تكن متاحة
        const cachedData = organizationCache.get(cacheKeys.organization(targetOrgId));
        if (cachedData) {
          setLocalData(cachedData);
        } else {
          fetchData();
        }
      }
    }
  }, [targetOrgId, contextOrgId, contextOrgData, fetchData]);

  return {
    organizationData: localData || contextOrgData,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// تنظيف cache عند تسجيل الخروج
export function useAuthCleanup() {
  const authManager = useMemo(() => AuthManager.getInstance(), []);

  return useCallback((userId?: string, orgId?: string) => {
    if (userId) {
      authManager.clearUserCache(userId);
    }
    if (orgId) {
      authManager.clearOrganizationCache(orgId);
    }
  }, [authManager]);
}
