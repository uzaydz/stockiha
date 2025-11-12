import { networkStatusManager } from '@/lib/events/networkStatusManager';

export type ConnectivityLevel = 'online' | 'degraded' | 'offline';

interface ConnectivityState {
  isOnline: boolean;
  level: ConnectivityLevel;
  latencyMs: number | null;
  timestamp: number;
}

type Listener = (s: ConnectivityState) => void;

class ConnectivityServiceClass {
  private state: ConnectivityState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    level: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
    latencyMs: null,
    timestamp: Date.now()
  };

  private listeners = new Set<Listener>();
  private timer: number | null = null;
  private started = false;
  private failureStreak = 0;
  private successStreak = 0;
  private latencySamples: number[] = [];
  private hardOfflineUntil: number | null = null;

  // الفواصل الزمنية قابلة للتهيئة من env، مع قيم افتراضية مريحة للإنتاج
  private readonly BASE_INTERVAL = Number((import.meta as any)?.env?.VITE_CONNECTIVITY_BASE_INTERVAL_MS ?? ((import.meta as any)?.env?.PROD ? 60000 : 30000));
  private readonly MAX_INTERVAL = Number((import.meta as any)?.env?.VITE_CONNECTIVITY_MAX_INTERVAL_MS ?? 180000);
  private readonly TIMEOUT_MS = 4000;     // 4s
  private readonly DEGRADED_LATENCY_MS = 1200; // 1.2s
  private readonly ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

  start() {
    if (this.started) return;
    this.started = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    // تشغيل فحص أولي وفوري
    void this.healthCheck();

    if (this.timer == null && typeof window !== 'undefined') {
      this.timer = window.setInterval(() => {
        void this.healthCheck();
      }, this.BASE_INTERVAL);
    }
  }

  stop() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.timer != null && typeof window !== 'undefined') {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.started = false;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  getStatus(): ConnectivityState {
    return this.state;
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  private notify(next: ConnectivityState) {
    this.state = next;
    for (const cb of this.listeners) {
      try { cb(next); } catch { /* ignore */ }
    }
    // ربط مع networkStatusManager (boolean فقط)
    networkStatusManager.setStatus(next.isOnline);
  }

  private handleOnline = () => {
    // عند حدث online من النظام، نفحص فوراً
    void this.healthCheck(true);
  };

  private handleOffline = () => {
    this.failureStreak++;
    this.successStreak = 0;
    const next: ConnectivityState = {
      isOnline: false,
      level: 'offline',
      latencyMs: null,
      timestamp: Date.now()
    };
    this.notify(next);
  };

  private computeLevel(success: boolean, latency: number | null): ConnectivityLevel {
    if (!success) return 'offline';
    if (latency != null && latency > this.DEGRADED_LATENCY_MS) return 'degraded';
    return 'online';
  }

  private getHealthUrl(): string | null {
    const base = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
    if (!base) return null;
    // auth settings لا يتطلب توثيق
    return `${base.replace(/\/$/, '')}/auth/v1/settings`;
  }

  private async healthCheck(immediate = false): Promise<void> {
    // إذا كان النظام يصرّح أننا أوفلاين، لا تقم بأي طلبات شبكة
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const next: ConnectivityState = {
        isOnline: false,
        level: 'offline',
        latencyMs: null,
        timestamp: Date.now()
      };
      this.notify(next);
      this.adjustInterval(false, immediate);
      return;
    }

    // نافذة أوفلاين صلبة بعد فشل متكرر لتجنب ضجيج الشبكة
    if (this.hardOfflineUntil && Date.now() < this.hardOfflineUntil) {
      const next: ConnectivityState = {
        isOnline: false,
        level: 'offline',
        latencyMs: null,
        timestamp: Date.now()
      };
      this.notify(next);
      this.adjustInterval(false, immediate);
      return;
    }

    const url = this.getHealthUrl();
    // إن لم يوجد URL، ارجع لحالة navigator
    if (!url) {
      const navOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;
      const level: ConnectivityLevel = navOnline ? 'online' : 'offline';
      const next: ConnectivityState = {
        isOnline: navOnline,
        level,
        latencyMs: null,
        timestamp: Date.now()
      };
      this.notify(next);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    const started = performance.now();

    try {
      const resp = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(this.ANON_KEY ? { 'apikey': this.ANON_KEY, 'Authorization': `Bearer ${this.ANON_KEY}` } : {})
        }
      });
      const latency = performance.now() - started;
      clearTimeout(timeout);

      const ok = resp.ok || (resp.status >= 200 && resp.status < 500);
      // أي استجابة من الخادم (حتى 404/401) تُعتبر اتصالاً شبكياً صالحاً
      this.successStreak = ok ? this.successStreak + 1 : 0;
      this.failureStreak = ok ? 0 : this.failureStreak + 1;

      if (ok) {
        this.pushLatency(latency);
        // تثبيت مرساة الوقت الآمن من ترويسة Date عند نجاح الاتصال
        try {
          const dateHeader = resp.headers?.get?.('date');
          if (dateHeader) {
            const serverNowMs = Date.parse(dateHeader);
            if (Number.isFinite(serverNowMs) && typeof window !== 'undefined') {
              const orgId = localStorage.getItem('bazaar_organization_id');
              const api: any = (window as any).electronAPI;
              if (api?.license && typeof api.license.setAnchor === 'function') {
                await api.license.setAnchor(orgId || null, serverNowMs);
              }
            }
          }
        } catch { /* ignore anchor errors */ }
      }

      const avgLatency = this.getAvgLatency();
      const level = this.computeLevel(ok, avgLatency ?? latency);
      const next: ConnectivityState = {
        isOnline: level !== 'offline',
        level,
        latencyMs: avgLatency ?? latency,
        timestamp: Date.now()
      };
      this.notify(next);

      // ضبط التكرار بناء على النجاح/الفشل
      this.adjustInterval(ok, immediate);
    } catch {
      clearTimeout(timeout);
      this.successStreak = 0;
      this.failureStreak += 1;
      // بعد فشلين متتاليين على الأقل، فعّل نافذة أوفلاين صلبة لتقليل المحاولات
      if (this.failureStreak >= 2) {
        const backoff = Math.min(this.BASE_INTERVAL * Math.max(1, this.failureStreak), this.MAX_INTERVAL);
        this.hardOfflineUntil = Date.now() + backoff;
      }
      const next: ConnectivityState = {
        isOnline: false,
        level: 'offline',
        latencyMs: null,
        timestamp: Date.now()
      };
      this.notify(next);
      this.adjustInterval(false, immediate);
    }
  }

  private pushLatency(v: number) {
    this.latencySamples.push(v);
    if (this.latencySamples.length > 5) {
      this.latencySamples.shift();
    }
  }

  private getAvgLatency(): number | null {
    if (this.latencySamples.length === 0) return null;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
    }

  private adjustInterval(success: boolean, immediate = false) {
    if (typeof window === 'undefined') return;
    if (this.timer != null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    let interval = this.BASE_INTERVAL;
    if (!success) {
      // backoff بسيط حسب عدد الإخفاقات
      interval = Math.min(this.BASE_INTERVAL * Math.max(1, this.failureStreak), this.MAX_INTERVAL);
    }

    // إن كان فحصاً فورياً بعد عودة الاتصال، لا نبالغ في الإطالة
    if (immediate) interval = this.BASE_INTERVAL;

    this.timer = window.setInterval(() => {
      void this.healthCheck();
    }, interval);
  }
}

export const ConnectivityService = new ConnectivityServiceClass();

// تشغيل الخدمة تلقائياً عند الاستيراد
ConnectivityService.start();
