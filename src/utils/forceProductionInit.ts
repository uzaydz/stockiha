// =================================================================
// 🚀 Force Production Initialization - إجبار تحميل أنظمة التحسين
// =================================================================

declare global {
  interface Window {
    __OPTIMIZATION_SYSTEMS_LOADED__: boolean;
    __REQUEST_SYSTEM_INITIALIZED__: boolean;
  }
}

export const forceProductionInit = () => {
  
  // تأكد من أن النظام لم يُحمل مسبقاً
  if (typeof window !== 'undefined' && window.__OPTIMIZATION_SYSTEMS_LOADED__) {
    return;
  }

  // تحميل إجباري للأنظمة
  const loadSystems = async () => {
    try {

      // تحميل deduplication
      const deduplicationModule = await import('../lib/cache/deduplication');

      // تحميل POSDataContext
      const posModule = await import('../context/POSDataContext');

      // تم حذف requestSystemInitializer و ultimateRequestController - الملفات غير موجودة

      // وضع علامة على النظام كمُحمل
      if (typeof window !== 'undefined') {
        window.__OPTIMIZATION_SYSTEMS_LOADED__ = true;
      }

      // تم حذف تشغيل requestModule - الملف غير موجود

    } catch (error) {
    }
  };

  // تشغيل التحميل
  loadSystems();
};

// تشغيل التهيئة فوراً عند استيراد الملف
forceProductionInit();
