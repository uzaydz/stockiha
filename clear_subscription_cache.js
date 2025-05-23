// Script لمسح cache الاشتراكات المخزن مؤقتاً
// يمكن تشغيله في console المتصفح

console.log('🔄 بدء مسح cache الاشتراكات...');

// مسح جميع البيانات المخزنة مؤقتاً المتعلقة بالاشتراكات
const CACHE_PREFIX = 'bazaar_auth_';
const PERMISSIONS_CACHE_KEY = `${CACHE_PREFIX}permissions`;
const SUBSCRIPTION_CACHE_KEY = `${CACHE_PREFIX}subscription`;
const CACHE_EXPIRY_KEY = `${CACHE_PREFIX}expiry`;

// إزالة جميع المفاتيح
try {
  localStorage.removeItem(PERMISSIONS_CACHE_KEY);
  localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  
  console.log('✅ تم مسح cache الاشتراكات بنجاح');
  console.log('🔄 يرجى إعادة تحميل الصفحة لتطبيق التغييرات');
  
  // عرض المفاتيح المحذوفة
  console.log('📋 المفاتيح المحذوفة:');
  console.log(`- ${PERMISSIONS_CACHE_KEY}`);
  console.log(`- ${SUBSCRIPTION_CACHE_KEY}`);
  console.log(`- ${CACHE_EXPIRY_KEY}`);
  
} catch (error) {
  console.error('❌ خطأ في مسح cache:', error);
}

// اختياري: إعادة تحميل الصفحة تلقائياً
const autoReload = confirm('هل تريد إعادة تحميل الصفحة الآن لتطبيق التغييرات؟');
if (autoReload) {
  window.location.reload();
} 