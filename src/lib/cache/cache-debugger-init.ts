// =================================================================
// 🔧 CACHE DEBUGGER INITIALIZATION - تهيئة أداة تشخيص Cache
// =================================================================

import CacheDebugger from './cache-debugger';

/**
 * تهيئة أدوات تشخيص وحل مشاكل Cache
 */
export const initializeCacheDebugger = () => {
  console.log('🔧 [Cache Debugger] تم تحميل أدوات التشخيص والحل');
  
  // إضافة الأدوات لـ window للاستخدام المباشر في console
  if (typeof window !== 'undefined') {
    console.log(`
🔧 أدوات تشخيص وحل مشاكل Cache متوفرة الآن:

📊 تشخيص شامل:
diagnoseCacheIssue('560e2c06-d13c-4853-abcf-d41f017469cf')

🚨 حل طارئ شامل:
emergencyFixCache('560e2c06-d13c-4853-abcf-d41f017469cf')

🧪 اختبار سريع (يشخص ثم يحل):
quickCacheTest()

استخدم هذه الأوامر في console لحل مشكلة عدم التحديث!
    `);
  }
};

export default initializeCacheDebugger; 