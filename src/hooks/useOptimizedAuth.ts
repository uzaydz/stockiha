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

// Cache محسن للمؤسسة
const orgIdCache = new Map<string, { orgId: string | null; timestamp: number }>();
const ORG_ID_CACHE_DURATION = 20 * 60 * 1000; // 20 دقيقة

// Singleton لتجنب استدعاءات متعددة
class AuthManager {
  private static instance: AuthManager;
  private currentUserId: string | null = null;
  private currentOrgId: string | null = null;
  private authPromise: Promise<any> | null = null;
  private orgPromise: Promise<any> | null = null;
  private listeners: Set<(state: OptimizedAuthState) => void> = new Set();
  private lastRequestTime: Map<string, number> = new Map();
  private REQUEST_THROTTLE = 1000; // 1 ثانية

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

  // فحص throttling للطلبات
  private isThrottled(key: string): boolean {
    const lastTime = this.lastRequestTime.get(key);
    const now = Date.now();
    
    if (lastTime && (now - lastTime) < this.REQUEST_THROTTLE) {
      return true;
    }
    
    this.lastRequestTime.set(key, now);
    return false;
  }

  // جلب معرف المؤسسة بطريقة محسنة
  async getOrganizationId(userId: string): Promise<string | null> {
    // فحص cache أولاً
    const cached = orgIdCache.get(userId);
    if (cached && Date.now() - cached.timestamp < ORG_ID_CACHE_DURATION) {
      return cached.orgId;
    }

    // فحص throttling
    if (this.isThrottled(`org:${userId}`)) {
      return cached?.orgId || null;
    }

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
        
        // حفظ في cache
        orgIdCache.set(userId, { orgId: result, timestamp: Date.now() });
        
        return result;
      },
      15 * 60 * 1000 // 15 minutes cache
    );
  }

  private async fetchUserOrganization(userId: string): Promise<string | null> {
    try {
      // محاولة أولى: البحث بـ auth_user_id
      let { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      // إذا فشل، جرب البحث بـ id
      if (error || !data?.organization_id) {
        const { data: idData, error: idError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('auth_user_id', userId)
          .maybeSingle();
          
        if (!idError && idData?.organization_id) {
          data = idData;
          error = null;
        }
      }

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
    // فحص throttling
    if (this.isThrottled(`orgData:${orgId}`)) {
      return null;
    }

    const cacheKey = cacheKeys.organization(orgId);
    
    return cacheWithFallback(
      organizationCache,
      cacheKey,
      async () => {
        const { getOrganizationSettings } = await import('@/lib/api/deduplicatedApi');
        const settings = await getOrganizationSettings(orgId);
        if (!settings) {
          throw new Error('Failed to fetch organization settings');
        }
        return { merchant_type: (settings as any).merchant_type };
      },
      20 * 60 * 1000 // 20 minutes cache
    );
  }

  // مسح cache للمستخدم
  clearUserCache(userId: string) {
    userCache.delete(cacheKeys.user(userId));
    userCache.delete(cacheKeys.userOrganization(userId));
    authCache.delete(cacheKeys.auth(userId));
    orgIdCache.delete(userId);
  }

  // مسح cache للمؤسسة
  clearOrganizationCache(orgId: string) {
    organizationCache.deleteByPrefix(`org:${orgId}`);
  }

  // تنظيف cache منتهي الصلاحية
  cleanupExpiredCache() {
    const now = Date.now();
    
    // تنظيف orgIdCache
    for (const [userId, data] of orgIdCache.entries()) {
      if (now - data.timestamp > ORG_ID_CACHE_DURATION) {
        orgIdCache.delete(userId);
      }
    }

    // تنظيف lastRequestTime
    for (const [key, timestamp] of this.lastRequestTime.entries()) {
      if (now - timestamp > this.REQUEST_THROTTLE * 2) {
        this.lastRequestTime.delete(key);
      }
    }
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

  // تنظيف cache دوري
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      authManager.cleanupExpiredCache();
    }, 10 * 60 * 1000); // زيادة من 5 دقائق إلى 10 دقائق

    return () => clearInterval(cleanupInterval);
  }, [authManager]);

  // دالة محسنة لجلب معرف المؤسسة
  const fetchOrganizationId = useCallback(async (userId: string) => {
    if (!userId) return;

    // فحص cache أولاً
    const cached = orgIdCache.get(userId);
    if (cached && Date.now() - cached.timestamp < ORG_ID_CACHE_DURATION) {
      setState(prev => ({ 
        ...prev, 
        organizationId: cached.orgId,
        isOrganizationLoading: false 
      }));

      // جلب بيانات المؤسسة إذا وُجد معرفها
      if (cached.orgId) {
        try {
          const orgData = await authManager.getOrganizationData(cached.orgId);
          setState(prev => ({ ...prev, organizationData: orgData }));
        } catch (error) {
          // تجاهل الأخطاء في جلب بيانات المؤسسة
        }
      }
      return;
    }

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
        try {
          const orgData = await authManager.getOrganizationData(orgId);
          setState(prev => ({ ...prev, organizationData: orgData }));
        } catch (error) {
          // تجاهل الأخطاء في جلب بيانات المؤسسة
        }
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
      const cachedOrgId = orgIdCache.get(user.id);
      if (cachedOrgId && Date.now() - cachedOrgId.timestamp < ORG_ID_CACHE_DURATION) {
        setState(prev => ({ ...prev, organizationId: cachedOrgId.orgId }));
        
        // جلب بيانات المؤسسة إذا كانت محفوظة في cache
        const cachedOrgData = organizationCache.get(cacheKeys.organization(cachedOrgId.orgId || ''));
        if (cachedOrgData) {
          setState(prev => ({ ...prev, organizationData: cachedOrgData }));
        } else if (cachedOrgId.orgId) {
          // جلب البيانات في الخلفية - إزالة setTimeout
          authManager.getOrganizationData(cachedOrgId.orgId).then(orgData => {
            setState(prev => ({ ...prev, organizationData: orgData }));
          }).catch(error => {
            // تجاهل الأخطاء
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
  }, [user, authLoading, state.userId, fetchOrganizationId, authManager]);

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
