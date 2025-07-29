/**
 * ===================================================================
 * 🧹 COMPLETE LOGOUT CLEANER - تنظيف شامل عند تسجيل الخروج
 * ===================================================================
 * 
 * نظام شامل لتنظيف جميع البيانات المحفوظة في:
 * - localStorage & sessionStorage  
 * - React Query cache
 * - IndexedDB
 * - Service Workers cache
 * - Browser cache والـ cookies
 * - Application State
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * تنظيف شامل لجميع مصادر البيانات المحفوظة
 */
export class CompleteLogoutCleaner {
  
  /**
   * التنظيف النهائي للبيانات المجهولة
   */
  private static async performCompleteCleanup(): Promise<void> {
    try {
      
      // 1. تنظيف React Query Cache
      await this.clearReactQueryCache();
      
      // 2. تنظيف شامل لجميع أنواع التخزين
      this.clearAllStorage();
      
      // 3. تنظيف البيانات المخصصة للمؤسسة
      await this.clearOrganizationSpecificData();
      
      // 4. تنظيف خاص لـ fredstore و القيم المحددة مسبقاً
      await this.clearHardcodedData();
      
      // 5. تنظيف IndexedDB وقواعد البيانات المحلية
      await this.clearIndexedDB();
      
      // 6. تنظيف Service Worker Cache
      await this.clearServiceWorkerCache();
      
      // 7. تنظيف Application State
      await this.clearApplicationState();
      
      // 8. تنظيف Browser Cache (جزئي)
      await this.clearBrowserCache();
      
      // 9. تنظيف React Context states
      this.clearReactContextStates();
      
      // 10. إعادة ضبط URL
      this.resetURL();
      
      // 11. إجبار React على إعادة ضبط المكونات
      await this.forceReactContextReset();

    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 1. تنظيف React Query Cache بالكامل
   */
  private static async clearReactQueryCache(): Promise<void> {
    try {
      
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        
        // 1. إزالة جميع الاستعلامات النشطة
        queryClient.getQueryCache().clear();
        
        // 2. إزالة جميع الـ mutations
        queryClient.getMutationCache().clear();
        
        // 3. مسح شامل لجميع البيانات
        await queryClient.clear();
        
        // 4. إزالة queries محددة مرتبطة بالمؤسسة
        const specificQueries = [
          'app-initialization',
          'pos-complete-data',
          'pos-orders-dashboard',
          'order-details',
          'users',
          'organizations',
          'organization_settings',
          'pos_settings',
          'employees',
          'customers',
          'products',
          'categories',
          'online_orders',
          'repair_orders',
          'abandoned_carts',
          'shared-store-data',
          'dashboard-stats',
          'dashboard-products',
          'pos-essential-data',
          'financial-analytics-optimized'
        ];
        
        for (const queryKey of specificQueries) {
          await queryClient.invalidateQueries({ queryKey: [queryKey] });
          await queryClient.removeQueries({ queryKey: [queryKey] });
        }
        
        // 5. إجبار إعادة تعيين كاملة لـ QueryClient
        queryClient.setQueryData = () => undefined;
        queryClient.setQueriesData = () => undefined;
        
        // 6. إزالة أي observers نشطة
        queryClient.getQueryCache().getAll().forEach(query => {
          query.observers.forEach(observer => {
            observer.destroy();
          });
        });
        
        // 7. إجبار garbage collection
        if (typeof window.gc === 'function') {
          window.gc();
        }
        
      } else {
      }

      // 8. تنظيف UnifiedRequestManager globalCache
      await this.clearUnifiedRequestManagerCache();
      
    } catch (error) {
      // تنظيف سريع كحل بديل
      try {
        if (typeof window !== 'undefined' && (window as any).queryClient) {
          await (window as any).queryClient.clear();
        }
        await this.clearUnifiedRequestManagerCache();
      } catch (fallbackError) {
      }
    }
  }

  /**
   * تنظيف UnifiedRequestManager globalCache
   */
  private static async clearUnifiedRequestManagerCache(): Promise<void> {
    try {
      
      // محاولة تنظيف globalCache مباشرة من unifiedRequestManager
      const unifiedModule = await import('@/lib/unifiedRequestManager');
      if (unifiedModule && unifiedModule.UnifiedRequestManager) {
        // تنظيف cache باستخدام الطرق المتاحة
        unifiedModule.UnifiedRequestManager.clearCache();
      }

      // تنظيف إضافي للمتغيرات العامة المحتملة
      if (typeof window !== 'undefined') {
        // حذف أي متغيرات cache عامة
        const globalCacheKeys = [
          '__UNIFIED_CACHE__',
          '__REQUEST_DEDUPLICATION__',
          '__ACTIVE_REQUESTS__',
          'globalCache',
          'globalRequestDeduplication',
          'globalActiveRequests'
        ];

        globalCacheKeys.forEach(key => {
          if ((window as any)[key]) {
            delete (window as any)[key];
          }
        });
      }
      
    } catch (error) {
    }
  }
  
  /**
   * 2. تنظيف شامل لـ localStorage & sessionStorage
   */
  private static clearAllStorage(): void {
    try {
      // قائمة شاملة بجميع مفاتيح localStorage
      const storageKeys = [
        // Auth & Session  
        'bazaar_auth_state',
        'bazaar_auth_singleton_cache',
        'authSessionExists',
        'authSessionLastUpdated',
        'current_user_profile',
        'current_organization',
        'is_super_admin',
        'super_admin_session',
        'supabase.auth.token',
        'sb-*-auth-token',
        'auth_user_data',
        'user_authenticated',
        
        // Organization & Tenant - جميع المتغيرات
        'bazaar_organization_id',
        'bazaar_current_subdomain',
        'currentOrganizationId',
        'organization_id', // إضافة المفتاح المفقود
        'selected_organization_id',
        'tenant_data',
        'organization_data',
        'bazaar_users',
        
        // Theme & UI
        'theme',
        'theme-preference',
        'bazaar_org_theme',
        'darkMode',
        'sidebarCollapsed',
        'ui-preferences',
        
        // Language & i18n
        'i18nextLng',
        'i18nextLng_timestamp',
        'selectedLanguage',
        'preferred-language',
        'locale',
        
        // App Data & Cache
        'bazaar_app_init_data',
        'BAZAAR_APP_STATE_TIMESTAMP',
        'last_auth_check',
        'last_init_time',
        'app_cache',
        'data_cache',
        
        // Product & Business Data
        'products_cache',
        'categories_cache',
        'inventory_cache',
        'orders_cache',
        'customers_cache',
        'suppliers_cache',
        'reports_cache',
        'dashboard_cache',
        
        // Form & Drafts
        'product-form-progress',
        'order-form-draft',
        'customer-form-draft',
        'form_data',
        
        // POS & Sales
        'pos-cart-data',
        'pos-customer-data',
        'pos-products-cache',
        'pos-settings',
        'flexi-sales-data',
        'sales_data',
        
        // Notifications & Settings
        'notifications_cache',
        'settings_cache',
        'preferences',
        'abandoned_orders_provinces',
        'abandoned_orders_municipalities',
        'abandoned_orders_cache_expiry',
        
        // Performance & Analytics
        'performance_data',
        'analytics_data',
        'error_logs',
        'debug_info',
        
        // Third-party integrations
        'yalidine_data',
        'shipping_data',
        'payment_data',
        'integration_cache'
      ];
      
      // حذف المفاتيح المحددة من localStorage
      storageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          // ignore individual errors
        }
      });
      
      // حذف أي مفاتيح تحتوي على كلمات مفتاحية
      const keywordPatterns = [
        'bazaar',
        'organization',
        'tenant',
        'auth',
        'cache',
        'supabase',
        'pos',
        'product',
        'order',
        'customer',
        'inventory'
      ];
      
      Object.keys(localStorage).forEach(key => {
        const keyLower = key.toLowerCase();
        if (keywordPatterns.some(pattern => keyLower.includes(pattern))) {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            // ignore
          }
        }
      });
      
      // تنظيف sessionStorage بالكامل
      try {
        sessionStorage.clear();
      } catch (error) {
        // ignore
      }
      
    } catch (error) {
    }
  }
  
  /**
   * 3. تنظيف IndexedDB
   */
  private static async clearIndexedDB(): Promise<void> {
    try {
      if (!('indexedDB' in window)) return;
      
      // قائمة بقواعد البيانات المحتملة
      const dbNames = [
        'bazaar-app-db',
        'supabase-cache',
        'react-query-cache',
        'app-cache',
        'workbox-cache',
        'firebase-messaging',
        'keyval-store'
      ];
      
      // حذف قواعد البيانات المحددة
      for (const dbName of dbNames) {
        try {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(true);
            deleteReq.onerror = () => reject(deleteReq.error);
            deleteReq.onblocked = () => {
              resolve(true);
            };
          });
        } catch (error) {
          // ignore individual errors
        }
      }
      
    } catch (error) {
    }
  }
  
  /**
   * 4. تنظيف Service Worker Cache
   */
  private static async clearServiceWorkerCache(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) return;
      
      // إلغاء تسجيل Service Workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      
      // مسح Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
    } catch (error) {
    }
  }
  
  /**
   * 5. تنظيف Browser Cache & Cookies (الطريقة القديمة)
   */
  
  /**
   * 6. تنظيف Browser Cache & Cookies
   */
  private static async clearBrowserCache(): Promise<void> {
    try {
      // مسح الـ cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });
      
    } catch (error) {
    }
  }
  
  /**
   * 7. إعادة ضبط URL
   */
  private static resetURL(): void {
    try {
      // إزالة أي query parameters أو hash
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      
      // التنقل للصفحة الرئيسية بدون history
      window.history.replaceState(null, '', baseUrl);
      
    } catch (error) {
    }
  }
  
  /**
   * تنظيف سريع للبيانات الحساسة فقط
   */
  static quickCleanup(): void {
    const sensitiveKeys = [
      'bazaar_auth_state',
      'current_user_profile', 
      'current_organization',
      'bazaar_organization_id',
      'authSessionExists'
    ];
    
    sensitiveKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        // ignore
      }
    });
    
    // مسح cookies الحساسة
    const sensitiveCookies = ['auth-token', 'session-id', 'user-id'];
    sensitiveCookies.forEach(name => {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  }

  /**
   * 6. تنظيف Application State والمتغيرات العامة
   */
  private static async clearApplicationState(): Promise<void> {
    try {
      
      if (typeof window !== 'undefined') {
        // تنظيف المتغيرات العامة الأساسية
        const globalVarsToDelete = [
          'bazaarAppData', 'currentUser', 'currentOrganization', 'authState',
          'tenantData', 'organizationData', 'userProfile', 'appInitData',
          'posData', 'ordersData', 'unifiedData',
          // تنظيف Cache Controllers
          'requestController', 'cacheController', 'performanceAnalytics',
          'globalRequestDeduplicator', '__REACT_QUERY_CACHE__', '__QUERY_CLIENT__'
        ];
        
        globalVarsToDelete.forEach(varName => {
          try {
            if ((window as any)[varName]) {
              if (typeof (window as any)[varName] === 'object' && (window as any)[varName].clear) {
                (window as any)[varName].clear();
              }
              delete (window as any)[varName];
            }
          } catch (e) {
            // ignore individual cleanup errors
          }
        });
        
        // تنظيف Event Listeners المخصصة
        const customEvents = [
          'auth-state-change', 'organization-change', 'tenant-change',
          'data-update', 'cache-invalidate', 'user-logout', 'pos-data-change'
        ];
        
        customEvents.forEach(eventName => {
          try {
            const existingListeners = (window as any)[`_${eventName}_listeners`];
            if (existingListeners && Array.isArray(existingListeners)) {
              existingListeners.forEach((listener: EventListener) => {
                window.removeEventListener(eventName, listener);
              });
              delete (window as any)[`_${eventName}_listeners`];
            }
            
            // إزالة المستمعين المباشرين
            window.removeEventListener(eventName as any, () => {});
          } catch (e) {
            // ignore event cleanup errors
          }
        });
        
        // تنظيف React DevTools data
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        
        // تنظيف أي مخزن state إضافي
        ['zustand', 'jotai', 'valtio', 'redux'].forEach(stateLib => {
          if ((window as any)[stateLib]) {
            try {
              if (typeof (window as any)[stateLib].destroy === 'function') {
                (window as any)[stateLib].destroy();
              }
              delete (window as any)[stateLib];
            } catch (e) {
              // ignore state library cleanup errors
            }
          }
        });
        
        // إجبار garbage collection إذا كان متاحاً
        if (typeof window.gc === 'function') {
          window.gc();
        }
      }
      
    } catch (error) {
    }
  }

  // إضافة دالة تنظيف إضافية للمفاتيح التي تحتوي على معرف المؤسسة القديم
  private static async clearOrganizationSpecificData(): Promise<void> {
    try {
      
      // قائمة شاملة بجميع مفاتيح localStorage التي يجب مسحها
      const organizationKeys = [
        // Organization IDs - جميع المتغيرات المحتملة
        'bazaar_organization_id',
        'organization_id',
        'currentOrganizationId', 
        'selected_organization_id',
        'current_organization',
        'organization_data',
        'tenant_data',
        
        // User & Profile data
        'current_user_profile',
        'auth_user_data',
        'bazaar_users',
        
        // Theme & Settings data with org ID
        'bazaar_org_theme',
        'theme-preference',
        
        // App & Cache data
        'bazaar_app_init_data',
        'app_cache',
        'data_cache',
        
        // Subdomain & Domain data
        'bazaar_current_subdomain',
        
        // Language settings per org
        'i18nextLng',
        'selectedLanguage',
        'preferred-language'
      ];

      // مسح المفاتيح المحددة من localStorage
      organizationKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });

      // مسح المفاتيح المحددة من sessionStorage
      organizationKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
        }
      });
      
      // تنظيف localStorage keys التي تحتوي على معرف المؤسسة أو أنماط مخصصة
      const keysToCheck = Object.keys(localStorage);
      
      keysToCheck.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && typeof value === 'string') {
            // البحث عن أي معرف مؤسسة في القيمة (UUID format)
            const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
            const matches = value.match(uuidRegex);
            
            // البحث عن أنماط مخصصة للمؤسسة
            const orgPatterns = [
              /org[_-]?cache/i,
              /organization[_-]?/i,
              /tenant[_-]?/i,
              /product[_-]?draft/i,
              /settings[_-]?cache/i,
              /subscription[_-]?cache/i,
              /language[_-]?update/i,
              /org[_-]?language/i,
              /org[_-]?theme/i,
              /domain[_-]?/i,
              /unified[_-]?/i,
              /pos[_-]?/i,
              /dashboard[_-]?/i
            ];
            
            const hasOrgPattern = orgPatterns.some(pattern => pattern.test(key) || (value && pattern.test(value)));
            
            if (matches || hasOrgPattern) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // ignore parsing errors
        }
      });
      
      // تنظيف sessionStorage بنفس الطريقة
      const sessionKeys = Object.keys(sessionStorage);
      
      sessionKeys.forEach(key => {
        try {
          const value = sessionStorage.getItem(key);
          if (value && typeof value === 'string') {
            const uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
            const matches = value.match(uuidRegex);
            
            const orgPatterns = [
              /org[_-]?cache/i,
              /organization[_-]?/i,
              /tenant[_-]?/i,
              /settings[_-]?cache/i,
              /pixel[_-]?settings/i,
              /wilaya[_-]?cache/i,
              /subdomain/i
            ];
            
            const hasOrgPattern = orgPatterns.some(pattern => pattern.test(key) || (value && pattern.test(value)));
            
            if (matches || hasOrgPattern) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (e) {
          // ignore parsing errors
        }
      });
      
      // تنظيف إضافي للمفاتيح المحددة التي قد تحتوي على معرف المؤسسة
      const specificKeysToCheck = [
        'react-query-cache',
        'query-cache',
        'pos-cache',
        'dashboard-cache',
        'user-cache',
        'org-cache',
        'tenant-cache',
        'store-data',
        'shared-store-data',
        'subscription_cache',
        'organization:',
        'domain:',
        'product-form-draft',
        'settings_cache'
      ];
      
      specificKeysToCheck.forEach(keyPattern => {
        keysToCheck.concat(sessionKeys).forEach(key => {
          if (key.includes(keyPattern)) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          }
        });
      });
      
    } catch (error) {
    }
  }

  /**
   * إجبار React على إعادة ضبط جميع Context وState
   */
  private static forceReactContextReset(): void {
    try {
      
      if (typeof window !== 'undefined') {
        // 1. إجبار تنظيف Context states مباشرة
        const reactContextsToReset = [
          '__REACT_CONTEXT_AUTH__',
          '__REACT_CONTEXT_TENANT__', 
          '__REACT_CONTEXT_USER__',
          '__REACT_CONTEXT_UNIFIED__',
          '__REACT_CONTEXT_SHOP__'
        ];
        
        reactContextsToReset.forEach(context => {
          delete (window as any)[context];
        });
        
        // 2. إجبار React على unmount جميع المكونات
        const reactRootElement = document.getElementById('root');
        if (reactRootElement) {
          // إنشاء مكون تحميل مؤقت
          const loadingDiv = document.createElement('div');
          loadingDiv.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Tajawal;"><div style="text-align: center;"><div style="margin-bottom: 10px;">🔄</div><div>جاري تنظيف البيانات...</div></div></div>';
          
          // استبدال المحتوى مؤقتاً
          const originalContent = reactRootElement.innerHTML;
          reactRootElement.innerHTML = '';
          reactRootElement.appendChild(loadingDiv);
          
          // إعادة التحميل بعد delay أطول لضمان التنظيف الكامل
          setTimeout(() => {
            window.location.href = '/login?cleared=1';
          }, 2000);
        } else {
          // إذا لم نجد root element، أعد التحميل مباشرة
          window.location.href = '/login?cleared=1';
        }
        
        // 3. إجبار garbage collection إذا كان متاحاً
        if ('gc' in window && typeof (window as any).gc === 'function') {
          try {
            (window as any).gc();
          } catch (e) {
            // تجاهل الأخطاء
          }
        }
        
        // 4. مسح جميع timers و intervals المحتملة
        const highestTimeoutId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < Number(highestTimeoutId); i++) {
          clearTimeout(i);
          clearInterval(i);
        }
        
      }
    } catch (error) {
      // إعادة تحميل الصفحة كـ fallback
      window.location.href = '/login?cleared=1&fallback=1';
    }
  }

  /**
   * تنظيف React Context states مباشرة
   */
  private static clearReactContextStates(): void {
    try {
      
      if (typeof window !== 'undefined') {
        // إرسال أحداث مخصصة لإجبار Context على إعادة التعيين
        const resetEvents = [
          'auth-context-reset',
          'tenant-context-reset', 
          'user-context-reset',
          'unified-context-reset',
          'shop-context-reset',
          'complete-logout'
        ];
        
        resetEvents.forEach(eventName => {
          try {
            const event = new CustomEvent(eventName, { 
              detail: { 
                forced: true, 
                timestamp: Date.now(),
                reason: 'complete-logout'
              } 
            });
            window.dispatchEvent(event);
          } catch (e) {
            // تجاهل أخطاء الأحداث
          }
        });
        
        // تنظيف إضافي لجميع المصادر المحتملة للبيانات
        const additionalCaches = [
          'profileCache',
          'userCache', 
          'organizationCache',
          'tenantCache',
          'posCache',
          'storeCache',
          'requestCache',
          'apiCache',
          'supabaseCache',
          'queryCache'
        ];

        additionalCaches.forEach(cacheKey => {
          if ((window as any)[cacheKey]) {
            // إذا كان Cache object مع clear method
            if (typeof (window as any)[cacheKey].clear === 'function') {
              (window as any)[cacheKey].clear();
            }
            // إذا كان Map object
            else if (typeof (window as any)[cacheKey].clear === 'function') {
              (window as any)[cacheKey].clear();
            }
            // إذا كان object عادي
            else if (typeof (window as any)[cacheKey] === 'object') {
              Object.keys((window as any)[cacheKey]).forEach(key => {
                delete (window as any)[cacheKey][key];
              });
            }
          }
        });

        // تنظيف أي modules مستوردة قد تحتفظ بالبيانات
        const moduleKeysToReset = [
          '__MODULE_CACHE__',
          '__API_MODULES__',
          '__CONTEXT_MODULES__',
          '__HOOK_MODULES__'
        ];

        moduleKeysToReset.forEach(moduleKey => {
          if ((window as any)[moduleKey]) {
            delete (window as any)[moduleKey];
          }
        });
        
        // إجبار React على إعادة تعيين الـ state
        if ((window as any).React && (window as any).React.__currentDispatcher) {
          try {
            delete (window as any).React.__currentDispatcher;
          } catch (e) {
            // تجاهل الأخطاء
          }
        }
        
      }
    } catch (error) {
    }
  }

  /**
   * تنظيف خاص للبيانات المحددة مسبقاً مثل fredstore
   */
  private static async clearHardcodedData(): Promise<void> {
    try {
      
      // حذف أي بقايا من fredstore
      const fredstoreKeys = [
        'org-subdomain-fredstore',
        'fredstore_data',
        'fredstore_cache',
        'fredstore_settings',
        'fredstore_products',
        'fredstore_categories'
      ];
      
      fredstoreKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // تنظيف window.organizationCache من بيانات fredstore
      if (typeof window !== 'undefined' && (window as any).organizationCache) {
        const cache = (window as any).organizationCache;
        for (const [key, value] of cache.entries()) {
          if (key.includes('fredstore') || 
              (value && value.data && 
               (value.data.subdomain === 'fredstore' || 
                value.data.name?.toLowerCase().includes('fred')))) {
            cache.delete(key);
          }
        }
      }
      
      // تنظيف queryClient من بيانات fredstore  
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        const queryCache = queryClient.getQueryCache();
        
        queryCache.getAll().forEach((query: any) => {
          if (query.queryKey && query.queryKey.some((key: any) => 
            typeof key === 'string' && key.includes('fredstore'))) {
            queryClient.removeQueries(query.queryKey);
          }
        });
      }

    } catch (error) {
    }
  }
}
