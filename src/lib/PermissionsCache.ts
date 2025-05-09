/**
 * نظام تخزين مؤقت للصلاحيات والتحقق
 * يستخدم لتقليل عدد عمليات التحقق من الصلاحيات أثناء التنقل بين الصفحات
 */

const CACHE_PREFIX = 'bazaar_auth_';
const PERMISSIONS_CACHE_KEY = `${CACHE_PREFIX}permissions`;
const SUBSCRIPTION_CACHE_KEY = `${CACHE_PREFIX}subscription`;
const CACHE_EXPIRY_KEY = `${CACHE_PREFIX}expiry`;
const DEFAULT_CACHE_EXPIRY = 30 * 60 * 1000; // 30 دقيقة بالمللي ثانية

/**
 * تخزين بيانات الصلاحيات في التخزين المحلي
 */
export const cachePermissions = (permissions: any) => {
  try {
    // تخزين الصلاحيات
    localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(permissions));
    
    // تعيين وقت انتهاء الصلاحية
    const expiryTime = Date.now() + DEFAULT_CACHE_EXPIRY;
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    
    return true;
  } catch (error) {
    console.error('خطأ في تخزين الصلاحيات:', error);
    return false;
  }
};

/**
 * استرجاع بيانات الصلاحيات من التخزين المؤقت
 * إذا كانت البيانات منتهية الصلاحية أو غير موجودة، تعيد null
 */
export const getCachedPermissions = () => {
  try {
    // التحقق من وقت انتهاء الصلاحية
    const expiryTime = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiryTime || Date.now() > parseInt(expiryTime)) {
      // البيانات منتهية الصلاحية، قم بحذفها
      clearPermissionsCache();
      return null;
    }
    
    // استرجاع البيانات
    const cachedData = localStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (!cachedData) return null;
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('خطأ في استرجاع بيانات الصلاحيات المخزنة:', error);
    return null;
  }
};

/**
 * تخزين حالة الاشتراك في التخزين المؤقت
 */
export const cacheSubscriptionStatus = (subscriptionData: any) => {
  try {
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscriptionData));
    
    // تعيين وقت انتهاء الصلاحية إذا لم يكن موجوداً
    if (!localStorage.getItem(CACHE_EXPIRY_KEY)) {
      const expiryTime = Date.now() + DEFAULT_CACHE_EXPIRY;
      localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    }
    
    return true;
  } catch (error) {
    console.error('خطأ في تخزين حالة الاشتراك:', error);
    return false;
  }
};

/**
 * استرجاع حالة الاشتراك من التخزين المؤقت
 */
export const getCachedSubscriptionStatus = () => {
  try {
    // التحقق من وقت انتهاء الصلاحية
    const expiryTime = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiryTime || Date.now() > parseInt(expiryTime)) {
      // البيانات منتهية الصلاحية، قم بحذفها
      clearPermissionsCache();
      return null;
    }
    
    // استرجاع البيانات
    const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!cachedData) return null;
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('خطأ في استرجاع حالة الاشتراك المخزنة:', error);
    return null;
  }
};

/**
 * تجديد وقت انتهاء صلاحية التخزين المؤقت
 */
export const refreshCache = () => {
  try {
    const expiryTime = Date.now() + DEFAULT_CACHE_EXPIRY;
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    return true;
  } catch (error) {
    console.error('خطأ في تحديث وقت انتهاء الصلاحية:', error);
    return false;
  }
};

/**
 * حذف بيانات التخزين المؤقت للصلاحيات والاشتراك
 */
export const clearPermissionsCache = () => {
  try {
    localStorage.removeItem(PERMISSIONS_CACHE_KEY);
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    return true;
  } catch (error) {
    console.error('خطأ في حذف بيانات التخزين المؤقت:', error);
    return false;
  }
};

/**
 * التحقق مما إذا كانت هناك بيانات مخزنة مؤقتاً
 */
export const hasCachedPermissions = () => {
  return !!getCachedPermissions();
};

/**
 * التحقق مما إذا كان هناك اشتراك مخزن مؤقتاً
 */
export const hasCachedSubscription = () => {
  return !!getCachedSubscriptionStatus();
}; 