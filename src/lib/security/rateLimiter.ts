/**
 * خدمة Rate Limiting للحماية من الهجمات
 *
 * تحمي من:
 * - هجمات القوة الغاشمة على أكواد التفعيل
 * - محاولات التلاعب المتكررة
 * - الاستدعاءات المفرطة للـ API
 */

// واجهة سجل المحاولة
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

// واجهة إعدادات الحد
interface RateLimitConfig {
  maxAttempts: number;      // الحد الأقصى للمحاولات
  windowMs: number;         // نافذة الوقت بالميلي ثانية
  blockDurationMs: number;  // مدة الحظر بالميلي ثانية
  incrementalBlock: boolean; // زيادة مدة الحظر مع كل مخالفة
}

// الإعدادات الافتراضية لمختلف أنواع العمليات
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // تفعيل الاشتراك - صارم جداً
  activation: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,       // 15 دقيقة
    blockDurationMs: 60 * 60 * 1000, // ساعة واحدة
    incrementalBlock: true
  },
  // التحقق من الاشتراك - متساهل
  validation: {
    maxAttempts: 30,
    windowMs: 60 * 1000,            // دقيقة واحدة
    blockDurationMs: 5 * 60 * 1000,  // 5 دقائق
    incrementalBlock: false
  },
  // طلبات API عامة
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000,            // دقيقة واحدة
    blockDurationMs: 60 * 1000,     // دقيقة واحدة
    incrementalBlock: false
  },
  // محاولات تسجيل الدخول
  login: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,        // 5 دقائق
    blockDurationMs: 15 * 60 * 1000, // 15 دقيقة
    incrementalBlock: true
  }
};

class RateLimiterService {
  private static instance: RateLimiterService;
  private limits: Map<string, RateLimitEntry> = new Map();
  private violations: Map<string, number> = new Map(); // عدد المخالفات لكل مفتاح
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // تنظيف كل 5 دقائق

  private constructor() {
    // تشغيل التنظيف الدوري
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
  }

  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * التحقق من إمكانية تنفيذ العملية
   * @param key مفتاح فريد (مثل organizationId + operation)
   * @param operation نوع العملية
   * @returns نتيجة الفحص
   */
  check(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api'): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
    message?: string;
  } {
    const config = DEFAULT_CONFIGS[operation];
    const fullKey = `${operation}:${key}`;
    const now = Date.now();

    let entry = this.limits.get(fullKey);

    // إذا لم يكن هناك سجل، نسمح بالعملية
    if (!entry) {
      return { allowed: true, remaining: config.maxAttempts - 1 };
    }

    // التحقق من الحظر
    if (entry.blocked && entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          retryAfter,
          message: `محظور. يرجى المحاولة بعد ${this.formatDuration(retryAfter * 1000)}`
        };
      } else {
        // انتهى الحظر، نعيد تعيين السجل
        entry = {
          count: 0,
          firstAttempt: now,
          lastAttempt: now,
          blocked: false
        };
        this.limits.set(fullKey, entry);
      }
    }

    // التحقق من نافذة الوقت
    if (now - entry.firstAttempt > config.windowMs) {
      // إعادة تعيين النافذة
      entry = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      };
      this.limits.set(fullKey, entry);
      return { allowed: true, remaining: config.maxAttempts - 1 };
    }

    // التحقق من عدد المحاولات
    const remaining = config.maxAttempts - entry.count;
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `تم تجاوز الحد الأقصى للمحاولات (${config.maxAttempts})`
      };
    }

    return { allowed: true, remaining: remaining - 1 };
  }

  /**
   * تسجيل محاولة
   * @param key مفتاح فريد
   * @param operation نوع العملية
   * @param success هل نجحت المحاولة
   */
  record(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api', success: boolean = false): void {
    const config = DEFAULT_CONFIGS[operation];
    const fullKey = `${operation}:${key}`;
    const now = Date.now();

    let entry = this.limits.get(fullKey);

    if (!entry) {
      entry = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      };
    }

    // إذا نجحت المحاولة، نعيد تعيين العداد
    if (success) {
      this.limits.delete(fullKey);
      this.violations.delete(fullKey);
      return;
    }

    // زيادة العداد
    entry.count++;
    entry.lastAttempt = now;

    // التحقق من تجاوز الحد
    if (entry.count >= config.maxAttempts) {
      entry.blocked = true;

      // حساب مدة الحظر
      let blockDuration = config.blockDurationMs;
      if (config.incrementalBlock) {
        const violations = (this.violations.get(fullKey) || 0) + 1;
        this.violations.set(fullKey, violations);
        // مضاعفة مدة الحظر مع كل مخالفة (بحد أقصى 24 ساعة)
        blockDuration = Math.min(
          config.blockDurationMs * Math.pow(2, violations - 1),
          24 * 60 * 60 * 1000
        );
      }

      entry.blockedUntil = now + blockDuration;
      console.warn(`[RateLimiter] Blocked ${fullKey} until ${new Date(entry.blockedUntil).toISOString()}`);
    }

    this.limits.set(fullKey, entry);
  }

  /**
   * فحص وتسجيل في خطوة واحدة
   */
  checkAndRecord(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api'): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
    message?: string;
  } {
    const result = this.check(key, operation);
    if (result.allowed) {
      this.record(key, operation, false);
    }
    return result;
  }

  /**
   * تسجيل نجاح العملية (إعادة تعيين العداد)
   */
  recordSuccess(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api'): void {
    this.record(key, operation, true);
  }

  /**
   * إلغاء حظر مفتاح معين
   */
  unblock(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api'): void {
    const fullKey = `${operation}:${key}`;
    this.limits.delete(fullKey);
    this.violations.delete(fullKey);
  }

  /**
   * الحصول على حالة مفتاح معين
   */
  getStatus(key: string, operation: keyof typeof DEFAULT_CONFIGS = 'api'): {
    count: number;
    blocked: boolean;
    blockedUntil?: Date;
    violations: number;
  } {
    const fullKey = `${operation}:${key}`;
    const entry = this.limits.get(fullKey);
    const violations = this.violations.get(fullKey) || 0;

    if (!entry) {
      return { count: 0, blocked: false, violations: 0 };
    }

    return {
      count: entry.count,
      blocked: entry.blocked,
      blockedUntil: entry.blockedUntil ? new Date(entry.blockedUntil) : undefined,
      violations
    };
  }

  /**
   * تنظيف السجلات القديمة
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      // حذف السجلات القديمة جداً (أكثر من 24 ساعة)
      if (now - entry.lastAttempt > 24 * 60 * 60 * 1000) {
        this.limits.delete(key);
        this.violations.delete(key);
        cleaned++;
      }
      // حذف السجلات المنتهية الحظر
      else if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * تنسيق المدة للعرض
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} ساعة و ${minutes % 60} دقيقة`;
    } else if (minutes > 0) {
      return `${minutes} دقيقة`;
    } else {
      return `${seconds} ثانية`;
    }
  }

  /**
   * إعادة تعيين جميع السجلات
   */
  reset(): void {
    this.limits.clear();
    this.violations.clear();
  }
}

// تصدير المثيل الوحيد
export const rateLimiter = RateLimiterService.getInstance();

// ====== Decorators / Wrappers ======

/**
 * غلاف للحماية بـ Rate Limiting
 * @param operation نوع العملية
 * @param keyExtractor دالة لاستخراج المفتاح من المعاملات
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: keyof typeof DEFAULT_CONFIGS,
  keyExtractor: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyExtractor(...args);
    const check = rateLimiter.check(key, operation);

    if (!check.allowed) {
      throw new Error(check.message || 'تم تجاوز الحد الأقصى للمحاولات');
    }

    try {
      const result = await fn(...args);
      rateLimiter.recordSuccess(key, operation);
      return result;
    } catch (error) {
      rateLimiter.record(key, operation, false);
      throw error;
    }
  }) as T;
}
