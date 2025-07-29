/**
 * TenantContext محسن ومبسط
 * يستخدم المكونات المنفصلة للأداء الأفضل
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useUser } from '../UserContext';
import { useLocation } from 'react-router-dom';
import { useOrganizationData } from './hooks/useOrganizationData';
import { Organization, TenantContextType } from './types';
import { extractSubdomain, getOrganizationFromCustomDomain } from './utils/domainUtils';
import { getSupabaseClient } from '@/lib/supabase';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = React.memo(({ children }) => {
  const { user, isLoading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const { organizationId } = useUser();
  const location = useLocation();

  // تحديد معاملات الجلب بناءً على السياق
  const fetchParams = useMemo(() => {
    const hostname = window.location.hostname;
    
    // أولوية 1: معرف من AuthContext
    if (authOrganization?.id) {
      return { orgId: authOrganization.id };
    }
    
    // أولوية 2: معرف محفوظ
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      return { orgId: storedOrgId };
    }
    
    // أولوية 3: النطاق المخصص
    if (!hostname.includes('localhost')) {
      return { hostname };
    }
    
    // أولوية 4: النطاق الفرعي
    if (currentSubdomain && currentSubdomain !== 'main') {
      return { subdomain: currentSubdomain };
    }
    
    return undefined;
  }, [authOrganization?.id, currentSubdomain]);

  // استخدام hook محسن لجلب بيانات المؤسسة
  const {
    organization,
    isLoading: orgLoading,
    error,
    fetchOrganization,
    refreshOrganization,
    clearError
  } = useOrganizationData(fetchParams, {
    autoFetch: !!fetchParams && !authLoading,
    onSuccess: (org) => {
      // حفظ معرف المؤسسة عند النجاح
      localStorage.setItem('bazaar_organization_id', org.id);
    },
    onError: (err) => {
    }
  });

  // 🔥 حفظ بيانات المؤسسة في الكاش للنظام الديناميكي
  useEffect(() => {
    if (organization) {
      try {
        
        // حفظ البيانات الأساسية للمؤسسة
        const orgData = {
          id: organization.id,
          name: organization.name,
          description: organization.description || `${organization.name} - متجر إلكتروني متميز`,
          logo_url: organization.logo_url,
          subdomain: organization.subdomain || currentSubdomain
        };
        
        // حفظ إعدادات المؤسسة (قد تكون فارغة في البداية)
        const orgSettings = {
          site_name: organization.name,
          seo_store_title: organization.name,
          seo_meta_description: organization.description || `${organization.name} - أفضل المنتجات بأفضل الأسعار`,
          meta_keywords: `${organization.name}, متجر إلكتروني, تسوق أونلاين`,
          logo_url: organization.logo_url,
          favicon_url: organization.logo_url
        };
        
        // حفظ البيانات في localStorage
        localStorage.setItem('bazaar_organization_id', organization.id);
        localStorage.setItem(`bazaar_organization_${organization.id}`, JSON.stringify(orgData));
        localStorage.setItem(`bazaar_org_settings_${organization.id}`, JSON.stringify(orgSettings));
        
        // حفظ في session storage للوصول السريع حسب النطاق الفرعي
        const subdomain = organization.subdomain || currentSubdomain;
        if (subdomain && subdomain !== 'main') {
          const storeInfo = {
            name: organization.name,
            description: organization.description || `${organization.name} - متجر إلكتروني متميز`,
            logo_url: organization.logo_url,
            favicon_url: organization.logo_url,
            seo: {
              title: organization.name,
              description: organization.description || `${organization.name} - أفضل المنتجات بأفضل الأسعار`,
              keywords: `${organization.name}, متجر إلكتروني, تسوق أونلاين`,
              og_image: organization.logo_url
            }
          };
          sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(storeInfo));
          
        }
        
        // إطلاق حدث مخصص لتنبيه النظام الديناميكي
        const updateEvent = new CustomEvent('organizationDataUpdated', {
          detail: {
            organization: orgData,
            settings: orgSettings,
            subdomain
          }
        });
        window.dispatchEvent(updateEvent);

      } catch (error) {
      }
    }
  }, [organization, currentSubdomain]);

  // تحديد ما إذا كان المستخدم مدير المؤسسة
  const isOrgAdmin = useMemo(() => {
    return user && organization && user.id === organization.owner_id;
  }, [user, organization]);

  // حالة التحميل الإجمالية
  const isLoading = authLoading || orgLoading;

  /**
   * إنشاء مؤسسة جديدة
   */
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

      if (error) {
        throw error;
      }

      // تحديث معرف المؤسسة وإعادة الجلب
      if (data) {
        localStorage.setItem('bazaar_organization_id', data);
        await fetchOrganization({ orgId: data });
      }

      return { success: true, organizationId: data };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }, [user, fetchOrganization]);

  /**
   * دعوة مستخدم إلى المؤسسة
   */
  const inviteUserToOrganization = useCallback(async (
    email: string,
    role: string = 'employee'
  ) => {
    try {
      if (!user) {
        throw new Error('يجب تسجيل الدخول لدعوة مستخدمين');
      }

      if (!organization) {
        throw new Error('يجب أن تكون جزءًا من مؤسسة لدعوة مستخدمين');
      }

      if (!isOrgAdmin) {
        throw new Error('يجب أن تكون مسؤول المؤسسة لدعوة مستخدمين');
      }

      const supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.rpc('invite_user_to_organization', {
        user_email: email,
        user_role: role
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }, [user, organization, isOrgAdmin]);

  /**
   * تحديث بيانات المؤسسة
   */
  const refreshOrganizationData = useCallback(async () => {
    clearError();
    await refreshOrganization();
  }, [refreshOrganization, clearError]);

  // قيمة السياق
  const value = useMemo<TenantContextType>(() => ({
    currentOrganization: organization,
    tenant: organization,
    organization,
    isOrgAdmin: !!isOrgAdmin,
    isLoading,
    error,
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData,
    refreshTenant: refreshOrganizationData
  }), [
    organization,
    isOrgAdmin,
    isLoading,
    error,
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData
  ]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
});

TenantProvider.displayName = 'TenantProvider';

/**
 * Hook لاستخدام سياق المستأجر
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export { TenantContext };
