// Conditional Preloader - يحمل المكونات فقط عند الحاجة إليها
// بديل محسن لـ Strategic Preloader للتحكم في التحميل حسب السياق

interface PreloadCondition {
  shouldPreload: () => boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface ConditionalPreloadMap {
  route: string;
  component: () => Promise<any>;
  condition: PreloadCondition;
  dependencies?: (() => Promise<any>)[];
  delay?: number;
}

class ConditionalPreloader {
  private preloadMap: Map<string, ConditionalPreloadMap> = new Map();
  private loadedComponents: Set<string> = new Set();
  private loadingComponents: Set<string> = new Set();
  private userHasInteracted = false;

  constructor() {
    this.setupConditionalPreloading();
    this.initializeUserInteractionTracking();
  }

  private initializeUserInteractionTracking() {
    const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    
    const handleInteraction = () => {
      if (!this.userHasInteracted) {
        this.userHasInteracted = true;
        this.evaluateAndPreload();
      }
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleInteraction, { 
        once: true, 
        passive: true 
      });
    });
  }

  private setupConditionalPreloading() {
    const conditionalMaps: ConditionalPreloadMap[] = [
      // Dashboard components - فقط إذا كان المستخدم مصادق عليه وليس في صفحة منتج
      {
        route: '/dashboard',
        component: () => import('../pages/Dashboard'),
        condition: {
          shouldPreload: () => this.isAuthenticatedUser() && !this.isOnProductPage(),
          priority: 'high'
        },
        delay: 2000
      },
      
      // POS components - فقط إذا كان له صلاحية POS وليس في صفحة منتج
      {
        route: '/pos',
        component: () => import('../pages/POSOptimized'),
        condition: {
          shouldPreload: () => this.hasPOSPermission() && !this.isOnProductPage(),
          priority: 'medium'
        },
        dependencies: [
          () => import('../context/POSDataContext'),
          () => import('../components/pos/QuickExpenseDialog')
        ],
        delay: 3000
      },

      // Store Editor - فقط إذا كان له صلاحية التحرير وليس في صفحة منتج
      {
        route: '/store-editor',
        component: () => import('../pages/admin/StoreEditor'),
        condition: {
          shouldPreload: () => this.hasStoreEditPermission() && !this.isOnProductPage(),
          priority: 'low'
        },
        delay: 5000
      },

      // Product management - فقط إذا كان في لوحة التحكم
      {
        route: '/dashboard/products',
        component: () => import('../pages/dashboard/ProductsCached'),
        condition: {
          shouldPreload: () => this.isOnDashboard() && !this.isOnProductPage(),
          priority: 'medium'
        },
        dependencies: [
          () => import('@tanstack/react-table'),
          () => import('lucide-react')
        ],
        delay: 1500
      }
    ];

    conditionalMaps.forEach(map => {
      this.preloadMap.set(map.route, map);
    });
  }

  private isOnProductPage(): boolean {
    const pathname = (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/'))
      ? window.location.hash.slice(1)
      : window.location.pathname;
    return pathname.includes('/product-purchase-max-v3/') ||
           pathname.includes('/product-purchase-max-v2/') ||
           pathname.includes('/product-purchase/') ||
           pathname.includes('/product/');
  }

  private isOnDashboard(): boolean {
    const pathname = (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/'))
      ? window.location.hash.slice(1)
      : window.location.pathname;
    return pathname.startsWith('/dashboard');
  }

  private isAuthenticatedUser(): boolean {
    // فحص بسيط للتوثيق من localStorage
    try {
      const authData = localStorage.getItem('supabase.auth.token') || 
                     localStorage.getItem('bazaar_auth_user');
      return !!authData;
    } catch {
      return false;
    }
  }

  private hasPOSPermission(): boolean {
    try {
      const permissions = localStorage.getItem('user_permissions');
      if (!permissions) return false;
      const perms = JSON.parse(permissions);
      return perms.includes('accessPOS') || perms.includes('usePOS');
    } catch {
      return false;
    }
  }

  private hasStoreEditPermission(): boolean {
    try {
      const permissions = localStorage.getItem('user_permissions');
      if (!permissions) return false;
      const perms = JSON.parse(permissions);
      return perms.includes('editStore') || perms.includes('manageStore');
    } catch {
      return false;
    }
  }

  private async evaluateAndPreload() {
    if (!this.userHasInteracted) return;

    const currentTime = performance.now();
    
    for (const [route, config] of this.preloadMap) {
      if (this.loadedComponents.has(route) || this.loadingComponents.has(route)) {
        continue;
      }

      if (config.condition.shouldPreload()) {
        const delay = config.delay || 0;
        
        setTimeout(() => {
          this.preloadComponent(route, config);
        }, delay);
      }
    }
  }

  private async preloadComponent(route: string, config: ConditionalPreloadMap) {
    if (this.loadedComponents.has(route) || this.loadingComponents.has(route)) {
      return;
    }

    this.loadingComponents.add(route);

    try {
      // تحميل المكون الرئيسي
      await config.component();
      
      // تحميل المتطلبات إذا وُجدت
      if (config.dependencies) {
        const dependencyPromises = config.dependencies.map(dep => 
          dep().catch(() => {}) // تجاهل أخطاء المتطلبات
        );
        await Promise.allSettled(dependencyPromises);
      }

      this.loadedComponents.add(route);
      
    } catch (error) {
      console.warn(`⚠️ فشل في تحميل ${route} مسبقاً:`, error);
    } finally {
      this.loadingComponents.delete(route);
    }
  }

  // إيقاف التحميل المسبق (مفيد في صفحات المنتجات)
  public pausePreloading() {
    this.userHasInteracted = false;
  }

  // استكمال التحميل المسبق
  public resumePreloading() {
    if (!this.userHasInteracted) {
      this.userHasInteracted = true;
      setTimeout(() => this.evaluateAndPreload(), 1000);
    }
  }

  // فرض التحميل المسبق لمكون معين
  public forcePreload(route: string) {
    const config = this.preloadMap.get(route);
    if (config) {
      this.preloadComponent(route, config);
    }
  }
}

// إنشاء instance واحد للتطبيق
export const conditionalPreloader = new ConditionalPreloader();

// تصدير default للتوافق مع الاستيراد
export default conditionalPreloader;

// وظائف مساعدة للاستخدام في المكونات
export const pausePreloadingForProductPage = () => {
  conditionalPreloader.pausePreloading();
};

export const resumePreloadingAfterProductPage = () => {
  conditionalPreloader.resumePreloading();
};

export const preloadDashboardComponents = () => {
  conditionalPreloader.forcePreload('/dashboard');
  conditionalPreloader.forcePreload('/dashboard/products');
};
