/**
 * 🚀 Debounced Requests System
 * نظام debouncing للطلبات لمنع التكرار السريع
 */

interface DebouncedRequestOptions {
  delay?: number; // تأخير بالمللي ثانية
  maxDelay?: number; // أقصى تأخير
  leading?: boolean; // تنفيذ فوري في البداية
  trailing?: boolean; // تنفيذ في النهاية
}

class DebouncedRequestManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private maxDelays = new Map<string, NodeJS.Timeout>();
  private lastExecuted = new Map<string, number>();

  /**
   * تنفيذ طلب مع debouncing
   */
  debounce<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: DebouncedRequestOptions = {}
  ): Promise<T> {
    const {
      delay = 300,
      maxDelay = 2000,
      leading = false,
      trailing = true
    } = options;

    return new Promise((resolve, reject) => {
      // إلغاء الطلبات السابقة
      this.clearTimer(key);
      this.clearMaxDelay(key);

      // تنفيذ فوري إذا كان leading = true
      if (leading && !this.lastExecuted.has(key)) {
        this.executeRequest(key, requestFn, resolve, reject);
        return;
      }

      // إعداد timer للتنفيذ
      const timer = setTimeout(() => {
        if (trailing) {
          this.executeRequest(key, requestFn, resolve, reject);
        }
        this.clearTimer(key);
      }, delay);

      this.timers.set(key, timer);

      // إعداد maxDelay
      const maxTimer = setTimeout(() => {
        this.executeRequest(key, requestFn, resolve, reject);
        this.clearTimer(key);
        this.clearMaxDelay(key);
      }, maxDelay);

      this.maxDelays.set(key, maxTimer);
    });
  }

  /**
   * تنفيذ الطلب
   */
  private async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: any) => void
  ): Promise<void> {
    try {
      const result = await requestFn();
      this.lastExecuted.set(key, Date.now());
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * إلغاء timer
   */
  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * إلغاء maxDelay
   */
  private clearMaxDelay(key: string): void {
    const timer = this.maxDelays.get(key);
    if (timer) {
      clearTimeout(timer);
      this.maxDelays.delete(key);
    }
  }

  /**
   * إلغاء جميع الطلبات
   */
  cancelAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.maxDelays.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.maxDelays.clear();
    this.lastExecuted.clear();
  }

  /**
   * إلغاء طلب محدد
   */
  cancel(key: string): void {
    this.clearTimer(key);
    this.clearMaxDelay(key);
  }
}

// إنشاء instance واحد
export const debouncedRequests = new DebouncedRequestManager();

/**
 * Hook لاستخدام debounced requests
 */
export function useDebouncedRequest() {
  return {
    debounce: debouncedRequests.debounce.bind(debouncedRequests),
    cancel: debouncedRequests.cancel.bind(debouncedRequests),
    cancelAll: debouncedRequests.cancelAll.bind(debouncedRequests)
  };
}

/**
 * دالة مساعدة للطلبات الشائعة
 */
export const debouncedRequestHelpers = {
  /**
   * طلب مع debouncing عادي (300ms)
   */
  async request<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return debouncedRequests.debounce(key, requestFn, { delay: 300 });
  },

  /**
   * طلب سريع مع debouncing قصير (100ms)
   */
  async fastRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return debouncedRequests.debounce(key, requestFn, { delay: 100 });
  },

  /**
   * طلب مع debouncing طويل (1000ms)
   */
  async slowRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return debouncedRequests.debounce(key, requestFn, { delay: 1000 });
  },

  /**
   * طلب مع leading execution
   */
  async leadingRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return debouncedRequests.debounce(key, requestFn, { 
      delay: 300, 
      leading: true, 
      trailing: false 
    });
  }
};

export default debouncedRequests;
