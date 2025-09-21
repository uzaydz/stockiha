/**
 * 🖥️ مراقب وأدوات تشخيص الكاش المتقدمة
 * Version: 1.0.0 - أدوات شاملة لمراقبة وتشخيص مشاكل الكاش
 */

import UnifiedCacheManager from './unifiedCacheManager';

const isDevelopment = import.meta.env.DEV;

export interface CacheDiagnosticResult {
  timestamp: number;
  duration: number;
  results: {
    unifiedCache: any;
    serviceWorker: any;
    localStorage: any;
    sessionStorage: any;
    reactQuery: any;
  };
  recommendations: string[];
  issues: string[];
}

export interface CachePerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
}

/**
 * مراقب الكاش الرئيسي
 */
export class CacheMonitor {

  private static instance: CacheMonitor;
  private metrics: CachePerformanceMetrics;
  private monitoringEnabled: boolean = false;
  private performanceObserver: PerformanceObserver | null = null;
  private reportInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0
    };
  }

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  /**
   * تشغيل المراقبة
  */
  startMonitoring(): void {
    if (!isDevelopment || this.monitoringEnabled) {
      return;
    }

    this.monitoringEnabled = true;
    this.setupPerformanceObserver();
    this.startPeriodicReporting();

  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring(): void {
    this.monitoringEnabled = false;

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

  }

  /**
   * تشخيص شامل لجميع أنظمة الكاش
   */
  async runFullDiagnostic(): Promise<CacheDiagnosticResult> {
    const startTime = performance.now();

    const results = {
      unifiedCache: await this.diagnoseUnifiedCache(),
      serviceWorker: await this.diagnoseServiceWorker(),
      localStorage: this.diagnoseLocalStorage(),
      sessionStorage: this.diagnoseSessionStorage(),
      reactQuery: this.diagnoseReactQuery()
    };

    const duration = performance.now() - startTime;

    const issues = this.analyzeIssues(results);
    const recommendations = this.generateRecommendations(results, issues);

    const diagnostic: CacheDiagnosticResult = {
      timestamp: Date.now(),
      duration,
      results,
      recommendations,
      issues
    };

    return diagnostic;
  }

  /**
   * تنظيف شامل لجميع أنظمة الكاش
   */
  async emergencyCleanup(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // تنظيف الكاش الموحد
      results.unifiedCache = { cleared: true };
      UnifiedCacheManager.clearAll();

      // تنظيف Service Worker
      if (typeof window !== 'undefined' && navigator.serviceWorker?.controller) {
        try {
          const swResult = await this.callServiceWorker('CLEAR_CACHE');
          results.serviceWorker = swResult;
        } catch (error) {
          errors.push(`Service Worker cleanup failed: ${error}`);
        }
      }

      // تنظيف localStorage
      try {
        const localKeys = Object.keys(localStorage);
        const cacheKeys = localKeys.filter(key =>
          key.startsWith('ucm_') ||
          key.includes('cache') ||
          key.includes('react-query') ||
          key.includes('supabase')
        );
        cacheKeys.forEach(key => localStorage.removeItem(key));
        results.localStorage = { cleared: cacheKeys.length };
      } catch (error) {
        errors.push(`localStorage cleanup failed: ${error}`);
      }

      // تنظيف sessionStorage
      try {
        const sessionKeys = Object.keys(sessionStorage);
        const cacheKeys = sessionKeys.filter(key =>
          key.startsWith('ucm_') ||
          key.includes('cache')
        );
        cacheKeys.forEach(key => sessionStorage.removeItem(key));
        results.sessionStorage = { cleared: cacheKeys.length };
      } catch (error) {
        errors.push(`sessionStorage cleanup failed: ${error}`);
      }

      // تنظيف React Query
      try {
        if (typeof window !== 'undefined' && (window as any).queryClient) {
          (window as any).queryClient.clear();
          results.reactQuery = { cleared: true };
        }
      } catch (error) {
        errors.push(`React Query cleanup failed: ${error}`);
      }

    } catch (error) {
      errors.push(`General cleanup error: ${error}`);
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * الحصول على تقرير الأداء
   */
  getPerformanceReport(): {
    metrics: CachePerformanceMetrics;
    health: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  } {
    const hitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    let health: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (hitRate >= 80) health = 'excellent';
    else if (hitRate >= 60) health = 'good';
    else if (hitRate >= 40) health = 'fair';

    const recommendations = [];

    if (hitRate < 50) {
      recommendations.push('معدل الإصابة في الكاش منخفض - فكر في زيادة أوقات الكاش');
    }

    if (this.metrics.errorRate > 10) {
      recommendations.push('معدل الأخطاء مرتفع - تحقق من اتصال الشبكة');
    }

    if (this.metrics.averageResponseTime > 1000) {
      recommendations.push('متوسط وقت الاستجابة بطيء - فكر في تحسين استراتيجيات الكاش');
    }

    return {
      metrics: { ...this.metrics },
      health,
      recommendations
    };
  }

  // ============ دوال التشخيص ============

  private async diagnoseUnifiedCache() {
    try {
      const stats = UnifiedCacheManager.getStats();
      return {
        status: 'healthy',
        stats,
        issues: []
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        issues: ['فشل في الوصول لنظام الكاش الموحد']
      };
    }
  }

  private async diagnoseServiceWorker() {
    if (typeof window === 'undefined' || !navigator.serviceWorker) {
      return { status: 'unavailable', message: 'Service Worker غير مدعوم' };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return { status: 'not-registered', message: 'Service Worker غير مسجل' };
      }

      const stats = await this.callServiceWorker('GET_CACHE_STATS');
      return {
        status: 'healthy',
        registration: {
          state: registration.active?.state,
          scope: registration.scope
        },
        stats
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  private diagnoseLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key =>
        key.startsWith('ucm_') ||
        key.includes('cache') ||
        key.includes('react-query') ||
        key.includes('supabase')
      );

      let totalSize = 0;
      cacheKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) totalSize += value.length;
        } catch (e) {
          // تجاهل
        }
      });

      return {
        status: totalSize > 5 * 1024 * 1024 ? 'warning' : 'healthy', // 5MB
        totalKeys: keys.length,
        cacheKeys: cacheKeys.length,
        estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  private diagnoseSessionStorage() {
    try {
      const keys = Object.keys(sessionStorage);
      const cacheKeys = keys.filter(key =>
        key.startsWith('ucm_') ||
        key.includes('cache')
      );

      let totalSize = 0;
      cacheKeys.forEach(key => {
        try {
          const value = sessionStorage.getItem(key);
          if (value) totalSize += value.length;
        } catch (e) {
          // تجاهل
        }
      });

      return {
        status: totalSize > 1024 * 1024 ? 'warning' : 'healthy', // 1MB
        totalKeys: keys.length,
        cacheKeys: cacheKeys.length,
        estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  private diagnoseReactQuery() {
    try {
      if (typeof window === 'undefined' || !(window as any).queryClient) {
        return { status: 'unavailable', message: 'React Query غير متوفر' };
      }

      const queryClient = (window as any).queryClient;
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      return {
        status: 'healthy',
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.state.status === 'pending').length,
        staleQueries: queries.filter(q => q.isStale()).length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  private analyzeIssues(results: CacheDiagnosticResult['results']): string[] {
    const issues: string[] = [];

    // فحص الكاش الموحد
    if (results.unifiedCache.status === 'error') {
      issues.push('مشكلة في نظام الكاش الموحد');
    }

    // فحص Service Worker
    if (results.serviceWorker.status === 'error') {
      issues.push('مشكلة في Service Worker');
    }

    // فحص localStorage
    if (results.localStorage.status === 'warning') {
      issues.push('localStorage يحتوي على كم كبير من البيانات المخزنة');
    }

    // فحص sessionStorage
    if (results.sessionStorage.status === 'warning') {
      issues.push('sessionStorage يحتوي على كم كبير من البيانات المخزنة');
    }

    // فحص React Query
    if (results.reactQuery.status === 'error') {
      issues.push('مشكلة في React Query');
    }

    return issues;
  }

  private generateRecommendations(
    results: CacheDiagnosticResult['results'],
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length === 0) {
      recommendations.push('جميع أنظمة الكاش تعمل بشكل صحيح');
      return recommendations;
    }

    if (issues.some(issue => issue.includes('localStorage') || issue.includes('sessionStorage'))) {
      recommendations.push('فكر في تنظيف البيانات المخزنة المحلية');
    }

    if (issues.some(issue => issue.includes('Service Worker'))) {
      recommendations.push('تحقق من تسجيل Service Worker بشكل صحيح');
    }

    if (issues.some(issue => issue.includes('React Query'))) {
      recommendations.push('تحقق من تهيئة React Query');
    }

    recommendations.push('استخدم CacheMonitor.emergencyCleanup() للتنظيف الشامل');

    return recommendations;
  }

  private setupPerformanceObserver(): void {
    if (!isDevelopment) {
      return;
    }

    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('cache') || entry.name.includes('fetch')) {
            this.metrics.totalRequests++;

            if (entry.duration < 100) {
              this.metrics.cacheHits++;
            } else {
              this.metrics.cacheMisses++;
            }

            // تحديث متوسط وقت الاستجابة
            const currentAvg = this.metrics.averageResponseTime;
            const newCount = this.metrics.totalRequests;
            this.metrics.averageResponseTime =
              (currentAvg * (newCount - 1) + entry.duration) / newCount;
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
    }
  }

  private startPeriodicReporting(): void {
    if (!isDevelopment) {
      return;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    this.reportInterval = setInterval(() => {
      if (this.monitoringEnabled) {
        this.getPerformanceReport();
      }
    }, 60 * 1000);
  }

  private async callServiceWorker(action: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker?.controller) {
        reject(new Error('لا يوجد Service Worker نشط'));
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);

      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة الاتصال بـ Service Worker'));
      }, 5000);

      navigator.serviceWorker.controller.postMessage(
        { type: action, ...data },
        [channel.port2]
      );
    });
  }
}

// دوال عامة للاستخدام
export const cacheMonitor = CacheMonitor.getInstance();

export const runCacheDiagnostic = () => cacheMonitor.runFullDiagnostic();
export const emergencyCacheCleanup = () => cacheMonitor.emergencyCleanup();
export const getCachePerformanceReport = () => cacheMonitor.getPerformanceReport();

// إضافة للـ window للاستخدام العام
if (typeof window !== 'undefined') {
  (window as any).CacheMonitor = CacheMonitor;
  (window as any).runCacheDiagnostic = runCacheDiagnostic;
  (window as any).emergencyCacheCleanup = emergencyCacheCleanup;
  (window as any).getCachePerformanceReport = getCachePerformanceReport;

  // تشغيل المراقبة تلقائياً في وضع التطوير
  if (isDevelopment) {
    cacheMonitor.startMonitoring();
  }
}

export default CacheMonitor;
