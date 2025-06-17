/**
 * نظام تشخيص خاص للإنتاج
 * يعمل حتى مع حذف console.log من Terser
 */

interface ProductionLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

interface PerformanceStats {
  requests: {
    total: number;
    blocked: number;
    cached: number;
    failed: number;
  };
  timing: {
    averageResponseTime: number;
    slowestRequest: { url: string; time: number };
    fastestRequest: { url: string; time: number };
  };
  cache: {
    hitRate: number;
    size: number;
    entries: number;
  };
}

class ProductionDebugger {
  private static instance: ProductionDebugger;
  private logs: ProductionLog[] = [];
  private stats: PerformanceStats = {
    requests: { total: 0, blocked: 0, cached: 0, failed: 0 },
    timing: { 
      averageResponseTime: 0, 
      slowestRequest: { url: '', time: 0 },
      fastestRequest: { url: '', time: Infinity }
    },
    cache: { hitRate: 0, size: 0, entries: 0 }
  };
  private maxLogs = 1000;

  private constructor() {
    this.setupGlobalAccess();
  }

  public static getInstance(): ProductionDebugger {
    if (!ProductionDebugger.instance) {
      ProductionDebugger.instance = new ProductionDebugger();
    }
    return ProductionDebugger.instance;
  }

  private setupGlobalAccess(): void {
    if (typeof window !== 'undefined') {
      // إتاحة النظام عالمياً حتى في الإنتاج
      (window as any).prodDebug = {
        // عرض الإحصائيات
        stats: () => this.getStats(),
        
        // عرض آخر الرسائل
        logs: (count = 50) => this.getLogs(count),
        
        // البحث في الرسائل
        search: (query: string) => this.searchLogs(query),
        
        // تصدير البيانات
        export: () => this.exportData(),
        
        // مسح البيانات
        clear: () => this.clearLogs(),
        
        // تحليل الأداء
        analyze: () => this.analyzePerformance(),
        
        // فحص الطلبات المكررة
        duplicates: () => this.findDuplicateRequests(),
        
        // معلومات النظام
        info: () => this.getSystemInfo()
      };

      // رسالة ترحيب مخفية (تظهر في الإنتاج)
      this.logToStorage('info', '🚀 Production Debug System Active', {
        message: 'Use prodDebug.stats() to view performance data',
        commands: [
          'prodDebug.stats() - Performance statistics',
          'prodDebug.logs() - Recent logs',
          'prodDebug.analyze() - Performance analysis',
          'prodDebug.duplicates() - Duplicate requests',
          'prodDebug.export() - Export all data'
        ]
      });
    }
  }

  public logToStorage(level: ProductionLog['level'], message: string, data?: any): void {
    const log: ProductionLog = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    this.logs.push(log);

    // الحفاظ على حد أقصى للرسائل
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // حفظ في localStorage للاستمرارية
    try {
      const recentLogs = this.logs.slice(-100); // آخر 100 رسالة
      localStorage.setItem('prodDebug_logs', JSON.stringify(recentLogs));
    } catch (error) {
      // تجاهل أخطاء localStorage
    }
  }

  public trackRequest(url: string, method: string, duration: number, status: 'success' | 'blocked' | 'cached' | 'failed'): void {
    this.stats.requests.total++;
    
    switch (status) {
      case 'blocked':
        this.stats.requests.blocked++;
        break;
      case 'cached':
        this.stats.requests.cached++;
        break;
      case 'failed':
        this.stats.requests.failed++;
        break;
    }

    // تحديث إحصائيات التوقيت
    if (status === 'success' && duration > 0) {
      if (duration > this.stats.timing.slowestRequest.time) {
        this.stats.timing.slowestRequest = { url, time: duration };
      }
      if (duration < this.stats.timing.fastestRequest.time) {
        this.stats.timing.fastestRequest = { url, time: duration };
      }
    }

    // حفظ الإحصائيات
    try {
      localStorage.setItem('prodDebug_stats', JSON.stringify(this.stats));
    } catch (error) {
      // تجاهل أخطاء localStorage
    }
  }

  public updateCacheStats(hitRate: number, size: number, entries: number): void {
    this.stats.cache = { hitRate, size, entries };
  }

  private getStats(): PerformanceStats {
    return { ...this.stats };
  }

  private getLogs(count = 50): ProductionLog[] {
    return this.logs.slice(-count);
  }

  private searchLogs(query: string): ProductionLog[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
    );
  }

  private exportData(): string {
    const data = {
      stats: this.stats,
      logs: this.logs,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    
    // تنزيل كملف
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodDebug_${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return jsonString;
  }

  private clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('prodDebug_logs');
    this.logToStorage('info', '🧹 Logs cleared');
  }

  private analyzePerformance(): any {
    const analysis = {
      summary: {
        totalRequests: this.stats.requests.total,
        blockedPercentage: ((this.stats.requests.blocked / this.stats.requests.total) * 100).toFixed(2),
        cacheHitRate: this.stats.cache.hitRate.toFixed(2),
        averageResponseTime: this.stats.timing.averageResponseTime.toFixed(2)
      },
      slowRequests: this.logs
        .filter(log => log.data?.duration > 1000)
        .map(log => ({ message: log.message, duration: log.data.duration })),
      duplicatePatterns: this.findDuplicateRequests(),
      recommendations: this.generateRecommendations()
    };

    console.table(analysis.summary);
    return analysis;
  }

  private findDuplicateRequests(): any[] {
    const urlCounts = new Map<string, number>();
    
    this.logs.forEach(log => {
      if (log.message.includes('request') && log.data?.url) {
        const url = log.data.url;
        urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
      }
    });

    return Array.from(urlCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    if (this.stats.requests.blocked / this.stats.requests.total < 0.3) {
      recommendations.push('Consider implementing more aggressive request deduplication');
    }
    
    if (this.stats.cache.hitRate < 0.5) {
      recommendations.push('Cache hit rate is low, consider increasing cache TTL');
    }
    
    if (this.stats.timing.slowestRequest.time > 5000) {
      recommendations.push(`Slowest request (${this.stats.timing.slowestRequest.url}) takes ${this.stats.timing.slowestRequest.time}ms`);
    }
    
    return recommendations;
  }

  private getSystemInfo(): any {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      performance: {
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
        } : 'Not available',
        timing: performance.timing
      },
      localStorage: {
        available: !!window.localStorage,
        usage: this.getLocalStorageUsage()
      }
    };
  }

  private getLocalStorageUsage(): string {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length;
        }
      }
      return `${Math.round(total / 1024)} KB`;
    } catch {
      return 'Unknown';
    }
  }

  // استعادة البيانات عند التهيئة
  public restoreFromStorage(): void {
    try {
      const savedLogs = localStorage.getItem('prodDebug_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
      
      const savedStats = localStorage.getItem('prodDebug_stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...JSON.parse(savedStats) };
      }
    } catch (error) {
      this.logToStorage('warn', 'Failed to restore debug data from storage', error);
    }
  }
}

// إنشاء النسخة العامة
export const productionDebugger = ProductionDebugger.getInstance();

// استعادة البيانات المحفوظة
productionDebugger.restoreFromStorage();

// تصدير دالة مساعدة للاستخدام السريع
export const prodLog = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
  productionDebugger.logToStorage(level, message, data);
};

export default productionDebugger; 