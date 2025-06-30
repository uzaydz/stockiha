import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';
import { getOrganizationBySubdomain, getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationById } from '@/lib/api/organization';
import { API_TIMEOUTS, RETRY_CONFIG, withTimeout, withRetry } from '@/config/api-timeouts';
import { useUser } from './UserContext';
// Removed deprecated auth fixes import

// إضافة global flag لمنع التشغيل المزدوج
declare global {
  interface Window {
    organizationCache?: Map<string, {
      data: any;
      timestamp: number;
      type: 'byId' | 'byDomain' | 'bySubdomain';
    }>;
    bazaarTenantLoading?: boolean;
  }
}

// تهيئة cache عالمي
if (typeof window !== 'undefined' && !window.organizationCache) {
  window.organizationCache = new Map();
}

const ORGANIZATION_CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

// دالة موحدة لجلب المنظمة مع cache ذكي
const fetchOrganizationUnified = async (params: {
  orgId?: string;
  hostname?: string;
  subdomain?: string;
}): Promise<any> => {
  const { orgId, hostname, subdomain } = params;
  
  // تحديد مفتاح cache بناء على المعاملات
  let cacheKey = '';
  let fetchType: 'byId' | 'byDomain' | 'bySubdomain' = 'byId';
  
  if (orgId) {
    cacheKey = `org-id-${orgId}`;
    fetchType = 'byId';
  } else if (hostname && !hostname.includes('localhost')) {
    cacheKey = `org-domain-${hostname}`;
    fetchType = 'byDomain';
  } else if (subdomain) {
    cacheKey = `org-subdomain-${subdomain}`;
    fetchType = 'bySubdomain';
  } else {
    return null;
  }
  
  // فحص cache أولاً
  if (window.organizationCache?.has(cacheKey)) {
    const cached = window.organizationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ORGANIZATION_CACHE_TTL) {
      console.log('🏢 استخدام المنظمة من cache:', cacheKey);
      return cached.data;
    }
  }
  
  // منع الاستدعاءات المتكررة للمفتاح نفسه
  const pendingKey = `pending-${cacheKey}`;
  if (window.organizationCache?.has(pendingKey)) {
    console.log('⏳ انتظار استدعاء جاري للمنظمة:', cacheKey);
    // انتظار لمدة قصيرة ثم إعادة المحاولة
    await new Promise(resolve => setTimeout(resolve, 100));
    if (window.organizationCache?.has(cacheKey)) {
      const cached = window.organizationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < ORGANIZATION_CACHE_TTL) {
        return cached.data;
      }
    }
  }
  
  // وضع علامة على أن الاستدعاء جاري
  if (window.organizationCache) {
    window.organizationCache.set(pendingKey, {
      data: null,
      timestamp: Date.now(),
      type: fetchType
    });
  }
  
  // جلب البيانات من قاعدة البيانات
  console.log('🔄 جلب بيانات المنظمة:', { fetchType, cacheKey });
  
  let orgData = null;
  
  try {
    switch (fetchType) {
      case 'byId':
        if (orgId) {
          orgData = await getOrganizationById(orgId);
        }
        break;
      case 'byDomain':
        if (hostname) {
          orgData = await getOrganizationByDomain(hostname);
        }
        break;
      case 'bySubdomain':
        if (subdomain) {
          orgData = await getOrganizationBySubdomain(subdomain);
        }
        break;
    }
    
    // حفظ في cache إذا تم العثور على البيانات
    if (orgData && window.organizationCache) {
      window.organizationCache.set(cacheKey, {
        data: orgData,
        timestamp: Date.now(),
        type: fetchType
      });
      
      // حفظ نفس البيانات بمفاتيح مختلفة لتجنب الاستدعاءات المستقبلية
      if (orgData.id && fetchType !== 'byId') {
        window.organizationCache.set(`org-id-${orgData.id}`, {
          data: orgData,
          timestamp: Date.now(),
          type: 'byId'
        });
      }
      if (orgData.subdomain && fetchType !== 'bySubdomain') {
        window.organizationCache.set(`org-subdomain-${orgData.subdomain}`, {
          data: orgData,
          timestamp: Date.now(),
          type: 'bySubdomain'
        });
      }
      if (orgData.domain && fetchType !== 'byDomain') {
        window.organizationCache.set(`org-domain-${orgData.domain}`, {
          data: orgData,
          timestamp: Date.now(),
          type: 'byDomain'
        });
      }
    }
    
    return orgData;
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات المنظمة:', error);
    return null;
  } finally {
    // إزالة علامة الانتظار
    if (window.organizationCache?.has(pendingKey)) {
      window.organizationCache.delete(pendingKey);
    }
  }
};

// دالة لتنظيف cache منتهي الصلاحية
const cleanExpiredOrganizationCache = () => {
  if (!window.organizationCache) return;
  
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  window.organizationCache.forEach((value, key) => {
    if (now - value.timestamp > ORGANIZATION_CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    window.organizationCache?.delete(key);
  });
  
  if (keysToDelete.length > 0) {
    console.log('🧹 تم تنظيف', keysToDelete.length, 'عنصر منتهي الصلاحية من cache المنظمات');
  }
};

// تشغيل تنظيف cache كل 5 دقائق
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredOrganizationCache, 5 * 60 * 1000);
}

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
  }
};

// التحقق ما إذا كان اسم المضيف هو النطاق الرئيسي
const isMainDomain = (hostname: string): boolean => {
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
};

// استخراج النطاق الفرعي من اسم المضيف - محسن مع cache
const extractSubdomain = async (hostname: string): Promise<string | null> => {
  
  // التعامل مع السابدومين في بيئة localhost المحلية
  if (hostname.includes('localhost')) {
    // إزالة رقم المنفذ إذا كان موجوداً
    const hostnameWithoutPort = hostname.split(':')[0];
    const parts = hostnameWithoutPort.split('.');
    
    // مثال: mystore.localhost أو lmrpoxcvvd.localhost
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== '') {
      return parts[0];
    }
    
    // إذا كان فقط localhost بدون سابدومين
    if (hostnameWithoutPort === 'localhost') {
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
  
  // التحقق من النطاق المخصص باستخدام النظام الموحد
  const orgData = await fetchOrganizationUnified({ hostname });
  if (orgData?.subdomain) {
    return orgData.subdomain;
  }
  
  // إذا لم نتمكن من استخراج نطاق فرعي، نعيد null
  
  return null;
};

// إضافة وظيفة للتحقق من النطاق المخصص - محسنة مع cache
export const getOrganizationFromCustomDomain = async (hostname: string): Promise<{ id: string; subdomain: string } | null> => {
  if (!hostname || hostname.includes('localhost')) return null;
  
  try {
    const orgData = await fetchOrganizationUnified({ hostname });
      
    if (orgData && orgData.id && orgData.subdomain) {
      return {
        id: orgData.id,
        subdomain: orgData.subdomain
      };
    }
  } catch (error) {
    console.error('خطأ في getOrganizationFromCustomDomain:', error);
  }
  
  return null;
};

// إضافة كومبوننت بسيط لعرض حالة التحميل
const LoadingIndicator = ({ isLoading, error, retryCount }: { 
  isLoading: boolean; 
  error: Error | null; 
  retryCount: number; 
}) => {
  if (!isLoading && !error) return null;
  
  // إضافة زر مسح cache
  const clearCacheAndReload = () => {
    try {
      // مسح كل localStorage المتعلق بالمؤسسة
      const keysToRemove = [
        'bazaar_organization_id',
        'bazaar_current_subdomain',
        'bazaar_organization_cache',
        'sidebarCollapsed'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // مسح sessionStorage أيضا
      sessionStorage.clear();
      
      // إعادة تحميل الصفحة
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  // إظهار المؤشر فقط بعد 3 ثوان من التحميل
  const [showIndicator, setShowIndicator] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowIndicator(true);
      }, 3000); // إظهار المؤشر بعد 3 ثوان
      
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isLoading]);

  if (!showIndicator && !error) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: error ? '#f8d7da' : '#d1ecf1',
      border: error ? '1px solid #f5c6cb' : '1px solid #bee5eb',
      color: error ? '#721c24' : '#0c5460',
      fontSize: '14px',
      zIndex: 9999,
      maxWidth: '350px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {isLoading && showIndicator && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            🔄 جارٍ تحميل بيانات المؤسسة...
            {retryCount > 0 && ` (المحاولة ${retryCount + 1})`}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
            إذا استمر التحميل لفترة طويلة، جرب إعادة تحميل الصفحة
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              إعادة تحميل
            </button>
            <button 
              onClick={clearCacheAndReload} 
              style={{
                padding: '6px 12px',
                border: '1px solid #007bff',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#007bff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              مسح البيانات المؤقتة
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // إعادة تعيين العلامات العالمية في البداية للحماية من التعليق
  useEffect(() => {
    if (window.bazaarTenantLoading) {
      console.log('🔧 إعادة تعيين العلامة العالمية في البداية');
      window.bazaarTenantLoading = false;
    }
  }, []);

  const { user, loading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const { organizationId } = useUser();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // تتبع حالة التحميل والتهيئة
  const initialized = useRef(false);
  const loadingOrganization = useRef(false);
  const retryCount = useRef(0);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Refs للقيم المتغيرة لتجنب dependencies
  const userRef = useRef(user);
  const organizationRef = useRef(organization);
  const authOrganizationRef = useRef(authOrganization);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    organizationRef.current = organization;
  }, [organization]);

  useEffect(() => {
    authOrganizationRef.current = authOrganization;
  }, [authOrganization]);

  // تنظيف الموارد عند unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
        loadingTimeout.current = null;
      }
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = null;
      }
    };
  }, []);

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
          
          setIsLoading(false);
          initialized.current = true;
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
      setError(null);
    }
  }, [authOrganization]); // إزالة organization من dependencies

  // دالة موحدة ومحسنة لجلب المنظمة
  const fetchOrganizationOptimized = useCallback(async (params: {
    orgId?: string;
    hostname?: string;
    subdomain?: string;
  }) => {
    return await fetchOrganizationUnified(params);
  }, []);

  // useEffect للتحقق من الحالة الأولية وبدء تحميل بيانات المؤسسة
  useEffect(() => {
    // منع التشغيل إذا كان التحميل جارياً أو اكتمل بالفعل
    if (loadingOrganization.current || (initialized.current && organization)) {
      console.log('🛑 تم تجاهل useEffect لأن التحميل جاري أو اكتمل:', {
        loading: loadingOrganization.current,
        initialized: initialized.current,
        hasOrg: !!organization
      });
      return;
    }

    // منع التشغيل أثناء تحميل المصادقة
    if (authLoading) {
      return;
    }

    // فحص العلامة العالمية مع timeout للحماية من التعليق
    if (window.bazaarTenantLoading) {
      console.log('🛑 تم تجاهل useEffect - التحميل جاري عالمياً، انتظار...');
      // انتظار قصير ثم إعادة المحاولة في حالة التعليق
      setTimeout(() => {
        if (window.bazaarTenantLoading) {
          console.log('⚠️ إعادة تعيين العلامة العالمية بسبب timeout');
          window.bazaarTenantLoading = false;
        }
      }, 3000);
      return;
    }

    console.log('🚀 بدء useEffect لتحميل بيانات المنظمة:', {
      currentSubdomain,
      authLoading,
      initialized: initialized.current
    });

    // وضع علامة عالمية أن التحميل بدأ
    window.bazaarTenantLoading = true;
    loadingOrganization.current = true;
    setIsLoading(true);
    setError(null);

    const loadTenantData = async () => {
      try {
        const maxRetries = 2;
        const API_TIMEOUTS = { RETRY_DELAY: 1000 };

        // إعداد timeout عام للحماية
        const loadingTimeout = setTimeout(() => {
          console.error('⏰ انتهت مهلة تحميل المؤسسة');
          window.bazaarTenantLoading = false;
          loadingOrganization.current = false;
          setIsLoading(false);
          setError(new Error('انتهت مهلة تحميل بيانات المؤسسة'));
        }, 15000);

        let org = null;
        const currentHostname = window.location.hostname;
        const subdomain = currentSubdomain || await extractSubdomain(currentHostname);
        const storedOrgId = localStorage.getItem('bazaar_organization_id');

        console.log('📋 معلومات التحميل:', { currentHostname, subdomain, storedOrgId });

        // Promise للتحميل مع timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('انتهت مهلة جلب بيانات المؤسسة')), 10000);
        });

        const loadPromise = (async () => {
          // فحص cache أولاً
          const cacheKey = storedOrgId ? `org-id-${storedOrgId}` : 
                          (currentHostname.includes('localhost') ? `org-subdomain-${subdomain}` : `org-domain-${currentHostname}`);
          
          console.log('🔍 فحص cache بالمفتاح:', cacheKey);
          
          if (window.organizationCache?.has(cacheKey)) {
            const cached = window.organizationCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < 10 * 60 * 1000) {
              console.log('🏢 استخدام cache المنظمة:', cacheKey);
              return updateOrganizationFromData(cached.data);
            }
          }
          
          let orgData = null;
          
          console.log('🔄 جلب بيانات جديدة من API...');
          
          // استراتيجية الأولوية: orgId > domain > subdomain
          if (storedOrgId) {
            console.log('📞 استدعاء بـ orgId:', storedOrgId);
            orgData = await fetchOrganizationUnified({ orgId: storedOrgId });
          } else if (currentHostname && !currentHostname.includes('localhost')) {
            console.log('📞 استدعاء بـ domain:', currentHostname);
            orgData = await fetchOrganizationUnified({ hostname: currentHostname });
          } else if (subdomain && subdomain !== 'main') {
            console.log('📞 استدعاء بـ subdomain:', subdomain);
            orgData = await fetchOrganizationUnified({ subdomain });
          }
          
          if (orgData) {
            console.log('✅ تم العثور على بيانات المنظمة:', orgData.name);
            return updateOrganizationFromData(orgData);
          } else {
            console.log('❌ لم يتم العثور على بيانات المنظمة');
          }

          return null;
        })();

        org = await Promise.race([loadPromise, timeoutPromise]);

        if (org) {
          setOrganization(org);
          updateLocalStorageOrgId(org.id);

          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (userRef.current && userRef.current.id === org.owner_id) {
            setIsOrgAdmin(true);
          }

          initialized.current = true;
          retryCount.current = 0;
          console.log('✅ تم تحميل المنظمة بنجاح:', org.name);
        } else {
          throw new Error('لم يتم العثور على بيانات المؤسسة');
        }

        // تنظيف timeout
        clearTimeout(loadingTimeout);

      } catch (error) {
        console.error('❌ خطأ في تحميل بيانات المنظمة:', error);
        
        // إعادة المحاولة مع حد أقصى
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          console.log(`🔄 إعادة المحاولة ${retryCount.current}/${maxRetries}`);
          setTimeout(() => {
            initialized.current = false;
            window.bazaarTenantLoading = false;
            loadingOrganization.current = false;
            loadTenantData();
          }, API_TIMEOUTS.RETRY_DELAY * retryCount.current);
        } else {
          setOrganization(null);
          setError(error as Error);
        }
      } finally {
        window.bazaarTenantLoading = false;
        loadingOrganization.current = false;
        setIsLoading(false);
      }
    };
    
    loadTenantData();
  }, [currentSubdomain, authLoading]);

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
      return { success: false, error: err as Error };
    }
  }, [user, organization, isOrgAdmin]);

  // تحديث بيانات المؤسسة - محسنة مع useCallback
  const refreshOrganizationData = useCallback(async () => {
    if (authLoading || loadingOrganization.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    loadingOrganization.current = true;
    
    // إعداد timeout للحماية من التعليق
    const refreshTimeout = setTimeout(() => {
      loadingOrganization.current = false;
      setIsLoading(false);
      setError(new Error('انتهت مهلة تحديث بيانات المؤسسة'));
    }, 20000);

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
      
      const org = await getOrganizationBySubdomain(subdomain);
      
      if (org) {
        setOrganization(updateOrganizationFromData(org));
        localStorage.setItem('bazaar_organization_id', org.id);
      } else {
        setOrganization(null);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      clearTimeout(refreshTimeout);
      loadingOrganization.current = false;
      setIsLoading(false);
    }
  }, [currentSubdomain, authLoading, user, getOrganizationBySubdomain]);

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

  return <TenantContext.Provider value={value}>
    {children}
    <LoadingIndicator isLoading={isLoading} error={error} retryCount={retryCount.current} />
  </TenantContext.Provider>;
};

// Hook لاستخدام سياق المستأجر مع Fast Refresh compatible naming
function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// تصدير مع اسم صريح للـ Fast Refresh
export { useTenant };

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
