// ========================================
// سكريبت مسح التخزين المؤقت وإعادة التحميل
// يجب تشغيله في Console المتصفح
// ========================================

// 1. مسح localStorage
localStorage.clear();

// 2. مسح sessionStorage  
sessionStorage.clear();

// 3. مسح cookies للدومين الحالي
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 4. مسح Cache API (إذا كان متاحاً)
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

// 5. مسح IndexedDB (إذا كان متاحاً)
if ('indexedDB' in window) {
  try {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    });
  } catch (e) {
  }
}

// 6. انتظار ثانية واحدة ثم إعادة تحميل الصفحة
setTimeout(() => {
  window.location.reload(true);
}, 1000);
