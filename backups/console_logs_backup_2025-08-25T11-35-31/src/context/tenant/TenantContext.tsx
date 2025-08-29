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
    console.log(`🚀 [TenantProvider] بدء TenantProvider #${renderCount.current} - الوقت: ${performance.now().toFixed(2)}ms`);
    
    // 🚨 تحذير إذا كان الرندر مفرط
    if (renderCount.current > 3) {
      console.warn(`⚠️ [TenantProvider] رندر مفرط! العدد: ${renderCount.current}`);
      console.trace('TenantProvider re-render trace');
    }
    
    console.log(`🔍 [TenantProvider] البيانات الأولية:`, {
      currentSubdomain,
      authOrganization: !!authOrganization,
      organizationId,
      authLoading,
      pathname: location.pathname
    });
  }

  // State محسن مع preloading
  const [preloadedOrganization, setPreloadedOrganization] = useState<Organization | null>(null);
  const [isPreloading, setIsPreloading] = useState(true);

  // تحسين: Preloading محسن مع تقليل العمليات
  useEffect(() => {
    const preloadStartTime = performance.now();
    console.log(`🔍 [TenantProvider] بدء Preloading - الوقت: ${preloadStartTime.toFixed(2)}ms`);
    
    const preloadData = () => {
      try {
        // تحسين: تحميل أسرع من localStorage فقط
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        const storedOrgData = localStorage.getItem('bazaar_organization_data'); // تغيير من sessionStorage إلى localStorage

        console.log(`🔍 [TenantProvider] فحص localStorage:`, {
          hasStoredOrgId: !!storedOrgId,
          hasStoredOrgData: !!storedOrgData,
          storedOrgId
        });

        if (storedOrgId && storedOrgData) {
          try {
            const fullData = JSON.parse(storedOrgData);
            // تحسين: التحقق من صحة البيانات بسرعة
            if (fullData && fullData.id === storedOrgId) {
              const preloadTime = performance.now() - preloadStartTime;
              console.log('⚡ [TenantProvider] Preloading سريع من localStorage:', {
                organizationId: fullData.id,
                organizationName: fullData.name,
                preloadTime: `${preloadTime.toFixed(2)}ms`
              });
              setPreloadedOrganization(fullData);
              return;
            }
          } catch (e) {
            console.warn('⚠️ [TenantProvider] خطأ في parsing localStorage data:', e);
            // تجاهل أخطاء parsing وتنظيف البيانات التالفة
            localStorage.removeItem('bazaar_organization_data');
          }
        }
        
        // تحسين: fallback أبسط إذا لم تكن هناك بيانات كاملة
        if (storedOrgId) {
          const storedOrgName = localStorage.getItem('bazaar_organization_name');
          console.log(`🔍 [TenantProvider] fallback بيانات جزئية:`, {
            storedOrgId,
            hasStoredOrgName: !!storedOrgName,
            storedOrgName
          });
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
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ [TenantContext] لا توجد بيانات محفوظة للـ preloading');
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [TenantContext] خطأ في preloading:', error);
        }
      } finally {
        const totalPreloadTime = performance.now() - preloadStartTime;
        console.log('✅ [TenantContext] انتهى Preloading في:', `${totalPreloadTime.toFixed(2)}ms`);
        setIsPreloading(false);
      }
    };

    // Preloading فوري
    preloadData();
  }, [currentSubdomain]);

  // تحسين: معاملات الجلب محسنة مع تقليل العمليات
  const fetchParams = useMemo(() => {
    const hostname = window.location.hostname;
    console.log(`🔍 [TenantProvider] حساب fetchParams - الوقت: ${performance.now().toFixed(2)}ms`);
    
    // تحسين: أولوية 1 - استخدام البيانات المحفوظة أولاً
    if (preloadedOrganization?.id) {
      console.log(`✅ [TenantProvider] استخدام preloadedOrganization:`, preloadedOrganization.id);
      return { orgId: preloadedOrganization.id };
    }
    
    // تحسين: أولوية 2 - معرف من AuthContext
    if (authOrganization?.id) {
      console.log(`✅ [TenantProvider] استخدام authOrganization:`, authOrganization.id);
      return { orgId: authOrganization.id };
    }
    
    // تحسين: أولوية 3 - النطاق الفرعي (أسرع من النطاق المخصص)
    if (currentSubdomain && currentSubdomain !== 'main') {
      console.log(`✅ [TenantProvider] استخدام currentSubdomain:`, currentSubdomain);
      return { subdomain: currentSubdomain };
    }
    
    // تحسين: أولوية 4 - النطاق المخصص (فقط إذا لم تكن localhost)
    if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      console.log(`✅ [TenantProvider] استخدام hostname:`, hostname);
      return { hostname };
    }
    
    console.warn('⚠️ [TenantProvider] لم يتم تحديد معاملات الجلب:', {
      hostname,
      currentSubdomain,
      authOrganization: !!authOrganization,
      preloadedOrganization: !!preloadedOrganization
    });
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
        console.log('✅ [TenantContext] تم حفظ معرف المؤسسة:', org.id);
      }
    },
    onError: (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [TenantContext] خطأ في جلب المؤسسة:', err);
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
      console.log('💾 [TenantContext] تم حفظ بيانات المؤسسة:', {
        id: finalOrganization.id,
        name: finalOrganization.name,
        subdomain: finalOrganization.subdomain,
        saveTime: `${saveTime.toFixed(2)}ms`
      });
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
    console.log('🔧 [TenantContext] إنشاء Context Value:', {
      time: `${time.toFixed(2)}ms`,
      hasOrganization: !!finalOrganization,
      isLoading: finalLoading
    });
    
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
      console.log('🚀 [TenantContext] تم تحميل المؤسسة بنجاح:', {
        organizationId: finalOrganization.id,
        organizationName: finalOrganization.name,
        totalTime: `${totalTime.toFixed(2)}ms`,
        source: preloadedOrganization ? 'preloaded' : 'fetched',
        timestamp: new Date().toISOString()
      });
    }
  }, [finalOrganization, finalLoading, preloadedOrganization]);

  // تسجيل حالة التحميل
  useEffect(() => {
    const currentTime = performance.now() - appStartTime.current;
    console.log('📊 [TenantContext] حالة التحميل:', {
      currentTime: `${currentTime.toFixed(2)}ms`,
      isPreloading,
      orgLoading,
      authLoading,
      finalLoading,
      hasPreloadedOrg: !!preloadedOrganization,
      hasFetchedOrg: !!organization,
      hasFinalOrg: !!finalOrganization,
      timestamp: new Date().toISOString()
    });
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
