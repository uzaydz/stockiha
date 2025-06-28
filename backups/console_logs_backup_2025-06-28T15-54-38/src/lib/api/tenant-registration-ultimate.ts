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
  console.log('🚀 [ULTIMATE] بدء عملية تسجيل المستأجر:', {
    email: data.email,
    organizationName: data.organizationName,
    subdomain: data.subdomain,
    name: data.name
  });

  try {
    // 1. التحقق من توفر النطاق الفرعي
    console.log('🔍 [ULTIMATE] فحص توفر النطاق الفرعي:', data.subdomain);
    const subdomainCheck = await checkSubdomainAvailability(data.subdomain);
    
    if (!subdomainCheck.available) {
      console.error('❌ [ULTIMATE] النطاق الفرعي غير متوفر:', subdomainCheck);
      return {
        success: false,
        error: 'النطاق الفرعي مستخدم بالفعل',
        details: subdomainCheck
      };
    }
    
    console.log('✅ [ULTIMATE] النطاق الفرعي متوفر');

    // 2. إنشاء المستخدم في نظام المصادقة
    console.log('👤 [ULTIMATE] إنشاء المستخدم في auth.users...');
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
      console.error('❌ [ULTIMATE] خطأ في إنشاء المستخدم:', authError);
      return {
        success: false,
        error: `فشل في إنشاء المستخدم: ${authError.message}`,
        details: authError
      };
    }

    if (!authUser?.user?.id) {
      console.error('❌ [ULTIMATE] لم يتم إنشاء المستخدم بشكل صحيح');
      return {
        success: false,
        error: 'فشل في إنشاء المستخدم - معرف غير صالح'
      };
    }

    const userId = authUser.user.id;
    console.log('✅ [ULTIMATE] تم إنشاء المستخدم بنجاح:', userId);

    // 3. استخدام الوظيفة المحسنة لإنشاء المؤسسة
    console.log('🏢 [ULTIMATE] إنشاء المؤسسة باستخدام create_organization_ultimate...');
    
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
      console.error('❌ [ULTIMATE] خطأ في إنشاء المؤسسة:', orgError);
      
      // محاولة تشخيص المشكلة
      try {
        const { data: diagnostic } = await (supabase as any).rpc('diagnose_registration_status', {
          p_user_id: userId,
          p_subdomain: data.subdomain
        });
        console.log('🔍 [ULTIMATE] تشخيص المشكلة:', diagnostic);
      } catch (diagError) {
        console.warn('⚠️ [ULTIMATE] فشل في التشخيص:', diagError);
      }
      
      return {
        success: false,
        error: `فشل في إنشاء المؤسسة: ${orgError.message}`,
        details: orgError
      };
    }

    if (!orgResult) {
      console.error('❌ [ULTIMATE] لم يتم إرجاع معرف المؤسسة');
      return {
        success: false,
        error: 'فشل في إنشاء المؤسسة - معرف غير صالح'
      };
    }

    const organizationId = orgResult;
    console.log('✅ [ULTIMATE] تم إنشاء المؤسسة بنجاح:', organizationId);

    // 4. التحقق من إكمال العملية
    console.log('🔍 [ULTIMATE] التحقق من إكمال التسجيل...');
    
    // فحص المستخدم في جدول users
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('id, auth_user_id, organization_id, role, is_org_admin')
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.warn('⚠️ [ULTIMATE] تحذير في فحص المستخدم:', userCheckError);
    }

    // فحص المؤسسة
    const { data: orgCheck, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id, name, subdomain, owner_id')
      .eq('subdomain', data.subdomain)
      .single();

    if (orgCheckError) {
      console.warn('⚠️ [ULTIMATE] تحذير في فحص المؤسسة:', orgCheckError);
    }

    console.log('📊 [ULTIMATE] نتائج الفحص:', {
      userInUsersTable: !!userCheck,
      userOrgId: userCheck?.organization_id,
      organizationExists: !!orgCheck,
      organizationId: orgCheck?.id
    });

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

    console.log('🎉 [ULTIMATE] تم إكمال التسجيل بنجاح!', result);
    return result;

  } catch (error) {
    console.error('❌ [ULTIMATE] خطأ عام في التسجيل:', error);
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
      console.error('❌ خطأ في التشخيص:', error);
      return { success: false, error: error.message };
    }

    console.log('🔍 نتائج التشخيص:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ خطأ عام في التشخيص:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}

// وظيفة لإصلاح تسجيل معلق
export async function fixPendingRegistration(userId: string, organizationName: string, subdomain: string) {
  try {
    console.log('🔧 محاولة إصلاح التسجيل المعلق للمستخدم:', userId);
    
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
      console.error('❌ فشل في إصلاح التسجيل:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ تم إصلاح التسجيل بنجاح، معرف المؤسسة:', orgId);
    return { success: true, organizationId: orgId };
    
  } catch (error) {
    console.error('❌ خطأ عام في إصلاح التسجيل:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
} 