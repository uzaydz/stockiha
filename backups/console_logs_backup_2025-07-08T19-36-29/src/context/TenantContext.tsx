import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';
import { getOrganizationBySubdomain, getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationById } from '@/lib/api/organization';
import { getOrganizationSettings } from '@/lib/api/unified-api';
import { API_TIMEOUTS, RETRY_CONFIG, withTimeout, withRetry } from '@/config/api-timeouts';
import { useUser } from './UserContext';
import { useLocation } from 'react-router-dom';
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

// دالة debounce للحد من التكرار
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ORGANIZATION_CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

// إضافة cache لمنع الاستدعاءات المتكررة
const pendingRequests = new Map<string, Promise<any>>();

// دالة موحدة لجلب المنظمة مع cache ذكي
const fetchOrganizationUnified = async (params: {
  orgId?: string;
  hostname?: string;
  subdomain?: string;
}): Promise<any> => {
  const { orgId, hostname, subdomain } = params;
  
  // تحديد نوع الجلب
  let fetchType: 'byId' | 'byDomain' | 'bySubdomain';
  let cacheKey: string;
  
  if (orgId) {
    fetchType = 'byId';
    cacheKey = `org-id-${orgId}`;
  } else if (hostname) {
    fetchType = 'byDomain';
    cacheKey = `org-domain-${hostname}`;
  } else if (subdomain) {
    fetchType = 'bySubdomain';
    cacheKey = `org-subdomain-${subdomain}`;
  } else {
    return null;
  }

  // التحقق من وجود طلب مماثل قيد التنفيذ
  if (pendingRequests.has(cacheKey)) {
    return await pendingRequests.get(cacheKey);
  }

  // التحقق من cache أولاً
  if (window.organizationCache?.has(cacheKey)) {
    const cached = window.organizationCache.get(cacheKey)!;
    const now = Date.now();
    
    if (now - cached.timestamp < ORGANIZATION_CACHE_TTL) {
      return cached.data;
    } else {
      // إزالة البيانات منتهية الصلاحية
      window.organizationCache.delete(cacheKey);
    }
  }

  // إنشاء مفتاح انتظار لمنع الاستدعاءات المتكررة
  const pendingKey = `pending-${cacheKey}`;
  
  // إنشاء Promise جديد وحفظه
  const fetchPromise = (async () => {
    try {
      let orgData = null;

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
      return null;
    } finally {
      // إزالة من قائمة الطلبات المعلقة
      pendingRequests.delete(cacheKey);
    }
  })();

  // حفظ Promise في قائمة الطلبات المعلقة
  pendingRequests.set(cacheKey, fetchPromise);
  
  return await fetchPromise;
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
  }
  
  return null;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // إعادة تعيين العلامات العالمية في البداية للحماية من التعليق
  useEffect(() => {
    if (window.bazaarTenantLoading) {
      window.bazaarTenantLoading = false;
    }
  }, []);

  const { user, isLoading: authLoading, currentSubdomain, organization: authOrganization } = useAuth();
  const { organizationId } = useUser();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // مراقبة تغيير isLoading state
  useEffect(() => {
  }, [isLoading, organization]);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // تتبع حالة التحميل والتهيئة
  const initialized = useRef(false);
  const loadingOrganization = useRef(false);
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

  // دالة محسنة للحصول على إعدادات اللغة مع تخزين مؤقت
  const getLanguageSettings = useCallback(async (orgId: string) => {
    // التحقق من وجود اللغة في الكاش أولاً
    const cachedLanguage = localStorage.getItem(`org-language-${orgId}`);
    const cacheTimestamp = localStorage.getItem(`org-language-timestamp-${orgId}`);
    
    // إذا كان الكاش صالحاً لمدة 30 دقيقة، استخدمه
    if (cachedLanguage && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      if (cacheAge < 30 * 60 * 1000) { // 30 دقيقة
        return cachedLanguage;
      }
    }
    
    try {
      const [orgData, organizationSettings] = await Promise.all([
        getOrganizationById(orgId),
        getOrganizationSettings(orgId)
      ]);

      let detectedLanguage = 'ar'; // افتراضي

      // ترتيب أولوية المصادر
      const possibleLanguages = [
        orgData?.default_language,
        organizationSettings?.[0]?.default_language,
        orgData?.language,
        organizationSettings?.[0]?.language,
        (organizationSettings as any)?.general?.default_language,
        'ar' // Arabic as fallback
      ];

      // العثور على أول لغة صالحة
      for (const lang of possibleLanguages) {
        if (lang && typeof lang === 'string' && lang.trim() !== '') {
          detectedLanguage = lang;
          break;
        }
      }

      // حفظ في الكاش
      localStorage.setItem(`org-language-${orgId}`, detectedLanguage);
      localStorage.setItem(`org-language-timestamp-${orgId}`, Date.now().toString());

      return detectedLanguage;
    } catch (error) {
      return 'ar'; // fallback
    }
  }, []);

  // تحديث بيانات المنظمة وإرسال إشارة تحديث اللغة
  const updateOrganizationFromData = useCallback((orgData: any) => {
    if (!orgData) return null;

    const organizationSettings = orgData.organization_settings || 
                                 orgData.settings || 
                                 {};

    // البحث الشامل عن اللغة الافتراضية في جميع الأماكن الممكنة
    let defaultLanguage = orgData.default_language || 
                         organizationSettings.default_language || 
                         orgData.language ||
                         organizationSettings.language ||
                         (organizationSettings.general && organizationSettings.general.default_language) ||
                         (organizationSettings.general && organizationSettings.general.language) ||
                         (orgData.store_settings && orgData.store_settings.default_language) ||
                         (orgData.store_settings && orgData.store_settings.language) ||
                         null;

    // إذا لم نجد اللغة، استخدم fallback ذكي بناءً على اسم النطاق
    if (!defaultLanguage) {
      
      // تحليل اسم المنظمة أو النطاق للتنبؤ باللغة
      const orgName = (orgData.name || '').toLowerCase();
      const orgSubdomain = (orgData.subdomain || '').toLowerCase();
      const orgDomain = (orgData.domain || '').toLowerCase();
      
      // قائمة كلمات فرنسية شائعة
      const frenchKeywords = ['collection', 'boutique', 'mode', 'style', 'paris', 'france'];
      // قائمة كلمات إنجليزية شائعة  
      const englishKeywords = ['shop', 'store', 'market', 'online', 'digital', 'tech'];
      
      const textToAnalyze = `${orgName} ${orgSubdomain} ${orgDomain}`;
      
      // تحقق من الكلمات الفرنسية
      const hasFrenchKeywords = frenchKeywords.some(keyword => textToAnalyze.includes(keyword));
      // تحقق من الكلمات الإنجليزية
      const hasEnglishKeywords = englishKeywords.some(keyword => textToAnalyze.includes(keyword));
      
      if (hasFrenchKeywords) {
        defaultLanguage = 'fr';
      } else if (hasEnglishKeywords) {
        defaultLanguage = 'en';
      } else {
        // افتراضي: عربي
        defaultLanguage = 'ar';
      }
      
      // تخزين اللغة في التخزين المحلي كبديل للاستخدام المستقبلي
      if (typeof window !== 'undefined') {
        localStorage.setItem(`org_language_${orgData.id}`, defaultLanguage);
      }
    }

    // طباعة البيانات الكاملة لفهم التركيبة

    // فحص خاص للبحث عن اللغة في أي مكان
    const findLanguageInObject = (obj: any, path = ''): any[] => {
      const results: any[] = [];
      for (const [key, value] of Object.entries(obj || {})) {
        const currentPath = path ? `${path}.${key}` : key;
        if (key.toLowerCase().includes('lang') || key.toLowerCase().includes('locale')) {
          results.push({ path: currentPath, key, value });
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          results.push(...findLanguageInObject(value, currentPath));
        }
      }
      return results;
    };

    const languageFields = findLanguageInObject(orgData);

    const orgObject: Organization = {
      id: orgData.id,
      name: orgData.name || orgData.business_name || 'متجر',
      description: orgData.description,
      logo_url: orgData.logo_url,
      domain: orgData.domain,
      subdomain: orgData.subdomain,
      subscription_tier: orgData.subscription_tier || 'free',
      subscription_status: orgData.subscription_status || 'trial',
      settings: {
        ...organizationSettings,
        default_language: defaultLanguage
      },
      created_at: orgData.created_at,
      updated_at: orgData.updated_at,
      owner_id: orgData.owner_id
    };

    // إرسال إشارة تحديث اللغة إذا كانت متوفرة
    if (defaultLanguage) {
      
      // إرسال حدث تحديث اللغة للمكونات الأخرى
      if (typeof window !== 'undefined') {
        const languageUpdateEvent = new CustomEvent('organizationLanguageUpdate', {
          detail: {
            language: defaultLanguage,
            organizationId: orgData.id
          }
        });
        window.dispatchEvent(languageUpdateEvent);
      }
    } else {
    }

    return orgObject;
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

  // مزامنة بيانات المؤسسة من AuthContext محسنة لمنع التكرار
  useEffect(() => {
    // تجنب المعالجة إذا كانت البيانات موجودة بالفعل أو جاري التحميل
    if (!authOrganization || organization || loadingOrganization.current || initialized.current) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // تحويل بيانات المؤسسة من AuthContext إلى النموذج المطلوب لـ TenantContext
    const orgData = updateOrganizationFromData(authOrganization);
    setOrganization(orgData);
    
    // حفظ معرف المؤسسة في التخزين المحلي
    localStorage.setItem('bazaar_organization_id', authOrganization.id);
    setIsLoading(false);
    initialized.current = true;
    setError(null);
  }, [authOrganization, organization]); // إضافة organization للتحقق من الحالة

  // دالة موحدة ومحسنة لجلب المنظمة
  const fetchOrganizationOptimized = useCallback(async (params: {
    orgId?: string;
    hostname?: string;
    subdomain?: string;
  }) => {
    return await fetchOrganizationUnified(params);
  }, []);

  // useEffect محسن لتحميل بيانات المؤسسة مع منع التكرار الكامل
  useEffect(() => {
    // منع التشغيل المتكرر
    if (loadingOrganization.current || initialized.current) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    // إذا كانت المؤسسة موجودة بالفعل، لا حاجة لإعادة التحميل
    if (organization && authOrganization && organization.id === authOrganization.id) {
      initialized.current = true;
      return;
    }

    // التحقق من وجود authOrganization أولاً
    if (authOrganization) {
      if (process.env.NODE_ENV === 'development') {
      }
      const orgData = updateOrganizationFromData(authOrganization);
      setOrganization(orgData);
      localStorage.setItem('bazaar_organization_id', authOrganization.id);
      setIsLoading(false);
      initialized.current = true;
      setError(null);
      return;
    }

    // تأخير أطول للسماح لجميع العمليات بالاكتمال قبل البدء
    const delayedLoad = async () => {
      // التحقق مرة أخيرة قبل البدء
      if (loadingOrganization.current || initialized.current) {
        return;
      }

      loadingOrganization.current = true;

      if (process.env.NODE_ENV === 'development') {
      }

      try {
        setIsLoading(true);
        setError(null);

        // إعداد timeout عام للحماية
        const loadingTimeoutId = setTimeout(() => {
          loadingOrganization.current = false;
          setIsLoading(false);
          setError(new Error('انتهت مهلة تحميل بيانات المؤسسة'));
        }, 15000);

        let org = null;
        const currentHostname = window.location.hostname;
        const subdomain = currentSubdomain || await extractSubdomain(currentHostname);
        const storedOrgId = localStorage.getItem('bazaar_organization_id');

        // استراتيجية الأولوية: orgId > domain > subdomain
        let orgData = null;
        if (storedOrgId) {
          orgData = await fetchOrganizationUnified({ orgId: storedOrgId });
        } else if (currentHostname && !currentHostname.includes('localhost')) {
          orgData = await fetchOrganizationUnified({ hostname: currentHostname });
        } else if (subdomain && subdomain !== 'main') {
          orgData = await fetchOrganizationUnified({ subdomain });
        }
        
        if (orgData) {
          org = updateOrganizationFromData(orgData);
          setOrganization(org);
          updateLocalStorageOrgId(org.id);

          // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
          if (user && user.id === org.owner_id) {
            setIsOrgAdmin(true);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
          }
          setOrganization(null);
        }

        // تنظيف timeout
        clearTimeout(loadingTimeoutId);

      } catch (error) {
        setOrganization(null);
        setError(error as Error);
      } finally {
        setIsLoading(false);
        loadingOrganization.current = false;
        initialized.current = true;
      }
    };

    // تأخير لضمان تجميع التحديثات وعدم التعارض مع عمليات أخرى
    const timeoutId = setTimeout(delayedLoad, 500);
    
    return () => clearTimeout(timeoutId);
  }, [authOrganization, user]); // إزالة dependencies إضافية غير ضرورية

  // دالة debounced لـ refreshOrganizationData مع منطق التحديث الكامل
  const debouncedRefresh = useCallback(
    debounce(async () => {
      if (loadingOrganization.current) return;
      
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
            const org = updateOrganizationFromData(orgData);
            if (org) setOrganization(org);
            localStorage.setItem('bazaar_organization_id', orgData.id);
            
            // تحقق ما إذا كان المستخدم الحالي هو مسؤول المؤسسة
            if (user && user.id === orgData.owner_id) {
              setIsOrgAdmin(true);
            }
            
            return;
          }
        }
        
        // إذا فشل استرداد البيانات بواسطة المعرف، نعود إلى الطريقة الاحتياطية
        const subdomain = currentSubdomain || await extractSubdomain(window.location.hostname);
        localStorage.removeItem(`tenant:subdomain:${subdomain}`);
        
        const org = await getOrganizationBySubdomain(subdomain);
        
        if (org) {
          const orgObject = updateOrganizationFromData(org);
          if (orgObject) setOrganization(orgObject);
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
        initialized.current = false; // إعادة تعيين لإمكانية إعادة التحميل
      }
    }, 500),
    [currentSubdomain, user, updateOrganizationFromData, getOrganizationBySubdomain]
  );

 // إضافة authOrganization و user كـ dependencies

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

  // تحديث بيانات المؤسسة - محسنة مع useCallback و debouncing
  const refreshOrganizationData = useCallback(async () => {
    if (authLoading || loadingOrganization.current) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

         // استخدام debouncedRefresh للحد من التكرار
     if (process.env.NODE_ENV === 'development') {
     }
     debouncedRefresh();
  }, [authLoading, debouncedRefresh]);

  // الاستماع إلى تغييرات المؤسسة من عمليات التسجيل الجديدة مع debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleOrganizationChanged = (event: CustomEvent) => {
      const { organizationId } = event.detail || {};
      
      if (organizationId && organizationId !== organization?.id) {
        
        // إلغاء أي timeout سابق
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // debounce التحديث لمنع التشغيل المتكرر
        timeoutId = setTimeout(() => {
          // تحديث معرف المؤسسة
          localStorage.setItem('bazaar_organization_id', organizationId);
          
          // إعادة تعيين الحالة وإجبار إعادة التحميل
          initialized.current = false;
          loadingOrganization.current = false;
          setIsLoading(false);
          setOrganization(null);
          setError(null);
          
          // تحديث البيانات
          refreshOrganizationData();
        }, 300); // تأخير 300ms لتجميع التحديثات
      }
    };

    window.addEventListener('organizationChanged', handleOrganizationChanged as EventListener);
    
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChanged as EventListener);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshOrganizationData, organization?.id]);

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
