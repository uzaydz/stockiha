import { supabase } from '@/lib/supabase';
// import { supabaseAdmin } from '@/lib/supabase-admin'; // Removed: never use service role on client
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
        const response = await fetch('/api/admin/tenant/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: 'create_trial_subscription',
            payload: {
              organizationId,
              trialPlanId: trialPlan.id,
              trialEndDateISO: trialEndDate.toISOString(),
            }
          })
        });
        if (!response.ok) {
          // لا نفشل العملية بالكامل، نتابع بدون اشتراك تجريبي
        }

        // تجاهل فشل الاشتراك التجريبي ولا تفشل التسجبل
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

    const insertUserRes = await fetch('/api/admin/tenant/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'insert_admin_user', payload: { user: userData } })
    });
    if (!insertUserRes.ok) {
      const err = await insertUserRes.json().catch(() => ({}));
      return { success: false, error: new Error(err?.error || 'فشل إنشاء المستخدم الإداري') };
    }

    // تم إدراج المستخدم الإداري بنجاح عبر السيرفر

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

    // التحقق من توفر النطاق الفرعي باستخدام الوظيفة المحسنة
    const subdomainCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);

    if (subdomainCheck.error) {
      return { success: false, error: subdomainCheck.error };
    }

    if (!subdomainCheck.available) {
      
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
      // اجلب معرف خطة التجربة على الواجهة المقيّدة إن وُجد، وإلا تخطَّ ذلك
      let trialPlan: any = null;
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/subscription_plans?code=eq.trial&select=id`, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            Accept: 'application/json'
          }
        });
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr[0]?.id) trialPlan = { id: arr[0].id };
        }
      } catch {}

      // لا حاجة لمعالجة إضافية هنا

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5); // إضافة 5 أيام للفترة التجريبية

      // 2. إنشاء المؤسسة مع النطاق الفرعي
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
      const finalCheck = await checkSubdomainAvailabilityWithRetry(data.subdomain);
      
      if (!finalCheck.available) {
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
        const rpcRes = await fetch('/api/admin/tenant/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'rpc_create_organization', payload: { org_data: organizationData, user_id: authData.user.id } })
        });
        if (rpcRes.ok) {
          const r = await rpcRes.json();
          if (r.organizationId) {
            return await continueWithOrganization(
              r.organizationId,
              authData.user.id,
              data,
              trialPlan,
              trialEndDate
            );
          }
        }
      } catch (rpcError) {
      }
      
      // محاولة أخيرة - إنشاء المؤسسة مباشرة
      try {
        // التحقق من جميع الاحتمالات المحتملة للمنظمة الموجودة مسبقًا
        const checkUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&or=(subdomain.eq.${data.subdomain},owner_id.eq.${authData.user.id})&limit=1`;
        const checkRes = await fetch(checkUrl, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        let existingOrg: any = null;
        if (checkRes.ok) {
          const arr = await checkRes.json();
          existingOrg = Array.isArray(arr) ? arr[0] : null;
        }
          
        if (existingOrg) {
          
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
          const res = await fetch('/api/admin/tenant/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 'create_organization_simple', payload: { name: data.organizationName, subdomain: data.subdomain, ownerId: authData.user.id, settings: organizationData.settings } })
          });
          if (res.ok) {
            const j = await res.json();
            if (j.organizationId) {
              return await continueWithOrganization(
                j.organizationId,
                authData.user.id,
                data,
                trialPlan,
                trialEndDate
              );
            }
          }
        } catch (simpleError) {
        }
        
        // إذا لم تكن المنظمة موجودة، حاول إنشاءها مع تجنب علامة ON CONFLICT
        try {
          // إدراج بدون select لتجنب استخدام ON CONFLICT
          const insRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations`, {
            method: 'POST',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify(organizationData)
          });
          if (!insRes.ok) {
            const insertError: any = { code: `${insRes.status}` };
            if (insertError.code === '42P10' || insertError.code === '23505' || insRes.status === 409) {
              // fallback below
            } else {
              return { success: false, error: new Error(`فشل إنشاء المؤسسة (${insRes.status})`) };
            }
          }
            
          // تمت محاولة الإدراج أو تم تجاهل الخطأ 409. نكمل.
          
          // بعد الإدراج الناجح، نبحث عن المنظمة للحصول على معرفها
          let orgData: any = null;
          try {
            const gRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&subdomain=eq.${data.subdomain}&limit=1`, {
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              }
            });
            if (gRes.ok) {
              const arr = await gRes.json();
              orgData = Array.isArray(arr) ? arr[0] : null;
            }
          } catch {}
            
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
          const lastRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id`, {
            method: 'POST',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(organizationData)
          });
          if (!lastRes.ok) {
            return { success: false, error: new Error('فشل في إنشاء المؤسسة') };
          }
          const orgData = await lastRes.json();
          const orgId = Array.isArray(orgData) ? orgData[0]?.id : orgData?.id;
          if (!orgId) {
            return { success: false, error: new Error('فشل في إنشاء المؤسسة: لم يتم إرجاع معرّف المؤسسة') };
          }
            
          // تهيئة اكتمال
          
          if (!orgData) {
            return { 
              success: false, 
              error: new Error('فشل في إنشاء المؤسسة: لم يتم إرجاع معرّف المؤسسة') 
            };
          }
          
          // إذا نجحت المحاولة الأخيرة
          return await continueWithOrganization(
            orgId, 
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
