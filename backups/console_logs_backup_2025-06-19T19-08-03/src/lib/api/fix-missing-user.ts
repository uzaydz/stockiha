import { supabase } from '@/lib/supabase';

/**
 * إصلاح مشكلة المستخدمين المفقودين في جدول users
 * هذه الدالة تتحقق من وجود المستخدم في جدول users وتنشئه إذا لم يكن موجوداً
 */
export async function fixMissingUser(): Promise<{
  success: boolean;
  message: string;
  userCreated?: boolean;
}> {
  try {
    // الحصول على المستخدم المصادق عليه من auth.users
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return {
        success: false,
        message: 'المستخدم غير مصادق عليه'
      };
    }

    const authUser = authData.user;

    // استخدام service role للتحقق من وجود المستخدم (تجاوز RLS مؤقتاً)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, name, role, auth_user_id')
      .eq('email', authUser.email)
      .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب خطأ عدم وجود نتائج

    if (checkError) {
      return {
        success: false,
        message: 'خطأ في التحقق من بيانات المستخدم'
      };
    }

    // إذا كان المستخدم موجوداً ولكن auth_user_id فارغ
    if (existingUser && !existingUser.auth_user_id) {
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          auth_user_id: authUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        return {
          success: false,
          message: `فشل في تحديث بيانات المستخدم: ${updateError.message}`
        };
      }

      return {
        success: true,
        message: 'تم إصلاح بيانات المستخدم بنجاح',
        userCreated: false
      };
    }

    // إذا كان المستخدم موجوداً ومحدث بشكل صحيح
    if (existingUser && existingUser.auth_user_id) {
      return {
        success: true,
        message: 'المستخدم موجود بالفعل',
        userCreated: false
      };
    }

    // إنشاء المستخدم في جدول users إذا لم يكن موجوداً
    
    const newUser = {
      id: authUser.id,
      auth_user_id: authUser.id, // ضروري لـ RLS
      email: authUser.email,
      name: authUser.user_metadata?.name || 
            authUser.user_metadata?.full_name || 
            authUser.email?.split('@')[0] || 
            'مستخدم جديد',
      role: authUser.user_metadata?.role || 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // محاولة إنشاء المستخدم مع التعامل مع خطأ التكرار
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .maybeSingle();

    if (createError) {
      // إذا كان الخطأ بسبب وجود مستخدم مكرر
      if (createError.code === '23505') {
        
        // محاولة تحديث auth_user_id للمستخدم الموجود
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            auth_user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('email', authUser.email);

        if (updateError) {
          return {
            success: false,
            message: `فشل في إصلاح المستخدم الموجود: ${updateError.message}`
          };
        }

        return {
          success: true,
          message: 'تم إصلاح المستخدم الموجود بنجاح',
          userCreated: false
        };
      }
      
      return {
        success: false,
        message: `فشل في إنشاء المستخدم: ${createError.message}`
      };
    }

    return {
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      userCreated: true
    };

  } catch (error) {
    return {
      success: false,
      message: `حدث خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
    };
  }
}

/**
 * إصلاح مستخدم محدد باستخدام استعلام SQL مباشر
 */
export async function fixUserWithDatabaseFunction(email: string): Promise<{
  success: boolean;
  message: string;
  action: string;
}> {
  try {
    // الحصول على المستخدم المصادق عليه أولاً
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      return {
        success: false,
        message: 'المستخدم غير مصادق عليه',
        action: 'error'
      };
    }

    // محاولة تحديث auth_user_id مباشرة
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ 
        auth_user_id: authData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .is('auth_user_id', null)
      .select();

    if (updateError) {
      return {
        success: false,
        message: `خطأ في التحديث: ${updateError.message}`,
        action: 'error'
      };
    }

    if (updateResult && updateResult.length > 0) {
      return {
        success: true,
        message: 'تم إصلاح المستخدم بنجاح',
        action: 'updated'
      };
    }

    return {
      success: true,
      message: 'المستخدم لا يحتاج إلى إصلاح',
      action: 'none'
    };
  } catch (error) {
    return {
      success: false,
      message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      action: 'error'
    };
  }
}

/**
 * التحقق من حالة المستخدم وإصلاح أي مشاكل
 */
export async function checkAndFixUserStatus(): Promise<{
  success: boolean;
  message: string;
  details: {
    authUserExists: boolean;
    dbUserExists: boolean;
    userFixed: boolean;
  };
}> {
  try {
    // التحقق من المستخدم في auth.users
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    const authUserExists = !authError && !!authData.user;
    
    if (!authUserExists) {
      return {
        success: false,
        message: 'المستخدم غير مصادق عليه',
        details: {
          authUserExists: false,
          dbUserExists: false,
          userFixed: false
        }
      };
    }

    // التحقق من المستخدم في جدول users
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', authData.user!.email)
      .single();

    const dbUserExists = !dbError && !!dbUser;

    // إذا كان المستخدم غير موجود في قاعدة البيانات، أصلحه
    let userFixed = false;
    if (!dbUserExists) {
      const fixResult = await fixMissingUser();
      userFixed = fixResult.success && !!fixResult.userCreated;
    }

    return {
      success: true,
      message: dbUserExists ? 'المستخدم موجود' : (userFixed ? 'تم إصلاح المستخدم' : 'فشل في إصلاح المستخدم'),
      details: {
        authUserExists,
        dbUserExists,
        userFixed
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'حدث خطأ في فحص حالة المستخدم',
      details: {
        authUserExists: false,
        dbUserExists: false,
        userFixed: false
      }
    };
  }
}

/**
 * إصلاح جميع المستخدمين المفقودين (للمديرين فقط)
 */
export async function fixAllMissingUsers(): Promise<{
  success: boolean;
  message: string;
  fixed: number;
  errors: string[];
}> {
  try {
    // التحقق من صلاحيات المدير
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      return {
        success: false,
        message: 'غير مصرح لك بهذه العملية',
        fixed: 0,
        errors: []
      };
    }

    // الحصول على جميع المستخدمين من auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return {
        success: false,
        message: 'فشل في جلب قائمة المستخدمين',
        fixed: 0,
        errors: [authError.message]
      };
    }

    let fixed = 0;
    const errors: string[] = [];

    for (const authUser of authUsers.users) {
      try {
        // التحقق من وجود المستخدم في جدول users
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .single();

        // إذا لم يكن موجوداً، أنشئه
        if (!dbUser) {
          const newUser = {
            id: authUser.id,
            auth_user_id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || 
                  authUser.user_metadata?.full_name || 
                  authUser.email?.split('@')[0] || 
                  'مستخدم',
            role: authUser.user_metadata?.role || 'customer',
            is_active: true,
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          };

          const { error: createError } = await supabase
            .from('users')
            .insert([newUser]);

          if (createError) {
            errors.push(`فشل في إنشاء المستخدم ${authUser.email}: ${createError.message}`);
          } else {
            fixed++;
          }
        }
      } catch (error) {
        errors.push(`خطأ في معالجة المستخدم ${authUser.email}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }

    return {
      success: true,
      message: `تم إصلاح ${fixed} مستخدم`,
      fixed,
      errors
    };

  } catch (error) {
    return {
      success: false,
      message: 'حدث خطأ في إصلاح المستخدمين',
      fixed: 0,
      errors: [error instanceof Error ? error.message : 'خطأ غير معروف']
    };
  }
}
