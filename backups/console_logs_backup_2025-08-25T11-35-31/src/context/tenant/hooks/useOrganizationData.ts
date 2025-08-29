/**
 * Hook محسن لإدارة بيانات المؤسسة
 * يوفر جلب ذكي مع cache وإدارة حالة محسنة
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OrganizationFetcher, FetchParams, FetchOptions } from '../services/OrganizationFetcher';
import { Organization } from '../types';
import { API_TIMEOUTS } from '@/config/api-timeouts';

export interface UseOrganizationDataOptions {
  autoFetch?: boolean;
  retries?: number;
  timeout?: number;
  onSuccess?: (organization: Organization) => void;
  onError?: (error: Error) => void;
}

export interface UseOrganizationDataReturn {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  fetchOrganization: (params: FetchParams, options?: FetchOptions) => Promise<void>;
  refreshOrganization: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  stats: {
    lastFetch: Date | null;
    fetchCount: number;
    cacheHits: number;
  };
}

export function useOrganizationData(
  initialParams?: FetchParams,
  options: UseOrganizationDataOptions = {}
): UseOrganizationDataReturn {
  const {
    autoFetch = true,
    retries = 0, // تحسين: إلغاء المحاولات المتكررة
    timeout = API_TIMEOUTS.ORGANIZATION_LOAD, // تحسين: استخدام timeout من الإعدادات (8 ثوان)
    onSuccess,
    onError
  } = options;

  // State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking
  const lastParamsRef = useRef<FetchParams | null>(null);
  const statsRef = useRef({
    lastFetch: null as Date | null,
    fetchCount: 0,
    cacheHits: 0
  });

  // Prevent duplicate fetches
  const isCurrentlyFetching = useRef(false);

  /**
   * جلب بيانات المؤسسة
   */
  const fetchOrganization = useCallback(async (
    params: FetchParams,
    fetchOptions: FetchOptions = {}
  ) => {
    const fetchStartTime = performance.now();
    console.log(`🚀 [useOrganizationData] بدء جلب المؤسسة - الوقت: ${fetchStartTime.toFixed(2)}ms`, {
      params,
      options: { retries, timeout, ...fetchOptions },
      timestamp: new Date().toISOString(),
      isCurrentlyFetching: isCurrentlyFetching.current
    });

    // منع الطلبات المكررة
    if (isCurrentlyFetching.current) {
      console.log('⏳ [useOrganizationData] طلب معلق، انتظار...');
      return;
    }

    isCurrentlyFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const rpcStartTime = performance.now();
      console.log('📡 [useOrganizationData] بدء استدعاء OrganizationFetcher.fetch...');

      const result = await OrganizationFetcher.fetch(params, {
        retries,
        timeout,
        contextName: 'useOrganizationData',
        ...fetchOptions
      });

      const rpcTime = performance.now() - rpcStartTime;
      console.log('✅ [useOrganizationData] انتهى استدعاء OrganizationFetcher.fetch:', {
        success: result.success,
        source: result.source,
        duration: `${result.duration.toFixed(2)}ms`,
        rpcTime: `${rpcTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });

      if (result.success && result.data) {
        const transformStartTime = performance.now();
        const orgData = transformOrganizationData(result.data);
        const transformTime = performance.now() - transformStartTime;
        
        console.log('🔧 [useOrganizationData] تحويل البيانات:', {
          transformTime: `${transformTime.toFixed(2)}ms`,
          originalData: result.data,
          transformedData: orgData
        });

        setOrganization(orgData);
        lastParamsRef.current = params;
        
        // Update stats
        statsRef.current.lastFetch = new Date();
        statsRef.current.fetchCount++;
        if (result.source === 'cache') {
          statsRef.current.cacheHits++;
        }

        const totalFetchTime = performance.now() - fetchStartTime;
        console.log('✅ [useOrganizationData] تم جلب المؤسسة بنجاح:', {
          organizationId: orgData.id,
          organizationName: orgData.name,
          source: result.source,
          duration: `${result.duration.toFixed(2)}ms`,
          totalFetchTime: `${totalFetchTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        });

        onSuccess?.(orgData);
        
      } else {
        throw result.error || new Error('فشل في جلب بيانات المؤسسة');
      }
    } catch (err) {
      const error = err as Error;
      const totalFetchTime = performance.now() - fetchStartTime;
      
      console.error('❌ [useOrganizationData] خطأ في جلب المؤسسة:', {
        error: error.message,
        totalFetchTime: `${totalFetchTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      setError(error);
      onError?.(error);
      
    } finally {
      const totalTime = performance.now() - fetchStartTime;
      console.log('🏁 [useOrganizationData] انتهى جلب المؤسسة:', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        success: !error,
        timestamp: new Date().toISOString()
      });
      
      setIsLoading(false);
      isCurrentlyFetching.current = false;
    }
  }, [retries, timeout, onSuccess, onError]);

  /**
   * تحديث بيانات المؤسسة
   */
  const refreshOrganization = useCallback(async () => {
    if (!lastParamsRef.current) {
      console.log('⚠️ [useOrganizationData] لا توجد معاملات سابقة للتحديث');
      return;
    }

    console.log('🔄 [useOrganizationData] تحديث بيانات المؤسسة...');
    
    // مسح Cache وإعادة الجلب
    OrganizationFetcher.clearCache();
    await fetchOrganization(lastParamsRef.current, { useCache: false });
  }, [fetchOrganization]);

  /**
   * مسح الأخطاء
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * تأثير للجلب التلقائي
   */
  useEffect(() => {
    if (autoFetch && initialParams && !organization && !isLoading && !error) {
      console.log('🔄 [useOrganizationData] جلب تلقائي للمؤسسة:', {
        params: initialParams,
        autoFetch,
        hasOrganization: !!organization,
        isLoading,
        hasError: !!error,
        timestamp: new Date().toISOString()
      });
      
      fetchOrganization(initialParams);
    } else {
      console.log('⏸️ [useOrganizationData] تخطي الجلب التلقائي:', {
        autoFetch,
        hasInitialParams: !!initialParams,
        hasOrganization: !!organization,
        isLoading,
        hasError: !!error,
        timestamp: new Date().toISOString()
      });
    }
  }, [autoFetch, initialParams, organization, isLoading, error, fetchOrganization]);

  /**
   * تنظيف عند unmount
   */
  useEffect(() => {
    return () => {
      isCurrentlyFetching.current = false;
    };
  }, []);

  // تسجيل حالة التحميل
  useEffect(() => {
    console.log('📊 [useOrganizationData] حالة التحميل:', {
      isLoading,
      hasOrganization: !!organization,
      hasError: !!error,
      stats: statsRef.current,
      timestamp: new Date().toISOString()
    });
  }, [isLoading, organization, error]);

  return {
    organization,
    isLoading,
    error,
    fetchOrganization,
    refreshOrganization,
    clearError,
    stats: statsRef.current
  };
}

/**
 * تحويل بيانات المؤسسة إلى النموذج المطلوب
 */
function transformOrganizationData(rawData: any): Organization {
  const startTime = performance.now();
  
  const result = {
    id: rawData.id,
    name: rawData.name || rawData.business_name || 'متجر',
    description: rawData.description,
    logo_url: rawData.logo_url,
    domain: rawData.domain,
    subdomain: rawData.subdomain,
    subscription_tier: rawData.subscription_tier || 'free',
    subscription_status: rawData.subscription_status || 'trial',
    settings: {
      ...rawData.settings,
      default_language: rawData.default_language || rawData.settings?.default_language || 'ar'
    },
    created_at: rawData.created_at,
    updated_at: rawData.updated_at,
    owner_id: rawData.owner_id
  };

  const transformTime = performance.now() - startTime;
  if (transformTime > 1) {
    console.warn('⚠️ [useOrganizationData] تحويل البيانات بطيء:', {
      transformTime: `${transformTime.toFixed(2)}ms`,
      dataSize: JSON.stringify(rawData).length
    });
  }

  return result;
}

/**
 * Hook مبسط للحصول على معرف المؤسسة فقط
 */
export function useOrganizationId(): {
  organizationId: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { organization, isLoading, error } = useOrganizationData();
  
  return {
    organizationId: organization?.id || null,
    isLoading,
    error
  };
}

/**
 * Hook للحصول على إعدادات المؤسسة فقط
 */
export function useOrganizationSettings(): {
  settings: Record<string, any> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { organization, isLoading, error } = useOrganizationData();
  
  return {
    settings: organization?.settings || null,
    isLoading,
    error
  };
}
