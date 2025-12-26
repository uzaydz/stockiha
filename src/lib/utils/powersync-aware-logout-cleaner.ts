/**
 * ===================================================================
 * 🧹 POWERSYNC-AWARE LOGOUT CLEANER - تنظيف آمن مع PowerSync
 * ===================================================================
 *
 * نظام تنظيف آمن يفهم PowerSync ويمنع إنشاء DELETE operations خاطئة
 *
 * المشكلة القديمة:
 * - حذف IndexedDB مباشرة → PowerSync يفسرها كـ DELETE operations
 * - عند تسجيل الدخول بمؤسسة أخرى → محاولة sync DELETE operations للمؤسسة القديمة
 * - فشل بسبب foreign key constraints
 *
 * الحل:
 * - استخدام PowerSync API (disconnectAndClear) بدلاً من حذف IndexedDB مباشرة
 * - تنظيف بالترتيب الصحيح: PowerSync أولاً، ثم باقي البيانات
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { QueryClient } from '@tanstack/react-query';

export interface LogoutOptions {
  redirectUrl?: string;
  skipNavigation?: boolean;
  showLoading?: boolean;
  clearPowerSync?: boolean; // جديد: خيار تنظيف PowerSync
}

export class PowerSyncAwareLogoutCleaner {
  private static isProcessing = false;
  private static readonly MAX_TIMEOUT = 15000; // 15 ثانية

  /**
   * تسجيل خروج آمن مع دعم PowerSync
   */
  static async performSafeLogout(options: LogoutOptions = {}): Promise<void> {
    if (this.isProcessing) {
      console.warn('[PowerSyncLogout] Already processing logout, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('[PowerSyncLogout] 🚀 Starting safe logout process...');

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      console.warn('[PowerSyncLogout] ⚠️ Logout timeout reached, forcing redirect...');
      this.isProcessing = false;
      const redirectUrl = options.redirectUrl || '/login';
      window.location.href = redirectUrl + '?timeout=1';
    }, this.MAX_TIMEOUT);

    try {
      const {
        redirectUrl = '/login',
        skipNavigation = false,
        showLoading = true,
        clearPowerSync = true
      } = options;

      // 1. إظهار حالة التحميل
      if (showLoading) {
        this.showLoadingState('جاري تسجيل الخروج...');
      }

      // ⚡ 2. تنظيف PowerSync أولاً (الأهم!)
      if (clearPowerSync) {
        await this.cleanupPowerSyncSafely();
      }

      // 3. تنظيف React Query cache
      await this.clearReactQueryCache();

      // 4. تنظيف localStorage & sessionStorage
      this.clearStorageSafely();

      // 5. تنظيف IndexedDB (باستثناء PowerSync - تم تنظيفه بالفعل)
      await this.clearNonPowerSyncIndexedDB();

      // 6. تنظيف Service Workers cache
      await this.clearServiceWorkerCache();

      // 7. تنظيف Application State
      this.clearApplicationState();

      // 8. إرسال إشعارات للمكونات
      this.notifyContextProviders();

      // 9. انتظار قليل للسماح لـ React بالتحديث
      await this.delay(500);

      console.log('[PowerSyncLogout] ✅ Logout cleanup completed successfully');

      // 10. التنقل بشكل آمن
      if (!skipNavigation) {
        this.gentleNavigation(redirectUrl);
      }

    } catch (error: any) {
      console.error('[PowerSyncLogout] ❌ Logout error:', error?.message || error);
      // في حالة الخطأ، انتقل مباشرة
      if (!options.skipNavigation) {
        window.location.href = options.redirectUrl || '/login';
      }
    } finally {
      clearTimeout(safetyTimeout);
      this.isProcessing = false;
    }
  }

  /**
   * ⚡ تنظيف PowerSync بطريقة آمنة
   * يستخدم PowerSync API بدلاً من حذف IndexedDB مباشرة
   */
  private static async cleanupPowerSyncSafely(): Promise<void> {
    try {
      console.log('[PowerSyncLogout] 🔄 Cleaning PowerSync database...');

      if (!powerSyncService || !powerSyncService.isReady()) {
        console.warn('[PowerSyncLogout] ⚠️ PowerSync not initialized, skipping...');
        return;
      }

      // 1. فحص CRUD queue قبل التنظيف
      const pendingChanges = await powerSyncService.getPendingChangesCount();
      if (pendingChanges > 0) {
        console.warn(
          `[PowerSyncLogout] ⚠️ ${pendingChanges} pending changes will be discarded`
        );
        // يمكنك إضافة تأكيد من المستخدم هنا إذا أردت
      }

      // 2. قطع الاتصال وتنظيف قاعدة البيانات بطريقة آمنة
      // هذا يخبر PowerSync أن التنظيف مقصود وليس delete operations
      await powerSyncService.disconnect();

      // 3. تنظيف البيانات المحلية بالكامل
      await powerSyncService.clearAllData();

      console.log('[PowerSyncLogout] ✅ PowerSync cleaned successfully');

    } catch (error: any) {
      console.error('[PowerSyncLogout] ❌ PowerSync cleanup error:', error?.message);

      // Fallback: حذف IndexedDB يدوياً كحل أخير
      console.warn('[PowerSyncLogout] ⚠️ Falling back to manual IndexedDB deletion...');
      await this.deletePowerSyncDatabaseManually();
    }
  }

  /**
   * حذف PowerSync database يدوياً كـ fallback
   */
  private static async deletePowerSyncDatabaseManually(): Promise<void> {
    try {
      if (!('indexedDB' in window)) return;

      // أسماء قواعد البيانات المحتملة لـ PowerSync
      const powerSyncDbNames = [
        'stockiha_powersync_electron.db',
        'stockiha_powersync_webkit.db',
        'stockiha_powersync_v4.db',
        'powersync',
        'powersync-db'
      ];

      // محاولة حذف جميع قواعد البيانات
      for (const dbName of powerSyncDbNames) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve) => {
            deleteRequest.onsuccess = () => {
              console.log(`[PowerSyncLogout] ✅ Deleted ${dbName}`);
              resolve(true);
            };
            deleteRequest.onerror = () => resolve(false);
            deleteRequest.onblocked = () => {
              console.warn(`[PowerSyncLogout] ⚠️ ${dbName} is blocked`);
              resolve(false);
            };
            setTimeout(() => resolve(false), 3000); // timeout
          });
        } catch (e) {
          console.warn(`[PowerSyncLogout] ⚠️ Failed to delete ${dbName}:`, e);
        }
      }

      // أيضاً حذف أي قاعدة بيانات تحتوي على "powersync" في اسمها
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name?.toLowerCase().includes('powersync')) {
            try {
              indexedDB.deleteDatabase(db.name);
              console.log(`[PowerSyncLogout] ✅ Deleted ${db.name}`);
            } catch (e) {
              console.warn(`[PowerSyncLogout] ⚠️ Failed to delete ${db.name}:`, e);
            }
          }
        }
      }

    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Manual PowerSync deletion failed:', error);
    }
  }

  /**
   * تنظيف IndexedDB (باستثناء PowerSync)
   */
  private static async clearNonPowerSyncIndexedDB(): Promise<void> {
    try {
      console.log('[PowerSyncLogout] 🔄 Cleaning non-PowerSync IndexedDB...');

      if (!('indexedDB' in window)) return;

      const dbNames = [
        'bazaar-app-db',
        'supabase-cache',
        'react-query-cache',
        'app-cache',
        'workbox-cache',
        'firebase-messaging',
        'keyval-store'
      ];

      for (const dbName of dbNames) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve) => {
            deleteRequest.onsuccess = () => resolve(true);
            deleteRequest.onerror = () => resolve(false);
            deleteRequest.onblocked = () => resolve(false);
            setTimeout(() => resolve(false), 3000);
          });
        } catch (e) {
          // ignore
        }
      }

      console.log('[PowerSyncLogout] ✅ Non-PowerSync IndexedDB cleaned');
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ IndexedDB cleanup error:', error);
    }
  }

  /**
   * تنظيف React Query cache
   */
  private static async clearReactQueryCache(): Promise<void> {
    try {
      console.log('[PowerSyncLogout] 🔄 Cleaning React Query cache...');

      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        await queryClient.clear();
        queryClient.getQueryCache().clear();
        queryClient.getMutationCache().clear();
      }

      console.log('[PowerSyncLogout] ✅ React Query cache cleaned');
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ React Query cleanup error:', error);
    }
  }

  /**
   * تنظيف localStorage & sessionStorage
   */
  private static clearStorageSafely(): void {
    try {
      console.log('[PowerSyncLogout] 🔄 Cleaning storage...');

      const criticalKeys = [
        'auth_token',
        'refresh_token',
        'user_session',
        'organization_id',
        'bazaar_organization_id',
        'currentOrganizationId',
        'tenant_id',
        'current_user',
        'current_user_profile',
        'current_organization',
        'pos_session',
        'cart_data',
        'bazaar_auth_state',
        'supabase.auth.token'
      ];

      // مسح المفاتيح الحرجة
      criticalKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // مسح أي مفاتيح تحتوي على UUID (معرف المؤسسة)
      const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key);
        if (uuidPattern.test(key) || (value && uuidPattern.test(value))) {
          localStorage.removeItem(key);
        }
      });

      // مسح sessionStorage بالكامل
      sessionStorage.clear();

      console.log('[PowerSyncLogout] ✅ Storage cleaned');
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Storage cleanup error:', error);
    }
  }

  /**
   * تنظيف Service Worker cache
   */
  private static async clearServiceWorkerCache(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Service Worker cleanup error:', error);
    }
  }

  /**
   * تنظيف Application State
   */
  private static clearApplicationState(): void {
    try {
      if (typeof window === 'undefined') return;

      const globalVarsToDelete = [
        'bazaarAppData', 'currentUser', 'currentOrganization', 'authState',
        'tenantData', 'organizationData', 'userProfile', 'appInitData',
        'posData', 'ordersData', 'unifiedData', 'queryClient'
      ];

      globalVarsToDelete.forEach(varName => {
        if ((window as any)[varName]) {
          if (typeof (window as any)[varName]?.clear === 'function') {
            (window as any)[varName].clear();
          }
          delete (window as any)[varName];
        }
      });
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Application state cleanup error:', error);
    }
  }

  /**
   * إشعار Context providers
   */
  private static notifyContextProviders(): void {
    try {
      if (typeof window === 'undefined') return;

      const events = [
        'gentle-logout',
        'auth-reset',
        'clear-user-data',
        'powersync-reset'
      ];

      events.forEach(eventName => {
        try {
          const event = new CustomEvent(eventName, {
            detail: { gentle: true, timestamp: Date.now() }
          });
          window.dispatchEvent(event);
        } catch (e) {
          // ignore
        }
      });
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Context notification error:', error);
    }
  }

  /**
   * إظهار حالة تحميل
   */
  private static showLoadingState(message: string): void {
    try {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
      `;
      overlay.className = 'powersync-logout-overlay';

      overlay.innerHTML = `
        <div style="text-align: center; font-family: Tajawal, Arial, sans-serif; color: #333;">
          <div style="font-size: 32px; margin-bottom: 16px;">🔄</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${message}</div>
          <div style="font-size: 14px; color: #666;">يرجى الانتظار...</div>
        </div>
      `;

      document.body.appendChild(overlay);

      // إزالة بعد timeout
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      }, this.MAX_TIMEOUT);
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Loading state error:', error);
    }
  }

  /**
   * التنقل الآمن
   */
  private static gentleNavigation(url: string): void {
    try {
      console.log(`[PowerSyncLogout] 🚀 Navigating to ${url}...`);

      setTimeout(() => {
        try {
          const isElectron = typeof window !== 'undefined' &&
            window.navigator?.userAgent?.includes('Electron');

          if (isElectron) {
            window.location.hash = `#${url}?cleared=1`;
          } else {
            window.location.href = `${url}?cleared=1`;
          }
        } catch {
          window.location.href = url;
        }
      }, 300);
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Navigation error:', error);
      window.location.href = url;
    }
  }

  /**
   * دالة انتظار
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تنظيف طارئ (للاستخدام في حالات الطوارئ)
   */
  static async emergencyCleanup(): Promise<void> {
    console.warn('[PowerSyncLogout] 🚨 Emergency cleanup initiated!');

    try {
      // 1. قطع اتصال PowerSync فوراً
      if (powerSyncService?.isReady()) {
        await powerSyncService.disconnect();
      }

      // 2. مسح البيانات الحرجة
      const criticalKeys = ['auth_token', 'refresh_token', 'user_session', 'organization_id'];
      criticalKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // 3. إعادة تحميل الصفحة
      const isElectron = typeof window !== 'undefined' &&
        window.navigator?.userAgent?.includes('Electron');

      if (isElectron) {
        window.location.hash = '#/login?emergency=1';
      } else {
        window.location.href = '/login?emergency=1';
      }
    } catch (error) {
      console.error('[PowerSyncLogout] ❌ Emergency cleanup error:', error);
      window.location.reload();
    }
  }
}
