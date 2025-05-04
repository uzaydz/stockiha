import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

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
  // اختبار ما إذا كان النطاق الرئيسي
  if (isMainDomain(hostname)) {
    console.log('تم اكتشاف النطاق الرئيسي، استخدام "main" كقيمة خاصة');
    return 'main';
  }
  
  // تقسيم اسم المضيف إلى أجزاء
  const hostParts = hostname.split('.');
  
  // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
  if (hostParts.length > 2) {
    const subdomain = hostParts[0];
    
    // لا نعتبر 'www' كنطاق فرعي حقيقي (تم التعامل معه أعلاه)
    if (subdomain === 'www') {
      return 'main';
    }
    
    return subdomain;
  }
  
  return null;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, currentSubdomain } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // تحميل بيانات المؤسسة عند تغيير النطاق الفرعي أو عند تحميل التطبيق
  useEffect(() => {
    const loadTenantData = async () => {
      setIsLoading(true);
      
      try {
        // استخدام النطاق الفرعي الحالي أو استخراجه من اسم المضيف
        const subdomain = currentSubdomain || extractSubdomain(window.location.hostname);
        console.log('بدء استرجاع بيانات المؤسسة - النطاق الفرعي:', subdomain);
        
        // استخدام الدالة الجديدة للحصول على بيانات المؤسسة
        const organization = await fetchOrganizationBySubdomain(subdomain);
        
        if (organization) {
          console.log('تم العثور على المؤسسة:', organization.name);
          setOrganization(organization);
          
          // حفظ معرف المؤسسة في التخزين المحلي للاستخدام لاحقاً
          localStorage.setItem('bazaar_organization_id', organization.id);
        } else {
          console.log('لم يتم العثور على مؤسسة بالنطاق الفرعي:', subdomain);
          setOrganization(null);
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المؤسسة:', error);
        setOrganization(null);
      } finally {
        setInitialized(true);
        setIsLoading(false);
      }
    };
    
    loadTenantData();
  }, [currentSubdomain]);

  // إنشاء مؤسسة جديدة
  const createOrganization = async (name: string, description?: string, domain?: string, subdomain?: string) => {
    try {
      if (!user) {
        throw new Error('يجب تسجيل الدخول لإنشاء مؤسسة جديدة');
      }

      const { data, error } = await supabase.rpc('create_organization', {
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
  };

  // دعوة مستخدم إلى المؤسسة
  const inviteUserToOrganization = async (email: string, role: string = 'employee') => {
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

      const { data, error } = await supabase.rpc('invite_user_to_organization', {
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
  };

  // تحديث بيانات المؤسسة
  const refreshOrganizationData = async () => {
    if (authLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let organizationData = null;

      // إذا كان هناك نطاق فرعي، ابحث عن المؤسسة بناءً على النطاق الفرعي
      if (currentSubdomain) {
        const { data: subdomainOrgData, error: subdomainError } = await supabase
          .from('organizations')
          .select('*')
          .eq('subdomain', currentSubdomain)
          .single();

        if (subdomainError && subdomainError.code !== 'PGRST116') {
          console.error('Error fetching organization by subdomain:', subdomainError);
        } else if (subdomainOrgData) {
          organizationData = subdomainOrgData;
          
          // التحقق مما إذا كان المستخدم الحالي هو مسؤول هذه المؤسسة
          if (user) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('is_org_admin')
              .eq('id', user.id)
              .eq('organization_id', organizationData.id)
              .single();

            if (userError && userError.code !== 'PGRST116') {
              console.error('Error checking admin status:', userError);
            } else if (userData) {
              setIsOrgAdmin(userData.is_org_admin || false);
            } else {
              setIsOrgAdmin(false);
            }
          }
        }
      }
      
      // إذا لم يتم العثور على مؤسسة بناءً على النطاق الفرعي وكان المستخدم مسجلاً
      if (!organizationData && user) {
        // الاستعلام عن المؤسسة للمستخدم الحالي
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id, is_org_admin')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }
        
        // لا نستمر إلا إذا كان لدينا بيانات صالحة
        if (userData?.organization_id) {
          // استرجاع بيانات المؤسسة
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .single();

          if (orgError) {
            throw orgError;
          }

          organizationData = orgData;
          setIsOrgAdmin(userData.is_org_admin || false);
        }
      }

      setOrganization(organizationData);
      
      // إذا لم يتم العثور على مؤسسة وكان المستخدم مسجلاً، فهو لا ينتمي إلى أي مؤسسة
      if (!organizationData && user) {
        setIsOrgAdmin(false);
      }
    } catch (err) {
      console.error('Error refreshing organization data:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // جلب بيانات المؤسسة باستخدام النطاق الفرعي أو معرف المؤسسة
  const fetchOrganizationBySubdomain = async (subdomain: string | null) => {
    try {
      if (!subdomain) {
        return null;
      }
      
      // التعامل مع النطاق الرئيسي
      if (subdomain === 'main') {
        console.log('جلب المؤسسة للنطاق الرئيسي باستخدام المعرف المخزن');
        // محاولة استخدام معرف المؤسسة من التخزين المحلي
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        
        if (!storedOrgId) {
          console.log('لم يتم العثور على معرف مؤسسة مخزن، استخدام المعرف الافتراضي');
          // استخدام معرف المؤسسة الافتراضي
          const defaultOrgId = 'aacf0931-91aa-4da3-94e6-eef5d8956443';
          
          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', defaultOrgId)
            .single();
            
          if (error) {
            console.error('خطأ في جلب المؤسسة الافتراضية:', error);
            return null;
          }
          
          // حفظ المعرف في التخزين المحلي للمرات القادمة
          localStorage.setItem('bazaar_organization_id', defaultOrgId);
          return data;
        }
        
        // استخدام المعرف المخزن
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', storedOrgId)
          .single();
        
        if (error) {
          console.error('خطأ في جلب المؤسسة من المعرف المخزن:', error);
          return null;
        }
        
        return data;
      }
      
      // للنطاقات الفرعية الحقيقية
      console.log('جاري البحث عن المؤسسة باستخدام النطاق الفرعي:', subdomain);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (error) {
        console.error('خطأ في جلب بيانات المؤسسة بواسطة النطاق الفرعي:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('خطأ في جلب بيانات المؤسسة بواسطة النطاق الفرعي:', error);
      return null;
    }
  };

  // القيمة التي سيتم توفيرها من خلال السياق
  const value: TenantContextType = {
    currentOrganization: organization,
    isOrgAdmin,
    isLoading,
    error,
    createOrganization,
    inviteUserToOrganization,
    refreshOrganizationData
  };

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