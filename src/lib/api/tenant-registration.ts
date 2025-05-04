import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UserPermissions } from './admin';
import { TenantRegistrationData } from './tenant-types';
import { createOrganizationSimple, createOrganizationDirect } from './organization-creation';

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
          console.error('Error creating trial subscription:', subError);
          // لا نريد فشل عملية التسجيل بالكامل إذا فشل إنشاء الاشتراك التجريبي
        }
      } catch (subCreateError) {
        console.error('Exception in subscription creation:', subCreateError);
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
    
    console.log('Creating user record with data:', JSON.stringify(userData, null, 2));

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData);

    if (userError) {
      console.error('Error creating tenant user record:', userError);
      // تفاصيل أكثر عن الخطأ
      console.error('User creation error details:', {
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint
      });
      return { success: false, error: userError };
    }

    return {
      success: true,
      error: null,
      tenantId: userId,
      organizationId: organizationId
    };
  } catch (error) {
    console.error('Error continuing organization setup:', error);
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
    // التحقق من توفر النطاق الفرعي - استخدام supabaseAdmin للاتساق
    const { data: subdomainCheck, error: subdomainError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', data.subdomain)
      .maybeSingle();

    if (subdomainError) {
      console.error('Error checking subdomain availability:', subdomainError);
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
      console.error('Error creating tenant auth account:', authError);
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
        console.error('Error fetching trial plan:', trialPlanError);
        // في حالة عدم وجود خطة تجريبية، نستخدم الخطة الأساسية
        console.log('Using basic plan as fallback since trial plan not found');
      }

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5); // إضافة 5 أيام للفترة التجريبية

      // 2. إنشاء المؤسسة مع النطاق الفرعي
      const organizationData = {
        name: data.organizationName,
        subdomain: data.subdomain,
        owner_id: authData.user.id,
        subscription_tier: 'trial', // تغيير الخطة من basic إلى trial
        subscription_status: 'trial', // تعيين حالة الاشتراك إلى trial
        settings: {
          theme: 'light',
          logo_url: null,
          primary_color: '#2563eb',
          trial_end_date: trialEndDate.toISOString() // تخزين تاريخ انتهاء الفترة التجريبية
        }
      };
      
      console.log('Creating organization with data:', JSON.stringify(organizationData, null, 2));
      
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
      
      console.warn('Simple creation failed, trying legacy approaches...');
      
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
      
      console.warn('Direct creation failed, trying legacy approaches...');
      
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
          console.error('Error in create_organization_with_audit:', transactionError);
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
        console.error('Exception during RPC call:', rpcError);
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
          console.log(`وجدت منظمة موجودة مسبقاً بالمعرف: ${existingOrg.id}`);
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
            console.log(`تم إنشاء المنظمة باستخدام create_organization_simple، المعرف: ${simpleOrgId}`);
            return await continueWithOrganization(
              simpleOrgId, 
              authData.user.id, 
              data, 
              trialPlan, 
              trialEndDate
            );
          }
          
          console.error('Error in create_organization_simple:', simpleError);
        } catch (simpleError) {
          console.error('Exception during create_organization_simple:', simpleError);
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
            console.error('Error inserting organization:', insertError);
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
          console.error('Exception during organization creation:', createError);
          
          // محاولة أخيرة باستخدام insert & select
          const { data: orgData, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert(organizationData)
            .select('id')
            .single();
            
          if (orgError) {
            console.error('Error in final creation attempt:', orgError);
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
        console.error('Error in final creation attempt:', finalError);
        return { success: false, error: finalError as Error };
      }
    } catch (innerError) {
      console.error('Inner error in organization creation process:', innerError);
      return { success: false, error: innerError as Error };
    }
  } catch (error) {
    console.error('Error registering tenant:', error);
    return { success: false, error: error as Error };
  }
}; 