/**
 * نظام تخزين مؤقت للصلاحيات والتحقق
 * يستخدم لتقليل عدد عمليات التحقق من الصلاحيات أثناء التنقل بين الصفحات
 */

const CACHE_PREFIX = 'bazaar_auth_';
const PERMISSIONS_CACHE_KEY = `${CACHE_PREFIX}permissions`;
const SUBSCRIPTION_CACHE_KEY = `${CACHE_PREFIX}subscription`;
const CACHE_EXPIRY_KEY = `${CACHE_PREFIX}expiry`;
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000; // 5 دقائق بالمللي ثانية (مقللة من 30 دقيقة لأمان أكبر)

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
    
    const subscription = JSON.parse(cachedData);
    
    // التحقق الإضافي من صحة الاشتراك المخزن
    if (subscription && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      
      // إذا كان الاشتراك منتهي الصلاحية، احذف الكاش وأرجع null
      if (endDate <= now) {
        clearPermissionsCache();
        return null;
      }
    }
    
    return subscription;
  } catch (error) {
    return null;
  }
};

/**
 * التحقق من صحة الاشتراك المخزن مؤقتاً مع التحقق من تاريخ انتهاء الصلاحية
 */
export const validateCachedSubscription = () => {
  try {
    const cachedSubscription = getCachedSubscriptionStatus();
    
    if (!cachedSubscription) {
      return { isValid: false, reason: 'لا يوجد اشتراك مخزن' };
    }
    
    // التحقق من حالة النشاط
    if (!cachedSubscription.isActive) {
      clearPermissionsCache();
      return { isValid: false, reason: 'الاشتراك غير نشط' };
    }
    
    // التحقق من تاريخ انتهاء الصلاحية إذا كان موجوداً
    if (cachedSubscription.endDate) {
      const endDate = new Date(cachedSubscription.endDate);
      const now = new Date();
      
      if (endDate <= now) {
        clearPermissionsCache();
        return { isValid: false, reason: 'الاشتراك منتهي الصلاحية' };
      }
      
      // حساب الأيام المتبقية
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        isValid: true, 
        daysLeft,
        subscription: cachedSubscription 
      };
    }
    
    // إذا لم يكن هناك تاريخ انتهاء، اعتبر الاشتراك صالح (للاشتراكات التجريبية مثلاً)
    return { isValid: true, subscription: cachedSubscription };
    
  } catch (error) {
    clearPermissionsCache();
    return { isValid: false, reason: 'خطأ في التحقق من الاشتراك' };
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
    console.log('🗑️ تم مسح التخزين المؤقت للصلاحيات');
    return true;
  } catch (error) {
    console.error('خطأ في مسح التخزين المؤقت:', error);
    return false;
  }
};

/**
 * مسح شامل لجميع بيانات التخزين المؤقت المتعلقة بالتطبيق
 */
export const clearAllCache = () => {
  try {
    // مسح جميع مفاتيح التطبيق
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ تم مسح جميع البيانات المؤقتة للتطبيق');
    return true;
  } catch (error) {
    console.error('خطأ في مسح جميع البيانات المؤقتة:', error);
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
