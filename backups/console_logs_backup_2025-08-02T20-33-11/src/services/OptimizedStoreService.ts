import { supabase } from '@/lib/supabase';
import { getCacheData, setCacheData, clearCacheItem } from '@/lib/cache/storeCache';
import { centralRequestManager } from '@/api/centralRequestManager';

// =================================================================
// 🚀 OPTIMIZED STORE SERVICE - خدمة المتجر المحسنة
// =================================================================

// ذاكرة مؤقتة بسيطة
class SimpleMemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

interface OptimizedStoreData {
  organizationData: any;
  storeSettings: any;
  components: any[];
  categories: any[];
  featuredProducts: any[];
  shippingInfo: any[];
  cacheTimestamp: string;
}

export class OptimizedStoreService {
  private static instance: OptimizedStoreService;
  private memoryCache = new SimpleMemoryCache();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

  static getInstance(): OptimizedStoreService {
    if (!this.instance) {
      this.instance = new OptimizedStoreService();
    }
    return this.instance;
  }

  // =================================================================
  // 🎯 الطريقة الرئيسية المحسنة - بدون كاش
  // =================================================================
  async getStoreDataOptimized(subdomain: string): Promise<OptimizedStoreData> {
    try {
      // جلب البيانات مباشرة من قاعدة البيانات في كل مرة
      const allStoreData = await centralRequestManager.getAllStoreData(subdomain);

      // تحويل البيانات إلى التنسيق المطلوب
      const optimizedData: OptimizedStoreData = {
        organizationData: allStoreData.organization,
        storeSettings: allStoreData.organizationSettings || {},
        components: allStoreData.storeSettings.map((c: any) => ({
          ...c,
          type: c.component_type,
        })),
        categories: allStoreData.categories,
        featuredProducts: allStoreData.featuredProducts,
        shippingInfo: [],
        cacheTimestamp: new Date().toISOString()
      };

      return optimizedData;

    } catch (error: any) {
      console.error('خطأ في جلب بيانات المتجر:', error);
      
      // إرجاع بيانات افتراضية في حالة الخطأ
      return {
        organizationData: {},
        storeSettings: {},
        components: [],
        categories: [],
        featuredProducts: [],
        shippingInfo: [],
        cacheTimestamp: new Date().toISOString()
      } as OptimizedStoreData;
    }
  }

  // =================================================================
  // 🎯 دوال مساعدة
  // =================================================================
  
  private convertSettingsArrayToObject(settingsArray: any[]): any {
    if (!Array.isArray(settingsArray) || settingsArray.length === 0) return {};
    
    // إذا كان هناك عنصر واحد فقط، فهو كائن الإعدادات مباشرة
    if (settingsArray.length === 1) {
      return settingsArray[0];
    }
    
    // إذا كان هناك عدة عناصر، نحولها إلى كائن
    const settingsObject: any = {};
    settingsArray.forEach(setting => {
      if (setting.setting_key && setting.setting_value !== undefined) {
        settingsObject[setting.setting_key] = setting.setting_value;
      }
    });
    
    return settingsObject;
  }

  async clearStoreCache(organizationId: string): Promise<void> {
    // لا نحتاج لمسح الكاش لأننا لا نستخدمه بعد الآن
    console.log('تم استدعاء clearStoreCache ولكن الكاش معطل');
  }

  // =================================================================
  // 🎯 إحصائيات الأداء
  // =================================================================
  getPerformanceStats(): any {
    return {
      memoryCacheSize: this.memoryCache.size(),
      cacheHitRate: 0, // سيتم تنفيذها لاحقاً
      lastClearTime: new Date().toISOString()
    };
  }

  // =================================================================
  // 🎯 الطريقة الموحدة الجديدة
  // =================================================================
  async loadStoreData(identifier: string, isSubdomain: boolean = true): Promise<OptimizedStoreData> {
    if (isSubdomain) {
      // استخدام subdomain مباشرة
      return await this.getStoreDataOptimized(identifier);
    } else {
      // إذا كان identifier هو organization_id، نحتاج للحصول على subdomain أولاً
      const { data: orgData } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', identifier)
        .eq('subscription_status', 'active')
        .single();
      
      if (orgData?.subdomain) {
        return await this.getStoreDataOptimized(orgData.subdomain);
      }
      
      // إرجاع بيانات افتراضية إذا لم يتم العثور على المؤسسة
      return {
        organizationData: {},
        storeSettings: {},
        components: [],
        categories: [],
        featuredProducts: [],
        shippingInfo: [],
        cacheTimestamp: new Date().toISOString()
      } as OptimizedStoreData;
    }
  }

  /**
   * حفظ المكونات المحسنة من ImprovedStoreEditor إلى قاعدة البيانات
   */
  async saveImprovedComponents(organizationId: string, improvedComponents: any[]): Promise<boolean> {
    try {
      
      if (!improvedComponents || improvedComponents.length === 0) {
        return false;
      }

      // تحويل المكونات المحسنة إلى تنسيق قاعدة البيانات
      const componentsToSave = improvedComponents
        .filter(comp => comp.isActive && comp.isVisible !== false)
        .map((comp, index) => ({
          organization_id: organizationId,
          component_type: comp.type,
          settings: comp.settings || {},
          is_active: comp.isActive,
          order_index: comp.orderIndex || index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (componentsToSave.length === 0) {
        return false;
      }

      // حذف المكونات الموجودة أولاً
      const { error: deleteError } = await supabase
        .from('store_settings')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) {
        throw deleteError;
      }

      // إدراج المكونات الجديدة
      const { data, error: insertError } = await supabase
        .from('store_settings')
        .insert(componentsToSave)
        .select();

      if (insertError) {
        throw insertError;
      }

      // تنظيف الكاش بعد الحفظ
      await this.clearStoreCache(organizationId);
      
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * تحميل المكونات المحسنة من قاعدة البيانات إلى ImprovedStoreEditor
   */
  async loadImprovedComponents(organizationId: string): Promise<any[]> {
    try {
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // تحويل البيانات إلى تنسيق ImprovedStoreEditor
      const improvedComponents = data.map((comp, index) => ({
        id: comp.id || `comp-${index}`,
        type: comp.component_type,
        name: this.getComponentDisplayName(comp.component_type),
        settings: comp.settings || {},
        isActive: comp.is_active,
        isVisible: true,
        orderIndex: comp.order_index || index,
        isSelected: false,
        isHovered: false
      }));

      return improvedComponents;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * الحصول على اسم المكون باللغة العربية
   */
  private getComponentDisplayName(type: string): string {
    const names: Record<string, string> = {
      hero: 'البانر الرئيسي',
      featured_products: 'منتجات مميزة',
      product_categories: 'فئات المنتجات',
      testimonials: 'آراء العملاء',
      about: 'من نحن',
      services: 'خدماتنا',
      contact: 'اتصل بنا',
      footer: 'تذييل الصفحة',
      countdownoffers: 'عروض محدودة'
    };
    return names[type] || type;
  }
}

// تصدير instance واحد
export const optimizedStoreService = OptimizedStoreService.getInstance();
