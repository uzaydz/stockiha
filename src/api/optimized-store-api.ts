import { supabase } from '@/lib/supabase';

// أنواع البيانات للمتجر
export interface StoreData {
  success: boolean;
  organization_details: OrganizationDetails;
  organization_settings: OrganizationSettings;
  categories: Category[];
  subcategories: Subcategory[];
  featured_products: Product[];
  store_layout_components: StoreComponent[];
  footer_settings: any;
  shipping_info: ShippingInfo;
  stats: StoreStats;
  meta: {
    query_timestamp: string;
    data_freshness: string;
    performance_optimized: boolean;
    total_queries_reduced_to: number;
  };
}

export interface OrganizationDetails {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  subdomain: string;
  domain?: string;
  subscription_tier: string;
  subscription_status: string;
  contact_email?: string;
  language?: string;
  default_country?: string;
  industry?: string;
  business_type?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  site_name?: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_mode: string;
  custom_css?: string;
  custom_js?: string;
  custom_js_footer?: string;
  logo_url?: string;
  favicon_url?: string;
  default_language: string;
  enable_public_site: boolean;
  enable_registration: boolean;
  display_text_with_logo: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  image_url?: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  sku: string;
  slug: string;
  thumbnail_image?: string;
  stock_quantity: number;
  is_featured: boolean;
  is_new?: boolean;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

export interface StoreComponent {
  id: string;
  type: string;
  settings: any;
  isActive: boolean;
  orderIndex: number;
}

export interface ShippingInfo {
  has_shipping_providers: boolean;
  default_shipping_zone_id?: string;
  default_shipping_zone_details?: any;
}

export interface StoreStats {
  total_products: number;
  total_categories: number;
  total_featured_products: number;
  total_customers: number;
  last_updated: string;
}

/**
 * جلب بيانات المتجر الكاملة باستخدام استعلام واحد محسن
 * @param subdomain النطاق الفرعي للمتجر
 * @returns بيانات المتجر الكاملة
 */
export async function getCompleteStoreData(subdomain: string): Promise<StoreData | null> {
  try {
    console.log(`🔄 جاري جلب بيانات المتجر لـ: ${subdomain}`);
    
    const startTime = performance.now();
    
    // استدعاء الدالة المحسنة من قاعدة البيانات
    const { data, error } = await supabase.rpc('get_complete_store_data' as any, {
      p_subdomain: subdomain
    });

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    if (error) {
      console.error('❌ خطأ في جلب بيانات المتجر:', error);
      throw error;
    }

    if (!data) {
      console.warn('⚠️ لم يتم العثور على بيانات المتجر');
      return null;
    }

    console.log(`✅ تم جلب بيانات المتجر بنجاح في ${executionTime}ms`);
    console.log('📊 إحصائيات البيانات:', {
      categories: (data as any).categories?.length || 0,
      featured_products: (data as any).featured_products?.length || 0,
      components: (data as any).store_layout_components?.length || 0,
      stats: (data as any).stats
    });

    return data as StoreData;
  } catch (error) {
    console.error('❌ فشل في جلب بيانات المتجر:', error);
    throw error;
  }
}

/**
 * جلب بيانات المتجر مع التخزين المؤقت
 * @param subdomain النطاق الفرعي للمتجر
 * @param cacheTime مدة التخزين المؤقت بالدقائق (افتراضي: 5 دقائق)
 * @returns بيانات المتجر مع التخزين المؤقت
 */
export async function getStoreDataWithCache(
  subdomain: string, 
  cacheTime: number = 5
): Promise<StoreData | null> {
  const cacheKey = `store_data_${subdomain}`;
  const cacheTimeMs = cacheTime * 60 * 1000;

  try {
    // التحقق من وجود بيانات مخزنة مؤقتاً
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

    if (cachedData && cacheTimestamp) {
      const now = Date.now();
      const cacheAge = now - parseInt(cacheTimestamp);

      if (cacheAge < cacheTimeMs) {
        console.log('📋 استخدام البيانات المخزنة مؤقتاً');
        return JSON.parse(cachedData);
      }
    }

    // جلب بيانات جديدة
    const storeData = await getCompleteStoreData(subdomain);

    if (storeData) {
      // حفظ البيانات في التخزين المؤقت
      localStorage.setItem(cacheKey, JSON.stringify(storeData));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    }

    return storeData;
  } catch (error) {
    console.error('❌ خطأ في جلب البيانات مع التخزين المؤقت:', error);
    
    // محاولة استخدام البيانات المخزنة مؤقتاً كحل بديل
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      console.log('🔄 استخدام البيانات المخزنة مؤقتاً كحل بديل');
      return JSON.parse(cachedData);
    }

    throw error;
  }
}

/**
 * مسح التخزين المؤقت لبيانات المتجر
 * @param subdomain النطاق الفرعي للمتجر (اختياري - إذا لم يُحدد سيتم مسح كل البيانات)
 */
export function clearStoreCache(subdomain?: string): void {
  if (subdomain) {
    const cacheKey = `store_data_${subdomain}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    console.log(`🗑️ تم مسح التخزين المؤقت للمتجر: ${subdomain}`);
  } else {
    // مسح كل بيانات المتاجر المخزنة مؤقتاً
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('store_data_')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
    console.log('🗑️ تم مسح كل بيانات المتاجر المخزنة مؤقتاً');
  }
}

/**
 * Hook مخصص لجلب بيانات المتجر
 * @param subdomain النطاق الفرعي للمتجر
 * @param options خيارات إضافية
 * @returns حالة البيانات والتحميل
 */
export function useStoreData(
  subdomain: string,
  options: {
    enableCache?: boolean;
    cacheTime?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const {
    enableCache = true,
    cacheTime = 5,
    autoRefresh = false,
    refreshInterval = 30000 // 30 ثانية
  } = options;

  // يمكن تطوير هذا كـ React Hook لاحقاً
  const fetchStoreData = async () => {
    if (enableCache) {
      return await getStoreDataWithCache(subdomain, cacheTime);
    } else {
      return await getCompleteStoreData(subdomain);
    }
  };

  return { fetchStoreData };
}

export default {
  getCompleteStoreData,
  getStoreDataWithCache,
  clearStoreCache,
  useStoreData
}; 