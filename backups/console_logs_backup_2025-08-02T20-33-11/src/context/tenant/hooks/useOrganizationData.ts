/**
 * Hook محسن لإدارة بيانات المؤسسة
 * يوفر جلب ذكي مع cache وإدارة حالة محسنة
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OrganizationFetcher, FetchParams, FetchOptions } from '../services/OrganizationFetcher';
import { Organization } from '../types';

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
    retries = 2,
    timeout = 10000,
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
    // منع الطلبات المكررة
    if (isCurrentlyFetching.current) {
      return;
    }

    isCurrentlyFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {

      const result = await OrganizationFetcher.fetch(params, {
        retries,
        timeout,
        contextName: 'useOrganizationData',
        ...fetchOptions
      });

      if (result.success && result.data) {
        const orgData = transformOrganizationData(result.data);
        setOrganization(orgData);
        lastParamsRef.current = params;
        
        // Update stats
        statsRef.current.lastFetch = new Date();
        statsRef.current.fetchCount++;
        if (result.source === 'cache') {
          statsRef.current.cacheHits++;
        }

        onSuccess?.(orgData);
        
      } else {
        throw result.error || new Error('فشل في جلب بيانات المؤسسة');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      
    } finally {
      setIsLoading(false);
      isCurrentlyFetching.current = false;
    }
  }, [retries, timeout, onSuccess, onError]);

  /**
   * تحديث بيانات المؤسسة
   */
  const refreshOrganization = useCallback(async () => {
    if (!lastParamsRef.current) {
      return;
    }

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
      fetchOrganization(initialParams);
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
  return {
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
