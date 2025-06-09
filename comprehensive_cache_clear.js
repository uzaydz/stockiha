// ===================================================================
// مسح شامل لجميع أنواع التخزين المؤقت - تشغيل في console المتصفح
// ===================================================================

console.log('🧹 بدء المسح الشامل لجميع أنواع التخزين المؤقت...');

// 1. مسح localStorage
const clearLocalStorage = () => {
  console.log('\n📦 مسح localStorage:');
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
    console.log(`❌ تم حذف من localStorage: ${key}`);
  });
  
  console.log(`✅ تم حذف ${deletedCount} عنصر من localStorage`);
  return deletedCount;
};

// 2. مسح sessionStorage
const clearSessionStorage = () => {
  console.log('\n📦 مسح sessionStorage:');
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
    console.log(`❌ تم حذف من sessionStorage: ${key}`);
  });
  
  console.log(`✅ تم حذف ${deletedCount} عنصر من sessionStorage`);
  return deletedCount;
};

// 3. مسح IndexedDB (هذا هو المهم!)
const clearIndexedDB = async () => {
  console.log('\n🗃️ مسح IndexedDB:');
  
  try {
    // الحصول على جميع قواعد البيانات
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const databases = await indexedDB.databases();
      console.log('قواعد بيانات IndexedDB الموجودة:', databases.map(db => db.name));
      
      // مسح قواعد البيانات المتعلقة بالتخزين المؤقت
      for (const db of databases) {
        if (db.name && (
          db.name.includes('cache') ||
          db.name.includes('shipping') ||
          db.name.includes('bazaar') ||
          db.name.includes('query')
        )) {
          try {
            console.log(`🗑️ محاولة حذف قاعدة بيانات: ${db.name}`);
            const deleteReq = indexedDB.deleteDatabase(db.name);
            await new Promise((resolve, reject) => {
              deleteReq.onsuccess = () => {
                console.log(`✅ تم حذف قاعدة البيانات: ${db.name}`);
                resolve();
              };
              deleteReq.onerror = () => {
                console.log(`❌ فشل في حذف قاعدة البيانات: ${db.name}`);
                reject(deleteReq.error);
              };
              deleteReq.onblocked = () => {
                console.log(`⚠️ حذف قاعدة البيانات محجوب: ${db.name}`);
                resolve(); // لا نريد إيقاف العملية
              };
            });
          } catch (error) {
            console.log(`❌ خطأ في حذف قاعدة البيانات ${db.name}:`, error);
          }
        }
      }
    } else {
      console.log('❌ IndexedDB.databases() غير مدعوم في هذا المتصفح');
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
            console.log(`✅ تم حذف قاعدة البيانات المعروفة: ${dbName}`);
            resolve();
          };
          deleteReq.onerror = () => {
            console.log(`⚠️ لا توجد قاعدة بيانات: ${dbName}`);
            resolve();
          };
          deleteReq.onblocked = () => {
            console.log(`⚠️ حذف قاعدة البيانات محجوب: ${dbName}`);
            resolve();
          };
        });
      } catch (error) {
        console.log(`⚠️ خطأ في محاولة حذف ${dbName}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ في مسح IndexedDB:', error);
  }
  
  console.log('✅ انتهاء محاولة مسح IndexedDB');
};

// 4. مسح Cache API
const clearCacheAPI = async () => {
  console.log('\n🌐 مسح Cache API:');
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('أسماء الـ caches الموجودة:', cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`❌ تم حذف cache: ${cacheName}`);
      }
      
      console.log(`✅ تم حذف ${cacheNames.length} cache`);
    } catch (error) {
      console.error('❌ خطأ في مسح Cache API:', error);
    }
  } else {
    console.log('❌ Cache API غير مدعوم');
  }
};

// 5. مسح React Query Cache
const clearReactQueryCache = () => {
  console.log('\n⚛️ مسح React Query Cache:');
  
  try {
    // محاولة الوصول لـ React Query Client
    if (window.__REACT_QUERY_GLOBAL_CLIENT) {
      console.log('🔍 تم العثور على React Query Client');
      window.__REACT_QUERY_GLOBAL_CLIENT.clear();
      console.log('✅ تم مسح React Query Cache');
    } else {
      console.log('⚠️ لم يتم العثور على React Query Client');
    }
  } catch (error) {
    console.error('❌ خطأ في مسح React Query Cache:', error);
  }
};

// 6. مسح أي متغيرات عامة متعلقة بالتخزين المؤقت
const clearGlobalVariables = () => {
  console.log('\n🌍 مسح المتغيرات العامة:');
  
  const variablesToClear = [
    'cachedShippingFees',
    'shippingCache',
    'yalidineCache',
    'calculateShippingCache'
  ];
  
  variablesToClear.forEach(varName => {
    if (window[varName]) {
      delete window[varName];
      console.log(`❌ تم حذف المتغير العام: ${varName}`);
    }
  });
  
  console.log('✅ انتهاء مسح المتغيرات العامة');
};

// 7. إجبار تحديث الصفحة مع تجاهل التخزين المؤقت
const forceRefresh = () => {
  console.log('\n🔄 إعادة تحميل قوية للصفحة...');
  
  // محاولة مسح Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
        console.log('❌ تم إلغاء تسجيل Service Worker');
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
  console.log('🚀 بدء المسح الشامل...');
  
  const localStorageCount = clearLocalStorage();
  const sessionStorageCount = clearSessionStorage();
  
  await clearIndexedDB();
  await clearCacheAPI();
  clearReactQueryCache();
  clearGlobalVariables();
  
  console.log('\n📊 ملخص العملية:');
  console.log(`- localStorage: ${localStorageCount} عنصر`);
  console.log(`- sessionStorage: ${sessionStorageCount} عنصر`);
  console.log('- IndexedDB: تم المسح');
  console.log('- Cache API: تم المسح');
  console.log('- React Query: تم المسح');
  console.log('- المتغيرات العامة: تم المسح');
  
  console.log('\n⚠️ مهم: سيتم إعادة تحميل الصفحة خلال ثانيتين لضمان التطبيق الكامل...');
  
  forceRefresh();
};

// تشغيل المسح الشامل
clearEverything(); 