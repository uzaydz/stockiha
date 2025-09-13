// Product Page Optimizer - محسن خاص لصفحات المنتجات
// يركز على تحميل المكونات المطلوبة فقط لصفحات المنتجات

interface ProductPageOptimizationConfig {
  enableConversionTracking: boolean;
  enableAnalytics: boolean;
  enableFormOptimization: boolean;
  preloadThankYouPage: boolean;
  preloadCheckoutFlow: boolean;
}

class ProductPageOptimizer {
  private config: ProductPageOptimizationConfig;
  private isProductPage: boolean = false;
  private hasOptimized: boolean = false;
  private optimizationStartTime: number = 0;

  constructor(config?: Partial<ProductPageOptimizationConfig>) {
    this.config = {
      enableConversionTracking: true,
      enableAnalytics: true,
      enableFormOptimization: true,
      preloadThankYouPage: true,
      preloadCheckoutFlow: true,
      ...config
    };

    this.detectProductPage();
    this.initializeOptimization();
  }

  private detectProductPage(): void {
    const pathname = window.location.pathname;
    this.isProductPage = pathname.includes('/product-purchase-max-v3/') ||
                        pathname.includes('/product-purchase-max-v2/') ||
                        pathname.includes('/product-purchase/') ||
                        pathname.includes('/product/');
  }

  private initializeOptimization(): void {
    if (!this.isProductPage) return;

    this.optimizationStartTime = performance.now();
    
    // تنظيف memory من المكونات غير المستخدمة
    this.cleanupUnusedComponents();
    
    // تحسين CSS loading
    this.optimizeCSS();
    
    // تحسين JavaScript loading
    this.optimizeJavaScript();
    
    // تحميل مكونات المنتج الأساسية فقط
    this.preloadEssentialProductComponents();
    
    this.hasOptimized = true;
    
    const optimizationTime = performance.now() - this.optimizationStartTime;
    
  }

  private cleanupUnusedComponents(): void {
    // إزالة event listeners غير المستخدمة
    try {
      // تنظيف dashboard-related event listeners
      window.removeEventListener('dashboard-ready', () => {});
      window.removeEventListener('pos-system-ready', () => {});
      
      // تنظيف POS-related memory
      const posContext = (window as any).__POS_CONTEXT__;
      if (posContext) {
        delete (window as any).__POS_CONTEXT__;
      }

      // تنظيف store editor memory
      const storeEditorState = (window as any).__STORE_EDITOR_STATE__;
      if (storeEditorState) {
        delete (window as any).__STORE_EDITOR_STATE__;
      }

    } catch (error) {
      console.warn('تحذير: فشل في تنظيف بعض المكونات:', error);
    }
  }

  private optimizeCSS(): void {
    try {
      // إزالة CSS غير المستخدم للوحة التحكم
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
      stylesheets.forEach(link => {
        const href = (link as HTMLLinkElement).href;
        
        // تحديد CSS غير الضروري لصفحة المنتج
        const unnecessaryCSS = [
          'dashboard',
          'pos-system',
          'store-editor',
          'admin-panel',
          'charts',
          'analytics-dashboard'
        ];
        
        if (unnecessaryCSS.some(pattern => href.includes(pattern))) {
          // تأخير تحميل هذا CSS حتى يُطلب
          (link as HTMLLinkElement).media = 'print';
          (link as HTMLLinkElement).onload = function() {
            this.media = 'all';
          };
        }
      });

    } catch (error) {
      console.warn('تحذير: فشل في تحسين CSS:', error);
    }
  }

  private optimizeJavaScript(): void {
    try {
      // منع تحميل JavaScript modules غير الضرورية
      const moduleIntercept = (originalImport: any) => {
        return function(this: any, specifier: string) {
          // قائمة الmodules غير الضرورية لصفحة المنتج
          const unnecessaryModules = [
            'POSOptimized',
            'StoreEditor',
            'QuickExpenseDialog',
            'RepairOrderPrint',
            'AnalyticsDashboard',
            'FinancialReports'
          ];

          if (unnecessaryModules.some(module => specifier.includes(module))) {
            
            
            // إرجاع empty module بدلاً من التحميل
            return Promise.resolve({
              default: () => null,
              __esModule: true
            });
          }

          return originalImport.call(this, specifier);
        };
      };

      // تطبيق intercept على dynamic imports
      if (typeof window !== 'undefined' && (window as any).importShim) {
        (window as any).importShim = moduleIntercept((window as any).importShim);
      }

    } catch (error) {
      console.warn('تحذير: فشل في تحسين JavaScript:', error);
    }
  }

  private async preloadEssentialProductComponents(): Promise<void> {
    if (!this.config.enableFormOptimization) return;

    try {
      // تحميل مكونات المنتج الأساسية فقط
      const essentialComponents = [
        // Form components للطلبيات - استخدام مسارات صحيحة
        () => import('@/components/store/OrderForm').catch(() => ({})),
        
        // Product form components
        () => import('@/components/product/ProductFormRenderer').catch(() => ({})),
        
        // UI components الأساسية
        () => import('@/components/ui/button').catch(() => ({})),
      ];

      // تحميل متوازي للمكونات الأساسية
      await Promise.allSettled(essentialComponents.map(component => component()));

      // تحميل مكونات إضافية بناءً على التفاعل
      this.setupLazyComponentLoading();

    } catch (error) {
      console.warn('تحذير: فشل في تحميل بعض المكونات الأساسية:', error);
    }
  }

  private setupLazyComponentLoading(): void {
    // تحميل thank you page عند بدء عملية الشراء
    const buyButtons = document.querySelectorAll('[data-action="buy-now"], .buy-now-button');
    buyButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (this.config.preloadThankYouPage) {
          import('@/pages/ThankYouPage').catch(() => {});
        }
      }, { once: true, passive: true });
    });

    // تحميل checkout flow عند إضافة للسلة
    const cartButtons = document.querySelectorAll('[data-action="add-to-cart"], .add-to-cart-button');
    cartButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (this.config.preloadCheckoutFlow) {
          import('@/pages/CartCheckoutPage').catch(() => {});
        }
      }, { once: true, passive: true });
    });

    // تحميل conversion tracking عند بدء ملء النموذج
    const formInputs = document.querySelectorAll('input[type="text"], input[type="tel"], textarea');
    let hasStartedForm = false;
    
    formInputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (!hasStartedForm && this.config.enableConversionTracking) {
          hasStartedForm = true;
          import('@/lib/conversion-tracking/ConversionTracker').catch(() => {});
        }
      }, { once: true, passive: true });
    });
  }

  // تفعيل analytics فقط عند الحاجة
  public enableAnalytics(): void {
    if (!this.config.enableAnalytics || !this.isProductPage) return;

    // تحميل analytics components إذا وُجدت
    import('@/components/tracking/ProductConversionTracker').then(module => {
      
    }).catch(() => {
      console.warn('تحذير: فشل في تحميل conversion tracking');
    });

    // تحميل visitor analytics إذا وُجدت
    import('@/components/analytics/VisitorAnalyticsDisplay').then(module => {
      
    }).catch(() => {
      console.warn('تحذير: فشل في تحميل visitor analytics');
    });
  }

  // تنظيف عند مغادرة صفحة المنتج
  public cleanup(): void {
    if (!this.hasOptimized) return;

    try {
      // إزالة event listeners المؤقتة
      const buttons = document.querySelectorAll('[data-optimized-listener]');
      buttons.forEach(button => {
        button.removeAttribute('data-optimized-listener');
      });

      
    } catch (error) {
      console.warn('تحذير في التنظيف:', error);
    }
  }

  // إحصائيات الأداء
  public getPerformanceStats(): object {
    return {
      isProductPage: this.isProductPage,
      hasOptimized: this.hasOptimized,
      optimizationTime: this.hasOptimized ? performance.now() - this.optimizationStartTime : 0,
      config: this.config
    };
  }
}

// إنشاء instance عام
export const productPageOptimizer = new ProductPageOptimizer();

// وظائف مساعدة للاستخدام في المكونات
export const optimizeProductPage = (config?: Partial<ProductPageOptimizationConfig>) => {
  return new ProductPageOptimizer(config);
};

export const enableProductAnalytics = () => {
  productPageOptimizer.enableAnalytics();
};

export const cleanupProductOptimization = () => {
  productPageOptimizer.cleanup();
};

export default productPageOptimizer;
