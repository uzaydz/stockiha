/**
 * ConnectionState - Smart Connection Detection for Tauri
 * ⚡ اكتشاف ذكي للاتصال بالإنترنت
 *
 * المشكلة: navigator.onLine لا يعمل في Tauri!
 * الحل: نستخدم نتيجة الطلبات الفعلية كمصدر للحقيقة
 *
 * كيف يعمل:
 * - كل طلب ناجح → نحن Online
 * - 2 فشل شبكة متتالي → نحن Offline
 * - لا ping دوري (توفير موارد)
 */

import { syncMetrics } from './SyncMetrics';

// =====================
// Types
// =====================

export type ConnectionStatus = 'online' | 'offline' | 'checking';

export interface ConnectionStateData {
  status: ConnectionStatus;
  isOnline: boolean;
  consecutiveFailures: number;
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  lastError: string | null;
}

type ConnectionListener = (state: ConnectionStateData) => void;

// =====================
// Constants
// =====================

const FAILURES_BEFORE_OFFLINE = 2;  // عدد الفشل المتتالي قبل اعتباره offline
const MIN_TIME_BETWEEN_CHECKS = 1000; // 1 ثانية بين الفحوصات
const RECOVERY_CHECK_INTERVAL = 5000; // فحص العودة للاتصال كل 5 ثواني

// =====================
// Network Error Detection
// =====================

/**
 * هل هذا خطأ شبكة؟
 */
export function isNetworkError(error: Error | string): boolean {
  const msg = (typeof error === 'string' ? error : error.message).toLowerCase();

  return (
    // أخطاء الشبكة الكلاسيكية
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||  // ⚡ Safari/WebKit offline error
    msg.includes('networkerror') ||
    msg.includes('net::') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('network request failed') ||
    msg.includes('network disconnected') ||
    msg.includes('no internet') ||
    msg.includes('offline') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network_changed') ||
    msg.includes('err_connection_refused') ||
    msg.includes('err_connection_reset') ||
    msg.includes('err_connection_closed') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_address_unreachable') ||
    
    // Timeout (قد يكون شبكة بطيئة جداً أو منقطعة)
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    
    // DNS errors
    msg.includes('dns') ||
    msg.includes('getaddrinfo') ||
    
    // Supabase specific
    msg.includes('unable to connect') ||
    msg.includes('connection error')
  );
}

// =====================
// ConnectionStateManager Class
// =====================

class ConnectionStateManager {
  private state: ConnectionStateData = {
    status: 'online',
    isOnline: true,
    consecutiveFailures: 0,
    lastSuccessTime: null,
    lastFailureTime: null,
    lastError: null
  };

  private listeners = new Set<ConnectionListener>();
  private lastCheckTime = 0;

  // ⚡ فحص دوري للعودة للاتصال
  private recoveryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private supabaseUrl: string | null = null;
  private supabaseKey: string | null = null;

  constructor() {
    console.log('%c[ConnectionState] 🔌 Initialized (Smart Detection for Tauri)', 'color: #E91E63; font-weight: bold');

    // ⚡ الاستماع لأحداث الشبكة من المتصفح (للدعم الإضافي)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('%c[ConnectionState] 📶 Browser online event received', 'color: #4CAF50');
        // لا نثق بالحدث 100%، نجري فحص فعلي
        this.triggerRecoveryCheck();
      });

      window.addEventListener('offline', () => {
        console.log('%c[ConnectionState] 📴 Browser offline event received', 'color: #f44336');
        // نثق بهذا الحدث أكثر
        this.state.consecutiveFailures = FAILURES_BEFORE_OFFLINE;
        this.setOffline();
      });
    }
  }

  /**
   * ⚡ تهيئة معلومات Supabase للفحص الدوري
   */
  initialize(url: string, apiKey: string): void {
    this.supabaseUrl = url;
    this.supabaseKey = apiKey;
    console.log('%c[ConnectionState] ✅ Initialized with Supabase credentials', 'color: #4CAF50');
  }

  // ═══════════════════════════════════════════════════
  // إبلاغ عن النتائج
  // ═══════════════════════════════════════════════════

  /**
   * ⚡ إبلاغ عن نجاح طلب
   * يُستدعى من BatchSender, supabase-unified, etc.
   */
  reportSuccess(): void {
    const wasOffline = !this.state.isOnline;
    
    this.state.consecutiveFailures = 0;
    this.state.lastSuccessTime = Date.now();
    this.state.lastError = null;
    
    if (!this.state.isOnline) {
      this.setOnline();
    }
    
    if (wasOffline) {
      console.log('%c[ConnectionState] ✅ Connection restored!', 'color: #4CAF50; font-weight: bold');
    }
  }

  /**
   * ⚡ إبلاغ عن فشل طلب
   * يُستدعى من BatchSender, supabase-unified, etc.
   */
  reportFailure(error: Error | string): void {
    // تحقق إذا كان خطأ شبكة
    if (!isNetworkError(error)) {
      // ليس خطأ شبكة (مثل 400, 500) - لا تغير حالة الاتصال
      return;
    }
    
    // منع الفحص المتكرر
    const now = Date.now();
    if (now - this.lastCheckTime < MIN_TIME_BETWEEN_CHECKS) {
      return;
    }
    this.lastCheckTime = now;
    
    this.state.consecutiveFailures++;
    this.state.lastFailureTime = now;
    this.state.lastError = typeof error === 'string' ? error : error.message;
    
    console.log(
      `%c[ConnectionState] ⚠️ Network failure ${this.state.consecutiveFailures}/${FAILURES_BEFORE_OFFLINE}: ${this.state.lastError?.slice(0, 50)}`,
      'color: #FF9800'
    );
    
    // إذا وصلنا للحد الأقصى من الفشل المتتالي
    if (this.state.consecutiveFailures >= FAILURES_BEFORE_OFFLINE) {
      this.setOffline();
    }
  }

  // ═══════════════════════════════════════════════════
  // تغيير الحالة
  // ═══════════════════════════════════════════════════

  private setOnline(): void {
    if (this.state.isOnline) return;

    this.state.status = 'online';
    this.state.isOnline = true;
    this.state.consecutiveFailures = 0;

    console.log('%c[ConnectionState] 🌐 Status: ONLINE', 'color: #4CAF50; font-weight: bold; font-size: 14px');

    // ⚡ إيقاف الفحص الدوري للعودة
    this.stopRecoveryCheck();

    // تحديث SyncMetrics
    syncMetrics.setConnectionHealth('good');

    // إخطار المستمعين
    this.notifyListeners();

    // إرسال event للتطبيق
    this.dispatchEvent('online');
  }

  private setOffline(): void {
    if (!this.state.isOnline) return;

    this.state.status = 'offline';
    this.state.isOnline = false;

    console.log('%c[ConnectionState] 📴 Status: OFFLINE', 'color: #f44336; font-weight: bold; font-size: 14px');
    console.log(`%c[ConnectionState] 📴 Reason: ${this.state.lastError}`, 'color: #f44336');

    // تحديث SyncMetrics
    syncMetrics.setConnectionHealth('offline');

    // إخطار المستمعين
    this.notifyListeners();

    // إرسال event للتطبيق
    this.dispatchEvent('offline');

    // ⚡ بدء الفحص الدوري للعودة للاتصال
    this.startRecoveryCheck();
  }

  // ═══════════════════════════════════════════════════
  // ⚡ فحص العودة للاتصال
  // ═══════════════════════════════════════════════════

  /**
   * ⚡ بدء الفحص الدوري للعودة للاتصال
   */
  private startRecoveryCheck(): void {
    // إيقاف أي فحص سابق
    this.stopRecoveryCheck();

    console.log('%c[ConnectionState] 🔄 Starting recovery check (every 5s)', 'color: #2196F3');

    this.recoveryCheckInterval = setInterval(() => {
      this.triggerRecoveryCheck();
    }, RECOVERY_CHECK_INTERVAL);
  }

  /**
   * ⚡ إيقاف الفحص الدوري
   */
  private stopRecoveryCheck(): void {
    if (this.recoveryCheckInterval) {
      clearInterval(this.recoveryCheckInterval);
      this.recoveryCheckInterval = null;
      console.log('%c[ConnectionState] ⏹️ Recovery check stopped', 'color: #9E9E9E');
    }
  }

  /**
   * ⚡ تشغيل فحص العودة للاتصال
   */
  private async triggerRecoveryCheck(): Promise<void> {
    // إذا أصبحنا online بالفعل، نوقف
    if (this.state.isOnline) {
      this.stopRecoveryCheck();
      return;
    }

    // فحص سريع عبر navigator.onLine (للمتصفح)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // لا زلنا offline حسب المتصفح
      return;
    }

    console.log('%c[ConnectionState] 🔍 Checking connection recovery...', 'color: #2196F3');

    // محاولة فحص فعلي
    if (this.supabaseUrl && this.supabaseKey) {
      const isOnline = await this.checkConnection(this.supabaseUrl, this.supabaseKey);
      if (isOnline) {
        console.log('%c[ConnectionState] ✅ Connection recovered!', 'color: #4CAF50; font-weight: bold; font-size: 14px');
        this.stopRecoveryCheck();
      }
    } else {
      // fallback: محاولة fetch بسيط
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // فحص عبر fetch لأي URL موثوق (مثل google أو cloudflare)
        const response = await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // إذا لم يحدث خطأ، نحن online
        console.log('%c[ConnectionState] ✅ Connection recovered (fallback check)!', 'color: #4CAF50; font-weight: bold');
        this.reportSuccess();
        this.stopRecoveryCheck();
      } catch (error) {
        // لا زلنا offline
        console.log('%c[ConnectionState] ⏳ Still offline...', 'color: #FF9800');
      }
    }
  }

  /**
   * تعيين الحالة يدوياً (للاختبار أو الحالات الخاصة)
   */
  forceStatus(isOnline: boolean): void {
    if (isOnline) {
      this.state.consecutiveFailures = 0;
      this.setOnline();
    } else {
      this.state.consecutiveFailures = FAILURES_BEFORE_OFFLINE;
      this.setOffline();
    }
  }

  // ═══════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════

  private dispatchEvent(type: 'online' | 'offline'): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection-state-change', {
        detail: { ...this.state, type }
      }));
      
      // أيضاً dispatch الـ events القياسية للتوافق
      window.dispatchEvent(new Event(type));
    }
  }

  // ═══════════════════════════════════════════════════
  // Listeners
  // ═══════════════════════════════════════════════════

  /**
   * الاشتراك في تغييرات الحالة
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    
    // إرسال الحالة الحالية فوراً
    listener({ ...this.state });
    
    // إرجاع دالة إلغاء الاشتراك
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    for (const listener of this.listeners) {
      try {
        listener(stateCopy);
      } catch (err) {
        console.warn('[ConnectionState] Listener error:', err);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // Getters
  // ═══════════════════════════════════════════════════

  /**
   * هل نحن متصلون؟
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * هل نحن غير متصلين؟
   */
  isOffline(): boolean {
    return !this.state.isOnline;
  }

  /**
   * الحصول على الحالة الكاملة
   */
  getState(): ConnectionStateData {
    return { ...this.state };
  }

  /**
   * عدد الفشل المتتالي
   */
  getConsecutiveFailures(): number {
    return this.state.consecutiveFailures;
  }

  // ═══════════════════════════════════════════════════
  // فحص فعلي (اختياري)
  // ═══════════════════════════════════════════════════

  /**
   * فحص الاتصال بشكل فعلي (يُستخدم عند الحاجة فقط)
   */
  async checkConnection(url: string, apiKey: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.reportSuccess();
        return true;
      } else {
        // Server responded but with error - still online
        this.reportSuccess();
        return true;
      }
    } catch (error) {
      this.reportFailure(error as Error);
      return this.state.isOnline;
    }
  }

  // ═══════════════════════════════════════════════════
  // تقرير
  // ═══════════════════════════════════════════════════

  printStatus(): void {
    const s = this.state;
    const statusColor = s.isOnline ? '#4CAF50' : '#f44336';
    const statusIcon = s.isOnline ? '🌐' : '📴';
    
    console.log('%c╔═══════════════════════════════════════════════════════════╗', `color: ${statusColor}; font-weight: bold`);
    console.log(`%c║              ${statusIcon} CONNECTION STATUS                      ║`, `color: ${statusColor}; font-weight: bold`);
    console.log('%c╠═══════════════════════════════════════════════════════════╣', `color: ${statusColor}`);
    console.log(`%c║ Status:           ${s.isOnline ? 'ONLINE ✅' : 'OFFLINE ❌'}`, `color: ${statusColor}`);
    console.log(`%c║ Failures:         ${s.consecutiveFailures}/${FAILURES_BEFORE_OFFLINE}`, 'color: #FF9800');
    console.log(`%c║ Last Success:     ${s.lastSuccessTime ? new Date(s.lastSuccessTime).toLocaleTimeString() : 'Never'}`, 'color: #2196F3');
    console.log(`%c║ Last Failure:     ${s.lastFailureTime ? new Date(s.lastFailureTime).toLocaleTimeString() : 'Never'}`, 'color: #2196F3');
    if (s.lastError) {
      console.log(`%c║ Last Error:       ${s.lastError.slice(0, 40)}...`, 'color: #f44336');
    }
    console.log('%c╚═══════════════════════════════════════════════════════════╝', `color: ${statusColor}; font-weight: bold`);
  }
}

// =====================
// Singleton Export
// =====================

export const connectionState = new ConnectionStateManager();

// =====================
// Global Access (for debugging)
// =====================

if (typeof window !== 'undefined') {
  (window as any).connectionState = connectionState;
}
