/**
 * SyncMetrics - إحصائيات ومراقبة المزامنة
 * ⚡ المرحلة الثالثة: جمع وتخزين إحصائيات المزامنة للتشخيص
 *
 * الميزات:
 * - عدادات للعمليات الناجحة/الفاشلة
 * - متوسط زمن المزامنة
 * - تصنيف الأخطاء
 * - صحة الاتصال
 * - تخزين في localStorage
 */

import { ErrorType } from './types';

// =====================
// Types
// =====================

export type ConnectionHealth = 'excellent' | 'good' | 'poor' | 'offline';

export interface SyncMetrics {
  // ═══════════════════════════════════════════════════
  // عدادات العمليات
  // ═══════════════════════════════════════════════════
  totalOperationsSent: number;
  totalOperationsSucceeded: number;
  totalOperationsFailed: number;
  totalOperationsDiscarded: number;  // permanent errors
  
  // ═══════════════════════════════════════════════════
  // أوقات
  // ═══════════════════════════════════════════════════
  avgSyncTimeMs: number;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  
  // ═══════════════════════════════════════════════════
  // حالة
  // ═══════════════════════════════════════════════════
  queueSize: number;
  connectionHealth: ConnectionHealth;
  isOnline: boolean;
  
  // ═══════════════════════════════════════════════════
  // تفاصيل الأخطاء
  // ═══════════════════════════════════════════════════
  errorsByType: Record<ErrorType, number>;
  
  // ═══════════════════════════════════════════════════
  // إحصائيات حسب الجدول
  // ═══════════════════════════════════════════════════
  operationsByTable: Record<string, {
    sent: number;
    succeeded: number;
    failed: number;
  }>;
  
  // ═══════════════════════════════════════════════════
  // Gaps
  // ═══════════════════════════════════════════════════
  totalGapsDetected: number;
  totalGapsRecovered: number;
  totalGapsSkipped: number;
}

// =====================
// Default Metrics
// =====================

const DEFAULT_METRICS: SyncMetrics = {
  totalOperationsSent: 0,
  totalOperationsSucceeded: 0,
  totalOperationsFailed: 0,
  totalOperationsDiscarded: 0,
  
  avgSyncTimeMs: 0,
  lastSyncAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  
  queueSize: 0,
  connectionHealth: 'good',
  isOnline: true,
  
  errorsByType: {
    PERMANENT: 0,
    TRANSIENT: 0,
    SERVER_ERROR: 0,
    RATE_LIMIT: 0,
    UNKNOWN: 0
  },
  
  operationsByTable: {},
  
  totalGapsDetected: 0,
  totalGapsRecovered: 0,
  totalGapsSkipped: 0
};

const STORAGE_KEY = 'delta_sync_metrics';
const MAX_SYNC_TIMES = 100; // عدد أوقات المزامنة للمتوسط

// =====================
// SyncMetricsCollector Class
// =====================

export class SyncMetricsCollector {
  private metrics: SyncMetrics;
  private syncTimes: number[] = []; // للمتوسط المتحرك
  private sessionStartedAt: string;

  constructor() {
    this.metrics = this.loadMetrics();
    this.sessionStartedAt = new Date().toISOString();
    this.setupNetworkListener();
    
    console.log('%c[SyncMetrics] 📊 Initialized', 'color: #9C27B0');
  }

  // ═══════════════════════════════════════════════════
  // تحميل وحفظ
  // ═══════════════════════════════════════════════════

  private loadMetrics(): SyncMetrics {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // دمج مع القيم الافتراضية للحقول الجديدة
        return { ...DEFAULT_METRICS, ...parsed };
      }
    } catch { }
    return { ...DEFAULT_METRICS };
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch { }
  }

  // ═══════════════════════════════════════════════════
  // Network Listener
  // ═══════════════════════════════════════════════════

  private setupNetworkListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.metrics.isOnline = true;
        this.metrics.connectionHealth = 'good';
        this.saveMetrics();
      });
      
      window.addEventListener('offline', () => {
        this.metrics.isOnline = false;
        this.metrics.connectionHealth = 'offline';
        this.saveMetrics();
      });
      
      this.metrics.isOnline = navigator.onLine;
      if (!navigator.onLine) {
        this.metrics.connectionHealth = 'offline';
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // تسجيل العمليات
  // ═══════════════════════════════════════════════════

  /**
   * تسجيل إرسال عمليات
   */
  recordOperationsSent(count: number, tableName?: string): void {
    this.metrics.totalOperationsSent += count;
    this.metrics.lastSyncAt = new Date().toISOString();
    
    if (tableName) {
      if (!this.metrics.operationsByTable[tableName]) {
        this.metrics.operationsByTable[tableName] = { sent: 0, succeeded: 0, failed: 0 };
      }
      this.metrics.operationsByTable[tableName].sent += count;
    }
    
    this.saveMetrics();
  }

  /**
   * تسجيل نجاح عمليات
   */
  recordOperationsSucceeded(count: number, syncTimeMs: number, tableName?: string): void {
    this.metrics.totalOperationsSucceeded += count;
    this.metrics.lastSuccessAt = new Date().toISOString();
    
    // تحديث متوسط الزمن
    this.syncTimes.push(syncTimeMs);
    if (this.syncTimes.length > MAX_SYNC_TIMES) {
      this.syncTimes.shift();
    }
    this.metrics.avgSyncTimeMs = Math.round(
      this.syncTimes.reduce((a, b) => a + b, 0) / this.syncTimes.length
    );
    
    // تحديث صحة الاتصال
    this.updateConnectionHealth(syncTimeMs);
    
    if (tableName) {
      if (!this.metrics.operationsByTable[tableName]) {
        this.metrics.operationsByTable[tableName] = { sent: 0, succeeded: 0, failed: 0 };
      }
      this.metrics.operationsByTable[tableName].succeeded += count;
    }
    
    this.saveMetrics();
  }

  /**
   * تسجيل فشل عمليات
   */
  recordOperationsFailed(count: number, errorType: ErrorType, tableName?: string): void {
    this.metrics.totalOperationsFailed += count;
    this.metrics.lastErrorAt = new Date().toISOString();
    this.metrics.errorsByType[errorType] += count;
    
    if (tableName) {
      if (!this.metrics.operationsByTable[tableName]) {
        this.metrics.operationsByTable[tableName] = { sent: 0, succeeded: 0, failed: 0 };
      }
      this.metrics.operationsByTable[tableName].failed += count;
    }
    
    this.saveMetrics();
  }

  /**
   * تسجيل عمليات محذوفة (permanent errors)
   */
  recordOperationsDiscarded(count: number): void {
    this.metrics.totalOperationsDiscarded += count;
    this.saveMetrics();
  }

  // ═══════════════════════════════════════════════════
  // تسجيل Gaps
  // ═══════════════════════════════════════════════════

  recordGapDetected(): void {
    this.metrics.totalGapsDetected++;
    this.saveMetrics();
  }

  recordGapRecovered(): void {
    this.metrics.totalGapsRecovered++;
    this.saveMetrics();
  }

  recordGapSkipped(): void {
    this.metrics.totalGapsSkipped++;
    this.saveMetrics();
  }

  // ═══════════════════════════════════════════════════
  // تحديث حالة الـ Queue
  // ═══════════════════════════════════════════════════

  updateQueueSize(size: number): void {
    this.metrics.queueSize = size;
    this.saveMetrics();
  }

  // ═══════════════════════════════════════════════════
  // تحديث صحة الاتصال
  // ═══════════════════════════════════════════════════

  private updateConnectionHealth(syncTimeMs: number): void {
    if (!this.metrics.isOnline) {
      this.metrics.connectionHealth = 'offline';
      return;
    }
    
    // حسب RTT
    if (syncTimeMs < 200) {
      this.metrics.connectionHealth = 'excellent';
    } else if (syncTimeMs < 1000) {
      this.metrics.connectionHealth = 'good';
    } else {
      this.metrics.connectionHealth = 'poor';
    }
  }

  setConnectionHealth(health: ConnectionHealth): void {
    this.metrics.connectionHealth = health;
    this.saveMetrics();
  }

  // ═══════════════════════════════════════════════════
  // قراءة الإحصائيات
  // ═══════════════════════════════════════════════════

  /**
   * الحصول على جميع الإحصائيات
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * الحصول على ملخص مختصر
   */
  getSummary(): {
    successRate: string;
    avgTime: string;
    queueSize: number;
    health: ConnectionHealth;
    lastSync: string | null;
  } {
    const total = this.metrics.totalOperationsSucceeded + this.metrics.totalOperationsFailed;
    const successRate = total > 0 
      ? ((this.metrics.totalOperationsSucceeded / total) * 100).toFixed(1) + '%'
      : 'N/A';
    
    const avgTime = this.metrics.avgSyncTimeMs > 0
      ? this.metrics.avgSyncTimeMs + 'ms'
      : 'N/A';

    return {
      successRate,
      avgTime,
      queueSize: this.metrics.queueSize,
      health: this.metrics.connectionHealth,
      lastSync: this.metrics.lastSyncAt
    };
  }

  /**
   * طباعة تقرير في Console
   */
  printReport(): void {
    const m = this.metrics;
    const total = m.totalOperationsSucceeded + m.totalOperationsFailed;
    const successRate = total > 0 ? ((m.totalOperationsSucceeded / total) * 100).toFixed(1) : 'N/A';

    console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #9C27B0; font-weight: bold');
    console.log('%c║                    📊 SYNC METRICS REPORT                   ║', 'color: #9C27B0; font-weight: bold');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #9C27B0; font-weight: bold');
    console.log(`%c║ ✅ Succeeded:    ${m.totalOperationsSucceeded.toString().padEnd(10)} (${successRate}%)`, 'color: #4CAF50');
    console.log(`%c║ ❌ Failed:       ${m.totalOperationsFailed}`, m.totalOperationsFailed > 0 ? 'color: #f44336' : 'color: #4CAF50');
    console.log(`%c║ 🚫 Discarded:    ${m.totalOperationsDiscarded}`, 'color: #9C27B0');
    console.log(`%c║ 📤 Total Sent:   ${m.totalOperationsSent}`, 'color: #2196F3');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #9C27B0');
    console.log(`%c║ ⏱️  Avg Time:     ${m.avgSyncTimeMs}ms`, 'color: #FF9800');
    console.log(`%c║ 📦 Queue Size:   ${m.queueSize}`, 'color: #FF9800');
    console.log(`%c║ 🌐 Health:       ${m.connectionHealth.toUpperCase()}`, 
      m.connectionHealth === 'excellent' ? 'color: #4CAF50' :
      m.connectionHealth === 'good' ? 'color: #8BC34A' :
      m.connectionHealth === 'poor' ? 'color: #FF9800' : 'color: #f44336');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #9C27B0');
    console.log(`%c║ 🔄 Gaps: ${m.totalGapsDetected} detected, ${m.totalGapsRecovered} recovered, ${m.totalGapsSkipped} skipped`, 'color: #607D8B');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #9C27B0');
    console.log('%c║ Errors by Type:', 'color: #f44336');
    Object.entries(m.errorsByType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`%c║   ${type}: ${count}`, 'color: #f44336');
      }
    });
    console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #9C27B0; font-weight: bold');
  }

  // ═══════════════════════════════════════════════════
  // إعادة التعيين
  // ═══════════════════════════════════════════════════

  /**
   * إعادة تعيين جميع الإحصائيات
   */
  reset(): void {
    this.metrics = { ...DEFAULT_METRICS };
    this.syncTimes = [];
    this.saveMetrics();
    console.log('%c[SyncMetrics] 🔄 Metrics reset', 'color: #9C27B0');
  }

  /**
   * إعادة تعيين إحصائيات الجلسة فقط
   */
  resetSession(): void {
    this.metrics.totalOperationsSent = 0;
    this.metrics.totalOperationsSucceeded = 0;
    this.metrics.totalOperationsFailed = 0;
    this.metrics.totalOperationsDiscarded = 0;
    this.metrics.errorsByType = {
      PERMANENT: 0,
      TRANSIENT: 0,
      SERVER_ERROR: 0,
      RATE_LIMIT: 0,
      UNKNOWN: 0
    };
    this.metrics.operationsByTable = {};
    this.syncTimes = [];
    this.sessionStartedAt = new Date().toISOString();
    this.saveMetrics();
    console.log('%c[SyncMetrics] 🔄 Session reset', 'color: #9C27B0');
  }
}

// =====================
// Singleton Export
// =====================

export const syncMetrics = new SyncMetricsCollector();

// =====================
// Global Access (for debugging)
// =====================

if (typeof window !== 'undefined') {
  (window as any).syncMetrics = syncMetrics;
}
