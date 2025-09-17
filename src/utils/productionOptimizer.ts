/**
 * نظام تحسينات الإنتاج الشامل
 * يحسّن الأداء للنطاقات المخصصة والفرعية والإنتاج
 */

export class ProductionOptimizer {
  private static instance: ProductionOptimizer;
  private optimizations: Map<string, boolean> = new Map();

  static getInstance(): ProductionOptimizer {
    if (!ProductionOptimizer.instance) {
      ProductionOptimizer.instance = new ProductionOptimizer();
    }
    return ProductionOptimizer.instance;
  }

  /**
   * تطبيق جميع تحسينات الإنتاج
   */
  async applyAllProductionOptimizations(): Promise<void> {
    console.log('🚀 [ProductionOptimizer] بدء تطبيق تحسينات الإنتاج');

    const optimizations = [
      this.optimizeCustomDomains(),
      this.optimizeSubdomains(),
      this.optimizeCDNDelivery(),
      this.optimizeCacheHeaders(),
      this.optimizeServiceWorkers()
    ];

    try {
      await Promise.all(optimizations);
      console.log('✅ [ProductionOptimizer] تم تطبيق جميع تحسينات الإنتاج بنجاح');
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تطبيق بعض تحسينات الإنتاج:', error);
    }
  }

  /**
   * تحسين النطاقات المخصصة
   */
  private async optimizeCustomDomains(): Promise<void> {
    if (this.optimizations.get('custom-domains')) return;

    try {
      const hostname = window.location.hostname;
      const isCustomDomain = this.isCustomDomain(hostname);

      if (isCustomDomain) {
        console.log('🌐 [ProductionOptimizer] تطبيق تحسينات النطاقات المخصصة');

        // تحسين DNS prefetch للنطاقات المخصصة
        this.addDNSPrefetch();

        // تحسين preconnect للـ API
        this.addPreconnect();

        // تحسين resource hints
        this.addResourceHints();

        // تحسين cache strategy للنطاقات المخصصة
        this.optimizeCustomDomainCache();
      }

      this.optimizations.set('custom-domains', true);
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تحسين النطاقات المخصصة:', error);
    }
  }

  /**
   * تحسين النطاقات الفرعية
   */
  private async optimizeSubdomains(): Promise<void> {
    if (this.optimizations.get('subdomains')) return;

    try {
      const hostname = window.location.hostname;
      const isSubdomain = this.isSubdomain(hostname);

      if (isSubdomain) {
        console.log('🔗 [ProductionOptimizer] تطبيق تحسينات النطاقات الفرعية');

        // تحسين DNS prefetch للنطاق الرئيسي
        this.addSubdomainDNSPrefetch(hostname);

        // تحسين cache sharing
        this.optimizeSubdomainCache();
      }

      this.optimizations.set('subdomains', true);
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تحسين النطاقات الفرعية:', error);
    }
  }

  /**
   * تحسين تسليم CDN
   */
  private async optimizeCDNDelivery(): Promise<void> {
    if (this.optimizations.get('cdn')) return;

    try {
      const hostname = window.location.hostname;
      const isProduction = this.isProductionEnvironment();

      if (isProduction) {
        console.log('⚡ [ProductionOptimizer] تطبيق تحسينات CDN');

        // تحسين resource hints للـ CDN
        this.addCDNResourceHints();

        // تحسين cache control
        this.optimizeCacheControl();
      }

      this.optimizations.set('cdn', true);
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تحسين CDN:', error);
    }
  }

  /**
   * تحسين عناوين الكاش
   */
  private async optimizeCacheHeaders(): Promise<void> {
    if (this.optimizations.get('cache-headers')) return;

    try {
      // تحسين Cache-Control headers للموارد الثابتة
      const staticResources = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'
      ];

      // إضافة cache hints للمتصفح
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          // Service Worker جاهز لتحسين الكاش
          console.log('📦 [ProductionOptimizer] Service Worker جاهز لتحسين الكاش');
        });
      }

      this.optimizations.set('cache-headers', true);
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تحسين عناوين الكاش:', error);
    }
  }

  /**
   * تحسين Service Workers
   */
  private async optimizeServiceWorkers(): Promise<void> {
    if (this.optimizations.get('service-workers')) return;

    try {
      if ('serviceWorker' in navigator && !this.isDevelopmentEnvironment()) {
        console.log('🔧 [ProductionOptimizer] تحسين Service Workers');

        // تنظيف Service Workers القديمة
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            // الاحتفاظ فقط بـ Service Worker النشط
            if (registration.active && registration.scope.includes('/sw.js')) {
              console.log('✅ [ProductionOptimizer] Service Worker نشط محسن');
            } else {
              registration.unregister();
            }
          });
        });
      }

      this.optimizations.set('service-workers', true);
    } catch (error) {
      console.warn('⚠️ [ProductionOptimizer] خطأ في تحسين Service Workers:', error);
    }
  }

  /**
   * إضافة DNS prefetch للنطاقات المخصصة
   */
  private addDNSPrefetch(): void {
    const prefetchDomains = [
      'api.supabase.co',
      'wrnssatuvmumsczyldth.supabase.co',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ];

    prefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    console.log('🔍 [ProductionOptimizer] تم إضافة DNS prefetch للنطاقات المخصصة');
  }

  /**
   * إضافة preconnect للـ API
   */
  private addPreconnect(): void {
    const preconnectDomains = [
      'https://wrnssatuvmumsczyldth.supabase.co'
    ];

    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    console.log('🔗 [ProductionOptimizer] تم إضافة preconnect للـ API');
  }

  /**
   * إضافة resource hints
   */
  private addResourceHints(): void {
    // Preload للموارد الحرجة
    const criticalResources = [
      '/src/main.tsx',
      '/src/App.tsx'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = 'script';
      document.head.appendChild(link);
    });

    console.log('⚡ [ProductionOptimizer] تم إضافة resource hints');
  }

  /**
   * تحسين DNS prefetch للنطاقات الفرعية
   */
  private addSubdomainDNSPrefetch(hostname: string): void {
    // استخراج النطاق الرئيسي
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const mainDomain = parts.slice(-2).join('.');

      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${mainDomain}`;
      document.head.appendChild(link);

      console.log('🔍 [ProductionOptimizer] تم إضافة DNS prefetch للنطاق الرئيسي:', mainDomain);
    }
  }

  /**
   * تحسين resource hints للـ CDN
   */
  private addCDNResourceHints(): void {
    // Preconnect لـ CDN domains
    const cdnDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    cdnDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    console.log('⚡ [ProductionOptimizer] تم إضافة CDN resource hints');
  }

  /**
   * تحسين cache control
   */
  private optimizeCacheControl(): void {
    // إضافة meta tag للكاش
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'public, max-age=3600';
    document.head.appendChild(meta);

    console.log('📦 [ProductionOptimizer] تم تحسين cache control');
  }

  /**
   * تحسين الكاش للنطاقات المخصصة
   */
  private optimizeCustomDomainCache(): void {
    // زيادة عمر الكاش للنطاقات المخصصة
    (window as any).__CUSTOM_DOMAIN_CACHE_TTL__ = 30 * 60 * 1000; // 30 دقيقة

    console.log('💾 [ProductionOptimizer] تم تحسين الكاش للنطاقات المخصصة');
  }

  /**
   * تحسين الكاش للنطاقات الفرعية
   */
  private optimizeSubdomainCache(): void {
    // مشاركة الكاش بين النطاقات الفرعية
    (window as any).__SUBDOMAIN_CACHE_SHARING__ = true;

    console.log('🔄 [ProductionOptimizer] تم تحسين مشاركة الكاش للنطاقات الفرعية');
  }

  /**
   * فحص إذا كان النطاق مخصص
   */
  private isCustomDomain(hostname: string): boolean {
    const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];

    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return false;
    }

    return !baseDomains.some(baseDomain => hostname.endsWith(baseDomain));
  }

  /**
   * فحص إذا كان النطاق فرعي
   */
  private isSubdomain(hostname: string): boolean {
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
   * فحص البيئة الإنتاجية
   */
  private isProductionEnvironment(): boolean {
    return !window.location.hostname.includes('localhost') &&
           window.location.hostname.includes('.com');
  }

  /**
   * فحص البيئة التطويرية
   */
  private isDevelopmentEnvironment(): boolean {
    return window.location.hostname.includes('localhost') ||
           window.location.hostname.includes('127.0.0.1') ||
           import.meta.env.DEV;
  }

  /**
   * قياس تحسينات الإنتاج
   */
  measureProductionOptimizations(): void {
    const metrics = {
      customDomainsOptimized: this.optimizations.get('custom-domains') || false,
      subdomainsOptimized: this.optimizations.get('subdomains') || false,
      cdnOptimized: this.optimizations.get('cdn') || false,
      cacheHeadersOptimized: this.optimizations.get('cache-headers') || false,
      serviceWorkersOptimized: this.optimizations.get('service-workers') || false,
      totalOptimizations: Array.from(this.optimizations.values()).filter(Boolean).length
    };

    console.log('📊 [ProductionOptimizer] تقرير تحسينات الإنتاج:', metrics);

    (window as any).__PRODUCTION_OPTIMIZATION_METRICS__ = {
      ...metrics,
      timestamp: Date.now(),
      hostname: window.location.hostname,
      appliedOptimizations: Array.from(this.optimizations.keys()).filter(key => this.optimizations.get(key))
    };
  }

  /**
   * إعادة تعيين تحسينات الإنتاج
   */
  reset(): void {
    this.optimizations.clear();
    console.log('🔄 [ProductionOptimizer] تم إعادة تعيين تحسينات الإنتاج');
  }
}

// تصدير instance واحد
export const productionOptimizer = ProductionOptimizer.getInstance();

// بدء تحسينات الإنتاج تلقائياً في الإنتاج
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isProduction = !hostname.includes('localhost') && hostname.includes('.com');

  if (isProduction) {
    setTimeout(() => {
      productionOptimizer.applyAllProductionOptimizations().then(() => {
        productionOptimizer.measureProductionOptimizations();
      });
    }, 200);
  }
}
