/**
 * مكون تحميل المنتجات
 */

import { ApiClient } from './apiClient';
import { CacheManager } from './cacheManager';
import type { ProductPreloadResult } from './types/interfaces';

export class ProductLoader {
  /**
   * استخراج slug المنتج من URL الحالي
   */
  static extractProductSlugFromURL(): string | null {
    try {
      const pathname = window.location.pathname;
      
      const productPathPatterns = [
        /^\/product-purchase-max-v3\/([^\/]+)$/,
        /^\/product-purchase-v3\/([^\/]+)$/,
        /^\/products\/([^\/]+)$/,
        /^\/product\/([^\/]+)$/,
        /^\/p\/([^\/]+)$/
      ];

      for (const pattern of productPathPatterns) {
        const match = pathname.match(pattern);
        if (match && match[1]) {
          const slug = match[1];
          if (slug && slug.length > 2 && !['api', 'admin', 'dashboard'].includes(slug)) {
            return slug;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('خطأ في استخراج slug المنتج:', error);
      return null;
    }
  }

  /**
   * تحميل منتج محدد مسبقاً
   */
  static async preloadSpecificProduct(productSlug: string, storeIdentifier: string): Promise<ProductPreloadResult> {
    const startTime = performance.now();
    
    try {
      // جلب UUID من API مباشرة
      const orgParam = await this.getOrganizationId(storeIdentifier);
      if (!orgParam) {
        return {
          success: false,
          error: 'No Organization UUID available',
          executionTime: performance.now() - startTime
        };
      }

      // ✅ تحديث: استخدام الدالتين الجديدتين المنفصلتين
      const { getProductCombinedDataUltraFast } = await import('@/lib/api/productUltraFastApi');

      // تحويل الخيارات للدالة الجديدة
      const fastOptions = {
        organizationId: orgParam,
        includeInactive: false,
        includeExtended: true,
        includeThumbnails: true,
        includeColorsBasic: true,
        includeMarketingData: true,
        includeFormData: true,
        includeAdvancedSettings: false,
        dataDetailLevel: 'full' as 'full' | 'ultra' | 'standard'
      };

      let data, error;

      try {
        // استخدام الدالة الجديدة أولاً
        data = await getProductCombinedDataUltraFast(productSlug, fastOptions);
        error = null;
      } catch (rpcErr: any) {
        console.warn('⚠️ [ProductLoader] فشل API الجديد، استخدام fallback:', rpcErr.message);
        error = rpcErr;

        // إذا فشل API الجديد، جرب الدالة القديمة كـ fallback
        try {
          const { supabase } = await import('@/lib/supabase');
          const fallbackResult = await supabase.rpc('get_product_complete_data_ultra_optimized' as any, {
            p_product_identifier: productSlug,
            p_organization_id: orgParam,
            p_include_inactive: false,
            p_data_scope: 'full',
            p_include_large_images: false
          });

          data = fallbackResult.data;
          error = fallbackResult.error;
        } catch (fallbackErr: any) {
          console.warn('⚠️ [ProductLoader] فشل fallback أيضاً:', fallbackErr.message);
          error = fallbackErr;
        }
      }

      const executionTime = performance.now() - startTime;

      if (error) {
        console.warn('🔴 [ProductLoader] فشل في جلب المنتج:', {
          error: error.message,
          productSlug,
          orgParam,
          storeIdentifier
        });
        return {
          success: false,
          error: error.message || 'Product RPC error',
          executionTime
        };
      }

      if (!data) {
        console.warn('🔴 [ProductLoader] استجابة فارغة من API المنتج:', {
          productSlug,
          orgParam,
          storeIdentifier,
          responseData: data
        });
        return {
          success: false,
          error: 'Empty response from product API',
          executionTime
        };
      }

      return this.processProductData(data, productSlug, storeIdentifier, executionTime);
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      console.warn('🔴 [ProductLoader] خطأ في جلب المنتج:', error);
      return {
        success: false,
        error: error?.message || 'Product fetch error',
        executionTime
      };
    }
  }

  /**
   * جلب Organization ID
   */
  private static async getOrganizationId(storeIdentifier: string): Promise<string | null> {
    try {
      // محاولة الحصول من cache أولاً
      const cached = CacheManager.getFastOrgIdFromCache(storeIdentifier);
      if (cached) {
        return cached;
      }

      // محاولة الحصول من APP_INIT_DATA
      try {
        const appInitData = localStorage.getItem('bazaar_app_init_data');
        if (appInitData) {
          const data = JSON.parse(appInitData);
          if (data.organization?.id) {
            return data.organization.id;
          }
        }
      } catch {}

      // محاولة الحصول من window object
      try {
        const windowOrg = (window as any).__TENANT_CONTEXT_ORG__;
        if (windowOrg?.id) {
          return windowOrg.id;
        }
      } catch {}

      // جلب من API
      return await ApiClient.getOrganizationIdFast(storeIdentifier, 'subdomain');
    } catch (e) {
      console.warn('⚠️ [ProductLoader] فشل في جلب Organization UUID:', e);
      return null;
    }
  }

  /**
   * معالجة بيانات المنتج
   */
  private static processProductData(data: any, productSlug: string, storeIdentifier: string, executionTime: number): ProductPreloadResult {
    const productData = data as any;
    
    const hasValidProduct = productData && (
      (productData.success && productData.data) ||
      productData.product ||
      productData.id ||
      (Array.isArray(productData) && productData.length > 0)
    );
    
    if (hasValidProduct) {
      const extractedData = this.extractProductData(productData);
      
      // حفظ بيانات المنتج في cache منفصل
      try {
        localStorage.setItem(`product_preload_${productSlug}`, JSON.stringify({
          data: extractedData,
          timestamp: Date.now(),
          executionTime,
          storeIdentifier
        }));
      } catch (e) {
        console.warn('فشل حفظ بيانات المنتج في localStorage:', e);
      }

      return {
        success: true,
        data: extractedData,
        executionTime
      };
    } else {
      console.warn('🔴 [ProductLoader] استجابة غير صحيحة من API المنتج:', {
        error: productData?.error || 'Invalid product response',
        productSlug,
        storeIdentifier,
        responseStructure: productData ? Object.keys(productData) : 'undefined',
        fullResponse: productData
      });
      return {
        success: false,
        error: productData?.error || 'Invalid product response',
        executionTime
      };
    }
  }

  /**
   * استخراج بيانات المنتج من هياكل مختلفة
   */
  private static extractProductData(productData: any): any {
    if (productData.success && productData.data) {
      return productData.data;
    } else if (productData.product) {
      return { product: productData.product };
    } else if (productData.id) {
      return { product: productData };
    } else if (Array.isArray(productData)) {
      return { product: productData[0] };
    } else {
      return productData;
    }
  }

  /**
   * الحصول على بيانات المنتج المحملة مسبقاً
   */
  static getPreloadedProduct(productSlug?: string, preloadResult?: any): any | null {
    // محاولة الحصول من البيانات الرئيسية أولاً
    if (preloadResult?.data?.preloaded_product) {
      return preloadResult.data.preloaded_product;
    }

    // محاولة الحصول من cache المنتج المحدد
    if (productSlug) {
      try {
        const stored = localStorage.getItem(`product_preload_${productSlug}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
            return parsed.data;
          } else {
            localStorage.removeItem(`product_preload_${productSlug}`);
          }
        }
      } catch (e) {
        console.warn('خطأ في قراءة بيانات المنتج المحفوظة:', e);
      }
    }

    return null;
  }
}
