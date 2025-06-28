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
    console.log(`🔄 استكمال عملية التسجيل للمؤسسة: ${organizationId} والمستخدم: ${userId}`);

    // إنشاء سجل اشتراك تجريبي إذا تم العثور على خطة تجريبية
    if (trialPlan) {
      console.log(`📋 إنشاء اشتراك تجريبي بالخطة: ${trialPlan.id}`);
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
          console.error('⚠️ خطأ في إنشاء الاشتراك التجريبي:', subError);
        } else {
          console.log('✅ تم إنشاء الاشتراك التجريبي بنجاح');
        }
      } catch (subCreateError) {
        console.error('❌ استثناء في إنشاء الاشتراك التجريبي:', subCreateError);
      }
    } else {
      console.log('⚠️ لم يتم العثور على خطة تجريبية');
    }

    // إنشاء أو تحديث سجل المستخدم المسؤول مع الصلاحيات الكاملة
    console.log('👤 إنشاء سجل المستخدم المسؤول...');
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

    console.log('📝 بيانات المستخدم المراد إدراجها:', {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      organization_id: userData.organization_id
    });

    // استخدام upsert بدلاً من insert لتجنب الأخطاء
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userData, { onConflict: 'id' });

    if (userError) {
      console.error('❌ خطأ في إنشاء سجل المستخدم:', userError);
      return { success: false, error: userError };
    }

    console.log('✅ تم إنشاء سجل المستخدم بنجاح');

    return {
      success: true,
      error: null,
      tenantId: userId,
      organizationId: organizationId
    };
  } catch (error) {
    console.error('❌ استثناء في استكمال عملية التسجيل:', error);
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
    console.log(`🚀 بدء عملية تسجيل مستأجر جديد (نسخة محسنة): ${data.email} مع النطاق الفرعي: ${data.subdomain}`);
    console.log('📋 بيانات التسجيل المرسلة:', data);

    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    console.log('🔍 التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة...');
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!subdomainCheck.available) {
      console.log(`❌ النطاق الفرعي ${data.subdomain} غير متاح`);
      
      // إجراء تشخيص مفصل للمشكلة
      console.log('🔧 تشغيل أداة التشخيص الشاملة...');
      const diagnostics = await diagnoseFinalRegistration('', data.subdomain);
      console.log('📊 نتائج التشخيص:', diagnostics);
      
      // البحث عن نطاقات بديلة
      try {
        const similarSubdomains = await findSimilarSubdomains(data.subdomain);
        console.log('🔍 النطاقات المشابهة المتاحة:', similarSubdomains);
      } catch (similarError) {
        console.error('استثناء في البحث عن النطاقات المشابهة:', similarError);
      }
      
      return {
        success: false,
        error: subdomainCheck.error?.message || 'النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.'
      };
    }

    console.log(`✅ النطاق الفرعي ${data.subdomain} متاح، المتابعة مع عملية التسجيل...`);

    // 1. إنشاء المستخدم في نظام المصادقة
    console.log('👤 إنشاء حساب المستخدم في نظام المصادقة...');
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
      console.error('❌ فشل إنشاء حساب المستخدم:', authError);
      return { 
        success: false, 
        error: `فشل إنشاء حساب المستخدم: ${authError.message}` 
      };
    }

    if (!authData.user) {
      console.error('❌ لم يتم إرجاع بيانات المستخدم من عملية التسجيل');
      return { 
        success: false, 
        error: 'فشل إنشاء حساب المستخدم: بيانات غير مكتملة' 
      };
    }

    console.log(`✅ تم إنشاء حساب المستخدم بنجاح: ${authData.user.id}`);

    // 2. البحث عن خطة التجربة المجانية
    console.log('🔍 البحث عن خطة التجربة المجانية...');
    const { data: trialPlan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('code', 'trial')
      .eq('is_active', true)
      .single();

    console.log('✅ تم العثور على خطة التجربة المجانية:', trialPlan?.id);

    // 3. إنشاء المؤسسة باستخدام الوظيفة المحسنة
    console.log('🏢 إنشاء المؤسسة باستخدام الوظيفة المحسنة...');
    
    // فحص أخير للنطاق الفرعي قبل الإنشاء
    console.log('🔄 فحص أخير لتوفر النطاق الفرعي قبل الإنشاء...');
    const finalSubdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!finalSubdomainCheck.available) {
      console.log(`❌ النطاق الفرعي ${data.subdomain} أصبح غير متاح أثناء عملية التسجيل`);
      return {
        success: false,
        error: 'النطاق الفرعي أصبح مستخدماً أثناء عملية التسجيل. يرجى اختيار نطاق آخر.'
      };
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 يوم تجربة مجانية

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

    console.log('📝 بيانات المؤسسة المراد إنشاؤها:', organizationData);

    const organizationResult = await createOrganizationFinal(
      organizationData.name,
      organizationData.subdomain,
      organizationData.owner_id,
      data.email,
      data.name || 'مستخدم جديد',
      organizationData.settings
    );

    if (!organizationResult.success) {
      console.error('❌ فشل إنشاء المؤسسة:', organizationResult.error);
      
      // إجراء تشخيص مفصل عند فشل إنشاء المؤسسة
      console.log('🔧 تشغيل تشخيص مفصل لفشل إنشاء المؤسسة...');
      const diagnostics = await diagnoseFinalRegistration(authData.user.id, data.subdomain);
      console.log('📊 نتائج التشخيص عند الفشل:', diagnostics);
      
      return {
        success: false,
        error: organizationResult.error?.message || 'فشل إنشاء المنظمة بسبب خطأ غير معروف'
      };
    }

    console.log(`✅ تم إنشاء المؤسسة بنجاح: ${organizationResult.organizationId}`);

    // 4. إنشاء اشتراك تجريبي إذا كانت خطة التجربة متاحة
    let subscriptionId = null;
    if (trialPlan) {
      console.log('📋 إنشاء اشتراك تجريبي...');
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
          console.log(`✅ تم إنشاء الاشتراك التجريبي: ${subscriptionId}`);
        } else {
          console.error('⚠️ فشل إنشاء الاشتراك التجريبي:', subscriptionError);
        }
      } catch (subscriptionError) {
        console.error('⚠️ استثناء في إنشاء الاشتراك التجريبي:', subscriptionError);
      }
    }

    console.log('🎉 تم إكمال عملية التسجيل بنجاح!');
    
    return {
      success: true,
      error: null,
      tenantId: authData.user.id,
      organizationId: organizationResult.organizationId
    };

  } catch (error) {
    console.error('❌ استثناء في عملية التسجيل:', error);
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
