// دوال إصلاح مشاكل المصادقة وربط المستخدمين
import { supabase } from '@/lib/supabase';

/**
 * إصلاح ربط المستخدم عندما يكون معرف المصادقة لا يطابق سجل قاعدة البيانات
 */
export const repairUserAuthLink = async (): Promise<{
  success: boolean;
  error?: string;
  userFound?: any;
}> => {
  try {

    // الحصول على المستخدم الحالي من المصادقة
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return {
        success: false,
        error: 'لا توجد جلسة مصادقة نشطة'
      };
    }

    // البحث عن المستخدم في قاعدة البيانات باستخدام البريد الإلكتروني
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (emailError) {
      
      // محاولة البحث بالبريد الإلكتروني مع تجاهل حساسية الأحرف
      const { data: usersByEmailInsensitive, error: insensitiveError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', authUser.email)
        .limit(1);

      if (!insensitiveError && usersByEmailInsensitive && usersByEmailInsensitive.length > 0) {
        const foundUser = usersByEmailInsensitive[0];
        
        // تحديث البريد الإلكتروني ومعرف المصادقة
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: authUser.email, // توحيد البريد الإلكتروني
            auth_user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', foundUser.id);

        if (updateError) {
        } else {
          return {
            success: true,
            userFound: { ...foundUser, email: authUser.email, auth_user_id: authUser.id }
          };
        }
      }
      
      // محاولة البحث عن أي مستخدم بنفس الاسم (للحالات الخاصة)
      const name = authUser.user_metadata?.name || authUser.email?.split('@')[0];
      if (name) {
        const { data: usersByName, error: nameError } = await supabase
          .from('users')
          .select('*')
          .ilike('name', `%${name}%`)
          .limit(5);

        if (!nameError && usersByName && usersByName.length > 0) {
          
          // اختيار أحدث مستخدم بنفس الاسم
          const latestUser = usersByName.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          // تحديث البريد الإلكتروني ومعرف المصادقة
          const { error: updateError } = await supabase
            .from('users')
            .update({
              email: authUser.email,
              auth_user_id: authUser.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', latestUser.id);

          if (updateError) {
            return {
              success: false,
              error: 'فشل في ربط الحساب'
            };
          }

          return {
            success: true,
            userFound: { ...latestUser, email: authUser.email, auth_user_id: authUser.id }
          };
        }
      }
      
      return {
        success: false,
        error: 'المستخدم غير موجود في النظام'
      };
    }

    // إذا وُجد المستخدم، تحديث معرف المصادقة إذا كان مختلفاً
    if (userByEmail.auth_user_id !== authUser.id) {
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          auth_user_id: authUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userByEmail.id);

      if (updateError) {
        return {
          success: false,
          error: 'فشل في تحديث ربط المصادقة'
        };
      }
    }

    return {
      success: true,
      userFound: { ...userByEmail, auth_user_id: authUser.id }
    };

  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ أثناء إصلاح ربط المصادقة'
    };
  }
};

/**
 * دالة للتحقق من المشاكل الشائعة في المصادقة وإصلاحها
 */
export const diagnosePage = async (): Promise<{
  issues: string[];
  fixes: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const fixes: string[] = [];
  const recommendations: string[] = [];

  try {
    // التحقق من جلسة المصادقة
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      issues.push('لا توجد جلسة مصادقة نشطة');
      recommendations.push('تسجيل الدخول مرة أخرى');
      return { issues, fixes, recommendations };
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${authUser.id},auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .limit(5);

    if (userError) {
      issues.push('خطأ في الوصول لقاعدة البيانات');
      recommendations.push('التحقق من صلاحيات قاعدة البيانات');
    } else if (!userData || userData.length === 0) {
      issues.push('المستخدم غير موجود في قاعدة البيانات');
      recommendations.push('إنشاء حساب جديد أو التواصل مع المسؤول');
    } else {
      const user = userData[0];
      
      // التحقق من معرف المصادقة
      if (user.auth_user_id !== authUser.id) {
        issues.push('معرف المصادقة لا يطابق سجل قاعدة البيانات');
        fixes.push('تحديث معرف المصادقة في قاعدة البيانات');
      }
      
      // التحقق من ربط المؤسسة
      if (!user.organization_id) {
        issues.push('المستخدم غير مرتبط بأي مؤسسة');
        recommendations.push('ربط المستخدم بمؤسسة أو إنشاء مؤسسة جديدة');
      }
      
      // التحقق من حالة النشاط
      if (!user.is_active) {
        issues.push('الحساب غير نشط');
        recommendations.push('تفعيل الحساب عبر المسؤول');
      }
    }

  } catch (error) {
    issues.push('خطأ عام في التشخيص');
  }

  return { issues, fixes, recommendations };
};
