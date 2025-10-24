/**
 * Hook إدارة مؤسسة المستخدم
 * منفصل لتحسين الأداء وإدارة المؤسسات
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Organization, UseUserOrganizationReturn, AuthError, UserProfile } from '../types';
import { getOrganizationById } from '@/lib/api/deduplicatedApi';
import { trackPerformance, handleAuthError, debounce } from '../utils/authHelpers';
import { AUTH_TIMEOUTS } from '../constants/authConstants';
import { dispatchAppEvent, addAppEventListener } from '@/lib/events/eventManager';

interface UseUserOrganizationProps {
  userProfile: UserProfile | null;
  enabled?: boolean;
}

export const useUserOrganization = ({ userProfile, enabled = true }: UseUserOrganizationProps): UseUserOrganizationReturn => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const organizationCacheRef = useRef<Map<string, { org: Organization; timestamp: number }>>(new Map());

  /**
   * التحقق من صحة cache المؤسسة
   */
  const isValidOrgCache = useCallback((cached: { org: Organization; timestamp: number }): boolean => {
    const now = Date.now();
    return (now - cached.timestamp) < AUTH_TIMEOUTS.PROFILE_CACHE_DURATION;
  }, []);

  /**
   * جلب بيانات المؤسسة
   */
  const fetchOrganization = useCallback(async (orgId: string, forceRefresh = false): Promise<void> => {
    if (!orgId || !enabled || fetchingRef.current) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // التحقق من cache أولاً
    if (!forceRefresh) {
      const cached = organizationCacheRef.current.get(orgId);
      if (cached && isValidOrgCache(cached)) {
        if (process.env.NODE_ENV === 'development') {
        }
        setOrganization(cached.org);
        setError(null);

        // إرسال حدث لـ AuthContext عند العثور على المؤسسة في cache
        setTimeout(() => {
          dispatchAppEvent('organizationLoaded', {
            organization: cached.org
          }, {
            dedupeKey: `organizationLoaded:${cached.org.id}`
          });
        }, 50);

        return;
      }
    }

    // منع الطلبات المتكررة
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < AUTH_TIMEOUTS.DEBOUNCE_DELAY) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    const startTime = performance.now();
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const orgData = await getOrganizationById(orgId);

      if (orgData) {
        if (process.env.NODE_ENV === 'development') {
        }
        setOrganization(orgData);
        setError(null);

        // إرسال حدث مباشر لـ AuthContext عند تحميل المؤسسة
        setTimeout(() => {
          dispatchAppEvent('organizationLoaded', {
            organization: orgData
          }, {
            dedupeKey: `organizationLoaded:${orgData.id}`
          });
        }, 50);

        // حفظ في cache
        organizationCacheRef.current.set(orgId, {
          org: orgData,
          timestamp: now
        });

        // حفظ في localStorage
        try {
          localStorage.setItem('current_organization', JSON.stringify(orgData));
          localStorage.setItem(`organization_cache_${orgId}`, JSON.stringify({
            data: orgData,
            timestamp: now
          }));
        } catch (storageError) {
          // تجاهل أخطاء التخزين
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
        }
        setOrganization(null);
        setError(null);
      }

      lastFetchRef.current = now;
      trackPerformance('fetchOrganization', startTime);

    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
      }
      const authError = handleAuthError(err);
      setError(authError);
      setOrganization(null);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [enabled, isValidOrgCache]);

  /**
   * تبديل المؤسسة
   */
  const switchOrganization = useCallback(async (newOrgId: string): Promise<boolean> => {
    if (!newOrgId) return false;

    const startTime = performance.now();
    setError(null);

    try {
      await fetchOrganization(newOrgId, true);
      
      // تحديث معرف المؤسسة في التخزين المحلي
      try {
        localStorage.setItem('bazaar_organization_id', newOrgId);
      } catch (storageError) {
        // تجاهل أخطاء التخزين
      }

      // إرسال حدث تغيير المؤسسة
      dispatchAppEvent('organizationChanged', {
        organizationId: newOrgId
      }, {
        dedupeKey: `organizationChanged:${newOrgId}`,
        dedupeWindowMs: 500
      });

      trackPerformance('switchOrganization', startTime);
      return true;

    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      return false;
    }
  }, [fetchOrganization]);

  /**
   * إعادة جلب بيانات المؤسسة
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (userProfile?.organization_id) {
      await fetchOrganization(userProfile.organization_id, true);
    }
  }, [userProfile?.organization_id, fetchOrganization]);

  /**
   * تنظيف البيانات
   */
  const clearOrganization = useCallback((): void => {
    setOrganization(null);
    setError(null);
    setIsLoading(false);
    organizationCacheRef.current.clear();
  }, []);

  /**
   * تحميل المؤسسة من localStorage عند البداية
   */
  const loadOrganizationFromStorage = useCallback((orgId: string): void => {
    try {
      if (process.env.NODE_ENV === 'development') {
      }

      // محاولة تحميل من cache مع timestamp
      const cacheKey = `organization_cache_${orgId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data && parsed.timestamp) {
          const now = Date.now();
          if ((now - parsed.timestamp) < AUTH_TIMEOUTS.PROFILE_CACHE_DURATION) {
                      if (process.env.NODE_ENV === 'development') {
          }
          setOrganization(parsed.data);
          organizationCacheRef.current.set(orgId, {
            org: parsed.data,
            timestamp: parsed.timestamp
          });

          // إرسال حدث لـ AuthContext
          setTimeout(() => {
          dispatchAppEvent('organizationLoaded', {
            organization: parsed.data
          }, {
            dedupeKey: `organizationLoaded:${parsed.data.id}`
          });
          }, 0);

          return;
          } else {
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }
      }

      // fallback إلى البيانات العادية
      const stored = localStorage.getItem('current_organization');
      if (stored) {
        const org = JSON.parse(stored);
        if (org.id === orgId) {
          if (process.env.NODE_ENV === 'development') {
          }
          setOrganization(org);
          organizationCacheRef.current.set(orgId, {
            org,
            timestamp: Date.now()
          });

          // إرسال حدث لـ AuthContext
          setTimeout(() => {
          dispatchAppEvent('organizationLoaded', {
            organization: org
          }, {
            dedupeKey: `organizationLoaded:${org.id}`
          });
          }, 0);
        } else {
          if (process.env.NODE_ENV === 'development') {
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, []);

  /**
   * جلب المؤسسة عند تغيير المستخدم
   */
  useEffect(() => {
    if (userProfile?.organization_id && enabled) {
      if (process.env.NODE_ENV === 'development') {
      }

      // تحميل سريع من localStorage أولاً
      loadOrganizationFromStorage(userProfile.organization_id);

      // ثم جلب محدث من API
      fetchOrganization(userProfile.organization_id);
    } else {
      if (process.env.NODE_ENV === 'development') {
      }
      clearOrganization();
    }
  }, [userProfile?.organization_id, enabled, fetchOrganization, loadOrganizationFromStorage, clearOrganization]);

  /**
   * تنظيف cache منتهي الصلاحية دورياً
   */
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      organizationCacheRef.current.forEach((cached, orgId) => {
        if (!isValidOrgCache(cached)) {
          keysToDelete.push(orgId);
        }
      });

      keysToDelete.forEach(orgId => {
        organizationCacheRef.current.delete(orgId);
      });

      if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
      }
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(cleanup);
  }, [isValidOrgCache]);

  /**
   * الاستماع لأحداث تغيير المؤسسة
   */
  useEffect(() => {
    const unsubscribe = addAppEventListener<{ organizationId: string }>(
      'organizationChanged',
      (detail) => {
        const organizationId = detail?.organizationId;
        if (organizationId && organizationId !== organization?.id) {
          fetchOrganization(organizationId, true);
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [organization?.id, fetchOrganization]);

  /**
   * تنظيف الموارد عند unmount
   */
  useEffect(() => {
    return () => {
      fetchingRef.current = false;
    };
  }, []);

  return {
    organization,
    isLoading,
    error,
    refetch,
    switchOrganization
  };
};
