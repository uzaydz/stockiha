// =====================================================
// ملف مسح الكاش وإعادة تحميل البيانات
// =====================================================
// هذا الملف يمكن تشغيله في وحدة تحكم المتصفح لمسح الكاش وإعادة تحميل البيانات

console.log('🧹 بدء مسح الكاش وإعادة تحميل البيانات...');

// مسح localStorage
try {
  localStorage.clear();
  console.log('✅ تم مسح localStorage');
} catch (error) {
  console.warn('تحذير: فشل في مسح localStorage:', error);
}

// مسح sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ تم مسح sessionStorage');
} catch (error) {
  console.warn('تحذير: فشل في مسح sessionStorage:', error);
}

// مسح IndexedDB إذا كان متاحاً
if ('indexedDB' in window) {
  try {
    // محاولة مسح جميع قواعد البيانات
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        indexedDB.deleteDatabase(db.name);
      });
      console.log('✅ تم مسح IndexedDB');
    }).catch(error => {
      console.warn('تحذير: فشل في مسح IndexedDB:', error);
    });
  } catch (error) {
    console.warn('تحذير: فشل في الوصول إلى IndexedDB:', error);
  }
}

// مسح cookies المتعلقة بالموقع
try {
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('✅ تم مسح cookies');
} catch (error) {
  console.warn('تحذير: فشل في مسح cookies:', error);
}

// مسح cache المتصفح إذا كان متاحاً
if ('caches' in window) {
  try {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
      console.log('✅ تم مسح cache المتصفح');
    }).catch(error => {
      console.warn('تحذير: فشل في مسح cache المتصفح:', error);
    });
  } catch (error) {
    console.warn('تحذير: فشل في الوصول إلى cache المتصفح:', error);
  }
}

// مسح أي متغيرات عامة قد تحتوي على بيانات تالفة
try {
  if (window.prefetchManager) {
    window.prefetchManager = null;
    console.log('✅ تم مسح prefetchManager');
  }
  
  if (window.organizationSettings) {
    window.organizationSettings = null;
    console.log('✅ تم مسح organizationSettings');
  }
  
  if (window.cachedSettings) {
    window.cachedSettings = null;
    console.log('✅ تم مسح cachedSettings');
  }
} catch (error) {
  console.warn('تحذير: فشل في مسح المتغيرات العامة:', error);
}

console.log('🔄 إعادة تحميل الصفحة...');

// إعادة تحميل الصفحة بعد 2 ثانية
setTimeout(() => {
  window.location.reload();
}, 2000);

console.log('✅ تم إكمال عملية مسح الكاش. سيتم إعادة تحميل الصفحة خلال ثانيتين...');