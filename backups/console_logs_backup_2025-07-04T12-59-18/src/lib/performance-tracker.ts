// Performance Tracker - تتبع أداء الصفحات والمكونات
import { networkInterceptor } from './network-interceptor';
// تم إزالة console-manager - نستخدم console عادي

export interface PerformanceMetric {
  id: string;
  page: string;
  component?: string;
  type: 'navigation' | 'resource' | 'component' | 'custom';
  name: string;
  startTime: number;
  duration: number;
  metadata?: {
    renderCount?: number;
    propsSize?: number;
    stateSize?: number;
    effectsCount?: number;
    [key: string]: any;
  };
}

export interface PageLoadMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Additional metrics
  domContentLoaded?: number;
  loadComplete?: number;
  totalBlockingTime?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // Network metrics
  totalRequests?: number;
  totalSize?: number;
  cachedRequests?: number;
  failedRequests?: number;
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private pageLoadMetrics: Map<string, PageLoadMetrics> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private listeners: Set<(metric: PerformanceMetric | PageLoadMetrics) => void> = new Set();
  private componentRenderTimes: Map<string, number[]> = new Map();
  private isTracking: boolean = false;

  constructor() {
    this.setupObservers();
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;
    
    // مراقبة تحميل الصفحة
    this.trackPageLoad();
    
    // مراقبة Core Web Vitals
    this.trackWebVitals();
    
    // مراقبة استخدام الذاكرة
    this.trackMemoryUsage();
  }

  stopTracking() {
    this.isTracking = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  private setupObservers() {
    // Observer للموارد
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordResourceMetric(entry as PerformanceResourceTiming);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (e) {
      }

      // Observer للـ LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.updatePageMetric(window.location.pathname, { lcp: lastEntry.startTime });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
      }

      // Observer للـ FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as any;
            this.updatePageMetric(window.location.pathname, { 
              fid: fidEntry.processingStart - fidEntry.startTime 
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
      }

      // Observer للـ CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as any;
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
              this.updatePageMetric(window.location.pathname, { cls: clsValue });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
      }
    }
  }

  private trackPageLoad() {
    const currentPath = window.location.pathname;
    
    // استخدام Navigation Timing API
    if (performance.timing) {
      const timing = performance.timing;
      const pageMetrics: PageLoadMetrics = {
        ttfb: timing.responseStart - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        fcp: 0
      };

      // محاولة الحصول على FCP
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        pageMetrics.fcp = fcpEntry.startTime;
      }

      this.pageLoadMetrics.set(currentPath, pageMetrics);
      this.notifyListeners(pageMetrics);
    }

    // استخدام Navigation Timing API v2
    if ('PerformanceNavigationTiming' in window) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const navTiming = navEntries[0] as PerformanceNavigationTiming;
        const pageMetrics: PageLoadMetrics = {
          ttfb: navTiming.responseStart - navTiming.requestStart,
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart
        };
        
        this.updatePageMetric(currentPath, pageMetrics);
      }
    }

    // تتبع معلومات الشبكة
    setTimeout(() => {
      const networkStats = networkInterceptor.getStatistics();
      this.updatePageMetric(currentPath, {
        totalRequests: networkStats.total,
        totalSize: networkStats.totalSize,
        cachedRequests: networkStats.cachedRequests,
        failedRequests: networkStats.byStatus.error
      });
    }, 1000);
  }

  private trackWebVitals() {
    // يتم تتبعها بواسطة الـ observers
  }

  private trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const currentPath = window.location.pathname;
        
        this.updatePageMetric(currentPath, {
          memoryUsage: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        });
      }, 5000);
    }
  }

  private recordResourceMetric(entry: PerformanceResourceTiming) {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      page: window.location.pathname,
      type: 'resource',
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      metadata: {
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        initiatorType: entry.initiatorType
      }
    };

    this.metrics.set(metric.id, metric);
    this.notifyListeners(metric);
  }

  // واجهة عامة لتتبع أداء المكونات
  trackComponentRender(componentName: string, renderTime: number, metadata?: any) {
    // حفظ أوقات الرندر للمكون
    if (!this.componentRenderTimes.has(componentName)) {
      this.componentRenderTimes.set(componentName, []);
    }
    this.componentRenderTimes.get(componentName)!.push(renderTime);

    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      page: window.location.pathname,
      component: componentName,
      type: 'component',
      name: `${componentName} render`,
      startTime: performance.now() - renderTime,
      duration: renderTime,
      metadata: {
        renderCount: this.componentRenderTimes.get(componentName)!.length,
        ...metadata
      }
    };

    this.metrics.set(metric.id, metric);
    this.notifyListeners(metric);
  }

  // تتبع مخصص
  trackCustomMetric(name: string, duration: number, metadata?: any) {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      page: window.location.pathname,
      type: 'custom',
      name,
      startTime: performance.now() - duration,
      duration,
      metadata
    };

    this.metrics.set(metric.id, metric);
    this.notifyListeners(metric);
  }

  // أداة لقياس الوقت
  measureTime(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.trackCustomMetric(name, duration);
    };
  }

  private updatePageMetric(page: string, updates: Partial<PageLoadMetrics>) {
    const existing = this.pageLoadMetrics.get(page) || {};
    const updated = { ...existing, ...updates };
    this.pageLoadMetrics.set(page, updated);
    this.notifyListeners(updated);
  }

  private generateMetricId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private notifyListeners(metric: PerformanceMetric | PageLoadMetrics) {
    this.listeners.forEach(listener => listener(metric));
  }

  // واجهة عامة
  addListener(listener: (metric: PerformanceMetric | PageLoadMetrics) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (metric: PerformanceMetric | PageLoadMetrics) => void) {
    this.listeners.delete(listener);
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.startTime - a.startTime);
  }

  getPageMetrics(page?: string): PageLoadMetrics | undefined {
    return this.pageLoadMetrics.get(page || window.location.pathname);
  }

  getComponentStats(componentName: string) {
    const renderTimes = this.componentRenderTimes.get(componentName) || [];
    
    if (renderTimes.length === 0) {
      return null;
    }

    const sorted = [...renderTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);
    
    return {
      count: sorted.length,
      average: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllPageMetrics() {
    return Array.from(this.pageLoadMetrics.entries()).map(([page, metrics]) => ({
      page,
      ...metrics
    }));
  }

  getSlowestComponents(limit: number = 10) {
    const componentMetrics = Array.from(this.metrics.values())
      .filter(m => m.type === 'component' && m.component)
      .reduce((acc, metric) => {
        const key = metric.component!;
        if (!acc[key]) {
          acc[key] = { total: 0, count: 0, max: 0 };
        }
        acc[key].total += metric.duration;
        acc[key].count += 1;
        acc[key].max = Math.max(acc[key].max, metric.duration);
        return acc;
      }, {} as Record<string, { total: number; count: number; max: number }>);

    return Object.entries(componentMetrics)
      .map(([component, stats]) => ({
        component,
        averageTime: stats.total / stats.count,
        maxTime: stats.max,
        renderCount: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  clear() {
    this.metrics.clear();
    this.pageLoadMetrics.clear();
    this.componentRenderTimes.clear();
  }

  // تحليل الأداء
  analyzePerformance() {
    const currentPageMetrics = this.getPageMetrics();
    const slowComponents = this.getSlowestComponents();
    const networkStats = networkInterceptor.getStatistics();
    
    const issues = [];
    
    // تحليل Core Web Vitals
    if (currentPageMetrics) {
      if (currentPageMetrics.lcp && currentPageMetrics.lcp > 2500) {
        issues.push({
          type: 'warning',
          metric: 'LCP',
          value: currentPageMetrics.lcp,
          threshold: 2500,
          message: 'Largest Contentful Paint بطيء جداً'
        });
      }
      
      if (currentPageMetrics.fid && currentPageMetrics.fid > 100) {
        issues.push({
          type: 'warning',
          metric: 'FID',
          value: currentPageMetrics.fid,
          threshold: 100,
          message: 'First Input Delay مرتفع'
        });
      }
      
      if (currentPageMetrics.cls && currentPageMetrics.cls > 0.1) {
        issues.push({
          type: 'warning',
          metric: 'CLS',
          value: currentPageMetrics.cls,
          threshold: 0.1,
          message: 'Cumulative Layout Shift مرتفع'
        });
      }
    }
    
    // تحليل المكونات البطيئة
    slowComponents.forEach(comp => {
      if (comp.averageTime > 50) {
        issues.push({
          type: 'warning',
          metric: 'Component Render',
          component: comp.component,
          value: comp.averageTime,
          threshold: 50,
          message: `المكون ${comp.component} يستغرق وقتاً طويلاً في الرندر`
        });
      }
    });
    
    // تحليل الشبكة
    if (networkStats.byStatus.error > 5) {
      issues.push({
        type: 'error',
        metric: 'Network Errors',
        value: networkStats.byStatus.error,
        message: 'عدد كبير من أخطاء الشبكة'
      });
    }
    
    return {
      summary: {
        pageMetrics: currentPageMetrics,
        networkStats,
        slowestComponents: slowComponents.slice(0, 5)
      },
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  private generateRecommendations(issues: any[]) {
    const recommendations = [];
    
    if (issues.some(i => i.metric === 'LCP')) {
      recommendations.push('قم بتحسين أكبر عنصر محتوى في الصفحة');
      recommendations.push('استخدم lazy loading للصور الكبيرة');
      recommendations.push('قم بتحسين وقت استجابة الخادم');
    }
    
    if (issues.some(i => i.metric === 'Component Render')) {
      recommendations.push('استخدم React.memo للمكونات التي تعيد الرندر بكثرة');
      recommendations.push('قم بتحسين العمليات الحسابية المعقدة باستخدام useMemo');
      recommendations.push('تجنب إعادة الرندر غير الضرورية');
    }
    
    if (issues.some(i => i.metric === 'Network Errors')) {
      recommendations.push('تحقق من استقرار الاتصال بالخادم');
      recommendations.push('أضف آلية إعادة المحاولة للطلبات الفاشلة');
      recommendations.push('قم بتحسين معالجة الأخطاء');
    }
    
    return recommendations;
  }
}

// إنشاء مثيل واحد
export const performanceTracker = new PerformanceTracker();

// بدء التتبع تلقائياً في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  performanceTracker.startTracking();
}

// React Hook لتتبع أداء المكونات
import React from 'react';

export function useComponentPerformance(componentName: string) {
  const renderStart = performance.now();
  
  React.useEffect(() => {
    const renderTime = performance.now() - renderStart;
    performanceTracker.trackComponentRender(componentName, renderTime, {
      propsSize: 0, // يمكن حسابها إذا لزم الأمر
      stateSize: 0
    });
  });
}
