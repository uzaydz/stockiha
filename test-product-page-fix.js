/**
 * اختبار للتحقق من إصلاح مشكلة تحميل صفحة المنتج
 * يمكن تشغيله في console المتصفح للتحقق من الإصلاحات
 */

(function() {
  'use strict';

  console.log('🧪 بدء اختبار إصلاح صفحة المنتج...');

  // اختبار 1: التحقق من وجود البيانات المحملة مسبقاً
  console.log('📊 اختبار 1: البيانات المحملة مسبقاً');
  const localStorageKeys = Object.keys(localStorage);
  const productPreloadKeys = localStorageKeys.filter(key => key.startsWith('product_preload_'));
  const earlyPreloadKeys = localStorageKeys.filter(key => key.startsWith('early_preload_'));

  console.log('- مفاتيح product_preload_:', productPreloadKeys.length > 0 ? `✅ ${productPreloadKeys.length} مفتاح` : '❌ لا توجد مفاتيح');
  console.log('- مفاتيح early_preload_:', earlyPreloadKeys.length > 0 ? `✅ ${earlyPreloadKeys.length} مفتاح` : '❌ لا توجد مفاتيح');

  // اختبار 2: التحقق من وجود الدوال المطلوبة
  console.log('📊 اختبار 2: الدوال المطلوبة');
  const hasProductPreloader = typeof window.productPagePreloader !== 'undefined';
  const hasUnifiedData = typeof window.useUnifiedProductPageData !== 'undefined';

  console.log('- productPagePreloader:', hasProductPreloader ? '✅ متوفر' : '❌ غير متوفر');
  console.log('- useUnifiedProductPageData:', hasUnifiedData ? '✅ متوفر' : '❌ غير متوفر');

  // اختبار 3: محاكاة تحميل صفحة منتج
  console.log('📊 اختبار 3: محاكاة تحميل المنتج');
  if (hasProductPreloader && window.productPagePreloader) {
    try {
      const testProductId = 'burkini'; // نفس المنتج من المشكلة
      const testOrgId = '560e2c06-d13c-4853-abcf-d41f017469cf'; // نفس organizationId

      // التحقق من وجود preload cache
      const cachedResult = window.productPagePreloader.getCachedResult(testProductId, testOrgId);
      console.log('- البيانات المحفوظة في cache:', cachedResult ? '✅ متوفرة' : '❌ غير متوفرة');

      if (cachedResult) {
        console.log('- حالة البيانات المحفوظة:', cachedResult.success ? '✅ ناجحة' : '❌ فاشلة');
        if (cachedResult.data && cachedResult.data.product) {
          console.log('- المنتج في البيانات:', '✅ متوفر');
          console.log('- وصف المنتج:', cachedResult.data.product.description ? '✅ متوفر' : '❌ مفقود');
          console.log('- صور المنتج:', cachedResult.data.product.images ? '✅ متوفرة' : '❌ مفقودة');
        }
      }

      // التحقق من حالة التحميل
      const isPreloading = window.productPagePreloader.isPreloading(testProductId, testOrgId);
      console.log('- حالة التحميل الحالية:', isPreloading ? '⏳ قيد التحميل' : '✅ غير قيد التحميل');

    } catch (error) {
      console.error('❌ خطأ في محاكاة التحميل:', error);
    }
  }

  // اختبار 4: التحقق من عدم التكرار
  console.log('📊 اختبار 4: عدم التكرار');
  const currentUrl = window.location.href;
  const isProductPage = currentUrl.includes('/product-purchase-max-v2/') || currentUrl.includes('/product/');

  if (isProductPage) {
    console.log('- الصفحة الحالية:', '✅ صفحة منتج');

    // محاولة استخراج productId من URL
    const urlParts = currentUrl.split('/');
    const productIdFromUrl = urlParts[urlParts.length - 1];

    if (productIdFromUrl) {
      console.log('- معرف المنتج من URL:', productIdFromUrl);

      // فحص البيانات المحفوظة
      const productPreloadKey = `product_preload_${productIdFromUrl}_560e2c06-d13c-4853-abcf-d41f017469cf`;
      const hasPreloadedData = localStorage.getItem(productPreloadKey) !== null;
      console.log('- البيانات المحملة مسبقاً:', hasPreloadedData ? '✅ متوفرة' : '❌ غير متوفرة');
    }
  } else {
    console.log('- الصفحة الحالية:', 'ℹ️ ليست صفحة منتج');
  }

  console.log('🎉 انتهى اختبار صفحة المنتج!');

  // دالة لمسح بيانات المنتج (للاختبار)
  window.clearProductData = function(productId = null, orgId = '560e2c06-d13c-4853-abcf-d41f017469cf') {
    console.log('🧹 مسح بيانات المنتج...');

    if (productId) {
      // مسح بيانات منتج محدد
      const productKey = `product_preload_${productId}_${orgId}`;
      localStorage.removeItem(productKey);
      console.log(`- تم مسح بيانات المنتج: ${productId}`);

      if (window.productPagePreloader) {
        window.productPagePreloader.clearCache(productId, orgId);
        console.log(`- تم مسح cache المنتج: ${productId}`);
      }
    } else {
      // مسح جميع بيانات المنتج
      localStorageKeys.forEach(key => {
        if (key.startsWith('product_preload_')) {
          localStorage.removeItem(key);
          console.log(`- تم مسح: ${key}`);
        }
      });

      if (window.productPagePreloader) {
        window.productPagePreloader.clearAllCache();
        console.log('- تم مسح جميع cache المنتجات');
      }
    }

    console.log('✅ تم مسح بيانات المنتج!');
  };

  // دالة لإعادة تحميل الصفحة مع مسح البيانات
  window.reloadWithClear = function(productId = 'burkini') {
    console.log('🔄 إعادة تحميل مع مسح البيانات...');
    window.clearProductData(productId);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

})();
