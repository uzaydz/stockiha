/**
 * TenantContext محسن ومبسط
 * يستخدم المكونات المنفصلة للأداء الأفضل
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState, useRef } from 'react';
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
  const appStartTime = useRef(performance.now());
  const renderCount = useRef(0);
  const { user, isLoading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const { organizationId } = useUser();
  const location = useLocation();

  // 🔍 Console logs للتتبع المفصل مع تحذير الرندر المفرط
  renderCount.current++;
  if (process.env.NODE_ENV === 'development') {
    
    // 🚨 تحذير إذا كان الرندر مفرط
    if (renderCount.current > 3) {
    }
    
  }

  // State محسن مع preloading
  const [preloadedOrganization, setPreloadedOrganization] = useState<Organization | null>(null);
  const [isPreloading, setIsPreloading] = useState(true);

  // 🚀 الاستماع لأحداث AppInitializer لحل مشكلة التحميل
  useEffect(() => {
    const handleAppInitData = (event: CustomEvent) => {
      try {
        const { organization: orgData } = event.detail;
        if (orgData && orgData.id) {
          
          // إنشاء كائن المؤسسة من البيانات المستلمة
          const newOrg: Organization = {
            id: orgData.id,
            name: orgData.name,
            subdomain: orgData.subdomain || '',
            description: orgData.description || '',
            logo_url: orgData.logo_url || '',
            domain: orgData.domain || '',
            subscription_tier: orgData.subscription_tier || 'basic',
            subscription_status: orgData.subscription_status || 'active',
            settings: orgData.settings || {},
            created_at: orgData.created_at || new Date().toISOString(),
            updated_at: orgData.updated_at || new Date().toISOString(),
            owner_id: orgData.owner_id || ''
          };
          
          setPreloadedOrganization(newOrg);
          setIsPreloading(false);
          
          // حفظ البيانات في localStorage
          localStorage.setItem('bazaar_organization_id', newOrg.id);
          localStorage.setItem('bazaar_organization_name', newOrg.name);
          sessionStorage.setItem('bazaar_organization_data', JSON.stringify(newOrg));
        }
      } catch (error) {
      }
    };

    window.addEventListener('appInitDataReady', handleAppInitData);
    
    return () => {
      window.removeEventListener('appInitDataReady', handleAppInitData);
    };
  }, []);

  // تحسين: Preloading محسن مع تقليل العمليات
  useEffect(() => {
    const preloadStartTime = performance.now();
    
    const preloadData = () => {
      try {
        
        // تحسين: تحميل أسرع من localStorage فقط
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        const storedOrgData = localStorage.getItem('bazaar_organization_data'); // تغيير من sessionStorage إلى localStorage

        if (storedOrgId && storedOrgData) {
          try {
            const fullData = JSON.parse(storedOrgData);
            // تحسين: التحقق من صحة البيانات بسرعة
            if (fullData && fullData.id === storedOrgId) {
              const preloadTime = performance.now() - preloadStartTime;
              setPreloadedOrganization(fullData);
              setIsPreloading(false);
              return;
            }
          } catch (e) {
            // تجاهل أخطاء parsing وتنظيف البيانات التالفة
            localStorage.removeItem('bazaar_organization_data');
          }
        }
        
        // تحسين: fallback أبسط إذا لم تكن هناك بيانات كاملة
        if (storedOrgId) {
          const storedOrgName = localStorage.getItem('bazaar_organization_name');
          if (storedOrgName) {
            // إنشاء كائن مؤقت بسيط
            const tempOrg: Organization = {
              id: storedOrgId,
              name: storedOrgName,
              subdomain: currentSubdomain || '',
              description: '',
              logo_url: '',
              domain: '',
              subscription_tier: 'free',
              subscription_status: 'trial',
              settings: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              owner_id: ''
            };
            setPreloadedOrganization(tempOrg);
            setIsPreloading(false);
            return;
          }
        }
        
        // إذا لم تكن هناك بيانات محفوظة، نتوقف عن التحميل
        setIsPreloading(false);
        
      } catch (error) {
        setIsPreloading(false);
      } finally {
        const totalPreloadTime = performance.now() - preloadStartTime;
      }
    };

    // Preloading فوري
    preloadData();
  }, [currentSubdomain]);

  // تحسين: معاملات الجلب محسنة مع تقليل العمليات
  const fetchParams = useMemo(() => {
    const hostname = window.location.hostname;
    
    // تحسين: أولوية 1 - استخدام البيانات المحفوظة أولاً
    if (preloadedOrganization?.id) {
      return { orgId: preloadedOrganization.id };
    }
    
    // تحسين: أولوية 2 - معرف من AuthContext
    if (authOrganization?.id) {
      return { orgId: authOrganization.id };
    }
    
    // تحسين: أولوية 3 - النطاق الفرعي (أسرع من النطاق المخصص)
    if (currentSubdomain && currentSubdomain !== 'main') {
      return { subdomain: currentSubdomain };
    }
    
    // تحسين: أولوية 4 - النطاق المخصص (فقط إذا لم تكن localhost)
    if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      return { hostname };
    }
    
    return undefined;
  }, [authOrganization?.id, currentSubdomain, preloadedOrganization?.id]);

  // 🚨 تحسين: تعطيل جلب المؤسسة من TenantProvider مؤقتاً
  // لأن get_store_init_data يوفر البيانات المطلوبة بنجاح
  const {
    organization,
    isLoading: orgLoading,
    error,
    fetchOrganization,
    refreshOrganization,
    clearError
  } = useOrganizationData(undefined, { // تعطيل autoFetch
    autoFetch: false, // 🚨 تعطيل مؤقتاً لتجنب الحلقة اللانهائية
    timeout: 2000,
    retries: 0,
    onSuccess: (org) => {
      localStorage.setItem('bazaar_organization_id', org.id);
      if (process.env.NODE_ENV === 'development') {
      }
    },
    onError: (err) => {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  });

  // استخدام البيانات المحملة مسبقاً أو البيانات المجلوبة
  const finalOrganization = preloadedOrganization || organization;
  const finalLoading = isPreloading || (orgLoading && !preloadedOrganization);

  // 🔥 حفظ بيانات المؤسسة في الكاش للنظام الديناميكي
  useEffect(() => {
    if (finalOrganization) {
      const saveStartTime = performance.now();
      
      // حفظ في localStorage للوصول السريع
      localStorage.setItem('bazaar_organization_id', finalOrganization.id);
      localStorage.setItem('bazaar_organization_name', finalOrganization.name);
      
      // حفظ البيانات الكاملة في sessionStorage للجلسة الحالية
      sessionStorage.setItem('bazaar_organization_data', JSON.stringify(finalOrganization));
      
      const saveTime = performance.now() - saveStartTime;
    }
  }, [finalOrganization]);

  // تحديد ما إذا كان المستخدم مدير المؤسسة
  const isOrgAdmin = useMemo(() => {
    return user && finalOrganization && user.id === finalOrganization.owner_id;
  }, [user, finalOrganization]);

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

      if (!finalOrganization) {
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
  }, [user, finalOrganization, isOrgAdmin]);

  /**
   * تحديث بيانات المؤسسة
   */
  const refreshOrganizationData = useCallback(async () => {
    clearError();
    await refreshOrganization();
  }, [refreshOrganization, clearError]);

  // إنشاء قيمة Context
  const contextValue: TenantContextType = useMemo(() => {
    const startTime = performance.now();
    
    const value = {
      currentOrganization: finalOrganization,
      tenant: finalOrganization,
      organization: finalOrganization,
      isOrgAdmin: !!isOrgAdmin,
      isLoading: finalLoading,
      error: error as Error | null,
      createOrganization,
      inviteUserToOrganization,
      refreshOrganizationData,
      refreshTenant: refreshOrganizationData
    };
    
    const time = performance.now() - startTime;
    
    return value;
  }, [
    finalOrganization,
    isOrgAdmin,
    finalLoading,
    error,
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData
  ]);

  // تسجيل الأداء
  useEffect(() => {
    if (finalOrganization && !finalLoading) {
      const totalTime = performance.now() - appStartTime.current;
    }
  }, [finalOrganization, finalLoading, preloadedOrganization]);

  // تسجيل حالة التحميل
  useEffect(() => {
    const currentTime = performance.now() - appStartTime.current;
  }, [isPreloading, orgLoading, authLoading, finalLoading, preloadedOrganization, organization, finalOrganization]);

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
});

TenantProvider.displayName = 'TenantProvider';

/**
 * Hook لاستخدام TenantContext
 */
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
