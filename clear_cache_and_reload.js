// ========================================
// سكريبت مسح التخزين المؤقت وإعادة التحميل
// يجب تشغيله في Console المتصفح
// ========================================

console.log('🧹 بدء مسح التخزين المؤقت...');

// 1. مسح localStorage
console.log('🗄️ مسح localStorage...');
localStorage.clear();

// 2. مسح sessionStorage  
console.log('🗄️ مسح sessionStorage...');
sessionStorage.clear();

// 3. مسح cookies للدومين الحالي
console.log('🍪 مسح cookies...');
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 4. مسح Cache API (إذا كان متاحاً)
if ('caches' in window) {
  console.log('💾 مسح Cache API...');
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

// 5. مسح IndexedDB (إذا كان متاحاً)
if ('indexedDB' in window) {
  console.log('🗃️ مسح IndexedDB...');
  try {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    });
  } catch (e) {
    console.log('ℹ️ تعذر مسح IndexedDB (قد يكون غير مدعوم)');
  }
}

console.log('✅ تم مسح التخزين المؤقت بنجاح!');
console.log('🔄 إعادة تحميل الصفحة...');

// 6. انتظار ثانية واحدة ثم إعادة تحميل الصفحة
setTimeout(() => {
  window.location.reload(true);
}, 1000); 