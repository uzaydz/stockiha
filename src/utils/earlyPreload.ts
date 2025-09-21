/**
 * نظام preload مبكر محسن - المكون الرئيسي المبسط
 */

import { DomainResolver } from './domainResolver';
import { ApiClient } from './apiClient';
import { CacheManager } from './cacheManager';
import { ProductLoader } from './productLoader';
import type { EarlyPreloadResult, OrganizationIdResult } from './types/interfaces';

const isDevEnvironment = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

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
      const { storeIdentifier, domainType } = await DomainResolver.resolveStoreIdentifierAsync();
      
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
      const storeApiPromise = ApiClient.callStoreInitAPI(storeIdentifier, domainType);

      const requestTimeout = this.isProductionEnvironment() ? 1500 : 2000;

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'Timeout - will retry in background', data: null }), requestTimeout)
      );

      const storeResponseSettled = await Promise.allSettled([
        Promise.race([storeApiPromise, timeoutPromise])
      ]);

      // إذا فشل بسبب timeout، حاول مرة أخرى في الخلفية مع استراتيجية محسنة
      if (storeResponseSettled[0].status === 'fulfilled' &&
          !(storeResponseSettled[0].value as any).success &&
          (storeResponseSettled[0].value as any).error === 'Timeout - will retry in background') {

        // ننتظر الإعادة المحاولة في الخلفية لكن مع timeout أقصر
        setTimeout(() => {
          this.retryInBackground(storeApiPromise, storeIdentifier, domainType, productSlug);
        }, 100); // بدء سريع جداً
      }
      const executionTime = performance.now() - startTime;

      let productResponse: PromiseSettledResult<any> | undefined;

      // استخراج نتيجة Store
      const storeResponse = storeResponseSettled[0];
      const response = storeResponse.status === 'fulfilled' ? (storeResponse.value as any) : { success: false, error: 'Store API failed' };
      
      if (response.success) {
        // استخرج organizationId واحفظه كـ fastOrgId ليسهل على الأنظمة الأخرى
        const orgId = (response as any).data?.organization_details?.id || (response as any).data?.organization?.id || null;
        if (orgId) {
          CacheManager.setFastOrgId(storeIdentifier, orgId);
        }

        // ✅ تحسين كبير: لا تنتظر تحميل المنتج - قم به في الخلفية حتى لا تحجب إعدادات المتجر والفافيكون
        if (productSlug && orgId) {
          try {
            ProductLoader.preloadSpecificProduct(productSlug, storeIdentifier)
              .then((pr) => {
                if (pr?.success) {
                  try {
                    // دمج لاحق غير حاجب: حفظ المنتج المحمل مسبقاً في window لتستهلكه الصفحة عند الجاهزية
                    const win: any = window;
                    const base = (response as any).data || {};
                    const mergedLater = {
                      ...base,
                      preloaded_product: pr.data,
                      product_preload_time: pr.executionTime || 0
                    };
                    win.__EARLY_STORE_DATA__ = {
                      data: mergedLater,
                      timestamp: Date.now(),
                      source: 'early_preload_product_bg'
                    };
                    // إعلام غير حاجب
                    window.dispatchEvent(new CustomEvent('earlyPreloadProductReady', {
                      detail: { productSlug, productId: pr.data?.product?.id }
                    }));
                  } catch {}
                }
              })
              .catch(() => {});
          } catch {}
        }
        // دمج بيانات المنتج إذا كانت متاحة (لن ننتظرها هنا لتقليل زمن TTI)
        let combinedData = (response as any).data;
        
        // حفظ البيانات في cache
        CacheManager.setCacheData(storeIdentifier, combinedData, executionTime, domainType);

        // حفظ البيانات في window object للوصول السريع
        (window as any).__EARLY_STORE_DATA__ = {
          data: combinedData,
          timestamp: Date.now(),
          source: 'early_preload_success'
        };

        // 🔥 حفظ أيضاً في PREFETCHED_STORE_DATA للتوافق مع المكونات الأخرى
        (window as any).__PREFETCHED_STORE_DATA__ = {
          data: combinedData,
          timestamp: Date.now(),
          source: 'early_preload_success'
        };

        // 🔥 حفظ البيانات الأساسية مباشرة في window للوصول السريع
        (window as any).__STORE_DATA__ = combinedData;
        (window as any).__STORE_ORGANIZATION__ = combinedData.organization_details;
        (window as any).__STORE_SETTINGS__ = combinedData.organization_settings;

        // 🔥 إضافة: حفظ لقطة خفيفة الوزن في sessionStorage للاستمرارية عند التنقل بين الصفحات
        try {
          const hostname = window.location.hostname;
          // استخدام نفس المنطق المستخدم في FaviconManager للتطابق
          const storeKey = `store_${storeIdentifier}`;
          const minimalSnapshot = {
            timestamp: Date.now(),
            source: 'early_preload_success',
            hostname,
            storeIdentifier,
            favicon_url: combinedData.organization_settings?.favicon_url ?? null,
            logo_url: combinedData.organization_settings?.logo_url ?? null,
            site_name: combinedData.organization_settings?.site_name ?? null,
            name: combinedData.organization_details?.name ?? combinedData.organization_settings?.site_name ?? null,
            description:
              combinedData.organization_details?.description ??
              combinedData.organization_settings?.seo_meta_description ??
              null
          };

          sessionStorage.setItem(storeKey, JSON.stringify(minimalSnapshot));
        } catch (sessionError) {
          console.warn('⚠️ [EarlyPreload] فشل في حفظ البيانات في sessionStorage:', sessionError);
        }

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

        // 🔥 إعادة استدعاء FaviconManager بعد تحميل البيانات (أسرع الآن لأننا لا ننتظر المنتج)
        setTimeout(() => {
          try {
            // استخدام import() بدلاً من require في ES modules
            import('../managers/FaviconManager').then(({ faviconManager }) => {
              faviconManager.initialize();
            }).catch(error => {
              console.warn('⚠️ [EarlyPreload] فشل إعادة استدعاء FaviconManager:', error);
            });
          } catch (error) {
            console.warn('⚠️ [EarlyPreload] خطأ في إعادة استدعاء FaviconManager:', error);
          }
        }, 10); // تقليل من 100ms إلى 10ms لتسريع أكبر

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
   * فحص إذا كنا في بيئة الإنتاج - محسّن للكشف الدقيق
   */
  private isProductionEnvironment(): boolean {
    const hostname = window.location.hostname;

    // النطاقات المحلية
    const localhostDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1'
    ];

    // فحص إذا كان نطاق محلي
    const isLocalhost = localhostDomains.some(domain =>
      hostname === domain ||
      hostname.startsWith(`${domain}:`) ||
      hostname.includes(`.${domain}`)
    );

    // إذا كان محلياً، ليس إنتاج
    if (isLocalhost) {
      return false;
    }

    // النطاقات العامة المعروفة
    const publicDomains = [
      '.com',
      '.online',
      '.org',
      '.net',
      '.store',
      '.shop',
      '.io',
      '.app'
    ];

    // فحص إذا كان نطاق عام
    const isPublicDomain = publicDomains.some(domain => hostname.includes(domain));

    // إذا كان نطاق عام، نفترض أنه إنتاج
    if (isPublicDomain) {
      return true;
    }

    // في حالة الشك، فحص import.meta.env
    return import.meta.env.PROD || false;
  }

  /**
   * فحص إذا كان النطاق الحالي نطاق مخصص - محسّن للكشف الدقيق
   */
  private isCustomDomain(): boolean {
    const hostname = window.location.hostname;

    // النطاقات المحلية ليست مخصصة
    if (hostname.includes('localhost') ||
        hostname.includes('127.0.0.1') ||
        hostname.includes('0.0.0.0')) {
      return false;
    }

    // النطاقات الأساسية للمنصة
    const baseDomains = [
      '.ktobi.online',
      '.stockiha.com',
      '.bazaar.dev',
      '.bazaar.com',
      '.vercel.app',
      '.netlify.app'
    ];

    // فحص إذا كان النطاق ينتمي لأحد النطاقات الأساسية
    const isBaseDomain = baseDomains.some(baseDomain => hostname.endsWith(baseDomain));

    // فحص إذا كان نطاق فرعي
    const isSubdomain = this.isSubdomain();

    // النطاق مخصص إذا لم يكن أساسي وليس فرعي
    return !isBaseDomain && !isSubdomain;
  }

  /**
   * فحص إذا كان النطاق الحالي نطاق فرعي
   */
  private isSubdomain(): boolean {
    const hostname = window.location.hostname;

    // النطاقات المحلية مع subdomain
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const parts = hostname.split('.');
      // localhost:8080 أو subdomain.localhost:8080
      return parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127';
    }

    // النطاقات الفرعية للمنصة
    const subdomainPatterns = [
      '.stockiha.com',
      '.ktobi.online',
      '.bazaar.dev',
      '.bazaar.com'
    ];

    return subdomainPatterns.some(pattern => {
      if (hostname.endsWith(pattern)) {
        const parts = hostname.replace(pattern, '').split('.');
        return parts.length >= 2 && parts[0] && parts[0] !== 'www';
      }
      return false;
    });
  }

  /**
   * إعادة المحاولة في الخلفية مع استراتيجية ذكية
   */
  private async retryInBackground(storeApiPromise: Promise<any>, storeIdentifier: string, domainType: string, productSlug?: string): Promise<void> {
    // لا نعرض رسالة الإعادة المحاولة للمستخدم
    // بدلاً من ذلك، نعطي فرصة أكبر للشبكة البطيئة

    setTimeout(async () => {
      try {
        if (isDevEnvironment) {
          console.log('🔄 [EarlyPreload] إعادة محاولة التحميل مع timeout ثابت');
        }

        const retryTimeout = 5000; // حد ثابت للإعادة المحاولة
        const retryPromise = storeApiPromise;
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'Retry timeout exceeded' }), retryTimeout)
        );

        const retryResult = await Promise.race([retryPromise, timeoutPromise]);

        if ((retryResult as any).success) {
          if (isDevEnvironment) {
            console.log('✅ [EarlyPreload] نجح التحميل المحسن للشبكات البطيئة');
          }

          // معالجة البيانات كما في التنفيذ الأصلي
          const orgId = (retryResult as any).data?.organization_details?.id || (retryResult as any).data?.organization?.id || null;
          if (orgId) {
            CacheManager.setFastOrgId(storeIdentifier, orgId);
          }

          // تحميل المنتج إذا كان مطلوباً
          if (productSlug && orgId) {
            try {
              await ProductLoader.preloadSpecificProduct(productSlug, storeIdentifier);
            } catch (err) {
              console.warn('⚠️ [EarlyPreload] فشل تحميل المنتج في إعادة المحاولة:', err);
            }
          }

          // حفظ البيانات في cache
          CacheManager.setCacheData(storeIdentifier, (retryResult as any).data, performance.now(), domainType);

          // حفظ البيانات في window object للوصول السريع
          (window as any).__EARLY_STORE_DATA__ = {
            data: (retryResult as any).data,
            timestamp: Date.now(),
            source: 'early_preload_retry'
          };

          if (isDevEnvironment) {
            console.log('💾 [EarlyPreload] حفظ البيانات في window object من retry:', {
              hasData: true,
              dataSize: JSON.stringify((retryResult as any).data).length,
              source: 'early_preload_retry'
            });
          }

          // إرسال حدث للإعلام
          window.dispatchEvent(new CustomEvent('earlyPreloadComplete', {
            detail: {
              storeIdentifier,
              data: (retryResult as any).data,
              executionTime: performance.now(),
              domainType,
              isRetrySuccess: true
            }
          }));

        } else {
          console.warn('⚠️ [EarlyPreload] فشل التحميل المحسن للشبكات البطيئة');
        }
      } catch (error) {
        console.warn('⚠️ [EarlyPreload] خطأ في إعادة المحاولة:', error);
      }
    }, 100); // انتظار قصير قبل البدء
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
