// 🧹 تنظيف شامل لجميع أنواع الكاش - محسن ومبسط
// تشغيل هذا الملف لحل مشكلة ارتفاع كاش المتصفح

// 1. مسح LocalStorage بالكامل
const clearLocalStorage = () => {
  let count = 0;
  try {
    const keys = Object.keys(localStorage);
    count = keys.length;
    localStorage.clear();
  } catch (error) {
  }
  return count;
};

// 2. مسح SessionStorage بالكامل
const clearSessionStorage = () => {
  let count = 0;
  try {
    const keys = Object.keys(sessionStorage);
    count = keys.length;
    sessionStorage.clear();
  } catch (error) {
  }
  return count;
};

// 3. مسح IndexedDB - محسن
const clearIndexedDB = async () => {
  
  try {
    // الحصول على جميع قواعد البيانات الموجودة
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const databases = await indexedDB.databases();
      
      // مسح جميع قواعد البيانات
      for (const db of databases) {
        if (db.name) {
          try {
            await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name);
              deleteReq.onsuccess = () => {
                resolve();
              };
              deleteReq.onerror = () => reject(deleteReq.error);
              deleteReq.onblocked = () => {
                resolve(); // لا نريد إيقاف العملية
              };
            });
          } catch (error) {
          }
        }
      }
    }
    
    // مسح قواعد البيانات المعروفة كاحتياط
    const knownDBNames = [
      'keyval-store',
      'localforage',
      'cache-storage',
      'bazaar-cache',
      'bazaar-query-cache',
      'react-query-cache',
      'supabase-cache',
      'store-cache',
      'auth-cache'
    ];
    
    for (const dbName of knownDBNames) {
      try {
        await new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => resolve();
          deleteReq.onblocked = () => resolve();
        });
      } catch (error) {
        // تجاهل الأخطاء
      }
    }

  } catch (error) {
  }
};

// 4. مسح Cache API
const clearCacheAPI = async () => {
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          const deleted = await caches.delete(cacheName);
        })
      );
      
    } catch (error) {
    }
  } else {
  }
};

// 5. مسح React Query Cache
const clearReactQueryCache = () => {
  
  try {
    // محاولة الوصول إلى queryClient إذا كان متاحاً
    if (window.queryClient) {
      window.queryClient.clear();
    } else {
    }
  } catch (error) {
  }
};

// 6. مسح متغيرات الذاكرة العامة
const clearGlobalVariables = () => {
  
  try {
    // قائمة المتغيرات المحتملة
    const globalVars = [
      '__REACT_QUERY_STATE__',
      '__CACHE_DATA__',
      '__SUPABASE_CACHE__',
      '__STORE_CACHE__',
      'cacheManager',
      'storeCache'
    ];
    
    let cleared = 0;
    globalVars.forEach(varName => {
      if (window[varName]) {
        delete window[varName];
        cleared++;
      }
    });
    
  } catch (error) {
  }
};

// 7. إعادة تحميل الصفحة
const forceRefresh = () => {
  
  setTimeout(() => {
    // محاولة إعادة تحميل قوية
    if (window.location.reload) {
      window.location.reload(true); // إعادة تحميل من الخادم
    } else {
      window.location.href = window.location.href;
    }
  }, 2000);
};

// تشغيل جميع عمليات المسح
const clearEverything = async () => {
  
  const localStorageCount = clearLocalStorage();
  const sessionStorageCount = clearSessionStorage();
  
  await clearIndexedDB();
  await clearCacheAPI();
  clearReactQueryCache();
  clearGlobalVariables();

  forceRefresh();
};

// بدء التنظيف
clearEverything().catch(error => {
  forceRefresh();
});
