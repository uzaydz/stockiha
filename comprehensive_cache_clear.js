// 🧹 تنظيف شامل لجميع أنواع الكاش - محسن ومبسط
// تشغيل هذا الملف لحل مشكلة ارتفاع كاش المتصفح

console.log('🧹 بدء تنظيف شامل للكاش...');

// 1. مسح LocalStorage بالكامل
const clearLocalStorage = () => {
  let count = 0;
  try {
    const keys = Object.keys(localStorage);
    count = keys.length;
    localStorage.clear();
    console.log(`✅ تم مسح ${count} عنصر من localStorage`);
  } catch (error) {
    console.error('❌ خطأ في مسح localStorage:', error);
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
    console.log(`✅ تم مسح ${count} عنصر من sessionStorage`);
  } catch (error) {
    console.error('❌ خطأ في مسح sessionStorage:', error);
  }
  return count;
};

// 3. مسح IndexedDB - محسن
const clearIndexedDB = async () => {
  console.log('🗄️ بدء مسح IndexedDB...');
  
  try {
    // الحصول على جميع قواعد البيانات الموجودة
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const databases = await indexedDB.databases();
      console.log(`📊 وجدت ${databases.length} قاعدة بيانات`);
      
      // مسح جميع قواعد البيانات
      for (const db of databases) {
        if (db.name) {
          try {
            await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name);
              deleteReq.onsuccess = () => {
                console.log(`✅ تم مسح قاعدة البيانات: ${db.name}`);
                resolve();
              };
              deleteReq.onerror = () => reject(deleteReq.error);
              deleteReq.onblocked = () => {
                console.log(`⚠️ قاعدة البيانات محجوبة: ${db.name}`);
                resolve(); // لا نريد إيقاف العملية
              };
            });
          } catch (error) {
            console.error(`❌ خطأ في مسح ${db.name}:`, error);
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
    
    console.log('✅ تم الانتهاء من مسح IndexedDB');
    
  } catch (error) {
    console.error('❌ خطأ في مسح IndexedDB:', error);
  }
};

// 4. مسح Cache API
const clearCacheAPI = async () => {
  console.log('💾 بدء مسح Cache API...');
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log(`📦 وجدت ${cacheNames.length} كاش`);
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          const deleted = await caches.delete(cacheName);
          console.log(`${deleted ? '✅' : '❌'} مسح كاش: ${cacheName}`);
        })
      );
      
      console.log('✅ تم الانتهاء من مسح Cache API');
    } catch (error) {
      console.error('❌ خطأ في مسح Cache API:', error);
    }
  } else {
    console.log('ℹ️ Cache API غير متاح');
  }
};

// 5. مسح React Query Cache
const clearReactQueryCache = () => {
  console.log('⚛️ مسح React Query Cache...');
  
  try {
    // محاولة الوصول إلى queryClient إذا كان متاحاً
    if (window.queryClient) {
      window.queryClient.clear();
      console.log('✅ تم مسح React Query Cache');
    } else {
      console.log('ℹ️ React Query Cache غير متاح');
    }
  } catch (error) {
    console.error('❌ خطأ في مسح React Query Cache:', error);
  }
};

// 6. مسح متغيرات الذاكرة العامة
const clearGlobalVariables = () => {
  console.log('🌐 مسح متغيرات الذاكرة العامة...');
  
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
    
    console.log(`✅ تم مسح ${cleared} متغير عام`);
  } catch (error) {
    console.error('❌ خطأ في مسح المتغيرات العامة:', error);
  }
};

// 7. إعادة تحميل الصفحة
const forceRefresh = () => {
  console.log('🔄 إعادة تحميل الصفحة...');
  
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
  console.log('🚀 بدء التنظيف الشامل...');
  
  const localStorageCount = clearLocalStorage();
  const sessionStorageCount = clearSessionStorage();
  
  await clearIndexedDB();
  await clearCacheAPI();
  clearReactQueryCache();
  clearGlobalVariables();

  console.log(`
🎉 تم الانتهاء من التنظيف الشامل!
📊 الإحصائيات:
  - LocalStorage: ${localStorageCount} عنصر
  - SessionStorage: ${sessionStorageCount} عنصر
  - IndexedDB: تم المسح
  - Cache API: تم المسح
  - React Query: تم المسح
  - المتغيرات العامة: تم المسح

🔄 سيتم إعادة تحميل الصفحة خلال ثانيتين...
  `);

  forceRefresh();
};

// بدء التنظيف
clearEverything().catch(error => {
  console.error('❌ خطأ في التنظيف الشامل:', error);
  forceRefresh();
});
