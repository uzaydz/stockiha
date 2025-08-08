/**
 * نظام التهيئة المركزي للتطبيق
 * يجلب جميع البيانات الأساسية مرة واحدة ويحفظها في localStorage
 * لضمان تحميل فوري وبدون وميض
 */

import { getSupabaseClient } from '@/lib/supabase';
import { updateOrganizationTheme } from '@/lib/themeManager';
import i18n from '@/i18n';

// واجهة البيانات المركزية
interface AppInitData {
  organization: {
    id: string;
    name: string;
    subdomain: string;
    settings: any;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    mode: 'light' | 'dark';
  };
  language: string;
  timestamp: number;
  // إضافة البيانات الأساسية للمتجر
  categories?: any[];
  products?: any[];
  storeSettings?: any[];
  testimonials?: any[];
}

// مفاتيح التخزين
const STORAGE_KEYS = {
  APP_INIT_DATA: 'bazaar_app_init_data',
  LAST_INIT_TIME: 'bazaar_last_init_time',
  ORGANIZATION_ID: 'bazaar_organization_id'
};

// مدة صلاحية البيانات (30 دقيقة - زيادة لتقليل التحديثات)
const CACHE_DURATION = 30 * 60 * 1000;

// متغير لمنع التهيئة المتكررة
let isInitializing = false;
let initPromise: Promise<AppInitData | null> | null = null;

// cache للبيانات في الذاكرة لتجنب قراءة localStorage المتكررة
let memoryCache: { data: AppInitData | null; timestamp: number } | null = null;

// منع تطبيق البيانات المتكرر
let lastAppliedDataHash: string | null = null;

// ✨ Global deduplication cache للطلبات المشتركة
const INIT_CACHE = new Map<string, { data: any; timestamp: number }>();
const ACTIVE_REQUESTS = new Map<string, Promise<any>>();

/**
 * دالة مركزية لجلب جميع بيانات التطبيق مع منع التكرار
 */
async function fetchAppInitData(organizationId?: string): Promise<AppInitData | null> {
  try {
    const supabase = getSupabaseClient();

    // إذا لم يتم توفير معرف المؤسسة، حاول الحصول عليه
    if (!organizationId) {
      // من localStorage
      organizationId = localStorage.getItem(STORAGE_KEYS.ORGANIZATION_ID) || undefined;
      
      // من subdomain
      if (!organizationId) {
        const hostname = window.location.hostname;

        // للتطوير المحلي، لا نستخدم أي subdomain افتراضي
        // يجب أن يعتمد النظام على بيانات المستخدم الحقيقية فقط
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
          return null;
        }
        
        // فحص النطاقات العامة أولاً
        const publicDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
        if (publicDomains.includes(hostname)) {
          return null;
        }
        
        // استخراج subdomain بشكل صحيح
        let subdomain = null;
        const parts = hostname.split('.');
        
        // إذا كان النطاق يحتوي على أجزاء متعددة وليس www
        if (parts.length > 2 && parts[0] !== 'www') {
          subdomain = parts[0];
        }
        
        if (!subdomain) {
          return null;
        }

        // البحث عن المؤسسة بـ subdomain (فقط في الإنتاج)
        const { data: orgData, error } = await supabase
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .single();
          
        if (error) {
        }
        
        organizationId = orgData?.id;
      }
    }
    
    if (!organizationId) {
      return null;
    }

    // ✨ استخدام cache للبيانات المكتملة
    const cacheKey = `app-init-data-${organizationId}`;
    const cached = INIT_CACHE.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('🎯 [AppInitializer] استخدام Cache:', cacheKey);
      return cached.data;
    }

    // ✨ منع الطلبات المكررة
    if (ACTIVE_REQUESTS.has(cacheKey)) {
      console.log('🔄 [AppInitializer] انتظار طلب نشط:', cacheKey);
      return await ACTIVE_REQUESTS.get(cacheKey);
    }

    // إنشاء طلب جديد وحفظه
    const requestPromise = (async () => {
      try {
        // 🚨 التحقق من وجود SuperUnifiedDataProvider أولاً
        const globalDataContext = (window as any).__SUPER_UNIFIED_DATA__;
        if (globalDataContext && globalDataContext.organization?.id === organizationId) {
          console.log('🎯 [AppInitializer] استخدام بيانات SuperUnifiedDataProvider الموجودة');
          
          const result: AppInitData = {
            organization: globalDataContext.organization,
            theme: {
              primaryColor: globalDataContext.organizationSettings?.theme_primary_color || '#fc5a3e',
              secondaryColor: globalDataContext.organizationSettings?.theme_secondary_color || '#6b21a8',
              mode: globalDataContext.organizationSettings?.theme_mode || 'light'
            },
            language: globalDataContext.organizationSettings?.default_language || 'ar',
            timestamp: Date.now(),
            categories: [],
            products: [],
            storeSettings: [],
            testimonials: []
          };
          
          // حفظ في cache
          INIT_CACHE.set(cacheKey, { data: result, timestamp: now });
          return result;
        }

        // جلب جميع البيانات الأساسية في طلبات متوازية
    const [orgResult, settingsResult, categoriesResult, productsResult, storeSettingsResult, testimonialsResult] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single(),
      supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single(),
      // جلب الفئات
      supabase
        .from('product_categories')
        .select('id, name, slug, image_url, is_active, updated_at, icon, description')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(100),
      // جلب المنتجات المميزة
      supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price, thumbnail_image, 
          images, stock_quantity, is_featured, is_new, category_id, slug,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50), // محدود لتقليل حجم البيانات
      // جلب إعدادات المتجر
      supabase
        .from('store_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('order_index', { ascending: true }),
      // جلب شهادات العملاء
      supabase
        .from('customer_testimonials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);
    
    if (orgResult.error || !orgResult.data) {
      return null;
    }

    const orgData = orgResult.data;
    const settingsData = settingsResult.data || {} as any;
    
    // تنظيم البيانات
    const initData: AppInitData = {
      organization: {
        id: orgData.id,
        name: orgData.name || 'المتجر',
        subdomain: orgData.subdomain || '',
        settings: {
          site_name: settingsData.site_name || orgData.name,
          logo_url: settingsData.logo_url,
          theme_primary_color: settingsData.theme_primary_color,
          theme_secondary_color: settingsData.theme_secondary_color,
          theme_mode: settingsData.theme_mode,
          default_language: settingsData.default_language,
          ...settingsData
        }
      },
      theme: {
        primaryColor: settingsData.theme_primary_color || '#fc5a3e',
        secondaryColor: settingsData.theme_secondary_color || '#6b21a8',
        mode: settingsData.theme_mode || 'light'
      },
      language: settingsData.default_language || 'ar',
      timestamp: Date.now(),
      // إضافة البيانات الجديدة
      categories: categoriesResult.data || [],
      products: productsResult.data || [],
      storeSettings: storeSettingsResult.data || [],
      testimonials: testimonialsResult.data || []
    };

    // حفظ في cache
    INIT_CACHE.set(cacheKey, { data: initData, timestamp: now });
    return initData;
    
  } catch (error) {
    console.error('خطأ في جلب بيانات التطبيق:', error);
    return null;
  }
})();

// تسجيل الطلب كنشط
ACTIVE_REQUESTS.set(cacheKey, requestPromise);

// إرجاع النتيجة مع تنظيف cache
return requestPromise.finally(() => {
  ACTIVE_REQUESTS.delete(cacheKey);
});

  } catch (error) {
    console.error('خطأ عام في fetchAppInitData:', error);
    return null;
  }
}

/**
 * حفظ البيانات في localStorage مع تحديث memory cache
 */
function saveAppInitData(data: AppInitData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_INIT_DATA, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_INIT_TIME, data.timestamp.toString());
    localStorage.setItem(STORAGE_KEYS.ORGANIZATION_ID, data.organization.id);
    
    // تحديث memory cache
    memoryCache = { data, timestamp: Date.now() };
    
  } catch (error) {
  }
}

/**
 * قراءة البيانات من localStorage مع cache في الذاكرة
 */
function loadAppInitData(): AppInitData | null {
  try {
    const now = Date.now();
    
    // فحص الـ memory cache أولاً
    if (memoryCache && (now - memoryCache.timestamp) < 30000) { // 30 ثانية
      return memoryCache.data;
    }
    
    const savedData = localStorage.getItem(STORAGE_KEYS.APP_INIT_DATA);
    const lastInitTime = localStorage.getItem(STORAGE_KEYS.LAST_INIT_TIME);
    
    if (!savedData || !lastInitTime) {
      memoryCache = { data: null, timestamp: now };
      return null;
    }
    
    const timestamp = parseInt(lastInitTime);
    
    // فحص انتهاء الصلاحية
    if (now - timestamp > CACHE_DURATION) {
      memoryCache = { data: null, timestamp: now };
      return null;
    }
    
    const data = JSON.parse(savedData) as AppInitData;
    
    // حفظ في memory cache
    memoryCache = { data, timestamp: now };
    
    return data;
      } catch (error) {
      memoryCache = { data: null, timestamp: Date.now() };
      return null;
    }
}

/**
 * تطبيق البيانات على التطبيق فوراً
 */
async function applyAppInitData(data: AppInitData): Promise<void> {
  try {
    // منع التطبيق المتكرر لنفس البيانات
    const dataHash = JSON.stringify({
      orgId: data.organization.id,
      theme: data.theme,
      language: data.language,
      timestamp: Math.floor(data.timestamp / 60000) // تجاهل الثواني للمقارنة
    });
    
    if (lastAppliedDataHash === dataHash) {
      return;
    }

    // 1. تطبيق الثيم فوراً
    updateOrganizationTheme(data.organization.id, {
      theme_primary_color: data.theme.primaryColor,
      theme_secondary_color: data.theme.secondaryColor,
      theme_mode: data.theme.mode
    });
    
    // 2. تطبيق اللغة فوراً (بدون تكرار)
    if (i18n.isInitialized && data.language !== i18n.language) {
      await i18n.changeLanguage(data.language);
    } else {
    }
    
    // 3. تحديث document title
    if (data.organization.settings.site_name) {
      document.title = data.organization.settings.site_name;
    }
    
    // 4. إرسال أحداث للمكونات الأخرى (مرة واحدة فقط)
    window.dispatchEvent(new CustomEvent('appInitDataReady', {
      detail: data
    }));
    
    // حفظ hash البيانات المطبقة
    lastAppliedDataHash = dataHash;

  } catch (error) {
  }
}

/**
 * مسح البيانات القديمة وإجبار التحديث
 */
export function clearAppInitData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.APP_INIT_DATA);
    localStorage.removeItem(STORAGE_KEYS.LAST_INIT_TIME);
    memoryCache = null;
    lastAppliedDataHash = null;
  } catch (error) {
  }
}

/**
 * فحص ما إذا كانت البيانات تحتاج لتحديث (مثلاً بعد تغيير الهيكل)
 */
function needsDataUpgrade(): boolean {
  try {
    const data = loadAppInitData();
    if (!data) return false;
    
    // فحص إذا كانت البيانات الجديدة موجودة
    const hasNewFields = 'categories' in data && 'products' in data && 'storeSettings' in data;
    
    if (!hasNewFields) {
      return true;
    }
    
    return false;
  } catch {
    return true;
  }
}

/**
 * الدالة الرئيسية لتهيئة التطبيق
 */
export async function initializeApp(organizationId?: string): Promise<AppInitData | null> {
  // منع التهيئة المتكررة
  if (isInitializing && initPromise) {
    return initPromise;
  }
  
  // فحص البيانات المحفوظة أولاً
  const existingData = loadAppInitData();
  
  // فحص إذا كانت البيانات تحتاج لتحديث
  if (existingData && needsDataUpgrade()) {
    clearAppInitData();
  } else if (existingData) {
    await applyAppInitData(existingData);
    return existingData;
  }
  
  // جلب البيانات من قاعدة البيانات
  isInitializing = true;
  
  try {
    initPromise = fetchAppInitData(organizationId);
    const data = await initPromise;
    
    if (data) {
      // حفظ البيانات
      saveAppInitData(data);
      
      // تطبيق البيانات على التطبيق
      await applyAppInitData(data);
      
      return data;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

/**
 * الحصول على البيانات المحفوظة فقط (بدون جلب جديد)
 */
export function getAppInitData(): AppInitData | null {
  return loadAppInitData();
}

/**
 * إجبار إعادة تحميل البيانات
 */
export async function refreshAppInitData(organizationId?: string): Promise<AppInitData | null> {
  // مسح البيانات المحفوظة
  localStorage.removeItem(STORAGE_KEYS.APP_INIT_DATA);
  localStorage.removeItem(STORAGE_KEYS.LAST_INIT_TIME);
  
  // إعادة التهيئة
  isInitializing = false;
  initPromise = null;
  
  return await initializeApp(organizationId);
}

/**
 * فحص ما إذا كانت البيانات محفوظة وصالحة
 */
export function isAppInitDataValid(): boolean {
  const lastInitTime = localStorage.getItem(STORAGE_KEYS.LAST_INIT_TIME);
  
  if (!lastInitTime) {
    return false;
  }
  
  const timestamp = parseInt(lastInitTime);
  const now = Date.now();
  
  return (now - timestamp) <= CACHE_DURATION;
} 

/**
 * إضافة دوال مساعدة للـ window للاختبار
 */
if (typeof window !== 'undefined') {
  (window as any).clearAppInitData = clearAppInitData;
  (window as any).getAppInitData = getAppInitData;
  (window as any).refreshAppInitData = refreshAppInitData;
}
