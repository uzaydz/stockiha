import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إصلاح مباشر لمشكلة تحميل بيانات المؤسسة
 */

export const debugOrganizationLoading = async (userId: string, subdomain?: string) => {
  
  try {
    // 1. الحصول على بيانات المستخدم أولاً
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, organization_id, is_org_admin')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    // 2. محاولة الحصول على المؤسسة من organization_id في بيانات المستخدم
    if (user.organization_id) {
      const { data: orgById, error: orgByIdError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single();
      
      if (!orgByIdError && orgById) {
        return { 
          success: true, 
          organization: orgById,
          method: 'organization_id'
        };
      } else {
      }
    }
    
    // 3. محاولة البحث بالنطاق الفرعي
    if (subdomain) {
      const { data: orgBySubdomain, error: orgBySubdomainError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (!orgBySubdomainError && orgBySubdomain) {
        
        // ربط المستخدم بالمؤسسة إذا لم يكن مربوطاً
        if (!user.organization_id) {
          await supabaseAdmin
            .from('users')
            .update({ organization_id: orgBySubdomain.id })
            .eq('id', userId);
          
        }
        
        return { 
          success: true, 
          organization: orgBySubdomain,
          method: 'subdomain'
        };
      } else {
      }
    }
    
    // 4. محاولة العثور على المؤسسة حيث المستخدم هو المالك
    const { data: orgByOwner, error: orgByOwnerError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('owner_id', userId)
      .single();
    
    if (!orgByOwnerError && orgByOwner) {
      
      // تحديث بيانات المستخدم
      if (!user.organization_id) {
        await supabaseAdmin
          .from('users')
          .update({ 
            organization_id: orgByOwner.id,
            is_org_admin: true
          })
          .eq('id', userId);
        
      }
      
      return { 
        success: true, 
        organization: orgByOwner,
        method: 'owner_id'
      };
    }
    
    return { success: false, error: 'لم يتم العثور على مؤسسة' };
    
  } catch (error) {
    return { success: false, error: `خطأ في التشخيص: ${error}` };
  }
};

export const fixOrganizationLoading = async (userId: string, hostname?: string) => {
  
  try {
    // استخراج النطاق الفرعي من hostname
    let subdomain = null;
    if (hostname && hostname.includes('.localhost')) {
      subdomain = hostname.split('.')[0];
    }
    
    // تشخيص المشكلة
    const debugResult = await debugOrganizationLoading(userId, subdomain);
    
    if (debugResult.success) {
      return debugResult;
    }
    
    // إذا لم نجد المؤسسة، نحاول إنشاء واحدة تجريبية
    
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'مؤسستي الجديدة',
        subdomain: subdomain || `org-${userId.slice(0, 8)}`,
        owner_id: userId,
        subscription_tier: 'trial',
        subscription_status: 'trial',
        settings: {
          theme: 'light',
          primary_color: '#22c55e'
        }
      })
      .select()
      .single();
    
    if (createError) {
      return { success: false, error: `فشل في إنشاء المؤسسة: ${createError.message}` };
    }
    
    // ربط المستخدم بالمؤسسة الجديدة
    await supabaseAdmin
      .from('users')
      .update({ 
        organization_id: newOrg.id,
        is_org_admin: true
      })
      .eq('id', userId);

    return { 
      success: true, 
      organization: newOrg,
      method: 'created'
    };
    
  } catch (error) {
    return { success: false, error: `خطأ في الإصلاح: ${error}` };
  }
};

export const getOrganizationForCurrentUser = async () => {
  
  try {
    // استخراج النطاق الفرعي من URL الحالي
    const hostname = window.location.hostname;
    
    let subdomain = null;
    if (hostname.includes('.localhost')) {
      subdomain = hostname.split('.')[0];
    }
    
    // البحث بالنطاق الفرعي أولاً
    if (subdomain) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (!orgError && org) {
        
        // حفظ معرف المؤسسة في localStorage
        localStorage.setItem('bazaar_organization_id', org.id);
        
        return { success: true, organization: org };
      }
    }
    
    // محاولة الحصول من localStorage
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', storedOrgId)
        .single();
      
      if (!orgError && org) {
        return { success: true, organization: org };
      }
    }
    
    return { success: false, error: 'لم يتم العثور على مؤسسة' };
    
  } catch (error) {
    return { success: false, error: `خطأ في البحث: ${error}` };
  }
};
