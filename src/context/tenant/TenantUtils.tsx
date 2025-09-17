/**
 * TenantUtils - وظائف مساعدة لـ TenantProvider
 * يحتوي على الوظائف المساعدة والمنطق العام
 */

import { useCallback, useMemo, useRef } from 'react';
import type { Organization } from '@/types/tenant';
import type { TenantContextType } from '@/types/tenant';
import type { TenantStateRefs } from './TenantState';

/**
 * تنظيف الموارد عند unmount
 */
export function useCleanupResources(refs: TenantStateRefs) {
  const cleanupResources = useCallback(() => {
    if (refs.abortController.current) {
      refs.abortController.current.abort();
      refs.abortController.current = null;
    }
  }, [refs]);

  return cleanupResources;
}

/**
 * إنشاء قيمة السياق المحسنة
 */
export function useTenantContextValue(
  organization: Organization | null,
  isOrgAdmin: boolean,
  isLoading: boolean,
  error: Error | null,
  actions: any,
  renderCount: React.MutableRefObject<number>
) {
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

  return value;
}

/**
 * إنشاء المكون المحسن مع منع الرندر المفرط
 */
export function useOptimizedProvider(
  value: TenantContextType,
  children: React.ReactNode,
  renderCount: React.MutableRefObject<number>
) {
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
}

/**
 * إدارة عداد الرندر
 */
export function useRenderCounter() {
  const renderCount = useRef(0);
  const hasRendered = useRef(false);

  // 🔥 تحسين: منع زيادة renderCount في كل render
  if (!hasRendered.current) {
    renderCount.current++;
    hasRendered.current = true;
  }

  return renderCount;
}

/**
 * إدارة مراجع التهيئة
 */
export function useInitializationRefs() {
  const isInitialized = useRef(false);
  const lastAuthOrgId = useRef<string | null>(null);
  const lastOrgId = useRef<string | null>(null);
  const initializationCount = useRef(0);

  return {
    isInitialized,
    lastAuthOrgId,
    lastOrgId,
    initializationCount
  };
}

// استيراد TenantContext هنا لتجنب الاستيراد الدائري
import TenantContext from './TenantContext';
