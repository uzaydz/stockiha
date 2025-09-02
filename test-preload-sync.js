/**
 * اختبار للتحقق من تزامن أنظمة التحميل المسبق
 * يمكن تشغيله في console المتصفح للتحقق من الإصلاحات
 */

(function() {
  'use strict';

  console.log('🧪 بدء اختبار تزامن أنظمة التحميل المسبق...');

  // اختبار 1: التحقق من وجود المتغيرات العامة
  console.log('📊 اختبار 1: التحقق من المتغيرات العامة');
  console.log('- window.__GLOBAL_STORE_CACHE__:', typeof window.__GLOBAL_STORE_CACHE__ !== 'undefined' ? '✅ موجود' : '❌ غير موجود');

  // اختبار 2: التحقق من وجود الدوال المطلوبة
  console.log('📊 اختبار 2: التحقق من الدوال المطلوبة');
  const hasEarlyPreload = typeof window.getEarlyPreloadedData === 'function';
  const hasPreloadService = typeof window.preloadService !== 'undefined';

  console.log('- getEarlyPreloadedData:', hasEarlyPreload ? '✅ متوفرة' : '❌ غير متوفرة');
  console.log('- preloadService:', hasPreloadService ? '✅ متوفر' : '❌ غير متوفر');

  // اختبار 3: التحقق من البيانات المحفوظة في localStorage
  console.log('📊 اختبار 3: التحقق من البيانات في localStorage');
  const localStorageKeys = Object.keys(localStorage);
  const earlyPreloadKeys = localStorageKeys.filter(key => key.startsWith('early_preload_'));
  const orgIdKeys = localStorageKeys.filter(key => key === 'bazaar_organization_id');

  console.log('- مفاتيح early_preload_:', earlyPreloadKeys.length > 0 ? `✅ ${earlyPreloadKeys.length} مفتاح` : '❌ لا توجد مفاتيح');
  console.log('- bazaar_organization_id:', orgIdKeys.length > 0 ? '✅ موجود' : '❌ غير موجود');

  // اختبار 4: محاكاة استدعاء API
  console.log('📊 اختبار 4: محاكاة استدعاء API');
  if (hasEarlyPreload && hasPreloadService) {
    try {
      const testStoreId = 'testfinalfinalvhio';

      // محاولة الحصول على البيانات من earlyPreload
      const earlyData = window.getEarlyPreloadedData(testStoreId);
      console.log('- البيانات من earlyPreload:', earlyData ? '✅ متوفرة' : '❌ غير متوفرة');

      // محاولة الحصول على البيانات من preloadService
      const serviceData = window.preloadService.getPreloadedData(testStoreId);
      console.log('- البيانات من preloadService:', serviceData ? '✅ متوفرة' : '❌ غير متوفرة');

      // مقارنة البيانات
      if (earlyData && serviceData) {
        const dataMatch = JSON.stringify(earlyData) === JSON.stringify(serviceData);
        console.log('- تطابق البيانات:', dataMatch ? '✅ متطابقة' : '⚠️ غير متطابقة');
      }

    } catch (error) {
      console.error('❌ خطأ في محاكاة الاستدعاء:', error);
    }
  } else {
    console.log('⚠️ لا يمكن إجراء اختبار API - الدوال غير متوفرة');
  }

  // اختبار 5: التحقق من عدم التكرار
  console.log('📊 اختبار 5: التحقق من عدم التكرار');
  if (typeof window.getStoreInitCallCount === 'function') {
    const callCount = window.getStoreInitCallCount('testfinalfinalvhio');
    console.log('- عدد استدعاءات API:', callCount > 1 ? `⚠️ ${callCount} استدعاء (مكرر)` : callCount === 1 ? '✅ استدعاء واحد' : 'ℹ️ لم يتم الاستدعاء بعد');
  } else {
    console.log('- getStoreInitCallCount:', '❌ غير متوفرة');
  }

  console.log('🎉 انتهى الاختبار!');

  // دالة لمسح جميع البيانات (للاختبار)
  window.clearAllPreloadData = function() {
    console.log('🧹 مسح جميع بيانات التحميل المسبق...');

    // مسح localStorage
    localStorageKeys.forEach(key => {
      if (key.startsWith('early_preload_') || key === 'bazaar_organization_id') {
        localStorage.removeItem(key);
        console.log(`- تم مسح: ${key}`);
      }
    });

    // مسح cache العام
    if (window.__GLOBAL_STORE_CACHE__) {
      window.__GLOBAL_STORE_CACHE__ = {};
      console.log('- تم مسح cache العام');
    }

    // مسح preloadService
    if (window.preloadService) {
      window.preloadService.clearPreloadedData();
      console.log('- تم مسح preloadService');
    }

    // مسح earlyPreload
    if (window.earlyPreloader) {
      window.earlyPreloader.clearPreloadedData();
      console.log('- تم مسح earlyPreload');
    }

    console.log('✅ تم مسح جميع البيانات!');
  };

})();
