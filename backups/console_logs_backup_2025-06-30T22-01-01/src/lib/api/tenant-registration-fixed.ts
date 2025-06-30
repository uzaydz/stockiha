import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TenantRegistrationData } from './tenant-types';
import { createOrganizationFinal, diagnoseFinalRegistration, quickFixUser } from './organization-creation-final';
import { checkSubdomainAvailabilityWithRetry, findSimilarSubdomains } from './subdomain';
import { debugSubdomain } from './debug-subdomain';

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
        } else {
        }
      } catch (subCreateError) {
      }
    } else {
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
      return { success: false, error: userError };
    }

    return {
      success: true,
      error: null,
      tenantId: userId,
      organizationId: organizationId
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * إنشاء مستأجر (مسؤول) جديد مع نطاق فرعي - نسخة محسنة
 */
export const registerTenant = async (data: TenantRegistrationData): Promise<{
  success: boolean;
  error: string | null;
  tenantId?: string;
  organizationId?: string;
}> => {
  try {

    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!subdomainCheck.available) {
      
      // إجراء تشخيص مفصل للمشكلة
      const diagnostics = await diagnoseFinalRegistration('', data.subdomain);
      
      // البحث عن نطاقات بديلة
      try {
        const similarSubdomains = await findSimilarSubdomains(data.subdomain);
      } catch (similarError) {
      }
      
      return {
        success: false,
        error: subdomainCheck.error?.message || 'النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.'
      };
    }

    // 1. إنشاء المستخدم في نظام المصادقة
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: generateSecurePassword(),
      options: {
        data: {
          name: data.name,
          role: 'admin',
          isTenant: true
        }
      }
    });

    if (authError) {
      return { 
        success: false, 
        error: `فشل إنشاء حساب المستخدم: ${authError.message}` 
      };
    }

    if (!authData.user) {
      return { 
        success: false, 
        error: 'فشل إنشاء حساب المستخدم: بيانات غير مكتملة' 
      };
    }

    // 2. البحث عن خطة التجربة المجانية
    const { data: trialPlan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('code', 'trial')
      .eq('is_active', true)
      .single();

    // 3. إنشاء المؤسسة باستخدام الوظيفة المحسنة
    
    // فحص أخير للنطاق الفرعي قبل الإنشاء
    const finalSubdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!finalSubdomainCheck.available) {
      return {
        success: false,
        error: 'النطاق الفرعي أصبح مستخدماً أثناء عملية التسجيل. يرجى اختيار نطاق آخر.'
      };
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 5); // 5 أيام تجربة مجانية

    const organizationData = {
      name: data.organizationName,
      subdomain: data.subdomain,
      owner_id: authData.user.id,
      settings: {
        theme: 'light',
        logo_url: null,
        primary_color: '#2563eb',
        trial_end_date: trialEndDate.toISOString()
      }
    };

    const organizationResult = await createOrganizationFinal(
      organizationData.name,
      organizationData.subdomain,
      organizationData.owner_id,
      data.email,
      data.name || 'مستخدم جديد',
      organizationData.settings
    );

    if (!organizationResult.success) {
      
      // إجراء تشخيص مفصل عند فشل إنشاء المؤسسة
      const diagnostics = await diagnoseFinalRegistration(authData.user.id, data.subdomain);
      
      return {
        success: false,
        error: organizationResult.error?.message || 'فشل إنشاء المنظمة بسبب خطأ غير معروف'
      };
    }

    // 4. إنشاء اشتراك تجريبي إذا كانت خطة التجربة متاحة
    let subscriptionId = null;
    if (trialPlan) {
      try {
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
          .from('organization_subscriptions')
          .insert({
            organization_id: organizationResult.organizationId,
            plan_id: trialPlan.id,
            status: 'trial',
            start_date: new Date().toISOString(),
            end_date: trialEndDate.toISOString(),
            amount_paid: 0,
            billing_cycle: 'monthly',
            currency: 'DZD',
            payment_method: 'trial',
            created_at: new Date().toISOString()
          } as any)
          .select()
          .single();

        if (!subscriptionError && subscription) {
          subscriptionId = subscription.id;
        } else {
        }
      } catch (subscriptionError) {
      }
    }

    return {
      success: true,
      error: null,
      tenantId: authData.user.id,
      organizationId: organizationResult.organizationId
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء التسجيل'
    };
  }
};

/**
 * توليد كلمة مرور آمنة
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
