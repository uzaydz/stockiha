// تكوين أداء تلقائي - تم إنشاؤه بواسطة apply-performance-fixes.js
import { unifiedCache } from '@/lib/unified-cache-system';

// تفعيل الأنظمة عند بدء التطبيق
export function initPerformanceSystems() {
  
  try {
    // تعطيل console.log في الإنتاج (بسيط ومباشر)
    if (process.env.NODE_ENV === 'production') {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
    }
    
    // تحسين الكاش
    unifiedCache.optimizeMemory();
    
  } catch (error) {
    // تجاهل الأخطاء في تهيئة الأداء
  }
}

// تشغيل عند التحميل
if (typeof window !== 'undefined') {
  window.addEventListener('load', initPerformanceSystems);
}
