/**
 * نظام مراقبة وتحليل الأداء الشامل والمتطور
 * يتتبع جميع الطلبات، السرعة، الأداء، واستهلاك الموارد في الوقت الفعلي
 */

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  size?: number;
  type: 'fetch' | 'xhr' | 'supabase' | 'auth' | 'image' | 'other';
  cached: boolean;
  blocked: boolean;
  errorMessage?: string;
}

interface PageMetrics {
  url: string;
  loadStart: number;
  domContentLoaded?: number;
  loadComplete?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalRequests: number;
  cachedRequests: number;
  blockedRequests: number;
  totalDataTransferred: number;
  memoryUsage?: number;
}

interface PerformanceStats {
  currentPage: PageMetrics;
  totalRequests: {
    fetch: number;
    post: number;
    get: number;
    put: number;
    delete: number;
    supabase: number;
    auth: number;
    cached: number;
    blocked: number;
  };
  networkStats: {
    totalDataTransferred: number;
    averageResponseTime: number;
    fastestRequest: number;
    slowestRequest: number;
    errorRate: number;
  };
  pageStats: {
    averageLoadTime: number;
    totalPagesVisited: number;
    currentSessionTime: number;
  };
  cacheStats: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    savedBandwidth: number;
  };
  systemStats: {
    memoryUsage: number;
    cpuUsage?: number;
    batteryLevel?: number;
    connectionType?: string;
    effectiveType?: string;
  };
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private requests: NetworkRequest[] = [];
  private pageMetrics: PageMetrics[] = [];
  private currentPageMetrics: PageMetrics;
  private sessionStartTime: number;
  private observers: PerformanceObserver[] = [];
  private isTracking = false;

  private constructor() {
    this.sessionStartTime = Date.now();
    this.currentPageMetrics = this.initializePageMetrics();
    this.setupNetworkInterception();
    this.setupPerformanceObservers();
    this.setupPageLifecycleTracking();
  }

  public static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  // ===================================================================
  // 🔧 INITIALIZATION & SETUP
  // ===================================================================

  private initializePageMetrics(): PageMetrics {
    return {
      url: window.location.href,
      loadStart: Date.now(),
      totalRequests: 0,
      cachedRequests: 0,
      blockedRequests: 0,
      totalDataTransferred: 0,
    };
  }

  private setupNetworkInterception(): void {
    // اعتراض جميع طلبات fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      return this.interceptFetch(originalFetch, ...args);
    };

    // اعتراض XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = class extends originalXHR {
      constructor() {
        super();
        PerformanceTracker.getInstance().interceptXHR(this);
      }
    };
  }

  private async interceptFetch(originalFetch: any, ...args: any[]): Promise<Response> {
    const requestId = this.generateRequestId();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const method = args[1]?.method || 'GET';
    
    const request: NetworkRequest = {
      id: requestId,
      url,
      method: method.toUpperCase(),
      startTime: Date.now(),
      type: this.categorizeRequest(url),
      cached: false,
      blocked: false,
    };

    try {
      // التحقق من الطلبات المحظورة
      if (this.isRequestBlocked(url)) {
        request.blocked = true;
        request.duration = 0;
        this.addRequest(request);
        return new Response('{}', { status: 200 });
      }

      // تنفيذ الطلب
      const response = await originalFetch(...args);
      
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.status = response.status;
      request.size = this.getResponseSize(response);
      request.cached = response.headers.get('x-cache') === 'hit' || 
                      response.headers.get('cf-cache-status') === 'HIT' ||
                      request.duration < 10; // طلبات سريعة جداً قد تكون من الكاش

      this.addRequest(request);
      return response;
    } catch (error) {
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addRequest(request);
      throw error;
    }
  }

  private interceptXHR(xhr: XMLHttpRequest): void {
    const requestId = this.generateRequestId();
    let request: NetworkRequest;

    const originalOpen = xhr.open;
    xhr.open = function(method: string, url: string | URL) {
      request = {
        id: requestId,
        url: url.toString(),
        method: method.toUpperCase(),
        startTime: Date.now(),
        type: PerformanceTracker.getInstance().categorizeRequest(url.toString()),
        cached: false,
        blocked: false,
      };
      
      return originalOpen.apply(this, arguments as any);
    };

    const originalSend = xhr.send;
    xhr.send = function() {
      const tracker = PerformanceTracker.getInstance();
      
      xhr.addEventListener('loadend', () => {
        request.endTime = Date.now();
        request.duration = request.endTime - request.startTime;
        request.status = xhr.status;
        request.size = xhr.response ? new Blob([xhr.response]).size : 0;
        tracker.addRequest(request);
      });

      return originalSend.apply(this, arguments as any);
    };
  }

  private setupPerformanceObservers(): void {
    if ('PerformanceObserver' in window) {
      // Navigation Timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.updatePageMetrics({
              domContentLoaded: navEntry.domContentLoadedEventEnd,
              loadComplete: navEntry.loadEventEnd,
            });
          }
        });
      });

      // Paint Timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.updatePageMetrics({ firstPaint: entry.startTime });
          } else if (entry.name === 'first-contentful-paint') {
            this.updatePageMetrics({ firstContentfulPaint: entry.startTime });
          }
        });
      });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.updatePageMetrics({ largestContentfulPaint: lastEntry.startTime });
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        paintObserver.observe({ entryTypes: ['paint'] });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        this.observers.push(navObserver, paintObserver, lcpObserver);
      } catch (error) {
      }
    }
  }

  private setupPageLifecycleTracking(): void {
    // تتبع تغيير الصفحات
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.onPageChange();
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.onPageChange();
      return originalReplaceState.apply(history, args);
    };

    window.addEventListener('popstate', () => {
      this.onPageChange();
    });

    // تتبع visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onPageVisible();
      } else {
        this.onPageHidden();
      }
    });
  }

  // ===================================================================
  // 📊 REQUEST MANAGEMENT
  // ===================================================================

  private addRequest(request: NetworkRequest): void {
    this.requests.push(request);
    this.currentPageMetrics.totalRequests++;
    
    if (request.cached) {
      this.currentPageMetrics.cachedRequests++;
    }
    
    if (request.blocked) {
      this.currentPageMetrics.blockedRequests++;
    }

    if (request.size) {
      this.currentPageMetrics.totalDataTransferred += request.size;
    }

    // تحليل الطلبات البطيئة مع محسن الأداء
    if (request.duration && window.performanceOptimizer) {
      window.performanceOptimizer.analyzeRequest(request.url, request.duration);
    }

    // تنظيف البيانات القديمة (احتفظ بآخر 1000 طلب)
    if (this.requests.length > 1000) {
      this.requests = this.requests.slice(-1000);
    }

    // تحديث الذاكرة
    this.updateMemoryUsage();
  }

  private categorizeRequest(url: string): NetworkRequest['type'] {
    if (url.includes('supabase.co')) return 'supabase';
    if (url.includes('/auth/') || url.includes('login') || url.includes('token')) return 'auth';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('.svg')) return 'image';
    return 'fetch';
  }

  private isRequestBlocked(url: string): boolean {
    // التحقق من الطلبات المحظورة بواسطة نظام deduplication
    return (window as any).__BAZAAR_REQUEST_BLOCKED_URLS__?.includes(url) || false;
  }

  // ===================================================================
  // 🔄 INTEGRATION WITH ULTIMATE REQUEST CONTROLLER
  // ===================================================================

  public handleBlockedRequest(requestInfo: { url: string; method: string; reason: string }): void {
    const request: NetworkRequest = {
      id: this.generateRequestId(),
      url: requestInfo.url,
      method: requestInfo.method.toUpperCase(),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      type: this.categorizeRequest(requestInfo.url),
      cached: false,
      blocked: true,
      status: 304, // Not Modified - محظور
      size: 0
    };

    this.addRequest(request);
  }

  public handleCachedRequest(requestInfo: { url: string; method: string; originalDuration?: number }): void {
    const request: NetworkRequest = {
      id: this.generateRequestId(),
      url: requestInfo.url,
      method: requestInfo.method.toUpperCase(),
      startTime: Date.now(),
      endTime: Date.now(),
      duration: requestInfo.originalDuration || 1, // 1ms للكاش
      type: this.categorizeRequest(requestInfo.url),
      cached: true,
      blocked: false,
      status: 200,
      size: 0
    };

    this.addRequest(request);
  }

  private getResponseSize(response: Response): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // 📈 METRICS & ANALYTICS
  // ===================================================================

  private updatePageMetrics(updates: Partial<PageMetrics>): void {
    Object.assign(this.currentPageMetrics, updates);
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.currentPageMetrics.memoryUsage = memory.usedJSHeapSize;
    }
  }

  private onPageChange(): void {
    // حفظ metrics الصفحة الحالية
    this.pageMetrics.push({ ...this.currentPageMetrics });
    
    // بدء metrics جديدة للصفحة الجديدة
    this.currentPageMetrics = this.initializePageMetrics();
    
    // تنظيف البيانات القديمة
    if (this.pageMetrics.length > 50) {
      this.pageMetrics = this.pageMetrics.slice(-50);
    }
  }

  private onPageVisible(): void {
    // إعادة تشغيل المراقبة عند عودة الصفحة للواجهة
    this.isTracking = true;
  }

  private onPageHidden(): void {
    // إيقاف المراقبة عند إخفاء الصفحة لتوفير الموارد
    this.isTracking = false;
  }

  // ===================================================================
  // 🔍 PUBLIC API
  // ===================================================================

  public getRealtimeStats(): PerformanceStats {
    const recentRequests = this.requests.slice(-100); // آخر 100 طلب
    const responseTimes = recentRequests
      .filter(r => r.duration)
      .map(r => r.duration!);

    const totalRequests = {
      fetch: this.requests.filter(r => r.type === 'fetch').length,
      post: this.requests.filter(r => r.method === 'POST').length,
      get: this.requests.filter(r => r.method === 'GET').length,
      put: this.requests.filter(r => r.method === 'PUT').length,
      delete: this.requests.filter(r => r.method === 'DELETE').length,
      supabase: this.requests.filter(r => r.type === 'supabase').length,
      auth: this.requests.filter(r => r.type === 'auth').length,
      cached: this.requests.filter(r => r.cached).length,
      blocked: this.requests.filter(r => r.blocked).length,
    };

    const networkStats = {
      totalDataTransferred: this.requests.reduce((sum, r) => sum + (r.size || 0), 0),
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      fastestRequest: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestRequest: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      errorRate: this.requests.filter(r => r.errorMessage).length / this.requests.length * 100,
    };

    const pageStats = {
      averageLoadTime: this.pageMetrics.length > 0 ? 
        this.pageMetrics
          .filter(p => p.loadComplete)
          .reduce((sum, p) => sum + (p.loadComplete! - p.loadStart), 0) / this.pageMetrics.length : 0,
      totalPagesVisited: this.pageMetrics.length + 1,
      currentSessionTime: Date.now() - this.sessionStartTime,
    };

    const cacheStats = {
      hitRate: totalRequests.cached / (this.requests.length || 1) * 100,
      totalHits: totalRequests.cached,
      totalMisses: this.requests.length - totalRequests.cached,
      savedBandwidth: this.requests
        .filter(r => r.cached)
        .reduce((sum, r) => sum + (r.size || 0), 0),
    };

    const systemStats = {
      memoryUsage: this.currentPageMetrics.memoryUsage || 0,
      connectionType: (navigator as any)?.connection?.type || 'unknown',
      effectiveType: (navigator as any)?.connection?.effectiveType || 'unknown',
    };

    return {
      currentPage: this.currentPageMetrics,
      totalRequests,
      networkStats,
      pageStats,
      cacheStats,
      systemStats,
    };
  }

  public getDetailedRequests(limit: number = 50): NetworkRequest[] {
    return this.requests.slice(-limit);
  }

  public getPageHistory(): PageMetrics[] {
    return [...this.pageMetrics];
  }

  public clearData(): void {
    this.requests = [];
    this.pageMetrics = [];
    this.currentPageMetrics = this.initializePageMetrics();
  }

  public exportData(): any {
    return {
      requests: this.requests,
      pageMetrics: this.pageMetrics,
      currentPage: this.currentPageMetrics,
      sessionStartTime: this.sessionStartTime,
      exportTime: Date.now(),
    };
  }
}

// إنشاء instance عالمي
export const performanceTracker = PerformanceTracker.getInstance();

// إضافة دوال مساعدة للكونسول
if (typeof window !== 'undefined') {
  (window as any).getPerformanceStats = () => performanceTracker.getRealtimeStats();
  (window as any).getDetailedRequests = (limit?: number) => performanceTracker.getDetailedRequests(limit);
  (window as any).exportPerformanceData = () => performanceTracker.exportData();
  (window as any).clearPerformanceData = () => performanceTracker.clearData();
}

export default performanceTracker;
