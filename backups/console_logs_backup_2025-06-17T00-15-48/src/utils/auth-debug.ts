/**
 * أدوات تشخيص المصادقة وحل المشاكل
 */

export const authDebug = {
  // تنظيف تخزين المصادقة المتضارب
  cleanupAuthStorage: () => {
    console.log('🧹 تنظيف تخزين المصادقة...');
    
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
        console.log(`🗑️ تمت إزالة: ${key}`);
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
      console.log(`🗑️ تمت إزالة من session: ${key}`);
    });
    
    console.log('✅ تم تنظيف التخزين');
  },

  // فحص حالة المصادقة
  checkAuthState: () => {
    console.log('🔍 فحص حالة المصادقة...');
    
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('bazaar'))) {
        authKeys.push(key);
      }
    }
    
    console.log('🔑 مفاتيح المصادقة المطوجة:', authKeys);
    
    // فحص النطاق الفرعي
    const subdomain = localStorage.getItem('bazaar_current_subdomain');
    const orgId = localStorage.getItem('bazaar_organization_id');
    
    console.log('🌐 النطاق الفرعي:', subdomain);
    console.log('🏢 معرف المؤسسة:', orgId);
    
    return {
      authKeys,
      subdomain,
      orgId,
      hostname: window.location.hostname
    };
  },

  // إصلاح مشكلة النطاقات الفرعية
  fixSubdomainDetection: () => {
    console.log('🔧 إصلاح كشف النطاق الفرعي...');
    
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
      console.log(`✅ تم تعيين النطاق الفرعي: ${subdomain}`);
    } else {
      localStorage.removeItem('bazaar_current_subdomain');
      sessionStorage.removeItem('bazaar_current_subdomain');
      console.log('✅ تم إزالة النطاق الفرعي (نطاق رئيسي)');
    }
    
    return subdomain;
  },

  // إعادة تحميل الصفحة مع تنظيف
  reloadWithCleanup: () => {
    console.log('🔄 إعادة تحميل مع تنظيف...');
    authDebug.cleanupAuthStorage();
    authDebug.fixSubdomainDetection();
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // طباعة معلومات التشخيص الكاملة
  printDiagnostics: () => {
    console.log('=== 🔍 تشخيص شامل للمصادقة ===');
    
    const state = authDebug.checkAuthState();
    console.table(state);
    
    // فحص Multiple instances
    const instances = [];
    if ((window as any).__BAZAAR_SUPABASE_UNIFIED_CLIENT__) {
      instances.push('Unified Client');
    }
    
    // فحص وجود clients متعددة
    const globalKeys = Object.keys(window as any).filter(key => 
      key.includes('supabase') || key.includes('SUPABASE')
    );
    
    console.log('🔗 Instances موجودة:', instances);
    console.log('🌐 Global keys:', globalKeys);
    
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
  console.log('🛠️ أدوات التشخيص متاحة: window.authDebug');
  console.log('📝 الأوامر المتاحة:');
  console.log('  - authDebug.cleanupAuthStorage()');
  console.log('  - authDebug.checkAuthState()'); 
  console.log('  - authDebug.fixSubdomainDetection()');
  console.log('  - authDebug.reloadWithCleanup()');
  console.log('  - authDebug.printDiagnostics()');
}

export default authDebug; 