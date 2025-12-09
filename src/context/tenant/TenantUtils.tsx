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

// ⚡ تقليل الـ logs المتكررة - نسجل فقط الانتقالات المهمة
let lastTenantOrgId: string | null = null;
let lastTenantIsReady: boolean | null = null;
let tenantLogCount = 0;
const MAX_TENANT_LOGS = 2; // أقصى عدد logs في الجلسة الواحدة

/**
 * إنشاء قيمة السياق المحسنة
 * ⚡ محسّن: يسجل فقط الانتقالات المهمة (orgId تغير أو isReady تغير)
 */
export function useTenantContextValue(
  organization: Organization | null,
  isOrgAdmin: boolean,
  isLoading: boolean,
  error: Error | null,
  actions: any,
  renderCount: React.MutableRefObject<number>
) {
  // ⚡ تتبع القيمة السابقة لمنع الـ re-renders غير الضرورية
  const prevValueRef = useRef<any>(null);

  const value = useMemo(() => {
    const hasValidOrgId = !!(organization?.id && organization.id.length > 10);
    // ✅ تحسين: إخفاء isLoading إذا كان لدينا orgId سريع لتجنب شاشات تحميل متعددة
    const effectiveLoading = isLoading && !hasValidOrgId;
    const isReady = !effectiveLoading && hasValidOrgId;

    // ⚡ تسجيل فقط الانتقالات المهمة:
    // 1. أول مرة نحصل على orgId
    // 2. تغير isReady من false إلى true (جاهزية التطبيق)
    if (typeof window !== 'undefined' && tenantLogCount < MAX_TENANT_LOGS) {
      const orgIdChanged = organization?.id !== lastTenantOrgId && hasValidOrgId;
      const readyChanged = isReady !== lastTenantIsReady && isReady;

      if (orgIdChanged || readyChanged) {
        console.log('[TenantContext] 📊 Ready:', {
          orgId: organization?.id?.slice(0, 8) || 'null',
          isReady
        });
        tenantLogCount++;
      }

      lastTenantOrgId = organization?.id || null;
      lastTenantIsReady = isReady;
    }

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
      isReady,
      ...actions
    };
  }, [
    organization,
    isOrgAdmin,
    isLoading,
    error,
    actions
  ]);

  // ⚡ تخزين القيمة للمقارنة
  prevValueRef.current = value;

  return value;
}

/**
 * إنشاء المكون المحسن مع منع الرندر المفرط
 */
export function useOptimizedProvider(
  TenantContext: React.Context<TenantContextType | undefined>,
  value: TenantContextType,
  children: React.ReactNode,
  renderCount: React.MutableRefObject<number>
) {
  const memoizedProvider = useMemo(() => (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  ), [TenantContext, value, children]);

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

// ✅ Removed circular import - TenantContext is now passed as a parameter
