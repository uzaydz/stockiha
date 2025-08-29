import { useContext } from 'react';
import { TenantContext } from '@/context/tenant/TenantContext';

/**
 * Hook للتحقق من جاهزية المؤسسة للاستخدام في API
 * يمنع استدعاء API قبل توفر معرف المؤسسة الصحيح
 */
export function useOrganizationReady() {
  const { organization } = useContext(TenantContext);
  
  const isReady = organization && 
    organization.id && 
    organization.id.length > 0 && 
    !organization.id.startsWith('temp-') && 
    !organization.isTempOrganization;
  
  return {
    isReady,
    organizationId: isReady ? organization.id : null,
    organization
  };
}
