/**
 * أداة منع تكرار الـ console logs
 * تمنع طباعة نفس الرسالة مرات متكررة في وقت قصير
 */

interface LogEntry {
  message: string;
  timestamp: number;
  count: number;
}

class DuplicateLogger {
  private logs: Map<string, LogEntry> = new Map();
  private readonly THROTTLE_TIME = 2000; // ثانيتان
  private readonly MAX_ENTRIES = 100; // حد أقصى للإدخالات

  /**
   * طباعة مع منع التكرار
   */
  log(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'development') return;

    const key = this.createKey(message);
    const now = Date.now();
    const existing = this.logs.get(key);

    if (existing && now - existing.timestamp < this.THROTTLE_TIME) {
      // زيادة العداد بدلاً من الطباعة
      existing.count++;
      return;
    }

    // طباعة الرسالة
    if (existing && existing.count > 1) {
      console.log(`${message} (تكررت ${existing.count} مرة)`, ...args);
    } else {
      console.log(message, ...args);
    }

    // تحديث/إنشاء الإدخال
    this.logs.set(key, {
      message,
      timestamp: now,
      count: 1
    });

    // تنظيف الإدخالات القديمة
    this.cleanup();
  }

  /**
   * إنشاء مفتاح فريد للرسالة
   */
  private createKey(message: string): string {
    // إزالة الأرقام والمعرفات المتغيرة للحصول على نمط ثابت
    return message
      .replace(/\d+/g, '[NUM]')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
      .replace(/\b\w+@\w+\.\w+\b/g, '[EMAIL]')
      .substring(0, 100); // تقليم الطول
  }

  /**
   * تنظيف الإدخالات القديمة
   */
  private cleanup(): void {
    if (this.logs.size <= this.MAX_ENTRIES) return;

    const now = Date.now();
    const keysToDelete: string[] = [];

    this.logs.forEach((entry, key) => {
      if (now - entry.timestamp > this.THROTTLE_TIME * 2) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.logs.delete(key));
  }

  /**
   * مسح جميع الإدخالات
   */
  clear(): void {
    this.logs.clear();
  }

  /**
   * الحصول على إحصائيات
   */
  getStats() {
    return {
      totalEntries: this.logs.size,
      entries: Array.from(this.logs.entries()).map(([key, entry]) => ({
        key,
        count: entry.count,
        lastSeen: new Date(entry.timestamp).toLocaleTimeString()
      }))
    };
  }
}

// إنشاء instance عام
export const duplicateLogger = new DuplicateLogger();

// إضافة للـ window للتشخيص
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).duplicateLogger = duplicateLogger;
}

/**
 * دالة مساعدة للاستخدام السريع
 */
export const throttledLog = (message: string, ...args: any[]) => {
  duplicateLogger.log(message, ...args);
};
