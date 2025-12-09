/**
 * TenantProvider المحسن - مبسط ومقسم لتحسين الأداء
 * يستخدم المكونات المنفصلة لتحسين السرعة وسهولة الصيانة
 */

import React, { createContext, memo } from 'react';
import { useAuth } from '../AuthContext';
import { useUser } from '../UserContext';
import type { TenantContextType } from '@/types/tenant';

// استيراد المكونات المنفصلة
import { useTenantState } from './TenantState';
import { useTenantActions } from './TenantActions';
import { useTenantHooks } from './TenantHooks';

// استيراد المكونات الجديدة
import { TenantInitialization } from './TenantInitialization';
import { TenantEventHandlers } from './TenantEventHandlers';
import { TenantSynchronization } from './TenantSynchronization';
import { useTenantContextValue, useOptimizedProvider, useRenderCounter, useCleanupResources } from './TenantUtils';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// 🔥 تحسين: استخدام React.memo مع مقارنة مناسبة لمنع إعادة الإنشاء
export const TenantProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
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

  // استخدام الوظائف المساعدة
  const renderCount = useRenderCounter();
  const cleanupResources = useCleanupResources(refs);

  // تنظيف الموارد عند unmount
  React.useEffect(() => {
    return cleanupResources;
  }, [cleanupResources]);

  // إنشاء قيمة السياق المحسنة
  const value = useTenantContextValue(organization, isOrgAdmin, isLoading, error, actions, renderCount);

  // استخدام المكونات المنفصلة
  return (
    <>
      <TenantInitialization
        organization={organization}
        authOrganization={authOrganization}
        user={user}
        authLoading={authLoading}
        currentSubdomain={currentSubdomain}
        setState={setState}
        refs={refs}
        checkCustomDomainOnStartup={checkCustomDomainOnStartup}
        loadFallbackOrganization={loadFallbackOrganization}
        handleOrganizationChange={handleOrganizationChange}
        isOrgAdmin={isOrgAdmin}
      />

      <TenantSynchronization
        organization={organization}
        authOrganization={authOrganization}
        user={user}
        authLoading={authLoading}
        currentSubdomain={currentSubdomain}
        setState={setState}
        refs={refs}
      />

      <TenantEventHandlers
        organization={organization}
        setState={setState}
        refs={refs}
      />

      {useOptimizedProvider(TenantContext, value, children, renderCount)}
    </>
  );
}, (prevProps, nextProps) => {
  // 🔥 تحسين: مقارنة عميقة لمنع إعادة الإنشاء
  return prevProps.children === nextProps.children;
});

// 🔥 تحسين: إضافة displayName للتطوير
TenantProvider.displayName = 'TenantProvider';

// تصدير TenantContext للاستخدام في الملفات الأخرى
export { TenantContext };

// تصدير الـ hook من ملف منفصل
export { useTenant } from './hooks/useTenant';

// تصدير PublicTenantProvider من ملف منفصل
export { PublicTenantProvider } from './PublicTenantProvider';
