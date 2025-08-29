/**
 * TenantHooks - الـ hooks المساعدة
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchOrganizationWithPriority, refetchOrganizationData } from '@/lib/fetchers/organizationFetcher';
import { 
  updateOrganizationFromData, 
  saveCompleteOrganizationData,
  validateAndEnrichOrganization,
  checkOrganizationPermissions
} from '@/lib/processors/organizationProcessor';
import { extractSubdomain } from '@/utils/subdomainUtils';
import { 
  updateLocalStorageOrgId, 
  getStoredOrganizationId,
  getRPCOrganizationData,
  clearOrganizationStorageData
} from '@/lib/storage/localStorageManager';
import { clearOrganizationCache } from '@/lib/cache/organizationCache';
import { throttledLog } from '@/lib/utils/duplicateLogger';
import type { Organization } from '@/types/tenant';
import type { TenantStateRefs } from './TenantState';

// ثوابت التحسين - محسنة للسرعة القصوى
const LOADING_TIMEOUT = 5000; // تقليل إلى 5 ثوان
const RETRY_DELAY = 0; // ✅ إزالة التأخير لتحسين الأداء
const ORGANIZATION_CHANGE_DEBOUNCE = 0; // ✅ إزالة التأخير لحل مشكلة عرض المتجر
const EARLY_RETURN_ENABLED = true; // ✅ تفعيل الإرجاع المبكر

// دالة للتحقق من صحة معرف المؤسسة
const isValidOrganizationId = (id: string): boolean => {
  return id && id.length > 0 && !id.startsWith('temp-') && id !== '';
};

// دالة للتحقق من جاهزية المؤسسة للاستخدام في API
const isOrganizationReadyForAPI = (org: any): boolean => {
  return org && org.id && isValidOrganizationId(org.id) && !org.isTempOrganization;
};

// دالة debounce محسنة
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export function useTenantHooks(
  user: any,
  authOrganization: any,
  currentSubdomain: string | null,
  setState: React.Dispatch<React.SetStateAction<any>>,
  refs: TenantStateRefs
) {
  // حساب حالة المسؤول - سيتم تحديثها عند توفر البيانات
  const isOrgAdmin = useMemo(() => {
    return false; // سيتم تحديثها عند توفر بيانات المؤسسة
  }, []);

  // دالة للتحقق من النطاق المخصص عند بدء التشغيل
  const checkCustomDomainOnStartup = useCallback(async () => {
    if (refs.customDomainProcessed.current || refs.initialized.current) {
      return;
    }

    try {
      refs.customDomainProcessed.current = true;
      
      // فحص النطاق المخصص
      if (currentSubdomain && currentSubdomain !== 'main') {
        // سنقوم باستدعاء loadFallbackOrganization بعد تعريفه
      }
    } catch (error) {
    }
  }, [currentSubdomain, refs]);

  // مزامنة مع AuthContext
  const syncWithAuthContext = useCallback(async () => {
    if (refs.authContextProcessed.current || !authOrganization || refs.loadingOrganization.current || refs.initialized.current) {
      return;
    }

    window.dispatchEvent(new CustomEvent('bazaar:tenant-context-start', {
      detail: {
        timestamp: Date.now(),
        source: 'auth-context'
      }
    }));

    if (process.env.NODE_ENV === 'development') {
      throttledLog('✅ [TenantContext] مزامنة مع AuthContext');
    }

    try {
      const processedOrg = updateOrganizationFromData(authOrganization);
      if (processedOrg) {
        setState(prev => ({ ...prev, organization: processedOrg, isLoading: false, error: null }));
        saveCompleteOrganizationData(processedOrg, currentSubdomain);
        updateLocalStorageOrgId(processedOrg.id);
        refs.initialized.current = true;
        refs.authContextProcessed.current = true;
        
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: { 
            organization: processedOrg, 
            isEarlyDetection: false,
            loadTime: Date.now() - refs.startTime.current,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [authOrganization, currentSubdomain, refs, setState]);

  // تحميل المؤسسة الاحتياطي
  const loadFallbackOrganization = useCallback(async () => {
    console.log('🚀 loadFallbackOrganization: بدء التحميل', {
      currentSubdomain,
      hasAuthOrganization: !!authOrganization,
      refs: {
        fallbackProcessed: refs.fallbackProcessed.current,
        loadingOrganization: refs.loadingOrganization.current,
        initialized: refs.initialized.current
      }
    });
    
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current || refs.initialized.current) {
      console.log('⏭️ loadFallbackOrganization: تم معالجته مسبقاً');
      return;
    }

    try {
      refs.loadingOrganization.current = true;
      refs.fallbackProcessed.current = true;
      
      console.log('🔍 loadFallbackOrganization: فحص البيانات المحفوظة');
      
      // فحص البيانات المحفوظة أولاً
      const storedOrgId = getStoredOrganizationId();
      const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
      
      console.log('🔍 loadFallbackOrganization: البيانات المحفوظة', {
        storedOrgId,
        currentHostname,
        currentSubdomain
      });
      
      // ⚡ تقليل timeout الأمان من 5 ثوان إلى 3 ثوان
      const timeoutId = setTimeout(() => {
        console.log('⏰ loadFallbackOrganization: انتهت مهلة الأمان');
        setState(prev => ({ ...prev, isLoading: false }));
        refs.loadingOrganization.current = false;
        refs.initialized.current = true;
        refs.fallbackProcessed.current = true;
      }, 3000); // تقليل من 5000 إلى 3000
      
      // ⚡ تحسين: فحص cache RPC أولاً مع تحسين الأداء
      if (currentSubdomain && currentSubdomain !== 'main') {
        console.log('🔍 loadFallbackOrganization: فحص cache RPC', { currentSubdomain });
        const rpcOrg = getRPCOrganizationData(currentSubdomain);
        if (rpcOrg) {
          console.log('✅ loadFallbackOrganization: تم العثور على بيانات RPC', { rpcOrg });
          const hydratedOrg = updateOrganizationFromData(rpcOrg);
          if (hydratedOrg) {
            console.log('✅ loadFallbackOrganization: تم تحديث المؤسسة من RPC cache');
            setState(prev => ({ ...prev, organization: hydratedOrg, isLoading: false }));
            updateLocalStorageOrgId(hydratedOrg.id);
            clearTimeout(timeoutId);
            refs.loadingOrganization.current = false;
            refs.initialized.current = true;
            refs.fallbackProcessed.current = true;
            
            // ⚡ تحسين: إرسال الحدث بشكل غير متزامن
            requestIdleCallback ? 
              requestIdleCallback(() => {
                window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                  detail: { 
                    organization: hydratedOrg, 
                    isEarlyDetection: false,
                    loadTime: Date.now() - refs.startTime.current,
                    timestamp: Date.now(),
                    source: 'rpc-cache'
                  }
                }));
              }, { timeout: 50 }) :
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                  detail: { 
                    organization: hydratedOrg, 
                    isEarlyDetection: false,
                    loadTime: Date.now() - refs.startTime.current,
                    timestamp: Date.now(),
                    source: 'rpc-cache'
                  }
                }));
              }, 0);
            
            return;
          }
        }
      }

      console.log('🔄 loadFallbackOrganization: جلب بيانات جديدة');
      const orgData = await fetchOrganizationWithPriority({
        storedOrgId,
        hostname: currentHostname.includes('localhost') ? undefined : currentHostname,
        subdomain: currentSubdomain !== 'main' ? currentSubdomain : undefined
      });
      
      console.log('🔍 loadFallbackOrganization: نتيجة جلب البيانات', { orgData });
      
      if (orgData) {
        const processedOrg = validateAndEnrichOrganization(orgData, currentSubdomain);
        if (processedOrg) {
          console.log('✅ loadFallbackOrganization: تم معالجة البيانات بنجاح', { processedOrg });
          setState(prev => ({ ...prev, organization: processedOrg, isLoading: false }));
          updateLocalStorageOrgId(processedOrg.id);
          saveCompleteOrganizationData(processedOrg, currentSubdomain);
          
          // ⚡ تحسين: إرسال الحدث بشكل غير متزامن
          requestIdleCallback ? 
            requestIdleCallback(() => {
              window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                detail: { 
                  organization: processedOrg, 
                  isEarlyDetection: false,
                  loadTime: Date.now() - refs.startTime.current,
                  timestamp: Date.now(),
                  source: 'fallback-fetch'
                }
              }));
            }, { timeout: 50 }) :
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                detail: { 
                  organization: processedOrg, 
                  isEarlyDetection: false,
                  loadTime: Date.now() - refs.startTime.current,
                  timestamp: Date.now(),
                  source: 'fallback-fetch'
                }
              }));
            }, 0);
          
          clearTimeout(timeoutId);
          refs.loadingOrganization.current = false;
          refs.initialized.current = true;
          refs.fallbackProcessed.current = true;
        } else {
          console.warn('❌ loadFallbackOrganization: فشل في معالجة البيانات');
          setState(prev => ({ ...prev, error: new Error('فشل في معالجة بيانات المؤسسة'), isLoading: false }));
        }
      } else {
        console.warn('❌ loadFallbackOrganization: لم يتم العثور على بيانات المؤسسة');
        setState(prev => ({ ...prev, error: new Error('لم يتم العثور على بيانات المؤسسة'), isLoading: false }));
      }
      
      clearTimeout(timeoutId);
      refs.loadingOrganization.current = false;
      refs.initialized.current = true;
      refs.fallbackProcessed.current = true;
      
    } catch (error) {
      console.error('❌ loadFallbackOrganization: خطأ في التحميل', error);
      setState(prev => ({ ...prev, error: error as Error, isLoading: false }));
      refs.loadingOrganization.current = false;
      refs.initialized.current = true;
      refs.fallbackProcessed.current = true;
    }
  }, [authOrganization, currentSubdomain, refs, setState]);

  // الاستماع إلى تغييرات المؤسسة
  const handleOrganizationChange = useCallback(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isHandling = false;
    
    const handleOrganizationChanged = (event: CustomEvent) => {
      const { organizationId } = event.detail || {};
      
      if (isHandling || !organizationId) {
        return;
      }
      
      isHandling = true;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      timeoutId = setTimeout(() => {
        if (!isHandling) return;
        
        try {
          updateLocalStorageOrgId(organizationId);
          
          refs.initialized.current = false;
          refs.loadingOrganization.current = false;
          setState(prev => ({ ...prev, isLoading: false, organization: null, error: null }));
          
          // إعادة تحميل البيانات
          loadFallbackOrganization();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          }
        } finally {
          isHandling = false;
          timeoutId = null;
        }
      }, ORGANIZATION_CHANGE_DEBOUNCE);
    };

    const eventType = 'organizationChanged';
    window.addEventListener(eventType, handleOrganizationChanged as EventListener);
    
    return () => {
      window.removeEventListener(eventType, handleOrganizationChanged as EventListener);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isHandling = false;
    };
  }, [refs, setState, loadFallbackOrganization]);

  return {
    isOrgAdmin,
    checkCustomDomainOnStartup,
    syncWithAuthContext,
    loadFallbackOrganization,
    handleOrganizationChange
  };
}
