/**
 * ProductPagePreloader - نظام preload خاص بصفحة المنتج
 * يجلب بيانات المنتج مبكراً عند دخول صفحة ProductPurchasePageV3.tsx
 */

import { supabase } from '@/lib/supabase-unified';

interface ProductPagePreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  productId?: string;
  organizationId?: string;
}

interface PreloadOptions {
  productId: string;
  organizationId: string;
  dataScope?: 'basic' | 'full' | 'ultra';
  forceUltraOnly?: boolean; // إجبار استخدام ultra فقط بدون fallback
}

class ProductPagePreloader {
  private static instance: ProductPagePreloader;
  private preloadCache: Map<string, ProductPagePreloadResult> = new Map();
  private activePreloads: Map<string, Promise<ProductPagePreloadResult>> = new Map();

  static getInstance(): ProductPagePreloader {
    if (!ProductPagePreloader.instance) {
      ProductPagePreloader.instance = new ProductPagePreloader();
    }
    return ProductPagePreloader.instance;
  }

  /**
   * بدء preload لصفحة المنتج
   */
  async startProductPagePreload(options: PreloadOptions): Promise<ProductPagePreloadResult> {
    const cacheKey = this.createCacheKey(options);
    
    // إذا كان هناك preload قيد التشغيل، انتظره
    if (this.activePreloads.has(cacheKey)) {
      console.log(`⏳ [ProductPagePreloader] انتظار preload قيد التشغيل: ${cacheKey}`);
      return this.activePreloads.get(cacheKey)!;
    }

    // إذا كان preload مكتمل، أرجع النتيجة
    if (this.preloadCache.has(cacheKey)) {
      const cached = this.preloadCache.get(cacheKey)!;
      console.log(`💾 [ProductPagePreloader] استخدام النتيجة المحفوظة: ${cacheKey}`);
      return cached;
    }

    console.log(`🚀 [ProductPagePreloader] بدء preload لصفحة المنتج:`, options);
    const startTime = performance.now();

    // إنشاء promise جديد
    const preloadPromise = this.executeProductPagePreload(options, startTime);
    this.activePreloads.set(cacheKey, preloadPromise);

    try {
      const result = await preloadPromise;
      this.preloadCache.set(cacheKey, result);
      this.activePreloads.delete(cacheKey);
      return result;
    } catch (error) {
      this.activePreloads.delete(cacheKey);
      throw error;
    }
  }

  /**
   * تنفيذ preload لصفحة المنتج
   */
  private async executeProductPagePreload(
    options: PreloadOptions,
    startTime: number
  ): Promise<ProductPagePreloadResult> {
    try {
      const { productId, organizationId, dataScope = 'ultra', forceUltraOnly = false } = options;

      console.log(`📦 [ProductPagePreloader] جلب بيانات المنتج: ${productId} للمؤسسة: ${organizationId}`);

      // استدعاء API مباشرة بدون dependencies
      const response = await this.callProductAPI(productId, organizationId, dataScope, forceUltraOnly);
      const executionTime = performance.now() - startTime;

      if (response.success) {
        console.log(`✅ [ProductPagePreloader] اكتمل preload في ${executionTime.toFixed(2)}ms`);
        
        // حفظ البيانات في localStorage مؤقتاً
        try {
          localStorage.setItem(`product_preload_${productId}_${organizationId}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
            executionTime,
            dataScope
          }));
        } catch (e) {
          console.warn('⚠️ [ProductPagePreloader] فشل في حفظ البيانات في localStorage');
        }

        // إرسال حدث للإعلام عن اكتمال التحميل المبكر
        window.dispatchEvent(new CustomEvent('productPagePreloadComplete', {
          detail: {
            productId,
            organizationId,
            data: response.data,
            executionTime,
            dataScope
          }
        }));

        return {
          success: true,
          data: response.data,
          executionTime,
          productId,
          organizationId
        };
      } else {
        throw new Error(response.error || 'فشل في جلب بيانات المنتج');
      }

    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      console.error('❌ [ProductPagePreloader] خطأ في preload:', error);
      
      return {
        success: false,
        error: error.message || 'خطأ غير معروف',
        executionTime,
        productId: options.productId,
        organizationId: options.organizationId
      };
    }
  }

  /**
   * استدعاء API المنتج مباشرة
   */
  private async callProductAPI(
    productId: string,
    organizationId: string,
    dataScope: string,
    forceUltraOnly: boolean = false
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // التحقق من أن supabase متاح
      if (!supabase || !supabase.rpc) {
        throw new Error('Supabase client غير متاح');
      }

      // استدعاء الدالة Ultra Optimized مع timeout محسن
      const startTime = performance.now();
      
      const rpcParams = {
        p_product_identifier: productId,
        p_organization_id: organizationId,
        p_include_inactive: false,
        p_data_scope: dataScope
      };

      console.log('📝 [ProductPagePreloader] معاملات RPC:', rpcParams);

      // المحاولة الأولى: dataScope المطلوب مع timeout أطول للـ ultra
      let rpcCall = supabase.rpc('get_product_complete_data_ultra_optimized' as any, rpcParams);

      // إزالة timeout للـ ultra للسماح لها بإكمال العمل
      let data: any = null;
      let error: any = null;

      try {
        const result = await rpcCall;
        data = result.data;
        error = result.error;
      } catch (rpcErr: any) {
        error = rpcErr;
      }
      
      // إذا كان forceUltraOnly مفعل، لا نستخدم fallback
      if (error) {
        if (forceUltraOnly) {
          console.warn('⚠️ [ProductPagePreloader] فشل dataScope ultra، forceUltraOnly مفعل، لن نستخدم fallback:', {
            requestedScope: dataScope,
            error: error.message
          });
        } else {
          // إذا لم يكن forceUltraOnly مفعل، يمكن استخدام fallback مستقبلاً
          console.warn('⚠️ [ProductPagePreloader] فشل dataScope ultra، يمكن استخدام fallback:', {
            requestedScope: dataScope,
            error: error.message
          });
        }
        // لا نحاول basic، نعيد الخطأ كما هو
      }

      const executionTime = performance.now() - startTime;

      if (error) {
        console.error('❌ [ProductPagePreloader] خطأ من RPC:', error);
        return {
          success: false,
          error: error.message || 'خطأ في RPC'
        };
      }

      console.log(`✅ [ProductPagePreloader] تم جلب البيانات بنجاح من Ultra Optimized:`, {
        productId: data?.product?.id || 'غير محدد',
        productName: data?.product?.name || 'غير محدد',
        dataScope: data?.dataScope || 'غير محدد',
        optimized: data?.optimized || false,
        version: data?.version || 'غير محدد',
        executionTime: `${executionTime.toFixed(2)}ms`
      });

      return {
        success: true,
        data
      };

    } catch (error: any) {
      console.error('❌ [ProductPagePreloader] خطأ في استدعاء API:', error);
      return {
        success: false,
        error: error.message || 'خطأ في استدعاء API'
      };
    }
  }

  /**
   * إنشاء مفتاح cache
   */
  private createCacheKey(options: PreloadOptions): string {
    return `${options.productId}:${options.organizationId}:${options.dataScope}`;
  }

  /**
   * مسح cache محدد
   */
  clearCache(productId: string, organizationId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.preloadCache.keys()) {
      if (key.includes(productId) && key.includes(organizationId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.preloadCache.delete(key);
      console.log(`🧹 [ProductPagePreloader] تم مسح cache: ${key}`);
    });
  }

  /**
   * مسح جميع cache
   */
  clearAllCache(): void {
    this.preloadCache.clear();
    this.activePreloads.clear();
    console.log('🧹 [ProductPagePreloader] تم مسح جميع cache');
  }

  /**
   * الحصول على نتيجة preload من cache
   */
  getCachedResult(productId: string, organizationId: string): ProductPagePreloadResult | null {
    for (const [key, result] of this.preloadCache.entries()) {
      if (key.includes(productId) && key.includes(organizationId)) {
        return result;
      }
    }
    return null;
  }

  /**
   * فحص ما إذا كان preload قيد التشغيل
   */
  isPreloading(productId: string, organizationId: string): boolean {
    for (const key of this.activePreloads.keys()) {
      if (key.includes(productId) && key.includes(organizationId)) {
        return true;
      }
    }
    return false;
  }
}

// تصدير المثيل الوحيد
export const productPagePreloader = ProductPagePreloader.getInstance();

// تصدير الدالة الرئيسية
export const startProductPagePreload = (options: PreloadOptions) => 
  productPagePreloader.startProductPagePreload(options);

// تصدير الدوال المساعدة
export const clearProductPageCache = (productId: string, organizationId: string) => 
  productPagePreloader.clearCache(productId, organizationId);

export const clearAllProductPageCache = () => 
  productPagePreloader.clearAllCache();

export const getCachedProductPageResult = (productId: string, organizationId: string) => 
  productPagePreloader.getCachedResult(productId, organizationId);

export const isProductPagePreloading = (productId: string, organizationId: string) => 
  productPagePreloader.isPreloading(productId, organizationId);
