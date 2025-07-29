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

/**
 * دالة مركزية لجلب جميع بيانات التطبيق
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
        let subdomain = hostname.split('.')[0];
        
        if (subdomain === 'localhost' || subdomain === '127' || hostname.includes('localhost')) {
          subdomain = 'fredstore'; // للتطوير المحلي
        }
        
        // البحث عن المؤسسة بـ subdomain
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .single();
          
        organizationId = orgData?.id;
      }
    }
    
    if (!organizationId) {
      console.warn('🚀 [AppInitializer] لم يتم العثور على معرف المؤسسة');
      return null;
    }
    
    console.log('🚀 [AppInitializer] جلب البيانات للمؤسسة:', organizationId);
    
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
      console.error('🚀 [AppInitializer] خطأ في جلب بيانات المؤسسة:', orgResult.error);
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
    
    console.log('🚀 [AppInitializer] تم جلب البيانات بنجاح:', initData);
    return initData;
    
  } catch (error) {
    console.error('🚀 [AppInitializer] خطأ عام في جلب البيانات:', error);
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
    
    console.log('🚀 [AppInitializer] تم حفظ البيانات في localStorage');
  } catch (error) {
    console.error('🚀 [AppInitializer] خطأ في حفظ البيانات:', error);
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
      console.log('🚀 [AppInitializer] البيانات المحفوظة منتهية الصلاحية');
      memoryCache = { data: null, timestamp: now };
      return null;
    }
    
    const data = JSON.parse(savedData) as AppInitData;
    console.log('🚀 [AppInitializer] تم تحميل البيانات من localStorage:', data);
    
    // حفظ في memory cache
    memoryCache = { data, timestamp: now };
    
    return data;
      } catch (error) {
      console.error('🚀 [AppInitializer] خطأ في قراءة البيانات:', error);
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
      console.log('🚀 [AppInitializer] البيانات مطبقة بالفعل، تجاهل التطبيق المتكرر');
      return;
    }
    
    console.log('🚀 [AppInitializer] تطبيق البيانات على التطبيق');
    
    // 1. تطبيق الثيم فوراً
    updateOrganizationTheme(data.organization.id, {
      theme_primary_color: data.theme.primaryColor,
      theme_secondary_color: data.theme.secondaryColor,
      theme_mode: data.theme.mode
    });
    
    // 2. تطبيق اللغة فوراً (بدون تكرار)
    if (i18n.isInitialized && data.language !== i18n.language) {
      console.log('🚀 [AppInitializer] تحديث اللغة إلى:', data.language);
      await i18n.changeLanguage(data.language);
    } else {
      console.log('🚀 [AppInitializer] اللغة مطبقة بالفعل:', data.language);
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
    
    console.log('🚀 [AppInitializer] تم تطبيق البيانات بنجاح');
    
  } catch (error) {
    console.error('🚀 [AppInitializer] خطأ في تطبيق البيانات:', error);
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
    console.log('🚀 [AppInitializer] تم مسح البيانات القديمة');
  } catch (error) {
    console.error('🚀 [AppInitializer] خطأ في مسح البيانات:', error);
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
      console.log('🚀 [AppInitializer] البيانات تحتاج لتحديث - حقول مفقودة');
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
    console.log('🚀 [AppInitializer] انتظار التهيئة الجارية...');
    return initPromise;
  }
  
  // فحص البيانات المحفوظة أولاً
  const existingData = loadAppInitData();
  
  // فحص إذا كانت البيانات تحتاج لتحديث
  if (existingData && needsDataUpgrade()) {
    console.log('🚀 [AppInitializer] مسح البيانات القديمة للتحديث');
    clearAppInitData();
  } else if (existingData) {
    console.log('🚀 [AppInitializer] تم تحميل البيانات من localStorage:', existingData);
    await applyAppInitData(existingData);
    return existingData;
  }
  
  // جلب البيانات من قاعدة البيانات
  console.log('🚀 [AppInitializer] بدء جلب البيانات من قاعدة البيانات...');
  isInitializing = true;
  
  try {
    initPromise = fetchAppInitData(organizationId);
    const data = await initPromise;
    
    if (data) {
      // حفظ البيانات
      saveAppInitData(data);
      
      // تطبيق البيانات على التطبيق
      await applyAppInitData(data);
      
      console.log('🚀 [AppInitializer] تم تهيئة التطبيق بنجاح');
      return data;
    } else {
      console.warn('🚀 [AppInitializer] لم يتم الحصول على البيانات');
      return null;
    }
  } catch (error) {
    console.error('🚀 [AppInitializer] خطأ في تهيئة التطبيق:', error);
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