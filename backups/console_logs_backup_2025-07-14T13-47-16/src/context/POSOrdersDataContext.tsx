// =================================================================
// 🎯 POSOrdersDataContext - إعادة توجيه للوحدة المحسنة
// =================================================================

// هذا الملف محفوظ للتوافق مع الإصدارات السابقة
// الوحدة الجديدة في: src/context/pos-orders/

export { 
  POSOrdersDataProvider, 
  usePOSOrdersData 
} from './pos-orders';

// تصدير الأنواع للتوافق
export type {
  POSOrderWithDetails,
  POSOrderStats,
  POSOrderFilters,
  Employee,
  POSOrdersData
} from './pos-orders';
