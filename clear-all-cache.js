// 🚫 مسح جميع أنواع الكاش من المتصفح
// يمكن تشغيل هذا الملف في وقت التطوير لضمان عدم وجود كاش قديم

console.log('🚫 مسح جميع أنواع الكاش...');

// 1. مسح LocalStorage
try {
  localStorage.clear();
  console.log('✅ تم مسح LocalStorage');
} catch (error) {
  console.error('❌ خطأ في مسح LocalStorage:', error);
}

// 2. مسح SessionStorage
try {
  sessionStorage.clear();
  console.log('✅ تم مسح SessionStorage');
} catch (error) {
  console.error('❌ خطأ في مسح SessionStorage:', error);
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
        console.log(`✅ تم مسح IndexedDB: ${dbName}`);
      };
      deleteReq.onerror = () => {
        console.log(`ℹ️ قاعدة البيانات غير موجودة: ${dbName}`);
      };
    });
  } catch (error) {
    console.error('❌ خطأ في مسح IndexedDB:', error);
  }
}

// 4. مسح Service Worker Cache
if ('serviceWorker' in navigator && 'caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        console.log(`🗑️ مسح Service Worker Cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
    console.log('✅ تم مسح جميع Service Worker Caches');
  }).catch(error => {
    console.error('❌ خطأ في مسح Service Worker Cache:', error);
  });
}

// 5. إعادة تحميل الصفحة لضمان البداية النظيفة
setTimeout(() => {
  console.log('🔄 إعادة تحميل الصفحة للبداية النظيفة...');
  window.location.reload();
}, 2000); 