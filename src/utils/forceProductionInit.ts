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
  console.log('🚀 [ForceProductionInit] Starting forced initialization...');
  
  // تأكد من أن النظام لم يُحمل مسبقاً
  if (typeof window !== 'undefined' && window.__OPTIMIZATION_SYSTEMS_LOADED__) {
    console.log('⚠️ [ForceProductionInit] Systems already loaded');
    return;
  }

  // تحميل إجباري للأنظمة
  const loadSystems = async () => {
    try {
      console.log('📦 [ForceProductionInit] Loading optimization modules...');

      // تحميل requestSystemInitializer
      const requestModule = await import('../lib/requestSystemInitializer');
      console.log('✅ [ForceProductionInit] RequestSystemInitializer loaded');

      // تحميل deduplication
      const deduplicationModule = await import('../lib/cache/deduplication');
      console.log('✅ [ForceProductionInit] Deduplication loaded');

      // تحميل POSDataContext
      const posModule = await import('../context/POSDataContext');
      console.log('✅ [ForceProductionInit] POSDataContext loaded');

      // تحميل ultimateRequestController
      const controllerModule = await import('../lib/ultimateRequestController');
      console.log('✅ [ForceProductionInit] UltimateRequestController loaded');

      // وضع علامة على النظام كمُحمل
      if (typeof window !== 'undefined') {
        window.__OPTIMIZATION_SYSTEMS_LOADED__ = true;
      }

      console.log('🎉 [ForceProductionInit] All systems loaded successfully!');

      // تشغيل النظام إذا كان متاحاً
      if (requestModule && typeof requestModule.initializeRequestSystem === 'function') {
        console.log('🔄 [ForceProductionInit] Initializing request system...');
        await requestModule.initializeRequestSystem();
        
        if (typeof window !== 'undefined') {
          window.__REQUEST_SYSTEM_INITIALIZED__ = true;
        }
        
        console.log('✅ [ForceProductionInit] Request system initialized successfully!');
      }

    } catch (error) {
      console.error('❌ [ForceProductionInit] Failed to load systems:', error);
    }
  };

  // تشغيل التحميل
  loadSystems();
};

// تشغيل التهيئة فوراً عند استيراد الملف
forceProductionInit(); 