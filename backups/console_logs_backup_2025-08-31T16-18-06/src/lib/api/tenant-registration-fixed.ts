import { supabase } from '@/lib/supabase';
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
        const { error: subError } = await supabase
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
    const { error: userError } = await supabase
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
 * إنشاء مستأجر (مسؤول) جديد مع نطاق فرعي - نسخة محسنة ومطورة
 * تم تحسينها لتجنب مشكلة Multiple GoTrueClient instances
 */
export const registerTenant = async (data: TenantRegistrationData): Promise<{
  success: boolean;
  error: string | null;
  tenantId?: string;
  organizationId?: string;
}> => {
  try {

    // تنظيف النطاق الفرعي قبل التحقق
    const cleanSubdomain = data.subdomain
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // إزالة جميع المسافات
      .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
      .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
      .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
    
    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(cleanSubdomain);
    if (process.env.NODE_ENV === 'development') {
    }
    
    if (!subdomainCheck.available) {
      
      // إجراء تشخيص مفصل للمشكلة (تسجيل فقط في التطوير)
      if (process.env.NODE_ENV === 'development') {
        try {
          const diagnostics = await diagnoseFinalRegistration(undefined as any, cleanSubdomain);
        } catch {}
      }
      
      // البحث عن نطاقات بديلة
      try {
        const similarSubdomains = await findSimilarSubdomains(cleanSubdomain);
      } catch (similarError) {
      }
      
      return {
        success: false,
        error: subdomainCheck.error?.message || 'النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.'
      };
    }

    // 1. إنشاء المستخدم في نظام المصادقة (استخدام كلمة المرور المُدخلة)
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

    // 2. البحث عن خطة التجربة المجانية باستخدام API مباشر
    const { data: trialPlanData, error: trialPlanError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('code', 'trial')
      .eq('is_active', true)
      .single();

    const trialPlan = trialPlanData;

    if (!trialPlan) {
    }

    // 3. فحص أخير للنطاق الفرعي قبل الإنشاء
    const finalSubdomainCheck = await checkSubdomainAvailabilityWithRetry(cleanSubdomain);
    
    if (!finalSubdomainCheck.available) {
      return {
        success: false,
        error: 'النطاق الفرعي أصبح مستخدماً أثناء عملية التسجيل. يرجى اختيار نطاق آخر.'
      };
    }

    // 4. إنشاء المؤسسة باستخدام الوظيفة المحسنة
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 5); // 5 أيام تجربة مجانية

    const organizationData = {
      name: data.organizationName,
      subdomain: cleanSubdomain,
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
      cleanSubdomain,
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

    // 5. التحقق من وجود اشتراك تجريبي وإنشاؤه إذا لم يكن موجوداً
    let subscriptionId = null;
    if (trialPlan) {
      
      try {
        // أولاً: التحقق من وجود اشتراك موجود بالفعل
        const { data: existingSubscriptionData, error: existingSubscriptionError } = await supabase
          .from('organization_subscriptions')
          .select('id')
          .eq('organization_id', organizationResult.organizationId)
          .eq('status', 'trial')
          .maybeSingle();

        if (existingSubscriptionData) {
          subscriptionId = existingSubscriptionData.id;
        } else {
          // إنشاء اشتراك تجريبي جديد
          const subscriptionData = {
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
          };

          const { data: subscriptionDataResult, error: subscriptionError } = await supabase
            .from('organization_subscriptions')
            .insert(subscriptionData)
            .select('id')
            .single();

          if (subscriptionDataResult) {
            subscriptionId = subscriptionDataResult.id;
          }
        }
      } catch (subscriptionError) {
      }
    } else {
    }

    // 6. ربط المستخدم بالمؤسسة في جدول users
    try {
      const { error: userLinkError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: data.email,
          name: data.name || 'مستخدم جديد',
          phone: data.phone || null,
          role: 'admin',
          is_active: true,
          organization_id: organizationResult.organizationId,
          is_org_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (userLinkError) {
        return { success: false, error: userLinkError.message };
      }
    } catch (userLinkError) {
      return { success: false, error: 'فشل في ربط المستخدم بالمؤسسة' };
    }

    // 7. تحديث التخزين المحلي وإجبار TenantContext على التحديث
    try {
      // تحديث معرف المؤسسة في التخزين المحلي
      localStorage.setItem('bazaar_organization_id', organizationResult.organizationId);
      
      // مسح أي تخزين مؤقت متعلق بالمؤسسة
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('tenant:') || key.includes('organization:') || key.includes('domain:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // إشارة للتطبيق لإعادة تحميل بيانات المؤسسة
      window.dispatchEvent(new CustomEvent('organizationChanged', {
        detail: { organizationId: organizationResult.organizationId }
      }));
      
    } catch (storageError) {
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

// ملاحظة: كان يتم توليد كلمة مرور عشوائية سابقًا،
// تم استبدال ذلك باستخدام كلمة المرور التي يُدخلها المستخدم لضمان توقعات المستخدم.
