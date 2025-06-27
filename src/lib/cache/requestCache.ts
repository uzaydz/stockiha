// نظام تخزين مؤقت متقدم لتقليل الطلبات المتكررة لقاعدة البيانات
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestInProgress {
  promise: Promise<any>;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private requestsInProgress = new Map<string, RequestInProgress>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 دقائق
  private readonly MAX_CACHE_SIZE = 100;
  private readonly REQUEST_TIMEOUT = 30 * 1000; // 30 ثانية

  // تنظيف دوري للذاكرة
  constructor() {
    setInterval(() => this.cleanup(), 60 * 1000); // كل دقيقة
  }

  // الحصول على البيانات من التخزين المؤقت أو جلبها
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // التحقق من وجود البيانات في التخزين المؤقت
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    // التحقق من وجود طلب قيد التنفيذ
    const inProgress = this.requestsInProgress.get(key);
    if (inProgress) {
      // إذا كان الطلب قديم جداً، حذفه وإنشاء طلب جديد
      if (Date.now() - inProgress.timestamp > this.REQUEST_TIMEOUT) {
        this.requestsInProgress.delete(key);
      } else {
        try {
          return await inProgress.promise;
        } catch (error) {
          // إذا فشل الطلب المشترك، حاول مرة أخرى
          this.requestsInProgress.delete(key);
        }
      }
    }

    // إنشاء طلب جديد
    const promise = fetcher();
    this.requestsInProgress.set(key, {
      promise,
      timestamp: Date.now()
    });

    try {
      const data = await promise;
      
      // حفظ البيانات في التخزين المؤقت
      this.set(key, data, ttl);
      
      return data;
    } finally {
      // حذف الطلب من قائمة الطلبات قيد التنفيذ
      this.requestsInProgress.delete(key);
    }
  }

  // حفظ البيانات في التخزين المؤقت
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // التحقق من حجم التخزين المؤقت
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // حذف أقدم العناصر
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  // حذف عنصر من التخزين المؤقت
  delete(key: string): void {
    this.cache.delete(key);
  }

  // حذف جميع العناصر المتعلقة بنمط معين
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // مسح التخزين المؤقت بالكامل
  clear(): void {
    this.cache.clear();
    this.requestsInProgress.clear();
  }

  // تنظيف العناصر المنتهية الصلاحية
  private cleanup(): void {
    const now = Date.now();
    
    // تنظيف التخزين المؤقت
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }

    // تنظيف الطلبات القديمة قيد التنفيذ
    for (const [key, request] of this.requestsInProgress.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.requestsInProgress.delete(key);
      }
    }
  }

  // العثور على أقدم مفتاح في التخزين المؤقت
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // الحصول على إحصائيات التخزين المؤقت
  getStats() {
    return {
      cacheSize: this.cache.size,
      requestsInProgress: this.requestsInProgress.size,
      cacheKeys: Array.from(this.cache.keys()),
      requestKeys: Array.from(this.requestsInProgress.keys())
    };
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const requestCache = new RequestCache();

// دالة مساعدة لإنشاء مفتاح تخزين مؤقت
export function createCacheKey(prefix: string, ...params: any[]): string {
  return `${prefix}:${params.map(p => String(p)).join(':')}`;
}

// دالة مساعدة لتخزين مؤقت للدوال
export function withRequestCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return requestCache.get(key, () => fn(...args), ttl);
  }) as T;
}
