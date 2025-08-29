/**
 * TenantActions - إدارة العمليات والإجراءات
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import { useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { updateOrganizationFromData, saveCompleteOrganizationData } from '@/lib/processors/organizationProcessor';
import { updateLocalStorageOrgId, clearOrganizationStorageData } from '@/lib/storage/localStorageManager';
import { clearOrganizationCache } from '@/lib/cache/organizationCache';
import { isValidUuid } from '@/utils/uuid-helpers';
import type { Organization } from '@/types/tenant';
import type { TenantStateRefs } from './TenantState';

export interface TenantActions {
  createOrganization: (name: string, description?: string, domain?: string, subdomain?: string) => Promise<{ success: boolean, organizationId?: string, error?: Error }>;
  inviteUserToOrganization: (email: string, role?: string) => Promise<{ success: boolean, error?: Error }>;
  refreshOrganizationData: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

export function useTenantActions(
  user: any,
  organization: Organization | null,
  isOrgAdmin: boolean,
  authLoading: boolean,
  currentSubdomain: string | null,
  setState: React.Dispatch<React.SetStateAction<any>>,
  refs: TenantStateRefs
): TenantActions {
  
  // إنشاء مؤسسة جديدة
  const createOrganization = useCallback(async (
    name: string, 
    description?: string, 
    domain?: string, 
    subdomain?: string
  ) => {
    try {
      if (!user) {
        throw new Error('يجب تسجيل الدخول لإنشاء مؤسسة جديدة');
      }

      const supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.rpc('create_organization', {
        org_name: name,
        org_description: description || null,
        org_domain: domain || null,
        org_subdomain: subdomain || null
      });

      if (error) throw error;

      if (data) {
        updateLocalStorageOrgId(data);
        // إعادة تحميل البيانات
        await refreshOrganizationData();
      }

      return { success: true, organizationId: data };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }, [user]);

  // دعوة مستخدم للمؤسسة
  const inviteUserToOrganization = useCallback(async (
    email: string, 
    role: string = 'employee'
  ) => {
    try {
      if (!user || !organization || !isOrgAdmin) {
        throw new Error('ليس لديك صلاحية لدعوة مستخدمين');
      }

      const supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.rpc('invite_user_to_organization', {
        user_email: email,
        user_role: role
      });

      if (error) throw error;

      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }, [user, organization, isOrgAdmin]);

  // تحديث بيانات المؤسسة
  const refreshOrganizationData = useCallback(async () => {
    if (authLoading || refs.loadingOrganization.current) return;
    
    refs.loadingOrganization.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // مسح Cache
      const orgId = organization?.id;
      if (orgId) {
        clearOrganizationStorageData(orgId);
        clearOrganizationCache(orgId);
      }
      
      // إعادة جلب البيانات باستخدام API موحد
      if (orgId && isValidUuid(orgId)) {
        const { getOrganizationById } = await import('@/lib/api/deduplicatedApi');
        const orgData = await getOrganizationById(orgId, true); // forceRefresh = true
        
        if (orgData) {
          const processedOrg = updateOrganizationFromData(orgData);
          if (processedOrg) {
            setState(prev => ({ 
              ...prev, 
              organization: processedOrg, 
              isLoading: false, 
              error: null 
            }));
            updateLocalStorageOrgId(processedOrg.id);
            saveCompleteOrganizationData(processedOrg, currentSubdomain);
          }
        }
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error, isLoading: false }));
    } finally {
      refs.loadingOrganization.current = false;
    }
  }, [authLoading, organization?.id, currentSubdomain, refs, setState]);

  const refreshTenant = useCallback(async () => {
    await refreshOrganizationData();
  }, [refreshOrganizationData]);

  return {
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData,
    refreshTenant
  };
}
