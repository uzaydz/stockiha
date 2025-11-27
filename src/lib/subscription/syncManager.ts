/**
 * مدير مزامنة الاشتراكات المحسن
 *
 * يدير مزامنة بيانات الاشتراك بين:
 * - الخادم (Supabase)
 * - التخزين المحلي (SQLite)
 * - الكاش (localStorage/sessionStorage)
 *
 * الميزات:
 * - مزامنة ذكية عند استعادة الاتصال
 * - تجنب المزامنة المتكررة
 * - التعامل مع الصراعات
 * - تسجيل سجلات التدقيق
 */

import { supabase } from '@/lib/supabase';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';
import { setAnchorFromServer } from '@/lib/license/licenseService';
import { offlineSubscriptionService } from '@/api/offlineSubscriptionService';

// واجهة حالة المزامنة
export interface SyncState {
  lastSyncTime: number | null;
  lastSyncStatus: 'success' | 'failed' | 'pending' | 'offline';
  pendingChanges: number;
  isOnline: boolean;
  error?: string;
}

// واجهة نتيجة المزامنة
export interface SyncResult {
  success: boolean;
  message: string;
  syncedAt?: Date;
  changes?: {
    local: number;
    remote: number;
  };
}

// إعدادات المزامنة
const SYNC_CONFIG = {
  minInterval: 5 * 60 * 1000,     // 5 دقائق كحد أدنى بين المزامنات
  maxRetries: 3,                   // عدد المحاولات
  retryDelay: 5000,               // تأخير بين المحاولات
  offlineGracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 أيام للعمل أوفلاين
};

class SubscriptionSyncManager {
  private static instance: SubscriptionSyncManager;
  private state: SyncState;
  private syncInProgress = false;
  private retryCount = 0;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;
  private listeners: Set<(state: SyncState) => void> = new Set();

  private constructor() {
    this.state = {
      lastSyncTime: this.getLastSyncTime(),
      lastSyncStatus: 'pending',
      pendingChanges: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };

    this.setupNetworkListeners();
  }

  static getInstance(): SubscriptionSyncManager {
    if (!SubscriptionSyncManager.instance) {
      SubscriptionSyncManager.instance = new SubscriptionSyncManager();
    }
    return SubscriptionSyncManager.instance;
  }

  /**
   * إعداد مستمعي حالة الشبكة
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.onlineListener = () => {
      console.log('[SyncManager] Network restored');
      this.state.isOnline = true;
      this.notifyListeners();

      // مزامنة تلقائية عند استعادة الاتصال
      this.syncWhenOnline();
    };

    this.offlineListener = () => {
      console.log('[SyncManager] Network lost');
      this.state.isOnline = false;
      this.state.lastSyncStatus = 'offline';
      this.notifyListeners();
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  /**
   * المزامنة عند استعادة الاتصال
   */
  private async syncWhenOnline(): Promise<void> {
    // انتظار قليلاً للتأكد من استقرار الاتصال
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (navigator.onLine) {
      // جلب معرف المؤسسة من الكاش
      const orgId = this.getCurrentOrganizationId();
      if (orgId) {
        await this.sync(orgId, { force: false });
      }
    }
  }

  /**
   * الحصول على معرف المؤسسة الحالية
   */
  private getCurrentOrganizationId(): string | null {
    try {
      // محاولة جلب من localStorage
      const authData = localStorage.getItem('auth_state');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.organization?.id || null;
      }
    } catch { }
    return null;
  }

  /**
   * تنفيذ المزامنة
   */
  async sync(organizationId: string, options: { force?: boolean } = {}): Promise<SyncResult> {
    // التحقق من عدم وجود مزامنة جارية
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'مزامنة أخرى جارية'
      };
    }

    // التحقق من الاتصال
    if (!navigator.onLine) {
      this.state.lastSyncStatus = 'offline';
      this.notifyListeners();
      return {
        success: false,
        message: 'لا يوجد اتصال بالإنترنت'
      };
    }

    // التحقق من الحد الأدنى للفترة بين المزامنات
    if (!options.force && this.state.lastSyncTime) {
      const timeSinceLastSync = Date.now() - this.state.lastSyncTime;
      if (timeSinceLastSync < SYNC_CONFIG.minInterval) {
        return {
          success: true,
          message: 'المزامنة الأخيرة حديثة',
          syncedAt: new Date(this.state.lastSyncTime)
        };
      }
    }

    this.syncInProgress = true;
    this.state.lastSyncStatus = 'pending';
    this.notifyListeners();

    try {
      console.log('[SyncManager] Starting sync for', organizationId);

      // 1. جلب البيانات من الخادم
      const { data: serverData, error } = await supabase.rpc(
        'check_organization_subscription_enhanced' as any,
        { org_id: organizationId }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!serverData) {
        throw new Error('لم يتم العثور على بيانات الاشتراك');
      }

      // 2. تحديث الكاش المحلي
      await subscriptionCache.forceRefresh(organizationId);

      // 3. تحديث SQLite للأوفلاين
      await offlineSubscriptionService.syncSubscription(organizationId);

      // 4. تحديث الساعة الآمنة
      await setAnchorFromServer(organizationId, Date.now());

      // 5. تحديث حالة المزامنة
      const now = Date.now();
      this.state.lastSyncTime = now;
      this.state.lastSyncStatus = 'success';
      this.state.pendingChanges = 0;
      this.retryCount = 0;
      this.saveLastSyncTime(now);

      // 6. تسجيل في سجلات التدقيق
      await subscriptionAudit.log('SYNC_SUCCESS', organizationId, {
        syncedAt: new Date(now).toISOString(),
        source: 'syncManager'
      });

      this.notifyListeners();

      console.log('[SyncManager] Sync completed successfully');

      return {
        success: true,
        message: 'تمت المزامنة بنجاح',
        syncedAt: new Date(now),
        changes: { local: 1, remote: 0 }
      };

    } catch (error: any) {
      console.error('[SyncManager] Sync failed:', error);

      this.state.lastSyncStatus = 'failed';
      this.state.error = error.message;

      // تسجيل الفشل
      await subscriptionAudit.log('SYNC_FAILED', organizationId, {
        error: error.message,
        retryCount: this.retryCount
      }, { severity: 'error' });

      // محاولة إعادة المزامنة
      if (this.retryCount < SYNC_CONFIG.maxRetries) {
        this.retryCount++;
        setTimeout(() => {
          this.sync(organizationId, { force: true });
        }, SYNC_CONFIG.retryDelay * this.retryCount);
      }

      this.notifyListeners();

      return {
        success: false,
        message: error.message || 'فشلت المزامنة'
      };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * فرض المزامنة
   */
  async forceSync(organizationId: string): Promise<SyncResult> {
    return this.sync(organizationId, { force: true });
  }

  /**
   * الحصول على حالة المزامنة
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * الاشتراك في تغييرات الحالة
   */
  subscribe(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * إشعار المستمعين
   */
  private notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach(callback => {
      try {
        callback(stateCopy);
      } catch (e) {
        console.error('[SyncManager] Listener error:', e);
      }
    });
  }

  /**
   * حفظ وقت آخر مزامنة
   */
  private saveLastSyncTime(time: number): void {
    try {
      localStorage.setItem('subscription_last_sync', String(time));
    } catch { }
  }

  /**
   * جلب وقت آخر مزامنة
   */
  private getLastSyncTime(): number | null {
    try {
      const stored = localStorage.getItem('subscription_last_sync');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * التحقق من الحاجة للمزامنة
   */
  needsSync(): boolean {
    if (!this.state.lastSyncTime) return true;
    return Date.now() - this.state.lastSyncTime > SYNC_CONFIG.minInterval;
  }

  /**
   * التحقق من انتهاء فترة الأوفلاين
   */
  isOfflineGracePeriodExpired(): boolean {
    if (!this.state.lastSyncTime) return true;
    return Date.now() - this.state.lastSyncTime > SYNC_CONFIG.offlineGracePeriod;
  }

  /**
   * تنظيف
   */
  cleanup(): void {
    if (typeof window !== 'undefined') {
      if (this.onlineListener) {
        window.removeEventListener('online', this.onlineListener);
      }
      if (this.offlineListener) {
        window.removeEventListener('offline', this.offlineListener);
      }
    }
    this.listeners.clear();
  }
}

// تصدير المثيل الوحيد
export const syncManager = SubscriptionSyncManager.getInstance();

// ====== React Hook ======

import { useEffect, useState, useCallback } from 'react';

export function useSyncState(organizationId: string | undefined) {
  const [state, setState] = useState<SyncState>(syncManager.getState());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    if (organizationId) {
      return syncManager.sync(organizationId);
    }
    return { success: false, message: 'لا توجد مؤسسة' };
  }, [organizationId]);

  const forceSync = useCallback(async () => {
    if (organizationId) {
      return syncManager.forceSync(organizationId);
    }
    return { success: false, message: 'لا توجد مؤسسة' };
  }, [organizationId]);

  return {
    ...state,
    sync,
    forceSync,
    needsSync: syncManager.needsSync(),
    isOfflineExpired: syncManager.isOfflineGracePeriodExpired()
  };
}
