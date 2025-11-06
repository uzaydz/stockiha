/**
 * نظام لمنع تكرار الطلبات المتزامنة (Request Deduplication)
 * يحل مشكلة الطلبات المكررة للـ API
 */

import { devLog, errorLog } from './logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  resolvers: Array<(value: T) => void>;
  rejecters: Array<(error: any) => void>;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly DEFAULT_TTL = 2000; // 2 ثانية

  /**
   * تنفيذ طلب مع منع التكرار
   * إذا كان هناك طلب معلق بنفس المفتاح، يُرجع نفس Promise
   */
  deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // التحقق من وجود طلب معلق
    const pending = this.pendingRequests.get(key);

    if (pending) {
      devLog(`[Dedup] Found pending request for key: ${key}`);

      // إرجاع promise موجود
      return new Promise<T>((resolve, reject) => {
        pending.resolvers.push(resolve);
        pending.rejecters.push(reject);
      });
    }

    devLog(`[Dedup] Creating new request for key: ${key}`);

    // إنشاء طلب جديد
    const resolvers: Array<(value: T) => void> = [];
    const rejecters: Array<(error: any) => void> = [];

    const promise = fetcher()
      .then((result) => {
        // حل جميع الـ promises المنتظرة
        resolvers.forEach((resolve) => resolve(result));

        // حذف من الـ pending بعد TTL
        setTimeout(() => {
          this.pendingRequests.delete(key);
          devLog(`[Dedup] Cleared request cache for key: ${key}`);
        }, ttl);

        return result;
      })
      .catch((error) => {
        // رفض جميع الـ promises المنتظرة
        rejecters.forEach((reject) => reject(error));

        // حذف فوراً عند الخطأ
        this.pendingRequests.delete(key);
        errorLog(`[Dedup] Request failed for key: ${key}`, error);

        throw error;
      });

    // حفظ الطلب المعلق
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      resolvers,
      rejecters,
    });

    return promise;
  }

  /**
   * مسح جميع الطلبات المعلقة
   */
  clear(): void {
    this.pendingRequests.clear();
    devLog('[Dedup] Cleared all pending requests');
  }

  /**
   * مسح طلب معين
   */
  clearKey(key: string): void {
    this.pendingRequests.delete(key);
    devLog(`[Dedup] Cleared request for key: ${key}`);
  }

  /**
   * الحصول على عدد الطلبات المعلقة
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Instance مشتركة
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper function للاستخدام السريع
 */
export function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return requestDeduplicator.deduplicate(key, fetcher, ttl);
}

/**
 * Decorator للـ functions
 */
export function withDeduplication<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return deduplicateRequest(key, () => fn(...args), ttl);
  }) as T;
}

export default requestDeduplicator;
