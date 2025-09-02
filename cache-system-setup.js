#!/usr/bin/env node

/**
 * 🚀 إعداد سريع لنظام الكاش الموحد
 *
 * تشغيل هذا الملف في المتصفح أو Node.js لتفعيل النظام الجديد
 */

// ===== إعداد نظام الكاش الموحد =====

(function() {
  'use strict';

  // 1. التحقق من وجود النظام
  if (typeof window === 'undefined') {
    return;
  }

  // 2. تنظيف الكاش القديم

  // مسح localStorage القديم
  try {
    const keys = Object.keys(localStorage);
    const oldKeys = keys.filter(key =>
      key.includes('cache_') ||
      key.includes('react-query') ||
      key.includes('supabase') ||
      key.includes('bazaar-cache')
    );

    oldKeys.forEach(key => {
      localStorage.removeItem(key);
    });

  } catch (error) {
  }

  // مسح sessionStorage القديم
  try {
    const keys = Object.keys(sessionStorage);
    const oldKeys = keys.filter(key =>
      key.includes('cache_') ||
      key.includes('bazaar-cache')
    );

    oldKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });

  } catch (error) {
  }

  // 3. إلغاء تسجيل Service Workers القديمة

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      const promises = registrations.map(registration => {
        return registration.unregister();
      });

      Promise.all(promises).then(results => {
        const successful = results.filter(Boolean).length;
      });
    });
  }

  // 4. إعداد الدوال العامة

  // دالة مساعدة للتشخيص السريع
  window.quickCacheCheck = async function() {

    const results = {
      unifiedCache: typeof window.UnifiedCache !== 'undefined',
      cacheMonitor: typeof window.runCacheDiagnostic !== 'undefined',
      serviceWorker: !!navigator.serviceWorker,
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined'
    };

    // محاولة تشغيل تشخيص شامل
    if (typeof window.runCacheDiagnostic !== 'undefined') {
      try {
        const diagnostic = await window.runCacheDiagnostic();
      } catch (error) {
      }
    }

    return results;
  };

  // دالة مساعدة للتنظيف السريع
  window.quickCacheClear = async function() {

    const results = {
      localStorage: false,
      sessionStorage: false,
      unifiedCache: false,
      serviceWorker: false,
      reactQuery: false
    };

    // تنظيف localStorage
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('ucm_'));
      cacheKeys.forEach(key => localStorage.removeItem(key));
      results.localStorage = true;
    } catch (error) {
    }

    // تنظيف sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      const cacheKeys = keys.filter(key => key.startsWith('ucm_'));
      cacheKeys.forEach(key => sessionStorage.removeItem(key));
      results.sessionStorage = true;
    } catch (error) {
    }

    // تنظيف UnifiedCache
    if (typeof window.UnifiedCache !== 'undefined') {
      try {
        window.UnifiedCache.clearAll();
        results.unifiedCache = true;
      } catch (error) {
      }
    }

    // تنظيف Service Worker
    if (typeof window.serviceWorkerCache !== 'undefined') {
      try {
        await window.serviceWorkerCache.clearAll();
        results.serviceWorker = true;
      } catch (error) {
      }
    }

    // تنظيف React Query
    if (typeof window.queryClient !== 'undefined') {
      try {
        window.queryClient.clear();
        results.reactQuery = true;
      } catch (error) {
      }
    }

    return results;
  };

  // دالة اختبار النظام
  window.testCacheSystem = async function() {

    const testResults = {
      unifiedCache: { status: 'pending', message: '' },
      serviceWorker: { status: 'pending', message: '' },
      monitoring: { status: 'pending', message: '' },
      performance: { status: 'pending', message: '' }
    };

    // اختبار UnifiedCache
    if (typeof window.UnifiedCache !== 'undefined') {
      try {
        // حفظ بيانات تجريبية
        window.UnifiedCache.set('test_key', { message: 'Hello World' }, 'api');

        // استرجاع البيانات
        const data = window.UnifiedCache.get('test_key');

        if (data && data.message === 'Hello World') {
          testResults.unifiedCache = { status: 'success', message: 'يعمل بشكل صحيح' };
        } else {
          testResults.unifiedCache = { status: 'error', message: 'فشل في استرجاع البيانات' };
        }

        // مسح البيانات التجريبية
        window.UnifiedCache.delete('test_key');
      } catch (error) {
        testResults.unifiedCache = { status: 'error', message: error.message };
      }
    } else {
      testResults.unifiedCache = { status: 'error', message: 'UnifiedCache غير متوفر' };
    }

    // اختبار Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          testResults.serviceWorker = {
            status: 'success',
            message: `مسجل في: ${registration.scope}`
          };
        } else {
          testResults.serviceWorker = {
            status: 'warning',
            message: 'غير مسجل (سيتم التسجيل عند تحميل التطبيق)'
          };
        }
      } catch (error) {
        testResults.serviceWorker = { status: 'error', message: error.message };
      }
    } else {
      testResults.serviceWorker = { status: 'error', message: 'Service Worker غير مدعوم' };
    }

    // اختبار المراقبة
    if (typeof window.CacheMonitor !== 'undefined') {
      testResults.monitoring = { status: 'success', message: 'مراقب الكاش متوفر' };
    } else {
      testResults.monitoring = { status: 'warning', message: 'مراقب الكاش غير متوفر بعد' };
    }

    // اختبار الأداء
    try {
      const report = window.getCachePerformanceReport ? await window.getCachePerformanceReport() : null;
      if (report) {
        testResults.performance = {
          status: 'success',
          message: `الحالة: ${report.health} (${report.metrics.totalRequests} طلب)`
        };
      } else {
        testResults.performance = {
          status: 'warning',
          message: 'تقرير الأداء غير متوفر بعد'
        };
      }
    } catch (error) {
      testResults.performance = { status: 'error', message: error.message };
    }

    return testResults;
  };

  // 5. إعداد المراقبة التلقائية

  // مراقبة الأداء كل 5 دقائق
  if (typeof window !== 'undefined') {
    setInterval(async () => {
      try {
        if (typeof window.getCachePerformanceReport !== 'undefined') {
          const report = await window.getCachePerformanceReport();
          if (report.health !== 'excellent') {
          }
        }
      } catch (error) {
        // تجاهل الأخطاء في المراقبة
      }
    }, 5 * 60 * 1000); // كل 5 دقائق
  }

  // 6. إشعار بإكمال الإعداد

  // تشغيل اختبار تلقائي بعد ثانيتين
  setTimeout(() => {
    if (typeof window.testCacheSystem !== 'undefined') {
      window.testCacheSystem();
    }
  }, 2000);

})();

// ===== تعليمات الاستخدام =====

/*
طرق تشغيل هذا الملف:

1. في المتصفح:
   - افتح Developer Tools (F12)
   - اذهب إلى Console
   - انسخ محتوى هذا الملف والصقه
   - اضغط Enter

2. كملف منفصل:
   - احفظ هذا الملف كـ cache-system-setup.js
   - أضفه إلى مشروعك
   - استورده في main.tsx أو app.tsx

3. للتشغيل التلقائي:
   - أضف هذا السطر في main.tsx:
   import './cache-system-setup.js';

الدوال المتاحة بعد التشغيل:
- quickCacheCheck(): فحص سريع لحالة النظام
- quickCacheClear(): مسح سريع للكاش
- testCacheSystem(): اختبار شامل للنظام
- runCacheDiagnostic(): تشخيص مفصل
- emergencyCacheCleanup(): تنظيف طارئ
- getCachePerformanceReport(): تقرير الأداء

*/
