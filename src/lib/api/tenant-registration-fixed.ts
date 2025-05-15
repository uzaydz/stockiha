import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TenantRegistrationData } from './tenant-types';
import { createOrganizationSafe } from './organization-creation-fixed';

/**
 * استكمال عملية تسجيل المستأجر بعد إنشاء المنظمة
 * نسخة محسنة من الوظيفة
 */
export const continueWithOrganization = async (
  organizationId: string,
  userId: string,
  data: TenantRegistrationData,
  trialPlan: any,
  trialEndDate: Date
): Promise<{
  success: boolean;
  error: Error | null;
  tenantId?: string;
  organizationId?: string;
}> => {
  try {
    // إنشاء سجل اشتراك تجريبي إذا تم العثور على خطة تجريبية
    if (trialPlan) {
      try {
        const { error: subError } = await supabaseAdmin
          .from('organization_subscriptions')
          .insert({
            organization_id: organizationId,
            plan_id: trialPlan.id,
            status: 'trial',
            billing_cycle: 'monthly',
            start_date: new Date().toISOString(),
            end_date: trialEndDate.toISOString(),
            amount_paid: 0,
            currency: 'DZD',
            payment_method: 'free_trial',
            is_auto_renew: false
          });

        if (subError) {
          console.error('خطأ غير حرج في إنشاء الاشتراك التجريبي:', subError);
        }
      } catch (subCreateError) {
        console.error('استثناء غير حرج في إنشاء الاشتراك:', subCreateError);
      }
    }

    // إنشاء أو تحديث سجل المستخدم المسؤول مع الصلاحيات الكاملة
    const adminPermissions = {
      manageProducts: true,
      manageServices: true,
      manageOrders: true,
      manageUsers: true,
      manageEmployees: true,
      viewReports: true,
      accessPOS: true,
      processPayments: true
    };

    const userData = {
      id: userId,
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      role: 'admin',
      permissions: adminPermissions,
      is_active: true,
      organization_id: organizationId,
      is_org_admin: true
    };
    
    

    // استخدام upsert بدلاً من insert لتجنب الأخطاء
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userData, { onConflict: 'id' });

    if (userError) {
      console.error('خطأ في إنشاء/تحديث سجل المستخدم المستأجر:', userError);
      return { success: false, error: userError };
    }

    return {
      success: true,
      error: null,
      tenantId: userId,
      organizationId: organizationId
    };
  } catch (error) {
    console.error('خطأ في استكمال إعداد المنظمة:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * إنشاء مستأجر (مسؤول) جديد مع نطاق فرعي - نسخة محسنة
 */
export const registerTenant = async (data: TenantRegistrationData): Promise<{
  success: boolean;
  error: Error | null;
  tenantId?: string;
  organizationId?: string;
}> => {
  try {
    // التحقق من توفر النطاق الفرعي
    const { data: subdomainCheck, error: subdomainError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', data.subdomain)
      .maybeSingle();

    if (subdomainError) {
      console.error('خطأ في التحقق من توفر النطاق الفرعي:', subdomainError);
      return { success: false, error: subdomainError };
    }

    if (subdomainCheck) {
      return { 
        success: false, 
        error: new Error('النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.') 
      };
    }
    
    // 1. إنشاء المستخدم في نظام المصادقة
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { 
          name: data.name,
          role: 'admin',
          isTenant: true
        }
      }
    });

    if (authError) {
      console.error('خطأ في إنشاء حساب المصادقة للمستأجر:', authError);
      if (authError.message.includes('User already registered')) {
        return { 
          success: false, 
          error: new Error('البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.') 
        };
      }
      return { success: false, error: authError };
    }

    if (!authData.user) {
      return { 
        success: false, 
        error: new Error('فشل إنشاء حساب المستخدم') 
      };
    }

    try {
      // استعلام عن خطة التجربة المجانية
      const { data: trialPlan, error: trialPlanError } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('code', 'trial')
        .single();

      if (trialPlanError) {
        console.error('خطأ غير حرج في الحصول على خطة تجريبية:', trialPlanError);
      }

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5); // 5 أيام للفترة التجريبية

      // 2. إنشاء المؤسسة مع النطاق الفرعي باستخدام الوظيفة المحسنة
      const settings = {
        theme: 'light',
        logo_url: null,
        primary_color: '#2563eb',
        trial_end_date: trialEndDate.toISOString()
      };
      
      
      
      const result = await createOrganizationSafe(
        data.organizationName,
        data.subdomain,
        authData.user.id,
        settings
      );
      
      if (!result.success || !result.organizationId) {
        return { 
          success: false, 
          error: result.error || new Error('فشل إنشاء المنظمة بسبب خطأ غير معروف') 
        };
      }
      
      // 3. استكمال عملية التسجيل
      return await continueWithOrganization(
        result.organizationId,
        authData.user.id,
        data,
        trialPlan,
        trialEndDate
      );
    } catch (error) {
      console.error('خطأ أثناء تسجيل المستأجر:', error);
      return { success: false, error: error as Error };
    }
  } catch (error) {
    console.error('استثناء في تسجيل المستأجر:', error);
    return { success: false, error: error as Error };
  }
}; 