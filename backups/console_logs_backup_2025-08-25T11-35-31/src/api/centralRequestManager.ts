// =================================================================
// 🚀 CENTRAL REQUEST MANAGER - مدير الطلبات المركزي
// =================================================================

import { supabase } from '@/lib/supabase';
import { LONG_CACHE_TTL, DEFAULT_CACHE_TTL, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';

// Global request deduplication cache
const activeRequests = new Map<string, Promise<any>>();

/**
 * مدير الطلبات المركزي لتجنب جميع الطلبات المكررة
 */
export class CentralRequestManager {
  private static instance: any;

  static getInstance(): any {
    if (!this.instance) {
      this.instance = new CentralRequestManager();
    }
    return this.instance;
  }

  /**
   * تنفيذ طلب مع منع التكرار
   */
  private async executeRequest(
    key: string,
    requestFn: () => Promise<any>,
    ttl: number = DEFAULT_CACHE_TTL
  ): Promise<any> {
    // فحص إذا كان هناك طلب جاري
    if (activeRequests.has(key)) {
      return activeRequests.get(key)!;
    }

    // إنشاء طلب جديد بدون cache معقد
    const requestPromise = requestFn();
    
    // حفظ الطلب في active requests
    activeRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // إزالة الطلب من active requests بعد الانتهاء
      activeRequests.delete(key);
    }
  }

  /**
   * جلب بيانات المنظمة بواسطة subdomain
   */
  async getOrganizationBySubdomain(subdomain: string): Promise<any> {
    // التحقق من أن subdomain ليس www
    if (subdomain === 'www') {
      throw new Error('www is not a valid subdomain');
    }
    
    const key = `org_by_subdomain_${subdomain}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('subdomain', subdomain)
          .eq('subscription_status', 'active')
          .single();

        if (error) {
          throw new Error(`Organization not found: ${error.message}`);
        }

        return data;
      },
      LONG_CACHE_TTL
    );
  }

  /**
   * جلب إعدادات المنظمة
   */
  async getOrganizationSettings(organizationId: string): Promise<any> {
    const key = `org_settings_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) {
          return null;
        }

        return data;
      },
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * جلب فئات المنتجات
   */
  async getProductCategories(organizationId: string): Promise<any[]> {
    const key = `categories_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name')
          .limit(20);

        if (error) {
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * جلب فئات فرعية
   */
  async getProductSubcategories(organizationId: string): Promise<any[]> {
    const key = `subcategories_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('product_subcategories')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name')
          .limit(50);

        if (error) {
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * جلب المنتجات المميزة
   */
  async getFeaturedProducts(organizationId: string): Promise<any[]> {
    const key = `featured_products_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * جلب إعدادات المتجر
   */
  async getStoreSettings(organizationId: string): Promise<any[]> {
    const key = `store_settings_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (error) {
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * جلب تطبيقات المنظمة
   */
  async getOrganizationApps(organizationId: string): Promise<any[]> {
    const key = `org_apps_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        // organization_apps table doesn't exist, returning empty array
        // const { data, error } = await supabase
        //   .from('organization_apps')
        //   .select('*')
        //   .eq('organization_id', organizationId);

        // if (error) {
        //   return [];
        // }

        // return data || [];
        
        // Temporary fix: return empty array
        return [];
      },
      LONG_CACHE_TTL
    );
  }

  /**
   * استدعاء RPC: get_store_init_data
   */
  async getStoreInitData(subdomain: string): Promise<any> {
    // التحقق من أن subdomain ليس www
    if (subdomain === 'www') {
      throw new Error('www is not a valid subdomain');
    }
    
    const key = `store_init_data_${subdomain}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await (supabase as any).rpc('get_store_init_data', {
          org_identifier: subdomain,
        });

        if (error) {
          throw new Error(`RPC get_store_init_data failed: ${error.message}`);
        }

        return data;
      },
      SHORT_CACHE_TTL
    );
  }

  /**
   * استدعاء RPC: get_organization_theme
   */
  async getOrganizationTheme(organizationId: string): Promise<any> {
    const key = `org_theme_${organizationId}`;
    
    return this.executeRequest(
      key,
      async () => {
        
        const { data, error } = await (supabase as any).rpc('get_organization_theme', {
          org_id: organizationId,
        });

        if (error) {
          return null;
        }

        return data;
      },
      LONG_CACHE_TTL
    );
  }

  /**
   * جلب جميع البيانات المطلوبة للمتجر بطلب واحد محسن
   */
  async getAllStoreData(subdomain: string): Promise<{
    organization: any;
    organizationSettings: any;
    categories: any[];
    subcategories: any[];
    featuredProducts: any[];
    storeSettings: any[];
    organizationApps: any[];
    storeInitData?: any;
    organizationTheme?: any;
  }> {
    // التحقق من أن subdomain ليس www
    if (subdomain === 'www') {
      throw new Error('www is not a valid subdomain');
    }

    // أولاً: جلب بيانات المنظمة
    const organization = await this.getOrganizationBySubdomain(subdomain);
    const organizationId = organization.id;

    // ثانياً: جلب باقي البيانات بالتوازي
    const [
      organizationSettings,
      categories,
      subcategories,
      featuredProducts,
      storeSettings,
      organizationApps,
      organizationTheme
    ] = await Promise.all([
      this.getOrganizationSettings(organizationId),
      this.getProductCategories(organizationId),
      this.getProductSubcategories(organizationId),
      this.getFeaturedProducts(organizationId),
      this.getStoreSettings(organizationId),
      this.getOrganizationApps(organizationId),
      this.getOrganizationTheme(organizationId)
    ]);

    return {
      organization,
      organizationSettings,
      categories,
      subcategories,
      featuredProducts,
      storeSettings,
      organizationApps,
      organizationTheme
    };
  }

  /**
   * مسح جميع caches المتعلقة بمنظمة معينة
   */
  async clearOrganizationCache(organizationId: string, subdomain?: string): Promise<void> {
    const cacheKeys = [
      `org_settings_${organizationId}`,
      `categories_${organizationId}`,
      `subcategories_${organizationId}`,
      `featured_products_${organizationId}`,
      `store_settings_${organizationId}`,
      `org_apps_${organizationId}`,
      `org_theme_${organizationId}`
    ];

    if (subdomain) {
      cacheKeys.push(
        `org_by_subdomain_${subdomain}`,
        `store_init_data_${subdomain}`
      );
    }

    // مسح من active requests
    cacheKeys.forEach(key => activeRequests.delete(key));

  }

  /**
   * مسح جميع caches
   */
  async clearAllCaches(): Promise<void> {
    activeRequests.clear();
  }

  /**
   * إحصائيات الأداء
   */
  getPerformanceStats(): {
    activeRequests: number;
    requestKeys: string[];
  } {
    return {
      activeRequests: activeRequests.size,
      requestKeys: Array.from(activeRequests.keys())
    };
  }
}

// إنشاء instance مشترك
export const centralRequestManager = CentralRequestManager.getInstance();

// دوال مساعدة للاستخدام المباشر
export const getOrganizationBySubdomain = (subdomain: string) => 
  centralRequestManager.getOrganizationBySubdomain(subdomain);

export const getOrganizationSettings = (organizationId: string) => 
  centralRequestManager.getOrganizationSettings(organizationId);

export const getProductCategories = (organizationId: string) => 
  centralRequestManager.getProductCategories(organizationId);

export const getProductSubcategories = (organizationId: string) => 
  centralRequestManager.getProductSubcategories(organizationId);

export const getFeaturedProducts = (organizationId: string) => 
  centralRequestManager.getFeaturedProducts(organizationId);

export const getStoreSettings = (organizationId: string) => 
  centralRequestManager.getStoreSettings(organizationId);

export const getOrganizationApps = (organizationId: string) => 
  centralRequestManager.getOrganizationApps(organizationId);

export const getStoreInitData = (subdomain: string) => 
  centralRequestManager.getStoreInitData(subdomain);

export const getOrganizationTheme = (organizationId: string) => 
  centralRequestManager.getOrganizationTheme(organizationId);

export const getAllStoreData = (subdomain: string) => 
  centralRequestManager.getAllStoreData(subdomain);
