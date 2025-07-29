/**
 * نظام تسجيل خروج لطيف وآمن
 * يتجنب أخطاء DOM والتلاعب العنيف بـ React
 */

export interface LogoutOptions {
  redirectUrl?: string;
  skipNavigation?: boolean;
  showLoading?: boolean;
  clearCache?: boolean;
}

export class GentleLogoutCleaner {
  private static isProcessing = false;
  private static readonly MAX_TIMEOUT = 10000; // 10 ثواني كحد أقصى

  /**
   * تسجيل خروج لطيف وآمن
   */
  static async performGentleLogout(options: LogoutOptions = {}): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // إضافة timeout أمان لمنع التعليق
    const safetyTimeout = setTimeout(() => {
      this.isProcessing = false;
      const redirectUrl = options.redirectUrl || '/login';
      window.location.href = redirectUrl + '?timeout=1';
    }, this.MAX_TIMEOUT);

    try {
      const {
        redirectUrl = '/login',
        skipNavigation = false,
        showLoading = true,
        clearCache = true
      } = options;

      // 1. إظهار حالة التحميل إذا طُلب ذلك
      if (showLoading) {
        this.showGentleLoadingState();
      }

      // 2. تنظيف البيانات بطريقة آمنة
      if (clearCache) {
        await this.gentleClearData();
      }

      // 3. إشعار Context providers بشكل لطيف
      this.notifyContextProviders();

      // 4. انتظار قليل للسماح لـ React بالتحديث
      await this.delay(500);

      // 5. التنقل بشكل آمن
      if (!skipNavigation) {
        this.gentleNavigation(redirectUrl);
      } else {
        // إذا لم نقم بالتنقل، فقط انتظر قليلاً ثم نظف
        await this.delay(1000);
      }

    } catch (error) {
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
   * إظهار حالة تحميل لطيفة
   */
  private static showGentleLoadingState(): void {
    try {
      // البحث عن عنصر لإظهار حالة التحميل
      const loadingContainer = document.querySelector('[data-loading-container]') ||
                               document.querySelector('.loading-overlay') ||
                               document.body;

      if (loadingContainer) {
        // إنشاء overlay لطيف
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          backdrop-filter: blur(2px);
          transition: opacity 0.3s ease-in-out;
        `;
        overlay.className = 'gentle-logout-overlay';

        const content = document.createElement('div');
        content.style.cssText = `
          text-align: center;
          font-family: Tajawal, Arial, sans-serif;
          color: #333;
        `;
        content.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
          <div style="font-size: 16px; font-weight: 500;">جاري تسجيل الخروج...</div>
          <div style="font-size: 14px; color: #666; margin-top: 5px;">يرجى الانتظار</div>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // إزالة الـ overlay بعد timeout أمان
        setTimeout(() => {
          if (overlay && overlay.parentNode) {
            overlay.remove();
          }
        }, this.MAX_TIMEOUT);
      }
    } catch (error) {
    }
  }

  /**
   * تنظيف البيانات بطريقة آمنة
   */
  private static async gentleClearData(): Promise<void> {

    try {
      // 1. تنظيف localStorage & sessionStorage
      await this.clearStorageGently();

      // 2. تنظيف React Query cache
      await this.clearReactQueryGently();

      // 3. تنظيف IndexedDB
      await this.clearIndexedDBGently();

      // 4. تنظيف بيانات المؤسسة
      await this.clearOrganizationDataGently();

    } catch (error) {
    }
  }

  /**
   * تنظيف localStorage & sessionStorage بطريقة آمنة
   */
  private static async clearStorageGently(): Promise<void> {
    try {
      const criticalKeys = [
        'auth_token',
        'refresh_token',
        'user_session',
        'organization_id',
        'tenant_id',
        'current_user',
        'pos_session',
        'cart_data'
      ];

      // تنظيف المفاتيح الحرجة أولاً
      criticalKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // تنظيف البيانات التي تحتوي على UUIDs
      const allKeys = Object.keys(localStorage);
      const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
      
      allKeys.forEach(key => {
        if (uuidPattern.test(key) || 
            key.includes('org_') || 
            key.includes('tenant_') ||
            key.includes('user_')) {
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
    }
  }

  /**
   * تنظيف React Query cache بطريقة آمنة
   */
  private static async clearReactQueryGently(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        
        if (queryClient && typeof queryClient.clear === 'function') {
          await queryClient.clear();
        }
        
        if (queryClient && typeof queryClient.invalidateQueries === 'function') {
          await queryClient.invalidateQueries();
        }
      }
    } catch (error) {
    }
  }

  /**
   * تنظيف IndexedDB بطريقة آمنة
   */
  private static async clearIndexedDBGently(): Promise<void> {
    try {
      if ('indexedDB' in window) {
        const databases = ['app_cache', 'user_data', 'org_cache', 'pos_data'];
        
        for (const dbName of databases) {
          try {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            await new Promise((resolve) => {
              deleteRequest.onsuccess = () => resolve(true);
              deleteRequest.onerror = () => resolve(false);
              setTimeout(() => resolve(false), 3000); // timeout بعد 3 ثواني
            });
          } catch (e) {
            // تجاهل أخطاء قواعد البيانات غير الموجودة
          }
        }
        
      }
    } catch (error) {
    }
  }

  /**
   * تنظيف بيانات المؤسسة بطريقة آمنة
   */
  private static async clearOrganizationDataGently(): Promise<void> {
    try {
      // مسح بيانات المؤسسة من window object
      const orgKeys = [
        'organizationCache',
        'tenantCache',
        'userCache',
        'currentOrganization',
        'orgTheme'
      ];

      orgKeys.forEach(key => {
        if ((window as any)[key]) {
          if (typeof (window as any)[key].clear === 'function') {
            (window as any)[key].clear();
          } else {
            delete (window as any)[key];
          }
        }
      });

    } catch (error) {
    }
  }

  /**
   * إشعار Context providers بشكل لطيف
   */
  private static notifyContextProviders(): void {
    try {

      const events = [
        'gentle-logout',
        'auth-reset',
        'clear-user-data'
      ];

      events.forEach(eventName => {
        try {
          const event = new CustomEvent(eventName, {
            detail: {
              gentle: true,
              timestamp: Date.now()
            }
          });
          window.dispatchEvent(event);
        } catch (e) {
          // تجاهل أخطاء الأحداث
        }
      });

    } catch (error) {
    }
  }

  /**
   * التنقل بشكل آمن
   */
  private static gentleNavigation(url: string): void {
    try {

      // محاولة استخدام React Router أولاً إذا كان متاحاً
      if (typeof window !== 'undefined' && (window as any).navigate) {
        try {
          (window as any).navigate(url);
          return;
        } catch (e) {
          // إذا فشل React Router، استخدم window.location
        }
      }

      // استخدام window.location.href كـ fallback
      setTimeout(() => {
        window.location.href = url;
      }, 200);

    } catch (error) {
      // إجبار التنقل في حالة الخطأ
      window.location.href = url;
    }
  }

  /**
   * دالة انتظار مساعدة
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تنظيف سريع للحالات الطارئة
   */
  static emergencyCleanup(): void {
    try {
      
      // مسح البيانات الحرجة فقط
      const criticalKeys = [
        'auth_token',
        'refresh_token', 
        'user_session',
        'organization_id'
      ];

      criticalKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // الانتقال فوراً
      window.location.href = '/login?emergency=1';
    } catch (error) {
      // إجبار إعادة تحميل الصفحة كآخر حل
      window.location.reload();
    }
  }
}
