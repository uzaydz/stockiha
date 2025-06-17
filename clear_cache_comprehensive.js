// سكريبت تنظيف شامل للـ cache وإعادة تحميل الموقع

// 1. تنظيف localStorage
try {
  localStorage.clear();
} catch (e) {
}

// 2. تنظيف sessionStorage
try {
  sessionStorage.clear();
} catch (e) {
}

// 3. تنظيف IndexedDB
if ('indexedDB' in window) {
  try {
    // قائمة قواعد البيانات المحتملة
    const dbNames = ['supabase-auth-token', 'auth-db', 'stockiha-db', 'bazaar-db'];
    
    dbNames.forEach(dbName => {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      deleteReq.onsuccess = () => console.log(`✅ تم حذف قاعدة بيانات: ${dbName}`);
      deleteReq.onerror = () => console.log(`❌ فشل حذف قاعدة بيانات: ${dbName}`);
    });
  } catch (e) {
  }
}

// 4. تنظيف Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// 5. تنظيف Cache API
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
    });
  });
}

// 6. إعادة تحميل قوية للصفحة
setTimeout(() => {
  
  // إعادة تحميل قوية تتجاهل الـ cache
  if (location.protocol === 'https:') {
    // في HTTPS، استخدم force reload
    location.reload(true);
  } else {
    // في HTTP أو localhost
    window.location.href = window.location.href + '?cache_bust=' + Date.now();
  }
}, 2000);

// 7. تنظيف cookies للنطاق
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
