/**
 * مساعد لإدارة localStorage وتجنب مشاكل التحميل
 */

// قائمة المفاتيح التي قد تسبب مشاكل في التحميل
const PROBLEMATIC_KEYS = [
  'bazaar_organization_id',
  'bazaar_current_subdomain',
  'bazaar_organization_cache',
  'authSessionExists',
  'authSessionLastUpdated',
  'sidebarCollapsed'
];

// دالة آمنة للوصول إلى localStorage
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`خطأ في قراءة localStorage للمفتاح: ${key}`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`خطأ في كتابة localStorage للمفتاح: ${key}`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`خطأ في حذف localStorage للمفتاح: ${key}`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('خطأ في مسح localStorage', error);
      return false;
    }
  }
};

// دالة لتنظيف البيانات التي قد تسبب مشاكل
export const clearProblematicStorage = (): void => {
  console.log('🧹 تنظيف البيانات التي قد تسبب مشاكل...');
  
  PROBLEMATIC_KEYS.forEach(key => {
    safeLocalStorage.removeItem(key);
  });

  // مسح sessionStorage أيضا
  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn('خطأ في مسح sessionStorage', error);
  }

  // مسح أي مفاتيح تحتوي على patterns مشكوك فيها
  try {
    const keys = Object.keys(localStorage);
    const suspiciousKeys = keys.filter(key => 
      key.includes('tenant:') ||
      key.includes('domain:') ||
      key.includes('organization:') ||
      key.includes('cache_') ||
      key.includes('store_')
    );

    suspiciousKeys.forEach(key => {
      safeLocalStorage.removeItem(key);
    });

    if (suspiciousKeys.length > 0) {
      console.log(`🗑️ تم حذف ${suspiciousKeys.length} مفاتيح مشكوك فيها`);
    }
  } catch (error) {
    console.warn('خطأ في تنظيف المفاتيح المشكوك فيها', error);
  }
};

// دالة للتحقق من صحة البيانات المخزنة
export const validateStoredData = (): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // التحقق من معرف المؤسسة
  const orgId = safeLocalStorage.getItem('bazaar_organization_id');
  if (orgId && (orgId.length < 10 || !orgId.includes('-'))) {
    issues.push('معرف المؤسسة غير صحيح');
  }

  // التحقق من النطاق الفرعي
  const subdomain = safeLocalStorage.getItem('bazaar_current_subdomain');
  if (subdomain && subdomain === 'null') {
    issues.push('النطاق الفرعي محفوظ كـ null string');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

// دالة للإصلاح التلقائي للبيانات المعطلة
export const autoFixStorage = (): boolean => {
  const { isValid, issues } = validateStoredData();
  
  if (!isValid) {
    console.log('🔧 محاولة إصلاح البيانات المعطلة:', issues);
    
    // إصلاح النطاق الفرعي
    const subdomain = safeLocalStorage.getItem('bazaar_current_subdomain');
    if (subdomain === 'null') {
      safeLocalStorage.removeItem('bazaar_current_subdomain');
    }

    // إزالة معرفات المؤسسة غير الصحيحة
    const orgId = safeLocalStorage.getItem('bazaar_organization_id');
    if (orgId && (orgId.length < 10 || !orgId.includes('-'))) {
      safeLocalStorage.removeItem('bazaar_organization_id');
    }

    return true;
  }

  return false;
};

// دالة لإعادة تعيين كل شيء وإعادة التحميل
export const resetAndReload = (): void => {
  try {
    console.log('🔄 إعادة تعيين كل شيء وإعادة التحميل...');
    
    // مسح كل البيانات
    clearProblematicStorage();
    
    // مسح cache المتصفح إن أمكن
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // إعادة تحميل الصفحة
    window.location.reload();
  } catch (error) {
    console.error('خطأ في إعادة التعيين:', error);
    // إعادة تحميل بديلة
    window.location.href = window.location.href;
  }
};

// دالة للتحقق من حالة التحميل المتكررة
export const detectLoadingLoop = (): boolean => {
  const now = Date.now();
  const lastCheck = safeLocalStorage.getItem('last_loading_check');
  const loadingCount = safeLocalStorage.getItem('loading_count');
  
  if (!lastCheck) {
    safeLocalStorage.setItem('last_loading_check', now.toString());
    safeLocalStorage.setItem('loading_count', '1');
    return false;
  }

  const timeDiff = now - parseInt(lastCheck);
  const count = parseInt(loadingCount || '0');

  // إذا مرت أقل من 30 ثانية وتم التحميل أكثر من 3 مرات
  if (timeDiff < 30000 && count > 3) {
    console.warn('🚨 تم اكتشاف حلقة تحميل مستمرة!');
    clearProblematicStorage();
    return true;
  }

  // إذا مرت أكثر من 30 ثانية، إعادة تعيين العداد
  if (timeDiff > 30000) {
    safeLocalStorage.setItem('last_loading_check', now.toString());
    safeLocalStorage.setItem('loading_count', '1');
  } else {
    safeLocalStorage.setItem('loading_count', (count + 1).toString());
  }

  return false;
};

// دالة للإبلاغ عن أخطاء React Hook
export const reportHookError = (error: Error): void => {
  console.error('🚨 خطأ React Hook تم اكتشافه:', error.message);
  
  // إذا كان خطأ hooks، نظف الكاش ونعيد التحميل
  if (error.message.includes('hooks') || error.message.includes('Rendered fewer hooks')) {
    console.warn('🔧 سيتم تنظيف البيانات المؤقتة وإعادة التحميل...');
    setTimeout(() => {
      clearProblematicStorage();
      window.location.reload();
    }, 2000);
  }
}; 