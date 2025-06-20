// =================================================================
// 🔧 CACHE DEBUGGER & PROBLEM SOLVER - أداة تشخيص وحل مشاكل Cache
// =================================================================

/**
 * أداة تشخيص شاملة لمشاكل cache وحلها فوراً
 */
export class CacheDebugger {
  
  /**
   * تشخيص شامل لجميع أنواع cache الموجودة
   */
  static async diagnoseAllCaches(organizationId: string) {
    
    const diagnosis = {
      storeCache: await this.diagnoseStoreCache(organizationId),
      unifiedCache: this.diagnoseUnifiedCache(organizationId),
      centralRequestManager: await this.diagnoseCentralRequestManager(organizationId),
      localStorage: this.diagnoseLocalStorage(organizationId),
      sessionStorage: this.diagnoseSessionStorage(organizationId),
      reactQuery: this.diagnoseReactQuery()
    };
    
    return diagnosis;
  }

  /**
   * فحص storeCache
   */
  private static async diagnoseStoreCache(organizationId: string) {
    const keys = [
      `categories:${organizationId}`,
      `products:${organizationId}`,
      `org:${organizationId}`,
      `settings:${organizationId}`,
      `components:${organizationId}`
    ];
    
    const results: Record<string, any> = {};
    
    if (typeof window !== 'undefined' && (window as any).getCacheData) {
      for (const key of keys) {
        try {
          const data = await (window as any).getCacheData(key);
          results[key] = data ? 'موجود' : 'غير موجود';
          if (data) {
          }
        } catch (error) {
          results[key] = `خطأ: ${error}`;
        }
      }
    }
    
    return results;
  }

  /**
   * فحص UnifiedRequestManager globalCache
   */
  private static diagnoseUnifiedCache(organizationId: string) {
    const results: Record<string, any> = {};
    
    if (typeof window !== 'undefined' && (window as any).getUnifiedCacheStats) {
      const stats = (window as any).getUnifiedCacheStats();
      
      const relevantKeys = stats.keys.filter((key: string) => key.includes(organizationId));
      
      results.totalKeys = stats.size;
      results.organizationKeys = relevantKeys;
      results.activeRequests = stats.activeRequests;
      
    }
    
    return results;
  }

  /**
   * فحص centralRequestManager
   */
  private static async diagnoseCentralRequestManager(organizationId: string) {
    const results: Record<string, any> = {};
    
    if (typeof window !== 'undefined' && (window as any).centralRequestManager) {
      // محاولة الحصول على معلومات cache
      results.exists = true;
      results.note = 'centralRequestManager موجود - قد يحتوي على cache داخلي';
    } else {
      results.exists = false;
    }
    
    return results;
  }

  /**
   * فحص localStorage
   */
  private static diagnoseLocalStorage(organizationId: string) {
    const results: Record<string, any> = {};
    
    try {
      const keys = Object.keys(localStorage);
      const relevantKeys = keys.filter(key => 
        key.includes(organizationId) || 
        key.includes('categories') || 
        key.includes('cache_')
      );
      
      results.totalKeys = keys.length;
      results.relevantKeys = relevantKeys;
      
      relevantKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          results[key] = value ? 'موجود' : 'فارغ';
        } catch (error) {
          results[key] = `خطأ: ${error}`;
        }
      });
      
    } catch (error) {
      results.error = `خطأ في الوصول للـ localStorage: ${error}`;
    }
    
    return results;
  }

  /**
   * فحص sessionStorage
   */
  private static diagnoseSessionStorage(organizationId: string) {
    const results: Record<string, any> = {};
    
    try {
      const keys = Object.keys(sessionStorage);
      const relevantKeys = keys.filter(key => 
        key.includes(organizationId) || 
        key.includes('categories') || 
        key.includes('cache_')
      );
      
      results.totalKeys = keys.length;
      results.relevantKeys = relevantKeys;
      
    } catch (error) {
      results.error = `خطأ في الوصول للـ sessionStorage: ${error}`;
    }
    
    return results;
  }

  /**
   * فحص React Query
   */
  private static diagnoseReactQuery() {
    const results: Record<string, any> = {};
    
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      const queryClient = (window as any).queryClient;
      
      try {
        const cache = queryClient.getQueryCache();
        results.totalQueries = cache.getAll().length;
        
        const categoryQueries = cache.getAll().filter((query: any) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some((k: string) => 
            typeof k === 'string' && (
              k.includes('categories') || 
              k.includes('product-categories') ||
              k.includes('unified_categories')
            )
          );
        });
        
        results.categoryQueries = categoryQueries.length;
        results.categoryQueryKeys = categoryQueries.map((q: any) => q.queryKey);
        
      } catch (error) {
        results.error = `خطأ في فحص React Query: ${error}`;
      }
    }
    
    return results;
  }

  /**
   * 🧹 حل شامل وفوري - مسح جميع أنواع cache 
   */
  static async emergencyFix(organizationId: string) {
    
    const results = {
      storeCache: false,
      unifiedCache: false,
      centralRequestManager: false,
      localStorage: false,
      sessionStorage: false,
      reactQuery: false
    };

    try {
      // 1. مسح storeCache
      if (typeof window !== 'undefined' && (window as any).forceInvalidateAllCache) {
        await (window as any).forceInvalidateAllCache('categories', organizationId, {});
        results.storeCache = true;
      }

      // 2. مسح UnifiedRequestManager globalCache
      if (typeof window !== 'undefined' && (window as any).clearOrganizationUnifiedCache) {
        (window as any).clearOrganizationUnifiedCache(organizationId);
        results.unifiedCache = true;
      }

      // 3. مسح centralRequestManager
      if (typeof window !== 'undefined' && (window as any).centralRequestManager) {
        await (window as any).centralRequestManager.clearOrganizationCache(organizationId);
        results.centralRequestManager = true;
      }

      // 4. مسح localStorage
      try {
        const keys = Object.keys(localStorage);
        const keysToRemove = keys.filter(key => 
          key.includes(organizationId) || 
          key.includes('categories') || 
          key.includes('cache_')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        results.localStorage = true;
      } catch (error) {
      }

      // 5. مسح sessionStorage
      try {
        const keys = Object.keys(sessionStorage);
        const keysToRemove = keys.filter(key => 
          key.includes(organizationId) || 
          key.includes('categories') || 
          key.includes('cache_')
        );
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        results.sessionStorage = true;
      } catch (error) {
      }

      // 6. مسح React Query بالقوة
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        
        // مسح جميع الاستعلامات المرتبطة بالفئات
        await queryClient.invalidateQueries({ 
          predicate: (query: any) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some((k: string) => 
              typeof k === 'string' && (
                k.includes('categories') || 
                k.includes('product-categories') ||
                k.includes('unified_categories')
              )
            );
          }
        });
        
        // مسح cache كاملاً
        queryClient.getQueryCache().clear();
        
        results.reactQuery = true;
      }

      // إعادة تحميل الصفحة للتأكد
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
    }

    return results;
  }
}

// =================================================================
// 🎯 إضافة دوال window للاستخدام المباشر
// =================================================================

if (typeof window !== 'undefined') {
  // أداة التشخيص
  (window as any).diagnoseCacheIssue = (organizationId: string) => {
    return CacheDebugger.diagnoseAllCaches(organizationId);
  };
  
  // الحل الطارئ
  (window as any).emergencyFixCache = (organizationId: string) => {
    return CacheDebugger.emergencyFix(organizationId);
  };
  
  // اختبار سريع
  (window as any).quickCacheTest = async () => {
    const orgId = '560e2c06-d13c-4853-abcf-d41f017469cf'; // معرف المؤسسة من logs المستخدم

    // تشخيص
    const diagnosis = await CacheDebugger.diagnoseAllCaches(orgId);
    
    // حل طارئ
    const results = await CacheDebugger.emergencyFix(orgId);
    
    return { diagnosis, fixResults: results };
  };
}

export default CacheDebugger;
