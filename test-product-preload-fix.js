/**
 * اختبار للتحقق من إصلاح مشكلة preload المنتج
 * يمكن تشغيله في console المتصفح للتحقق من الإصلاحات
 */

(function() {
  'use strict';

  console.log('🧪 اختبار إصلاح preload المنتج...');

  // اختبار 1: التحقق من Cache العام
  console.log('📊 اختبار 1: التحقق من Cache العام');
  const globalCache = (window as any).__GLOBAL_STORE_CACHE__ || {};
  const cacheKeys = Object.keys(globalCache);
  const productCacheKeys = cacheKeys.filter(key => key.includes('product_complete_optimized'));

  console.log('- مفاتيح Cache المنتج:', productCacheKeys.length > 0 ? productCacheKeys : 'لا توجد مفاتيح');

  // اختبار 2: التحقق من localStorage
  console.log('📊 اختبار 2: التحقق من localStorage');
  const localStorageKeys = Object.keys(localStorage);
  const productPreloadKeys = localStorageKeys.filter(key => key.includes('product_preload_'));

  console.log('- مفاتيح product_preload_:', productPreloadKeys.length > 0 ? productPreloadKeys : 'لا توجد مفاتيح');

  // اختبار 3: التحقق من عدم وجود استدعاءات RPC غير ضرورية
  console.log('📊 اختبار 3: مراقبة استدعاءات RPC');
  let rpcCallCount = 0;

  // مراقبة fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('get_product_complete_data_ultra_optimized')) {
      rpcCallCount++;
      console.log(`🔄 استدعاء RPC رقم ${rpcCallCount}:`, url);
    }
    return originalFetch.apply(this, args);
  };

  console.log('- تم تفعيل مراقبة استدعاءات RPC');

  // اختبار 4: التحقق من وظائف Preloader
  console.log('📊 اختبار 4: التحقق من وظائف Preloader');
  const hasPreloader = typeof window.productPagePreloader !== 'undefined';
  const hasGetCachedResult = typeof window.getCachedProductPageResult === 'function';

  console.log('- productPagePreloader:', hasPreloader ? '✅ متوفر' : '❌ غير متوفر');
  console.log('- getCachedProductPageResult:', hasGetCachedResult ? '✅ متوفر' : '❌ غير متوفر');

  // دالة لعرض الإحصائيات
  window.showProductPreloadStats = function() {
    console.log('📊 إحصائيات preload المنتج:');
    console.log('- استدعاءات RPC:', rpcCallCount);
    console.log('- مفاتيح Cache:', productCacheKeys.length);
    console.log('- مفاتيح localStorage:', productPreloadKeys.length);

    if (rpcCallCount > 1) {
      console.warn('⚠️ تحذير: تم استدعاء RPC أكثر من مرة!');
    } else if (rpcCallCount === 0 && (productCacheKeys.length > 0 || productPreloadKeys.length > 0)) {
      console.log('✅ ممتاز: تم استخدام Cache دون استدعاء RPC');
    } else if (rpcCallCount === 1) {
      console.log('ℹ️ طبيعي: تم استدعاء RPC مرة واحدة');
    }
  };

  // دالة لمسح Cache للاختبار
  window.clearProductCache = function() {
    console.log('🧹 مسح Cache المنتج...');

    // مسح global cache
    productCacheKeys.forEach(key => {
      delete globalCache[key];
    });

    // مسح localStorage
    productPreloadKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // مسح preloader cache
    if (window.productPagePreloader) {
      window.productPagePreloader.clearAllCache();
    }

    console.log('✅ تم مسح جميع Cache المنتج');
  };

  console.log('🎯 الدوال المتاحة:');
  console.log('- showProductPreloadStats(): عرض الإحصائيات');
  console.log('- clearProductCache(): مسح Cache للاختبار');

  console.log('🎉 انتهى الاختبار!');

  // تشغيل إحصائيات أولية
  setTimeout(() => {
    window.showProductPreloadStats();
  }, 2000);

})();
