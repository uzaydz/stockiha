/**
 * كاشف الاستدعاءات المتكررة - لمراقبة وتحسين الأداء
 */

interface RequestLog {
  url: string;
  timestamp: number;
  count: number;
  lastCall: number;
}

class DuplicateRequestDetector {
  private requestLogs = new Map<string, RequestLog>();
  private duplicateThreshold = 1000; // 1 ثانية
  private maxLogs = 100;

  /**
   * تسجيل استدعاء API
   */
  logRequest(url: string): void {
    const now = Date.now();
    const existing = this.requestLogs.get(url);

    if (existing) {
      const timeSinceLastCall = now - existing.lastCall;
      
      if (timeSinceLastCall < this.duplicateThreshold) {
        existing.count++;
        existing.lastCall = now;
        
        // تحذير من الاستدعاءات المتكررة
        if (existing.count > 2) {
        }
      } else {
        // إعادة تعيين العداد إذا مر وقت كافٍ
        existing.count = 1;
        existing.lastCall = now;
      }
    } else {
      this.requestLogs.set(url, {
        url,
        timestamp: now,
        count: 1,
        lastCall: now
      });
    }

    // تنظيف السجلات القديمة
    this.cleanup();
  }

  /**
   * تنظيف السجلات القديمة
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 دقائق

    for (const [url, log] of this.requestLogs.entries()) {
      if (now - log.timestamp > maxAge) {
        this.requestLogs.delete(url);
      }
    }

    // الحفاظ على حد أقصى للسجلات
    if (this.requestLogs.size > this.maxLogs) {
      const entriesToDelete = Array.from(this.requestLogs.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.requestLogs.size - this.maxLogs);
      
      entriesToDelete.forEach(([url]) => this.requestLogs.delete(url));
    }
  }

  /**
   * الحصول على إحصائيات الاستدعاءات المتكررة
   */
  getDuplicateStats(): Array<{url: string, count: number, lastCall: number}> {
    return Array.from(this.requestLogs.values())
      .filter(log => log.count > 1)
      .sort((a, b) => b.count - a.count)
      .map(log => ({
        url: log.url,
        count: log.count,
        lastCall: Date.now() - log.lastCall
      }));
  }

  /**
   * مسح جميع السجلات
   */
  clear(): void {
    this.requestLogs.clear();
  }

  /**
   * طباعة تقرير الاستدعاءات المتكررة
   */
  printReport(): void {
    const duplicates = this.getDuplicateStats();
    
    if (duplicates.length === 0) {
      return;
    }

    duplicates.forEach((item, index) => {
    });
  }
}

// إنشاء مثيل عالمي
export const duplicateRequestDetector = new DuplicateRequestDetector();

// دالة مساعدة لتسجيل الاستدعاءات
export const logApiRequest = (url: string) => {
  duplicateRequestDetector.logRequest(url);
};

// إضافة للـ window للاستخدام في console
if (typeof window !== 'undefined') {
  (window as any).duplicateRequestDetector = duplicateRequestDetector;
  (window as any).logApiRequest = logApiRequest;
}
