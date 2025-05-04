import { useTenant } from '@/context/TenantContext';

// توفير hook مبسط للوصول إلى بيانات المنظمة
export const useOrganization = () => {
  const tenantContext = useTenant();
  
  // إعادة تسمية بعض الخصائص لتكون أكثر تناسقًا مع الاستخدام في صفحة الطلبات
  return {
    organization: tenantContext.currentOrganization,
    isAdmin: tenantContext.isOrgAdmin,
    isLoading: tenantContext.isLoading,
    error: tenantContext.error,
    refreshOrganization: tenantContext.refreshOrganizationData,
    // إضافة خصائص أخرى من سياق المستأجر بحسب الحاجة
  };
};

export default useOrganization; 