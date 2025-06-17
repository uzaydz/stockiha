/**
 * نظام Cross-Domain Authentication محسن
 * يحل مشاكل النقل بين النطاقات الفرعية وlocalhost
 */

import { supabase, getSupabaseClient } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// مفاتيح التخزين
const STORAGE_KEYS = {
  CROSS_DOMAIN_SESSION: 'bazaar_cross_domain_session',
  TRANSFER_FLAG: 'bazaar_session_transfer',
  BACKUP_SESSION: 'bazaar_session_backup',
  LAST_TRANSFER: 'bazaar_last_transfer_time'
} as const;

// إعدادات الانتهاء الصلاحية
const EXPIRY_TIMES = {
  SESSION_TRANSFER: 5 * 60 * 1000, // 5 دقائق
  URL_TOKEN: 2 * 60 * 1000, // دقيقتان
  DEBOUNCE: 1000 // ثانية واحدة لـ debouncing
} as const;

// دالة مساعدة للتأكد من جاهزية Supabase client
const ensureSupabaseReady = async (maxWaitTime = 5000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // محاولة الوصول لـ auth
      if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
        return supabase;
      }
      
      // محاولة الحصول على client من الدالة الموحدة
      const client = await getSupabaseClient();
      if (client && client.auth && typeof client.auth.getSession === 'function') {
        return client;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Continue trying
    }
  }
  
  throw new Error('Supabase client not ready within timeout');
};

interface SessionData {
  access_token: string;
  refresh_token: string;
  user_id: string;
  expires_at?: number;
}

interface TransferPayload {
  session: SessionData;
  timestamp: number;
  source: string;
  target?: string;
}

/**
 * فئة لإدارة Cross-Domain Authentication
 */
class CrossDomainAuthManager {
  private static instance: CrossDomainAuthManager | null = null;
  private lastTransferTime = 0;
  private transferInProgress = false;

  private constructor() {
    this.setupTransferReceiver();
  }

  public static getInstance(): CrossDomainAuthManager {
    if (!CrossDomainAuthManager.instance) {
      CrossDomainAuthManager.instance = new CrossDomainAuthManager();
    }
    return CrossDomainAuthManager.instance;
  }

  /**
   * تشفير آمن للبيانات الحساسة
   */
  private encodeSessionData(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      throw new Error('فشل في تشفير بيانات الجلسة');
    }
  }

  /**
   * فك تشفير البيانات
   */
  private decodeSessionData(encodedData: string): any {
    try {
      const jsonString = atob(encodedData);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('فشل في فك تشفير بيانات الجلسة');
    }
  }

  /**
   * حفظ الجلسة للنقل بين النطاقات
   */
  public async saveSessionForTransfer(session: Session): Promise<string> {
    try {
      const sessionData: SessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: session.user.id,
        expires_at: session.expires_at
      };

      const transferPayload: TransferPayload = {
        session: sessionData,
        timestamp: Date.now(),
        source: window.location.origin
      };

      // حفظ في localStorage مع TTL
      const encoded = this.encodeSessionData(transferPayload);
      localStorage.setItem('bazaar_transfer_session', encoded);
      
      return encoded;
    } catch (error) {
      throw new Error('فشل في حفظ الجلسة للنقل');
    }
  }

  /**
   * استرداد الجلسة المحفوظة
   */
  public retrieveTransferredSession(): any | null {
    try {
      const encoded = localStorage.getItem('bazaar_transfer_session');
      if (!encoded) {
        return null;
      }

      const transferPayload = this.decodeSessionData(encoded);
      
      // التحقق من انتهاء الصلاحية (5 دقائق)
      const maxAge = 5 * 60 * 1000;
      if (Date.now() - transferPayload.timestamp > maxAge) {
        this.cleanupTransferredSession();
        return null;
      }

      return transferPayload;
    } catch (error) {
      this.cleanupTransferredSession();
      return null;
    }
  }

  /**
   * تنظيف الجلسة المنقولة
   */
  public cleanupTransferredSession(): void {
    try {
      localStorage.removeItem('bazaar_transfer_session');
    } catch (error) {
      // Silent cleanup
    }
  }

  /**
   * إنشاء URL للنطاق الفرعي
   */
  public generateSubdomainUrl(subdomain: string, path: string = '/'): string {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // إذا كنا في localhost، استخدم المنطق المحلي
    if (hostname.includes('localhost')) {
      const port = window.location.port;
      const portSuffix = port ? `:${port}` : '';
      return `${protocol}//${subdomain}.localhost${portSuffix}${path}`;
    }
    
    // للنطاقات الحقيقية
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const mainDomain = domainParts.slice(-2).join('.');
      return `${protocol}//${subdomain}.${mainDomain}${path}`;
    }
    
    return `${protocol}//${subdomain}.${hostname}${path}`;
  }

  /**
   * تطبيق الجلسة من URL token
   */
  public async applyTokenFromUrl(authToken: string): Promise<boolean> {
    try {
      const tokenData = this.decodeSessionData(authToken);
      
      if (!tokenData) {
        return false;
      }

      // تطبيق الجلسة - التأكد من جاهزية Client أولاً
      const client = await ensureSupabaseReady();
      const { data, error } = await client.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * تطبيق الجلسة المنقولة
   */
  public async applyTransferredSession(): Promise<boolean> {
    try {
      const transferPayload = this.retrieveTransferredSession();
      
      if (!transferPayload || !transferPayload.session) {
        return false;
      }

      const sessionData = transferPayload.session;
      const client = await ensureSupabaseReady();
      const { data, error } = await client.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * توجيه مع نقل الجلسة
   */
  public async redirectWithSession(targetUrl: string, session?: Session | null): Promise<void> {
    if (this.transferInProgress) {
      return;
    }

    this.transferInProgress = true;
    
    try {
      // الحصول على الجلسة الحالية إذا لم يتم تمريرها
      if (!session) {
        const client = await ensureSupabaseReady();
        const { data: { session: currentSession } } = await client.auth.getSession();
        session = currentSession;
      }

      let finalUrl = targetUrl;

      if (session) {
        // حفظ الجلسة
        const encodedSession = await this.saveSessionForTransfer(session);
        
        // إضافة معاملات URL
        const urlParams = new URLSearchParams();
        urlParams.set('transfer_session', 'true');
        urlParams.set('timestamp', Date.now().toString());
        
        // إضافة token في URL إذا لم يكن طويلاً جداً
        if (encodedSession && encodedSession.length < 1500) {
          urlParams.set('auth_token', encodedSession);
        }

        const separator = targetUrl.includes('?') ? '&' : '?';
        finalUrl = `${targetUrl}${separator}${urlParams.toString()}`;
      }
      
      // إضافة تأخير قصير لضمان حفظ البيانات
      setTimeout(() => {
        window.location.replace(finalUrl);
      }, 100);

    } catch (error) {
      // في حالة الفشل، توجه مباشرة
      window.location.replace(targetUrl);
    } finally {
      this.transferInProgress = false;
    }
  }

  /**
   * فحص وتطبيق الجلسة المنقولة عند تحميل الصفحة
   */
  public async checkAndApplyTransferredSession(): Promise<boolean> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hasTransferSession = urlParams.get('transfer_session') === 'true';
      const authToken = urlParams.get('auth_token');

      if (!hasTransferSession) {
        return false;
      }

      let applied = false;

      // محاولة استخدام auth_token من URL
      if (authToken) {
        applied = await this.applyTokenFromUrl(authToken);
      }

      // fallback: استخدام localStorage
      if (!applied) {
        applied = await this.applyTransferredSession();
      }

      if (applied) {
        // تنظيف URL من المعاملات
        this.cleanupUrl();
      }

      return applied;
    } catch (error) {
      return false;
    }
  }

  /**
   * تنظيف URL من معاملات النقل
   */
  private cleanupUrl(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('transfer_session');
      url.searchParams.delete('auth_token');
      url.searchParams.delete('timestamp');
      
      // تحديث URL بدون إعادة تحميل
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      // Silent cleanup
    }
  }

  /**
   * إعداد مستقبل الجلسة المنقولة
   */
  private setupTransferReceiver(): void {
    // تحقق من وجود جلسة منقولة عند تحميل الصفحة
    if (typeof window !== 'undefined') {
      // انتظار تحميل DOM
      const initReceiver = () => {
        this.checkAndApplyTransferredSession();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReceiver);
      } else {
        setTimeout(initReceiver, 100);
      }
    }
  }

  /**
   * فحص صحة الجلسة الحالية
   */
  public async validateCurrentSession(): Promise<boolean> {
    try {
      const client = await ensureSupabaseReady();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      // فحص إضافي للمستخدم
      const { data: user, error: userError } = await client.auth.getUser();
      
      return !userError && !!user;
    } catch (error) {
      return false;
    }
  }
}

// إنشاء instance وحيد
const crossDomainAuth = CrossDomainAuthManager.getInstance();

// تصدير الدوال للاستخدام
export const saveSessionForTransfer = (session: Session) => 
  crossDomainAuth.saveSessionForTransfer(session);

export const retrieveTransferredSession = () => 
  crossDomainAuth.retrieveTransferredSession();

export const cleanupTransferredSession = () => 
  crossDomainAuth.cleanupTransferredSession();

export const generateSubdomainUrl = (subdomain: string, path?: string) => 
  crossDomainAuth.generateSubdomainUrl(subdomain, path);

export const applyTokenFromUrl = (authToken: string) => 
  crossDomainAuth.applyTokenFromUrl(authToken);

export const applyTransferredSession = () => 
  crossDomainAuth.applyTransferredSession();

export const redirectWithSession = (targetUrl: string, session?: Session | null) => 
  crossDomainAuth.redirectWithSession(targetUrl, session);

export const checkAndApplyTransferredSession = () => 
  crossDomainAuth.checkAndApplyTransferredSession();

export const validateCurrentSession = () => 
  crossDomainAuth.validateCurrentSession();

// تصدير الفئة للاستخدام المتقدم
export { CrossDomainAuthManager };

// Debug tools removed for production
