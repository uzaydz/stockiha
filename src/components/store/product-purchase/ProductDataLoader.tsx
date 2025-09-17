/**
 * مكون تحميل بيانات المنتج
 *
 * تم تقسيم هذا الملف إلى أجزاء أصغر:
 * - الأنواع: types/ProductDataLoader.types.ts
 * - الدوال المساعدة: utils/retryUtils.ts
 * - الهوك الرئيسي: hooks/useProductDataLoader.ts
 */

// إعادة تصدير الهوك من موقعه الجديد
export { useProductDataLoader } from './hooks/useProductDataLoader';

// إعادة تصدير الأنواع للاستخدام الخارجي
export type { ProductDataLoaderProps, RetryConfig, ProductDataState } from './types/ProductDataLoader.types';
