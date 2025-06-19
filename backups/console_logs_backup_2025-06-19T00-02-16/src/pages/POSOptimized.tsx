// =================================================================
// 🚀 POS Optimized - نسخة محسنة من POS مع ضمان تحميل أنظمة التحسين
// =================================================================

import React, { useEffect, useState } from 'react';

// إجبار تحميل جميع أنظمة التحسين فوراً
import '../utils/forceProductionInit';
import '../utils/productionSystemCheck';
import '../lib/cache/deduplication';
import '../lib/requestSystemInitializer';
import '../lib/ultimateRequestController';

// تحميل POSWrapper المحسن (يحتوي على POSDataProvider)
import POSWrapper from '../components/pos/POSWrapper';

const POSOptimized: React.FC = () => {
  const [systemsReady, setSystemsReady] = useState(false);

  useEffect(() => {
    console.log('🚀 [POSOptimized] Ensuring optimization systems are loaded...');
    
    const ensureSystemsLoaded = async () => {
      try {
        // التأكد من تحميل جميع الأنظمة
        await Promise.all([
          import('../lib/cache/deduplication'),
          import('../lib/requestSystemInitializer'),
          import('../context/POSDataContext'),
          import('../lib/ultimateRequestController'),
          import('../utils/forceProductionInit')
        ]);

        console.log('✅ [POSOptimized] All optimization systems loaded');
        
        // إضافة تأخير قصير للتأكد من التهيئة
        setTimeout(() => {
          setSystemsReady(true);
          console.log('🎉 [POSOptimized] POS ready to render with optimizations');
        }, 100);

      } catch (error) {
        console.error('❌ [POSOptimized] Failed to load optimization systems:', error);
        // تحميل POS حتى لو فشلت الأنظمة
        setSystemsReady(true);
      }
    };

    ensureSystemsLoaded();
  }, []);

  // عرض مؤشر تحميل بسيط أثناء تحميل الأنظمة
  if (!systemsReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">تحميل نظام نقطة البيع المحسن...</p>
        </div>
      </div>
    );
  }

  return <POSWrapper />;
};

export default POSOptimized; 