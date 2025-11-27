/**
 * NetworkQuality - قياس وتكيّف جودة الشبكة
 * ⚡ المرحلة الثالثة: تعديل إعدادات الإرسال حسب سرعة الشبكة
 *
 * الميزات:
 * - قياس RTT (Round Trip Time)
 * - تصنيف جودة الشبكة
 * - إعدادات ديناميكية للـ batch size و timeout
 * - تحديث تلقائي كل 30 ثانية
 * - ⚡ تكامل مع ConnectionState للاكتشاف الذكي
 */

import { 
  NetworkQuality, 
  NetworkQualitySettings,
  DELTA_SYNC_CONSTANTS 
} from './types';
import { syncMetrics } from './SyncMetrics';
import { connectionState } from './ConnectionState';

// =====================
// إعدادات حسب جودة الشبكة
// =====================

const QUALITY_SETTINGS: Record<NetworkQuality, NetworkQualitySettings> = {
  EXCELLENT: {
    batchSize: 50,        // دفعة كبيرة
    timeoutMs: 10000,     // 10 ثواني
    retryDelayMs: 1000    // 1 ثانية
  },
  GOOD: {
    batchSize: 30,        // دفعة متوسطة
    timeoutMs: 15000,     // 15 ثانية
    retryDelayMs: 2000    // 2 ثواني
  },
  POOR: {
    batchSize: 10,        // دفعة صغيرة
    timeoutMs: 30000,     // 30 ثانية
    retryDelayMs: 5000    // 5 ثواني
  },
  VERY_POOR: {
    batchSize: 3,         // دفعة صغيرة جداً
    timeoutMs: 60000,     // 60 ثانية
    retryDelayMs: 10000   // 10 ثواني
  },
  OFFLINE: {
    batchSize: 0,         // لا إرسال
    timeoutMs: 0,
    retryDelayMs: 0
  }
};

// =====================
// NetworkQualityMonitor Class
// =====================

export class NetworkQualityMonitor {
  private currentQuality: NetworkQuality = 'GOOD';
  private lastRTT: number = 0;
  private rttHistory: number[] = [];
  private measureIntervalId: ReturnType<typeof setInterval> | null = null;
  private isMeasuring = false;
  private supabaseUrl: string = '';
  private supabaseKey: string = '';

  constructor() {
    this.setupNetworkListeners();
    console.log('%c[NetworkQuality] 📡 Initialized', 'color: #00BCD4');
  }

  // ═══════════════════════════════════════════════════
  // تهيئة
  // ═══════════════════════════════════════════════════

  /**
   * تهيئة مع بيانات Supabase
   */
  initialize(supabaseUrl: string, supabaseKey: string): void {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    
    // قياس أولي
    this.measureRTT();
    
    // بدء القياس الدوري
    this.startPeriodicMeasurement();
  }

  /**
   * بدء القياس الدوري
   */
  private startPeriodicMeasurement(): void {
    if (this.measureIntervalId) return;

    this.measureIntervalId = setInterval(() => {
      // ⚡ استخدام connectionState بدلاً من navigator.onLine
      if (connectionState.isOnline()) {
        this.measureRTT();
      }
    }, DELTA_SYNC_CONSTANTS.RTT_MEASURE_INTERVAL_MS);
  }

  /**
   * إيقاف القياس الدوري
   */
  stop(): void {
    if (this.measureIntervalId) {
      clearInterval(this.measureIntervalId);
      this.measureIntervalId = null;
    }
  }

  // ═══════════════════════════════════════════════════
  // Network Listeners
  // ═══════════════════════════════════════════════════

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      // ⚡ الاستماع لـ ConnectionState بدلاً من navigator events
      connectionState.subscribe((state) => {
        if (state.isOnline && this.currentQuality === 'OFFLINE') {
          console.log('%c[NetworkQuality] 🌐 Back online, measuring RTT...', 'color: #4CAF50');
          this.measureRTT();
        } else if (!state.isOnline && this.currentQuality !== 'OFFLINE') {
          console.log('%c[NetworkQuality] 📴 Offline (detected by ConnectionState)', 'color: #f44336');
          this.currentQuality = 'OFFLINE';
          this.lastRTT = Infinity;
          syncMetrics.setConnectionHealth('offline');
        }
      });

      // تحديث الحالة الأولية
      if (connectionState.isOffline()) {
        this.currentQuality = 'OFFLINE';
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // قياس RTT
  // ═══════════════════════════════════════════════════

  /**
   * قياس RTT (Round Trip Time)
   */
  async measureRTT(): Promise<number> {
    // ⚡ استخدام connectionState بدلاً من navigator.onLine
    if (this.isMeasuring || connectionState.isOffline()) {
      return this.lastRTT;
    }

    if (!this.supabaseUrl) {
      // لم يتم التهيئة بعد
      return DELTA_SYNC_CONSTANTS.RTT_GOOD_THRESHOLD;
    }

    this.isMeasuring = true;

    try {
      const start = performance.now();

      // طلب خفيف جداً (HEAD request)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rtt = Math.round(performance.now() - start);
      this.updateRTT(rtt);
      
      // ⚡ إبلاغ ConnectionState عن النجاح
      connectionState.reportSuccess();

      return rtt;

    } catch (error) {
      // ⚡ إبلاغ ConnectionState عن الفشل
      connectionState.reportFailure(error as Error);
      
      // فشل القياس - اعتبر الشبكة ضعيفة
      console.warn('[NetworkQuality] ⚠️ RTT measurement failed:', error);
      this.updateRTT(DELTA_SYNC_CONSTANTS.RTT_POOR_THRESHOLD + 100);
      return this.lastRTT;

    } finally {
      this.isMeasuring = false;
    }
  }

  /**
   * تحديث RTT وتصنيف الجودة
   */
  private updateRTT(rtt: number): void {
    this.lastRTT = rtt;

    // إضافة للتاريخ (آخر 10 قياسات)
    this.rttHistory.push(rtt);
    if (this.rttHistory.length > 10) {
      this.rttHistory.shift();
    }

    // حساب المتوسط
    const avgRTT = Math.round(
      this.rttHistory.reduce((a, b) => a + b, 0) / this.rttHistory.length
    );

    // تصنيف الجودة
    const oldQuality = this.currentQuality;
    this.currentQuality = this.classifyQuality(avgRTT);

    // تحديث SyncMetrics
    syncMetrics.setConnectionHealth(
      this.currentQuality === 'EXCELLENT' ? 'excellent' :
      this.currentQuality === 'GOOD' ? 'good' :
      this.currentQuality === 'OFFLINE' ? 'offline' : 'poor'
    );

    // Log إذا تغيرت الجودة
    if (oldQuality !== this.currentQuality) {
      const color = 
        this.currentQuality === 'EXCELLENT' ? '#4CAF50' :
        this.currentQuality === 'GOOD' ? '#8BC34A' :
        this.currentQuality === 'POOR' ? '#FF9800' :
        this.currentQuality === 'VERY_POOR' ? '#f44336' : '#9E9E9E';

      console.log(
        `%c[NetworkQuality] 📊 Quality changed: ${oldQuality} → ${this.currentQuality} (RTT: ${avgRTT}ms)`,
        `color: ${color}; font-weight: bold`
      );

      const settings = this.getSettings();
      console.log(
        `%c[NetworkQuality] ⚙️ New settings: batch=${settings.batchSize}, timeout=${settings.timeoutMs}ms`,
        `color: ${color}`
      );
    }
  }

  /**
   * تصنيف الجودة حسب RTT
   */
  private classifyQuality(rtt: number): NetworkQuality {
    // ⚡ استخدام connectionState بدلاً من navigator.onLine
    if (connectionState.isOffline()) return 'OFFLINE';
    if (rtt < DELTA_SYNC_CONSTANTS.RTT_EXCELLENT_THRESHOLD) return 'EXCELLENT';
    if (rtt < DELTA_SYNC_CONSTANTS.RTT_GOOD_THRESHOLD) return 'GOOD';
    if (rtt < DELTA_SYNC_CONSTANTS.RTT_POOR_THRESHOLD) return 'POOR';
    return 'VERY_POOR';
  }

  // ═══════════════════════════════════════════════════
  // Getters
  // ═══════════════════════════════════════════════════

  /**
   * الحصول على الجودة الحالية
   */
  getQuality(): NetworkQuality {
    return this.currentQuality;
  }

  /**
   * الحصول على RTT الأخير
   */
  getRTT(): number {
    return this.lastRTT;
  }

  /**
   * الحصول على متوسط RTT
   */
  getAverageRTT(): number {
    if (this.rttHistory.length === 0) return 0;
    return Math.round(
      this.rttHistory.reduce((a, b) => a + b, 0) / this.rttHistory.length
    );
  }

  /**
   * الحصول على الإعدادات حسب الجودة الحالية
   */
  getSettings(): NetworkQualitySettings {
    return { ...QUALITY_SETTINGS[this.currentQuality] };
  }

  /**
   * الحصول على batch size الحالي
   */
  getBatchSize(): number {
    return QUALITY_SETTINGS[this.currentQuality].batchSize;
  }

  /**
   * الحصول على timeout الحالي
   */
  getTimeout(): number {
    return QUALITY_SETTINGS[this.currentQuality].timeoutMs;
  }

  /**
   * الحصول على retry delay الحالي
   */
  getRetryDelay(): number {
    return QUALITY_SETTINGS[this.currentQuality].retryDelayMs;
  }

  /**
   * هل يمكن الإرسال؟
   */
  canSend(): boolean {
    // ⚡ استخدام connectionState بدلاً من navigator.onLine
    return this.currentQuality !== 'OFFLINE' && connectionState.isOnline();
  }

  // ═══════════════════════════════════════════════════
  // تقرير
  // ═══════════════════════════════════════════════════

  /**
   * طباعة تقرير
   */
  printReport(): void {
    const settings = this.getSettings();
    const avgRTT = this.getAverageRTT();

    console.log('%c╔═══════════════════════════════════════════════════════════╗', 'color: #00BCD4; font-weight: bold');
    console.log('%c║                📡 NETWORK QUALITY REPORT                   ║', 'color: #00BCD4; font-weight: bold');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #00BCD4; font-weight: bold');
    console.log(`%c║ Quality:     ${this.currentQuality.padEnd(15)}`, 
      this.currentQuality === 'EXCELLENT' ? 'color: #4CAF50' :
      this.currentQuality === 'GOOD' ? 'color: #8BC34A' :
      this.currentQuality === 'POOR' ? 'color: #FF9800' : 'color: #f44336');
    console.log(`%c║ Last RTT:    ${this.lastRTT}ms`, 'color: #00BCD4');
    console.log(`%c║ Avg RTT:     ${avgRTT}ms`, 'color: #00BCD4');
    console.log('%c╠═══════════════════════════════════════════════════════════╣', 'color: #00BCD4');
    console.log(`%c║ Batch Size:  ${settings.batchSize}`, 'color: #FF9800');
    console.log(`%c║ Timeout:     ${settings.timeoutMs}ms`, 'color: #FF9800');
    console.log(`%c║ Retry Delay: ${settings.retryDelayMs}ms`, 'color: #FF9800');
    console.log('%c╚═══════════════════════════════════════════════════════════╝', 'color: #00BCD4; font-weight: bold');
  }
}

// =====================
// Singleton Export
// =====================

export const networkQuality = new NetworkQualityMonitor();

// =====================
// Global Access (for debugging)
// =====================

if (typeof window !== 'undefined') {
  (window as any).networkQuality = networkQuality;
}
