import { supabase } from '../supabase';
import { checkSubdomainAvailability } from './subdomain';

export interface TenantRegistrationData {
  email: string;
  password: string;
  organizationName: string;
  subdomain: string;
  name?: string;
}

interface RegistrationResult {
  success: boolean;
  user?: any;
  organization?: any;
  error?: string;
  details?: any;
}

export async function registerTenant(data: TenantRegistrationData): Promise<RegistrationResult> {

  try {
    // 1. التحقق من توفر النطاق الفرعي
    const subdomainCheck = await checkSubdomainAvailability(data.subdomain);
    
    if (!subdomainCheck.available) {
      return {
        success: false,
        error: 'النطاق الفرعي مستخدم بالفعل',
        details: subdomainCheck
      };
    }

    // 2. إنشاء المستخدم في نظام المصادقة
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name || 'مستخدم جديد'
        }
      }
    });

    if (authError) {
      return {
        success: false,
        error: `فشل في إنشاء المستخدم: ${authError.message}`,
        details: authError
      };
    }

    if (!authUser?.user?.id) {
      return {
        success: false,
        error: 'فشل في إنشاء المستخدم - معرف غير صالح'
      };
    }

    const userId = authUser.user.id;

    // 3. استخدام الوظيفة المحسنة لإنشاء المؤسسة
    
    const { data: orgResult, error: orgError } = await (supabase as any).rpc(
      'create_organization_ultimate',
      {
        p_name: data.organizationName,
        p_subdomain: data.subdomain,
        p_owner_id: userId,
        p_settings: {
          theme: 'light',
          primary_color: '#2563eb',
          default_language: 'ar'
        }
      }
    );

    if (orgError) {
      
      // محاولة تشخيص المشكلة
      try {
        const { data: diagnostic } = await (supabase as any).rpc('diagnose_registration_status', {
          p_user_id: userId,
          p_subdomain: data.subdomain
        });
      } catch (diagError) {
      }
      
      return {
        success: false,
        error: `فشل في إنشاء المؤسسة: ${orgError.message}`,
        details: orgError
      };
    }

    if (!orgResult) {
      return {
        success: false,
        error: 'فشل في إنشاء المؤسسة - معرف غير صالح'
      };
    }

    const organizationId = orgResult;

    // 4. التحقق من إكمال العملية
    
    // فحص المستخدم في جدول users
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('id, auth_user_id, organization_id, role, is_org_admin')
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
    }

    // فحص المؤسسة
    const { data: orgCheck, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id, name, subdomain, owner_id')
      .eq('subdomain', data.subdomain)
      .single();

    if (orgCheckError) {
    }

    // 5. تسجيل النتيجة النهائية
    const result = {
      success: true,
      user: {
        id: userId,
        email: data.email,
        name: data.name,
        ...userCheck
      },
      organization: {
        id: organizationId,
        name: data.organizationName,
        subdomain: data.subdomain,
        ...orgCheck
      }
    };

    return result;

  } catch (error) {
    return {
      success: false,
      error: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      details: error
    };
  }
}

// وظيفة مساعدة للتشخيص
export async function diagnoseTenantRegistration(userId?: string, subdomain?: string) {
  try {
    const { data, error } = await (supabase as any).rpc('diagnose_registration_status', {
      p_user_id: userId || null,
      p_subdomain: subdomain || null
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

// وظيفة لإصلاح تسجيل معلق
export async function fixPendingRegistration(userId: string, organizationName: string, subdomain: string) {
  try {
    
    const { data: orgId, error } = await (supabase as any).rpc('create_organization_ultimate', {
      p_name: organizationName,
      p_subdomain: subdomain,
      p_owner_id: userId,
      p_settings: {
        theme: 'light',
        primary_color: '#2563eb',
        default_language: 'ar'
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, organizationId: orgId };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}
