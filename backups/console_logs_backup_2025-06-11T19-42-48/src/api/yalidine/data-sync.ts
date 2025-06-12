/**
 * خدمة مزامنة بيانات ياليدين
 * يقوم بجلب البيانات من API ياليدين وتخزينها في قاعدة البيانات المحلية
 * تستخدم البيانات العالمية المشتركة لتقليل عدد الطلبات إلى API
 * 
 * ملاحظة: تم تقسيم هذا الملف إلى وحدات أصغر لسهولة الصيانة
 * هذا الملف يبقى للحفاظ على التوافق مع الكود القديم
 */

// تصدير وظائف المزامنة الرئيسية
export { syncYalidineData, validateYalidineCredentials } from './index';

// تصدير وظيفة مزامنة الولايات العالمية
export { syncGlobalProvincesOnly } from './global-sync';

// تصدير وظائف الفحص والتحديث
export { getLastUpdate } from './data-update';

// تصدير الوظائف المساعدة
export { getSyncStatus, updateSyncStatus } from './sync-status';

// استيراد النوع لضمان التوافق مع الكود القديم
export type { SyncStatus, SyncStatusItem } from './sync-status';

// إعادة تصدير وظائف المزامنة الفرعية للحفاظ على التوافق
export { syncProvinces } from './provinces-sync';
export { syncMunicipalities } from './municipalities-sync';
export { syncCenters } from './centers-sync';
export { syncFees } from './fees-sync';

// إرشاد للمطورين: يرجى استخدام الوحدات المنفصلة مباشرة في الكود الجديد
