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
  
  // فحص تحميل الملفات
  const checkLoadedModules = () => {
    const checks = {
      'deduplication': false,
      'POSDataContext': false,
      'forceProductionInit': false
    };

    // فحص وجود الدوال في النطاق العالمي
    if (typeof window !== 'undefined') {
      // فحص window للمتغيرات المتوقعة
      if (window.__OPTIMIZATION_SYSTEMS_LOADED__) {
      } else {
      }

      if (window.__REQUEST_SYSTEM_INITIALIZED__) {
      } else {
      }
    }

    return checks;
  };

  // إجبار تحميل الأنظمة إذا لم تُحمل
  const forceLoadSystems = async () => {
    
    try {
      // تحميل متوازي لجميع الأنظمة
      const modules = await Promise.allSettled([
        import('../lib/cache/deduplication'),
        import('../context/POSDataContext'),
        import('./forceProductionInit')
      ]);

      modules.forEach((result, index) => {
        const moduleNames = ['deduplication', 'POSDataContext', 'forceProductionInit'];
        if (result.status === 'fulfilled') {
        } else {
        }
      });

    } catch (error) {
    }
  };

  // تشغيل الفحص
  const results = checkLoadedModules();
  
  // إضافة دوال للنطاق العالمي للتشخيص
  if (typeof window !== 'undefined') {
    window.__PRODUCTION_SYSTEM_CHECK__ = () => {
      checkLoadedModules();
    };

    window.__FORCE_LOAD_OPTIMIZATIONS__ = () => {
      forceLoadSystems();
    };
  }

  return results;
};

// تشغيل الفحص فوراً
checkProductionSystems();
