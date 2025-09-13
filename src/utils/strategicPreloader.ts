// Strategic Preloader for Optimized Loading Performance

interface PreloadConfig {
  enabled: boolean;
  maxConcurrent: number;
  idleTimeout: number;
  priority: 'high' | 'medium' | 'low';
  userInteractionDelay: number;
}

interface RoutePreloadMap {
  route: string;
  component: () => Promise<any>;
  dependencies?: (() => Promise<any>)[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  preloadDependencies?: boolean;
}

class StrategicPreloader {
  private config: PreloadConfig;
  private preloadQueue: Map<string, RoutePreloadMap> = new Map();
  private loadedComponents: Set<string> = new Set();
  private loadingComponents: Set<string> = new Set();
  private userHasInteracted = false;
  private idleCallbackId: number | null = null;

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      enabled: true,
      maxConcurrent: 3,
      idleTimeout: 5000,
      priority: 'medium',
      userInteractionDelay: 2000,
      ...config
    };

    this.initializeUserInteractionTracking();
    this.setupRoutePreloadMap();
  }

  private initializeUserInteractionTracking() {
    const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    
    const handleInteraction = () => {
      if (!this.userHasInteracted) {
        this.userHasInteracted = true;
        // Start preloading after user interaction
        setTimeout(() => {
          this.startStrategicPreloading();
        }, this.config.userInteractionDelay);
      }
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleInteraction, { 
        once: true, 
        passive: true 
      });
    });
  }

  private setupRoutePreloadMap() {
    // Define routes and their preload strategies
    const routeMaps: RoutePreloadMap[] = [
      // Critical - Always preload
      {
        route: '/dashboard',
        component: () => import('../pages/Dashboard'),
        priority: 'critical',
        dependencies: [
          () => import('react-router-dom'),
          () => import('@tanstack/react-query')
        ]
      },
      {
        route: '/dashboard/products',
        component: () => import('../pages/dashboard/ProductsCached'),
        priority: 'critical',
        dependencies: [
          () => import('@tanstack/react-table'),
          () => import('lucide-react')
        ]
      },
      {
        route: '/dashboard/orders',
        component: () => import('../pages/dashboard/Orders'),
        priority: 'critical',
        dependencies: [
          () => import('@tanstack/react-table'),
          () => import('date-fns')
        ]
      },

      // High priority - Preload after critical
      {
        route: '/dashboard/customers',
        component: () => import('../pages/dashboard/Customers'),
        priority: 'high',
        dependencies: [
          () => import('@tanstack/react-table')
        ]
      },
      {
        route: '/dashboard/analytics',
        component: () => import('../pages/dashboard/Analytics'),
        priority: 'high',
        dependencies: [
          () => import('@nivo/bar'),
          () => import('@nivo/line'),
          () => import('@nivo/pie')
        ],
        preloadDependencies: true
      },
      {
        route: '/dashboard/pos',
        component: () => import('../pages/POSOptimized'),
        priority: 'high',
        dependencies: [
          () => import('react-barcode'),
          () => import('qrcode.react')
        ]
      },

      // Medium priority - Preload during idle time
      {
        route: '/dashboard/store-editor',
        component: () => import('../pages/admin/StoreEditor'),
        priority: 'medium',
        dependencies: [
          () => import('@monaco-editor/react'),
          () => import('@dnd-kit/core'),
          () => import('@dnd-kit/sortable')
        ],
        preloadDependencies: true
      },
      {
        route: '/dashboard/store-editor-v2',
        component: () => import('../pages/dashboard/StoreEditorV2'),
        priority: 'medium',
        dependencies: [
          () => import('@tinymce/tinymce-react'),
          () => import('@dnd-kit/core')
        ],
        preloadDependencies: true
      },
      {
        route: '/dashboard/financial-analytics',
        component: () => import('../pages/FinancialAnalytics'),
        priority: 'medium',
        dependencies: [
          () => import('recharts'),
          () => import('chart.js'),
          () => import('react-chartjs-2')
        ],
        preloadDependencies: true
      },

      // Low priority - Preload last
      {
        route: '/dashboard/suppliers',
        component: () => import('../pages/dashboard/SuppliersManagement'),
        priority: 'low'
      },
      {
        route: '/dashboard/expenses',
        component: () => import('../pages/dashboard/Expenses'),
        priority: 'low'
      },
      {
        route: '/dashboard/invoices',
        component: () => import('../pages/dashboard/Invoices'),
        priority: 'low',
        dependencies: [
          () => import('jspdf'),
          () => import('jspdf-autotable'),
          () => import('html2canvas')
        ],
        preloadDependencies: true
      },
      {
        route: '/dashboard/courses',
        component: () => import('../pages/courses/CoursesIndex'),
        priority: 'low'
      }
    ];

    routeMaps.forEach(route => {
      this.preloadQueue.set(route.route, route);
    });
  }

  private async startStrategicPreloading() {
    if (!this.config.enabled) return;

    const priorities = ['critical', 'high', 'medium', 'low'] as const;
    
    for (const priority of priorities) {
      await this.preloadByPriority(priority);
      
      // Add delay between priority levels to prevent blocking
      if (priority !== 'low') {
        await this.waitForIdle(1000);
      }
    }
  }

  private async preloadByPriority(priority: 'critical' | 'high' | 'medium' | 'low') {
    const routes = Array.from(this.preloadQueue.values())
      .filter(route => route.priority === priority);

    const concurrentBatches = this.chunkArray(routes, this.config.maxConcurrent);

    for (const batch of concurrentBatches) {
      const promises = batch.map(route => this.preloadRoute(route));
      await Promise.allSettled(promises);
    }
  }

  private async preloadRoute(routeConfig: RoutePreloadMap): Promise<void> {
    const { route, component, dependencies = [], preloadDependencies = false } = routeConfig;

    if (this.loadedComponents.has(route) || this.loadingComponents.has(route)) {
      return;
    }

    this.loadingComponents.add(route);

    try {
      // Preload dependencies first if configured
      if (preloadDependencies && dependencies.length > 0) {
        await Promise.allSettled(
          dependencies.map(dep => dep().catch(() => {}))
        );
      }

      // Preload the main component
      await component();
      
      this.loadedComponents.add(route);
      

      // Preload dependencies after component if not done before
      if (!preloadDependencies && dependencies.length > 0) {
        // Don't await these - load in background
        Promise.allSettled(
          dependencies.map(dep => dep().catch(() => {}))
        );
      }

    } catch (error) {
      console.warn(`⚠️ Failed to preload ${route}:`, error);
    } finally {
      this.loadingComponents.delete(route);
    }
  }

  // Preload specific route on demand (e.g., when user hovers over link)
  public preloadRouteOnDemand(route: string): Promise<void> {
    const routeConfig = this.preloadQueue.get(route);
    if (!routeConfig) {
      console.warn(`Route ${route} not found in preload map`);
      return Promise.resolve();
    }

    return this.preloadRoute(routeConfig);
  }

  // Preload routes based on current route (predictive preloading)
  public preloadRelatedRoutes(currentRoute: string) {
    const relatedRoutes = this.getRelatedRoutes(currentRoute);
    
    relatedRoutes.forEach(route => {
      this.schedulePreload(() => this.preloadRouteOnDemand(route), 500);
    });
  }

  private getRelatedRoutes(currentRoute: string): string[] {
    // Define related route patterns
    const relatedPatterns: Record<string, string[]> = {
      '/dashboard': ['/dashboard/products', '/dashboard/orders', '/dashboard/customers'],
      '/dashboard/products': ['/dashboard/categories', '/dashboard/inventory'],
      '/dashboard/orders': ['/dashboard/customers', '/dashboard/analytics'],
      '/dashboard/customers': ['/dashboard/orders', '/dashboard/customer-debts'],
      '/dashboard/analytics': ['/dashboard/financial-analytics', '/dashboard/orders'],
      '/dashboard/pos': ['/dashboard/pos-orders', '/dashboard/returns'],
      '/dashboard/store-editor': ['/dashboard/store-editor-v2', '/dashboard/store-settings'],
    };

    return relatedPatterns[currentRoute] || [];
  }

  private schedulePreload(preloadFn: () => Promise<void>, delay: number) {
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = window.requestIdleCallback(
        () => preloadFn(),
        { timeout: this.config.idleTimeout }
      );
    } else {
      setTimeout(preloadFn, delay);
    }
  }

  private waitForIdle(timeout: number): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => resolve(), { timeout });
      } else {
        setTimeout(resolve, Math.min(timeout, 100));
      }
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Performance monitoring
  public getPreloadStats() {
    return {
      totalRoutes: this.preloadQueue.size,
      loadedRoutes: this.loadedComponents.size,
      loadingRoutes: this.loadingComponents.size,
      loadedPercentage: (this.loadedComponents.size / this.preloadQueue.size) * 100
    };
  }

  // Cleanup
  public cleanup() {
    if (this.idleCallbackId) {
      window.cancelIdleCallback(this.idleCallbackId);
    }
  }
}

// Global preloader instance
export const strategicPreloader = new StrategicPreloader({
  enabled: true,
  maxConcurrent: 2, // Conservative to avoid blocking main thread
  idleTimeout: 3000,
  priority: 'medium',
  userInteractionDelay: 1500
});

// Hook for using preloader in components
export const useStrategicPreloader = () => {
  const preloadRoute = (route: string) => {
    return strategicPreloader.preloadRouteOnDemand(route);
  };

  const preloadRelated = (currentRoute: string) => {
    strategicPreloader.preloadRelatedRoutes(currentRoute);
  };

  const getStats = () => {
    return strategicPreloader.getPreloadStats();
  };

  return {
    preloadRoute,
    preloadRelated,
    getStats
  };
};

// Utility to preload heavy dependencies during idle time
export const preloadHeavyDependencies = () => {
  const heavyDeps = [
    // Chart libraries
    () => import('@nivo/bar'),
    () => import('@nivo/line'),
    () => import('@nivo/pie'),
    () => import('recharts'),
    () => import('chart.js'),

    // Editor libraries
    () => import('@monaco-editor/react'),
    () => import('@tinymce/tinymce-react'),

    // PDF libraries
    () => import('jspdf'),
    () => import('jspdf-autotable'),
    () => import('html2canvas'),

    // Drag & Drop
    () => import('@dnd-kit/core'),
    () => import('@dnd-kit/sortable'),

    // Heavy utilities
    () => import('lodash-es'),
    () => import('date-fns'),
  ];

  if ('requestIdleCallback' in window) {
    heavyDeps.forEach((dep, index) => {
      window.requestIdleCallback(
        () => dep().catch(() => {}),
        { timeout: 5000 + (index * 500) } // Stagger the timeouts
      );
    });
  }
};

// Initialize preloader when module loads
if (typeof window !== 'undefined') {
  // Start preloading heavy dependencies immediately during idle time
  preloadHeavyDependencies();
}

export default strategicPreloader;
