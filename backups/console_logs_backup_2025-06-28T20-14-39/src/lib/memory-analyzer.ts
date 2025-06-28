// Memory Analyzer - نظام تحليل استخدام الذاكرة المتقدم
export interface MemorySnapshot {
  id: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  external: number;
  arrayBuffers?: number;
  usagePercentage: number;
  fragmentationRatio: number;
  page?: string;
  component?: string;
  action?: string;
  metadata?: {
    domNodes?: number;
    eventListeners?: number;
    components?: number;
    queries?: number;
    images?: number;
  };
}

export interface MemoryLeak {
  id: string;
  detectedAt: number;
  component?: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  growthRate: number; // MB per minute
  snapshots: MemorySnapshot[];
  suggestions: string[];
  resolved?: boolean;
}

export interface ComponentMemoryUsage {
  componentName: string;
  instances: number;
  averageSize: number;
  totalSize: number;
  renders: number;
  memoryPerRender: number;
  leaks: number;
}

class MemoryAnalyzer {
  private snapshots: Map<string, MemorySnapshot> = new Map();
  private leaks: Map<string, MemoryLeak> = new Map();
  private listeners: Set<(snapshot: MemorySnapshot) => void> = new Set();
  private leakListeners: Set<(leak: MemoryLeak) => void> = new Set();
  private componentUsage: Map<string, ComponentMemoryUsage> = new Map();
  private isTracking: boolean = false;
  private trackingInterval?: number;
  private lastSnapshot?: MemorySnapshot;
  private baselineSnapshot?: MemorySnapshot;

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    // التحقق من دعم Memory API
    if (!this.isMemoryAPISupported()) {
      consoleManager.warn('Memory API not supported in this browser');
      return;
    }

    // أخذ لقطة أولية
    this.takeBaseline();
  }

  private isMemoryAPISupported(): boolean {
    return 'memory' in performance;
  }

  startTracking(interval: number = 5000) {
    if (this.isTracking) return;
    
    this.isTracking = true;
    
    // أخذ لقطات دورية
    this.trackingInterval = window.setInterval(() => {
      this.takeSnapshot();
    }, interval);

    // مراقبة أحداث DOM
    this.monitorDOMChanges();
    
    // مراقبة تسريبات Event Listeners
    this.monitorEventListeners();
    
    consoleManager.log('Memory tracking started');
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = undefined;
    }
    
    consoleManager.log('Memory tracking stopped');
  }

  takeSnapshot(metadata?: Partial<MemorySnapshot>): MemorySnapshot {
    if (!this.isMemoryAPISupported()) {
      throw new Error('Memory API not supported');
    }

    const memory = (performance as any).memory;
    const now = Date.now();
    
    const snapshot: MemorySnapshot = {
      id: this.generateSnapshotId(),
      timestamp: now,
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      external: 0, // سيتم حسابها لاحقاً
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      fragmentationRatio: (memory.totalJSHeapSize - memory.usedJSHeapSize) / memory.totalJSHeapSize,
      page: window.location.pathname,
      metadata: {
        domNodes: document.querySelectorAll('*').length,
        eventListeners: this.countEventListeners(),
        ...this.getAdditionalMetadata(),
        ...metadata?.metadata
      },
      ...metadata
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.lastSnapshot = snapshot;
    
    // تحليل التسريبات
    this.analyzeLeaks(snapshot);
    
    // إشعار المستمعين
    this.notifyListeners(snapshot);
    
    return snapshot;
  }

  takeBaseline() {
    this.baselineSnapshot = this.takeSnapshot({
      action: 'baseline',
      component: 'initial'
    });
  }

  trackComponentMemory(componentName: string) {
    const snapshot = this.takeSnapshot({
      component: componentName,
      action: 'component-render'
    });

    // تحديث إحصائيات المكون
    this.updateComponentUsage(componentName, snapshot);
    
    return snapshot;
  }

  private updateComponentUsage(componentName: string, snapshot: MemorySnapshot) {
    const existing = this.componentUsage.get(componentName) || {
      componentName,
      instances: 0,
      averageSize: 0,
      totalSize: 0,
      renders: 0,
      memoryPerRender: 0,
      leaks: 0
    };

    existing.renders++;
    existing.instances = this.countComponentInstances(componentName);
    
    if (this.lastSnapshot) {
      const memoryDiff = snapshot.heapUsed - this.lastSnapshot.heapUsed;
      existing.totalSize += Math.max(0, memoryDiff);
      existing.averageSize = existing.totalSize / existing.renders;
      existing.memoryPerRender = existing.totalSize / existing.renders;
    }

    this.componentUsage.set(componentName, existing);
  }

  private countComponentInstances(componentName: string): number {
    // محاولة عد مثيلات المكون في DOM
    const elements = document.querySelectorAll(`[data-component="${componentName}"]`);
    return elements.length || 1; // افتراضي 1 إذا لم نجد
  }

  private countEventListeners(): number {
    // تقدير تقريبي لعدد Event Listeners
    let count = 0;
    
    // عد listeners على document
    const documentEvents = (document as any)._eventListeners;
    if (documentEvents) {
      count += Object.keys(documentEvents).length;
    }
    
    // عد listeners على window
    const windowEvents = (window as any)._eventListeners;
    if (windowEvents) {
      count += Object.keys(windowEvents).length;
    }
    
    return count;
  }

  private getAdditionalMetadata() {
    const metadata: any = {};
    
    // عد الصور المحملة
    metadata.images = document.images.length;
    
    // عد React Query cache entries إن وجد
    const queryClient = (window as any).__REACT_QUERY_GLOBAL_CLIENT;
    if (queryClient) {
      const cache = queryClient.getQueryCache();
      metadata.queries = cache.getAll().length;
    }
    
    // معلومات إضافية عن DOM
    metadata.components = document.querySelectorAll('[data-component]').length;
    
    return metadata;
  }

  private analyzeLeaks(snapshot: MemorySnapshot) {
    if (!this.baselineSnapshot || this.snapshots.size < 3) return;

    const recentSnapshots = this.getRecentSnapshots(10);
    const growth = this.calculateMemoryGrowth(recentSnapshots);
    
    // اكتشاف النمو المستمر في الذاكرة
    if (growth.rate > 1 && growth.isConsistent) { // نمو أكثر من 1MB/min
      this.detectMemoryLeak(snapshot, growth, recentSnapshots);
    }
  }

  private calculateMemoryGrowth(snapshots: MemorySnapshot[]) {
    if (snapshots.length < 2) {
      return { rate: 0, isConsistent: false };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60); // minutes
    const memoryDiff = (last.heapUsed - first.heapUsed) / (1024 * 1024); // MB
    
    const rate = memoryDiff / timeDiff;
    
    // التحقق من الاتساق
    let consistentGrowth = 0;
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].heapUsed > snapshots[i - 1].heapUsed) {
        consistentGrowth++;
      }
    }
    
    const isConsistent = (consistentGrowth / (snapshots.length - 1)) > 0.7; // 70% نمو متسق
    
    return { rate, isConsistent };
  }

  private detectMemoryLeak(
    snapshot: MemorySnapshot, 
    growth: { rate: number; isConsistent: boolean },
    snapshots: MemorySnapshot[]
  ) {
    const leakId = this.generateLeakId();
    const pattern = this.identifyLeakPattern(snapshots);
    
    const leak: MemoryLeak = {
      id: leakId,
      detectedAt: snapshot.timestamp,
      component: snapshot.component,
      pattern,
      severity: this.calculateLeakSeverity(growth.rate),
      growthRate: growth.rate,
      snapshots: snapshots.slice(),
      suggestions: this.generateLeakSuggestions(pattern, snapshot),
      resolved: false
    };

    this.leaks.set(leakId, leak);
    this.notifyLeakListeners(leak);
    
    // تحديث إحصائيات المكون
    if (snapshot.component) {
      const componentUsage = this.componentUsage.get(snapshot.component);
      if (componentUsage) {
        componentUsage.leaks++;
        this.componentUsage.set(snapshot.component, componentUsage);
      }
    }
  }

  private identifyLeakPattern(snapshots: MemorySnapshot[]): string {
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    // تحليل نمط النمو
    if (lastSnapshot.metadata?.eventListeners && lastSnapshot.metadata.eventListeners > 100) {
      return 'event-listeners';
    }
    
    if (lastSnapshot.metadata?.domNodes && lastSnapshot.metadata.domNodes > 5000) {
      return 'dom-nodes';
    }
    
    if (lastSnapshot.metadata?.queries && lastSnapshot.metadata.queries > 1000) {
      return 'query-cache';
    }
    
    if (lastSnapshot.fragmentationRatio > 0.5) {
      return 'memory-fragmentation';
    }
    
    return 'general-growth';
  }

  private calculateLeakSeverity(growthRate: number): 'low' | 'medium' | 'high' | 'critical' {
    if (growthRate > 10) return 'critical'; // > 10MB/min
    if (growthRate > 5) return 'high';      // > 5MB/min
    if (growthRate > 2) return 'medium';    // > 2MB/min
    return 'low';
  }

  private generateLeakSuggestions(pattern: string, snapshot: MemorySnapshot): string[] {
    const suggestions: string[] = [];
    
    switch (pattern) {
      case 'event-listeners':
        suggestions.push('تحقق من إزالة Event Listeners في useEffect cleanup');
        suggestions.push('استخدم AbortController لإلغاء الطلبات');
        suggestions.push('تأكد من إزالة setTimeout و setInterval');
        break;
        
      case 'dom-nodes':
        suggestions.push('تحقق من تنظيف DOM nodes عند unmount');
        suggestions.push('استخدم virtualization للقوائم الطويلة');
        suggestions.push('تجنب إنشاء عناصر DOM غير ضرورية');
        break;
        
      case 'query-cache':
        suggestions.push('قم بتنظيف React Query cache دورياً');
        suggestions.push('استخدم gcTime مناسب للاستعلامات');
        suggestions.push('تجنب تخزين البيانات الكبيرة في cache');
        break;
        
      case 'memory-fragmentation':
        suggestions.push('تجنب إنشاء كائنات كبيرة بشكل متكرر');
        suggestions.push('استخدم Object pooling للكائنات المتكررة');
        suggestions.push('قم بتشغيل garbage collection يدوياً إذا لزم الأمر');
        break;
        
      default:
        suggestions.push('تحقق من المكونات التي تستخدم ذاكرة كبيرة');
        suggestions.push('استخدم React DevTools لتحليل Component tree');
        suggestions.push('تجنب closure loops والمراجع الدائرية');
        break;
    }
    
    if (snapshot.component) {
      suggestions.push(`تركز على المكون: ${snapshot.component}`);
    }
    
    return suggestions;
  }

  private monitorDOMChanges() {
    if (!window.MutationObserver) return;
    
    const observer = new MutationObserver((mutations) => {
      let significantChanges = 0;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 10 || mutation.removedNodes.length > 10) {
          significantChanges++;
        }
      });
      
      if (significantChanges > 5) {
        // تغييرات كبيرة في DOM
        this.takeSnapshot({
          action: 'dom-mutation',
          metadata: {
            mutations: mutations.length,
            significantChanges
          }
        });
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  private monitorEventListeners() {
    // اعتراض addEventListener لعد Event Listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    let eventListenerCount = 0;
    
    EventTarget.prototype.addEventListener = function(...args) {
      eventListenerCount++;
      return originalAddEventListener.apply(this, args);
    };
    
    EventTarget.prototype.removeEventListener = function(...args) {
      eventListenerCount = Math.max(0, eventListenerCount - 1);
      return originalRemoveEventListener.apply(this, args);
    };
    
    // مراقبة دورية لعدد Event Listeners
    setInterval(() => {
      if (eventListenerCount > 1000) {
        this.takeSnapshot({
          action: 'high-event-listeners',
          metadata: {
            eventListeners: eventListenerCount
          }
        });
      }
    }, 30000);
  }

  private getRecentSnapshots(count: number): MemorySnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateLeakId(): string {
    return `leak-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private notifyListeners(snapshot: MemorySnapshot) {
    this.listeners.forEach(listener => listener(snapshot));
  }

  private notifyLeakListeners(leak: MemoryLeak) {
    this.leakListeners.forEach(listener => listener(leak));
  }

  // واجهة عامة
  addListener(listener: (snapshot: MemorySnapshot) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (snapshot: MemorySnapshot) => void) {
    this.listeners.delete(listener);
  }

  addLeakListener(listener: (leak: MemoryLeak) => void) {
    this.leakListeners.add(listener);
  }

  removeLeakListener(listener: (leak: MemoryLeak) => void) {
    this.leakListeners.delete(listener);
  }

  getSnapshots(): MemorySnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getLeaks(): MemoryLeak[] {
    return Array.from(this.leaks.values())
      .sort((a, b) => b.detectedAt - a.detectedAt);
  }

  getComponentUsage(): ComponentMemoryUsage[] {
    return Array.from(this.componentUsage.values())
      .sort((a, b) => b.totalSize - a.totalSize);
  }

  getCurrentMemoryUsage(): MemorySnapshot | null {
    if (!this.isMemoryAPISupported()) return null;
    return this.lastSnapshot || null;
  }

  getMemoryTrend(hours: number = 1): {
    snapshots: MemorySnapshot[];
    trend: 'increasing' | 'decreasing' | 'stable';
    averageGrowth: number;
  } {
    const timeThreshold = Date.now() - (hours * 60 * 60 * 1000);
    const recentSnapshots = this.getSnapshots()
      .filter(s => s.timestamp > timeThreshold);

    if (recentSnapshots.length < 2) {
      return {
        snapshots: recentSnapshots,
        trend: 'stable',
        averageGrowth: 0
      };
    }

    const growth = this.calculateMemoryGrowth(recentSnapshots);
    
    return {
      snapshots: recentSnapshots,
      trend: growth.rate > 0.5 ? 'increasing' : growth.rate < -0.5 ? 'decreasing' : 'stable',
      averageGrowth: growth.rate
    };
  }

  resolveMemoryLeak(leakId: string) {
    const leak = this.leaks.get(leakId);
    if (leak) {
      leak.resolved = true;
      this.leaks.set(leakId, leak);
    }
  }

  // تنظيف القوائم
  cleanup() {
    // الاحتفاظ بآخر 100 snapshot فقط
    const snapshots = this.getSnapshots();
    if (snapshots.length > 100) {
      const toDelete = snapshots.slice(100);
      toDelete.forEach(s => this.snapshots.delete(s.id));
    }

    // الاحتفاظ بآخر 50 تسريب فقط
    const leaks = this.getLeaks();
    if (leaks.length > 50) {
      const toDelete = leaks.slice(50);
      toDelete.forEach(l => this.leaks.delete(l.id));
    }
  }

  // إحصائيات عامة
  getStats() {
    const snapshots = this.getSnapshots();
    const leaks = this.getLeaks();
    const unresolvedLeaks = leaks.filter(l => !l.resolved);
    
    return {
      totalSnapshots: snapshots.length,
      totalLeaks: leaks.length,
      unresolvedLeaks: unresolvedLeaks.length,
      criticalLeaks: unresolvedLeaks.filter(l => l.severity === 'critical').length,
      averageMemoryUsage: snapshots.length > 0 
        ? snapshots.reduce((sum, s) => sum + s.usagePercentage, 0) / snapshots.length 
        : 0,
      peakMemoryUsage: snapshots.length > 0 
        ? Math.max(...snapshots.map(s => s.usagePercentage)) 
        : 0,
      componentsTracked: this.componentUsage.size,
      memoryTrend: this.getMemoryTrend().trend
    };
  }

  // تصدير البيانات
  export() {
    return {
      snapshots: this.getSnapshots(),
      leaks: this.getLeaks(),
      componentUsage: this.getComponentUsage(),
      stats: this.getStats(),
      baseline: this.baselineSnapshot,
      timestamp: Date.now()
    };
  }

  // إجبار garbage collection (متاح في Chrome DevTools فقط)
  forceGC() {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      setTimeout(() => {
        this.takeSnapshot({
          action: 'force-gc'
        });
      }, 100);
    } else {
      consoleManager.warn('Garbage collection not available. Use Chrome DevTools for manual GC.');
    }
  }
}

// إنشاء مثيل واحد
export const memoryAnalyzer = new MemoryAnalyzer();

// بدء التتبع تلقائياً في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  memoryAnalyzer.startTracking(10000); // كل 10 ثواني
}

// React Hook لتتبع ذاكرة المكونات
import React from 'react';
import { consoleManager } from '@/lib/console-manager';

export function useMemoryTracking(componentName: string) {
  const mountTime = React.useRef<number>(Date.now());
  
  React.useEffect(() => {
    const snapshot = memoryAnalyzer.trackComponentMemory(componentName);
    
    return () => {
      // أخذ snapshot عند unmount
      memoryAnalyzer.takeSnapshot({
        component: componentName,
        action: 'component-unmount',
        metadata: {
          mountDuration: Date.now() - mountTime.current
        }
      });
    };
  }, [componentName]);
  
  const forceSnapshot = React.useCallback(() => {
    return memoryAnalyzer.trackComponentMemory(componentName);
  }, [componentName]);
  
  return { forceSnapshot };
}
