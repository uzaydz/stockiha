/**
 * نظام التعلم الذاتي لـ SIRA
 * يتعلم من الأخطاء والأسئلة غير المفهومة لتحسين الأداء
 *
 * @version 1.0.0
 */

export interface FailedQuery {
  id: string;
  query: string;
  timestamp: number;
  reason: 'no_intent' | 'low_confidence' | 'error' | 'no_data' | 'ambiguous';
  attemptedIntent?: string;
  confidence?: number;
  userFeedback?: 'helpful' | 'not_helpful' | 'wrong';
}

export interface LearnedPattern {
  id: string;
  pattern: string;  // الكلمات المفتاحية أو النمط
  intent: string;   // النية المقترحة
  confidence: number;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  createdAt: number;
}

export class LearningSystem {
  private static readonly STORAGE_KEY_FAILED = 'sira_failed_queries';
  private static readonly STORAGE_KEY_LEARNED = 'sira_learned_patterns';
  private static readonly MAX_FAILED_QUERIES = 100;
  private static readonly MAX_LEARNED_PATTERNS = 50;

  /**
   * تسجيل استعلام فاشل
   */
  static recordFailure(query: string, reason: FailedQuery['reason'], details?: {
    attemptedIntent?: string;
    confidence?: number;
  }): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_FAILED);
      const failures: FailedQuery[] = stored ? JSON.parse(stored) : [];

      const newFailure: FailedQuery = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        query,
        timestamp: Date.now(),
        reason,
        ...details
      };

      failures.unshift(newFailure);

      // الحفاظ على الحد الأقصى
      if (failures.length > this.MAX_FAILED_QUERIES) {
        failures.splice(this.MAX_FAILED_QUERIES);
      }

      localStorage.setItem(this.STORAGE_KEY_FAILED, JSON.stringify(failures));

      console.log('[LearningSystem] Recorded failure:', {
        query,
        reason,
        totalFailures: failures.length
      });
    } catch (error) {
      console.error('[LearningSystem] Failed to record failure:', error);
    }
  }

  /**
   * الحصول على الاستعلامات الفاشلة
   */
  static getFailedQueries(limit: number = 10): FailedQuery[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_FAILED);
      if (!stored) return [];

      const failures: FailedQuery[] = JSON.parse(stored);
      return failures.slice(0, limit);
    } catch (error) {
      console.error('[LearningSystem] Failed to get failed queries:', error);
      return [];
    }
  }

  /**
   * الحصول على أكثر الأسئلة الفاشلة تكراراً
   */
  static getMostFailedPatterns(limit: number = 5): Array<{ pattern: string; count: number; reason: string }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_FAILED);
      if (!stored) return [];

      const failures: FailedQuery[] = JSON.parse(stored);

      // تجميع حسب الأنماط المتشابهة
      const patterns = new Map<string, { count: number; reason: string }>();

      for (const failure of failures) {
        // استخراج الكلمات المفتاحية (بسيط جداً)
        const normalized = failure.query.toLowerCase().trim();
        const key = normalized.slice(0, 20); // أول 20 حرف كمفتاح

        const existing = patterns.get(key);
        if (existing) {
          existing.count++;
        } else {
          patterns.set(key, { count: 1, reason: failure.reason });
        }
      }

      return Array.from(patterns.entries())
        .map(([pattern, data]) => ({ pattern, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('[LearningSystem] Failed to get patterns:', error);
      return [];
    }
  }

  /**
   * تسجيل نمط متعلم جديد
   */
  static learnPattern(pattern: string, intent: string, confidence: number = 0.7): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_LEARNED);
      const patterns: LearnedPattern[] = stored ? JSON.parse(stored) : [];

      const existing = patterns.find(p => p.pattern === pattern && p.intent === intent);

      if (existing) {
        // تحديث النمط الموجود
        existing.successCount++;
        existing.confidence = Math.min(1.0, existing.confidence + 0.05);
        existing.lastUsed = Date.now();
      } else {
        // إضافة نمط جديد
        const newPattern: LearnedPattern = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          pattern,
          intent,
          confidence,
          successCount: 1,
          failureCount: 0,
          lastUsed: Date.now(),
          createdAt: Date.now()
        };

        patterns.push(newPattern);
      }

      // الحفاظ على الحد الأقصى
      if (patterns.length > this.MAX_LEARNED_PATTERNS) {
        // إزالة الأقل استخداماً
        patterns.sort((a, b) => {
          const scoreA = a.successCount / (a.failureCount + 1);
          const scoreB = b.successCount / (b.failureCount + 1);
          return scoreB - scoreA;
        });
        patterns.splice(this.MAX_LEARNED_PATTERNS);
      }

      localStorage.setItem(this.STORAGE_KEY_LEARNED, JSON.stringify(patterns));

      console.log('[LearningSystem] Learned pattern:', { pattern, intent, confidence });
    } catch (error) {
      console.error('[LearningSystem] Failed to learn pattern:', error);
    }
  }

  /**
   * البحث عن نمط متعلم مطابق
   */
  static findLearnedPattern(query: string): LearnedPattern | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_LEARNED);
      if (!stored) return null;

      const patterns: LearnedPattern[] = JSON.parse(stored);
      const normalized = query.toLowerCase().trim();

      // البحث عن تطابق
      for (const pattern of patterns) {
        if (normalized.includes(pattern.pattern.toLowerCase()) ||
            pattern.pattern.toLowerCase().includes(normalized)) {
          return pattern;
        }
      }

      return null;
    } catch (error) {
      console.error('[LearningSystem] Failed to find pattern:', error);
      return null;
    }
  }

  /**
   * تسجيل نجاح نمط متعلم
   */
  static recordPatternSuccess(patternId: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_LEARNED);
      if (!stored) return;

      const patterns: LearnedPattern[] = JSON.parse(stored);
      const pattern = patterns.find(p => p.id === patternId);

      if (pattern) {
        pattern.successCount++;
        pattern.confidence = Math.min(1.0, pattern.confidence + 0.05);
        pattern.lastUsed = Date.now();
        localStorage.setItem(this.STORAGE_KEY_LEARNED, JSON.stringify(patterns));
      }
    } catch (error) {
      console.error('[LearningSystem] Failed to record success:', error);
    }
  }

  /**
   * تسجيل فشل نمط متعلم
   */
  static recordPatternFailure(patternId: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_LEARNED);
      if (!stored) return;

      const patterns: LearnedPattern[] = JSON.parse(stored);
      const pattern = patterns.find(p => p.id === patternId);

      if (pattern) {
        pattern.failureCount++;
        pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);

        // إذا فشل كثيراً، احذفه
        if (pattern.failureCount > 5 && pattern.successCount < 2) {
          const index = patterns.indexOf(pattern);
          patterns.splice(index, 1);
        }

        localStorage.setItem(this.STORAGE_KEY_LEARNED, JSON.stringify(patterns));
      }
    } catch (error) {
      console.error('[LearningSystem] Failed to record failure:', error);
    }
  }

  /**
   * الحصول على إحصائيات التعلم
   */
  static getStats(): {
    totalFailed: number;
    totalLearned: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    bestPatterns: LearnedPattern[];
  } {
    try {
      const failedStored = localStorage.getItem(this.STORAGE_KEY_FAILED);
      const learnedStored = localStorage.getItem(this.STORAGE_KEY_LEARNED);

      const failures: FailedQuery[] = failedStored ? JSON.parse(failedStored) : [];
      const patterns: LearnedPattern[] = learnedStored ? JSON.parse(learnedStored) : [];

      // حساب أسباب الفشل
      const reasonCounts = new Map<string, number>();
      for (const failure of failures) {
        reasonCounts.set(failure.reason, (reasonCounts.get(failure.reason) || 0) + 1);
      }

      const topFailureReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      // أفضل الأنماط
      const bestPatterns = patterns
        .sort((a, b) => {
          const scoreA = (a.successCount / (a.failureCount + 1)) * a.confidence;
          const scoreB = (b.successCount / (b.failureCount + 1)) * b.confidence;
          return scoreB - scoreA;
        })
        .slice(0, 10);

      return {
        totalFailed: failures.length,
        totalLearned: patterns.length,
        topFailureReasons,
        bestPatterns
      };
    } catch (error) {
      console.error('[LearningSystem] Failed to get stats:', error);
      return {
        totalFailed: 0,
        totalLearned: 0,
        topFailureReasons: [],
        bestPatterns: []
      };
    }
  }

  /**
   * مسح البيانات
   */
  static clear(type?: 'failed' | 'learned'): void {
    try {
      if (!type || type === 'failed') {
        localStorage.removeItem(this.STORAGE_KEY_FAILED);
      }
      if (!type || type === 'learned') {
        localStorage.removeItem(this.STORAGE_KEY_LEARNED);
      }
      console.log('[LearningSystem] Cleared data:', type || 'all');
    } catch (error) {
      console.error('[LearningSystem] Failed to clear:', error);
    }
  }

  /**
   * اقتراح تحسينات بناءً على التعلم
   */
  static getSuggestions(): string[] {
    const suggestions: string[] = [];

    try {
      const stats = this.getStats();

      if (stats.totalFailed > 20) {
        suggestions.push(`لديك ${stats.totalFailed} استعلام فاشل. قد تحتاج لتحسين فهم SIRA لبعض الأسئلة.`);
      }

      if (stats.topFailureReasons.length > 0) {
        const topReason = stats.topFailureReasons[0];
        if (topReason.count > 10) {
          suggestions.push(`السبب الأكثر شيوعاً للفشل: ${topReason.reason} (${topReason.count} مرة)`);
        }
      }

      if (stats.totalLearned > 10) {
        suggestions.push(`تعلمت SIRA ${stats.totalLearned} نمط جديد من تفاعلاتك!`);
      }

      if (stats.bestPatterns.length > 0) {
        const best = stats.bestPatterns[0];
        suggestions.push(`أفضل نمط متعلم: "${best.pattern}" → ${best.intent} (${best.successCount} نجاح)`);
      }
    } catch (error) {
      console.error('[LearningSystem] Failed to get suggestions:', error);
    }

    return suggestions;
  }
}
