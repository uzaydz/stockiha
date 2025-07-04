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
    console.log('🚀 [TenantRegistration] بدء عملية تسجيل المؤسسة المحسنة...');

    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!subdomainCheck.available) {
      console.warn('⚠️ [TenantRegistration] النطاق الفرعي غير متاح:', data.subdomain);
      
      // إجراء تشخيص مفصل للمشكلة
      const diagnostics = await diagnoseFinalRegistration('', data.subdomain);
      
      // البحث عن نطاقات بديلة
      try {
        const similarSubdomains = await findSimilarSubdomains(data.subdomain);
        console.log('🔍 [TenantRegistration] نطاقات بديلة مقترحة:', similarSubdomains);
      } catch (similarError) {
        console.warn('⚠️ [TenantRegistration] لا يمكن العثور على نطاقات بديلة');
      }
      
      return {
        success: false,
        error: subdomainCheck.error?.message || 'النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.'
      };
    }

    console.log('✅ [TenantRegistration] النطاق الفرعي متاح:', data.subdomain);

    // 1. إنشاء المستخدم في نظام المصادقة (استخدام العميل العادي فقط)
    console.log('👤 [TenantRegistration] إنشاء حساب المستخدم...');
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
      console.error('❌ [TenantRegistration] فشل إنشاء حساب المستخدم:', authError);
      return { 
        success: false, 
        error: `فشل إنشاء حساب المستخدم: ${authError.message}` 
      };
    }

    if (!authData.user) {
      console.error('❌ [TenantRegistration] بيانات المستخدم غير مكتملة');
      return { 
        success: false, 
        error: 'فشل إنشاء حساب المستخدم: بيانات غير مكتملة' 
      };
    }

    console.log('✅ [TenantRegistration] تم إنشاء حساب المستخدم بنجاح:', authData.user.id);

    // 2. البحث عن خطة التجربة المجانية باستخدام API مباشر
    console.log('📋 [TenantRegistration] البحث عن خطة التجربة المجانية...');
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
      console.warn('⚠️ [TenantRegistration] لم يتم العثور على خطة تجربة متاحة');
    }

    // 3. فحص أخير للنطاق الفرعي قبل الإنشاء
    console.log('🔍 [TenantRegistration] فحص أخير للنطاق الفرعي...');
    const finalSubdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
    
    if (!finalSubdomainCheck.available) {
      console.error('❌ [TenantRegistration] النطاق الفرعي أصبح مستخدماً أثناء العملية');
      return {
        success: false,
        error: 'النطاق الفرعي أصبح مستخدماً أثناء عملية التسجيل. يرجى اختيار نطاق آخر.'
      };
    }

    // 4. إنشاء المؤسسة باستخدام الوظيفة المحسنة
    console.log('🏢 [TenantRegistration] إنشاء المؤسسة...');
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
      console.error('❌ [TenantRegistration] فشل إنشاء المؤسسة:', organizationResult.error);
      
      // إجراء تشخيص مفصل عند فشل إنشاء المؤسسة
      const diagnostics = await diagnoseFinalRegistration(authData.user.id, data.subdomain);
      
      return {
        success: false,
        error: organizationResult.error?.message || 'فشل إنشاء المنظمة بسبب خطأ غير معروف'
      };
    }

    console.log('✅ [TenantRegistration] تم إنشاء المؤسسة بنجاح:', organizationResult.organizationId);

    // 5. التحقق من وجود اشتراك تجريبي وإنشاؤه إذا لم يكن موجوداً
    let subscriptionId = null;
    if (trialPlan) {
      console.log('📝 [TenantRegistration] التحقق من الاشتراك التجريبي...');
      
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
          console.log('✅ [TenantRegistration] تم العثور على اشتراك تجريبي موجود');
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
            console.warn('⚠️ [TenantRegistration] فشل إنشاء اشتراك تجريبي:', subscriptionResult.error);
          } else if (subscriptionResult.data) {
            // معالجة أفضل لأنواع الاستجابات المختلفة
            if (Array.isArray(subscriptionResult.data) && subscriptionResult.data.length > 0) {
              subscriptionId = subscriptionResult.data[0].id;
              console.log('✅ [TenantRegistration] تم إنشاء اشتراك تجريبي بنجاح');
            } else if (subscriptionResult.data && typeof subscriptionResult.data === 'object' && subscriptionResult.data.id) {
              subscriptionId = subscriptionResult.data.id;
              console.log('✅ [TenantRegistration] تم إنشاء اشتراك تجريبي بنجاح');
            } else {
              console.log('✅ [TenantRegistration] تم إنشاء اشتراك تجريبي (استجابة فارغة - طبيعي)');
            }
          }
        }
      } catch (subscriptionError) {
        console.warn('⚠️ [TenantRegistration] خطأ في معالجة الاشتراك التجريبي:', subscriptionError);
      }
    } else {
      console.warn('⚠️ [TenantRegistration] لا توجد خطة تجربة متاحة');
    }

    // 6. ربط المستخدم بالمؤسسة في جدول users
    console.log('🔗 [TenantRegistration] ربط المستخدم بالمؤسسة...');
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
        console.warn('⚠️ [TenantRegistration] فشل ربط المستخدم بالمؤسسة:', userLinkResult.error);
      } else {
        console.log('✅ [TenantRegistration] تم ربط المستخدم بالمؤسسة بنجاح');
      }
    } catch (linkError) {
      console.warn('⚠️ [TenantRegistration] خطأ في ربط المستخدم:', linkError);
    }

    // 7. تحديث التخزين المحلي وإجبار TenantContext على التحديث
    console.log('🔄 [TenantRegistration] تحديث بيانات التخزين المحلي...');
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
      
      console.log('✅ [TenantRegistration] تم تحديث التخزين المحلي بنجاح');
    } catch (storageError) {
      console.warn('⚠️ [TenantRegistration] خطأ في تحديث التخزين المحلي:', storageError);
    }

    console.log('🎉 [TenantRegistration] تم إكمال عملية التسجيل بنجاح!');

    return {
      success: true,
      error: null,
      tenantId: authData.user.id,
      organizationId: organizationResult.organizationId
    };

  } catch (error) {
    console.error('❌ [TenantRegistration] خطأ عام في عملية التسجيل:', error);
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
