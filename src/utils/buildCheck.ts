// =================================================================
// 🔍 Build Check Utilities - للتأكد من أن جميع الملفات موجودة
// =================================================================

export const checkBuildIntegrity = () => {
  const checks = {
    POSDataContext: false,
    POSWrapper: false,
    deduplication: false,
    productionDebug: false,
  };

  try {
    // فحص POSDataContext
    import('@/context/POSDataContext').then(() => {
      checks.POSDataContext = true;
      console.log('✅ POSDataContext loaded successfully');
    }).catch(() => {
      console.error('❌ POSDataContext failed to load');
    });

    // فحص POSWrapper
    import('@/components/pos/POSWrapper').then(() => {
      checks.POSWrapper = true;
      console.log('✅ POSWrapper loaded successfully');
    }).catch(() => {
      console.error('❌ POSWrapper failed to load');
    });

    // فحص deduplication
    import('@/lib/cache/deduplication').then(() => {
      checks.deduplication = true;
      console.log('✅ Deduplication loaded successfully');
    }).catch(() => {
      console.error('❌ Deduplication failed to load');
    });

    // فحص productionDebug
    import('@/utils/productionDebug').then(() => {
      checks.productionDebug = true;
      console.log('✅ ProductionDebug loaded successfully');
    }).catch(() => {
      console.error('❌ ProductionDebug failed to load');
    });

  } catch (error) {
    console.error('❌ Build check failed:', error);
  }

  // تسجيل النتائج النهائية بعد ثانيتين
  setTimeout(() => {
    console.log('🔍 Build Integrity Check Results:', checks);
    
    const allPassed = Object.values(checks).every(Boolean);
    if (allPassed) {
      console.log('✅ All POS optimization files loaded successfully!');
    } else {
      console.error('❌ Some POS optimization files failed to load');
    }

    // إضافة للـ window للتشخيص
    if (typeof window !== 'undefined') {
      (window as any).__BUILD_CHECK_RESULTS = checks;
    }
  }, 2000);
};

export default checkBuildIntegrity; 