// ===================================================================
// مسح شامل لجميع أنواع التخزين المؤقت - تشغيل في console المتصفح
// ===================================================================

// 1. مسح localStorage
const clearLocalStorage = () => {
  let deletedCount = 0;
  const keysToDelete = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('shipping_fee') ||
      key.includes('calculate_shipping') ||
      key.includes('yalidine') ||
      key.includes('cache') ||
      key.includes('BAZAAR_REACT_QUERY_CACHE') ||
      key.includes('bazaar-query-cache')
    )) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
    deletedCount++;
  });
  
  return deletedCount;
};

// 2. مسح sessionStorage
const clearSessionStorage = () => {
  let deletedCount = 0;
  const keysToDelete = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('shipping_fee') ||
      key.includes('calculate_shipping') ||
      key.includes('yalidine') ||
      key.includes('cache')
    )) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    sessionStorage.removeItem(key);
    deletedCount++;
  });
  
  return deletedCount;
};

// 3. مسح IndexedDB (هذا هو المهم!)
const clearIndexedDB = async () => {
  
  try {
    // الحصول على جميع قواعد البيانات
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const databases = await indexedDB.databases();
      
      // مسح قواعد البيانات المتعلقة بالتخزين المؤقت
      for (const db of databases) {
        if (db.name && (
          db.name.includes('cache') ||
          db.name.includes('shipping') ||
          db.name.includes('bazaar') ||
          db.name.includes('query')
        )) {
          try {
            const deleteReq = indexedDB.deleteDatabase(db.name);
            await new Promise((resolve, reject) => {
              deleteReq.onsuccess = () => {
                resolve();
              };
              deleteReq.onerror = () => {
                reject(deleteReq.error);
              };
              deleteReq.onblocked = () => {
                resolve(); // لا نريد إيقاف العملية
              };
            });
          } catch (error) {
          }
        }
      }
    } else {
    }
    
    // محاولة مسح قواعد البيانات المعروفة
    const knownDBNames = [
      'keyval-store',
      'localforage',
      'cache-storage',
      'bazaar-cache',
      'react-query-cache'
    ];
    
    for (const dbName of knownDBNames) {
      try {
        const deleteReq = indexedDB.deleteDatabase(dbName);
        await new Promise((resolve) => {
          deleteReq.onsuccess = () => {
            resolve();
          };
          deleteReq.onerror = () => {
            resolve();
          };
          deleteReq.onblocked = () => {
            resolve();
          };
        });
      } catch (error) {
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
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
      
    } catch (error) {
    }
  } else {
  }
};

// 5. مسح React Query Cache
const clearReactQueryCache = () => {
  
  try {
    // محاولة الوصول لـ React Query Client
    if (window.__REACT_QUERY_GLOBAL_CLIENT) {
      window.__REACT_QUERY_GLOBAL_CLIENT.clear();
    } else {
    }
  } catch (error) {
  }
};

// 6. مسح أي متغيرات عامة متعلقة بالتخزين المؤقت
const clearGlobalVariables = () => {
  
  const variablesToClear = [
    'cachedShippingFees',
    'shippingCache',
    'yalidineCache',
    'calculateShippingCache'
  ];
  
  variablesToClear.forEach(varName => {
    if (window[varName]) {
      delete window[varName];
    }
  });
  
};

// 7. إجبار تحديث الصفحة مع تجاهل التخزين المؤقت
const forceRefresh = () => {
  
  // محاولة مسح Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
  
  // إعادة تحميل الصفحة مع تجاهل التخزين المؤقت
  setTimeout(() => {
    window.location.reload(true); // إعادة تحميل قوية
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

// تشغيل المسح الشامل
clearEverything();
