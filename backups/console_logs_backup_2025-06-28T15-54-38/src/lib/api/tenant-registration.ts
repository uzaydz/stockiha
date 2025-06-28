import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UserPermissions } from './admin';
import { TenantRegistrationData } from './tenant-types';
import { createOrganizationSimple, createOrganizationDirect } from './organization-creation';
import { checkSubdomainAvailabilityWithRetry, findSimilarSubdomains } from './subdomain';

/**
 * استكمال عملية تسجيل المستأجر بعد إنشاء المنظمة
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
          // لا نريد فشل عملية التسجيل بالكامل إذا فشل إنشاء الاشتراك التجريبي
        }
      } catch (subCreateError) {
      }
    }

    // 3. إنشاء سجل المستخدم المسؤول مع الصلاحيات الكاملة
    const adminPermissions: UserPermissions = {
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

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData);

    if (userError) {
      // تفاصيل أكثر عن الخطأ
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
 * إنشاء مستأجر (مسؤول) جديد مع نطاق فرعي
 */
export const registerTenant = async (data: TenantRegistrationData): Promise<{
  success: boolean;
  error: Error | null;
  tenantId?: string;
  organizationId?: string;
}> => {
  try {
    console.log(`🚀 بدء عملية تسجيل مستأجر جديد: ${data.email} مع النطاق الفرعي: ${data.subdomain}`);

    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);

    if (subdomainCheck.error) {
      console.error('❌ خطأ في فحص توفر النطاق الفرعي:', subdomainCheck.error);
      return { success: false, error: subdomainCheck.error };
    }

    if (!subdomainCheck.available) {
      console.log(`❌ النطاق الفرعي ${data.subdomain} غير متاح`);
      
      // البحث عن نطاقات مشابهة لاقتراحها
      const similarSubdomains = await findSimilarSubdomains(data.subdomain);
      const suggestions = similarSubdomains.length > 0 
        ? ` النطاقات المشابهة الموجودة: ${similarSubdomains.join(', ')}`
        : '';
      
      return { 
        success: false, 
        error: new Error(`النطاق الفرعي مستخدم بالفعل. يرجى اختيار نطاق فرعي آخر.${suggestions}`) 
      };
    }

    console.log(`✅ النطاق الفرعي ${data.subdomain} متاح للاستخدام`);
    
    // 1. إنشاء المستخدم في نظام المصادقة
    console.log('👤 إنشاء حساب المستخدم في نظام المصادقة...');
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
      console.error('❌ خطأ في إنشاء حساب المستخدم:', authError);
      // Check if error is because user already exists
      if (authError.message.includes('User already registered')) {
        return { 
          success: false, 
          error: new Error('البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.') 
        };
      }
      return { success: false, error: authError };
    }

    if (!authData.user) {
      console.error('❌ لم يتم إرجاع بيانات المستخدم من نظام المصادقة');
      return { 
        success: false, 
        error: new Error('فشل إنشاء حساب المستخدم') 
      };
    }

    console.log(`✅ تم إنشاء حساب المستخدم بنجاح: ${authData.user.id}`);

    try {
      // استعلام عن خطة التجربة المجانية
      console.log('🔍 البحث عن خطة التجربة المجانية...');
      const { data: trialPlan, error: trialPlanError } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('code', 'trial')
        .single();

      if (trialPlanError) {
        console.log('⚠️ لم يتم العثور على خطة التجربة المجانية، سيتم المتابعة بدونها');
      } else {
        console.log(`✅ تم العثور على خطة التجربة المجانية: ${trialPlan.id}`);
      }

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5); // إضافة 5 أيام للفترة التجريبية

      // 2. إنشاء المؤسسة مع النطاق الفرعي
      console.log('🏢 إنشاء المؤسسة...');
      const organizationData = {
        name: data.organizationName,
        subdomain: data.subdomain.toLowerCase().trim(),
        owner_id: authData.user.id,
        subscription_tier: 'trial',
        subscription_status: 'trial',
        settings: {
          theme: 'light',
          logo_url: null,
          primary_color: '#2563eb',
          trial_end_date: trialEndDate.toISOString()
        }
      };

      // التحقق مرة أخيرة من عدم وجود النطاق الفرعي قبل الإنشاء
      console.log('🔄 فحص أخير لتوفر النطاق الفرعي قبل الإنشاء...');
      const finalCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
      
      if (!finalCheck.available) {
        console.error('❌ النطاق الفرعي أصبح غير متاح أثناء عملية التسجيل');
        return { 
          success: false, 
          error: new Error('النطاق الفرعي أصبح غير متاح. يرجى المحاولة مرة أخرى بنطاق فرعي آخر.') 
        };
      }

      // استخدام الوظيفة البسيطة لإنشاء المؤسسة بدلاً من الوظائف الأخرى
      const result = await createOrganizationSimple(
        data.organizationName,
        data.subdomain,
        authData.user.id,
        organizationData.settings
      );
      
      if (result.success && result.organizationId) {
        return await continueWithOrganization(
          result.organizationId,
          authData.user.id,
          data,
          trialPlan,
          trialEndDate
        );
      } 
      
      // إذا فشلت الطريقة البسيطة، نحاول استخدام الوظيفة المباشرة
      const directResult = await createOrganizationDirect(
        data.organizationName,
        data.subdomain,
        authData.user.id,
        organizationData.settings
      );
      
      if (directResult.success && directResult.organizationId) {
        return await continueWithOrganization(
          directResult.organizationId,
          authData.user.id,
          data,
          trialPlan,
          trialEndDate
        );
      }
      
      // إذا فشل الإنشاء المباشر، نحاول استدعاء وظيفة RPC
      try {
        const { data: transactionData, error: transactionError } = await supabaseAdmin.rpc(
          'create_organization_with_audit',
          {
            org_data: organizationData,
            user_id: authData.user.id
          }
        );

        if (transactionError) {
        } else if (transactionData) {
          return await continueWithOrganization(
            transactionData,
            authData.user.id,
            data,
            trialPlan,
            trialEndDate
          );
        }
      } catch (rpcError) {
      }
      
      // محاولة أخيرة - إنشاء المؤسسة مباشرة
      try {
        // التحقق من جميع الاحتمالات المحتملة للمنظمة الموجودة مسبقًا
        const { data: existingOrg, error: checkError } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .or(`subdomain.eq.${data.subdomain},owner_id.eq.${authData.user.id}`)
          .maybeSingle();
          
        if (!checkError && existingOrg) {
          
          return await continueWithOrganization(
            existingOrg.id, 
            authData.user.id, 
            data, 
            trialPlan, 
            trialEndDate
          );
        }
        
        // محاولة أخيرة: استخدام وظيفة create_organization_simple مباشرة
        try {
          const { data: simpleOrgId, error: simpleError } = await supabaseAdmin.rpc(
            'create_organization_simple',
            {
              org_name: data.organizationName,
              org_subdomain: data.subdomain
            }
          );
          
          if (!simpleError && simpleOrgId) {
            
            return await continueWithOrganization(
              simpleOrgId, 
              authData.user.id, 
              data, 
              trialPlan, 
              trialEndDate
            );
          }
        } catch (simpleError) {
        }
        
        // إذا لم تكن المنظمة موجودة، حاول إنشاءها مع تجنب علامة ON CONFLICT
        try {
          // إدراج بدون select لتجنب استخدام ON CONFLICT
          const { error: insertError } = await supabaseAdmin
            .from('organizations')
            .insert(organizationData);
            
          if (insertError) {
            if (insertError.code === '42P10' || insertError.code === '23505') {
              // في حالة الخطأ، نحاول البحث عن المنظمة مرة أخرى
              const { data: afterErrorData } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('subdomain', data.subdomain)
                .maybeSingle();
                
              if (afterErrorData) {
                return await continueWithOrganization(
                  afterErrorData.id, 
                  authData.user.id, 
                  data, 
                  trialPlan, 
                  trialEndDate
                );
              }
            }
            
            // في حالة فشل الحلول البديلة
            return { success: false, error: insertError };
          }
          
          // بعد الإدراج الناجح، نبحث عن المنظمة للحصول على معرفها
          const { data: orgData } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('subdomain', data.subdomain)
            .maybeSingle();
            
          if (!orgData) {
            return { 
              success: false, 
              error: new Error('فشل في إنشاء المؤسسة: لم يتم إرجاع معرّف المؤسسة') 
            };
          }
          
          // تم إنشاء المنظمة بنجاح، استمر في العملية
          return await continueWithOrganization(
            orgData.id, 
            authData.user.id, 
            data, 
            trialPlan, 
            trialEndDate
          );
        } catch (createError) {
          // في حالة أي استثناء، نحاول طريقة أخرى
          
          // محاولة أخيرة باستخدام insert & select
          const { data: orgData, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert(organizationData)
            .select('id')
            .single();
            
          if (orgError) {
            return { success: false, error: orgError };
          }
          
          if (!orgData) {
            return { 
              success: false, 
              error: new Error('فشل في إنشاء المؤسسة: لم يتم إرجاع معرّف المؤسسة') 
            };
          }
          
          // إذا نجحت المحاولة الأخيرة
          return await continueWithOrganization(
            orgData.id, 
            authData.user.id, 
            data, 
            trialPlan, 
            trialEndDate
          );
        }
      } catch (finalError) {
        return { success: false, error: finalError as Error };
      }
    } catch (innerError) {
      return { success: false, error: innerError as Error };
    }
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
