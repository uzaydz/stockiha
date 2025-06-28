// تكوين أداء تلقائي - تم إنشاؤه بواسطة apply-performance-fixes.js
import { unifiedCache } from '@/lib/unified-cache-system';
import { PerformanceCleanupManager } from '@/lib/performance-cleanup';

// تفعيل الأنظمة عند بدء التطبيق
export function initPerformanceSystems() {
  
  try {
    // تعطيل console.log في الإنتاج (بسيط ومباشر)
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
    }
    
    // تفعيل التنظيف التلقائي
    const cleanup = PerformanceCleanupManager.getInstance();
    cleanup.startPeriodicCleanup();
    
    // تحسين الكاش
    unifiedCache.optimizeMemory();
    
  } catch (error) {
    console.error('Error in initPerformanceSystems:', error);
  }
}

// تشغيل عند التحميل
if (typeof window !== 'undefined') {
  window.addEventListener('load', initPerformanceSystems);
}
