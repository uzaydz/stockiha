// =============================================================================
// 🚨 إصلاح عاجل لمشاكل المصادقة في التطبيق
// =============================================================================
// المشكلة: خطأ 403 Forbidden في /auth/v1/user
// السبب: مشاكل في Supabase Client أو Session منتهية الصلاحية
// الحل: إصلاح شامل لإعدادات المصادقة
// =============================================================================

// 1. وضع هذا الكود في Console للتشخيص السريع

// فحص الإعدادات الحالية
const diagnostics = {
  // فحص localStorage
  localStorage: {
    supabaseKeys: Object.keys(localStorage).filter(key => key.includes('supabase')),
    bazaarKeys: Object.keys(localStorage).filter(key => key.includes('bazaar')),
    authKeys: Object.keys(localStorage).filter(key => key.includes('auth'))
  },
  
  // فحص المتغيرات البيئية
  environment: {
    supabaseUrl: import.meta?.env?.VITE_SUPABASE_URL || 'غير متوفر',
    hasAnonKey: !!(import.meta?.env?.VITE_SUPABASE_ANON_KEY),
    isDev: import.meta?.env?.DEV
  },
  
  // فحص النوافذ العامة
  global: {
    hasSupabaseClient: !!(window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__,
    hasAdminClient: !!(window as any).__BAZAAR_ADMIN_CLIENT_CREATED__,
    clientInstances: Object.keys(window).filter(key => key.includes('supabase') || key.includes('BAZAAR'))
  }
};

// =============================================================================
// 2. دالة تنظيف شاملة للمصادقة
// =============================================================================

const cleanupAuth = () => {
  
  // تنظيف localStorage
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || 
    key.includes('bazaar') || 
    key.includes('auth') ||
    key.includes('session')
  );
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // تنظيف sessionStorage
  const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
    key.includes('supabase') || 
    key.includes('bazaar') || 
    key.includes('auth')
  );
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  // تنظيف المتغيرات العامة
  delete (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__;
  delete (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__;
  delete (window as any).__BAZAAR_PRIMARY_CLIENT__;
  
};

// =============================================================================
// 3. دالة إنشاء Supabase Client بسيط للاختبار
// =============================================================================

const createTestSupabaseClient = () => {
  
  // استيراد createClient (يحتاج تشغيل في السياق الصحيح)
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';
  
  const testClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'test-auth-' + Date.now()
    },
    global: {
      headers: {
        'X-Client-Info': 'test-emergency-client'
      }
    }
  });
  
  return testClient;
};

// =============================================================================
// 4. دالة اختبار الاتصال
// =============================================================================

const testConnection = async (client: any) => {
  
  try {
    // اختبار 1: فحص بيانات المستخدم الحالي
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    
    // اختبار 2: فحص المستخدم
    const { data: userData, error: userError } = await client.auth.getUser();
    
    // اختبار 3: جلب بيانات عامة (بدون مصادقة)
    const { data: orgData, error: orgError } = await client
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    // اختبار 4: استدعاء دالة بسيطة
    const { data: appsData, error: appsError } = await client
      .rpc('get_organization_apps_no_rls');
    
    return {
      session: sessionData?.session,
      user: userData?.user,
      sessionError,
      userError,
      orgData,
      appsData
    };
    
  } catch (error) {
    return { error };
  }
};

// =============================================================================
// 5. دالة تسجيل دخول اختبار
// =============================================================================

const testSignIn = async (client: any, email: string = 'admin@test.com', password: string = 'password123') => {
  
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { error };
    }
    
    return { data };
    
  } catch (error) {
    return { error };
  }
};

// =============================================================================
// 6. دالة الحل الشامل
// =============================================================================

const emergencyAuthFix = async () => {
  
  try {
    // الخطوة 1: تنظيف البيانات القديمة
    cleanupAuth();
    
    // الخطوة 2: إنشاء عميل جديد
    const testClient = createTestSupabaseClient();
    
    // الخطوة 3: اختبار الاتصال
    const connectionResult = await testConnection(testClient);
    
    // الخطوة 4: محاولة تسجيل الدخول إذا لم يكن مسجلاً
    let signInResult = null;
    if (!connectionResult.session) {
      signInResult = await testSignIn(testClient);
    }
    
    // الخطوة 5: اختبار نهائي بعد تسجيل الدخول
    if (signInResult && !signInResult.error) {
      const finalTest = await testConnection(testClient);
    }
    
    // تعيين العميل كعميل عام للاختبار
    (window as any).testSupabaseClient = testClient;
    
    return {
      success: true,
      connectionResult,
      signInResult,
      message: 'تم إكمال الإصلاح العاجل'
    };
    
  } catch (error) {
    return {
      success: false,
      error,
      message: 'فشل في الإصلاح العاجل'
    };
  }
};

// =============================================================================
// 7. دوال مساعدة للتطبيق
// =============================================================================

// دالة للحصول على التطبيقات باستخدام العميل البديل
const getAppsWithTestClient = async (orgId?: string) => {
  const client = (window as any).testSupabaseClient;
  if (!client) {
    return null;
  }
  
  try {
    const { data, error } = await client.rpc('get_organization_apps_no_rls', 
      orgId ? { org_id: orgId } : {}
    );
    
    if (error) {
      return null;
    }
    
    return data;
    
  } catch (error) {
    return null;
  }
};

// دالة لتفعيل تطبيق
const enableAppWithTestClient = async (orgId: string, appId: string) => {
  const client = (window as any).testSupabaseClient;
  if (!client) {
    return null;
  }
  
  try {
    const { data, error } = await client.rpc('enable_app_simple', {
      org_id: orgId,
      app_id_param: appId
    });
    
    if (error) {
      return null;
    }
    
    return data;
    
  } catch (error) {
    return null;
  }
};

// =============================================================================
// 8. تصدير الدوال للاستخدام
// =============================================================================

// جعل الدوال متاحة عالمياً للاختبار
(window as any).emergencyAuthFix = emergencyAuthFix;
(window as any).cleanupAuth = cleanupAuth;
(window as any).testConnection = testConnection;
(window as any).getAppsWithTestClient = getAppsWithTestClient;
(window as any).enableAppWithTestClient = enableAppWithTestClient;

// =============================================================================
// 9. رسائل المساعدة
// =============================================================================

// تشغيل تلقائي للتشخيص

export {
  emergencyAuthFix,
  cleanupAuth,
  testConnection,
  getAppsWithTestClient,
  enableAppWithTestClient,
  diagnostics
};
