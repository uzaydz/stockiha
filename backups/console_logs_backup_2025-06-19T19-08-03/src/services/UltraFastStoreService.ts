import { supabase } from '@/lib/supabase';
import { getCacheData, setCacheData, clearCacheItem } from '@/lib/cache/storeCache';

// =================================================================
// 🚀 ULTRA FAST STORE SERVICE - خدمة المتجر فائقة السرعة
// =================================================================

interface StoreDataUltraFast {
  org_id: string;
  org_name: string;
  org_description: string;
  org_logo_url: string;
  settings_data: any;
  components_data: any[];
  categories_data: any[];
  featured_products_data: any[];
}

interface StoreInitializationData {
  organization_details: any;
  organization_settings: any;
  categories: any[];
  subcategories: any[];
  featured_products: any[];
  shipping_info: any;
  store_layout_components: any[];
  error?: string;
}

// طبقات التخزين المؤقت المتعددة
const CACHE_LAYERS = {
  MEMORY: new Map<string, { data: any; timestamp: number }>(),
  TTL: {
    BASIC: 30 * 60 * 1000,     // 30 دقيقة للبيانات الأساسية
    COMPONENTS: 60 * 60 * 1000, // ساعة للمكونات
    PRODUCTS: 15 * 60 * 1000,   // 15 دقيقة للمنتجات
  }
};

export class UltraFastStoreService {
  private static instance: UltraFastStoreService;
  
  static getInstance(): UltraFastStoreService {
    if (!this.instance) {
      this.instance = new UltraFastStoreService();
    }
    return this.instance;
  }

  // =================================================================
  // 🎯 جلب البيانات مع تخزين مؤقت متعدد المستويات
  // =================================================================
  async getStoreDataWithCache(subdomain: string): Promise<StoreDataUltraFast | null> {
    const cacheKey = `ultra_fast_${subdomain}`;
    
    try {
      // المستوى 1: Memory Cache
      const memoryData = CACHE_LAYERS.MEMORY.get(cacheKey);
      if (memoryData && Date.now() - memoryData.timestamp < CACHE_LAYERS.TTL.BASIC) {
        return memoryData.data;
      }

      // المستوى 2: IndexedDB Cache
      const cachedData = await getCacheData(cacheKey);
      if (cachedData) {
        CACHE_LAYERS.MEMORY.set(cacheKey, { data: cachedData, timestamp: Date.now() });
        return cachedData;
      }

      // المستوى 3: Database مع الدالة المحسنة
      const { data, error } = await (supabase as any).rpc('get_store_data_ultra_fast', {
        p_subdomain: subdomain,
        p_limit_categories: 8,
        p_limit_products: 6
      });

      if (error || !data?.[0]) {
        throw new Error(error?.message || 'Store not found');
      }

      const storeData = data[0];
      
      // حفظ في جميع طبقات التخزين المؤقت
      CACHE_LAYERS.MEMORY.set(cacheKey, { data: storeData, timestamp: Date.now() });
      setCacheData(cacheKey, storeData, CACHE_LAYERS.TTL.BASIC);

      return storeData;
    } catch (error: any) {
      throw error;
    }
  }

  // =================================================================
  // 🎯 تحويل البيانات للتوافق مع النظام الحالي
  // =================================================================
  async getStoreInitializationData(subdomain: string): Promise<StoreInitializationData | null> {
    try {
      const ultraFastData = await this.getStoreDataWithCache(subdomain);
      
      if (!ultraFastData) {
        return null;
      }

      // تحويل البيانات للتوافق مع النظام الحالي
      const initData: StoreInitializationData = {
        organization_details: {
          id: ultraFastData.org_id,
          name: ultraFastData.org_name,
          description: ultraFastData.org_description,
          logo_url: ultraFastData.org_logo_url,
          subdomain: subdomain,
          domain: null,
          contact_email: ultraFastData.settings_data?.contact_email || null,
          created_at: null,
          updated_at: null,
          currency: ultraFastData.settings_data?.currency || null,
          language: ultraFastData.settings_data?.language || null,
          default_country: ultraFastData.settings_data?.default_country || null,
          is_active: true,
          industry: ultraFastData.settings_data?.industry || null,
          business_type: ultraFastData.settings_data?.business_type || null,
          timezone: ultraFastData.settings_data?.timezone || null
        },
        organization_settings: ultraFastData.settings_data,
        categories: ultraFastData.categories_data || [],
        subcategories: [],
        featured_products: ultraFastData.featured_products_data || [],
        shipping_info: {
          has_shipping_providers: false,
          default_shipping_zone_id: null,
          default_shipping_zone_details: null
        },
        store_layout_components: ultraFastData.components_data || []
      };

      return initData;
    } catch (error: any) {
      return {
        organization_details: null,
        organization_settings: null,
        categories: [],
        subcategories: [],
        featured_products: [],
        shipping_info: null,
        store_layout_components: [],
        error: error.message || 'خطأ في تحميل بيانات المتجر'
      };
    }
  }

  // =================================================================
  // 🎯 جلب المكونات بالتوازي
  // =================================================================
  async getComponentsDataParallel(orgId: string): Promise<any[]> {
    const cacheKey = `components_${orgId}`;
    
    try {
      const cachedComponents = await getCacheData(cacheKey);
      if (cachedComponents) return cachedComponents;

      const { data, error } = await supabase
        .from('store_settings')
        .select('id, component_type, settings, is_active, order_index')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const components = (data || []).map(item => ({
        id: item.id,
        type: item.component_type,
        settings: item.settings || {},
        isActive: item.is_active,
        orderIndex: item.order_index || 0
      }));

      setCacheData(cacheKey, components, CACHE_LAYERS.TTL.COMPONENTS);
      return components;
    } catch (error: any) {
      return [];
    }
  }

  // =================================================================
  // 🎯 تحديث ذكي للكاش
  // =================================================================
  async invalidateStoreCache(subdomain: string, orgId?: string): Promise<void> {
    try {
      const cacheKey = `ultra_fast_${subdomain}`;
      
      // حذف من Memory Cache
      CACHE_LAYERS.MEMORY.delete(cacheKey);
      
      // حذف من IndexedDB Cache
      await clearCacheItem(cacheKey);
      
      // حذف كاش المكونات إذا تم توفير orgId
      if (orgId) {
        const componentsCacheKey = `components_${orgId}`;
        CACHE_LAYERS.MEMORY.delete(componentsCacheKey);
        await clearCacheItem(componentsCacheKey);
      }
    } catch (error: any) {
    }
  }

  // =================================================================
  // 🎯 تحديث البيانات مع تنظيف الكاش
  // =================================================================
  async updateStoreSettings(orgId: string, subdomain: string, settings: any): Promise<void> {
    try {
      // تحديث في قاعدة البيانات
      const { error } = await supabase
        .from('organization_settings')
        .update(settings)
        .eq('organization_id', orgId);

      if (error) throw error;

      // تنظيف الكاش
      await this.invalidateStoreCache(subdomain, orgId);

      // تحديث المشاهدات المحسنة
      await (supabase as any).rpc('refresh_materialized_views');
    } catch (error: any) {
      throw error;
    }
  }

  // =================================================================
  // 🎯 تنظيف دوري للذاكرة
  // =================================================================
  cleanupMemoryCache(): void {
    const now = Date.now();
    const maxAge = CACHE_LAYERS.TTL.BASIC;
    
    for (const [key, value] of CACHE_LAYERS.MEMORY.entries()) {
      if (now - value.timestamp > maxAge) {
        CACHE_LAYERS.MEMORY.delete(key);
      }
    }
  }

  // =================================================================
  // 🎯 إحصائيات الكاش
  // =================================================================
  getCacheStats(): {
    memorySize: number;
    memoryKeys: string[];
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(CACHE_LAYERS.MEMORY.entries());
    const timestamps = entries.map(([, value]) => value.timestamp);
    
    return {
      memorySize: CACHE_LAYERS.MEMORY.size,
      memoryKeys: entries.map(([key]) => key),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }
}

// تنظيف دوري للذاكرة كل 5 دقائق
setInterval(() => {
  UltraFastStoreService.getInstance().cleanupMemoryCache();
}, 5 * 60 * 1000);

export default UltraFastStoreService;
