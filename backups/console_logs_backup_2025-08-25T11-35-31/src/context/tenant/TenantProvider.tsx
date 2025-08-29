/**
 * TenantProvider المحسن - مبسط ومقسم لتحسين الأداء
 * يستخدم المكونات المنفصلة لتحسين السرعة وسهولة الصيانة
 */

import React, { createContext, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useUser } from '../UserContext';
import type { TenantContextType } from '@/types/tenant';

// استيراد المكونات المنفصلة
import { useTenantState, updateOrganization, setLoading, setError, resetState } from './TenantState';
import { useTenantActions } from './TenantActions';
import { useTenantHooks } from './TenantHooks';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// 🔥 تحسين: استخدام React.memo مع مقارنة مناسبة لمنع إعادة الإنشاء
export const TenantProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
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

  // ⚡ التحقق من النطاق المخصص عند بدء التشغيل
  useEffect(() => {
    if (refs.customDomainProcessed.current || refs.initialized.current || organization) {
      return;
    }
    
    const timeout = setTimeout(checkCustomDomainOnStartup, 0); // ✅ إزالة التأخير لتحسين الأداء
    return () => clearTimeout(timeout);
  }, [checkCustomDomainOnStartup, refs, organization]);

  // مزامنة مع AuthContext
  useEffect(() => {
    if (refs.authContextProcessed.current || !authOrganization || organization || refs.loadingOrganization.current || refs.initialized.current) {
      return;
    }

    if (organization && organization.id === authOrganization.id) {
      return;
    }

    syncWithAuthContext();
  }, [authOrganization, organization, refs, syncWithAuthContext]);

  // تحميل المؤسسة الاحتياطي
  useEffect(() => {
    if (refs.fallbackProcessed.current || refs.loadingOrganization.current || refs.initialized.current || authOrganization) {
      return;
    }

    loadFallbackOrganization();
  }, [authOrganization, refs, loadFallbackOrganization]);

  // الاستماع إلى تغييرات المؤسسة
  useEffect(() => {
    return handleOrganizationChange();
  }, [handleOrganizationChange]);

  // الاستماع إلى أحداث AuthContext - تحسين لمنع التكرار
  useEffect(() => {
    // استخدام ref لمنع إنشاء listeners متعددة
    const listenerRef = refs.eventListenerRef || { current: null };

    if (listenerRef.current) {
      return; // الـ listener موجود بالفعل
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('👂 [TenantProvider] إعداد مستمع للحدث authOrganizationReady');
    }

    const handleAuthOrganizationReady = (event: CustomEvent) => {
      const { organization: authOrg } = event.detail;
      if (process.env.NODE_ENV === 'development') {
        console.log('🏢 [TenantProvider] استلام حدث authOrganizationReady:', {
          authOrgName: authOrg?.name,
          authOrgId: authOrg?.id,
          currentOrgId: organization?.id,
          currentOrgName: organization?.name
        });
      }

      if (authOrg && (!organization || organization.id !== authOrg.id)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [TenantProvider] تحديث المؤسسة من AuthContext:', authOrg.name);
        }
        updateOrganization(setState, authOrg);
        refs.authContextProcessed.current = true;
        refs.initialized.current = true;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏭️ [TenantProvider] تجاهل التحديث - المؤسسة موجودة بالفعل أو مطابقة');
        }
      }
    };

    window.addEventListener('authOrganizationReady', handleAuthOrganizationReady as EventListener);
    listenerRef.current = handleAuthOrganizationReady;

    return () => {
      if (listenerRef.current) {
        window.removeEventListener('authOrganizationReady', listenerRef.current as EventListener);
        listenerRef.current = null;
      }
    };
  }, []); // إزالة dependencies لمنع إعادة الإنشاء

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

  // 🔥 تمييز التهيئة لمنع إعادة الإنشاء
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

  // 🔥 تحسين: استخدام useMemo للمكون لمنع إعادة الإنشاء
  const memoizedProvider = useMemo(() => (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  ), [value, children]);

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
