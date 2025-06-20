/**
 * نظام منع تكرار الطلبات العالمي - حل بسيط وفعال
 * يتم تطبيقه على مستوى window.fetch مباشرة
 */

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
  count: number;
}

interface RequestLog {
  url: string;
  method: string;
  timestamp: number;
  count: number;
  category: 'Products' | 'Categories' | 'Auth' | 'Settings' | 'Apps' | 'Supabase' | 'Other';
  isDuplicate: boolean;
  status: 'pending' | 'completed' | 'failed';
}

class GlobalRequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestLog = new Map<string, RequestLog>();
  private readonly TTL = 5000; // 5 ثوان
  private isInitialized = false;

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.setupFetchInterception();
    this.setupCleanupInterval();
    this.exposeGlobalFunctions();
    this.isInitialized = true;
    
  }

  private setupFetchInterception() {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      // رصد جميع طلبات API
      if (this.shouldTrack(url)) {
        const logKey = this.generateLogKey(method, url);
        const dedupeKey = this.generateKey(method, url);
        const category = this.categorizeRequest(url);
        
        // تحديث سجل الطلبات
        this.updateRequestLog(logKey, method, url, category);
        
        // تحديد الطلبات المهمة التي نريد منع تكرارها
        if (this.shouldDeduplicate(url)) {
          // التحقق من وجود طلب نشط
          const existing = this.pendingRequests.get(dedupeKey);
          if (existing && (Date.now() - existing.timestamp) < this.TTL) {
            existing.count++;
            
            // تحديث سجل الطلبات المكررة
            this.markAsDuplicate(logKey);
            
            return existing.promise.then(response => response.clone());
          }
          
          // إنشاء طلب جديد
          const promise = originalFetch(input, init)
            .then(response => {
              this.markAsCompleted(logKey);
              return response;
            })
            .catch(error => {
              this.markAsFailed(logKey);
              throw error;
            });
            
          this.pendingRequests.set(dedupeKey, {
            promise,
            timestamp: Date.now(),
            count: 1
          });
          
          // إزالة من الخريطة عند الانتهاء
          promise.finally(() => {
            setTimeout(() => {
              this.pendingRequests.delete(dedupeKey);
            }, 1000);
          });
          
          return promise;
        }
      }
      
      return originalFetch(input, init);
    };
  }

  private shouldTrack(url: string): boolean {
    return url.includes('/rest/v1/') || 
           url.includes('/auth/v1/') ||
           url.includes('supabase.co') ||
           url.includes('/api/');
  }

  private shouldDeduplicate(url: string): boolean {
    return url.includes('/rest/v1/') || 
           url.includes('/auth/v1/') ||
           url.includes('supabase.co');
  }

  private categorizeRequest(url: string): RequestLog['category'] {
    if (url.includes('/products')) return 'Products';
    if (url.includes('/categories')) return 'Categories';
    if (url.includes('/auth/')) return 'Auth';
    if (url.includes('/settings')) return 'Settings';
    if (url.includes('/apps')) return 'Apps';
    if (url.includes('supabase.co')) return 'Supabase';
    return 'Other';
  }

  private updateRequestLog(key: string, method: string, url: string, category: RequestLog['category']) {
    const existing = this.requestLog.get(key);
    const timestamp = Date.now();
    
    if (existing) {
      existing.count++;
      existing.timestamp = timestamp;
      existing.isDuplicate = true;
    } else {
      this.requestLog.set(key, {
        url: this.simplifyUrl(url),
        method,
        timestamp,
        count: 1,
        category,
        isDuplicate: false,
        status: 'pending'
      });
    }
  }

  private markAsDuplicate(key: string) {
    const log = this.requestLog.get(key);
    if (log) {
      log.isDuplicate = true;
      log.count++;
    }
  }

  private markAsCompleted(key: string) {
    const log = this.requestLog.get(key);
    if (log) {
      log.status = 'completed';
    }
  }

  private markAsFailed(key: string) {
    const log = this.requestLog.get(key);
    if (log) {
      log.status = 'failed';
    }
  }

  private generateKey(method: string, url: string): string {
    // إنشاء مفتاح فريد مبسط للـ deduplication
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const orgId = urlObj.searchParams.get('organization_id');
      return `${method}:${path}${orgId ? `:org:${orgId}` : ''}`;
    } catch {
      return `${method}:${url}`;
    }
  }

  private generateLogKey(method: string, url: string): string {
    // إنشاء مفتاح فريد للـ logging
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = urlObj.searchParams;
      
      // تبسيط المعاملات المهمة
      const orgId = params.get('organization_id');
      const select = params.get('select');
      const limit = params.get('limit');
      
      let keyParams = '';
      if (orgId) keyParams += `:org:${orgId.slice(-8)}`;
      if (select) keyParams += `:sel:${select.length > 20 ? select.slice(0, 20) + '...' : select}`;
      if (limit) keyParams += `:lim:${limit}`;
      
      return `${method}:${path}${keyParams}`;
    } catch {
      return `${method}:${url.substring(0, 50)}`;
    }
  }

  private simplifyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'unknown';
    } catch {
      return url.substring(url.lastIndexOf('/') + 1);
    }
  }

  private setupCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 60000; // دقيقة واحدة للسجلات
      
      // تنظيف الطلبات النشطة
      for (const [key, request] of this.pendingRequests.entries()) {
        if (now - request.timestamp > this.TTL) {
          this.pendingRequests.delete(key);
        }
      }
      
      // تنظيف سجل الطلبات القديمة
      for (const [key, log] of this.requestLog.entries()) {
        if (now - log.timestamp > maxAge) {
          this.requestLog.delete(key);
        }
      }
    }, 10000); // تنظيف كل 10 ثوان
  }

  private exposeGlobalFunctions() {
    // إضافة وظائف للتشخيص في console
    (window as any).deduplicationStats = () => this.getStats();
    (window as any).clearDeduplicationCache = () => this.clearCache();
    (window as any).getRequestLogs = () => this.getRequestLogs();
  }

  // وظائف للتشخيص
  getStats() {
    const stats = {
      activeRequests: this.pendingRequests.size,
      totalBlocked: 0,
      totalRequests: 0,
      requests: [] as any[]
    };

    for (const [key, request] of this.pendingRequests.entries()) {
      stats.totalBlocked += request.count - 1;
      stats.requests.push({
        key,
        count: request.count,
        age: Date.now() - request.timestamp
      });
    }

    // إضافة إحصائيات من السجل
    for (const log of this.requestLog.values()) {
      stats.totalRequests += log.count;
      if (log.isDuplicate) {
        stats.totalBlocked += log.count - 1;
      }
    }

    return stats;
  }

  getRequestLogs() {
    const logsByCategory: Record<string, RequestLog[]> = {};
    
    for (const log of this.requestLog.values()) {
      if (!logsByCategory[log.category]) {
        logsByCategory[log.category] = [];
      }
      logsByCategory[log.category].push(log);
    }
    
    return {
      total: this.requestLog.size,
      byCategory: logsByCategory,
      all: Array.from(this.requestLog.values())
    };
  }

  clearCache() {
    this.pendingRequests.clear();
    this.requestLog.clear();
  }
}

// إنشاء وتصدير المثيل العالمي
export const globalDeduplicator = new GlobalRequestDeduplicator();

// تفعيل النظام تلقائياً
if (typeof window !== 'undefined') {
  globalDeduplicator.init();
}
