/**
 * نظام مراقبة الجلسة الموحد - يحل مشكلة التكرار نهائياً
 * يضمن وجود مراقب واحد فقط للجلسة في كامل التطبيق
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase-unified';
import { saveSecureSession } from '@/context/auth/utils/secureSessionStorage';

const isDevelopment = import.meta.env.DEV;
const BASE_VALIDATION_INTERVAL = isDevelopment ? 5 * 60 * 1000 : 12 * 60 * 1000;
const MIN_VALIDATION_INTERVAL = 60 * 1000;
const EXPIRY_BUFFER = 5 * 60 * 1000;

// 🔒 نمط Singleton لضمان وجود مراقب واحد فقط
class SessionMonitor {
  private static instance: SessionMonitor | null = null;
  private static isInitializing = false;
  
  private session: Session | null = null;
  private isValid: boolean = false;
  private isRefreshing: boolean = false;
  private lastRefresh: number = 0;
  private validationTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(session: Session | null, isValid: boolean) => void> = new Set();
  
  // ✅ منع إنشاء أكثر من مراقب واحد
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      if (!SessionMonitor.isInitializing) {
        SessionMonitor.isInitializing = true;
        try {
          SessionMonitor.instance = new SessionMonitor();
        } finally {
          SessionMonitor.isInitializing = false;
        }
      }
      return SessionMonitor.instance;
    }
    return SessionMonitor.instance;
  }
  
  // 🔒 تهيئة المراقب
  private async initialize(): Promise<void> {
    try {
      // الحصول على الجلسة الحالية
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
      this.isValid = this.validateSession(session);
      
      // مراقبة تغييرات المصادقة
      supabase.auth.onAuthStateChange(async (event, session) => {
        this.session = session;
        this.isValid = this.validateSession(session);

        // ✅ حافظ على SecureSession محدثة خصوصاً عند TOKEN_REFRESHED
        // Supabase يقوم بعمل rotation للـ refresh_token؛ إذا لم نخزن النسخة الجديدة
        // سنرجع لتوكن قديم بعد إعادة التشغيل.
        if (session) {
          try {
            await saveSecureSession(session);
          } catch { /* ignore */ }
        }
        
        // إخطار المستمعين
        this.notifyListeners();
        
        // إعادة جدولة المراقبة
        this.scheduleValidation();
      });
      
      // جدولة المراقبة الأولية
      this.scheduleValidation();
      
      if (process.env.NODE_ENV === 'development') {
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }

  /**
   * ✅ Hydrate Supabase client with an externally-restored session (from secure storage).
   * This fixes the mismatch where AuthContext has a local session but Supabase has none.
   */
  async hydrateFromExternalSession(externalSession: Session | null): Promise<boolean> {
    if (!externalSession) return false;

    // لا نحاول "تركيب" جلسات الأوفلاين الوهمية داخل Supabase
    const refreshToken = String((externalSession as any).refresh_token || '');
    if (
      externalSession.access_token === 'offline_token' ||
      refreshToken === 'offline_refresh_token' ||
      refreshToken.startsWith('offline-refresh-') ||
      !refreshToken
    ) {
      return false;
    }

    try {
      // إذا كانت نفس الجلسة موجودة بالفعل، لا تفعل شيئاً
      if (this.session?.access_token && this.session.access_token === externalSession.access_token) {
        return this.isValid;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: externalSession.access_token,
        refresh_token: refreshToken,
      });

      if (error) {
        return false;
      }

      this.session = data.session ?? externalSession;
      this.isValid = this.validateSession(this.session);
      this.notifyListeners();
      this.scheduleValidation();
      return this.isValid;
    } catch {
      return false;
    }
  }
  
  // 🔒 التحقق من صحة الجلسة
  private validateSession(session: Session | null): boolean {
    if (!session) return false;
    
    try {
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      
      // إذا انتهت الصلاحية فعلياً
      if (expiresAt && now >= expiresAt) {
        return false;
      }
      
      // إذا ستنتهي خلال 10 دقائق
      if (expiresAt && now >= (expiresAt - 10 * 60 * 1000)) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // 🔒 جدولة التحقق من صحة الجلسة
  private scheduleValidation(): void {
    // إلغاء الجدولة السابقة
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }

    const delay = this.getNextValidationDelay();

    this.validationTimeout = setTimeout(() => {
      this.validationTimeout = null;
      void this.checkSessionHealth();
    }, delay);
  }
  
  // 🔒 فحص صحة الجلسة
  private async checkSessionHealth(): Promise<void> {
    if (this.isRefreshing) return;
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[SessionMonitor] ⚠️ getSession error', {
          message: error.message,
          status: (error as any)?.status,
          name: error.name,
        });
      }

      if (session !== this.session) {
        this.session = session;
        this.isValid = this.validateSession(session);
        this.notifyListeners();
      }
      
      // إذا كانت الجلسة غير صالحة، حاول تجديدها
      if (!this.isValid && session) {
        await this.refreshSession();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }

    this.scheduleValidation();
  }
  
  // 🔒 تجديد الجلسة (مرة واحدة فقط)
  private async refreshSession(): Promise<void> {
    if (this.isRefreshing) return;
    
    // منع التكرار - مرة واحدة كل 5 دقائق
    const now = Date.now();
    if (now - this.lastRefresh < 5 * 60 * 1000) {
      return;
    }
    
    this.isRefreshing = true;
    this.lastRefresh = now;

    try {
      if (process.env.NODE_ENV === 'development') {
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('[SessionMonitor] ❌ refreshSession failed', {
          message: error.message,
          status: (error as any)?.status,
          name: error.name,
        });
      } else {
        console.log('[SessionMonitor] ✅ refreshSession result', {
          hasSession: Boolean(data.session),
          accessTokenTail: data.session ? `***${data.session.access_token.slice(-6)}` : 'null',
          refreshTokenTail: data.session ? `***${(data.session as any).refresh_token?.slice?.(-6)}` : 'null',
          expiresAt: data.session?.expires_at,
        });
      }
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
        }
        this.isValid = false;
      } else if (data.session) {
        this.session = data.session;
        this.isValid = this.validateSession(data.session);
        void saveSecureSession(data.session);
        
        if (process.env.NODE_ENV === 'development') {
        }
      }
      
      this.notifyListeners();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
      this.isValid = false;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  // 🔒 إضافة مستمع
  addListener(listener: (session: Session | null, isValid: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // إرجاع دالة إزالة
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // 🔒 إخطار المستمعين
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.session, this.isValid);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    });
  }
  
  // 🔒 الحصول على الجلسة الحالية
  getCurrentSession(): { session: Session | null; isValid: boolean } {
    return {
      session: this.session,
      isValid: this.isValid
    };
  }
  
  // 🔒 تجديد الجلسة يدوياً
  async manualRefresh(): Promise<boolean> {
    await this.refreshSession();
    return this.isValid;
  }
  
  // 🔒 تنظيف الموارد
  cleanup(): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }
    
    this.listeners.clear();
  }
  
  // 🔒 إحصائيات المراقب
  getStats() {
    return {
      hasSession: !!this.session,
      isValid: this.isValid,
      isRefreshing: this.isRefreshing,
      lastRefresh: this.lastRefresh,
      listenersCount: this.listeners.size,
      uptime: this.lastRefresh ? (Date.now() - this.lastRefresh) : 0
    };
  }

  private getNextValidationDelay(): number {
    if (!this.session?.expires_at) {
      return BASE_VALIDATION_INTERVAL;
    }

    const expiresAt = this.session.expires_at * 1000;
    const timeUntilExpiry = expiresAt - Date.now();

    if (timeUntilExpiry <= 0) {
      return MIN_VALIDATION_INTERVAL;
    }

    const buffered = timeUntilExpiry - EXPIRY_BUFFER;
    if (buffered <= 0) {
      return MIN_VALIDATION_INTERVAL;
    }

    return Math.max(MIN_VALIDATION_INTERVAL, Math.min(buffered, BASE_VALIDATION_INTERVAL));
  }
}

// 🔒 تصدير المراقب الموحد
export const sessionMonitor = SessionMonitor.getInstance();

// 🔒 دوال مساعدة
export const getCurrentSession = () => sessionMonitor.getCurrentSession();
export const addSessionListener = (listener: (session: Session | null, isValid: boolean) => void) => 
  sessionMonitor.addListener(listener);
export const refreshSession = () => sessionMonitor.manualRefresh();
export const getSessionStats = () => sessionMonitor.getStats();
