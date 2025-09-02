import { supabase } from '@/lib/supabase-client';
import { getSupabaseClient } from '@/lib/supabase-client';
import { isValidUuid } from '@/utils/uuid-helpers';

// دالة للحصول على منظمة تحتوي على خدمات كاحتياطي
export const getOrganizationWithServices = async (): Promise<string | null> => {
  try {
    
    const { data: orgsWithServices, error } = await supabase
      .from('organizations')
      .select(`
        id, 
        name, 
        subdomain,
        services!inner (id)
      `)
      .limit(1);
      
    if (error) {
      return null;
    }
    
    if (orgsWithServices && orgsWithServices.length > 0) {
      const org = orgsWithServices[0];
      return org.id;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// دالة محسنة للحصول على معرف المؤسسة - تستخدم السياقات المحسنة
export const getOrganizationId = async (currentUser: any = null): Promise<string | null> => {
  try {
    // 0. محاولة الحصول على المعرف من window object إذا كان متاحاً (من السياقات المحسنة)
    const windowOrgId = (window as any).__CURRENT_ORG_ID__;
    if (windowOrgId && isValidUuid(windowOrgId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من window object:', windowOrgId);
      }
      return windowOrgId;
    }

    // 1. محاولة الحصول من السياقات المحسنة عبر AuthContext
    const authContextOrg = getOrganizationFromAuthContext();
    if (authContextOrg) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من AuthContext:', authContextOrg);
      }
      return authContextOrg;
    }

    // 2. محاولة الحصول من UserContext
    const userContextOrg = getOrganizationFromUserContext();
    if (userContextOrg) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من UserContext:', userContextOrg);
      }
      return userContextOrg;
    }

    // 3. محاولة الحصول من TenantContext
    const tenantContextOrg = getOrganizationFromTenantContext();
    if (tenantContextOrg) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من TenantContext:', tenantContextOrg);
      }
      return tenantContextOrg;
    }

    // 4. محاولة الحصول من النطاق المخصص إذا كان موجودًا
    const hostname = window.location.hostname;
    if (!hostname.includes('localhost')) {
      try {
        const supabase = await getSupabaseClient();
        const { data: orgDataArray, error: orgError } = await supabase
          .from('organizations')
          .select('id, domain, subdomain')
          .eq('domain', hostname)
          .limit(1);

        const orgData = orgDataArray && orgDataArray.length > 0 ? orgDataArray[0] : null;

        if (orgError && orgError.code !== 'PGRST116') {
          // تسجيل الخطأ فقط إذا لم يكن خطأ "لا توجد نتائج"
        }

        if (orgData) {
          // تحديث التخزين المحلي بالمعرف الصحيح
          localStorage.setItem('bazaar_organization_id', orgData.id);
          localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);

          return orgData.id;
        }
      } catch (customDomainError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [getOrganizationId] فشل في الحصول على المؤسسة من النطاق المخصص:', customDomainError);
        }
      }
    }

    // 5. محاولة الحصول على المعرف من المستخدم الحالي عبر API
    if (currentUser) {
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.id)
        .limit(1);

      const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

      if (!userError && userData?.organization_id) {
        // تحديث التخزين المحلي بالمعرف الصحيح
        localStorage.setItem('bazaar_organization_id', userData.organization_id);

        return userData.organization_id;
      }
    }

    // 6. محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (isValidUuid(storedOrgId)) {
      // التحقق من صحة المعرف المخزن
      const { data: orgCheckArray, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', storedOrgId)
        .limit(1);

      const orgExists = orgCheckArray && orgCheckArray.length > 0;

      if (orgError || !orgExists) {
        // حذف المعرف غير الصالح
        localStorage.removeItem('bazaar_organization_id');
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [getOrganizationId] حذف معرف المؤسسة غير الصالح من التخزين المحلي');
        }
      } else {
        // المعرف صالح
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من التخزين المحلي:', storedOrgId);
        }
        return storedOrgId;
      }
    }

    // 7. محاولة الحصول من معلومات المستخدم الحالي في API المصادقة
    const { data: sessionData } = await supabase.auth.getSession();
    const userInfo = sessionData?.session?.user?.user_metadata;

    if (userInfo && userInfo.organization_id) {
      localStorage.setItem('bazaar_organization_id', userInfo.organization_id);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من session metadata:', userInfo.organization_id);
      }
      return userInfo.organization_id;
    }

    // 8. محاولة الحصول على منظمة تحتوي على خدمات كاحتياطي
    const orgWithServices = await getOrganizationWithServices();
    if (orgWithServices) {
      localStorage.setItem('bazaar_organization_id', orgWithServices);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام معرف المؤسسة من orgWithServices:', orgWithServices);
      }
      return orgWithServices;
    }

    // 9. الاحتياطي الأخير: أول منظمة في قاعدة البيانات
    const { data: orgsArray, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    const orgs = orgsArray && orgsArray.length > 0 ? orgsArray[0] : null;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [getOrganizationId] خطأ في الحصول على أول مؤسسة:', error);
      }
      return null;
    }

    if (orgs?.id) {
      // حفظ المعرف في التخزين المحلي للاستخدام اللاحق
      localStorage.setItem('bazaar_organization_id', orgs.id);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [getOrganizationId] استخدام أول مؤسسة كاحتياطي:', orgs.id);
      }
      return orgs.id;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('❌ [getOrganizationId] لم يتم العثور على أي معرف مؤسسة');
    }
    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [getOrganizationId] خطأ في دالة getOrganizationId:', error);
    }
    return null;
  }
};

// دوال مساعدة للحصول على معرف المؤسسة من السياقات المحسنة
function getOrganizationFromAuthContext(): string | null {
  try {
    // محاولة الحصول من window object إذا كان متاحاً من AuthContext
    const authOrg = (window as any).__AUTH_CONTEXT_ORG__;
    if (authOrg?.id && isValidUuid(authOrg.id)) {
      return authOrg.id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getOrganizationFromUserContext(): string | null {
  try {
    // محاولة الحصول من window object إذا كان متاحاً من UserContext
    const userOrg = (window as any).__USER_CONTEXT_ORG__;
    if (userOrg && isValidUuid(userOrg)) {
      return userOrg;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getOrganizationFromTenantContext(): string | null {
  try {
    // محاولة الحصول من window object إذا كان متاحاً من TenantContext
    const tenantOrg = (window as any).__TENANT_CONTEXT_ORG__;
    if (tenantOrg?.id && isValidUuid(tenantOrg.id)) {
      return tenantOrg.id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// دالة للتأكد من وجود العميل الزائر
export const ensureGuestCustomer = async () => {
  const guestId = '00000000-0000-0000-0000-000000000000';
  
  try {
    // التحقق من وجود العميل الزائر في جدول customers
    const { data: existingGuestArray, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', guestId)
      .limit(1);
      
    const existingGuest = existingGuestArray && existingGuestArray.length > 0 ? existingGuestArray[0] : null;
    
    if (checkError) {
    }
    
    // استخراج معرف المؤسسة الحالية - محسن مع بدائل
    let organizationId = await getOrganizationId();

    // إذا لم نجد المؤسسة، نبحث عن بدائل
    if (!organizationId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id')
            .eq('auth_user_id', user.id)
            .single();

          if (!error && userData?.organization_id) {
            organizationId = userData.organization_id;
          }
        }
      } catch (error) {
        // تجاهل الأخطاء
      }

      // إذا لم نجد المؤسسة، نبحث في التخزين المحلي
      if (!organizationId) {
        organizationId = localStorage.getItem('bazaar_organization_id');
      }

      // إذا لم نجد المؤسسة، نبحث عن أول مؤسسة
      if (!organizationId) {
        try {
          const { data: orgs, error } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

          if (!error && orgs && orgs.length > 0) {
            organizationId = orgs[0].id;
          }
        } catch (error) {
          // تجاهل الأخطاء
        }
      }
    }

    // إذا لم يكن العميل الزائر موجوداً في جدول customers، قم بإنشائه
    if (!existingGuest) {

      if (!organizationId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [ensureGuestCustomer] لم يتم العثور على معرف المؤسسة');
        }
        return;
      }
      
      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          id: guestId,
          name: 'زائر',
          email: 'guest@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: organizationId
        });
      
      if (insertError) {
      }
    } else if (existingGuest && !existingGuest.organization_id && organizationId) {
      // إذا كان العميل الزائر موجودًا ولكن بدون معرف مؤسسة، قم بتحديثه

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', guestId);

      if (updateError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [ensureGuestCustomer] فشل في تحديث العميل الزائر:', updateError);
        }
      }
    }
  } catch (error) {
  }
};
