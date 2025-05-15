import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';
import { getOrganizationBySubdomain, getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationById } from '@/lib/api/organization';

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
  organization: Organization | null;
  isOrgAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  createOrganization: (name: string, description?: string, domain?: string, subdomain?: string) => Promise<{ success: boolean, organizationId?: string, error?: Error }>;
  inviteUserToOrganization: (email: string, role?: string) => Promise<{ success: boolean, error?: Error }>;
  refreshOrganizationData: () => Promise<void>;
  refreshTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// وظيفة مساعدة لتحديث معرف المؤسسة في التخزين المحلي
const updateLocalStorageOrgId = (organizationId: string | null) => {
  try {
    if (organizationId) {
      const currentStoredId = localStorage.getItem('bazaar_organization_id');
      if (currentStoredId !== organizationId) {
        
        localStorage.setItem('bazaar_organization_id', organizationId);
      }
    } else {
      // إذا كان المعرف فارغاً، قم بحذف المعرف المخزن
      localStorage.removeItem('bazaar_organization_id');
      
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
const extractSubdomain = async (hostname: string): Promise<string | null> => {
  
  
  // التحقق من النطاق المخصص أولاً
  const checkCustomDomain = async (): Promise<string | null> => {
    try {
      const { data: orgData } = await getSupabaseClient()
        .from('organizations')
        .select('subdomain')
        .eq('domain', hostname)
        .single();
      
      if (orgData?.subdomain) {
        
        return orgData.subdomain;
      }
    } catch (error) {
      console.error('TenantContext - خطأ في التحقق من النطاق المخصص:', error);
    }
    return null;
  };
  
  // التعامل مع السابدومين في بيئة localhost المحلية
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    // مثال: mystore.localhost:8080 أو mystore.localhost
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      
      return parts[0];
    }
    
    // إذا كان فقط localhost بدون سابدومين
    if (hostname === 'localhost') {
      
      return 'main';
    }
  }
  
  // التعامل مع عناوين IP المحلية (127.0.0.1, etc.)
  if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    
    return 'main';
  }
  
  // اختبار ما إذا كان النطاق الرئيسي
  if (isMainDomain(hostname)) {
    
    return 'main';
  }
  
  // تقسيم اسم المضيف إلى أجزاء للنطاقات العادية
  const hostParts = hostname.split('.');
  
  // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
  if (hostParts.length > 2) {
    const subdomain = hostParts[0];
    
    // لا نعتبر 'www' كنطاق فرعي حقيقي
    if (subdomain === 'www') {
      
      return 'main';
    }
    
    
    return subdomain;
  }
  
  // التحقق من النطاق المخصص
  const customDomainSubdomain = await checkCustomDomain();
  if (customDomainSubdomain) {
    return customDomainSubdomain;
  }
  
  // إذا لم نتمكن من استخراج نطاق فرعي، نعيد null
  
  return null;
};

// إضافة وظيفة للتحقق من النطاق المخصص
export const getOrganizationFromCustomDomain = async (hostname: string): Promise<{ id: string; subdomain: string } | null> => {
  if (!hostname || hostname.includes('localhost')) return null;
  
  try {
    const supabase = getSupabaseClient();
    
    // البحث عن المؤسسة باستخدام النطاق المخصص
    const { data: orgData, error } = await supabase
      .from('organizations')
      .select('id, name, subdomain')
      .eq('domain', hostname)
      .maybeSingle();
      
    if (!error && orgData && orgData.id && orgData.subdomain) {
      
      return {
        id: orgData.id,
        subdomain: orgData.subdomain
      };
    }
  } catch (error) {
    console.error('خطأ في البحث عن المؤسسة بالنطاق المخصص:', error);
  }
  
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

  // التحقق من النطاق المخصص عند بدء التشغيل
  useEffect(() => {
    const checkCustomDomain = async () => {
      const hostname = window.location.hostname;
      
      if (!hostname.includes('localhost')) {
        const orgData = await getOrganizationFromCustomDomain(hostname);
        if (orgData) {
          
          localStorage.setItem('bazaar_organization_id', orgData.id);
          localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
          
          // تحديث الحالة
          setOrganization({
            id: orgData.id,
            name: '',
            subdomain: orgData.subdomain,
            subscription_tier: 'premium',
            subscription_status: 'active',
            settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    };
    
    checkCustomDomain();
  }, []);

  // مزامنة بيانات المؤسسة من AuthContext إلى TenantContext - محسنة
  useEffect(() => {
    if (authOrganization && !organization && !loadingOrganization.current) {
      
      
      // تحويل بيانات المؤسسة من AuthContext إلى النموذج المطلوب لـ TenantContext
      setOrganization(updateOrganizationFromData(authOrganization));
      
      // حفظ معرف المؤسسة في التخزين المحلي
      localStorage.setItem('bazaar_organization_id', authOrganization.id);
      setIsLoading(false);
      initialized.current = true;
    }
  }, [authOrganization, organization]);

  // تحديث وظيفة fetchOrganizationBySubdomain
  const fetchOrganizationBySubdomain = useCallback(async (subdomain: string | null) => {
    if (!subdomain) return null;
    
    try {
      // أولاً نحاول العثور على المؤسسة بواسطة النطاق الرئيسي (الحالي)
      const currentHostname = window.location.hostname;
      if (currentHostname !== 'localhost' && !currentHostname.includes('localhost')) {
        // محاولة العثور على المؤسسة بالنطاق الرئيسي
        const orgByDomain = await getOrganizationByDomain(currentHostname);
        if (orgByDomain) {
          
          return orgByDomain;
        }
      }
      
      // إذا لم نعثر على المؤسسة بالنطاق الرئيسي، نستخدم النطاق الفرعي
      return await getOrganizationBySubdomain(subdomain);
    } catch (error) {
      console.error(`خطأ أثناء جلب المؤسسة بالنطاق الفرعي: ${subdomain}`, error);
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
        const subdomain = currentSubdomain || await extractSubdomain(window.location.hostname);
        
        
        // أولاً نحاول العثور على المؤسسة بواسطة النطاق الرئيسي (الحالي)
        const currentHostname = window.location.hostname;
        
        
        // إلغاء التخزين المؤقت للتأكد من استدعاء البيانات المحدثة من قاعدة البيانات
        localStorage.removeItem(`tenant:domain:${currentHostname}`);
        
        // محاولة البحث عن المؤسسة بواسطة النطاق الرئيسي
        const orgByDomain = await getOrganizationByDomain(currentHostname);
        
        if (orgByDomain) {
          
          setOrganization(updateOrganizationFromData(orgByDomain));
          localStorage.setItem('bazaar_organization_id', orgByDomain.id);
          
          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === orgByDomain.owner_id) {
            setIsOrgAdmin(true);
          }
        }
        // محاولة البحث عن المؤسسة بواسطة النطاق الفرعي
        else if (subdomain) {
          const orgBySubdomain = await getOrganizationBySubdomain(subdomain);
          
          if (orgBySubdomain) {
            
            setOrganization(updateOrganizationFromData(orgBySubdomain));
            
            // حفظ معرف المؤسسة في التخزين المحلي للاستخدام لاحقاً
            localStorage.setItem('bazaar_organization_id', orgBySubdomain.id);
            
            // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
            if (user && user.id === orgBySubdomain.owner_id) {
              setIsOrgAdmin(true);
            }
          } else {
            
            
            // محاولة استخدام المعرف المخزن محلياً كاحتياطي
            tryLoadFromLocalStorage();
          }
        } else {
          // محاولة استخدام المعرف المخزن محلياً
          tryLoadFromLocalStorage();
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
    
    // وظيفة مساعدة لتحميل المؤسسة من التخزين المحلي
    const tryLoadFromLocalStorage = async () => {
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      
      
      if (storedOrgId) {
        const orgById = await getOrganizationById(storedOrgId);
        if (orgById) {
          
          setOrganization(updateOrganizationFromData(orgById));
          
          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === orgById.owner_id) {
            setIsOrgAdmin(true);
          }
        } else {
          
          setOrganization(null);
        }
      } else {
        
        setOrganization(null);
      }
    };
    
    loadTenantData();
  }, [currentSubdomain, authLoading, user, organization, getOrganizationById, getOrganizationByDomain, getOrganizationBySubdomain]);

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
      
      
      // مسح كل التخزين المؤقت المتعلق بالمؤسسة
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (orgId) {
        
        localStorage.removeItem(`organization:${orgId}`);
        
        // مسح أي تخزين مؤقت آخر متعلق بالمؤسسة
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(orgId) || key.includes('tenant:') || key.includes('domain:'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          
          localStorage.removeItem(key);
        });
      }
      
      // استخدام معرف المؤسسة لجلب البيانات المحدثة مباشرة
      if (orgId) {
        
        const supabaseClient = await getSupabaseClient();
        
        const { data: orgData, error: orgError } = await supabaseClient
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        
        if (orgError) {
          console.error('خطأ في جلب بيانات المؤسسة:', orgError);
          throw orgError;
        }
        
        if (orgData) {
          
          
          
          setOrganization(updateOrganizationFromData(orgData));
          localStorage.setItem('bazaar_organization_id', orgData.id);
          
          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === orgData.owner_id) {
            setIsOrgAdmin(true);
          }
          
          return;
        }
      }
      
      // إذا فشل استرداد البيانات بواسطة المعرف، نعود إلى الطريقة الاحتياطية
      // استخدام النطاق الفرعي الحالي أو استخراجه من اسم المضيف
      const subdomain = currentSubdomain || await extractSubdomain(window.location.hostname);
      
      // حذف التخزين المؤقت لضمان الحصول على أحدث البيانات
      localStorage.removeItem(`tenant:subdomain:${subdomain}`);
      
      const org = await fetchOrganizationBySubdomain(subdomain);
      
      if (org) {
        setOrganization(updateOrganizationFromData(org));
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
  }, [currentSubdomain, authLoading, user, fetchOrganizationBySubdomain, getSupabaseClient]);

  // استخدام useMemo لتجنب إعادة الإنشاء
  const value = useMemo(() => ({
    currentOrganization: organization,
    tenant: organization,
    organization,
    isOrgAdmin,
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

// معالجة مشكلة نوع settings
const updateOrganizationFromData = (orgData: any): Organization => {
  return {
    id: orgData.id,
    name: orgData.name,
    description: orgData.description,
    logo_url: orgData.logo_url,
    domain: orgData.domain,
    subdomain: orgData.subdomain,
    subscription_tier: orgData.subscription_tier || 'free',
    subscription_status: orgData.subscription_status || 'inactive',
    settings: typeof orgData.settings === 'string' 
      ? JSON.parse(orgData.settings || '{}') 
      : (orgData.settings || {}),
    created_at: orgData.created_at,
    updated_at: orgData.updated_at,
    owner_id: orgData.owner_id
  };
}; 