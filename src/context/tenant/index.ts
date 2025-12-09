/**
 * Tenant Context - تصدير جميع مكونات TenantProvider المنفصلة
 * ملف مركزي لتصدير جميع المكونات والوظائف المتعلقة بـ Tenant
 */

// تصدير المكونات الرئيسية
export { TenantProvider, PublicTenantProvider, useTenant } from './TenantProvider';

// تصدير الأنواع
export type { Organization, TenantContextType } from '@/types/tenant';

// تصدير المكونات المنفصلة (للاستخدام المتقدم)
export { TenantInitialization } from './TenantInitialization';
export { TenantEventHandlers } from './TenantEventHandlers';
export { TenantSynchronization } from './TenantSynchronization';

// تصدير الوظائف المساعدة
export {
  useTenantContextValue,
  useOptimizedProvider,
  useRenderCounter,
  useCleanupResources,
  useInitializationRefs
} from './TenantUtils';

// تصدير الـ hooks والإجراءات
export { useTenantState, updateOrganization, setLoading, setError, resetState } from './TenantState';
export { useTenantActions } from './TenantActions';
export { useTenantHooks } from './TenantHooks';

// تصدير السياق من TenantProvider
export { TenantContext } from './TenantProvider';