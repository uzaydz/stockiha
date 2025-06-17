// =================================================================
// 🚀 STORE REQUEST OPTIMIZER - محسن طلبات المتجر
// =================================================================

import { supabase } from '@/lib/supabase';
import { withCache, LONG_CACHE_TTL, DEFAULT_CACHE_TTL } from '@/lib/cache/storeCache';

// Global cache لتجنب الطلبات المكررة
const globalRequestCache = new Map<string, Promise<any>>();

/**
 * خدمة مركزية لتحسين وتجميع جميع الطلبات المكررة في صفحة المتجر
 */
export class StoreRequestOptimizer {
  private static instance: StoreRequestOptimizer;

  static getInstance(): StoreRequestOptimizer {
    if (!this.instance) {
      this.instance = new StoreRequestOptimizer();
    }
    return this.instance;
  }

  /**
   * تحسين طلب shipping_providers - يتم استدعاؤه مرة واحدة فقط
   */
  async getShippingProvidersOptimized(): Promise<any[]> {
    const cacheKey = 'shipping_providers_optimized';
    
    // فحص إذا كان هناك طلب جاري
    if (globalRequestCache.has(cacheKey)) {
      console.log('🔄 انتظار طلب shipping_providers الجاري...');
      return globalRequestCache.get(cacheKey)!;
    }

    // إنشاء طلب جديد
    const requestPromise = withCache<any[]>(
      cacheKey,
      async () => {
        console.log('🔍 جلب shipping_providers من قاعدة البيانات');
        
        // فحص وجود الجدول أولاً
        const { data: checkData, error: checkError } = await supabase
          .from('shipping_providers')
          .select('id, code, name, is_active, base_url')
          .limit(5); // جلب 5 فقط بدلاً من جميع البيانات

        if (checkError) {
          if (checkError.code === '42P01') {
            // الجدول غير موجود - إرجاع مصفوفة فارغة
            console.warn('⚠️ جدول shipping_providers غير موجود');
            return [];
          }
          throw checkError;
        }

        return checkData || [];
      },
      LONG_CACHE_TTL
    );

    // حفظ الطلب في cache
    globalRequestCache.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // إزالة الطلب من cache بعد الانتهاء
      globalRequestCache.delete(cacheKey);
    }
  }

  /**
   * تحسين طلبات organization_settings
   */
  async getOrganizationSettingsOptimized(organizationId: string): Promise<any> {
    const cacheKey = `org_settings_${organizationId}`;
    
    if (globalRequestCache.has(cacheKey)) {
      return globalRequestCache.get(cacheKey)!;
    }

    const requestPromise = withCache<any>(
      cacheKey,
      async () => {
        console.log('🔍 جلب organization_settings من قاعدة البيانات');
        
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) {
          console.warn('⚠️ خطأ في جلب organization_settings:', error);
          return null;
        }

                 return data;
       },
       DEFAULT_CACHE_TTL
     );

    globalRequestCache.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      globalRequestCache.delete(cacheKey);
    }
  }

  /**
   * تحسين طلبات product_categories
   */
  async getProductCategoriesOptimized(organizationId: string): Promise<any[]> {
    const cacheKey = `categories_${organizationId}`;
    
    if (globalRequestCache.has(cacheKey)) {
      return globalRequestCache.get(cacheKey)!;
    }

    const requestPromise = withCache<any[]>(
      cacheKey,
      async () => {
        console.log('🔍 جلب product_categories من قاعدة البيانات');
        
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name')
          .limit(20); // حد أقصى 20 فئة

        if (error) {
          console.warn('⚠️ خطأ في جلب product_categories:', error);
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );

    globalRequestCache.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      globalRequestCache.delete(cacheKey);
    }
  }

  /**
   * تحسين طلبات المنتجات المميزة
   */
  async getFeaturedProductsOptimized(organizationId: string): Promise<any[]> {
    const cacheKey = `featured_products_${organizationId}`;
    
    if (globalRequestCache.has(cacheKey)) {
      return globalRequestCache.get(cacheKey)!;
    }

    const requestPromise = withCache<any[]>(
      cacheKey,
      async () => {
        console.log('🔍 جلب featured products من قاعدة البيانات');
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(10); // حد أقصى 10 منتجات مميزة

        if (error) {
          console.warn('⚠️ خطأ في جلب featured products:', error);
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );

    globalRequestCache.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      globalRequestCache.delete(cacheKey);
    }
  }

  /**
   * تحسين طلبات store_settings
   */
  async getStoreSettingsOptimized(organizationId: string): Promise<any[]> {
    const cacheKey = `store_settings_${organizationId}`;
    
    if (globalRequestCache.has(cacheKey)) {
      return globalRequestCache.get(cacheKey)!;
    }

    const requestPromise = withCache<any[]>(
      cacheKey,
      async () => {
        console.log('🔍 جلب store_settings من قاعدة البيانات');
        
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.warn('⚠️ خطأ في جلب store_settings:', error);
          return [];
        }

        return data || [];
      },
      DEFAULT_CACHE_TTL
    );

    globalRequestCache.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      globalRequestCache.delete(cacheKey);
    }
  }

  /**
   * جلب جميع البيانات المطلوبة للمتجر بطلب واحد محسن
   */
  async getAllStoreDataOptimized(organizationId: string): Promise<{
    organizationSettings: any;
    categories: any[];
    featuredProducts: any[];
    storeSettings: any[];
    shippingProviders: any[];
  }> {
    console.log('🚀 بدء جلب جميع بيانات المتجر المحسنة...');

    // جلب جميع البيانات بالتوازي
    const [
      organizationSettings,
      categories,
      featuredProducts,
      storeSettings,
      shippingProviders
    ] = await Promise.all([
      this.getOrganizationSettingsOptimized(organizationId),
      this.getProductCategoriesOptimized(organizationId),
      this.getFeaturedProductsOptimized(organizationId),
      this.getStoreSettingsOptimized(organizationId),
      this.getShippingProvidersOptimized()
    ]);

    console.log('✅ تم جلب جميع بيانات المتجر بنجاح');
    console.log('📊 الإحصائيات:', {
      categories: categories.length,
      featuredProducts: featuredProducts.length,
      storeSettings: storeSettings.length,
      shippingProviders: shippingProviders.length
    });

    return {
      organizationSettings,
      categories,
      featuredProducts,
      storeSettings,
      shippingProviders
    };
  }

  /**
   * مسح جميع caches المتعلقة بمنظمة معينة
   */
  async clearOrganizationCache(organizationId: string): Promise<void> {
    const cacheKeys = [
      `org_settings_${organizationId}`,
      `categories_${organizationId}`,
      `featured_products_${organizationId}`,
      `store_settings_${organizationId}`
    ];

    // مسح من global cache
    cacheKeys.forEach(key => globalRequestCache.delete(key));

    console.log(`🧹 تم مسح cache للمنظمة: ${organizationId}`);
  }

  /**
   * مسح جميع caches
   */
  async clearAllCaches(): Promise<void> {
    globalRequestCache.clear();
    console.log('🧹 تم مسح جميع caches');
  }

  /**
   * إحصائيات الأداء
   */
  getPerformanceStats(): {
    activeRequests: number;
    cacheKeys: string[];
  } {
    return {
      activeRequests: globalRequestCache.size,
      cacheKeys: Array.from(globalRequestCache.keys())
    };
  }
}

// إنشاء instance مشترك
export const storeRequestOptimizer = StoreRequestOptimizer.getInstance();

// دوال مساعدة للاستخدام المباشر
export const getShippingProvidersOptimized = () => 
  storeRequestOptimizer.getShippingProvidersOptimized();

export const getOrganizationSettingsOptimized = (organizationId: string) => 
  storeRequestOptimizer.getOrganizationSettingsOptimized(organizationId);

export const getProductCategoriesOptimized = (organizationId: string) => 
  storeRequestOptimizer.getProductCategoriesOptimized(organizationId);

export const getFeaturedProductsOptimized = (organizationId: string) => 
  storeRequestOptimizer.getFeaturedProductsOptimized(organizationId);

export const getAllStoreDataOptimized = (organizationId: string) => 
  storeRequestOptimizer.getAllStoreDataOptimized(organizationId); 