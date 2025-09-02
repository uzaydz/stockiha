/**
 * نظام تحكم في معدل الطلبات لمنع الإرسال المفرط
 * يهدف إلى حل مشكلة 400,000+ طلب في الساعة
 */

interface ThrottleConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  cooldownPeriod: number; // بالميلي ثانية
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
  organizationId?: string;
}

class RequestThrottleManager {
  private requests: Map<string, RequestRecord[]> = new Map();
  private cooldowns: Map<string, number> = new Map();
  
  private defaultConfig: ThrottleConfig = {
    maxRequestsPerMinute: 10, // 10 طلبات في الدقيقة كحد أقصى
    maxRequestsPerHour: 200,  // 200 طلب في الساعة كحد أقصى
    cooldownPeriod: 2000,     // 2 ثانية بين الطلبات المتشابهة
  };

  /**
   * فحص ما إذا كان الطلب مسموح أم لا
   */
  canMakeRequest(
    endpoint: string, 
    organizationId?: string,
    config: Partial<ThrottleConfig> = {}
  ): boolean {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = this.getRequestKey(endpoint, organizationId);
    const now = Date.now();

    // فحص cooldown period
    const lastCooldown = this.cooldowns.get(key);
    if (lastCooldown && now - lastCooldown < finalConfig.cooldownPeriod) {
      console.warn(`🚫 [RequestThrottle] طلب محظور - في فترة cooldown: ${endpoint}`);
      return false;
    }

    // الحصول على سجل الطلبات لهذا المفتاح
    const requestHistory = this.requests.get(key) || [];
    
    // تنظيف الطلبات القديمة (أكثر من ساعة)
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentRequests = requestHistory.filter(req => req.timestamp > oneHourAgo);
    
    // فحص حد الساعة
    if (recentRequests.length >= finalConfig.maxRequestsPerHour) {
      console.warn(`🚫 [RequestThrottle] تم تجاوز حد الساعة (${finalConfig.maxRequestsPerHour}): ${endpoint}`);
      return false;
    }

    // فحص حد الدقيقة
    const oneMinuteAgo = now - (60 * 1000);
    const requestsInLastMinute = recentRequests.filter(req => req.timestamp > oneMinuteAgo);
    
    if (requestsInLastMinute.length >= finalConfig.maxRequestsPerMinute) {
      console.warn(`🚫 [RequestThrottle] تم تجاوز حد الدقيقة (${finalConfig.maxRequestsPerMinute}): ${endpoint}`);
      return false;
    }

    return true;
  }

  /**
   * تسجيل طلب جديد
   */
  recordRequest(endpoint: string, organizationId?: string): void {
    const key = this.getRequestKey(endpoint, organizationId);
    const now = Date.now();
    
    const requestHistory = this.requests.get(key) || [];
    requestHistory.push({
      timestamp: now,
      endpoint,
      organizationId
    });

    // الاحتفاظ بآخر 300 طلب فقط لتوفير الذاكرة
    if (requestHistory.length > 300) {
      requestHistory.splice(0, requestHistory.length - 300);
    }

    this.requests.set(key, requestHistory);
    this.cooldowns.set(key, now);

    console.log(`✅ [RequestThrottle] طلب مسجل: ${endpoint} (المجموع: ${requestHistory.length})`);
  }

  /**
   * مسح السجلات القديمة دورياً
   */
  cleanup(): void {
    const now = Date.now();
    const twoHoursAgo = now - (2 * 60 * 60 * 1000);

    for (const [key, requests] of this.requests.entries()) {
      const filteredRequests = requests.filter(req => req.timestamp > twoHoursAgo);
      
      if (filteredRequests.length === 0) {
        this.requests.delete(key);
        this.cooldowns.delete(key);
      } else {
        this.requests.set(key, filteredRequests);
      }
    }

    console.log(`🧹 [RequestThrottle] تنظيف مكتمل. المفاتيح المتبقية: ${this.requests.size}`);
  }

  /**
   * الحصول على إحصائيات الطلبات
   */
  getStats(): {
    totalKeys: number;
    totalRequests: number;
    requestsInLastHour: number;
    requestsInLastMinute: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    
    let totalRequests = 0;
    let requestsInLastHour = 0;
    let requestsInLastMinute = 0;

    for (const requests of this.requests.values()) {
      totalRequests += requests.length;
      requestsInLastHour += requests.filter(req => req.timestamp > oneHourAgo).length;
      requestsInLastMinute += requests.filter(req => req.timestamp > oneMinuteAgo).length;
    }

    return {
      totalKeys: this.requests.size,
      totalRequests,
      requestsInLastHour,
      requestsInLastMinute
    };
  }

  private getRequestKey(endpoint: string, organizationId?: string): string {
    return organizationId ? `${endpoint}:${organizationId}` : endpoint;
  }
}

// إنشاء مثيل وحيد
export const requestThrottleManager = new RequestThrottleManager();

// تنظيف دوري كل 30 دقيقة
setInterval(() => {
  requestThrottleManager.cleanup();
}, 30 * 60 * 1000);

/**
 * Hook لاستخدام نظام التحكم في معدل الطلبات
 */
export function useRequestThrottle() {
  return {
    canMakeRequest: requestThrottleManager.canMakeRequest.bind(requestThrottleManager),
    recordRequest: requestThrottleManager.recordRequest.bind(requestThrottleManager),
    getStats: requestThrottleManager.getStats.bind(requestThrottleManager),
  };
}

/**
 * دالة wrapper للطلبات مع التحكم في المعدل
 */
export async function throttledRequest<T>(
  requestFn: () => Promise<T>,
  endpoint: string,
  organizationId?: string,
  config?: Partial<ThrottleConfig>
): Promise<T | null> {
  
  if (!requestThrottleManager.canMakeRequest(endpoint, organizationId, config)) {
    console.warn(`🚫 [ThrottledRequest] طلب مرفوض: ${endpoint}`);
    return null;
  }

  try {
    requestThrottleManager.recordRequest(endpoint, organizationId);
    const result = await requestFn();
    return result;
  } catch (error) {
    console.error(`❌ [ThrottledRequest] خطأ في الطلب: ${endpoint}`, error);
    throw error;
  }
}

// إضافة إحصائيات للـ window للتصحيح
if (typeof window !== 'undefined') {
  (window as any).requestThrottleStats = () => {
    const stats = requestThrottleManager.getStats();
    console.table(stats);
    return stats;
  };
}
