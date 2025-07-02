import { supabase } from '@/lib/supabase';

/**
 * نتيجة إصلاح المستخدم
 */
interface FixUserResult {
  success: boolean;
  action: 'fixed' | 'already_fixed' | 'not_found' | 'error';
  message: string;
  user_id?: string;
  email: string;
}

/**
 * إصلاح مستخدم محدد باستخدام دالة قاعدة البيانات
 */
export async function fixUserAuthId(email: string): Promise<FixUserResult> {
  try {
    // الحصول على المستخدم المصادق عليه أولاً
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      return {
        success: false,
        action: 'error',
        message: 'المستخدم غير مصادق عليه',
        email
      };
    }

    // إصلاح auth_user_id
    const { data, error } = await supabase
      .from('users')
      .update({ 
        auth_user_id: authData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .is('auth_user_id', null)
      .select('id, email, auth_user_id');

    if (error) {
      return {
        success: false,
        action: 'error',
        message: `خطأ في الإصلاح: ${error.message}`,
        email
      };
    }

    if (data && data.length > 0) {
      return {
        success: true,
        action: 'fixed',
        message: 'تم إصلاح المستخدم بنجاح',
        user_id: data[0].id,
        email
      };
    }

    return {
      success: true,
      action: 'already_fixed',
      message: 'المستخدم محدث بالفعل أو غير موجود',
      email
    };

  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      email
    };
  }
}

/**
 * إصلاح جميع المستخدمين الذين لديهم مشاكل
 */
export async function fixAllUsersAuthId(): Promise<{
  success: boolean;
  fixed_count: number;
  errors: string[];
}> {
  try {
    // الحصول على جميع المستخدمين الذين لديهم auth_user_id = null
    const { data: brokenUsers, error: fetchError } = await supabase
      .from('users')
      .select('email')
      .is('auth_user_id', null);

    if (fetchError) {
      return {
        success: false,
        fixed_count: 0,
        errors: [`خطأ في جلب المستخدمين: ${fetchError.message}`]
      };
    }

    if (!brokenUsers || brokenUsers.length === 0) {
      return {
        success: true,
        fixed_count: 0,
        errors: []
      };
    }

    let fixed_count = 0;
    const errors: string[] = [];

    // إصلاح كل مستخدم على حدة
    for (const user of brokenUsers) {
      try {
        const result = await fixUserAuthId(user.email);
        if (result.success && result.action === 'fixed') {
          fixed_count++;
        } else if (!result.success) {
          errors.push(`فشل إصلاح ${user.email}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`خطأ في إصلاح ${user.email}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }

    return {
      success: true,
      fixed_count,
      errors
    };

  } catch (error) {
    return {
      success: false,
      fixed_count: 0,
      errors: [`خطأ عام: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`]
    };
  }
}

/**
 * فحص حالة المستخدم وإصلاحه إذا لزم الأمر
 */
export async function checkAndFixCurrentUser(): Promise<FixUserResult> {
  try {
    // الحصول على المستخدم الحالي
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user || !authData.user.email) {
      return {
        success: false,
        action: 'error',
        message: 'المستخدم غير مصادق عليه',
        email: ''
      };
    }

    // فحص وإصلاح المستخدم
    return await fixUserAuthId(authData.user.email);

  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: `خطأ في فحص المستخدم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      email: ''
    };
  }
}

/**
 * إصلاح سريع للمستخدم الحالي مع إعادة تحميل الصفحة
 */
export async function quickFixCurrentUser(): Promise<boolean> {
  try {
    const result = await checkAndFixCurrentUser();
    
    if (result.success && result.action === 'fixed') {
      // إعادة تحميل الصفحة بعد الإصلاح
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return true;
    }
    
    return result.success;
  } catch (error) {
    return false;
  }
}

/**
 * إصلاح باستخدام SQL مباشر (للحالات الطارئة)
 */
export async function emergencyFixUser(email: string): Promise<boolean> {
  try {
    // إصلاح مباشر باستخدام UPDATE
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        auth_user_id: authData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .is('auth_user_id', null);
    
    if (updateError) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
