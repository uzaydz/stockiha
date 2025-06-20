// 🚫 مسح جميع أنواع الكاش من المتصفح
// يمكن تشغيل هذا الملف في وقت التطوير لضمان عدم وجود كاش قديم

// 1. مسح LocalStorage
try {
  localStorage.clear();
} catch (error) {
}

// 2. مسح SessionStorage
try {
  sessionStorage.clear();
} catch (error) {
}

// 3. مسح IndexedDB
if (window.indexedDB) {
  try {
    // قائمة بقواعد البيانات المحتملة
    const dbNames = [
      'bazaar-query-cache',
      'react-query-cache',
      'supabase-cache',
      'store-cache',
      'auth-cache'
    ];
    
    dbNames.forEach(dbName => {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      deleteReq.onsuccess = () => {
      };
      deleteReq.onerror = () => {
      };
    });
  } catch (error) {
  }
}

// 4. مسح Service Worker Cache
if ('serviceWorker' in navigator && 'caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
  }).catch(error => {
  });
}

// 5. إعادة تحميل الصفحة لضمان البداية النظيفة
setTimeout(() => {
  window.location.reload();
}, 2000);
