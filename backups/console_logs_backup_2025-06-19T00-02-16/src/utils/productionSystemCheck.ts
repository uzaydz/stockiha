// =================================================================
// 🔍 Production System Check - فحص أنظمة التحسين في الإنتاج
// =================================================================

declare global {
  interface Window {
    __PRODUCTION_SYSTEM_CHECK__: () => void;
    __FORCE_LOAD_OPTIMIZATIONS__: () => void;
  }
}

export const checkProductionSystems = () => {
  console.log('🔍 [ProductionSystemCheck] Starting system verification...');
  
  // فحص تحميل الملفات
  const checkLoadedModules = () => {
    const checks = {
      'deduplication': false,
      'requestSystemInitializer': false,
      'POSDataContext': false,
      'ultimateRequestController': false,
      'forceProductionInit': false
    };

    // فحص وجود الدوال في النطاق العالمي
    if (typeof window !== 'undefined') {
      // فحص window للمتغيرات المتوقعة
      if (window.__OPTIMIZATION_SYSTEMS_LOADED__) {
        console.log('✅ [ProductionSystemCheck] Optimization systems marked as loaded');
      } else {
        console.log('❌ [ProductionSystemCheck] Optimization systems NOT loaded');
      }

      if (window.__REQUEST_SYSTEM_INITIALIZED__) {
        console.log('✅ [ProductionSystemCheck] Request system marked as initialized');
      } else {
        console.log('❌ [ProductionSystemCheck] Request system NOT initialized');
      }
    }

    return checks;
  };

  // إجبار تحميل الأنظمة إذا لم تُحمل
  const forceLoadSystems = async () => {
    console.log('🚀 [ProductionSystemCheck] Force loading all optimization systems...');
    
    try {
      // تحميل متوازي لجميع الأنظمة
      const modules = await Promise.allSettled([
        import('../lib/cache/deduplication'),
        import('../lib/requestSystemInitializer'),
        import('../context/POSDataContext'),
        import('../lib/ultimateRequestController'),
        import('./forceProductionInit')
      ]);

      modules.forEach((result, index) => {
        const moduleNames = ['deduplication', 'requestSystemInitializer', 'POSDataContext', 'ultimateRequestController', 'forceProductionInit'];
        if (result.status === 'fulfilled') {
          console.log(`✅ [ProductionSystemCheck] ${moduleNames[index]} loaded successfully`);
        } else {
          console.error(`❌ [ProductionSystemCheck] Failed to load ${moduleNames[index]}:`, result.reason);
        }
      });

      console.log('🎉 [ProductionSystemCheck] All systems force-loaded!');
    } catch (error) {
      console.error('❌ [ProductionSystemCheck] Force load failed:', error);
    }
  };

  // تشغيل الفحص
  const results = checkLoadedModules();
  
  // إضافة دوال للنطاق العالمي للتشخيص
  if (typeof window !== 'undefined') {
    window.__PRODUCTION_SYSTEM_CHECK__ = () => {
      console.log('🔍 [ProductionSystemCheck] Manual system check triggered');
      checkLoadedModules();
    };

    window.__FORCE_LOAD_OPTIMIZATIONS__ = () => {
      console.log('🚀 [ProductionSystemCheck] Manual force load triggered');
      forceLoadSystems();
    };
  }

  console.log('🔍 [ProductionSystemCheck] Check completed. Use window.__PRODUCTION_SYSTEM_CHECK__() to re-check');
  
  return results;
};

// تشغيل الفحص فوراً
checkProductionSystems(); 