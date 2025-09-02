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

  // 🔥 تحسين: منع التهيئة المتكررة مع تحسين الأداء
  useEffect(() => {
    if (isInitialized.current || refs.initialized.current) {
      return;
    }
    
    // 🔒 منع التهيئة المتكررة في نفس الـ tick
    if (initializationCount.current > 0) {
      return;
    }
    
    initializationCount.current++;
    
    // ⚡ تقليل حد المحاولات من 3 إلى 2
    if (initializationCount.current > 2) {
      isInitialized.current = true;
      refs.initialized.current = true;
      return;
    }
    
    // ⚡ استخدام requestIdleCallback لتحسين الأداء
    let initTimeout: number | ReturnType<typeof setTimeout>;
    
    if (typeof requestIdleCallback !== 'undefined') {
      initTimeout = requestIdleCallback(() => {
        if (!refs.customDomainProcessed.current && !organization) {
          checkCustomDomainOnStartup();
        }
      }, { timeout: 100 });
    } else {
      initTimeout = setTimeout(() => {
        if (!refs.customDomainProcessed.current && !organization) {
          checkCustomDomainOnStartup();
        }
      }, 0);
    }
    
    return () => {
      if (typeof cancelIdleCallback !== 'undefined' && typeof initTimeout === 'number') {
        cancelIdleCallback(initTimeout);
      } else {
        clearTimeout(initTimeout as ReturnType<typeof setTimeout>);
      }
    };
  }, [checkCustomDomainOnStartup, refs, organization]);

  // مزامنة مع AuthContext - محسنة للاستجابة السريعة عند تسجيل الدخول الأول
  useEffect(() => {
    // إذا لم تكن هناك مؤسسة في AuthContext، تخطي
    if (!authOrganization) {
      return;
    }

    // إذا تم التهيئة بالفعل وكانت المؤسسة مطابقة، تأكد من تحديث العلامات فقط
    if (refs.initialized.current && organization && organization.id === authOrganization.id) {
      if (!refs.authContextProcessed.current) {
        if (process.env.NODE_ENV === 'development') {
        }
        refs.authContextProcessed.current = true;
      }
      return;
    }

    // منع معالجة نفس المؤسسة مرتين - تحسين لتسجيل الدخول الأول
    if (lastAuthOrgId.current === authOrganization.id && refs.initialized.current && organization) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // تحديث المؤسسة مباشرة مع حفظ في global cache
    const processedOrg = updateOrganizationFromData(authOrganization);
    updateOrganization(setState, processedOrg);

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

  }, [authOrganization, organization?.id, refs, setState]); // تحسين التبعيات

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
  }, [user, authLoading, authOrganization, refs, setState]);

  // تحميل المؤسسة الاحتياطي - معطل مؤقتاً لتجنب التداخل
  useEffect(() => {
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current || refs.initialized.current) {
      return;
    }

    // إذا كانت المؤسسة متاحة في AuthContext، لا نحتاج للتحميل الاحتياطي
    if (authOrganization) {
      if (process.env.NODE_ENV === 'development') {
      }
      refs.fallbackProcessed.current = true;
      return;
    }

    // في حالة عدم وجود مؤسسة في AuthContext، قم بالتحميل الاحتياطي
    if (process.env.NODE_ENV === 'development') {
    }
    loadFallbackOrganization();
  }, [authOrganization?.id, refs, loadFallbackOrganization]); // تحسين التبعيات

  // الاستماع إلى تغييرات المؤسسة
  useEffect(() => {
    return handleOrganizationChange();
  }, [handleOrganizationChange]);

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

    window.addEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);

    return () => {
      window.removeEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
    };
  }, [organization, setState, refs]);

  // 🔥 تحسين: قيمة السياق المحسنة مع useMemo
  const value = useMemo(() => ({
    currentOrganization: organization,
    tenant: organization,
    organization,
    isOrgAdmin,
    isLoading,
    error,
    ...actions
  }), [
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

  // 🔥 إصلاح: نقل منطق التحقق من حد الرندر إلى هنا بعد جميع الـ hooks
  if (isInitialized.current && renderCount.current > 3) {
    return (
      <TenantContext.Provider value={{} as TenantContextType}>
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
