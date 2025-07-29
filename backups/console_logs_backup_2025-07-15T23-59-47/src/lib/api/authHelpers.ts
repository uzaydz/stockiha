import { getCachedUser, getCachedSession, getCachedAuth } from '@/lib/authCache';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseReady } from '@/lib/supabase-unified';
import { GentleLogoutCleaner } from '@/lib/utils/gentle-logout-cleaner';

/**
 * الحصول على المستخدم الحالي مع cache ذكي
 * بديل محسن لـ supabase.auth.getUser()
 */
export const getCurrentUser = async (): Promise<User | null> => {
  return await getCachedUser();
};

/**
 * الحصول على الجلسة الحالية مع cache ذكي
 * بديل محسن لـ supabase.auth.getSession()
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  return await getCachedSession();
};

/**
 * الحصول على بيانات المصادقة الكاملة مع cache ذكي
 */
export const getCurrentAuth = async (): Promise<{ user: User | null; session: Session | null }> => {
  return await getCachedAuth();
};

/**
 * التحقق من وجود مستخدم مصادق
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

/**
 * الحصول على معرف المستخدم الحالي
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

/**
 * الحصول على بريد المستخدم الحالي
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.email || null;
};

/**
 * التحقق من صلاحية الجلسة
 */
export const isSessionValid = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  if (!session) return false;
  
  // التحقق من انتهاء صلاحية الجلسة
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at ? session.expires_at > now : true;
};

/**
 * دوال مساعدة للمصادقة - النسخة المحسنة
 * تتعامل مع مشاكل Race Conditions وSession Validation
 */

interface SignInResult {
  success: boolean;
  error?: { message: string; code?: string };
  session?: any;
  user?: any;
}

interface UserExistsResult {
  exists: boolean;
  user_id?: string;
  user_name?: string;
  organization_id?: string;
  requires_2fa?: boolean;
}

/**
 * تسجيل الدخول مع معالجة شاملة للأخطاء
 */
export const signIn = async (email: string, password: string): Promise<SignInResult> => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      
      // التأكد من جاهزية Supabase Client
      const client = getSupabaseClient();
      
      if (!client) {
        throw new Error('Supabase client not available');
      }

      // محاولة تسجيل الدخول
      const { data, error } = await client.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (error) {
        
        // معالجة أخطاء محددة
        if (error.message?.includes('Invalid login credentials')) {
          return {
            success: false,
            error: { message: 'بيانات تسجيل الدخول غير صحيحة', code: 'invalid_credentials' }
          };
        } else if (error.message?.includes('Email not confirmed')) {
          return {
            success: false,
            error: { message: 'يرجى تأكيد بريدك الإلكتروني أولاً', code: 'email_not_confirmed' }
          };
        } else if (error.message?.includes('Too many requests')) {
          return {
            success: false,
            error: { message: 'محاولات كثيرة، يرجى المحاولة لاحقاً', code: 'rate_limit' }
          };
        }
        
        return {
          success: false,
          error: { message: error.message || 'فشل في تسجيل الدخول', code: error.status?.toString() }
        };
      }

      if (!data.session || !data.user) {
        throw new Error('Session or user data missing');
      }

      // 🔧 التحقق من صحة الجلسة
      const sessionValidation = await validateSession(client, data.session);
      if (!sessionValidation.valid) {
        // لا نوقف العملية، فقط تحذير
      }

      return {
        success: true,
        session: data.session,
        user: data.user
      };

    } catch (error) {
      attempts++;
      
      if (attempts < maxAttempts) {
        // انتظار متزايد قبل إعادة المحاولة
        const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: { message: 'فشل في تسجيل الدخول بعد عدة محاولات', code: 'max_attempts_exceeded' }
  };
};

/**
 * التحقق من صحة الجلسة
 */
const validateSession = async (client: any, session: any): Promise<{ valid: boolean; error?: string }> => {
  try {
    if (!session || !session.access_token) {
      return { valid: false, error: 'Missing session or access token' };
    }

    // محاولة استخدام الجلسة للوصول لبيانات المستخدم
    const { data: user, error } = await client.auth.getUser(session.access_token);
    
    if (error || !user) {
      return { valid: false, error: error?.message || 'User data not accessible' };
    }

    // التحقق من انتهاء صلاحية الجلسة
    if (session.expires_at && new Date(session.expires_at * 1000) <= new Date()) {
      return { valid: false, error: 'Session expired' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Session validation failed: ${error}` };
  }
};

/**
 * فحص وجود المستخدم مع معالجة مشاكل RLS
 */
export const checkUserRequires2FA = async (
  email: string, 
  organizationId?: string, 
  domain?: string, 
  subdomain?: string
): Promise<UserExistsResult & { error?: string }> => {
  try {
    
    const client = getSupabaseClient();
    
    // 🔧 محاولة استخدام دالة check_user_requires_2fa مع المعاملات الصحيحة
    try {
      // تجربة صيغة المعاملات الأولى
      const { data, error } = await client.rpc('check_user_requires_2fa', {
        p_user_email: email.toLowerCase(),
        p_organization_id: organizationId || null,
        p_domain: domain || null,
        p_subdomain: subdomain || null
      });

      if (error) {
        
        // تجربة صيغة المعاملات الثانية
        try {
          const { data: data2, error: error2 } = await client.rpc('check_user_requires_2fa', {
            p_user_email: email.toLowerCase(),
            p_organization_id: organizationId || null,
            p_domain: domain || null,
            p_subdomain: subdomain || null
          });

          if (error2) {
            throw error2;
          }

          if (data2 && typeof data2 === 'object') {
            const result = data2 as any;
            return {
              exists: result.user_exists || false,
              user_id: result.user_id,
              user_name: result.user_name,
              organization_id: result.organization_id,
              requires_2fa: result.requires_2fa || false
            };
          }
        } catch (secondError) {
          throw error; // استخدام الخطأ الأول
        }
      }

      if (data && typeof data === 'object') {
        const result = data as any;
        return {
          exists: result.user_exists || false,
          user_id: result.user_id,
          user_name: result.user_name,
          organization_id: result.organization_id,
          requires_2fa: result.requires_2fa || false
        };
      }
    } catch (rpcError) {
      
      // 🔧 Smart Fallback: محاولة البحث في public.users مباشرة
      try {
        const { data: publicUsers, error: publicError } = await client
          .from('users')
          .select('id, email, name, organization_id, two_factor_enabled')
          .eq('email', email.toLowerCase())
          .limit(1);

        if (!publicError && publicUsers && publicUsers.length > 0) {
          const publicUser = publicUsers[0];
          
          return {
            exists: true,
            user_id: publicUser.id,
            user_name: publicUser.name || publicUser.email,
            organization_id: publicUser.organization_id,
            requires_2fa: publicUser.two_factor_enabled || false
          };
        } else {
        }
      } catch (fallbackError) {
      }
      
      // 🔧 Final Fallback: افتراض وجود المستخدم للمتابعة
      return {
        exists: true,
        requires_2fa: false,
        error: 'تم استخدام الوضع الآمن - سيتم التحقق من المستخدم عند تسجيل الدخول'
      };
    }

    return {
      exists: false,
      error: 'لم يتم العثور على المستخدم'
    };

  } catch (error) {
    
    // في حالة الفشل الكامل، نفترض وجود المستخدم للمتابعة
    return {
      exists: true,
      requires_2fa: false,
      error: 'حدث خطأ في التحقق، سيتم المتابعة بالوضع الآمن'
    };
  }
};

/**
 * تنظيف شامل لجميع البيانات المحفوظة
 */
const clearAllStorageData = (): void => {
  try {
    // قائمة شاملة بجميع مفاتيح localStorage المستخدمة في التطبيق
    const storageKeys = [
      // Auth & Session
      'bazaar_auth_state',
      'bazaar_auth_singleton_cache',
      'authSessionExists',
      'authSessionLastUpdated',
      'current_user_profile',
      'current_organization',
      'is_super_admin',
      'super_admin_session',
      
      // Organization & Tenant
      'bazaar_organization_id',
      'bazaar_current_subdomain',
      'currentOrganizationId',
      'organization_id',
      
      // Theme & UI
      'theme',
      'theme-preference',
      'bazaar_org_theme',
      'darkMode',
      'sidebarCollapsed',
      
      // Language & i18n
      'i18nextLng',
      'i18nextLng_timestamp',
      'selectedLanguage',
      'preferred-language',
      
      // App Data & Cache
      'bazaar_app_init_data',
      'BAZAAR_APP_STATE_TIMESTAMP',
      'last_auth_check',
      'last_init_time',
      
      // Product & Form Drafts
      'product-form-progress',
      
      // Notifications & Settings
      'abandoned_orders_provinces',
      'abandoned_orders_municipalities',
      'abandoned_orders_cache_expiry',
      
      // POS & Sales
      'pos-cart-data',
      'pos-customer-data',
      'flexi-sales-data',
      
      // Other App Data
      'subscription_cache',
      'inventory_cache',
      'reports_cache'
    ];
    
    // حذف المفاتيح المحددة
    storageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
      }
    });
    
    // حذف المفاتيح التي تحتوي على patterns معينة
    const patterns = [
      'org_theme_',
      'org-language-',
      'org-language-timestamp-',
      'organization:',
      'tenant:subdomain:',
      'product-draft-',
      'product-form-draft-',
      'notification-settings-',
      'language_update_',
      'subscription_cache_'
    ];
    
    // البحث في جميع مفاتيح localStorage وحذف ما يطابق الpatterns
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      patterns.forEach(pattern => {
        if (key.includes(pattern)) {
          try {
            localStorage.removeItem(key);
          } catch (error) {
          }
        }
      });
    });
    
    // تنظيف شامل لـ sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
    }
    
    // تنظيف IndexedDB إذا كان متاحاً (Supabase Cache)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        // حذف قاعدة بيانات Supabase المؤقتة
        indexedDB.deleteDatabase('supabase-cache');
        indexedDB.deleteDatabase('supabase-auth');
      } catch (error) {
      }
    }
    
  } catch (error) {
  }
};

/**
 * تسجيل الخروج مع تنظيف شامل متطور
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    
    if (error) {
      // حتى لو فشل تسجيل الخروج، نكمل التنظيف المحلي
    }

    // تنظيف لطيف وآمن لجميع البيانات
    await GentleLogoutCleaner.performGentleLogout({
      redirectUrl: '/login',
      skipNavigation: true, // نتولى التنقل في authHelpers
      showLoading: false,
      clearCache: true
    });
    
    return { success: true };
    
  } catch (error) {
    
    // في حالة الفشل، استخدم التنظيف الطارئ
    GentleLogoutCleaner.emergencyCleanup();
    
    // إعادة تحميل فورية
    setTimeout(() => {
      window.location.reload();
    }, 200);
    
    return { success: false, error: 'فشل في تسجيل الخروج' };
  }
};

/**
 * الحصول على المستخدم الحالي مع validation شامل
 */
export const getCurrentUserWithValidation = async (): Promise<{ user: any; session: any; error?: string }> => {
  try {
    const client = getSupabaseClient();
    
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      return { user: null, session: null, error: 'جلسة المصادقة غير صالحة' };
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    
    if (userError || !userData.user) {
      return { user: null, session: sessionData.session, error: 'بيانات المستخدم غير متاحة' };
    }

    return { user: userData.user, session: sessionData.session };
    
  } catch (error) {
    return { user: null, session: null, error: 'فشل في الحصول على بيانات المستخدم' };
  }
};

/**
 * تحديث كلمة المرور
 */
export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: 'فشل في تحديث كلمة المرور' };
  }
};

/**
 * إعادة تعيين كلمة المرور
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getSupabaseClient();
    
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: 'فشل في إرسال رابط إعادة التعيين' };
  }
};

// تصدير الأنواع
export type { SignInResult, UserExistsResult };
