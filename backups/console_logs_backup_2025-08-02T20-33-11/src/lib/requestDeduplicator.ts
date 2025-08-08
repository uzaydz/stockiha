/**
 * 🔄 منع تكرار الطلبات المتزامنة
 * يمنع تنفيذ نفس الطلب عدة مرات في نفس الوقت
 */

import { useCallback } from 'react';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 ثانية

  /**
   * تنفيذ طلب مع منع التكرار
   */
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      timeout?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { timeout = this.REQUEST_TIMEOUT, forceRefresh = false } = options;
    const now = Date.now();

    // التحقق من وجود طلب معلق
    const pending = this.pendingRequests.get(key);
    if (pending && !forceRefresh) {
      // التحقق من انتهاء صلاحية الطلب المعلق
      if ((now - pending.timestamp) < timeout) {
        return pending.promise;
      } else {
        // إزالة الطلب المعلق المنتهي الصلاحية
        this.pendingRequests.delete(key);
      }
    }

    // إنشاء طلب جديد
    const promise = requestFn().catch((error) => {
      // إزالة الطلب من القائمة في حالة الفشل
      this.pendingRequests.delete(key);
      throw error;
    });

    // حفظ الطلب المعلق
    this.pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    // تنظيف الطلبات القديمة
    this.cleanup();

    return promise;
  }

  /**
   * تنظيف الطلبات القديمة
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if ((now - request.timestamp) > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * إزالة طلب محدد
   */
  removeRequest(key: string) {
    this.pendingRequests.delete(key);
  }

  /**
   * إزالة جميع الطلبات
   */
  clearAll() {
    this.pendingRequests.clear();
  }

  /**
   * الحصول على عدد الطلبات المعلقة
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * التحقق من وجود طلب معلق
   */
  hasPendingRequest(key: string): boolean {
    return this.pendingRequests.has(key);
  }
}

// إنشاء نسخة عامة
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook لاستخدام منع تكرار الطلبات
 */
export function useRequestDeduplicator() {
  const executeRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      timeout?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> => {
    return requestDeduplicator.executeRequest(key, requestFn, options);
  }, []);

  const removeRequest = useCallback((key: string) => {
    requestDeduplicator.removeRequest(key);
  }, []);

  const clearAll = useCallback(() => {
    requestDeduplicator.clearAll();
  }, []);

  const getPendingCount = useCallback(() => {
    return requestDeduplicator.getPendingCount();
  }, []);

  const hasPendingRequest = useCallback((key: string) => {
    return requestDeduplicator.hasPendingRequest(key);
  }, []);

  return {
    executeRequest,
    removeRequest,
    clearAll,
    getPendingCount,
    hasPendingRequest
  };
}

/**
 * دالة مساعدة لإنشاء مفتاح فريد للطلب
 */
export function createRequestKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

/**
 * دالة مساعدة لتنفيذ طلب Supabase مع منع التكرار
 */
export async function executeSupabaseRequest<T>(
  key: string,
  requestFn: () => Promise<{ data: T | null; error: any }>,
  options?: {
    timeout?: number;
    forceRefresh?: boolean;
  }
): Promise<{ data: T | null; error: any }> {
  return requestDeduplicator.executeRequest(key, requestFn, options);
} 