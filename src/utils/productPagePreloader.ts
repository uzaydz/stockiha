/**
 * ProductPagePreloader - نظام preload خاص بصفحة المنتج
 * يجلب بيانات المنتج مبكراً عند دخول صفحة ProductPurchasePageV3.tsx
 */

import { supabase } from '@/lib/supabase-unified';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';

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
    // إذا كان العامل السحابي حقن بيانات المنتج في DOM، لا داعي لأي استدعاء
    try {
      const dom = getPreloadedProductFromDOM();
      if (dom && dom.success && dom.data && dom.data.product) {
        return {
          success: true,
          data: dom.data,
          executionTime: 0,
          productId: options.productId,
          organizationId: options.organizationId
        };
      }
    } catch {}

    const cacheKey = this.createCacheKey(options);
    
    // إذا كان هناك preload قيد التشغيل، انتظره
    if (this.activePreloads.has(cacheKey)) {
      return this.activePreloads.get(cacheKey)!;
    }

    // إذا كان preload مكتمل، أرجع النتيجة
    if (this.preloadCache.has(cacheKey)) {
      const cached = this.preloadCache.get(cacheKey)!;
      return cached;
    }

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
      const { productId, organizationId, dataScope = 'full', forceUltraOnly = false } = options;

      // فحص Cache أولاً قبل استدعاء API
      const cacheKey = this.createCacheKey(options);
      const cachedResult = this.preloadCache.get(cacheKey);

      if (cachedResult && cachedResult.success && !forceUltraOnly) {
        
        return cachedResult;
      }

      // استدعاء API مباشرة بدون dependencies
      const response = await this.callProductAPI(productId, organizationId, dataScope, forceUltraOnly);
      const executionTime = performance.now() - startTime;

      if (response.success) {
        
        // حفظ البيانات في localStorage مؤقتاً
        try {
          localStorage.setItem(`product_preload_${productId}_${organizationId}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
            executionTime,
            dataScope
          }));
        } catch (e) {
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
      // استخدام الـ API الموحد مع مانع التكرار لضمان عدم تكرار الطلب
      const { getProductCompleteDataOptimized } = await import('@/lib/api/deduplicatedApi');

      const result = await getProductCompleteDataOptimized(productId, {
        organizationId,
        // استخدام 'full' كافٍ لمعظم العرض الأولي
        dataScope: (dataScope as any) || 'full',
        // لا نستخدم forceRefresh هنا لتمكين مشاركة الطلب مع الصفحة
      });

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
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
    });
  }

  /**
   * مسح جميع cache
   */
  clearAllCache(): void {
    this.preloadCache.clear();
    this.activePreloads.clear();
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
