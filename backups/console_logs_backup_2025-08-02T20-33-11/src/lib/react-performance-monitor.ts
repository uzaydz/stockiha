// React Performance Monitor - نظام مراقبة أداء React محسن ومبسط
// 🔧 نسخة محسنة بدون حلقات مفرغة

interface ComponentRenderInfo {
  name: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  slowRenders: number;
  memoryLeaks?: boolean;
  props?: any;
  state?: any;
}

interface PerformanceIssue {
  type: 'render' | 'memory' | 'slow' | 'leak';
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  renderCount?: number;
  renderTime?: number;
  memoryUsage?: number;
  details?: any;
}

// REACT PERFORMANCE MONITOR DISABLED - تم تعطيل مراقب الأداء لتوفير الذاكرة

// Mock React performance monitor for compatibility
class ReactPerformanceMonitor {
  private static instance: ReactPerformanceMonitor;
  private componentRenders: Map<string, ComponentRenderInfo> = new Map();
  private performanceIssues: PerformanceIssue[] = [];
  private isMonitoring: boolean = false;
  private renderThresholds = {
    excessiveRenders: 10, // زيادة الحد لتجنب الإنذارات الكاذبة
    slowRender: 16,
    memoryLeakThreshold: 100
  };
  private lastReportTime: number = 0;
  private reportInterval: number = 30000; // تقرير كل 30 ثانية

  private constructor() {
    // DISABLED: No background monitoring
  }

  static getInstance(): ReactPerformanceMonitor {
    if (!ReactPerformanceMonitor.instance) {
      ReactPerformanceMonitor.instance = new ReactPerformanceMonitor();
    }
    return ReactPerformanceMonitor.instance;
  }

  // 🔧 نظام مراقبة مبسط بدون React DevTools
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // مراقبة بسيطة للأداء العام
    this.setupSimpleMonitoring();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  // 🔧 نظام مراقبة مبسط
  private setupSimpleMonitoring(): void {
    // مراقبة الذاكرة فقط
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      this.checkMemoryUsage();
    }, 5000); // كل 5 ثواني
  }

  // 🔧 فحص استخدام الذاكرة
  private checkMemoryUsage(): void {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent > 80) {
        this.addIssue({
          type: 'memory',
          component: 'System',
          severity: 'critical',
          message: `استهلاك ذاكرة مرتفع جداً: ${usagePercent.toFixed(1)}%`,
          timestamp: Date.now(),
          memoryUsage: usedMB
        });
      } else if (usagePercent > 60) {
        this.addIssue({
          type: 'memory',
          component: 'System',
          severity: 'high',
          message: `استهلاك ذاكرة مرتفع: ${usagePercent.toFixed(1)}%`,
          timestamp: Date.now(),
          memoryUsage: usedMB
        });
      }
    }
  }

  // 🔧 إضافة مشكلة أداء
  private addIssue(issue: PerformanceIssue): void {
    this.performanceIssues.push(issue);
    
    // الاحتفاظ بآخر 100 مشكلة فقط
    if (this.performanceIssues.length > 100) {
      this.performanceIssues = this.performanceIssues.slice(-100);
    }
    
    // عرض المشاكل الحرجة فقط
    if (issue.severity === 'critical') {
    }
  }

  // 🔧 تقارير دورية
  private startPeriodicReporting(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      const now = Date.now();
      if (now - this.lastReportTime > this.reportInterval) {
        this.generatePeriodicReport();
        this.lastReportTime = now;
      }
    }, 30000); // كل 30 ثانية
  }

  // 🔧 تقرير دوري
  private generatePeriodicReport(): void {
    const recentIssues = this.performanceIssues.filter(
      issue => Date.now() - issue.timestamp < this.reportInterval
    );
    
    if (recentIssues.length > 0) {
      
      const criticalIssues = recentIssues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
      }
    }
  }

  // 🔧 إعداد أوامر الكونسول
  private setupConsoleCommands(): void {
    if (typeof window !== 'undefined') {
      (window as any).rmStatus = () => this.getSimpleReport();
      (window as any).rmIssues = () => this.getRecentIssues();
      (window as any).rmMemory = () => this.getMemoryReport();
      (window as any).rmClear = () => this.clearData();
      (window as any).rmStart = () => this.startMonitoring();
      (window as any).rmStop = () => this.stopMonitoring();
    }
  }

  // 🔧 تقرير مبسط
  getSimpleReport(): string {
    const totalIssues = this.performanceIssues.length;
    const recentIssues = this.performanceIssues.filter(
      issue => Date.now() - issue.timestamp < 60000 // آخر دقيقة
    ).length;
    
    const criticalIssues = this.performanceIssues.filter(
      issue => issue.severity === 'critical'
    ).length;

    const memoryInfo = this.getMemoryInfo();
    
    const report = `
📊 تقرير أداء React المحسن:
- حالة المراقبة: ${this.isMonitoring ? '🟢 نشط' : '🔴 معطل'}
- إجمالي المشاكل: ${totalIssues}
- مشاكل حديثة (آخر دقيقة): ${recentIssues}
- مشاكل حرجة: ${criticalIssues}
${memoryInfo}

💡 الأوامر المتاحة:
- rmStart() - تشغيل المراقبة
- rmStop() - إيقاف المراقبة
- rmIssues() - عرض المشاكل الحديثة
- rmMemory() - تقرير الذاكرة
- rmClear() - مسح البيانات
    `;
    
    return report;
  }

  // 🔧 معلومات الذاكرة
  private getMemoryInfo(): string {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      const usagePercent = (usedMB / limitMB) * 100;
      
      return `
- استهلاك الذاكرة: ${usedMB}MB / ${limitMB}MB (${usagePercent.toFixed(1)}%)
- حالة الذاكرة: ${usagePercent > 80 ? '🚨 حرجة' : usagePercent > 60 ? '⚠️ مرتفعة' : '✅ طبيعية'}`;
    }
    return '- معلومات الذاكرة: غير متاحة';
  }

  // 🔧 تقرير الذاكرة
  getMemoryReport(): any {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const report = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
      
      return report;
    }
    return null;
  }

  // 🔧 المشاكل الحديثة
  getRecentIssues(): PerformanceIssue[] {
    const recentIssues = this.performanceIssues.filter(
      issue => Date.now() - issue.timestamp < 300000 // آخر 5 دقائق
    );
    
    return recentIssues;
  }

  // 🔧 مسح البيانات
  clearData(): string {
    this.performanceIssues.length = 0;
    this.componentRenders.clear();
    return 'تم مسح البيانات';
  }

  // دوال للتوافق مع النظام القديم
  getComponentStats(): Map<string, ComponentRenderInfo> {
    return this.componentRenders;
  }

  getPerformanceIssues(): PerformanceIssue[] {
    return this.performanceIssues;
  }

  getSlowComponents(): ComponentRenderInfo[] {
    return [];
  }

  getExcessiveRenderComponents(): ComponentRenderInfo[] {
    return [];
  }

  getMemoryLeaks(): ComponentRenderInfo[] {
    return [];
  }

  getComponentDetails(componentName: string): ComponentRenderInfo | null {
    return this.componentRenders.get(componentName) || null;
  }

  // Mock methods for compatibility
  recordRender() {}
  recordHook() {}
  recordEffect() {}
  recordMemo() {}
  recordCallback() {}
  getStats() { return {}; }
  cleanup() {}
}

// إنشاء instance واحد
const reactMonitor = ReactPerformanceMonitor.getInstance();

// تصدير الدوال
export const startReactMonitoring = () => reactMonitor.startMonitoring();
export const stopReactMonitoring = () => reactMonitor.stopMonitoring();
export const getReactStats = () => reactMonitor.getComponentStats();
export const getReactIssues = () => reactMonitor.getPerformanceIssues();
export const getReactReport = () => reactMonitor.getSimpleReport();
export const getSlowReactComponents = () => reactMonitor.getSlowComponents();
export const getExcessiveReactComponents = () => reactMonitor.getExcessiveRenderComponents();
export const getReactMemoryLeaks = () => reactMonitor.getMemoryLeaks();
export const getReactComponentDetails = (name: string) => reactMonitor.getComponentDetails(name);
export const clearReactData = () => reactMonitor.clearData();

export default ReactPerformanceMonitor;
