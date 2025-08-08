import { supabase } from '@/lib/supabase';
import { 
  supabaseAdmin, 
  createAdminRequest, 
  executeAdminQuery, 
  executeAdminRPC 
} from '@/lib/supabase-admin';
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
    console.log('بدء التحقق من توفر النطاق الفرعي:', cleanSubdomain);
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(cleanSubdomain);
    console.log('نتيجة التحقق من النطاق الفرعي:', subdomainCheck);
    
    if (!subdomainCheck.available) {
      
      // إجراء تشخيص مفصل للمشكلة
      console.log('النطاق الفرعي غير متاح، إجراء تشخيص...');
      const diagnostics = await diagnoseFinalRegistration('', cleanSubdomain);
      console.log('نتيجة التشخيص:', diagnostics);
      
      // البحث عن نطاقات بديلة
      try {
        const similarSubdomains = await findSimilarSubdomains(cleanSubdomain);
        console.log('النطاقات المشابهة:', similarSubdomains);
      } catch (similarError) {
        console.error('خطأ في البحث عن النطاقات المشابهة:', similarError);
      }
      
      return {
        success: false,
        error: subdomainCheck.error?.message || 'النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.'
      };
    }

    // 1. إنشاء المستخدم في نظام المصادقة (استخدام العميل العادي فقط)
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

    // 2. البحث عن خطة التجربة المجانية باستخدام API مباشر
    const trialPlanResult = await executeAdminQuery('subscription_plans', {
      action: 'select',
      filters: {
        code: 'trial',
        is_active: true
      }
    });

    const trialPlan = trialPlanResult.data && Array.isArray(trialPlanResult.data) && trialPlanResult.data.length > 0 
      ? trialPlanResult.data[0] 
      : null;

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
        const existingSubscriptionResult = await executeAdminQuery('organization_subscriptions', {
          action: 'select',
          filters: {
            organization_id: organizationResult.organizationId,
            status: 'trial'
          },
          columns: 'id'
        });

        if (existingSubscriptionResult.data && Array.isArray(existingSubscriptionResult.data) && existingSubscriptionResult.data.length > 0) {
          subscriptionId = existingSubscriptionResult.data[0].id;
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

          const subscriptionResult = await executeAdminQuery('organization_subscriptions', {
            action: 'insert',
            data: subscriptionData,
            columns: 'id'
          });

          if (subscriptionResult.error) {
          } else if (subscriptionResult.data) {
            // معالجة أفضل لأنواع الاستجابات المختلفة
            if (Array.isArray(subscriptionResult.data) && subscriptionResult.data.length > 0) {
              subscriptionId = subscriptionResult.data[0].id;
            } else if (subscriptionResult.data && typeof subscriptionResult.data === 'object' && subscriptionResult.data.id) {
              subscriptionId = subscriptionResult.data.id;
            } else {
            }
          }
        }
      } catch (subscriptionError) {
      }
    } else {
    }

    // 6. ربط المستخدم بالمؤسسة في جدول users
    try {
      const userLinkResult = await executeAdminQuery('users', {
        action: 'upsert',
        data: {
          id: authData.user.id,
          auth_user_id: authData.user.id,
          email: data.email,
          name: data.name || 'مستخدم جديد',
          organization_id: organizationResult.organizationId,
          role: 'admin',
          is_org_admin: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      if (userLinkResult.error) {
      } else {
      }
    } catch (linkError) {
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
