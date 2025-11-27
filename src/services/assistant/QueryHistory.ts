/**
 * نظام تاريخ الاستعلامات مع البحث والتصفية
 * يحفظ ويفهرس جميع استعلامات المستخدم للوصول السريع
 *
 * @version 1.0.0
 */

export interface HistoricalQuery {
  id: string;
  query: string;
  response: string;
  timestamp: number;
  intent?: string;
  success: boolean;
  metadata?: {
    products?: string[];
    customers?: string[];
    amounts?: number[];
  };
}

export class QueryHistory {
  private static readonly STORAGE_KEY = 'sira_query_history';
  private static readonly MAX_HISTORY = 100;
  private static history: HistoricalQuery[] = [];
  private static loaded = false;

  /**
   * تحميل التاريخ من localStorage
   */
  private static ensureLoaded(): void {
    if (this.loaded) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[QueryHistory] Failed to load:', error);
      this.history = [];
    }

    this.loaded = true;
  }

  /**
   * حفظ التاريخ إلى localStorage
   */
  private static persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('[QueryHistory] Failed to persist:', error);
    }
  }

  /**
   * إضافة استعلام جديد
   */
  static add(entry: Omit<HistoricalQuery, 'id' | 'timestamp'>): void {
    this.ensureLoaded();

    const newEntry: HistoricalQuery = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now()
    };

    this.history.unshift(newEntry);

    // الحفاظ على الحد الأقصى
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(0, this.MAX_HISTORY);
    }

    this.persist();
  }

  /**
   * البحث في التاريخ
   */
  static search(query: string, options?: {
    intent?: string;
    successOnly?: boolean;
    limit?: number;
  }): HistoricalQuery[] {
    this.ensureLoaded();

    const normalized = query.toLowerCase().trim();
    const limit = options?.limit ?? 10;

    let results = this.history;

    // تصفية حسب النية
    if (options?.intent) {
      results = results.filter(h => h.intent === options.intent);
    }

    // تصفية حسب النجاح
    if (options?.successOnly) {
      results = results.filter(h => h.success);
    }

    // البحث النصي
    if (normalized) {
      results = results.filter(h =>
        h.query.toLowerCase().includes(normalized) ||
        h.response.toLowerCase().includes(normalized)
      );
    }

    return results.slice(0, limit);
  }

  /**
   * الحصول على آخر الاستعلامات
   */
  static getRecent(limit: number = 10): HistoricalQuery[] {
    this.ensureLoaded();
    return this.history.slice(0, limit);
  }

  /**
   * الحصول على الاستعلامات الشائعة
   */
  static getFrequent(limit: number = 5): Array<{ query: string; count: number; lastUsed: number }> {
    this.ensureLoaded();

    const frequency = new Map<string, { count: number; lastUsed: number }>();

    for (const entry of this.history) {
      const normalized = entry.query.trim().toLowerCase();
      const current = frequency.get(normalized);

      if (current) {
        current.count++;
        current.lastUsed = Math.max(current.lastUsed, entry.timestamp);
      } else {
        frequency.set(normalized, { count: 1, lastUsed: entry.timestamp });
      }
    }

    return Array.from(frequency.entries())
      .map(([query, stats]) => ({ query, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * الحصول على استعلامات مشابهة
   */
  static getSimilar(query: string, limit: number = 5): HistoricalQuery[] {
    this.ensureLoaded();

    const normalized = query.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    // حساب درجة التشابه
    const scored = this.history.map(entry => {
      const entryWords = entry.query.toLowerCase().split(/\s+/);
      let score = 0;

      // تطابق الكلمات
      for (const word of words) {
        if (entryWords.some(w => w.includes(word) || word.includes(w))) {
          score += 1;
        }
      }

      // زيادة النقاط للاستعلامات الحديثة
      const hoursSince = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
      score += Math.max(0, 10 - hoursSince) * 0.1;

      // زيادة النقاط للاستعلامات الناجحة
      if (entry.success) score += 0.5;

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * الحصول على اقتراحات بناءً على السياق
   */
  static getSuggestions(context?: {
    recentIntents?: string[];
    currentProduct?: string;
    currentCustomer?: string;
  }): string[] {
    this.ensureLoaded();

    const suggestions: Set<string> = new Set();

    // اقتراحات بناءً على النوايا الأخيرة
    if (context?.recentIntents && context.recentIntents.length > 0) {
      const contextualQueries = this.history
        .filter(h =>
          h.intent && context.recentIntents!.includes(h.intent) && h.success
        )
        .slice(0, 3);

      contextualQueries.forEach(q => suggestions.add(q.query));
    }

    // اقتراحات شائعة
    const frequent = this.getFrequent(3);
    frequent.forEach(f => suggestions.add(f.query));

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * مسح التاريخ
   */
  static clear(): void {
    this.history = [];
    this.persist();
  }

  /**
   * حذف استعلامات قديمة (أقدم من X أيام)
   */
  static cleanup(daysOld: number = 30): number {
    this.ensureLoaded();

    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const beforeCount = this.history.length;

    this.history = this.history.filter(h => h.timestamp > cutoff);

    const deleted = beforeCount - this.history.length;
    if (deleted > 0) {
      this.persist();
    }

    return deleted;
  }

  /**
   * الحصول على إحصائيات التاريخ
   */
  static getStats(): {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime?: number;
    topIntents: Array<{ intent: string; count: number }>;
  } {
    this.ensureLoaded();

    const successful = this.history.filter(h => h.success).length;
    const failed = this.history.length - successful;

    // حساب النوايا الأكثر استخداماً
    const intentCounts = new Map<string, number>();
    this.history.forEach(h => {
      if (h.intent) {
        intentCounts.set(h.intent, (intentCounts.get(h.intent) || 0) + 1);
      }
    });

    const topIntents = Array.from(intentCounts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: this.history.length,
      successful,
      failed,
      topIntents
    };
  }

  /**
   * تصدير التاريخ
   */
  static export(): string {
    this.ensureLoaded();
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * استيراد التاريخ
   */
  static import(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        this.history = imported;
        this.persist();
        return true;
      }
    } catch (error) {
      console.error('[QueryHistory] Failed to import:', error);
    }
    return false;
  }
}

// تنظيف تلقائي عند بدء التشغيل (حذف ما هو أقدم من 90 يوم)
if (typeof window !== 'undefined') {
  QueryHistory.cleanup(90);
}
