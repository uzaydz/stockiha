// ===================================================================
// 🚀 BAZAAR PERFORMANCE OPTIMIZER - محسن الأداء المتقدم
// ===================================================================

interface SlowRequestData {
  endpoint: string;
  averageTime: number;
  count: number;
  lastOccurrence: number;
}

interface OptimizationSuggestion {
  endpoint: string;
  issue: string;
  solution: string;
  expectedImprovement: string;
  priority: 'high' | 'medium' | 'low';
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private slowRequests: Map<string, SlowRequestData> = new Map();
  private readonly SLOW_THRESHOLD = 500; // ms
  private readonly CRITICAL_THRESHOLD = 1000; // ms

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  public analyzeRequest(url: string, duration: number): void {
    if (duration < this.SLOW_THRESHOLD) return;

    const endpoint = this.extractEndpoint(url);
    const existing = this.slowRequests.get(endpoint);

    if (existing) {
      existing.averageTime = (existing.averageTime * existing.count + duration) / (existing.count + 1);
      existing.count++;
      existing.lastOccurrence = Date.now();
    } else {
      this.slowRequests.set(endpoint, {
        endpoint,
        averageTime: duration,
        count: 1,
        lastOccurrence: Date.now()
      });
    }

    // إنذار فوري للطلبات الحرجة البطيئة
    if (duration > this.CRITICAL_THRESHOLD) {
      console.warn(`🐌 CRITICAL SLOW REQUEST: ${endpoint} took ${duration}ms`);
      this.suggestImmediateOptimization(endpoint, duration);
    }
  }

  public generateOptimizationReport(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    this.slowRequests.forEach((data, endpoint) => {
      if (data.averageTime > this.CRITICAL_THRESHOLD) {
        suggestions.push({
          endpoint,
          issue: `طلب بطيء جداً: ${Math.round(data.averageTime)}ms في المتوسط`,
          solution: this.getSolutionForEndpoint(endpoint),
          expectedImprovement: `تحسين 60-80% في السرعة`,
          priority: 'high'
        });
      } else if (data.averageTime > this.SLOW_THRESHOLD) {
        suggestions.push({
          endpoint,
          issue: `طلب بطيء: ${Math.round(data.averageTime)}ms في المتوسط`,
          solution: this.getSolutionForEndpoint(endpoint),
          expectedImprovement: `تحسين 30-50% في السرعة`,
          priority: 'medium'
        });
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('?')[0];
    } catch {
      return url;
    }
  }

  private getSolutionForEndpoint(endpoint: string): string {
    if (endpoint.includes('organization_subscriptions')) {
      return `تحسين استعلام الاشتراكات:
• إضافة فهرسة على (organization_id, status, end_date)
• تحديد fields محددة بدلاً من select=*
• استخدام limit=1 لأسرع استجابة
• تطبيق cache طويل المدى (10-15 دقيقة)`;
    }
    
    if (endpoint.includes('product_subcategories')) {
      return `تحسين استعلام الفئات الفرعية:
• تطبيق cache عالمي للفئات الفرعية (30 دقيقة)
• تحميل الفئات الفرعية مع الفئات الرئيسية في طلب واحد
• استخدام eager loading للعلاقات`;
    }
    
    if (endpoint.includes('organization_settings')) {
      return `تحسين إعدادات المؤسسة:
• تطبيق singleton pattern للإعدادات
• cache محلي في localStorage
• تحميل الإعدادات مرة واحدة فقط عند بدء الجلسة`;
    }
    
    return `تطبيق التحسينات العامة:
• زيادة مدة cache
• تحسين استعلامات قاعدة البيانات
• استخدام eager loading للعلاقات`;
  }

  private suggestImmediateOptimization(endpoint: string, duration: number): void {
    const solution = this.getSolutionForEndpoint(endpoint);
    
    console.group(`🚨 تحسين عاجل مطلوب: ${endpoint}`);
    console.log(`⏱️ وقت الاستجابة: ${duration}ms`);
    console.log(`💡 الحل المقترح:`);
    console.log(solution);
    console.groupEnd();
  }

  public getSlowRequestsReport(): string {
    let report = `
🐌 تقرير الطلبات البطيئة
============================

`;

    this.slowRequests.forEach((data, endpoint) => {
      const priority = data.averageTime > this.CRITICAL_THRESHOLD ? '🔴 حرج' : '🟡 متوسط';
      report += `${priority} ${endpoint}
  • متوسط الوقت: ${Math.round(data.averageTime)}ms
  • عدد المرات: ${data.count}
  • آخر حدوث: ${new Date(data.lastOccurrence).toLocaleTimeString()}

`;
    });

    return report;
  }

  public clearData(): void {
    this.slowRequests.clear();
    console.log('🧹 تم مسح بيانات محسن الأداء');
  }
}

// إضافة إلى النافذة العامة
declare global {
  interface Window {
    performanceOptimizer: PerformanceOptimizer;
  }
}

window.performanceOptimizer = PerformanceOptimizer.getInstance();

export default PerformanceOptimizer; 