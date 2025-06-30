// نظام تخزين مؤقت محسن للاستعلامات Supabase
import { supabase } from '@/lib/supabase-client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RequestInProgress<T> {
  promise: Promise<T>;
  timestamp: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inProgress = new Map<string, RequestInProgress<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // تنظيف دوري كل 5 دقائق
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * تنظيف البيانات المنتهية الصلاحية
   */
  private cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    // تنظيف الطلبات المعلقة القديمة (أكثر من 30 ثانية)
    for (const [key, request] of this.inProgress.entries()) {
      if (now - request.timestamp > 30000) {
        this.inProgress.delete(key);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 تم تنظيف ${cleanedCount} عنصر من التخزين المؤقت`);
    }
  }

  /**
   * إنشاء مفتاح تخزين مؤقت من معاملات الاستعلام
   */
  private createCacheKey(table: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${table}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * تحديد وقت الحياة للتخزين المؤقت حسب نوع الجدول
   */
  private getTTL(table: string): number {
    const TTL_CONFIG: Record<string, number> = {
      'shipping_providers': 30 * 60 * 1000, // 30 دقيقة
      'yalidine_provinces_global': 60 * 60 * 1000, // ساعة
      'organization_settings': 15 * 60 * 1000, // 15 دقيقة
      'products': 5 * 60 * 1000, // 5 دقائق
      'orders': 2 * 60 * 1000, // دقيقتان
      'services': 10 * 60 * 1000, // 10 دقائق
      'customers': 5 * 60 * 1000, // 5 دقائق
      'organizations': 15 * 60 * 1000, // 15 دقيقة
      'shipping_provider_settings': 10 * 60 * 1000, // 10 دقائق
      'default': 5 * 60 * 1000 // افتراضي 5 دقائق
    };

    return TTL_CONFIG[table] || TTL_CONFIG.default;
  }

  /**
   * تنفيذ استعلام مع تخزين مؤقت ومعالجة أخطاء PGRST116
   */
  async query<T>(
    table: string,
    queryFn: () => any,
    options: {
      select?: string;
      filters?: Record<string, any>;
      expectSingle?: boolean;
      expectMultiple?: boolean;
      ttl?: number;
    } = {}
  ): Promise<T | null> {
    const { select = '*', filters = {}, expectSingle = false, expectMultiple = false, ttl } = options;
    
    // إنشاء مفتاح التخزين المؤقت
    const cacheKey = this.createCacheKey(table, { select, ...filters, expectSingle, expectMultiple });
    
    // التحقق من التخزين المؤقت
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // التحقق من وجود طلب قيد التنفيذ
    const inProgress = this.inProgress.get(cacheKey);
    if (inProgress) {
      try {
        return await inProgress.promise;
      } catch (error) {
        this.inProgress.delete(cacheKey);
        throw error;
      }
    }

    // تنفيذ الاستعلام الجديد
    const promise = this.executeQuery<T>(table, queryFn, options);
    this.inProgress.set(cacheKey, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      
      // حفظ النتيجة في التخزين المؤقت
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: ttl || this.getTTL(table)
      });

      this.inProgress.delete(cacheKey);
      return result;
    } catch (error) {
      this.inProgress.delete(cacheKey);
      throw error;
    }
  }

  /**
   * تنفيذ الاستعلام مع معالجة أخطاء PGRST116
   */
  private async executeQuery<T>(
    table: string,
    queryFn: () => any,
    options: {
      expectSingle?: boolean;
      expectMultiple?: boolean;
    }
  ): Promise<T | null> {
    const { expectSingle = false, expectMultiple = false } = options;

    try {
      let query = queryFn();

      // تطبيق الاستراتيجية المناسبة حسب التوقعات
      if (expectSingle) {
        query = query.maybeSingle();
      } else if (expectMultiple) {
        // للاستعلامات التي نتوقع منها صفوف متعددة
        query = query.limit(1000); // حد أقصى معقول
      } else {
        // الاستراتيجية الافتراضية: محاولة single أولاً، ثم fallback
        try {
          query = query.maybeSingle();
        } catch (singleError: any) {
          if (singleError.code === 'PGRST116') {
            console.log(`📊 ${table}: تحويل من single إلى multiple rows`);
            query = queryFn().limit(100); // fallback إلى استعلام متعدد محدود
          } else {
            throw singleError;
          }
        }
      }

      const { data, error } = await query;

      if (error) {
        // معالجة خاصة لخطأ PGRST116
        if (error.code === 'PGRST116') {
          console.log(`⚠️ PGRST116 في ${table}: ${error.message}`);
          
          // إعادة المحاولة مع استراتيجية مختلفة
          if (expectSingle) {
            // إذا كنا نتوقع صف واحد ولكن وجدنا عدة صفوف، أخذ الأول
            const { data: multiData, error: multiError } = await queryFn().limit(1);
            if (multiError) throw multiError;
            return multiData?.[0] || null;
          } else {
            // إذا لم نجد أي صفوف، إرجاع null أو مصفوفة فارغة
            return expectMultiple ? [] as T : null;
          }
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`❌ خطأ في استعلام ${table}:`, error);
      throw error;
    }
  }

  /**
   * مسح التخزين المؤقت لجدول معين
   */
  clearTable(table: string) {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${table}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * مسح جميع التخزين المؤقت
   */
  clearAll() {
    this.cache.clear();
    this.inProgress.clear();
  }

  /**
   * إحصائيات التخزين المؤقت
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      inProgressCount: this.inProgress.size,
      tables: Array.from(this.cache.keys()).reduce((acc, key) => {
        const table = key.split(':')[0];
        acc[table] = (acc[table] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * تدمير الكائن وتنظيف الموارد
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// إنشاء instance عامة
export const queryCache = new QueryCache();

// دوال مساعدة للاستخدام السهل
export const cachedQuery = {
  /**
   * استعلام يتوقع صف واحد
   */
  single: <T>(table: string, queryFn: () => any, ttl?: number) => 
    queryCache.query<T>(table, queryFn, { expectSingle: true, ttl }),

  /**
   * استعلام يتوقع صفوف متعددة
   */
  multiple: <T>(table: string, queryFn: () => any, ttl?: number) => 
    queryCache.query<T>(table, queryFn, { expectMultiple: true, ttl }),

  /**
   * استعلام عام مع معالجة تلقائية
   */
  auto: <T>(table: string, queryFn: () => any, ttl?: number) => 
    queryCache.query<T>(table, queryFn, { ttl })
};

// تنظيف عند إغلاق التطبيق
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    queryCache.destroy();
  });
}

export default queryCache; 