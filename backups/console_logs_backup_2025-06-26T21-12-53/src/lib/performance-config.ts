// تكوين أداء تلقائي - تم إنشاؤه بواسطة apply-performance-fixes.js
import { unifiedCache } from '@/lib/unified-cache-system';
import { consoleManager } from '@/lib/console-manager';
import { PerformanceCleanupManager } from '@/lib/performance-cleanup';

// تفعيل الأنظمة عند بدء التطبيق
export function initPerformanceSystems() {
  console.log('🚀 تفعيل أنظمة الأداء...');
  
  try {
    // تفعيل console manager (تعطيل في الإنتاج)
    if (process.env.NODE_ENV === 'production') {
      consoleManager.disable();
    } else {
      consoleManager.enable();
    }
    
    // تفعيل التنظيف التلقائي
    const cleanup = PerformanceCleanupManager.getInstance();
    cleanup.startPeriodicCleanup();
    
    // تحسين الكاش
    unifiedCache.optimizeMemory();
    
    console.log('✅ تم تفعيل جميع أنظمة الأداء');
  } catch (error) {
    console.warn('⚠️ تعذر تفعيل بعض أنظمة الأداء:', error);
  }
}

// تشغيل عند التحميل
if (typeof window !== 'undefined') {
  window.addEventListener('load', initPerformanceSystems);
}
