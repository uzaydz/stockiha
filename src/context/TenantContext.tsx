import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

export type Organization = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  domain?: string;
  subdomain?: string;
  subscription_tier: string;
  subscription_status: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  owner_id?: string;
};

type TenantContextType = {
  currentOrganization: Organization | null;
  tenant: Organization | null;
  isOrgAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  createOrganization: (name: string, description?: string, domain?: string, subdomain?: string) => Promise<{ success: boolean, organizationId?: string, error?: Error }>;
  inviteUserToOrganization: (email: string, role?: string) => Promise<{ success: boolean, error?: Error }>;
  refreshOrganizationData: () => Promise<void>;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// وظيفة مساعدة لتحديث معرف المؤسسة في التخزين المحلي
const updateLocalStorageOrgId = (organizationId: string | null) => {
  try {
    if (organizationId) {
      const currentStoredId = localStorage.getItem('bazaar_organization_id');
      if (currentStoredId !== organizationId) {
        console.log("تحديث معرف المؤسسة في التخزين المحلي من:", currentStoredId, "إلى:", organizationId);
        localStorage.setItem('bazaar_organization_id', organizationId);
      }
    } else {
      // إذا كان المعرف فارغاً، قم بحذف المعرف المخزن
      localStorage.removeItem('bazaar_organization_id');
      console.log("تم حذف معرف المؤسسة من التخزين المحلي");
    }
  } catch (error) {
    console.error("خطأ في تحديث معرف المؤسسة في التخزين المحلي:", error);
  }
};

// التحقق ما إذا كان اسم المضيف هو النطاق الرئيسي
const isMainDomain = (hostname: string): boolean => {
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
};

// استخراج النطاق الفرعي من اسم المضيف
const extractSubdomain = (hostname: string): string | null => {
  console.log('TenantContext - استخراج النطاق الفرعي من:', hostname);
  
  // التعامل مع السابدومين في بيئة localhost المحلية
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    // مثال: mystore.localhost:8080 أو mystore.localhost
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      console.log('TenantContext - تم اكتشاف سابدومين محلي:', parts[0]);
      return parts[0];
    }
    
    // إذا كان فقط localhost بدون سابدومين
    if (hostname === 'localhost') {
      console.log('TenantContext - تم اكتشاف localhost بدون سابدومين، استخدام main كقيمة');
      return 'main';
    }
  }
  
  // التعامل مع عناوين IP المحلية (127.0.0.1, etc.)
  if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    console.log('TenantContext - تم اكتشاف عنوان IP محلي، استخدام main كقيمة');
    return 'main';
  }
  
  // اختبار ما إذا كان النطاق الرئيسي
  if (isMainDomain(hostname)) {
    console.log('TenantContext - تم اكتشاف النطاق الرئيسي، استخدام main كقيمة');
    return 'main';
  }
  
  // تقسيم اسم المضيف إلى أجزاء للنطاقات العادية
  const hostParts = hostname.split('.');
  
  // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
  if (hostParts.length > 2) {
    const subdomain = hostParts[0];
    
    // لا نعتبر 'www' كنطاق فرعي حقيقي
    if (subdomain === 'www') {
      console.log('TenantContext - تم اكتشاف www، استخدام main كقيمة');
      return 'main';
    }
    
    console.log('TenantContext - تم اكتشاف سابدومين:', subdomain);
    return subdomain;
  }
  
  console.log('TenantContext - لا يوجد سابدومين');
  return null;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track initialization and prevent duplicate loads
  const initialized = useRef(false);
  const loadingOrganization = useRef(false);

  // مزامنة بيانات المؤسسة من AuthContext إلى TenantContext - محسنة
  useEffect(() => {
    if (authOrganization && !organization && !loadingOrganization.current) {
      console.log('مزامنة بيانات المؤسسة من AuthContext:', authOrganization.name);
      
      // تحويل بيانات المؤسسة من AuthContext إلى النموذج المطلوب لـ TenantContext
      const syncedOrg: Organization = {
        id: authOrganization.id,
        name: authOrganization.name,
        subscription_tier: authOrganization.subscription_tier || 'free',
        subscription_status: authOrganization.subscription_status || 'inactive',
        settings: {},
        created_at: authOrganization.created_at,
        updated_at: new Date().toISOString()
      };
      
      setOrganization(syncedOrg);
      
      // حفظ معرف المؤسسة في التخزين المحلي
      localStorage.setItem('bazaar_organization_id', authOrganization.id);
      setIsLoading(false);
      initialized.current = true;
    }
  }, [authOrganization, organization]);

  // محسّن - جلب بيانات المؤسسة باستخدام Subdomain مع تخزين مؤقت
  const fetchOrganizationBySubdomain = useCallback(async (subdomain: string): Promise<Organization | null> => {
    if (!subdomain) return null;
    
    try {
      // استخدام التخزين المؤقت لتجنب الاستعلامات المتكررة
      return await withCache<Organization | null>(
        `tenant:subdomain:${subdomain}`,
        async () => {
          console.log('جاري البحث عن المؤسسة باستخدام النطاق الفرعي:', subdomain);
          
          // Get Supabase client
          const supabaseClient = await getSupabaseClient();
          
          // إذا كان subdomain = 'main'، يجب استخدام معرف المؤسسة من التخزين المحلي
          if (subdomain === 'main') {
            const storedOrgId = localStorage.getItem('bazaar_organization_id');
            if (storedOrgId) {
              const { data, error } = await supabaseClient
                .from('organizations')
                .select('*')
                .eq('id', storedOrgId)
                .single();
              
              if (error || !data) {
                console.error('فشل في جلب بيانات المؤسسة الافتراضية:', error);
                return null;
              }
              
              return {
                id: data.id,
                name: data.name,
                description: data.description,
                logo_url: data.logo_url,
                domain: data.domain,
                subdomain: data.subdomain,
                subscription_tier: data.subscription_tier || 'free',
                subscription_status: data.subscription_status || 'inactive',
                settings: data.settings || {},
                created_at: data.created_at,
                updated_at: data.updated_at,
                owner_id: data.owner_id
              };
            }
            return null;
          }
          
          const { data, error } = await supabaseClient
            .from('organizations')
            .select('*')
            .eq('subdomain', subdomain)
            .single();
          
          if (error || !data) {
            console.error('فشل في جلب بيانات المؤسسة بواسطة النطاق الفرعي:', error);
            return null;
          }
          
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            logo_url: data.logo_url,
            domain: data.domain,
            subdomain: data.subdomain,
            subscription_tier: data.subscription_tier || 'free',
            subscription_status: data.subscription_status || 'inactive',
            settings: data.settings || {},
            created_at: data.created_at,
            updated_at: data.updated_at,
            owner_id: data.owner_id
          };
        },
        LONG_CACHE_TTL, // 24 ساعة تخزين مؤقت - مناسب للبيانات الأساسية
        true // تخزين في ذاكرة التطبيق
      );
    } catch (error) {
      console.error('خطأ في fetchOrganizationBySubdomain:', error);
      return null;
    }
  }, []);

  // تحميل بيانات المؤسسة عند تغيير النطاق الفرعي 
  useEffect(() => {
    // تجنب تحميل البيانات مرات متعددة
    if (authLoading || loadingOrganization.current || 
       (initialized.current && organization)) {
      return;
    }
    
    const loadTenantData = async () => {
      setIsLoading(true);
      loadingOrganization.current = true;
      
      try {
        // استخدام النطاق الفرعي الحالي أو استخراجه من اسم المضيف
        const subdomain = currentSubdomain || extractSubdomain(window.location.hostname);
        console.log('بدء استرجاع بيانات المؤسسة - النطاق الفرعي:', subdomain);
        
        const org = await fetchOrganizationBySubdomain(subdomain);
        
        if (org) {
          console.log('تم العثور على المؤسسة:', org.name);
          setOrganization(org);
          
          // حفظ معرف المؤسسة في التخزين المحلي للاستخدام لاحقاً
          localStorage.setItem('bazaar_organization_id', org.id);
          
          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === org.owner_id) {
            setIsOrgAdmin(true);
          }
        } else {
          console.log('لم يتم العثور على مؤسسة بالنطاق الفرعي:', subdomain);
          setOrganization(null);
        }
        
        initialized.current = true;
      } catch (error) {
        console.error('خطأ في تحميل بيانات المؤسسة:', error);
        setOrganization(null);
        setError(error as Error);
      } finally {
        loadingOrganization.current = false;
        setIsLoading(false);
      }
    };
    
    loadTenantData();
  }, [currentSubdomain, authLoading, user, fetchOrganizationBySubdomain, organization]);

  // إنشاء مؤسسة جديدة - محسنة مع useCallback
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

      // تحديث معرف المؤسسة في التخزين المحلي بعد الإنشاء
      if (data) {
        updateLocalStorageOrgId(data);
      }

      // تحديث السياق بعد إنشاء المؤسسة
      await refreshOrganizationData();

      return { success: true, organizationId: data };
    } catch (err) {
      console.error('Error creating organization:', err);
      return { success: false, error: err as Error };
    }
  }, [user]);

  // دعوة مستخدم إلى المؤسسة - محسنة مع useCallback
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
      console.error('Error inviting user to organization:', err);
      return { success: false, error: err as Error };
    }
  }, [user, organization, isOrgAdmin]);

  // تحديث بيانات المؤسسة - محسنة مع useCallback
  const refreshOrganizationData = useCallback(async () => {
    if (authLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    loadingOrganization.current = true;

    try {
      // استخدام النطاق الفرعي الحالي أو استخراجه من اسم المضيف
      const subdomain = currentSubdomain || extractSubdomain(window.location.hostname);
      
      // حذف التخزين المؤقت لضمان الحصول على أحدث البيانات
      localStorage.removeItem(`tenant:subdomain:${subdomain}`);
      
      const org = await fetchOrganizationBySubdomain(subdomain);
      
      if (org) {
        setOrganization(org);
        localStorage.setItem('bazaar_organization_id', org.id);
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('خطأ في تحديث بيانات المؤسسة:', error);
      setError(error as Error);
    } finally {
      loadingOrganization.current = false;
      setIsLoading(false);
    }
  }, [currentSubdomain, authLoading, fetchOrganizationBySubdomain]);

  // استخدام useMemo لتجنب إعادة الإنشاء
  const value = useMemo(() => ({
    currentOrganization: organization,
    tenant: organization,
    isOrgAdmin,
    isLoading,
    error,
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData
  }), [
    organization, 
    isOrgAdmin, 
    isLoading, 
    error, 
    createOrganization, 
    inviteUserToOrganization, 
    refreshOrganizationData
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

// Hook لاستخدام سياق المستأجر
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}; 