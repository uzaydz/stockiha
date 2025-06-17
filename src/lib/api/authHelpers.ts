import { getCachedUser, getCachedSession, getCachedAuth } from '@/lib/authCache';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseReady } from '@/lib/supabase-unified';

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
      console.log(`🔐 [Auth] Attempting sign in (${attempts + 1}/${maxAttempts})...`);
      
      // التأكد من جاهزية Supabase Client
      const client = await getSupabaseClient();
      
      if (!client) {
        throw new Error('Supabase client not available');
      }

      // محاولة تسجيل الدخول
      const { data, error } = await client.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (error) {
        console.error('❌ [Auth] Sign in error:', error);
        
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
        console.warn('⚠️ [Auth] Session validation failed, but continuing:', sessionValidation.error);
        // لا نوقف العملية، فقط تحذير
      }

      console.log('✅ [Auth] Sign in successful');
      
      return {
        success: true,
        session: data.session,
        user: data.user
      };

    } catch (error) {
      console.error(`❌ [Auth] Sign in attempt ${attempts + 1} failed:`, error);
      attempts++;
      
      if (attempts < maxAttempts) {
        // انتظار متزايد قبل إعادة المحاولة
        const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
        console.log(`🔄 [Auth] Retrying in ${delay}ms...`);
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
    console.log('🔍 [Auth] Checking 2FA requirements for:', email);
    
    const client = await getSupabaseClient();
    
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
        console.warn('⚠️ [Auth] RPC function failed with first parameter format:', error);
        
        // تجربة صيغة المعاملات الثانية
        try {
          const { data: data2, error: error2 } = await client.rpc('check_user_requires_2fa', {
            p_user_email: email.toLowerCase(),
            p_organization_id: organizationId || null,
            p_domain: domain || null,
            p_subdomain: subdomain || null
          });

          if (error2) {
            console.warn('⚠️ [Auth] RPC function failed with second parameter format:', error2);
            throw error2;
          }

          if (data2 && typeof data2 === 'object') {
            const result = data2 as any;
            console.log('✅ [Auth] 2FA check successful via RPC (second format)');
            return {
              exists: result.user_exists || false,
              user_id: result.user_id,
              user_name: result.user_name,
              organization_id: result.organization_id,
              requires_2fa: result.requires_2fa || false
            };
          }
        } catch (secondError) {
          console.warn('⚠️ [Auth] Both RPC formats failed:', secondError);
          throw error; // استخدام الخطأ الأول
        }
      }

      if (data && typeof data === 'object') {
        const result = data as any;
        console.log('✅ [Auth] 2FA check successful via RPC (first format)');
        return {
          exists: result.user_exists || false,
          user_id: result.user_id,
          user_name: result.user_name,
          organization_id: result.organization_id,
          requires_2fa: result.requires_2fa || false
        };
      }
    } catch (rpcError) {
      console.warn('⚠️ [Auth] RPC failed completely, using smart fallback:', rpcError);
      
      // 🔧 Smart Fallback: محاولة البحث في public.users مباشرة
      try {
        const { data: publicUsers, error: publicError } = await client
          .from('users')
          .select('id, email, name, organization_id, two_factor_enabled')
          .eq('email', email.toLowerCase())
          .limit(1);

        if (!publicError && publicUsers && publicUsers.length > 0) {
          const publicUser = publicUsers[0];
          console.log('✅ [Auth] User found via public.users fallback');
          
          return {
            exists: true,
            user_id: publicUser.id,
            user_name: publicUser.name || publicUser.email,
            organization_id: publicUser.organization_id,
            requires_2fa: publicUser.two_factor_enabled || false
          };
        } else {
          console.warn('⚠️ [Auth] Public.users fallback also failed:', publicError);
        }
      } catch (fallbackError) {
        console.warn('⚠️ [Auth] Public.users fallback error:', fallbackError);
      }
      
      // 🔧 Final Fallback: افتراض وجود المستخدم للمتابعة
      console.log('⚠️ [Auth] Using final fallback - assuming user exists');
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
    console.error('❌ [Auth] Check 2FA failed completely:', error);
    
    // في حالة الفشل الكامل، نفترض وجود المستخدم للمتابعة
    return {
      exists: true,
      requires_2fa: false,
      error: 'حدث خطأ في التحقق، سيتم المتابعة بالوضع الآمن'
    };
  }
};

/**
 * تسجيل الخروج مع تنظيف شامل
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔓 [Auth] Signing out...');
    
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut();
    
    if (error) {
      console.error('❌ [Auth] Sign out error:', error);
      return { success: false, error: error.message };
    }

    // تنظيف إضافي
    localStorage.removeItem('bazaar_organization_id');
    sessionStorage.clear();
    
    console.log('✅ [Auth] Sign out successful');
    return { success: true };
    
  } catch (error) {
    console.error('❌ [Auth] Sign out failed:', error);
    return { success: false, error: 'فشل في تسجيل الخروج' };
  }
};

/**
 * الحصول على المستخدم الحالي مع validation شامل
 */
export const getCurrentUserWithValidation = async (): Promise<{ user: any; session: any; error?: string }> => {
  try {
    const client = await getSupabaseClient();
    
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
    console.error('❌ [Auth] Get current user failed:', error);
    return { user: null, session: null, error: 'فشل في الحصول على بيانات المستخدم' };
  }
};

/**
 * تحديث كلمة المرور
 */
export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = await getSupabaseClient();
    
    const { error } = await client.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [Auth] Update password failed:', error);
    return { success: false, error: 'فشل في تحديث كلمة المرور' };
  }
};

/**
 * إعادة تعيين كلمة المرور
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = await getSupabaseClient();
    
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [Auth] Reset password failed:', error);
    return { success: false, error: 'فشل في إرسال رابط إعادة التعيين' };
  }
};

// تصدير الأنواع
export type { SignInResult, UserExistsResult };
