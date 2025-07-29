/**
 * أدوات تشخيص المصادقة وحل المشاكل
 */

export const authDebug = {
  // تنظيف تخزين المصادقة المتضارب
  cleanupAuthStorage: () => {
    
    const keysToRemove: string[] = [];
    
    // البحث عن جميع مفاتيح Supabase
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') || 
        key.startsWith('supabase') ||
        key.includes('bazaar-supabase-auth')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // إزالة المفاتيح المكررة وإبقاء الرئيسي فقط
    const mainKey = 'bazaar-supabase-auth-unified-main';
    keysToRemove.forEach(key => {
      if (key !== mainKey) {
        localStorage.removeItem(key);
      }
    });
    
    // تنظيف sessionStorage أيضاً
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
  },

  // فحص حالة المصادقة
  checkAuthState: () => {
    
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('bazaar'))) {
        authKeys.push(key);
      }
    }

    // فحص النطاق الفرعي
    const subdomain = localStorage.getItem('bazaar_current_subdomain');
    const orgId = localStorage.getItem('bazaar_organization_id');

    return {
      authKeys,
      subdomain,
      orgId,
      hostname: window.location.hostname
    };
  },

  // إصلاح مشكلة النطاقات الفرعية
  fixSubdomainDetection: () => {
    
    const hostname = window.location.hostname;
    let subdomain = null;
    
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1) {
        subdomain = parts[0];
      }
    } else if (!['ktobi.online', 'www.ktobi.online'].includes(hostname)) {
      const parts = hostname.split('.');
      if (parts.length > 2) {
        subdomain = parts[0];
        if (subdomain === 'www') {
          subdomain = null;
        }
      }
    }
    
    if (subdomain) {
      localStorage.setItem('bazaar_current_subdomain', subdomain);
      sessionStorage.setItem('bazaar_current_subdomain', subdomain);
    } else {
      localStorage.removeItem('bazaar_current_subdomain');
      sessionStorage.removeItem('bazaar_current_subdomain');
    }
    
    return subdomain;
  },

  // إعادة تحميل الصفحة مع تنظيف
  reloadWithCleanup: () => {
    authDebug.cleanupAuthStorage();
    authDebug.fixSubdomainDetection();
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // طباعة معلومات التشخيص الكاملة
  printDiagnostics: () => {
    
    const state = authDebug.checkAuthState();
    
    // فحص Multiple instances
    const instances = [];
    if ((window as any).__BAZAAR_SUPABASE_UNIFIED_CLIENT__) {
      instances.push('Unified Client');
    }
    
    // فحص وجود clients متعددة
    const globalKeys = Object.keys(window as any).filter(key => 
      key.includes('supabase') || key.includes('SUPABASE')
    );

    return {
      ...state,
      instances,
      globalKeys
    };
  }
};

// تصدير الدوال للاستخدام في وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).authDebug = authDebug;
}

export default authDebug;
