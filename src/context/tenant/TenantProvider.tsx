/**
 * TenantProvider المحسن - مبسط ومقسم لتحسين الأداء
 * يستخدم المكونات المنفصلة لتحسين السرعة وسهولة الصيانة
 */

import React, { createContext, useContext, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../AuthContext';
import { useUser } from '../UserContext';
import type { TenantContextType } from '@/types/tenant';
import { globalCache, CacheKeys } from '@/lib/globalCache';

// استيراد المكونات المنفصلة
import { useTenantState, updateOrganization, setLoading, setError, resetState } from './TenantState';
import { useTenantActions } from './TenantActions';
import { useTenantHooks } from './TenantHooks';
import { updateOrganizationFromData } from '@/lib/processors/organizationProcessor';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';
import { getFastOrganizationId } from '@/utils/earlyPreload';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// 🔥 تحسين: استخدام React.memo مع مقارنة مناسبة لمنع إعادة الإنشاء
export const TenantProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  const lastAuthOrgId = useRef<string | null>(null);
  const lastOrgId = useRef<string | null>(null);
  const initializationCount = useRef(0);
  const renderCount = useRef(0);
  const hasRendered = useRef(false);
  const tenantStartTime = useRef(performance.now());

  // 🔥 تحسين: منع زيادة renderCount في كل render
  if (!hasRendered.current) {
    renderCount.current++;
    hasRendered.current = true;
  }
  
  // إعادة تعيين العلامات العالمية للحماية من التعليق
  useEffect(() => {
    if (window.bazaarTenantLoading) {
      window.bazaarTenantLoading = false;
    }
  }, []);

  // الحصول على البيانات من السياقات الأخرى
  const { user, isLoading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const { organizationId } = useUser();

  // استخدام الحالة المحسنة
  const [state, setState, refs] = useTenantState();
  const { organization, isLoading, error } = state;

  // استخدام الـ hooks المساعدة
  const {
    isOrgAdmin,
    checkCustomDomainOnStartup,
    syncWithAuthContext,
    loadFallbackOrganization,
    handleOrganizationChange
  } = useTenantHooks(user, authOrganization, currentSubdomain, setState, refs);

  // استخدام الإجراءات
  const actions = useTenantActions(
    user,
    organization,
    isOrgAdmin,
    authLoading,
    currentSubdomain,
    setState,
    refs
  );

  // 🔥 تحسين: استخدام useCallback لمنع إعادة الإنشاء
  const cleanupResources = useCallback(() => {
    if (refs.abortController.current) {
      refs.abortController.current.abort();
      refs.abortController.current = null;
    }
  }, [refs]);

  // تنظيف الموارد عند unmount
  useEffect(() => {
    return cleanupResources;
  }, [cleanupResources]);

  // ✅ تبسيط: تهيئة مبسطة وسريعة
  useEffect(() => {
    // فحص بسيط - إذا تم التهيئة، توقف
    if (isInitialized.current || organization) {
      return;
    }

    isInitialized.current = true;

    // ⚡ تحسين جديد: فحص Organization ID السريع مع البيانات الكاملة
    const fastOrgCheck = getFastOrganizationId();
    if (fastOrgCheck && !organization && !refs.initialized.current) {
      
      // ✅ محاولة الحصول على البيانات الكاملة من early preload مباشرة
      let preloadedData = null;
      try {
        // استخدام dynamic import بدون await في useEffect
        import('@/utils/earlyPreload').then((earlyPreloadModule) => {
          preloadedData = earlyPreloadModule.getEarlyPreloadedData();
          
          if (preloadedData?.organization_details || preloadedData?.organization) {
            // استخدام البيانات الكاملة المحملة مسبقاً
            const orgData = preloadedData.organization_details || preloadedData.organization;
            const quickOrg = {
              id: orgData.id || fastOrgCheck.organizationId,
              name: orgData.name || '',
              description: orgData.description || '',
              logo_url: orgData.logo_url || null,
              domain: orgData.domain || null,
              subdomain: orgData.subdomain || null,
              subscription_tier: orgData.subscription_tier || 'free',
              subscription_status: orgData.subscription_status || 'active',
              settings: orgData.settings || {},
              created_at: orgData.created_at || new Date().toISOString(),
              updated_at: orgData.updated_at || new Date().toISOString(),
              owner_id: orgData.owner_id || null
            };
            
            updateOrganization(setState, quickOrg);
            refs.initialized.current = true;
            isInitialized.current = true;
            
            // إرسال حدث فوري
            window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
              detail: {
                organization: quickOrg,
                isEarlyDetection: true,
                loadTime: 0,
                timestamp: Date.now(),
                source: 'preloaded-data'
              }
            }));
          }
        }).catch((e) => {
          console.warn('⚠️ [TenantProvider] فشل في تحميل early preload:', e);
        });
      } catch (e) {
        console.warn('⚠️ [TenantProvider] خطأ في early preload:', e);
      }
      
      // إنشاء organization مبسط كـ fallback فوري
      const quickOrg = {
        id: fastOrgCheck.organizationId,
        name: '', // سيتم تحديثه لاحقاً عند توفر الاسم الحقيقي
        description: '',
        logo_url: null,
        domain: null,
        subdomain: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: null
      };
      
      updateOrganization(setState, quickOrg);
      refs.initialized.current = true;
      isInitialized.current = true;
      
      // إرسال حدث فوري
      window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
        detail: {
          organization: quickOrg,
          isEarlyDetection: true,
          loadTime: 0,
          timestamp: Date.now(),
          source: 'fast-org-id'
        }
      }));
    }

    // ⚡ تنفيذ فوري للتهيئة الحرجة بدون requestIdleCallback
    const immediateStartTime = performance.now();
    if (!refs.customDomainProcessed.current && !organization) {
      
      checkCustomDomainOnStartup();
      const immediateTime = performance.now() - immediateStartTime;
    } else {
      
    }

    const initEffectTime = performance.now() - immediateStartTime;

    return () => {
      
    };
  }, []); // ✅ تشغيل مرة واحدة فقط عند التحميل

  // مزامنة مع AuthContext - محسنة لمنع الدورات اللانهائية
  useEffect(() => {
    // ✅ فحص مبكر لمنع التشغيل غير الضروري
    if (!authOrganization || refs.authContextProcessed.current) {
      return;
    }

    // ✅ منع معالجة نفس المؤسسة مرتين
    if (lastAuthOrgId.current === authOrganization.id) {
      
      return;
    }

    const authSyncStartTime = performance.now();



    // تحديث المؤسسة مباشرة مع حفظ في global cache
    const processedOrg = updateOrganizationFromData(authOrganization);
    const updateStartTime = performance.now();
    updateOrganization(setState, processedOrg);
    const updateTime = performance.now() - updateStartTime;


    // حفظ في global cache لتجنب الاستدعاءات المتكررة
    globalCache.set(CacheKeys.ORGANIZATION(authOrganization.id), authOrganization);

    lastAuthOrgId.current = authOrganization.id;
    lastOrgId.current = authOrganization.id;
    refs.authContextProcessed.current = true;
    refs.initialized.current = true;
    isInitialized.current = true;
    // تحديث window object للاستخدام من قبل دوال أخرى
    (window as any).__TENANT_CONTEXT_ORG__ = authOrganization;

    
    // إرسال حدث تأكيد
    window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
      detail: {
        organization: authOrganization,
        isEarlyDetection: false,
        loadTime: Date.now() - refs.startTime.current,
        timestamp: Date.now(),
        source: 'auth-sync'
      }
    }));

    const authSyncTime = performance.now() - authSyncStartTime;

  }, [authOrganization?.id]); // ✅ تحسين التبعيات لمنع إعادة التشغيل المتكررة

  // مراقبة حالة تسجيل الدخول الأول - لضمان التهيئة الصحيحة
  useEffect(() => {
    // إذا كان المستخدم موجود ولم يتم التهيئة بعد، ابدأ عملية التهيئة
    if (user && !authLoading && !refs.initialized.current && !refs.authContextProcessed.current) {
      if (process.env.NODE_ENV === 'development') {
      }

      // إذا كانت المؤسسة متاحة، قم بتحديثها فوراً
      if (authOrganization) {
        if (process.env.NODE_ENV === 'development') {
        }

        const processedOrg = updateOrganizationFromData(authOrganization);
        updateOrganization(setState, processedOrg);
        lastAuthOrgId.current = authOrganization.id;
        lastOrgId.current = authOrganization.id;
        refs.authContextProcessed.current = true;
        refs.initialized.current = true;
        isInitialized.current = true;
        // تحديث window object للاستخدام من قبل دوال أخرى
        (window as any).__TENANT_CONTEXT_ORG__ = authOrganization;

        // إرسال حدث تأكيد
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: {
            organization: authOrganization,
            isEarlyDetection: false,
            loadTime: Date.now() - refs.startTime.current,
            timestamp: Date.now(),
            source: 'initial-login-sync'
          }
        }));
      }
    }
  }, [user?.id, authOrganization?.id]); // ✅ تحسين التبعيات

  // تحميل المؤسسة الاحتياطي - محسن لمنع الدورات اللانهائية
  useEffect(() => {
    // ✅ فحص مبكر أكثر صرامة
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current || 
        refs.initialized.current || authOrganization) {
      return;
    }

    
    refs.fallbackProcessed.current = true; // ✅ تعيين العلامة مبكراً لمنع التكرار
    loadFallbackOrganization();
  }, []); // ✅ تشغيل مرة واحدة فقط

  // الاستماع إلى تغييرات المؤسسة - تشغيل مرة واحدة فقط
  useEffect(() => {
    return handleOrganizationChange();
  }, []); // ✅ تشغيل مرة واحدة فقط

  // 🔥 تحسين: منع إعداد المستمعين المتكررين
  useEffect(() => {
    if (isInitialized.current || refs.initialized.current) {
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
    }

    const handleAuthOrganizationReady = (event: CustomEvent) => {
      const { organization: authOrg } = event.detail;

      // 🔥 تحسين: منع معالجة نفس المؤسسة مرتين - تحسين لتسجيل الدخول الأول
      if (lastAuthOrgId.current === authOrg?.id && refs.initialized.current) {
        if (process.env.NODE_ENV === 'development') {
        }
        return;
      }

      if (process.env.NODE_ENV === 'development') {
      }

      if (authOrg && lastOrgId.current !== authOrg.id) {
        if (process.env.NODE_ENV === 'development') {
        }
        lastAuthOrgId.current = authOrg.id;
        lastOrgId.current = authOrg.id;
        // تحويل نوع المؤسسة إذا لزم الأمر
        const processedOrg = updateOrganizationFromData(authOrg);
        updateOrganization(setState, processedOrg);
        refs.authContextProcessed.current = true;
        refs.initialized.current = true;
        isInitialized.current = true;
        // تحديث window object للاستخدام من قبل دوال أخرى
        (window as any).__TENANT_CONTEXT_ORG__ = authOrg;

        // ⚡ تحسين: إرسال حدث تأكيد عند تحديث المؤسسة
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: {
            organization: authOrg,
            isEarlyDetection: false,
            loadTime: Date.now() - refs.startTime.current,
            timestamp: Date.now(),
            source: 'event-handler'
          }
        }));
      } else {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    };

    // ✅ إضافة مُستمع للـ Organization ID السريع
    const handleFastOrganizationIdReady = (event: CustomEvent) => {
      const { organizationId, storeIdentifier, source } = event.detail;
      

      if (organizationId && !organization && !refs.initialized.current) {
        // إنشاء organization مبسط للاستخدام الفوري
        const quickOrg = {
          id: organizationId,
          name: '', // سيتم تحديثه لاحقاً عند توفر الاسم الحقيقي
          description: '',
          logo_url: null,
          domain: null,
          subdomain: null,
          subscription_tier: 'free',
          subscription_status: 'active',
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: null
        };
        
        updateOrganization(setState, quickOrg);
        refs.initialized.current = true;
        isInitialized.current = true;
        
        // إرسال حدث فوري
        window.dispatchEvent(new CustomEvent('bazaar:tenant-context-ready', {
          detail: {
            organization: quickOrg,
            isEarlyDetection: true,
            loadTime: 0,
            timestamp: Date.now(),
            source: 'fast-org-id-event'
          }
        }));
      }
    };

    window.addEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
    window.addEventListener('fastOrganizationIdReady', handleFastOrganizationIdReady as EventListener);

    return () => {
      window.removeEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
      window.removeEventListener('fastOrganizationIdReady', handleFastOrganizationIdReady as EventListener);
    };
  }, []); // ✅ تشغيل مرة واحدة فقط لإعداد المستمعين

  // 🔥 تحسين: قيمة السياق المحسنة مع isLoading محسن لتقليل شاشات التحميل
  const value = useMemo(() => {
    const hasValidOrgId = !!(organization?.id && organization.id.length > 10);
    // ✅ تحسين: إخفاء isLoading إذا كان لدينا orgId سريع لتجنب شاشات تحميل متعددة
    const effectiveLoading = isLoading && !hasValidOrgId;
    
    return {
      currentOrganization: organization,
      tenant: organization,
      organization,
      isOrgAdmin,
      isLoading: effectiveLoading, // ✅ تحسين: loading محسن
      error,
      // ✅ إضافة: isOrganizationReady للمكونات التي تحتاج orgId
      isOrganizationReady: hasValidOrgId,
      // ✅ تحسين: isReady يتطلب orgId صالح
      isReady: !effectiveLoading && hasValidOrgId,
      ...actions
    };
  }, [
    organization, 
    isOrgAdmin, 
    isLoading, 
    error, 
    actions
  ]);

  // 🔥 تحسين: استخدام useMemo للمكون لمنع إعادة الإنشاء
  const memoizedProvider = useMemo(() => (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  ), [value, children]);

  // 🔥 تحسين: منع إعادة الرندر المفرطة
  if (renderCount.current > 5) {
    console.warn('⚠️ [TenantProvider] تجاوز حد الرندر - إيقاف إعادة الرندر');
    return (
      <TenantContext.Provider value={value}>
        {children}
      </TenantContext.Provider>
    );
  }

  return memoizedProvider;
}, (prevProps, nextProps) => {
  // 🔥 تحسين: مقارنة عميقة لمنع إعادة الإنشاء
  return prevProps.children === nextProps.children;
});

// 🔥 تحسين: إضافة displayName للتطوير
TenantProvider.displayName = 'TenantProvider';

// Hook محسن لاستخدام السياق
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * PublicTenantProvider — مزود خفيف للصفحات العامة للمنتج (بدون Auth/User/Permissions)
 * يقرأ بيانات المؤسسة من JSON المحقون في DOM عبر العامل أو من المنتج المحمّل
 */
export const PublicTenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // اشتقاق مؤسسة عامة من JSON المحقون
  let org: any = null;
  try {
    const dom = getPreloadedProductFromDOM();
    const data = dom?.data;
    const product = data?.product;
    org = product?.organization || null;
    if (org && typeof org === 'object') {
      // تأكد من وجود الحقول الأساسية وفق نوع Organization
      org = {
        id: org.id || product?.organization_id || dom?.organization_id || null,
        name: org.name || '',
        description: org.description || '',
        logo_url: org.logo_url || org.logo || null,
        domain: org.domain || null,
        subdomain: org.subdomain || null,
        subscription_tier: org.subscription_tier || 'free',
        subscription_status: org.subscription_status || 'active',
        settings: org.settings || {},
        created_at: org.created_at || new Date().toISOString(),
        updated_at: org.updated_at || new Date().toISOString(),
        owner_id: org.owner_id || null
      };
    } else if (product?.organization_id || dom?.organization_id) {
      // إنشاء كائن مبسط للمؤسسة من organization_id فقط
      const orgId = product?.organization_id || dom?.organization_id;
      org = {
        id: orgId,
        name: '',
        description: '',
        logo_url: null,
        domain: null,
        subdomain: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: null
      };
    }
  } catch {
    // ignore
  }

  const hasValidOrgId = !!(org?.id && org.id.length > 10);
  
  const value: TenantContextType = {
    currentOrganization: org,
    tenant: org,
    organization: org,
    isOrgAdmin: false,
    isLoading: false,
    error: null,
    // ✅ إضافة: للتحقق من جاهزية organization ID
    isOrganizationReady: hasValidOrgId,
    isReady: hasValidOrgId,
    createOrganization: async () => ({ success: false, error: new Error('Not available in public mode') }),
    inviteUserToOrganization: async () => ({ success: false, error: new Error('Not available in public mode') }),
    refreshOrganizationData: async () => {},
    refreshTenant: async () => {}
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

PublicTenantProvider.displayName = 'PublicTenantProvider';
