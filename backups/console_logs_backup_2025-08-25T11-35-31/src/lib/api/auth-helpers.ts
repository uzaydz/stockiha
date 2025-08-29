// دوال مساعدة للمصادقة وضمان ربط المستخدم بالمؤسسة الصحيحة
import { supabase } from '@/lib/supabase';
import { repairUserAuthLink } from './auth-repair';

// Cache للحماية من الطلبات المكررة
const userLinkCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 10000; // 10 ثواني

/**
 * دالة لضمان ربط المستخدم المصادق بالمؤسسة الصحيحة
 * يتم استدعاؤها بعد تسجيل الدخول الناجح
 * تتضمن آلية إعادة المحاولة لحل مشاكل التوقيت
 */
export const ensureUserOrganizationLink = async (
  authUserId: string, 
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<{
  success: boolean;
  organizationId?: string;
  error?: string;
}> => {
  // فحص الـ cache أولاً لتجنب الطلبات المكررة
  const cached = userLinkCache.get(authUserId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [ensureUserOrganizationLink] استخدام النتيجة المخزنة مؤقتاً');
    }
    return cached.result;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 [ensureUserOrganizationLink] المحاولة ${attempt}/${maxRetries} للتحقق من ربط المستخدم:`, authUserId);
      }

    // البحث عن المستخدم في قاعدة البيانات
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role, email, is_active')
      .or(`id.eq.${authUserId},auth_user_id.eq.${authUserId}`)
      .single();

    if (userError) {
      console.error('❌ [ensureUserOrganizationLink] خطأ في جلب بيانات المستخدم:', userError);
      
      // في حالة عدم وجود المستخدم، محاولة إصلاح ربط المصادقة
      if (userError.code === 'PGRST116' || userError.message?.includes('No rows')) {
        console.log('🔧 [ensureUserOrganizationLink] محاولة إصلاح ربط المصادقة');
        
        const repairResult = await repairUserAuthLink();
        
        if (repairResult.success && repairResult.userFound) {
          console.log('✅ [ensureUserOrganizationLink] تم إصلاح ربط المصادقة، إعادة المحاولة');
          return await ensureUserOrganizationLink(repairResult.userFound.id);
        } else {
          return {
            success: false,
            error: repairResult.error || 'فشل في إصلاح ربط المصادقة'
          };
        }
      }
      
      return {
        success: false,
        error: 'لم يتم العثور على بيانات المستخدم في النظام'
      };
    }

    if (!userData.is_active) {
      return {
        success: false,
        error: 'حسابك غير نشط. يرجى التواصل مع المسؤول'
      };
    }

    if (!userData.organization_id) {
      console.error('❌ [ensureUserOrganizationLink] المستخدم غير مرتبط بأي مؤسسة');
      return {
        success: false,
        error: 'حسابك غير مرتبط بأي مؤسسة. يرجى التواصل مع المسؤول'
      };
    }

    // التحقق من وجود المؤسسة
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', userData.organization_id)
      .single();

    if (orgError || !orgData) {
      console.error('❌ [ensureUserOrganizationLink] المؤسسة غير موجودة:', orgError);
      return {
        success: false,
        error: 'المؤسسة المرتبطة بحسابك غير موجودة'
      };
    }

    // تحديث بيانات المصادقة لتضمين معرف المؤسسة
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        organization_id: userData.organization_id,
        role: userData.role,
        organization_name: orgData.name
      }
    });

    if (updateError) {
      console.warn('⚠️ [ensureUserOrganizationLink] فشل تحديث البيانات الوصفية:', updateError);
      // لا نفشل العملية بسبب هذا
    }

    // تحديث التخزين المحلي
    localStorage.setItem('organizationId', userData.organization_id);
    localStorage.setItem('bazaar_organization_id', userData.organization_id);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [ensureUserOrganizationLink] تم ربط المستخدم بالمؤسسة بنجاح:', {
        userId: userData.id,
        organizationId: userData.organization_id,
        organizationName: orgData.name,
        role: userData.role
      });
    }

      // تحديث user metadata في Supabase Auth لضمان توفر الصلاحيات
      const { error: updateMetadataError } = await supabase.auth.updateUser({
        data: {
          organization_id: userData.organization_id,
          role: userData.role,
          permissions: userData.permissions || {},
          is_active: userData.is_active,
          employee_id: userData.id
        }
      });

      if (updateMetadataError) {
        console.warn('⚠️ [ensureUserOrganizationLink] فشل تحديث البيانات الوصفية:', updateMetadataError);
      } else {
        console.log('✅ [ensureUserOrganizationLink] تم تحديث user metadata بالصلاحيات');
      }

      const result = {
        success: true,
        organizationId: userData.organization_id
      };
      
      // تخزين النتيجة في Cache لتجنب الطلبات المكررة
      userLinkCache.set(authUserId, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error(`❌ [ensureUserOrganizationLink] خطأ في المحاولة ${attempt}:`, error);
      
      // إذا كانت هذه المحاولة الأخيرة، إرجاع الخطأ
      if (attempt === maxRetries) {
        return {
          success: false,
          error: 'حدث خطأ أثناء التحقق من بيانات المؤسسة'
        };
      }
      
      // انتظار قبل المحاولة التالية
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏳ [ensureUserOrganizationLink] انتظار ${retryDelay}ms قبل المحاولة التالية`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // إذا وصلنا هنا، فقد فشلت جميع المحاولات
  return {
    success: false,
    error: 'فشل في التحقق من بيانات المؤسسة بعد عدة محاولات'
  };
};

/**
 * دالة للتحقق من حالة المستخدم قبل السماح بالوصول
 */
export const validateUserAccess = async (authUserId: string): Promise<{
  canAccess: boolean;
  redirectTo?: string;
  error?: string;
  organizationId?: string;
}> => {
  const linkResult = await ensureUserOrganizationLink(authUserId);
  
  if (!linkResult.success) {
    // إذا كان المستخدم غير مرتبط بمؤسسة، وجهه لإنشاء مؤسسة
    if (linkResult.error?.includes('غير مرتبط بأي مؤسسة')) {
      return {
        canAccess: false,
        redirectTo: '/setup-organization',
        error: linkResult.error,
      };
    }
    
    return {
      canAccess: false,
      error: linkResult.error,
    };
  }

  return {
    canAccess: true,
    organizationId: linkResult.organizationId,
  };
};

/**
 * دالة لمعالجة callback المصادقة وضمان ربط صحيح
 */
export const handleAuthCallback = async (): Promise<{
  success: boolean;
  redirectTo?: string;
  error?: string;
}> => {
  try {
    // جلب بيانات الجلسة الحالية
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session?.user) {
      return {
        success: false,
        error: 'فشل في الحصول على بيانات الجلسة'
      };
    }

    const authUser = sessionData.session.user;
    
    // التحقق من إمكانية الوصول
    const accessResult = await validateUserAccess(authUser.id);
    
    if (!accessResult.canAccess) {
      return {
        success: false,
        redirectTo: accessResult.redirectTo || '/login',
        error: accessResult.error
      };
    }

    // كل شيء جيد، اذهب للوحة التحكم
    return {
      success: true,
      redirectTo: '/dashboard'
    };

  } catch (error) {
    console.error('❌ [handleAuthCallback] خطأ عام:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء معالجة تسجيل الدخول'
    };
  }
};
