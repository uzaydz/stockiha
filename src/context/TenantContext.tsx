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
const extractSubdomain = async (hostname: string): Promise<string | null> => {
  console.log('TenantContext - استخراج النطاق الفرعي من:', hostname);
  
  // التحقق من النطاق المخصص أولاً
  const checkCustomDomain = async (): Promise<string | null> => {
    try {
      const { data: orgData } = await getSupabaseClient()
        .from('organizations')
        .select('subdomain')
        .eq('domain', hostname)
        .single();
      
      if (orgData?.subdomain) {
        console.log('TenantContext - تم العثور على نطاق مخصص:', hostname);
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
  
  // التحقق من النطاق المخصص
  const customDomainSubdomain = await checkCustomDomain();
  if (customDomainSubdomain) {
    return customDomainSubdomain;
  }
  
  // إذا لم نتمكن من استخراج نطاق فرعي، نعيد null
  console.log('TenantContext - لم يتم اكتشاف سابدومين صالح، استخدام null');
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
          console.log(`تم العثور على المؤسسة بواسطة النطاق الرئيسي: ${currentHostname}`);
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
        console.log('بدء استرجاع بيانات المؤسسة - النطاق الفرعي:', subdomain);
        
        // أولاً نحاول العثور على المؤسسة بواسطة النطاق الرئيسي (الحالي)
        const currentHostname = window.location.hostname;
        console.log('اسم المضيف الحالي:', currentHostname);
        
        // إلغاء التخزين المؤقت للتأكد من استدعاء البيانات المحدثة من قاعدة البيانات
        localStorage.removeItem(`tenant:domain:${currentHostname}`);
        
        // محاولة البحث عن المؤسسة بواسطة النطاق الرئيسي
        const orgByDomain = await getOrganizationByDomain(currentHostname);
        
        if (orgByDomain) {
          console.log(`تم العثور على المؤسسة بواسطة النطاق الرئيسي: ${currentHostname}`, orgByDomain);
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
            console.log('تم العثور على المؤسسة:', orgBySubdomain.name);
            setOrganization(updateOrganizationFromData(orgBySubdomain));
            
            // حفظ معرف المؤسسة في التخزين المحلي للاستخدام لاحقاً
            localStorage.setItem('bazaar_organization_id', orgBySubdomain.id);
            
            // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
            if (user && user.id === orgBySubdomain.owner_id) {
              setIsOrgAdmin(true);
            }
          } else {
            console.log('لم يتم العثور على مؤسسة بالنطاق الفرعي:', subdomain);
            
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
      console.log('محاولة تحميل المؤسسة من التخزين المحلي بمعرف:', storedOrgId);
      
      if (storedOrgId) {
        const orgById = await getOrganizationById(storedOrgId);
        if (orgById) {
          console.log('تم العثور على المؤسسة من التخزين المحلي:', orgById.name);
          setOrganization(updateOrganizationFromData(orgById));
          
          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === orgById.owner_id) {
            setIsOrgAdmin(true);
          }
        } else {
          console.log('لم يتم العثور على مؤسسة باستخدام المعرف المخزن محلياً');
          setOrganization(null);
        }
      } else {
        console.log('لا يوجد معرف مؤسسة مخزن محلياً');
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
      console.log('بدء تحديث بيانات المؤسسة بشكل كامل...');
      
      // مسح كل التخزين المؤقت المتعلق بالمؤسسة
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (orgId) {
        console.log(`مسح التخزين المؤقت للمؤسسة: ${orgId}`);
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
          console.log(`حذف مفتاح التخزين المؤقت: ${key}`);
          localStorage.removeItem(key);
        });
      }
      
      // استخدام معرف المؤسسة لجلب البيانات المحدثة مباشرة
      if (orgId) {
        console.log(`جلب بيانات المؤسسة مباشرة باستخدام المعرف: ${orgId}`);
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
          console.log('تم جلب بيانات المؤسسة بنجاح:', orgData.name);
          console.log('النطاق المخصص:', orgData.domain || 'لا يوجد');
          
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