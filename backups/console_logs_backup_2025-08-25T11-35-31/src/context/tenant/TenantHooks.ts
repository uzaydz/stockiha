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
      console.error('خطأ في فحص النطاق المخصص:', error);
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
        console.error('❌ خطأ في مزامنة AuthContext:', error);
      }
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [authOrganization, currentSubdomain, refs, setState]);

  // تحميل المؤسسة الاحتياطي
  const loadFallbackOrganization = useCallback(async () => {
    console.log('🚀 [useTenantHooks] بدء loadFallbackOrganization');
    
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current || refs.initialized.current || authOrganization) {
      console.log('🚫 [useTenantHooks] تم معالجة المؤسسة الاحتياطية مسبقاً أو تم التهيئة');
      return;
    }

    const loadOrganizationData = async () => {
      console.log('🔍 [useTenantHooks] بدء loadOrganizationData');
      
      if (refs.loadingOrganization.current) {
        console.log('🚫 [useTenantHooks] جلب المؤسسة جاري بالفعل');
        return;
      }
      
      window.dispatchEvent(new CustomEvent('bazaar:tenant-context-start', {
        detail: {
          timestamp: Date.now(),
          source: 'fallback'
        }
      }));
      
      refs.loadingOrganization.current = true;
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const timeoutId = setTimeout(() => {
        refs.loadingOrganization.current = false;
        setState(prev => ({ ...prev, isLoading: false, error: new Error('انتهت مهلة تحميل بيانات المؤسسة') }));
      }, LOADING_TIMEOUT);

      try {
        const currentHostname = window.location.hostname;
        const subdomain = currentSubdomain || await extractSubdomain(currentHostname);
        const storedOrgId = getStoredOrganizationId();

        // 🚀 تحسين: فحص localStorage أولاً للإرجاع المبكر
        if (EARLY_RETURN_ENABLED && subdomain && subdomain !== 'main') {
          // فحص localStorage للبيانات المحفوظة مسبقاً
          const cachedOrgData = localStorage.getItem(`bazaar_org_${subdomain}`);
          if (cachedOrgData) {
            try {
              const parsed = JSON.parse(cachedOrgData);
              const ageInMinutes = (Date.now() - parsed.timestamp) / (1000 * 60);
              
              if (ageInMinutes < 30 && parsed.data) {
                const hydratedOrg = updateOrganizationFromData(parsed.data);
                if (hydratedOrg) {
                  console.log(`⚡ [TenantHooks] إرجاع مبكر من localStorage: ${subdomain} (عمر: ${ageInMinutes.toFixed(1)} دقيقة)`);
                  
                  setState(prev => ({ ...prev, organization: hydratedOrg, isLoading: false }));
                  updateLocalStorageOrgId(hydratedOrg.id);
                  clearTimeout(timeoutId);
                  refs.loadingOrganization.current = false;
                  refs.initialized.current = true;
                  refs.fallbackProcessed.current = true;
                  
                  window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                    detail: { 
                      organization: hydratedOrg, 
                      isEarlyDetection: true,
                      loadTime: Date.now() - refs.startTime.current,
                      timestamp: Date.now(),
                      source: 'localStorage-cache'
                    }
                  }));
                  
                  return;
                }
              }
            } catch (e) {
              // مسح البيانات التالفة
              localStorage.removeItem(`bazaar_org_${subdomain}`);
            }
          }

          // هيدرأة سريعة من RPC المخزن محلياً كـ fallback
          const rpcOrg = getRPCOrganizationData(subdomain);
          if (rpcOrg) {
            const hydratedOrg = updateOrganizationFromData(rpcOrg);
            if (hydratedOrg) {
              setState(prev => ({ ...prev, organization: hydratedOrg, isLoading: false }));
              updateLocalStorageOrgId(hydratedOrg.id);
              clearTimeout(timeoutId);
              refs.loadingOrganization.current = false;
              refs.initialized.current = true;
              refs.fallbackProcessed.current = true;
              
              window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
                detail: { 
                  organization: hydratedOrg, 
                  isEarlyDetection: false,
                  loadTime: Date.now() - refs.startTime.current,
                  timestamp: Date.now(),
                  source: 'rpc-cache'
                }
              }));
              
              return;
            }
          }
        }

        const orgData = await fetchOrganizationWithPriority({
          storedOrgId,
          hostname: currentHostname.includes('localhost') ? undefined : currentHostname,
          subdomain: subdomain !== 'main' ? subdomain : undefined
        });
        
        if (orgData) {
          const processedOrg = validateAndEnrichOrganization(orgData, subdomain);
          if (processedOrg) {
            setState(prev => ({ ...prev, organization: processedOrg, isLoading: false }));
            updateLocalStorageOrgId(processedOrg.id);
            saveCompleteOrganizationData(processedOrg, currentSubdomain);
            
            window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
              detail: { 
                organization: processedOrg, 
                isEarlyDetection: false,
                loadTime: Date.now() - refs.startTime.current,
                timestamp: Date.now(),
                source: 'fallback'
              }
            }));
          }
        } else {
          setState(prev => ({ ...prev, organization: null }));
        }

        clearTimeout(timeoutId);
      } catch (error) {
        setState(prev => ({ ...prev, error: error as Error }));
        clearTimeout(timeoutId);
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
        refs.loadingOrganization.current = false;
        refs.initialized.current = true;
        refs.fallbackProcessed.current = true;
      }
    };

    const initTimeout = setTimeout(loadOrganizationData, RETRY_DELAY);
    return () => clearTimeout(initTimeout);
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
            console.error('❌ [TenantContext] خطأ في معالجة تغيير المؤسسة:', error);
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
