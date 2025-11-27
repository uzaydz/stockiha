/**
 * RealtimeReceiver - Supabase Realtime Subscription Handler
 * استقبال التحديثات الفورية من الخادم عبر Supabase Realtime
 *
 * ⚡ المرحلة الثانية: Exponential Backoff مع Jitter
 *
 * يستخدم postgres_changes للاستماع لتغييرات operations_log
 * كل تغيير يُرسل لـ OperationQueue للمعالجة بالترتيب
 */

import { supabase } from '@/lib/supabase-unified';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  ServerOperation,
  RealtimeCallback,
  DELTA_SYNC_CONSTANTS
} from './types';
import { connectionState } from './ConnectionState';

export class RealtimeReceiver {
  private channel: RealtimeChannel | null = null;
  private organizationId: string | null = null;
  private callback: RealtimeCallback | null = null;
  private isSubscribed = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private deviceId: string;
  private lastSuccessfulConnection: number = 0;

  // ⚡ ثوابت محسّنة للـ Reconnect
  private readonly MAX_RECONNECT_ATTEMPTS = 10; // زيادة المحاولات
  private readonly RECONNECT_BASE_DELAY = 1000; // 1 ثانية
  private readonly MAX_RECONNECT_DELAY = 60000; // 60 ثانية max
  private readonly JITTER_FACTOR = 0.3; // ±30% jitter

  // ⚡ تتبع آخر طباعة لـ offline log لتقليل spam
  private lastOfflineLogTime: number = 0;
  private readonly OFFLINE_LOG_INTERVAL_MS = 30000; // 30 ثانية

  constructor() {
    this.deviceId = this.getDeviceId();
    
    // ⚡ الاستماع لحدث عودة الاتصال لإعادة ضبط العداد وإعادة الاتصال تلقائياً
    if (typeof window !== 'undefined') {
      // حدث المتصفح الأصلي
      window.addEventListener('online', () => {
        console.log('%c[RealtimeReceiver] 📶 Browser online event detected', 'color: #4CAF50');
        this.handleNetworkOnline();
      });
      
      // حدث connection-state-change المخصص
      window.addEventListener('connection-state-change', (e: any) => {
        if (e.detail?.isOnline) {
          console.log('%c[RealtimeReceiver] 📶 Connection state change: online', 'color: #4CAF50');
          this.handleNetworkOnline();
        }
      });
    }
  }
  
  /**
   * ⚡ معالجة عودة الاتصال - إعادة ضبط العداد ومحاولة الاتصال
   */
  private handleNetworkOnline(): void {
    // إعادة ضبط عداد المحاولات
    this.reconnectAttempts = 0;
    this.lastOfflineLogTime = 0;
    
    // إلغاء أي timeout معلق
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // محاولة إعادة الاتصال إذا كان لدينا organizationId و callback
    if (this.organizationId && this.callback && !this.isSubscribed) {
      console.log('%c[RealtimeReceiver] 🔄 Attempting to reconnect after network recovery...', 'color: #2196F3');
      this.createSubscription();
    }
  }

  /**
   * الحصول على device ID
   */
  private getDeviceId(): string {
    return localStorage.getItem('delta_sync_device_id') || 'unknown';
  }

  /**
   * الاشتراك في تحديثات المنظمة
   */
  async subscribe(organizationId: string, callback: RealtimeCallback): Promise<void> {
    // إلغاء الاشتراك السابق إن وجد
    if (this.isSubscribed) {
      await this.unsubscribe();
    }

    this.organizationId = organizationId;
    this.callback = callback;
    this.reconnectAttempts = 0;

    await this.createSubscription();
  }

  /**
   * إنشاء الاشتراك في Realtime
   */
  private async createSubscription(): Promise<void> {
    if (!this.organizationId || !this.callback) {
      // ⚡ كتم الرسالة إذا لم يتم الاشتراك بعد (طبيعي عند بدء التطبيق)
      if (this.reconnectAttempts > 0) {
        console.warn('[RealtimeReceiver] Cannot create subscription: missing organizationId or callback');
      }
      return;
    }

    try {
      // إنشاء قناة جديدة
      const channelName = `operations_${this.organizationId}_${Date.now()}`;

      this.channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: this.deviceId }
        }
      });

      // الاستماع لتغييرات operations_log
      this.channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'operations_log',
            filter: `organization_id=eq.${this.organizationId}`
          },
          (payload) => {
            this.handleInsert(payload.new as ServerOperation);
          }
        )
        .on('system', {}, (status) => {
          this.handleSystemStatus(status);
        })
        .subscribe((status) => {
          this.handleSubscriptionStatus(status);
        });

      console.log(`[RealtimeReceiver] Subscribing to operations for org ${this.organizationId}`);
    } catch (error) {
      console.error('[RealtimeReceiver] Subscription error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * معالجة عملية جديدة
   */
  private handleInsert(operation: ServerOperation): void {
    // تجاهل العمليات من نفس الجهاز
    if (operation.device_id === this.deviceId) {
      console.log(`[RealtimeReceiver] Ignoring own operation ${operation.server_seq}`);
      return;
    }

    console.log(`[RealtimeReceiver] Received operation ${operation.server_seq}: ${operation.operation} ${operation.table_name}`);

    // إرسال للـ callback (OperationQueue)
    if (this.callback) {
      try {
        this.callback(operation);
      } catch (error) {
        console.error('[RealtimeReceiver] Callback error:', error);
      }
    }
  }

  /**
   * ⚡ معالجة حالة الاشتراك - محسّن مع logging أفضل
   */
  private handleSubscriptionStatus(status: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.isSubscribed = true;
        this.reconnectAttempts = 0;
        this.lastSuccessfulConnection = Date.now();
        console.log('%c[RealtimeReceiver] ✅ Successfully subscribed to realtime updates', 'color: #4CAF50; font-weight: bold');
        break;

      case 'CLOSED':
        this.isSubscribed = false;
        const closedDuration = this.lastSuccessfulConnection > 0 
          ? Math.round((Date.now() - this.lastSuccessfulConnection) / 1000) + 's'
          : 'N/A';
        console.warn(`%c[RealtimeReceiver] ⚠️ Channel CLOSED (was connected for ${closedDuration}), will reconnect`, 'color: #FF9800');
        this.scheduleReconnect();
        break;

      case 'CHANNEL_ERROR':
        this.isSubscribed = false;
        // ⚡ تقليل الـ spam - طباعة warn بدلاً من error (هذا طبيعي إذا الجدول غير موجود)
        if (this.reconnectAttempts === 0) {
          console.warn('%c[RealtimeReceiver] ⚠️ Channel ERROR (operations_log table may not exist), will retry', 'color: #FF9800');
        }
        this.scheduleReconnect();
        break;

      case 'TIMED_OUT':
        this.isSubscribed = false;
        console.warn('%c[RealtimeReceiver] ⏱️ Subscription TIMED OUT, will reconnect', 'color: #FF9800');
        this.scheduleReconnect();
        break;

      default:
        console.log(`[RealtimeReceiver] Status: ${status}`);
    }
  }

  /**
   * معالجة حالة النظام
   */
  private handleSystemStatus(status: any): void {
    if (status.type === 'error') {
      console.error('[RealtimeReceiver] System error:', status);
    }
  }

  /**
   * ⚡ جدولة إعادة الاتصال مع Exponential Backoff + Jitter
   */
  private scheduleReconnect(): void {
    // ⚡ لا تحاول إعادة الاتصال إذا لم يكن هناك organizationId أو callback
    if (!this.organizationId || !this.callback) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // ⚡ فحص مزدوج: navigator.onLine + ConnectionState
    const isNavigatorOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isConnectionStateOffline = connectionState.isOffline();

    // ⚡ لا تحاول إعادة الاتصال إذا كنا offline
    if (isNavigatorOffline || isConnectionStateOffline) {
      const now = Date.now();
      // ⚡ طباعة log مرة واحدة كل 30 ثانية فقط
      if (now - this.lastOfflineLogTime >= this.OFFLINE_LOG_INTERVAL_MS) {
        console.log('%c[RealtimeReceiver] 📴 Network offline, waiting for connection...', 'color: #FF9800');
        this.lastOfflineLogTime = now;
      }

      // ⚡ فحص دوري كل 5 ثواني - إعادة الاتصال تتم تلقائياً عبر event listeners في constructor
      this.reconnectTimeout = setTimeout(() => {
        this.scheduleReconnect();
      }, 5000);
      return;
    }

    // ⚡ إعادة تعيين offline log time عند الاتصال
    this.lastOfflineLogTime = 0;

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`%c[RealtimeReceiver] ❌ Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached, stopping`, 'color: #f44336; font-weight: bold');
      return;
    }

    // ⚡ Exponential backoff: 2^n * base
    const exponentialDelay = Math.pow(2, this.reconnectAttempts) * this.RECONNECT_BASE_DELAY;
    
    // ⚡ Jitter: ±30% لتجنب thundering herd
    const jitter = exponentialDelay * this.JITTER_FACTOR * (Math.random() * 2 - 1);
    
    // ⚡ Cap at max delay
    const delay = Math.min(exponentialDelay + jitter, this.MAX_RECONNECT_DELAY);
    
    this.reconnectAttempts++;

    // ⚡ طباعة log فقط للمحاولات الأولى أو كل 5 محاولات
    if (this.reconnectAttempts <= 2 || this.reconnectAttempts % 5 === 0) {
      console.log(`%c[RealtimeReceiver] 🔄 Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`, 'color: #2196F3');
    }

    this.reconnectTimeout = setTimeout(() => {
      this.createSubscription();
    }, delay);
  }

  /**
   * إلغاء الاشتراك
   */
  async unsubscribe(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.channel) {
      try {
        await supabase.removeChannel(this.channel);
      } catch (error) {
        console.warn('[RealtimeReceiver] Error removing channel:', error);
      }
      this.channel = null;
    }

    this.isSubscribed = false;
    this.callback = null;
    console.log('[RealtimeReceiver] Unsubscribed');
  }

  /**
   * إعادة الاتصال يدوياً
   */
  async reconnect(): Promise<void> {
    if (!this.organizationId || !this.callback) {
      console.warn('[RealtimeReceiver] Cannot reconnect without org and callback');
      return;
    }

    await this.unsubscribe();
    this.reconnectAttempts = 0;
    await this.subscribe(this.organizationId, this.callback);
  }

  /**
   * جلب العمليات المفقودة من الخادم
   * يُستخدم لملء gaps في التسلسل
   */
  async fetchMissingOperations(startSeq: number, endSeq: number): Promise<ServerOperation[]> {
    if (!this.organizationId) {
      return [];
    }

    try {
      // @ts-ignore - operations_log غير موجود في Supabase types
      const { data, error } = await supabase
        .from('operations_log' as any)
        .select('*')
        .eq('organization_id', this.organizationId)
        .gte('server_seq', startSeq)
        .lte('server_seq', endSeq)
        .order('server_seq', { ascending: true });

      if (error) {
        // كتم أخطاء الجدول غير الموجود
        return [];
      }

      return (data as unknown as ServerOperation[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * جلب أحدث العمليات منذ server_seq معين
   */
  async fetchOperationsSince(sinceSeq: number, limit: number = 1000): Promise<ServerOperation[]> {
    if (!this.organizationId) {
      return [];
    }

    try {
      // @ts-ignore - operations_log غير موجود في Supabase types
      const { data, error } = await supabase
        .from('operations_log' as any)
        .select('*')
        .eq('organization_id', this.organizationId)
        .gt('server_seq', sinceSeq)
        .order('server_seq', { ascending: true })
        .limit(limit);

      if (error) {
        // كتم أخطاء الجدول غير الموجود
        return [];
      }

      return (data as unknown as ServerOperation[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * جلب أحدث server_seq من الخادم
   */
  async getLatestServerSeq(): Promise<number> {
    if (!this.organizationId) {
      return 0;
    }

    try {
      // @ts-ignore - operations_log غير موجود في Supabase types
      const { data, error } = await supabase
        .from('operations_log' as any)
        .select('server_seq')
        .eq('organization_id', this.organizationId)
        .order('server_seq', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 = No rows, 406/42P01 = Table doesn't exist
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('406')) {
          return 0;
        }
        // كتم الأخطاء الأخرى - الجدول قد لا يكون موجوداً بعد
        return 0;
      }

      return (data as any)?.server_seq || 0;
    } catch {
      // الجدول غير موجود - هذا طبيعي
      return 0;
    }
  }

  /**
   * الحصول على حالة الاشتراك
   */
  getStatus(): {
    isSubscribed: boolean;
    organizationId: string | null;
    reconnectAttempts: number;
    deviceId: string;
  } {
    return {
      isSubscribed: this.isSubscribed,
      organizationId: this.organizationId,
      reconnectAttempts: this.reconnectAttempts,
      deviceId: this.deviceId
    };
  }

  /**
   * فحص صحة الاتصال
   */
  isHealthy(): boolean {
    return this.isSubscribed && this.channel !== null;
  }
}

// Export singleton instance
export const realtimeReceiver = new RealtimeReceiver();
