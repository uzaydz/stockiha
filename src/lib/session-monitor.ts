/**
 * نظام مراقبة الجلسة الموحد - يحل مشكلة التكرار نهائياً
 * يضمن وجود مراقب واحد فقط للجلسة في كامل التطبيق
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase-unified';

// 🔒 نمط Singleton لضمان وجود مراقب واحد فقط
class SessionMonitor {
  private static instance: SessionMonitor | null = null;
  private static isInitializing = false;
  
  private session: Session | null = null;
  private isValid: boolean = false;
  private isRefreshing: boolean = false;
  private lastRefresh: number = 0;
  private refreshInterval: NodeJS.Timeout | null = null;
  private validationInterval: NodeJS.Timeout | null = null;
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
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    // جدولة جديدة كل 10 دقائق
    this.validationInterval = setInterval(() => {
      this.checkSessionHealth();
    }, 10 * 60 * 1000); // 10 دقائق
  }
  
  // 🔒 فحص صحة الجلسة
  private async checkSessionHealth(): Promise<void> {
    if (this.isRefreshing) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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
        if (process.env.NODE_ENV === 'development') {
        }
        this.isValid = false;
      } else if (data.session) {
        this.session = data.session;
        this.isValid = this.validateSession(data.session);
        
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
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
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
      uptime: Date.now() - (this.session?.created_at ? this.session.created_at * 1000 : Date.now())
    };
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
