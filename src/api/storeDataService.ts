import { StoreData, getFullStoreData } from '@/api/store'; // ستبقى getFullStoreData مؤقتًا كمرجع ثم تحذف لاحقًا إذا لم تعد مستخدمة
import { supabase } from '@/lib/supabase';
import { withCache, getCacheData, setCacheData, clearCacheItem } from '@/lib/cache/storeCache';
import { centralRequestManager } from '@/api/centralRequestManager';
import type { StoreComponent } from '@/types/store-editor';

// --- تعريف الأنواع --- 

// استيراد مباشر للأنواع
import type { Product as ActualProduct, ProductColor, ProductSize } from '@/lib/api/products'; 
import type { Category as ActualCategory } from '@/lib/api/categories'; 

// إعادة تصدير الأنواع إذا كانت ستستخدم خارج هذا الملف بنفس الأسماء
export type { ProductColor, ProductSize };
export type Product = ActualProduct;
export type Category = ActualCategory;

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  subdomain: string | null;
  created_at: string | null;
  updated_at: string | null;
  currency?: string | null;
  language?: string | null;
  contact_email?: string | null;
  default_country?: string | null;
  is_active?: boolean;
  industry?: string | null;
  business_type?: string | null;
  timezone?: string | null;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  theme_font?: string | null;
  store_layout?: string | null;
  show_featured_products?: boolean | null;
  show_newest_products?: boolean | null;
  show_best_selling_products?: boolean | null;
  show_discounted_products?: boolean | null;
  show_categories_in_header?: boolean | null;
  show_categories_in_sidebar?: boolean | null;
  show_subcategories?: boolean | null;
  default_product_view?: string | null;
  products_per_page?: number | null;
  show_breadcrumbs?: boolean | null;
  show_reviews?: boolean | null;
  require_login_to_view?: boolean | null;
  enable_wishlist?: boolean | null;
  enable_product_comparison?: boolean | null;
  checkout_process_type?: string | null;
  payment_methods?: any | null; 
  default_shipping_zone_id?: string | null;
  tax_settings?: any | null; 
  seo_store_title?: string | null;
  seo_meta_description?: string | null;
  custom_css: string | null;
  custom_js_header?: string | null;
  custom_js_footer?: string | null;
  google_analytics_id?: string | null;
  facebook_pixel_id?: string | null;
  maintenance_mode?: boolean | null;
  maintenance_message?: string | null;
  site_name: string | null;
  favicon_url: string | null;
  default_language: string | null;
  display_text_with_logo: boolean | null;
  enable_public_site: boolean | null;
  enable_registration: boolean | null;
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  organization_id: string; 
  created_at: string;
  updated_at: string;
}

export interface ShippingZone {
  id: string; 
  name: string;
  countries: string[] | null; 
  is_active: boolean;
  description: string | null;
}

// النوع الرئيسي للبيانات المعادة من دالة RPC
export interface StoreInitializationData {
  organization_details: Organization | null;
  organization_settings: OrganizationSettings | null;
  categories: Category[];
  subcategories: SubCategory[];
  featured_products: Product[];
  shipping_info: {
    has_shipping_providers: boolean;
    default_shipping_zone_id: string | null;
    default_shipping_zone_details: ShippingZone | null;
  } | null;
  store_layout_components?: StoreComponent[];
  error?: string; 
}
// --- نهاية تعريف الأنواع ---

const STORE_DATA_CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة

let isDataLoading = false;
let lastLoadedSubdomain: string | null = null;
// تغيير نوع البيانات المخزنة
let lastLoadedData: StoreInitializationData | null = null; 
let pendingPromise: Promise<{ data: StoreInitializationData | null; isLoading: boolean }> | null = null;

/**
 * جلب بيانات المتجر الأولية عبر دالة RPC - محسن للسرعة
 */
async function fetchStoreInitializationDataViaRpc(subdomain: string): Promise<StoreInitializationData | null> {
  try {
    const startTime = performance.now();
    
    // تحسين: timeout أقصر (2 ثانية) لتسريع الاستجابة
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout after 2 seconds')), 2000)
    );
    
    const rpcPromise = supabase.rpc('get_store_init_data', {
      org_identifier: subdomain,
    });
    
    // استخدام Promise.race للتنافس بين RPC و timeout
    const { data, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]) as any;
    
    const executionTime = performance.now() - startTime;
    
    if (rpcError) {
      return { 
        error: rpcError.message, 
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [] 
      };
    }
    
    // التحقق من صحة البيانات المرجعة
    if (!data) {
      return { 
        error: 'لم يتم العثور على بيانات المتجر', 
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [] 
      };
    }

    // data يمكن أن يكون أي Json هنا. نحتاج للتحقق إذا كان يحتوي على خطأ من داخل دالة RPC
    if (data.error) {
      return { 
        error: data.error, 
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [] 
      };
    }

    return validateAndReturnStoreData(data);
  } catch (error) {
    return { 
      error: (error as Error).message, 
      organization_details: null, 
      organization_settings: null, 
      categories: [], 
      subcategories: [], 
      featured_products: [], 
      shipping_info: null,
      store_layout_components: [] 
    };
  }
}

function validateAndReturnStoreData(data: any): StoreInitializationData {
    // التحقق من صحة البيانات المرجعة
    if (!data) {
      return { 
        error: 'لم يتم العثور على بيانات المتجر', 
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [] 
      };
    }

    // data يمكن أن يكون أي Json هنا. نحتاج للتحقق إذا كان يحتوي على خطأ من داخل دالة RPC
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return { 
        error: data.error, 
        organization_details: null, 
        organization_settings: null, 
        categories: [], 
        subcategories: [], 
        featured_products: [], 
        shipping_info: null,
        store_layout_components: [] 
      };
    }

    // تحويل البيانات وإعطاء قيم افتراضية للحقول المفقودة
    const dataObj = data as Record<string, any>;
    
    return {
      organization_details: dataObj.organization_details || null,
      organization_settings: dataObj.organization_settings || null,
      categories: dataObj.categories || [],
      subcategories: dataObj.subcategories || [],
      featured_products: dataObj.featured_products || [],
      shipping_info: dataObj.shipping_info || null,
      store_layout_components: dataObj.store_layout_components || []
    } as StoreInitializationData;
}

export async function getStoreDataFast(subdomain: string): Promise<{
  data: StoreInitializationData | null;
  isLoading: boolean;
}> {
  if (pendingPromise && lastLoadedSubdomain === subdomain) {
    return pendingPromise;
  }

  if (lastLoadedSubdomain === subdomain && lastLoadedData) {
    return { data: lastLoadedData, isLoading: isDataLoading };
  }
  
  pendingPromise = (async () => {
    try {
      const cacheKey = `store_init_data:${subdomain}`;
      const cachedData = await getCacheData<StoreInitializationData>(cacheKey);
      
      if (cachedData) {
        lastLoadedSubdomain = subdomain;
        lastLoadedData = cachedData;
        refreshDataInBackground(subdomain); // تحديث في الخلفية
        return { data: cachedData, isLoading: false };
      }
      
      isDataLoading = true;
      // استبدال getFullStoreData بالدالة الجديدة
      const freshData = await fetchStoreInitializationDataViaRpc(subdomain);
      
      if (freshData && !freshData.error) { // التأكد من عدم وجود خطأ قبل التخزين
        lastLoadedSubdomain = subdomain;
        lastLoadedData = freshData;
        await setCacheData(cacheKey, freshData);
        return { data: freshData, isLoading: false };
      } else if (freshData && freshData.error) {
        // إذا كان هناك خطأ من الدالة، لا تخزنه ولكن أرجعه
        return { data: freshData, isLoading: false }; 
      }
      return { data: null, isLoading: false };
    } catch (error) {
      return { data: { error: (error as Error).message } as StoreInitializationData, isLoading: false };
    } finally {
      isDataLoading = false;
      pendingPromise = null;
    }
  })();
  
  return pendingPromise;
}

async function refreshDataInBackground(subdomain: string): Promise<void> {
  if (isDataLoading && lastLoadedSubdomain === subdomain) return; // منع التحديث المتزامن لنفس المتجر
  
  let localIsLoadingFlag = true; // علم محلي لمنع التحديثات المتعددة من هذا الاستدعاء
  if(lastLoadedSubdomain === subdomain) isDataLoading = true; // Set global if it's the current subdomain
  
  try {
    const freshData = await fetchStoreInitializationDataViaRpc(subdomain);
    
    if (freshData && !freshData.error) {
      lastLoadedSubdomain = subdomain; // يجب أن يكون هذا قبل lastLoadedData
      lastLoadedData = freshData;
      const cacheKey = `store_init_data:${subdomain}`;
      await setCacheData(cacheKey, freshData);
    } else if (freshData && freshData.error) {
    }
  } catch (error) {
  } finally {
    if(localIsLoadingFlag && lastLoadedSubdomain === subdomain) isDataLoading = false;
  }
}

export async function clearStoreCache(subdomain: string): Promise<void> {
  const cacheKey = `store_init_data:${subdomain}`;
  await clearCacheItem(cacheKey);
  if (lastLoadedSubdomain === subdomain) {
    lastLoadedData = null;
    // لا نعدل lastLoadedSubdomain هنا حتى لا ن déclencher تحميل غير ضروري إذا كان هناك طلب معلق
  }
}

export async function forceReloadStoreData(subdomain: string): Promise<{
  data: StoreInitializationData | null;
  isLoading: boolean;
}> {
  isDataLoading = true;
  lastLoadedSubdomain = subdomain; // Set before clearing, to manage pendingPromise correctly
  pendingPromise = null; // Clear any existing pending promise for this subdomain
  
  try {
    const cacheKey = `store_init_data:${subdomain}`;
    await clearCacheItem(cacheKey);
    lastLoadedData = null; 
    
    const freshData = await fetchStoreInitializationDataViaRpc(subdomain);
    
    if (freshData && !freshData.error) {
      lastLoadedData = freshData;
      await setCacheData(cacheKey, freshData);
      return { data: freshData, isLoading: false };
    } else if (freshData && freshData.error) {
      return { data: freshData, isLoading: false };
    }
    return { data: null, isLoading: false };
  } catch (error) {
    return { data: { error: (error as Error).message } as StoreInitializationData, isLoading: false };
  } finally {
    isDataLoading = false;
    if(lastLoadedSubdomain === subdomain) pendingPromise = null; // Clear only if it matches the current forced reload
  }
}

// إزالة getFullStoreData إذا لم تعد مستخدمة في أي مكان آخر
export default {
  getStoreDataFast,
  clearStoreCache,
  forceReloadStoreData,
  // getFullStoreData, // إذا أزيلت، يجب إزالتها من هنا أيضًا
};
