/**
 * نظام preload مبكر محسن - المكون الرئيسي المبسط
 */

import { DomainResolver } from './domainResolver';
import { ApiClient } from './apiClient';
import { CacheManager } from './cacheManager';
import { ProductLoader } from './productLoader';
import type { EarlyPreloadResult, OrganizationIdResult } from './types/interfaces';

class EarlyPreloader {
  private static instance: EarlyPreloader;
  private preloadPromise: Promise<EarlyPreloadResult> | null = null;
  private preloadResult: EarlyPreloadResult | null = null;

  static getInstance(): EarlyPreloader {
    if (!EarlyPreloader.instance) {
      EarlyPreloader.instance = new EarlyPreloader();
    }
    return EarlyPreloader.instance;
  }

  /**
   * بدء preload مبكر
   */
  async startEarlyPreload(): Promise<EarlyPreloadResult> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    if (this.preloadResult) {
      return this.preloadResult;
    }

    const startTime = performance.now();
    this.preloadPromise = this.executeEarlyPreload(startTime);
    this.preloadResult = await this.preloadPromise;
    
    return this.preloadResult;
  }

  /**
   * تنفيذ preload مبكر
   */
  private async executeEarlyPreload(startTime: number): Promise<EarlyPreloadResult> {
    try {
      const { storeIdentifier, domainType } = DomainResolver.resolveStoreIdentifier();
      
      if (!storeIdentifier) {
        const executionTime = performance.now() - startTime;
        return {
          success: false,
          error: 'No store identifier found',
          executionTime,
          domainType: 'localhost'
        };
      }

      // فحص إذا كان URL يحتوي على منتج محدد
      const productSlug = ProductLoader.extractProductSlugFromURL();

      // استدعاء واحد فقط لتهيئة المتجر (منع التكرار)
      const storeResponseSettled = await Promise.allSettled([
        ApiClient.callStoreInitAPI(storeIdentifier, domainType)
      ]);
      const executionTime = performance.now() - startTime;

      let productResponse: PromiseSettledResult<any> | undefined;

      // استخراج نتيجة Store
      const storeResponse = storeResponseSettled[0];
      const response = storeResponse.status === 'fulfilled' ? storeResponse.value : { success: false, error: 'Store API failed' };
      
      if (response.success) {
        // استخرج organizationId واحفظه كـ fastOrgId ليسهل على الأنظمة الأخرى
        const orgId = response.data?.organization_details?.id || response.data?.organization?.id || null;
        if (orgId) {
          CacheManager.setFastOrgId(storeIdentifier, orgId);
        }

        // بعد توفر orgId فقط، قم بتحميل المنتج المحدد مسبقاً (إن وجد)
        if (productSlug && orgId) {
          try {
            const pr = await ProductLoader.preloadSpecificProduct(productSlug, storeIdentifier);
            productResponse = { status: 'fulfilled', value: pr } as any;
          } catch (err) {
            productResponse = { status: 'rejected', reason: err } as any;
          }
        }
        // دمج بيانات المنتج إذا كانت متاحة
        let combinedData = response.data;
        
        if (productResponse && productResponse.status === 'fulfilled' && (productResponse as any).value?.success) {
          combinedData = {
            ...response.data,
            preloaded_product: (productResponse as any).value.data,
            product_preload_time: (productResponse as any).value.executionTime || 0
          };
        }
        
        // حفظ البيانات في cache
        CacheManager.setCacheData(storeIdentifier, combinedData, executionTime, domainType);

        // إرسال حدث للإعلام عن اكتمال التحميل المبكر
        window.dispatchEvent(new CustomEvent('earlyPreloadComplete', {
          detail: {
            storeIdentifier,
            data: combinedData,
            executionTime,
            domainType,
            hasPreloadedProduct: !!productResponse && productResponse.status === 'fulfilled' && productResponse.value?.success
          }
        }));

        return {
          success: true,
          data: combinedData,
          executionTime,
          storeIdentifier,
          domainType
        };
      } else {
        return {
          success: false,
          error: response.error,
          executionTime,
          storeIdentifier,
          domainType
        };
      }
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        error: error?.message || 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * الحصول على البيانات المحفوظة مسبقاً
   */
  getPreloadedData(storeIdentifier?: string): any | null {
    return CacheManager.getPreloadedData(storeIdentifier, this.preloadResult);
  }

  /**
   * مسح البيانات المحفوظة مسبقاً
   */
  clearPreloadedData(): void {
    this.preloadPromise = null;
    this.preloadResult = null;
    CacheManager.clearCache();
  }

  /**
   * الحصول على بيانات المنتج المحملة مسبقاً
   */
  getPreloadedProduct(productSlug?: string): any | null {
    return ProductLoader.getPreloadedProduct(productSlug, this.preloadResult);
  }

  /**
   * الحصول على معلومات النطاق
   */
  getDomainInfo(): { storeIdentifier: string | null; domainType: string | null } {
    const { storeIdentifier, domainType } = DomainResolver.resolveStoreIdentifier();
    return { storeIdentifier, domainType };
  }
}

// تصدير instance واحد
export const earlyPreloader = EarlyPreloader.getInstance();

// دالة لبدء preload مبكر
export const startEarlyPreload = () => earlyPreloader.startEarlyPreload();

// دالة للحصول على البيانات المحفوظة مسبقاً
export const getEarlyPreloadedData = (storeIdentifier?: string) => earlyPreloader.getPreloadedData(storeIdentifier);

// دالة للحصول على معلومات النطاق
export const getEarlyPreloadDomainInfo = () => earlyPreloader.getDomainInfo();

// دالة للحصول على بيانات المنتج المحملة مسبقاً
export const getPreloadedProduct = (productSlug?: string) => earlyPreloader.getPreloadedProduct(productSlug);

/**
 * الحصول على Organization ID بسرعة من مصادر متعددة
 */
export const getFastOrganizationId = (): OrganizationIdResult | null => {
  try {
    // الأولوية الأعلى: window object (فوري)
    try {
      const windowOrg = (window as any).__TENANT_CONTEXT_ORG__;
      if (windowOrg?.id) {
        return {
          organizationId: windowOrg.id,
          source: 'window-object'
        };
      }
    } catch {}

    // الأولوية الثانية: APP_INIT_DATA
    try {
      const appInitData = localStorage.getItem('bazaar_app_init_data');
      if (appInitData) {
        const data = JSON.parse(appInitData);
        if (data.organization?.id) {
          return {
            organizationId: data.organization.id,
            source: 'app-init-data'
          };
        }
      }
    } catch {}

    // الأولوية الثالثة: early preload cache
    const currentHostname = window.location.hostname;
    const possibleKeys = [
      currentHostname,
      currentHostname.replace('www.', ''),
      currentHostname.split('.')[0]
    ];

    for (const key of possibleKeys) {
      // فحص fast_org_id cache
      const cached = localStorage.getItem(`fast_org_id_${key}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.timestamp && (Date.now() - data.timestamp) < 10 * 60 * 1000) {
            return {
              organizationId: data.organizationId,
              source: 'early-preload-cache'
            };
          }
        } catch {}
      }

      // فحص early_preload cache
      const earlyPreload = localStorage.getItem(`early_preload_${key}`);
      if (earlyPreload) {
        try {
          const data = JSON.parse(earlyPreload);
          const orgId = data.data?.organization_details?.id || data.data?.organization?.id;
          if (orgId) {
            return {
              organizationId: orgId,
              source: 'early-preload-data'
            };
          }
        } catch {}
      }
    }

    // الأولوية الرابعة: localStorage القديم
    try {
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (orgId && orgId.length > 10) {
        return {
          organizationId: orgId,
          source: 'legacy-localstorage'
        };
      }
    } catch {}

    return null;
  } catch (error) {
    console.warn('خطأ في getFastOrganizationId:', error);
    return null;
  }
};
