/**
 * مُصدّر رئيسي لوحدات ياليدين
 */

// تصدير الوظائف الرئيسية من الوحدات الفرعية
export { validateYalidineCredentials } from './validation';
export { syncYalidineData } from './main-sync';
export { getLastUpdate } from './data-update';
export { getYalidineApiClient } from './api';
export { yalidineRateLimiter } from './rate-limiter';
export { isGlobalDataUpToDate, syncAllGlobalData } from './global-sync';

// تصدير وظائف الخدمة
export { 
  getProvinces, 
  getMunicipalities, 
  getMunicipalitiesByDeliveryType, 
  getCenters, 
  getCentersByCommune, 
  calculateDeliveryPrice 
} from './service';

// تصدير الأنواع
export * from './types';

// تصدير وظائف حالة المزامنة
export { getSyncStatus, updateSyncStatus, createInitialSyncStatus } from './sync-status'; 