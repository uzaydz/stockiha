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

      // استدعاء واحد فقط لتهيئة المتجر (منع التكرار) - مع timeout محسّن للشبكات البطيئة
      const storeApiPromise = ApiClient.callStoreInitAPI(storeIdentifier, domainType);

      // تحديد timeout محسّن حسب البيئة والشبكة والنطاق
      const networkSpeed = this.detectNetworkSpeed();
      const isProduction = this.isProductionEnvironment();
      const isCustomDomain = this.isCustomDomain();

      let networkTimeout = 1500; // default محسّن للإنتاج

      // تخصيص timeout حسب البيئة والنطاق
      if (isCustomDomain) {
        // النطاقات المخصصة تحتاج وقت أطول للتحليل DNS
        networkTimeout = isProduction ? 2000 : 3000;
      } else if (isProduction) {
        // الإنتاج مع CDN أسرع
        networkTimeout = 1000;
      }

      const isSubdomain = this.isSubdomain();
      console.log('🔍 [EarlyPreload] كشف سرعة الشبكة والبيئة:', {
        networkSpeed,
        isProduction,
        isCustomDomain,
        isSubdomain,
        domainType: isCustomDomain ? 'custom' : isSubdomain ? 'subdomain' : 'base',
        timeout: networkTimeout + 'ms'
      });

      // تحسين timeout حسب نوع النطاق في الإنتاج
      if (isProduction) {
        if (isCustomDomain) {
          // النطاقات المخصصة تحتاج وقت أطول للتحليل DNS
          networkTimeout = Math.max(networkTimeout, 2000);
          console.log('🌐 [EarlyPreload] نطاق مخصص - timeout محسّن للـ DNS:', networkTimeout + 'ms');
        } else if (isSubdomain) {
          // النطاقات الفرعية أسرع
          networkTimeout = Math.min(networkTimeout, 1000);
          console.log('🔗 [EarlyPreload] نطاق فرعي - timeout محسّن:', networkTimeout + 'ms');
        }
      }

      // تعديل حسب سرعة الشبكة
      if (networkSpeed === 'slow') {
        networkTimeout = Math.max(networkTimeout, 3000); // حد أدنى 3 ثوانٍ للبطيئة
        console.log('🔄 [EarlyPreload] شبكة بطيئة - timeout مُعدل:', networkTimeout + 'ms');
      } else if (networkSpeed === 'very_slow') {
        networkTimeout = Math.max(networkTimeout, 6000); // حد أدنى 6 ثوانٍ للبطيئة جداً
        console.log('🐌 [EarlyPreload] شبكة بطيئة جداً - timeout مُعدل:', networkTimeout + 'ms');
      } else if (networkSpeed === 'fast') {
        networkTimeout = Math.min(networkTimeout, 800); // حد أقصى 800ms للسريعة
        console.log('🚀 [EarlyPreload] شبكة سريعة - timeout محسّن:', networkTimeout + 'ms');
      }

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'Timeout - will retry in background', data: null }), networkTimeout)
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
        let combinedData = (response as any).data;
        
        if (productResponse && productResponse.status === 'fulfilled' && (productResponse as any).value?.success) {
          combinedData = {
            ...(response as any).data,
            preloaded_product: (productResponse as any).value.data,
            product_preload_time: (productResponse as any).value.executionTime || 0
          };
        }
        
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

        // 🔥 إضافة: حفظ البيانات في sessionStorage للاستمرارية عند التنقل بين الصفحات
        try {
          const hostname = window.location.hostname;
          // استخدام نفس المنطق المستخدم في FaviconManager للتطابق
          const storeKey = `store_${storeIdentifier}`;
          const sessionData = {
            data: combinedData,
            timestamp: Date.now(),
            source: 'early_preload_success',
            hostname: hostname,
            storeIdentifier: storeIdentifier,
            // إضافة البيانات المباشرة للوصول السريع
            favicon_url: combinedData.organization_settings?.favicon_url,
            logo_url: combinedData.organization_settings?.logo_url,
            site_name: combinedData.organization_settings?.site_name,
            name: combinedData.organization_details?.name
          };

          sessionStorage.setItem(storeKey, JSON.stringify(sessionData));
          console.log('💾 [EarlyPreload] حفظ البيانات في sessionStorage:', {
            key: storeKey,
            hasFavicon: !!sessionData.favicon_url,
            hasLogo: !!sessionData.logo_url,
            hasSiteName: !!sessionData.site_name,
            hasName: !!sessionData.name
          });
        } catch (sessionError) {
          console.warn('⚠️ [EarlyPreload] فشل في حفظ البيانات في sessionStorage:', sessionError);
        }

        console.log('💾 [EarlyPreload] حفظ البيانات في window object و sessionStorage:', {
          hasData: true,
          dataSize: JSON.stringify(combinedData).length,
          source: 'early_preload_success'
        });

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

        // 🔥 إعادة استدعاء FaviconManager بعد تحميل البيانات
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
        }, 100);

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
   * كشف سرعة الشبكة لتحديد timeout مناسب (محسن للإنتاج والنطاقات المخصصة)
   */
  private detectNetworkSpeed(): 'very_slow' | 'slow' | 'fast' {
    try {
      // فحص البيئة - الإنتاج عادة أسرع من التطوير
      const isProduction = this.isProductionEnvironment();

      // فحص navigator.connection إذا متوفر
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink || 0;

        // شبكات بطيئة جداً
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          return 'very_slow';
        }

        // شبكات بطيئة (3G أو 4G بطيئة)
        if (effectiveType === '3g' || (effectiveType === '4g' && downlink < 0.5)) {
          return 'slow';
        }

        // شبكات سريعة نسبياً
        if (effectiveType === '4g' && downlink >= 0.5) {
          // في الإنتاج، نفترض سرعة أعلى بسبب CDN
          return isProduction && downlink >= 1 ? 'fast' : 'slow';
        }

        // 5G أو شبكات أسرع
        if (effectiveType === '5g' || downlink >= 5) {
          return 'fast';
        }
      }

      // فحص navigator.onLine - إذا لم يكن متصلاً، نفترض بطيئة جداً
      if (!navigator.onLine) {
        return 'very_slow';
      }

      // فحص User-Agent للكشف عن الأجهزة المحمولة
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile') || userAgent.includes('android') ||
          userAgent.includes('iphone') || userAgent.includes('ipad')) {

        // في الإنتاج مع CDN، المحمول أسرع
        if (isProduction) {
          return connection?.downlink >= 0.5 ? 'slow' : 'very_slow';
        }

        // في التطوير، المحمول غالباً أبطأ
        return 'slow';
      }

      // فحص النطاق - النطاقات المخصصة قد تكون أبطأ
      const isCustomDomain = this.isCustomDomain();
      if (isCustomDomain) {
        // النطاقات المخصصة قد تحتاج وقت أطول للتحليل DNS
        return isProduction ? 'slow' : 'very_slow';
      }

      // الافتراضي - في الإنتاج نفترض سرعة أفضل
      return isProduction ? 'fast' : 'slow';
    } catch {
      // في حالة خطأ، نفترض بطيئة للأمان
      return 'slow';
    }
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
        console.log('🔄 [EarlyPreload] محاولة تحميل محسنة للشبكات البطيئة');

        // إعادة المحاولة بدون timeout (لكن مع حد أقصى محسّن للشبكات البطيئة)
        const networkSpeed = this.detectNetworkSpeed();
        let maxRetryTime = 20000; // default 20 ثانية

        console.log('🔍 [EarlyPreload] كشف سرعة الشبكة:', networkSpeed);

        if (networkSpeed === 'slow') {
          maxRetryTime = 15000; // 15 ثانية للشبكات البطيئة (تقليل من 60 ثانية)
          console.log('🔄 [EarlyPreload] استخدام timeout للشبكات البطيئة:', maxRetryTime + 'ms');
        } else if (networkSpeed === 'very_slow') {
          maxRetryTime = 30000; // 30 ثانية للشبكات البطيئة جداً (تقليل من 120 ثانية)
          console.log('🐌 [EarlyPreload] استخدام timeout للشبكات البطيئة جداً:', maxRetryTime + 'ms');
        } else {
          maxRetryTime = 8000; // 8 ثانية للشبكات السريعة (تقليل من 15 ثانية)
          console.log('🚀 [EarlyPreload] استخدام timeout محسّن للشبكات السريعة:', maxRetryTime + 'ms');
        }

        console.log('🔄 [EarlyPreload] إعادة المحاولة مع timeout محسّن:', maxRetryTime + 'ms');

        // تحسين: استخدام timeout أقصر للإعادة المحاولة
        const retryTimeout = Math.min(maxRetryTime, 5000); // حد أقصى 5 ثوانٍ للإعادة المحاولة
        const retryPromise = storeApiPromise;
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'Retry timeout exceeded' }), retryTimeout)
        );

        const retryResult = await Promise.race([retryPromise, timeoutPromise]);

        if ((retryResult as any).success) {
          console.log('✅ [EarlyPreload] نجح التحميل المحسن للشبكات البطيئة');

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

          console.log('💾 [EarlyPreload] حفظ البيانات في window object من retry:', {
            hasData: true,
            dataSize: JSON.stringify((retryResult as any).data).length,
            source: 'early_preload_retry'
          });

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
